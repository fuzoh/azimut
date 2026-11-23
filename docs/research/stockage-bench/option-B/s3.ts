// S3 : deux processus Bun simultanés. bun run s3.ts <variante>   variante = cases | meme-case | deux-participants
import { connecter, grilleId, maintenant, participant } from "./commun";
const variante = process.argv[2] ?? "cases";
const sql = connecter();
const G = grilleId("G3 V2");
const vic = participant("Victorine");
const plan = variante === "cases" ? [[vic, "gestion"], [vic, "consignes-e2"]]
  : variante === "meme-case" ? [[vic, "gestion"], [vic, "gestion"]]
  : [[vic, "gestion"], [participant("Xavière"), "gestion"]];
const ver = async (p: string, c: string) => (await sql`select coalesce((doc->'notes'->${c}->>'ver')::int, 0) v from b.dossier where grille_id = ${G} and participant_id = ${p}`)[0].v;
const v0 = await Promise.all(plan.map(([p, c]) => ver(p, c)));
const [h0] = await sql`select count(*)::int n, pg_current_wal_lsn() l from b.historique`;
const t0 = maintenant();
const procs = plan.map(([p, c]) => Bun.spawn(["bun", "run", `${import.meta.dir}/s3-client.ts`, p, c, "500"], { stdout: "pipe", stderr: "pipe" }));
const sorties = await Promise.all(procs.map(async (pr) => { await pr.exited; return (await new Response(pr.stdout).text()).trim() + (await new Response(pr.stderr).text()).trim(); }));
const duree = maintenant() - t0;
const v1 = await Promise.all(plan.map(([p, c]) => ver(p, c)));
const [h1] = await sql`select count(*)::int n, pg_wal_lsn_diff(pg_current_wal_lsn(), ${h0.l}::pg_lsn)::bigint wal from b.historique`;
// versions consécutives sans trou ni doublon sur les nouvelles lignes, par case
const cles = [...new Set(plan.map(([p, c]) => `${p}|${c}`))];
const controles = [];
for (const k of cles) {
  const [p, c] = k.split("|");
  const [r] = await sql`select count(*)::int n, count(distinct version)::int distinctes, min(version) mi, max(version) ma, count(distinct write_id)::int w
    from b.historique where grille_id = ${G} and participant_id = ${p} and nature = 'note' and cle = ${c} and version > ${v0[plan.findIndex(([pp, cc]) => pp === p && cc === c)]}`;
  controles.push({ case: c, ...r });
}
const [dup] = await sql`select count(*)::int n from (select write_id from b.historique group by 1 having count(*) > 1) x`;
console.log(JSON.stringify({ variante, clients: sorties.map((s) => JSON.parse(s.split("\n")[0])), duree_ms: +duree.toFixed(1),
  tps: +(1000 / (duree / 1000)).toFixed(1), v0, v1, lignesHistoriqueEnPlus: h1.n - h0.n, walOctetsParEcriture: Math.round(Number(h1.wal) / 1000),
  controles, writeIdEnDouble: dup.n }, null, 1));
await sql.close();
