// `generer(plans, graine, réglages) → sources` (spec 20, « Générateur »). Pure.
//
// - Un flux sfc32 par (grille, participant), dérivé de la graine par hachage :
//   un participant se génère à l'identique quel que soit l'ordre de génération.
//   Le niveau du participant (commun aux grilles) et la difficulté des nœuds
//   (par grille) ont leurs propres flux.
// - Note : z = niveau − difficulté + bruit. Numérique et ordinal à paliers :
//   nombre entier de pas, k = arrondi(σ(a + b·z) × nombre de pas). OK/KO :
//   logistique, OK avec la probabilité σ(a + b·z).
// - Remplissage : un « exercice » (placement de 1er niveau de l'axe principal)
//   est fait avec la probabilité q, puis chaque case d'un exercice fait est
//   remplie avec la probabilité 0,95 ; q = taux / 0,95. Profil « fin » :
//   ≈ 5 % d'exercices entiers non faits, ≈ 5 % de cases vides dispersées.
// - Non-évaluations : 3 % des participants dispensés d'un regroupement de
//   l'axe principal (par grille), 0,5 % des cases « non évalué ».
// - Jokers : 30 % des participants posent leur quota (définitions distinctes)
//   là où la grille en autorise.

import { type Plan, TYPE_REGROUPEMENT } from "../noyau/compile";
import type { Placement } from "../noyau/format";
import { cle, MAX_PARTICIPANTS } from "../sources/cle";
import type { LigneCase, LigneJoker, LigneNonEvaluation, LigneParticipant } from "../sources/collections";
import { type Flux, flux } from "./prng";

export type ProfilRemplissage = "debut" | "milieu" | "fin";

/** Part des cases possibles remplies, par préréglage. */
export const TAUX_REMPLISSAGE: Record<ProfilRemplissage, number> = { debut: 0.2, milieu: 0.55, fin: 0.9 };
/** Part des cases remplies dans un exercice fait (le reste : cases vides dispersées). */
export const CASES_REMPLIES_PAR_EXERCICE = 0.95;
export const PART_DISPENSES = 0.03;
export const PART_NON_EVALUEES = 0.005;
export const PART_JOKERS = 0.3;

export interface ReglagesGeneration {
  remplissage: ProfilRemplissage;
  /** Nombre de participants générés. */
  participants: number;
  /** Index p du premier participant généré (après les participants types). Défaut 0. */
  premierP?: number;
}

export interface SourcesGenerees {
  participants: LigneParticipant[];
  cases: LigneCase[];
  nonEvaluations: LigneNonEvaluation[];
  jokers: LigneJoker[];
}

export const AUTEUR_GENERE = "générateur";
export const DATE_GENEREE = "2026-10-05";

const sigmoide = (x: number) => 1 / (1 + Math.exp(-x));

/** Ce qui ne dépend que de la structure et de la graine : préparé une fois par grille. */
interface Preparation {
  plan: Plan;
  g: number;
  /** d → index de l'exercice (placement de 1er niveau de l'axe principal), ou d'une unité propre. */
  exercice: Int32Array;
  nbExercices: number;
  difficulte: Float64Array;
  /** d → nombre de pas du barème (OK/KO : -1, tiré par logistique). */
  pas: Int32Array;
  /** d → rangs du barème ordinal triés par valeur croissante (vide si numérique). */
  rangs: Int32Array[];
  /** Regroupements de l'axe principal qui couvrent au moins une case (dispense). */
  regroupements: number[];
}

function preparer(plan: Plan, g: number, graine: number): Preparation {
  const exercice = new Int32Array(plan.D).fill(-1);
  const regroupements = new Set<number>();
  const axe = plan.axePrincipal >= 0 ? plan.grille.axes[plan.axePrincipal] : undefined;
  const parcourir = (p: Placement, i: number, regs: number[]) => {
    const n = plan.index.get(p.noeud)!;
    const d = plan.indexDonnee[n];
    if (d >= 0) {
      if (exercice[d] < 0) exercice[d] = i;
      for (const r of regs) regroupements.add(r);
    }
    const sous = plan.type[n] === TYPE_REGROUPEMENT ? [...regs, n] : regs;
    for (const e of p.enfants ?? []) parcourir(e, i, sous);
  };
  axe?.arbre.forEach((p, i) => parcourir(p, i, []));
  let nbExercices = axe?.arbre.length ?? 0;
  for (let d = 0; d < plan.D; d++) if (exercice[d] < 0) exercice[d] = nbExercices++;

  const f = flux(graine, "difficulte", g);
  const difficulte = new Float64Array(plan.D);
  for (let d = 0; d < plan.D; d++) difficulte[d] = 0.6 * f.normale();

  const pas = new Int32Array(plan.D);
  const rangs: Int32Array[] = [];
  for (let d = 0; d < plan.D; d++) {
    const b = plan.baremes[plan.bareme[plan.donnees[d]]];
    if (b.type === "ordinal") {
      const ordre = Int32Array.from(b.valeurs.keys()).sort((x, y) => b.valeurs[x] - b.valeurs[y]);
      rangs[d] = ordre;
      pas[d] = ordre.length === 2 ? -1 : ordre.length - 1;
    } else {
      rangs[d] = new Int32Array(0);
      pas[d] = b.pas > 0 ? Math.round((b.max - b.min) / b.pas) : 100;
    }
  }
  return { plan, g, exercice, nbExercices, difficulte, pas, rangs, regroupements: [...regroupements].sort((a, b) => a - b) };
}

function niveau(graine: number, p: number): number {
  return flux(graine, "niveau", p).normale();
}

/** Valeur stockée d'une case : note (numérique) ou rang du palier (ordinal). */
function tirerValeur(prep: Preparation, d: number, z: number, f: Flux): number {
  const { plan } = prep;
  const pas = prep.pas[d];
  if (pas < 0) return prep.rangs[d][f.uniforme() < sigmoide(2.2 + 1.5 * z) ? 1 : 0];
  const k = Math.round(sigmoide(0.9 + 1.1 * z) * pas);
  const b = plan.baremes[plan.bareme[plan.donnees[d]]];
  if (b.type === "ordinal") return prep.rangs[d][k];
  return b.pas > 0 ? Number((b.min + k * b.pas).toFixed(10)) : b.min + (k / pas) * (b.max - b.min);
}

function genererGrille(prep: Preparation, p: number, graine: number, reglages: ReglagesGeneration, nv: number, sortie: SourcesGenerees) {
  const { plan, g } = prep;
  const f = flux(graine, "participant", g, p);
  const q = Math.min(1, TAUX_REMPLISSAGE[reglages.remplissage] / CASES_REMPLIES_PAR_EXERCICE);
  const fait = new Uint8Array(prep.nbExercices);
  for (let i = 0; i < prep.nbExercices; i++) fait[i] = f.uniforme() < q ? 1 : 0;
  for (let d = 0; d < plan.D; d++) {
    const remplie = fait[prep.exercice[d]] === 1 && f.uniforme() < CASES_REMPLIES_PAR_EXERCICE;
    const bruit = 0.6 * f.normale();
    const valeur = tirerValeur(prep, d, nv - prep.difficulte[d] + bruit, f);
    if (remplie) sortie.cases.push({ k: cle(g, p, d), g, p, d, valeur });
    if (f.uniforme() < PART_NON_EVALUEES) {
      const n = plan.donnees[d];
      sortie.nonEvaluations.push({ k: cle(g, p, n), g, p, n });
    }
  }
  if (f.uniforme() < PART_DISPENSES && prep.regroupements.length > 0) {
    const n = prep.regroupements[f.entier(prep.regroupements.length)];
    sortie.nonEvaluations.push({ k: cle(g, p, n), g, p, n });
  }
  if (plan.quotaJokers > 0 && plan.jokerDefs.length > 0 && f.uniforme() < PART_JOKERS) {
    const defs = plan.jokerDefs.map((_, i) => i);
    for (let i = defs.length - 1; i > 0; i--) {
      const j = f.entier(i + 1);
      [defs[i], defs[j]] = [defs[j], defs[i]];
    }
    defs.slice(0, plan.quotaJokers).forEach((jokerDef, j) => {
      sortie.jokers.push({
        id: cle(g, p, j),
        g,
        p,
        jokerDef,
        justification: "joker généré",
        auteur: AUTEUR_GENERE,
        date: DATE_GENEREE,
      });
    });
  }
}

function genererAvec(preps: Preparation[], graine: number, reglages: ReglagesGeneration, p: number, sortie: SourcesGenerees) {
  const i = p - (reglages.premierP ?? 0);
  const numero = String(i + 1).padStart(3, "0");
  sortie.participants.push({ p, id: `gen-${numero}`, nom: `Participant ${numero}` });
  const nv = niveau(graine, p);
  for (const prep of preps) genererGrille(prep, p, graine, reglages, nv, sortie);
}

export function sourcesVidesGenerees(): SourcesGenerees {
  return { participants: [], cases: [], nonEvaluations: [], jokers: [] };
}

/** Sources de tous les participants générés, sur toutes les grilles (g = index dans `plans`). */
export function generer(plans: Plan[], graine: number, reglages: ReglagesGeneration): SourcesGenerees {
  const premier = reglages.premierP ?? 0;
  if (premier + reglages.participants > MAX_PARTICIPANTS)
    throw new Error(`au plus ${MAX_PARTICIPANTS} participants (clés des sources) : ${premier + reglages.participants} demandés`);
  const preps = plans.map((plan, g) => preparer(plan, g, graine));
  const sortie = sourcesVidesGenerees();
  for (let p = premier; p < premier + reglages.participants; p++) genererAvec(preps, graine, reglages, p, sortie);
  return sortie;
}

/** Sources d'un seul participant p, générées sans les autres. */
export function genererParticipant(plans: Plan[], graine: number, reglages: ReglagesGeneration, p: number): SourcesGenerees {
  const preps = plans.map((plan, g) => preparer(plan, g, graine));
  const sortie = sourcesVidesGenerees();
  genererAvec(preps, graine, reglages, p, sortie);
  return sortie;
}
