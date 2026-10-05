// Exigences de remplissage et avertissement « données provisoires » (18 §6,
// spec 20). Décompte sur les cases et les non-évaluations seulement, sans
// calcul des résultats. La couverture est celle de 1a-A quel que soit 1a.

import type { Plan } from "./compile";
import { analyse1aB, couverture, type NonEvaluation, raisonSansEffet } from "./dispense";

export type EtatCase = "vide" | "note" | "nonEvalue";

export type ErreurRemplissage =
  /** Obligatoire sans note active : vide, ou non évalué (« non évalué » ne le satisfait pas). */
  | { type: "obligatoire"; n: number; etat: "vide" | "nonEvalue" }
  /** Minimum de notes actives non atteint (1c) ; n = -1 pour la grille entière. */
  | { type: "minimum"; n: number; actives: number; minActives: number }
  /** Non-évaluation sans effet dans le réglage courant. */
  | { type: "dispenseSansEffet"; n: number; raison: string }
  /** Minimum sur un nœud sans feuilles dans le réglage courant (ex. regroupement en 1b-B) : inapplicable. */
  | { type: "minimumSansFeuilles"; n: number };

export interface Signalement {
  /** 1a-B : nœud du cône d'une dispense consommé hors du cône, calculé normalement. */
  type: "cheminDispense";
  n: number;
}

export interface EtatRemplissage {
  erreurs: ErreurRemplissage[];
  signalements: Signalement[];
  /** Avertissement « données provisoires » : une exigence (obligatoire, minimum) est insatisfaite. */
  provisoire: boolean;
}

export interface SourcesRemplissage {
  /** Valeur stockée de chaque case, index d ; NaN = vide. */
  cases: Float64Array;
  nonEvaluations: readonly NonEvaluation[];
}

/** État dérivé d'une case : non évalué si couverte, note si elle a une valeur, vide sinon. */
export function etatCase(cases: Float64Array, couvert: Uint8Array, d: number): EtatCase {
  if (couvert[d]) return "nonEvalue";
  return Number.isNaN(cases[d]) ? "vide" : "note";
}

export function remplissage(plan: Plan, sources: SourcesRemplissage): EtatRemplissage {
  const couvert = couverture(plan, sources.nonEvaluations);
  const erreurs: ErreurRemplissage[] = [];
  for (const d of plan.obligatoires) {
    const etat = etatCase(sources.cases, couvert, d);
    if (etat !== "note") erreurs.push({ type: "obligatoire", n: plan.donnees[d], etat });
  }
  const inapplicables: ErreurRemplissage[] = [];
  for (const m of plan.minimums) {
    // Choix provisoire (#18) : signalé comme une dispense sans effet, sans maintenir l'avertissement.
    if (m.feuilles.length === 0) {
      inapplicables.push({ type: "minimumSansFeuilles", n: m.n });
      continue;
    }
    let actives = 0;
    for (const d of m.feuilles) if (etatCase(sources.cases, couvert, d) === "note") actives++;
    if (actives < m.minActives) erreurs.push({ type: "minimum", n: m.n, actives, minActives: m.minActives });
  }
  const provisoire = erreurs.length > 0;
  erreurs.push(...inapplicables);
  for (const ne of sources.nonEvaluations) {
    const raison = raisonSansEffet(plan, ne);
    if (raison !== null) erreurs.push({ type: "dispenseSansEffet", n: ne.n, raison });
  }
  const signalements: Signalement[] = [];
  if (plan.commutateurs.dispense1a === "B") {
    const { signales } = analyse1aB(plan, sources.nonEvaluations);
    signales.forEach((s, n) => {
      if (s) signalements.push({ type: "cheminDispense", n });
    });
  }
  return { erreurs, signalements, provisoire };
}

/** Ids des nœuds en erreur d'exigence (obligatoire ou minimum), comme `erreursRemplissage` des fixtures. */
export function idsExigences(plan: Plan, etat: EtatRemplissage): string[] {
  return etat.erreurs.flatMap((e) => {
    if (e.type === "dispenseSansEffet" || e.type === "minimumSansFeuilles") return [];
    return [e.n < 0 ? plan.grille.axes[plan.axePrincipal].id : plan.ids[e.n]];
  });
}
