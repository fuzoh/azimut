// Session de l'essai : grilles compilées, sources TanStack DB, store.
// Ce ticket charge A01 et A03 avec leurs participants types (jeu « corpus » partiel).

import a01 from "@corpus/a01-structure.json";
import a01Participants from "@corpus/a01-participants.json";
import a03 from "@corpus/a03-structure.json";
import a03Participants from "@corpus/a03-participants.json";
import { compile, type Plan } from "./noyau/compile";
import type { FichierParticipants, Grille } from "./noyau/format";
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

const CORPUS: [unknown, unknown][] = [
  [a01, a01Participants],
  [a03, a03Participants],
];

export function creerSession(): Session {
  const sources = creerSources();
  const plans = CORPUS.map(([structure, participants], g) => {
    const plan = compile(structure as Grille);
    chargerParticipantsTypes(sources, g, plan, participants as FichierParticipants);
    return plan;
  });
  return { plans, sources, store: creerStoreProvisoire(sources, plans) };
}
