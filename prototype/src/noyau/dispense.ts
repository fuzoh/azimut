// Non-évaluations et dispense héritée (spec 20, « Non-évaluations, dispense et
// exigences »). Rien n'est déplié en cases : la couverture se dérive à chaque
// lecture des non-évaluations et des feuilles du plan, pour que 1a et 1b
// restent commutables.

import { elementsCsr, type Plan, TYPE_CALCUL, TYPE_COMMENTAIRE, TYPE_DONNEES, TYPE_REGROUPEMENT } from "./compile";

export interface NonEvaluation {
  n: number;
  /** Index de l'axe où la dispense est posée (1b-C) ; absent = axe principal. */
  axe?: number;
}

/** Feuilles (index d) couvertes par une non-évaluation sur n, selon 1b. */
export function feuillesDispense(plan: Plan, n: number, axe?: number): Int32Array {
  if (plan.commutateurs.feuilles1b === "C") {
    const a = axe === undefined || axe < 0 || axe >= plan.feuillesParAxe.length ? plan.axePrincipal : axe;
    return elementsCsr(plan.feuillesParAxe[a], n);
  }
  return elementsCsr(plan.feuillesDispense, n);
}

/**
 * Couverture des cases selon 1a-A : 1 si la case d est couverte par une
 * non-évaluation, directe ou héritée par les feuilles de 1b. C'est aussi la
 * couverture des exigences de remplissage, quel que soit 1a.
 */
export function couverture(plan: Plan, nonEvaluations: readonly NonEvaluation[]): Uint8Array {
  const c = new Uint8Array(plan.D);
  for (const ne of nonEvaluations) for (const d of feuillesDispense(plan, ne.n, ne.axe)) c[d] = 1;
  return c;
}

/** Pourquoi une non-évaluation sur n est sans effet dans le réglage courant ; null si elle agit. */
export function raisonSansEffet(plan: Plan, ne: NonEvaluation): string | null {
  const t = plan.type[ne.n];
  const sansCalcul = t === TYPE_REGROUPEMENT || t === TYPE_COMMENTAIRE;
  if (plan.commutateurs.dispense1a === "B")
    return sansCalcul ? "1a-B : un regroupement n'a pas de calcul, la dispense ne retire aucune contribution" : null;
  if (feuillesDispense(plan, ne.n, ne.axe).length > 0) return null;
  const b = plan.commutateurs.feuilles1b;
  if (b === "B") return sansCalcul ? "1b-B : un regroupement n'a pas de dépendances de calcul" : "1b-B : aucune donnée en amont";
  if (b === "C") return "1b-C : aucune feuille placée sous ce nœud dans l'axe de la dispense";
  return "1b-A : aucune feuille placée sous ce nœud";
}

/**
 * 1a-B, dispense sur la contribution. Le nœud dispensé est sans résultat. Un
 * nœud de calcul M de son cône de calcul (l'amont) est calculé sans les
 * feuilles couvertes seulement si tous ses consommateurs sont le nœud dispensé
 * ou des nœuds eux-mêmes calculés ainsi : sa valeur ne sort jamais du cône.
 * Sinon M est calculé normalement et signalé (chemin multiple). Aucun nœud n'a
 * deux valeurs.
 */
export interface Analyse1aB {
  /** Nœuds directement non évalués (données ou calcul), sans résultat. */
  dispense: Uint8Array;
  /** Nœuds de calcul calculés sans leurs entrées de données (toutes couvertes). */
  sansFeuilles: Uint8Array;
  /** Nœuds de calcul du cône consommés hors du cône : calcul normal, signalés. */
  signales: Uint8Array;
}

export function analyse1aB(plan: Plan, nonEvaluations: readonly NonEvaluation[]): Analyse1aB {
  const { N } = plan;
  const dispense = new Uint8Array(N);
  const sansFeuilles = new Uint8Array(N);
  const signales = new Uint8Array(N);
  for (const ne of nonEvaluations) {
    const t = plan.type[ne.n];
    if (t === TYPE_DONNEES || t === TYPE_CALCUL) dispense[ne.n] = 1;
  }
  // Ordre topologique inverse : un nœud est traité après tous ses consommateurs.
  const position = new Int32Array(N);
  plan.topo.forEach((n, i) => (position[n] = i));
  for (let D = 0; D < N; D++) {
    if (!dispense[D] || plan.type[D] !== TYPE_CALCUL) continue;
    const cone = new Uint8Array(N);
    const pile = [D];
    while (pile.length > 0) {
      const n = pile.pop()!;
      if (cone[n]) continue;
      cone[n] = 1;
      for (let i = plan.inOffsets[n]; i < plan.inOffsets[n + 1]; i++) pile.push(plan.inSources[i]);
    }
    const interieur = new Uint8Array(N);
    interieur[D] = 1;
    const ordre = [...Array(N).keys()].filter((n) => cone[n] && n !== D && plan.type[n] === TYPE_CALCUL);
    ordre.sort((a, b) => position[b] - position[a]);
    for (const M of ordre) {
      if (plan.consommateurs[M].every((c) => interieur[c])) {
        interieur[M] = 1;
        sansFeuilles[M] = 1;
      } else {
        signales[M] = 1;
      }
    }
  }
  // Exclu pour un cône, il n'est signalé pour aucun : sa valeur ne sort pas.
  for (let n = 0; n < N; n++) if (sansFeuilles[n] || dispense[n]) signales[n] = 0;
  return { dispense, sansFeuilles, signales };
}
