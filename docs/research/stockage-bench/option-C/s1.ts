// S1 — lire ce qu'il faut pour calculer un participant de G3 V2, construire Grille + SourcesParticipant, évaluer.
// bun run s1.ts
import { compile, connexion, ecarts, grilleId, JEU, lireNdjson, mesurer, participants, resultats, sourcesDe } from "./commun";

const sql = connexion();
const G = grilleId("G3 V2");
const attendus = new Map(lireNdjson(`${JEU}/attendu/resultats-g3-v2.ndjson`).map((r: any) => [r.participant, r]));

// Une requête : sources du participant agrégées en json, plus (variante a) le document de structure.
const SOURCES = `
  (select coalesce(json_agg(json_build_object('noeud', c.noeud, 'valeur', c.valeur)), '[]') from azimut.cases c
    where c.grille_id = g.id and c.participant_id = $2 and c.valeur is not null) as cases,
  (select coalesce(json_agg(json_build_object('noeud', n.noeud, 'axe', n.axe)), '[]') from azimut.non_evaluations n
    where n.grille_id = g.id and n.participant_id = $2 and n.active) as nes,
  (select coalesce(json_agg(json_build_object('joker_def', j.joker_def) order by j.horodatage), '[]') from azimut.jokers_poses j
    where j.grille_id = g.id and j.participant_id = $2 and j.actif) as jokers`;
const LIRE_A = `select gv.structure, gv.version, ${SOURCES} from azimut.grilles g
  join azimut.grille_versions gv on gv.grille_id = g.id and gv.version = g.version_saisie where g.id = $1`;
const LIRE_B = `select ${SOURCES} from azimut.grilles g where g.id = $1`;

let requetes = 0;
async function lireA(p: string) {
  requetes++;
  const [r] = await sql.unsafe(LIRE_A, [G, p]);
  const grille = r.structure; // jsonb décodé par Bun.sql
  return { grille, r };
}
// (a) structure relue à chaque fois : la Grille est décodée, mais le plan doit être recompilé
let planCache: any = null;
async function lectureA(p: string) {
  const { grille, r } = await lireA(p);
  const plan = compile(grille);
  return { plan, src: sourcesDe(plan, r.cases, r.nes, r.jokers) };
}
async function lectureB(p: string) {
  requetes++;
  const [r] = await sql.unsafe(LIRE_B, [G, p]);
  return { plan: planCache, src: sourcesDe(planCache, r.cases, r.nes, r.jokers) };
}

// Contrôle : les 40 participants, variante a puis b
let ko = 0;
for (const p of participants) {
  const { plan, src } = await lectureA(p.id);
  const d = ecarts(resultats(plan, src), attendus.get(p.id));
  if (d.length) (ko++, console.log("écart (a)", p.nom, d.slice(0, 3)));
}
{
  const [r] = await sql.unsafe(LIRE_A, [G, participants[0].id]);
  planCache = compile(r.structure);
}
for (const p of participants) {
  const { plan, src } = await lectureB(p.id);
  const d = ecarts(resultats(plan, src), attendus.get(p.id));
  if (d.length) (ko++, console.log("écart (b)", p.nom, d.slice(0, 3)));
}
console.log(JSON.stringify({ controle: ko === 0 ? "40/40 identiques (a) et (b)" : `${ko} écarts` }));

const pid = (i: number) => participants[i % participants.length].id;
// Mesures : envoi → décodage → Grille et sources construites (compile mesuré à part, il n'est pas du stockage)
requetes = 0;
const a = await mesurer(200, 20, async (i) => {
  const { grille, r } = await lireA(pid(i));
  return [grille, r.cases, r.nes, r.jokers];
});
const reqA = requetes / 220;
const aCompile = await mesurer(200, 20, (i) => lectureA(pid(i)));
requetes = 0;
const b = await mesurer(200, 20, (i) => lectureB(pid(i)));
const reqB = requetes / 220;
const [taille] = await sql`select octet_length(structure::text) as texte, pg_column_size(structure) as stocke from azimut.grille_versions where grille_id = ${G}`;
console.log(JSON.stringify({ a_lecture_et_decodage: a, a_avec_compile: aCompile, b_sources_seules: b, requetesParLecture: { a: reqA, b: reqB }, structure: taille }));
await sql.close();
