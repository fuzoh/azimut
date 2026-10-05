// Cas T de 09 §5 (T2, T3, T5, T6, T8, T9, T10, T13, T14), chacun sur une petite
// structure au format commun. Les valeurs attendues sont celles de 09, calculées
// à la main dans le document (seconde source), jamais tirées du code testé.

import { describe, expect, test } from "vitest";
import { compile } from "./compile";
import { evaluate, sourcesVides } from "./evaluate";
import type { Bareme, Entree, Grille, Noeud, NoeudCalcul } from "./format";

const num = (id: string, min: number, max: number, pas: number): Bareme => ({ id, type: "numerique", min, max, pas });

function grille(baremes: Bareme[], noeuds: Noeud[], decisif?: string): Grille {
  return {
    grille: "T",
    baremes,
    noeuds,
    axes: [{ id: "principal", libelle: "Principal", principal: true, arbre: noeuds.map((n) => ({ noeud: n.id })) }],
    ...(decisif ? { decisif } : {}),
  };
}

const donnee = (id: string, bareme: string): Noeud => ({ id, type: "donnees", libelle: id, bareme });
const calcul = (id: string, fonction: NoeudCalcul["fonction"], entrees: (string | Entree)[], reste: Partial<NoeudCalcul> = {}): Noeud => ({
  id,
  type: "calcul",
  libelle: id,
  fonction,
  entrees: entrees.map((e) => (typeof e === "string" ? { noeud: e, poids: 1 } : e)),
  ...reste,
});
const seuil = (id: string, entree: string, s: number): Noeud => calcul(id, "F2", [entree], { params: { seuil: s } });

/** Évalue une grille pour des cases {id: note} ; rend id → valeur | null. */
function evaluer(g: Grille, cases: Record<string, number>) {
  const plan = compile(g);
  const sources = sourcesVides(plan);
  for (const [id, v] of Object.entries(cases)) sources.cases[plan.indexDonnee[plan.index.get(id)!]] = v;
  const r = evaluate(plan, sources);
  return (id: string): number | null => {
    const v = r.valeurs[plan.index.get(id)!];
    return Number.isNaN(v) ? null : v;
  };
}

describe("T2 : un seul élément", () => {
  // Un indicateur noté 4 sur 1 à 5, poids 1 ; « au moins 1 sur 1 » avec seuil ≥ 3 → 4, réussi.
  const g = grille(
    [num("note-1-5", 1, 5, 1)],
    [
      donnee("ind", "note-1-5"),
      calcul("reg", "F1", ["ind"]),
      calcul("aumoins", "F4", ["reg"], { params: { k: 1, seuil: 3 } }),
      seuil("seuil", "reg", 3),
    ],
  );
  test("résultat 4, réussi, sans nombre minimal de membres", () => {
    const r = evaluer(g, { ind: 4 });
    expect(r("reg")).toBe(4);
    expect(r("aumoins")).toBe(1);
    expect(r("seuil")).toBe(1);
  });
});

describe("T3 : poids nul", () => {
  const avecPoids = (p: [number, number, number]) =>
    grille(
      [num("note-1-5", 1, 5, 1)],
      [
        donnee("c1", "note-1-5"),
        donnee("c2", "note-1-5"),
        donnee("c3", "note-1-5"),
        calcul("moy", "F1", [
          { noeud: "c1", poids: p[0] },
          { noeud: "c2", poids: p[1] },
          { noeud: "c3", poids: p[2] },
        ]),
      ],
    );
  const cases = { c1: 5, c2: 3, c3: 4 };
  test("5 (poids 0), 3 (poids 2), 4 (poids 0) → (0 + 6 + 0) / 2 = 3", () => {
    expect(evaluer(avecPoids([0, 2, 0]), cases)("moy")).toBe(3);
  });
  test("tous les poids nuls → sans résultat (pas 0, pas une erreur)", () => {
    expect(evaluer(avecPoids([0, 0, 0]), cases)("moy")).toBeNull();
  });
});

describe("T5 : position de l'arrondi", () => {
  const deux = (arrondi?: number) =>
    grille(
      [num("note-1-5", 1, 5, 0.5)],
      [
        donnee("c1", "note-1-5"),
        donnee("c2", "note-1-5"),
        calcul("moy", "F1", ["c1", "c2"], arrondi ? { arrondi } : {}),
        seuil("ok", "moy", 3),
      ],
    );
  test("2 et 3, arrondi propagé au pas 1 : 2,5 → 3, réussi", () => {
    const r = evaluer(deux(1), { c1: 2, c2: 3 });
    expect(r("moy")).toBe(3);
    expect(r("ok")).toBe(1);
  });
  test("sans arrondi : 2,5, échoué", () => {
    const r = evaluer(deux(), { c1: 2, c2: 3 });
    expect(r("moy")).toBe(2.5);
    expect(r("ok")).toBe(0);
  });

  // 4,375 = (4 + 4,5 + 4,5 + 4,5) / 4.
  const quatre = (arrondi: number) =>
    grille(
      [num("note-1-5", 1, 5, 0.5)],
      [
        ...["a", "b", "c", "d"].map((id) => donnee(id, "note-1-5")),
        calcul("moy", "F1", ["a", "b", "c", "d"], { arrondi }),
      ],
    );
  const cases = { a: 4, b: 4.5, c: 4.5, d: 4.5 };
  test("4,375 arrondi au demi-point = 4,5", () => {
    expect(evaluer(quatre(0.5), cases)("moy")).toBe(4.5);
  });
  test("4,375 arrondi au dixième = 4,4", () => {
    expect(evaluer(quatre(0.1), cases)("moy")).toBe(4.4);
  });
});

describe("T6 : conversion avant ou après la moyenne", () => {
  const conversion: [number, number][] = [
    [1, 0],
    [3, 100],
    [5, 150],
  ];
  const baremes = [num("note-1-5", 1, 5, 1), num("pct-0-150", 0, 150, 1)];
  const enPct = { conversion, bareme_sortie: "pct-0-150" };
  test("conversion après la moyenne : 3 → 100 %, réussi", () => {
    const g = grille(baremes, [
      donnee("o1", "note-1-5"),
      donnee("o2", "note-1-5"),
      calcul("moy", "F1", ["o1", "o2"], enPct),
      seuil("ok", "moy", 80),
    ]);
    const r = evaluer(g, { o1: 1, o2: 5 });
    expect(r("moy")).toBe(100);
    expect(r("ok")).toBe(1);
  });
  test("conversion avant la moyenne : (0 + 150) / 2 = 75 %, échoué", () => {
    const g = grille(baremes, [
      donnee("o1", "note-1-5"),
      donnee("o2", "note-1-5"),
      calcul("p1", "F1", ["o1"], enPct),
      calcul("p2", "F1", ["o2"], enPct),
      calcul("moy", "F1", ["p1", "p2"]),
      seuil("ok", "moy", 80),
    ]);
    const r = evaluer(g, { o1: 1, o2: 5 });
    expect([r("p1"), r("p2")]).toEqual([0, 150]);
    expect(r("moy")).toBe(75);
    expect(r("ok")).toBe(0);
  });
});

describe("T8 : rattrapage et ordre des tentatives (F5)", () => {
  // Épreuve sur 100, seuil 60, plafond 60 sur les tentatives de rang ≥ 2.
  const g = grille(
    [num("points-0-100", 0, 100, 1)],
    [
      donnee("t1", "points-0-100"),
      donnee("t2", "points-0-100"),
      calcul("meilleurePlafond", "F5", ["t1", "t2"], { params: { mode: "meilleure", plafond: 60 } }),
      calcul("dernierePlafond", "F5", ["t1", "t2"], { params: { mode: "derniere", plafond: 60 } }),
      calcul("meilleure", "F5", ["t1", "t2"], { params: { mode: "meilleure" } }),
      seuil("okMeilleurePlafond", "meilleurePlafond", 60),
      seuil("okDernierePlafond", "dernierePlafond", 60),
    ],
  );
  const X = { t1: 55, t2: 72 };
  const Y = { t1: 70, t2: 55 };
  test("meilleure, avec plafond : X = 60 réussi, Y = 70 réussi", () => {
    const x = evaluer(g, X);
    const y = evaluer(g, Y);
    expect([x("meilleurePlafond"), x("okMeilleurePlafond")]).toEqual([60, 1]);
    expect([y("meilleurePlafond"), y("okMeilleurePlafond")]).toEqual([70, 1]);
  });
  test("dernière, avec plafond : X = 60 réussi, Y = 55 échoué", () => {
    const x = evaluer(g, X);
    const y = evaluer(g, Y);
    expect([x("dernierePlafond"), x("okDernierePlafond")]).toEqual([60, 1]);
    expect([y("dernierePlafond"), y("okDernierePlafond")]).toEqual([55, 0]);
  });
  test("meilleure, sans plafond : X = 72, Y = 70", () => {
    expect(evaluer(g, X)("meilleure")).toBe(72);
    expect(evaluer(g, Y)("meilleure")).toBe(70);
  });
  test("« dernière » = la dernière entrée qui a un résultat (spec 20, F5)", () => {
    // X sans sa tentative 2 : la dernière occurrence notée est la tentative 1, 55.
    expect(evaluer(g, { t1: 55 })("dernierePlafond")).toBe(55);
  });
  test("rang = position dans les entrées : une tentative 2 seule reste plafonnée", () => {
    expect(evaluer(g, { t2: 72 })("meilleurePlafond")).toBe(60);
  });
});

describe("T9 : double compensation (F7)", () => {
  const notes = (valeurs: number[]) => Object.fromEntries(valeurs.map((v, i) => [`n${i}`, v]));
  const g = (nb: number) =>
    grille(
      [num("note-1-6", 1, 6, 0.5)],
      [
        ...Array.from({ length: nb }, (_, i) => donnee(`n${i}`, "note-1-6")),
        calcul(
          "certificat",
          "F7",
          Array.from({ length: nb }, (_, i) => `n${i}`),
          { params: { pivot: 4, facteurBas: 2, maxInsuffisantes: 4 } },
        ),
      ],
    );
  const base = [5.5, 5, 5, 4.5, 4.5, 4.5, 4, 4, 3.5, 3.5];
  test("hauts 5, bas 2 → doublé 4 ≤ 5, 3 insuffisantes : réussi", () => {
    expect(evaluer(g(11), notes([...base, 3]))("certificat")).toBe(1);
  });
  test("dernière note 2,5 : doublé 5 = 5, l'égalité passe : réussi", () => {
    expect(evaluer(g(11), notes([...base, 2.5]))("certificat")).toBe(1);
  });
  test("dernière note 2,0 : doublé 6 > 5 : échoué", () => {
    expect(evaluer(g(11), notes([...base, 2]))("certificat")).toBe(0);
  });
  test("6 notes à 6 et 5 à 3,5 : compensé (5 ≤ 12) mais 5 insuffisantes > 4 : échoué", () => {
    expect(evaluer(g(11), notes([6, 6, 6, 6, 6, 6, 3.5, 3.5, 3.5, 3.5, 3.5]))("certificat")).toBe(0);
  });
});

describe("T10 : chemins multiples, tous deux décisifs", () => {
  // a1 : 3 points sur 4 ; b1 : 1 sur 3 ; b2 : 3 sur 3 ; thème T = {a1, b1}.
  const a1 = ["a1/1", "a1/2", "a1/3", "a1/4"];
  const b1 = ["b1/1", "b1/2", "b1/3"];
  const b2 = ["b2/1", "b2/2", "b2/3"];
  const cases = { "a1/1": 1, "a1/2": 1, "a1/3": 1, "a1/4": 0, "b1/1": 1, "b1/2": 0, "b1/3": 0, "b2/1": 1, "b2/2": 1, "b2/3": 1 };
  const sortie = { bareme_sortie: "points-0-1" };
  const structure = (tDecisif: boolean) =>
    grille(
      [num("points-0-1", 0, 1, 1)],
      [
        ...[...a1, ...b1, ...b2].map((id) => donnee(id, "points-0-1")),
        calcul("crit:a1", "F1", a1, sortie),
        calcul("crit:b1", "F1", b1, sortie),
        calcul("crit:b2", "F1", b2, sortie),
        calcul("ex:A", "F1", a1, sortie),
        calcul("ex:B", "F1", [...b1, ...b2], sortie),
        calcul("theme:T", "F1", [...a1, ...b1], sortie),
        calcul("moyennePct:T", "F1", ["crit:a1", "crit:b1"], sortie),
        seuil("seuil:A", "ex:A", 0.6),
        seuil("seuil:B", "ex:B", 0.6),
        seuil("seuil:T", "theme:T", 0.6),
        calcul("reussite", "F3", tDecisif ? ["seuil:A", "seuil:B", "seuil:T"] : ["seuil:A", "seuil:B"]),
      ],
      "reussite",
    );
  const decisif = evaluer(structure(true), cases);
  const indicatif = evaluer(structure(false), cases);
  test("exercice A = 75 %, exercice B = 4/6 = 66,7 %, thème T = 4/7 = 57,1 %", () => {
    expect(decisif("ex:A")).toBe(0.75);
    expect(decisif("ex:B")).toBeCloseTo(4 / 6, 12);
    expect(decisif("theme:T")).toBeCloseTo(4 / 7, 12);
  });
  test("T décisif : échoué ; T indicatif : réussi", () => {
    expect(decisif("reussite")).toBe(0);
    expect(indicatif("reussite")).toBe(1);
  });
  test("même valeur de T dans les deux cas, seule la décision change", () => {
    expect(indicatif("theme:T")).toBe(decisif("theme:T"));
    expect(indicatif("seuil:T")).toBe(decisif("seuil:T"));
  });
  test("contrôle : la moyenne simple des % (75 + 33,3) / 2 = 54,2 % donne une autre valeur", () => {
    expect(decisif("moyennePct:T")).toBeCloseTo((0.75 + 1 / 3) / 2, 12);
    expect(Math.round(decisif("moyennePct:T")! * 1000) / 10).toBe(54.2);
  });
});

describe("T13 : retrait des extrêmes (F6)", () => {
  // Coefficient 3,5 sur la somme de 3 notes = moyenne × 10,5 : conversion 0 → 0, 10 → 105.
  const juges = (nb: number, kHautes: number, kBasses: number, minEntreesActives?: number) =>
    grille(
      [num("note-0-10", 0, 10, 0.5), num("points-0-105", 0, 105, 0.5)],
      [
        ...Array.from({ length: nb }, (_, i) => donnee(`j${i}`, "note-0-10")),
        calcul(
          "resultat",
          "F6",
          Array.from({ length: nb }, (_, i) => `j${i}`),
          {
            params: { kHautes, kBasses, ...(minEntreesActives ? { minEntreesActives } : {}) },
            conversion: [
              [0, 0],
              [10, 105],
            ],
            bareme_sortie: "points-0-105",
          },
        ),
      ],
    );
  const notes = (valeurs: number[]) => Object.fromEntries(valeurs.map((v, i) => [`j${i}`, v]));
  const sept = [7.5, 8.0, 7.0, 7.5, 8.5, 7.0, 8.0];
  test("7 notes, retrait 2 + 2 : on garde 7,5, 7,5, 8,0, somme 23 × 3,5 = 80,5", () => {
    expect(evaluer(juges(7, 2, 2), notes(sept))("resultat")).toBeCloseTo(80.5, 9);
  });
  test("égalités aux frontières (deux 8,0, un seul retiré) : l'ordre des notes ne change rien", () => {
    const autreOrdre = [8.0, 7.0, 8.5, 8.0, 7.5, 7.0, 7.5];
    expect(evaluer(juges(7, 2, 2), notes(autreOrdre))("resultat")).toBeCloseTo(80.5, 9);
  });
  test("5 notes, retrait 1 + 1 : on garde 3 notes", () => {
    // 7,5 / 8,0 / 7,0 / 8,5 / 7,0 : on retire 8,5 et un 7,0 ; 7,5 + 8,0 + 7,0 = 22,5 ; × 3,5 = 78,75.
    expect(evaluer(juges(5, 1, 1), notes([7.5, 8.0, 7.0, 8.5, 7.0]))("resultat")).toBeCloseTo(78.75, 9);
  });
  test("5 juges, 4 notes présentes, « sans résultat si moins de 5 » : sans résultat", () => {
    expect(evaluer(juges(5, 1, 1, 5), notes([7.5, 8.0, 7.0, 7.5]))("resultat")).toBeNull();
  });
  test("contrôle : mêmes 4 notes sans minimum, on garde 7,5 et 7,5", () => {
    // On retire 8,0 et 7,0 ; moyenne 7,5 × 10,5 = 78,75 (calcul à la main).
    expect(evaluer(juges(5, 1, 1), notes([7.5, 8.0, 7.0, 7.5]))("resultat")).toBeCloseTo(78.75, 9);
  });
});

describe("T14 : CFC, arrondi, pondération, condition par domaine", () => {
  const baremes = [num("points-0-50", 0, 50, 1), num("note-1-6", 1, 6, 0.1)];
  test("38 points sur 50 → 38/50 × 5 + 1 = 4,8 → demi-note 5,0", () => {
    const g = grille(baremes, [
      donnee("points", "points-0-50"),
      calcul("note", "F1", ["points"], {
        conversion: [
          [0, 1],
          [50, 6],
        ],
        bareme_sortie: "note-1-6",
        arrondi: 0.5,
      }),
    ]);
    expect(evaluer(g, { points: 38 })("note")).toBe(5);
  });

  const g = grille(
    baremes,
    [
      ...["competences", "pratique", "connaissances", "langue", "langueEtrangere", "ecs"].map((id) => donnee(id, "note-1-6")),
      calcul(
        "finale",
        "F1",
        [
          { noeud: "competences", poids: 2 },
          { noeud: "pratique", poids: 2 },
          { noeud: "connaissances", poids: 2 },
          { noeud: "langue", poids: 1 },
          { noeud: "langueEtrangere", poids: 1 },
          { noeud: "ecs", poids: 1 },
        ],
        { arrondi: 0.1 },
      ),
      seuil("seuil:finale", "finale", 4),
      seuil("seuil:pratique", "pratique", 4),
      calcul("reussite", "F3", ["seuil:finale", "seuil:pratique"]),
    ],
    "reussite",
  );
  const notes = { competences: 4.7, pratique: 4.5, connaissances: 4.0, langue: 5.0, langueEtrangere: 4.0, ecs: 4.5 };
  test("note finale 39,9 / 9 = 4,433 → 4,4, réussi", () => {
    const r = evaluer(g, notes);
    expect(r("finale")).toBe(4.4);
    expect(r("reussite")).toBe(1);
  });
  test("pratique 3,5 : 37,9 / 9 = 4,211 → 4,2, échoué quand même (pratique < 4,0)", () => {
    const r = evaluer(g, { ...notes, pratique: 3.5 });
    expect(r("finale")).toBe(4.2);
    expect(r("seuil:finale")).toBe(1);
    expect(r("seuil:pratique")).toBe(0);
    expect(r("reussite")).toBe(0);
  });
});
