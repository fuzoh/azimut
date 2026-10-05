// Messages entre le thread principal et le worker (spec 20, « Worker »).

import type { CommutateursResolus } from "../noyau/compile";
import type { OptionsCopie } from "../noyau/copier";
import type { Grille } from "../noyau/format";
import type { EtatRemplissage } from "../noyau/remplissage";
import type { GenerationSession } from "../sources/initiales";

/**
 * Changements d'un lot. `distante` (dernier élément, 1) : saisie venue de la
 * synchronisation (simulateur), repérée par le relais.
 */
export type Changement =
  | ["case", g: number, p: number, d: number, valeur: number, distante?: 1]
  | ["nonEval", g: number, p: number, n: number, axe: number, distante?: 1]
  | ["nonEvalRetrait", g: number, p: number, n: number, distante?: 1]
  | ["joker", id: number, g: number, p: number, jokerDef: number, distante?: 1]
  | ["jokerRetrait", id: number, distante?: 1];

export type VersWorker =
  | { type: "init"; generation: GenerationSession; commutateurs: CommutateursResolus; lru: number }
  | { type: "lot"; version: number; changements: Changement[] }
  /** Intérêts : clés k(g, p, n) des cellules, et (g, p) (clé k(g, p, 0)) des états de remplissage. */
  | { type: "interets"; ajouts: number[]; retraits: number[]; remplissageAjouts: number[]; remplissageRetraits: number[] }
  | { type: "commutateurs"; version: number; commutateurs: CommutateursResolus }
  /** Copie de la grille g vers `structure` (déjà nommée), nouvelle grille d'index g2. */
  | { type: "copier"; g: number; g2: number; structure: Grille; options: Omit<OptionsCopie, "commutateurs">; commutateurs: CommutateursResolus }
  | { type: "explain"; id: number; g: number; p: number; n: number }
  | { type: "graphe"; id: number; g: number; p: number }
  /** Tous les résultats de toutes les grilles (mode « vérification »). */
  | { type: "instantane"; id: number };

/**
 * Cellules poussées, en colonnes (spec 20, « Worker », Cache : Float64Array
 * pour les valeurs, Uint8Array pour les marques) ; tampons transférés.
 * `cles[i]` : clé k(g, p, n) de la i-ème cellule.
 */
export interface CellulesEnvoyees {
  cles: Float64Array;
  valeurs: Float64Array;
  causes: Uint8Array;
  marques: Uint8Array;
}

/** Résultats complets d'une grille g : tableaux P × N. */
export interface InstantaneGrille {
  valeurs: Float64Array;
  causes: Uint8Array;
  marques: Uint8Array;
}

export type DepuisWorker =
  | { type: "pret"; somme: string; dureeMs: number }
  | {
      type: "resultats";
      /** Version des sources prise en compte (dernier lot reçu). */
      version: number;
      cellules: CellulesEnvoyees;
      remplissages: [gp: number, etat: EtatRemplissage][];
      /** (g, p) recalculés pour cette version (clé k(g, p, 0)) : fin de « en calcul ». */
      calcules: number[];
      /** Horloge commune (timeOrigin + now) : début et fin du calcul dans le worker. */
      calcul?: [debut: number, fin: number];
    }
  | { type: "reponse"; id: number; valeur: unknown }
  | { type: "instantane"; id: number; version: number; grilles: InstantaneGrille[] }
  | { type: "erreur"; message: string };

/** Canal vers le worker : un vrai `Worker`, ou le moteur en mémoire (tests). */
export interface Canal {
  envoyer(message: VersWorker): void;
  ecouter(rappel: (message: DepuisWorker) => void): void;
  fermer(): void;
}
