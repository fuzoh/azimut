// Mode « vérification » (spec 20, « Réglages ») : après chaque saisie, l'oracle
// recalcule tout (chaque nœud de chaque participant de chaque grille) et l'on
// compare avec ce que rend le store. Les écarts sont signalés, rien n'est corrigé.

import { memeValeur } from "./comparaison";
import { type Plan, TYPE_DONNEES } from "./noyau/compile";
import { evaluate, type SourcesParticipant } from "./noyau/evaluate";
import { lireSourcesGrille } from "./session";
import { cle } from "./sources/cle";
import type { Sources } from "./sources/collections";
import type { InstantaneStore, ResultatCellule, StoreNotes } from "./store/store";

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
  /** Store asynchrone : cellules souscrites du store mince, comparées en plus de l'instantané (comptées dans `comparees`). */
  souscrites: number;
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

/**
 * Recalcul complet par l'oracle, comparé au store. Synchrone. `instantane` :
 * résultats complets d'un store asynchrone (worker), lus à la place de
 * `getResult` ; la saisie se relit alors dans les sources. Les cellules
 * souscrites du store mince (thread principal) sont alors comparées en plus.
 */
export function verifier({ plans, sources, store }: ContexteVerification, numero = 0, instantane?: InstantaneStore): RapportVerification {
  const debut = performance.now();
  const ecarts: EcartVerification[] = [];
  let comparees = 0;
  let enCalcul = 0;
  /** Résultats de l'oracle par (g, p), relus pour les cellules souscrites. */
  const oracles = new Map<number, { r: ReturnType<typeof evaluate>; s: SourcesParticipant }>();
  const comparer = (g: number, p: number, n: number, obtenu: ResultatCellule) => {
    const plan = plans[g];
    const o = oracles.get(cle(g, p, 0));
    if (!o || n >= plan.N) return;
    if (obtenu.enCalcul) {
      enCalcul++;
      return;
    }
    comparees++;
    const d = plan.type[n] === TYPE_DONNEES ? plan.indexDonnee[n] : -1;
    const attendu = { valeur: o.r.valeurs[n], cause: o.r.causes[n], marques: o.r.marques[n], saisie: d >= 0 ? o.s.cases[d] : NaN, enCalcul: false };
    comparerCellule(g, p, n, plan.ids[n], attendu, obtenu, ecarts);
  };
  plans.forEach((plan, g) => {
    const parParticipant: Map<number, SourcesParticipant> = lireSourcesGrille({ plans, sources }, g);
    const i = instantane?.grilles[g];
    for (const [p, s] of parParticipant) {
      oracles.set(cle(g, p, 0), { r: evaluate(plan, s), s });
      for (let n = 0; n < plan.N; n++) {
        const d = plan.type[n] === TYPE_DONNEES ? plan.indexDonnee[n] : -1;
        comparer(
          g,
          p,
          n,
          i
            ? { valeur: i.valeurs[p * plan.N + n], cause: i.causes[p * plan.N + n], marques: i.marques[p * plan.N + n], saisie: d >= 0 ? s.cases[d] : NaN, enCalcul: false }
            : store.getResult(g, p, n),
        );
      }
    }
  });
  let souscrites = 0;
  if (instantane && store.cellulesSouscrites) {
    for (const [g, p, n] of store.cellulesSouscrites()) {
      souscrites++;
      comparer(g, p, n, store.getResult(g, p, n));
    }
  }
  return { numero, comparees, enCalcul, souscrites, ecarts, dureeMs: performance.now() - debut };
}

export interface Verification {
  /** Dernier rapport ; null avant la première vérification. */
  dernier(): RapportVerification | null;
  /** Vérifie tout de suite (après une bascule du modèle, par exemple). */
  maintenant(): RapportVerification | null;
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
  /** Store asynchrone : l'instantané demandé au worker, puis la comparaison ; relancée si les sources ont bougé entre-temps. */
  let demande = 0;
  const verifierAsynchrone = (ctx: ContexteVerification) => {
    const ma = ++demande;
    const version = ctx.store.version!();
    void ctx.store.instantane!().then((inst) => {
      if (ma !== demande || arretee) return;
      if (inst.version !== version || ctx.store.version!() !== version) {
        if (relances++ < RELANCES_MAX) planifiee = setTimeout(verifierEtRelancer, DELAI_RELANCE_MS);
        return;
      }
      rapport = verifier(contexte(), ++numero, inst);
      // Cellules souscrites encore « en calcul » (intérêt tout juste déclaré) : on revérifie.
      if (rapport.enCalcul > 0 && relances++ < RELANCES_MAX) planifiee = setTimeout(verifierEtRelancer, DELAI_RELANCE_MS);
      for (const r of rappels) r(rapport);
    });
  };
  let arretee = false;
  const verifierEtRelancer = () => {
    planifiee = null;
    const ctx = contexte();
    if (ctx.store.instantane) {
      verifierAsynchrone(ctx);
      return rapport;
    }
    rapport = verifier(ctx, ++numero);
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
      arretee = true;
      if (planifiee !== null) clearTimeout(planifiee);
      for (const a of abonnements) a.unsubscribe();
      rappels.clear();
    },
  };
}
