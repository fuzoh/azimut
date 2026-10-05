// Essai : la session pilotée par ses réglages. L'URL fait foi au chargement ;
// les réglages du modèle, de la session et de la comparaison s'appliquent à
// chaud ; ceux du store et du générateur demandent un rechargement.

import { comparer, type EcartAB } from "./comparaison";
import { compile, type CommutateursResolus, type Plan } from "./noyau/compile";
import {
  classesChangees,
  demandeRechargement,
  ecrireUrl,
  lireUrl,
  type Reglages,
  type ReglagesStore,
} from "./reglages";
import { appliquerCommutateurs, creerSession, type FabriqueStore, lireSourcesGrille, type Session, storeProvisoire } from "./session";
import { creerVerification, type RapportVerification, type Verification } from "./verification";

export interface EtatEssai {
  reglages: Reglages;
  /** Paramètres d'URL inconnus ou invalides au chargement. */
  avertissements: string[];
  /** Dernier rapport du mode « vérification » ; null s'il est désactivé ou pas encore passé. */
  verification: RapportVerification | null;
  /** Change à chaque bascule à chaud : la vue relit les plans. */
  revision: number;
}

export interface ResultatChangement {
  /** URL complète des nouveaux réglages (`?…`). */
  url: string;
  /** true : réglage du store ou du générateur, la page doit être rechargée avec `url`. */
  rechargement: boolean;
}

export interface Essai {
  session: Session;
  etat(): EtatEssai;
  abonner(rappel: () => void): () => void;
  /** Applique à chaud ce qui peut l'être ; sinon rend `rechargement: true` sans rien changer. */
  changer(reglages: Reglages): ResultatChangement;
  /** Des saisies ont été faites depuis le chargement (confirmation avant rechargement). */
  aDesSaisies(): boolean;
  /** La comparaison est réservée au jeu « corpus ». */
  comparaisonDisponible(): boolean;
  /** Écarts A → B du participant affiché ; null sans comparaison. */
  comparer(g: number, p: number): Map<number, EcartAB> | null;
  dispose(): void;
}

export interface OptionsEssai {
  /**
   * Store selon les réglages de la classe Store (l'app : `fabriquePourReglages`).
   * Défaut : store provisoire, synchrone.
   */
  fabrique?: (r: ReglagesStore) => FabriqueStore;
}

export function creerEssai(search: string, options: OptionsEssai = {}): Essai {
  const { reglages: initiaux, avertissements } = lireUrl(search);
  const session = creerSession(initiaux.modele, initiaux.generateur, options.fabrique?.(initiaux.store) ?? storeProvisoire);
  let etat: EtatEssai = { reglages: initiaux, avertissements, verification: null, revision: 0 };
  const rappels = new Set<() => void>();
  const notifier = (maj: Partial<EtatEssai>) => {
    etat = { ...etat, ...maj };
    for (const r of rappels) r();
  };

  let saisies = 0;
  const compter = () => {
    saisies++;
  };
  const tout = { includeInitialState: false } as const;
  const compteurs = [
    session.sources.cases.subscribeChanges(compter, tout),
    session.sources.nonEvaluations.subscribeChanges(compter, tout),
    session.sources.jokers.subscribeChanges(compter, tout),
  ];

  let verification: Verification | null = null;
  const activerVerification = (active: boolean) => {
    if (active && !verification) {
      verification = creerVerification(() => session);
      verification.abonner((r) => notifier({ verification: r }));
      verification.maintenant();
    } else if (!active && verification) {
      verification.arreter();
      verification = null;
      notifier({ verification: null });
    }
  };
  activerVerification(initiaux.session.verification);

  /** Plans B par grille, recompilés à la demande (une copie ajoute une grille). */
  let plansB: { cle: string; plans: Plan[] } = { cle: "", plans: [] };
  const planB = (g: number, b: CommutateursResolus): Plan => {
    const cle = JSON.stringify(b);
    if (plansB.cle !== cle) plansB = { cle, plans: [] };
    plansB.plans[g] ??= compile(session.plans[g].grille, b);
    return plansB.plans[g];
  };

  const comparaisonDisponible = () => etat.reglages.generateur.jeu === "corpus";

  return {
    session,
    etat: () => etat,
    abonner(rappel) {
      rappels.add(rappel);
      return () => {
        rappels.delete(rappel);
      };
    },
    changer(nouveaux) {
      const url = ecrireUrl(nouveaux);
      if (demandeRechargement(etat.reglages, nouveaux)) return { url, rechargement: true };
      const classes = classesChangees(etat.reglages, nouveaux);
      if (classes.size === 0) return { url, rechargement: false };
      if (classes.has("modele")) appliquerCommutateurs(session, nouveaux.modele);
      etat = { ...etat, reglages: nouveaux };
      activerVerification(nouveaux.session.verification);
      // Une bascule du modèle n'est pas une saisie, mais l'oracle repasse.
      if (classes.has("modele") && verification) verification.maintenant();
      notifier({ revision: etat.revision + 1 });
      return { url, rechargement: false };
    },
    aDesSaisies: () => saisies > 0,
    comparaisonDisponible,
    comparer(g, p) {
      const b = etat.reglages.comparaison;
      if (!b || !comparaisonDisponible()) return null;
      const sources = lireSourcesGrille(session, g).get(p);
      if (!sources) return null;
      return comparer(session.plans[g], planB(g, b), sources);
    },
    dispose() {
      activerVerification(false);
      for (const c of compteurs) c.unsubscribe();
      session.store.dispose();
    },
  };
}
