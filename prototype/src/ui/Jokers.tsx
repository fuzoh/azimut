// Jokers d'un participant : appliquer un joker autorisé avec justification,
// retirer un joker posé. La validation à la pose (quota, H5a, H5b) vient du noyau.

import { useState } from "react";
import type { Plan } from "../noyau/compile";
import { TEXTE_RAISON } from "../noyau/jokers";
import { poserJoker, retirerJoker, type Sources } from "../sources/collections";
import { useResult } from "../store/hooks";
import { useJokers } from "./useJokers";

function texteAction(plan: Plan, j: number): string {
  const def = plan.jokerDefs[j];
  const action = def.action.type === "ajout" ? `${def.action.valeur > 0 ? "+" : ""}${def.action.valeur}` : `remonter au seuil (${plan.ids[def.noeudSeuil]} : ${def.seuil})`;
  return `${plan.ids[def.n]} — ${action}${def.libelle ? ` « ${def.libelle} »` : ""}`;
}

export function Jokers({ g, p, plan, sources }: { g: number; p: number; plan: Plan; sources: Sources }) {
  const poses = useJokers(sources).filter((j) => j.g === g && j.p === p);
  const [choix, setChoix] = useState(0);
  const [justification, setJustification] = useState("");
  const [refus, setRefus] = useState<string | null>(null);
  // Résultat courant du nœud autorisé (H5a), souscrit : le store peut être asynchrone.
  const resultat = useResult(g, p, plan.jokerDefs[choix]?.n ?? 0);
  if (plan.jokerDefs.length === 0) return null;
  const { h5a, h5b } = plan.commutateurs;

  const appliquer = () => {
    if (resultat.enCalcul) return;
    const valeur = resultat.valeur;
    const r = poserJoker(sources, plan, g, p, choix, justification, valeur);
    if (r === null) {
      setJustification("");
      setRefus(null);
    } else {
      setRefus(r === "justification" ? "justification obligatoire" : TEXTE_RAISON[r]);
    }
  };

  return (
    <section className="jokers" data-testid="jokers">
      <h3>
        Jokers — {poses.length} / {plan.quotaJokers}
      </h3>
      <p className="reglage">
        H5a : {h5a === "accepte" ? "accepté sans résultat" : "refusé sans résultat"} · H5b : {h5b === "unSeul" ? "un seul par nœud" : "cumulés"}
      </p>
      <ul>
        {poses.map((j) => (
          <li key={j.id} data-joker={j.id} data-noeud={plan.ids[plan.jokerDefs[j.jokerDef]?.n ?? 0]}>
            {texteAction(plan, j.jokerDef)} — « {j.justification} » ({j.auteur}, {j.date}){" "}
            <button type="button" data-action="retirer-joker" onClick={() => retirerJoker(sources, j.id)}>
              retirer
            </button>
          </li>
        ))}
      </ul>
      <div className="pose">
        <select value={choix} onChange={(e) => setChoix(Number(e.target.value))} data-testid="joker-def">
          {plan.jokerDefs.map((_, i) => (
            <option key={i} value={i}>
              {texteAction(plan, i)}
            </option>
          ))}
        </select>
        <input
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="justification"
          data-testid="joker-justification"
        />
        {/* Résultat en calcul : H5a se jugerait sur une valeur périmée (NaN). */}
        <button type="button" data-action="appliquer-joker" onClick={appliquer} disabled={resultat.enCalcul}>
          appliquer
        </button>
        {refus && (
          <p className="refus" data-testid="joker-refus">
            Refusé : {refus}
          </p>
        )}
      </div>
    </section>
  );
}
