// S7 : dispense de regroupement couvrant un nœud ajouté par copie. bun run s7.ts (après S5)
import { readFileSync } from "node:fs";
import { connecter, JEU, log, participant, stats, versionDe } from "./commun";
const sql = connecter();
const vc = await versionDe(sql, "G3 V2 (copie S5)");
const v1 = await versionDe(sql, "G3 V1");
const chloe = participant("Chloé");
const att = JSON.parse(readFileSync(`${JEU}/attendu/copie-v1-v2.json`, "utf8")).S7;
const ne = await sql`select n.code noeud, a.code axe, ne.active from non_evaluations ne join noeuds n on n.id = ne.noeud_id
  left join axes a on a.id = ne.axe_id where ne.version_id = ${vc} and ne.participant_id = ${chloe}`;
log("lignes de non-évaluation de Chloé dans la copie :", ne.map((r: any) => ({ ...r })));
const q = readFileSync(`${import.meta.dir}/s7.sql`, "utf8");
const cov = (await sql.unsafe(q, [vc, chloe])).map((r: any) => r.code);
log(`couverture : ${cov.join(", ")} ; = attendu (${att.casesCouvertes.join(", ")}) : ${JSON.stringify(cov) === JSON.stringify(att.casesCouvertes)}`);
const [sr5] = await sql`select count(*)::int n from noeuds where version_id = ${v1} and code = 'sr5'`;
log(`sr5 dans V1 : ${sr5.n} nœud ; sr5 couvert dans la copie : ${cov.includes("sr5")}`);
const notes = await sql`select n.code, c1.valeur v1, cc.valeur copie from noeuds n
  left join cases c1 on c1.version_id = ${v1} and c1.participant_id = ${chloe} and c1.noeud_id = n.id
  left join noeuds nc on nc.version_id = ${vc} and nc.origine = n.code
  left join cases cc on cc.version_id = ${vc} and cc.participant_id = ${chloe} and cc.noeud_id = nc.id
  where n.version_id = ${v1} and n.code = any(${cov}) order by n.rang`;
log("notes de Chloé sous reg:e3 (V1 → copie) :", notes.map((r: any) => `${r.code}:${r.v1}→${r.copie}`).join(" "),
    "conservées :", notes.every((r: any) => r.v1 === r.copie));
const ms: number[] = [];
for (let i = 0; i < 70; i++) { const t = performance.now(); await sql.unsafe(q, [vc, chloe]); if (i >= 20) ms.push(performance.now() - t); }
log("durée de la requête de couverture (50 après 20 de chauffe) :", stats(ms));
await sql.close();
