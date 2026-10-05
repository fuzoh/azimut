// Copie de grille (ticket #21). Résultats, sources et rapport attendus : figés
// par `g3-controle.py --figer` (seconde source) ou établis à la main sur de
// petites structures ; jamais dérivés de `copier`.

import g3Figes from "@corpus/g3-participants.json";
import v1Json from "@corpus/g3-v1-structure.json";
import v2Json from "@corpus/g3-v2-structure.json";
import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { type Commutateurs, compile, ErreurCompilation, type Plan } from "./compile";
import { copier, type ElementRapport, structureIdentique } from "./copier";
import { couverture } from "./dispense";
import { evaluate, MARQUE_INFLUENCE_JOKER, MARQUE_JOKER_APPLIQUE, type SourcesParticipant, sourcesVides } from "./evaluate";
import type { FichierG3, Grille, Noeud, ParticipantType, Placement } from "./format";
import { sourcesDepuisFige } from "./participants";
import { idsExigences, remplissage } from "./remplissage";

const v1 = v1Json as unknown as Grille;
const v2 = v2Json as unknown as Grille;
const g3 = g3Figes as unknown as FichierG3;
const plan1 = compile(v1);
const plan2 = compile(v2);
const trie = (l: string[]) => [...l].sort();
/** Le rapport est un ensemble d'éléments : l'ordre ne compte pas. */
const sansOrdre = (l: ElementRapport[]) => l.map((e) => JSON.stringify(e)).sort();

/** Sources V1 de chaque participant d'un état figé, p = rang dans le fichier. */
function sourcesV1(participants: ParticipantType[], plan = plan1): Map<number, SourcesParticipant> {
  return new Map(participants.map((pt, p) => [p, sourcesDepuisFige(plan, pt)]));
}

/** Cases d'une source, en ids : { id: valeur }. */
function casesParId(plan: Plan, s: SourcesParticipant): Record<string, number> {
  const r: Record<string, number> = {};
  s.cases.forEach((v, d) => {
    if (!Number.isNaN(v)) r[plan.ids[plan.donnees[d]]] = v;
  });
  return r;
}

function egale(plan: Plan, s: SourcesParticipant, attendus: Record<string, number | null>, qui: string) {
  const r = evaluate(plan, s);
  for (const [id, a] of Object.entries(attendus)) {
    const v = r.valeurs[plan.index.get(id)!];
    if (a === null) expect(v, `${qui} ${id}`).toBeNaN();
    else expect(v, `${qui} ${id}`).toBeCloseTo(a, 9);
  }
  return r;
}

function marques(plan: Plan, s: SourcesParticipant) {
  const r = evaluate(plan, s);
  return {
    jokerApplique: plan.ids.filter((_, n) => r.marques[n] & MARQUE_JOKER_APPLIQUE),
    influence: plan.ids.filter((_, n) => r.marques[n] & MARQUE_INFLUENCE_JOKER),
  };
}

/**
 * Poursuit la saisie en V2 jusqu'à l'état final : les cases de l'état final
 * (qui contiennent celles de la copie, aux mêmes valeurs), plus ses
 * non-évaluations et jokers absents de la copie.
 */
function poursuivre(plan: Plan, copie: SourcesParticipant, final: ParticipantType): SourcesParticipant {
  const cible = sourcesDepuisFige(plan, final);
  copie.cases.forEach((v, d) => {
    if (!Number.isNaN(v)) expect(cible.cases[d], `${final.nom} ${plan.ids[plan.donnees[d]]}`).toBe(v);
  });
  const s: SourcesParticipant = { cases: cible.cases, nonEvaluations: [...copie.nonEvaluations], jokers: [...copie.jokers] };
  for (const ne of cible.nonEvaluations) if (!s.nonEvaluations.some((x) => x.n === ne.n)) s.nonEvaluations.push(ne);
  for (const j of cible.jokers) if (!s.jokers.some((x) => x.jokerDef === j.jokerDef)) s.jokers.push({ id: 100 + j.id, jokerDef: j.jokerDef });
  return s;
}

function rapportAttendu(etat: "V1-copie" | "J3", participants: ParticipantType[]): ElementRapport[] {
  return g3.copie.rapport[etat].map((e) => ({
    type: "casePerdue",
    p: participants.findIndex((pt) => pt.nom === e.participant),
    noeud: e.noeud,
    valeur: e.valeur,
  }));
}

describe("copie G3 V1 → V2 (sources à la copie)", () => {
  const avant = g3.etats["V1-copie"].participants;
  const { sourcesV2, rapport } = copier(v1, v2, sourcesV1(avant));
  const apres = g3.etats["V2-copie"].participants;

  test.each(apres.map((pt, p) => [pt.nom, p, pt] as const))("%s : sources et table « V2 juste après la copie »", (nom, p, pt) => {
    const s = sourcesV2.get(p)!;
    expect(casesParId(plan2, s)).toEqual(casesParId(plan2, sourcesDepuisFige(plan2, pt)));
    expect(s.nonEvaluations).toEqual([]);
    expect(s.jokers).toEqual([]);
    egale(plan2, s, pt.attendus, nom);
    expect(trie(idsExigences(plan2, remplissage(plan2, s)))).toEqual(trie(pt.erreursRemplissage));
  });

  test("le rapport liste exactement les cases perdues d'Appréciation globale E2", () => {
    expect(rapport).toEqual(rapportAttendu("V1-copie", avant));
  });

  test.each(g3.etats["V2-final"].participants.map((pt, p) => [pt.nom, p, pt] as const))(
    "%s : poursuivre la saisie en V2 donne la table « V2 à l'état final »",
    (nom, p, pt) => {
      const s = poursuivre(plan2, sourcesV2.get(p)!, pt);
      egale(plan2, s, pt.attendus, nom);
      expect(marques(plan2, s)).toEqual(pt.marques);
      expect(trie(idsExigences(plan2, remplissage(plan2, s)))).toEqual(trie(pt.erreursRemplissage));
    },
  );

  test("V1 n'est pas modifiée par la copie", () => {
    const s1 = sourcesV1(avant);
    const avantCopie = [...s1.values()].map((s) => Array.from(s.cases));
    copier(v1, v2, s1);
    expect([...s1.values()].map((s) => Array.from(s.cases))).toEqual(avantCopie);
  });
});

describe("variante J3 : dispense de Chloé et joker d'Emma posés avant la copie", () => {
  const j3 = g3.copie.J3;
  const s1 = sourcesV1(j3.V1.participants);
  const { sourcesV2, rapport } = copier(v1, v2, s1);

  test.each(j3.V1.participants.map((pt, p) => [pt.nom, p, pt] as const))("%s : résultats V1 à J3", (nom, p, pt) => {
    egale(plan1, s1.get(p)!, pt.attendus, nom);
    expect(marques(plan1, s1.get(p)!)).toEqual(pt.marques);
  });

  test.each(j3["V2-copie"].participants.map((pt, p) => [pt.nom, p, pt] as const))(
    "%s : sources, résultats et marques en V2 juste après la copie",
    (nom, p, pt) => {
      const s = sourcesV2.get(p)!;
      const attendu = sourcesDepuisFige(plan2, pt);
      expect(casesParId(plan2, s)).toEqual(casesParId(plan2, attendu));
      expect(s.nonEvaluations).toEqual(attendu.nonEvaluations);
      expect(s.jokers.map((j) => plan2.jokerDefs[j.jokerDef].id)).toEqual(pt.sources.jokers.map((j) => j.jokerDef));
      egale(plan2, s, pt.attendus, nom);
      expect(marques(plan2, s)).toEqual(pt.marques);
      expect(trie(idsExigences(plan2, remplissage(plan2, s)))).toEqual(trie(pt.erreursRemplissage));
    },
  );

  test("SR5, ajouté sous E3, devient dispensé pour Chloé", () => {
    const p = j3["V2-copie"].participants.findIndex((pt) => pt.nom === "Chloé");
    const c = couverture(plan2, sourcesV2.get(p)!.nonEvaluations);
    const couvertes = plan2.ids.filter((_, n) => plan2.indexDonnee[n] >= 0 && c[plan2.indexDonnee[n]]);
    expect(couvertes).toEqual(j3.couvertesParDispenseV2["Chloé"]);
    expect(couvertes).toContain("sr5");
  });

  test("le rapport ne liste que les cases perdues : dispense et joker sont repris tels quels", () => {
    expect(rapport).toEqual(rapportAttendu("J3", j3.V1.participants));
  });

  test.each(g3.etats["V2-final"].participants.map((pt, p) => [pt.nom, p, pt] as const))(
    "%s : poursuivre la saisie donne la table « V2 à l'état final »",
    (nom, p, pt) => {
      const s = poursuivre(plan2, sourcesV2.get(p)!, pt);
      egale(plan2, s, pt.attendus, nom);
      expect(marques(plan2, s)).toEqual(pt.marques);
      expect(trie(idsExigences(plan2, remplissage(plan2, s)))).toEqual(trie(pt.erreursRemplissage));
    },
  );
});

/** V2 sans un regroupement : ses enfants remontent d'un niveau dans chaque axe. */
function sansRegroupement(g: Grille, id: string): Grille {
  const retirer = (arbre: Placement[]): Placement[] =>
    arbre.flatMap((p) => (p.noeud === id ? retirer(p.enfants ?? []) : [p.enfants ? { ...p, enfants: retirer(p.enfants) } : p]));
  return { ...g, noeuds: g.noeuds.filter((n) => n.id !== id), axes: g.axes.map((a) => ({ ...a, arbre: retirer(a.arbre) })) };
}

describe("dispense d'un regroupement supprimé (E3), reportée ou perdue", () => {
  const rs = g3.copie.regroupementSupprime;
  const v2b = sansRegroupement(v2, rs.noeud);
  const plan2b = compile(v2b);
  const j3 = g3.copie.J3.V1.participants;
  const p = j3.findIndex((pt) => pt.nom === rs.participant);
  const final = g3.etats["V2-final"].participants.find((pt) => pt.nom === rs.participant)!;
  const casesFinales = sourcesDepuisFige(plan2b, { ...final, sources: { ...final.sources, nonEvaluations: [] } }).cases;

  test.each(["reportee", "perdue"] as const)("%s : rapport, sources et résultats à l'état final", (mode) => {
    const { sourcesV2, rapport } = copier(v1, v2b, sourcesV1(j3), { dispenseSupprimee: mode });
    const element: ElementRapport = {
      type: mode === "reportee" ? "nonEvaluationReportee" : "nonEvaluationPerdue",
      p,
      noeud: rs.noeud,
      feuilles: rs.feuillesReportees,
      raison: "noeudSupprime",
    };
    expect(sansOrdre(rapport)).toEqual(sansOrdre([...rapportAttendu("J3", j3), element]));
    const s = sourcesV2.get(p)!;
    const poses = s.nonEvaluations.map((ne) => plan2b.ids[ne.n]);
    expect(poses).toEqual(mode === "reportee" ? rs.feuillesReportees : []);
    const fin: SourcesParticipant = { ...s, cases: casesFinales };
    egale(plan2b, fin, rs[mode].attendus, `${rs.participant} ${mode}`);
    expect(trie(idsExigences(plan2b, remplissage(plan2b, fin)))).toEqual(trie(rs[mode].erreursRemplissage));
  });

  test("par défaut, la dispense est reportée", () => {
    const { rapport } = copier(v1, v2b, sourcesV1(j3));
    expect(rapport.some((e) => e.type === "nonEvaluationReportee")).toBe(true);
  });
});

// --- Petites structures : chaque cas du rapport, établi à la main -----------------

const BAREMES: Grille["baremes"] = [
  { id: "n5", type: "ordinal", paliers: [1, 2, 3, 4, 5].map((v) => ({ valeur: v, libelle: `${v}` })) },
  { id: "n6", type: "ordinal", paliers: [1, 2, 3, 4, 5, 6].map((v) => ({ valeur: v, libelle: `${v}` })) },
  { id: "ok", type: "ordinal", prereglage: "binaire" },
];

/**
 * Petite grille V1 : regroupements R (a, b) et S (c, d), calcul m = F1(a, b, c, d),
 * calcul t = F1(m) ; axe principal « x », axe secondaire « y » où S place a et c.
 * Jokers : +1 sur m (jm), +1 sur t (jt), quota 2.
 */
const petiteV1: Grille = {
  grille: "P1",
  baremes: BAREMES,
  noeuds: [
    { id: "R", type: "regroupement", libelle: "R" },
    { id: "S", type: "regroupement", libelle: "S" },
    { id: "a", type: "donnees", libelle: "a", bareme: "n5" },
    { id: "b", type: "donnees", libelle: "b", bareme: "n5" },
    { id: "c", type: "donnees", libelle: "c", bareme: "n5" },
    { id: "d", type: "donnees", libelle: "d", bareme: "n5" },
    { id: "m", type: "calcul", libelle: "m", fonction: "F1", entrees: ["a", "b", "c", "d"].map((noeud) => ({ noeud, poids: 1 })) },
    { id: "t", type: "calcul", libelle: "t", fonction: "F1", entrees: [{ noeud: "m", poids: 1 }] },
  ],
  axes: [
    {
      id: "x",
      libelle: "x",
      principal: true,
      arbre: [
        { noeud: "R", enfants: [{ noeud: "a" }, { noeud: "b" }] },
        { noeud: "S", enfants: [{ noeud: "c" }, { noeud: "d" }] },
        { noeud: "m" },
        { noeud: "t" },
      ],
    },
    { id: "y", libelle: "y", arbre: [{ noeud: "S", enfants: [{ noeud: "a" }, { noeud: "c" }] }] },
  ],
  jokers: {
    quota: 2,
    autorises: [
      { id: "jm", noeud: "m", action: { type: "ajout", valeur: 1 } },
      { id: "jt", noeud: "t", action: { type: "ajout", valeur: 1 } },
    ],
  },
};

/** V2 : b passe sur n6 (barème changé), d supprimé, R supprimé, axe y supprimé, jt supprimé, jm autorise t, quota 0. */
const petiteV2: Grille = {
  grille: "P2",
  provenance: { grille: "P1" },
  baremes: BAREMES,
  noeuds: [
    { id: "S", type: "regroupement", libelle: "S", origine: "S" },
    { id: "a", type: "donnees", libelle: "a", bareme: "n5", origine: "a" },
    { id: "b", type: "donnees", libelle: "b", bareme: "n6", origine: "b" },
    { id: "c", type: "donnees", libelle: "c", bareme: "n5", origine: "c" },
    { id: "e", type: "donnees", libelle: "e (nouveau)", bareme: "n5" },
    { id: "m", type: "calcul", libelle: "m", fonction: "F1", entrees: ["a", "c", "e"].map((noeud) => ({ noeud, poids: 2 })), origine: "m" },
    { id: "u", type: "calcul", libelle: "u", fonction: "F1", entrees: [{ noeud: "b", poids: 1 }] },
    { id: "t", type: "calcul", libelle: "t", fonction: "F1", entrees: [{ noeud: "m", poids: 1 }], origine: "t" },
  ],
  axes: [
    {
      id: "x",
      libelle: "x",
      principal: true,
      arbre: [{ noeud: "a" }, { noeud: "b" }, { noeud: "S", enfants: [{ noeud: "c" }, { noeud: "e" }] }, { noeud: "m" }, { noeud: "u" }, { noeud: "t" }],
      origine: "x",
    },
  ],
  jokers: { quota: 0, autorises: [{ id: "jm", noeud: "t", action: { type: "ajout", valeur: 1 }, origine: "jm" }] },
};

function sourcesPetite(cases: Record<string, number>, nonEvaluations: { n: string; axe?: string }[], jokers: string[]): SourcesParticipant {
  const plan = compile(petiteV1);
  const s = sourcesVides(plan);
  for (const [id, v] of Object.entries(cases)) s.cases[plan.indexDonnee[plan.index.get(id)!]] = v;
  s.nonEvaluations = nonEvaluations.map((ne) => ({
    n: plan.index.get(ne.n)!,
    ...(ne.axe === undefined ? {} : { axe: petiteV1.axes.findIndex((a) => a.id === ne.axe) }),
  }));
  s.jokers = jokers.map((id, i) => ({ id: 10 + i, jokerDef: plan.indexJoker.get(id)! }));
  return s;
}

describe("rapport de copie, petite structure", () => {
  const p2 = compile(petiteV2);
  const id2 = (s: SourcesParticipant) => ({
    cases: casesParId(p2, s),
    nonEvaluations: s.nonEvaluations.map((ne) => (ne.axe === undefined ? plan2Id(ne.n) : `${plan2Id(ne.n)}@${petiteV2.axes[ne.axe].id}`)),
    jokers: s.jokers.map((j) => `${j.id}:${p2.jokerDefs[j.jokerDef].id}`),
  });
  const plan2Id = (n: number) => p2.ids[n];

  test("cases : reprises, non reprises (barème), perdues (supprimé), vides (nouveau) ; jokers et non-évaluations", () => {
    const s = sourcesPetite({ a: 1, b: 2, c: 3, d: 4 }, [{ n: "R" }, { n: "d" }], ["jm", "jt"]);
    const { sourcesV2, rapport } = copier(petiteV1, petiteV2, new Map([[0, s]]));
    expect(id2(sourcesV2.get(0)!)).toEqual({ cases: { a: 1, c: 3 }, nonEvaluations: ["a", "b"], jokers: [] });
    expect(rapport).toEqual([
      { type: "caseNonReprise", p: 0, noeud: "b", valeur: 2 },
      { type: "casePerdue", p: 0, noeud: "d", valeur: 4 },
      // R (a, b) supprimé : reportée sur a et b, encore présents.
      { type: "nonEvaluationReportee", p: 0, noeud: "R", feuilles: ["a", "b"], raison: "noeudSupprime" },
      { type: "nonEvaluationPerdue", p: 0, noeud: "d", feuilles: [], raison: "noeudSupprime" },
      { type: "jokerPerdu", p: 0, id: 10, jokerDef: "jm", raison: "noeudNonAutorise" },
      { type: "jokerPerdu", p: 0, id: 11, jokerDef: "jt", raison: "definitionSupprimee" },
    ]);
  });

  test("mode « reportée » : non-évaluations sur a et b ; mode « perdue » : rien n'est posé", () => {
    const s = sourcesPetite({}, [{ n: "R" }], []);
    const reportee = copier(petiteV1, petiteV2, new Map([[0, s]]));
    expect(id2(reportee.sourcesV2.get(0)!).nonEvaluations).toEqual(["a", "b"]);
    const perdue = copier(petiteV1, petiteV2, new Map([[0, s]]), { dispenseSupprimee: "perdue" });
    expect(id2(perdue.sourcesV2.get(0)!).nonEvaluations).toEqual([]);
    expect(perdue.rapport).toEqual([{ type: "nonEvaluationPerdue", p: 0, noeud: "R", feuilles: ["a", "b"], raison: "noeudSupprime" }]);
  });

  test("1b-C, axe de la dispense supprimé : S sur l'axe y (a, c) reporté ou perdu ; hors 1b-C, copié sans axe", () => {
    const s = sourcesPetite({}, [{ n: "S", axe: "y" }], []);
    const c: Commutateurs = { feuilles1b: "C" };
    const reportee = copier(petiteV1, petiteV2, new Map([[0, s]]), { commutateurs: c });
    expect(id2(reportee.sourcesV2.get(0)!).nonEvaluations).toEqual(["a", "c"]);
    expect(reportee.rapport).toEqual([
      { type: "nonEvaluationReportee", p: 0, noeud: "S", axe: "y", feuilles: ["a", "c"], raison: "axeSupprime" },
    ]);
    const perdue = copier(petiteV1, petiteV2, new Map([[0, s]]), { commutateurs: c, dispenseSupprimee: "perdue" });
    expect(id2(perdue.sourcesV2.get(0)!).nonEvaluations).toEqual([]);
    expect(perdue.rapport).toEqual([{ type: "nonEvaluationPerdue", p: 0, noeud: "S", axe: "y", feuilles: ["a", "c"], raison: "axeSupprime" }]);
    const horsC = copier(petiteV1, petiteV2, new Map([[0, s]]));
    expect(id2(horsC.sourcesV2.get(0)!).nonEvaluations).toEqual(["S"]);
    expect(horsC.rapport).toEqual([{ type: "nonEvaluationSansAxe", p: 0, noeud: "S", axe: "y" }]);
  });

  test("quota V2 inférieur aux jokers repris : tous gardés, signalé, erreur « quota dépassé »", () => {
    const identique = structureIdentique(petiteV1);
    const v2q: Grille = { ...identique, jokers: { ...identique.jokers!, quota: 1 } };
    const s = sourcesPetite({ a: 2 }, [], ["jm", "jt"]);
    const { sourcesV2, rapport } = copier(petiteV1, v2q, new Map([[0, s]]));
    expect(sourcesV2.get(0)!.jokers.map((j) => j.id)).toEqual([10, 11]);
    expect(rapport).toEqual([{ type: "quotaDepasse", p: 0, jokers: 2, quota: 1 }]);
    const pq = compile(v2q);
    const erreurs = remplissage(pq, sourcesV2.get(0)!).erreurs.filter((e) => e.type === "quotaDepasse");
    expect(erreurs).toEqual([{ type: "quotaDepasse", n: pq.index.get("t")!, joker: 11, raison: "quota" }]);
  });
});

describe("compile refuse une scission ou une fusion", () => {
  const erreurs = (g: Grille) => {
    try {
      compile(g);
      return [];
    } catch (e) {
      if (e instanceof ErreurCompilation) return e.erreurs;
      throw e;
    }
  };
  test("deux nœuds V2 de même origine (scission)", () => {
    const g = structureIdentique(petiteV1);
    (g.noeuds.find((n) => n.id === "b") as Noeud).origine = "a";
    expect(erreurs(g)).toEqual(["nœuds : scission refusée, a et b ont la même origine a"]);
  });
  test("un nœud à plusieurs origines (fusion)", () => {
    const g = structureIdentique(petiteV1);
    (g.noeuds.find((n) => n.id === "m") as { origine?: unknown }).origine = ["a", "b"];
    expect(erreurs(g)).toEqual(["nœuds : fusion refusée, m a plusieurs origines"]);
  });
  test("scission d'un axe ou d'une définition de joker", () => {
    const g = structureIdentique(petiteV1);
    g.axes[1].origine = "x";
    g.jokers!.autorises[1].origine = "jm";
    expect(erreurs(g)).toEqual([
      "axes : scission refusée, x et y ont la même origine x",
      "jokers : scission refusée, jm et jt ont la même origine jm",
    ]);
  });
});

// --- Propriété : copie à l'identique ------------------------------------------------

/** Structure aléatoire : données (n5 ou OK/KO), calculs F1–F5 en DAG, regroupements, 2 axes, jokers. */
const arbStructure = fc
  .record({
    donnees: fc.array(fc.boolean(), { minLength: 2, maxLength: 8 }),
    calculs: fc.array(
      fc.record({
        f: fc.constantFrom("F1", "F2", "F3", "F4", "F5"),
        entrees: fc.array(fc.record({ i: fc.nat(), poids: fc.integer({ min: 0, max: 3 }) }), { minLength: 1, maxLength: 4 }),
        seuil: fc.integer({ min: 0, max: 5 }),
        k: fc.integer({ min: 1, max: 3 }),
      }),
      { minLength: 1, maxLength: 6 },
    ),
    regroupements: fc.array(fc.array(fc.nat(), { maxLength: 4 }), { maxLength: 3 }),
    jokers: fc.array(fc.record({ i: fc.nat(), ajout: fc.integer({ min: -2, max: 10 }) }), { maxLength: 3 }),
    quota: fc.integer({ min: 0, max: 2 }),
  })
  .map((r): Grille => {
    const noeuds: Noeud[] = r.donnees.map((ok, i) => ({ id: `d${i}`, type: "donnees", libelle: `d${i}`, bareme: ok ? "ok" : "n5" }));
    const ok = new Set(r.donnees.flatMap((b, i) => (b ? [`d${i}`] : [])));
    r.calculs.forEach((c, j) => {
      const avant = noeuds.filter((n) => n.type !== "regroupement").map((n) => n.id);
      // Règle de mélange : les entrées de données d'un calcul partagent un barème.
      let entrees = c.entrees.map((e) => ({ noeud: avant[e.i % avant.length], poids: e.poids }));
      const donnee = entrees.find((e) => e.noeud.startsWith("d"));
      if (donnee) entrees = entrees.filter((e) => !e.noeud.startsWith("d") || ok.has(e.noeud) === ok.has(donnee.noeud));
      entrees = entrees.filter((e, i) => entrees.findIndex((x) => x.noeud === e.noeud) === i);
      const params = c.f === "F2" ? { seuil: c.seuil } : c.f === "F4" ? { k: c.k } : c.f === "F5" ? { mode: "meilleure" as const, plafond: 60 } : undefined;
      noeuds.push({ id: `c${j}`, type: "calcul", libelle: `c${j}`, fonction: c.f, entrees, ...(params ? { params } : {}) });
    });
    const feuilles = noeuds.map((n) => n.id);
    const regroupements = r.regroupements.map((enfants, j) => {
      noeuds.push({ id: `r${j}`, type: "regroupement", libelle: `r${j}` });
      return { noeud: `r${j}`, enfants: [...new Set(enfants.map((e) => feuilles[e % feuilles.length]))].map((noeud) => ({ noeud })) };
    });
    const calculs = noeuds.filter((n) => n.type === "calcul").map((n) => n.id);
    return {
      grille: "aléatoire",
      baremes: BAREMES,
      noeuds,
      axes: [
        { id: "principal", libelle: "principal", principal: true, arbre: [...regroupements, ...feuilles.map((noeud) => ({ noeud }))] },
        { id: "second", libelle: "second", arbre: regroupements.slice(0, 1).map((p) => ({ ...p })) },
      ],
      jokers: {
        quota: r.quota,
        autorises: r.jokers.map((j, i) => ({ id: `j${i}`, noeud: calculs[j.i % calculs.length], action: { type: "ajout", valeur: j.ajout } })),
      },
    };
  });

const arbCas = fc.record({
  structure: arbStructure,
  sources: fc.array(
    fc.record({
      cases: fc.array(fc.option(fc.nat(4), { nil: undefined }), { minLength: 8, maxLength: 8 }),
      nonEvaluations: fc.array(fc.record({ i: fc.nat(), axe: fc.option(fc.constantFrom(0, 1), { nil: undefined }) }), { maxLength: 3 }),
      jokers: fc.array(fc.nat(), { maxLength: 3 }),
    }),
    { minLength: 1, maxLength: 3 },
  ),
  commutateurs: fc.record({
    feuilles1b: fc.constantFrom("A" as const, "B" as const, "C" as const),
    dispense1a: fc.constantFrom("A" as const, "B" as const),
    h5b: fc.constantFrom("unSeul" as const, "cumules" as const),
  }),
});

describe("propriété : copie à l'identique", () => {
  test("mêmes résultats et mêmes marques sur tous les nœuds, rapport vide", () => {
    fc.assert(
      fc.property(arbCas, ({ structure, sources, commutateurs }) => {
        const plan = compile(structure, commutateurs);
        const parP = new Map(
          sources.map((t, p) => {
            const s = sourcesVides(plan);
            for (let d = 0; d < plan.D; d++) {
              const v = t.cases[d];
              const b = plan.baremes[plan.bareme[plan.donnees[d]]];
              s.cases[d] = v === undefined ? NaN : v % b.valeurs.length;
            }
            const vus = new Set<number>();
            for (const ne of t.nonEvaluations) {
              const n = ne.i % plan.N;
              if (vus.has(n)) continue;
              vus.add(n);
              s.nonEvaluations.push(ne.axe === undefined ? { n } : { n, axe: ne.axe });
            }
            if (plan.jokerDefs.length > 0) s.jokers = t.jokers.map((j, id) => ({ id, jokerDef: j % plan.jokerDefs.length }));
            return [p, s] as const;
          }),
        );
        const copie = structureIdentique(structure);
        const { sourcesV2, rapport } = copier(structure, copie, parP, { commutateurs });
        expect(rapport).toEqual([]);
        const plan2 = compile(copie, commutateurs);
        for (const [p, s] of parP) {
          const a = evaluate(plan, s);
          const b = evaluate(plan2, sourcesV2.get(p)!);
          expect(Array.from(b.valeurs)).toEqual(Array.from(a.valeurs));
          expect(Array.from(b.marques)).toEqual(Array.from(a.marques));
          expect(remplissage(plan2, sourcesV2.get(p)!)).toEqual(remplissage(plan, s));
        }
      }),
      { numRuns: 300 },
    );
  });
});
