// Interface du store de notes (spec 20, « Store de notes »), commune aux variantes.

import type { CommutateursResolus } from "../noyau/compile";
import type { OptionsCopie } from "../noyau/copier";
import type { Explication } from "../noyau/explain";
import type { Grille } from "../noyau/format";
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

/** Résultats complets du store, relus pour le mode « vérification » (store asynchrone). */
export interface InstantaneStore {
  /** Version des sources prise en compte ; à comparer à `version()` au retour. */
  version: number;
  /** Par grille g : tableaux P × N (offset p × N + n). */
  grilles: { valeurs: Float64Array; causes: Uint8Array; marques: Uint8Array }[];
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
  /**
   * Bascule à chaud du modèle : les plans viennent d'être recompilés (même
   * tableau, mêmes index g). Purge les caches, recalcule ce qui est souscrit
   * et notifie ce qui change ; les sources sont conservées.
   */
  purger(): void;
  /** La colonne n de la grille g, un résultat par participant (tri, synthèses). */
  getCohort(g: number, n: number): readonly ResultatCellule[];
  subscribeCohort(g: number, n: number, rappel: () => void): () => void;
  /**
   * Copie de grille : appelée avant que la session n'écrive la nouvelle
   * grille g2 dans TanStack DB, puis `finCopie` après. Le worker exécute
   * `copier` de son côté ; le relais ignore alors les écritures de g2.
   */
  copier?(g: number, g2: number, structure: Grille, options: Omit<OptionsCopie, "commutateurs">, commutateurs: CommutateursResolus): void;
  finCopie?(): void;
  /** Store asynchrone : tous les résultats, pour le mode « vérification ». */
  instantane?(): Promise<InstantaneStore>;
  /** Store asynchrone : version courante des sources (lots envoyés). */
  version?(): number;
  /**
   * Store asynchrone : cellules souscrites (g, p, n) du store mince du thread
   * principal, que le mode « vérification » compare aussi à l'oracle.
   */
  cellulesSouscrites?(): Iterable<[g: number, p: number, n: number]>;
  dispose(): void;
}

/** Store qui rend un instantané complet et sait quand il est stable (variantes de #24/#25 : tests, vérification). */
export interface StoreVerifiable extends StoreNotes {
  /** Se résout quand plus rien n'est en vol (lots, intérêts, requêtes). */
  stable(): Promise<void>;
  version(): number;
  instantane(): Promise<InstantaneStore>;
}

/**
 * `useCohort` sur des souscriptions par cellule : une colonne = une cellule
 * par participant. Commun aux variantes.
 */
export function creerCohortes(
  store: Pick<StoreNotes, "getResult" | "subscribeResult">,
  participants: () => number,
): Pick<StoreNotes, "getCohort" | "subscribeCohort"> {
  const cohortes = new Map<string, { instantane: ResultatCellule[]; rappels: Set<() => void>; fin: (() => void)[] }>();
  /** Dernière colonne lue par (g, n) : rendue telle quelle si aucune cellule n'a changé (useSyncExternalStore). */
  const lues = new Map<string, ResultatCellule[]>();
  const lire = (g: number, n: number) => {
    const col = Array.from({ length: participants() }, (_, p) => store.getResult(g, p, n));
    const avant = lues.get(`${g}:${n}`);
    if (avant && avant.length === col.length && avant.every((x, i) => x === col[i])) return avant;
    lues.set(`${g}:${n}`, col);
    return col;
  };
  return {
    getCohort(g, n) {
      return cohortes.get(`${g}:${n}`)?.instantane ?? lire(g, n);
    },
    subscribeCohort(g, n, rappel) {
      const cle = `${g}:${n}`;
      let c = cohortes.get(cle);
      if (!c) {
        const nouvelle = { instantane: lire(g, n), rappels: new Set<() => void>(), fin: [] as (() => void)[] };
        const changer = () => {
          nouvelle.instantane = lire(g, n);
          for (const r of nouvelle.rappels) r();
        };
        for (let p = 0; p < participants(); p++) nouvelle.fin.push(store.subscribeResult(g, p, n, changer));
        cohortes.set(cle, nouvelle);
        c = nouvelle;
      }
      const co = c;
      co.rappels.add(rappel);
      return () => {
        co.rappels.delete(rappel);
        if (co.rappels.size === 0) {
          for (const f of co.fin) f();
          cohortes.delete(cle);
        }
      };
    },
  };
}
