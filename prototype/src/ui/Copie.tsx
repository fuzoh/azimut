// Action « copier » : copie la grille affichée vers une structure cible, avec
// le sort de la dispense d'un regroupement supprimé ; affiche le rapport de copie.

import { useState } from "react";
import type { ElementRapport } from "../noyau/copier";
import { ciblesCopie, copierGrille, type Session } from "../session";

const TEXTE_RAISON_NE = { noeudSupprime: "nœud supprimé", axeSupprime: "axe supprimé (1b-C)" };
const TEXTE_RAISON_JOKER = { definitionSupprimee: "définition supprimée", noeudNonAutorise: "nœud plus autorisé" };

function texte(e: ElementRapport, nom: (p: number) => string): string {
  const qui = nom(e.p);
  const axe = "axe" in e && e.axe !== undefined ? ` (axe ${e.axe})` : "";
  switch (e.type) {
    case "casePerdue":
      return `${qui} · case ${e.noeud} = ${e.valeur} perdue (nœud supprimé)`;
    case "caseNonReprise":
      return `${qui} · case ${e.noeud} = ${e.valeur} non reprise (barème changé)`;
    case "nonEvaluationReportee":
      return `${qui} · non-évaluation de ${e.noeud}${axe} reportée sur ${e.feuilles.join(", ")} (${TEXTE_RAISON_NE[e.raison]})`;
    case "nonEvaluationPerdue":
      return `${qui} · non-évaluation de ${e.noeud}${axe} perdue (${TEXTE_RAISON_NE[e.raison]})${e.feuilles.length ? ` ; elle couvrait ${e.feuilles.join(", ")}` : ""}`;
    case "nonEvaluationSansAxe":
      return `${qui} · non-évaluation de ${e.noeud} copiée sans son axe ${e.axe} (supprimé)`;
    case "jokerPerdu":
      return `${qui} · joker ${e.jokerDef} perdu, quota libéré (${TEXTE_RAISON_JOKER[e.raison]})`;
    case "quotaDepasse":
      return `${qui} · ${e.jokers} jokers repris pour un quota de ${e.quota} : tous gardés, « quota dépassé »`;
  }
}

export function Copie({ session, g, onCopie }: { session: Session; g: number; onCopie: (g: number) => void }) {
  const cibles = ciblesCopie(session, g);
  const [cible, setCible] = useState(0);
  const [mode, setMode] = useState<"reportee" | "perdue">("reportee");
  const [dernier, setDernier] = useState<{ source: string; copie: string; rapport: ElementRapport[] } | null>(null);
  const nom = (p: number) => session.sources.participants.get(p)?.nom ?? `p${p}`;

  const copier = () => {
    const c = cibles[Math.min(cible, cibles.length - 1)];
    const { g: g2, rapport } = copierGrille(session, g, c.structure, { dispenseSupprimee: mode });
    setDernier({ source: session.plans[g].grille.grille, copie: session.plans[g2].grille.grille, rapport });
    setCible(0);
    onCopie(g2);
  };

  return (
    <section className="copie" data-testid="copie">
      <h3>Copier la grille</h3>
      <div className="pose">
        <select value={cible} onChange={(e) => setCible(Number(e.target.value))} data-testid="cible-copie">
          {cibles.map((c, i) => (
            <option key={i} value={i}>
              vers {c.libelle}
            </option>
          ))}
        </select>
        <label>
          dispense d'un regroupement supprimé{" "}
          <select value={mode} onChange={(e) => setMode(e.target.value as "reportee" | "perdue")} data-testid="mode-copie">
            <option value="reportee">reportée sur ses feuilles</option>
            <option value="perdue">perdue</option>
          </select>
        </label>
        <button type="button" data-action="copier" onClick={copier}>
          copier
        </button>
      </div>
      {dernier && (
        <div data-testid="rapport-copie">
          <h3>
            Rapport : {dernier.source} → {dernier.copie}
          </h3>
          {dernier.rapport.length === 0 ? (
            <p>tout est repris tel quel</p>
          ) : (
            <ul>
              {dernier.rapport.map((e, i) => (
                <li key={i} className={`rapport-${e.type}`}>
                  {texte(e, nom)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
