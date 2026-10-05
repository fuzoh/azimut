// Table participants × nœuds de l'axe principal, avec édition d'une case.

import { memo, useMemo, useState } from "react";
import { type BaremeCompile, type Plan, TYPE_CALCUL, TYPE_DONNEES } from "../noyau/compile";
import type { Placement } from "../noyau/format";
import { ecrireCase, type Sources } from "../sources/collections";
import { useLiveParticipants } from "./useParticipants";
import { useResult } from "../store/hooks";

interface Colonne {
  n: number;
  profondeur: number;
  /** Index de la colonne parente, -1 à la racine. */
  parent: number;
  feuille: boolean;
}

/** Colonnes : parcours en profondeur de l'axe principal (un nœud peut revenir). */
function colonnes(plan: Plan): Colonne[] {
  const res: Colonne[] = [];
  const visiter = (p: Placement, profondeur: number, parent: number) => {
    const i = res.length;
    res.push({ n: plan.index.get(p.noeud)!, profondeur, parent, feuille: !p.enfants?.length });
    for (const e of p.enfants ?? []) visiter(e, profondeur + 1, i);
  };
  for (const p of plan.grille.axes[plan.axePrincipal].arbre) visiter(p, 0, -1);
  return res;
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
  const texte = (Math.round(v * 100) / 100).toString().replace(".", ",");
  return b.id.startsWith("pct") || b.id.includes("%") ? `${texte} %` : texte;
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

export function Table({ g, plan, sources, filtre }: { g: number; plan: Plan; sources: Sources; filtre: string }) {
  const participants = useLiveParticipants(sources);
  const cols = useMemo(() => colonnes(plan), [plan]);
  const visibles = useMemo(() => filtrer(plan, cols, filtre), [plan, cols, filtre]);
  return (
    <div className="defilement">
      <table>
        <thead>
          <tr>
            <th className="coin">Participant</th>
            {visibles.map(({ n, profondeur }, i) => (
              <th key={i} title={plan.grille.noeuds[n].libelle} className={`type-${plan.type[n]} prof-${profondeur}`}>
                {plan.ids[n]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {participants.map((pt) => (
            <tr key={pt.p}>
              <th className="nom">{pt.nom}</th>
              {visibles.map(({ n }, i) => (
                <Cellule key={i} g={g} p={pt.p} n={n} plan={plan} sources={sources} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Cellule = memo(function Cellule({ g, p, n, plan, sources }: { g: number; p: number; n: number; plan: Plan; sources: Sources }) {
  if (plan.type[n] === TYPE_DONNEES) return <CelluleCase g={g} p={p} n={n} plan={plan} sources={sources} />;
  if (plan.type[n] === TYPE_CALCUL) return <CelluleResultat g={g} p={p} n={n} plan={plan} />;
  return <td className="sans-calcul" />;
});

function CelluleResultat({ g, p, n, plan }: { g: number; p: number; n: number; plan: Plan }) {
  const r = useResult(g, p, n);
  const sansResultat = Number.isNaN(r.valeur);
  return (
    <td className={sansResultat ? "resultat sans-resultat" : "resultat"} data-noeud={plan.ids[n]} data-participant={p}>
      {formater(plan.baremes[plan.bareme[n]], r.valeur)}
    </td>
  );
}

function CelluleCase({ g, p, n, plan, sources }: { g: number; p: number; n: number; plan: Plan; sources: Sources }) {
  const r = useResult(g, p, n);
  const b = plan.baremes[plan.bareme[n]];
  const affiche = Number.isNaN(r.valeur) ? "" : String(r.valeur).replace(".", ",");
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

  const classe = Number.isNaN(r.valeur) ? "cellule-vide" : "cellule-note";
  return (
    <td className={`${classe}${invalide ? " invalide" : ""}`}>
      <input
        data-noeud={plan.ids[n]}
        data-participant={p}
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
