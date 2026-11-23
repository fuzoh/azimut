// S8 : rejeu. bun run s8.ts
import { readFileSync, writeFileSync } from "node:fs";
import { connecter, exporterEtat, log, stats, versionDe } from "./commun";
const sql = connecter();
const rejeu = readFileSync(`${import.meta.dir}/s8.sql`, "utf8");
const ms: number[] = [];
for (let i = 0; i < 5; i++) {
  const t = performance.now();
  await sql.begin(async (tx) => { await tx.unsafe(rejeu); });
  ms.push(performance.now() - t);
}
log("S8 durée du rejeu (5 exécutions, transaction comprise) :", stats(ms));
const [n] = await sql`select (select count(*) from rejeu.cases)::int cases, (select count(*) from rejeu.commentaires)::int com,
  (select count(*) from azimut.historique)::int historique`;
log("lignes rejouées :", n);
const cmp = await sql.unsafe(readFileSync(`${import.meta.dir}/s8-comparer.sql`, "utf8"));
for (const r of cmp) log(`  ${r.t} : ${r.etat_moins_rejeu}${r.rejeu_moins_etat === null ? "" : " / " + r.rejeu_moins_etat}`);
for (const g of ["G3 V1", "G3 V2"]) {
  const etat = await exporterEtat(sql, await versionDe(sql, g), "rejeu");
  writeFileSync(`${import.meta.dir}/sorties/etat-rejeu-${g.slice(-2).toLowerCase()}.json`, JSON.stringify(etat, null, 1));
}
await sql.close();
