// Session de l'essai : grilles compilées, sources TanStack DB, store.
// Jeu « corpus » : A01, A03, G3 V1 (état à la copie) et G3 V2 (état final),
// avec leurs participants types.

import a01 from "@corpus/a01-structure.json";
import a01Participants from "@corpus/a01-participants.json";
import a03 from "@corpus/a03-structure.json";
import a03Participants from "@corpus/a03-participants.json";
import g3Participants from "@corpus/g3-participants.json";
import g3v1 from "@corpus/g3-v1-structure.json";
import g3v2 from "@corpus/g3-v2-structure.json";
import { type Commutateurs, compile, type Plan } from "./noyau/compile";
import type { FichierG3, FichierParticipants, Grille } from "./noyau/format";
import { chargerParticipantsTypes } from "./sources/chargement";
import { creerSources, type Sources } from "./sources/collections";
import { creerStoreProvisoire } from "./store/storeProvisoire";
import type { StoreNotes } from "./store/store";

export interface Session {
  /** Plan de la grille g ; g = index dans la session. */
  plans: Plan[];
  sources: Sources;
  store: StoreNotes;
}

const g3 = g3Participants as unknown as FichierG3;
const etatG3 = (etat: keyof FichierG3["etats"]): FichierParticipants => ({
  grille: g3.etats[etat].grille,
  source: g3.source,
  participants: g3.etats[etat].participants,
});

const CORPUS: [unknown, unknown][] = [
  [a01, a01Participants],
  [a03, a03Participants],
  [g3v1, etatG3("V1-copie")],
  [g3v2, etatG3("V2-final")],
];

export function creerSession(commutateurs: Commutateurs = {}): Session {
  const sources = creerSources();
  const plans = CORPUS.map(([structure, participants], g) => {
    const plan = compile(structure as Grille, commutateurs);
    chargerParticipantsTypes(sources, g, plan, participants as FichierParticipants);
    return plan;
  });
  return { plans, sources, store: creerStoreProvisoire(sources, plans) };
}
