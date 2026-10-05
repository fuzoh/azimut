import { describe, expect, test } from "vitest";
import { compile, ErreurCompilation } from "./compile";
import type { Grille } from "./format";

function grilleMinimale(noeuds: Grille["noeuds"]): Grille {
  return {
    grille: "test",
    baremes: [
      { id: "note", type: "numerique", min: 1, max: 6, pas: 0.5 },
      { id: "echelle", type: "ordinal", paliers: [1, 2, 3, 4].map((v) => ({ valeur: v, libelle: `P${v}` })) },
    ],
    noeuds,
    axes: [{ id: "principal", libelle: "Principal", principal: true, arbre: noeuds.map((n) => ({ noeud: n.id })) }],
  };
}

function erreurs(g: Grille): string[] {
  try {
    compile(g);
    return [];
  } catch (e) {
    if (e instanceof ErreurCompilation) return e.erreurs;
    throw e;
  }
}

describe("compile", () => {
  test("accepte des entrées de données sur un même barème", () => {
    const g = grilleMinimale([
      { id: "a", type: "donnees", libelle: "a", bareme: "note" },
      { id: "b", type: "donnees", libelle: "b", bareme: "note" },
      { id: "m", type: "calcul", libelle: "m", fonction: "F1", entrees: [{ noeud: "a", poids: 1 }, { noeud: "b", poids: 1 }] },
    ]);
    expect(erreurs(g)).toEqual([]);
  });

  test("refuse deux entrées de données d'un même nœud sur des barèmes différents", () => {
    const g = grilleMinimale([
      { id: "a", type: "donnees", libelle: "a", bareme: "note" },
      { id: "b", type: "donnees", libelle: "b", bareme: "echelle" },
      { id: "m", type: "calcul", libelle: "m", fonction: "F1", entrees: [{ noeud: "a", poids: 1 }, { noeud: "b", poids: 1 }] },
    ]);
    const e = erreurs(g);
    expect(e).toHaveLength(1);
    expect(e[0]).toMatch(/^m : entrées de données sur des barèmes différents/);
  });

  test("accepte des nœuds de calcul entrants de barèmes quelconques, à côté d'une donnée", () => {
    const g = grilleMinimale([
      { id: "a", type: "donnees", libelle: "a", bareme: "note" },
      { id: "b", type: "donnees", libelle: "b", bareme: "echelle" },
      { id: "cb", type: "calcul", libelle: "cb", fonction: "F1", entrees: [{ noeud: "b", poids: 1 }] },
      { id: "m", type: "calcul", libelle: "m", fonction: "F1", entrees: [{ noeud: "a", poids: 1 }, { noeud: "cb", poids: 1 }] },
    ]);
    expect(erreurs(g)).toEqual([]);
  });

  test("refuse une structure avec un cycle", () => {
    const g = grilleMinimale([
      { id: "a", type: "donnees", libelle: "a", bareme: "note" },
      { id: "x", type: "calcul", libelle: "x", fonction: "F1", entrees: [{ noeud: "a", poids: 1 }, { noeud: "z", poids: 1 }] },
      { id: "y", type: "calcul", libelle: "y", fonction: "F1", entrees: [{ noeud: "x", poids: 1 }] },
      { id: "z", type: "calcul", libelle: "z", fonction: "F1", entrees: [{ noeud: "y", poids: 1 }] },
    ]);
    const e = erreurs(g);
    expect(e).toHaveLength(1);
    expect(e[0]).toBe("cycle entre x, y, z");
  });

  test("refuse une boucle sur soi-même", () => {
    const g = grilleMinimale([
      { id: "x", type: "calcul", libelle: "x", fonction: "F1", entrees: [{ noeud: "x", poids: 1 }] },
    ]);
    expect(erreurs(g)).toEqual(["cycle entre x"]);
  });
});
