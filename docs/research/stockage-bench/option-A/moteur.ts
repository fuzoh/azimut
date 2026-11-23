// Pont vers le noyau du prototype (lecture seule) : sources JSON de la base → SourcesParticipant, résultats.
import { NOYAU } from "./commun";
const { compile, TYPE_CALCUL } = await import(`${NOYAU}/compile.ts`);
const { evaluate, MARQUE_JOKER_APPLIQUE, MARQUE_INFLUENCE_JOKER } = await import(`${NOYAU}/evaluate.ts`);
export { compile };

export function versSources(plan: any, s: { cases: [string, number][]; nonEvaluations: { noeud: string; axe: string | null }[]; jokers: string[] }) {
  const cases = new Float64Array(plan.D).fill(NaN);
  for (const [code, v] of s.cases) cases[plan.indexDonnee[plan.index.get(code)]] = v;
  const nonEvaluations = s.nonEvaluations.map((ne) => ({
    n: plan.index.get(ne.noeud),
    ...(ne.axe ? { axe: plan.grille.axes.findIndex((a: any) => a.id === ne.axe) } : {}),
  }));
  const jokers = s.jokers.map((code, id) => ({ id, jokerDef: plan.indexJoker.get(code) }));
  return { cases, nonEvaluations, jokers };
}

export function resultats(plan: any, sources: any) {
  const r = evaluate(plan, sources);
  const valeurs: Record<string, number | null> = {};
  const jokerApplique: string[] = [];
  const influence: string[] = [];
  for (let n = 0; n < plan.N; n++) {
    if (plan.type[n] !== TYPE_CALCUL) continue;
    valeurs[plan.ids[n]] = Number.isNaN(r.valeurs[n]) ? null : r.valeurs[n];
    if (r.marques[n] & MARQUE_JOKER_APPLIQUE) jokerApplique.push(plan.ids[n]);
    if (r.marques[n] & MARQUE_INFLUENCE_JOKER) influence.push(plan.ids[n]);
  }
  return { valeurs, jokerApplique, influence };
}

/** Compare à une ligne de attendu/resultats-*.ndjson ; rend la liste des écarts. */
export function comparer(obtenu: ReturnType<typeof resultats>, attendu: any): string[] {
  const d: string[] = [];
  for (const [k, v] of Object.entries(attendu.resultats) as [string, number | null][]) {
    const o = obtenu.valeurs[k];
    const ok = v === null ? o === null : o !== null && o !== undefined && Math.abs(o - v) < 1e-9;
    if (!ok) d.push(`${attendu.nom} ${k}: attendu ${v}, obtenu ${o}`);
  }
  if (Object.keys(obtenu.valeurs).length !== Object.keys(attendu.resultats).length) d.push(`${attendu.nom}: nombre de nœuds de calcul`);
  const s = (a: string[]) => JSON.stringify([...a].sort());
  if (s(obtenu.jokerApplique) !== s(attendu.jokerApplique)) d.push(`${attendu.nom}: marques jokerApplique`);
  if (s(obtenu.influence) !== s(attendu.influenceJoker)) d.push(`${attendu.nom}: marques influence`);
  return d;
}

export function canon(x: any): any {
  if (Array.isArray(x)) return x.map(canon);
  if (x && typeof x === "object") return Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])]));
  return x;
}
