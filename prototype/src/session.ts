// Session de l'essai : grilles compilées, sources TanStack DB, store.
// Ce ticket ne charge que A03 et ses participants types.

import a03 from "@corpus/a03-structure.json";
import a03Participants from "@corpus/a03-participants.json";
import { compile, type Plan } from "./noyau/compile";
import type { FichierParticipants, Grille } from "./noyau/format";
import { chargerParticipantsTypes } from "./sources/chargement";
import { creerSources, type Sources } from "./sources/collections";
import { creerStoreProvisoire } from "./store/storeProvisoire";
import type { StoreNotes } from "./store/store";

export interface Session {
  plans: Plan[];
  sources: Sources;
  store: StoreNotes;
}

export function creerSession(): Session {
  const plans = [compile(a03 as unknown as Grille)];
  const sources = creerSources();
  chargerParticipantsTypes(sources, 0, plans[0], a03Participants as FichierParticipants);
  return { plans, sources, store: creerStoreProvisoire(sources, plans) };
}
