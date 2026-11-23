// S5 : copie complète V1 -> V2 avec les données. bun run s5.ts
import { readFileSync } from "node:fs";
import { connecter, ecrireJson, exporterEtat, formateur, grilleId, ICI, JEU, lireJson, maintenant, participant, stats } from "./commun";
const sql = connecter();
const V1 = grilleId("G3 V1"), V2 = grilleId("G3 V2");
const arnica = formateur("Arnica");
const NOM = "G3 V2 (copie S5)";
const structureV2 = JSON.parse(readFileSync(`${JEU}/grilles/g3-v2.json`, "utf8"));
const attendu = lireJson(`${JEU}/attendu/copie-v1-v2.json`);
const md5 = async (g: string) => (await sql`select
   (select md5(string_agg(x, E'\n' order by x)) from (select row(d.*)::text x from b.dossier d where grille_id = ${g}) a) d,
   (select md5(string_agg(x, E'\n' order by x)) from (select row(h.*)::text x from b.historique h where grille_id = ${g}) a) h`)[0];
const compter = async () => (await sql`select (select count(*) from b.historique)::int h, (select count(*) from b.dossier)::int d,
   (select count(*) from b.grille)::int g, (select count(*) from b.structure)::int s, (select count(*) from b.copie)::int c`)[0];
async function supprimer(cible: string) {
  // nettoyage de mesure : l'historique et les structures sont protégés (trigger) ; on les contourne en session de réplication.
  await sql.begin(async (tx) => {
    await tx`set local session_replication_role = replica`;
    const [{ s }] = await tx`select structure_id s from b.grille where id = ${cible}`;
    await tx`delete from b.historique where grille_id = ${cible}`;
    await tx`delete from b.dossier where grille_id = ${cible}`;
    await tx`delete from b.copie where cible_id = ${cible}`;
    await tx`delete from b.grille where id = ${cible}`;
    await tx`delete from b.structure where id = ${s}`;
  });
}
const v2avant = await md5(V2);
const v1avant = await md5(V1);
const ms: number[] = [];
let cible = "";
let lignes: any = null;
for (let i = 0; i < 5; i++) {
  const c0 = await compter();
  const t = maintenant();
  [{ id: cible }] = await sql`select b.copier_grille(${V1}, ${structureV2}::jsonb, ${NOM}, ${arnica}) id`;
  ms.push(maintenant() - t);
  const c1 = await compter();
  lignes = { historique: c1.h - c0.h, dossiers: c1.d - c0.d, grilles: c1.g - c0.g, structures: c1.s - c0.s, copies: c1.c - c0.c };
  if (i < 4) await supprimer(cible);
}
const out: any = { duree_ms: stats(ms), durees: ms.map((x) => +x.toFixed(1)), lignesInserees: lignes, plusMisesAJourDossiers: 40 };
// (a) correspondance persistée et interrogeable
const [corr] = await sql`select (select count(*) from jsonb_each_text(correspondance->'noeuds') where value is not null)::int apparies,
   (select array_agg(key) from jsonb_each(correspondance->'noeuds') where value = 'null') sans_correspondant, correspondance->'ajoutes' ajoutes
   from b.copie where cible_id = ${cible}`;
out.a = corr;
// (b) rapport
const [rap] = await sql`select jsonb_agg(r) filter (where r->>'type' = 'casePerdue') perdues, count(*) filter (where r->>'type' = 'commentairePerdu')::int "commentairesPerdus",
   count(*) filter (where r->>'type' not in ('casePerdue', 'commentairePerdu'))::int autres
   from b.copie, jsonb_array_elements(rapport) r where cible_id = ${cible}`;
const cle = (x: any) => `${x.participant}|${x.noeud}|${x.valeur}`;
const attP = attendu.rapport.filter((x: any) => x.type === "casePerdue").map(cle).sort();
const obtP = rap.perdues.map(cle).sort();
out.b = { casePerdue: obtP.length, toutesSurAppreciationE2: rap.perdues.every((x: any) => x.noeud === "appreciation-e2"),
  identiquesALAttendu: JSON.stringify(attP) === JSON.stringify(obtP), commentairesPerdus: rap.commentairesPerdus,
  commentairesPerdusAttendus: attendu.totaux.commentairesPerdus, autresElements: rap.autres };
// (c) état exporté de la copie vs attendu (converti au format etat-*.json, comparé par verifier.ts sans --ecritures)
const lignesCopie = await sql`select participant_id, doc from b.dossier where grille_id = ${cible}`;
ecrireJson(`${ICI}/sorties/s5-copie-etat.json`, exporterEtat(lignesCopie as any));
ecrireJson(`${ICI}/sorties/s5-copie-attendu.json`, attendu.participants.map((p: any) => ({ participant: p.participant, nom: p.nom,
  notes: Object.fromEntries(Object.entries(p.notes).map(([k, v]) => [k, { valeur: v }])),
  commentaires: Object.fromEntries(Object.entries(p.commentaires).map(([k, v]) => [k, { texte: v }])),
  nonEvaluations: p.nonEvaluations, jokers: p.jokers.map((j: string) => ({ jokerDef: j })), finalisation: null })));
const [tot] = await sql`select count(*) filter (where n = 'note')::int notes, count(*) filter (where n = 'com')::int commentaires,
   count(*) filter (where n = 'ne')::int ne, count(*) filter (where n = 'joker')::int jokers from (
   select 'note' n from b.dossier, jsonb_each(doc->'notes') where grille_id = ${cible}
   union all select 'com' from b.dossier, jsonb_each(doc->'commentaires') where grille_id = ${cible}
   union all select 'ne' from b.dossier, jsonb_each(doc->'nonEvaluations') where grille_id = ${cible}
   union all select 'joker' from b.dossier, jsonb_array_elements(doc->'jokers') where grille_id = ${cible}) x`;
out.c = { totaux: tot, totauxAttendus: attendu.totaux };
// (d) indépendance
const cAvant = await md5(cible);
const v1a = await md5(V1);
out.d_ecritureCopie = (await sql`select * from b.ecrire(${cible}, ${participant("Alice")}, 'note', 'e1#1/objectifs', ${{ valeur: 0 }}::jsonb, ${Bun.randomUUIDv7()}, ${arnica})`)[0];
const v1b = await md5(V1);
const cApres1 = await md5(cible);
out.d_ecritureV1 = (await sql`select * from b.ecrire(${V1}, ${participant("Bruno")}, 'note', 'e1#1/objectifs', ${{ valeur: 0 }}::jsonb, ${Bun.randomUUIDv7()}, ${arnica})`)[0];
const cApres2 = await md5(cible);
const v1c = await md5(V1);
const v2apres = await md5(V2);
out.d = { v1InchangeParEcritureCopie: JSON.stringify(v1a) === JSON.stringify(v1b), copieChangeeParSaPropreEcriture: JSON.stringify(cAvant) !== JSON.stringify(cApres1),
  copieInchangeeParEcritureV1: JSON.stringify(cApres1) === JSON.stringify(cApres2), v1ChangeeParSaPropreEcriture: JSON.stringify(v1b) !== JSON.stringify(v1c),
  v1InchangeeParLaCopieElleMeme: JSON.stringify(v1avant) === JSON.stringify(v1a), v2PrincipaleIntacte: JSON.stringify(v2avant) === JSON.stringify(v2apres) };
out.cible = cible;
console.log(JSON.stringify(out, null, 1));
await sql.close();
