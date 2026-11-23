// S2 : écrire une note avec historique, version serveur, writeId idempotent. bun run s2.ts
import { connecter, formateur, log, md5Saisies, participant, stats, versionDe } from "./commun";
const sql = connecter();
const v = await versionDe(sql, "G3 V2");
const romuald = participant("Romuald");
const arnica = formateur("Arnica");
const W = "019f7000-0000-7000-8000-000000000002";
const etatCase = async () => (await sql`select c.valeur, c.version, (select count(*)::int from historique h where h.version_id = c.version_id
  and h.participant_id = c.participant_id and h.noeud_id = c.noeud_id and h.nature = 'note') lignes from cases c join noeuds n on n.id = c.noeud_id
  where c.version_id = ${v} and c.participant_id = ${romuald} and n.code = 'sr5'`)[0];
const totalHist = async () => (await sql`select count(*)::int n from historique`)[0].n;

const e0 = await etatCase();
const h0 = await totalHist();
log("(1) v0 :", e0);
const [r2] = await sql`select * from ecrire_note(${W}, ${v}, ${romuald}, 'sr5', 0, ${arnica})`;
const e2 = await etatCase();
const [lw] = await sql`select count(*)::int n, max(version) version, max(valeur) valeur, max(valeur_avant) avant from historique where write_id = ${W}`;
log("(2) réponse :", { ...r2 }, "état :", e2, "historique +", (await totalHist()) - h0, "ligne(s) de ce writeId :", { ...lw },
    e2.version === e0.version + 1 && (await totalHist()) - h0 === 1 && lw.n === 1 ? "OK" : "ÉCHEC");
const m2 = await md5Saisies(sql);
const [r3] = await sql`select * from ecrire_note(${W}, ${v}, ${romuald}, 'sr5', 0, ${arnica})`;
const m3 = await md5Saisies(sql);
log("(3) rejeu identique : réponse", { ...r3 }, "état", await etatCase(),
    JSON.stringify(m2) === JSON.stringify(m3) && r3.version === r2.version ? "OK (md5 inchangé, même version)" : "ÉCHEC");
let err4 = "";
try { await sql`select * from ecrire_note(${W}, ${v}, ${romuald}, 'sr5', 1, ${arnica})`; } catch (e: any) { err4 = `${e.errno} ${e.message}`; }
const m4 = await md5Saisies(sql);
log("(4) même writeId, valeur 1 : erreur", err4, JSON.stringify(m4) === JSON.stringify(m3) ? "OK (rien ne change)" : "ÉCHEC");
let err5 = "";
try {
  await sql.begin(async (tx) => {
    await tx`select * from ecrire_note('019f7000-0000-7000-8000-000000000005', ${v}, ${romuald}, 'sr5', 1, ${arnica})`;
    await tx`select count(*) from historique where write_id = '019f7000-0000-7000-8000-000000000005'`;
    throw new Error("erreur provoquée après l'insertion d'historique");
  });
} catch (e: any) { err5 = e.message; }
const m5 = await md5Saisies(sql);
log("(5)", err5, "md5 avant", m4, "après", m5, JSON.stringify(m4) === JSON.stringify(m5) ? "OK" : "ÉCHEC");
// (5 bis) erreur levée par le serveur dans la même transaction (contrainte violée après l'historique)
try {
  await sql.begin(async (tx) => {
    await tx`select * from ecrire_note('019f7000-0000-7000-8000-000000000006', ${v}, ${romuald}, 'sr5', 1, ${arnica})`;
    await tx`insert into historique (write_id, version_id, participant_id, nature, version, auteur_id, horodatage)
             values ('019f7000-0000-7000-8000-000000000006', ${v}, ${romuald}, 'note', 1, ${arnica}, now())`;
  });
} catch (e: any) { log("(5 bis) erreur serveur :", e.message); }
log("(5 bis) md5 identique :", JSON.stringify(await md5Saisies(sql)) === JSON.stringify(m4));

// (6) 200 écritures sur des cases différentes, writeId neufs (UUIDv7 générés par le client).
const cases = await sql`select p.id participant, n.code from participants p cross join noeuds n
  where n.version_id = ${v} and n.bareme_id is not null and p.nom not in ('Alice', 'David', 'Cassien', 'Ulysse', 'Victorine')
  order by md5(p.id::text || n.code) limit 220`;
const uuid7 = () => Bun.randomUUIDv7();
const ms: number[] = [];
const h6 = await totalHist();
for (let i = 0; i < 220; i++) {
  const c = cases[i];
  const t = performance.now();
  await sql`select * from ecrire_note(${uuid7()}, ${v}, ${c.participant}, ${c.code}, 1, ${arnica})`;
  if (i >= 20) ms.push(performance.now() - t);
}
log("(6) 200 écritures (après 20 de chauffe), historique +", (await totalHist()) - h6, ":", stats(ms));
await sql.close();
