// La session charge A01, A03, G3 V1 et G3 V2 côte à côte ; le store rend les
// résultats figés par `a01-a03-controle.py --figer` et `g3-controle.py --figer`.

import a01Figes from "@corpus/a01-participants.json";
import a03Figes from "@corpus/a03-participants.json";
import g3Figes from "@corpus/g3-participants.json";
import { describe, expect, test } from "vitest";
import type { FichierG3, FichierParticipants } from "./noyau/format";
import { creerSession } from "./session";

const g3 = g3Figes as unknown as FichierG3;
// Chloé (dispense) et Emma (joker) en V2 final attendent leurs tickets.
const g3v2 = { ...g3.etats["V2-final"], source: "", participants: g3.etats["V2-final"].participants.filter((p) => !["Chloé", "Emma"].includes(p.nom)) };

describe("session corpus A01 + A03 + G3", () => {
  const session = creerSession();
  const p = (nom: string) => session.sources.participants.toArray.find((l) => l.nom === nom)!.p;

  test("les quatre grilles sont chargées, A01 sans nœud décisif", () => {
    expect(session.plans.map((pl) => pl.grille.grille)).toEqual(["A01", "A03", "G3 V1", "G3 V2"]);
    expect(session.plans[0].decisif).toBe(-1);
  });

  test.each([
    [0, a01Figes as FichierParticipants],
    [1, a03Figes as FichierParticipants],
    [2, { ...g3.etats["V1-copie"], source: "" }],
    [3, g3v2],
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
