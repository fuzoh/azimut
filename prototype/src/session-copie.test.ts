// Action « copier » dans la session : la copie de G3 V1 est une nouvelle grille,
// alimentée dans TanStack DB, indépendante de l'originale. Résultats attendus :
// figés par `g3-controle.py --figer`.

import g3Figes from "@corpus/g3-participants.json";
import { describe, expect, test } from "vitest";
import { cle } from "./sources/cle";
import { basculerNonEvaluation, ecrireCase, poserJoker } from "./sources/collections";
import type { FichierG3 } from "./noyau/format";
import { ciblesCopie, copierGrille, creerSession, type Session } from "./session";

const g3 = g3Figes as unknown as FichierG3;
const G3_V1 = 2;

function monter() {
  const session = creerSession();
  const cible = ciblesCopie(session, G3_V1).find((c) => c.libelle === "G3 V2")!;
  const { g, rapport } = copierGrille(session, G3_V1, cible.structure);
  const p = (nom: string) => session.sources.participants.toArray.find((l) => l.nom === nom)!.p;
  return { session, g, rapport, p };
}

function egale(session: Session, g: number, p: number, attendus: Record<string, number | null>, qui: string) {
  const plan = session.plans[g];
  for (const [id, a] of Object.entries(attendus)) {
    const v = session.store.getResult(g, p, plan.index.get(id)!).valeur;
    if (a === null) expect(v, `${qui} ${id}`).toBeNaN();
    else expect(v, `${qui} ${id}`).toBeCloseTo(a, 9);
  }
}

/** Tous les résultats d'une grille, pour vérifier qu'ils ne bougent pas. */
function instantane(session: Session, g: number) {
  const plan = session.plans[g];
  return session.sources.participants.toArray.map(({ p }) => plan.ids.map((_, n) => session.store.getResult(g, p, n).valeur));
}

describe("session : action « copier » G3 V1 → V2", () => {
  test("la copie apparaît comme une nouvelle grille, avec le rapport", () => {
    const { session, g, rapport, p } = monter();
    expect(g).toBe(session.plans.length - 1);
    expect(session.plans[g].grille.grille).toContain("G3 V2");
    const attendu = g3.copie.rapport["V1-copie"].map((e) => ({ type: "casePerdue", p: p(e.participant), noeud: e.noeud, valeur: e.valeur }));
    const sansOrdre = (l: unknown[]) => l.map((x) => JSON.stringify(x)).sort();
    expect(attendu.length).toBeGreaterThan(0);
    expect(sansOrdre(rapport)).toEqual(sansOrdre(attendu));
  });

  test("la nouvelle grille rend la table « V2 juste après la copie »", () => {
    const { session, g, p } = monter();
    for (const pt of g3.etats["V2-copie"].participants) egale(session, g, p(pt.nom), pt.attendus, pt.nom);
  });

  test("poursuivre la saisie dans la copie (TanStack DB) donne la table « V2 à l'état final »", () => {
    const { session, g, p } = monter();
    const plan = session.plans[g];
    for (const pt of g3.etats["V2-final"].participants) {
      for (const c of pt.sources.cases) ecrireCase(session.sources, g, p(pt.nom), plan.indexDonnee[plan.index.get(c.noeud)!], c.valeur);
      for (const ne of pt.sources.nonEvaluations) basculerNonEvaluation(session.sources, g, p(pt.nom), plan.index.get(ne.noeud)!);
      for (const j of pt.sources.jokers) {
        const def = plan.indexJoker.get(j.jokerDef)!;
        const valeur = session.store.getResult(g, p(pt.nom), plan.jokerDefs[def].n).valeur;
        expect(poserJoker(session.sources, plan, g, p(pt.nom), def, j.justification, valeur)).toBeNull();
      }
    }
    for (const pt of g3.etats["V2-final"].participants) egale(session, g, p(pt.nom), pt.attendus, pt.nom);
  });

  test("indépendance : une écriture dans V2 ne change rien dans V1, et inversement", () => {
    const { session, g, p } = monter();
    const v1 = session.plans[G3_V1];
    const v2 = session.plans[g];
    const alice = p("Alice");
    const d = (plan: typeof v1, id: string) => plan.indexDonnee[plan.index.get(id)!];

    const avantV1 = instantane(session, G3_V1);
    ecrireCase(session.sources, g, alice, d(v2, "consignes-e2"), 0);
    ecrireCase(session.sources, g, alice, d(v2, "sr5"), 1);
    basculerNonEvaluation(session.sources, g, alice, v2.index.get("reg:e2")!);
    expect(session.store.getResult(g, alice, v2.index.get("e2")!).valeur).not.toBeCloseTo(83.333, 2);
    expect(instantane(session, G3_V1)).toEqual(avantV1);
    expect(session.sources.cases.get(cle(G3_V1, alice, d(v1, "consignes-e2")))?.valeur).toBe(3);

    const avantV2 = instantane(session, g);
    ecrireCase(session.sources, G3_V1, alice, d(v1, "gestion"), 0);
    ecrireCase(session.sources, G3_V1, alice, d(v1, "appreciation-e2"), NaN);
    basculerNonEvaluation(session.sources, G3_V1, alice, v1.index.get("reg:e1")!);
    expect(instantane(session, g)).toEqual(avantV2);
  });

  test("copier deux fois donne deux grilles indépendantes (comparaison des deux modes)", () => {
    const { session, g } = monter();
    const cible = ciblesCopie(session, G3_V1).find((c) => c.libelle === "G3 V2")!;
    const second = copierGrille(session, G3_V1, cible.structure, { dispenseSupprimee: "perdue" });
    expect(second.g).toBe(g + 1);
    expect(instantane(session, second.g)).toEqual(instantane(session, g));
  });
});
