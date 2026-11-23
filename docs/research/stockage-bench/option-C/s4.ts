// S4 — corriger le libellé de `gestion` après l'ouverture de la saisie. bun run s4.ts
import { compile, connexion, ecarts, formateur, grilleId, JEU, lireNdjson, md5Saisies, participants, resultats, sourcesDe } from "./commun";

const sql = connexion();
const G = grilleId("G3 V2");
const attendus = new Map(lireNdjson(`${JEU}/attendu/resultats-g3-v2.ndjson`).map((r: any) => [r.participant, r]));
const compter = async () =>
  (await sql`select (select count(*) from azimut.historique)::int as h, (select count(*) from azimut.libelles)::int as l,
                    (select count(*) from azimut.grille_versions)::int as v,
                    (select n_tup_ins + n_tup_upd + n_tup_del from pg_stat_user_tables where relid = 'azimut.grille_versions'::regclass)::int as gv_modifs`)[0];
const [doc0] = await sql`select encode(hachage, 'hex') as hachage, structure::text = structure::text as x from azimut.grille_versions where grille_id = ${G}`;
const avant = await md5Saisies(sql);
const c0 = await compter();
const t0 = performance.now();
const [r] = await sql`select * from azimut.corriger_libelle(${G}, 'gestion', 'Gestion du groupe pendant le jeu', ${Bun.randomUUIDv7()}, ${formateur("Arnica")})`;
const duree = performance.now() - t0;
const apres = await md5Saisies(sql);
const c1 = await compter();
const [doc1] = await sql`select encode(hachage, 'hex') as hachage from azimut.grille_versions where grille_id = ${G}`;

// (c) recalcul des finalisés depuis la version de structure à laquelle leur dossier est rattaché
const fins = await sql`select f.participant_id, f.version_structure, encode(f.hachage, 'hex') as hachage, gv.structure,
                              encode(gv.hachage, 'hex') as hachage_version
                         from azimut.finalisations f join azimut.grille_versions gv on gv.grille_id = f.grille_id and gv.version = f.version_structure
                        where f.grille_id = ${G} and f.etat = 'finalise' order by f.horodatage`;
const recalcul = [];
for (const f of fins) {
  const plan = compile(f.structure);
  const cases = await sql`select noeud, valeur from azimut.cases where grille_id = ${G} and participant_id = ${f.participant_id} and valeur is not null`;
  const nes = await sql`select noeud, axe from azimut.non_evaluations where grille_id = ${G} and participant_id = ${f.participant_id} and active`;
  const jk = await sql`select joker_def from azimut.jokers_poses where grille_id = ${G} and participant_id = ${f.participant_id} and actif order by horodatage`;
  const d = ecarts(resultats(plan, sourcesDe(plan, cases, nes, jk)), attendus.get(f.participant_id));
  // (d) libellé affiché dans le dossier : règle unique, vue libelles_affiches
  const [lib] = await sql`select libelle, corrige from azimut.libelles_affiches where grille_id = ${G} and noeud = 'gestion'`;
  recalcul.push({ nom: participants.find((p) => p.id === f.participant_id)!.nom, version: f.version_structure, hachageInchange: f.hachage === f.hachage_version, identiqueAttendu: d.length === 0, libelleAffiche: lib.libelle, libelleDuDocument: f.structure.noeuds.find((n: any) => n.id === "gestion").libelle });
}
console.log(JSON.stringify({
  a: "modification en place de la surcouche `libelles` ; le document de structure (version 1, haché) n'est pas touché, aucune nouvelle version",
  reponse: r,
  b: { avant, apres, identique: avant.md5 === apres.md5 },
  hachageStructure: { avant: doc0.hachage, apres: doc1.hachage, identique: doc0.hachage === doc1.hachage },
  e: { lignesEcrites: { libelles: c1.l - c0.l, historique: c1.h - c0.h, grille_versions: c1.v - c0.v }, dureeMs: +duree.toFixed(3) },
  c_d: recalcul,
}, null, 1));
await sql.close();
