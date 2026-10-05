// Lignes initiales d'une session (spec 20, « Worker », chargement initial) :
// participants types et participants générés. Fonction pure, exécutée des deux
// côtés avec la même graine : le thread principal en remplit TanStack DB, le
// worker ses tableaux compacts.

import { generer, type ProfilRemplissage, type SourcesGenerees, sourcesVidesGenerees } from "../generateur/generer";
import type { GrilleDuJeu, Jeu } from "../generateur/jeux";
import type { Plan } from "../noyau/compile";
import type { FichierParticipants } from "../noyau/format";
import { cle, MAX_PARTICIPANTS } from "./cle";

export interface GenerationSession {
  jeu: Jeu;
  remplissage: ProfilRemplissage;
  graine: number;
  /** Participants générés (en plus des participants types du corpus). */
  participants: number;
}

export const GENERATION_PAR_DEFAUT: GenerationSession = { jeu: "corpus", remplissage: "milieu", graine: 1, participants: 0 };

function slug(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Lignes des participants types, mêmes index que `chargerParticipantsTypes` :
 * un nom déjà vu garde son p ; jokers numérotés à la suite, grille par grille.
 */
export function lignesParticipantsTypes(entrees: { g: number; plan: Plan; fichier: FichierParticipants }[]): SourcesGenerees {
  const sortie = sourcesVidesGenerees();
  const parId = new Map<string, number>();
  let prochainJoker = 0;
  for (const { g, plan, fichier } of entrees) {
    for (const pt of fichier.participants) {
      const id = slug(pt.nom);
      let p = parId.get(id);
      if (p === undefined) {
        p = parId.size;
        parId.set(id, p);
        sortie.participants.push({ p, id, nom: pt.nom });
      }
      for (const c of pt.sources.cases) {
        const d = plan.indexDonnee[plan.index.get(c.noeud) ?? -1] ?? -1;
        if (d < 0) throw new Error(`case sur un nœud sans case : ${c.noeud}`);
        sortie.cases.push({ k: cle(g, p, d), g, p, d, valeur: c.valeur });
      }
      for (const ne of pt.sources.nonEvaluations) {
        const n = plan.index.get(ne.noeud)!;
        const k = cle(g, p, n);
        if (ne.axe === undefined) sortie.nonEvaluations.push({ k, g, p, n });
        else sortie.nonEvaluations.push({ k, g, p, n, axe: plan.grille.axes.findIndex((a) => a.id === ne.axe) });
      }
      for (const j of pt.sources.jokers) {
        const jokerDef = plan.indexJoker.get(j.jokerDef);
        if (jokerDef === undefined) throw new Error(`joker inconnu : ${j.jokerDef}`);
        sortie.jokers.push({ id: prochainJoker++, g, p, jokerDef, justification: j.justification, auteur: j.auteur, date: j.date });
      }
    }
  }
  return sortie;
}

/** Toutes les lignes initiales du jeu : participants types (corpus), puis participants générés. */
export function lignesInitiales(grilles: GrilleDuJeu[], plans: Plan[], generation: GenerationSession): SourcesGenerees {
  if (generation.jeu === "charge") return generer(plans, generation.graine, { remplissage: generation.remplissage, participants: generation.participants });
  const types = lignesParticipantsTypes(
    grilles.flatMap(({ participantsTypes }, g) => (participantsTypes ? [{ g, plan: plans[g], fichier: participantsTypes }] : [])),
  );
  const premierP = types.participants.length;
  const generees = generer(plans, generation.graine, {
    remplissage: generation.remplissage,
    // Les participants types occupent les premiers index : on borne le reste.
    participants: Math.min(generation.participants, MAX_PARTICIPANTS - premierP),
    premierP,
  });
  return {
    participants: [...types.participants, ...generees.participants],
    cases: [...types.cases, ...generees.cases],
    nonEvaluations: [...types.nonEvaluations, ...generees.nonEvaluations],
    jokers: [...types.jokers, ...generees.jokers],
  };
}
