// Fabriques de store pour la session, selon les réglages de la classe Store.

import type { FabriqueStore } from "../session";
import { storeProvisoire } from "../session";
import type { ReglagesStore } from "../reglages";
import { canalLocal, canalWorker, type OptionsCanalLocal } from "./canal";
import type { Canal } from "./protocole";
import { creerStoreBase } from "./storeBase";

/** Configuration de base : signaux dans le worker (ou le moteur en mémoire, derrière le même canal). */
export function fabriqueBase(lru: number, canal: () => Canal): FabriqueStore {
  return (ctx) => creerStoreBase({ ...ctx, lru, canal: canal() });
}

/** Base avec le moteur en mémoire (tests, Node). */
export function fabriqueBaseLocale(lru = 50, options: OptionsCanalLocal = {}): FabriqueStore {
  return fabriqueBase(lru, () => canalLocal(options));
}

/**
 * Store choisi par les réglages. Seule la configuration de base existe pour
 * l'instant (#24) ; les autres axes (#25) retombent sur le store provisoire.
 * Sans `Worker` (Node), la base passe par le canal en mémoire.
 */
export function fabriquePourReglages(r: ReglagesStore): FabriqueStore {
  const base = r.calcul === "signaux" && r.lieu === "worker" && r.cohorte === "paresseux" && r.distante === "perimee";
  if (!base) return storeProvisoire;
  return fabriqueBase(r.lru, typeof Worker === "function" ? canalWorker : () => canalLocal());
}
