// Onglet d'erreurs d'un participant et avertissement « données provisoires ».

import type { Plan } from "../noyau/compile";
import type { ErreurRemplissage } from "../noyau/remplissage";
import { useFillStatus } from "../store/hooks";

function libelle(plan: Plan, n: number): string {
  if (n < 0) return `grille entière (${plan.grille.axes[plan.axePrincipal].libelle})`;
  return `${plan.ids[n]} — ${plan.grille.noeuds[n].libelle}`;
}

function texte(plan: Plan, e: ErreurRemplissage): string {
  switch (e.type) {
    case "obligatoire":
      return `Obligatoire sans note active (${e.etat === "vide" ? "vide" : "non évalué"}) : ${libelle(plan, e.n)}`;
    case "minimum":
      return `Minimum non atteint : ${e.actives} note(s) active(s) sur ${e.minActives} exigées — ${libelle(plan, e.n)}`;
    case "minimumSansFeuilles":
      return `Minimum sans feuilles dans ce réglage (inapplicable) : ${libelle(plan, e.n)}`;
    case "dispenseSansEffet":
      return `Dispense sans effet : ${libelle(plan, e.n)} (${e.raison})`;
  }
}

export function Erreurs({ g, p, nom, plan }: { g: number; p: number; nom: string; plan: Plan }) {
  const etat = useFillStatus(g, p);
  return (
    <aside className="erreurs" data-testid="erreurs">
      <h3>Erreurs — {nom}</h3>
      {etat.provisoire && (
        <p className="provisoire" data-testid="provisoire">
          ⚠ Données provisoires : des exigences de remplissage sont insatisfaites.
        </p>
      )}
      {etat.erreurs.length === 0 && etat.signalements.length === 0 ? (
        <p>Aucune erreur.</p>
      ) : (
        <ul>
          {etat.erreurs.map((e, i) => (
            <li key={i} className={`erreur-${e.type}`} data-type={e.type} data-noeud={e.n < 0 ? "" : plan.ids[e.n]}>
              {texte(plan, e)}
            </li>
          ))}
          {etat.signalements.map((s, i) => (
            <li key={`s${i}`} className="signalement" data-type={s.type} data-noeud={plan.ids[s.n]}>
              Chemin multiple (1a-B) : {libelle(plan, s.n)} est calculé normalement, car consommé hors du cône de la dispense
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
