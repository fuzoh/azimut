// Configuration de base du store (spec 20, « Store de notes » et « Worker ») :
// calcul paresseux en signaux dans un worker, LRU de N participants ; le
// thread principal ne garde qu'un store de résultats mince, limité aux
// cellules souscrites.
//
// Chaîne : saisie → TanStack DB → subscribeChanges → lot → worker → résultats
// poussés → notification des cellules souscrites.

import type { CommutateursResolus, Plan } from "../noyau/compile";
import { TYPE_DONNEES } from "../noyau/compile";
import type { Explication } from "../noyau/explain";
import type { Graphe } from "../noyau/graphe";
import { cle, decoderCle } from "../sources/cle";
import { origineDistante, type Sources } from "../sources/collections";
import type { GenerationSession } from "../sources/initiales";
import type { Canal, Changement, DepuisWorker, VersWorker } from "./protocole";
import { creerCohortes, type EtatRemplissage, type InstantaneStore, type ResultatCellule, type StoreNotes } from "./store";

export interface OptionsStoreBase {
  sources: Sources;
  /** Plans de la session (même tableau : une copie y ajoute une grille, une bascule les remplace). */
  plans: Plan[];
  generation: GenerationSession;
  commutateurs: CommutateursResolus;
  /** N du LRU de participants instanciés dans le worker. */
  lru: number;
  /** Somme de contrôle des sources du thread principal, comparée à celle du worker. */
  sommeControle: string;
  canal: Canal;
}

export interface EtatWorker {
  statut: "demarrage" | "pret" | "desaccord" | "erreur";
  sommePrincipal: string;
  sommeWorker?: string;
  message?: string;
  /** Durée du chargement dans le worker (génération, compile, tableaux). */
  dureeMs?: number;
}

export interface StoreBase extends StoreNotes {
  etatWorker(): EtatWorker;
  abonnerEtatWorker(rappel: () => void): () => void;
  /** Se résout quand plus rien n'est en vol (lots, intérêts, requêtes) : tests et mesures. */
  stable(): Promise<void>;
  version(): number;
  instantane(): Promise<InstantaneStore>;
}

interface Cellule {
  g: number;
  p: number;
  n: number;
  valeur: number;
  cause: number;
  marques: number;
  /** Une valeur du worker est arrivée. */
  connue: boolean;
  instantane: ResultatCellule;
  rappels: Set<() => void>;
}

interface Remplissage {
  etat: EtatRemplissage;
  rappels: Set<() => void>;
}

const REMPLISSAGE_INCONNU: EtatRemplissage = { erreurs: [], signalements: [], provisoire: false };

const planifierFrame: (f: () => void) => void =
  typeof requestAnimationFrame === "function" && typeof document !== "undefined" && document.visibilityState === "visible"
    ? (f) => requestAnimationFrame(() => f())
    : (f) => setTimeout(f, 0);

const memeResultat = (a: ResultatCellule, b: ResultatCellule) =>
  Object.is(a.valeur, b.valeur) && a.cause === b.cause && a.marques === b.marques && Object.is(a.saisie, b.saisie) && a.enCalcul === b.enCalcul;

/** Marque à l'horloge commune `t` (timeOrigin + now), venue d'un autre thread. */
function marquerA(nom: string, t: number, detail: unknown) {
  try {
    performance.mark(nom, { startTime: Math.max(0, t - performance.timeOrigin), detail });
  } catch {
    // startTime hors bornes : sans importance pour le prototype.
  }
}

export function creerStoreBase(o: OptionsStoreBase): StoreBase {
  const { sources, plans, canal } = o;
  const gpDe = (g: number, p: number) => cle(g, p, 0);

  const cellules = new Map<number, Cellule>();
  const cellulesParGp = new Map<number, Set<number>>();
  const remplissages = new Map<number, Remplissage>();
  const participants = new Map<number, Set<() => void>>();
  /** (g, p) « en calcul » : version du lot attendu. */
  const attente = new Map<number, number>();
  /** Intérêts déclarés au worker. */
  const declares = new Set<number>();
  const remplissagesDeclares = new Set<number>();
  /** À réexaminer au prochain frame : intérêt à ajouter ou retirer. */
  const aExaminer = new Set<number>();
  const remplissagesAExaminer = new Set<number>();
  let framePlanifie = false;
  let version = 0;
  /** Messages qui attendent un `resultats` du worker. */
  let enVol = 0;
  let prochaineRequete = 0;
  const requetes = new Map<number, (v: unknown) => void>();
  const attentesStables: (() => void)[] = [];
  /** Grille en cours de copie : ses écritures dans TanStack DB ne partent pas en lot. */
  let grilleIgnoree = -1;

  let etatWorker: EtatWorker = { statut: "demarrage", sommePrincipal: o.sommeControle };
  const rappelsEtat = new Set<() => void>();
  const changerEtat = (e: EtatWorker) => {
    etatWorker = e;
    for (const r of rappelsEtat) r();
  };

  const envoyer = (m: VersWorker) => canal.envoyer(m);

  // --- Instantanés des cellules ------------------------------------------------------

  const construire = (c: Cellule): ResultatCellule => {
    const plan = plans[c.g];
    const d = plan.type[c.n] === TYPE_DONNEES ? plan.indexDonnee[c.n] : -1;
    return {
      valeur: c.valeur,
      cause: c.cause,
      marques: c.marques,
      // La saisie se lit dans TanStack DB, sur le thread principal.
      saisie: d >= 0 ? (sources.cases.get(cle(c.g, c.p, d))?.valeur ?? NaN) : NaN,
      enCalcul: !c.connue || attente.has(gpDe(c.g, c.p)),
    };
  };

  /** Recalcule l'instantané ; rend true s'il a changé. */
  const rafraichir = (c: Cellule): boolean => {
    const nouveau = construire(c);
    if (memeResultat(c.instantane, nouveau)) return false;
    c.instantane = nouveau;
    return true;
  };

  const cellule = (g: number, p: number, n: number): Cellule => {
    const k = cle(g, p, n);
    let c = cellules.get(k);
    if (!c) {
      const nouvelle: Cellule = { g, p, n, valeur: NaN, cause: 0, marques: 0, connue: false, rappels: new Set(), instantane: undefined! };
      nouvelle.instantane = construire(nouvelle);
      cellules.set(k, nouvelle);
      const gp = gpDe(g, p);
      const s = cellulesParGp.get(gp) ?? new Set<number>();
      cellulesParGp.set(gp, s);
      s.add(k);
      c = nouvelle;
      aExaminer.add(k);
      planifier();
    }
    return c;
  };

  const notifierGp = (gps: Iterable<number>, aussiParticipants: boolean) => {
    const rappels: (() => void)[] = [];
    for (const gp of gps) {
      for (const k of cellulesParGp.get(gp) ?? []) {
        const c = cellules.get(k)!;
        if (rafraichir(c)) rappels.push(...c.rappels);
      }
      if (aussiParticipants) rappels.push(...(participants.get(gp) ?? []));
    }
    for (const r of rappels) r();
  };

  // --- Intérêts, regroupés par frame --------------------------------------------------

  function planifier() {
    if (framePlanifie) return;
    framePlanifie = true;
    planifierFrame(declarer);
  }

  function declarer() {
    framePlanifie = false;
    const ajouts: number[] = [];
    const retraits: number[] = [];
    for (const k of aExaminer) {
      const c = cellules.get(k);
      if (c && c.rappels.size > 0) {
        if (!declares.has(k)) {
          declares.add(k);
          ajouts.push(k);
        }
      } else {
        // Lue sans souscription, ou plus souscrite : oubliée.
        if (c) {
          cellules.delete(k);
          cellulesParGp.get(gpDe(c.g, c.p))?.delete(k);
        }
        if (declares.delete(k)) retraits.push(k);
      }
    }
    aExaminer.clear();
    const remplissageAjouts: number[] = [];
    const remplissageRetraits: number[] = [];
    for (const gp of remplissagesAExaminer) {
      const r = remplissages.get(gp);
      if (r && r.rappels.size > 0) {
        if (!remplissagesDeclares.has(gp)) {
          remplissagesDeclares.add(gp);
          remplissageAjouts.push(gp);
        }
      } else {
        remplissages.delete(gp);
        if (remplissagesDeclares.delete(gp)) remplissageRetraits.push(gp);
      }
    }
    remplissagesAExaminer.clear();
    if (ajouts.length + retraits.length + remplissageAjouts.length + remplissageRetraits.length > 0) {
      enVol++;
      envoyer({ type: "interets", ajouts, retraits, remplissageAjouts, remplissageRetraits });
    }
    verifierStable();
  }

  // --- Lots : un par callback subscribeChanges ---------------------------------------

  const envoyerLot = (changements: Changement[], gps: Set<number>) => {
    if (changements.length === 0) return;
    version++;
    performance.mark("chaine:subscribeChanges", { detail: { version } });
    for (const gp of gps) attente.set(gp, version);
    enVol++;
    envoyer({ type: "lot", version, changements });
    performance.mark("chaine:envoi", { detail: { version, taille: changements.length } });
    notifierGp(gps, true);
  };

  const tout = { includeInitialState: false } as const;
  const abonnements = [
    sources.cases.subscribeChanges((changes) => {
      const lot: Changement[] = [];
      const gps = new Set<number>();
      for (const c of changes) {
        const { g, p, d } = decoderCle(c.key);
        if (g === grilleIgnoree) continue;
        const distante = origineDistante.cases.delete(c.key);
        const valeur = c.type === "delete" ? NaN : c.value.valeur;
        lot.push(distante ? ["case", g, p, d, valeur, 1] : ["case", g, p, d, valeur]);
        gps.add(gpDe(g, p));
      }
      envoyerLot(lot, gps);
    }, tout),
    sources.nonEvaluations.subscribeChanges((changes) => {
      const lot: Changement[] = [];
      const gps = new Set<number>();
      for (const c of changes) {
        const { g, p, d: n } = decoderCle(c.key);
        if (g === grilleIgnoree) continue;
        const distante = origineDistante.nonEvaluations.delete(c.key);
        const ch: Changement = c.type === "delete" ? ["nonEvalRetrait", g, p, n] : ["nonEval", g, p, n, c.value.axe ?? -1];
        if (distante) ch.push(1);
        lot.push(ch);
        gps.add(gpDe(g, p));
      }
      envoyerLot(lot, gps);
    }, tout),
    sources.jokers.subscribeChanges((changes) => {
      const lot: Changement[] = [];
      const gps = new Set<number>();
      for (const c of changes) {
        const { id, g, p, jokerDef } = c.value;
        if (g === grilleIgnoree) continue;
        const distante = origineDistante.jokers.delete(id);
        const ch: Changement = c.type === "delete" ? ["jokerRetrait", id] : ["joker", id, g, p, jokerDef];
        if (distante) ch.push(1);
        lot.push(ch);
        gps.add(gpDe(g, p));
      }
      envoyerLot(lot, gps);
    }, tout),
  ];

  // --- Réception -----------------------------------------------------------------------

  function verifierStable() {
    if (enVol > 0 || framePlanifie || attente.size > 0 || requetes.size > 0) return;
    for (const r of attentesStables.splice(0)) r();
  }

  canal.ecouter((m: DepuisWorker) => {
    switch (m.type) {
      case "pret":
        changerEtat({
          ...etatWorker,
          statut: m.somme === o.sommeControle ? "pret" : "desaccord",
          sommeWorker: m.somme,
          dureeMs: m.dureeMs,
        });
        if (m.somme !== o.sommeControle)
          console.error(`somme de contrôle en désaccord : principal ${o.sommeControle}, worker ${m.somme}`);
        break;
      case "resultats": {
        enVol--;
        performance.mark("chaine:retour", { detail: { version: m.version } });
        if (m.calcul) {
          marquerA("chaine:calcul:debut", m.calcul[0], { version: m.version });
          marquerA("chaine:calcul:fin", m.calcul[1], { version: m.version });
        }
        const changees = new Set<number>();
        const { cles, valeurs, causes, marques } = m.cellules;
        for (let i = 0; i < cles.length; i++) {
          const k = cles[i];
          const c = cellules.get(k);
          if (!c) continue;
          c.valeur = valeurs[i];
          c.cause = causes[i];
          c.marques = marques[i];
          c.connue = true;
          changees.add(k);
        }
        // Fin de « en calcul » : `calcules` liste les (g, p) recalculés pour
        // m.version. Les messages arrivent dans l'ordre : tout (g, p) qui
        // attendait une version ≤ m.version est alors à jour (une bascule du
        // modèle recalcule aussi les (g, p) que le worker ne suit pas encore).
        for (const gp of m.calcules) if ((attente.get(gp) ?? Infinity) <= m.version) attente.delete(gp);
        for (const [gp, v] of attente) if (v <= m.version) attente.delete(gp);
        for (const [gp, s] of cellulesParGp) if (!attente.has(gp)) for (const k of s) if (cellules.get(k)!.instantane.enCalcul) changees.add(k);
        const rappels: (() => void)[] = [];
        for (const k of changees) {
          const c = cellules.get(k)!;
          if (rafraichir(c)) rappels.push(...c.rappels);
        }
        for (const [gp, etat] of m.remplissages) {
          const r = remplissages.get(gp);
          if (!r) continue;
          r.etat = etat;
          rappels.push(...r.rappels);
        }
        for (const r of rappels) r();
        verifierStable();
        break;
      }
      case "reponse":
      case "instantane": {
        const r = requetes.get(m.id);
        requetes.delete(m.id);
        r?.(m.type === "reponse" ? m.valeur : m);
        verifierStable();
        break;
      }
      case "erreur":
        console.error(`worker : ${m.message}`);
        changerEtat({ ...etatWorker, statut: "erreur", message: m.message });
        break;
    }
  });

  const requete = <T>(f: (id: number) => VersWorker): Promise<T> =>
    new Promise<T>((resolve) => {
      const id = prochaineRequete++;
      requetes.set(id, resolve as (v: unknown) => void);
      envoyer(f(id));
    });

  // Chargement initial : le worker génère ses sources avec la même graine.
  envoyer({ type: "init", generation: o.generation, commutateurs: o.commutateurs, lru: o.lru });

  const getResult = (g: number, p: number, n: number) => cellule(g, p, n).instantane;
  const subscribeResult = (g: number, p: number, n: number, rappel: () => void) => {
    const c = cellule(g, p, n);
    c.rappels.add(rappel);
    aExaminer.add(cle(g, p, n));
    planifier();
    return () => {
      c.rappels.delete(rappel);
      if (c.rappels.size === 0) {
        aExaminer.add(cle(g, p, n));
        planifier();
      }
    };
  };

  const remplissageDe = (g: number, p: number): Remplissage => {
    const gp = gpDe(g, p);
    let r = remplissages.get(gp);
    if (!r) {
      r = { etat: REMPLISSAGE_INCONNU, rappels: new Set() };
      remplissages.set(gp, r);
      remplissagesAExaminer.add(gp);
      planifier();
    }
    return r;
  };

  return {
    getResult,
    subscribeResult,
    ...creerCohortes({ getResult, subscribeResult }, () => sources.participants.size),
    getFillStatus: (g, p) => remplissageDe(g, p).etat,
    subscribeFillStatus(g, p, rappel) {
      const r = remplissageDe(g, p);
      const gp = gpDe(g, p);
      r.rappels.add(rappel);
      remplissagesAExaminer.add(gp);
      planifier();
      return () => {
        r.rappels.delete(rappel);
        if (r.rappels.size === 0) {
          remplissagesAExaminer.add(gp);
          planifier();
        }
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
    explain: (g, p, n) => requete<Explication>((id) => ({ type: "explain", id, g, p, n })),
    graphe: (g, p) => requete<Graphe>((id) => ({ type: "graphe", id, g, p })),
    purger() {
      // Bascule du modèle : les plans du thread principal viennent d'être recompilés.
      version++;
      const gps = new Set<number>([...cellulesParGp.keys(), ...remplissages.keys(), ...participants.keys()]);
      for (const gp of gps) attente.set(gp, version);
      enVol++;
      envoyer({ type: "commutateurs", version, commutateurs: plans[0].commutateurs });
      notifierGp(gps, true);
    },
    copier(g, g2, structure, options, commutateurs) {
      grilleIgnoree = g2;
      enVol++;
      envoyer({ type: "copier", g, g2, structure, options, commutateurs });
    },
    finCopie() {
      grilleIgnoree = -1;
    },
    async instantane(): Promise<InstantaneStore> {
      const r = await requete<{ version: number; grilles: InstantaneStore["grilles"] }>((id) => ({ type: "instantane", id }));
      return { version: r.version, grilles: r.grilles };
    },
    version: () => version,
    *cellulesSouscrites() {
      for (const c of cellules.values()) if (c.rappels.size > 0) yield [c.g, c.p, c.n] as [number, number, number];
    },
    etatWorker: () => etatWorker,
    abonnerEtatWorker(rappel) {
      rappelsEtat.add(rappel);
      return () => {
        rappelsEtat.delete(rappel);
      };
    },
    stable() {
      return new Promise<void>((resolve) => {
        attentesStables.push(resolve);
        verifierStable();
      });
    },
    dispose() {
      for (const a of abonnements) a.unsubscribe();
      canal.fermer();
    },
  };
}
