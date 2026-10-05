// Configuration de base du store (#24) : signaux en LRU dans le worker, ici le
// moteur du worker derrière un canal en mémoire (messages clonés, asynchrones).
// Attendus : participants types figés par `a01-a03-controle.py --figer` et
// `g3-controle.py --figer` ; sinon l'oracle `evaluate`, jamais le code testé.

import a01Figes from "@corpus/a01-participants.json";
import a03Figes from "@corpus/a03-participants.json";
import g3Figes from "@corpus/g3-participants.json";
import { describe, expect, test } from "vitest";
import type { Commutateurs } from "../noyau/compile";
import { evaluate } from "../noyau/evaluate";
import type { FichierG3, FichierParticipants } from "../noyau/format";
import { appliquerCommutateurs, ciblesCopie, copierGrille, creerSession, lireSourcesGrille, type Session } from "../session";
import { ecrireCase } from "../sources/collections";
import { GENERATION_PAR_DEFAUT, type GenerationSession } from "../sources/initiales";
import { canalLocal } from "./canal";
import { fabriqueBase, fabriqueBaseLocale } from "./fabriques";
import type { VersWorker } from "./protocole";
import { comparerInstantane, souscrire } from "./aides-test";
import type { StoreBase } from "./storeBase";

const g3 = g3Figes as unknown as FichierG3;
const G3_V1 = 2;
const G3_V2 = 3;

function monter(lru = 50, generation: GenerationSession = GENERATION_PAR_DEFAUT, commutateurs: Commutateurs = {}) {
  const session = creerSession(commutateurs, generation, fabriqueBaseLocale(lru));
  const store = session.store as StoreBase;
  const p = (nom: string) => session.sources.participants.toArray.find((l) => l.nom === nom)!.p;
  return { session, store, p };
}

function egaleFige(session: Session, g: number, p: number, attendus: Record<string, number | null>, qui: string) {
  const plan = session.plans[g];
  for (const [id, a] of Object.entries(attendus)) {
    const r = session.store.getResult(g, p, plan.index.get(id)!);
    expect(r.enCalcul, `${qui} ${id} en calcul`).toBe(false);
    if (a === null) expect(r.valeur, `${qui} ${id}`).toBeNaN();
    else expect(r.valeur, `${qui} ${id}`).toBeCloseTo(a, 9);
  }
}

const CORPUS: [number, FichierParticipants][] = [
  [0, a01Figes as FichierParticipants],
  [1, a03Figes as FichierParticipants],
  [G3_V1, { ...g3.etats["V1-copie"], source: "" }],
  [G3_V2, { ...g3.etats["V2-final"], source: "" }],
];

describe("store de base : participants types", () => {
  test.each(CORPUS)("grille g%i : chaque participant type égale ses résultats figés, à travers le worker", async (g, fichier) => {
    const { session, store, p } = monter();
    const plan = session.plans[g];
    const cellules = fichier.participants.flatMap((pt) => Object.keys(pt.attendus).map((id) => [g, p(pt.nom), plan.index.get(id)!] as [number, number, number]));
    // Avant la réponse du worker : « en calcul ».
    expect(store.getResult(...cellules[0]).enCalcul).toBe(true);
    const fin = souscrire(store, cellules);
    await store.stable();
    for (const pt of fichier.participants) egaleFige(session, g, p(pt.nom), pt.attendus, pt.nom);
    fin();
    store.dispose();
  });

  test("une saisie passe « en calcul » jusqu'au retour du worker, puis rend le résultat figé (Fanny, A03)", async () => {
    const { session, store, p } = monter();
    const plan = session.plans[1];
    const fanny = p("Fanny");
    const fige = (a03Figes as FichierParticipants).participants.find((x) => x.nom === "Fanny")!;
    const saisie = fige.apresSaisie!;
    const ids = Object.keys(saisie.attendus);
    const notifs = new Map<string, number>();
    for (const id of ids) store.subscribeResult(1, fanny, plan.index.get(id)!, () => notifs.set(id, (notifs.get(id) ?? 0) + 1));
    await store.stable();
    ecrireCase(session.sources, 1, fanny, plan.indexDonnee[plan.index.get(saisie.case.noeud)!], saisie.case.valeur);
    for (const id of ids) expect(store.getResult(1, fanny, plan.index.get(id)!).enCalcul, id).toBe(true);
    await store.stable();
    for (const id of ids) {
      const r = store.getResult(1, fanny, plan.index.get(id)!);
      expect(r.enCalcul).toBe(false);
      expect(r.valeur, id).toBe(saisie.attendus[id]);
    }
    store.dispose();
  });
});

describe("store de base : somme de contrôle", () => {
  const generation: GenerationSession = { jeu: "corpus", remplissage: "fin", graine: 7, participants: 4 };

  test("même graine des deux côtés : accord", async () => {
    const { store } = monter(50, generation);
    await store.stable();
    await new Promise((r) => setTimeout(r, 10));
    expect(store.etatWorker().statut).toBe("pret");
    expect(store.etatWorker().sommeWorker).toBe(store.etatWorker().sommePrincipal);
    store.dispose();
  });

  test("une graine différente dans le worker : désaccord signalé au démarrage", async () => {
    const alterer = (m: VersWorker): VersWorker =>
      m.type === "init" ? { ...m, generation: { ...m.generation, graine: 8 } } : m;
    const session = creerSession({}, generation, fabriqueBase(50, () => canalLocal({ alterer })));
    const store = session.store as StoreBase;
    expect(store.etatWorker().statut).toBe("demarrage");
    let notifie = 0;
    store.abonnerEtatWorker(() => notifie++);
    await new Promise((r) => setTimeout(r, 20));
    expect(notifie).toBe(1);
    expect(store.etatWorker().statut).toBe("desaccord");
    expect(store.etatWorker().sommeWorker).not.toBe(store.etatWorker().sommePrincipal);
    store.dispose();
  });
});

describe("store de base : copie de grille et bascule du modèle dans le worker", () => {
  test("copie G3 V1 → V2 : la nouvelle grille rend la table « V2 juste après la copie », V1 inchangée", async () => {
    const { session, store, p } = monter();
    const cible = ciblesCopie(session, G3_V1).find((c) => c.libelle === "G3 V2")!;
    const { g } = copierGrille(session, G3_V1, cible.structure);
    const plan = session.plans[g];
    const v2Copie = g3.etats["V2-copie"].participants;
    const v1 = g3.etats["V1-copie"].participants;
    const fin = souscrire(store, [
      ...v2Copie.flatMap((pt) => Object.keys(pt.attendus).map((id) => [g, p(pt.nom), plan.index.get(id)!] as [number, number, number])),
      ...v1.flatMap((pt) => Object.keys(pt.attendus).map((id) => [G3_V1, p(pt.nom), session.plans[G3_V1].index.get(id)!] as [number, number, number])),
    ]);
    await store.stable();
    for (const pt of v2Copie) egaleFige(session, g, p(pt.nom), pt.attendus, `V2 copie ${pt.nom}`);
    for (const pt of v1) egaleFige(session, G3_V1, p(pt.nom), pt.attendus, `V1 ${pt.nom}`);
    // Le worker a ses propres tableaux pour la copie : instantané complet = oracle.
    await comparerInstantane(session, store);
    fin();
    store.dispose();
  });

  test("bascule H4 strict à chaud : la Réussite de A03 égale les résultats figés en H4 strict, puis revient", async () => {
    const { session, store, p } = monter();
    const plan = () => session.plans[1];
    const pts = (a03Figes as FichierParticipants).participants;
    const reussite = plan().index.get("reussite")!;
    const fin = souscrire(store, pts.map((pt) => [1, p(pt.nom), reussite]));
    await store.stable();
    appliquerCommutateurs(session, { h4Strict: true });
    for (const pt of pts) expect(store.getResult(1, p(pt.nom), reussite).enCalcul).toBe(true);
    await store.stable();
    for (const pt of pts) {
      const v = store.getResult(1, p(pt.nom), reussite).valeur;
      expect(Number.isNaN(v) ? null : v, pt.nom).toBe(pt.attendusH4Strict!.reussite);
    }
    await comparerInstantane(session, store);
    appliquerCommutateurs(session, {});
    await store.stable();
    for (const pt of pts) {
      const v = store.getResult(1, p(pt.nom), reussite).valeur;
      expect(Number.isNaN(v) ? null : v, pt.nom).toBe(pt.attendus.reussite);
    }
    fin();
    store.dispose();
  });

  test("copie puis bascule : la copie est recompilée dans le worker aussi", async () => {
    const { session, store } = monter();
    const cible = ciblesCopie(session, G3_V1).find((c) => c.libelle === "G3 V2")!;
    copierGrille(session, G3_V1, cible.structure);
    appliquerCommutateurs(session, { dispense1a: "B", feuilles1b: "C", h5b: "cumules" });
    await store.stable();
    await comparerInstantane(session, store);
    store.dispose();
  });
});

describe("store de base : explication, graphe, cohorte, LRU", () => {
  test("explain et graphe sont servis par le worker et suivent les saisies", async () => {
    const { session, store, p } = monter();
    const plan = session.plans[G3_V2];
    const alice = p("Alice");
    const n = plan.index.get("e2")!;
    const avant = await store.explain(G3_V2, alice, n);
    ecrireCase(session.sources, G3_V2, alice, plan.indexDonnee[plan.index.get("sr5")!], 0);
    const apres = await store.explain(G3_V2, alice, n);
    const oracle = evaluate(plan, lireSourcesGrille(session, G3_V2).get(alice)!);
    expect(Object.is(apres.valeur, oracle.valeurs[n]) || Math.abs(apres.valeur - oracle.valeurs[n]) < 1e-9).toBe(true);
    expect(avant.id).toBe("e2");
    const gr = await store.graphe(G3_V2, alice);
    expect(gr.noeuds.length).toBeGreaterThan(0);
    store.dispose();
  });

  test("useCohort : la colonne Réussite de G3 V2 égale les résultats figés", async () => {
    const { session, store, p } = monter();
    const n = session.plans[G3_V2].index.get("reussite")!;
    let notifs = 0;
    const fin = store.subscribeCohort(G3_V2, n, () => notifs++);
    await store.stable();
    const col = store.getCohort(G3_V2, n);
    expect(col).toHaveLength(session.sources.participants.size);
    for (const pt of g3.etats["V2-final"].participants) {
      const v = col[p(pt.nom)].valeur;
      expect(Number.isNaN(v) ? null : v, pt.nom).toBe(pt.attendus.reussite);
    }
    expect(notifs).toBeGreaterThan(0);
    fin();
    store.dispose();
  });

  test("le LRU garde au plus N participants instanciés, les plus récents", async () => {
    const canal = canalLocal();
    const session = creerSession({}, GENERATION_PAR_DEFAUT, fabriqueBase(2, () => canal));
    const store = session.store as StoreBase;
    for (let pp = 0; pp < 4; pp++) store.subscribeResult(G3_V2, pp, 0, () => {});
    await store.stable();
    const lru = canal.moteur.lru();
    expect(lru).toHaveLength(2);
    store.dispose();
  });
});

describe("store de base : état de remplissage", () => {
  test("useFillStatus : intérêt par (g, p), état servi par le worker et mis à jour après un lot", async () => {
    const { session, store, p } = monter();
    const plan = session.plans[1];
    const fanny = p("Fanny");
    let notifs = 0;
    store.subscribeFillStatus(1, fanny, () => notifs++);
    await store.stable();
    const avant = store.getFillStatus(1, fanny);
    // Fanny (A03) a des critères sans note : données provisoires (colonne « Critères sans note »).
    expect(avant.provisoire).toBe(true);
    // Une note sur une feuille d'un minimum non atteint lève cette erreur.
    const erreur = avant.erreurs.find((e) => e.type === "minimum")!;
    const d = plan.minimums.find((m) => m.n === erreur.n)!.feuilles[0];
    const b = plan.baremes[plan.bareme[plan.donnees[d]]];
    ecrireCase(session.sources, 1, fanny, d, b.type === "ordinal" ? 0 : b.min);
    await store.stable();
    expect(notifs).toBeGreaterThan(1);
    expect(store.getFillStatus(1, fanny)).not.toEqual(avant);
    store.dispose();
  });
});
