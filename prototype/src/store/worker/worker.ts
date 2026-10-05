// Point d'entrée du worker : le moteur branché sur postMessage.
//
// Bridage logiciel (mesures, #26) : Chrome ne bride pas le worker dédié avec
// `Emulation.setCPUThrottlingRate` et refuse ce bridage sur la cible worker.
// Avec `{type: "bridage", taux}`, chaque message traité et chaque minuterie
// du moteur sont suivis d'une attente active de (taux − 1) × leur durée, et
// les messages produits ne partent qu'après : le worker paraît `taux` fois
// plus lent. Le GC et la sérialisation des messages ne sont pas ralentis.
// La marque `chaine:worker:envoi` est posée à l'envoi effectif, après l'attente.

/// <reference lib="webworker" />
import type { DepuisWorker, VersWorker } from "../protocole";
import { creerMoteur } from "./moteur";
import "../../mesure/stats";

const portee = self as unknown as DedicatedWorkerGlobalScope & { __calibrer?: (iterations: number) => number };

let taux = 1;
let enTraitement = false;
const file: [DepuisWorker, Transferable[]][] = [];

/** Envoi effectif ; marque relue par le harnais (horloge du worker, ramenée par timeOrigin). */
const envoyer = (m: DepuisWorker, t: Transferable[]) => {
  if (m.type === "resultats") performance.mark("chaine:worker:envoi", { detail: { version: m.version } });
  portee.postMessage(m, t);
};

const attendre = (ms: number) => {
  const fin = performance.now() + ms;
  while (performance.now() < fin) {
    // attente active : le thread reste occupé, comme sous bridage
  }
};

function brider<T>(f: () => T): T {
  if (taux <= 1 || enTraitement) return f();
  enTraitement = true;
  const t0 = performance.now();
  try {
    return f();
  } finally {
    attendre((taux - 1) * (performance.now() - t0));
    enTraitement = false;
    for (const [m, t] of file.splice(0)) envoyer(m, t);
  }
}

const moteur = creerMoteur((message, transfert) => {
  if (enTraitement && taux > 1) file.push([message, transfert ?? []]);
  else envoyer(message, transfert ?? []);
});

// Minuteries du moteur (précalcul en arrière-plan) : bridées aussi.
const setTimeoutNatif = portee.setTimeout.bind(portee);
portee.setTimeout = ((f: (...a: unknown[]) => void, ms?: number, ...args: unknown[]) =>
  setTimeoutNatif(() => brider(() => f(...args)), ms)) as typeof setTimeout;

portee.onmessage = (e: MessageEvent<VersWorker>) => {
  if (e.data.type === "bridage") {
    taux = Math.max(1, e.data.taux);
    return;
  }
  brider(() => moteur.recevoir(e.data));
};

/** Calibration (harnais) : un calcul fixe, bridé comme un message ; rend sa durée en ms. */
portee.__calibrer = (iterations: number) => {
  const t0 = performance.now();
  brider(() => {
    let x = 0;
    for (let i = 0; i < iterations; i++) x += Math.sqrt(i);
    return x;
  });
  return performance.now() - t0;
};
