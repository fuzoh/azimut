// Validation des jokers (spec 20, « Joker ») : quota par participant pour toute
// la grille, H5a et H5b. H5 ne gouverne que la pose ; le calcul (evaluate)
// applique les jokers posés quels qu'ils soient. Un joker devenu invalide après
// une bascule reste en place et produit une erreur « quota dépassé ».

import type { Plan } from "./compile";

export interface JokerPose {
  id: number;
  /** Index de la définition dans `plan.jokerDefs`. */
  jokerDef: number;
}

/**
 * Raison d'un refus à la pose, ou de l'invalidité d'un joker posé :
 * - `quota` : le quota de la grille est atteint ;
 * - `plusieursSurLeNoeud` : H5b « un seul », un joker est déjà posé sur le nœud ;
 * - `sansResultat` : H5a « refusé », le nœud autorisé n'a pas de résultat ;
 * - `inconnu` : définition absente de la grille.
 */
export type RaisonJoker = "quota" | "plusieursSurLeNoeud" | "sansResultat" | "inconnu";

export const TEXTE_RAISON: Record<RaisonJoker, string> = {
  quota: "quota de jokers atteint",
  plusieursSurLeNoeud: "un seul joker par nœud (H5b)",
  sansResultat: "nœud sans résultat (H5a)",
  inconnu: "joker non prévu par la grille",
};

/**
 * Refus de la pose d'un joker `jokerDef` à côté des jokers déjà posés ; null si
 * la pose est acceptée. `valeurNoeud` : résultat courant du nœud autorisé (NaN
 * = sans résultat), qui ne sert qu'à H5a.
 */
export function refusPose(plan: Plan, poses: readonly JokerPose[], jokerDef: number, valeurNoeud: number): RaisonJoker | null {
  const def = plan.jokerDefs[jokerDef];
  if (!def) return "inconnu";
  if (poses.length >= plan.quotaJokers) return "quota";
  const { h5a, h5b } = plan.commutateurs;
  if (h5b === "unSeul" && poses.some((j) => plan.jokerDefs[j.jokerDef]?.n === def.n)) return "plusieursSurLeNoeud";
  if (h5a === "refuse" && Number.isNaN(valeurNoeud)) return "sansResultat";
  return null;
}

export interface JokerInvalide {
  id: number;
  /** Nœud autorisé (-1 si la définition est inconnue). */
  n: number;
  raison: RaisonJoker;
}

/**
 * Jokers posés qui ne passeraient plus la pose dans le réglage courant, en les
 * rejouant par id croissant : au-delà du quota, second joker d'un nœud en H5b
 * « un seul », nœud sans résultat en H5a « refusé » (`valeurs` : résultats du
 * participant ; sans elles, H5a n'est pas vérifié).
 */
export function jokersInvalides(plan: Plan, poses: readonly JokerPose[], valeurs?: Float64Array): JokerInvalide[] {
  const res: JokerInvalide[] = [];
  const { h5a, h5b } = plan.commutateurs;
  const vus = new Set<number>();
  [...poses]
    .sort((a, b) => a.id - b.id)
    .forEach((j, rang) => {
      const def = plan.jokerDefs[j.jokerDef];
      if (!def) {
        res.push({ id: j.id, n: -1, raison: "inconnu" });
        return;
      }
      let raison: RaisonJoker | null = null;
      if (rang >= plan.quotaJokers) raison = "quota";
      else if (h5b === "unSeul" && vus.has(def.n)) raison = "plusieursSurLeNoeud";
      else if (h5a === "refuse" && valeurs && Number.isNaN(valeurs[def.n])) raison = "sansResultat";
      vus.add(def.n);
      if (raison) res.push({ id: j.id, n: def.n, raison });
    });
  return res;
}
