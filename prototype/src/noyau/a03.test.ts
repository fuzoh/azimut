// Participants types de A03 : l'oracle contre les résultats figés par
// `a01-a03-controle.py --figer` (seconde source, jamais le code testé).

import a03 from "@corpus/a03-structure.json";
import figes from "@corpus/a03-participants.json";
import { describe, expect, test } from "vitest";
import { compile } from "./compile";
import { evaluate } from "./evaluate";
import type { FichierParticipants, Grille } from "./format";
import { sourcesDepuisFige } from "./participants";

const grille = a03 as unknown as Grille;
const participants = (figes as FichierParticipants).participants;
const plan = compile(grille);

function resultats(nom: string, g: Grille = grille) {
  const p = participants.find((x) => x.nom === nom)!;
  const pl = g === grille ? plan : compile(g);
  const r = evaluate(pl, sourcesDepuisFige(pl, p));
  return (id: string): number | null => {
    const v = r.valeurs[pl.index.get(id)!];
    return Number.isNaN(v) ? null : v;
  };
}

function ecarts(attendus: Record<string, number | null>, obtenu: (id: string) => number | null) {
  return Object.entries(attendus).flatMap(([id, a]) => {
    const o = obtenu(id);
    const ok = a === null ? o === null : o !== null && Math.abs(o - a) < 1e-9;
    return ok ? [] : [`${id} : attendu ${a}, obtenu ${o}`];
  });
}

describe("A03, participants types", () => {
  test("les 6 participants types sont figés", () => {
    expect(participants.map((p) => p.nom)).toEqual(["Alix", "Basile", "Capucine", "Dorian", "Élodie", "Fanny"]);
  });

  test.each(participants.map((p) => [p.nom, p] as const))(
    "%s : tous les nœuds de calcul égalent les résultats figés",
    (nom, p) => {
      expect(Object.keys(p.attendus)).toHaveLength(82);
      expect(ecarts(p.attendus, resultats(nom))).toEqual([]);
    },
  );

  test("Basile : arrondi propagé avant le seuil, 79,75 % → 80 %, A ≥ 80 OK", () => {
    const basile = participants.find((p) => p.nom === "Basile")!;
    const r = resultats("Basile");
    expect(r("sph:A")).toBe(basile.attendus["sph:A"]);
    expect(r("sph:A")).toBe(80);
    expect(r("seuil:A")).toBe(1);

    // La même grille sans arrondi propagé sur la sphère A : 79,75 %, KO.
    const sansArrondi = structuredClone(grille);
    const sph = sansArrondi.noeuds.find((n) => n.id === "sph:A")!;
    if (sph.type === "calcul") delete sph.arrondi;
    expect(ecarts(basile.attendusSansArrondi!, resultats("Basile", sansArrondi))).toEqual([]);
    expect(resultats("Basile", sansArrondi)("sph:A")).toBeCloseTo(79.75, 9);
  });

  test("Élodie : sans résultat partout", () => {
    const r = resultats("Élodie");
    const calcul = grille.noeuds.filter((n) => n.type === "calcul");
    expect(calcul.filter((n) => r(n.id) !== null).map((n) => n.id)).toEqual([]);
  });

  test("Dorian : 100 % sur la sphère B (moyenne puis conversion, T6)", () => {
    const r = resultats("Dorian");
    expect(r("sph:B")).toBe(100);
    expect(r("obj-pct:B/1")).toBe(150);
    expect(r("obj-pct:B/3")).toBe(0);
  });

  test("Capucine : le joker +25 % sur la sphère C fait basculer la Réussite", () => {
    const r = resultats("Capucine");
    expect(r("sph:C")).toBe(85);
    expect(r("seuil:C")).toBe(1);
    expect(r("reussite")).toBe(1);
  });
});
