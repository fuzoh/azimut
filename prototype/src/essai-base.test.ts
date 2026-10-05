// Mode « vérification » avec la configuration de base du store (#24) : le
// worker (moteur derrière le canal en mémoire) contre l'oracle, pendant une
// session de saisie, sur les deux jeux.

import { describe, expect, test } from "vitest";
import { creerEssai, type Essai } from "./essai";
import { TYPE_CALCUL } from "./noyau/compile";
import { ciblesCopie, copierGrille, lireSourcesGrille } from "./session";
import { cle } from "./sources/cle";
import { basculerNonEvaluation, ecrireCase, ecrireCaseDistante, poserJoker, retirerJoker } from "./sources/collections";
import { fabriqueBaseLocale } from "./store/fabriques";
import type { StoreBase } from "./store/storeBase";
import { type RapportVerification, verifier } from "./verification";

/** Attend une vérification postérieure à `apres` (numéro), une fois le store stable. */
async function verificationApres(essai: Essai, apres: number): Promise<RapportVerification> {
  await (essai.session.store as StoreBase).stable();
  for (let i = 0; i < 200; i++) {
    const r = essai.etat().verification;
    if (r && r.numero > apres) return r;
    await new Promise((res) => setTimeout(res, 10));
  }
  throw new Error("pas de vérification");
}

async function session(essai: Essai, saisies: (() => void)[]) {
  const store = essai.session.store as StoreBase;
  let r = await verificationApres(essai, 0);
  expect(r.ecarts).toEqual([]);
  expect(r.comparees).toBeGreaterThan(0);
  for (const [i, s] of saisies.entries()) {
    s();
    r = await verificationApres(essai, r.numero);
    expect(r.ecarts, `saisie ${i}`).toEqual([]);
    expect(r.comparees).toBeGreaterThan(0);
    // Le store mince est vérifié aussi : ses cellules souscrites s'ajoutent à l'instantané.
    expect(r.souscrites, `saisie ${i}`).toBeGreaterThan(0);
  }
  expect(store.etatWorker().statut).toBe("pret");
}

describe("mode « vérification » sur le store de base", () => {
  test("jeu « corpus » : aucun écart pendant une session de saisie (cases, non-évaluations, jokers, copie, bascules)", async () => {
    const essai = creerEssai("?participants=3", { fabrique: (r) => fabriqueBaseLocale(r.lru) });
    const { sources, plans } = essai.session;
    const G3 = 3;
    const plan = plans[G3];
    const id = (x: string) => plan.index.get(x)!;
    const p = (nom: string) => sources.participants.toArray.find((l) => l.nom === nom)!.p;
    // Une table affichée : Alice sur G3 V2, toutes ses cellules souscrites.
    for (let n = 0; n < plan.N; n++) essai.session.store.subscribeResult(G3, p("Alice"), n, () => {});
    await session(essai, [
      () => ecrireCase(sources, G3, p("Alice"), plan.indexDonnee[id("sr1")], 0),
      () => ecrireCaseDistante(sources, G3, p("Bruno"), plan.indexDonnee[id("consignes-e3")], NaN),
      () => basculerNonEvaluation(sources, G3, p("Chloé"), id("reg:e3")),
      () => basculerNonEvaluation(sources, 1, p("Alix"), 0),
      () => expect(poserJoker(sources, plan, G3, p("David"), 0, "essai", NaN)).toBeNull(),
      () => essai.changer({ ...essai.etat().reglages, modele: { ...essai.etat().reglages.modele, h4Strict: true, feuilles1b: "C" } }),
      () => ecrireCase(sources, 0, p("Ana"), 0, NaN),
      () => copierGrille(essai.session, 2, ciblesCopie(essai.session, 2).find((c) => c.libelle === "G3 V2")!.structure),
      () => ecrireCase(sources, plans.length - 1, p("Alice"), 0, 1),
      () => {
        for (const j of sources.jokers.toArray.filter((l) => l.g === G3)) retirerJoker(sources, j.id);
      },
      () => essai.changer({ ...essai.etat().reglages, modele: { ...essai.etat().reglages.modele, dispense1a: "B", h5b: "cumules" } }),
      () => ecrireCase(sources, 1, sources.participants.size - 1, 3, 2),
    ]);
    essai.dispose();
  }, 60_000);

  test("jeu « charge » : aucun écart pendant une session de saisie", async () => {
    const essai = creerEssai("?jeu=charge&participants=4&remplissage=fin", { fabrique: (r) => fabriqueBaseLocale(r.lru) });
    const { sources, plans } = essai.session;
    const plan = plans[0];
    const calcul = plan.ids.map((_, n) => n).filter((n) => plan.type[n] === TYPE_CALCUL);
    for (const n of calcul.slice(0, 200)) essai.session.store.subscribeResult(0, 1, n, () => {});
    /** Vide une case remplie, ou remplit une case vide (minimum du barème) : toujours un changement. */
    const basculer = (g: number, p: number, d: number, distante = false) => () => {
      const pl = plans[g];
      const b = pl.baremes[pl.bareme[pl.donnees[d]]];
      const plein = sources.cases.has(cle(g, p, d));
      (distante ? ecrireCaseDistante : ecrireCase)(sources, g, p, d, plein ? NaN : b.type === "ordinal" ? 0 : b.min);
    };
    await session(essai, [
      basculer(0, 1, 0),
      basculer(0, 1, 5),
      basculer(1, 2, 7, true),
      () => basculerNonEvaluation(sources, 2, 3, plan.donnees[10]),
      () => basculerNonEvaluation(sources, 0, 1, calcul[3]),
      () => essai.changer({ ...essai.etat().reglages, modele: { ...essai.etat().reglages.modele, feuilles1b: "B" } }),
      basculer(0, 0, 1),
    ]);
    essai.dispose();
  }, 120_000);

  test("une cellule souscrite fausse dans le store mince est signalée, même si l'instantané du worker est juste", async () => {
    const essai = creerEssai("?participants=3", { fabrique: (r) => fabriqueBaseLocale(r.lru) });
    const { plans } = essai.session;
    const store = essai.session.store as StoreBase;
    const G3 = 3;
    const plan = plans[G3];
    for (let n = 0; n < plan.N; n++) store.subscribeResult(G3, 0, n, () => {});
    const r0 = await verificationApres(essai, 0);
    expect(r0.ecarts).toEqual([]);
    expect(r0.souscrites).toBe(plan.N);
    // Total de l'instantané (toutes les cellules) + cellules souscrites.
    const total = plans.reduce((t, pl, g) => t + pl.N * lireSourcesGrille(essai.session, g).size, 0);
    expect(r0.comparees + r0.enCalcul).toBe(total + plan.N);
    // Le store mince rend une valeur fausse pour une cellule : écart signalé.
    const n = plan.index.get("sr1")!;
    const vrai = store.getResult.bind(store);
    store.getResult = (g, p, m) => (g === G3 && p === 0 && m === n ? { ...vrai(g, p, m), cause: 99 } : vrai(g, p, m));
    const r2 = verifier(essai.session, 1, await store.instantane());
    expect(r2.ecarts).toEqual([expect.objectContaining({ g: G3, p: 0, n, champ: "cause", store: 99 })]);
    essai.dispose();
  }, 60_000);
});
