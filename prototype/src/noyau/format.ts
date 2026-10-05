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
  /** Présentation : « pourcentage » affiche v × 100 % (A01, `Points 0–1`). */
  presentation?: "pourcentage";
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
  /** F2 : seuil s, test ≥. F4 : seuil optionnel sur chaque entrée (sinon entrée binaire, OK = 1). */
  seuil?: number;
  /** Toute fonction : en dessous, « sans résultat ». Défaut 1. */
  minEntreesActives?: number;
  /** F4 : au moins k entrées réussies, ou « toutes » les entrées actives. */
  k?: number | "toutes";
  /** F5 : meilleure occurrence, ou dernière occurrence qui a un résultat. */
  mode?: "meilleure" | "derniere";
  /** F5 : plafond sur les occurrences de rang ≥ 2 (rang = ordre des `entrees`). */
  plafond?: number;
  /** F6 : nombre de valeurs hautes et basses retirées avant la moyenne. */
  kHautes?: number;
  kBasses?: number;
  /** F7 : pivot des écarts, facteur des écarts bas, nombre maximal d'insuffisantes (< pivot). */
  pivot?: number;
  facteurBas?: number;
  maxInsuffisantes?: number;
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
  /** Résultats attendus sous H4 strict (« toutes » sans résultat dès qu'une entrée l'est). */
  attendusH4Strict?: Record<string, number | null>;
  /** Une case saisie en plus des sources, et les résultats attendus ensuite. */
  apresSaisie?: { case: CaseFigee; attendus: Record<string, number | null> };
  erreursRemplissage: string[];
  /** Marques de joker attendues : ids des nœuds « joker appliqué » et « influencé ». */
  marques?: MarquesFigees;
  /** Les mêmes sources sans leurs jokers (Emma, Capucine). */
  attendusSansJoker?: Record<string, number | null>;
  /** H5b « cumulés » : jokers posés (définitions, dans l'ordre de pose) à la place des sources, résultats et marques. */
  jokersCumules?: { jokers: string[]; attendus: Record<string, number | null>; marques: MarquesFigees };
}

export interface MarquesFigees {
  jokerApplique: string[];
  influence: string[];
}

export interface FichierParticipants {
  grille: string;
  source: string;
  participants: ParticipantType[];
}

/** `g3-participants.json` : états de G3 (V1 à la copie, V2 juste après, V2 final). */
export interface FichierG3 {
  grille: string;
  source: string;
  etats: Record<"V1-copie" | "V2-copie" | "V2-final", { grille: string; participants: ParticipantType[] }>;
  /** Résultats sous un commutateur du modèle, depuis les sources d'un état. */
  commutateurs: {
    etat: "V1-copie" | "V2-copie" | "V2-final";
    nom: string;
    commutateurs: {
      f5Derniere?: boolean;
      f5SansPlafond?: boolean;
      feuilles1b?: "A" | "B" | "C";
      h4Strict?: boolean;
    };
    /** Présent : remplace les non-évaluations des sources de l'état. */
    nonEvaluations?: NonEvaluationFigee[];
    attendus: Record<string, number | null>;
    erreursRemplissage?: string[];
  }[];
  /** Chemins multiples de chaque structure, par id de grille. */
  cheminsMultiples: Record<
    string,
    { plusieursExigences: Record<string, string[]>; influenceMultiple: Record<string, string[]> }
  >;
}
