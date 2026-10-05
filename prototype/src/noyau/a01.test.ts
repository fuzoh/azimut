// Participants types de A01 : l'oracle contre les résultats figés par
// `a01-a03-controle.py --figer` (sémantique 18 ; seconde source, jamais le code testé).

import a01 from "@corpus/a01-structure.json";
import figes from "@corpus/a01-participants.json";
import { describe, expect, test } from "vitest";
import { compile, TYPE_CALCUL } from "./compile";
import { evaluate } from "./evaluate";
import type { FichierParticipants, Grille, Placement } from "./format";
import { sourcesDepuisFige } from "./participants";

const grille = a01 as unknown as Grille;
const participants = (figes as FichierParticipants).participants;
const plan = compile(grille);

function resultats(nom: string) {
  const p = participants.find((x) => x.nom === nom)!;
  const r = evaluate(plan, sourcesDepuisFige(plan, p));
  return (id: string): number | null => {
    const v = r.valeurs[plan.index.get(id)!];
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

describe("A01, participants types", () => {
  test("les 4 participants types sont figés", () => {
    expect(participants.map((p) => p.nom)).toEqual(["Ana", "Ben", "Cléo", "Dan"]);
  });

  test.each(participants.map((p) => [p.nom, p] as const))(
    "%s : tous les nœuds de calcul (exercices, thèmes, critères, objectifs, 4.1, 2.1) égalent les résultats figés",
    (nom, p) => {
      expect(Object.keys(p.attendus)).toHaveLength(83);
      expect(ecarts(p.attendus, resultats(nom))).toEqual([]);
    },
  );

  test("Cléo : l'occurrence vide de 4.1 (Système) est ignorée, 4.1 = 73,8 %", () => {
    const cleo = participants.find((p) => p.nom === "Cléo")!;
    const r = resultats("Cléo");
    expect(r("obj:systeme/4.1")).toBeNull();
    expect(r("transv:4.1")).toBeCloseTo(cleo.attendus["transv:4.1"]!, 12);
    expect(Math.round(r("transv:4.1")! * 1000) / 10).toBe(73.8);
  });

  test("Cléo : 4.1 est placé dans Planif sans y compter, l'exercice reste à 100 %", () => {
    const r = resultats("Cléo");
    expect(r("obj:planif-ozr/4.1")).toBe(0.5);
    expect(r("ex:planif-ozr")).toBe(participants.find((p) => p.nom === "Cléo")!.attendus["ex:planif-ozr"]);
    expect(r("ex:planif-ozr")).toBe(1);
  });

  test("Dan : dossier partiel, résultats sur les seules cases présentes", () => {
    const r = resultats("Dan");
    expect(r("ex:construction")).toBe(0.5);
    expect(r("ex:programme")).toBeNull();
  });
});

describe("A01, structure", () => {
  test("grille sans nœud décisif : elle compile et se calcule", () => {
    expect(grille.decisif).toBeUndefined();
    expect(plan.decisif).toBe(-1);
    expect(plan.type.filter((t) => t === TYPE_CALCUL)).toHaveLength(83);
  });

  test("définitions partagées sous des codes différents (2.6.3 de PdC filmé = 2.6.4 de Anim)", () => {
    const def = (id: string) => (grille.noeuds.find((n) => n.id === id) as { definition?: string }).definition!;
    expect(def("crit:pdc-filme/2.6.3")).toBe(def("crit:anim-ozr/2.6.4"));
    const occ = plan.occurrences.get(def("crit:pdc-filme/2.6.3"))!.map((n) => plan.ids[n]);
    expect(occ).toEqual(["crit:pdc-filme/2.6.3", "crit:anim-ozr/2.6.4"]);
    // a01-qualif1.md : 33 définitions ont plusieurs occurrences.
    expect([...plan.occurrences.values()].filter((o) => o.length > 1)).toHaveLength(33);
  });

  test("objectifs transversaux placés sous leur exercice sans y compter", () => {
    const principal = grille.axes.find((a) => a.principal)!;
    const enfants = (id: string): string[] =>
      (principal.arbre.find((p) => p.noeud === id)?.enfants ?? []).map((p: Placement) => p.noeud);
    const entrees = (id: string) => {
      const n = plan.index.get(id)!;
      return new Set(Array.from(plan.inSources.subarray(plan.inOffsets[n], plan.inOffsets[n + 1]), (s) => plan.ids[s]));
    };
    for (const [ex, obj] of [
      ["ex:construction", "obj:construction/4.1"],
      ["ex:programme", "obj:programme/4.1"],
      ["ex:planif-ozr", "obj:planif-ozr/4.1"],
      ["ex:systeme", "obj:systeme/4.1"],
      ["ex:pdc-filme", "obj:pdc-filme/2.1"],
      ["ex:anim-ozr", "obj:anim-ozr/2.1"],
      ["ex:entretien", "obj:entretien/2.1"],
    ]) {
      expect(enfants(ex), ex).toContain(obj);
      const indicateurs = [...entrees(obj)];
      expect(indicateurs.length, obj).toBeGreaterThan(0);
      expect(indicateurs.filter((i) => entrees(ex).has(i)), `${obj} compte dans ${ex}`).toEqual([]);
    }
  });
});
