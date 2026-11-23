// Outils communs de l'option C : connexion, ids du jeu, export de l'état, mesures, noyau du prototype.
import { SQL } from "bun";
import { readFileSync } from "node:fs";

export const JEU = `${import.meta.dir}/../jeu`;
export const ICI = import.meta.dir;
export const MAIN = `${import.meta.dir}/../../../..`;
const NOYAU = `${MAIN}/prototype/src/noyau`;
export const { compile, TYPE_CALCUL } = await import(`${NOYAU}/compile.ts`);
export const { evaluate, MARQUE_JOKER_APPLIQUE, MARQUE_INFLUENCE_JOKER } = await import(`${NOYAU}/evaluate.ts`);
export const { structureIdentique } = await import(`${NOYAU}/copier.ts`);

export const BASE = process.env.BASE ?? "stock_c";
export function connexion(max = 1) {
  return new SQL({ url: `postgres://postgres@localhost:55432/${BASE}`, host: "/var/lib/postgresql/azimut-essai", port: 55432, max });
}

export const cours = JSON.parse(readFileSync(`${JEU}/cours.json`, "utf8"));
export const participants: { id: string; nom: string; groupe: string; type?: boolean }[] = cours.participants;
export const formateur = (totem: string) => cours.formateurs.find((f: any) => f.totem === totem).id as string;
export const grilleId = (cle: string) => cours.grilles.find((g: any) => g.cle === cle).id as string;
export const nomDe = new Map(participants.map((p) => [p.id, p.nom]));

export const lireJson = (f: string) => JSON.parse(readFileSync(f, "utf8"));
export const lireNdjson = (f: string) => readFileSync(f, "utf8").trim().split("\n").map((l) => JSON.parse(l));

// ------------------------------------------------------------- mesures
export function stats(ms: number[]) {
  const t = [...ms].sort((a, b) => a - b);
  const med = t.length % 2 ? t[(t.length - 1) / 2] : (t[t.length / 2 - 1] + t[t.length / 2]) / 2;
  return { n: t.length, mediane: +med.toFixed(3), p95: +t[Math.ceil(0.95 * t.length) - 1].toFixed(3), min: +t[0].toFixed(3), max: +t.at(-1)!.toFixed(3) };
}
export async function mesurer(n: number, chauffe: number, f: (i: number) => Promise<unknown>) {
  for (let i = 0; i < chauffe; i++) await f(i);
  const ms: number[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    await f(chauffe + i);
    ms.push(performance.now() - t0);
  }
  return stats(ms);
}

// ------------------------------------------------------------- export de l'état (format attendu/etat-*.json)
// `src` permet d'exporter un état rejoué : préfixe de tables (cases, commentaires, non_evaluations, jokers_poses, finalisations).
export async function exporterEtat(sql: SQL, grille: string, src = "azimut.") {
  const q = (s: string) => sql.unsafe(s.replaceAll("@", src), [grille]);
  const notes = await q(`select participant_id, noeud, valeur, version from @cases where grille_id = $1`);
  const com = await q(`select participant_id, noeud, texte, version from @commentaires where grille_id = $1`);
  const ne = await q(`select participant_id, noeud, axe from @non_evaluations where grille_id = $1 and active order by horodatage, noeud`);
  const jk = await q(`select participant_id, joker_def, justification, auteur, horodatage from @jokers_poses where grille_id = $1 and actif order by horodatage`);
  const fin = await q(`select participant_id, auteur, horodatage, erreurs_acceptees from @finalisations where grille_id = $1 and etat = 'finalise'`);
  return participants.map((p) => {
    const n = notes.filter((r: any) => r.participant_id === p.id);
    const c = com.filter((r: any) => r.participant_id === p.id);
    const f = fin.find((r: any) => r.participant_id === p.id);
    return {
      participant: p.id,
      nom: p.nom,
      notes: Object.fromEntries(n.filter((r: any) => r.valeur !== null).map((r: any) => [r.noeud, { valeur: Number(r.valeur), ecritures: r.version }]).sort()),
      commentaires: Object.fromEntries(c.filter((r: any) => r.texte !== null).map((r: any) => [r.noeud, { texte: r.texte, ecritures: r.version }]).sort()),
      notesEffacees: n.filter((r: any) => r.valeur === null).map((r: any) => r.noeud).sort(),
      nonEvaluations: ne.filter((r: any) => r.participant_id === p.id).map((r: any) => ({ noeud: r.noeud, axe: r.axe === "" ? null : r.axe })),
      jokers: jk.filter((r: any) => r.participant_id === p.id).map((r: any) => ({ jokerDef: r.joker_def, justification: r.justification, auteur: r.auteur, horodatage: new Date(r.horodatage).toISOString() })),
      finalisation: f ? { auteur: f.auteur, horodatage: new Date(f.horodatage).toISOString(), erreursAcceptees: f.erreurs_acceptees } : null,
    };
  });
}

// ------------------------------------------------------------- reconstruction des entrées du noyau
// Lignes → SourcesParticipant (index du plan compilé).
export function sourcesDe(plan: any, cases: { noeud: string; valeur: any }[], nes: { noeud: string; axe: string }[], jokers: { joker_def: string }[]) {
  const c = new Float64Array(plan.D).fill(NaN);
  for (const r of cases) c[plan.indexDonnee[plan.index.get(r.noeud)]] = Number(r.valeur);
  const nonEvaluations = nes.map((ne) => {
    const axe = ne.axe ? plan.grille.axes.findIndex((a: any) => a.id === ne.axe) : -1;
    return axe >= 0 ? { n: plan.index.get(ne.noeud), axe } : { n: plan.index.get(ne.noeud) };
  });
  return { cases: c, nonEvaluations, jokers: jokers.map((j, id) => ({ id, jokerDef: plan.indexJoker.get(j.joker_def) })) };
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
// Écart aux résultats attendus (1e-9, null = sans résultat, marques comprises) ; [] = identique.
export function ecarts(obtenu: ReturnType<typeof resultats>, attendu: any): string[] {
  const d: string[] = [];
  for (const k of new Set([...Object.keys(attendu.resultats), ...Object.keys(obtenu.valeurs)])) {
    const a = attendu.resultats[k];
    const o = obtenu.valeurs[k];
    if (a === null || o === null || a === undefined || o === undefined ? a !== o : Math.abs(a - o) > 1e-9) d.push(`${k}: ${a} ≠ ${o}`);
  }
  if (JSON.stringify([...attendu.jokerApplique].sort()) !== JSON.stringify([...obtenu.jokerApplique].sort())) d.push("jokerApplique");
  if (JSON.stringify([...attendu.influenceJoker].sort()) !== JSON.stringify([...obtenu.influence].sort())) d.push("influenceJoker");
  return d;
}

// md5 du dump trié des saisies et de l'historique de saisie d'une grille (ou de toutes si null).
export async function md5Saisies(sql: SQL, grille: string | null = null) {
  const [r] = await sql`
    select md5(string_agg(l, E'\n' order by l)) as md5, count(*)::int as lignes from (
      select 'c|' || c::text as l from azimut.cases c where ${grille}::uuid is null or grille_id = ${grille}
      union all select 'm|' || c::text from azimut.commentaires c where ${grille}::uuid is null or grille_id = ${grille}
      union all select 'n|' || c::text from azimut.non_evaluations c where ${grille}::uuid is null or grille_id = ${grille}
      union all select 'j|' || c::text from azimut.jokers_poses c where ${grille}::uuid is null or grille_id = ${grille}
      union all select 'f|' || c::text from azimut.finalisations c where ${grille}::uuid is null or grille_id = ${grille}
      union all select 'h|' || h::text from azimut.historique h where h.nature <> 'libelle' and (${grille}::uuid is null or grille_id = ${grille})
    ) t`;
  return r as { md5: string; lignes: number };
}
