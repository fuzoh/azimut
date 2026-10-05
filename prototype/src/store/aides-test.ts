// Aides communes aux tests des variantes du store : l'oracle `evaluate` est la
// seule référence (jamais le code d'une variante).

import { expect } from "vitest";
import { type Plan, TYPE_DONNEES } from "../noyau/compile";
import { evaluate } from "../noyau/evaluate";
import { lireSourcesGrille, type Session } from "../session";
import type { StoreNotes, StoreVerifiable } from "./store";

/** Souscrit des cellules (comme la table) ; rend le désabonnement. */
export function souscrire(store: StoreNotes, cellules: [number, number, number][]) {
  const fins = cellules.map(([g, p, n]) => store.subscribeResult(g, p, n, () => {}));
  return () => fins.forEach((f) => f());
}

/** Valeur stockée valide pour la case d : rang d'un palier, ou note sur le pas du barème. */
export function valeurValide(plan: Plan, d: number, x: number): number {
  const b = plan.baremes[plan.bareme[plan.donnees[d]]];
  if (b.type === "ordinal") return Math.floor(x * b.valeurs.length) % b.valeurs.length;
  const pas = b.pas > 0 ? b.pas : (b.max - b.min) / 100;
  const k = Math.floor(x * (Math.round((b.max - b.min) / pas) + 1));
  return Number(Math.min(b.max, b.min + k * pas).toFixed(10));
}

/** Chaque nœud des participants affichés égale l'oracle (valeur, cause, marques, saisie), hors « en calcul ». */
export function comparerAOracle(session: Session, store: StoreNotes, affiches: [number, number][]) {
  for (const [g, p] of affiches) {
    const plan = session.plans[g];
    const s = lireSourcesGrille(session, g).get(p)!;
    const r = evaluate(plan, s);
    for (let n = 0; n < plan.N; n++) {
      const o = store.getResult(g, p, n);
      const qui = `g${g} p${p} ${plan.ids[n]}`;
      expect(o.enCalcul, qui).toBe(false);
      expect(Object.is(o.valeur, r.valeurs[n]) || Math.abs(o.valeur - r.valeurs[n]) < 1e-9, `${qui} valeur ${o.valeur} ≠ ${r.valeurs[n]}`).toBe(true);
      expect(o.cause, `${qui} cause`).toBe(r.causes[n]);
      expect(o.marques, `${qui} marques`).toBe(r.marques[n]);
      const d = plan.type[n] === TYPE_DONNEES ? plan.indexDonnee[n] : -1;
      expect(Object.is(o.saisie, d >= 0 ? s.cases[d] : NaN), `${qui} saisie`).toBe(true);
    }
  }
}

/** L'instantané complet du store (toutes grilles, tous participants) égale l'oracle. */
export async function comparerInstantane(session: Session, store: StoreVerifiable) {
  const inst = await store.instantane();
  expect(inst.version).toBe(store.version());
  session.plans.forEach((plan, g) => {
    for (const [p, s] of lireSourcesGrille(session, g)) {
      const r = evaluate(plan, s);
      const i = inst.grilles[g];
      for (let n = 0; n < plan.N; n++) {
        const v = i.valeurs[p * plan.N + n];
        const qui = `instantané g${g} p${p} ${plan.ids[n]}`;
        expect(Object.is(v, r.valeurs[n]) || Math.abs(v - r.valeurs[n]) < 1e-9, `${qui} ${v} ≠ ${r.valeurs[n]}`).toBe(true);
        expect(i.causes[p * plan.N + n], qui).toBe(r.causes[n]);
        expect(i.marques[p * plan.N + n], qui).toBe(r.marques[n]);
      }
    }
  });
}
