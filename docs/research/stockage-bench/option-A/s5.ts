// S5 : copie complète V1 → V2 (structure de grilles/g3-v2.json) avec toutes les données. bun run s5.ts
import { readFileSync, writeFileSync } from "node:fs";
import { connecter, exporterEtat, formateur, JEU, log, md5Saisies, participant, stats, versionDe } from "./commun";
const sql = connecter();
const v1 = await versionDe(sql, "G3 V1");
const v2 = await versionDe(sql, "G3 V2");
const castor = formateur("Castor");
const doc = readFileSync(`${JEU}/grilles/g3-v2.json`, "utf8");
const attendu = JSON.parse(readFileSync(`${JEU}/attendu/copie-v1-v2.json`, "utf8"));
const NOM = "G3 V2 (copie S5)";
const md5V2avant = await md5Saisies(sql, v2);
const md5V1avant = await md5Saisies(sql, v1);

const copier = () => sql`select copier_grille(${v1}, ${NOM}, ${doc}::text::jsonb, ${castor}) v`;
const ms: number[] = [];
for (let i = 0; i < 5; i++) {
  const t = performance.now();
  const [c] = await copier();
  ms.push(performance.now() - t);
  const g = (await sql`select grille_id from versions_grille where id = ${c.v}`)[0].grille_id;
  const t2 = performance.now();
  await sql.begin((tx) => tx`select purger_grille(${g})`);
  if (i === 0) log(`purge d'une copie : ${(performance.now() - t2).toFixed(0)} ms`);
}
log("S5 durée d'une copie (5 copies, chacune purgée ensuite) :", stats(ms));
const t = performance.now();
const [c] = await copier();
log(`copie conservée : ${(performance.now() - t).toFixed(0)} ms`);
const vc = c.v;
const [lignes] = await sql`select
  (select count(*) from grilles g join versions_grille vg on vg.grille_id = g.id where vg.id = ${vc})::int grilles,
  1 versions, (select count(*) from baremes where version_id = ${vc})::int baremes,
  (select count(*) from paliers where bareme_id in (select id from baremes where version_id = ${vc}))::int paliers,
  (select count(*) from noeuds where version_id = ${vc})::int noeuds, (select count(*) from entrees where version_id = ${vc})::int entrees,
  (select count(*) from axes where version_id = ${vc})::int axes, (select count(*) from placements where version_id = ${vc})::int placements,
  (select count(*) from jokers_autorises where version_id = ${vc})::int jokers_autorises,
  (select count(*) from exigences_minimum where version_id = ${vc})::int exigences,
  1 copies, (select count(*) from correspondances k join copies c on c.id = k.copie_id where c.cible_version_id = ${vc})::int correspondances,
  (select count(*) from copie_rapport k join copies c on c.id = k.copie_id where c.cible_version_id = ${vc})::int rapport,
  (select count(*) from cases where version_id = ${vc})::int cases, (select count(*) from commentaires where version_id = ${vc})::int commentaires,
  (select count(*) from non_evaluations where version_id = ${vc})::int non_evaluations, (select count(*) from jokers_poses where version_id = ${vc})::int jokers_poses,
  (select count(*) from historique where version_id = ${vc})::int historique`;
log("(e) lignes écrites :", lignes, "total", Object.values(lignes).reduce((a: number, b: any) => a + b, 0));

// (a) correspondance persistée
const [k] = await sql`select
  count(*) filter (where k.source_id is not null and k.cible_id is not null)::int apparies,
  string_agg(s.code, ',') filter (where k.cible_id is null) sans_correspondant,
  string_agg(c.code, ',') filter (where k.source_id is null) ajoutes
  from correspondances k join copies cp on cp.id = k.copie_id left join noeuds s on s.id = k.source_id left join noeuds c on c.id = k.cible_id
  where cp.cible_version_id = ${vc} and k.objet = 'noeud'`;
const attApp = Object.values(attendu.correspondanceNoeuds).filter((x) => x !== null).length;
const corr = await sql`select s.code src, c.code cib from correspondances k join copies cp on cp.id = k.copie_id
  join noeuds s on s.id = k.source_id left join noeuds c on c.id = k.cible_id where cp.cible_version_id = ${vc} and k.objet = 'noeud'`;
const corrOk = corr.every((r: any) => attendu.correspondanceNoeuds[r.src] === (r.cib ?? null)) && corr.length === Object.keys(attendu.correspondanceNoeuds).length;
log(`(a) appariés ${k.apparies} (attendu ${attApp}), sans correspondant ${k.sans_correspondant}, ajoutés ${k.ajoutes}, table = attendu : ${corrOk}`);

// (b) rapport
const rap = await sql`select r.type, r.participant_id, r.noeud, r.valeur from copie_rapport r join copies cp on cp.id = r.copie_id where cp.cible_version_id = ${vc}`;
const cle = (x: any) => `${x.type}|${x.participant ?? x.participant_id}|${x.noeud}|${x.valeur}`;
const rapCases = rap.filter((r: any) => r.type === "casePerdue").map(cle).sort();
const attCases = attendu.rapport.map(cle).sort();
const attComPerdus = attendu.participants.flatMap((p: any) => p.commentairesPerdus.map((n: string) => `${p.participant}|${n}`)).sort();
const rapCom = rap.filter((r: any) => r.type === "commentairePerdu").map((r: any) => `${r.participant_id}|${r.noeud}`).sort();
log(`(b) casePerdue ${rapCases.length} (= attendu ${attCases.length} : ${JSON.stringify(rapCases) === JSON.stringify(attCases)}), commentairePerdu ${rapCom.length} (= attendu : ${JSON.stringify(rapCom) === JSON.stringify(attComPerdus)}), autres types : ${rap.filter((r: any) => !["casePerdue", "commentairePerdu"].includes(r.type)).length}`);

// (c) état de la copie = attendu.participants
const etat = await exporterEtat(sql, vc);
writeFileSync(`${import.meta.dir}/sorties/etat-copie-s5.json`, JSON.stringify(etat, null, 1));
const diffs: string[] = [];
const tot = { notes: 0, commentaires: 0, nonEvaluations: 0, jokers: 0 };
for (const a of attendu.participants) {
  const o = etat.find((e: any) => e.participant === a.participant);
  const notes = Object.fromEntries(Object.entries(o.notes).map(([k, x]: any) => [k, x.valeur]));
  const com = Object.fromEntries(Object.entries(o.commentaires).map(([k, x]: any) => [k, x.texte]));
  const s = (x: any) => JSON.stringify(Object.entries(x).sort());
  if (s(notes) !== s(a.notes)) diffs.push(`${a.nom} notes`);
  if (s(com) !== s(a.commentaires)) diffs.push(`${a.nom} commentaires`);
  const ne = (l: any[]) => JSON.stringify(l.map((x) => `${x.noeud}|${x.axe ?? ""}`).sort());
  if (ne(o.nonEvaluations) !== ne(a.nonEvaluations)) diffs.push(`${a.nom} nonEvaluations`);
  if (JSON.stringify(o.jokers.map((j: any) => j.jokerDef)) !== JSON.stringify(a.jokers)) diffs.push(`${a.nom} jokers`);
  tot.notes += Object.keys(notes).length; tot.commentaires += Object.keys(com).length; tot.nonEvaluations += o.nonEvaluations.length; tot.jokers += o.jokers.length;
}
log(`(c) état de la copie = attendu.participants : ${diffs.length === 0 ? "IDENTIQUE" : diffs.slice(0, 10).join("; ")}`, tot, "attendu totaux :", attendu.totaux);

// (d) indépendance
const mC0 = await md5Saisies(sql, vc);
const m1a = await md5Saisies(sql, v1);
await sql`select * from ecrire_note(${Bun.randomUUIDv7()}, ${vc}, ${participant("Alice")}, 'e1#1/objectifs', 0, ${castor})`;
const m1b = await md5Saisies(sql, v1);
const mC1 = await md5Saisies(sql, vc);
await sql`select * from ecrire_note(${Bun.randomUUIDv7()}, ${v1}, ${participant("Bruno")}, 'e1#1/objectifs', 0, ${castor})`;
const mC2 = await md5Saisies(sql, vc);
const m1c = await md5Saisies(sql, v1);
const eq = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);
log(`(d) écriture dans la copie : V1 inchangée ${eq(m1a, m1b)}, copie modifiée ${!eq(mC0, mC1)} ; écriture dans V1 : copie inchangée ${eq(mC1, mC2)}, V1 modifiée ${!eq(m1b, m1c)} ; V1 inchangée par les copies ${eq(md5V1avant, m1a)}`);
log(`    G3 V2 principale intacte : ${eq(md5V2avant, await md5Saisies(sql, v2))}`);
const [a2] = await sql`select c.valeur, c.version from cases c join noeuds n on n.id = c.noeud_id where c.version_id = ${vc} and c.participant_id = ${participant("Alice")} and n.code = 'e1#1/objectifs'`;
const [b1] = await sql`select c.valeur, c.version from cases c join noeuds n on n.id = c.noeud_id where c.version_id = ${v1} and c.participant_id = ${participant("Bruno")} and n.code = 'e1#1/objectifs'`;
log("    Alice dans la copie :", { ...a2 }, "Bruno dans V1 :", { ...b1 });
await sql.close();
