// Session de l'essai : grilles compilées, sources TanStack DB, store.
// Jeu « corpus » : A01, A03, G3 V1 (état à la copie) et G3 V2 (état final),
// avec leurs participants types, plus des participants générés (0 par défaut).
// Jeu « charge » : 3 × G3 étendue, participants générés seulement.

import { sommeControle } from "./generateur/controle";
import { generer, type ProfilRemplissage } from "./generateur/generer";
import { grillesDuJeu, type Jeu, STRUCTURES_CORPUS } from "./generateur/jeux";
import { type Commutateurs, compile, type Plan } from "./noyau/compile";
import { copier, type ElementRapport, type OptionsCopie, structureIdentique } from "./noyau/copier";
import type { SourcesParticipant } from "./noyau/evaluate";
import type { Grille } from "./noyau/format";
import { chargerParticipantsTypes } from "./sources/chargement";
import { cle, MAX_PARTICIPANTS } from "./sources/cle";
import { creerSources, type LigneCase, type LigneJoker, type LigneNonEvaluation, type Sources } from "./sources/collections";
import { creerStoreProvisoire } from "./store/storeProvisoire";
import type { StoreNotes } from "./store/store";

export interface Session {
  /** Plan de la grille g ; g = index dans la session. Une copie en ajoute un. */
  plans: Plan[];
  sources: Sources;
  store: StoreNotes;
  commutateurs: Commutateurs;
  jeu: Jeu;
  /** Somme de contrôle des sources au chargement (participants types et générés). */
  sommeControle: string;
}

export interface GenerationSession {
  jeu: Jeu;
  remplissage: ProfilRemplissage;
  graine: number;
  /** Participants générés (en plus des participants types du corpus). */
  participants: number;
}

export const GENERATION_PAR_DEFAUT: GenerationSession = { jeu: "corpus", remplissage: "milieu", graine: 1, participants: 0 };

/** Marque une phase du démarrage (mesures, spec 20 « Scénarios de performance »). */
function phase<T>(nom: string, f: () => T): T {
  const debut = `demarrage:${nom}:debut`;
  performance.mark(debut);
  const r = f();
  performance.measure(`demarrage:${nom}`, debut);
  return r;
}

export function creerSession(commutateurs: Commutateurs = {}, generation: GenerationSession = GENERATION_PAR_DEFAUT): Session {
  const grilles = phase("structures", () => grillesDuJeu(generation.jeu));
  const plans = phase("compile", () => grilles.map(({ structure }) => compile(structure, commutateurs)));
  let sources: Sources;
  if (generation.jeu === "charge") {
    const generees = phase("generation", () =>
      generer(plans, generation.graine, { remplissage: generation.remplissage, participants: generation.participants }),
    );
    sources = phase("insertion", () => creerSources(generees));
  } else {
    sources = creerSources();
    grilles.forEach(({ participantsTypes }, g) => {
      if (participantsTypes) chargerParticipantsTypes(sources, g, plans[g], participantsTypes);
    });
    const generees = phase("generation", () =>
      generer(plans, generation.graine, {
        remplissage: generation.remplissage,
        // Les participants types occupent les premiers index : on borne le reste.
        participants: Math.min(generation.participants, MAX_PARTICIPANTS - sources.participants.size),
        premierP: sources.participants.size,
      }),
    );
    phase("insertion", () => {
      if (generees.participants.length > 0) sources.participants.insert(generees.participants);
      if (generees.cases.length > 0) sources.cases.insert(generees.cases);
      if (generees.nonEvaluations.length > 0) sources.nonEvaluations.insert(generees.nonEvaluations);
      if (generees.jokers.length > 0) sources.jokers.insert(generees.jokers);
    });
  }
  const somme = phase("somme", () =>
    sommeControle({ cases: sources.cases.values(), nonEvaluations: sources.nonEvaluations.values(), jokers: sources.jokers.values() }),
  );
  return {
    plans,
    sources,
    store: creerStoreProvisoire(sources, plans),
    commutateurs,
    jeu: generation.jeu,
    sommeControle: somme,
  };
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
  const corpus = STRUCTURES_CORPUS.filter((s) => s.provenance?.grille === source.grille);
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
  for (const { p } of sources.participants.values()) {
    const cases = new Float64Array(plan.D);
    for (let d = 0; d < plan.D; d++) cases[d] = sources.cases.get(cle(g, p, d))?.valeur ?? NaN;
    res.set(p, { cases, nonEvaluations: [], jokers: [] });
  }
  // Un seul passage sur les non-évaluations et les jokers (jeu « charge »).
  for (const l of sources.nonEvaluations.values())
    if (l.g === g) res.get(l.p)?.nonEvaluations.push({ n: l.n, axe: l.axe });
  for (const l of sources.jokers.values()) if (l.g === g) res.get(l.p)?.jokers.push({ id: l.id, jokerDef: l.jokerDef });
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
