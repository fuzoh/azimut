// S1 : lire ce qu'il faut pour calculer un participant. bun run s1.ts
import { comparerResultats, compile, connecter, cours, grilleId, JEU, lireNdjson, maintenant, resultats, sourcesDepuisDoc, stats } from "./commun";
const sql = connecter();
const G = grilleId("G3 V2");
const ids = cours.participants.map((p: any) => p.id);
const attendus = new Map(lireNdjson(`${JEU}/attendu/resultats-g3-v2.ndjson`).map((r: any) => [r.participant, r]));

// (a) structure relue à chaque lecture : 1 requête (structure + surcouche de libellés + dossier)
const lireA = (p: string) => sql`select s.doc as structure, g.libelles, d.doc
  from b.grille g join b.structure s on s.id = g.structure_id join b.dossier d on d.grille_id = g.id
  where g.id = ${G} and d.participant_id = ${p}`;
// (b) structure en cache client : 1 requête, le dossier seul
const lireB = (p: string) => sql`select doc from b.dossier where grille_id = ${G} and participant_id = ${p}`;
// (b') idem en ne décodant que ce que le calcul lit (sans commentaires)
const lireB2 = (p: string) => sql`select jsonb_build_object('notes', doc->'notes', 'nonEvaluations', doc->'nonEvaluations', 'jokers', doc->'jokers') doc
  from b.dossier where grille_id = ${G} and participant_id = ${p}`;

async function mesurer(f: (p: string) => Promise<any>) {
  const ms: number[] = [];
  for (let i = 0; i < 220; i++) {
    const t = maintenant();
    await f(ids[i % 40]);
    if (i >= 20) ms.push(maintenant() - t);
  }
  return stats(ms);
}

// Exactitude : 40 participants, variante (a) avec compile à chaque fois, variante (b) avec plan en cache.
const ecarts: string[] = [];
const tCompile: number[] = [];
for (const p of ids) {
  const [r] = await lireA(p);
  const t = maintenant();
  const plan = compile(r.structure);
  tCompile.push(maintenant() - t);
  ecarts.push(...comparerResultats(attendus.get(p), resultats(plan, sourcesDepuisDoc(plan, r.doc))));
}
const [{ structure }] = await sql`select s.doc structure from b.grille g join b.structure s on s.id = g.structure_id where g.id = ${G}`;
const planCache = compile(structure);
for (const p of ids) {
  const [r] = await lireB2(p);
  ecarts.push(...comparerResultats(attendus.get(p), resultats(planCache, sourcesDepuisDoc(planCache, r.doc))));
}
const a = await mesurer(lireA);
const b = await mesurer(lireB);
const b2 = await mesurer(lireB2);
// coût client à part : construire les sources + evaluate (plan en cache)
const tEval: number[] = [];
const docs = await Promise.all(ids.map(async (p: string) => (await lireB(p))[0].doc));
for (let i = 0; i < 220; i++) { const t = maintenant(); resultats(planCache, sourcesDepuisDoc(planCache, docs[i % 40])); if (i >= 20) tEval.push(maintenant() - t); }
console.log(JSON.stringify({ ecarts: ecarts.length, premiers: ecarts.slice(0, 5), a_structure_relue: a, b_dossier_seul: b, b2_dossier_sans_commentaires: b2,
  requetes_par_lecture: { a: 1, b: 1 }, compile_ms: stats(tCompile), sources_plus_evaluate_ms: stats(tEval) }, null, 1));
await sql.close();
