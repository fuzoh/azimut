// Variante « DAG maison » (spec 20, « Variantes à comparer ») : le calcul d'un
// participant (g, p) sur des tableaux typés, paresseux, invalidé par bits de
// version. Un nœud est à jour si son tampon `vu[n]` vaut l'époque courante :
// une saisie remet à 0 le tampon de son cône aval (arêtes sortantes en CSR) ;
// un changement des non-évaluations ou des jokers avance l'époque (tout est
// périmé en O(1)). La lecture recalcule récursivement ce qui est périmé.

import type { Plan } from "../../noyau/compile";
import type { NonEvaluation } from "../../noyau/dispense";
import {
  AUCUN_JOKER,
  type AnalyseNonEvaluations,
  analyserNonEvaluations,
  type Calculateur,
  calculerNoeud,
  etatNonEvaluation,
  type JokerParticipant,
  jokersParNoeud,
  type Lecteur,
  type ResultatNoeud,
} from "../calcul";

/** Arêtes sortantes du plan, en CSR : calculées une fois par plan. */
interface Sortantes {
  offsets: Int32Array;
  cibles: Int32Array;
}

const sortantesParPlan = new WeakMap<Plan, Sortantes>();

function sortantes(plan: Plan): Sortantes {
  let s = sortantesParPlan.get(plan);
  if (s) return s;
  const { N, inOffsets, inSources } = plan;
  const offsets = new Int32Array(N + 1);
  for (let i = 0; i < inSources.length; i++) offsets[inSources[i] + 1]++;
  for (let n = 0; n < N; n++) offsets[n + 1] += offsets[n];
  const cibles = new Int32Array(inSources.length);
  const curseur = offsets.slice(0, N);
  for (let n = 0; n < N; n++) for (let i = inOffsets[n]; i < inOffsets[n + 1]; i++) cibles[curseur[inSources[i]]++] = n;
  s = { offsets, cibles };
  sortantesParPlan.set(plan, s);
  return s;
}

export class ParticipantDag implements Calculateur, Lecteur {
  private readonly cases: Float64Array;
  private readonly valeurs: Float64Array;
  private readonly causes: Uint8Array;
  private readonly marques: Uint8Array;
  /** Époque à laquelle le nœud a été calculé ; 0 = jamais ou périmé. */
  private readonly vu: Uint32Array;
  private epoque = 1;
  private nonEvaluations: NonEvaluation[];
  private jokersListe: JokerParticipant[];
  private analyse: AnalyseNonEvaluations | null = null;
  private parNoeud: Map<number, number[]> | null = null;
  private readonly sortantes: Sortantes;
  /** Pile de propagation réutilisée. */
  private readonly pile: Int32Array;
  perime = false;

  constructor(
    readonly plan: Plan,
    cases: Float64Array,
    nonEvaluations: NonEvaluation[],
    jokers: JokerParticipant[],
  ) {
    this.cases = Float64Array.from(cases);
    this.valeurs = new Float64Array(plan.N);
    this.causes = new Uint8Array(plan.N);
    this.marques = new Uint8Array(plan.N);
    this.vu = new Uint32Array(plan.N);
    this.nonEvaluations = nonEvaluations;
    this.jokersListe = jokers;
    this.sortantes = sortantes(plan);
    this.pile = new Int32Array(plan.N);
  }

  ecrireCase(d: number, valeur: number): void {
    if (Object.is(this.cases[d], valeur)) return;
    this.cases[d] = valeur;
    this.perimerAval(this.plan.donnees[d]);
  }

  ecrireNonEvaluations(ne: NonEvaluation[]): void {
    this.nonEvaluations = ne;
    this.analyse = null;
    this.toutPerimer();
  }

  ecrireJokers(j: JokerParticipant[]): void {
    this.jokersListe = j;
    this.parNoeud = null;
    this.toutPerimer();
  }

  lire(n: number): ResultatNoeud {
    if (this.vu[n] !== this.epoque) {
      const r = calculerNoeud(this.plan, n, this);
      this.valeurs[n] = r.valeur;
      this.causes[n] = r.cause;
      this.marques[n] = r.marques;
      this.vu[n] = this.epoque;
      return r;
    }
    return { valeur: this.valeurs[n], cause: this.causes[n], marques: this.marques[n] };
  }

  // --- Lecteur ------------------------------------------------------------------------

  etatNE(n: number): number {
    this.analyse ??= analyserNonEvaluations(this.plan, this.nonEvaluations);
    return etatNonEvaluation(this.plan, this.analyse, n);
  }

  caseStockee(d: number): number {
    return this.cases[d];
  }

  entree(s: number): ResultatNoeud {
    return this.lire(s);
  }

  jokers(n: number): readonly number[] {
    this.parNoeud ??= jokersParNoeud(this.plan, this.jokersListe);
    return this.parNoeud.get(n) ?? AUCUN_JOKER;
  }

  // --- Invalidation -------------------------------------------------------------------

  private toutPerimer() {
    this.epoque++;
    if (this.epoque === 0xffffffff) {
      this.vu.fill(0);
      this.epoque = 1;
    }
  }

  /** Périme n et son cône aval ; s'arrête aux nœuds déjà périmés (leur aval l'est aussi). */
  private perimerAval(n: number) {
    const { offsets, cibles } = this.sortantes;
    const { vu, pile } = this;
    let haut = 0;
    if (vu[n] !== this.epoque) return;
    vu[n] = 0;
    pile[haut++] = n;
    while (haut > 0) {
      const m = pile[--haut];
      for (let i = offsets[m]; i < offsets[m + 1]; i++) {
        const c = cibles[i];
        if (vu[c] !== this.epoque) continue;
        vu[c] = 0;
        pile[haut++] = c;
      }
    }
  }
}
