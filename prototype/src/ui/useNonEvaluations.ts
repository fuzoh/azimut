import { useCallback, useSyncExternalStore } from "react";
import type { Sources } from "../sources/collections";

const caches = new WeakMap<Sources, Set<number>>();

/** Clés (g, p, n) des non-évaluations posées, suivies par subscribeChanges. */
export function useNonEvaluations(sources: Sources): Set<number> {
  const subscribe = useCallback(
    (rappel: () => void) => {
      const s = sources.nonEvaluations.subscribeChanges(
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
    let cles = caches.get(sources);
    if (!cles) {
      cles = new Set(sources.nonEvaluations.toArray.map((l) => l.k));
      caches.set(sources, cles);
    }
    return cles;
  });
}
