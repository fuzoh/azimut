// S6 : un dossier finalisé se relit à l'identique. bun run s6.ts
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { connecter, formateur, JEU, log, participant, versionDe } from "./commun";
import { canon, compile, comparer, resultats, versSources } from "./moteur";
const sql = connecter();
const v = await versionDe(sql, "G3 V2");
const ulysse = participant("Ulysse");
const arnica = formateur("Arnica");
const att = readFileSync(`${JEU}/attendu/resultats-g3-v2.ndjson`, "utf8").trim().split("\n").map((l) => JSON.parse(l)).find((r) => r.nom === "Ulysse");
log("erreurs de remplissage attendues pour Ulysse :", att.erreursRemplissage);
const [f] = await sql`select * from finaliser(${Bun.randomUUIDv7()}, ${v}, ${ulysse}, ${att.erreursRemplissage}::text[], ${arnica})`;
const exporter = async () => (await sql`select document_grille(${v}, false) structure, sources_participant(${v}, ${ulysse}) sources,
  empreinte_dossier(${v}, ${ulysse}) e_serveur, (select version_id from finalisations where participant_id = ${ulysse} and finalise) rattache,
  document_grille(${v}) g`)[0];
const h = (x: any) => createHash("sha256").update(JSON.stringify(canon(x))).digest("hex");
const x1 = await exporter();
const E1 = { client: h({ s: x1.structure, src: x1.sources }), serveur: x1.e_serveur, finalisation: f.empreinte };
log("E1 :", E1, "rattaché à la version", x1.rattache);

// (1) renommer un libellé
await sql`update noeuds set libelle = 'Planification de l''E1 (corrigé)' where version_id = ${v} and code = 'planif-e1'`;
// (2) copier G3 V2 à l'identique avec ses données
const t = performance.now();
const [c] = await sql`select copier_grille(${v}, 'G3 V2 (copie S6)', null, ${arnica}) v`;
log(`(2) copie à l'identique : ${(performance.now() - t).toFixed(0)} ms, version ${c.v}`);
// (3) écrire pour un autre participant
const [w3] = await sql`select * from ecrire_note(${Bun.randomUUIDv7()}, ${v}, ${participant("Romuald")}, 'gestion', 2, ${arnica})`;
log("(3) écriture Romuald :", { ...w3 });
// (4) tenter une écriture sur Ulysse
try {
  await sql`select * from ecrire_note(${Bun.randomUUIDv7()}, ${v}, ${ulysse}, 'gestion', 0, ${arnica})`;
  log("(4) écriture Ulysse ACCEPTÉE : ÉCHEC");
} catch (e: any) { log(`(4) écriture Ulysse refusée par le serveur : ${e.errno} ${e.message}`); }
try {
  await sql`select * from ecrire_commentaire(${Bun.randomUUIDv7()}, ${v}, ${ulysse}, 'gestion', 'test', ${arnica})`;
} catch (e: any) { log(`    commentaire Ulysse refusé : ${e.errno}`); }
const x2 = await exporter();
const E2 = { client: h({ s: x2.structure, src: x2.sources }), serveur: x2.e_serveur };
log("E2 :", E2, "rattaché à la version", x2.rattache);
log(`E1 = E2 : client ${E1.client === E2.client}, serveur ${E1.serveur === E2.serveur && E1.finalisation === E2.serveur}, même version ${x1.rattache === x2.rattache}`);
const plan = compile(x2.g);
const ec = comparer(resultats(plan, versSources(plan, x2.sources)), att);
log(`résultats recalculés d'Ulysse = attendu : ${ec.length === 0 ? "OK" : ec.join("; ")}`);
log(`libellé de planif-e1 affiché ensuite : « ${x2.g.noeuds.find((n: any) => n.id === "planif-e1").libelle} » (règle S4 : libellé courant)`);
const [cp] = await sql`select (select count(*) from finalisations where version_id = ${c.v} and finalise)::int finalises_dans_copie`;
log("dossiers finalisés dans la copie S6 :", cp.finalises_dans_copie, "(les finalisations ne sont pas copiées)");
await sql.close();
