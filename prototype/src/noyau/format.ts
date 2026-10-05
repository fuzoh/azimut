// Format commun des grilles (spec 20, « Format d'entrée des grilles »).
// Les champs non nommés par la spec suivent les JSON du corpus (`bareme_sortie`).

export interface Palier {
  valeur: number;
  libelle: string;
  couleur?: string;
}

export interface BaremeNumerique {
  id: string;
  type: "numerique";
  libelle?: string;
  min: number;
  max: number;
  pas: number;
  colorations?: [number, number, string][];
}

export interface BaremeOrdinal {
  id: string;
  type: "ordinal";
  libelle?: string;
  /** Préréglage « binaire » : KO = 0, OK = 1, sans paliers explicites. */
  prereglage?: "binaire";
  paliers?: Palier[];
}

export type Bareme = BaremeNumerique | BaremeOrdinal;

export interface NoeudDonnees {
  id: string;
  type: "donnees";
  libelle: string;
  definition?: string;
  /** Absent : nœud de commentaire, sans case. */
  bareme?: string;
  obligatoire?: boolean;
  origine?: string;
}

export interface Entree {
  noeud: string;
  poids: number;
}

export type CodeFonction = "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "F7";

export interface ParametresFonction {
  /** F2 : seuil s, test ≥. */
  seuil?: number;
  /** Toute fonction : en dessous, « sans résultat ». Défaut 1. */
  minEntreesActives?: number;
  [autre: string]: unknown;
}

export interface NoeudCalcul {
  id: string;
  type: "calcul";
  libelle: string;
  definition?: string;
  fonction: CodeFonction;
  entrees: Entree[];
  params?: ParametresFonction;
  bareme_sortie?: string;
  /** Table affine par morceaux [[x, y], ...] vers le barème de sortie. */
  conversion?: [number, number][];
  /** Pas de l'arrondi propagé (1 ; 0,5 ; 0,1), demi vers le haut. */
  arrondi?: number;
  origine?: string;
}

export interface NoeudRegroupement {
  id: string;
  type: "regroupement";
  libelle: string;
  origine?: string;
}

export type Noeud = NoeudDonnees | NoeudCalcul | NoeudRegroupement;

export interface Placement {
  noeud: string;
  enfants?: Placement[];
}

export interface Axe {
  id: string;
  libelle: string;
  principal?: boolean | null;
  arbre: Placement[];
  origine?: string;
}

export type ActionJoker = { type: "ajout"; valeur: number } | { type: "seuil"; noeudSeuil: string };

export interface JokerAutorise {
  id: string;
  noeud: string;
  action: ActionJoker;
  libelle?: string;
  origine?: string;
}

export interface Grille {
  grille: string;
  source?: string;
  baremes: Bareme[];
  noeuds: Noeud[];
  axes: Axe[];
  decisif?: string;
  exigences?: {
    minimumParRegroupement?: { noeud: string; minActives: number }[];
  };
  jokers?: { quota: number; autorises: JokerAutorise[] };
  provenance?: { grille: string };
}

// Participants types figés par les scripts de contrôle Python.

export interface CaseFigee {
  noeud: string;
  /** Numérique : la note ; ordinal : le rang du palier (à partir de 0). */
  valeur: number;
}

export interface JokerFige {
  jokerDef: string;
  justification: string;
  auteur: string;
  date: string;
}

export interface NonEvaluationFigee {
  noeud: string;
  axe?: string;
}

export interface ParticipantType {
  nom: string;
  sources: { cases: CaseFigee[]; nonEvaluations: NonEvaluationFigee[]; jokers: JokerFige[] };
  /** Résultat attendu de chaque nœud de calcul ; null = sans résultat. */
  attendus: Record<string, number | null>;
  attendusSansArrondi?: Record<string, number | null>;
  /** Une case saisie en plus des sources, et les résultats attendus ensuite. */
  apresSaisie?: { case: CaseFigee; attendus: Record<string, number | null> };
  erreursRemplissage: string[];
}

export interface FichierParticipants {
  grille: string;
  source: string;
  participants: ParticipantType[];
}
