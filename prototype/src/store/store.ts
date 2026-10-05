// Interface du store de notes (spec 20, « Store de notes »), commune aux variantes.

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
  dispose(): void;
}
