// `evaluate(plan, sources du participant) → résultats` : l'oracle
// (spec 20, « Modèle de valeur »). Évaluation récursive naïve mémoïsée ;
// aucune variante du store ne doit partager ce code.

import {
  type BaremeCompile,
  type Plan,
  TYPE_CALCUL,
  TYPE_DONNEES,
} from "./compile";

/** Cause d'un « sans résultat », pour l'explication seulement. */
export const CAUSE = {
  aucune: 0,
  vide: 1,
  nonEvalue: 2,
  aucuneContribution: 3,
  denominateurNul: 4,
  /** Regroupement ou commentaire : pas de résultat par nature. */
  sansCalcul: 5,
} as const;

export interface SourcesParticipant {
  /** Valeur de chaque case, index d ; NaN = vide. Ordinal : rang du palier. */
  cases: Float64Array;
  /** Non-évaluations sur n'importe quel nœud (ticket des non-évaluations). */
  nonEvaluations: { n: number; axe?: number }[];
  /** Jokers posés : index de la définition dans `plan.jokerDefs`, et id de pose. */
  jokers: { id: number; jokerDef: number }[];
}

export interface Resultats {
  /** Valeur sur le barème de sortie ; NaN = sans résultat. */
  valeurs: Float64Array;
  causes: Uint8Array;
}

export function sourcesVides(plan: Plan): SourcesParticipant {
  return { cases: new Float64Array(plan.D).fill(NaN), nonEvaluations: [], jokers: [] };
}

/** Valeur associée d'une case : la note, ou la valeur du palier de rang donné. */
export function valeurCase(b: BaremeCompile, stockee: number): number {
  if (Number.isNaN(stockee) || b.type === "numerique") return stockee;
  const v = b.valeurs[stockee];
  return v === undefined ? NaN : v;
}

/** Distance entre extrêmes (v − min) / (max − min). */
function normaliser(b: BaremeCompile, v: number): number {
  return b.max === b.min ? 0 : (v - b.min) / (b.max - b.min);
}

/** Table affine par morceaux [x0, y0, x1, y1, …], bornée aux extrémités. */
function convertir(table: Float64Array, v: number): number {
  if (v <= table[0]) return table[1];
  for (let i = 2; i < table.length; i += 2) {
    const x0 = table[i - 2];
    const y0 = table[i - 1];
    const x1 = table[i];
    const y1 = table[i + 1];
    if (v <= x1) return y0 + ((v - x0) * (y1 - y0)) / (x1 - x0);
  }
  return table[table.length - 1];
}

/**
 * Arrondi au pas, demi vers le haut. Le bruit des flottants est d'abord
 * effacé (1e-9 du pas), pour que 79,75 passe bien à 80.
 */
export function arrondir(v: number, pas: number): number {
  const q = Math.round((v / pas) * 1e9) / 1e9;
  const k = Math.floor(q + 0.5);
  const inverse = Math.round(1 / pas);
  return Math.abs(inverse * pas - 1) < 1e-12 ? k / inverse : k * pas;
}

export function evaluate(plan: Plan, sources: SourcesParticipant): Resultats {
  const { N } = plan;
  const valeurs = new Float64Array(N).fill(NaN);
  const causes = new Uint8Array(N);
  const fait = new Uint8Array(N);

  // H5b par défaut (« un seul ») : seul le premier joker posé (par id) s'applique.
  const jokerParNoeud = new Map<number, number>();
  for (const j of [...sources.jokers].sort((a, b) => a.id - b.id)) {
    const def = plan.jokerDefs[j.jokerDef];
    if (def && !jokerParNoeud.has(def.n)) jokerParNoeud.set(def.n, j.jokerDef);
  }

  const val = (n: number): number => {
    if (fait[n]) return valeurs[n];
    fait[n] = 1;
    let r = NaN;
    let cause: number = CAUSE.aucune;
    if (plan.type[n] === TYPE_DONNEES) {
      const b = plan.baremes[plan.bareme[n]];
      r = valeurCase(b, sources.cases[plan.indexDonnee[n]]);
      if (Number.isNaN(r)) cause = CAUSE.vide;
    } else if (plan.type[n] === TYPE_CALCUL) {
      [r, cause] = calculer(n);
      if (!Number.isNaN(r)) r = pipeline(n, r);
    } else {
      cause = CAUSE.sansCalcul;
    }
    valeurs[n] = r;
    causes[n] = cause;
    return r;
  };

  const calculer = (n: number): [number, number] => {
    const debut = plan.inOffsets[n];
    const fin = plan.inOffsets[n + 1];
    const actives: { v: number; w: number; s: number }[] = [];
    let poidsNul = false;
    for (let i = debut; i < fin; i++) {
      const s = plan.inSources[i];
      const v = val(s);
      const w = plan.inPoids[i];
      if (Number.isNaN(v)) continue;
      if (w > 0) actives.push({ v, w, s });
      else poidsNul = true;
    }
    // Des entrées ont un résultat mais toutes pèsent 0 : dénominateur nul (T3).
    if (actives.length === 0 && poidsNul) return [NaN, CAUSE.denominateurNul];
    const minimum = plan.params[n]?.minEntreesActives ?? 1;
    if (actives.length === 0 || actives.length < minimum) return [NaN, CAUSE.aucuneContribution];
    const sortie = plan.baremes[plan.bareme[n]];
    switch (plan.fonction[n]) {
      case 1: {
        // F1 : moyenne pondérée ; normalisée si les entrées sont hétérogènes.
        let somme = 0;
        let sommePoids = 0;
        for (const { v, w, s } of actives) {
          const x = plan.heterogene[n] ? normaliser(plan.baremes[plan.bareme[s]], v) : v;
          somme += x * w;
          sommePoids += w;
        }
        if (sommePoids === 0) return [NaN, CAUSE.denominateurNul];
        const m = somme / sommePoids;
        return [plan.heterogene[n] ? sortie.min + m * (sortie.max - sortie.min) : m, CAUSE.aucune];
      }
      case 2: {
        // F2 : seuil, v ≥ s, sortie binaire.
        const seuil = plan.params[n]!.seuil as number;
        return [actives[0].v >= seuil ? 1 : 0, CAUSE.aucune];
      }
      case 3:
        // F3 : toutes ; ignore les entrées sans résultat (H4 par défaut).
        return [actives.every((a) => a.v === 1) ? 1 : 0, CAUSE.aucune];
      default:
        throw new Error(`fonction ${plan.fonction[n]} non implémentée`);
    }
  };

  // fonction → conversion → arrondi propagé → joker.
  const pipeline = (n: number, brut: number): number => {
    let r = brut;
    const c = plan.conversionIndex[n];
    if (c >= 0) r = convertir(plan.conversions[c], r);
    if (plan.arrondi[n] > 0) r = arrondir(r, plan.arrondi[n]);
    const j = jokerParNoeud.get(n);
    if (j !== undefined) {
      const action = plan.jokerDefs[j].action;
      if (action.type === "ajout") {
        const b = plan.baremes[plan.bareme[n]];
        r = Math.min(b.max, Math.max(b.min, r + action.valeur));
      }
      // Action « seuil » : ticket des jokers.
    }
    return r;
  };

  for (let n = 0; n < N; n++) val(n);
  return { valeurs, causes };
}
