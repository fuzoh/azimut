// Canaux vers le moteur du worker : un vrai `Worker` dans le navigateur, ou le
// moteur en mémoire pour les tests (messages clonés, livrés à la tâche
// suivante, dans l'ordre, comme `postMessage`).

import type { Canal, DepuisWorker, VersWorker } from "./protocole";
import { creerMoteur, type Moteur } from "./worker/moteur";

export function canalWorker(): Canal {
  const worker = new Worker(new URL("./worker/worker.ts", import.meta.url), { type: "module" });
  return {
    envoyer: (m) => worker.postMessage(m),
    ecouter(rappel) {
      worker.onmessage = (e: MessageEvent<DepuisWorker>) => rappel(e.data);
      worker.onerror = (e) => rappel({ type: "erreur", message: e.message });
    },
    fermer: () => worker.terminate(),
  };
}

export interface OptionsCanalLocal {
  /** Modifie un message avant le moteur (tests : graine différente côté worker). */
  alterer?: (m: VersWorker) => VersWorker;
}

/** Le moteur dans le même thread, derrière une frontière de messages clonés et asynchrones. */
export function canalLocal(options: OptionsCanalLocal = {}): Canal & { moteur: Moteur } {
  let ecouteur: ((m: DepuisWorker) => void) | null = null;
  let ferme = false;
  const moteur = creerMoteur((m) => {
    const copie = structuredClone(m);
    setTimeout(() => !ferme && ecouteur?.(copie), 0);
  });
  return {
    moteur,
    envoyer(m) {
      const copie = structuredClone(options.alterer ? options.alterer(m) : m);
      setTimeout(() => !ferme && moteur.recevoir(copie), 0);
    },
    ecouter(rappel) {
      ecouteur = rappel;
    },
    fermer() {
      ferme = true;
    },
  };
}
