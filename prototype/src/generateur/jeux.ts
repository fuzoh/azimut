// Jeux de données (spec 20, « Générateur ») :
// - « corpus » : A01, A03, G3 V1 (état à la copie) et G3 V2 (état final) à leur
//   taille réelle, avec leurs participants types ;
// - « charge » : 3 instances de G3 étendue, sans participants types.

import a01 from "@corpus/a01-structure.json";
import a01Participants from "@corpus/a01-participants.json";
import a03 from "@corpus/a03-structure.json";
import a03Participants from "@corpus/a03-participants.json";
import g3Participants from "@corpus/g3-participants.json";
import g3v1 from "@corpus/g3-v1-structure.json";
import g3v2 from "@corpus/g3-v2-structure.json";
import type { FichierG3, FichierParticipants, Grille } from "../noyau/format";
import { etendre } from "./etendre";

export type Jeu = "corpus" | "charge";

export interface GrilleDuJeu {
  structure: Grille;
  participantsTypes?: FichierParticipants;
}

const g3 = g3Participants as unknown as FichierG3;
export const etatG3 = (etat: keyof FichierG3["etats"]): FichierParticipants => ({
  grille: g3.etats[etat].grille,
  source: g3.source,
  participants: g3.etats[etat].participants,
});

export const STRUCTURES_CORPUS: Grille[] = [a01, a03, g3v1, g3v2] as unknown as Grille[];

/** Nombre de jeux de clones de G3 étendue (≈ 1500 nœuds de données). */
export const FACTEUR_CHARGE = 6;
export const INSTANCES_CHARGE = 3;

/** G3 étendue : extension de G3 V2 (état final de la structure). */
export function g3Etendue(): Grille {
  return etendre(g3v2 as unknown as Grille, FACTEUR_CHARGE);
}

export function grillesDuJeu(jeu: Jeu): GrilleDuJeu[] {
  if (jeu === "corpus") {
    const types = [a01Participants, a03Participants, etatG3("V1-copie"), etatG3("V2-final")] as FichierParticipants[];
    return STRUCTURES_CORPUS.map((structure, i) => ({ structure, participantsTypes: types[i] }));
  }
  const etendue = g3Etendue();
  return Array.from({ length: INSTANCES_CHARGE }, (_, i) => ({
    structure: { ...etendue, grille: `${etendue.grille} #${i + 1}` },
  }));
}
