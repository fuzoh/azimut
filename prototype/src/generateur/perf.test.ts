// Jeu « perf » (ticket #28) : structures du corpus non étendues, choisies
// explicitement, exactement P participants générés, mêmes sources sur la page
// et dans le worker. Le corpus de validation et ses attendus ne changent pas
// (couverts par leurs propres tests) ; ici, ce qui distingue le jeu « perf ».

import { describe, expect, test } from "vitest";
import { decrireProfil } from "../mesure/profil";
import { compile } from "../noyau/compile";
import { ciblesCopie, copierGrille, creerSession } from "../session";
import type { GenerationSession } from "../sources/initiales";
import { fabriqueBaseLocale } from "../store/fabriques";
import type { VersWorker } from "../store/protocole";
import type { StoreBase } from "../store/storeBase";
import { generer } from "./generer";
import { grillesDuJeu, IDS_STRUCTURES, type IdStructure, normaliserStructures, STRUCTURES_CORPUS } from "./jeux";

const perf = (structures: IdStructure[], participants = 20, graine = 1): GenerationSession => ({ jeu: "perf", remplissage: "fin", graine, participants, structures });

describe("sélection des structures", () => {
  test("ordre canonique ; inconnues, doublons et liste vide refusés", () => {
    expect(normaliserStructures(["g3v2", "a01"])).toEqual({ structures: ["a01", "g3v2"], erreurs: [] });
    expect(normaliserStructures(["a02"]).erreurs).toHaveLength(1);
    expect(normaliserStructures(["a03", "a03"]).erreurs).toEqual(["structure en double : a03"]);
    expect(normaliserStructures([]).erreurs).toEqual(["aucune structure choisie"]);
    expect(() => grillesDuJeu("perf", [])).toThrow(/aucune structure/);
  });

  test.each(IDS_STRUCTURES.map((id, i) => [id, i] as const))("%s seule : la structure du corpus, non étendue, sans participants types", (id, i) => {
    const grilles = grillesDuJeu("perf", [id]);
    expect(grilles).toHaveLength(1);
    expect(grilles[0].structure).toBe(STRUCTURES_CORPUS[i]);
    expect(grilles[0].participantsTypes).toBeUndefined();
    expect(compile(grilles[0].structure).D).toBe(compile(STRUCTURES_CORPUS[i]).D);
  });

  test("session composite : les grilles choisies, dans l'ordre canonique", () => {
    const session = creerSession({}, perf(["g3v2", "a01", "a03"]));
    expect(session.plans.map((p) => p.grille.grille)).toEqual(["A01", "A03", "G3 V2"]);
    session.store.dispose();
  });
});

describe("effectif et déterminisme", () => {
  test.each([12, 20, 40, 200])("P = %i : exactement P participants, sans participant type", (P) => {
    const session = creerSession({}, perf(["a03"], P));
    const participants = session.sources.participants.toArray.sort((a, b) => a.p - b.p);
    expect(participants).toHaveLength(P);
    expect(participants.map((l) => l.p)).toEqual(Array.from({ length: P }, (_, i) => i));
    expect(participants.every((l) => l.id.startsWith("gen-"))).toBe(true);
    session.store.dispose();
  });

  test("même profil → mêmes sources (somme de contrôle) ; autre graine → autres sources", () => {
    const a = creerSession({}, perf(["a01", "g3v1"], 40, 3));
    const b = creerSession({}, perf(["a01", "g3v1"], 40, 3));
    const c = creerSession({}, perf(["a01", "g3v1"], 40, 4));
    expect(b.sommeControle).toBe(a.sommeControle);
    expect(c.sommeControle).not.toBe(a.sommeControle);
    for (const s of [a, b, c]) s.store.dispose();
  });

  test("une structure reçoit les mêmes sources seule ou dans une session composite (à l'index de grille près)", () => {
    const seule = creerSession({}, perf(["a03"]));
    const composite = creerSession({}, perf(["a01", "a03", "g3v2"]));
    const lignes = (s: typeof seule, g: number) =>
      s.sources.cases.toArray
        .filter((l) => l.g === g)
        .map((l) => `${l.p}:${l.d}:${l.valeur}`)
        .sort();
    expect(lignes(composite, 1)).toEqual(lignes(seule, 0));
    expect(lignes(seule, 0).length).toBeGreaterThan(0);
    for (const s of [seule, composite]) s.store.dispose();
  });

  test("sans flux explicites, le générateur garde ses flux par index de grille (jeux « corpus » et « charge » inchangés)", () => {
    const plans = STRUCTURES_CORPUS.map((s) => compile(s));
    expect(generer(plans, 5, { remplissage: "milieu", participants: 6, flux: [0, 1, 2, 3] })).toEqual(generer(plans, 5, { remplissage: "milieu", participants: 6 }));
  });
});

describe("page et worker", () => {
  test("mêmes sources des deux côtés : la somme de contrôle du worker égale celle de la page", async () => {
    const session = creerSession({}, perf(["a01", "g3v1"], 20, 7), fabriqueBaseLocale(50));
    const store = session.store as StoreBase;
    await store.stable();
    await new Promise((r) => setTimeout(r, 10));
    expect(store.etatWorker().statut).toBe("pret");
    expect(store.etatWorker().sommeWorker).toBe(session.sommeControle);
    store.dispose();
  });

  test("les structures voyagent dans le message d'initialisation : une autre sélection côté worker est signalée", async () => {
    const alterer = (m: VersWorker): VersWorker => (m.type === "init" ? { ...m, generation: { ...m.generation, structures: ["a01"] } } : m);
    const session = creerSession({}, perf(["a03"]), fabriqueBaseLocale(50, { alterer }));
    const store = session.store as StoreBase;
    await new Promise((r) => setTimeout(r, 20));
    expect(store.etatWorker().statut).toBe("desaccord");
    store.dispose();
  });
});

describe("profil rapporté", () => {
  test("volumes par grille : cases possibles et stockées, non-évaluations, jokers, remplissage observé", () => {
    const session = creerSession({}, perf(["a03", "g3v2"], 20));
    const profil = decrireProfil(session);
    expect(profil).toMatchObject({ jeu: "perf", structures: ["a03", "g3v2"], participants: 20, remplissage: "fin", graine: 1, sommeControle: session.sommeControle });
    profil.grilles.forEach((x, g) => {
      const plan = session.plans[g];
      expect(x).toMatchObject({ g, nom: plan.grille.grille, structure: profil.structures[g], donnees: plan.D, noeuds: plan.N, casesPossibles: 20 * plan.D });
      expect(x.casesStockees).toBe(session.sources.cases.toArray.filter((l) => l.g === g).length);
      expect(x.nonEvaluations + x.dispenses).toBe(session.sources.nonEvaluations.toArray.filter((l) => l.g === g).length);
      expect(x.jokers).toBe(session.sources.jokers.toArray.filter((l) => l.g === g).length);
      expect(x.calculs).toBeGreaterThan(0);
      // Profil « fin » : ≈ 90 % des cases possibles remplies.
      expect(Math.abs(x.remplissageObserve - 0.9)).toBeLessThan(0.06);
      expect(x.empreinte).toMatch(/^[0-9a-f]{8}$/);
    });
    expect(profil.grilles[0].empreinte).not.toBe(profil.grilles[1].empreinte);
    session.store.dispose();
  });
});

describe("G3 V1 seule, puis copie vers V2", () => {
  test("la structure V2 du corpus est proposée comme cible et la copie ajoute une grille", () => {
    const session = creerSession({}, perf(["g3v1"]));
    const cibles = ciblesCopie(session, 0);
    expect(cibles.map((c) => c.libelle)).toEqual(["G3 V2", "copie à l'identique"]);
    const { g } = copierGrille(session, 0, cibles[0].structure);
    expect(g).toBe(1);
    expect(session.plans[1].grille.grille).toMatch(/^G3 V2/);
    expect(session.sources.cases.toArray.some((l) => l.g === 1)).toBe(true);
    session.store.dispose();
  });
});
