// Store provisoire sur le thread principal : recalcule tout le participant par
// l'oracle à chaque changement de ses sources. Échafaudage jusqu'au store
// paresseux de base (ticket 24).

import { type Plan, TYPE_DONNEES } from "../noyau/compile";
import { evaluate, type Resultats, type SourcesParticipant } from "../noyau/evaluate";
import { explain } from "../noyau/explain";
import { graphe } from "../noyau/graphe";
import { remplissage } from "../noyau/remplissage";
import { cle, decoderCle } from "../sources/cle";
import type { Sources } from "../sources/collections";
import type { EtatRemplissage, ResultatCellule, StoreNotes } from "./store";

interface Cellule {
  instantane: ResultatCellule;
  rappels: Set<() => void>;
}

interface Remplissage {
  etat: EtatRemplissage;
  /** Forme canonique, pour ne notifier qu'un changement réel. */
  signature: string;
  rappels: Set<() => void>;
}

interface Entree {
  sources: SourcesParticipant;
  resultats: Resultats;
}

export function creerStoreProvisoire(sources: Sources, plans: Plan[]): StoreNotes {
  /** Résultats par (g, p) : cache dérivé, jamais dans une collection. */
  const cache = new Map<number, Entree>();
  /** États de remplissage souscrits ou lus, par (g, p) ; les jokers invalides (H5a) lisent les résultats. */
  const remplissages = new Map<number, Remplissage>();
  /** Cellules souscrites ou lues, par clé (g, p, n). */
  const cellules = new Map<number, Cellule>();
  /** Abonnés à tout changement des sources d'un participant (explication, graphe), par (g, p). */
  const participants = new Map<number, Set<() => void>>();
  const gp = (g: number, p: number) => cle(g, p, 0);

  const lireSources = (g: number, p: number): SourcesParticipant => {
    const plan = plans[g];
    const cases = new Float64Array(plan.D);
    for (let d = 0; d < plan.D; d++) cases[d] = sources.cases.get(cle(g, p, d))?.valeur ?? NaN;
    const nonEvaluations = sources.nonEvaluations.toArray
      .filter((l) => l.g === g && l.p === p)
      .map((l) => ({ n: l.n, axe: l.axe }));
    const jokers = sources.jokers.toArray
      .filter((l) => l.g === g && l.p === p)
      .map((l) => ({ id: l.id, jokerDef: l.jokerDef }));
    return { cases, nonEvaluations, jokers };
  };

  const entree = (g: number, p: number): Entree => {
    let e = cache.get(gp(g, p));
    if (!e) {
      const s = lireSources(g, p);
      e = { sources: s, resultats: evaluate(plans[g], s) };
      cache.set(gp(g, p), e);
    }
    return e;
  };

  const instantane = (g: number, p: number, n: number): ResultatCellule => {
    const { sources: s, resultats: r } = entree(g, p);
    const d = plans[g].type[n] === TYPE_DONNEES ? plans[g].indexDonnee[n] : -1;
    return {
      valeur: r.valeurs[n],
      cause: r.causes[n],
      marques: r.marques[n],
      saisie: d >= 0 ? s.cases[d] : NaN,
      enCalcul: false,
    };
  };

  /**
   * Remplissage, plus les jokers invalides. Décompté sur les sources seules
   * (spec 20) ; les résultats ne sont lus qu'en H5a « refusé » avec des jokers.
   */
  const etatRemplissage = (g: number, p: number): EtatRemplissage => {
    const plan = plans[g];
    const s = lireSources(g, p);
    const besoin = plan.commutateurs.h5a === "refuse" && s.jokers.length > 0;
    return remplissage(plan, s, besoin ? entree(g, p).resultats.valeurs : undefined);
  };

  const remplissageDe = (g: number, p: number): Remplissage => {
    let r = remplissages.get(gp(g, p));
    if (!r) {
      const etat = etatRemplissage(g, p);
      r = { etat, signature: JSON.stringify(etat), rappels: new Set() };
      remplissages.set(gp(g, p), r);
    }
    return r;
  };

  const cellule = (g: number, p: number, n: number): Cellule => {
    const k = cle(g, p, n);
    let c = cellules.get(k);
    if (!c) {
      c = { instantane: instantane(g, p, n), rappels: new Set() };
      cellules.set(k, c);
    }
    return c;
  };

  const memeResultat = (a: ResultatCellule, b: ResultatCellule) =>
    Object.is(a.valeur, b.valeur) &&
    a.cause === b.cause &&
    a.marques === b.marques &&
    Object.is(a.saisie, b.saisie) &&
    a.enCalcul === b.enCalcul;

  /** Invalide les (g, p) touchés et notifie les cellules dont le résultat change. */
  const invalider = (touches: Set<number>) => {
    for (const k of touches) cache.delete(k);
    const aNotifier: (() => void)[] = [];
    for (const k of touches) aNotifier.push(...(participants.get(k) ?? []));
    for (const [ck, c] of cellules) {
      const k = ck - (ck % 65536);
      if (!touches.has(k)) continue;
      if (c.rappels.size === 0) {
        cellules.delete(ck);
        continue;
      }
      const { g, p, d: n } = decoderCle(ck);
      const nouveau = instantane(g, p, n);
      if (!memeResultat(c.instantane, nouveau)) {
        c.instantane = nouveau;
        aNotifier.push(...c.rappels);
      }
    }
    for (const k of touches) {
      const r = remplissages.get(k);
      if (!r) continue;
      if (r.rappels.size === 0) {
        remplissages.delete(k);
        continue;
      }
      const { g, p } = decoderCle(k);
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

  // `includeInitialState: false` explicite : sans lui, TanStack DB filtre la
  // suppression d'une ligne chargée avant la souscription (clé jamais envoyée).
  const tout = { includeInitialState: false } as const;
  const abonnements = [
    sources.cases.subscribeChanges((changes) => {
      invalider(new Set(changes.map((c) => gp(decoderCle(c.key).g, decoderCle(c.key).p))));
    }, tout),
    sources.nonEvaluations.subscribeChanges((changes) => {
      invalider(new Set(changes.map((c) => gp(decoderCle(c.key).g, decoderCle(c.key).p))));
    }, tout),
    sources.jokers.subscribeChanges((changes) => {
      invalider(new Set(changes.map((c) => gp(c.value.g, c.value.p))));
    }, tout),
  ];

  return {
    getResult: (g, p, n) => cellule(g, p, n).instantane,
    subscribeResult(g, p, n, rappel) {
      const c = cellule(g, p, n);
      c.rappels.add(rappel);
      return () => {
        c.rappels.delete(rappel);
      };
    },
    getFillStatus: (g, p) => remplissageDe(g, p).etat,
    subscribeFillStatus(g, p, rappel) {
      const r = remplissageDe(g, p);
      r.rappels.add(rappel);
      return () => {
        r.rappels.delete(rappel);
      };
    },
    subscribeParticipant(g, p, rappel) {
      const k = gp(g, p);
      const l = participants.get(k) ?? new Set<() => void>();
      participants.set(k, l);
      l.add(rappel);
      return () => {
        l.delete(rappel);
        if (l.size === 0) participants.delete(k);
      };
    },
    explain: async (g, p, n) => explain(plans[g], entree(g, p).sources, n),
    graphe: async (g, p) => graphe(plans[g], entree(g, p).sources),
    purger() {
      cache.clear();
      const touches = new Set<number>();
      for (const ck of cellules.keys()) touches.add(ck - (ck % 65536));
      for (const k of remplissages.keys()) touches.add(k);
      for (const k of participants.keys()) touches.add(k);
      invalider(touches);
    },
    dispose: () => {
      for (const a of abonnements) a.unsubscribe();
    },
  };
}
