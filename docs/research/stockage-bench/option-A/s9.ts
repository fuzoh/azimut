// S9 : requêtes transverses. bun run s9.ts
import { readFileSync } from "node:fs";
import { connecter, cours, log, stats, versionDe } from "./commun";
const sql = connecter();
if (process.env.JIT === "off") await sql`set jit = off`;
const v = await versionDe(sql, "G3 V2");
const [qa, qb] = readFileSync(`${import.meta.dir}/s9.sql`, "utf8").split(/^-- S9 \(b\).*$/m);
const groupeB = cours.groupes.find((g: any) => g.nom === "Groupe B").id;
async function mesurer(f: () => Promise<any>) {
  for (let i = 0; i < 20; i++) await f();
  const ms: number[] = [];
  for (let i = 0; i < 50; i++) { const t = performance.now(); await f(); ms.push(performance.now() - t); }
  return stats(ms);
}
const ra = await sql.unsafe(qa);
const okV2 = ra.filter((r: any) => r.grille === "G3 V2" && r.valeur === 1).length;
log(`S9 (a) lignes ${ra.length}, OK dans G3 V2 ${okV2}`, await mesurer(() => sql.unsafe(qa)));
for (const [regle, objectif] of [["calcul", "comp:communication"], ["placement", "reg:e4"]]) {
  const p = [v, objectif, groupeB, regle];
  const r = await sql.unsafe(qb, p);
  log(`S9 (b) ${regle} ${objectif} : feuilles ${r[0]?.nb_feuilles}, sans note ${r.length}, sans note hors NE ${r.filter((x: any) => !x.couvert).length}`,
      await mesurer(() => sql.unsafe(qb, p)));
}
await sql.close();
