// S7 : la dispense de Chloé couvre sr5 dans la copie. bun run s7.ts
import { connecter, grilleId, JEU, lireJson, participant } from "./commun";
const sql = connecter();
const chloe = participant("Chloé");
const [{ id: copie }] = await sql`select id from b.grille where nom = 'G3 V2 (copie S5)'`;
const V1 = grilleId("G3 V1");
const [ne] = await sql`select (select count(*) from jsonb_each(doc->'nonEvaluations') t(k, e) where (e->>'active')::boolean)::int lignes,
   doc->'nonEvaluations' ne from b.dossier where grille_id = ${copie} and participant_id = ${chloe}`;
// Couverture en un SQL récursif sur le document de structure de la copie (règle 1b-A).
const couvertes = await sql`select f from b.dossier d join b.grille g on g.id = d.grille_id join b.structure s on s.id = g.structure_id,
   jsonb_each(d.doc->'nonEvaluations') t(k, e), b.feuilles_placement(s.doc, e->>'noeud') f
   where d.grille_id = ${copie} and d.participant_id = ${chloe} and (e->>'active')::boolean order by f`;
const liste = couvertes.map((r: any) => r.f);
const attendu = lireJson(`${JEU}/attendu/copie-v1-v2.json`).S7.casesCouvertes;
const [sr5V1] = await sql`select s.ids ? 'sr5' present from b.grille g join b.structure s on s.id = g.structure_id where g.id = ${V1}`;
const notes = await sql`select k, (select doc->'notes'->k->>'v' from b.dossier where grille_id = ${V1} and participant_id = ${chloe}) v1,
   (select doc->'notes'->k->>'v' from b.dossier where grille_id = ${copie} and participant_id = ${chloe}) copie
   from unnest(${liste}::text[]) k`;
console.log(JSON.stringify({ lignesNonEvaluation: ne.lignes, ne: ne.ne, couverture: liste, egaleAttendu: JSON.stringify([...liste].sort()) === JSON.stringify([...attendu].sort()),
  sr5PresentEnV1: sr5V1.present, notesSousRegE3: notes, notesConservees: notes.every((n: any) => n.v1 === n.copie) }, null, 1));
await sql.close();
