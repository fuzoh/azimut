// Analyse des runs (pure, testée sous Vitest) : marques des deux threads
// ramenées sur une même horloge, latence de recalcul décomposée, critères
// jugés sur le pire run (spec 20, « Scénarios de performance »).

export interface Marque {
  nom: string;
  /** Temps en ms, relatif au `performance.timeOrigin` de son thread (ou de la référence après `ramener`). */
  t: number;
  detail?: { version?: number; taille?: number } | null;
}

export interface MarquesThread {
  /** `performance.timeOrigin` du thread (ms depuis l'epoch). */
  origine: number;
  marques: Marque[];
}

/** Ramène les marques d'un thread sur l'horloge de la référence (la page) : t + origine − origineRef. */
export function ramener(thread: MarquesThread, origineRef: number): Marque[] {
  const decalage = thread.origine - origineRef;
  return thread.marques.map((m) => ({ ...m, t: m.t + decalage }));
}

/** Étapes de la chaîne de saisie, dans l'ordre (spec 20, « Latence décomposée »). */
export const ETAPES = [
  "evenement",
  "validation",
  "ecriture",
  "subscribeChanges",
  "envoi",
  "workerReception",
  "workerEnvoi",
  "retour",
  "commit",
  "peinture",
] as const;
export type Etape = (typeof ETAPES)[number];

export interface Saisie {
  /** Temps de chaque étape sur l'horloge de la page ; null si la marque manque (variante sans worker, saisie invalide). */
  etapes: Record<Etape, number | null>;
  /** Début et fin du calcul (copie du thread principal, ou horloge du worker relayée) ; null si absent. */
  calcul: [number, number] | null;
  version: number | null;
  /** Taille du lot envoyé au worker. */
  taille: number | null;
  /** Du `timeStamp` de l'événement qui valide à la peinture qui suit le dernier commit ; null si la chaîne est incomplète. */
  latence: number | null;
}

const NOMS: Record<Exclude<Etape, "evenement">, string> = {
  validation: "chaine:validation",
  ecriture: "chaine:ecriture",
  subscribeChanges: "chaine:subscribeChanges",
  envoi: "chaine:envoi",
  workerReception: "chaine:worker:reception",
  workerEnvoi: "chaine:worker:envoi",
  retour: "chaine:retour",
  commit: "chaine:commit",
  peinture: "chaine:peinture",
};

/**
 * Décompose chaque saisie validée au temps `evenements[i]` (timeStamp de la
 * touche Tab ou Entrée). Fenêtre d'une saisie : jusqu'au prochain événement.
 * Le lot de la saisie est le premier `subscribeChanges` après l'écriture ; ses
 * étapes suivantes portent sa version. La fin est le dernier commit après le
 * retour du worker (ou la fin du calcul sur le thread principal), avant le
 * premier lot ou résultat plus récent arrivé après ce résultat ; puis la
 * peinture qui suit ce commit.
 */
export function decomposerSaisies(marques: Marque[], evenements: number[]): Saisie[] {
  const triees = [...marques].sort((a, b) => a.t - b.t);
  const ev = [...evenements].sort((a, b) => a - b);
  const premiere = (nom: string, apres: number, avant: number, filtre: (m: Marque) => boolean = () => true) =>
    triees.find((m) => m.nom === nom && m.t >= apres && m.t < avant && filtre(m)) ?? null;
  return ev.map((e, i) => {
    const borne = i + 1 < ev.length ? ev[i + 1] : Infinity;
    const etapes = Object.fromEntries(ETAPES.map((x) => [x, null])) as Record<Etape, number | null>;
    etapes.evenement = e;
    const validation = premiere(NOMS.validation, e, borne);
    etapes.validation = validation?.t ?? null;
    const ecriture = validation && premiere(NOMS.ecriture, validation.t, borne);
    etapes.ecriture = ecriture?.t ?? null;
    const lot = ecriture && premiere(NOMS.subscribeChanges, ecriture.t, borne);
    etapes.subscribeChanges = lot?.t ?? null;
    const version = lot?.detail?.version ?? null;
    const memeVersion = (m: Marque) => m.detail?.version === version;
    const res: Saisie = { etapes, calcul: null, version, taille: null, latence: null };
    if (!lot || version === null) return res;
    // Les étapes après l'envoi ne sont pas bornées par l'événement suivant : à 200 ms d'intervalle, un retour peut le suivre.
    const envoi = premiere(NOMS.envoi, lot.t, Infinity, memeVersion);
    etapes.envoi = envoi?.t ?? null;
    res.taille = envoi?.detail?.taille ?? null;
    etapes.workerReception = premiere(NOMS.workerReception, lot.t, Infinity, memeVersion)?.t ?? null;
    etapes.workerEnvoi = premiere(NOMS.workerEnvoi, lot.t, Infinity, memeVersion)?.t ?? null;
    const debut = premiere("chaine:calcul:debut", lot.t - 1, Infinity, memeVersion);
    const fin = premiere("chaine:calcul:fin", lot.t, Infinity, memeVersion);
    if (debut && fin) res.calcul = [debut.t, fin.t];
    const retour = premiere(NOMS.retour, lot.t, Infinity, (m) => (m.detail?.version ?? -1) >= version);
    etapes.retour = retour?.t ?? null;
    const resultat = retour?.t ?? fin?.t ?? lot.t;
    // Fin de fenêtre : le prochain événement postérieur au résultat qui change l'affichage pour une
    // autre raison — un lot plus récent (passage « en calcul ») ou l'arrivée d'un résultat plus récent.
    // Un lot parti avant notre résultat (saisie distante pendant le calcul) ne ferme pas la fenêtre.
    const versionResultat = retour?.detail?.version ?? fin?.detail?.version ?? version;
    const nomResultat = retour ? NOMS.retour : "chaine:calcul:fin";
    const suivant = triees.find(
      (m) =>
        m.t > resultat &&
        ((m.nom === NOMS.subscribeChanges && (m.detail?.version ?? 0) > version) || (m.nom === nomResultat && (m.detail?.version ?? 0) > versionResultat)),
    );
    const limite = suivant?.t ?? Infinity;
    let commit: Marque | null = null;
    for (const m of triees) if (m.nom === NOMS.commit && m.t >= resultat && m.t < limite) commit = m;
    etapes.commit = commit?.t ?? null;
    const peinture = commit && premiere(NOMS.peinture, commit.t, Infinity);
    etapes.peinture = peinture?.t ?? null;
    res.latence = peinture ? peinture.t - e : null;
    return res;
  });
}

/** Percentile par rang le plus proche ; null pour une liste vide. */
export function percentile(xs: readonly number[], q: number): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))];
}

export const mediane = (xs: readonly number[]) => percentile(xs, 0.5);

// --- Critères ------------------------------------------------------------------------

export const SEUILS = { longtaskMs: 50, inpMs: 100, latenceP95Ms: 100 } as const;

export interface Fenetre {
  debut: number;
  fin: number;
}

export interface Tache {
  debut: number;
  duree: number;
}

export interface MesuresRun {
  scenario: string;
  fenetre: Fenetre;
  longtasks: Tache[];
  loaf: Tache[];
  /** Valeurs successives de l'INP rapportées par web-vitals (reportAllChanges). */
  inp: number[];
  saisies: Saisie[];
}

export interface ResumeRun {
  longtasks: number;
  longtaskMaxMs: number;
  loaf: number;
  inpMs: number | null;
  p95Ms: number | null;
  saisies: number;
  saisiesIncompletes: number;
  reussite: boolean;
  motifs: string[];
}

/** Scénarios jugés sur la latence de recalcul (saisies locales). */
export const AVEC_LATENCE = new Set(["saisie-rapide", "saisies-distantes"]);
/** Scénarios jugés aussi sur les frames longues (LoAF). */
export const AVEC_LOAF = new Set(["defilement"]);

const dans = (f: Fenetre) => (x: Tache) => x.debut >= f.debut && x.debut < f.fin;

export function resumerRun(m: MesuresRun): ResumeRun {
  const longtasks = m.longtasks.filter(dans(m.fenetre));
  const loaf = m.loaf.filter(dans(m.fenetre));
  const latences = m.saisies.flatMap((s) => (s.latence === null ? [] : [s.latence]));
  const inpMs = m.inp.length > 0 ? m.inp[m.inp.length - 1] : null;
  const p95Ms = percentile(latences, 0.95);
  const motifs: string[] = [];
  if (longtasks.length > 0) motifs.push(`${longtasks.length} longtask(s)`);
  if (inpMs !== null && inpMs >= SEUILS.inpMs) motifs.push(`INP ${Math.round(inpMs)} ms`);
  if (AVEC_LATENCE.has(m.scenario)) {
    if (p95Ms === null) motifs.push("aucune latence de recalcul mesurée");
    else if (p95Ms >= SEUILS.latenceP95Ms) motifs.push(`p95 ${Math.round(p95Ms)} ms`);
    // Une saisie sans latence sort du p95 : le signaler plutôt que de biaiser le p95 sans le dire.
    if (latences.length < m.saisies.length) motifs.push(`${m.saisies.length - latences.length} saisie(s) sans latence`);
  }
  if (AVEC_LOAF.has(m.scenario) && loaf.length > 0) motifs.push(`${loaf.length} LoAF`);
  return {
    longtasks: longtasks.length,
    longtaskMaxMs: Math.max(0, ...longtasks.map((x) => x.duree)),
    loaf: loaf.length,
    inpMs,
    p95Ms,
    saisies: m.saisies.length,
    saisiesIncompletes: m.saisies.length - latences.length,
    reussite: motifs.length === 0,
    motifs,
  };
}

export interface Cellule {
  config: string;
  scenario: string;
  runs: number;
  reussite: boolean;
  p95: { mediane: number | null; pire: number | null };
  inp: { mediane: number | null; pire: number | null };
  longtasks: { mediane: number | null; pire: number | null };
  loaf: { mediane: number | null; pire: number | null };
  saisiesIncompletes: { mediane: number | null; pire: number | null };
  motifs: string[];
}

const stat = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return { mediane: mediane(v), pire: v.length > 0 ? Math.max(...v) : null };
};

/** Une cellule configuration × scénario : réussite si le pire run passe, médiane et pire run. */
export function agreger(runs: { config: string; scenario: string; resume: ResumeRun }[]): Cellule[] {
  const groupes = new Map<string, typeof runs>();
  for (const r of runs) {
    const k = `${r.config}\u0000${r.scenario}`;
    groupes.set(k, [...(groupes.get(k) ?? []), r]);
  }
  return [...groupes.values()].map((g) => ({
    config: g[0].config,
    scenario: g[0].scenario,
    runs: g.length,
    reussite: g.every((r) => r.resume.reussite),
    p95: stat(g.map((r) => r.resume.p95Ms)),
    inp: stat(g.map((r) => r.resume.inpMs)),
    longtasks: stat(g.map((r) => r.resume.longtasks)),
    loaf: stat(g.map((r) => r.resume.loaf)),
    saisiesIncompletes: stat(g.map((r) => r.resume.saisiesIncompletes)),
    motifs: [...new Set(g.flatMap((r) => r.resume.motifs))],
  }));
}

/** Configurations alternées run par run : pour chaque répétition, chaque scénario, toutes les configurations. */
export function planifier<C, S>(configs: C[], scenarios: S[], chauffe: number, runs: number): { config: C; scenario: S; chauffe: boolean; repetition: number }[] {
  const plan: { config: C; scenario: S; chauffe: boolean; repetition: number }[] = [];
  for (let r = 0; r < chauffe + runs; r++)
    for (const scenario of scenarios) for (const config of configs) plan.push({ config, scenario, chauffe: r < chauffe, repetition: r });
  return plan;
}
