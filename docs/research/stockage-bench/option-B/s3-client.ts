// Un client de S3 : bun run s3-client.ts <participant id> <case> <n> ; écrit n notes, une transaction et un writeId neuf chacune.
import { connecter, formateur, grilleId, maintenant, stats } from "./commun";
const [p, cle, n] = process.argv.slice(2);
const sql = connecter();
const G = grilleId("G3 V2");
const auteur = formateur(cle === "gestion" ? "Arnica" : "Balou");
await sql`select 1`;
const ms: number[] = []; const versions: number[] = []; let erreurs = 0;
const t0 = maintenant();
for (let i = 0; i < Number(n); i++) {
  const t = maintenant();
  try {
    const [r] = await sql`select * from b.ecrire(${G}, ${p}, 'note', ${cle}, ${{ valeur: i % 2 }}::jsonb, ${Bun.randomUUIDv7()}, ${auteur})`;
    versions.push(r.version);
  } catch (e: any) { erreurs++; console.error(e.message); }
  ms.push(maintenant() - t);
}
const total = maintenant() - t0;
console.log(JSON.stringify({ cle, total_ms: +total.toFixed(1), erreurs, croissantes: versions.every((v, i) => i === 0 || v > versions[i - 1]), ...stats(ms) }));
await sql.close();
