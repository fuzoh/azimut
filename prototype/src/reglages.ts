// Réglages de l'essai (spec 20, « Réglages ») : quatre classes, plus la
// configuration de référence B de la comparaison. Les paramètres d'URL font
// foi au chargement ; `ecrireUrl` écrit toujours la configuration complète,
// pour qu'un lien copié la reproduise même si un défaut change.

import { type CommutateursResolus, resoudreCommutateurs } from "./noyau/compile";
import { MAX_PARTICIPANTS } from "./sources/cle";

export interface ReglagesStore {
  calcul: "signaux" | "dag";
  lieu: "worker" | "principal";
  cohorte: "paresseux" | "precalcul";
  distante: "perimee" | "immediat";
  /** N du LRU de participants instanciés. */
  lru: number;
}

export interface ReglagesGenerateur {
  jeu: "corpus" | "charge";
  remplissage: "debut" | "milieu" | "fin";
  graine: number;
  /** Nombre de participants générés (corpus : 0 par défaut ; charge : 200). */
  participants: number;
}

export interface ReglagesSession {
  verification: boolean;
  simulateur: boolean;
}

export interface Reglages {
  modele: CommutateursResolus;
  store: ReglagesStore;
  generateur: ReglagesGenerateur;
  session: ReglagesSession;
  /** Configuration de référence B (commutateurs du modèle seulement) ; null = pas de comparaison. */
  comparaison: CommutateursResolus | null;
}

export type ClasseReglage = "modele" | "store" | "generateur" | "session" | "comparaison";

export const PARTICIPANTS_PAR_DEFAUT: Record<ReglagesGenerateur["jeu"], number> = { corpus: 0, charge: 200 };

export function reglagesParDefaut(): Reglages {
  return {
    modele: resoudreCommutateurs(),
    store: { calcul: "signaux", lieu: "worker", cohorte: "paresseux", distante: "perimee", lru: 50 },
    generateur: { jeu: "corpus", remplissage: "milieu", graine: 1, participants: PARTICIPANTS_PAR_DEFAUT.corpus },
    session: { verification: true, simulateur: false },
    comparaison: null,
  };
}

// --- Noms et valeurs des paramètres d'URL -------------------------------------------

/** Paramètre d'URL ↔ commutateur : valeurs dans l'URL, dans l'ordre [défaut, variantes…]. */
interface ParamCommutateur {
  param: string;
  libelle: string;
  valeurs: { url: string; libelle: string; lire: Partial<CommutateursResolus> }[];
}

export const PARAMS_MODELE: ParamCommutateur[] = [
  {
    param: "1a",
    libelle: "1a portée de la dispense",
    valeurs: [
      { url: "A", libelle: "A, sur la case", lire: { dispense1a: "A" } },
      { url: "B", libelle: "B, sur la contribution", lire: { dispense1a: "B" } },
    ],
  },
  {
    param: "1b",
    libelle: "1b feuilles d'un regroupement",
    valeurs: [
      { url: "A", libelle: "A, par placement", lire: { feuilles1b: "A" } },
      { url: "B", libelle: "B, dépendances de calcul", lire: { feuilles1b: "B" } },
      { url: "C", libelle: "C, selon l'axe de la dispense", lire: { feuilles1b: "C" } },
    ],
  },
  {
    param: "1c",
    libelle: "1c minimum par regroupement",
    valeurs: [
      { url: "actif", libelle: "actif (si la structure le déclare)", lire: { minimum1c: true } },
      { url: "inactif", libelle: "inactif", lire: { minimum1c: false } },
    ],
  },
  {
    param: "h4",
    libelle: "H4 « toutes »",
    valeurs: [
      { url: "ignore", libelle: "ignore les entrées sans résultat", lire: { h4Strict: false } },
      { url: "strict", libelle: "strict", lire: { h4Strict: true } },
    ],
  },
  {
    param: "h5a",
    libelle: "H5a joker sur un nœud sans résultat",
    valeurs: [
      { url: "accepte", libelle: "accepté", lire: { h5a: "accepte" } },
      { url: "refuse", libelle: "refusé à la pose", lire: { h5a: "refuse" } },
    ],
  },
  {
    param: "h5b",
    libelle: "H5b plusieurs jokers sur un nœud",
    valeurs: [
      { url: "un", libelle: "un seul", lire: { h5b: "unSeul" } },
      { url: "cumules", libelle: "cumulés", lire: { h5b: "cumules" } },
    ],
  },
  {
    param: "f5rang",
    libelle: "F5 rang",
    valeurs: [
      { url: "structure", libelle: "selon la structure", lire: { f5Derniere: false } },
      { url: "derniere", libelle: "forcer « dernière »", lire: { f5Derniere: true } },
    ],
  },
  {
    param: "f5plafond",
    libelle: "F5 plafond",
    valeurs: [
      { url: "structure", libelle: "selon la structure", lire: { f5SansPlafond: false } },
      { url: "sans", libelle: "forcer sans plafond", lire: { f5SansPlafond: true } },
    ],
  },
];

/** Préfixe des commutateurs de la configuration B (`b.h4=strict`). */
export const PREFIXE_B = "b.";

/** Index de la valeur courante d'un commutateur dans `p.valeurs`. */
export function indexValeur(p: ParamCommutateur, c: CommutateursResolus): number {
  return p.valeurs.findIndex((v) => Object.entries(v.lire).every(([k, x]) => c[k as keyof CommutateursResolus] === x));
}

export const CHOIX_STORE = {
  calcul: ["signaux", "dag"],
  lieu: ["worker", "principal"],
  cohorte: ["paresseux", "precalcul"],
  distante: ["perimee", "immediat"],
} as const;

export const CHOIX_GENERATEUR = {
  jeu: ["corpus", "charge"],
  remplissage: ["debut", "milieu", "fin"],
} as const;

// --- Lecture et écriture ------------------------------------------------------------

export interface LectureUrl {
  reglages: Reglages;
  /** Paramètres inconnus ou valeurs invalides, remplacés par le défaut. */
  avertissements: string[];
}

function lireCommutateurs(q: URLSearchParams, prefixe: string, avertir: (m: string) => void): CommutateursResolus {
  let c = resoudreCommutateurs();
  for (const p of PARAMS_MODELE) {
    const brut = q.get(prefixe + p.param);
    if (brut === null) continue;
    const v = p.valeurs.find((x) => x.url === brut);
    if (v) c = { ...c, ...v.lire };
    else avertir(`${prefixe}${p.param}=${brut} invalide (attendu : ${p.valeurs.map((x) => x.url).join(" | ")})`);
  }
  return c;
}

function lireChoix<T extends string>(q: URLSearchParams, nom: string, choix: readonly T[], defaut: T, avertir: (m: string) => void): T {
  const brut = q.get(nom);
  if (brut === null) return defaut;
  if ((choix as readonly string[]).includes(brut)) return brut as T;
  avertir(`${nom}=${brut} invalide (attendu : ${choix.join(" | ")})`);
  return defaut;
}

function lireEntier(
  q: URLSearchParams,
  nom: string,
  defaut: number,
  min: number,
  avertir: (m: string) => void,
  max = Number.MAX_SAFE_INTEGER,
): number {
  const brut = q.get(nom);
  if (brut === null) return defaut;
  const v = Number(brut);
  if (Number.isInteger(v) && v >= min && v <= max) return v;
  avertir(`${nom}=${brut} invalide (entier ${max === Number.MAX_SAFE_INTEGER ? `≥ ${min}` : `entre ${min} et ${max}`} attendu)`);
  return defaut;
}

function lireBool(q: URLSearchParams, nom: string, defaut: boolean, avertir: (m: string) => void): boolean {
  const brut = q.get(nom);
  if (brut === null) return defaut;
  if (brut === "1") return true;
  if (brut === "0") return false;
  avertir(`${nom}=${brut} invalide (attendu : 0 | 1)`);
  return defaut;
}

const PARAMS_CONNUS = new Set([
  ...PARAMS_MODELE.flatMap((p) => [p.param, PREFIXE_B + p.param]),
  "cmp",
  "calcul",
  "lieu",
  "cohorte",
  "distante",
  "lru",
  "jeu",
  "remplissage",
  "graine",
  "participants",
  "verif",
  "simu",
]);

/** Les paramètres d'URL font foi ; un paramètre absent prend son défaut. */
export function lireUrl(search: string): LectureUrl {
  const q = new URLSearchParams(search);
  const avertissements: string[] = [];
  const avertir = (m: string) => avertissements.push(m);
  for (const k of q.keys()) if (!PARAMS_CONNUS.has(k)) avertir(`paramètre inconnu : ${k}`);
  const d = reglagesParDefaut();
  const jeu = lireChoix(q, "jeu", CHOIX_GENERATEUR.jeu, d.generateur.jeu, avertir);
  const comparer = lireBool(q, "cmp", false, avertir);
  return {
    reglages: {
      modele: lireCommutateurs(q, "", avertir),
      store: {
        calcul: lireChoix(q, "calcul", CHOIX_STORE.calcul, d.store.calcul, avertir),
        lieu: lireChoix(q, "lieu", CHOIX_STORE.lieu, d.store.lieu, avertir),
        cohorte: lireChoix(q, "cohorte", CHOIX_STORE.cohorte, d.store.cohorte, avertir),
        distante: lireChoix(q, "distante", CHOIX_STORE.distante, d.store.distante, avertir),
        lru: lireEntier(q, "lru", d.store.lru, 1, avertir),
      },
      generateur: {
        jeu,
        remplissage: lireChoix(q, "remplissage", CHOIX_GENERATEUR.remplissage, d.generateur.remplissage, avertir),
        graine: lireEntier(q, "graine", d.generateur.graine, 0, avertir),
        participants: lireEntier(q, "participants", PARTICIPANTS_PAR_DEFAUT[jeu], 0, avertir, MAX_PARTICIPANTS),
      },
      session: {
        verification: lireBool(q, "verif", d.session.verification, avertir),
        simulateur: lireBool(q, "simu", d.session.simulateur, avertir),
      },
      comparaison: comparer ? lireCommutateurs(q, PREFIXE_B, avertir) : null,
    },
    avertissements,
  };
}

function ecrireCommutateurs(q: URLSearchParams, prefixe: string, c: CommutateursResolus) {
  for (const p of PARAMS_MODELE) q.set(prefixe + p.param, p.valeurs[indexValeur(p, c)].url);
}

/** Chaîne de requête complète (`?…`), toutes classes, défauts compris. */
export function ecrireUrl(r: Reglages): string {
  const q = new URLSearchParams();
  ecrireCommutateurs(q, "", r.modele);
  q.set("cmp", r.comparaison ? "1" : "0");
  if (r.comparaison) ecrireCommutateurs(q, PREFIXE_B, r.comparaison);
  q.set("calcul", r.store.calcul);
  q.set("lieu", r.store.lieu);
  q.set("cohorte", r.store.cohorte);
  q.set("distante", r.store.distante);
  q.set("lru", String(r.store.lru));
  q.set("jeu", r.generateur.jeu);
  q.set("remplissage", r.generateur.remplissage);
  q.set("graine", String(r.generateur.graine));
  q.set("participants", String(r.generateur.participants));
  q.set("verif", r.session.verification ? "1" : "0");
  q.set("simu", r.session.simulateur ? "1" : "0");
  return `?${q.toString()}`;
}

const egal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Classes dont un réglage diffère entre a et b. */
export function classesChangees(a: Reglages, b: Reglages): Set<ClasseReglage> {
  const res = new Set<ClasseReglage>();
  for (const c of ["modele", "store", "generateur", "session", "comparaison"] as const) if (!egal(a[c], b[c])) res.add(c);
  return res;
}

/** Une bascule du store ou du générateur recharge la page ; les autres s'appliquent à chaud. */
export function demandeRechargement(a: Reglages, b: Reglages): boolean {
  const c = classesChangees(a, b);
  return c.has("store") || c.has("generateur");
}
