// Générateur déterministe et jeu « charge » (ticket #23).
// Les résultats attendus des participants types viennent de `g3-controle.py`
// (`g3-participants.json`, figé) ; les ordres de grandeur du jeu « charge » et
// des préréglages viennent de la spec 20 (« Générateur ») et du ticket.

import figesJson from "@corpus/g3-participants.json";
import v1Json from "@corpus/g3-v1-structure.json";
import v2Json from "@corpus/g3-v2-structure.json";
import { describe, expect, test } from "vitest";
import { compile, type Plan, TYPE_DONNEES } from "../noyau/compile";
import { evaluate } from "../noyau/evaluate";
import type { FichierG3, Grille, Noeud, NoeudDonnees } from "../noyau/format";
import { sourcesDepuisFige } from "../noyau/participants";
import { idsExigences, remplissage } from "../noyau/remplissage";
import { creerSession, lireSourcesGrille } from "../session";
import { sommeControle } from "./controle";
import { chaineDecisive, compterNoeuds, etendre, ID_SYNTHESE } from "./etendre";
import { generer, genererParticipant, type ReglagesGeneration, type SourcesGenerees, TAUX_REMPLISSAGE } from "./generer";
import { FACTEUR_CHARGE, g3Etendue, grillesDuJeu, INSTANCES_CHARGE, STRUCTURES_CORPUS } from "./jeux";
import { flux } from "./prng";

const v1 = v1Json as unknown as Grille;
const v2 = v2Json as unknown as Grille;
const figes = figesJson as unknown as FichierG3;
const plansCorpus: Plan[] = STRUCTURES_CORPUS.map((s) => compile(s));

/** Lignes d'un participant, sans dépendre de l'ordre d'assemblage. */
function lignesDe(s: SourcesGenerees, p: number) {
  return {
    participants: s.participants.filter((l) => l.p === p),
    cases: s.cases.filter((l) => l.p === p),
    nonEvaluations: s.nonEvaluations.filter((l) => l.p === p),
    jokers: s.jokers.filter((l) => l.p === p),
  };
}

describe("PRNG", () => {
  test("sfc32 : même graine et même nom → même suite ; noms différents → suites différentes", () => {
    const a = flux(42, "participant", 0, 3);
    const b = flux(42, "participant", 0, 3);
    const c = flux(42, "participant", 0, 4);
    const sa = Array.from({ length: 20 }, () => a.uniforme());
    expect(Array.from({ length: 20 }, () => b.uniforme())).toEqual(sa);
    expect(Array.from({ length: 20 }, () => c.uniforme())).not.toEqual(sa);
    for (const x of sa) expect(x >= 0 && x < 1).toBe(true);
  });
});

describe("generer : déterminisme", () => {
  const reglages: ReglagesGeneration = { remplissage: "fin", participants: 30 };

  test("même graine → mêmes sources et même somme de contrôle", () => {
    const a = generer(plansCorpus, 7, reglages);
    const b = generer(plansCorpus, 7, reglages);
    expect(b).toEqual(a);
    expect(sommeControle(b)).toBe(sommeControle(a));
    expect(a.cases.length).toBeGreaterThan(0);
  });

  test("autre graine → autres sources et autre somme de contrôle", () => {
    const a = generer(plansCorpus, 7, reglages);
    const b = generer(plansCorpus, 8, reglages);
    expect(sommeControle(b)).not.toBe(sommeControle(a));
  });

  test("un participant se génère à l'identique quel que soit l'ordre de génération", () => {
    const tous = generer(plansCorpus, 7, reglages);
    // À l'envers, un par un, sans les autres.
    const parParticipant = new Map<number, SourcesGenerees>();
    for (let p = 29; p >= 0; p--) parParticipant.set(p, genererParticipant(plansCorpus, 7, reglages, p));
    for (let p = 0; p < 30; p++) expect(lignesDe(parParticipant.get(p)!, p)).toEqual(lignesDe(tous, p));
    // Moins de participants : les premiers sont inchangés.
    const dix = generer(plansCorpus, 7, { ...reglages, participants: 10 });
    for (let p = 0; p < 10; p++) expect(lignesDe(dix, p)).toEqual(lignesDe(tous, p));
  });

  test("la somme de contrôle ne dépend pas de l'ordre des lignes", () => {
    const a = generer(plansCorpus, 3, reglages);
    const inverse: SourcesGenerees = {
      participants: [...a.participants].reverse(),
      cases: [...a.cases].reverse(),
      nonEvaluations: [...a.nonEvaluations].reverse(),
      jokers: [...a.jokers].reverse(),
    };
    expect(sommeControle(inverse)).toBe(sommeControle(a));
    // Une seule case changée change la somme.
    const modifiee = { ...a, cases: a.cases.map((l, i) => (i === 0 ? { ...l, valeur: l.valeur === 0 ? 1 : 0 } : l)) };
    expect(sommeControle(modifiee)).not.toBe(sommeControle(a));
  });

  test("valeurs tirées sur le pas du barème, dans ses bornes", () => {
    const s = generer(plansCorpus, 11, reglages);
    for (const l of s.cases) {
      const plan = plansCorpus[l.g];
      const b = plan.baremes[plan.bareme[plan.donnees[l.d]]];
      if (b.type === "ordinal") {
        expect(Number.isInteger(l.valeur) && l.valeur >= 0 && l.valeur < b.valeurs.length).toBe(true);
      } else {
        expect(l.valeur >= b.min && l.valeur <= b.max).toBe(true);
        const pas = (l.valeur - b.min) / b.pas;
        expect(Math.abs(pas - Math.round(pas))).toBeLessThan(1e-9);
      }
    }
  });
});

describe("etendre(G3)", () => {
  const etendue = etendre(v2, FACTEUR_CHARGE);
  const plan = compile(etendue);

  test("environ 1500 nœuds de données, compilés sans erreur", () => {
    const c = compterNoeuds(etendue);
    expect(c.donnees).toBeGreaterThanOrEqual(1400);
    expect(c.donnees).toBeLessThanOrEqual(1600);
    expect(plan.D).toBe(c.donnees);
  });

  test("la chaîne du nœud décisif est intacte : mêmes nœuds, mêmes règles, aucune entrée ajoutée", () => {
    const avant = chaineDecisive(v2);
    expect(chaineDecisive(etendue)).toEqual(avant);
    const parId = new Map<string, Noeud>(etendue.noeuds.map((n) => [n.id, n]));
    for (const n of v2.noeuds) if (avant.has(n.id)) expect(parId.get(n.id)).toEqual(n);
  });

  test("les clones sont de nouvelles occurrences des mêmes définitions, sans origine", () => {
    const original = etendue.noeuds.find((n) => n.id === "e4/c1/1") as NoeudDonnees;
    const clone = etendue.noeuds.find((n) => n.id === "e4/c1/1~3") as NoeudDonnees;
    expect(clone.definition).toBe(original.definition);
    expect(clone.origine).toBeUndefined();
    expect(plan.occurrences.get(original.definition!)!.length).toBe(FACTEUR_CHARGE + 1);
    expect(etendue.noeuds.some((n) => n.id === "comp:communication~2")).toBe(true);
    expect(etendue.noeuds.some((n) => n.id === "moyenne-generale~6")).toBe(true);
    expect(chaineDecisive(etendue).has(ID_SYNTHESE)).toBe(false);
  });

  test("export JSON : la structure étendue se relit et se recompile à l'identique", () => {
    const relue = JSON.parse(JSON.stringify(etendue)) as Grille;
    expect(relue).toEqual(etendue);
    expect(compile(relue).N).toBe(plan.N);
  });

  // Les participants types de g3-controle.py (seconde source) sur la structure étendue.
  const etats = [
    ["V1-copie", etendre(v1, FACTEUR_CHARGE)],
    ["V2-copie", etendue],
    ["V2-final", etendue],
  ] as const;
  for (const [etat, structure] of etats) {
    const planEtat = compile(structure);
    test.each(figes.etats[etat].participants.map((pt) => [pt.nom, pt] as const))(
      `${etat} %s : résultats figés inchangés, erreurs de remplissage inchangées`,
      (_nom, pt) => {
        const s = sourcesDepuisFige(planEtat, pt);
        const r = evaluate(planEtat, s);
        for (const [id, attendu] of Object.entries(pt.attendus)) {
          const v = r.valeurs[planEtat.index.get(id)!];
          if (attendu === null) expect(v, id).toBeNaN();
          else expect(Math.abs(v - attendu), id).toBeLessThan(1e-9);
        }
        expect(pt.attendus.reussite).not.toBeUndefined();
        const trie = (l: string[]) => [...l].sort();
        expect(trie(idsExigences(planEtat, remplissage(planEtat, s)))).toEqual(trie(pt.erreursRemplissage));
      },
    );
  }
});

describe("jeu « charge »", () => {
  test("3 instances de G3 étendue, ≈ 900k cases possibles avec 200 participants", () => {
    const grilles = grillesDuJeu("charge");
    expect(grilles).toHaveLength(INSTANCES_CHARGE);
    expect(grilles.every((g) => g.participantsTypes === undefined)).toBe(true);
    const D = compterNoeuds(g3Etendue()).donnees;
    const possibles = INSTANCES_CHARGE * 200 * D;
    expect(possibles).toBeGreaterThanOrEqual(850_000);
    expect(possibles).toBeLessThanOrEqual(950_000);
  });

  test(
    "profil « fin » : ≈ 800k lignes de cases dans TanStack DB, et l'oracle calcule tout sans erreur",
    () => {
      const session = creerSession({}, { jeu: "charge", remplissage: "fin", graine: 1, participants: 200 });
      const { plans, sources } = session;
      const possibles = plans.reduce((t, p) => t + p.D, 0) * 200;
      expect(sources.participants.size).toBe(200);
      expect(sources.cases.size).toBeGreaterThanOrEqual(760_000);
      expect(sources.cases.size).toBeLessThanOrEqual(840_000);
      expect(sources.cases.size / possibles).toBeGreaterThan(0.87);
      expect(sources.cases.size / possibles).toBeLessThan(0.93);
      // La somme de contrôle de la session égale celle des sources générées.
      const generees = generer(plans, 1, { remplissage: "fin", participants: 200 });
      expect(session.sommeControle).toBe(sommeControle(generees));
      let evalues = 0;
      let avecResultat = 0;
      plans.forEach((plan, g) => {
        for (const [, s] of lireSourcesGrille(session, g)) {
          const r = evaluate(plan, s);
          remplissage(plan, s);
          for (let n = 0; n < plan.N; n++) expect(Number.isNaN(r.valeurs[n]) || Number.isFinite(r.valeurs[n])).toBe(true);
          if (!Number.isNaN(r.valeurs[plan.decisif])) avecResultat++;
          evalues++;
        }
      });
      expect(evalues).toBe(3 * 200);
      // Au profil « fin », presque tous les participants ont un résultat décisif.
      expect(avecResultat / evalues).toBeGreaterThan(0.9);
      session.store.dispose();
    },
    120_000,
  );
});

describe("préréglages", () => {
  const plans = grillesDuJeu("charge").map((g) => compile(g.structure));
  const D = plans.reduce((t, p) => t + p.D, 0);
  const N = 100;
  for (const profil of ["debut", "milieu", "fin"] as const) {
    test(`${profil} : ≈ ${Math.round(TAUX_REMPLISSAGE[profil] * 100)} % des cases remplies`, () => {
      const s = generer(plans, 5, { remplissage: profil, participants: N });
      expect(Math.abs(s.cases.length / (D * N) - TAUX_REMPLISSAGE[profil])).toBeLessThan(0.03);
    });
  }

  test("fin : ≈ 5 % d'exercices entiers non faits et ≈ 5 % de cases vides dispersées", () => {
    const s = generer(plans, 5, { remplissage: "fin", participants: N });
    // Exercices du volume : un regroupement E4–E8 (ou clone) sans aucune case.
    const plan = plans[0];
    const principal = plan.grille.axes[plan.axePrincipal];
    const exercices = principal.arbre.filter((p) => /^reg:e[4-8](~\d+)?$/.test(p.noeud));
    const casesDe = (p: (typeof exercices)[number]) => {
      const ds: number[] = [];
      const visiter = (x: typeof p) => {
        const n = plan.index.get(x.noeud)!;
        if (plan.type[n] === TYPE_DONNEES) ds.push(plan.indexDonnee[n]);
        for (const e of x.enfants ?? []) visiter(e);
      };
      visiter(p);
      return ds;
    };
    const ensemble = new Set(s.cases.filter((l) => l.g === 0).map((l) => `${l.p}:${l.d}`));
    let nonFaits = 0;
    let videsDansFaits = 0;
    let casesDansFaits = 0;
    for (let p = 0; p < N; p++)
      for (const ex of exercices) {
        const ds = casesDe(ex);
        const n = ds.filter((d) => ensemble.has(`${p}:${d}`)).length;
        if (n === 0) nonFaits++;
        else {
          casesDansFaits += ds.length;
          videsDansFaits += ds.length - n;
        }
      }
    expect(ensemble.size).toBeGreaterThan(0);
    expect(Math.abs(nonFaits / (N * exercices.length) - 0.05)).toBeLessThan(0.02);
    expect(Math.abs(videsDansFaits / casesDansFaits - 0.05)).toBeLessThan(0.01);
  });

  test("3 % de participants dispensés d'un regroupement, 0,5 % de cases « non évalué », 30 % de jokers", () => {
    const P = 600;
    const s = generer(plans, 9, { remplissage: "milieu", participants: P });
    const plan = plans[0];
    const dispenses = s.nonEvaluations.filter((l) => plan.type[l.n] !== TYPE_DONNEES);
    const nonEvaluees = s.nonEvaluations.filter((l) => plan.type[l.n] === TYPE_DONNEES);
    expect(Math.abs(dispenses.length / (P * plans.length) - 0.03)).toBeLessThan(0.012);
    expect(Math.abs(nonEvaluees.length / (P * D) - 0.005)).toBeLessThan(0.001);
    // G3 : quota de 1, deux nœuds autorisés.
    expect(Math.abs(s.jokers.length / (P * plans.length) - 0.3)).toBeLessThan(0.04);
    for (const j of s.jokers) expect(j.jokerDef).toBeLessThan(plan.jokerDefs.length);
  });

  test("A01 n'a ni joker ni regroupement : aucun joker ni dispense générés", () => {
    const s = generer([plansCorpus[0]], 2, { remplissage: "fin", participants: 200 });
    expect(s.jokers).toEqual([]);
    expect(s.nonEvaluations.every((l) => plansCorpus[0].type[l.n] === TYPE_DONNEES)).toBe(true);
  });
});
