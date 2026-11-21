// Profil de données d'une session (ticket #28, « Rapports ») : ce que le
// harnais rapporte pour qu'un rapport dise sur quoi il a mesuré — jeu,
// structures et empreintes, effectif, volumes par grille, remplissage observé.
// Lu une fois par série, sur une page à part : rien ne s'exécute pendant un run.

import { empreinteStructure } from "../generateur/controle";
import { IDS_STRUCTURES, type IdStructure, type Jeu } from "../generateur/jeux";
import { TYPE_CALCUL, TYPE_DONNEES, TYPE_REGROUPEMENT } from "../noyau/compile";
import type { Session } from "../session";

export interface ProfilGrille {
  g: number;
  nom: string;
  /** Structure du catalogue (jeux « corpus » et « perf ») ; null pour G3 étendue. */
  structure: IdStructure | null;
  empreinte: string;
  /** Nœuds de données avec case (D). */
  donnees: number;
  calculs: number;
  regroupements: number;
  noeuds: number;
  axes: number;
  /** P × D, vides comprises. */
  casesPossibles: number;
  casesStockees: number;
  /** Non-évaluations posées sur une case. */
  nonEvaluations: number;
  /** Non-évaluations posées sur un regroupement ou un calcul (dispenses). */
  dispenses: number;
  jokers: number;
  /** casesStockees / casesPossibles. */
  remplissageObserve: number;
}

export interface ProfilSession {
  jeu: Jeu;
  structures: IdStructure[];
  participants: number;
  remplissage: string;
  graine: number;
  sommeControle: string;
  grilles: ProfilGrille[];
}

export function decrireProfil(session: Pick<Session, "plans" | "sources" | "generation" | "sommeControle">): ProfilSession {
  const { plans, sources, generation } = session;
  const P = sources.participants.size;
  const parGrille = plans.map(() => ({ cases: 0, nonEvaluations: 0, dispenses: 0, jokers: 0 }));
  for (const l of sources.cases.values()) if (parGrille[l.g]) parGrille[l.g].cases++;
  for (const l of sources.nonEvaluations.values()) {
    const c = parGrille[l.g];
    if (!c) continue;
    if (plans[l.g].type[l.n] === TYPE_DONNEES) c.nonEvaluations++;
    else c.dispenses++;
  }
  for (const l of sources.jokers.values()) if (parGrille[l.g]) parGrille[l.g].jokers++;
  const catalogue = (g: number): IdStructure | null => {
    if (generation.jeu === "perf") return generation.structures?.[g] ?? null;
    if (generation.jeu === "corpus") return IDS_STRUCTURES[g] ?? null;
    return null;
  };
  return {
    jeu: generation.jeu,
    structures: generation.structures ?? [],
    participants: P,
    remplissage: generation.remplissage,
    graine: generation.graine,
    sommeControle: session.sommeControle,
    grilles: plans.map((plan, g) => {
      let calculs = 0;
      let regroupements = 0;
      for (let n = 0; n < plan.N; n++) {
        if (plan.type[n] === TYPE_CALCUL) calculs++;
        else if (plan.type[n] === TYPE_REGROUPEMENT) regroupements++;
      }
      const c = parGrille[g];
      const casesPossibles = P * plan.D;
      return {
        g,
        nom: plan.grille.grille,
        structure: catalogue(g),
        empreinte: empreinteStructure(plan.grille),
        donnees: plan.D,
        calculs,
        regroupements,
        noeuds: plan.N,
        axes: plan.grille.axes.length,
        casesPossibles,
        casesStockees: c.cases,
        nonEvaluations: c.nonEvaluations,
        dispenses: c.dispenses,
        jokers: c.jokers,
        remplissageObserve: casesPossibles > 0 ? c.cases / casesPossibles : 0,
      };
    }),
  };
}
