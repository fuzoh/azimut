// Mode « vérification » (spec 20, « Réglages ») : après chaque saisie, l'oracle
// recalcule tout (chaque nœud de chaque participant de chaque grille) et l'on
// compare avec ce que rend le store. Les écarts sont signalés, rien n'est corrigé.

import { memeValeur } from "./comparaison";
import { type Plan, TYPE_DONNEES } from "./noyau/compile";
import { evaluate, type SourcesParticipant } from "./noyau/evaluate";
import { lireSourcesGrille } from "./session";
import type { Sources } from "./sources/collections";
import type { ResultatCellule, StoreNotes } from "./store/store";

export interface EcartVerification {
  g: number;
  p: number;
  n: number;
  id: string;
  champ: "valeur" | "cause" | "marques" | "saisie";
  oracle: number;
  store: number;
}

export interface RapportVerification {
  /** Numéro de la vérification (1, 2, …). */
  numero: number;
  /** Cellules comparées (participants × nœuds × grilles), hors cellules « en calcul ». */
  comparees: number;
  /** Cellules « en calcul » au moment de la vérification, non comparées. */
  enCalcul: number;
  ecarts: EcartVerification[];
  dureeMs: number;
}

export interface ContexteVerification {
  plans: Plan[];
  sources: Sources;
  store: StoreNotes;
}

function comparerCellule(
  g: number,
  p: number,
  n: number,
  id: string,
  oracle: ResultatCellule,
  store: ResultatCellule,
  ecarts: EcartVerification[],
) {
  const ajouter = (champ: EcartVerification["champ"], o: number, s: number) => ecarts.push({ g, p, n, id, champ, oracle: o, store: s });
  if (!memeValeur(oracle.valeur, store.valeur)) ajouter("valeur", oracle.valeur, store.valeur);
  if (oracle.cause !== store.cause) ajouter("cause", oracle.cause, store.cause);
  if (oracle.marques !== store.marques) ajouter("marques", oracle.marques, store.marques);
  if (!Object.is(oracle.saisie, store.saisie)) ajouter("saisie", oracle.saisie, store.saisie);
}

/** Recalcul complet par l'oracle, comparé au store. Synchrone. */
export function verifier({ plans, sources, store }: ContexteVerification, numero = 0): RapportVerification {
  const debut = performance.now();
  const ecarts: EcartVerification[] = [];
  let comparees = 0;
  let enCalcul = 0;
  plans.forEach((plan, g) => {
    const parParticipant: Map<number, SourcesParticipant> = lireSourcesGrille({ plans, sources }, g);
    for (const [p, s] of parParticipant) {
      const r = evaluate(plan, s);
      for (let n = 0; n < plan.N; n++) {
        const obtenu = store.getResult(g, p, n);
        if (obtenu.enCalcul) {
          enCalcul++;
          continue;
        }
        comparees++;
        const d = plan.type[n] === TYPE_DONNEES ? plan.indexDonnee[n] : -1;
        const attendu = { valeur: r.valeurs[n], cause: r.causes[n], marques: r.marques[n], saisie: d >= 0 ? s.cases[d] : NaN, enCalcul: false };
        comparerCellule(g, p, n, plan.ids[n], attendu, obtenu, ecarts);
      }
    }
  });
  return { numero, comparees, enCalcul, ecarts, dureeMs: performance.now() - debut };
}

export interface Verification {
  /** Dernier rapport ; null avant la première vérification. */
  dernier(): RapportVerification | null;
  /** Vérifie tout de suite (après une bascule du modèle, par exemple). */
  maintenant(): RapportVerification;
  abonner(rappel: (r: RapportVerification) => void): () => void;
  arreter(): void;
}

/**
 * Vérifie après chaque lot de changements des sources, une fois que le store a
 * traité le sien (tâche suivante). Plusieurs lots rapprochés donnent une seule
 * vérification.
 */
const RELANCES_MAX = 40;
const DELAI_RELANCE_MS = 50;

export function creerVerification(contexte: () => ContexteVerification): Verification {
  let rapport: RapportVerification | null = null;
  let numero = 0;
  let planifiee: ReturnType<typeof setTimeout> | null = null;
  const rappels = new Set<(r: RapportVerification) => void>();
  // Stores asynchrones (#24/#25) : des cellules peuvent être « en calcul » au
  // moment de la vérification. On revérifie alors, un nombre borné de fois.
  let relances = 0;
  const verifierEtRelancer = () => {
    planifiee = null;
    rapport = verifier(contexte(), ++numero);
    if (rapport.enCalcul > 0 && relances < RELANCES_MAX) {
      relances++;
      planifiee = setTimeout(verifierEtRelancer, DELAI_RELANCE_MS);
    }
    for (const r of rappels) r(rapport);
    return rapport;
  };
  const maintenant = () => {
    if (planifiee !== null) clearTimeout(planifiee);
    relances = 0;
    return verifierEtRelancer();
  };
  const planifier = () => {
    // Un nouveau lot remplace une relance en attente (et remet le compteur à zéro).
    if (planifiee !== null) clearTimeout(planifiee);
    planifiee = setTimeout(maintenant, 0);
  };
  const { sources } = contexte();
  const tout = { includeInitialState: false } as const;
  const abonnements = [
    sources.cases.subscribeChanges(planifier, tout),
    sources.nonEvaluations.subscribeChanges(planifier, tout),
    sources.jokers.subscribeChanges(planifier, tout),
  ];
  return {
    dernier: () => rapport,
    maintenant,
    abonner(rappel) {
      rappels.add(rappel);
      return () => {
        rappels.delete(rappel);
      };
    },
    arreter() {
      if (planifiee !== null) clearTimeout(planifiee);
      for (const a of abonnements) a.unsubscribe();
      rappels.clear();
    },
  };
}
