// Fabriques de store pour la session, selon les réglages de la classe Store.

import type { FabriqueStore } from "../session";
import type { ReglagesStore } from "../reglages";
import { canalLocal, canalWorker, type OptionsCanalLocal } from "./canal";
import type { Canal, VariantesMoteur } from "./protocole";
import { creerStoreBase } from "./storeBase";
import { creerStorePrincipal } from "./storePrincipal";

/** Moteur dans le worker (ou en mémoire, derrière le même canal) ; défaut : la configuration de base. */
export function fabriqueBase(lru: number, canal: () => Canal, variantes?: VariantesMoteur): FabriqueStore {
  return (ctx) => creerStoreBase({ ...ctx, lru, canal: canal(), variantes });
}

/** Base avec le moteur en mémoire (tests, Node). */
export function fabriqueBaseLocale(lru = 50, options: OptionsCanalLocal = {}, variantes?: VariantesMoteur): FabriqueStore {
  return fabriqueBase(lru, () => canalLocal(options), variantes);
}

/**
 * Store choisi par les réglages, un axe à la fois par rapport à la base
 * (spec 20, « Variantes à comparer »). Lieu « principal » : le moteur sur le
 * thread principal, sans worker ; la cohorte y reste paresseuse (le précalcul
 * en arrière-plan n'est construit que dans le worker). Sans `Worker` (Node),
 * le moteur passe par le canal en mémoire.
 */
export function fabriquePourReglages(r: ReglagesStore): FabriqueStore {
  if (r.lieu === "principal")
    return ({ sources, plans }) => creerStorePrincipal({ sources, plans, lru: r.lru, calcul: r.calcul, distante: r.distante });
  const variantes: VariantesMoteur = { calcul: r.calcul, cohorte: r.cohorte, distante: r.distante };
  return fabriqueBase(r.lru, typeof Worker === "function" ? canalWorker : () => canalLocal(), variantes);
}

/** Les 5 configurations comparées : la base, puis un axe à la fois. */
export const CONFIGURATIONS: { nom: string; store: Omit<ReglagesStore, "lru"> }[] = [
  { nom: "base", store: { calcul: "signaux", lieu: "worker", cohorte: "paresseux", distante: "perimee" } },
  { nom: "dag", store: { calcul: "dag", lieu: "worker", cohorte: "paresseux", distante: "perimee" } },
  { nom: "principal", store: { calcul: "signaux", lieu: "principal", cohorte: "paresseux", distante: "perimee" } },
  { nom: "precalcul", store: { calcul: "signaux", lieu: "worker", cohorte: "precalcul", distante: "perimee" } },
  { nom: "immediat", store: { calcul: "signaux", lieu: "worker", cohorte: "paresseux", distante: "immediat" } },
];
