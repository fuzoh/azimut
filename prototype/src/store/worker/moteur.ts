// Moteur du worker (spec 20, « Worker ») : copie compacte des sources, LRU de
// participants instanciés en signaux, intérêts, lots. Sans dépendance au
// worker lui-même : `worker.ts` le branche sur `postMessage`, les tests
// l'appellent directement (ou par un canal en mémoire).

import { sommeControle } from "../../generateur/controle";
import { grillesDuJeu } from "../../generateur/jeux";
import { type CommutateursResolus, compile, type Plan } from "../../noyau/compile";
import { copier } from "../../noyau/copier";
import type { NonEvaluation } from "../../noyau/dispense";
import type { SourcesParticipant } from "../../noyau/evaluate";
import { explain } from "../../noyau/explain";
import { graphe } from "../../noyau/graphe";
import { remplissage } from "../../noyau/remplissage";
import { cle, decoderCle, MAX_NOEUDS } from "../../sources/cle";
import { lignesInitiales } from "../../sources/initiales";
import type { Calculateur, FabriqueCalculateur, ResultatNoeud } from "../calcul";
import { ParticipantDag } from "../dag/participant";
import { type CellulesEnvoyees, type Changement, type DepuisWorker, type InstantaneGrille, VARIANTES_BASE, type VariantesMoteur, type VersWorker } from "../protocole";
import { ParticipantSignaux } from "../signaux/participant";

export type Poster = (message: DepuisWorker, transfert?: Transferable[]) => void;

interface Grilles {
  plan: Plan;
  /** Cases : P × D, offset p × D + d ; NaN = vide. */
  cases: Float64Array;
  /** Non-évaluations : P × N ; 0 = aucune, 1 = sans axe, 2 + index d'axe sinon. */
  nonEvals: Uint8Array;
  /**
   * Cohorte « précalcul » : résultats complets P × N calculés en arrière-plan,
   * `frais[p]` = 1 tant que les sources de p n'ont pas changé.
   */
  pre: { valeurs: Float64Array; causes: Uint8Array; marques: Uint8Array; frais: Uint8Array } | null;
}

/** Calculateurs par variante « calcul ». */
const FABRIQUES: Record<VariantesMoteur["calcul"], FabriqueCalculateur> = {
  signaux: (plan, cases, ne, jokers) => new ParticipantSignaux(plan, cases, ne, jokers),
  dag: (plan, cases, ne, jokers) => new ParticipantDag(plan, cases, ne, jokers),
};

/** Budget d'une tranche de précalcul (ms), entre deux messages. */
const TRANCHE_MS = 8;

const gpDe = (g: number, p: number) => cle(g, p, 0);
const horloge = () => performance.timeOrigin + performance.now();

export interface Moteur {
  recevoir(message: VersWorker): void;
  /** Pour les tests : participants instanciés dans le LRU (clés k(g, p, 0)), du plus ancien au plus récent. */
  lru(): number[];
  /** Pour les tests : nombre de (g, p) précalculés et frais (cohorte « précalcul »). */
  precalcules(): number;
  /** Arrête le précalcul en arrière-plan (canal fermé). */
  arreter(): void;
}

/** Cellules à pousser, accumulées puis emballées en tableaux typés. */
class Tampon {
  cles: number[] = [];
  valeurs: number[] = [];
  causes: number[] = [];
  marques: number[] = [];
  ajouter(k: number, r: ResultatNoeud) {
    this.cles.push(k);
    this.valeurs.push(r.valeur);
    this.causes.push(r.cause);
    this.marques.push(r.marques);
  }
  emballer(): CellulesEnvoyees {
    return {
      cles: Float64Array.from(this.cles),
      valeurs: Float64Array.from(this.valeurs),
      causes: Uint8Array.from(this.causes),
      marques: Uint8Array.from(this.marques),
    };
  }
}

const transfert = (c: CellulesEnvoyees): Transferable[] => [c.cles.buffer, c.valeurs.buffer, c.causes.buffer, c.marques.buffer];
const AUCUNE = (): CellulesEnvoyees => new Tampon().emballer();

export function creerMoteur(poster: Poster): Moteur {
  let grilles: Grilles[] = [];
  let P = 0;
  let capacite = 50;
  /** Version du dernier lot reçu (ou de la dernière bascule du modèle). */
  let version = 0;
  let variantes: VariantesMoteur = VARIANTES_BASE;
  let fabrique: FabriqueCalculateur = FABRIQUES.signaux;
  /** Plusieurs écritures, une seule propagation (signaux) ; sans objet pour le DAG. */
  let enLot: (f: () => void) => void = ParticipantSignaux.lot;
  /** Jokers par id, et par (g, p) : id → définition. */
  const jokers = new Map<number, { g: number; p: number; jokerDef: number }>();
  const jokersParGp = new Map<number, Map<number, number>>();
  /** LRU : ordre d'insertion = du moins au plus récemment utilisé. */
  const lru = new Map<number, Calculateur>();
  /** Intérêts : (g, p) → nœuds ; états de remplissage par (g, p). */
  const interets = new Map<number, Set<number>>();
  const interetsRemplissage = new Set<number>();
  /** Dernier envoi par cellule et par état de remplissage, pour ne pousser que ce qui change. */
  const envoyes = new Map<number, ResultatNoeud>();
  const remplissagesEnvoyes = new Map<number, string>();

  // --- Sources compactes ------------------------------------------------------------

  const nonEvaluationsDe = (g: number, p: number): NonEvaluation[] => {
    const { plan, nonEvals } = grilles[g];
    const res: NonEvaluation[] = [];
    const base = p * plan.N;
    for (let n = 0; n < plan.N; n++) {
      const c = nonEvals[base + n];
      if (c === 1) res.push({ n });
      else if (c > 1) res.push({ n, axe: c - 2 });
    }
    return res;
  };

  const jokersDe = (g: number, p: number) =>
    [...(jokersParGp.get(gpDe(g, p)) ?? [])].map(([id, jokerDef]) => ({ id, jokerDef })).sort((a, b) => a.id - b.id);

  const sourcesDe = (g: number, p: number): SourcesParticipant => {
    const { plan, cases } = grilles[g];
    return { cases: cases.slice(p * plan.D, (p + 1) * plan.D), nonEvaluations: nonEvaluationsDe(g, p), jokers: jokersDe(g, p) };
  };

  const nouveauPre = (plan: Plan): Grilles["pre"] =>
    variantes.cohorte === "precalcul"
      ? { valeurs: new Float64Array(P * plan.N), causes: new Uint8Array(P * plan.N), marques: new Uint8Array(P * plan.N), frais: new Uint8Array(P) }
      : null;

  const nouvelleGrille = (plan: Plan): Grilles => ({
    plan,
    cases: new Float64Array(P * plan.D).fill(NaN),
    nonEvals: new Uint8Array(P * plan.N),
    pre: nouveauPre(plan),
  });

  const ecrireNonEval = (g: number, p: number, n: number, axe: number | undefined) => {
    grilles[g].nonEvals[p * grilles[g].plan.N + n] = axe === undefined || axe < 0 ? 1 : axe + 2;
  };

  const poserJoker = (id: number, g: number, p: number, jokerDef: number) => {
    jokers.set(id, { g, p, jokerDef });
    const k = gpDe(g, p);
    const m = jokersParGp.get(k) ?? new Map<number, number>();
    jokersParGp.set(k, m);
    m.set(id, jokerDef);
  };

  // --- LRU ----------------------------------------------------------------------------

  const creerInstance = (g: number, p: number) => {
    const s = sourcesDe(g, p);
    return fabrique(grilles[g].plan, s.cases, s.nonEvaluations, s.jokers);
  };

  const instance = (g: number, p: number): Calculateur => {
    const k = gpDe(g, p);
    let i = lru.get(k);
    if (i) {
      lru.delete(k);
    } else {
      i = creerInstance(g, p);
      while (lru.size >= capacite) lru.delete(lru.keys().next().value!);
    }
    lru.set(k, i);
    return i;
  };

  // --- Envois -------------------------------------------------------------------------

  // --- Cohorte « précalcul » ----------------------------------------------------------

  /** Calcule tout le participant dans `pre`, sans passer par le LRU (instance du LRU si elle existe). */
  const precalculer = (g: number, p: number) => {
    const { plan, pre } = grilles[g];
    const inst = lru.get(gpDe(g, p)) ?? creerInstance(g, p);
    const base = p * plan.N;
    for (let n = 0; n < plan.N; n++) {
      const r = inst.lire(n);
      pre!.valeurs[base + n] = r.valeur;
      pre!.causes[base + n] = r.cause;
      pre!.marques[base + n] = r.marques;
    }
    pre!.frais[p] = 1;
  };

  /**
   * Lecteur d'un (g, p) : l'instance du LRU si elle existe ; sinon, en
   * « précalcul », le résultat précalculé (calculé tout de suite s'il est
   * périmé), sans faire entrer le participant dans le LRU ; sinon l'instance,
   * créée dans le LRU. `chaud` : (g, p) qui vient d'être saisi, gardé au LRU.
   */
  const lecteur = (g: number, p: number, chaud: boolean): ((n: number) => ResultatNoeud) => {
    const { plan, pre } = grilles[g];
    if (pre && !chaud && !lru.has(gpDe(g, p))) {
      if (!pre.frais[p]) precalculer(g, p);
      const base = p * plan.N;
      return (n) => ({ valeur: pre.valeurs[base + n], cause: pre.causes[base + n], marques: pre.marques[base + n] });
    }
    const inst = instance(g, p);
    inst.perime = false;
    return (n) => inst.lire(n);
  };

  let tranchePlanifiee: ReturnType<typeof setTimeout> | null = null;
  let arrete = false;
  /** Curseur du précalcul : grille et participant à examiner. */
  let curseur = { g: 0, p: 0 };

  /** Précalcul en arrière-plan : tranches de TRANCHE_MS, entre les messages. */
  const tranche = () => {
    tranchePlanifiee = null;
    if (arrete) return;
    const fin = performance.now() + TRANCHE_MS;
    const total = grilles.length * P;
    /** (g, p) frais vus d'affilée : un tour complet sans rien à calculer = fini. */
    let frais = 0;
    while (frais < total && performance.now() < fin) {
      const g = curseur.g < grilles.length ? curseur.g : 0;
      const p = curseur.p;
      const pre = grilles[g].pre;
      if (pre && !pre.frais[p]) {
        precalculer(g, p);
        frais = 0;
      } else frais++;
      curseur = p + 1 < P ? { g, p: p + 1 } : { g: (g + 1) % grilles.length, p: 0 };
    }
    if (frais < total) planifierPrecalcul();
  };

  const planifierPrecalcul = () => {
    if (variantes.cohorte !== "precalcul" || tranchePlanifiee !== null || arrete || P === 0) return;
    tranchePlanifiee = setTimeout(tranche, 0);
  };

  /** Cellules et états de remplissage à pousser pour (g, p) ; `tout` : même inchangés. */
  const collecter = (gp: number, noeuds: Iterable<number>, tout: boolean, cellules: Tampon, chaud = false) => {
    const { g, p } = decoderCle(gp);
    const lire = lecteur(g, p, chaud);
    for (const n of noeuds) {
      const r = lire(n);
      const k = gp + n;
      const avant = envoyes.get(k);
      if (!tout && avant && Object.is(avant.valeur, r.valeur) && avant.cause === r.cause && avant.marques === r.marques) continue;
      envoyes.set(k, r);
      cellules.ajouter(k, r);
    }
  };

  const collecterRemplissage = (gp: number, tout: boolean, sortie: [number, ReturnType<typeof remplissage>][]) => {
    const { g, p } = decoderCle(gp);
    const { plan } = grilles[g];
    const s = sourcesDe(g, p);
    let valeurs: Float64Array | undefined;
    if (plan.commutateurs.h5a === "refuse" && s.jokers.length > 0) {
      const inst = instance(g, p);
      valeurs = new Float64Array(plan.N);
      for (let n = 0; n < plan.N; n++) valeurs[n] = inst.lire(n).valeur;
    }
    const etat = remplissage(plan, s, valeurs);
    const signature = JSON.stringify(etat);
    if (!tout && remplissagesEnvoyes.get(gp) === signature) return;
    remplissagesEnvoyes.set(gp, signature);
    sortie.push([gp, etat]);
  };

  /** Recalcule les intérêts des (g, p) donnés et pousse ce qui a changé. */
  const pousser = (touches: Iterable<number>, calcules: number[], debut: number, chaud = false) => {
    const cellules = new Tampon();
    const remplissages: [number, ReturnType<typeof remplissage>][] = [];
    for (const gp of touches) {
      const noeuds = interets.get(gp);
      if (noeuds && noeuds.size > 0) collecter(gp, noeuds, false, cellules, chaud);
      if (interetsRemplissage.has(gp)) collecterRemplissage(gp, false, remplissages);
    }
    const fin = horloge();
    performance.mark("chaine:calcul", { detail: { version } });
    const c = cellules.emballer();
    poster({ type: "resultats", version, cellules: c, remplissages, calcules, calcul: [debut, fin] }, transfert(c));
  };

  // --- Messages -----------------------------------------------------------------------

  const init = (m: Extract<VersWorker, { type: "init" }>) => {
    const t0 = performance.now();
    capacite = Math.max(1, m.lru);
    variantes = m.variantes ?? VARIANTES_BASE;
    fabrique = FABRIQUES[variantes.calcul];
    enLot = variantes.calcul === "signaux" ? ParticipantSignaux.lot : (f) => f();
    const jeu = grillesDuJeu(m.generation.jeu);
    const plans = jeu.map(({ structure }) => compile(structure, m.commutateurs));
    const lignes = lignesInitiales(jeu, plans, m.generation);
    P = lignes.participants.length;
    grilles = plans.map(nouvelleGrille);
    for (const l of lignes.cases) grilles[l.g].cases[l.p * plans[l.g].D + l.d] = l.valeur;
    for (const l of lignes.nonEvaluations) ecrireNonEval(l.g, l.p, l.n, l.axe);
    for (const l of lignes.jokers) poserJoker(l.id, l.g, l.p, l.jokerDef);
    poster({ type: "pret", somme: sommeDesTableaux(), dureeMs: performance.now() - t0, variantes });
    planifierPrecalcul();
  };

  /** Somme de contrôle relue sur les tableaux compacts (pas sur les lignes générées). */
  const sommeDesTableaux = () => {
    const cases: { k: number; valeur: number }[] = [];
    const nonEvaluations: { k: number; axe?: number }[] = [];
    grilles.forEach(({ plan, cases: c, nonEvals }, g) => {
      for (let p = 0; p < P; p++) {
        for (let d = 0; d < plan.D; d++) {
          const v = c[p * plan.D + d];
          if (!Number.isNaN(v)) cases.push({ k: cle(g, p, d), valeur: v });
        }
        for (let n = 0; n < plan.N; n++) {
          const x = nonEvals[p * plan.N + n];
          if (x > 0) nonEvaluations.push({ k: cle(g, p, n), axe: x === 1 ? undefined : x - 2 });
        }
      }
    });
    return sommeControle({ cases, nonEvaluations, jokers: [...jokers].map(([id, j]) => ({ id, ...j })) });
  };

  const lot = (m: Extract<VersWorker, { type: "lot" }>) => {
    const debut = horloge();
    version = m.version;
    /** (g, p) touchés : listes à réécrire dans les signaux. */
    const touches = new Map<number, { cases: number[]; nonEvals: boolean; jokers: boolean; distante: boolean }>();
    const toucher = (g: number, p: number) => {
      const k = gpDe(g, p);
      let t = touches.get(k);
      if (!t) {
        t = { cases: [], nonEvals: false, jokers: false, distante: false };
        touches.set(k, t);
      }
      return t;
    };
    for (const c of m.changements) appliquer(c, toucher);
    /** Saisies distantes sur un participant en cache non affiché. */
    const distantesEnCache: Calculateur[] = [];
    enLot(() => {
      for (const [gp, t] of touches) {
        const { g, p } = decoderCle(gp);
        const { plan, cases, pre } = grilles[g];
        if (pre) pre.frais[p] = 0;
        const inst = lru.get(gp);
        if (!inst) continue;
        for (const d of t.cases) inst.ecrireCase(d, cases[p * plan.D + d]);
        if (t.nonEvals) inst.ecrireNonEvaluations(nonEvaluationsDe(g, p));
        if (t.jokers) inst.ecrireJokers(jokersDe(g, p));
        if (t.distante && !interets.has(gp) && !interetsRemplissage.has(gp)) distantesEnCache.push(inst);
      }
    });
    for (const inst of distantesEnCache) {
      // « marquée périmée » : les sources sont écrites, rien n'est recalculé
      // avant la prochaine lecture. « recalcul immédiat » : tout le participant
      // est relu tout de suite.
      if (variantes.distante === "immediat") for (let n = 0; n < inst.plan.N; n++) inst.lire(n);
      else inst.perime = true;
    }
    pousser(touches.keys(), [...touches.keys()], debut, true);
    planifierPrecalcul();
  };

  const appliquer = (c: Changement, toucher: (g: number, p: number) => { cases: number[]; nonEvals: boolean; jokers: boolean; distante: boolean }) => {
    switch (c[0]) {
      case "case": {
        const [, g, p, d, valeur, distante] = c;
        grilles[g].cases[p * grilles[g].plan.D + d] = valeur;
        const t = toucher(g, p);
        t.cases.push(d);
        if (distante) t.distante = true;
        break;
      }
      case "nonEval": {
        const [, g, p, n, axe, distante] = c;
        ecrireNonEval(g, p, n, axe);
        const t = toucher(g, p);
        t.nonEvals = true;
        if (distante) t.distante = true;
        break;
      }
      case "nonEvalRetrait": {
        const [, g, p, n, distante] = c;
        grilles[g].nonEvals[p * grilles[g].plan.N + n] = 0;
        const t = toucher(g, p);
        t.nonEvals = true;
        if (distante) t.distante = true;
        break;
      }
      case "joker": {
        const [, id, g, p, jokerDef, distante] = c;
        const avant = jokers.get(id);
        if (avant) jokersParGp.get(gpDe(avant.g, avant.p))?.delete(id);
        poserJoker(id, g, p, jokerDef);
        const t = toucher(g, p);
        t.jokers = true;
        if (distante) t.distante = true;
        break;
      }
      case "jokerRetrait": {
        const [, id, distante] = c;
        const j = jokers.get(id);
        if (!j) break;
        jokers.delete(id);
        jokersParGp.get(gpDe(j.g, j.p))?.delete(id);
        const t = toucher(j.g, j.p);
        t.jokers = true;
        if (distante) t.distante = true;
        break;
      }
    }
  };

  const changerInterets = (m: Extract<VersWorker, { type: "interets" }>) => {
    for (const k of m.retraits) {
      const gp = k - (k % MAX_NOEUDS);
      const s = interets.get(gp);
      s?.delete(k - gp);
      if (s?.size === 0) interets.delete(gp);
      envoyes.delete(k);
    }
    for (const gp of m.remplissageRetraits) {
      interetsRemplissage.delete(gp);
      remplissagesEnvoyes.delete(gp);
    }
    const nouveaux = new Map<number, number[]>();
    for (const k of m.ajouts) {
      const gp = k - (k % MAX_NOEUDS);
      const s = interets.get(gp) ?? new Set<number>();
      interets.set(gp, s);
      s.add(k - gp);
      const l = nouveaux.get(gp) ?? [];
      nouveaux.set(gp, l);
      l.push(k - gp);
    }
    for (const gp of m.remplissageAjouts) interetsRemplissage.add(gp);
    // Réponse aux nouveaux intérêts : valeurs courantes, même inchangées
    // (toujours une réponse, éventuellement vide : le thread principal compte ses envois).
    const debut = horloge();
    const cellules = new Tampon();
    for (const [gp, noeuds] of nouveaux) collecter(gp, noeuds, true, cellules);
    const remplissages: [number, ReturnType<typeof remplissage>][] = [];
    for (const gp of m.remplissageAjouts) collecterRemplissage(gp, true, remplissages);
    const c = cellules.emballer();
    poster({ type: "resultats", version, cellules: c, remplissages, calcules: [], calcul: [debut, horloge()] }, transfert(c));
  };

  /** Bascule du modèle : recompilation, purge du LRU, recalcul de ce qui est souscrit. */
  const commutateurs = (m: Extract<VersWorker, { type: "commutateurs" }>) => {
    const debut = horloge();
    version = m.version;
    for (const gr of grilles) {
      gr.plan = compile(gr.plan.grille, m.commutateurs);
      gr.pre = nouveauPre(gr.plan);
    }
    lru.clear();
    const tous = new Set([...interets.keys(), ...interetsRemplissage]);
    pousser(tous, [...tous], debut);
    planifierPrecalcul();
  };

  const copierGrille = (m: Extract<VersWorker, { type: "copier" }>) => {
    const sourcesV1 = new Map<number, SourcesParticipant>();
    for (let p = 0; p < P; p++) sourcesV1.set(p, sourcesDe(m.g, p));
    const { sourcesV2 } = copier(grilles[m.g].plan.grille, m.structure, sourcesV1, { ...m.options, commutateurs: m.commutateurs });
    const plan = compile(m.structure, m.commutateurs);
    const gr = nouvelleGrille(plan);
    grilles[m.g2] = gr;
    // Mêmes ids de jokers que le thread principal : à la suite du plus grand,
    // participants par p croissant, jokers par id croissant.
    let id = Math.max(-1, ...jokers.keys()) + 1;
    for (const [p, s] of sourcesV2) {
      gr.cases.set(s.cases, p * plan.D);
      for (const ne of s.nonEvaluations) ecrireNonEval(m.g2, p, ne.n, ne.axe);
      for (const j of s.jokers) poserJoker(id++, m.g2, p, j.jokerDef);
    }
    poster({ type: "resultats", version, cellules: AUCUNE(), remplissages: [], calcules: [] });
    planifierPrecalcul();
  };

  const instantane = (id: number) => {
    const res: InstantaneGrille[] = grilles.map(({ plan }, g) => {
      const valeurs = new Float64Array(P * plan.N);
      const causes = new Uint8Array(P * plan.N);
      const marques = new Uint8Array(P * plan.N);
      const pre = grilles[g].pre;
      for (let p = 0; p < P; p++) {
        // Hors LRU : résultat précalculé frais, ou instance temporaire, pour ne pas vider le LRU.
        const enCache = lru.get(gpDe(g, p));
        const deDuPre = !enCache && pre?.frais[p] ? pre : null;
        const inst = enCache ?? (deDuPre ? null : creerInstance(g, p));
        for (let n = 0; n < plan.N; n++) {
          const i = p * plan.N + n;
          const r = deDuPre ? { valeur: deDuPre.valeurs[i], cause: deDuPre.causes[i], marques: deDuPre.marques[i] } : inst!.lire(n);
          valeurs[p * plan.N + n] = r.valeur;
          causes[p * plan.N + n] = r.cause;
          marques[p * plan.N + n] = r.marques;
        }
      }
      return { valeurs, causes, marques };
    });
    poster(
      { type: "instantane", id, version, grilles: res },
      res.flatMap((r) => [r.valeurs.buffer, r.causes.buffer, r.marques.buffer]),
    );
  };

  return {
    recevoir(m) {
      try {
        switch (m.type) {
          case "init":
            return init(m);
          case "lot":
            return lot(m);
          case "interets":
            return changerInterets(m);
          case "commutateurs":
            return commutateurs(m);
          case "copier":
            return copierGrille(m);
          case "explain":
            return poster({ type: "reponse", id: m.id, valeur: explain(grilles[m.g].plan, sourcesDe(m.g, m.p), m.n) });
          case "graphe":
            return poster({ type: "reponse", id: m.id, valeur: graphe(grilles[m.g].plan, sourcesDe(m.g, m.p)) });
          case "instantane":
            return instantane(m.id);
        }
      } catch (e) {
        poster({ type: "erreur", message: e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e) });
      }
    },
    lru: () => [...lru.keys()],
    precalcules: () => grilles.reduce((t, gr) => t + (gr.pre ? gr.pre.frais.reduce((a, x) => a + x, 0) : 0), 0),
    arreter() {
      arrete = true;
      if (tranchePlanifiee !== null) clearTimeout(tranchePlanifiee);
      tranchePlanifiee = null;
    },
  };
}
