// Clés numériques denses des sources (spec 20, « Sources dans TanStack DB »).
// k = (g × 1024 + p) × 65536 + d ; même encodage avec n pour les non-évaluations.

export const MAX_PARTICIPANTS = 1024;
export const MAX_NOEUDS = 65536;

export function cle(g: number, p: number, d: number): number {
  return (g * MAX_PARTICIPANTS + p) * MAX_NOEUDS + d;
}

export function decoderCle(k: number): { g: number; p: number; d: number } {
  const d = k % MAX_NOEUDS;
  const gp = (k - d) / MAX_NOEUDS;
  const p = gp % MAX_PARTICIPANTS;
  return { g: (gp - p) / MAX_PARTICIPANTS, p, d };
}

export interface ContexteCle {
  /** Nom de la grille g. */
  grille?: (g: number) => string | undefined;
  /** Nom du participant p. */
  participant?: (p: number) => string | undefined;
  /** Id du nœud de données d (ou du nœud n) dans la grille g. */
  noeud?: (g: number, d: number) => string | undefined;
}

/** Forme lisible d'une clé, par ex. « A03 · Basile · ind:A/2.1/4 (g0 p1 d17) ». */
export function decrireCle(k: number, contexte: ContexteCle = {}): string {
  const { g, p, d } = decoderCle(k);
  const brut = `g${g} p${p} d${d}`;
  const parties = [contexte.grille?.(g), contexte.participant?.(p), contexte.noeud?.(g, d)];
  if (parties.every((x) => x === undefined)) return brut;
  return `${parties.map((x, i) => x ?? brut.split(" ")[i]).join(" · ")} (${brut})`;
}
