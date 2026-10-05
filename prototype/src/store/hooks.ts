// Liaison React : useSyncExternalStore écrit à la main, une souscription par cellule.

import { createContext, useCallback, useContext, useLayoutEffect, useSyncExternalStore } from "react";
import type { EtatRemplissage, ResultatCellule, StoreNotes } from "./store";

export const StoreContext = createContext<StoreNotes | null>(null);

export function useStoreNotes(): StoreNotes {
  const store = useContext(StoreContext);
  if (!store) throw new Error("StoreContext absent");
  return store;
}

export function useResult(g: number, p: number, n: number): ResultatCellule {
  const store = useStoreNotes();
  const subscribe = useCallback((rappel: () => void) => store.subscribeResult(g, p, n, rappel), [store, g, p, n]);
  const r = useSyncExternalStore(subscribe, () => store.getResult(g, p, n));
  useLayoutEffect(() => marquerCommit(), [r]);
  return r;
}

/**
 * Fin de chaîne (spec 20, « Scénarios de performance ») : « commit React »
 * au commit de cellules changées (une marque par commit, quel que soit le
 * nombre de cellules), « peinture » après la frame qui suit. Une saisie en
 * donne deux paires : le passage « en calcul », puis le résultat.
 */
let commitMarque = false;
function marquerCommit() {
  if (commitMarque) return;
  commitMarque = true;
  performance.mark("chaine:commit");
  queueMicrotask(() => {
    commitMarque = false;
  });
  requestAnimationFrame(() => setTimeout(() => performance.mark("chaine:peinture"), 0));
}

export function useFillStatus(g: number, p: number): EtatRemplissage {
  const store = useStoreNotes();
  const subscribe = useCallback((rappel: () => void) => store.subscribeFillStatus(g, p, rappel), [store, g, p]);
  return useSyncExternalStore(subscribe, () => store.getFillStatus(g, p));
}

/** La colonne n de la grille g, un résultat par participant. */
export function useCohort(g: number, n: number): readonly ResultatCellule[] {
  const store = useStoreNotes();
  const subscribe = useCallback((rappel: () => void) => store.subscribeCohort(g, n, rappel), [store, g, n]);
  return useSyncExternalStore(subscribe, () => store.getCohort(g, n));
}
