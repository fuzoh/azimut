// Compteurs relus par le harnais de mesure (spec 20, « Scénarios de performance »,
// N du LRU : coût d'instanciation par participant). Un exemplaire par thread :
// le harnais lit `globalThis.__azimutStats` dans la page et dans le worker.

export interface StatsInstanciation {
  /** Instances de participant créées (entrées dans le LRU ou temporaires). */
  nombre: number;
  /** Temps cumulé de création (lecture des sources + construction), en ms. */
  totalMs: number;
  /** Taille courante du LRU des instances (toutes grilles). */
  lruTaille: number;
}

export const statsInstanciation: StatsInstanciation = { nombre: 0, totalMs: 0, lruTaille: 0 };
(globalThis as { __azimutStats?: StatsInstanciation }).__azimutStats = statsInstanciation;

export function chronoInstanciation<T>(f: () => T): T {
  const t0 = performance.now();
  const r = f();
  statsInstanciation.totalMs += performance.now() - t0;
  statsInstanciation.nombre++;
  return r;
}
