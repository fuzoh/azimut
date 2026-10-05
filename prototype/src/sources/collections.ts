// Sources dans TanStack DB : collections en mémoire, clés en index denses,
// sans chaîne d'id dans les lignes (spec 20, « Sources dans TanStack DB »).

import { createCollection, localOnlyCollectionOptions } from "@tanstack/db";
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
