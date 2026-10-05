import { useCallback, useSyncExternalStore } from "react";
import type { LigneJoker, Sources } from "../sources/collections";

const caches = new WeakMap<Sources, LigneJoker[]>();

/** Jokers posés (toutes grilles), triés par id, suivis par subscribeChanges. */
export function useJokers(sources: Sources): LigneJoker[] {
  const subscribe = useCallback(
    (rappel: () => void) => {
      const s = sources.jokers.subscribeChanges(
        () => {
          caches.delete(sources);
          rappel();
        },
        { includeInitialState: false },
      );
      return () => s.unsubscribe();
    },
    [sources],
  );
  return useSyncExternalStore(subscribe, () => {
    let liste = caches.get(sources);
    if (!liste) {
      liste = [...sources.jokers.toArray].sort((a, b) => a.id - b.id);
      caches.set(sources, liste);
    }
    return liste;
  });
}
