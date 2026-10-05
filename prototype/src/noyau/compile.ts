// `compile(grille, commutateurs) → plan` (spec 20, « Plan compilé »).
// Validation (références, catalogue F1–F7 et ses paramètres, barème commun
// entre entrées de données, absence de cycle, pas d'arrondi), ordre
// topologique, CSR des entrées, barèmes, pipeline, définitions et tables id ↔ index.

import type { ActionJoker, Bareme, Grille, Noeud, ParametresFonction, Placement } from "./format";

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

/** Commutateurs du modèle (spec 20, « Réglages ») ; H5 arrive avec les jokers. */
export interface Commutateurs {
  /** F5 rang : forcer « dernière » (défaut : selon la structure). */
  f5Derniere?: boolean;
  /** F5 plafond : forcer sans plafond (défaut : selon la structure). */
  f5SansPlafond?: boolean;
  /** 1a, portée de la dispense : A sur la case (défaut), B sur la contribution. */
  dispense1a?: "A" | "B";
  /** 1b, feuilles d'un nœud : A par placement (défaut), B dépendances de calcul, C axe de la dispense. */
  feuilles1b?: "A" | "B" | "C";
  /** 1c, minimum par regroupement : actif si la structure le déclare (défaut true). */
  minimum1c?: boolean;
  /** H4 : « toutes » / « au moins k = toutes » strict (une entrée sans résultat rend le nœud sans résultat). */
  h4Strict?: boolean;
}

/** Commutateurs résolus, défauts compris. */
export type CommutateursResolus = Required<Commutateurs>;

export function resoudreCommutateurs(c: Commutateurs = {}): CommutateursResolus {
  return {
    f5Derniere: c.f5Derniere ?? false,
    f5SansPlafond: c.f5SansPlafond ?? false,
    dispense1a: c.dispense1a ?? "A",
    feuilles1b: c.feuilles1b ?? "A",
    minimum1c: c.minimum1c ?? true,
    h4Strict: c.h4Strict ?? false,
  };
}

/** Ensemble d'index en CSR : les éléments de i sont `sources[offsets[i]…offsets[i+1]]`. */
export interface Csr {
  offsets: Int32Array;
  sources: Int32Array;
}

function versCsr(listes: Iterable<number>[]): Csr {
  const offsets = new Int32Array(listes.length + 1);
  const tout: number[] = [];
  listes.forEach((l, i) => {
    offsets[i] = tout.length;
    tout.push(...[...l].sort((a, b) => a - b));
  });
  offsets[listes.length] = tout.length;
  return { offsets, sources: Int32Array.from(tout) };
}

export function elementsCsr(c: Csr, i: number): Int32Array {
  return c.sources.subarray(c.offsets[i], c.offsets[i + 1]);
}

/** Minimum de notes actives (1c) : sur un nœud, ou sur la grille entière (n = -1). */
export interface MinimumCompile {
  n: number;
  minActives: number;
  /** Feuilles comptées (index d), selon 1b. */
  feuilles: Int32Array;
}

/** Marques statiques de chemins multiples, bits de `Plan.cheminsMultiples`. */
export const CHEMIN_PLUSIEURS_EXIGENCES = 1;
export const CHEMIN_INFLUENCE_MULTIPLE = 2;

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
  /**
   * 1 si le calcul passe par la normalisation : entrées de barèmes différents,
   * ou entrées binaires vers le `0–100 %` par défaut.
   */
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
  /** Chemins multiples, propriété de la structure : bits CHEMIN_* par nœud. */
  cheminsMultiples: Uint8Array;
  /** Nœud → les exigences distinctes qu'il atteint (au moins 2). */
  plusieursExigences: Map<number, number[]>;
  /** Nœud → les résultats qu'il atteint par au moins 2 de ses consommateurs directs. */
  influenceMultiple: Map<number, number[]>;
  /** Consommateurs directs de chaque nœud (sans doublon). */
  consommateurs: number[][];
  commutateurs: CommutateursResolus;
  /**
   * Feuilles de dispense par nœud (index d), en CSR, selon 1b : A placement
   * (union des sous-arbres, tous axes), B dépendances de calcul. En 1b-C, ce
   * sont celles de l'axe principal ; voir `feuillesParAxe`.
   */
  feuillesDispense: Csr;
  /** Feuilles par placement dans chaque axe (1b-C). */
  feuillesParAxe: Csr[];
  /**
   * Dispense sans effet (spec 20) : 1 si une non-évaluation posée sur le nœud
   * ne change aucun calcul dans le réglage courant (regroupement en 1a-B ;
   * aucune feuille selon 1b en 1a-A, dont tout regroupement en 1b-B). En 1b-C,
   * pour une dispense sans `axe` (axe principal).
   */
  dispenseSansEffet: Uint8Array;
  /** Nœuds de données obligatoires (index d). */
  obligatoires: Int32Array;
  /** Minimums de notes actives (vides si 1c inactif). */
  minimums: MinimumCompile[];
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

export function compile(grille: Grille, commutateursBruts: Commutateurs = {}): Plan {
  const commutateurs = resoudreCommutateurs(commutateursBruts);
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
    if (noeud.fonction === "F5" && (commutateurs.f5Derniere || commutateurs.f5SansPlafond)) {
      const p = { ...noeud.params };
      if (commutateurs.f5Derniere) p.mode = "derniere";
      if (commutateurs.f5SansPlafond) delete p.plafond;
      params[n] = p;
    }
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
        // Entrées binaires vers le `0–100 %` par défaut : OK = 100 %.
        if (baremesEntrees.size === 1 && estBinaire(baremes[[...baremesEntrees][0]]) && !estBinaire(baremes[bareme[n]]))
          heterogene[n] = 1;
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
  const axePrincipal = principaux[0] ?? -1;
  for (const m of grille.exigences?.minimumParRegroupement ?? []) {
    const surGrille = axePrincipal >= 0 && m.noeud === grille.axes[axePrincipal].id;
    if (!surGrille && !index.has(m.noeud)) erreurs.push(`minimum : nœud inconnu ${m.noeud}`);
    if (!Number.isInteger(m.minActives) || m.minActives < 1) erreurs.push(`minimum ${m.noeud} : minActives doit être un entier ≥ 1`);
  }
  for (const noeud of noeuds)
    if (noeud.type === "donnees" && noeud.obligatoire && noeud.bareme === undefined)
      erreurs.push(`${noeud.id} : un nœud de commentaire ne peut pas être obligatoire`);

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

  const chemins = cheminsMultiples(N, type, fonction, inOffsets, inSources, Int32Array.from(topo), decisif);
  const remplissage = feuillesEtExigences(grille, commutateurs, N, index, type, indexDonnee, inOffsets, inSources, topo, axePrincipal);

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
    axePrincipal,
    ...chemins,
    commutateurs,
    ...remplissage,
  };
}

/**
 * Feuilles de dispense (1b), dispenses sans effet, obligatoires et minimums (1c).
 * Feuilles par placement : les nœuds de données du sous-arbre de chaque
 * placement du nœud (une position n'a pas d'identité : union des sous-arbres).
 * Un nœud de données est toujours sa propre feuille (case « non évalué »).
 */
function feuillesEtExigences(
  grille: Grille,
  commutateurs: CommutateursResolus,
  N: number,
  index: Map<string, number>,
  type: Uint8Array,
  indexDonnee: Int32Array,
  inOffsets: Int32Array,
  inSources: Int32Array,
  topo: number[],
  axePrincipal: number,
) {
  const soi = (n: number): number[] => (type[n] === TYPE_DONNEES ? [indexDonnee[n]] : []);

  // Par placement, axe par axe.
  const parAxe = grille.axes.map(() => Array.from({ length: N }, (_, n) => new Set(soi(n))));
  grille.axes.forEach((a, ia) => {
    const visiter = (p: Placement): Set<number> => {
      const n = index.get(p.noeud)!;
      const s = new Set(soi(n));
      for (const e of p.enfants ?? []) for (const d of visiter(e)) s.add(d);
      for (const d of s) parAxe[ia][n].add(d);
      return s;
    };
    a.arbre.forEach(visiter);
  });
  const feuillesParAxe = parAxe.map(versCsr);
  const placement = Array.from({ length: N }, (_, n) => {
    const s = new Set<number>();
    for (const axe of parAxe) for (const d of axe[n]) s.add(d);
    return s;
  });

  // Dépendances de calcul : les données en amont, en ordre topologique.
  const dependances = Array.from({ length: N }, (_, n) => new Set(soi(n)));
  for (const n of topo)
    for (let i = inOffsets[n]; i < inOffsets[n + 1]; i++) for (const d of dependances[inSources[i]]) dependances[n].add(d);

  const mode = commutateurs.feuilles1b;
  const feuillesDispense = mode === "B" ? versCsr(dependances) : mode === "C" ? feuillesParAxe[axePrincipal] : versCsr(placement);

  const dispenseSansEffet = new Uint8Array(N);
  for (let n = 0; n < N; n++) {
    const sansCalcul = type[n] === TYPE_REGROUPEMENT || type[n] === TYPE_COMMENTAIRE;
    dispenseSansEffet[n] =
      commutateurs.dispense1a === "B" ? (sansCalcul ? 1 : 0) : feuillesDispense.offsets[n + 1] === feuillesDispense.offsets[n] ? 1 : 0;
  }

  const obligatoires = Int32Array.from(
    grille.noeuds.flatMap((noeud, n) => (noeud.type === "donnees" && noeud.obligatoire && type[n] === TYPE_DONNEES ? [indexDonnee[n]] : [])),
  );

  // 1c : feuilles selon 1b ; en 1b-C (pas d'axe de dispense), par placement sur tous les axes.
  const minimums: MinimumCompile[] = [];
  if (commutateurs.minimum1c) {
    for (const m of grille.exigences?.minimumParRegroupement ?? []) {
      if (axePrincipal >= 0 && m.noeud === grille.axes[axePrincipal].id) {
        // Minimum de grille, écrit sur la racine de l'axe principal : toutes ses données placées.
        const s = new Set<number>();
        for (let n = 0; n < N; n++) for (const d of parAxe[axePrincipal][n]) s.add(d);
        minimums.push({ n: -1, minActives: m.minActives, feuilles: Int32Array.from([...s].sort((a, b) => a - b)) });
        continue;
      }
      const n = index.get(m.noeud)!;
      const feuilles = mode === "B" ? dependances[n] : placement[n];
      minimums.push({ n, minActives: m.minActives, feuilles: Int32Array.from([...feuilles].sort((a, b) => a - b)) });
    }
  }

  return { feuillesDispense, feuillesParAxe, dispenseSansEffet, obligatoires, minimums };
}

/**
 * Chemins multiples (18 §3), règle provisoire du ticket #17 :
 * - exigence : nœud de calcul à sortie binaire (F2, F3, F4, F7) du cône du
 *   nœud décisif, lui compris, dont aucune entrée n'est un calcul binaire ;
 *   un nœud qui atteint au moins 2 exigences « contribue à plusieurs exigences » ;
 * - un nœud qui atteint un même résultat R par au moins 2 de ses consommateurs
 *   directs (R compris) a une « influence multiple » sur R.
 * Atteignabilité par ensembles de bits, en ordre topologique inverse.
 */
function cheminsMultiples(
  N: number,
  type: Uint8Array,
  fonction: Uint8Array,
  inOffsets: Int32Array,
  inSources: Int32Array,
  topo: Int32Array,
  decisif: number,
) {
  const consommateurs: number[][] = Array.from({ length: N }, () => []);
  for (let n = 0; n < N; n++)
    for (let i = inOffsets[n]; i < inOffsets[n + 1]; i++) {
      const c = consommateurs[inSources[i]];
      if (!c.includes(n)) c.push(n);
    }
  const W = (N + 31) >>> 5;
  const bit = (b: Uint32Array, i: number) => (b[i >>> 5] >>> (i & 31)) & 1;
  /** aval[n] : nœuds atteints depuis n, n exclu. */
  const aval = Array.from({ length: N }, () => new Uint32Array(W));
  /** Ensemble {c} ∪ aval[c]. */
  const avecSoi = (c: number) => {
    const b = aval[c].slice();
    b[c >>> 5] |= 1 << (c & 31);
    return b;
  };
  for (let t = N - 1; t >= 0; t--) {
    const n = topo[t];
    for (const c of consommateurs[n]) {
      const a = aval[n];
      const ac = aval[c];
      for (let w = 0; w < W; w++) a[w] |= ac[w];
      a[c >>> 5] |= 1 << (c & 31);
    }
  }

  const binaire = (n: number) => type[n] === TYPE_CALCUL && [2, 3, 4, 7].includes(fonction[n]);
  const exigences: number[] = [];
  if (decisif >= 0) {
    const cone = new Uint8Array(N);
    const pile = [decisif];
    while (pile.length > 0) {
      const n = pile.pop()!;
      if (cone[n]) continue;
      cone[n] = 1;
      for (let i = inOffsets[n]; i < inOffsets[n + 1]; i++) pile.push(inSources[i]);
    }
    for (let n = 0; n < N; n++) {
      if (!cone[n] || !binaire(n)) continue;
      let feuille = true;
      for (let i = inOffsets[n]; i < inOffsets[n + 1]; i++) if (binaire(inSources[i])) feuille = false;
      if (feuille) exigences.push(n);
    }
  }

  const marques = new Uint8Array(N);
  const plusieursExigences = new Map<number, number[]>();
  const influenceMultiple = new Map<number, number[]>();
  for (let n = 0; n < N; n++) {
    if (type[n] === TYPE_REGROUPEMENT || type[n] === TYPE_COMMENTAIRE) continue;
    const atteintes = exigences.filter((e) => e === n || bit(aval[n], e));
    if (atteintes.length >= 2) {
      plusieursExigences.set(n, atteintes);
      marques[n] |= CHEMIN_PLUSIEURS_EXIGENCES;
    }
    if (consommateurs[n].length < 2) continue;
    const vu = new Uint32Array(W);
    const deuxFois = new Uint32Array(W);
    for (const c of consommateurs[n]) {
      const s = avecSoi(c);
      for (let w = 0; w < W; w++) {
        deuxFois[w] |= vu[w] & s[w];
        vu[w] |= s[w];
      }
    }
    const resultats: number[] = [];
    for (let r = 0; r < N; r++) if (bit(deuxFois, r)) resultats.push(r);
    if (resultats.length > 0) {
      influenceMultiple.set(n, resultats);
      marques[n] |= CHEMIN_INFLUENCE_MULTIPLE;
    }
  }
  return { cheminsMultiples: marques, plusieursExigences, influenceMultiple, consommateurs };
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
