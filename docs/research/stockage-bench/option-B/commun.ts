// Outils communs de l'option B (connexion, noyau, export, mesures).
import { SQL } from "bun";
import { readFileSync, writeFileSync } from "node:fs";

export const MAIN = `${import.meta.dir}/../../../..`;
export const JEU = `${import.meta.dir}/../jeu`;
export const ICI = import.meta.dir;
export const URL = `postgres://postgres@localhost:55432/${process.env.BASE ?? "stock_b"}?host=/var/lib/postgresql/azimut-essai`;
export const connecter = (max = 1) => new SQL({ url: URL, max });

const NOYAU = `${MAIN}/prototype/src/noyau`;
export const { compile, TYPE_CALCUL } = await import(`${NOYAU}/compile.ts`);
export const { evaluate, MARQUE_JOKER_APPLIQUE, MARQUE_INFLUENCE_JOKER } = await import(`${NOYAU}/evaluate.ts`);
export const { couverture } = await import(`${NOYAU}/dispense.ts`);

export const cours = JSON.parse(readFileSync(`${JEU}/cours.json`, "utf8"));
export const formateur = (totem: string) => cours.formateurs.find((f: any) => f.totem === totem).id;
export const participant = (nom: string) => cours.participants.find((p: any) => p.nom === nom).id;
export const grilleId = (cle: string) => cours.grilles.find((g: any) => g.cle === cle).id;
export const lireJson = (f: string) => JSON.parse(readFileSync(f, "utf8"));
export const ecrireJson = (f: string, x: unknown) => writeFileSync(f, JSON.stringify(x, null, 1) + "\n");
export const lireNdjson = (f: string) => readFileSync(f, "utf8").trim().split("\n").map((l) => JSON.parse(l));

export function stats(ms: number[]) {
  const t = [...ms].sort((a, b) => a - b);
  return { n: t.length, mediane: +t[Math.ceil(0.5 * t.length) - 1].toFixed(3), p95: +t[Math.ceil(0.95 * t.length) - 1].toFixed(3) };
}
export const maintenant = () => performance.now();

// Sources du noyau depuis un document de dossier (option B).
export function sourcesDepuisDoc(plan: any, doc: any) {
  const cases = new Float64Array(plan.D).fill(NaN);
  for (const [noeud, e] of Object.entries<any>(doc.notes)) if (e.v !== null) cases[plan.indexDonnee[plan.index.get(noeud)]] = e.v;
  const nonEvaluations = Object.values<any>(doc.nonEvaluations)
    .filter((x) => x.active)
    .map((x) => ({ n: plan.index.get(x.noeud), ...(x.axe ? { axe: plan.grille.axes.findIndex((a: any) => a.id === x.axe) } : {}) }));
  const jokers = doc.jokers.map((j: any, id: number) => ({ id, jokerDef: plan.indexJoker.get(j.jokerDef) }));
  return { cases, nonEvaluations, jokers };
}
export function resultats(plan: any, src: any) {
  const r = evaluate(plan, src);
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
// Compare aux attendus (resultats-*.ndjson) à 1e-9 près ; rend la liste des écarts.
export function comparerResultats(att: any, obt: any): string[] {
  const d: string[] = [];
  for (const [k, v] of Object.entries<any>(att.resultats)) {
    const o = obt.valeurs[k];
    const ok = v === null ? o === null || o === undefined : o !== null && o !== undefined && Math.abs(o - v) < 1e-9;
    if (!ok) d.push(`${att.nom} ${k} attendu ${v} obtenu ${o}`);
  }
  if (JSON.stringify([...att.jokerApplique].sort()) !== JSON.stringify([...obt.jokerApplique].sort())) d.push(`${att.nom} jokerApplique`);
  if (JSON.stringify([...att.influenceJoker].sort()) !== JSON.stringify([...obt.influence].sort())) d.push(`${att.nom} influenceJoker`);
  return d;
}

// Export d'un état au format attendu/etat-*.json depuis des documents { participant_id, doc }.
export function exporterEtat(lignes: { participant_id: string; doc: any }[]) {
  const parP = new Map(lignes.map((l) => [l.participant_id, l.doc]));
  return cours.participants.map((p: any) => {
    const d = parP.get(p.id) ?? { notes: {}, commentaires: {}, nonEvaluations: {}, jokers: [], finalisation: null };
    const notes = Object.entries<any>(d.notes).filter(([, e]) => e.v !== null).sort();
    const com = Object.entries<any>(d.commentaires).filter(([, e]) => e.t !== null).sort();
    return {
      participant: p.id,
      nom: p.nom,
      notes: Object.fromEntries(notes.map(([k, e]) => [k, { valeur: e.v, ecritures: e.ver }])),
      commentaires: Object.fromEntries(com.map(([k, e]) => [k, { texte: e.t, ecritures: e.ver }])),
      notesEffacees: Object.entries<any>(d.notes).filter(([, e]) => e.v === null).map(([k]) => k).sort(),
      nonEvaluations: Object.values<any>(d.nonEvaluations).filter((x) => x.active).map((x) => ({ noeud: x.noeud, axe: x.axe })),
      jokers: d.jokers.map((j: any) => ({ jokerDef: j.jokerDef, justification: j.justification, auteur: j.auteur, horodatage: j.horodatage })),
      finalisation: d.finalisation,
    };
  });
}
