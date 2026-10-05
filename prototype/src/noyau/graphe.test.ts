// Graphe de propagation (ticket #20). Attendus figés par `g3-controle.py --figer`
// (seconde source) : résultats, marques de joker, chemins multiples, nœud
// décisif, nœuds indicatifs et feuilles couvertes par une dispense de G3 V2 final.

import a01Json from "@corpus/a01-structure.json";
import a01Figes from "@corpus/a01-participants.json";
import a03Json from "@corpus/a03-structure.json";
import a03Figes from "@corpus/a03-participants.json";
import g3Figes from "@corpus/g3-participants.json";
import v2Json from "@corpus/g3-v2-structure.json";
import { describe, expect, test } from "vitest";
import { compile } from "./compile";
import type { FichierG3, FichierParticipants, Grille } from "./format";
import { graphe } from "./graphe";
import { sourcesDepuisFige } from "./participants";

const g3 = g3Figes as unknown as FichierG3;
const plan = compile(v2Json as unknown as Grille);
const final = g3.etats["V2-final"].participants;
const chemins = g3.cheminsMultiples["G3 V2"];
const trie = (l: string[]) => [...l].sort();

describe.each(["Emma", "Chloé", "Bruno"])("graphe de G3 V2 final pour %s", (nom) => {
  const p = final.find((x) => x.nom === nom)!;
  const gr = graphe(plan, sourcesDepuisFige(plan, p));
  const ids = (f: (x: (typeof gr.noeuds)[number]) => boolean) => gr.noeuds.filter(f).map((x) => x.id);

  test("valeurs des nœuds de calcul = résultats figés", () => {
    for (const [id, a] of Object.entries(p.attendus)) {
      const x = gr.noeuds.find((y) => y.id === id)!;
      if (a === null) expect(x.valeur, id).toBeNaN();
      else expect(x.valeur, id).toBeCloseTo(a, 9);
    }
  });

  test("marques de joker figées", () => {
    expect(ids((x) => x.jokerApplique)).toEqual(p.marques!.jokerApplique);
    expect(ids((x) => x.influence)).toEqual(p.marques!.influence);
  });

  test("feuilles couvertes par une dispense figées", () => {
    expect(trie(ids((x) => x.couverteParDispense))).toEqual(g3.graphe.couvertesParDispense[nom]);
  });

  test("les deux sortes de chemins multiples figées", () => {
    expect(trie(ids((x) => x.plusieursExigences))).toEqual(trie(Object.keys(chemins.plusieursExigences)));
    expect(trie(ids((x) => x.influenceMultiple))).toEqual(trie(Object.keys(chemins.influenceMultiple)));
  });

  test("nœud décisif et nœuds indicatifs figés", () => {
    expect(ids((x) => x.decisif)).toEqual([g3.graphe.decisif]);
    expect(ids((x) => x.indicatif)).toEqual(g3.graphe.indicatifs);
  });

  test("arêtes de calcul : une par entrée, active si l'entrée a un résultat", () => {
    const entrees = plan.grille.noeuds.reduce((a, n) => a + (n.type === "calcul" ? n.entrees.length : 0), 0);
    expect(gr.aretes).toHaveLength(entrees);
    for (const a of gr.aretes) {
      const de = gr.noeuds.find((x) => x.n === a.de)!;
      expect(a.active).toBe(!Number.isNaN(de.valeur) && a.poids > 0);
    }
  });
});

describe("graphe : cas propres à un participant", () => {
  test("Emma : joker sur Animation, « influencé » sur Animation ≥ 3 et Réussite, pas sur Minimaux", () => {
    const gr = graphe(plan, sourcesDepuisFige(plan, final.find((x) => x.nom === "Emma")!));
    const x = (id: string) => gr.noeuds.find((y) => y.id === id)!;
    expect(x("animation").jokerApplique).toBe(true);
    expect(x("reussite").influence).toBe(true);
    expect(x("minimaux").influence).toBe(false);
  });

  test("Chloé : les feuilles couvertes gardent leur note saisie, marquée exclue (18 §4)", () => {
    const chloe = final.find((x) => x.nom === "Chloé")!;
    const gr = graphe(plan, sourcesDepuisFige(plan, chloe));
    const saisies = new Set(chloe.sources.cases.map((c) => c.noeud));
    for (const id of g3.graphe.couvertesParDispense["Chloé"]) {
      const x = gr.noeuds.find((y) => y.id === id)!;
      expect(x.noteConservee !== "", id).toBe(saisies.has(id));
      if (saisies.has(id)) expect(x.texte, id).toMatch(/\) exclue$/);
    }
  });

  test("Chloé : la dispense sur reg:e3 est listée avec ses feuilles ; M1 n'a aucune arête active", () => {
    const gr = graphe(plan, sourcesDepuisFige(plan, final.find((x) => x.nom === "Chloé")!));
    expect(gr.dispenses.map((d) => ({ id: d.id, feuilles: trie(d.feuilles) }))).toEqual([
      { id: "reg:e3", feuilles: g3.graphe.couvertesParDispense["Chloé"] },
    ]);
    const m1 = plan.index.get("m1")!;
    expect(gr.aretes.filter((a) => a.vers === m1 && a.active)).toEqual([]);
  });

  test("Bruno : SR1 contribue à Sécurité et M1, toutes deux KO", () => {
    const gr = graphe(plan, sourcesDepuisFige(plan, final.find((x) => x.nom === "Bruno")!));
    const x = (id: string) => gr.noeuds.find((y) => y.id === id)!;
    expect(chemins.plusieursExigences.sr1).toEqual(["securite", "m1"]);
    expect(x("sr1").plusieursExigences).toBe(true);
    expect([x("securite").valeur, x("m1").valeur]).toEqual([0, 0]);
  });
});

describe("graphe des autres grilles du corpus", () => {
  test("A01, sans nœud décisif : tout est indicatif, aucun chemin multiple", () => {
    const pl = compile(a01Json as unknown as Grille);
    for (const p of (a01Figes as FichierParticipants).participants) {
      const gr = graphe(pl, sourcesDepuisFige(pl, p));
      expect(gr.noeuds.every((x) => x.indicatif && !x.decisif)).toBe(true);
      expect(gr.noeuds.some((x) => x.plusieursExigences || x.influenceMultiple)).toBe(false);
    }
  });

  test("A03 : Capucine porte le joker sur sph:C, Réussite est le nœud décisif", () => {
    const pl = compile(a03Json as unknown as Grille);
    const cap = (a03Figes as FichierParticipants).participants.find((p) => p.nom === "Capucine")!;
    const gr = graphe(pl, sourcesDepuisFige(pl, cap));
    expect(gr.noeuds.filter((x) => x.jokerApplique).map((x) => x.id)).toEqual(cap.marques!.jokerApplique);
    expect(gr.noeuds.filter((x) => x.influence).map((x) => x.id)).toEqual(cap.marques!.influence);
    expect(gr.noeuds.filter((x) => x.decisif).map((x) => x.id)).toEqual(["reussite"]);
  });
});
