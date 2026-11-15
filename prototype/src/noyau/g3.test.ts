// G3 « Moniteur camp », V1 et V2 : l'oracle contre les résultats figés par
// `g3-controle.py --figer` (seconde source) et contre les tables de
// `g3-moniteur-camp.md`, transcrites ci-dessous telles qu'affichées.

import figesJson from "@corpus/g3-participants.json";
import v1Json from "@corpus/g3-v1-structure.json";
import v2Json from "@corpus/g3-v2-structure.json";
import a01Json from "@corpus/a01-structure.json";
import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { compile, type Commutateurs, type Plan, TYPE_COMMENTAIRE } from "./compile";
import { evaluate, type SourcesParticipant } from "./evaluate";
import type { FichierG3, Grille, ParticipantType, Placement } from "./format";
import { sourcesDepuisFige } from "./participants";

const v1 = v1Json as unknown as Grille;
const v2 = v2Json as unknown as Grille;
const figes = figesJson as unknown as FichierG3;
const planV1 = compile(v1);
const planV2 = compile(v2);

function participant(etat: keyof FichierG3["etats"], nom: string): ParticipantType {
  return figes.etats[etat].participants.find((p) => p.nom === nom)!;
}

function lecteur(plan: Plan, sources: SourcesParticipant) {
  const r = evaluate(plan, sources);
  return (id: string): number | null => {
    const n = plan.index.get(id);
    if (n === undefined) throw new Error(`nœud inconnu ${id}`);
    return Number.isNaN(r.valeurs[n]) ? null : r.valeurs[n];
  };
}

function ecarts(attendus: Record<string, number | null>, obtenu: (id: string) => number | null): string[] {
  return Object.entries(attendus).flatMap(([id, a]) => {
    const o = obtenu(id);
    const ok = a === null ? o === null : o !== null && Math.abs(o - a) < 1e-9;
    return ok ? [] : [`${id} : attendu ${a}, obtenu ${o}`];
  });
}

// --- Tables de g3-moniteur-camp.md, en affichage -----------------------------

const COLONNES = [
  "e1#1", "e1#2", "planif-e1", "e2", "e3", "animation", "securite",
  "planification", "moyenne-generale", "minimaux", "reussite",
];
/** M5 est le nœud de seuil Planification ≥ 60 % ; M6 est une donnée, lue comme sa case (OK = 1). */
const COLONNES_MINIMAUX = ["m1", "m2", "m3", "m4", "seuil:planification", "m6", "domaine:securite", "domaine:animation", "domaine:organisation"];

/** Arrondi d'affichage de G3 : 0,1 % ; 0,01 sur Niveau 1–5 ; OK/KO. */
function affiche(id: string, v: number | null): string {
  if (v === null) return "—";
  const demiHaut = (x: number, d: number) => (Math.floor(x * 10 ** d + 0.5 + 1e-9) / 10 ** d).toFixed(d).replace(".", ",");
  if (["securite", "minimaux", "reussite", "seuil:planification"].includes(id) || /^(m\d|domaine:)/.test(id))
    return v === 1 ? "OK" : "KO";
  if (id === "animation") return demiHaut(v, 2);
  return `${demiHaut(v, 1)} %`;
}

const ligne = (s: string) => s.split("|").map((c) => c.trim());

const V1_A_LA_COPIE: Record<string, string> = {
  Alice: "83,3 % | — | 83,3 % | 81,3 % | — | 4,00 | KO | 83,3 % | 82,3 % | OK | KO",
  Bruno: "91,7 % | — | 91,7 % | 77,1 % | — | 4,50 | KO | 91,7 % | 84,4 % | KO | KO",
  Chloé: "63,9 % | — | 63,9 % | 75,0 % | — | 3,50 | KO | 63,9 % | 69,4 % | OK | KO",
  David: "27,8 % | — | 27,8 % | 75,0 % | — | 4,00 | KO | 27,8 % | 51,4 % | KO | KO",
  Emma: "75,0 % | — | 75,0 % | 62,5 % | — | 3,00 | KO | 75,0 % | 68,8 % | OK | KO",
  Félix: "83,3 % | — | 83,3 % | 83,3 % | — | 4,00 | KO | 83,3 % | 83,3 % | OK | KO",
};

const V2_FINAL: Record<string, string> = {
  Alice: "83,3 % | 91,7 % | 83,3 % | 83,3 % | 100,0 % | 4,25 | OK | 79,2 % | 87,5 % | OK | OK",
  Bruno: "91,7 % | 36,1 % | 91,7 % | 69,4 % | 67,5 % | 4,25 | KO | 83,3 % | 73,4 % | KO | KO",
  Chloé: "63,9 % | 83,3 % | 63,9 % | 75,0 % | — | 3,33 | KO | 63,9 % | 69,4 % | OK | KO",
  David: "27,8 % | 91,7 % | 60,0 % | 83,3 % | 87,5 % | 4,00 | OK | 67,5 % | 79,4 % | OK | OK",
  Emma: "75,0 % | 83,3 % | 75,0 % | 66,7 % | 62,5 % | 3,00 | OK | 62,5 % | 63,9 % | OK | OK",
  Félix: "83,3 % | — | 83,3 % | 87,5 % | 87,5 % | 4,00 | OK | 79,2 % | 84,7 % | OK | OK",
};

const MINIMAUX_V2_FINAL: Record<string, string> = {
  Alice: "OK | OK | OK | OK | OK | OK | OK | OK | OK",
  Bruno: "KO | KO | OK | OK | OK | OK | KO | OK | OK",
  Chloé: "— | OK | OK | OK | OK | OK | OK | OK | OK",
  David: "OK | OK | OK | OK | OK | OK | OK | OK | OK",
  Emma: "OK | OK | OK | OK | OK | OK | OK | OK | OK",
  Félix: "OK | OK | OK | — | OK | — | OK | OK | OK",
};

describe("G3 V1 à la copie (matin de J4)", () => {
  test("les 6 participants types sont figés", () => {
    expect(figes.etats["V1-copie"].participants.map((p) => p.nom)).toEqual(["Alice", "Bruno", "Chloé", "David", "Emma", "Félix"]);
  });

  test.each(Object.keys(V1_A_LA_COPIE))("%s : tous les nœuds de calcul égalent les résultats figés", (nom) => {
    const p = participant("V1-copie", nom);
    expect(Object.keys(p.attendus)).toHaveLength(88);
    expect(ecarts(p.attendus, lecteur(planV1, sourcesDepuisFige(planV1, p)))).toEqual([]);
  });

  test.each(Object.entries(V1_A_LA_COPIE))("%s : colonnes de résultats de la table « V1 à la copie »", (nom, attendu) => {
    const lire = lecteur(planV1, sourcesDepuisFige(planV1, participant("V1-copie", nom)));
    expect(COLONNES.map((id) => affiche(id, lire(id)))).toEqual(ligne(attendu));
  });
});

describe("G3 V2 juste après la copie (mêmes données)", () => {
  test.each(["Alice", "Bruno", "Chloé", "David", "Emma", "Félix"])("%s : égale les résultats figés", (nom) => {
    const p = participant("V2-copie", nom);
    expect(ecarts(p.attendus, lecteur(planV2, sourcesDepuisFige(planV2, p)))).toEqual([]);
  });
});

describe("G3 V2 à l'état final (après J5)", () => {
  test.each(Object.keys(V2_FINAL))("%s : tous les nœuds de calcul égalent les résultats figés", (nom) => {
    const p = participant("V2-final", nom);
    expect(ecarts(p.attendus, lecteur(planV2, sourcesDepuisFige(planV2, p)))).toEqual([]);
  });

  test.each(Object.entries(V2_FINAL))("%s : colonnes de la table « V2 à l'état final »", (nom, attendu) => {
    const lire = lecteur(planV2, sourcesDepuisFige(planV2, participant("V2-final", nom)));
    expect(COLONNES.map((id) => affiche(id, lire(id)))).toEqual(ligne(attendu));
  });

  test.each(Object.entries(MINIMAUX_V2_FINAL))("%s : table des Minimaux", (nom, attendu) => {
    const lire = lecteur(planV2, sourcesDepuisFige(planV2, participant("V2-final", nom)));
    expect(COLONNES_MINIMAUX.map((id) => affiche(id, lire(id)))).toEqual(ligne(attendu));
  });

  // Emma (joker « remonter au seuil ») : voir aussi jokers.test.ts.
});

describe("G3, commutateurs (V2 à l'état final)", () => {
  test.each(figes.commutateurs.map((c) => [c.nom, JSON.stringify(c.commutateurs), JSON.stringify(c.nonEvaluations ?? "état"), c] as const))(
    "%s %s, non-évaluations %s : égale les résultats figés",
    (_nom, _c, _ne, c) => {
      const plan = compile(v2, c.commutateurs as Commutateurs);
      const pt = participant(c.etat, c.nom);
      const fige = c.nonEvaluations ? { ...pt, sources: { ...pt.sources, nonEvaluations: c.nonEvaluations } } : pt;
      const lire = lecteur(plan, sourcesDepuisFige(plan, fige));
      expect(ecarts(c.attendus, lire)).toEqual([]);
    },
  );

  const sous = (nom: string, commutateurs: Commutateurs) => {
    const plan = compile(v2, commutateurs);
    return lecteur(plan, sourcesDepuisFige(plan, participant("V2-final", nom)));
  };

  test("Bruno, F5 « dernière » : Planif-E1 36,1 %, Planification 55,6 %", () => {
    const r = sous("Bruno", { f5Derniere: true });
    expect([affiche("planif-e1", r("planif-e1")), affiche("planification", r("planification"))]).toEqual(["36,1 %", "55,6 %"]);
  });

  test("David, F5 sans plafond : 91,7 %, 83,3 % ; en « dernière » : 60,0 %", () => {
    const sans = sous("David", { f5SansPlafond: true });
    expect([affiche("planif-e1", sans("planif-e1")), affiche("planification", sans("planification"))]).toEqual(["91,7 %", "83,3 %"]);
    expect(affiche("planif-e1", sous("David", { f5Derniere: true })("planif-e1"))).toBe("60,0 %");
  });

  test("par défaut, la structure fait foi (David : plafond, 60,0 % et 67,5 %)", () => {
    const r = sous("David", {});
    expect([affiche("planif-e1", r("planif-e1")), affiche("planification", r("planification"))]).toEqual(["60,0 %", "67,5 %"]);
  });
});

// --- Chemins multiples ----------------------------------------------------------

function chemins(plan: Plan) {
  const ids = (m: Map<number, number[]>) =>
    Object.fromEntries([...m].map(([n, l]) => [plan.ids[n], l.map((x) => plan.ids[x])]));
  return { plusieursExigences: ids(plan.plusieursExigences), influenceMultiple: ids(plan.influenceMultiple) };
}

/** Tableau « Chemins multiples attendus » de g3-moniteur-camp.md (décrit V1 ; V2 ajoute SR5 au groupe SR). */
function tableauDoc(sr: string[]) {
  const plusieursExigences: [string[], string[]][] = [
    [["sj1", "sj2", "sj3"], ["securite", "m2"]],
    [sr, ["securite", "m1"]],
    [["consignes-e2"], ["seuil:e2", "seuil:animation", "m3"]],
    [["gestion"], ["seuil:e2", "seuil:animation", "m4"]],
  ];
  const influenceMultiple: [string[], string[]][] = [
    [["seuil:planification", "consignes-e2", "gestion"], ["reussite"]],
  ];
  return { plusieursExigences, influenceMultiple };
}

/**
 * Écarts connus entre le tableau du doc et la règle provisoire, en attente de décision sur #17
 * (https://github.com/fuzoh/azimut/issues/17#issuecomment-5996224068). À retirer une fois le
 * tableau complété ou la règle changée.
 */
function ecartsEnAttente17(sr: string[]) {
  const plusieursExigences: [string[], string[]][] = [
    [["consignes-e3"], ["seuil:animation", "m3"]],
    [["sj1", "sj2", "sj3"], ["seuil:e2"]],
  ];
  const influenceMultiple: [string[], string[]][] = [
    [["sj1", "sj2", "sj3", ...sr, "consignes-e3"], ["reussite"]],
  ];
  return { plusieursExigences, influenceMultiple };
}

type Signalements = Record<string, string[]>;
function fusionner(...listes: [string[], string[]][][]): Signalements {
  const r: Record<string, Set<string>> = {};
  for (const liste of listes)
    for (const [noeuds, cibles] of liste)
      for (const n of noeuds) for (const c of cibles) (r[n] ??= new Set()).add(c);
  return Object.fromEntries(Object.entries(r).map(([n, s]) => [n, [...s].sort()]));
}
const trier = (m: Signalements) => Object.fromEntries(Object.entries(m).map(([n, l]) => [n, [...l].sort()]));

describe("G3, chemins multiples (propriété de la structure)", () => {
  test.each([
    ["G3 V1", planV1],
    ["G3 V2", planV2],
  ])("%s : égalent les chemins multiples figés par g3-controle.py", (g, plan) => {
    expect(chemins(plan)).toEqual(figes.cheminsMultiples[g]);
  });

  const SR_V1 = ["sr1", "sr2", "sr3", "sr4"];
  test.each([
    ["G3 V1", planV1, SR_V1],
    ["G3 V2", planV2, [...SR_V1, "sr5"]],
  ])("%s : égalent exactement le tableau « Chemins multiples attendus » plus les écarts en attente (#17)", (_g, plan, sr) => {
    const c = chemins(plan);
    const doc = tableauDoc(sr);
    const ecarts = ecartsEnAttente17(sr);
    expect(trier(c.plusieursExigences)).toEqual(fusionner(doc.plusieursExigences, ecarts.plusieursExigences));
    expect(trier(c.influenceMultiple)).toEqual(fusionner(doc.influenceMultiple, ecarts.influenceMultiple));
  });

  test("le volume E4–E8 n'ajoute aucun chemin multiple", () => {
    const c = chemins(planV1);
    const volume = /^(e[4-8]|comp:|seuil:comp:)/;
    expect(Object.keys(c.plusieursExigences).filter((n) => volume.test(n))).toEqual([]);
    expect(Object.keys(c.influenceMultiple).filter((n) => volume.test(n))).toEqual([]);
  });

  test("A01 n'en signale aucun", () => {
    const plan = compile(a01Json as unknown as Grille);
    expect(chemins(plan)).toEqual({ plusieursExigences: {}, influenceMultiple: {} });
    expect(plan.cheminsMultiples.every((b) => b === 0)).toBe(true);
  });
});

// --- Structure : volume, commentaires, placement ----------------------------------

const VOLUME = /^(reg:)?(e[4-8](\/|$)|comp:|seuil:comp:)/;

function sansVolume(g: Grille): Grille {
  const retirer = (arbre: Placement[]): Placement[] =>
    arbre
      .filter((p) => !VOLUME.test(p.noeud))
      .map((p) => (p.enfants ? { ...p, enfants: retirer(p.enfants) } : p));
  return {
    ...g,
    noeuds: g.noeuds
      .filter((n) => !VOLUME.test(n.id))
      .map((n) => (n.type === "calcul" ? { ...n, entrees: n.entrees.filter((e) => !VOLUME.test(e.noeud)) } : n)),
    axes: g.axes.filter((a) => a.id !== "competences-volume").map((a) => ({ ...a, arbre: retirer(a.arbre) })),
  };
}

describe("G3, volume E4–E8", () => {
  test("ordre de grandeur : environ 250 données et 100 calculs, noyau compris", () => {
    expect(planV1.D).toBeGreaterThan(200);
    expect(planV1.D).toBeLessThan(300);
    const calculs = v1.noeuds.filter((n) => n.type === "calcul").length;
    expect(calculs).toBeGreaterThan(80);
    expect(calculs).toBeLessThan(120);
  });

  test.each([
    ["V1-copie", v1],
    ["V2-final", v2],
  ] as const)("%s : le volume ne change aucun résultat du noyau", (etat, g) => {
    const avec = compile(g);
    const sans = compile(sansVolume(g));
    expect(sans.D).toBeLessThan(60);
    for (const p of figes.etats[etat].participants) {
      if (etat === "V2-final" && p.nom === "Emma") continue;
      const a = lecteur(avec, sourcesDepuisFige(avec, p));
      const s = lecteur(sans, sourcesDepuisFige(sans, p));
      for (const n of sans.ids) if (sans.type[sans.index.get(n)!] === 1) expect(a(n), `${p.nom} ${n}`).toBe(s(n));
    }
  });

  test("l'oracle calcule le volume rempli sans erreur ; seuls la moyenne générale et le volume bougent", () => {
    const plan = planV2;
    const volumeD = Array.from(plan.donnees).filter((n) => VOLUME.test(plan.ids[n]));
    const alice = participant("V2-final", "Alice");
    const base = sourcesDepuisFige(plan, alice);
    fc.assert(
      fc.property(fc.array(fc.option(fc.nat(4), { nil: undefined }), { minLength: volumeD.length, maxLength: volumeD.length }), (tirage) => {
        const s: SourcesParticipant = { ...base, cases: base.cases.slice() };
        volumeD.forEach((n, i) => {
          const b = plan.baremes[plan.bareme[n]];
          const t = tirage[i];
          s.cases[plan.indexDonnee[n]] = t === undefined ? NaN : t % b.valeurs.length;
        });
        const r = evaluate(plan, s);
        for (const [id, attendu] of Object.entries(alice.attendus)) {
          const n = plan.index.get(id)!;
          const v = r.valeurs[n];
          if (VOLUME.test(id) || id === "moyenne-generale") {
            if (Number.isNaN(v)) continue;
            const b = plan.baremes[plan.bareme[n]];
            expect(v).toBeGreaterThanOrEqual(b.min - 1e-9);
            expect(v).toBeLessThanOrEqual(b.max + 1e-9);
          } else {
            expect(v, id).toBeCloseTo(attendu as number, 9);
          }
        }
      }),
      { numRuns: 50 },
    );
  });
});

describe("G3, structure", () => {
  test("V2 porte provenance et origine ; SR5 est nouveau, Appréciation globale E2 supprimée", () => {
    expect(v2.provenance).toEqual({ grille: "G3 V1" });
    const origine = (id: string) => (v2.noeuds.find((n) => n.id === id) as { origine?: string } | undefined)?.origine;
    expect(origine("sr5")).toBeUndefined();
    expect(origine("animation")).toBe("animation");
    expect(planV2.index.has("appreciation-e2")).toBe(false);
    expect(v2.axes.every((a) => a.origine === a.id)).toBe(true);
    expect(v2.jokers!.autorises.every((j) => j.origine === j.id)).toBe(true);
  });

  test("barèmes mixtes entre nœuds de calcul : E2 mêle Niveau 1–5 et une check-list en %", () => {
    const n = planV1.index.get("e2")!;
    expect(planV1.heterogene[n]).toBe(1);
    expect(planV1.baremes[planV1.bareme[n]].id).toBe("(0–100 %)");
  });

  test("sortie par défaut en 0–100 % pour une check-list d'entrées binaires", () => {
    const n = planV1.index.get("securite-jeu")!;
    const b = planV1.baremes[planV1.bareme[n]];
    expect([b.id, b.min, b.max]).toEqual(["(0–100 %)", 0, 100]);
  });

  test("nœuds de commentaire : placés, sans case, sans calcul", () => {
    for (const id of ["posture/engagement", "posture/collaboration", "posture/remarques", "e4/remarques/1"]) {
      const n = planV1.index.get(id)!;
      expect(planV1.type[n], id).toBe(TYPE_COMMENTAIRE);
      expect(planV1.indexDonnee[n], id).toBe(-1);
      expect(planV1.consommateurs[n], id).toEqual([]);
    }
    const posture = v1.axes[0].arbre.find((p) => p.noeud === "reg:posture")!;
    expect(posture.enfants!.map((p) => p.noeud)).toEqual(["posture/engagement", "posture/collaboration", "posture/remarques"]);
  });

  test("Itinéraire est placé sous E3 et compte seulement pour Planification", () => {
    const e3 = v1.axes[0].arbre.find((p) => p.noeud === "reg:e3")!;
    expect(e3.enfants!.map((p) => p.noeud)).toContain("itineraire");
    const n = planV1.index.get("itineraire")!;
    expect(planV1.consommateurs[n].map((c) => planV1.ids[c])).toEqual(["planification"]);
  });

  test("un nœud placé à plusieurs endroits reste une seule case", () => {
    const places = (g: Grille, id: string) => {
      let k = 0;
      const visiter = (p: Placement) => {
        if (p.noeud === id) k++;
        p.enfants?.forEach(visiter);
      };
      g.axes.forEach((a) => a.arbre.forEach(visiter));
      return k;
    };
    expect(places(v1, "consignes-e2")).toBe(3);
    expect(places(v1, "planification")).toBe(2);
    expect(planV1.ids.filter((id) => id === "consignes-e2")).toHaveLength(1);
  });
});
