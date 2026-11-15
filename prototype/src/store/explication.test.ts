// Store : `explain(g, p, n)` et `graphe(g, p)` rendent des promesses, pour toute
// grille du jeu « corpus » (ce que la table ouvre). Valeurs attendues :
// `g3-controle.py --figer` (Emma avec et sans joker).

import g3Figes from "@corpus/g3-participants.json";
import { describe, expect, test } from "vitest";
import type { FichierG3 } from "../noyau/format";
import { creerSession } from "../session";
import { ecrireCase, retirerJoker } from "../sources/collections";

const g3 = g3Figes as unknown as FichierG3;

describe("store : explication et graphe", () => {
  test("explain et graphe rendent des promesses", () => {
    const s = creerSession();
    expect(s.store.explain(0, 0, 0)).toBeInstanceOf(Promise);
    expect(s.store.graphe(0, 0)).toBeInstanceOf(Promise);
  });

  test("toute grille du corpus : chaque nœud de chaque participant s'explique, chaque graphe se construit", async () => {
    const s = creerSession();
    const participants = s.sources.participants.toArray;
    for (const [g, plan] of s.plans.entries()) {
      // La table montre tous les participants pour chaque grille.
      for (const pt of participants) {
        const gr = await s.store.graphe(g, pt.p);
        expect(gr.noeuds.length).toBeGreaterThan(0);
        for (let n = 0; n < plan.N; n++) {
          const e = await s.store.explain(g, pt.p, n);
          expect(e.id).toBe(plan.ids[n]);
          expect(Object.is(e.valeur, s.store.getResult(g, pt.p, n).valeur), `${plan.ids[n]}`).toBe(true);
        }
      }
    }
  });

  test("subscribeParticipant : notifié même sans changement de résultat (note de Chloé sous la dispense), et pour ce seul participant", () => {
    const s = creerSession();
    const g = 3; // G3 V2 final : sr1 de Chloé est couverte par la dispense de reg:e3 (g3-controle.py)
    const plan = s.plans[g];
    const pts = s.sources.participants.toArray;
    const chloe = pts.find((pt) => pt.nom === "Chloé")!;
    const autre = pts.find((pt) => pt.p !== chloe.p)!;
    const sr1 = plan.index.get("sr1")!;
    expect(g3.graphe.couvertesParDispense["Chloé"]).toContain("sr1");
    let chloeN = 0;
    let autreN = 0;
    const d = [
      s.store.subscribeParticipant(g, chloe.p, () => chloeN++),
      s.store.subscribeParticipant(g, autre.p, () => autreN++),
    ];
    ecrireCase(s.sources, g, chloe.p, plan.indexDonnee[sr1], 0);
    for (const x of d) x();
    expect(chloeN).toBe(1);
    expect(autreN).toBe(0);
    // La saisie de la case change (note conservée), le résultat reste « non évalué ».
    expect(s.store.getResult(g, chloe.p, sr1).valeur).toBeNaN();
  });

  test("l'explication suit les sources : retirer le joker d'Emma ramène Animation à la valeur sans joker", async () => {
    const s = creerSession();
    const g = 3; // G3 V2 final
    const plan = s.plans[g];
    const emma = s.sources.participants.toArray.find((pt) => pt.nom === "Emma")!;
    const animation = plan.index.get("animation")!;
    const fige = g3.etats["V2-final"].participants.find((p) => p.nom === "Emma")!;
    const avant = await s.store.explain(g, emma.p, animation);
    expect(avant.joker?.ajustements).toHaveLength(1);
    expect(avant.valeur).toBeCloseTo(fige.attendus.animation!, 9);
    for (const j of s.sources.jokers.toArray.filter((l) => l.g === g && l.p === emma.p)) retirerJoker(s.sources, j.id);
    const apres = await s.store.explain(g, emma.p, animation);
    expect(apres.joker).toBeNull();
    expect(apres.valeur).toBeCloseTo(fige.attendusSansJoker!.animation!, 9);
  });
});
