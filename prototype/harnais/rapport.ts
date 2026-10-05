// Rapport Markdown d'une série (spec 20, « Rapport ») : conditions, machine,
// calibration, tableau configurations × scénarios, latence décomposée,
// mesures sans critère et garde-fou, balayage du N du LRU.

import { type Cellule, ETAPES, mediane, type ResumeRun, type Saisie, SEUILS } from "./analyse";
import type { ChronoAction, MesureSansCritere } from "./scenarios";
import type { MemoireCibles } from "./cdp";

export interface Calibration {
  ratioPage: number | null;
  ratioWorkerNatif: number | null;
  /** « natif » : le bridage de la page atteint le worker ; « logiciel » : `bridageWorker` ; null : sans worker mesuré. */
  bridageWorker: "natif" | "logiciel" | null;
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
  commit: string;
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
  resume: ResumeRun | null;
  saisies: Saisie[];
  actions: ChronoAction[];
  mesures: MesureSansCritere[];
  memoire: Record<string, MemoireCibles>;
  demarrage: Record<string, number>;
  constats: string[];
  erreur?: string;
}

export interface SerieJson {
  nom: string;
  date: string;
  fumee: boolean;
  options: Record<string, unknown>;
  machine: Machine;
  calibration: Calibration;
  runs: RunJson[];
  cellules: Cellule[];
  balayageLru: { lru: number; reussite: boolean | null; latenceHorsLruMs: number | null; memoireWorkerParParticipantKo: number | null; memoireWorkerLruPleinMo: number | null; instanciationMsParParticipant: number | null }[];
}

const ms = (x: number | null | undefined) => (x === null || x === undefined ? "—" : `${Math.round(x)}`);
const mo = (o: number | null | undefined) => (o === null || o === undefined ? "—" : `${(o / 1048576).toFixed(1)}`);
const ligne = (cols: (string | number)[]) => `| ${cols.join(" | ")} |`;
const entete = (cols: string[]) => [ligne(cols), ligne(cols.map(() => "---"))];

function cellule(c: Cellule | undefined): string {
  if (!c) return "—";
  const parts = [c.reussite ? "✅" : "❌"];
  if (c.p95.pire !== null) parts.push(`p95 ${ms(c.p95.mediane)}/${ms(c.p95.pire)}`);
  if ((c.saisiesIncompletes.pire ?? 0) > 0) parts.push(`sans latence ${ms(c.saisiesIncompletes.pire)}`);
  parts.push(`INP ${ms(c.inp.mediane)}/${ms(c.inp.pire)}`);
  parts.push(`LT ${ms(c.longtasks.pire)}`);
  if (c.scenario === "defilement") parts.push(`LoAF ${ms(c.loaf.pire)}`);
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
    const saisies = runs.filter((r) => !r.balayage && r.config === config && !r.chauffe && r.scenario === "saisie-rapide").flatMap((r) => r.saisies);
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

export function rapportMarkdown(s: SerieJson): string {
  const L: string[] = [];
  const principaux = s.runs.filter((r) => !r.balayage);
  const configs = [...new Set(principaux.map((r) => r.config))];
  const scenarios = [...new Set(s.cellules.map((c) => c.scenario))];
  L.push(`# Série de mesures ${s.nom}`, "");
  if (s.machine.mode !== "fenêtre visible")
    L.push("> **Série en nouveau headless : ses chiffres ne comptent pas.** Les critères se jugent en fenêtre visible (spec 20, « Conditions »).", "");
  if (s.fumee) L.push("> Série de fumée : 1 run par scénario et par configuration, sans run de chauffe. Elle vérifie le harnais, elle ne juge pas les critères.", "");
  if (!s.calibration.reussite) L.push(`> **Calibration en échec** : ${s.calibration.motifs.join(" ; ")}.`, "");
  L.push("## Conditions", "");
  L.push(`- Date : ${s.date}`, `- Mode : ${s.machine.mode}`, `- Options : \`${JSON.stringify(s.options)}\``, `- Commit : ${s.machine.commit}`, "");
  L.push("## Machine", "");
  L.push(
    `- CPU : ${s.machine.cpu} (${s.machine.coeurs} cœurs logiques)`,
    `- RAM : ${s.machine.ramGo} Go`,
    `- OS : ${s.machine.os}`,
    `- Chrome : ${s.machine.chrome} (\`${s.machine.executable}\`)`,
    `- Sur secteur : ${s.machine.secteur === null ? "inconnu" : s.machine.secteur ? "oui" : "non"}`,
    `- Harnais : ${s.machine.node}`,
    "",
  );
  const c = s.calibration;
  L.push("## Calibration", "");
  L.push(
    `- Ratio ×4 / ×1, thread principal : ${c.ratioPage?.toFixed(2) ?? "—"}`,
    `- Ratio ×4 / ×1, worker, bridage de la page seul : ${c.ratioWorkerNatif?.toFixed(2) ?? "—"}`,
    `- Bridage du worker retenu : ${c.bridageWorker ?? "—"}${c.ratioWorkerLogiciel !== null ? ` (ratio avec bridage logiciel : ${c.ratioWorkerLogiciel.toFixed(2)})` : ""}`,
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
  L.push("## Critères : configurations × scénarios", "");
  L.push(
    `Jugés sur le pire run : zéro longtask > ${SEUILS.longtaskMs} ms, INP < ${SEUILS.inpMs} ms, latence de recalcul p95 < ${SEUILS.latenceP95Ms} ms (saisies), zéro LoAF (défilement). Cellule : réussite, p95 et INP en ms (médiane/pire run), longtasks du pire run.`,
    "",
  );
  L.push(...entete(["Configuration", ...scenarios]));
  for (const config of configs) L.push(ligne([config, ...scenarios.map((sc) => cellule(s.cellules.find((x) => x.config === config && x.scenario === sc)))]));
  const echecs = s.cellules.filter((x) => !x.reussite);
  if (echecs.length > 0) {
    L.push("", "Motifs d'échec :", "");
    for (const e of echecs) L.push(`- ${e.config} / ${e.scenario} : ${e.motifs.join(", ")}`);
  }
  L.push("", "## Latence décomposée (saisie rapide)", "");
  L.push("Médiane des écarts entre étapes successives (ms), marques des deux threads ramenées à l'horloge de la page par `performance.timeOrigin`. `calcul` : début et fin du calcul (worker ou thread principal).", "");
  if (c.bridageWorker === "logiciel")
    L.push(
      "Bridage logiciel du worker : l'attente active suit le calcul et précède `workerEnvoi`, elle compte dans « workerReception → workerEnvoi » ; la colonne `calcul` (fenêtre mesurée par le moteur) reste à vitesse native.",
      "",
    );
  L.push(...decomposition(s.runs, c.bridageWorker === "logiciel"));
  L.push("", "## Actions (sans critère propre)", "");
  L.push(...entete(["Configuration", "Scénario", "type", "dans le LRU", "n", "médiane (ms)", "pire (ms)"]));
  for (const config of configs)
    for (const sc of ["changement-participant", "changement-axe-vue", "ouverture-graphe"]) {
      const actions = principaux.filter((r) => r.config === config && r.scenario === sc && !r.chauffe).flatMap((r) => r.actions);
      const groupes = new Map<string, ChronoAction[]>();
      for (const a of actions) {
        const k = `${a.type}|${a.dansLru ?? ""}`;
        groupes.set(k, [...(groupes.get(k) ?? []), a]);
      }
      for (const [k, g] of groupes) {
        const [type, lru] = k.split("|");
        const v = g.map((a) => a.latence);
        L.push(ligne([config, sc, type, lru === "" ? "—" : lru === "true" ? "oui" : "non", v.length, ms(mediane(v)), ms(Math.max(...v))]));
      }
    }
  L.push("", "## Mesures sans critère", "");
  L.push("### Démarrage par phases (médiane des runs, ms)", "");
  const phases = ["structures", "extension", "compile", "generation", "insertion", "somme", "worker-pret", "table-peinte"];
  L.push(...entete(["Configuration", ...phases]));
  for (const config of configs) {
    const runs = principaux.filter((r) => r.config === config && !r.erreur);
    L.push(ligne([config, ...phases.map((ph) => ms(medianeDe(runs, (r) => r.demarrage[ph])))]));
  }
  L.push("", "`worker-pret` et `table-peinte` : instants depuis le début de la navigation ; les autres : durées.", "");
  L.push("### Mémoire par cible (Mo, après GC, médiane des runs)", "");
  L.push("Tas JS utilisé + stockage des ArrayBuffer (`Runtime.getHeapUsage` : `usedSize + backingStorageSize`).", "");
  L.push(...entete(["Configuration", "page chargement", "worker chargement", "page LRU plein", "worker LRU plein", "page fin", "worker fin"]));
  for (const config of configs) {
    const runs = principaux.filter((r) => r.config === config && !r.erreur);
    const m = (point: string, cible: "page" | "worker") =>
      mo(medianeDe(runs, (r) => {
        const t = r.memoire[point]?.[cible];
        return t ? t.usedSize + t.backingStorageSize : null;
      }));
    L.push(ligne([config, m("chargement", "page"), m("chargement", "worker"), m("lru-plein", "page"), m("lru-plein", "worker"), m("fin", "page"), m("fin", "worker")]));
  }
  L.push("", "### Écritures en série, copie de grille, bascule du modèle", "");
  L.push(...entete(["Configuration", "Mesure", "valeurs", "garde-fou 50 ms"]));
  for (const r of s.runs.filter((x) => x.scenario === "mesures" && !x.chauffe))
    for (const m of r.mesures) {
      const constat = r.constats.find((k) => k.startsWith(`${m.nom} :`));
      const valeurs = Object.entries(m.valeurs)
        .map(([k, v]) => `${k} ${typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(1)) : JSON.stringify(v)}`)
        .join(", ");
      L.push(ligne([r.config, m.nom, valeurs, constat ? `⚠ ${constat.slice(m.nom.length + 3)}` : "ok"]));
    }
  const constats = s.runs.flatMap((r) => r.constats.map((k) => `${r.config} / ${r.scenario} : ${k}`));
  if (constats.length > 0) {
    L.push("", "Constats du garde-fou (thread principal bloqué plus de 50 ms une fois l'app interactive) :", "");
    for (const k of constats) L.push(`- ${k}`);
  }
  L.push("", "## Balayage du N du LRU (configuration de base)", "");
  L.push(
    "Hors LRU : action pendant laquelle le worker a créé au moins une instance (observé). Mémoire par participant : écart de tas du worker (chargement → LRU plein) divisé par les instances entrées dans le LRU pendant le remplissage ; « — » si le LRU était déjà plein au chargement (comparer alors le tas à LRU plein d'un N à l'autre).",
    "",
  );
  if (c.bridageWorker === "logiciel") L.push("Instanciation : temps mesuré dans le worker à vitesse native, multiplié par le taux du bridage logiciel.", "");
  L.push(...entete(["N", "changement de participant", "latence hors LRU, médiane (ms)", "tas worker LRU plein (Mo)", "mémoire worker par participant (Ko)", "instanciation par participant (ms)"]));
  for (const b of s.balayageLru)
    L.push(
      ligne([
        b.lru,
        b.reussite === null ? "—" : b.reussite ? "✅" : "❌",
        ms(b.latenceHorsLruMs),
        b.memoireWorkerLruPleinMo?.toFixed(1) ?? "—",
        b.memoireWorkerParParticipantKo?.toFixed(1) ?? "—",
        b.instanciationMsParParticipant?.toFixed(3) ?? "—",
      ]),
    );
  const retenu = s.balayageLru.filter((b) => b.reussite).sort((a, b) => a.lru - b.lru)[0];
  L.push("", `Plus petit N qui passe « Changement de participant » : ${retenu ? retenu.lru : "aucun"}.`, "");
  const erreurs = s.runs.filter((r) => r.erreur);
  if (erreurs.length > 0) {
    L.push("## Runs en erreur", "");
    for (const r of erreurs) L.push(`- ${r.fichier} : ${r.erreur}`);
    L.push("");
  }
  L.push("## Runs", "", `${s.runs.length} runs, JSON brut dans \`runs/\`.`, "");
  return L.join("\n");
}
