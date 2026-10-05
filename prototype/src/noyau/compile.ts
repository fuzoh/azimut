// `compile(grille, commutateurs) → plan` (spec 20, « Plan compilé »).
// Validation (références, catalogue F1–F7 et ses paramètres, barème commun
// entre entrées de données, absence de cycle, pas d'arrondi), ordre
// topologique, CSR des entrées, barèmes, pipeline, définitions et tables id ↔ index.

import type { ActionJoker, Bareme, Grille, Noeud, ParametresFonction } from "./format";

export const TYPE_DONNEES = 0;
export const TYPE_CALCUL = 1;
export const TYPE_REGROUPEMENT = 2;
/** Nœud de données sans barème : commentaire, sans case. */
export const TYPE_COMMENTAIRE = 3;

/** Code de fonction : 0 = aucune, 1…7 = F1…F7. */
export const FONCTIONS = ["", "F1", "F2", "F3", "F4", "F5", "F6", "F7"] as const;
/** Pas d'arrondi propagé admis (spec 20, « Modèle de valeur »). */
const PAS_ARRONDI = [1, 0.5, 0.1];

export interface BaremeCompile {
  id: string;
  type: "numerique" | "ordinal";
  /** Ordinal : table rang → valeur associée. Numérique : vide. */
  valeurs: Float64Array;
  libelles: string[];
  min: number;
  max: number;
  pas: number;
  pourcentage: boolean;
  colorations: [number, number, string][];
}

export interface JokerDefCompile {
  id: string;
  /** Index du nœud autorisé. */
  n: number;
  action: ActionJoker;
  libelle: string;
}

export interface Commutateurs {
  // Les commutateurs du modèle arrivent avec leurs tickets (18, 19, 22).
}

export interface Plan {
  grille: Grille;
  N: number;
  /** Index n → id ; n suit l'ordre du fichier. */
  ids: string[];
  index: Map<string, number>;
  type: Uint8Array;
  /** Les nœuds en ordre topologique (entrées avant consommateurs). */
  topo: Int32Array;
  D: number;
  /** d → n et n → d (-1 hors données). */
  donnees: Int32Array;
  indexDonnee: Int32Array;
  inOffsets: Int32Array;
  inSources: Int32Array;
  inPoids: Float64Array;
  fonction: Uint8Array;
  params: (ParametresFonction | null)[];
  /** Barème de la case (données) ou de sortie (calcul) ; -1 sinon. */
  bareme: Int32Array;
  baremes: BaremeCompile[];
  /** 1 si les entrées viennent de barèmes différents : normalisation. */
  heterogene: Uint8Array;
  /** Pipeline référencé par index : -1 = pas de conversion. */
  conversionIndex: Int32Array;
  conversions: Float64Array[];
  /** Pas d'arrondi propagé, 0 = aucun. */
  arrondi: Float64Array;
  /** Définition → ses occurrences (index n), dans l'ordre du fichier. */
  occurrences: Map<string, number[]>;
  jokerDefs: JokerDefCompile[];
  indexJoker: Map<string, number>;
  quotaJokers: number;
  decisif: number;
  axePrincipal: number;
}

export class ErreurCompilation extends Error {
  constructor(readonly erreurs: string[]) {
    super(`compile : ${erreurs.join(" ; ")}`);
  }
}

function compilerBareme(b: Bareme): BaremeCompile {
  if (b.type === "numerique") {
    return {
      id: b.id,
      type: "numerique",
      valeurs: new Float64Array(0),
      libelles: [],
      min: b.min,
      max: b.max,
      pas: b.pas,
      pourcentage: b.presentation === "pourcentage",
      colorations: b.colorations ?? [],
    };
  }
  const paliers =
    b.paliers ??
    (b.prereglage === "binaire"
      ? [
          { valeur: 0, libelle: "KO" },
          { valeur: 1, libelle: "OK" },
        ]
      : []);
  const valeurs = Float64Array.from(paliers, (p) => p.valeur);
  return {
    id: b.id,
    type: "ordinal",
    valeurs,
    libelles: paliers.map((p) => p.libelle),
    min: Math.min(...valeurs),
    max: Math.max(...valeurs),
    pas: 1,
    pourcentage: false,
    colorations: [],
  };
}

function estBinaire(b: BaremeCompile): boolean {
  return b.type === "ordinal" && b.valeurs.length === 2 && b.min === 0 && b.max === 1;
}

export function compile(grille: Grille, _commutateurs: Commutateurs = {}): Plan {
  const erreurs: string[] = [];
  const noeuds: Noeud[] = grille.noeuds;
  const N = noeuds.length;
  const ids = noeuds.map((n) => n.id);
  const index = new Map<string, number>();
  ids.forEach((id, n) => {
    if (index.has(id)) erreurs.push(`nœud en double : ${id}`);
    index.set(id, n);
  });

  const baremes = grille.baremes.map(compilerBareme);
  const indexBareme = new Map(baremes.map((b, i) => [b.id, i]));
  const baremeParId = (id: string, ou: string): number => {
    const i = indexBareme.get(id);
    if (i === undefined) {
      erreurs.push(`${ou} : barème inconnu ${id}`);
      return -1;
    }
    return i;
  };

  const type = new Uint8Array(N);
  const bareme = new Int32Array(N).fill(-1);
  const indexDonnee = new Int32Array(N).fill(-1);
  const donnees: number[] = [];
  noeuds.forEach((noeud, n) => {
    if (noeud.type === "donnees") {
      if (noeud.bareme === undefined) {
        type[n] = TYPE_COMMENTAIRE;
      } else {
        type[n] = TYPE_DONNEES;
        bareme[n] = baremeParId(noeud.bareme, noeud.id);
        indexDonnee[n] = donnees.length;
        donnees.push(n);
      }
    } else if (noeud.type === "calcul") {
      type[n] = TYPE_CALCUL;
    } else {
      type[n] = TYPE_REGROUPEMENT;
    }
  });

  // Entrées en CSR.
  const inOffsets = new Int32Array(N + 1);
  const sources: number[] = [];
  const poids: number[] = [];
  const fonction = new Uint8Array(N);
  const params: (ParametresFonction | null)[] = new Array(N).fill(null);
  noeuds.forEach((noeud, n) => {
    inOffsets[n] = sources.length;
    if (noeud.type !== "calcul") return;
    const code = FONCTIONS.indexOf(noeud.fonction);
    if (code <= 0) erreurs.push(`${noeud.id} : fonction inconnue ${noeud.fonction}`);
    fonction[n] = Math.max(code, 0);
    params[n] = noeud.params ?? null;
    erreurs.push(...verifierParams(noeud.id, noeud.fonction, noeud.params ?? {}));
    if (noeud.arrondi !== undefined && !PAS_ARRONDI.includes(noeud.arrondi))
      erreurs.push(`${noeud.id} : pas d'arrondi ${noeud.arrondi} hors de 1 ; 0,5 ; 0,1`);
    for (const e of noeud.entrees) {
      const s = index.get(e.noeud);
      if (s === undefined) {
        erreurs.push(`${noeud.id} : entrée inconnue ${e.noeud}`);
        continue;
      }
      if (type[s] === TYPE_REGROUPEMENT || type[s] === TYPE_COMMENTAIRE)
        erreurs.push(`${noeud.id} : l'entrée ${e.noeud} n'a pas de résultat (regroupement ou commentaire)`);
      sources.push(s);
      poids.push(e.poids);
    }
  });
  inOffsets[N] = sources.length;
  const inSources = Int32Array.from(sources);
  const inPoids = Float64Array.from(poids);

  // Ordre topologique (Kahn) ; ce qui reste forme un cycle.
  const degre = new Int32Array(N);
  const consommateurs: number[][] = Array.from({ length: N }, () => []);
  for (let n = 0; n < N; n++) {
    for (let i = inOffsets[n]; i < inOffsets[n + 1]; i++) {
      degre[n]++;
      consommateurs[inSources[i]].push(n);
    }
  }
  const topo: number[] = [];
  const file: number[] = [];
  for (let n = 0; n < N; n++) if (degre[n] === 0) file.push(n);
  while (file.length > 0) {
    const n = file.shift()!;
    topo.push(n);
    for (const c of consommateurs[n]) if (--degre[c] === 0) file.push(c);
  }
  if (topo.length < N) {
    const dansCycle = ids.filter((_, n) => degre[n] > 0);
    erreurs.push(`cycle entre ${dansCycle.join(", ")}`);
  }

  // Barèmes de sortie, règle de mélange, normalisation.
  const heterogene = new Uint8Array(N);
  const conversionIndex = new Int32Array(N).fill(-1);
  const conversions: Float64Array[] = [];
  const arrondi = new Float64Array(N);
  if (erreurs.length === 0) {
    for (const n of topo) {
      const noeud = noeuds[n];
      if (noeud.type !== "calcul") continue;
      const entrees = Array.from(inSources.subarray(inOffsets[n], inOffsets[n + 1]));
      const baremesDonnees = new Set(entrees.filter((s) => type[s] === TYPE_DONNEES).map((s) => bareme[s]));
      if (baremesDonnees.size > 1) {
        const noms = [...baremesDonnees].map((b) => baremes[b].id).join(", ");
        erreurs.push(`${noeud.id} : entrées de données sur des barèmes différents (${noms})`);
      }
      const baremesEntrees = new Set(entrees.map((s) => bareme[s]));
      heterogene[n] = baremesEntrees.size > 1 ? 1 : 0;
      if (noeud.bareme_sortie !== undefined) {
        bareme[n] = baremeParId(noeud.bareme_sortie, noeud.id);
      } else {
        bareme[n] = baremeParDefaut(noeud.fonction, [...baremesEntrees], baremes, indexBareme);
      }
      if (noeud.conversion) {
        conversionIndex[n] = conversions.length;
        conversions.push(Float64Array.from(noeud.conversion.flat()));
      }
      arrondi[n] = noeud.arrondi ?? 0;
    }
  }

  // Jokers.
  const jokerDefs: JokerDefCompile[] = [];
  const indexJoker = new Map<string, number>();
  for (const j of grille.jokers?.autorises ?? []) {
    const n = index.get(j.noeud);
    if (n === undefined) {
      erreurs.push(`joker ${j.id} : nœud inconnu ${j.noeud}`);
      continue;
    }
    if (type[n] !== TYPE_CALCUL) erreurs.push(`joker ${j.id} : ${j.noeud} n'est pas un nœud de calcul`);
    indexJoker.set(j.id, jokerDefs.length);
    jokerDefs.push({ id: j.id, n, action: j.action, libelle: j.libelle ?? "" });
  }

  const decisif = grille.decisif === undefined ? -1 : (index.get(grille.decisif) ?? -1);
  if (grille.decisif !== undefined && decisif < 0) erreurs.push(`nœud décisif inconnu ${grille.decisif}`);
  const principaux = grille.axes.flatMap((a, i) => (a.principal ? [i] : []));
  if (principaux.length !== 1) erreurs.push(`il faut exactement un axe principal (${principaux.length})`);
  const verifierPlacement = (p: { noeud: string; enfants?: { noeud: string }[] }, axe: string): void => {
    if (!index.has(p.noeud)) erreurs.push(`axe ${axe} : nœud inconnu ${p.noeud}`);
    for (const e of p.enfants ?? []) verifierPlacement(e, axe);
  };
  for (const a of grille.axes) for (const p of a.arbre) verifierPlacement(p, a.id);

  if (erreurs.length > 0) throw new ErreurCompilation(erreurs);

  // Définitions partagées : une définition ne porte aucune case et ne compte
  // nulle part ; elle relie seulement ses occurrences.
  const occurrences = new Map<string, number[]>();
  noeuds.forEach((noeud, n) => {
    if (noeud.type === "regroupement" || noeud.definition === undefined) return;
    const liste = occurrences.get(noeud.definition) ?? [];
    liste.push(n);
    occurrences.set(noeud.definition, liste);
  });

  return {
    grille,
    N,
    ids,
    index,
    type,
    topo: Int32Array.from(topo),
    D: donnees.length,
    donnees: Int32Array.from(donnees),
    indexDonnee,
    inOffsets,
    inSources,
    inPoids,
    fonction,
    params,
    bareme,
    baremes,
    heterogene,
    conversionIndex,
    conversions,
    arrondi,
    occurrences,
    jokerDefs,
    indexJoker,
    quotaJokers: grille.jokers?.quota ?? 0,
    decisif,
    axePrincipal: principaux[0] ?? -1,
  };
}

/** Paramètres requis par chaque fonction du catalogue (spec 20, « Catalogue de fonctions »). */
function verifierParams(id: string, f: string, p: ParametresFonction): string[] {
  const e: string[] = [];
  const nombre = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  const entier = (v: unknown) => Number.isInteger(v) && (v as number) >= 0;
  if (p.minEntreesActives !== undefined && !entier(p.minEntreesActives))
    e.push(`${id} : minEntreesActives doit être un entier ≥ 0`);
  switch (f) {
    case "F2":
      if (!nombre(p.seuil)) e.push(`${id} : F2 sans seuil`);
      break;
    case "F4":
      if (p.k !== "toutes" && !(entier(p.k) && (p.k as number) >= 1)) e.push(`${id} : F4 sans k (entier ≥ 1 ou « toutes »)`);
      if (p.seuil !== undefined && !nombre(p.seuil)) e.push(`${id} : F4 seuil invalide`);
      break;
    case "F5":
      if (p.mode !== "meilleure" && p.mode !== "derniere") e.push(`${id} : F5 sans mode (meilleure ou derniere)`);
      if (p.plafond !== undefined && !nombre(p.plafond)) e.push(`${id} : F5 plafond invalide`);
      break;
    case "F6":
      if (!entier(p.kHautes) || !entier(p.kBasses)) e.push(`${id} : F6 sans kHautes / kBasses entiers ≥ 0`);
      break;
    case "F7":
      if (!nombre(p.pivot) || !nombre(p.facteurBas) || !entier(p.maxInsuffisantes))
        e.push(`${id} : F7 sans pivot, facteurBas ou maxInsuffisantes`);
      break;
  }
  return e;
}

/**
 * Barème de sortie par défaut (spec, « Barèmes ») : le barème commun des
 * entrées ; `0–100 %` pour des entrées hétérogènes ou binaires ; un numérique
 * couvrant les valeurs associées pour des entrées ordinales. F2, F3, F4 et F7
 * sortent en binaire. Les barèmes implicites sont ajoutés à la liste du plan.
 */
function baremeParDefaut(
  fonction: string,
  entrees: number[],
  baremes: BaremeCompile[],
  indexBareme: Map<string, number>,
): number {
  const ajouter = (b: BaremeCompile): number => {
    const existant = indexBareme.get(b.id);
    if (existant !== undefined) return existant;
    baremes.push(b);
    indexBareme.set(b.id, baremes.length - 1);
    return baremes.length - 1;
  };
  const vide = { valeurs: new Float64Array(0), libelles: [], colorations: [], pourcentage: false };
  if (fonction === "F2" || fonction === "F3" || fonction === "F4" || fonction === "F7") {
    return ajouter({ ...vide, id: "(binaire)", type: "ordinal", valeurs: Float64Array.of(0, 1), libelles: ["KO", "OK"], min: 0, max: 1, pas: 1 });
  }
  const pourcent = (): number => ajouter({ ...vide, id: "(0–100 %)", type: "numerique", min: 0, max: 100, pas: 1 });
  if (entrees.length !== 1) return pourcent();
  const b = baremes[entrees[0]];
  if (estBinaire(b)) return pourcent();
  if (b.type === "numerique") return entrees[0];
  return ajouter({ ...vide, id: `(${b.min}–${b.max})`, type: "numerique", min: b.min, max: b.max, pas: 0.01 });
}
