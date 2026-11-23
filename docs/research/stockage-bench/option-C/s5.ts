// S5 — copie complète V1 → V2 avec les données ; puis S7 (dispense de Chloé dans la copie). bun run s5.ts
import { readFileSync } from "node:fs";
import { connexion, formateur, grilleId, ICI, JEU, lireJson, md5Saisies, participants, stats } from "./commun";

const sql = connexion();
const V1 = grilleId("G3 V1");
const V2 = grilleId("G3 V2");
const ARNICA = formateur("Arnica");
const structure = lireJson(`${JEU}/grilles/g3-v2.json`);
const attendu = lireJson(`${JEU}/attendu/copie-v1-v2.json`);
const CLE = "G3 V2 (copie S5)";

const lignes = async () =>
  (await sql`select (select count(*) from azimut.cases) + (select count(*) from azimut.commentaires) + (select count(*) from azimut.non_evaluations)
             + (select count(*) from azimut.jokers_poses) + (select count(*) from azimut.historique) + (select count(*) from azimut.correspondances)
             + (select count(*) from azimut.rapports_copie) + (select count(*) from azimut.grilles) + (select count(*) from azimut.grille_versions) as n`)[0].n;

// 5 copies mesurées, chacune suivie d'une purge ; la 6e est gardée.
const md5V1 = await md5Saisies(sql, V1);
const md5V2 = await md5Saisies(sql, V2);
const durees: number[] = [];
let ecrites = 0;
for (let i = 0; i < 6; i++) {
  const l0 = Number(await lignes());
  const t0 = performance.now();
  const [c] = await sql`select azimut.copier_grille(${V1}, ${CLE}, ${structure}::jsonb, ${ARNICA}) as id`;
  durees.push(performance.now() - t0);
  ecrites = Number(await lignes()) - l0;
  if (i < 5) await sql`select azimut.purger_grille(${c.id})`;
}
const [{ id: C }] = await sql`select id from azimut.grilles where cle = ${CLE}`;
const detail = (await sql`select 'cases' as t, count(*)::int as n from azimut.cases where grille_id = ${C}
  union all select 'commentaires', count(*)::int from azimut.commentaires where grille_id = ${C}
  union all select 'non_evaluations', count(*)::int from azimut.non_evaluations where grille_id = ${C}
  union all select 'jokers_poses', count(*)::int from azimut.jokers_poses where grille_id = ${C}
  union all select 'historique', count(*)::int from azimut.historique where grille_id = ${C}
  union all select 'correspondances', count(*)::int from azimut.correspondances where grille_cible = ${C}
  union all select 'rapports_copie', count(*)::int from azimut.rapports_copie where grille_cible = ${C}`).map((r: any) => [r.t, r.n]);

// (a) correspondance persistée
const [corr] = await sql`select count(*) filter (where id_source is not null and id_cible is not null)::int as apparies,
    array_agg(id_source) filter (where id_cible is null) as sans_correspondant, array_agg(id_cible) filter (where id_source is null) as ajoutes
  from azimut.correspondances where grille_cible = ${C} and genre = 'noeud'`;
const corrAttendue = Object.entries(attendu.correspondanceNoeuds);
const corrLue = new Map((await sql`select id_source, id_cible from azimut.correspondances where grille_cible = ${C} and genre = 'noeud' and id_source is not null`).map((r: any) => [r.id_source, r.id_cible]));
const corrIdentique = corrAttendue.every(([s, c]) => corrLue.get(s) === c) && corrLue.size === corrAttendue.length;
// (b) rapport
const rap = await sql`select type, participant_id, noeud, valeur from azimut.rapports_copie where grille_cible = ${C}`;
const cle = (r: any) => `${r.participant}|${r.noeud}|${Number(r.valeur)}`;
const perduesAtt = new Set(attendu.rapport.filter((r: any) => r.type === "casePerdue").map(cle));
const perduesLues = new Set(rap.filter((r: any) => r.type === "casePerdue").map((r: any) => cle({ ...r, participant: r.participant_id })));
const comPerdusAtt = attendu.participants.flatMap((p: any) => p.commentairesPerdus.map((n: string) => `${p.participant}|${n}`)).sort();
const comPerdusLus = rap.filter((r: any) => r.type === "commentairePerdu").map((r: any) => `${r.participant_id}|${r.noeud}`).sort();
const rapport = {
  casePerdue: perduesLues.size, identiqueAttendu: perduesLues.size === perduesAtt.size && [...perduesAtt].every((k) => perduesLues.has(k)),
  toutesSurAppreciationE2: rap.filter((r: any) => r.type === "casePerdue").every((r: any) => r.noeud === "appreciation-e2"),
  commentairesPerdus: comPerdusLus.length, commentairesPerdusIdentiques: JSON.stringify(comPerdusAtt) === JSON.stringify(comPerdusLus),
  autres: rap.filter((r: any) => !["casePerdue", "commentairePerdu"].includes(r.type)).length,
};
// (c) état de la copie
const notes = await sql`select participant_id, noeud, valeur from azimut.cases where grille_id = ${C} and valeur is not null`;
const coms = await sql`select participant_id, noeud, texte from azimut.commentaires where grille_id = ${C} and texte is not null`;
const nes = await sql`select participant_id, noeud, axe from azimut.non_evaluations where grille_id = ${C} and active`;
const jks = await sql`select participant_id, joker_def from azimut.jokers_poses where grille_id = ${C} and actif`;
const diffs: string[] = [];
for (const p of attendu.participants) {
  const n = Object.fromEntries(notes.filter((r: any) => r.participant_id === p.participant).map((r: any) => [r.noeud, Number(r.valeur)]).sort());
  const c = Object.fromEntries(coms.filter((r: any) => r.participant_id === p.participant).map((r: any) => [r.noeud, r.texte]).sort());
  const ne = nes.filter((r: any) => r.participant_id === p.participant).map((r: any) => `${r.noeud}|${r.axe}`).sort();
  const j = jks.filter((r: any) => r.participant_id === p.participant).map((r: any) => r.joker_def).sort();
  const so = (o: any) => JSON.stringify(Object.fromEntries(Object.entries(o).sort()));
  if (so(n) !== so(p.notes)) diffs.push(`${p.nom} notes`);
  if (so(c) !== so(p.commentaires)) diffs.push(`${p.nom} commentaires`);
  if (JSON.stringify(ne) !== JSON.stringify(p.nonEvaluations.map((x: any) => `${x.noeud}|${x.axe ?? ""}`).sort())) diffs.push(`${p.nom} NE`);
  if (JSON.stringify(j) !== JSON.stringify([...p.jokers].sort())) diffs.push(`${p.nom} jokers`);
}
const totAtt = attendu.participants.reduce((s: any, p: any) => ({ notes: s.notes + Object.keys(p.notes).length, com: s.com + Object.keys(p.commentaires).length }), { notes: 0, com: 0 });
const etat = { notes: notes.length, commentaires: coms.length, nonEvaluations: nes.length, jokers: jks.length, attendu: { ...totAtt, totaux: attendu.totaux }, differences: diffs };

// (d) indépendance
const md5C0 = await md5Saisies(sql, C);
const alice = participants.find((p) => p.nom === "Alice")!.id;
const bruno = participants.find((p) => p.nom === "Bruno")!.id;
const [wc] = await sql`select * from azimut.ecrire_note(${C}, ${alice}, 'e1#1/objectifs', 0, ${Bun.randomUUIDv7()}, ${ARNICA})`;
const md5V1apresC = await md5Saisies(sql, V1);
const md5C1 = await md5Saisies(sql, C);
const [w1] = await sql`select * from azimut.ecrire_note(${V1}, ${bruno}, 'e1#1/objectifs', 0, ${Bun.randomUUIDv7()}, ${ARNICA})`;
const md5CapresV1 = await md5Saisies(sql, C);
const md5V2fin = await md5Saisies(sql, V2);
const independance = {
  ecritureCopie: wc, v1IntacteApresEcritureCopie: md5V1apresC.md5 === md5V1.md5, copieChangee: md5C1.md5 !== md5C0.md5,
  ecritureV1: w1, copieIntacteApresEcritureV1: md5CapresV1.md5 === md5C1.md5, v2PrincipaleIntacte: md5V2fin.md5 === md5V2.md5,
};

// S7 — dispense de Chloé dans la copie : une ligne, couverture 1b-A calculée en SQL depuis le document
const chloe = participants.find((p) => p.nom === "Chloé")!.id;
const lignesChloe = await sql`select noeud, axe, active from azimut.non_evaluations where grille_id = ${C} and participant_id = ${chloe}`;
const s7sql = readFileSync(`${ICI}/s7.sql`, "utf8");
const t7 = performance.now();
const couv = await sql.unsafe(s7sql, [C, chloe]);
const d7 = performance.now() - t7;
const couvertes = couv.map((r: any) => r.noeud).sort();
const notesChloe = await sql`select c.noeud, c.valeur from azimut.cases c where c.grille_id = ${C} and c.participant_id = ${chloe} and c.valeur is not null
                              and c.noeud = any(${couvertes}) order by c.noeud`;
const s7 = {
  lignesNonEvaluation: lignesChloe, couverture: couvertes, attendu: [...attendu.S7.casesCouvertes].sort(),
  identique: JSON.stringify(couvertes) === JSON.stringify([...attendu.S7.casesCouvertes].sort()),
  notesConserveesSousRegE3: notesChloe.map((r: any) => `${r.noeud}=${Number(r.valeur)}`), dureeMs: +d7.toFixed(2),
};
console.log(JSON.stringify({ copies: { ...stats(durees.slice(0, 5)), toutes: durees.map((d) => +d.toFixed(1)) }, lignesEcritesParCopie: ecrites, detail: Object.fromEntries(detail),
  a: { ...corr, identiqueAttendu: corrIdentique }, b: rapport, c: etat, d: independance, S7: s7 }, null, 1));
await sql.close();
