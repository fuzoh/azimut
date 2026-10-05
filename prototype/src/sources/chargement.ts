// Chargement des participants types figés dans les collections.

import type { Plan } from "../noyau/compile";
import type { FichierParticipants } from "../noyau/format";
import { cle } from "./cle";
import type { Sources } from "./collections";

function slug(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Ajoute les participants types d'une grille g. Les participants sont communs
 * aux grilles : un nom déjà présent garde son index p.
 */
export function chargerParticipantsTypes(sources: Sources, g: number, plan: Plan, fichier: FichierParticipants): void {
  let prochainJoker = Math.max(-1, ...sources.jokers.toArray.map((j) => j.id)) + 1;
  for (const pt of fichier.participants) {
    const id = slug(pt.nom);
    let p = sources.participants.toArray.find((l) => l.id === id)?.p;
    if (p === undefined) {
      p = sources.participants.size;
      sources.participants.insert({ p, id, nom: pt.nom });
    }
    const cases = pt.sources.cases.map((c) => {
      const d = plan.indexDonnee[plan.index.get(c.noeud) ?? -1] ?? -1;
      if (d < 0) throw new Error(`case sur un nœud sans case : ${c.noeud}`);
      return { k: cle(g, p, d), g, p, d, valeur: c.valeur };
    });
    if (cases.length > 0) sources.cases.insert(cases);
    for (const ne of pt.sources.nonEvaluations) {
      const n = plan.index.get(ne.noeud)!;
      const axe = ne.axe === undefined ? undefined : plan.grille.axes.findIndex((a) => a.id === ne.axe);
      sources.nonEvaluations.insert({ k: cle(g, p, n), g, p, n, axe });
    }
    for (const j of pt.sources.jokers) {
      const jokerDef = plan.indexJoker.get(j.jokerDef);
      if (jokerDef === undefined) throw new Error(`joker inconnu : ${j.jokerDef}`);
      sources.jokers.insert({ id: prochainJoker++, g, p, jokerDef, justification: j.justification, auteur: j.auteur, date: j.date });
    }
  }
}
