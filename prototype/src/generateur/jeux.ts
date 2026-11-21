// Jeux de données (spec 20, « Générateur ») :
// - « corpus » : A01, A03, G3 V1 (état à la copie) et G3 V2 (état final) à leur
//   taille réelle, avec leurs participants types ; jeu de validation, inchangé ;
// - « charge » : 3 instances de G3 étendue, sans participants types ;
// - « perf » (ticket #28) : structures du corpus choisies explicitement, sans
//   extension ni participants types ; exactement P participants générés.

import a01 from "@corpus/a01-structure.json";
import a01Participants from "@corpus/a01-participants.json";
import a03 from "@corpus/a03-structure.json";
import a03Participants from "@corpus/a03-participants.json";
import g3Participants from "@corpus/g3-participants.json";
import g3v1 from "@corpus/g3-v1-structure.json";
import g3v2 from "@corpus/g3-v2-structure.json";
import type { FichierG3, FichierParticipants, Grille } from "../noyau/format";
import { etendre } from "./etendre";

export type Jeu = "corpus" | "charge" | "perf";

export interface GrilleDuJeu {
  structure: Grille;
  participantsTypes?: FichierParticipants;
  /**
   * Identifiant des flux du générateur pour cette grille (défaut : son index g).
   * Jeu « perf » : rang de la structure dans le catalogue, pour qu'une structure
   * reçoive les mêmes sources seule ou dans une session composite.
   */
  flux?: number;
}

const g3 = g3Participants as unknown as FichierG3;
export const etatG3 = (etat: keyof FichierG3["etats"]): FichierParticipants => ({
  grille: g3.etats[etat].grille,
  source: g3.source,
  participants: g3.etats[etat].participants,
});

export const STRUCTURES_CORPUS: Grille[] = [a01, a03, g3v1, g3v2] as unknown as Grille[];

/** Structures sélectionnables du jeu « perf », dans l'ordre canonique (celui du corpus). */
export const IDS_STRUCTURES = ["a01", "a03", "g3v1", "g3v2"] as const;
export type IdStructure = (typeof IDS_STRUCTURES)[number];

/**
 * Sélection de structures du jeu « perf » : ordre canonique, sans doublon,
 * non vide. `erreurs` liste les choix refusés (inconnus, doublons, liste vide).
 */
export function normaliserStructures(ids: readonly string[]): { structures: IdStructure[]; erreurs: string[] } {
  const erreurs: string[] = [];
  const vus = new Set<string>();
  for (const id of ids) {
    if (!(IDS_STRUCTURES as readonly string[]).includes(id)) erreurs.push(`structure inconnue : ${id} (attendu : ${IDS_STRUCTURES.join(" | ")})`);
    else if (vus.has(id)) erreurs.push(`structure en double : ${id}`);
    vus.add(id);
  }
  if (ids.length === 0) erreurs.push("aucune structure choisie");
  const structures = IDS_STRUCTURES.filter((id) => vus.has(id));
  return { structures: erreurs.length > 0 ? [] : structures, erreurs };
}

/** Nombre de jeux de clones de G3 étendue (≈ 1500 nœuds de données). */
export const FACTEUR_CHARGE = 6;
export const INSTANCES_CHARGE = 3;

/** G3 étendue : extension de G3 V2 (état final de la structure). */
export function g3Etendue(): Grille {
  return etendre(g3v2 as unknown as Grille, FACTEUR_CHARGE);
}

/** Nombre de grilles chargées au démarrage d'un jeu. */
export function nombreGrilles(jeu: Jeu, structures: readonly IdStructure[] = []): number {
  if (jeu === "corpus") return STRUCTURES_CORPUS.length;
  if (jeu === "charge") return INSTANCES_CHARGE;
  return structures.length;
}

export function grillesDuJeu(jeu: Jeu, structures: readonly IdStructure[] = []): GrilleDuJeu[] {
  if (jeu === "corpus") {
    const types = [a01Participants, a03Participants, etatG3("V1-copie"), etatG3("V2-final")] as FichierParticipants[];
    return STRUCTURES_CORPUS.map((structure, i) => ({ structure, participantsTypes: types[i] }));
  }
  if (jeu === "perf") {
    const { structures: choisies, erreurs } = normaliserStructures(structures);
    if (erreurs.length > 0) throw new Error(`jeu « perf » : ${erreurs.join(" ; ")}`);
    // Mêmes objets que le corpus (non étendus) : `ciblesCopie` retrouve G3 V2 depuis G3 V1.
    return choisies.map((id) => {
      const i = IDS_STRUCTURES.indexOf(id);
      return { structure: STRUCTURES_CORPUS[i], flux: i };
    });
  }
  const debut = performance.now();
  const etendue = g3Etendue();
  // Phase « extension de G3 » du démarrage (mesures).
  performance.measure("demarrage:extension", { start: debut, end: performance.now() });
  return Array.from({ length: INSTANCES_CHARGE }, (_, i) => ({
    structure: { ...etendue, grille: `${etendue.grille} #${i + 1}` },
  }));
}
