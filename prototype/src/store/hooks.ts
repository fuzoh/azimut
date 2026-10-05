// Liaison React : useSyncExternalStore écrit à la main, une souscription par cellule.

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
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
  return useSyncExternalStore(subscribe, () => store.getResult(g, p, n));
}

export function useFillStatus(g: number, p: number): EtatRemplissage {
  const store = useStoreNotes();
  const subscribe = useCallback((rappel: () => void) => store.subscribeFillStatus(g, p, rappel), [store, g, p]);
  return useSyncExternalStore(subscribe, () => store.getFillStatus(g, p));
}
