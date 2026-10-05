import { useCallback, useSyncExternalStore } from "react";
import type { LigneParticipant, Sources } from "../sources/collections";

const caches = new WeakMap<Sources, LigneParticipant[]>();

/** Liste des participants, triée par index p, suivie par subscribeChanges. */
export function useLiveParticipants(sources: Sources): LigneParticipant[] {
  const subscribe = useCallback(
    (rappel: () => void) => {
      const s = sources.participants.subscribeChanges(() => {
        caches.delete(sources);
        rappel();
      }, { includeInitialState: false });
      return () => s.unsubscribe();
    },
    [sources],
  );
  return useSyncExternalStore(subscribe, () => {
    let liste = caches.get(sources);
    if (!liste) {
      liste = [...sources.participants.toArray].sort((a, b) => a.p - b.p);
      caches.set(sources, liste);
    }
    return liste;
  });
}
