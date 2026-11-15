// `copier(structureV1, structureV2, sourcesV1, options) → {sourcesV2, rapport}`
// (spec 20, « Copie de grille »). Pure : la correspondance passe par `origine`
// sur les nœuds, les axes et les définitions de joker ; le rapport liste
// exactement ce qui n'est pas repris tel quel.

import { type Commutateurs, compile, TYPE_DONNEES } from "./compile";
import { feuillesDispense, type NonEvaluation } from "./dispense";
import { type SourcesParticipant, sourcesVides } from "./evaluate";
import type { Bareme, Grille } from "./format";

export interface OptionsCopie {
  /**
   * Sort d'une non-évaluation sur un nœud non-données supprimé (ou, en 1b-C,
   * dont l'axe est supprimé) : reportée en non-évaluations sur ses feuilles V1
   * encore présentes (défaut), ou perdue.
   */
  dispenseSupprimee?: "reportee" | "perdue";
  /** Commutateurs du modèle : 1b choisit les feuilles V1 d'un report. */
  commutateurs?: Commutateurs;
}

/** Un élément des sources V1 qui n'est pas repris tel quel. Ids : V1 sauf mention. */
export type ElementRapport =
  /** Case d'un nœud supprimé (ou devenu sans case). */
  | { type: "casePerdue"; p: number; noeud: string; valeur: number }
  /** Case d'un nœud conservé dont le barème change : non reprise, la case V2 est vide. */
  | { type: "caseNonReprise"; p: number; noeud: string; valeur: number }
  /** Non-évaluation reportée sur des feuilles (ids V2). `axe` : axe V1 de la dispense. */
  | { type: "nonEvaluationReportee"; p: number; noeud: string; axe?: string; feuilles: string[]; raison: RaisonNonEvaluation }
  /** Non-évaluation perdue ; `feuilles` : feuilles V2 qu'un report aurait couvertes. */
  | { type: "nonEvaluationPerdue"; p: number; noeud: string; axe?: string; feuilles: string[]; raison: RaisonNonEvaluation }
  /** Hors 1b-C, l'axe d'une non-évaluation est supprimé : copiée sur son nœud, sans axe. */
  | { type: "nonEvaluationSansAxe"; p: number; noeud: string; axe: string }
  /** Joker perdu, quota libéré. */
  | { type: "jokerPerdu"; p: number; id: number; jokerDef: string; raison: "definitionSupprimee" | "noeudNonAutorise" }
  /** Jokers repris au-delà du quota V2 : tous gardés, erreur « quota dépassé ». */
  | { type: "quotaDepasse"; p: number; jokers: number; quota: number };

export type RaisonNonEvaluation = "noeudSupprime" | "axeSupprime";

export interface ResultatCopie {
  /** Sources V2 par participant, dans les index de `compile(structureV2)`. */
  sourcesV2: Map<number, SourcesParticipant>;
  rapport: ElementRapport[];
}

/** Barème « identique » pour la reprise des cases : mêmes valeurs possibles. */
function signatureBareme(b: Bareme | undefined): string {
  if (!b) return "";
  if (b.type === "numerique") return JSON.stringify(["numerique", b.min, b.max, b.pas]);
  return JSON.stringify(["ordinal", b.prereglage ?? null, (b.paliers ?? []).map((p) => p.valeur)]);
}

/** Correspondance V1 → V2 par `origine` : id V1 → id V2. */
function correspondance(elements: { id: string; origine?: string }[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of elements) if (typeof e.origine === "string") m.set(e.origine, e.id);
  return m;
}

export function copier(
  structureV1: Grille,
  structureV2: Grille,
  sourcesV1: Map<number, SourcesParticipant>,
  options: OptionsCopie = {},
): ResultatCopie {
  const mode = options.dispenseSupprimee ?? "reportee";
  const plan1 = compile(structureV1, options.commutateurs);
  const plan2 = compile(structureV2, options.commutateurs);
  const noeudsV2 = correspondance(structureV2.noeuds);
  const axesV2 = correspondance(structureV2.axes);
  const jokersV2 = correspondance(structureV2.jokers?.autorises ?? []);
  const bareme = (g: Grille, id: string | undefined) => signatureBareme(g.baremes.find((b) => b.id === id));
  const baremeNoeud = (g: Grille, id: string) => {
    const n = g.noeuds.find((x) => x.id === id);
    return n && n.type === "donnees" ? bareme(g, n.bareme) : "";
  };

  /** Index n V2 d'un nœud V1, -1 s'il est supprimé. */
  const versV2 = (n1: number): number => {
    const id2 = noeudsV2.get(plan1.ids[n1]);
    return id2 === undefined ? -1 : (plan2.index.get(id2) ?? -1);
  };
  /** d V1 → d V2, -1 si la case ne peut pas être reprise (supprimé, sans case, barème changé). */
  const caseV2 = (d1: number): number => {
    const n2 = versV2(plan1.donnees[d1]);
    if (n2 < 0 || plan2.type[n2] !== TYPE_DONNEES) return -1;
    return plan2.indexDonnee[n2];
  };
  const baremeChange = (d1: number): boolean => {
    const id1 = plan1.ids[plan1.donnees[d1]];
    return baremeNoeud(structureV1, id1) !== baremeNoeud(structureV2, noeudsV2.get(id1)!);
  };

  const rapport: ElementRapport[] = [];
  const sourcesV2 = new Map<number, SourcesParticipant>();
  const axeId = (a: number | undefined) => (a === undefined ? undefined : structureV1.axes[a]?.id);

  for (const [p, s1] of sourcesV1) {
    const s2 = sourcesVides(plan2);

    // Cases.
    for (let d1 = 0; d1 < plan1.D; d1++) {
      const valeur = s1.cases[d1];
      if (Number.isNaN(valeur)) continue;
      const noeud = plan1.ids[plan1.donnees[d1]];
      const d2 = caseV2(d1);
      if (d2 < 0) rapport.push({ type: "casePerdue", p, noeud, valeur });
      else if (baremeChange(d1)) rapport.push({ type: "caseNonReprise", p, noeud, valeur });
      else s2.cases[d2] = valeur;
    }

    // Non-évaluations : copiées, ou reportées / perdues.
    const poses = new Map<string, NonEvaluation>();
    const poser = (ne: NonEvaluation) => {
      const k = `${ne.n}`;
      if (!poses.has(k)) poses.set(k, ne);
    };
    const reports: NonEvaluation[] = [];
    for (const ne of s1.nonEvaluations) {
      const noeud = plan1.ids[ne.n];
      const n2 = versV2(ne.n);
      const axe1 = axeId(ne.axe);
      const axe2Id = axe1 === undefined ? undefined : axesV2.get(axe1);
      const axe2 = axe2Id === undefined ? undefined : structureV2.axes.findIndex((a) => a.id === axe2Id);
      const axeSupprime = axe1 !== undefined && axe2 === undefined;
      if (n2 >= 0 && !axeSupprime) {
        poser(axe2 === undefined ? { n: n2 } : { n: n2, axe: axe2 });
        continue;
      }
      if (n2 >= 0 && plan1.commutateurs.feuilles1b !== "C") {
        // L'axe n'a d'effet qu'en 1b-C : la non-évaluation garde son effet.
        poser({ n: n2 });
        rapport.push({ type: "nonEvaluationSansAxe", p, noeud, axe: axe1! });
        continue;
      }
      // Nœud supprimé, ou axe supprimé en 1b-C : les feuilles V1 encore présentes.
      const feuilles = [...feuillesDispense(plan1, ne.n, ne.axe)].map(caseV2).filter((d2) => d2 >= 0);
      const ids = feuilles.map((d2) => plan2.ids[plan2.donnees[d2]]);
      const raison: RaisonNonEvaluation = n2 < 0 ? "noeudSupprime" : "axeSupprime";
      const base = { p, noeud, ...(axe1 === undefined ? {} : { axe: axe1 }), feuilles: ids, raison };
      if (mode === "reportee" && feuilles.length > 0) {
        for (const d2 of feuilles) reports.push({ n: plan2.donnees[d2] });
        rapport.push({ type: "nonEvaluationReportee", ...base });
      } else {
        rapport.push({ type: "nonEvaluationPerdue", ...base });
      }
    }
    for (const ne of reports) poser(ne);
    s2.nonEvaluations = [...poses.values()];

    // Jokers : suivent la définition V2 ; perdus si elle disparaît ou si le nœud n'est plus autorisé.
    for (const j of s1.jokers) {
      const def1 = plan1.jokerDefs[j.jokerDef];
      const id2 = jokersV2.get(def1.id);
      const k2 = id2 === undefined ? undefined : plan2.indexJoker.get(id2);
      if (k2 === undefined) {
        rapport.push({ type: "jokerPerdu", p, id: j.id, jokerDef: def1.id, raison: "definitionSupprimee" });
      } else if (plan2.jokerDefs[k2].n !== versV2(def1.n)) {
        rapport.push({ type: "jokerPerdu", p, id: j.id, jokerDef: def1.id, raison: "noeudNonAutorise" });
      } else {
        s2.jokers.push({ id: j.id, jokerDef: k2 });
      }
    }
    // Seulement si la copie crée le dépassement : un dépassement déjà présent en V1 est repris tel quel.
    if (s2.jokers.length > plan2.quotaJokers && plan2.quotaJokers < plan1.quotaJokers)
      rapport.push({ type: "quotaDepasse", p, jokers: s2.jokers.length, quota: plan2.quotaJokers });

    sourcesV2.set(p, s2);
  }
  return { sourcesV2, rapport };
}

/** Copie à l'identique : chaque nœud, axe et définition de joker porte `origine` = son id. */
export function structureIdentique(g: Grille, nom = `${g.grille} (copie)`): Grille {
  return {
    ...structuredClone(g),
    grille: nom,
    provenance: { grille: g.grille },
    noeuds: g.noeuds.map((n) => ({ ...structuredClone(n), origine: n.id })),
    axes: g.axes.map((a) => ({ ...structuredClone(a), origine: a.id })),
    ...(g.jokers
      ? { jokers: { quota: g.jokers.quota, autorises: g.jokers.autorises.map((j) => ({ ...j, origine: j.id })) } }
      : {}),
  };
}

