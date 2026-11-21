// Rapport Markdown d'une série (spec 20, « Rapport » ; ticket #28) : population
// mesurée (profil de données, taux de bridage, instrumentation), volumes réels,
// conditions, machine, calibration et bridage du worker, tableau
// configurations × scénarios sur les runs valides, opérations et cadence,
// navigation avec et sans instanciation, défilement effectif, latence
// décomposée, mesures sans critère et garde-fou, balayage du N du LRU, runs
// invalides. Une série = une population : aucun verdict global n'en mélange deux.

import { type AxeDefilement, type Cellule, ETAPES, jugerDefilement, mediane, type Operations, resumerNavigation, type ResumeRun, type Saisie, SEUILS, type StatNavigation, type StatutCellule } from "./analyse";
import type { MemoireCibles } from "./cdp";
import type { ProfilDemande } from "./options";
import type { ChronoAction, MesureSansCritere } from "./scenarios";

export interface Calibration {
  /** Taux de bridage CPU de la série. */
  taux: number;
  /** null à ×1 : aucun ralentissement attendu, rien à calibrer. */
  ratioPage: number | null;
  ratioWorkerNatif: number | null;
  /** « natif » : le bridage de la page atteint le worker ; « logiciel » : `bridageWorker` ; « aucun » : série à ×1. */
  bridageWorker: "natif" | "logiciel" | "aucun" | null;
  ratioWorkerLogiciel: number | null;
  eventTiming: boolean;
  inpRapporte: boolean;
  reussite: boolean;
  motifs: string[];
  comparaisonModes: { mode: string; p95Ms: number | null; inpMs: number | null; longtasks: number | null; erreur?: string }[] | null;
  dureesMs: Record<string, number>;
}

export interface Machine {
  cpu: string;
  coeurs: number;
  ramGo: number;
  os: string;
  chrome: string;
  executable: string;
  mode: "fenêtre visible" | "nouveau headless";
  secteur: boolean | null;
  node: string;
  /** Versions des bibliothèques du prototype (node_modules). */
  versions?: Record<string, string>;
  commit: string;
}

/** Dimensions de la table au chargement (grille active). */
export interface Dimensions {
  grille: number;
  lignes: number;
  colonnes: number;
  lignesRendues: number;
  colonnesRendues: number;
  largeur: number;
  hauteur: number;
  debordementVertical: number;
  debordementHorizontal: number;
}

/** `ProfilSession` de `src/mesure/profil.ts`, relu dans la page. */
export interface ProfilSessionLu {
  jeu: string;
  structures: string[];
  participants: number;
  remplissage: string;
  graine: number;
  sommeControle: string;
  grilles: {
    g: number;
    nom: string;
    structure: string | null;
    empreinte: string;
    donnees: number;
    calculs: number;
    regroupements: number;
    noeuds: number;
    axes: number;
    casesPossibles: number;
    casesStockees: number;
    nonEvaluations: number;
    dispenses: number;
    jokers: number;
    remplissageObserve: number;
  }[];
}

export interface ProfilRapporte {
  id: string;
  categorie: "taille réelle" | "composite synthétique" | "charge historique";
  demande: ProfilDemande;
  /** URL de la configuration de base (les autres ne changent que la classe Store). */
  url: string;
  session: ProfilSessionLu;
  dimensions: Dimensions | null;
}

export interface RunJson {
  index: number;
  fichier: string;
  config: string;
  scenario: string;
  lru: number;
  chauffe: boolean;
  /** Run du balayage du N du LRU (hors tableau principal). */
  balayage: boolean;
  url: string;
  /** Taux du bridage logiciel du worker pour ce run (1 : aucun). */
  tauxBridageLogiciel: number;
  /** Un run invalide est rapporté, jamais agrégé. */
  valide: boolean;
  invalidite: string[];
  erreursPage: string[];
  delaisDepasses: number;
  /** Somme de contrôle des sources au chargement. */
  somme: string | null;
  statutWorker: string | null;
  dimensions: Dimensions | null;
  operations: Operations | null;
  defilement?: AxeDefilement[];
  nonApplicable: string[];
  resume: ResumeRun | null;
  saisies: Saisie[];
  actions: ChronoAction[];
  mesures: MesureSansCritere[];
  memoire: Record<string, MemoireCibles>;
  demarrage: Record<string, number>;
  constats: string[];
  erreur?: string;
}

export interface BalayageLru {
  lru: number;
  statut: StatutCellule;
  runsInvalides: number;
  actionsDansLru: number;
  actionsHorsLru: number;
  /** P ≤ N : toute la cohorte de la grille active tient dans le cache. */
  cohorteDansLeCache: boolean;
  latenceHorsLruMs: number | null;
  memoireWorkerParParticipantKo: number | null;
  memoireWorkerLruPleinMo: number | null;
  instanciationMsParParticipant: number | null;
}

export interface SerieJson {
  nom: string;
  date: string;
  fumee: boolean;
  /** « mesure » ; le mode diagnostic (traces, compteurs) viendra dans un ticket suivant. */
  instrumentation: "mesure";
  commande: string;
  profil: ProfilRapporte;
  options: Record<string, unknown>;
  machine: Machine;
  calibration: Calibration;
  runs: RunJson[];
  cellules: Cellule[];
  balayageLru: BalayageLru[];
}

const ms = (x: number | null | undefined) => (x === null || x === undefined ? "—" : `${Math.round(x)}`);
const mo = (o: number | null | undefined) => (o === null || o === undefined ? "—" : `${(o / 1048576).toFixed(1)}`);
const pct = (x: number) => `${(100 * x).toFixed(1)} %`;
const ligne = (cols: (string | number)[]) => `| ${cols.join(" | ")} |`;
const entete = (cols: string[]) => [ligne(cols), ligne(cols.map(() => "---"))];

const SYMBOLE: Record<StatutCellule, string> = { réussite: "✅", échec: "❌", incomplet: "⚠ incomplet", "non applicable": "non applicable", "non mesurée": "non mesurée" };

function cellule(c: Cellule | undefined): string {
  if (!c) return "—";
  const parts = [SYMBOLE[c.statut]];
  if (c.runs === 0) return parts.concat(c.invalides > 0 ? [`${c.invalides} run(s) invalide(s)`] : []).join(" · ");
  if (c.p95.pire !== null) parts.push(`p95 ${ms(c.p95.mediane)}/${ms(c.p95.pire)}`);
  if ((c.saisiesIncompletes.pire ?? 0) > 0) parts.push(`sans latence ${ms(c.saisiesIncompletes.pire)}`);
  parts.push(`INP ${ms(c.inp.mediane)}/${ms(c.inp.pire)}`);
  parts.push(`LT ${ms(c.longtasks.pire)}`);
  if (c.scenario === "defilement") parts.push(`LoAF ${ms(c.loaf.pire)}`);
  if (c.invalides > 0) parts.push(`${c.runs} valide(s), ${c.invalides} invalide(s)`);
  return parts.join(" · ");
}

/**
 * Médianes des écarts entre étapes, par configuration. Chaque écart part de la
 * dernière étape présente avant lui : sans worker, « retour → commit » se lit
 * depuis subscribeChanges (indiqué dans la cellule).
 */
function decomposition(runs: RunJson[], bridageLogiciel: boolean): string[] {
  const configs = [...new Set(runs.map((r) => r.config))];
  const intervalles = ETAPES.slice(1).map((e, i) => `${ETAPES[i]} → ${e}`);
  const lignes = [...entete(["Configuration", "saisies", "sans latence", ...intervalles, bridageLogiciel ? "calcul (worker non bridé)" : "calcul", "total"])];
  for (const config of configs) {
    const saisies = runs.filter((r) => r.valide && !r.balayage && r.config === config && !r.chauffe && r.scenario === "saisie-rapide").flatMap((r) => r.saisies);
    if (saisies.length === 0) continue;
    const ecarts = ETAPES.slice(1).map((e, i) => {
      const origines = new Set<string>();
      const v = saisies.flatMap((s) => {
        const b = s.etapes[e];
        if (b === null) return [];
        for (let j = i; j >= 0; j--) {
          const a = s.etapes[ETAPES[j]];
          if (a !== null) {
            origines.add(ETAPES[j]);
            return [b - a];
          }
        }
        return [];
      });
      if (v.length === 0) return "—";
      origines.delete(ETAPES[i]);
      return `${mediane(v)!.toFixed(1)}${origines.size > 0 ? ` (depuis ${[...origines].join("/")})` : ""}`;
    });
    const calcul = saisies.flatMap((s) => (s.calcul ? [s.calcul[1] - s.calcul[0]] : []));
    const total = saisies.flatMap((s) => (s.latence === null ? [] : [s.latence]));
    lignes.push(ligne([config, saisies.length, total.length < saisies.length ? saisies.length - total.length : 0, ...ecarts, calcul.length ? mediane(calcul)!.toFixed(1) : "—", total.length ? mediane(total)!.toFixed(1) : "—"]));
  }
  return lignes;
}

function medianeDe(runs: RunJson[], f: (r: RunJson) => number | null | undefined): number | null {
  const v = runs.map(f).filter((x): x is number => typeof x === "number");
  return mediane(v);
}

function profilMarkdown(s: SerieJson): string[] {
  const L: string[] = [];
  const p = s.profil;
  const d = p.demande;
  const grilleActive = p.session.grilles[d.grille];
  L.push("## Profil de données", "");
  L.push(
    `- Identifiant : \`${p.id}\` (${p.categorie})`,
    `- Jeu : ${d.jeu}${d.jeu === "perf" ? ` ; structures : ${d.structures.join(", ")}, non étendues` : " ; 3 × G3 étendue"}`,
    `- Effectif total : ${p.session.participants} participants générés (demandé : ${d.participants}) ; remplissage « ${d.remplissage} » ; graine ${d.graine}`,
    `- Grille active : ${d.grille}${grilleActive ? ` (${grilleActive.nom})` : ""}`,
    `- Somme de contrôle des sources : \`${p.session.sommeControle}\``,
    `- URL (configuration de base) : \`${p.url}\``,
    "",
  );
  if (p.categorie === "charge historique")
    L.push("Référence historique : jeu de charge à environ six fois la taille des grilles réelles. Ses verdicts ne remplacent pas ceux des profils de taille réelle, et inversement.", "");
  if (p.categorie === "composite synthétique")
    L.push("Session composite synthétique : plusieurs structures chargées ensemble pour éprouver le volume, pas une session de cours observée.", "");
  if (d.structures.includes("g3v1") && d.structures.includes("g3v2"))
    L.push("G3 V1 et G3 V2 simultanées : scénario explicite, sources générées indépendamment pour chacune (ce n'est pas une copie V1 → V2).", "");
  L.push("Cohorte synthétique : la distribution des notes vient du générateur, elle n'est pas une observation de cours réels.", "");
  L.push(
    ...entete(["g", "Grille", "structure", "empreinte", "données (D)", "calculs", "regroupements", "axes", "cases possibles", "cases stockées", "remplissage observé", "non-évaluations", "dispenses", "jokers"]),
  );
  for (const g of p.session.grilles)
    L.push(
      ligne([
        g.g,
        g.nom,
        g.structure ?? "—",
        `\`${g.empreinte}\``,
        g.donnees,
        g.calculs,
        g.regroupements,
        g.axes,
        g.casesPossibles,
        g.casesStockees,
        pct(g.remplissageObserve),
        g.nonEvaluations,
        g.dispenses,
        g.jokers,
      ]),
    );
  L.push("");
  const dim = p.dimensions;
  if (dim)
    L.push(
      `Dimensions visibles au chargement (grille active, viewport ${(s.options.viewport as { width: number }).width} × ${(s.options.viewport as { height: number }).height}) : table ${dim.lignes} lignes × ${dim.colonnes} colonnes, ${dim.lignesRendues} × ${dim.colonnesRendues} rendues ; débordement vertical ${dim.debordementVertical} px, horizontal ${dim.debordementHorizontal} px.`,
      "",
    );
  return L;
}

function calibrationMarkdown(c: Calibration): string[] {
  const L: string[] = ["## Calibration", ""];
  if (c.taux > 1)
    L.push(
      `- Ratio ×${c.taux} / ×1, thread principal : ${c.ratioPage?.toFixed(2) ?? "—"} (accepté entre ${(0.75 * c.taux).toFixed(2)} et ${(1.25 * c.taux).toFixed(2)})`,
      `- Ratio ×${c.taux} / ×1, worker, bridage de la page seul : ${c.ratioWorkerNatif?.toFixed(2) ?? "—"}`,
      `- Bridage du worker retenu : ${c.bridageWorker ?? "—"}${c.ratioWorkerLogiciel !== null ? ` (ratio avec bridage logiciel : ${c.ratioWorkerLogiciel.toFixed(2)})` : ""}`,
    );
  else L.push("- Série à ×1 : aucun bridage, aucun ralentissement attendu ; les ratios ne s'appliquent pas. Durées de référence relevées pour comparaison.");
  L.push(
    `- Touche Playwright → entrée Event Timing : ${c.eventTiming ? "oui" : "non"} ; INP rapporté par web-vitals : ${c.inpRapporte ? "oui" : "non"}`,
    `- Durées du calcul de calibration (ms) : ${Object.entries(c.dureesMs).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(", ")}`,
    `- Résultat : ${c.reussite ? "réussie" : `échec (${c.motifs.join(" ; ")})`}`,
  );
  if (c.comparaisonModes) {
    L.push("", "Comparaison fenêtre visible / nouveau headless (saisie rapide, configuration de base, un run) :", "");
    L.push(...entete(["Mode", "p95 (ms)", "INP (ms)", "longtasks", "erreur"]));
    for (const m of c.comparaisonModes) L.push(ligne([m.mode, ms(m.p95Ms), ms(m.inpMs), ms(m.longtasks), m.erreur ?? ""]));
  } else L.push("- Comparaison fenêtre visible / nouveau headless : non faite dans cette série (`--comparer-modes`).");
  L.push("");
  if (c.bridageWorker === "logiciel") {
    L.push("### Bridage du worker : mécanisme et limites", "");
    L.push(
      "Le bridage CPU de la page (`Emulation.setCPUThrottlingRate`) n'atteint pas le worker dédié, et Chrome refuse cette commande sur la cible worker. Le worker est donc ralenti par logiciel (`bridageWorker` dans l'URL, `src/store/worker/worker.ts`) : après chaque message traité et chaque minuterie du moteur, une attente active de (taux − 1) × la durée du traitement, puis l'envoi des messages produits.",
      "",
      "Limites :",
      "",
      "- ni le ramasse-miettes, ni la sérialisation (structured clone) et le transfert des messages, ni l'attente dans la file des messages ne sont ralentis ;",
      "- l'attente suit le calcul : elle compte dans « workerReception → workerEnvoi », et la fenêtre `calcul` mesurée par le moteur reste à vitesse native ;",
      "- un message reçu pendant l'attente attend la fin de celle-ci, comme sous un vrai bridage, mais l'ordonnancement fin du thread n'est pas reproduit ;",
      "- la précision dépend de la granularité de `performance.now()` dans le worker ; le ratio est vérifié une fois, à la calibration, sur un calcul fixe.",
      "",
    );
  }
  return L;
}

function operationsMarkdown(principaux: RunJson[], configs: string[]): string[] {
  const L: string[] = ["## Opérations exécutées et cadence", ""];
  L.push(
    "Par configuration et scénario, sur les runs valides hors chauffe : opérations exécutées / prévues (pire run), durée, et pour la saisie rapide la cadence obtenue (visée : une validation toutes les 200 ms). Un pilote plus lent que la cadence visée se voit ici, pas dans les critères.",
    "",
  );
  L.push(...entete(["Configuration", "Scénario", "runs valides", "opérations (pire run)", "durée médiane (s)", "intervalle moyen médian / pire (ms)", "validations en retard (pire)", "retard max (ms)", "détails", "non applicable"]));
  for (const config of configs)
    for (const sc of [...new Set(principaux.map((r) => r.scenario))]) {
      const runs = principaux.filter((r) => r.config === config && r.scenario === sc && !r.chauffe && r.valide && r.operations);
      if (runs.length === 0) continue;
      const ops = runs.map((r) => r.operations!);
      const pire = ops.reduce((a, b) => (b.executees / Math.max(1, b.prevues) < a.executees / Math.max(1, a.prevues) ? b : a));
      const cad = ops.flatMap((x) => (x.cadence ? [x.cadence] : []));
      const details = [...new Set(ops.flatMap((x) => Object.keys(x.details ?? {})))].map((k) => `${k} ${ms(mediane(ops.map((x) => x.details?.[k] ?? 0)))}`);
      L.push(
        ligne([
          config,
          sc,
          runs.length,
          `${pire.executees}/${pire.prevues}`,
          (mediane(ops.map((x) => x.dureeMs))! / 1000).toFixed(1),
          cad.length ? `${ms(mediane(cad.map((x) => x.intervalleMoyenMs)))} / ${ms(Math.max(...cad.map((x) => x.intervalleMoyenMs)))}` : "—",
          cad.length ? Math.max(...cad.map((x) => x.enRetard)) : "—",
          cad.length ? ms(Math.max(...cad.map((x) => x.retardMaxMs))) : "—",
          details.join(", ") || "—",
          [...new Set(runs.flatMap((r) => r.nonApplicable))].join(" ; ") || "—",
        ]),
      );
    }
  L.push("");
  return L;
}

const nav = (x: StatNavigation | null) => (x ? `${x.n} · ${ms(x.mediane)} / ${ms(x.pire)}` : "non mesurée");

function navigationMarkdown(principaux: RunJson[], configs: string[]): string[] {
  const L: string[] = ["## Navigation avec et sans instanciation", ""];
  L.push(
    "Une action « avec instanciation » a créé au moins une instance de participant pendant le choix du participant (observé, pas supposé). Cellule : nombre d'actions · médiane / pire (ms). « non mesurée » : aucune action de cette catégorie, par exemple quand toute la cohorte tient dans le cache ; ce n'est pas une réussite.",
    "",
  );
  L.push(...entete(["Configuration", "Scénario", "action", "sans instanciation", "avec instanciation"]));
  for (const config of configs)
    for (const sc of ["changement-participant", "ouverture-graphe"]) {
      const actions = principaux.filter((r) => r.config === config && r.scenario === sc && !r.chauffe && r.valide).flatMap((r) => r.actions);
      for (const [type, n] of Object.entries(resumerNavigation(actions))) L.push(ligne([config, sc, type, nav(n.sansInstanciation), nav(n.avecInstanciation)]));
    }
  L.push("");
  const autres = ["changement-axe-vue"];
  L.push("### Changement d'axe et de vue", "");
  L.push(...entete(["Configuration", "type", "n", "médiane (ms)", "pire (ms)"]));
  for (const config of configs)
    for (const sc of autres) {
      const actions = principaux.filter((r) => r.config === config && r.scenario === sc && !r.chauffe && r.valide).flatMap((r) => r.actions);
      for (const type of [...new Set(actions.map((a) => a.type))]) {
        const v = actions.filter((a) => a.type === type).map((a) => a.latence);
        L.push(ligne([config, type, v.length, ms(mediane(v)), ms(Math.max(...v))]));
      }
    }
  L.push("");
  return L;
}

function defilementMarkdown(principaux: RunJson[]): string[] {
  const runs = principaux.filter((r) => r.scenario === "defilement" && !r.chauffe && r.defilement);
  if (runs.length === 0) return [];
  const L: string[] = ["## Défilement : déplacement effectif", ""];
  L.push("Par run : débordement possible et plus grand déplacement obtenu (px). Un axe sans débordement est « non applicable » ; un débordement sans déplacement invalide le run.", "");
  L.push(...entete(["Run", "Configuration", "axe", "débordement", "déplacement", "événements molette", "statut"]));
  for (const r of runs) {
    const j = jugerDefilement(r.defilement!);
    r.defilement!.forEach((a, i) => L.push(ligne([r.index, r.config, a.axe, Math.round(a.debordement), Math.round(a.deplacement), a.evenements, j.parAxe[i].statut])));
  }
  L.push("");
  return L;
}

export function rapportMarkdown(s: SerieJson): string {
  const L: string[] = [];
  const principaux = s.runs.filter((r) => !r.balayage);
  const configs = [...new Set(principaux.map((r) => r.config))];
  const scenarios = [...new Set(s.cellules.map((c) => c.scenario))];
  const c = s.calibration;
  L.push(`# Série de mesures ${s.nom}`, "");
  const validationHarnais = s.fumee || s.options.court === true || s.machine.mode !== "fenêtre visible";
  if (validationHarnais)
    L.push(
      "> **Validation du harnais, pas un verdict de performance du produit.** Cette série vérifie que le harnais pilote la session et produit ses mesures ; ses chiffres ne jugent ni le moteur ni les critères.",
      "",
    );
  if (s.machine.mode !== "fenêtre visible")
    L.push("> **Série en nouveau headless : ses chiffres ne comptent pas.** Les critères se jugent en fenêtre visible (spec 20, « Conditions »).", "");
  if (s.fumee) L.push("> Série de fumée : 1 run par scénario et par configuration, sans run de chauffe.", "");
  if (s.options.court === true) L.push("> Déroulés raccourcis (`--court`) : moins d'opérations que le protocole.", "");
  if (!c.reussite) L.push(`> **Calibration en échec** : ${c.motifs.join(" ; ")}.`, "");
  L.push(
    `> Population : **${s.profil.categorie}**, profil \`${s.profil.id}\`, bridage ×${c.taux}, instrumentation « ${s.instrumentation} ». Les verdicts ci-dessous valent pour cette population seule : ils ne se combinent ni avec une autre catégorie (taille réelle, composite synthétique, charge historique), ni avec un autre taux, et chaque configuration est jugée à part.`,
    "",
  );
  L.push(...profilMarkdown(s));
  L.push("## Conditions", "");
  L.push(
    `- Date : ${s.date}`,
    `- Mode : ${s.machine.mode}`,
    `- Commande : \`${s.commande}\``,
    `- Options : \`${JSON.stringify(s.options)}\``,
    `- Commit : ${s.machine.commit}`,
    "",
  );
  L.push("## Machine", "");
  L.push(
    `- CPU : ${s.machine.cpu} (${s.machine.coeurs} cœurs logiques)`,
    `- RAM : ${s.machine.ramGo} Go`,
    `- OS : ${s.machine.os}`,
    `- Chrome : ${s.machine.chrome} (\`${s.machine.executable}\`)`,
    `- Sur secteur : ${s.machine.secteur === null ? "inconnu" : s.machine.secteur ? "oui" : "non"}`,
    `- Harnais : ${s.machine.node}`,
  );
  if (s.machine.versions) L.push(`- Versions : ${Object.entries(s.machine.versions).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  L.push("");
  L.push(...calibrationMarkdown(c));
  L.push("## Critères : configurations × scénarios", "");
  L.push(
    `Jugés sur le pire run valide : zéro longtask > ${SEUILS.longtaskMs} ms, INP < ${SEUILS.inpMs} ms, latence de recalcul p95 < ${SEUILS.latenceP95Ms} ms (saisies), zéro LoAF (défilement). Cellule : statut, p95 et INP en ms (médiane/pire run), longtasks du pire run. Un run invalide (erreur, erreur de page, délai de stabilité dépassé, scénario incomplet, mesure manquante, sources différentes) est exclu des agrégats : la cellule devient « incomplet » si aucun run valide n'échoue. « non applicable » : le scénario n'a rien pu exercer (défilement sans débordement).`,
    "",
  );
  L.push(...entete(["Configuration", ...scenarios]));
  for (const config of configs) L.push(ligne([config, ...scenarios.map((sc) => cellule(s.cellules.find((x) => x.config === config && x.scenario === sc)))]));
  const aExpliquer = s.cellules.filter((x) => x.statut !== "réussite");
  if (aExpliquer.length > 0) {
    L.push("", "Motifs :", "");
    for (const e of aExpliquer) L.push(`- ${e.config} / ${e.scenario} (${e.statut}) : ${e.motifs.join(", ") || "—"}`);
  }
  L.push("");
  L.push(...operationsMarkdown(principaux, configs));
  L.push(...navigationMarkdown(principaux, configs));
  L.push(...defilementMarkdown(principaux));
  L.push("## Latence décomposée (saisie rapide)", "");
  L.push(
    "Médiane des écarts entre étapes successives (ms), runs valides, marques des deux threads ramenées à l'horloge de la page par `performance.timeOrigin`. `calcul` : début et fin du calcul (worker ou thread principal). Les médianes des étapes ne s'additionnent pas pour reconstituer une latence.",
    "",
  );
  if (c.bridageWorker === "logiciel")
    L.push(
      "Bridage logiciel du worker : l'attente active suit le calcul et précède `workerEnvoi`, elle compte dans « workerReception → workerEnvoi » ; la colonne `calcul` (fenêtre mesurée par le moteur) reste à vitesse native.",
      "",
    );
  L.push(...decomposition(s.runs, c.bridageWorker === "logiciel"));
  L.push("", "## Mesures sans critère", "");
  L.push("### Démarrage par phases (médiane des runs valides, ms)", "");
  const phases = ["structures", "extension", "compile", "generation", "insertion", "somme", "worker-pret", "table-peinte"];
  L.push(...entete(["Configuration", ...phases]));
  for (const config of configs) {
    const runs = principaux.filter((r) => r.config === config && r.valide);
    L.push(ligne([config, ...phases.map((ph) => ms(medianeDe(runs, (r) => r.demarrage[ph])))]));
  }
  L.push("", "`worker-pret` et `table-peinte` : instants depuis le début de la navigation ; les autres : durées. `extension` n'existe que pour le jeu de charge.", "");
  L.push("### Mémoire par cible (Mo, après GC, médiane des runs valides)", "");
  L.push("Tas JS utilisé + stockage des ArrayBuffer (`Runtime.getHeapUsage` : `usedSize + backingStorageSize`).", "");
  L.push(...entete(["Configuration", "page chargement", "worker chargement", "page LRU plein", "worker LRU plein", "page fin", "worker fin"]));
  for (const config of configs) {
    const runs = principaux.filter((r) => r.config === config && r.valide);
    const m = (point: string, cible: "page" | "worker") =>
      mo(medianeDe(runs, (r) => {
        const t = r.memoire[point]?.[cible];
        return t ? t.usedSize + t.backingStorageSize : null;
      }));
    L.push(ligne([config, m("chargement", "page"), m("chargement", "worker"), m("lru-plein", "page"), m("lru-plein", "worker"), m("fin", "page"), m("fin", "worker")]));
  }
  L.push("", "### Écritures en série, copies de grille, bascule du modèle", "");
  L.push("Sur la grille active. `copie-grille` : copie à l'identique ; `copie-grille-provenance` : copie vers la structure du corpus qui en provient (G3 V1 → V2), seulement si elle existe.", "");
  L.push(...entete(["Configuration", "Mesure", "valeurs", "garde-fou 50 ms"]));
  for (const r of s.runs.filter((x) => x.scenario === "mesures" && !x.chauffe && x.valide))
    for (const m of r.mesures) {
      const constat = r.constats.find((k) => k.startsWith(`${m.nom} :`));
      const valeurs = Object.entries(m.valeurs)
        .map(([k, v]) => `${k} ${typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(1)) : JSON.stringify(v)}`)
        .join(", ");
      L.push(ligne([r.config, m.nom, valeurs, constat ? `⚠ ${constat.slice(m.nom.length + 3)}` : "ok"]));
    }
  const constats = s.runs.filter((r) => r.valide).flatMap((r) => r.constats.map((k) => `${r.config} / ${r.scenario} : ${k}`));
  if (constats.length > 0) {
    L.push("", "Constats du garde-fou (thread principal bloqué plus de 50 ms une fois l'app interactive) :", "");
    for (const k of constats) L.push(`- ${k}`);
  }
  L.push("");
  if (s.balayageLru.length > 0) {
    L.push("## Balayage du N du LRU (configuration de base)", "");
    L.push(
      `Valeurs testées : ${s.balayageLru.map((b) => b.lru).join(", ")} ; effectif ${s.profil.session.participants}. Hors LRU : action pendant laquelle le worker a créé au moins une instance (observé). Si P ≤ N, toute la cohorte de la grille active tient dans le cache : la catégorie hors LRU n'est pas observée, elle est « non mesurée ». Mémoire par participant : écart de tas du worker (chargement → LRU plein) divisé par les instances entrées dans le LRU pendant le remplissage ; « — » si le LRU était déjà plein au chargement.`,
      "",
    );
    if (c.bridageWorker === "logiciel") L.push("Instanciation : temps mesuré dans le worker à vitesse native, multiplié par le taux du bridage logiciel.", "");
    L.push(
      ...entete([
        "N",
        "changement de participant",
        "runs invalides",
        "P ≤ N",
        "actions dans / hors LRU",
        "latence hors LRU, médiane (ms)",
        "tas worker LRU plein (Mo)",
        "mémoire worker par participant (Ko)",
        "instanciation par participant (ms)",
      ]),
    );
    for (const b of s.balayageLru)
      L.push(
        ligne([
          b.lru,
          SYMBOLE[b.statut],
          b.runsInvalides,
          b.cohorteDansLeCache ? "oui" : "non",
          `${b.actionsDansLru} / ${b.actionsHorsLru === 0 ? "non mesurée" : b.actionsHorsLru}`,
          ms(b.latenceHorsLruMs),
          b.memoireWorkerLruPleinMo?.toFixed(1) ?? "—",
          b.memoireWorkerParParticipantKo?.toFixed(1) ?? "—",
          b.instanciationMsParParticipant?.toFixed(3) ?? "—",
        ]),
      );
    const retenu = s.balayageLru.filter((b) => b.statut === "réussite").sort((a, b) => a.lru - b.lru)[0];
    L.push(
      "",
      `Plus petit N dont tous les runs « Changement de participant » sont valides et passent : ${retenu ? `${retenu.lru}${retenu.actionsHorsLru === 0 ? " (aucune action hors LRU observée : le coût d'un participant froid n'est pas mesuré à ce N)" : ""}` : "aucun"}.`,
      "",
    );
  }
  const invalides = s.runs.filter((r) => !r.valide);
  if (invalides.length > 0) {
    L.push("## Runs invalides (exclus des agrégats)", "");
    for (const r of invalides) L.push(`- ${r.fichier} : ${r.invalidite.join(" ; ")}`);
    L.push("");
  }
  L.push("## Runs", "", `${s.runs.length} runs dont ${invalides.length} invalide(s), JSON brut dans \`runs/\` (non versionné).`, "");
  return L.join("\n");
}
