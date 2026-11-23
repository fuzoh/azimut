// S2 : écrire une note avec historique, version serveur, writeId idempotent. bun run s2.ts
import { connecter, cours, formateur, grilleId, maintenant, participant, stats } from "./commun";
const sql = connecter();
const G = grilleId("G3 V2");
const romuald = participant("Romuald");
const arnica = formateur("Arnica");
const W = "019f7000-0000-7000-8000-000000000002";
const empreinte = async () => (await sql`select
   (select md5(string_agg(x, E'\n' order by x)) from (select row(d.*)::text x from b.dossier d) a) dossiers,
   (select md5(string_agg(x, E'\n' order by x)) from (select row(h.*)::text x from b.historique h) a) historique,
   (select count(*)::int from b.historique) lignes`)[0];
const cas = async () => (await sql`select doc->'notes'->'sr5' c, version vd from b.dossier where grille_id = ${G} and participant_id = ${romuald}`)[0];
const ecrire = (p: string, cle: string, valeur: number | null, w: string) =>
  sql`select * from b.ecrire(${G}, ${p}, 'note', ${cle}, ${{ valeur }}::jsonb, ${w}, ${arnica})`;
const out: any = {};

out.etape1 = await cas();
const e0 = await empreinte();
const [r2] = await ecrire(romuald, "sr5", 0, W);
const e2 = await empreinte();
out.etape2 = { reponse: r2, apres: await cas(), lignesHistoriqueEnPlus: e2.lignes - e0.lignes,
  ligneDuWriteId: (await sql`select nature, cle, version, charge, auteur from b.historique where write_id = ${W}`)[0] };
const [r3] = await ecrire(romuald, "sr5", 0, W);
const e3 = await empreinte();
out.etape3 = { reponse: r3, apres: await cas(), inchange: JSON.stringify(e3) === JSON.stringify(e2) };
try { await ecrire(romuald, "sr5", 1, W); out.etape4 = "pas d'erreur"; }
catch (e: any) { out.etape4 = { erreur: e.errno ?? e.code, message: e.message } }
const e4 = await empreinte();
out.etape4inchange = JSON.stringify(e4) === JSON.stringify(e2);
try {
  await sql.begin(async (tx) => {
    await tx`select * from b.ecrire(${G}, ${romuald}, 'note', 'sr4', ${{ valeur: 0 }}::jsonb, ${Bun.randomUUIDv7()}, ${arnica})`;
    out.etape5_lignesDansLaTransaction = (await tx`select count(*)::int n from b.historique`)[0].n;
    await tx`do $$ begin raise exception 'erreur provoquée après l''insertion d''historique'; end $$`;
  });
} catch (e: any) { out.etape5_erreur = e.message }
const e5 = await empreinte();
out.etape5 = { avant: e4, apres: e5, identique: JSON.stringify(e4) === JSON.stringify(e5) };

// (6) 20 + 200 écritures sur des cases différentes, writeId neufs ; un appel = une transaction (autocommit).
const exclus = new Set(["Alice", "David", "Cassien", "Ulysse", "Victorine", "Romuald"]);
const eligibles = cours.participants.filter((p: any) => !exclus.has(p.nom)).map((p: any) => p.id);
const [{ cases }] = await sql`select s.cases from b.grille g join b.structure s on s.id = g.structure_id where g.id = ${G}`;
const [w0] = await sql`select pg_current_wal_lsn() l`;
const ms: number[] = [];
for (let i = 0; i < 220; i++) {
  const t = maintenant();
  await ecrire(eligibles[i % eligibles.length], cases[(7 * i) % cases.length], 0, Bun.randomUUIDv7());
  if (i >= 20) ms.push(maintenant() - t);
}
const [w1] = await sql`select pg_wal_lsn_diff(pg_current_wal_lsn(), ${w0.l}::pg_lsn)::bigint o`;
out.etape6 = { ...stats(ms), walOctetsParEcriture: Math.round(Number(w1.o) / 220) };
console.log(JSON.stringify(out, null, 1));
await sql.close();
