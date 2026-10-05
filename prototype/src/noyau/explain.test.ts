// Explication d'un résultat (ticket #20). Attendus d'une seconde source :
// - cas T de 09 §5, calculés à la main dans le document ;
// - résultats figés par `a01-a03-controle.py --figer` et `g3-controle.py --figer`
//   (les entrées actives d'un nœud s'en déduisent : poids > 0 et résultat figé
//   non nul, ou case notée et non couverte par une dispense figée).

import a01Json from "@corpus/a01-structure.json";
import a01Figes from "@corpus/a01-participants.json";
import a03Json from "@corpus/a03-structure.json";
import a03Figes from "@corpus/a03-participants.json";
import g3Figes from "@corpus/g3-participants.json";
import v1Json from "@corpus/g3-v1-structure.json";
import v2Json from "@corpus/g3-v2-structure.json";
import { describe, expect, test } from "vitest";
import { compile, type Plan, TYPE_CALCUL } from "./compile";
import { CAUSE, sourcesVides } from "./evaluate";
import { explain } from "./explain";
import type { Bareme, Entree, FichierG3, FichierParticipants, Grille, Noeud, NoeudCalcul, ParticipantType } from "./format";
import { sourcesDepuisFige } from "./participants";

const g3 = g3Figes as unknown as FichierG3;

// --- Petites structures des cas T ---------------------------------------------

const num = (id: string, min: number, max: number, pas: number): Bareme => ({ id, type: "numerique", min, max, pas });
const donnee = (id: string, bareme: string): Noeud => ({ id, type: "donnees", libelle: id, bareme });
const calcul = (id: string, fonction: NoeudCalcul["fonction"], entrees: (string | Entree)[], reste: Partial<NoeudCalcul> = {}): Noeud => ({
  id,
  type: "calcul",
  libelle: id,
  fonction,
  entrees: entrees.map((e) => (typeof e === "string" ? { noeud: e, poids: 1 } : e)),
  ...reste,
});
function grille(baremes: Bareme[], noeuds: Noeud[]): Grille {
  return { grille: "T", baremes, noeuds, axes: [{ id: "p", libelle: "P", principal: true, arbre: noeuds.map((n) => ({ noeud: n.id })) }] };
}
function expliquer(g: Grille, cases: Record<string, number>, id: string) {
  const plan = compile(g);
  const s = sourcesVides(plan);
  for (const [k, v] of Object.entries(cases)) s.cases[plan.indexDonnee[plan.index.get(k)!]] = v;
  return explain(plan, s, plan.index.get(id)!);
}

// T2 : un indicateur à 4, F1, F4 « au moins 1 » (seuil 3), F2 seuil 3.
const t2 = grille(
  [num("n15", 1, 5, 1)],
  [
    donnee("ind", "n15"),
    calcul("reg", "F1", ["ind"]),
    calcul("aumoins", "F4", ["reg"], { params: { k: 1, seuil: 3 } }),
    calcul("seuil", "F2", ["reg"], { params: { seuil: 3 } }),
  ],
);
// T3 : poids 0, 2, 0 ; notes 5, 3, 4.
const t3 = (poids: [number, number, number]) =>
  grille(
    [num("n15", 1, 5, 1)],
    [
      donnee("c1", "n15"),
      donnee("c2", "n15"),
      donnee("c3", "n15"),
      calcul("moy", "F1", poids.map((p, i) => ({ noeud: `c${i + 1}`, poids: p }))),
    ],
  );
// T8 : F5 meilleure, plafond 60 sur le rang 2.
const t8 = grille(
  [num("p100", 0, 100, 1)],
  [donnee("t1", "p100"), donnee("t2", "p100"), calcul("meilleure", "F5", ["t1", "t2"], { params: { mode: "meilleure", plafond: 60 } })],
);
// T9 : F7 sur 11 notes, pivot 4, facteur 2, 4 insuffisantes au plus.
const t9notes = [5.5, 5, 5, 4.5, 4.5, 4.5, 4, 4, 3.5, 3.5, 3];
const t9 = grille(
  [num("n16", 1, 6, 0.5)],
  [
    ...t9notes.map((_, i) => donnee(`n${i}`, "n16")),
    calcul("certificat", "F7", t9notes.map((_, i) => `n${i}`), { params: { pivot: 4, facteurBas: 2, maxInsuffisantes: 4 } }),
  ],
);
// T13 : F6, 5 juges, retrait 1 + 1, 4 notes présentes.
const t13 = grille(
  [num("n010", 0, 10, 0.5), num("p105", 0, 105, 0.5)],
  [
    ...[0, 1, 2, 3, 4].map((i) => donnee(`j${i}`, "n010")),
    calcul("resultat", "F6", ["j0", "j1", "j2", "j3", "j4"], {
      params: { kHautes: 1, kBasses: 1 },
      conversion: [
        [0, 0],
        [10, 105],
      ],
      bareme_sortie: "p105",
    }),
  ],
);
// T14 : F3 sur deux seuils, finale arrondie au dixième.
const t14 = grille(
  [num("n16", 1, 6, 0.1)],
  [
    ...["competences", "pratique", "connaissances", "langue", "langueEtrangere", "ecs"].map((id) => donnee(id, "n16")),
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
    calcul("seuil:finale", "F2", ["finale"], { params: { seuil: 4 } }),
    calcul("seuil:pratique", "F2", ["pratique"], { params: { seuil: 4 } }),
    calcul("reussite", "F3", ["seuil:finale", "seuil:pratique"]),
  ],
);
const t14notes = { competences: 4.7, pratique: 3.5, connaissances: 4.0, langue: 5.0, langueEtrangere: 4.0, ecs: 4.5 };

describe("phrase type et entrées actives de F1 à F7 (cas T de 09)", () => {
  const cas = {
    F1: expliquer(t3([0, 2, 0]), { c1: 5, c2: 3, c3: 4 }, "moy"),
    F2: expliquer(t2, { ind: 4 }, "seuil"),
    F3: expliquer(t14, t14notes, "reussite"),
    F4: expliquer(t2, { ind: 4 }, "aumoins"),
    F5: expliquer(t8, { t1: 55, t2: 72 }, "meilleure"),
    F6: expliquer(t13, { j0: 7.5, j1: 8, j2: 7, j3: 7.5 }, "resultat"),
    F7: expliquer(t9, Object.fromEntries(t9notes.map((v, i) => [`n${i}`, v])), "certificat"),
  };

  test("chaque fonction a sa propre phrase type, qui la nomme", () => {
    for (const [f, e] of Object.entries(cas)) {
      expect(e.fonction).toBe(f);
      expect(e.phrase.startsWith(`${f} `), e.phrase).toBe(true);
      expect(e.lignes).toContain(e.phrase);
    }
    expect(new Set(Object.values(cas).map((e) => e.phrase)).size).toBe(7);
  });

  test("les phrases citent les paramètres de la structure", () => {
    expect(cas.F2.phrase).toContain("≥ 3");
    expect(cas.F4.phrase).toContain("au moins 1");
    expect(cas.F5.phrase).toContain("plafond 60");
    expect(cas.F6.phrase).toMatch(/1 plus hautes.*1 plus basses/);
    expect(cas.F7.phrase).toMatch(/2 × .*4.*au plus 4 insuffisante/);
  });

  test("F1 (T3) : seule c2 est active ; c1 et c3 sont ignorées pour poids 0", () => {
    expect(cas.F1.actives).toEqual(["c2"]);
    expect(cas.F1.entrees.filter((e) => e.statut === "poidsNul").map((e) => e.id)).toEqual(["c1", "c3"]);
    expect(cas.F1.valeur).toBe(3);
  });

  test("F2, F4 (T2) : l'entrée « reg » ; F3 (T14) : les deux seuils, pratique KO", () => {
    expect(cas.F2.actives).toEqual(["reg"]);
    expect(cas.F4.actives).toEqual(["reg"]);
    expect(cas.F3.actives).toEqual(["seuil:finale", "seuil:pratique"]);
    expect(cas.F3.calcul.join(" ")).toContain("KO : seuil:pratique");
  });

  test("F5 (T8 X) : deux occurrences actives, la 2e plafonnée de 72 à 60", () => {
    expect(cas.F5.actives).toEqual(["t1", "t2"]);
    expect(cas.F5.calcul.join("\n")).toContain("occurrence 2 (t2) : 72 → plafonnée à 60");
    expect(cas.F5.valeur).toBe(60);
  });

  test("F5 (T8) : une tentative 1 vide est ignorée comme « vide »", () => {
    const e = expliquer(t8, { t2: 72 }, "meilleure");
    expect(e.actives).toEqual(["t2"]);
    expect(e.entrees[0]).toMatchObject({ id: "t1", statut: "sansResultat" });
    expect(e.entrees[0].raison).toContain("vide");
  });

  test("F6 (T13) : 4 notes actives, j4 vide ignorée ; on garde 7,5 et 7,5 ; conversion vers 78,75", () => {
    expect(cas.F6.actives).toEqual(["j0", "j1", "j2", "j3"]);
    expect(cas.F6.entrees[4]).toMatchObject({ id: "j4", statut: "sansResultat" });
    expect(cas.F6.calcul).toContain("gardées : 7,5, 7,5");
    expect(cas.F6.conversion?.avant).toBe(7.5);
    expect(cas.F6.conversion?.apres).toBeCloseTo(78.75, 9);
  });

  test("F7 (T9) : 11 notes actives ; hauts 5, bas 2 doublé 4 ; 3 insuffisantes", () => {
    expect(cas.F7.actives).toHaveLength(11);
    expect(cas.F7.calcul[0]).toBe("écarts au-dessus : 5 ; écarts sous le pivot : 2 × 2 = 4");
    expect(cas.F7.calcul[1]).toBe("3 insuffisante(s) sur 4 admise(s)");
    expect(cas.F7.valeur).toBe(1);
  });

  test("arrondi propagé (T14) : 37,9 / 9 = 4,211 → 4,2", () => {
    const e = expliquer(t14, t14notes, "finale");
    expect(e.arrondi?.avant).toBeCloseTo(37.9 / 9, 9);
    expect(e.arrondi?.apres).toBe(4.2);
  });
});

// --- Corpus : entrées actives = celles des résultats figés --------------------

interface Jeu {
  nom: string;
  plan: Plan;
  participants: ParticipantType[];
  /** Feuilles couvertes par une dispense, par participant (figées). */
  couvertes: Record<string, string[]>;
}

const sansDispense = (participants: ParticipantType[]) => {
  for (const p of participants) expect(p.sources.nonEvaluations).toEqual([]);
  return {};
};

const jeux: Jeu[] = [
  { nom: "A01", plan: compile(a01Json as unknown as Grille), participants: (a01Figes as FichierParticipants).participants, couvertes: {} },
  { nom: "A03", plan: compile(a03Json as unknown as Grille), participants: (a03Figes as FichierParticipants).participants, couvertes: {} },
  { nom: "G3 V1 à la copie", plan: compile(v1Json as unknown as Grille), participants: g3.etats["V1-copie"].participants, couvertes: {} },
  { nom: "G3 V2 à la copie", plan: compile(v2Json as unknown as Grille), participants: g3.etats["V2-copie"].participants, couvertes: {} },
  {
    nom: "G3 V2 final",
    plan: compile(v2Json as unknown as Grille),
    participants: g3.etats["V2-final"].participants,
    couvertes: g3.graphe.couvertesParDispense,
  },
];

/** Entrées actives d'après les résultats figés : poids > 0, et résultat figé ou case notée non couverte. */
function activesFigees(plan: Plan, p: ParticipantType, couvertes: string[], n: number): string[] {
  const notees = new Set(p.sources.cases.map((c) => c.noeud));
  const res: string[] = [];
  for (const e of (plan.grille.noeuds[n] as NoeudCalcul).entrees) {
    if (e.poids <= 0) continue;
    const s = plan.index.get(e.noeud)!;
    const active = plan.type[s] === TYPE_CALCUL ? p.attendus[e.noeud] !== null : notees.has(e.noeud) && !couvertes.includes(e.noeud);
    if (active) res.push(e.noeud);
  }
  return res;
}

describe("corpus : l'explication cite exactement les entrées actives", () => {
  test.each(jeux.map((j) => [j.nom, j] as const))("%s : tous les participants types, tous les nœuds de calcul", (_, jeu) => {
    if (jeu.nom !== "G3 V2 final") sansDispense(jeu.participants);
    const ecarts: string[] = [];
    for (const p of jeu.participants) {
      const sources = sourcesDepuisFige(jeu.plan, p);
      for (let n = 0; n < jeu.plan.N; n++) {
        if (jeu.plan.type[n] !== TYPE_CALCUL) continue;
        const e = explain(jeu.plan, sources, n);
        const attendues = activesFigees(jeu.plan, p, jeu.couvertes[p.nom] ?? [], n);
        if (JSON.stringify(e.actives) !== JSON.stringify(attendues))
          ecarts.push(`${p.nom} ${e.id} : ${e.actives.join(",")} ≠ ${attendues.join(",")}`);
        const a = p.attendus[e.id];
        if (a === null ? !Number.isNaN(e.valeur) : Math.abs(e.valeur - a) > 1e-9) ecarts.push(`${p.nom} ${e.id} : valeur ${e.valeur} ≠ ${a}`);
      }
    }
    expect(ecarts).toEqual([]);
  });
});

// --- Cause d'un « sans résultat » ----------------------------------------------

describe("cause d'un « sans résultat »", () => {
  const a03 = jeux[1];
  const elodie = a03.participants.find((p) => p.nom === "Élodie")!;
  const v2 = jeux[4];
  const chloe = v2.participants.find((p) => p.nom === "Chloé")!;

  test("Élodie (A03, rien de saisi) : vide, jusqu'au nœud décisif", () => {
    expect(elodie.sources.cases).toEqual([]);
    const s = sourcesDepuisFige(a03.plan, elodie);
    const indicateur = explain(a03.plan, s, a03.plan.index.get("ind:A/1.1/1")!);
    expect(indicateur.cause).toBe(CAUSE.vide);
    for (const id of ["crit:A/1.1", "sph:C", "reussite"]) {
      const e = explain(a03.plan, s, a03.plan.index.get(id)!);
      expect(e.valeur, id).toBeNaN();
      expect(e.cause, id).toBe(CAUSE.aucuneContribution);
      expect(e.causeRacine, id).toBe(CAUSE.vide);
      expect(e.lignes.join("\n"), id).toContain("toutes les entrées sont vides");
    }
  });

  test("M1 de Chloé (V2 final, dispense de E3) : non évalué, par la dispense héritée de reg:e3", () => {
    expect(chloe.attendus.m1).toBeNull();
    const e = explain(v2.plan, sourcesDepuisFige(v2.plan, chloe), v2.plan.index.get("m1")!);
    expect(e.actives).toEqual([]);
    expect(e.causeRacine).toBe(CAUSE.nonEvalue);
    expect(e.texteCause).toContain("toutes les entrées sont non évaluées");
    expect(e.entrees.map((x) => x.id)).toEqual(["sr1", "sr2", "sr3", "sr4", "sr5"]);
    for (const x of e.entrees) expect(x.raison).toContain("dispense héritée de reg:e3");
  });

  test("Chloé : les notes saisies sous la dispense restent visibles, exclues du calcul (18 §4)", () => {
    // Le jeu figé porte une note OK sur sr1–sr5 et le rang 3 (niveau 4, rang = v − 1 dans
    // g3-controle.py) sur itinéraire, sous la dispense de reg:e3.
    const saisies = new Map(chloe.sources.cases.map((c) => [c.noeud, c.valeur]));
    for (const id of ["sr1", "sr2", "sr3", "sr4", "sr5"]) expect(saisies.get(id), id).toBe(1);
    expect(saisies.get("itineraire")).toBe(3);
    const s = sourcesDepuisFige(v2.plan, chloe);
    const m1 = explain(v2.plan, s, v2.plan.index.get("m1")!);
    for (const x of m1.entrees) {
      expect(x.noteConservee, x.id).toBe("OK");
      expect(x.raison, x.id).toContain("note conservée OK, exclue du calcul");
    }
    const itineraire = explain(v2.plan, s, v2.plan.index.get("itineraire")!);
    expect(itineraire.valeur).toBeNaN();
    expect(itineraire.lignes.join("\n")).toMatch(/Note conservée 4\b.*, exclue du calcul/);
  });

  test("T3, tous les poids nuls : dénominateur nul", () => {
    const e = expliquer(t3([0, 0, 0]), { c1: 5, c2: 3, c3: 4 }, "moy");
    expect(e.valeur).toBeNaN();
    expect(e.cause).toBe(CAUSE.denominateurNul);
    expect(e.causeRacine).toBe(CAUSE.denominateurNul);
    expect(e.texteCause).toContain("dénominateur nul");
  });
});

// --- Joker ------------------------------------------------------------------

describe("joker dans l'explication", () => {
  test("Emma, Animation : 2,75 → joker → 3,00 (remonter au seuil)", () => {
    const v2 = jeux[4];
    const emma = v2.participants.find((p) => p.nom === "Emma")!;
    const e = explain(v2.plan, sourcesDepuisFige(v2.plan, emma), v2.plan.index.get("animation")!);
    expect(e.joker?.initiale).toBeCloseTo(emma.attendusSansJoker!.animation!, 9);
    expect(e.joker?.effective).toBeCloseTo(emma.attendus.animation!, 9);
    const ligne = e.lignes.find((l) => l.startsWith("Joker"))!;
    expect(ligne).toContain("2,75 → joker → 3,00");
    expect(ligne).toContain("remonter au seuil de seuil:animation");
    expect(e.marques).toContain("★ joker appliqué");
  });

  test("Emma, Animation ≥ 3 : influencé par un joker, par animation", () => {
    const v2 = jeux[4];
    const emma = v2.participants.find((p) => p.nom === "Emma")!;
    const e = explain(v2.plan, sourcesDepuisFige(v2.plan, emma), v2.plan.index.get("seuil:animation")!);
    expect(e.marques).toContain("☆ influencé par un joker, par animation");
  });

  test("Capucine, sphère C : « ≈ ½ point », de la valeur sans joker à la valeur figée", () => {
    const a03 = jeux[1];
    const capucine = a03.participants.find((p) => p.nom === "Capucine")!;
    const e = explain(a03.plan, sourcesDepuisFige(a03.plan, capucine), a03.plan.index.get("sph:C")!);
    expect(e.joker?.initiale).toBeCloseTo(capucine.attendusSansJoker!["sph:C"]!, 9);
    expect(e.joker?.effective).toBeCloseTo(capucine.attendus["sph:C"]!, 9);
    expect(e.joker?.ajustements).toEqual(["+25 « ≈ ½ point »"]);
    expect(e.lignes.find((l) => l.startsWith("Joker"))).toContain("≈ ½ point");
  });
});
