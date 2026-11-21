// Options du harnais (ticket #28) : lecture et validation de la ligne de
// commande, identifiant du profil de données, URL d'un run. Pur, testé sous
// Vitest. Le harnais ne charge pas l'app : configurations, structures et
// borne d'effectif sont recopiées ici (un test vérifie qu'elles concordent).

import { parseArgs } from "node:util";

/** Les 5 configurations de `src/store/fabriques.ts` (CONFIGURATIONS), recopiées. */
export const CONFIGURATIONS = [
  { nom: "base", store: { calcul: "signaux", lieu: "worker", cohorte: "paresseux", distante: "perimee" } },
  { nom: "dag", store: { calcul: "dag", lieu: "worker", cohorte: "paresseux", distante: "perimee" } },
  { nom: "principal", store: { calcul: "signaux", lieu: "principal", cohorte: "paresseux", distante: "perimee" } },
  { nom: "precalcul", store: { calcul: "signaux", lieu: "worker", cohorte: "precalcul", distante: "perimee" } },
  { nom: "immediat", store: { calcul: "signaux", lieu: "worker", cohorte: "paresseux", distante: "immediat" } },
] as const;
export type Configuration = (typeof CONFIGURATIONS)[number];

/** Les six familles de scénarios jugés (spec 20), dans l'ordre des séries. */
export const SCENARIOS_JUGES = ["saisie-rapide", "saisies-distantes", "changement-participant", "changement-axe-vue", "defilement", "ouverture-graphe"] as const;
/** Mesures sans critère (écritures en série, copie, bascule du modèle, LRU plein). */
export const MESURES = "mesures";

/** `IDS_STRUCTURES` de `src/generateur/jeux.ts`, recopié. */
export const STRUCTURES = ["a01", "a03", "g3v1", "g3v2"] as const;
export type Structure = (typeof STRUCTURES)[number];
/** `MAX_PARTICIPANTS` de `src/sources/cle.ts`, recopié. */
export const MAX_PARTICIPANTS = 1024;
/** `INSTANCES_CHARGE` de `src/generateur/jeux.ts`, recopié. */
export const INSTANCES_CHARGE = 3;

export const REMPLISSAGES = ["debut", "milieu", "fin"] as const;
export const JEUX = ["charge", "perf"] as const;

export const LRU_DEFAUT = 50;
export const LRU_BALAYAGE_DEFAUT = [10, 50, 200];

/** Profil de données : ce qui fixe les sources d'une série, identiques entre configurations. */
export interface ProfilDemande {
  jeu: (typeof JEUX)[number];
  /** Jeu « perf » : structures en ordre canonique ; vide pour « charge ». */
  structures: Structure[];
  /** Plusieurs structures : session composite, synthétique. */
  composite: boolean;
  participants: number;
  remplissage: (typeof REMPLISSAGES)[number];
  graine: number;
  /** Index de la grille active. */
  grille: number;
}

export interface Options {
  profil: ProfilDemande;
  fumee: boolean;
  headless: boolean;
  navigateur?: string;
  canal?: string;
  /** Taux de bridage CPU ; une série (dossier, calibration, rapport) par taux. */
  bridages: number[];
  runs: number;
  chauffe: number;
  configs: Configuration[];
  /** Scénarios jugés, puis « mesures » sauf `--sans-mesures`. */
  scenarios: string[];
  lru: number;
  /** null : `--sans-lru`. */
  lruBalayage: number[] | null;
  comparerModes: boolean;
  court: boolean;
  sansBuild: boolean;
  port: number;
}

export class ErreurOptions extends Error {
  constructor(readonly problemes: string[]) {
    super(`options invalides :\n${problemes.map((p) => `  - ${p}`).join("\n")}`);
  }
}

const AIDE_STRUCTURES = STRUCTURES.join(" | ");

/** Lit et valide la ligne de commande ; lève `ErreurOptions` avec tous les problèmes à la fois. */
export function lireOptions(argv: readonly string[]): Options {
  let values: Record<string, string | boolean | undefined>;
  try {
    ({ values } = parseArgs({
      args: [...argv],
      strict: true,
      allowPositionals: false,
      options: {
        jeu: { type: "string" },
        structures: { type: "string" },
        composite: { type: "boolean", default: false },
        participants: { type: "string" },
        remplissage: { type: "string" },
        graine: { type: "string" },
        grille: { type: "string" },
        fumee: { type: "boolean", default: false },
        headless: { type: "boolean", default: false },
        navigateur: { type: "string" },
        canal: { type: "string" },
        bridage: { type: "string" },
        runs: { type: "string" },
        chauffe: { type: "string" },
        configs: { type: "string" },
        scenarios: { type: "string" },
        lru: { type: "string" },
        "lru-balayage": { type: "string" },
        "sans-lru": { type: "boolean", default: false },
        "sans-mesures": { type: "boolean", default: false },
        "comparer-modes": { type: "boolean", default: false },
        court: { type: "boolean", default: false },
        "sans-build": { type: "boolean", default: false },
        port: { type: "string" },
      },
    }));
  } catch (e) {
    throw new ErreurOptions([e instanceof Error ? e.message : String(e)]);
  }
  const problemes: string[] = [];
  const texte = (k: string) => values[k] as string | undefined;

  const entier = (k: string, defaut: number, min: number, max = Number.MAX_SAFE_INTEGER): number => {
    const brut = texte(k);
    if (brut === undefined) return defaut;
    const v = Number(brut);
    if (brut.trim() === "" || !Number.isInteger(v) || v < min || v > max) {
      problemes.push(`--${k} ${brut} : entier ${max === Number.MAX_SAFE_INTEGER ? `≥ ${min}` : `entre ${min} et ${max}`} attendu`);
      return defaut;
    }
    return v;
  };
  const choix = <T extends string>(k: string, valeurs: readonly T[], defaut: T): T => {
    const brut = texte(k);
    if (brut === undefined) return defaut;
    if ((valeurs as readonly string[]).includes(brut)) return brut as T;
    problemes.push(`--${k} ${brut} : choix inconnu (attendu : ${valeurs.join(" | ")})`);
    return defaut;
  };
  /** Liste séparée par des virgules : non vide, sans doublon, éléments valides. */
  const liste = <T>(k: string, brut: string, lire: (x: string) => T | null, aide: string): T[] => {
    const elements = brut.split(",").map((x) => x.trim());
    if (elements.length === 0 || elements.some((x) => x === "")) {
      problemes.push(`--${k} « ${brut} » : liste vide ou élément vide`);
      return [];
    }
    const vus = new Set<string>();
    const res: T[] = [];
    for (const x of elements) {
      const v = lire(x);
      if (v === null) problemes.push(`--${k} : « ${x} » inconnu ou invalide (attendu : ${aide})`);
      else if (vus.has(x)) problemes.push(`--${k} : « ${x} » en double`);
      else res.push(v);
      vus.add(x);
    }
    return res;
  };

  // --- Profil de données -------------------------------------------------------------
  const jeuBrut = texte("jeu");
  if (jeuBrut === "corpus") problemes.push("--jeu corpus : le corpus est le jeu de validation, pas un jeu de mesure (--jeu perf --structures …)");
  const jeu = choix("jeu", JEUX, "charge");
  let structures: Structure[] = [];
  const structuresBrut = texte("structures");
  if (jeu === "perf") {
    if (structuresBrut === undefined) problemes.push(`--jeu perf : --structures requis (${AIDE_STRUCTURES}, plusieurs séparées par des virgules)`);
    else {
      const lues = liste("structures", structuresBrut, (x) => ((STRUCTURES as readonly string[]).includes(x) ? (x as Structure) : null), AIDE_STRUCTURES);
      structures = STRUCTURES.filter((s) => lues.includes(s));
    }
  } else if (structuresBrut !== undefined) problemes.push("--structures : réservé à --jeu perf (le jeu « charge » est 3 × G3 étendue)");
  const composite = values.composite === true;
  if (structures.length > 1 && !composite)
    problemes.push(`--structures ${structures.join(",")} : plusieurs structures forment une session composite synthétique, à demander explicitement avec --composite`);
  if (composite && structures.length <= 1) problemes.push("--composite : demande au moins deux structures (--jeu perf)");
  const participants = entier("participants", jeu === "charge" ? 200 : 20, 1, MAX_PARTICIPANTS);
  const remplissage = choix("remplissage", REMPLISSAGES, "fin");
  const graine = entier("graine", 1, 0);
  const nbGrilles = jeu === "charge" ? INSTANCES_CHARGE : Math.max(1, structures.length);
  let grille = 0;
  const grilleBrute = texte("grille");
  if (grilleBrute !== undefined) {
    const parId = structures.indexOf(grilleBrute as Structure);
    const v = parId >= 0 ? parId : Number(grilleBrute);
    if (grilleBrute.trim() === "" || !Number.isInteger(v) || v < 0 || v >= nbGrilles)
      problemes.push(`--grille ${grilleBrute} : index de 0 à ${nbGrilles - 1}${jeu === "perf" ? ` ou structure chargée (${structures.join(", ")})` : ""} attendu`);
    else grille = v;
  }

  // --- Série --------------------------------------------------------------------------
  const fumee = values.fumee === true;
  const bridages = liste(
    "bridage",
    texte("bridage") ?? "4",
    (x) => {
      const v = Number(x);
      return Number.isFinite(v) && v >= 1 ? v : null;
    },
    "nombre ≥ 1, par ex. 1,4",
  );
  const runs = entier("runs", fumee ? 1 : 5, 1);
  const chauffe = entier("chauffe", fumee ? 0 : 1, 0);
  const configs = texte("configs") === undefined
    ? [...CONFIGURATIONS]
    : liste("configs", texte("configs")!, (x) => CONFIGURATIONS.find((c) => c.nom === x) ?? null, CONFIGURATIONS.map((c) => c.nom).join(" | "));
  const connus = [...SCENARIOS_JUGES, MESURES] as readonly string[];
  let scenarios = texte("scenarios") === undefined ? [...SCENARIOS_JUGES] : liste("scenarios", texte("scenarios")!, (x) => (connus.includes(x) ? x : null), connus.join(" | "));
  if (values["sans-mesures"] === true) scenarios = scenarios.filter((s) => s !== MESURES);
  else if (!scenarios.includes(MESURES)) scenarios = [...scenarios, MESURES];
  const lru = entier("lru", LRU_DEFAUT, 1);
  let lruBalayage: number[] | null = [...LRU_BALAYAGE_DEFAUT];
  if (values["sans-lru"] === true) {
    lruBalayage = null;
    if (texte("lru-balayage") !== undefined) problemes.push("--lru-balayage et --sans-lru s'excluent");
  } else if (texte("lru-balayage") !== undefined)
    lruBalayage = liste(
      "lru-balayage",
      texte("lru-balayage")!,
      (x) => {
        const v = Number(x);
        return Number.isInteger(v) && v >= 1 ? v : null;
      },
      "entiers ≥ 1, par ex. 10,50,200",
    ).sort((a, b) => a - b);
  const port = entier("port", 4173, 1, 65535);
  if (configs.length > 0 && scenarios.length === 0 && (lruBalayage === null || lruBalayage.length === 0))
    problemes.push("série vide : aucun scénario ni balayage du LRU à jouer");

  if (problemes.length > 0) throw new ErreurOptions(problemes);
  return {
    profil: { jeu, structures, composite, participants, remplissage, graine, grille },
    fumee,
    headless: values.headless === true,
    navigateur: texte("navigateur"),
    canal: texte("canal"),
    bridages,
    runs,
    chauffe,
    configs,
    scenarios,
    lru,
    lruBalayage,
    comparerModes: values["comparer-modes"] === true,
    court: values.court === true,
    sansBuild: values["sans-build"] === true,
    port,
  };
}

/** Identifiant lisible et stable du profil, par ex. `perf-a03-p20-fin-s1` ou `charge-p200-fin-s1`. */
export function idProfil(p: ProfilDemande): string {
  const jeu = p.jeu === "perf" ? `perf-${p.composite ? "composite-" : ""}${p.structures.join("+")}` : p.jeu;
  return `${jeu}-p${p.participants}-${p.remplissage}-s${p.graine}${p.grille !== 0 ? `-g${p.grille}` : ""}`;
}

/** Population d'un profil : les rapports ne mélangent jamais ces catégories. */
export function categorieProfil(p: ProfilDemande): "taille réelle" | "composite synthétique" | "charge historique" {
  if (p.jeu === "charge") return "charge historique";
  return p.composite ? "composite synthétique" : "taille réelle";
}

/**
 * URL d'un run. Profil « charge » sur la grille 0 : mêmes paramètres que la
 * série du 7 octobre (`grille` n'est écrit que s'il diffère de 0).
 */
export function urlRun(base: string, p: ProfilDemande, store: Configuration["store"], lru: number, bridageWorker: number | null): string {
  const q = new URLSearchParams({ jeu: p.jeu, remplissage: p.remplissage, graine: String(p.graine), participants: String(p.participants) });
  if (p.jeu === "perf") q.set("structures", p.structures.join(","));
  if (p.grille !== 0) q.set("grille", String(p.grille));
  for (const [k, v] of Object.entries({ verif: "0", simu: "0", ...store, lru: String(lru) })) q.set(k, v);
  if (bridageWorker !== null) q.set("bridageWorker", String(bridageWorker));
  return `${base}/?${q}`;
}
