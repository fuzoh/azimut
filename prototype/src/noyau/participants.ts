// Participants types figés → sources d'un participant pour l'oracle.

import type { Plan } from "./compile";
import { type SourcesParticipant, sourcesVides } from "./evaluate";
import type { ParticipantType } from "./format";

export function sourcesDepuisFige(plan: Plan, participant: ParticipantType): SourcesParticipant {
  const sources = sourcesVides(plan);
  for (const c of participant.sources.cases) {
    const n = plan.index.get(c.noeud);
    if (n === undefined || plan.indexDonnee[n] < 0) throw new Error(`case sur un nœud sans case : ${c.noeud}`);
    sources.cases[plan.indexDonnee[n]] = c.valeur;
  }
  for (const ne of participant.sources.nonEvaluations) {
    const n = plan.index.get(ne.noeud);
    if (n === undefined) throw new Error(`non-évaluation sur un nœud inconnu : ${ne.noeud}`);
    const axe = ne.axe === undefined ? undefined : plan.grille.axes.findIndex((a) => a.id === ne.axe);
    sources.nonEvaluations.push({ n, axe });
  }
  participant.sources.jokers.forEach((j, id) => {
    const jokerDef = plan.indexJoker.get(j.jokerDef);
    if (jokerDef === undefined) throw new Error(`joker inconnu : ${j.jokerDef}`);
    sources.jokers.push({ id, jokerDef });
  });
  return sources;
}
