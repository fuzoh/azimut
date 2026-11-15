// Micro-benchmarks du noyau sous Node (spec 20, « Micro-benchmarks du noyau ») :
// compile, evaluate (un participant, une qualification entière), instanciation,
// copier, etendre, génération, signaux contre DAG maison hors rendu. Non bridés,
// ils ne jugent aucun critère. `bun run bench` écrit les résultats en JSON dans
// `mesures/micro-benchmarks/`.

import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import g3v1Brut from "@corpus/g3-v1-structure.json";
import g3v2Brut from "@corpus/g3-v2-structure.json";
import { afterAll, describe, test } from "vitest";
import type { BenchResult } from "vitest";
import { etendre } from "../generateur/etendre";
import { FACTEUR_CHARGE, g3Etendue, grillesDuJeu } from "../generateur/jeux";
import { generer } from "../generateur/generer";
import { compile, type Plan } from "../noyau/compile";
import { copier, structureIdentique } from "../noyau/copier";
import { evaluate, type SourcesParticipant } from "../noyau/evaluate";
import type { Grille } from "../noyau/format";
import type { Calculateur } from "../store/calcul";
import { ParticipantDag } from "../store/dag/participant";
import { ParticipantSignaux } from "../store/signaux/participant";

const g3v1 = g3v1Brut as unknown as Grille;
const g3v2 = g3v2Brut as unknown as Grille;
const PARTICIPANTS = 200;

// --- Données : G3 étendue (jeu « charge »), 200 participants au profil « fin » ----------

const etendue = g3Etendue();
const planEtendu = compile(etendue);

/** Sources par participant de la grille 0 d'un jeu généré. */
function sourcesParParticipant(plan: Plan): Map<number, SourcesParticipant> {
  const lignes = generer([plan], 1, { remplissage: "fin", participants: PARTICIPANTS });
  const res = new Map<number, SourcesParticipant>();
  for (let p = 0; p < PARTICIPANTS; p++) res.set(p, { cases: new Float64Array(plan.D).fill(NaN), nonEvaluations: [], jokers: [] });
  for (const l of lignes.cases) res.get(l.p)!.cases[l.d] = l.valeur;
  for (const l of lignes.nonEvaluations) res.get(l.p)!.nonEvaluations.push(l.axe === undefined ? { n: l.n } : { n: l.n, axe: l.axe });
  for (const l of lignes.jokers) res.get(l.p)!.jokers.push({ id: l.id, jokerDef: l.jokerDef });
  return res;
}

const sourcesEtendue = sourcesParParticipant(planEtendu);
const planV1 = compile(g3v1);
const sourcesV1 = sourcesParParticipant(planV1);
const un = sourcesEtendue.get(7)!;

const lireTout = (c: Calculateur) => {
  for (let n = 0; n < c.plan.N; n++) c.lire(n);
};
const signaux = () => new ParticipantSignaux(planEtendu, un.cases.slice(), un.nonEvaluations, un.jokers);
const dag = () => new ParticipantDag(planEtendu, un.cases.slice(), un.nonEvaluations, un.jokers);

// --- Résultats ---------------------------------------------------------------------------

const resultats: { groupe: string; nom: string; latence: Record<string, number>; debitParSeconde: number; echantillons: number }[] = [];

function garder(groupe: string, r: BenchResult) {
  const l = r.latency;
  resultats.push({
    groupe,
    nom: r.name,
    latence: { moyenneMs: l.mean, medianeMs: l.p50, p99Ms: l.p99, minMs: l.min, maxMs: l.max, rme: l.rme },
    debitParSeconde: r.throughput.mean,
    echantillons: l.samplesCount,
  });
}

afterAll(() => {
  const dossier = path.resolve(import.meta.dirname, "../../mesures/micro-benchmarks");
  mkdirSync(dossier, { recursive: true });
  const date = new Date().toISOString();
  const fichier = path.join(dossier, `${date.slice(0, 19).replaceAll(":", "-")}.json`);
  writeFileSync(
    fichier,
    JSON.stringify(
      {
        date,
        environnement: { node: process.version, cpu: os.cpus()[0]?.model, coeurs: os.cpus().length, ramGo: Math.round(os.totalmem() / 1024 ** 3), os: `${os.type()} ${os.release()}` },
        donnees: { grille: etendue.grille, N: planEtendu.N, D: planEtendu.D, participants: PARTICIPANTS, remplissage: "fin", graine: 1 },
        resultats,
      },
      null,
      1,
    ),
  );
  console.log(`micro-benchmarks : ${path.relative(process.cwd(), fichier)}`);
});

// Budgets courts : ce sont des ordres de grandeur, pas une campagne.
const COURT = { time: 500, warmupTime: 100 };
const LOURD = { time: 1000, iterations: 5, warmupIterations: 1, warmupTime: 0 };

describe("noyau", () => {
  test("compile", async ({ bench }) => {
    const r = await bench.compare(
      bench("compile G3 V2", () => compile(g3v2)),
      bench(`compile G3 étendue (N=${planEtendu.N})`, () => compile(etendue)),
      COURT,
    );
    garder("compile", r.get("compile G3 V2"));
    garder("compile", r.get(`compile G3 étendue (N=${planEtendu.N})`));
  });

  test("evaluate : un participant, une qualification entière", async ({ bench }) => {
    garder("evaluate", await bench("evaluate G3 étendue, un participant", () => evaluate(planEtendu, un)).run(COURT));
    const tous = [...sourcesEtendue.values()];
    garder(
      "evaluate",
      await bench(`evaluate G3 étendue, qualification entière (${PARTICIPANTS} participants)`, () => {
        for (const s of tous) evaluate(planEtendu, s);
      }).run(LOURD),
    );
  });

  test("instanciation", async ({ bench }) => {
    const r = await bench.compare(
      bench("instanciation signaux", () => signaux()),
      bench("instanciation DAG", () => dag()),
      bench("instanciation + première lecture complète, signaux", () => lireTout(signaux())),
      bench("instanciation + première lecture complète, DAG", () => lireTout(dag())),
      COURT,
    );
    for (const nom of ["instanciation signaux", "instanciation DAG", "instanciation + première lecture complète, signaux", "instanciation + première lecture complète, DAG"] as const)
      garder("instanciation", r.get(nom));
  });

  test("copier", async ({ bench }) => {
    const identique = structureIdentique(etendue);
    const r = await bench.compare(
      bench(`copier G3 V1 → V2, ${PARTICIPANTS} participants`, () => copier(g3v1, g3v2, sourcesV1)),
      bench(`copier G3 étendue à l'identique, ${PARTICIPANTS} participants`, () => copier(etendue, identique, sourcesEtendue)),
      LOURD,
    );
    garder("copier", r.get(`copier G3 V1 → V2, ${PARTICIPANTS} participants`));
    garder("copier", r.get(`copier G3 étendue à l'identique, ${PARTICIPANTS} participants`));
  });

  test("etendre", async ({ bench }) => {
    garder("etendre", await bench(`etendre G3 V2 × ${FACTEUR_CHARGE}`, () => etendre(g3v2, FACTEUR_CHARGE)).run(COURT));
  });

  test("génération", async ({ bench }) => {
    const plans = grillesDuJeu("charge").map(({ structure }) => compile(structure));
    garder(
      "generation",
      await bench(`générer le jeu « charge » (3 × G3 étendue, ${PARTICIPANTS} participants, fin)`, () =>
        generer(plans, 1, { remplissage: "fin", participants: PARTICIPANTS }),
      ).run(LOURD),
    );
  });

  test("signaux contre DAG maison : une case modifiée, tout relu", async ({ bench }) => {
    const s = signaux();
    const d = dag();
    lireTout(s);
    lireTout(d);
    // Une case remplie, alternativement vidée et remise.
    const k = un.cases.findIndex((v) => !Number.isNaN(v));
    const v = un.cases[k];
    let i = 0;
    const r = await bench.compare(
      bench("signaux : écrire une case + relire les N nœuds", () => {
        s.ecrireCase(k, i++ % 2 === 0 ? NaN : v);
        lireTout(s);
      }),
      bench("DAG : écrire une case + relire les N nœuds", () => {
        d.ecrireCase(k, i++ % 2 === 0 ? NaN : v);
        lireTout(d);
      }),
      COURT,
    );
    garder("signaux-dag", r.get("signaux : écrire une case + relire les N nœuds"));
    garder("signaux-dag", r.get("DAG : écrire une case + relire les N nœuds"));
  });
});
