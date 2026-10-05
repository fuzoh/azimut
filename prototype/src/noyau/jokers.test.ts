// Jokers : valeur effective, marques, `compile`, H5a, H5b et quota (ticket #19).
// Résultats et marques attendus : figés par `g3-controle.py --figer` et
// `a01-a03-controle.py --figer` (seconde source), table « V2 à l'état final »
// de `g3-moniteur-camp.md`, ou calculés à la main (petites structures).

import a03Json from "@corpus/a03-structure.json";
import a03Figes from "@corpus/a03-participants.json";
import g3Figes from "@corpus/g3-participants.json";
import v1Json from "@corpus/g3-v1-structure.json";
import v2Json from "@corpus/g3-v2-structure.json";
import { describe, expect, test } from "vitest";
import { type Commutateurs, compile, ErreurCompilation, type Plan } from "./compile";
import { evaluate, MARQUE_INFLUENCE_JOKER, MARQUE_JOKER_APPLIQUE, type SourcesParticipant, sourcesVides } from "./evaluate";
import type { FichierG3, FichierParticipants, Grille, MarquesFigees, ParticipantType } from "./format";
import { jokersInvalides, refusPose } from "./jokers";
import { sourcesDepuisFige } from "./participants";
import { remplissage } from "./remplissage";

const a03 = a03Json as unknown as Grille;
const v1 = v1Json as unknown as Grille;
const v2 = v2Json as unknown as Grille;
const g3 = g3Figes as unknown as FichierG3;
const a03Participants = (a03Figes as FichierParticipants).participants;

function lecteur(plan: Plan, sources: SourcesParticipant) {
  const r = evaluate(plan, sources);
  const valeur = (id: string): number | null => {
    const v = r.valeurs[plan.index.get(id)!];
    return Number.isNaN(v) ? null : v;
  };
  const marques = (): MarquesFigees => ({
    jokerApplique: plan.ids.filter((_, n) => r.marques[n] & MARQUE_JOKER_APPLIQUE),
    influence: plan.ids.filter((_, n) => r.marques[n] & MARQUE_INFLUENCE_JOKER),
  });
  return { valeur, marques, r };
}

function ecarts(attendus: Record<string, number | null>, obtenu: (id: string) => number | null): string[] {
  return Object.entries(attendus).flatMap(([id, a]) => {
    const o = obtenu(id);
    const ok = a === null ? o === null : o !== null && Math.abs(o - a) < 1e-9;
    return ok ? [] : [`${id} : attendu ${a}, obtenu ${o}`];
  });
}

const emma = () => g3.etats["V2-final"].participants.find((p) => p.nom === "Emma")!;
const capucine = () => a03Participants.find((p) => p.nom === "Capucine")!;
const sansJokers = (p: ParticipantType): ParticipantType => ({ ...p, sources: { ...p.sources, jokers: [] } });
const avecQuota = (g: Grille, quota: number): Grille => ({ ...g, jokers: { ...g.jokers!, quota } });

/** Arrondi d'affichage de G3 (comme g3.test.ts) : 0,1 % ; 0,01 sur Animation ; OK/KO. */
function affiche(id: string, v: number | null): string {
  if (v === null) return "—";
  const demiHaut = (x: number, d: number) => (Math.floor(x * 10 ** d + 0.5 + 1e-9) / 10 ** d).toFixed(d).replace(".", ",");
  if (["securite", "minimaux", "reussite"].includes(id)) return v === 1 ? "OK" : "KO";
  if (id === "animation") return demiHaut(v, 2);
  return `${demiHaut(v, 1)} %`;
}
const COLONNES = ["e1#1", "e1#2", "planif-e1", "e2", "e3", "animation", "securite", "planification", "moyenne-generale", "minimaux", "reussite"];

describe("G3, Emma : joker « remonter au seuil » sur Animation", () => {
  const plan = compile(v2);

  test("égale la ligne Emma de la table « V2 à l'état final » (Animation 3,00, Réussite OK)", () => {
    const { valeur } = lecteur(plan, sourcesDepuisFige(plan, emma()));
    // g3-moniteur-camp.md, « V2 à l'état final (après J5) », ligne Emma.
    const attendu = "75,0 % | 83,3 % | 75,0 % | 66,7 % | 62,5 % | 3,00 | OK | 62,5 % | 63,9 % | OK | OK";
    expect(COLONNES.map((id) => affiche(id, valeur(id)))).toEqual(attendu.split("|").map((c) => c.trim()));
  });

  test("tous les nœuds de calcul égalent les résultats figés", () => {
    const { valeur } = lecteur(plan, sourcesDepuisFige(plan, emma()));
    expect(ecarts(emma().attendus, valeur)).toEqual([]);
  });

  test("sans joker : Animation 2,75 et Réussite KO", () => {
    const { valeur } = lecteur(plan, sourcesDepuisFige(plan, sansJokers(emma())));
    expect(ecarts(emma().attendusSansJoker!, valeur)).toEqual([]);
    // g3-moniteur-camp.md, « Commutateurs » : Emma sans joker.
    expect(affiche("animation", valeur("animation"))).toBe("2,75");
    expect(affiche("reussite", valeur("reussite"))).toBe("KO");
  });

  test("Animation porte « joker appliqué » ; Animation ≥ 3 et Réussite « influencé » ; pas Minimaux remplis", () => {
    const { marques } = lecteur(plan, sourcesDepuisFige(plan, emma()));
    expect(marques()).toEqual(emma().marques);
    // g3-moniteur-camp.md, « Ce que chaque participant montre » : Emma.
    expect(marques().jokerApplique).toEqual(["animation"]);
    expect(marques().influence).toEqual(expect.arrayContaining(["seuil:animation", "reussite"]));
    expect(marques().influence).not.toContain("minimaux");
    expect(marques().influence).not.toContain("animation");
  });

  test("sans joker, aucune marque", () => {
    const { marques } = lecteur(plan, sourcesDepuisFige(plan, sansJokers(emma())));
    expect(marques()).toEqual({ jokerApplique: [], influence: [] });
  });

  test.each(
    (["V1-copie", "V2-copie", "V2-final"] as const).flatMap((etat) =>
      g3.etats[etat].participants.map((p) => [etat, p.nom, p] as const),
    ),
  )("%s, %s : marques figées", (etat, _nom, p) => {
    const pl = compile(etat === "V1-copie" ? v1 : v2);
    expect(lecteur(pl, sourcesDepuisFige(pl, p)).marques()).toEqual(p.marques);
  });
});

describe("A03, Capucine : joker +25 % sur la sphère C", () => {
  const plan = compile(a03);

  test("garde son résultat (sphère C 85 %, Réussite OK) et porte les marques attendues", () => {
    const { valeur, marques } = lecteur(plan, sourcesDepuisFige(plan, capucine()));
    expect(ecarts(capucine().attendus, valeur)).toEqual([]);
    expect(valeur("sph:C")).toBe(85);
    expect(valeur("reussite")).toBe(1);
    expect(marques()).toEqual(capucine().marques);
    expect(marques()).toEqual({ jokerApplique: ["sph:C"], influence: ["seuil:C", "reussite"] });
  });

  test("sans joker : sphère C 60 %, Réussite KO, aucune marque", () => {
    const { valeur, marques } = lecteur(plan, sourcesDepuisFige(plan, sansJokers(capucine())));
    expect(ecarts(capucine().attendusSansJoker!, valeur)).toEqual([]);
    expect(valeur("reussite")).toBe(0);
    expect(marques()).toEqual({ jokerApplique: [], influence: [] });
  });

  test.each(a03Participants.map((p) => [p.nom, p] as const))("%s : marques figées", (_nom, p) => {
    expect(lecteur(plan, sourcesDepuisFige(plan, p)).marques()).toEqual(p.marques);
  });
});

describe("compile et les jokers « seuil »", () => {
  const erreurs = (g: Grille): string[] => {
    try {
      compile(g);
      return [];
    } catch (e) {
      if (e instanceof ErreurCompilation) return e.erreurs;
      throw e;
    }
  };
  const avecJoker = (noeudSeuil: string): Grille => ({
    ...v2,
    jokers: { quota: 1, autorises: [{ id: "j", noeud: "animation", action: { type: "seuil", noeudSeuil } }] },
  });

  test("accepte le joker de G3 (Animation ≥ 3, F2 consommateur direct d'Animation)", () => {
    expect(erreurs(v2)).toEqual([]);
    const plan = compile(v2);
    const def = plan.jokerDefs[plan.indexJoker.get("joker:animation")!];
    expect(plan.ids[def.noeudSeuil]).toBe("seuil:animation");
    expect(def.seuil).toBe(3);
  });

  test("refuse un nœud de seuil F2 qui ne consomme pas directement le nœud autorisé", () => {
    // Planification ≥ 60 % est un F2, mais consomme Planification, pas Animation.
    expect(erreurs(avecJoker("seuil:planification"))).toEqual([
      "joker j : le nœud de seuil seuil:planification ne consomme pas directement animation",
    ]);
  });

  test("refuse un F2 qui n'atteint le nœud autorisé qu'indirectement", () => {
    const g = avecJoker("seuil:x");
    g.noeuds = [
      ...v2.noeuds,
      { id: "relais", type: "calcul", libelle: "relais", fonction: "F1", entrees: [{ noeud: "animation", poids: 1 }] },
      { id: "seuil:x", type: "calcul", libelle: "x", fonction: "F2", entrees: [{ noeud: "relais", poids: 1 }], params: { seuil: 3 } },
    ];
    expect(erreurs(g)).toEqual(["joker j : le nœud de seuil seuil:x ne consomme pas directement animation"]);
  });

  test("refuse un nœud de seuil qui n'est pas un F2, ou inconnu", () => {
    // Réussite (F3) ne consomme pas Animation et n'est pas un F2 : la fonction est vérifiée d'abord.
    expect(erreurs(avecJoker("reussite"))).toEqual(["joker j : le nœud de seuil reussite n'est pas un F2"]);
    expect(erreurs(avecJoker("absent"))).toEqual(["joker j : nœud de seuil inconnu absent"]);
  });
});

/**
 * Petite structure, calculée à la main : a (note 1–5, pas 0,5) → m = F1(a)
 * → s = « m ≥ 3 » (F2) ; b (OK/KO) → k = « au moins 1 » (F4, binaire).
 * Jokers : +0,5 sur m, « seuil » sur m (s = 3), +1 palier sur k ; quota 3.
 */
function petite(commutateurs: Commutateurs = {}): Plan {
  const g: Grille = {
    grille: "jokers",
    baremes: [
      { id: "note", type: "numerique", min: 1, max: 5, pas: 0.5 },
      { id: "ok-ko", type: "ordinal", prereglage: "binaire" },
    ],
    noeuds: [
      { id: "a", type: "donnees", libelle: "a", bareme: "note" },
      { id: "m", type: "calcul", libelle: "m", fonction: "F1", entrees: [{ noeud: "a", poids: 1 }] },
      { id: "s", type: "calcul", libelle: "s", fonction: "F2", entrees: [{ noeud: "m", poids: 1 }], params: { seuil: 3 } },
      { id: "b", type: "donnees", libelle: "b", bareme: "ok-ko" },
      { id: "k", type: "calcul", libelle: "k", fonction: "F4", entrees: [{ noeud: "b", poids: 1 }], params: { k: 1 } },
    ],
    axes: [{ id: "x", libelle: "x", principal: true, arbre: [{ noeud: "s" }, { noeud: "k" }] }],
    jokers: {
      quota: 3,
      autorises: [
        { id: "plus", noeud: "m", action: { type: "ajout", valeur: 0.5 } },
        { id: "seuil", noeud: "m", action: { type: "seuil", noeudSeuil: "s" } },
        { id: "palier", noeud: "k", action: { type: "ajout", valeur: 1 } },
      ],
    },
  };
  return compile(g, commutateurs);
}

function sourcesPetite(plan: Plan, a: number | null, jokers: string[], b: number | null = null): SourcesParticipant {
  const s = sourcesVides(plan);
  if (a !== null) s.cases[plan.indexDonnee[plan.index.get("a")!]] = a;
  if (b !== null) s.cases[plan.indexDonnee[plan.index.get("b")!]] = b;
  s.jokers = jokers.map((id, i) => ({ id: i, jokerDef: plan.indexJoker.get(id)! }));
  return s;
}

describe("actions de joker (calcul à la main)", () => {
  const m = (plan: Plan, s: SourcesParticipant) => lecteur(plan, s).valeur("m");

  test("« seuil » : max(valeur, s) ; sans effet au-dessus du seuil", () => {
    const plan = petite();
    expect(m(plan, sourcesPetite(plan, 2, ["seuil"]))).toBe(3);
    expect(m(plan, sourcesPetite(plan, 4, ["seuil"]))).toBe(4);
  });

  test("« ajout » : borné au barème de sortie (1–5)", () => {
    const plan = petite();
    expect(m(plan, sourcesPetite(plan, 2, ["plus"]))).toBe(2.5);
    expect(m(plan, sourcesPetite(plan, 5, ["plus"]))).toBe(5);
  });

  test("« ajout » sur un ordinal : un palier (KO → OK), borné au dernier palier", () => {
    const plan = petite();
    // b = KO (rang 0) : « au moins 1 » vaut KO, +1 palier → OK.
    expect(lecteur(plan, sourcesPetite(plan, null, ["palier"], 0)).valeur("k")).toBe(1);
    expect(lecteur(plan, sourcesPetite(plan, null, ["palier"], 1)).valeur("k")).toBe(1);
  });

  test("H5b « un seul » : seul le premier joker posé (par id) s'applique au calcul", () => {
    const plan = petite();
    expect(m(plan, sourcesPetite(plan, 2, ["plus", "seuil"]))).toBe(2.5);
    expect(m(plan, sourcesPetite(plan, 2, ["seuil", "plus"]))).toBe(3);
  });

  test("H5b « cumulés » : ajouts additionnés, puis seuil, borné", () => {
    const plan = petite({ h5b: "cumules" });
    // 1,5 + 0,5 + 0,5 = 2,5, puis max(2,5 ; 3) = 3.
    expect(m(plan, sourcesPetite(plan, 1.5, ["plus", "seuil", "plus"]))).toBe(3);
    // 2,5 + 0,5 + 0,5 = 3,5 ≥ 3.
    expect(m(plan, sourcesPetite(plan, 2.5, ["seuil", "plus", "plus"]))).toBe(3.5);
    // 4,5 + 1,5 = 6, borné à 5.
    expect(m(plan, sourcesPetite(plan, 4.5, ["plus", "plus", "plus"]))).toBe(5);
  });

  test("H5b « cumulés » sur A03 : deux jokers +25 % sur la sphère C (figés)", () => {
    const plan = compile(avecQuota(a03, 2), { h5b: "cumules" });
    const c = capucine();
    const fige: ParticipantType = {
      ...c,
      sources: { ...c.sources, jokers: c.jokersCumules!.jokers.map((jokerDef) => ({ ...c.sources.jokers[0], jokerDef })) },
    };
    const { valeur, marques } = lecteur(plan, sourcesDepuisFige(plan, fige));
    expect(ecarts(c.jokersCumules!.attendus, valeur)).toEqual([]);
    expect(valeur("sph:C")).toBe(110);
    expect(marques()).toEqual(c.jokersCumules!.marques);
    // Les mêmes sources en « un seul » : le second joker ne s'applique pas.
    const unSeul = compile(avecQuota(a03, 2));
    expect(ecarts(c.attendus, lecteur(unSeul, sourcesDepuisFige(unSeul, fige)).valeur)).toEqual([]);
  });

  test("un joker sur un nœud sans résultat ne marque rien et s'applique dès qu'un résultat existe", () => {
    const plan = petite();
    const vide = lecteur(plan, sourcesPetite(plan, null, ["seuil"]));
    expect(vide.valeur("m")).toBeNull();
    expect(vide.marques()).toEqual({ jokerApplique: [], influence: [] });
    const rempli = lecteur(plan, sourcesPetite(plan, 2, ["seuil"]));
    expect(rempli.valeur("m")).toBe(3);
    expect(rempli.marques()).toEqual({ jokerApplique: ["m"], influence: ["s"] });
  });
});

describe("pose : quota, H5a, H5b", () => {
  const def = (plan: Plan, id: string) => plan.indexJoker.get(id)!;
  const poses = (plan: Plan, ids: string[]) => ids.map((id, i) => ({ id: i, jokerDef: def(plan, id) }));

  test("quota par participant pour toute la grille (G3 : 1)", () => {
    const plan = compile(v2);
    expect(refusPose(plan, [], def(plan, "joker:animation"), 2.75)).toBeNull();
    // Le quota vaut pour toute la grille : un joker sur Animation empêche celui sur E2.
    expect(refusPose(plan, poses(plan, ["joker:animation"]), def(plan, "joker:e2"), 66.7)).toBe("quota");
    // Retirer le joker libère le quota.
    expect(refusPose(plan, [], def(plan, "joker:e2"), 66.7)).toBeNull();
  });

  test("H5a « accepté » (défaut) : joker posé sur un nœud sans résultat ; « refusé » : refusé", () => {
    expect(refusPose(petite(), [], def(petite(), "seuil"), NaN)).toBeNull();
    const refuse = petite({ h5a: "refuse" });
    expect(refusPose(refuse, [], def(refuse, "seuil"), NaN)).toBe("sansResultat");
    expect(refusPose(refuse, [], def(refuse, "seuil"), 2)).toBeNull();
  });

  test("H5a « accepté » : le joker sur un nœud sans résultat consomme le quota", () => {
    const plan = compile(v2);
    expect(refusPose(plan, poses(plan, ["joker:animation"]), def(plan, "joker:e2"), 66.7)).toBe("quota");
  });

  test("H5b « un seul » (défaut) : second joker sur un même nœud refusé ; « cumulés » : accepté", () => {
    const unSeul = petite();
    expect(refusPose(unSeul, poses(unSeul, ["plus"]), def(unSeul, "seuil"), 2)).toBe("plusieursSurLeNoeud");
    expect(refusPose(unSeul, poses(unSeul, ["plus"]), def(unSeul, "palier"), 0)).toBeNull();
    const cumules = petite({ h5b: "cumules" });
    expect(refusPose(cumules, poses(cumules, ["plus"]), def(cumules, "seuil"), 2)).toBeNull();
    expect(refusPose(cumules, poses(cumules, ["plus", "seuil", "plus"]), def(cumules, "plus"), 2)).toBe("quota");
  });
});

describe("bascule de H5 : joker devenu invalide, erreur « quota dépassé », sans retrait", () => {
  const erreursJokers = (plan: Plan, s: SourcesParticipant) => {
    const r = evaluate(plan, s);
    return remplissage(plan, s, r.valeurs).erreurs.filter((e) => e.type === "quotaDepasse");
  };

  test("H5b « cumulés » → « un seul » : le second joker du nœud est en erreur, le premier seul s'applique", () => {
    const cumules = petite({ h5b: "cumules" });
    const s = sourcesPetite(cumules, 2, ["plus", "seuil"]);
    expect(erreursJokers(cumules, s)).toEqual([]);
    expect(lecteur(cumules, s).valeur("m")).toBe(3);

    const unSeul = petite();
    // Mêmes sources après la bascule : les deux jokers restent posés.
    const s2 = sourcesPetite(unSeul, 2, ["plus", "seuil"]);
    expect(s2.jokers).toHaveLength(2);
    expect(erreursJokers(unSeul, s2)).toEqual([{ type: "quotaDepasse", n: unSeul.index.get("m"), joker: 1, raison: "plusieursSurLeNoeud" }]);
    expect(lecteur(unSeul, s2).valeur("m")).toBe(2.5);
  });

  test("H5a « accepté » → « refusé » : le joker d'un nœud sans résultat est en erreur", () => {
    const s = sourcesPetite(petite(), null, ["seuil"]);
    expect(erreursJokers(petite(), s)).toEqual([]);
    const refuse = petite({ h5a: "refuse" });
    expect(erreursJokers(refuse, s)).toEqual([{ type: "quotaDepasse", n: refuse.index.get("m"), joker: 0, raison: "sansResultat" }]);
    // Une note arrive : le nœud a un résultat, le joker redevient valide et s'applique.
    const rempli = sourcesPetite(refuse, 2, ["seuil"]);
    expect(erreursJokers(refuse, rempli)).toEqual([]);
    expect(lecteur(refuse, rempli).valeur("m")).toBe(3);
  });

  test("quota abaissé : les jokers au-delà du quota (par id) sont en erreur, tous restent appliqués", () => {
    const plan = compile(avecQuota(a03, 1), { h5b: "cumules" });
    const c = capucine();
    const s = sourcesDepuisFige(plan, {
      ...c,
      sources: { ...c.sources, jokers: c.jokersCumules!.jokers.map((jokerDef) => ({ ...c.sources.jokers[0], jokerDef })) },
    });
    expect(jokersInvalides(plan, s.jokers).map((j) => [j.id, j.raison])).toEqual([[1, "quota"]]);
    // H5 et le quota ne gouvernent que la pose : le calcul garde les deux jokers.
    expect(lecteur(plan, s).valeur("sph:C")).toBe(c.jokersCumules!.attendus["sph:C"]);
  });

  test("l'erreur « quota dépassé » ne déclenche pas l'avertissement « données provisoires »", () => {
    const refuse = petite({ h5a: "refuse" });
    const s = sourcesPetite(refuse, null, ["seuil"], 1);
    // a est vide mais facultatif : seule l'erreur de joker reste.
    const etat = remplissage(refuse, s, evaluate(refuse, s).valeurs);
    expect(etat.erreurs.map((e) => e.type)).toEqual(["quotaDepasse"]);
    expect(etat.provisoire).toBe(false);
  });
});
