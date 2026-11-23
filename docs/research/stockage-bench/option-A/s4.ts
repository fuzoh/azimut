// S4 : corriger un libellé après l'ouverture de la saisie. bun run s4.ts
import { readFileSync } from "node:fs";
import { connecter, formateur, JEU, log, md5Saisies, participant, versionDe } from "./commun";
import { compile, comparer, resultats, versSources } from "./moteur";
const sql = connecter();
const v = await versionDe(sql, "G3 V2");
const attendus = new Map(readFileSync(`${JEU}/attendu/resultats-g3-v2.ndjson`, "utf8").trim().split("\n").map((l) => JSON.parse(l)).map((r) => [r.nom, r]));
const avant = await md5Saisies(sql, v);
const [s0] = await sql`select (select count(*) from historique_structure)::int hs, (select xmin::text from noeuds where version_id = ${v} and code = 'gestion') xmin`;
const t = performance.now();
const r = await sql.begin(async (tx) => {
  await tx`select set_config('azimut.utilisateur', ${formateur("Arnica")}, true)`;
  return tx`update noeuds set libelle = 'Gestion du groupe pendant le jeu' where version_id = ${v} and code = 'gestion'`;
});
const duree = performance.now() - t;
const apres = await md5Saisies(sql, v);
const [hs] = await sql`select count(*)::int n from historique_structure`;
const [ligne] = await sql`select objet, element, avant, apres from historique_structure order by id desc limit 1`;
log(`(a) modification en place de noeuds.libelle (version de structure inchangée : ${v}), ${r.count} ligne de noeuds + ${hs.n - s0.hs} ligne historique_structure ; durée ${duree.toFixed(2)} ms (transaction, set_config compris)`);
log("    trace :", { ...ligne });
log(`(b) md5 saisies + historique identique : ${JSON.stringify(avant) === JSON.stringify(apres)}`);
const ecarts: string[] = [];
let libelle = "";
for (const nom of ["Alice", "David", "Cassien"]) {
  const [x] = await sql`select document_grille(${v}) g, sources_participant(${v}, ${participant(nom)}) s,
                        (select finalise from finalisations where version_id = ${v} and participant_id = ${participant(nom)}) f,
                        (select empreinte from finalisations where version_id = ${v} and participant_id = ${participant(nom)}) e1,
                        empreinte_dossier(${v}, ${participant(nom)}) e2`;
  const plan = compile(x.g);
  ecarts.push(...comparer(resultats(plan, versSources(plan, x.s)), attendus.get(nom)));
  libelle = x.g.noeuds.find((n: any) => n.id === "gestion").libelle;
  log(`    ${nom} : finalisé ${x.f}, empreinte de finalisation = empreinte actuelle : ${x.e1 === x.e2}`);
}
log(`(c) résultats recalculés des 3 finalisés = attendu : ${ecarts.length === 0 ? "OK" : ecarts.join("; ")}`);
log(`(d) libellé affiché ensuite par ces dossiers : « ${libelle} » (règle : tout dossier affiche le libellé courant ; le libellé n'entre pas dans la structure de calcul ni dans l'empreinte)`);
// Contre-épreuve : toucher au calcul après publication est refusé.
for (const q of [
  sql`update entrees set poids = 2 where noeud_id = (select id from noeuds where version_id = ${v} and code = 'e1#1') and rang = 0`,
  sql`update noeuds set p_seuil = 50 where version_id = ${v} and code = 'seuil:e2'`,
  sql`delete from placements where version_id = ${v} and noeud_id = (select id from noeuds where version_id = ${v} and code = 'sr5')`,
]) {
  try { await q; log("    contre-épreuve : ACCEPTÉ (anomalie)"); } catch (e: any) { log(`    contre-épreuve refusée : ${e.errno} ${e.message}`); }
}
await sql.close();
