// Table participants × nœuds d'un axe, avec édition d'une case. Un nœud placé
// à plusieurs endroits garde une seule case : chaque colonne lit le même nœud n.

import { memo, useMemo, useState } from "react";
import {
  type BaremeCompile,
  CHEMIN_INFLUENCE_MULTIPLE,
  CHEMIN_PLUSIEURS_EXIGENCES,
  type Plan,
  TYPE_CALCUL,
  TYPE_DONNEES,
  TYPE_REGROUPEMENT,
} from "../noyau/compile";
import { CAUSE, MARQUE_CHEMIN_DISPENSE, MARQUE_INFLUENCE_JOKER, MARQUE_JOKER_APPLIQUE } from "../noyau/evaluate";
import type { Placement } from "../noyau/format";
import { cle } from "../sources/cle";
import { basculerNonEvaluation, ecrireCase, type Sources } from "../sources/collections";
import { useLiveParticipants } from "./useParticipants";
import { useFillStatus, useResult } from "../store/hooks";
import { useNonEvaluations } from "./useNonEvaluations";

interface Colonne {
  n: number;
  profondeur: number;
  /** Index de la colonne parente, -1 à la racine. */
  parent: number;
  feuille: boolean;
}

/** Colonnes : parcours en profondeur de l'axe (un nœud peut revenir). */
function colonnes(plan: Plan, axe: number): Colonne[] {
  const res: Colonne[] = [];
  const visiter = (p: Placement, profondeur: number, parent: number) => {
    const i = res.length;
    res.push({ n: plan.index.get(p.noeud)!, profondeur, parent, feuille: !p.enfants?.length });
    for (const e of p.enfants ?? []) visiter(e, profondeur + 1, i);
  };
  for (const p of plan.grille.axes[axe].arbre) visiter(p, 0, -1);
  return res;
}

function racine(cols: Colonne[], i: number): number {
  while (cols[i].parent >= 0) i = cols[i].parent;
  return i;
}

/** Nœuds atteints depuis n par ses consommateurs (n exclu). */
function aval(plan: Plan, n: number): Set<number> {
  const vus = new Set<number>();
  const pile = [...plan.consommateurs[n]];
  while (pile.length > 0) {
    const c = pile.pop()!;
    if (vus.has(c)) continue;
    vus.add(c);
    pile.push(...plan.consommateurs[c]);
  }
  return vus;
}

/**
 * Colonnes « placées sans compter » (18 §3) : sous un calcul dont le nœud n'est
 * ni une entrée (directe ou non) ni un consommateur ; ou sous un regroupement
 * dont aucun nœud ne dépend de lui, et sans entrée placée dans ce regroupement
 * (Itinéraire sous E3, objectifs transversaux de A01).
 */
function placesSansCompter(plan: Plan, cols: Colonne[]): Set<number> {
  const res = new Set<number>();
  const sousArbre = (i: number): Set<number> => {
    const s = new Set<number>();
    for (let j = i + 1; j < cols.length && cols[j].profondeur > cols[i].profondeur; j++) s.add(cols[j].n);
    return s;
  };
  cols.forEach((c, i) => {
    if (c.parent < 0 || plan.consommateurs[c.n].length === 0) return;
    const parent = cols[c.parent];
    const enAval = aval(plan, c.n);
    if (plan.type[parent.n] === TYPE_CALCUL) {
      const entreeDirecte = Array.from(plan.inSources.subarray(plan.inOffsets[c.n], plan.inOffsets[c.n + 1])).includes(parent.n);
      if (!enAval.has(parent.n) && !entreeDirecte && !aval(plan, parent.n).has(c.n)) res.add(i);
    } else if (plan.type[parent.n] === TYPE_REGROUPEMENT) {
      const groupe = sousArbre(c.parent);
      // Un regroupement sans calcul (Cours) ne fait qu'organiser : rien n'y « compte ».
      if (![...groupe].some((x) => plan.type[x] === TYPE_CALCUL)) return;
      const entrees = plan.inSources.subarray(plan.inOffsets[c.n], plan.inOffsets[c.n + 1]);
      if (![...enAval].some((x) => groupe.has(x)) && !Array.from(entrees).some((x) => groupe.has(x))) res.add(i);
    }
  });
  return res;
}

/** Bulle d'un en-tête : libellé, consommateurs, chemins multiples. */
function infoColonne(plan: Plan, n: number, sansCompter: boolean): string {
  const ids = (l: number[] | undefined) => (l ?? []).map((x) => plan.ids[x]).join(", ");
  const lignes = [`${plan.ids[n]} — ${plan.grille.noeuds[n].libelle}`];
  if (plan.consommateurs[n].length > 0) lignes.push(`compte pour : ${ids(plan.consommateurs[n])}`);
  if (sansCompter) lignes.push("↗ placé ici sans y compter");
  if (plan.cheminsMultiples[n] & CHEMIN_PLUSIEURS_EXIGENCES)
    lignes.push(`◆ contribue à plusieurs exigences : ${ids(plan.plusieursExigences.get(n))}`);
  if (plan.cheminsMultiples[n] & CHEMIN_INFLUENCE_MULTIPLE)
    lignes.push(`⇉ influence plusieurs fois : ${ids(plan.influenceMultiple.get(n))}`);
  return lignes.join("\n");
}

function marques(plan: Plan, n: number, sansCompter: boolean): string {
  return (
    (sansCompter ? "↗" : "") +
    (plan.cheminsMultiples[n] & CHEMIN_PLUSIEURS_EXIGENCES ? "◆" : "") +
    (plan.cheminsMultiples[n] & CHEMIN_INFLUENCE_MULTIPLE ? "⇉" : "")
  );
}

/**
 * Filtre : les colonnes dont l'id contient le texte, leurs ancêtres, les
 * feuilles placées sous ces ancêtres (seuil, objectif en %, indicateurs du
 * critère) et les racines feuilles (Réussite).
 */
function filtrer(plan: Plan, cols: Colonne[], filtre: string): Colonne[] {
  if (filtre === "") return cols;
  const ancetres = new Set<number>();
  cols.forEach((c, i) => {
    if (!plan.ids[c.n].includes(filtre)) return;
    for (let a = i; a >= 0; a = cols[a].parent) ancetres.add(a);
  });
  return cols.filter(
    (c, i) => ancetres.has(i) || (c.feuille && (c.parent < 0 || ancetres.has(c.parent))),
  );
}

export function formater(b: BaremeCompile, v: number): string {
  if (Number.isNaN(v)) return "—";
  if (b.type === "ordinal") {
    const rang = b.valeurs.indexOf(v);
    if (b.valeurs.length === 2 && b.min === 0 && b.max === 1) return v === 1 ? "OK" : "KO";
    return rang >= 0 ? String(v) : v.toFixed(2);
  }
  if (b.pourcentage) return `${(Math.round(v * 1000) / 10).toFixed(1).replace(".", ",")} %`;
  if (b.id === "(0–100 %)") return `${(Math.floor(v * 10 + 0.5 + 1e-9) / 10).toFixed(1).replace(".", ",")} %`;
  if (b.id.startsWith("pct") || b.id.includes("%")) return `${(Math.round(v * 100) / 100).toString().replace(".", ",")} %`;
  // Note 1–5 (A03) et (1–5) dérivé (G3) : arrondi d'affichage 0,01, demi vers le haut.
  return (Math.floor(v * 100 + 0.5 + 1e-9) / 100).toFixed(2).replace(".", ",");
}

/** Saisie → valeur stockée (note, ou rang du palier) ; null si invalide ; NaN pour vider. */
export function lireSaisie(b: BaremeCompile, texte: string): number | null {
  const t = texte.trim().replace(",", ".");
  if (t === "") return NaN;
  const v = Number(t);
  if (!Number.isFinite(v)) return null;
  if (b.type === "ordinal") {
    const rang = b.valeurs.indexOf(v);
    return rang >= 0 ? rang : null;
  }
  if (v < b.min || v > b.max) return null;
  if (!(b.pas > 0)) return v;
  const pas = (v - b.min) / b.pas;
  return Math.abs(pas - Math.round(pas)) < 1e-9 ? v : null;
}

export function Table({
  g,
  plan,
  axe,
  sources,
  filtre,
  selection,
  onSelection,
}: {
  g: number;
  plan: Plan;
  axe: number;
  sources: Sources;
  filtre: string;
  selection: number;
  onSelection: (p: number) => void;
}) {
  const participants = useLiveParticipants(sources);
  const nonEvaluations = useNonEvaluations(sources);
  const cols = useMemo(() => colonnes(plan, axe), [plan, axe]);
  const sansCompter = useMemo(() => placesSansCompter(plan, cols), [plan, cols]);
  const visibles = useMemo(() => {
    const index = new Map(cols.map((c, i) => [c, i]));
    return filtrer(plan, cols, filtre).map((c) => ({ ...c, i: index.get(c)! }));
  }, [plan, cols, filtre]);
  // Ligne de groupes : le placement de 1er niveau de chaque colonne.
  const groupes = useMemo(() => {
    const res: { n: number; span: number }[] = [];
    let precedent = -1;
    for (const c of visibles) {
      const r = racine(cols, c.i);
      if (r === precedent) res[res.length - 1].span++;
      else res.push({ n: cols[r].n, span: 1 });
      precedent = r;
    }
    return res;
  }, [cols, visibles]);
  return (
    <div className="defilement">
      <table>
        <thead>
          <tr className="groupes">
            <th className="coin" />
            {groupes.map(({ n, span }, i) => (
              <th key={i} colSpan={span} title={plan.grille.noeuds[n].libelle} data-groupe={plan.ids[n]}>
                {plan.grille.noeuds[n].libelle}
              </th>
            ))}
          </tr>
          <tr className="noeuds">
            <th className="coin">Participant</th>
            {visibles.map(({ n, profondeur, i }) => (
              <th
                key={i}
                title={infoColonne(plan, n, sansCompter.has(i))}
                className={`type-${plan.type[n]} prof-${profondeur}`}
                data-colonne={plan.ids[n]}
                data-marques={marques(plan, n, sansCompter.has(i))}
              >
                {plan.ids[n]}
                <span className="marques">{marques(plan, n, sansCompter.has(i))}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {participants.map((pt) => (
            <tr key={pt.p} className={pt.p === selection ? "selection" : undefined}>
              <NomParticipant g={g} p={pt.p} nom={pt.nom} onClick={() => onSelection(pt.p)} />
              {visibles.map(({ n }, i) => (
                <Cellule
                  key={i}
                  g={g}
                  p={pt.p}
                  n={n}
                  axe={axe}
                  plan={plan}
                  sources={sources}
                  direct={nonEvaluations.has(cle(g, pt.p, n))}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Nom du participant, avec l'avertissement « données provisoires » ; un clic ouvre son onglet d'erreurs. */
function NomParticipant({ g, p, nom, onClick }: { g: number; p: number; nom: string; onClick: () => void }) {
  const etat = useFillStatus(g, p);
  return (
    <th className="nom" onClick={onClick} data-participant={p} data-provisoire={etat.provisoire ? "1" : "0"}>
      {nom}
      {etat.provisoire && (
        <span className="avertissement" title={`Données provisoires : ${etat.erreurs.length} erreur(s)`}>
          {" "}⚠
        </span>
      )}
    </th>
  );
}

interface PropsCellule {
  g: number;
  p: number;
  n: number;
  axe: number;
  plan: Plan;
  sources: Sources;
  /** Une non-évaluation est posée directement sur ce nœud pour ce participant. */
  direct: boolean;
}

/** Clic droit : poser ou retirer une non-évaluation sur le nœud (case, calcul ou regroupement). */
function basculer(e: React.MouseEvent, { sources, g, p, n, axe }: PropsCellule) {
  e.preventDefault();
  basculerNonEvaluation(sources, g, p, n, axe);
}

const Cellule = memo(function Cellule(props: PropsCellule) {
  const { n, plan } = props;
  if (plan.type[n] === TYPE_DONNEES) return <CelluleCase {...props} />;
  if (plan.type[n] === TYPE_CALCUL) return <CelluleResultat {...props} />;
  if (plan.type[n] === TYPE_REGROUPEMENT) return <CelluleRegroupement {...props} />;
  return <td className="sans-calcul" />;
});

function CelluleRegroupement(props: PropsCellule) {
  const { p, n, plan, direct } = props;
  return (
    <td
      className={`sans-calcul regroupement${direct ? " dispense" : ""}`}
      data-noeud={plan.ids[n]}
      data-participant={p}
      onContextMenu={(e) => basculer(e, props)}
    >
      <button
        type="button"
        className="dispense"
        data-action="dispense"
        title={direct ? "Retirer la dispense" : "Poser une dispense sur ce regroupement"}
        onClick={() => basculerNonEvaluation(props.sources, props.g, p, n, props.axe)}
      >
        {direct ? "dispensé ✕" : "⊘"}
      </button>
    </td>
  );
}

function CelluleResultat(props: PropsCellule) {
  const { g, p, n, plan, direct } = props;
  const r = useResult(g, p, n);
  const sansResultat = Number.isNaN(r.valeur);
  const classes = ["resultat"];
  if (sansResultat) classes.push("sans-resultat");
  if (r.cause === CAUSE.nonEvalue || direct) classes.push("non-evalue");
  const chemin = r.marques & MARQUE_CHEMIN_DISPENSE;
  const applique = r.marques & MARQUE_JOKER_APPLIQUE;
  const influence = r.marques & MARQUE_INFLUENCE_JOKER;
  if (applique) classes.push("joker-applique");
  if (influence) classes.push("joker-influence");
  const bulles = [
    chemin ? "1a-B : calculé normalement, consommé hors du cône de la dispense (chemin multiple)" : "",
    applique ? "★ joker appliqué" : "",
    influence ? "☆ influencé par un joker" : "",
  ].filter((b) => b !== "");
  return (
    <td
      className={classes.join(" ")}
      data-noeud={plan.ids[n]}
      data-participant={p}
      data-non-evalue={direct ? "1" : "0"}
      data-joker={(applique ? "applique " : "") + (influence ? "influence" : "")}
      title={bulles.length > 0 ? bulles.join("\n") : undefined}
      onContextMenu={(e) => basculer(e, props)}
    >
      {direct ? "⊘ " : ""}
      {formater(plan.baremes[plan.bareme[n]], r.valeur)}
      {chemin ? " ⇶" : ""}
      {applique ? " ★" : ""}
      {influence ? " ☆" : ""}
    </td>
  );
}

function CelluleCase(props: PropsCellule) {
  const { g, p, n, plan, sources, direct } = props;
  const r = useResult(g, p, n);
  const b = plan.baremes[plan.bareme[n]];
  // La note stockée reste affichée même non évaluée ; ordinal : la valeur du palier.
  const stockee = b.type === "ordinal" && !Number.isNaN(r.saisie) ? b.valeurs[r.saisie] : r.saisie;
  const affiche = Number.isNaN(stockee) ? "" : String(stockee).replace(".", ",");
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const [invalide, setInvalide] = useState(false);

  const valider = () => {
    if (brouillon === null) return;
    const v = lireSaisie(b, brouillon);
    if (v === null) {
      setInvalide(true);
    } else {
      ecrireCase(sources, g, p, plan.indexDonnee[n], v);
      setInvalide(false);
    }
    setBrouillon(null);
  };

  const nonEvalue = r.cause === CAUSE.nonEvalue;
  const classe = nonEvalue ? "cellule-non-evaluee" : Number.isNaN(stockee) ? "cellule-vide" : "cellule-note";
  const etat = nonEvalue ? "nonEvalue" : Number.isNaN(stockee) ? "vide" : "note";
  return (
    <td
      className={`${classe}${direct ? " ne-direct" : ""}${invalide ? " invalide" : ""}`}
      data-etat={etat}
      onContextMenu={(e) => basculer(e, props)}
      title={nonEvalue ? (direct ? "Non évalué (clic droit pour retirer)" : "Non évalué, couvert par une dispense") : undefined}
    >
      <input
        data-noeud={plan.ids[n]}
        data-participant={p}
        data-etat={etat}
        value={brouillon ?? affiche}
        title={b.type === "ordinal" ? b.libelles.map((l, i) => `${b.valeurs[i]} : ${l}`).join("\n") : `${b.min} à ${b.max}`}
        onChange={(e) => setBrouillon(e.target.value)}
        onBlur={valider}
        onKeyDown={(e) => {
          if (e.key === "Enter") valider();
          if (e.key === "Escape") setBrouillon(null);
        }}
      />
    </td>
  );
}
