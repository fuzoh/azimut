// État du worker de la configuration de base : démarrage, prêt, somme de
// contrôle en désaccord entre les threads, erreur.

import { useSyncExternalStore } from "react";
import type { StoreBase } from "../store/storeBase";
import type { StoreNotes } from "../store/store";

const sansAbonnement = () => () => {};
const aucun = () => null;

export function PastilleWorker({ store }: { store: StoreNotes }) {
  const base = "etatWorker" in store ? (store as StoreBase) : null;
  const etat = useSyncExternalStore(base ? base.abonnerEtatWorker : sansAbonnement, base ? base.etatWorker : aucun);
  if (!etat) return <span className="worker" data-testid="worker" data-statut="aucun" title="store sur le thread principal (sans worker)">· thread principal</span>;
  const titre = `somme principal : ${etat.sommePrincipal}\nsomme worker : ${etat.sommeWorker ?? "…"}${etat.message ? `\n${etat.message}` : ""}`;
  const texte = {
    demarrage: "worker : démarrage…",
    pret: `worker prêt${etat.dureeMs === undefined ? "" : ` (${Math.round(etat.dureeMs)} ms)`}`,
    desaccord: "⚠ worker : somme de contrôle en désaccord",
    erreur: "⚠ worker : erreur",
  }[etat.statut];
  return (
    <span className={`worker worker-${etat.statut}`} data-testid="worker" data-statut={etat.statut} title={titre}>
      · {texte}
    </span>
  );
}
