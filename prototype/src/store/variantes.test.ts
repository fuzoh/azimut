// Les 5 configurations du store (#25) : la base, puis un axe à la fois
// (calcul DAG maison, lieu thread principal, cohorte précalculée, saisie
// distante recalculée tout de suite). Le moteur du worker passe par le canal
// en mémoire. Attendus : participants types figés par `a01-a03-controle.py
// --figer` et `g3-controle.py --figer` ; sinon l'oracle `evaluate`, jamais le
// code testé.

import a01Figes from "@corpus/a01-participants.json";
import a03Figes from "@corpus/a03-participants.json";
import g3Figes from "@corpus/g3-participants.json";
import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { Commutateurs } from "../noyau/compile";
import { evaluate } from "../noyau/evaluate";
import type { FichierG3, FichierParticipants } from "../noyau/format";
import type { ReglagesStore } from "../reglages";
import { appliquerCommutateurs, ciblesCopie, copierGrille, creerSession, lireSourcesGrille } from "../session";
import { basculerNonEvaluation, ecrireCase, ecrireCaseDistante, poserJoker, retirerJoker } from "../sources/collections";
import { GENERATION_PAR_DEFAUT, type GenerationSession } from "../sources/initiales";
import { comparerAOracle, comparerInstantane, souscrire, valeurValide } from "./aides-test";
import { canalLocal } from "./canal";
import { CONFIGURATIONS, fabriqueBase, fabriquePourReglages } from "./fabriques";
import type { StoreVerifiable } from "./store";

const g3 = g3Figes as unknown as FichierG3;
const G3_V1 = 2;
const G3_V2 = 3;

function monter(config: Omit<ReglagesStore, "lru">, lru = 50, generation: GenerationSession = GENERATION_PAR_DEFAUT, commutateurs: Commutateurs = {}) {
  // Sans `Worker` (Node), `fabriquePourReglages` met le moteur derrière le canal en mémoire.
  const session = creerSession(commutateurs, generation, fabriquePourReglages({ ...config, lru }));
  const store = session.store as StoreVerifiable;
  const p = (nom: string) => session.sources.participants.toArray.find((l) => l.nom === nom)!.p;
  return { session, store, p };
}

const CORPUS: [number, FichierParticipants][] = [
  [0, a01Figes as FichierParticipants],
  [1, a03Figes as FichierParticipants],
  [G3_V1, { ...g3.etats["V1-copie"], source: "" }],
  [G3_V2, { ...g3.etats["V2-final"], source: "" }],
];

describe.each(CONFIGURATIONS)("configuration $nom", ({ store: config }) => {
  test("chaque participant type de chaque grille égale ses résultats figés", async () => {
    const { session, store, p } = monter(config, 3);
    for (const [g, fichier] of CORPUS) {
      const plan = session.plans[g];
      const cellules = fichier.participants.flatMap((pt) => Object.keys(pt.attendus).map((id) => [g, p(pt.nom), plan.index.get(id)!] as [number, number, number]));
      const fin = souscrire(store, cellules);
      await store.stable();
      for (const pt of fichier.participants)
        for (const [id, a] of Object.entries(pt.attendus)) {
          const r = store.getResult(g, p(pt.nom), plan.index.get(id)!);
          expect(r.enCalcul, `${pt.nom} ${id}`).toBe(false);
          if (a === null) expect(r.valeur, `g${g} ${pt.nom} ${id}`).toBeNaN();
          else expect(r.valeur, `g${g} ${pt.nom} ${id}`).toBeCloseTo(a, 9);
        }
      fin();
    }
    store.dispose();
  });

  test("copie G3 V1 → V2 puis bascule H4 strict : la copie rend « V2 juste après la copie », l'instantané égale l'oracle", async () => {
    const { session, store, p } = monter(config);
    const cible = ciblesCopie(session, G3_V1).find((c) => c.libelle === "G3 V2")!;
    const { g } = copierGrille(session, G3_V1, cible.structure);
    const plan = session.plans[g];
    const v2Copie = g3.etats["V2-copie"].participants;
    const fin = souscrire(store, v2Copie.flatMap((pt) => Object.keys(pt.attendus).map((id) => [g, p(pt.nom), plan.index.get(id)!] as [number, number, number])));
    await store.stable();
    for (const pt of v2Copie)
      for (const [id, a] of Object.entries(pt.attendus)) {
        const v = store.getResult(g, p(pt.nom), plan.index.get(id)!).valeur;
        if (a === null) expect(v, `V2 copie ${pt.nom} ${id}`).toBeNaN();
        else expect(v, `V2 copie ${pt.nom} ${id}`).toBeCloseTo(a, 9);
      }
    const a03 = (a03Figes as FichierParticipants).participants;
    const reussite = session.plans[1].index.get("reussite")!;
    const finA03 = souscrire(store, a03.map((pt) => [1, p(pt.nom), reussite]));
    appliquerCommutateurs(session, { h4Strict: true });
    await store.stable();
    for (const pt of a03) {
      const v = store.getResult(1, p(pt.nom), reussite).valeur;
      expect(Number.isNaN(v) ? null : v, pt.nom).toBe(pt.attendusH4Strict!.reussite);
    }
    await comparerInstantane(session, store);
    fin();
    finA03();
    store.dispose();
  });

  test("propriété : sur des séquences de saisies (locales et distantes), non-évaluations et jokers, le store égale evaluate après chaque pas", async () => {
    const sonde = creerSession();
    const P = sonde.sources.participants.size;
    const tailles = sonde.plans.length;
    sonde.store.dispose();
    const g = fc.integer({ min: 0, max: tailles - 1 });
    // Quelques participants de chaque fichier (A01 : p0–3, A03 : p4–9, G3 : p10–15),
    // pour que les pas tombent souvent sur un participant affiché ou en cache.
    const p = fc.constantFrom(...[0, 1, 4, 5, 10, 11, 12].filter((x) => x < P));
    const unite = fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true });
    const ici = fc.boolean();
    const commutateurs: fc.Arbitrary<Commutateurs> = fc.record(
      {
        dispense1a: fc.constantFrom("A" as const, "B" as const),
        feuilles1b: fc.constantFrom("A" as const, "B" as const, "C" as const),
        minimum1c: fc.boolean(),
        h4Strict: fc.boolean(),
        h5a: fc.constantFrom("accepte" as const, "refuse" as const),
        h5b: fc.constantFrom("unSeul" as const, "cumules" as const),
        f5Derniere: fc.boolean(),
        f5SansPlafond: fc.boolean(),
      },
      { requiredKeys: [] },
    );
    type Pas =
      | { type: "case"; g: number; p: number; ici: boolean; d: number; x: number; vider: boolean; distante: boolean }
      | { type: "nonEval"; g: number; p: number; ici: boolean; n: number; axe: number | undefined }
      | { type: "joker"; g: number; p: number; ici: boolean; def: number }
      | { type: "retraitJoker"; g: number; p: number; ici: boolean; i: number }
      | { type: "afficher"; g: number; p: number; ici: boolean };
    const pas: fc.Arbitrary<Pas> = fc.oneof(
      { arbitrary: fc.record({ type: fc.constant("case" as const), g, p, ici, d: fc.nat(), x: unite, vider: fc.boolean(), distante: fc.boolean() }), weight: 6 },
      { arbitrary: fc.record({ type: fc.constant("nonEval" as const), g, p, ici, n: fc.nat(), axe: fc.option(fc.nat(), { nil: undefined }) }), weight: 3 },
      { arbitrary: fc.record({ type: fc.constant("joker" as const), g, p, ici, def: fc.nat() }), weight: 3 },
      { arbitrary: fc.record({ type: fc.constant("retraitJoker" as const), g, p, ici, i: fc.nat() }), weight: 2 },
      { arbitrary: fc.record({ type: fc.constant("afficher" as const), g, p, ici: fc.constant(false) }), weight: 2 },
    );

    await fc.assert(
      fc.asyncProperty(fc.array(pas, { minLength: 1, maxLength: 12 }), fc.integer({ min: 1, max: 6 }), commutateurs, async (sequence, lru, c) => {
        const { session, store } = monter(config, lru, GENERATION_PAR_DEFAUT, c);
        const { sources, plans } = session;
        // Participants « affichés » : toutes leurs cellules souscrites (au plus 3).
        let affiches: { gp: [number, number]; fin: () => void }[] = [];
        const afficher = (gg: number, pp: number) => {
          if (affiches.some((a) => a.gp[0] === gg && a.gp[1] === pp)) return;
          const fin = souscrire(store, plans[gg].ids.map((_, n) => [gg, pp, n]));
          affiches.push({ gp: [gg, pp], fin });
          if (affiches.length > 3) affiches.shift()!.fin();
        };
        afficher(G3_V2, 0);
        await store.stable();
        try {
          for (const brut of sequence) {
            const dernier = affiches[affiches.length - 1].gp;
            const s = brut.ici ? { ...brut, g: dernier[0], p: dernier[1] } : brut;
            switch (s.type) {
              case "case": {
                const plan = plans[s.g];
                const d = s.d % plan.D;
                const v = s.vider ? NaN : valeurValide(plan, d, s.x);
                (s.distante ? ecrireCaseDistante : ecrireCase)(sources, s.g, s.p, d, v);
                break;
              }
              case "nonEval": {
                const axes = plans[s.g].grille.axes.length;
                basculerNonEvaluation(sources, s.g, s.p, s.n % plans[s.g].N, s.axe === undefined || axes === 0 ? undefined : s.axe % axes);
                break;
              }
              case "joker": {
                const plan = plans[s.g];
                if (plan.jokerDefs.length === 0) break;
                const def = s.def % plan.jokerDefs.length;
                const r = evaluate(plan, lireSourcesGrille(session, s.g).get(s.p)!);
                poserJoker(sources, plan, s.g, s.p, def, "propriété", r.valeurs[plan.jokerDefs[def].n]);
                break;
              }
              case "retraitJoker": {
                const ids = sources.jokers.toArray.filter((l) => l.g === s.g && l.p === s.p).map((l) => l.id);
                if (ids.length > 0) retirerJoker(sources, ids[s.i % ids.length]);
                break;
              }
              case "afficher":
                afficher(s.g, s.p);
                break;
            }
            await store.stable();
            comparerAOracle(
              session,
              store,
              affiches.map((a) => a.gp),
            );
          }
          await comparerInstantane(session, store);
        } finally {
          for (const a of affiches) a.fin();
          affiches = [];
          store.dispose();
        }
      }),
      { numRuns: 40 },
    );
  }, 120_000);
});

describe("cohorte « précalcul »", () => {
  test("une colonne entière se sert du précalcul sans remplir le LRU ; le précalcul en arrière-plan couvre tous les participants", async () => {
    const variantes = { calcul: "signaux", cohorte: "precalcul", distante: "perimee" } as const;
    const canal = canalLocal();
    const session = creerSession({}, GENERATION_PAR_DEFAUT, fabriqueBase(2, () => canal, variantes));
    const store = session.store as StoreVerifiable;
    const p = (nom: string) => session.sources.participants.toArray.find((l) => l.nom === nom)!.p;
    const n = session.plans[G3_V2].index.get("reussite")!;
    const fin = store.subscribeCohort(G3_V2, n, () => {});
    await store.stable();
    for (const pt of g3.etats["V2-final"].participants) {
      const v = store.getCohort(G3_V2, n)[p(pt.nom)].valeur;
      expect(Number.isNaN(v) ? null : v, pt.nom).toBe(pt.attendus.reussite);
    }
    expect(canal.moteur.lru()).toHaveLength(0);
    // Arrière-plan : tous les (g, p) finissent précalculés.
    const total = session.plans.length * session.sources.participants.size;
    for (let i = 0; i < 200 && canal.moteur.precalcules() < total; i++) await new Promise((r) => setTimeout(r, 5));
    expect(canal.moteur.precalcules()).toBe(total);
    // Une saisie : le participant saisi entre au LRU, son précalcul est périmé puis refait.
    const bruno = p("Bruno");
    const plan = session.plans[G3_V2];
    ecrireCase(session.sources, G3_V2, bruno, plan.indexDonnee[plan.index.get("sr1")!], 0);
    await store.stable();
    expect(canal.moteur.lru()).toHaveLength(1);
    const oracle = evaluate(plan, lireSourcesGrille(session, G3_V2).get(bruno)!);
    expect(store.getCohort(G3_V2, n)[bruno].valeur).toBe(oracle.valeurs[n]);
    await comparerInstantane(session, store);
    fin();
    store.dispose();
  });

  test("la cohorte paresseuse de la base, elle, instancie les participants dans le LRU", async () => {
    const canal = canalLocal();
    const session = creerSession({}, GENERATION_PAR_DEFAUT, fabriqueBase(2, () => canal));
    const store = session.store as StoreVerifiable;
    const fin = store.subscribeCohort(G3_V2, session.plans[G3_V2].index.get("reussite")!, () => {});
    await store.stable();
    expect(canal.moteur.lru()).toHaveLength(2);
    expect(canal.moteur.precalcules()).toBe(0);
    fin();
    store.dispose();
  });
});

describe("choix de la configuration", () => {
  test.each(CONFIGURATIONS)("$nom : le moteur applique les axes demandés", async ({ store: config }) => {
    const { store } = monter(config);
    const statut = () => ("etatWorker" in store ? (store as unknown as { etatWorker(): { statut: string } }).etatWorker().statut : "");
    for (let i = 0; i < 100 && statut() === "demarrage"; i++) await new Promise((r) => setTimeout(r, 5));
    if (config.lieu === "principal") {
      expect("etatWorker" in store).toBe(false);
    } else {
      const etat = (store as unknown as { etatWorker(): { statut: string; variantes: unknown } }).etatWorker();
      expect(etat.statut).toBe("pret");
      expect(etat.variantes).toEqual({ calcul: config.calcul, cohorte: config.cohorte, distante: config.distante });
    }
    store.dispose();
  });
});
