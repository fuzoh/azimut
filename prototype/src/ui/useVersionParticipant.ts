import { useEffect, useState } from "react";
import { useStoreNotes } from "../store/hooks";

/**
 * Version qui change à chaque changement des sources du participant (g, p) :
 * l'explication et le graphe se redemandent alors au store. `actif` faux : pas
 * d'abonnement (calcul paresseux, rien n'est lu).
 */
export function useVersionParticipant(g: number, p: number, actif = true): number {
  const store = useStoreNotes();
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!actif) return;
    return store.subscribeParticipant(g, p, () => setVersion((v) => v + 1));
  }, [store, g, p, actif]);
  return version;
}
