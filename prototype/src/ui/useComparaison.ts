import { useEffect, useMemo, useState } from "react";
import type { EcartAB } from "../comparaison";
import type { Essai, EtatEssai } from "../essai";

/** Écarts A → B du participant affiché, recalculés quand ses sources ou les réglages changent. */
export function useComparaison(essai: Essai, etat: EtatEssai, g: number, p: number): Map<number, EcartAB> | null {
  const actif = etat.reglages.comparaison !== null && p >= 0;
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!actif) return;
    return essai.session.store.subscribeParticipant(g, p, () => setVersion((v) => v + 1));
  }, [essai, actif, g, p]);
  return useMemo(
    () => (actif ? essai.comparer(g, p) : null),
    // version et revision invalident le calcul.
    [essai, actif, g, p, version, etat.revision, etat.reglages.comparaison],
  );
}
