// Store provisoire sur le thread principal : recalcule tout le participant par
// l'oracle à chaque changement de ses sources. Échafaudage jusqu'au store
// paresseux de base (ticket 24).

import type { Plan } from "../noyau/compile";
import { evaluate, type Resultats, type SourcesParticipant } from "../noyau/evaluate";
import { cle, decoderCle } from "../sources/cle";
import type { Sources } from "../sources/collections";
import type { EtatRemplissage, ResultatCellule, StoreNotes } from "./store";

const REMPLISSAGE_VIDE: EtatRemplissage = { erreurs: [], provisoire: false };

interface Cellule {
  instantane: ResultatCellule;
  rappels: Set<() => void>;
}

export function creerStoreProvisoire(sources: Sources, plans: Plan[]): StoreNotes {
  /** Résultats par (g, p) : cache dérivé, jamais dans une collection. */
  const cache = new Map<number, Resultats>();
  /** Cellules souscrites ou lues, par clé (g, p, n). */
  const cellules = new Map<number, Cellule>();
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

  const resultats = (g: number, p: number): Resultats => {
    let r = cache.get(gp(g, p));
    if (!r) {
      r = evaluate(plans[g], lireSources(g, p));
      cache.set(gp(g, p), r);
    }
    return r;
  };

  const instantane = (r: Resultats, n: number): ResultatCellule => ({
    valeur: r.valeurs[n],
    cause: r.causes[n],
    marques: 0,
    enCalcul: false,
  });

  const cellule = (g: number, p: number, n: number): Cellule => {
    const k = cle(g, p, n);
    let c = cellules.get(k);
    if (!c) {
      c = { instantane: instantane(resultats(g, p), n), rappels: new Set() };
      cellules.set(k, c);
    }
    return c;
  };

  const memeResultat = (a: ResultatCellule, b: ResultatCellule) =>
    Object.is(a.valeur, b.valeur) && a.cause === b.cause && a.marques === b.marques && a.enCalcul === b.enCalcul;

  /** Invalide les (g, p) touchés et notifie les cellules dont le résultat change. */
  const invalider = (touches: Set<number>) => {
    for (const k of touches) cache.delete(k);
    const aNotifier: (() => void)[] = [];
    for (const [ck, c] of cellules) {
      const k = ck - (ck % 65536);
      if (!touches.has(k)) continue;
      if (c.rappels.size === 0) {
        cellules.delete(ck);
        continue;
      }
      const { g, p, d: n } = decoderCle(ck);
      const nouveau = instantane(resultats(g, p), n);
      if (!memeResultat(c.instantane, nouveau)) {
        c.instantane = nouveau;
        aNotifier.push(...c.rappels);
      }
    }
    for (const rappel of aNotifier) rappel();
  };

  const abonnements = [
    sources.cases.subscribeChanges((changes) => {
      invalider(new Set(changes.map((c) => gp(decoderCle(c.key).g, decoderCle(c.key).p))));
    }),
    sources.nonEvaluations.subscribeChanges((changes) => {
      invalider(new Set(changes.map((c) => gp(decoderCle(c.key).g, decoderCle(c.key).p))));
    }),
    sources.jokers.subscribeChanges((changes) => {
      invalider(new Set(changes.map((c) => gp(c.value.g, c.value.p))));
    }),
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
    getFillStatus: () => REMPLISSAGE_VIDE,
    subscribeFillStatus: () => () => {},
    dispose: () => {
      for (const a of abonnements) a.unsubscribe();
    },
  };
}
