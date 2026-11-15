// Non-évaluations, dispense héritée (1a, 1b), exigences de remplissage (1c) et H4.
// Seconde source : `g3-controle.py --figer` et `a01-a03-controle.py --figer`
// (résultats et erreurs figés), les tables de `g3-moniteur-camp.md` transcrites
// telles qu'affichées, et un cas construit calculé à la main pour 1a-B.

import a01Figes from "@corpus/a01-participants.json";
import a01Json from "@corpus/a01-structure.json";
import a03Figes from "@corpus/a03-participants.json";
import a03Json from "@corpus/a03-structure.json";
import figesJson from "@corpus/g3-participants.json";
import v1Json from "@corpus/g3-v1-structure.json";
import v2Json from "@corpus/g3-v2-structure.json";
import { describe, expect, test } from "vitest";
import { compile, type Commutateurs, type Plan } from "./compile";
import { couverture, feuillesDispense } from "./dispense";
import { CAUSE, evaluate, MARQUE_CHEMIN_DISPENSE, type SourcesParticipant } from "./evaluate";
import type { FichierG3, FichierParticipants, Grille, NonEvaluationFigee, ParticipantType } from "./format";
import { sourcesDepuisFige } from "./participants";
import { explain } from "./explain";
import { graphe } from "./graphe";
import { etatCase, idsExigences, remplissage } from "./remplissage";

const v1 = v1Json as unknown as Grille;
const v2 = v2Json as unknown as Grille;
const figes = figesJson as unknown as FichierG3;

function participant(etat: keyof FichierG3["etats"], nom: string): ParticipantType {
  return figes.etats[etat].participants.find((p) => p.nom === nom)!;
}

function avecNonEvaluations(pt: ParticipantType, nonEvaluations: NonEvaluationFigee[]): ParticipantType {
  return { ...pt, sources: { ...pt.sources, nonEvaluations } };
}

function lecteur(plan: Plan, sources: SourcesParticipant) {
  const r = evaluate(plan, sources);
  return (id: string): number | null => {
    const v = r.valeurs[plan.index.get(id)!];
    return Number.isNaN(v) ? null : v;
  };
}

function ecarts(attendus: Record<string, number | null>, obtenu: (id: string) => number | null): string[] {
  return Object.entries(attendus).flatMap(([id, a]) => {
    const o = obtenu(id);
    const ok = a === null ? o === null : o !== null && Math.abs(o - a) < 1e-9;
    return ok ? [] : [`${id} : attendu ${a}, obtenu ${o}`];
  });
}

const pourcent = (v: number | null) => (v === null ? "—" : `${(Math.floor(v * 10 + 0.5 + 1e-9) / 10).toFixed(1).replace(".", ",")} %`);
const okko = (v: number | null) => (v === null ? "—" : v === 1 ? "OK" : "KO");
const trie = (l: string[]) => [...l].sort();

function commutateur(nom: string, c: object) {
  return figes.commutateurs.find((x) => x.nom === nom && JSON.stringify(x.commutateurs) === JSON.stringify(c))!;
}

// --- Chloé : dispense de E3 posée en V2 -----------------------------------------

describe("Chloé, dispense de E3 (V2 à l'état final)", () => {
  const chloe = participant("V2-final", "Chloé");

  test("la dispense est posée sur le regroupement E3, notes conservées dans les cases", () => {
    expect(chloe.sources.nonEvaluations).toEqual([{ noeud: "reg:e3" }]);
    const plan = compile(v2);
    const s = sourcesDepuisFige(plan, chloe);
    const d = plan.indexDonnee[plan.index.get("consignes-e3")!];
    expect(s.cases[d]).toBe(2); // Consignes E3 = 3, rang 2 : la note reste dans la case.
    const r = evaluate(plan, s);
    expect(r.valeurs[plan.index.get("consignes-e3")!]).toBeNaN();
    expect(r.causes[plan.index.get("consignes-e3")!]).toBe(CAUSE.nonEvalue);
    expect(etatCase(s.cases, couverture(plan, s.nonEvaluations), d)).toBe("nonEvalue");
  });

  test("1b-A : feuilles placées sous E3 = Consignes E3, Itinéraire, SR1–SR5 (g3-moniteur-camp.md, Dispense)", () => {
    const plan = compile(v2);
    const ids = [...feuillesDispense(plan, plan.index.get("reg:e3")!)].map((d) => plan.ids[plan.donnees[d]]);
    expect(trie(ids)).toEqual(trie(["consignes-e3", "itineraire", "sr1", "sr2", "sr3", "sr4", "sr5"]));
  });

  test("1b-B, dispense sur le nœud de calcul E3 : Itinéraire reste actif, Planification 69,4 %, Réussite KO", () => {
    const c = commutateur("Chloé", { feuilles1b: "B" });
    expect(c.nonEvaluations).toEqual([{ noeud: "e3" }]);
    const plan = compile(v2, c.commutateurs as Commutateurs);
    const lire = lecteur(plan, sourcesDepuisFige(plan, avecNonEvaluations(chloe, c.nonEvaluations!)));
    expect(ecarts(c.attendus, lire)).toEqual([]);
    expect(lire("itineraire")).toBe(4); // Niveau 4 : actif (valeur associée).
    expect([pourcent(lire("planification")), okko(lire("reussite"))]).toEqual(["69,4 %", "KO"]);
  });

  test("1b-B, dispense sur le regroupement E3 : sans effet, signalée ; résultats sans dispense", () => {
    const plan = compile(v2, { feuilles1b: "B" });
    expect(plan.dispenseSansEffet[plan.index.get("reg:e3")!]).toBe(1);
    const s = sourcesDepuisFige(plan, chloe);
    expect(ecarts(commutateur("Chloé", {}).attendus, lecteur(plan, s))).toEqual([]);
    const etat = remplissage(plan, s);
    expect(etat.erreurs.filter((e) => e.type === "dispenseSansEffet").map((e) => plan.ids[e.n])).toEqual(["reg:e3"]);
  });

  test("sans dispense : Animation 3,25, Sécurité OK, Planification 69,4 %, Réussite OK", () => {
    const c = commutateur("Chloé", {});
    const plan = compile(v2);
    const lire = lecteur(plan, sourcesDepuisFige(plan, avecNonEvaluations(chloe, [])));
    expect(ecarts(c.attendus, lire)).toEqual([]);
    expect([lire("animation"), okko(lire("securite")), pourcent(lire("planification")), okko(lire("reussite"))]).toEqual([
      3.25, "OK", "69,4 %", "OK",
    ]);
  });

  test("1b-C : la dispense posée dans l'axe Exercices égale 1b-A ; dans l'axe Compétences, sans effet", () => {
    const plan = compile(v2, { feuilles1b: "C" });
    const exercices = v2.axes.findIndex((a) => a.id === "exercices");
    const competences = v2.axes.findIndex((a) => a.id === "competences");
    const fige = (axe: string) => avecNonEvaluations(chloe, [{ noeud: "reg:e3", axe }]);
    expect(ecarts(chloe.attendus, lecteur(plan, sourcesDepuisFige(plan, fige("exercices"))))).toEqual([]);
    const s = sourcesDepuisFige(plan, fige("competences"));
    expect(s.nonEvaluations[0].axe).toBe(competences);
    expect(ecarts(commutateur("Chloé", {}).attendus, lecteur(plan, s))).toEqual([]);
    expect(remplissage(plan, s).erreurs.some((e) => e.type === "dispenseSansEffet")).toBe(true);
    expect(exercices).toBe(plan.axePrincipal);
  });

  test("1b-C : Animation dispensée dans l'axe Compétences couvre Consignes E2, Consignes E3, Gestion du groupe", () => {
    const plan = compile(v2, { feuilles1b: "C" });
    const competences = v2.axes.findIndex((a) => a.id === "competences");
    const ids = [...feuillesDispense(plan, plan.index.get("animation")!, competences)].map((d) => plan.ids[plan.donnees[d]]);
    expect(trie(ids)).toEqual(trie(["consignes-e2", "consignes-e3", "gestion"]));
  });
});

// --- Félix : H4 --------------------------------------------------------------------

describe("Félix, H4 (V2 à l'état final)", () => {
  const felix = participant("V2-final", "Félix");

  test("H4 strict : Minimaux remplis et Réussite sans résultat", () => {
    const c = commutateur("Félix", { h4Strict: true });
    const plan = compile(v2, { h4Strict: true });
    const lire = lecteur(plan, sourcesDepuisFige(plan, felix));
    expect(ecarts(c.attendus, lire)).toEqual([]);
    expect([lire("minimaux"), lire("reussite")]).toEqual([null, null]);
    expect(evaluate(plan, sourcesDepuisFige(plan, felix)).causes[plan.index.get("reussite")!]).toBe(CAUSE.entreeSansResultat);
  });

  test("par défaut : Réussite OK, avec l'avertissement « données provisoires »", () => {
    const plan = compile(v2);
    const s = sourcesDepuisFige(plan, felix);
    expect(okko(lecteur(plan, s)("reussite"))).toBe("OK");
    const etat = remplissage(plan, s);
    expect(etat.provisoire).toBe(true);
    expect(trie(idsExigences(plan, etat))).toEqual(trie(felix.erreursRemplissage));
  });
});

// --- Erreurs de remplissage ----------------------------------------------------------

/** Colonne « Erreurs de remplissage » de g3-moniteur-camp.md, telle qu'affichée. */
const ERREURS_DOC: Record<"V1-copie" | "V2-copie" | "V2-final", Record<string, string>> = {
  "V1-copie": {
    Alice: "SR1, SR2, SR3, SR4, Pres",
    Bruno: "SR1, SR2, SR3, SR4, Pres",
    Chloé: "SR1, SR2, SR3, SR4, Pres",
    David: "SR1, SR2, SR3, SR4, Pres",
    Emma: "SR1, SR2, SR3, SR4, Pres",
    Félix: "SR1, SR2, SR3, SR4, Gest, Pres, Animation < 2 actives",
  },
  "V2-copie": {
    Alice: "SR1, SR2, SR3, SR4, SR5, Pres",
    Bruno: "SR1, SR2, SR3, SR4, SR5, Pres",
    Chloé: "SR1, SR2, SR3, SR4, SR5, Pres",
    David: "SR1, SR2, SR3, SR4, SR5, Pres",
    Emma: "SR1, SR2, SR3, SR4, SR5, Pres",
    Félix: "SR1, SR2, SR3, SR4, SR5, Gest, Pres, Animation < 2 actives",
  },
  "V2-final": {
    Alice: "aucune",
    Bruno: "aucune",
    Chloé: "SR1, SR2, SR3, SR4, SR5",
    David: "aucune",
    Emma: "aucune",
    Félix: "SR5, Gest, Pres",
  },
};
const LIBELLES_DOC: Record<string, string> = { Gest: "gestion", Pres: "m6", "Animation < 2 actives": "animation" };
const depuisDoc = (s: string) => (s === "aucune" ? [] : s.split(", ").map((x) => LIBELLES_DOC[x] ?? x.toLowerCase()));

describe("G3, colonnes « Erreurs de remplissage »", () => {
  const plans = { "V1-copie": compile(v1), "V2-copie": compile(v2), "V2-final": compile(v2) };
  const cas = (Object.keys(ERREURS_DOC) as (keyof typeof ERREURS_DOC)[]).flatMap((etat) =>
    Object.entries(ERREURS_DOC[etat]).map(([nom, doc]) => [etat, nom, doc] as const),
  );

  test.each(cas)("%s, %s : égale la table du doc (%s) et les erreurs figées", (etat, nom, doc) => {
    const plan = plans[etat];
    const pt = participant(etat, nom);
    const r = remplissage(plan, sourcesDepuisFige(plan, pt));
    expect(trie(idsExigences(plan, r))).toEqual(trie(depuisDoc(doc)));
    expect(trie(idsExigences(plan, r))).toEqual(trie(pt.erreursRemplissage));
    expect(r.provisoire).toBe(doc !== "aucune");
    expect(r.erreurs.filter((e) => e.type === "dispenseSansEffet")).toEqual([]);
  });

  test("Chloé : les obligatoires SR1–SR5 couverts par la dispense sont en erreur « non évalué »", () => {
    const plan = plans["V2-final"];
    const r = remplissage(plan, sourcesDepuisFige(plan, participant("V2-final", "Chloé")));
    expect(r.erreurs.map((e) => (e.type === "obligatoire" ? `${plan.ids[e.n]}:${e.etat}` : e.type))).toEqual(
      ["sr1", "sr2", "sr3", "sr4", "sr5"].map((id) => `${id}:nonEvalue`),
    );
  });

  test("Félix V1 : « Animation < 2 actives » compte 1 note active sur Consignes E2, Consignes E3, Gestion", () => {
    const plan = plans["V1-copie"];
    const r = remplissage(plan, sourcesDepuisFige(plan, participant("V1-copie", "Félix")));
    expect(r.erreurs.find((e) => e.type === "minimum")).toEqual({
      type: "minimum",
      n: plan.index.get("animation"),
      actives: 1,
      minActives: 2,
    });
  });

  test.each(figes.commutateurs.filter((c) => c.erreursRemplissage).map((c) => [c.nom, JSON.stringify(c.commutateurs), c] as const))(
    "%s %s : erreurs figées",
    (_nom, _c, c) => {
      const plan = compile(v2, c.commutateurs as Commutateurs);
      const pt = participant(c.etat, c.nom);
      const fige = c.nonEvaluations ? avecNonEvaluations(pt, c.nonEvaluations) : pt;
      expect(trie(idsExigences(plan, remplissage(plan, sourcesDepuisFige(plan, fige))))).toEqual(trie(c.erreursRemplissage!));
    },
  );

  test("1c inactif : plus d'erreur de minimum (Félix V1), les obligatoires restent", () => {
    const plan = compile(v1, { minimum1c: false });
    const pt = participant("V1-copie", "Félix");
    const r = remplissage(plan, sourcesDepuisFige(plan, pt));
    expect(r.erreurs.some((e) => e.type === "minimum")).toBe(false);
    expect(trie(idsExigences(plan, r))).toEqual(trie(pt.erreursRemplissage.filter((id) => id !== "animation")));
  });
});

describe("A01 « Obligatoires vides » et A03 « Critères sans note »", () => {
  test.each([
    ["A01", a01Json, a01Figes],
    ["A03", a03Json, a03Figes],
  ])("%s : les erreurs de chaque participant type égalent les erreurs figées", (_g, structure, fichier) => {
    const plan = compile(structure as unknown as Grille);
    for (const pt of (fichier as FichierParticipants).participants) {
      const r = remplissage(plan, sourcesDepuisFige(plan, pt));
      expect(trie(idsExigences(plan, r)), pt.nom).toEqual(trie(pt.erreursRemplissage));
      expect(r.provisoire, pt.nom).toBe(pt.erreursRemplissage.length > 0);
    }
  });
});

// --- 1a-B sur un cas construit -------------------------------------------------------

/**
 * a = 4, b = 2, c = 5 (barème 0–10). Calculs F1, poids 1 :
 *   m0 = F1(b) ; m1 = F1(a, m0) ; m3 = F1(b) ; m2 = F1(c, m1, m3) ;
 *   d = F1(m1, m2) ; x = F1(m1, c) (hors du cône de d).
 * Sans dispense, à la main : m0 = 2, m1 = 3, m3 = 2, m2 = 10/3, d = 19/6, x = 4.
 * 1a-B, dispense sur d : d sans résultat. m3 n'est consommé que par m2, et m2
 * que par d : tous deux sont calculés sans leurs feuilles (m3 sans résultat,
 * m2 = F1(m1) = 3). m1 est consommé par x, hors du cône : calcul normal (3),
 * signalé ; m0, qui ne sort du cône que par m1, aussi (2). x = 4.
 */
const CONSTRUIT: Grille = {
  grille: "1a-B construit",
  baremes: [{ id: "n", type: "numerique", min: 0, max: 10, pas: 1 }],
  noeuds: [
    { id: "reg", type: "regroupement", libelle: "Regroupement" },
    { id: "a", type: "donnees", libelle: "a", bareme: "n", obligatoire: true },
    { id: "b", type: "donnees", libelle: "b", bareme: "n" },
    { id: "c", type: "donnees", libelle: "c", bareme: "n" },
    { id: "m0", type: "calcul", libelle: "m0", fonction: "F1", entrees: [{ noeud: "b", poids: 1 }] },
    { id: "m1", type: "calcul", libelle: "m1", fonction: "F1", entrees: [{ noeud: "a", poids: 1 }, { noeud: "m0", poids: 1 }] },
    { id: "m3", type: "calcul", libelle: "m3", fonction: "F1", entrees: [{ noeud: "b", poids: 1 }] },
    {
      id: "m2",
      type: "calcul",
      libelle: "m2",
      fonction: "F1",
      entrees: [{ noeud: "c", poids: 1 }, { noeud: "m1", poids: 1 }, { noeud: "m3", poids: 1 }],
    },
    { id: "d", type: "calcul", libelle: "d", fonction: "F1", entrees: [{ noeud: "m1", poids: 1 }, { noeud: "m2", poids: 1 }] },
    { id: "x", type: "calcul", libelle: "x", fonction: "F1", entrees: [{ noeud: "m1", poids: 1 }, { noeud: "c", poids: 1 }] },
  ],
  axes: [
    {
      id: "principal",
      libelle: "Principal",
      principal: true,
      arbre: [
        {
          noeud: "reg",
          enfants: [
            {
              noeud: "d",
              enfants: [
                { noeud: "m1", enfants: [{ noeud: "a" }, { noeud: "m0", enfants: [{ noeud: "b" }] }] },
                { noeud: "m2", enfants: [{ noeud: "c" }, { noeud: "m3" }] },
              ],
            },
          ],
        },
        { noeud: "x" },
      ],
    },
  ],
  exigences: { minimumParRegroupement: [{ noeud: "principal", minActives: 3 }] },
};

function sourcesConstruit(plan: Plan, cases: Record<string, number>, nonEvaluations: string[] = []): SourcesParticipant {
  const s: SourcesParticipant = { cases: new Float64Array(plan.D).fill(NaN), nonEvaluations: [], jokers: [] };
  for (const [id, v] of Object.entries(cases)) s.cases[plan.indexDonnee[plan.index.get(id)!]] = v;
  s.nonEvaluations = nonEvaluations.map((id) => ({ n: plan.index.get(id)! }));
  return s;
}

describe("1a-B, dispense sur la contribution (cas construit)", () => {
  const ids = ["m0", "m1", "m3", "m2", "d", "x"];
  const valeurs = (plan: Plan, s: SourcesParticipant) => {
    const r = evaluate(plan, s);
    return Object.fromEntries(ids.map((id) => [id, Number.isNaN(r.valeurs[plan.index.get(id)!]) ? null : r.valeurs[plan.index.get(id)!]]));
  };
  const cases = { a: 4, b: 2, c: 5 };

  test("sans dispense, à la main", () => {
    const plan = compile(CONSTRUIT);
    const v = valeurs(plan, sourcesConstruit(plan, cases));
    expect(v.m0).toBe(2);
    expect(v.m1).toBe(3);
    expect(v.m3).toBe(2);
    expect(v.m2).toBeCloseTo(10 / 3, 12);
    expect(v.d).toBeCloseTo(19 / 6, 12);
    expect(v.x).toBe(4);
  });

  test("un nœud entièrement dans le cône est calculé sans les feuilles ; un nœud consommé hors du cône, normalement et signalé", () => {
    const plan = compile(CONSTRUIT, { dispense1a: "B" });
    const s = sourcesConstruit(plan, cases, ["d"]);
    expect(valeurs(plan, s)).toEqual({ m0: 2, m1: 3, m3: null, m2: 3, d: null, x: 4 });
    const r = evaluate(plan, s);
    const marques = ids.filter((id) => r.marques[plan.index.get(id)!] & MARQUE_CHEMIN_DISPENSE);
    expect(marques).toEqual(["m0", "m1"]);
    expect(remplissage(plan, s).signalements.map((x) => plan.ids[x.n])).toEqual(["m0", "m1"]);
  });

  test("1a-B, graphe et explication : m2 = 3 sans c (arête c → m2 inactive), x = 4 avec c (arête c → x active)", () => {
    const plan = compile(CONSTRUIT, { dispense1a: "B" });
    const s = sourcesConstruit(plan, cases, ["d"]);
    const id = (n: number) => plan.ids[n];
    const actives = graphe(plan, s).aretes.filter((a) => a.active).map((a) => `${id(a.de)}→${id(a.vers)}`);
    expect(actives).toContain("m1→m2");
    expect(actives).toContain("c→x");
    expect(actives).not.toContain("c→m2");
    expect(actives).not.toContain("m3→m2");
    const m2 = explain(plan, s, plan.index.get("m2")!);
    expect(m2.entrees.map((e) => [e.id, e.statut])).toEqual([
      ["c", "horsCone"],
      ["m1", "active"],
      ["m3", "sansResultat"],
    ]);
  });

  test("en 1a-A (1b-B), la même dispense couvre a, b, c partout : x aussi est sans résultat", () => {
    const plan = compile(CONSTRUIT, { feuilles1b: "B" });
    expect(valeurs(plan, sourcesConstruit(plan, cases, ["d"]))).toEqual({ m0: null, m1: null, m3: null, m2: null, d: null, x: null });
  });

  test("1a-B : les exigences restent celles de 1a-A (l'obligatoire a est couvert par la dispense de d)", () => {
    const plan = compile(CONSTRUIT, { dispense1a: "B" });
    const r = remplissage(plan, sourcesConstruit(plan, cases, ["d"]));
    expect(r.erreurs.map((e) => [e.type, e.n < 0 ? "grille" : plan.ids[e.n]])).toEqual([
      ["obligatoire", "a"],
      ["minimum", "grille"],
    ]);
  });

  test("1a-B : une dispense sur un regroupement est sans effet et signalée", () => {
    const plan = compile(CONSTRUIT, { dispense1a: "B" });
    expect(plan.dispenseSansEffet[plan.index.get("reg")!]).toBe(1);
    expect(plan.dispenseSansEffet[plan.index.get("d")!]).toBe(0);
    const s = sourcesConstruit(plan, cases, ["reg"]);
    expect(valeurs(plan, s)).toEqual(valeurs(plan, sourcesConstruit(plan, cases)));
    expect(remplissage(plan, s).erreurs.find((e) => e.type === "dispenseSansEffet")?.n).toBe(plan.index.get("reg"));
  });

  test("1a-A, 1b-A : la dispense du regroupement couvre ses feuilles placées, et le retrait les rend actives", () => {
    const plan = compile(CONSTRUIT);
    expect(plan.dispenseSansEffet[plan.index.get("reg")!]).toBe(0);
    const avec = sourcesConstruit(plan, cases, ["reg"]);
    expect(valeurs(plan, avec)).toEqual({ m0: null, m1: null, m3: null, m2: null, d: null, x: null });
    expect(avec.cases[plan.indexDonnee[plan.index.get("a")!]]).toBe(4);
    expect(valeurs(plan, sourcesConstruit(plan, cases, []))).toEqual(valeurs(compile(CONSTRUIT), sourcesConstruit(plan, cases)));
  });
});

describe("minimum de grille, sur la racine de l'axe principal", () => {
  test("compte les cases notées et non couvertes de toutes les données placées dans l'axe principal", () => {
    const plan = compile(CONSTRUIT);
    expect(plan.minimums).toHaveLength(1);
    expect(plan.minimums[0].n).toBe(-1);
    const deux = remplissage(plan, sourcesConstruit(plan, { a: 4, b: 2 }));
    expect(deux.erreurs).toEqual([{ type: "minimum", n: -1, actives: 2, minActives: 3 }]);
    expect(deux.provisoire).toBe(true);
    expect(remplissage(plan, sourcesConstruit(plan, { a: 4, b: 2, c: 5 }))).toEqual({ erreurs: [], signalements: [], provisoire: false });
    // Une case marquée « non évalué » ne compte plus.
    const ne = remplissage(plan, sourcesConstruit(plan, { a: 4, b: 2, c: 5 }, ["c"]));
    expect(ne.erreurs).toEqual([{ type: "minimum", n: -1, actives: 2, minActives: 3 }]);
  });

  test("1b-B : un minimum sur un regroupement n'a pas de feuilles ; signalé, sans avertissement", () => {
    const g = structuredClone(CONSTRUIT);
    g.exigences = { minimumParRegroupement: [{ noeud: "reg", minActives: 1 }] };
    const plan = compile(g, { feuilles1b: "B" });
    const r = remplissage(plan, sourcesConstruit(plan, { a: 4, b: 2, c: 5 }));
    expect(r.erreurs).toEqual([{ type: "minimumSansFeuilles", n: plan.index.get("reg") }]);
    expect(r.provisoire).toBe(false);
    // En 1b-A, le même minimum compte les feuilles placées sous le regroupement.
    const a = compile(g);
    expect(remplissage(a, sourcesConstruit(a, { a: 4, b: 2, c: 5 }))).toEqual({ erreurs: [], signalements: [], provisoire: false });
  });

  test("1c inactif : aucun minimum", () => {
    expect(compile(CONSTRUIT, { minimum1c: false }).minimums).toEqual([]);
  });
});
