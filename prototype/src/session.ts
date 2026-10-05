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
import { copier, type ElementRapport, type OptionsCopie, structureIdentique } from "./noyau/copier";
import type { SourcesParticipant } from "./noyau/evaluate";
import type { FichierG3, FichierParticipants, Grille } from "./noyau/format";
import { chargerParticipantsTypes } from "./sources/chargement";
import { cle } from "./sources/cle";
import { creerSources, type LigneCase, type LigneJoker, type LigneNonEvaluation, type Sources } from "./sources/collections";
import { creerStoreProvisoire } from "./store/storeProvisoire";
import type { StoreNotes } from "./store/store";

export interface Session {
  /** Plan de la grille g ; g = index dans la session. Une copie en ajoute un. */
  plans: Plan[];
  sources: Sources;
  store: StoreNotes;
  commutateurs: Commutateurs;
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
  return { plans, sources, store: creerStoreProvisoire(sources, plans), commutateurs };
}

/**
 * Bascule à chaud des commutateurs du modèle : recompile chaque grille de la
 * session (copies comprises, mêmes index g), puis purge les caches du store.
 * Les sources (cases, non-évaluations, jokers) sont conservées telles quelles.
 */
export function appliquerCommutateurs(session: Session, commutateurs: Commutateurs): void {
  const plans = session.plans.map((plan) => compile(plan.grille, commutateurs));
  plans.forEach((plan, g) => {
    session.plans[g] = plan;
  });
  session.commutateurs = commutateurs;
  session.store.purger();
}

/** Structures cibles proposées pour copier la grille g : celles qui en proviennent, et la copie à l'identique. */
export function ciblesCopie(session: Session, g: number): { libelle: string; structure: Grille }[] {
  const source = session.plans[g].grille;
  const corpus = CORPUS.map(([s]) => s as Grille).filter((s) => s.provenance?.grille === source.grille);
  return [
    ...corpus.map((s) => ({ libelle: s.grille, structure: s })),
    { libelle: "copie à l'identique", structure: structureIdentique(source) },
  ];
}

/** Sources de la grille g dans les collections, par participant. */
export function lireSourcesGrille(session: Pick<Session, "plans" | "sources">, g: number): Map<number, SourcesParticipant> {
  const plan = session.plans[g];
  const { sources } = session;
  const res = new Map<number, SourcesParticipant>();
  for (const { p } of sources.participants.toArray) {
    const cases = new Float64Array(plan.D);
    for (let d = 0; d < plan.D; d++) cases[d] = sources.cases.get(cle(g, p, d))?.valeur ?? NaN;
    res.set(p, {
      cases,
      nonEvaluations: sources.nonEvaluations.toArray.filter((l) => l.g === g && l.p === p).map((l) => ({ n: l.n, axe: l.axe })),
      jokers: sources.jokers.toArray.filter((l) => l.g === g && l.p === p).map((l) => ({ id: l.id, jokerDef: l.jokerDef })),
    });
  }
  return res;
}

/**
 * Action « copier » : copie la grille g vers `structure` ; la copie est une
 * nouvelle grille de la session (nouvel index g), indépendante de l'originale.
 */
export function copierGrille(
  session: Session,
  g: number,
  structure: Grille,
  options: Omit<OptionsCopie, "commutateurs"> = {},
): { g: number; rapport: ElementRapport[] } {
  const { plans, sources } = session;
  const g2 = plans.length;
  const v2: Grille = { ...structure, grille: `${structure.grille} · copie g${g2}` };
  const { sourcesV2, rapport } = copier(plans[g].grille, v2, lireSourcesGrille(session, g), {
    ...options,
    commutateurs: session.commutateurs,
  });
  const plan = compile(v2, session.commutateurs);
  plans.push(plan);
  const cases: LigneCase[] = [];
  const nonEvaluations: LigneNonEvaluation[] = [];
  const jokersV1 = new Map(sources.jokers.toArray.map((l) => [l.id, l]));
  const jokers: LigneJoker[] = [];
  let id = Math.max(-1, ...sources.jokers.toArray.map((l) => l.id)) + 1;
  for (const [p, s] of sourcesV2) {
    s.cases.forEach((valeur, d) => {
      if (!Number.isNaN(valeur)) cases.push({ k: cle(g2, p, d), g: g2, p, d, valeur });
    });
    for (const ne of s.nonEvaluations)
      nonEvaluations.push(ne.axe === undefined ? { k: cle(g2, p, ne.n), g: g2, p, n: ne.n } : { k: cle(g2, p, ne.n), g: g2, p, n: ne.n, axe: ne.axe });
    for (const j of s.jokers) {
      const l = jokersV1.get(j.id)!;
      jokers.push({ ...l, id: id++, g: g2, jokerDef: j.jokerDef });
    }
  }
  if (cases.length > 0) sources.cases.insert(cases);
  if (nonEvaluations.length > 0) sources.nonEvaluations.insert(nonEvaluations);
  if (jokers.length > 0) sources.jokers.insert(jokers);
  return { g: g2, rapport };
}
