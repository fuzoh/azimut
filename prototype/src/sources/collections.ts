// Sources dans TanStack DB : collections en mémoire, clés en index denses,
// sans chaîne d'id dans les lignes (spec 20, « Sources dans TanStack DB »).

import { createCollection, localOnlyCollectionOptions } from "@tanstack/db";
import type { Plan } from "../noyau/compile";
import { type RaisonJoker, refusPose } from "../noyau/jokers";
import { cle } from "./cle";

export interface LigneParticipant {
  p: number;
  id: string;
  nom: string;
}

export interface LigneCase {
  k: number;
  g: number;
  p: number;
  d: number;
  /** Numérique : la note ; ordinal : le rang du palier. */
  valeur: number;
}

export interface LigneNonEvaluation {
  k: number;
  g: number;
  p: number;
  n: number;
  axe?: number;
}

export interface LigneJoker {
  id: number;
  g: number;
  p: number;
  /** Index de la définition dans `plan.jokerDefs`. */
  jokerDef: number;
  justification: string;
  auteur: string;
  date: string;
}

export function creerSources() {
  return {
    participants: createCollection(
      localOnlyCollectionOptions<LigneParticipant, number>({ id: "participants", getKey: (l) => l.p }),
    ),
    cases: createCollection(localOnlyCollectionOptions<LigneCase, number>({ id: "cases", getKey: (l) => l.k })),
    nonEvaluations: createCollection(
      localOnlyCollectionOptions<LigneNonEvaluation, number>({ id: "nonEvaluations", getKey: (l) => l.k }),
    ),
    jokers: createCollection(localOnlyCollectionOptions<LigneJoker, number>({ id: "jokers", getKey: (l) => l.id })),
  };
}

export type Sources = ReturnType<typeof creerSources>;

/** Saisit ou efface (NaN) une case. La vue écrit ici, jamais dans le store. */
export function ecrireCase(sources: Sources, g: number, p: number, d: number, valeur: number): void {
  const k = cle(g, p, d);
  const existe = sources.cases.has(k);
  if (Number.isNaN(valeur)) {
    if (existe) sources.cases.delete(k);
  } else if (existe) {
    sources.cases.update(k, (l) => {
      l.valeur = valeur;
    });
  } else {
    sources.cases.insert({ k, g, p, d, valeur });
  }
}

/**
 * Pose ou retire une non-évaluation sur n'importe quel nœud n : « non évalué »
 * sur une case, dispense sur un regroupement. `axe` (index) sert à 1b-C.
 * Rend true si la non-évaluation est posée après l'appel.
 */
export function basculerNonEvaluation(sources: Sources, g: number, p: number, n: number, axe?: number): boolean {
  const k = cle(g, p, n);
  if (sources.nonEvaluations.has(k)) {
    sources.nonEvaluations.delete(k);
    return false;
  }
  sources.nonEvaluations.insert(axe === undefined ? { k, g, p, n } : { k, g, p, n, axe });
  return true;
}

/** Auteur et date fixes d'un joker posé dans l'essai ; ignorés par le calcul. */
export const AUTEUR_JOKER = "formateur (prototype)";
export const DATE_JOKER = "2026-10-05";

/**
 * Pose un joker autorisé (index de définition) pour (g, p), après validation
 * à la pose (quota, H5a, H5b) dans le plan courant. `valeurNoeud` : résultat
 * courant du nœud autorisé (NaN = sans résultat). Rend la raison du refus, ou
 * null si le joker est posé.
 */
export function poserJoker(
  sources: Sources,
  plan: Plan,
  g: number,
  p: number,
  jokerDef: number,
  justification: string,
  valeurNoeud: number,
): RaisonJoker | "justification" | null {
  if (justification.trim() === "") return "justification";
  const poses = sources.jokers.toArray.filter((l) => l.g === g && l.p === p);
  const refus = refusPose(plan, poses, jokerDef, valeurNoeud);
  if (refus) return refus;
  const id = Math.max(-1, ...sources.jokers.toArray.map((l) => l.id)) + 1;
  sources.jokers.insert({ id, g, p, jokerDef, justification: justification.trim(), auteur: AUTEUR_JOKER, date: DATE_JOKER });
  return null;
}

/** Retire un joker posé, ce qui libère son quota. */
export function retirerJoker(sources: Sources, id: number): void {
  if (sources.jokers.has(id)) sources.jokers.delete(id);
}
