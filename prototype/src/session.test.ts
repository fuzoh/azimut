// La session charge A01 et A03 côte à côte ; le store rend les résultats figés
// par `a01-a03-controle.py --figer` pour chaque grille.

import a01Figes from "@corpus/a01-participants.json";
import a03Figes from "@corpus/a03-participants.json";
import { describe, expect, test } from "vitest";
import type { FichierParticipants } from "./noyau/format";
import { creerSession } from "./session";

describe("session corpus A01 + A03", () => {
  const session = creerSession();
  const p = (nom: string) => session.sources.participants.toArray.find((l) => l.nom === nom)!.p;

  test("les deux grilles sont chargées, A01 sans nœud décisif", () => {
    expect(session.plans.map((pl) => pl.grille.grille)).toEqual(["A01", "A03"]);
    expect(session.plans[0].decisif).toBe(-1);
  });

  test.each([
    [0, a01Figes as FichierParticipants],
    [1, a03Figes as FichierParticipants],
  ])("grille g%i : le store égale les résultats figés de chaque participant type", (g, fichier) => {
    const plan = session.plans[g];
    for (const pt of fichier.participants) {
      for (const [id, attendu] of Object.entries(pt.attendus)) {
        const v = session.store.getResult(g, p(pt.nom), plan.index.get(id)!).valeur;
        if (attendu === null) expect(v, `${pt.nom} ${id}`).toBeNaN();
        else expect(v, `${pt.nom} ${id}`).toBeCloseTo(attendu, 9);
      }
    }
  });
});
