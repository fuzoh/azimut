// Variante « signaux » (spec 20, « Store de notes ») : le calcul d'un
// participant (g, p) en graphe alien-signals, paresseux. Une case = un signal ;
// les non-évaluations et les jokers = un signal chacun ; un nœud = un computed,
// créé à sa première lecture. Un computed rend l'objet précédent quand le
// résultat ne change pas : l'aval n'est alors pas recalculé.
//
// Calcul écrit à part de l'oracle (`evaluate`), qui ne doit partager son code
// avec aucune variante. Les analyses de dispense (couverture 1a-A, cône 1a-B)
// viennent du noyau, comme pour les exigences de remplissage.

import { computed, endBatch, signal, startBatch } from "alien-signals";
import { type BaremeCompile, type JokerDefCompile, type Plan, TYPE_CALCUL, TYPE_DONNEES } from "../../noyau/compile";
import { analyse1aB, couverture, type NonEvaluation } from "../../noyau/dispense";

export interface ResultatNoeud {
  valeur: number;
  cause: number;
  marques: number;
}

export interface JokerParticipant {
  id: number;
  jokerDef: number;
}

// Mêmes codes que l'interface du store (voir `CAUSE` et les marques du noyau).
const SANS_CAUSE = 0;
const VIDE = 1;
const NON_EVALUE = 2;
const AUCUNE_CONTRIBUTION = 3;
const DENOMINATEUR_NUL = 4;
const SANS_CALCUL = 5;
const ENTREE_SANS_RESULTAT = 6;
const JOKER_APPLIQUE = 1;
const INFLUENCE = 2;
const CHEMIN_DISPENSE = 4;

/** État d'un nœud vis-à-vis des non-évaluations : bits. */
const NE_DISPENSE = 1;
const NE_SANS_FEUILLES = 2;
const NE_SIGNALE = 4;

const AUCUN_JOKER: readonly number[] = [];

function egalResultat(a: ResultatNoeud, b: ResultatNoeud): boolean {
  return Object.is(a.valeur, b.valeur) && a.cause === b.cause && a.marques === b.marques;
}

function egalListe(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function valeurAssociee(b: BaremeCompile, stockee: number): number {
  if (b.type === "numerique" || Number.isNaN(stockee)) return stockee;
  return b.valeurs[stockee] ?? NaN;
}

const versUnite = (b: BaremeCompile, v: number) => (b.max === b.min ? 0 : (v - b.min) / (b.max - b.min));

function tableAffine(t: Float64Array, v: number): number {
  if (v <= t[0]) return t[1];
  let i = 2;
  while (i < t.length && v > t[i]) i += 2;
  if (i >= t.length) return t[t.length - 1];
  return t[i - 1] + ((v - t[i - 2]) * (t[i + 1] - t[i - 1])) / (t[i] - t[i - 2]);
}

/** Arrondi au pas, demi vers le haut, après effacement du bruit des flottants. */
function auPas(v: number, pas: number): number {
  const k = Math.floor(Math.round((v / pas) * 1e9) / 1e9 + 0.5);
  const inverse = Math.round(1 / pas);
  return Math.abs(inverse * pas - 1) < 1e-12 ? k / inverse : k * pas;
}

function avecJokers(b: BaremeCompile, v: number, defs: JokerDefCompile[]): number {
  let ajout = 0;
  let seuil = -Infinity;
  for (const d of defs) {
    if (d.action.type === "ajout") ajout += d.action.valeur;
    else if (d.seuil > seuil) seuil = d.seuil;
  }
  if (b.type === "numerique") return Math.min(b.max, Math.max(b.min, Math.max(v + ajout, seuil)));
  const paliers = Array.from(b.valeurs).sort((x, y) => x - y);
  let rang = 0;
  for (let i = 1; i < paliers.length; i++) if (Math.abs(paliers[i] - v) < Math.abs(paliers[rang] - v)) rang = i;
  const r = paliers[Math.min(paliers.length - 1, Math.max(0, rang + Math.round(ajout)))];
  if (r >= seuil) return r;
  return paliers.find((x) => x >= seuil) ?? paliers[paliers.length - 1];
}

/** Calcul d'un participant (g, p) en signaux. */
export class ParticipantSignaux {
  private readonly cases: ((v?: number) => number)[] = [];
  private readonly nonEvals;
  private readonly jokers;
  private readonly noeuds: (() => ResultatNoeud)[] = [];
  private readonly etatsNE: (() => number)[] = [];
  private readonly jokersNoeud: (() => readonly number[])[] = [];
  private readonly analyseNE;
  private readonly jokersParNoeud;
  /** Saisie distante sur ce participant pendant qu'il n'était pas affiché. */
  perime = false;

  constructor(
    readonly plan: Plan,
    cases: Float64Array,
    nonEvaluations: NonEvaluation[],
    jokers: JokerParticipant[],
  ) {
    for (let d = 0; d < plan.D; d++) this.cases.push(signal(cases[d]) as (v?: number) => number);
    this.nonEvals = signal<NonEvaluation[]>(nonEvaluations);
    this.jokers = signal<JokerParticipant[]>(jokers);
    this.analyseNE = computed(() => {
      const ne = this.nonEvals();
      return plan.commutateurs.dispense1a === "A" ? { couvert: couverture(plan, ne), cone: null } : { couvert: null, cone: analyse1aB(plan, ne) };
    });
    this.jokersParNoeud = computed(() => {
      const res = new Map<number, number[]>();
      const tries = [...this.jokers()].sort((a, b) => a.id - b.id);
      for (const j of tries) {
        const def = plan.jokerDefs[j.jokerDef];
        if (!def) continue;
        const l = res.get(def.n);
        if (!l) res.set(def.n, [j.jokerDef]);
        else if (plan.commutateurs.h5b === "cumules") l.push(j.jokerDef);
      }
      return res;
    });
  }

  ecrireCase(d: number, valeur: number): void {
    this.cases[d](valeur);
  }

  /** Remplace les non-évaluations et les jokers (listes complètes du participant). */
  ecrireNonEvaluations(ne: NonEvaluation[]): void {
    this.nonEvals(ne);
  }

  ecrireJokers(j: JokerParticipant[]): void {
    this.jokers(j);
  }

  /** Plusieurs écritures, une seule propagation. */
  static lot(f: () => void): void {
    startBatch();
    try {
      f();
    } finally {
      endBatch();
    }
  }

  lire(n: number): ResultatNoeud {
    return this.noeud(n)();
  }

  private etatNE(n: number): number {
    let c = this.etatsNE[n];
    if (!c) {
      const { plan } = this;
      c = computed(() => {
        const { couvert, cone } = this.analyseNE();
        if (couvert) return plan.type[n] === TYPE_DONNEES && couvert[plan.indexDonnee[n]] ? NE_DISPENSE : 0;
        return (cone!.dispense[n] ? NE_DISPENSE : 0) | (cone!.sansFeuilles[n] ? NE_SANS_FEUILLES : 0) | (cone!.signales[n] ? NE_SIGNALE : 0);
      });
      this.etatsNE[n] = c;
    }
    return c();
  }

  private jokersDe(n: number): readonly number[] {
    let c = this.jokersNoeud[n];
    if (!c) {
      c = computed<readonly number[]>((avant) => {
        const l = this.jokersParNoeud().get(n) ?? AUCUN_JOKER;
        return avant && egalListe(avant, l) ? avant : l;
      });
      this.jokersNoeud[n] = c;
    }
    return c();
  }

  private noeud(n: number): () => ResultatNoeud {
    let c = this.noeuds[n];
    if (!c) {
      c = computed<ResultatNoeud>((avant) => {
        const r = this.calculer(n);
        return avant && egalResultat(avant, r) ? avant : r;
      });
      this.noeuds[n] = c;
    }
    return c;
  }

  private calculer(n: number): ResultatNoeud {
    const { plan } = this;
    const ne = this.etatNE(n);
    const statiques = ne & NE_SIGNALE ? CHEMIN_DISPENSE : 0;
    if (ne & NE_DISPENSE) return { valeur: NaN, cause: NON_EVALUE, marques: statiques };
    const t = plan.type[n];
    if (t === TYPE_DONNEES) {
      const v = valeurAssociee(plan.baremes[plan.bareme[n]], this.cases[plan.indexDonnee[n]]());
      return { valeur: v, cause: Number.isNaN(v) ? VIDE : SANS_CAUSE, marques: statiques };
    }
    if (t !== TYPE_CALCUL) return { valeur: NaN, cause: SANS_CALCUL, marques: statiques };

    // Entrées : valeurs actives (poids > 0, avec résultat), dans l'ordre CSR.
    const vals: number[] = [];
    const sourcesActives: number[] = [];
    const rangs: number[] = [];
    let auMoinsUnPoidsNul = false;
    let uneSansResultat = false;
    let influencee = false;
    const debut = plan.inOffsets[n];
    for (let i = debut; i < plan.inOffsets[n + 1]; i++) {
      const s = plan.inSources[i];
      if (ne & NE_SANS_FEUILLES && plan.type[s] === TYPE_DONNEES) continue;
      const e = this.lire(s);
      const w = plan.inPoids[i];
      if (Number.isNaN(e.valeur)) {
        if (w > 0) uneSansResultat = true;
        continue;
      }
      if (w <= 0) {
        auMoinsUnPoidsNul = true;
        continue;
      }
      vals.push(e.valeur);
      sourcesActives.push(s);
      rangs.push(i - debut + 1);
      if (e.marques & (JOKER_APPLIQUE | INFLUENCE)) influencee = true;
    }
    const [brut, cause] = this.fonction(n, vals, sourcesActives, rangs, debut, auMoinsUnPoidsNul, uneSansResultat);
    if (Number.isNaN(brut)) return { valeur: NaN, cause, marques: statiques };

    let v = brut;
    const conv = plan.conversionIndex[n];
    if (conv >= 0) v = tableAffine(plan.conversions[conv], v);
    if (plan.arrondi[n] > 0) v = auPas(v, plan.arrondi[n]);
    const defs = this.jokersDe(n);
    let marques = statiques | (influencee ? INFLUENCE : 0);
    if (defs.length > 0) {
      marques |= JOKER_APPLIQUE;
      v = avecJokers(
        plan.baremes[plan.bareme[n]],
        v,
        defs.map((j) => plan.jokerDefs[j]),
      );
    }
    return { valeur: v, cause: SANS_CAUSE, marques };
  }

  /** Fonction du nœud sur ses entrées actives : [valeur brute, cause]. */
  private fonction(
    n: number,
    vals: number[],
    sources: number[],
    rangs: number[],
    debut: number,
    poidsNul: boolean,
    sansResultat: boolean,
  ): [number, number] {
    const { plan } = this;
    if (vals.length === 0) return [NaN, poidsNul ? DENOMINATEUR_NUL : AUCUNE_CONTRIBUTION];
    const p = plan.params[n] ?? {};
    if (vals.length < (p.minEntreesActives ?? 1)) return [NaN, AUCUNE_CONTRIBUTION];
    const f = plan.fonction[n];
    if (plan.commutateurs.h4Strict && sansResultat && (f === 3 || (f === 4 && p.k === "toutes"))) return [NaN, ENTREE_SANS_RESULTAT];
    const sortie = plan.baremes[plan.bareme[n]];
    const het = plan.heterogene[n] === 1;
    const unite = (i: number, v = vals[i]) => (het ? versUnite(plan.baremes[plan.bareme[sources[i]]], v) : v);
    const deUnite = (m: number) => (het ? sortie.min + m * (sortie.max - sortie.min) : m);
    switch (f) {
      case 1: {
        let num = 0;
        let den = 0;
        for (let i = 0; i < vals.length; i++) {
          // Poids de l'entrée : celui de sa position CSR.
          const w = plan.inPoids[debut + rangs[i] - 1];
          num += unite(i) * w;
          den += w;
        }
        return den === 0 ? [NaN, DENOMINATEUR_NUL] : [deUnite(num / den), SANS_CAUSE];
      }
      case 2:
        return [vals[0] >= (p.seuil as number) ? 1 : 0, SANS_CAUSE];
      case 3:
        return [vals.every((v) => v === 1) ? 1 : 0, SANS_CAUSE];
      case 4: {
        let ok = 0;
        for (const v of vals) if (p.seuil === undefined ? v === 1 : v >= p.seuil) ok++;
        return [ok >= (p.k === "toutes" ? vals.length : (p.k as number)) ? 1 : 0, SANS_CAUSE];
      }
      case 5: {
        const xs = vals.map((v, i) => unite(i, rangs[i] >= 2 && p.plafond !== undefined ? Math.min(v, p.plafond) : v));
        return [deUnite(p.mode === "derniere" ? xs[xs.length - 1] : Math.max(...xs)), SANS_CAUSE];
      }
      case 6: {
        const xs = vals.map((_, i) => unite(i)).sort((a, b) => a - b);
        const bas = p.kBasses ?? 0;
        const garde = xs.slice(bas, Math.max(bas, xs.length - (p.kHautes ?? 0)));
        if (garde.length === 0) return [NaN, AUCUNE_CONTRIBUTION];
        let s = 0;
        for (const x of garde) s += x;
        return [deUnite(s / garde.length), SANS_CAUSE];
      }
      case 7: {
        const pivot = p.pivot as number;
        let hauts = 0;
        let bas = 0;
        let insuffisantes = 0;
        for (const v of vals) {
          if (v < pivot) {
            bas += pivot - v;
            insuffisantes++;
          } else hauts += v - pivot;
        }
        return [(p.facteurBas as number) * bas <= hauts + 1e-9 && insuffisantes <= (p.maxInsuffisantes as number) ? 1 : 0, SANS_CAUSE];
      }
      default:
        throw new Error(`fonction ${f} non implémentée`);
    }
  }
}
