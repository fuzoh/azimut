// Interface du store de notes (spec 20, « Store de notes »), commune aux variantes.

import type { Explication } from "../noyau/explain";
import type { Graphe } from "../noyau/graphe";
import type { EtatRemplissage } from "../noyau/remplissage";

export type { EtatRemplissage };

export interface ResultatCellule {
  /** Valeur sur le barème de sortie ; NaN = sans résultat. */
  valeur: number;
  /** Cause d'un « sans résultat » (voir `CAUSE`). */
  cause: number;
  /** Marques : bit 0 « joker appliqué », bit 1 « influencé », bit 2 chemin multiple de 1a-B. */
  marques: number;
  /** Nœud de données : valeur stockée dans la case (conservée même non évaluée) ; NaN sinon ou vide. */
  saisie: number;
  enCalcul: boolean;
}

export interface StoreNotes {
  getResult(g: number, p: number, n: number): ResultatCellule;
  subscribeResult(g: number, p: number, n: number, rappel: () => void): () => void;
  getFillStatus(g: number, p: number): EtatRemplissage;
  subscribeFillStatus(g: number, p: number, rappel: () => void): () => void;
  /**
   * Tout changement des sources du participant (cases, non-évaluations,
   * jokers), même sans effet sur un résultat : l'explication et le graphe se
   * redemandent alors, sans souscrire à chaque cellule.
   */
  subscribeParticipant(g: number, p: number, rappel: () => void): () => void;
  /** Explication d'un résultat, rejouée à la demande (promesse : elle pourra venir d'un worker). */
  explain(g: number, p: number, n: number): Promise<Explication>;
  /** Graphe de propagation d'un participant. */
  graphe(g: number, p: number): Promise<Graphe>;
  dispose(): void;
}
