// Comparaison A → B (spec 20, « Réglages ») : l'oracle calcule le participant
// affiché sous le plan A (commutateurs de la session) et sous le plan B
// (configuration de référence) ; on garde les nœuds dont la valeur ou les
// marques diffèrent. Réservée au jeu « corpus ».

import { formater } from "./noyau/affichage";
import type { Plan } from "./noyau/compile";
import { evaluate, MARQUE_CHEMIN_DISPENSE, MARQUE_INFLUENCE_JOKER, MARQUE_JOKER_APPLIQUE, type SourcesParticipant } from "./noyau/evaluate";

export interface CoteComparaison {
  valeur: number;
  cause: number;
  marques: number;
}

export interface EcartAB {
  n: number;
  id: string;
  a: CoteComparaison;
  b: CoteComparaison;
  /** « OK → sans résultat », marques comprises. */
  texte: string;
}

const TOLERANCE = 1e-9;

export function memeValeur(a: number, b: number): boolean {
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.isNaN(a) && Number.isNaN(b);
  return Math.abs(a - b) < TOLERANCE;
}

export function texteMarques(m: number): string {
  return (m & MARQUE_JOKER_APPLIQUE ? "★" : "") + (m & MARQUE_INFLUENCE_JOKER ? "☆" : "") + (m & MARQUE_CHEMIN_DISPENSE ? "⇶" : "");
}

function texteCote(plan: Plan, n: number, c: CoteComparaison): string {
  const v = Number.isNaN(c.valeur) ? "sans résultat" : formater(plan.baremes[plan.bareme[n]], c.valeur);
  const m = texteMarques(c.marques);
  return m === "" ? v : `${v} ${m}`;
}

/**
 * Nœuds du participant dont la valeur ou les marques diffèrent entre A et B.
 * Les deux plans viennent de la même structure (mêmes index n).
 */
export function comparer(planA: Plan, planB: Plan, sources: SourcesParticipant): Map<number, EcartAB> {
  const ra = evaluate(planA, sources);
  const rb = evaluate(planB, sources);
  const res = new Map<number, EcartAB>();
  for (let n = 0; n < planA.N; n++) {
    const a = { valeur: ra.valeurs[n], cause: ra.causes[n], marques: ra.marques[n] };
    const b = { valeur: rb.valeurs[n], cause: rb.causes[n], marques: rb.marques[n] };
    if (memeValeur(a.valeur, b.valeur) && a.marques === b.marques) continue;
    res.set(n, { n, id: planA.ids[n], a, b, texte: `${texteCote(planA, n, a)} → ${texteCote(planB, n, b)}` });
  }
  return res;
}
