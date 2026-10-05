// `evaluate(plan, sources du participant) → résultats` : l'oracle
// (spec 20, « Modèle de valeur »). Évaluation récursive naïve mémoïsée ;
// aucune variante du store ne doit partager ce code.

import {
  type BaremeCompile,
  type JokerDefCompile,
  type Plan,
  TYPE_CALCUL,
  TYPE_DONNEES,
} from "./compile";
import { analyse1aB, couverture, type NonEvaluation } from "./dispense";

/** Cause d'un « sans résultat », pour l'explication seulement. */
export const CAUSE = {
  aucune: 0,
  vide: 1,
  nonEvalue: 2,
  aucuneContribution: 3,
  denominateurNul: 4,
  /** Regroupement ou commentaire : pas de résultat par nature. */
  sansCalcul: 5,
  /** H4 strict : une entrée de « toutes » / « au moins k = toutes » est sans résultat. */
  entreeSansResultat: 6,
} as const;

/** Marques dynamiques, bits de `Resultats.marques`. */
export const MARQUE_JOKER_APPLIQUE = 1;
export const MARQUE_INFLUENCE_JOKER = 2;
/** 1a-B : nœud du cône d'un nœud dispensé, consommé hors du cône ; calculé normalement. */
export const MARQUE_CHEMIN_DISPENSE = 4;

export interface SourcesParticipant {
  /** Valeur de chaque case, index d ; NaN = vide. Ordinal : rang du palier. */
  cases: Float64Array;
  /** Non-évaluations sur n'importe quel nœud ; `axe` sert à 1b-C. */
  nonEvaluations: NonEvaluation[];
  /** Jokers posés : index de la définition dans `plan.jokerDefs`, et id de pose. */
  jokers: { id: number; jokerDef: number }[];
}

export interface Resultats {
  /** Valeur sur le barème de sortie ; NaN = sans résultat. */
  valeurs: Float64Array;
  causes: Uint8Array;
  marques: Uint8Array;
}

/** Statut d'une entrée dans le calcul d'un nœud (trace de l'explication). */
export type StatutEntree = "active" | "sansResultat" | "poidsNul" | "horsCone";

/**
 * Trace du calcul d'un nœud, pour `explain` : rejoue l'oracle et note, pour le
 * seul nœud demandé, le statut de chaque entrée et chaque étape du pipeline.
 */
export interface TraceNoeud {
  n: number;
  /** Une par entrée, dans l'ordre des `entrees` (index CSR). */
  statuts: StatutEntree[];
  /** Résultat de la fonction, avant le pipeline ; NaN = sans résultat. */
  brut: number;
  apresConversion: number;
  apresArrondi: number;
  /** Définitions de joker appliquées (index dans `plan.jokerDefs`). */
  jokers: number[];
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

/**
 * Jokers sur la valeur finale d'un nœud (spec 20, « Joker ») : les ajouts
 * s'additionnent (un palier par unité sur un ordinal), puis le seuil
 * max(valeur, s), le tout borné au barème de sortie.
 */
function appliquerJokers(b: BaremeCompile, valeur: number, defs: JokerDefCompile[]): number {
  let ajout = 0;
  let seuil = -Infinity;
  for (const d of defs) {
    if (d.action.type === "ajout") ajout += d.action.valeur;
    else seuil = Math.max(seuil, d.seuil);
  }
  let r = valeur;
  if (b.type === "ordinal") {
    const paliers = [...b.valeurs].sort((x, y) => x - y);
    // Palier courant : le plus proche de la valeur.
    let rang = 0;
    paliers.forEach((v, i) => {
      if (Math.abs(v - r) < Math.abs(paliers[rang] - r)) rang = i;
    });
    r = paliers[Math.min(paliers.length - 1, Math.max(0, rang + Math.round(ajout)))];
    if (r < seuil) r = paliers.find((v) => v >= seuil) ?? paliers[paliers.length - 1];
    return r;
  }
  r = Math.max(r + ajout, seuil);
  return Math.min(b.max, Math.max(b.min, r));
}

export function evaluate(plan: Plan, sources: SourcesParticipant, trace?: { n: number; noeud?: TraceNoeud }): Resultats {
  const { N } = plan;
  const valeurs = new Float64Array(N).fill(NaN);
  const causes = new Uint8Array(N);
  const marques = new Uint8Array(N);
  const fait = new Uint8Array(N);
  const { dispense1a, h4Strict } = plan.commutateurs;
  // 1a-A : la dispense agit sur la case. 1a-B : sur la contribution, par le cône.
  const couvert = dispense1a === "A" ? couverture(plan, sources.nonEvaluations) : null;
  const cone = dispense1a === "B" ? analyse1aB(plan, sources.nonEvaluations) : null;
  if (cone) for (let n = 0; n < N; n++) if (cone.signales[n]) marques[n] |= MARQUE_CHEMIN_DISPENSE;

  // Jokers en vigueur par nœud. H5b « un seul » (défaut) : seul le premier
  // joker posé (par id) s'applique ; « cumulés » : tous. H5 ne gouverne que la
  // pose : les jokers invalides restent en vigueur (voir `jokers.ts`).
  const jokersParNoeud = new Map<number, number[]>();
  for (const j of [...sources.jokers].sort((a, b) => a.id - b.id)) {
    const def = plan.jokerDefs[j.jokerDef];
    if (!def) continue;
    const liste = jokersParNoeud.get(def.n);
    if (!liste) jokersParNoeud.set(def.n, [j.jokerDef]);
    else if (plan.commutateurs.h5b === "cumules") liste.push(j.jokerDef);
  }
  /** Une entrée active de n porte « joker appliqué » ou « influencé » (posé par `calculer`). */
  let entreeMarquee = false;

  const val = (n: number): number => {
    if (fait[n]) return valeurs[n];
    fait[n] = 1;
    let r = NaN;
    let cause: number = CAUSE.aucune;
    if ((couvert && plan.type[n] === TYPE_DONNEES && couvert[plan.indexDonnee[n]]) || cone?.dispense[n]) {
      cause = CAUSE.nonEvalue;
    } else if (plan.type[n] === TYPE_DONNEES) {
      const b = plan.baremes[plan.bareme[n]];
      r = valeurCase(b, sources.cases[plan.indexDonnee[n]]);
      if (Number.isNaN(r)) cause = CAUSE.vide;
    } else if (plan.type[n] === TYPE_CALCUL) {
      [r, cause] = calculer(n);
      if (trace?.n === n && trace.noeud) trace.noeud.brut = r;
      if (!Number.isNaN(r)) {
        // Marques, en continu avec la valeur : seulement sur un nœud avec résultat.
        if (entreeMarquee) marques[n] |= MARQUE_INFLUENCE_JOKER;
        if (jokersParNoeud.has(n)) marques[n] |= MARQUE_JOKER_APPLIQUE;
        r = pipeline(n, r);
      }
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
    /** Entrées actives ; `rang` = position dans `entrees`, à partir de 1 (F5). */
    const actives: { v: number; w: number; s: number; rang: number }[] = [];
    let poidsNul = false;
    let sansResultat = false;
    // 1a-B : calculé sans les feuilles couvertes (toutes ses entrées de données).
    const sansFeuilles = cone?.sansFeuilles[n] === 1;
    const statuts: StatutEntree[] | null = trace?.n === n ? [] : null;
    for (let i = debut; i < fin; i++) {
      const s = plan.inSources[i];
      if (sansFeuilles && plan.type[s] === TYPE_DONNEES) {
        statuts?.push("horsCone");
        continue;
      }
      const v = val(s);
      const w = plan.inPoids[i];
      if (Number.isNaN(v)) {
        if (w > 0) sansResultat = true;
        statuts?.push("sansResultat");
        continue;
      }
      if (w > 0) actives.push({ v, w, s, rang: i - debut + 1 });
      else poidsNul = true;
      statuts?.push(w > 0 ? "active" : "poidsNul");
    }
    if (statuts && trace) trace.noeud = { n, statuts, brut: NaN, apresConversion: NaN, apresArrondi: NaN, jokers: [] };
    entreeMarquee = actives.some((a) => (marques[a.s] & (MARQUE_JOKER_APPLIQUE | MARQUE_INFLUENCE_JOKER)) !== 0);
    // Des entrées ont un résultat mais toutes pèsent 0 : dénominateur nul (T3).
    if (actives.length === 0 && poidsNul) return [NaN, CAUSE.denominateurNul];
    const minimum = plan.params[n]?.minEntreesActives ?? 1;
    if (actives.length === 0 || actives.length < minimum) return [NaN, CAUSE.aucuneContribution];
    const sortie = plan.baremes[plan.bareme[n]];
    const p = plan.params[n] ?? {};
    // H4 strict : « toutes » et « au moins k = toutes » exigent un résultat de chaque entrée.
    const toutes = plan.fonction[n] === 3 || (plan.fonction[n] === 4 && p.k === "toutes");
    if (h4Strict && toutes && sansResultat) return [NaN, CAUSE.entreeSansResultat];
    // Entrées hétérogènes : calcul en normalisé, puis report sur le barème de sortie.
    const versCalcul = (v: number, s: number) => (plan.heterogene[n] ? normaliser(plan.baremes[plan.bareme[s]], v) : v);
    const versSortie = (m: number) => (plan.heterogene[n] ? sortie.min + m * (sortie.max - sortie.min) : m);
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
      case 4: {
        // F4 : au moins k entrées réussies (v ≥ seuil, ou OK sans seuil) ;
        // « toutes » porte sur les entrées actives (H4 par défaut).
        const reussies = actives.filter((a) => (p.seuil === undefined ? a.v === 1 : a.v >= p.seuil)).length;
        const k = p.k === "toutes" ? actives.length : (p.k as number);
        return [reussies >= k ? 1 : 0, CAUSE.aucune];
      }
      case 5: {
        // F5 : meilleure ou dernière occurrence ; plafond sur les rangs ≥ 2.
        const vals = actives.map((a) =>
          versCalcul(a.rang >= 2 && p.plafond !== undefined ? Math.min(a.v, p.plafond) : a.v, a.s),
        );
        return [versSortie(p.mode === "derniere" ? vals[vals.length - 1] : Math.max(...vals)), CAUSE.aucune];
      }
      case 6: {
        // F6 : moyenne après retrait des kHautes plus hautes et kBasses plus basses.
        const kh = p.kHautes ?? 0;
        const kb = p.kBasses ?? 0;
        const tries = actives.map((a) => versCalcul(a.v, a.s)).sort((a, b) => a - b);
        const gardees = tries.slice(kb, Math.max(kb, tries.length - kh));
        if (gardees.length === 0) return [NaN, CAUSE.aucuneContribution];
        return [versSortie(gardees.reduce((x, y) => x + y, 0) / gardees.length), CAUSE.aucune];
      }
      case 7: {
        // F7 : double compensation. Réussi si facteurBas × Σ écarts bas ≤ Σ écarts
        // hauts (au pivot) et si les insuffisantes (< pivot) ne dépassent pas le maximum.
        const pivot = p.pivot as number;
        let hauts = 0;
        let bas = 0;
        let insuffisantes = 0;
        for (const { v } of actives) {
          if (v >= pivot) hauts += v - pivot;
          else {
            bas += pivot - v;
            insuffisantes++;
          }
        }
        // Tolérance des flottants : l'égalité passe (A08, « n'excède pas »).
        const compense = (p.facteurBas as number) * bas <= hauts + 1e-9;
        return [compense && insuffisantes <= (p.maxInsuffisantes as number) ? 1 : 0, CAUSE.aucune];
      }
      default:
        throw new Error(`fonction ${plan.fonction[n]} non implémentée`);
    }
  };

  // fonction → conversion → arrondi propagé → joker.
  const pipeline = (n: number, brut: number): number => {
    let r = brut;
    const c = plan.conversionIndex[n];
    if (c >= 0) r = convertir(plan.conversions[c], r);
    const t = trace?.n === n ? trace.noeud : undefined;
    if (t) t.apresConversion = r;
    if (plan.arrondi[n] > 0) r = arrondir(r, plan.arrondi[n]);
    if (t) t.apresArrondi = r;
    const defs = jokersParNoeud.get(n);
    if (t && defs) t.jokers = [...defs];
    if (defs !== undefined) r = appliquerJokers(plan.baremes[plan.bareme[n]], r, defs.map((j) => plan.jokerDefs[j]));
    return r;
  };

  for (let n = 0; n < N; n++) val(n);
  return { valeurs, causes, marques };
}
