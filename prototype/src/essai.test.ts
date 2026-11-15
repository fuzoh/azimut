// Bascule à chaud des commutateurs, comparaison A → B et mode « vérification »
// (ticket #22). Valeurs attendues : `g3-controle.py --figer` (g3-participants.json),
// tables de g3-moniteur-camp.md (« Commutateurs, V2 à l'état final »).

import g3Figes from "@corpus/g3-participants.json";
import { describe, expect, test } from "vitest";
import { creerEssai } from "./essai";
import type { FichierG3 } from "./noyau/format";
import { ecrireUrl, reglagesParDefaut } from "./reglages";
import { basculerNonEvaluation, ecrireCase, poserJoker, retirerJoker } from "./sources/collections";
import type { StoreNotes } from "./store/store";
import { verifier } from "./verification";

const g3 = g3Figes as unknown as FichierG3;
const G3_V2 = 3;
const fige = (nom: string) => g3.etats["V2-final"].participants.find((p) => p.nom === nom)!;
const commutateur = (nom: string, c: object) =>
  g3.commutateurs.find((x) => x.nom === nom && JSON.stringify(x.commutateurs) === JSON.stringify(c))!;
const pourcent = (v: number) => `${(Math.floor(v * 10 + 0.5 + 1e-9) / 10).toFixed(1).replace(".", ",")} %`;
const attendre = () => new Promise((r) => setTimeout(r, 0));

describe("bascule à chaud des commutateurs du modèle", () => {
  test("1b A → B pour Chloé en V2 final : Planification 63,9 % → 69,4 %, sans perdre les saisies", () => {
    const essai = creerEssai("");
    const { session } = essai;
    const plan = session.plans[G3_V2];
    const p = (nom: string) => session.sources.participants.toArray.find((l) => l.nom === nom)!.p;
    const chloe = p("Chloé");
    const planification = plan.index.get("planification")!;
    // Valeurs figées : 1b-A (dispense de reg:e3) et 1b-B (dispense sur un regroupement
    // sans effet en 1b-B : résultats « sans dispense », non-evaluations.test.ts).
    const a = fige("Chloé").attendus.planification!;
    const b = commutateur("Chloé", {}).attendus.planification!;
    expect([pourcent(a), pourcent(b)]).toEqual(["63,9 %", "69,4 %"]);

    // Saisies de l'essai, avant la bascule : une case d'Alice, une non-évaluation de Bruno.
    const alice = p("Alice");
    const sr1 = plan.index.get("sr1")!;
    ecrireCase(session.sources, G3_V2, alice, plan.indexDonnee[sr1], 0);
    basculerNonEvaluation(session.sources, G3_V2, p("Bruno"), plan.index.get("consignes-e2")!);
    const avant = {
      cases: session.sources.cases.size,
      nonEvaluations: session.sources.nonEvaluations.size,
      jokers: session.sources.jokers.size,
      aliceSr1: session.store.getResult(G3_V2, alice, sr1).valeur,
    };
    expect(session.store.getResult(G3_V2, chloe, planification).valeur).toBeCloseTo(a, 9);
    let notifiee = 0;
    const d = session.store.subscribeResult(G3_V2, chloe, planification, () => notifiee++);

    const r = essai.changer({ ...essai.etat().reglages, modele: { ...essai.etat().reglages.modele, feuilles1b: "B" } });
    expect(r.rechargement).toBe(false);
    expect(new URLSearchParams(r.url).get("1b")).toBe("B");
    expect(session.plans[G3_V2].commutateurs.feuilles1b).toBe("B");
    expect(session.store.getResult(G3_V2, chloe, planification).valeur).toBeCloseTo(b, 9);
    expect(notifiee).toBe(1);
    expect({
      cases: session.sources.cases.size,
      nonEvaluations: session.sources.nonEvaluations.size,
      jokers: session.sources.jokers.size,
      aliceSr1: session.store.getResult(G3_V2, alice, sr1).valeur,
    }).toEqual(avant);
    // La dispense de Chloé est toujours là : revenir à 1b-A redonne 63,9 %.
    essai.changer({ ...essai.etat().reglages, modele: { ...essai.etat().reglages.modele, feuilles1b: "A" } });
    expect(session.store.getResult(G3_V2, chloe, planification).valeur).toBeCloseTo(a, 9);
    d();
    essai.dispose();
  });

  test("un réglage du store ou du générateur demande un rechargement et ne change rien à chaud", () => {
    const essai = creerEssai("");
    const r = essai.etat().reglages;
    const res = essai.changer({ ...r, store: { ...r.store, calcul: "dag" } });
    expect(res.rechargement).toBe(true);
    expect(new URLSearchParams(res.url).get("calcul")).toBe("dag");
    expect(essai.etat().reglages).toBe(r);
    expect(essai.aDesSaisies()).toBe(false);
    expect(essai.session.sources.cases.has(0)).toBe(true);
    ecrireCase(essai.session.sources, 0, 0, 0, NaN);
    expect(essai.aDesSaisies()).toBe(true);
    essai.dispose();
  });
});

describe("comparaison A → B", () => {
  test("B = H4 strict : Félix montre « OK → sans résultat » sur Minimaux remplis et Réussite", () => {
    const r = reglagesParDefaut();
    const essai = creerEssai(ecrireUrl({ ...r, comparaison: { ...r.modele, h4Strict: true } }));
    const plan = essai.session.plans[G3_V2];
    const felix = essai.session.sources.participants.toArray.find((l) => l.nom === "Félix")!.p;
    const ecarts = essai.comparer(G3_V2, felix)!;
    // Nœuds attendus : ceux dont les valeurs figées diffèrent entre A et B.
    const attendusA = fige("Félix").attendus;
    const attendusB = commutateur("Félix", { h4Strict: true }).attendus;
    const differents = Object.keys(attendusB).filter((id) => attendusA[id] !== attendusB[id]);
    expect(differents).toEqual(expect.arrayContaining(["minimaux", "reussite"]));
    expect([...ecarts.values()].map((e) => e.id).sort()).toEqual(differents.sort());
    for (const id of ["minimaux", "reussite"]) {
      const e = ecarts.get(plan.index.get(id)!)!;
      expect(e.texte).toBe("OK → sans résultat");
    }
    essai.dispose();
  });

  test("sans B, ou hors du jeu « corpus », pas de comparaison", () => {
    const sans = creerEssai("");
    expect(sans.comparer(G3_V2, 0)).toBeNull();
    sans.dispose();
    const charge = creerEssai("?jeu=charge&cmp=1&b.h4=strict");
    expect(charge.comparaisonDisponible()).toBe(false);
    expect(charge.comparer(G3_V2, 0)).toBeNull();
    charge.dispose();
  });
});

describe("mode « vérification »", () => {
  test("aucun écart sur une série de saisies (cases, non-évaluations, jokers, bascules du modèle)", async () => {
    const essai = creerEssai("");
    const { session } = essai;
    expect(essai.etat().verification!.ecarts).toEqual([]);
    const plan = session.plans[G3_V2];
    const nom = (x: string) => session.sources.participants.toArray.find((l) => l.nom === x)!;
    const pts = ["Alice", "Bruno", "Chloé", "David", "Ana"].map(nom);
    const rapports: number[] = [];
    const id = (x: string) => plan.index.get(x)!;
    const saisies: (() => void)[] = [
      () => ecrireCase(session.sources, G3_V2, pts[0].p, plan.indexDonnee[id("sr1")], 0),
      () => ecrireCase(session.sources, G3_V2, pts[1].p, plan.indexDonnee[id("consignes-e3")], NaN),
      () => basculerNonEvaluation(session.sources, G3_V2, pts[2].p, id("reg:e3")),
      () => basculerNonEvaluation(session.sources, G3_V2, pts[2].p, id("reg:e3")),
      () => basculerNonEvaluation(session.sources, 1, pts[0].p, 0),
      () => expect(poserJoker(session.sources, session.plans[G3_V2], G3_V2, pts[3].p, 0, "essai", session.store.getResult(G3_V2, pts[3].p, session.plans[G3_V2].jokerDefs[0].n).valeur)).toBeNull(),
      () => essai.changer({ ...essai.etat().reglages, modele: { ...essai.etat().reglages.modele, h4Strict: true, feuilles1b: "C" } }),
      () => ecrireCase(session.sources, 0, pts[4].p, 0, NaN),
      () => {
        for (const j of session.sources.jokers.toArray.filter((l) => l.g === G3_V2)) retirerJoker(session.sources, j.id);
      },
      () => essai.changer({ ...essai.etat().reglages, modele: { ...essai.etat().reglages.modele, dispense1a: "B", h5b: "cumules" } }),
    ];
    for (const s of saisies) {
      s();
      await attendre();
      const v = essai.etat().verification!;
      rapports.push(v.numero);
      expect(v.ecarts, `vérification n° ${v.numero}`).toEqual([]);
      expect(v.comparees).toBeGreaterThan(0);
    }
    // Une vérification par saisie (plus l'initiale).
    expect(new Set(rapports).size).toBe(saisies.length);
    essai.dispose();
  });

  test("un écart injecté dans le store est signalé", () => {
    const essai = creerEssai("");
    const { session } = essai;
    const plan = session.plans[G3_V2];
    const felix = session.sources.participants.toArray.find((l) => l.nom === "Félix")!.p;
    const reussite = plan.index.get("reussite")!;
    const fautif: StoreNotes = {
      ...session.store,
      getResult(g, p, n) {
        const r = session.store.getResult(g, p, n);
        return g === G3_V2 && p === felix && n === reussite ? { ...r, valeur: 0 } : r;
      },
    };
    const rapport = verifier({ plans: session.plans, sources: session.sources, store: fautif });
    expect(rapport.ecarts).toEqual([{ g: G3_V2, p: felix, n: reussite, id: "reussite", champ: "valeur", oracle: fige("Félix").attendus.reussite, store: 0 }]);
    essai.dispose();
  });

  test("désactivée à chaud : plus de rapport", () => {
    const essai = creerEssai("");
    const r = essai.etat().reglages;
    expect(essai.changer({ ...r, session: { ...r.session, verification: false } }).rechargement).toBe(false);
    expect(essai.etat().verification).toBeNull();
    essai.dispose();
  });
});
