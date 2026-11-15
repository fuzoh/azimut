// Variante « lieu = thread principal » (spec 20, « Variantes à comparer ») :
// le moteur tourne sur le thread principal et lit les cases par clé dans la
// collection TanStack DB, sans copie compacte ni messages. Même LRU de N
// participants instanciés (signaux ou DAG maison) que dans le worker ; le store
// lit le moteur directement, rien n'est jamais « en calcul ».

import type { Plan } from "../noyau/compile";
import { TYPE_DONNEES } from "../noyau/compile";
import type { NonEvaluation } from "../noyau/dispense";
import type { SourcesParticipant } from "../noyau/evaluate";
import { explain } from "../noyau/explain";
import { graphe } from "../noyau/graphe";
import { remplissage } from "../noyau/remplissage";
import { cle, decoderCle } from "../sources/cle";
import { type LigneJoker, type LigneNonEvaluation, origineDistante, type Sources } from "../sources/collections";
import type { Calculateur, FabriqueCalculateur, JokerParticipant } from "./calcul";
import { ParticipantDag } from "./dag/participant";
import { ParticipantSignaux } from "./signaux/participant";
import { chronoInstanciation, statsInstanciation } from "../mesure/stats";
import { creerCohortes, type EtatRemplissage, type InstantaneStore, type ResultatCellule, type StoreVerifiable } from "./store";

export interface OptionsStorePrincipal {
  sources: Sources;
  plans: Plan[];
  lru: number;
  calcul: "signaux" | "dag";
  distante: "perimee" | "immediat";
}

interface Cellule {
  instantane: ResultatCellule;
  rappels: Set<() => void>;
}

interface Remplissage {
  etat: EtatRemplissage;
  signature: string;
  rappels: Set<() => void>;
}

interface Touche {
  cases: number[];
  nonEvals: boolean;
  jokers: boolean;
  distante: boolean;
}

const memeResultat = (a: ResultatCellule, b: ResultatCellule) =>
  Object.is(a.valeur, b.valeur) && a.cause === b.cause && a.marques === b.marques && Object.is(a.saisie, b.saisie) && a.enCalcul === b.enCalcul;

export function creerStorePrincipal(o: OptionsStorePrincipal): StoreVerifiable {
  const { sources, plans } = o;
  const capacite = Math.max(1, o.lru);
  const fabrique: FabriqueCalculateur =
    o.calcul === "dag" ? (pl, c, ne, j) => new ParticipantDag(pl, c, ne, j) : (pl, c, ne, j) => new ParticipantSignaux(pl, c, ne, j);
  const enLot: (f: () => void) => void = o.calcul === "signaux" ? ParticipantSignaux.lot : (f) => f();
  const gpDe = (g: number, p: number) => cle(g, p, 0);

  // --- Lecture des sources dans la collection ----------------------------------------

  /** Non-évaluations et jokers indexés par (g, p) (les cases se lisent par clé). */
  const nonEvalsParGp = new Map<number, Map<number, LigneNonEvaluation>>();
  const jokersParGp = new Map<number, Map<number, LigneJoker>>();
  const indexer = <L>(index: Map<number, Map<number, L>>, gp: number, k: number, l: L | null) => {
    let m = index.get(gp);
    if (!m) {
      m = new Map();
      index.set(gp, m);
    }
    if (l) m.set(k, l);
    else m.delete(k);
  };
  for (const l of sources.nonEvaluations.values()) indexer(nonEvalsParGp, gpDe(l.g, l.p), l.k, l);
  for (const l of sources.jokers.values()) indexer(jokersParGp, gpDe(l.g, l.p), l.id, l);
  /** Joker par id : un retrait n'a que la clé. */
  const jokersParId = new Map<number, LigneJoker>(sources.jokers.toArray.map((l) => [l.id, l]));

  const casesDe = (g: number, p: number) => {
    const plan = plans[g];
    const cases = new Float64Array(plan.D);
    for (let d = 0; d < plan.D; d++) cases[d] = sources.cases.get(cle(g, p, d))?.valeur ?? NaN;
    return cases;
  };
  const nonEvaluationsDe = (g: number, p: number): NonEvaluation[] =>
    [...(nonEvalsParGp.get(gpDe(g, p))?.values() ?? [])].sort((a, b) => a.n - b.n).map((l) => (l.axe === undefined ? { n: l.n } : { n: l.n, axe: l.axe }));
  const jokersDe = (g: number, p: number): JokerParticipant[] =>
    [...(jokersParGp.get(gpDe(g, p))?.values() ?? [])].sort((a, b) => a.id - b.id).map((l) => ({ id: l.id, jokerDef: l.jokerDef }));
  const sourcesDe = (g: number, p: number): SourcesParticipant => ({ cases: casesDe(g, p), nonEvaluations: nonEvaluationsDe(g, p), jokers: jokersDe(g, p) });

  // --- LRU ----------------------------------------------------------------------------

  const lru = new Map<number, Calculateur>();
  const creerInstance = (g: number, p: number) =>
    chronoInstanciation(() => {
      const s = sourcesDe(g, p);
      return fabrique(plans[g], s.cases, s.nonEvaluations, s.jokers);
    });
  const instance = (g: number, p: number): Calculateur => {
    const k = gpDe(g, p);
    let i = lru.get(k);
    if (i) lru.delete(k);
    else {
      i = creerInstance(g, p);
      while (lru.size >= capacite) lru.delete(lru.keys().next().value!);
    }
    lru.set(k, i);
    statsInstanciation.lruTaille = lru.size;
    return i;
  };

  // --- Cellules, remplissages, participants ------------------------------------------

  const cellules = new Map<number, Cellule>();
  const cellulesParGp = new Map<number, Set<number>>();
  const remplissages = new Map<number, Remplissage>();
  const participants = new Map<number, Set<() => void>>();
  let version = 0;

  const construire = (g: number, p: number, n: number): ResultatCellule => {
    const plan = plans[g];
    const inst = instance(g, p);
    inst.perime = false;
    const r = inst.lire(n);
    const d = plan.type[n] === TYPE_DONNEES ? plan.indexDonnee[n] : -1;
    return {
      valeur: r.valeur,
      cause: r.cause,
      marques: r.marques,
      saisie: d >= 0 ? (sources.cases.get(cle(g, p, d))?.valeur ?? NaN) : NaN,
      enCalcul: false,
    };
  };

  const oublier = (k: number) => {
    cellules.delete(k);
    cellulesParGp.get(k - (k % 65536))?.delete(k);
  };

  /** Cellules lues sans souscription : oubliées à la tâche suivante. */
  let lues: number[] = [];
  const oublierLues = () => {
    for (const k of lues) if (cellules.get(k)?.rappels.size === 0) oublier(k);
    lues = [];
  };

  const cellule = (g: number, p: number, n: number): Cellule => {
    const k = cle(g, p, n);
    let c = cellules.get(k);
    if (!c) {
      c = { instantane: construire(g, p, n), rappels: new Set() };
      cellules.set(k, c);
      const gp = gpDe(g, p);
      const s = cellulesParGp.get(gp) ?? new Set<number>();
      cellulesParGp.set(gp, s);
      s.add(k);
      if (lues.length === 0) setTimeout(oublierLues, 0);
      lues.push(k);
    }
    return c;
  };

  const etatRemplissage = (g: number, p: number): EtatRemplissage => {
    const plan = plans[g];
    const s = sourcesDe(g, p);
    let valeurs: Float64Array | undefined;
    if (plan.commutateurs.h5a === "refuse" && s.jokers.length > 0) {
      const inst = instance(g, p);
      valeurs = new Float64Array(plan.N);
      for (let n = 0; n < plan.N; n++) valeurs[n] = inst.lire(n).valeur;
    }
    return remplissage(plan, s, valeurs);
  };

  const remplissageDe = (g: number, p: number): Remplissage => {
    let r = remplissages.get(gpDe(g, p));
    if (!r) {
      const etat = etatRemplissage(g, p);
      r = { etat, signature: JSON.stringify(etat), rappels: new Set() };
      remplissages.set(gpDe(g, p), r);
    }
    return r;
  };

  /** Relit les cellules, remplissages et abonnés des (g, p) touchés ; notifie ce qui change. */
  const rafraichir = (gps: Iterable<number>) => {
    const aNotifier: (() => void)[] = [];
    for (const gp of gps) {
      aNotifier.push(...(participants.get(gp) ?? []));
      for (const k of [...(cellulesParGp.get(gp) ?? [])]) {
        const c = cellules.get(k)!;
        if (c.rappels.size === 0) {
          oublier(k);
          continue;
        }
        const { g, p, d: n } = decoderCle(k);
        const nouveau = construire(g, p, n);
        if (!memeResultat(c.instantane, nouveau)) {
          c.instantane = nouveau;
          aNotifier.push(...c.rappels);
        }
      }
      const r = remplissages.get(gp);
      if (!r) continue;
      if (r.rappels.size === 0) {
        remplissages.delete(gp);
        continue;
      }
      const { g, p } = decoderCle(gp);
      const etat = etatRemplissage(g, p);
      const signature = JSON.stringify(etat);
      if (signature !== r.signature) {
        r.etat = etat;
        r.signature = signature;
        aNotifier.push(...r.rappels);
      }
    }
    for (const rappel of aNotifier) rappel();
  };

  const affiche = (gp: number) =>
    (remplissages.get(gp)?.rappels.size ?? 0) > 0 || [...(cellulesParGp.get(gp) ?? [])].some((k) => (cellules.get(k)?.rappels.size ?? 0) > 0);

  /** Écrit les changements dans les instances du LRU, puis relit et notifie. */
  const appliquer = (touches: Map<number, Touche>) => {
    if (touches.size === 0) return;
    version++;
    const debut = performance.now();
    const distantesEnCache: Calculateur[] = [];
    enLot(() => {
      for (const [gp, t] of touches) {
        const inst = lru.get(gp);
        if (!inst) continue;
        const { g, p } = decoderCle(gp);
        for (const d of t.cases) inst.ecrireCase(d, sources.cases.get(cle(g, p, d))?.valeur ?? NaN);
        if (t.nonEvals) inst.ecrireNonEvaluations(nonEvaluationsDe(g, p));
        if (t.jokers) inst.ecrireJokers(jokersDe(g, p));
        if (t.distante && !affiche(gp)) distantesEnCache.push(inst);
      }
    });
    for (const inst of distantesEnCache) {
      if (o.distante === "immediat") for (let n = 0; n < inst.plan.N; n++) inst.lire(n);
      else inst.perime = true;
    }
    rafraichir(touches.keys());
    // Mêmes marques que storeBase au retour du worker (#26 lit les deux stores pareil).
    performance.mark("chaine:calcul:debut", { startTime: debut, detail: { version } });
    performance.mark("chaine:calcul:fin", { detail: { version } });
  };

  const toucher = (touches: Map<number, Touche>, g: number, p: number) => {
    const gp = gpDe(g, p);
    let t = touches.get(gp);
    if (!t) {
      t = { cases: [], nonEvals: false, jokers: false, distante: false };
      touches.set(gp, t);
    }
    return t;
  };

  const tout = { includeInitialState: false } as const;
  const abonnements = [
    sources.cases.subscribeChanges((changes) => {
      performance.mark("chaine:subscribeChanges", { detail: { version: version + 1 } });
      const touches = new Map<number, Touche>();
      for (const c of changes) {
        const { g, p, d } = decoderCle(c.key);
        const t = toucher(touches, g, p);
        t.cases.push(d);
        if (origineDistante.cases.delete(c.key)) t.distante = true;
      }
      appliquer(touches);
    }, tout),
    sources.nonEvaluations.subscribeChanges((changes) => {
      performance.mark("chaine:subscribeChanges", { detail: { version: version + 1 } });
      const touches = new Map<number, Touche>();
      for (const c of changes) {
        const { g, p } = decoderCle(c.key);
        indexer(nonEvalsParGp, gpDe(g, p), c.key, c.type === "delete" ? null : c.value);
        const t = toucher(touches, g, p);
        t.nonEvals = true;
        if (origineDistante.nonEvaluations.delete(c.key)) t.distante = true;
      }
      appliquer(touches);
    }, tout),
    sources.jokers.subscribeChanges((changes) => {
      performance.mark("chaine:subscribeChanges", { detail: { version: version + 1 } });
      const touches = new Map<number, Touche>();
      for (const c of changes) {
        const avant = jokersParId.get(c.key);
        if (avant) {
          indexer(jokersParGp, gpDe(avant.g, avant.p), avant.id, null);
          toucher(touches, avant.g, avant.p).jokers = true;
        }
        if (c.type === "delete") jokersParId.delete(c.key);
        else {
          jokersParId.set(c.key, c.value);
          indexer(jokersParGp, gpDe(c.value.g, c.value.p), c.value.id, c.value);
        }
        const { g, p } = c.type === "delete" ? (avant ?? c.value) : c.value;
        const t = toucher(touches, g, p);
        t.jokers = true;
        if (origineDistante.jokers.delete(c.key)) t.distante = true;
      }
      appliquer(touches);
    }, tout),
  ];

  const getResult = (g: number, p: number, n: number) => cellule(g, p, n).instantane;
  const subscribeResult = (g: number, p: number, n: number, rappel: () => void) => {
    const c = cellule(g, p, n);
    c.rappels.add(rappel);
    return () => {
      c.rappels.delete(rappel);
    };
  };

  return {
    getResult,
    subscribeResult,
    ...creerCohortes({ getResult, subscribeResult }, () => sources.participants.size),
    getFillStatus: (g, p) => remplissageDe(g, p).etat,
    subscribeFillStatus(g, p, rappel) {
      const r = remplissageDe(g, p);
      r.rappels.add(rappel);
      return () => {
        r.rappels.delete(rappel);
      };
    },
    subscribeParticipant(g, p, rappel) {
      const k = gpDe(g, p);
      const l = participants.get(k) ?? new Set<() => void>();
      participants.set(k, l);
      l.add(rappel);
      return () => {
        l.delete(rappel);
        if (l.size === 0) participants.delete(k);
      };
    },
    explain: async (g, p, n) => explain(plans[g], sourcesDe(g, p), n),
    graphe: async (g, p) => graphe(plans[g], sourcesDe(g, p)),
    purger() {
      // Bascule du modèle : les plans viennent d'être recompilés.
      version++;
      lru.clear();
      statsInstanciation.lruTaille = 0;
      rafraichir(new Set([...cellulesParGp.keys(), ...remplissages.keys(), ...participants.keys()]));
    },
    async instantane(): Promise<InstantaneStore> {
      const P = sources.participants.size;
      const grilles = plans.map((plan, g) => {
        const valeurs = new Float64Array(P * plan.N);
        const causes = new Uint8Array(P * plan.N);
        const marques = new Uint8Array(P * plan.N);
        for (let p = 0; p < P; p++) {
          // Hors LRU : instance temporaire, pour ne pas vider le LRU.
          const inst = lru.get(gpDe(g, p)) ?? creerInstance(g, p);
          for (let n = 0; n < plan.N; n++) {
            const r = inst.lire(n);
            valeurs[p * plan.N + n] = r.valeur;
            causes[p * plan.N + n] = r.cause;
            marques[p * plan.N + n] = r.marques;
          }
        }
        return { valeurs, causes, marques };
      });
      return { version, grilles };
    },
    version: () => version,
    *cellulesSouscrites() {
      for (const [k, c] of cellules) {
        if (c.rappels.size === 0) continue;
        const { g, p, d: n } = decoderCle(k);
        yield [g, p, n] as [number, number, number];
      }
    },
    stable: () => Promise.resolve(),
    dispose() {
      for (const a of abonnements) a.unsubscribe();
    },
  };
}
