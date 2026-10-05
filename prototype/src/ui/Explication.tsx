// Panneau d'explication du nœud choisi dans la table ou le graphe.

import { useEffect, useState } from "react";
import type { Plan } from "../noyau/compile";
import type { Explication as ExplicationNoyau } from "../noyau/explain";
import { useStoreNotes } from "../store/hooks";
import { useVersionParticipant } from "./useVersionParticipant";

export function Explication({ g, p, n, plan, onGraphe }: { g: number; p: number; n: number; plan: Plan; onGraphe: () => void }) {
  const store = useStoreNotes();
  const version = useVersionParticipant(g, p, n >= 0);
  const [e, setE] = useState<ExplicationNoyau | null>(null);
  useEffect(() => {
    let actif = true;
    if (n < 0) setE(null);
    else void store.explain(g, p, n).then((x) => actif && setE(x));
    return () => {
      actif = false;
    };
  }, [store, g, p, n, version]);
  return (
    <section className="explication" data-testid="explication" data-noeud={e?.id ?? ""}>
      <h3>
        Explication{" "}
        <button type="button" data-action="ouvrir-graphe" onClick={onGraphe}>
          graphe du participant
        </button>
      </h3>
      {n < 0 || !e ? (
        <p className="aide">Cliquer une cellule de la table (ou un nœud du graphe) pour l'expliquer.</p>
      ) : (
        <>
          <p className="titre">
            <strong>{e.id}</strong> — {e.libelle}
          </p>
          <p className="phrase">{e.phrase}</p>
          <p className={Number.isNaN(e.valeur) ? "sans-resultat" : "valeur"} data-testid="explication-valeur">
            {Number.isNaN(e.valeur) ? `Sans résultat : ${e.texteCause}` : `Résultat : ${e.texte}`}
          </p>
          {e.entrees.length > 0 && (
            <table className="entrees">
              <thead>
                <tr>
                  <th>entrée</th>
                  <th>poids</th>
                  <th>valeur</th>
                  <th>état</th>
                </tr>
              </thead>
              <tbody>
                {e.entrees.map((x) => (
                  <tr key={x.rang} className={x.statut} data-entree={x.id} data-statut={x.statut}>
                    <td>{x.id}</td>
                    <td>{String(x.poids).replace(".", ",")}</td>
                    <td>
                      {x.texte}
                      {Number.isNaN(x.normalisee) ? "" : ` (normalisée ${String(Math.round(x.normalisee * 1e4) / 1e4).replace(".", ",")})`}
                    </td>
                    <td>{x.statut === "active" ? "active" : `ignorée : ${x.raison}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <ul className="etapes" data-testid="explication-lignes">
            {e.lignes.slice(3).filter((l) => !l.startsWith("Entrées")).map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
