// Interface du store de notes (spec 20, « Store de notes »), commune aux variantes.

export interface ResultatCellule {
  /** Valeur sur le barème de sortie ; NaN = sans résultat. */
  valeur: number;
  /** Cause d'un « sans résultat » (voir `CAUSE`). */
  cause: number;
  /** Marques : bit 0 « joker appliqué », bit 1 « influencé » (ticket des jokers). */
  marques: number;
  enCalcul: boolean;
}

export interface EtatRemplissage {
  erreurs: string[];
  provisoire: boolean;
}

export interface StoreNotes {
  getResult(g: number, p: number, n: number): ResultatCellule;
  subscribeResult(g: number, p: number, n: number, rappel: () => void): () => void;
  getFillStatus(g: number, p: number): EtatRemplissage;
  subscribeFillStatus(g: number, p: number, rappel: () => void): () => void;
  dispose(): void;
}
