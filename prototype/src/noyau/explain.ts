// `explain(plan, sources, nœud)` (spec 20, « Noyau pur ») : rejoue l'oracle
// avec une trace sur le nœud demandé, puis met en mots : phrase type de la
// fonction, entrées actives et ignorées (et pourquoi), cause d'un « sans
// résultat », normalisation, conversion, arrondi propagé, joker, marques.

import { formater } from "./affichage";
import {
  CHEMIN_INFLUENCE_MULTIPLE,
  CHEMIN_PLUSIEURS_EXIGENCES,
  FONCTIONS,
  type Plan,
  TYPE_CALCUL,
  TYPE_DONNEES,
  TYPE_REGROUPEMENT,
} from "./compile";
import { feuillesDispense } from "./dispense";
import {
  CAUSE,
  evaluate,
  MARQUE_CHEMIN_DISPENSE,
  MARQUE_INFLUENCE_JOKER,
  MARQUE_JOKER_APPLIQUE,
  type Resultats,
  type SourcesParticipant,
  type StatutEntree,
  type TraceNoeud,
  valeurCase,
} from "./evaluate";
import type { ParametresFonction } from "./format";

export interface EntreeExpliquee {
  n: number;
  id: string;
  poids: number;
  /** Rang dans les entrées, à partir de 1 (F5). */
  rang: number;
  valeur: number;
  texte: string;
  statut: StatutEntree;
  /** Pourquoi l'entrée est ignorée ; vide si active. */
  raison: string;
  /** Valeur normalisée (entrées hétérogènes, F1, F5, F6) ; NaN sinon. */
  normalisee: number;
  /** Note saisie conservée sous une dispense, exclue du calcul (18 §4) ; vide sinon. */
  noteConservee: string;
}

export interface JokerExplique {
  /** Valeur avant joker (après conversion et arrondi). */
  initiale: number;
  /** Ajustements appliqués, dans l'ordre. */
  ajustements: string[];
  effective: number;
  /** Jokers posés sur le nœud mais sans effet (H5b « un seul », ou nœud sans résultat). */
  enAttente: string[];
}

export interface Explication {
  n: number;
  id: string;
  libelle: string;
  type: "donnees" | "calcul" | "regroupement" | "commentaire";
  fonction: string;
  /** Phrase type de la fonction, paramètres remplis. */
  phrase: string;
  valeur: number;
  texte: string;
  /** Cause d'un « sans résultat » (voir `CAUSE`) ; CAUSE.aucune s'il y a un résultat. */
  cause: number;
  /**
   * Cause d'origine quand aucune entrée n'est active : vide ou non évalué si
   * toutes les entrées ignorées remontent à cette même cause ; sinon = cause.
   */
  causeRacine: number;
  texteCause: string;
  entrees: EntreeExpliquee[];
  /** Ids des entrées actives, dans l'ordre des entrées. */
  actives: string[];
  normalisation: string;
  /** Détail du calcul de la fonction. */
  calcul: string[];
  brut: number;
  conversion: { avant: number; apres: number } | null;
  arrondi: { pas: number; avant: number; apres: number } | null;
  joker: JokerExplique | null;
  marques: string[];
  /** Toute l'explication, ligne par ligne, pour le panneau. */
  lignes: string[];
}

export const TEXTE_CAUSE: Record<number, string> = {
  [CAUSE.aucune]: "",
  [CAUSE.vide]: "vide",
  [CAUSE.nonEvalue]: "non évalué",
  [CAUSE.aucuneContribution]: "aucune contribution active",
  [CAUSE.denominateurNul]: "dénominateur nul",
  [CAUSE.sansCalcul]: "pas de calcul (regroupement ou commentaire)",
  [CAUSE.entreeSansResultat]: "H4 strict : une entrée est sans résultat",
};

const nombre = (v: number) => String(Math.round(v * 1e4) / 1e4).replace(".", ",");

/** Phrase type de chaque fonction du catalogue (spec 20, « Catalogue de fonctions »). */
export function phraseType(code: string, p: ParametresFonction): string {
  const min = (p.minEntreesActives ?? 1) > 1 ? ` ; sans résultat sous ${p.minEntreesActives} entrées actives` : "";
  switch (code) {
    case "F1":
      return `F1 moyenne pondérée : Σ (valeur × poids) / Σ poids sur les entrées actives${min}.`;
    case "F2":
      return `F2 seuil : OK si l'entrée ≥ ${nombre(p.seuil as number)}, KO sinon${min}.`;
    case "F3":
      return `F3 toutes : OK si toutes les entrées actives sont OK${min}.`;
    case "F4": {
      const k = p.k === "toutes" ? "toutes les entrées actives" : `au moins ${p.k} entrée(s)`;
      const reussie = p.seuil === undefined ? "OK" : `≥ ${nombre(p.seuil)}`;
      return `F4 au moins k : OK si ${k} sont réussies (${reussie})${min}.`;
    }
    case "F5": {
      const mode = p.mode === "derniere" ? "la dernière occurrence qui a un résultat" : "la meilleure occurrence";
      const plafond = p.plafond === undefined ? "sans plafond" : `plafond ${nombre(p.plafond)} sur les occurrences de rang ≥ 2`;
      return `F5 occurrences : retient ${mode}, ${plafond}${min}.`;
    }
    case "F6":
      return `F6 moyenne sans extrêmes : retire les ${p.kHautes} plus hautes et les ${p.kBasses} plus basses, puis fait la moyenne${min}.`;
    case "F7":
      return `F7 double compensation : OK si ${nombre(p.facteurBas as number)} × Σ écarts sous ${nombre(p.pivot as number)} ≤ Σ écarts au-dessus, et au plus ${p.maxInsuffisantes} insuffisante(s)${min}.`;
    default:
      return "";
  }
}

function typeNoeud(plan: Plan, n: number): Explication["type"] {
  const t = plan.type[n];
  return t === TYPE_DONNEES ? "donnees" : t === TYPE_CALCUL ? "calcul" : t === TYPE_REGROUPEMENT ? "regroupement" : "commentaire";
}

/** Non-évaluations qui couvrent la case d, et si elles sont directes. */
function origineNonEvaluation(plan: Plan, sources: SourcesParticipant, n: number): string {
  const d = plan.indexDonnee[n];
  const ids: string[] = [];
  for (const ne of sources.nonEvaluations) {
    if (ne.n === n) ids.push("marquée « non évalué »");
    else if (d >= 0 && feuillesDispense(plan, ne.n, ne.axe).includes(d)) ids.push(`dispense héritée de ${plan.ids[ne.n]}`);
  }
  return ids.join(", ");
}

/** Note saisie d'une case non évaluée, conservée à titre indicatif (18 §4) ; "" sinon. */
export function noteConservee(plan: Plan, sources: SourcesParticipant, n: number): string {
  const d = plan.indexDonnee[n];
  if (plan.type[n] !== TYPE_DONNEES || d < 0) return "";
  const b = plan.baremes[plan.bareme[n]];
  const v = valeurCase(b, sources.cases[d]);
  return Number.isNaN(v) ? "" : formater(b, v);
}

/** Fonctions qui calculent sur les valeurs normalisées quand les entrées sont hétérogènes (voir `evaluate`). */
const NORMALISANTES = new Set(["F1", "F5", "F6"]);

/** Cause d'origine d'un « sans résultat », en remontant les entrées ignorées. */
function causeRacine(plan: Plan, r: Resultats, n: number, memo: Map<number, number>): number {
  const c = r.causes[n];
  if (c !== CAUSE.aucuneContribution || plan.type[n] !== TYPE_CALCUL) return c;
  const connu = memo.get(n);
  if (connu !== undefined) return connu;
  memo.set(n, c);
  const racines = new Set<number>();
  for (let i = plan.inOffsets[n]; i < plan.inOffsets[n + 1]; i++) {
    const s = plan.inSources[i];
    if (Number.isNaN(r.valeurs[s]) && plan.inPoids[i] > 0) racines.add(causeRacine(plan, r, s, memo));
  }
  const res = racines.size === 1 ? [...racines][0] : c;
  memo.set(n, res);
  return res;
}

function texteJoker(plan: Plan, j: number): string {
  const def = plan.jokerDefs[j];
  const action =
    def.action.type === "ajout"
      ? `${def.action.valeur > 0 ? "+" : ""}${nombre(def.action.valeur)}`
      : `remonter au seuil de ${plan.ids[def.noeudSeuil]} (≥ ${nombre(def.seuil)})`;
  return `${action}${def.libelle ? ` « ${def.libelle} »` : ""}`;
}

/** Détail du calcul de la fonction sur les entrées actives (valeurs de calcul). */
function detailCalcul(
  code: string,
  p: ParametresFonction,
  actives: { id: string; x: number; brute: number; w: number; rang: number }[],
  norm: ((v: number, id: string) => number) | null,
): string[] {
  const v = (x: number) => nombre(x);
  switch (code) {
    case "F1": {
      const somme = actives.reduce((a, e) => a + e.x * e.w, 0);
      const poids = actives.reduce((a, e) => a + e.w, 0);
      return [`(${actives.map((e) => `${v(e.x)} × ${v(e.w)}`).join(" + ")}) / ${v(poids)} = ${v(somme)} / ${v(poids)}`];
    }
    case "F2":
      return actives.length ? [`${v(actives[0].x)} ≥ ${v(p.seuil as number)} ? ${actives[0].x >= (p.seuil as number) ? "oui → OK" : "non → KO"}`] : [];
    case "F3": {
      const ko = actives.filter((e) => e.x !== 1).map((e) => e.id);
      return [ko.length === 0 ? `${actives.length} entrée(s) active(s), toutes OK` : `KO : ${ko.join(", ")}`];
    }
    case "F4": {
      const reussies = actives.filter((e) => (p.seuil === undefined ? e.x === 1 : e.x >= p.seuil));
      const k = p.k === "toutes" ? actives.length : (p.k as number);
      return [`${reussies.length} réussie(s) sur ${actives.length} active(s), ${k} exigée(s)`];
    }
    case "F5": {
      // Le plafond porte sur la valeur brute ; la normalisation vient après (voir `evaluate`).
      const lignes = actives.map((e) => {
        const plafonne = e.rang >= 2 && p.plafond !== undefined && e.brute > p.plafond;
        const retenue = plafonne ? (p.plafond as number) : e.brute;
        const normalisee = norm ? ` (normalisée ${v(norm(retenue, e.id))})` : "";
        return `occurrence ${e.rang} (${e.id}) : ${v(e.brute)}${plafonne ? ` → plafonnée à ${v(p.plafond as number)}` : ""}${normalisee}`;
      });
      return [...lignes, p.mode === "derniere" ? "retenue : la dernière" : "retenue : la meilleure"];
    }
    case "F6": {
      const tries = [...actives].sort((a, b) => a.x - b.x);
      const kb = p.kBasses ?? 0;
      const kh = p.kHautes ?? 0;
      const gardees = tries.slice(kb, Math.max(kb, tries.length - kh));
      return [
        `retirées en bas : ${tries.slice(0, kb).map((e) => v(e.x)).join(", ") || "aucune"}`,
        `retirées en haut : ${tries.slice(Math.max(kb, tries.length - kh)).map((e) => v(e.x)).join(", ") || "aucune"}`,
        `gardées : ${gardees.map((e) => v(e.x)).join(", ")}`,
      ];
    }
    case "F7": {
      const pivot = p.pivot as number;
      const hauts = actives.reduce((a, e) => a + Math.max(0, e.x - pivot), 0);
      const bas = actives.reduce((a, e) => a + Math.max(0, pivot - e.x), 0);
      const insuffisantes = actives.filter((e) => e.x < pivot).length;
      return [
        `écarts au-dessus : ${v(hauts)} ; écarts sous le pivot : ${v(bas)} × ${v(p.facteurBas as number)} = ${v(bas * (p.facteurBas as number))}`,
        `${insuffisantes} insuffisante(s) sur ${p.maxInsuffisantes} admise(s)`,
      ];
    }
    default:
      return [];
  }
}

const RAISON: Record<StatutEntree, string> = {
  active: "",
  sansResultat: "sans résultat",
  poidsNul: "poids 0",
  horsCone: "1a-B : feuille couverte par la dispense, retirée du calcul",
};

export function explain(plan: Plan, sources: SourcesParticipant, n: number): Explication {
  const trace: { n: number; noeud?: TraceNoeud } = { n };
  const r = evaluate(plan, sources, trace);
  const t = trace.noeud;
  const b = plan.bareme[n] >= 0 ? plan.baremes[plan.bareme[n]] : null;
  const fmt = (m: number, v: number) => (plan.bareme[m] >= 0 ? formater(plan.baremes[plan.bareme[m]], v) : "—");
  const valeur = r.valeurs[n];
  const cause = r.causes[n];
  const racine = Number.isNaN(valeur) ? causeRacine(plan, r, n, new Map()) : CAUSE.aucune;
  const code = FONCTIONS[plan.fonction[n]] ?? "";
  const p = plan.params[n] ?? {};
  // Seules F1, F5 et F6 passent par la normalisation ; les autres calculent sur les valeurs brutes.
  const heterogene = plan.heterogene[n] === 1 && NORMALISANTES.has(code);

  const entrees: EntreeExpliquee[] = [];
  for (let i = plan.inOffsets[n]; i < plan.inOffsets[n + 1]; i++) {
    const s = plan.inSources[i];
    const statut: StatutEntree = t?.statuts[i - plan.inOffsets[n]] ?? (Number.isNaN(r.valeurs[s]) ? "sansResultat" : "active");
    const sb = plan.baremes[plan.bareme[s]];
    let raison = RAISON[statut];
    if (statut === "sansResultat") {
      const c = causeRacine(plan, r, s, new Map());
      raison = `sans résultat (${TEXTE_CAUSE[r.causes[s]]}${c !== r.causes[s] ? ` : ${TEXTE_CAUSE[c]}` : ""})`;
      if (r.causes[s] === CAUSE.nonEvalue) raison += ` — ${origineNonEvaluation(plan, sources, s)}`;
    }
    const conservee = r.causes[s] === CAUSE.nonEvalue ? noteConservee(plan, sources, s) : "";
    if (conservee && statut !== "active") raison += ` — note conservée ${conservee}, exclue du calcul`;
    entrees.push({
      n: s,
      id: plan.ids[s],
      poids: plan.inPoids[i],
      rang: i - plan.inOffsets[n] + 1,
      valeur: r.valeurs[s],
      texte: fmt(s, r.valeurs[s]),
      statut,
      raison,
      normalisee: heterogene && statut === "active" ? (sb.max === sb.min ? 0 : (r.valeurs[s] - sb.min) / (sb.max - sb.min)) : NaN,
      noteConservee: conservee,
    });
  }
  const actives = entrees.filter((e) => e.statut === "active");

  let phrase = "";
  let texteCause = "";
  const type = typeNoeud(plan, n);
  if (type === "calcul") phrase = phraseType(code, p);
  else if (type === "donnees") phrase = "Case : la note saisie, ou sans résultat si elle est vide ou non évaluée.";
  else phrase = "Pas de résultat : un regroupement ou un commentaire organise la grille sans calcul.";

  if (Number.isNaN(valeur)) {
    texteCause = TEXTE_CAUSE[cause];
    if (cause === CAUSE.nonEvalue) texteCause += ` (${origineNonEvaluation(plan, sources, n)})`;
    if (cause === CAUSE.aucuneContribution) {
      const min = p.minEntreesActives ?? 1;
      if (actives.length > 0 && actives.length < min) texteCause += ` : ${actives.length} entrée(s) active(s) sur ${min} exigée(s)`;
      else if (racine === CAUSE.vide) texteCause += " : toutes les entrées sont vides";
      else if (racine === CAUSE.nonEvalue) texteCause += " : toutes les entrées sont non évaluées";
      else texteCause += " : aucune entrée n'a de résultat";
    }
    if (cause === CAUSE.denominateurNul) texteCause += " : les entrées avec résultat pèsent toutes 0";
  }

  const normalisation =
    heterogene && b
      ? `Entrées sur des barèmes différents : calcul sur les valeurs normalisées (v − min) / (max − min), reportées sur ${b.id} [${nombre(b.min)} ; ${nombre(b.max)}].`
      : "";
  const pourCalcul = actives.map((e) => ({ id: e.id, x: heterogene ? e.normalisee : e.valeur, brute: e.valeur, w: e.poids, rang: e.rang }));
  const norm = heterogene
    ? (v: number, id: string) => {
        const sb = plan.baremes[plan.bareme[plan.index.get(id)!]];
        return sb.max === sb.min ? 0 : (v - sb.min) / (sb.max - sb.min);
      }
    : null;
  const calcul = type === "calcul" && actives.length > 0 ? detailCalcul(code, p, pourCalcul, norm) : [];
  const brut = t?.brut ?? NaN;

  const conv = plan.conversionIndex[n] >= 0 && t && !Number.isNaN(brut) ? { avant: brut, apres: t.apresConversion } : null;
  const arr =
    plan.arrondi[n] > 0 && t && !Number.isNaN(brut) ? { pas: plan.arrondi[n], avant: t.apresConversion, apres: t.apresArrondi } : null;

  // Jokers : posés sur ce nœud (dans l'ordre des ids), appliqués ou en attente.
  const poses = [...sources.jokers].sort((a, c) => a.id - c.id).filter((j) => plan.jokerDefs[j.jokerDef]?.n === n);
  let joker: JokerExplique | null = null;
  if (poses.length > 0) {
    // Le pipeline ne passe par le joker que s'il y a un résultat (H5a : en attente sinon).
    const appliques = Number.isNaN(valeur) ? [] : (t?.jokers ?? []);
    joker = {
      initiale: Number.isNaN(valeur) ? NaN : (t?.apresArrondi ?? NaN),
      ajustements: appliques.map((j) => texteJoker(plan, j)),
      effective: valeur,
      // H5b « un seul » : seul le premier joker posé s'applique.
      enAttente: poses.slice(appliques.length).map((j) => texteJoker(plan, j.jokerDef)),
    };
  }

  const marques: string[] = [];
  const m = r.marques[n];
  if (m & MARQUE_JOKER_APPLIQUE) marques.push("★ joker appliqué");
  if (m & MARQUE_INFLUENCE_JOKER) {
    const par = entrees.filter((e) => e.statut === "active" && r.marques[e.n] & (MARQUE_JOKER_APPLIQUE | MARQUE_INFLUENCE_JOKER));
    marques.push(`☆ influencé par un joker, par ${par.map((e) => e.id).join(", ")}`);
  }
  if (m & MARQUE_CHEMIN_DISPENSE) marques.push("⇶ 1a-B : calculé normalement, consommé hors du cône de la dispense");
  const ids = (l: number[] | undefined) => (l ?? []).map((x) => plan.ids[x]).join(", ");
  if (plan.cheminsMultiples[n] & CHEMIN_PLUSIEURS_EXIGENCES) marques.push(`◆ contribue à plusieurs exigences : ${ids(plan.plusieursExigences.get(n))}`);
  if (plan.cheminsMultiples[n] & CHEMIN_INFLUENCE_MULTIPLE) marques.push(`⇉ influence plusieurs fois : ${ids(plan.influenceMultiple.get(n))}`);
  if (n === plan.decisif) marques.push("nœud décisif");

  const texte = b ? formater(b, valeur) : "—";
  const lignes: string[] = [`${plan.ids[n]} — ${plan.grille.noeuds[n].libelle}`, phrase];
  lignes.push(Number.isNaN(valeur) ? `Sans résultat : ${texteCause}` : `Résultat : ${texte}`);
  if (type === "donnees" && !Number.isNaN(valeur)) lignes.push("Note saisie, active.");
  const conserveeNoeud = cause === CAUSE.nonEvalue ? noteConservee(plan, sources, n) : "";
  if (conserveeNoeud) lignes.push(`Note conservée ${conserveeNoeud}, exclue du calcul (à titre indicatif).`);
  if (entrees.length > 0) {
    lignes.push(`Entrées actives (${actives.length}) : ${actives.map((e) => `${e.id} = ${e.texte}${e.poids !== 1 ? ` (poids ${nombre(e.poids)})` : ""}`).join(" ; ") || "aucune"}`);
    const ignorees = entrees.filter((e) => e.statut !== "active");
    if (ignorees.length > 0) lignes.push(`Entrées ignorées (${ignorees.length}) : ${ignorees.map((e) => `${e.id} — ${e.raison}`).join(" ; ")}`);
  }
  if (normalisation) lignes.push(normalisation);
  lignes.push(...calcul);
  if (type === "calcul" && !Number.isNaN(brut)) lignes.push(`Fonction : ${conv || arr || joker ? nombre(brut) : texte}`);
  if (conv) lignes.push(`Conversion : ${nombre(conv.avant)} → ${fmt(n, conv.apres)}`);
  if (arr) lignes.push(`Arrondi propagé au pas ${nombre(arr.pas)} : ${nombre(arr.avant)} → ${fmt(n, arr.apres)}`);
  if (joker) {
    if (joker.ajustements.length > 0)
      lignes.push(`Joker : ${fmt(n, joker.initiale)} → joker → ${fmt(n, joker.effective)} (${joker.ajustements.join(", ")})`);
    if (joker.enAttente.length > 0) lignes.push(`Joker posé sans effet : ${joker.enAttente.join(", ")}`);
  }
  lignes.push(...marques);

  return {
    n,
    id: plan.ids[n],
    libelle: plan.grille.noeuds[n].libelle,
    type,
    fonction: code,
    phrase,
    valeur,
    texte,
    cause: Number.isNaN(valeur) ? cause : CAUSE.aucune,
    causeRacine: racine,
    texteCause,
    entrees,
    actives: actives.map((e) => e.id),
    normalisation,
    calcul,
    brut,
    conversion: conv,
    arrondi: arr,
    joker,
    marques,
    lignes,
  };
}
