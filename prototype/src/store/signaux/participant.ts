// Variante « signaux » (spec 20, « Store de notes ») : le calcul d'un
// participant (g, p) en graphe alien-signals, paresseux. Une case = un signal ;
// les non-évaluations et les jokers = un signal chacun ; un nœud = un computed,
// créé à sa première lecture. Un computed rend l'objet précédent quand le
// résultat ne change pas : l'aval n'est alors pas recalculé.
//
// Le calcul d'un nœud (`calculerNoeud`) est commun aux variantes, écrit à part
// de l'oracle. Les analyses de dispense (couverture 1a-A, cône 1a-B) viennent
// du noyau, comme pour les exigences de remplissage.

import { computed, endBatch, signal, startBatch } from "alien-signals";
import type { Plan } from "../../noyau/compile";
import type { NonEvaluation } from "../../noyau/dispense";
import {
  AUCUN_JOKER,
  analyserNonEvaluations,
  type Calculateur,
  calculerNoeud,
  egalListe,
  egalResultat,
  etatNonEvaluation,
  type JokerParticipant,
  jokersParNoeud,
  type Lecteur,
  type ResultatNoeud,
} from "../calcul";

export type { JokerParticipant, ResultatNoeud };

/** Calcul d'un participant (g, p) en signaux. */
export class ParticipantSignaux implements Calculateur, Lecteur {
  private readonly cases: ((v?: number) => number)[] = [];
  private readonly nonEvals;
  private readonly jokersSig;
  private readonly noeuds: (() => ResultatNoeud)[] = [];
  private readonly etatsNE: (() => number)[] = [];
  private readonly jokersNoeud: (() => readonly number[])[] = [];
  private readonly analyseNE;
  private readonly jokersParNoeud;
  perime = false;

  constructor(
    readonly plan: Plan,
    cases: Float64Array,
    nonEvaluations: NonEvaluation[],
    jokers: JokerParticipant[],
  ) {
    for (let d = 0; d < plan.D; d++) this.cases.push(signal(cases[d]) as (v?: number) => number);
    this.nonEvals = signal<NonEvaluation[]>(nonEvaluations);
    this.jokersSig = signal<JokerParticipant[]>(jokers);
    this.analyseNE = computed(() => analyserNonEvaluations(plan, this.nonEvals()));
    this.jokersParNoeud = computed(() => jokersParNoeud(plan, this.jokersSig()));
  }

  ecrireCase(d: number, valeur: number): void {
    this.cases[d](valeur);
  }

  ecrireNonEvaluations(ne: NonEvaluation[]): void {
    this.nonEvals(ne);
  }

  ecrireJokers(j: JokerParticipant[]): void {
    this.jokersSig(j);
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

  // --- Lecteur : lectures suivies par les computed ----------------------------------

  etatNE(n: number): number {
    let c = this.etatsNE[n];
    if (!c) {
      c = computed(() => etatNonEvaluation(this.plan, this.analyseNE(), n));
      this.etatsNE[n] = c;
    }
    return c();
  }

  caseStockee(d: number): number {
    return this.cases[d]();
  }

  entree(s: number): ResultatNoeud {
    return this.lire(s);
  }

  jokers(n: number): readonly number[] {
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
        const r = calculerNoeud(this.plan, n, this);
        return avant && egalResultat(avant, r) ? avant : r;
      });
      this.noeuds[n] = c;
    }
    return c;
  }
}
