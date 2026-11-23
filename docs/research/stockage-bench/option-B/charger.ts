// S0 : chargement en masse. bun run charger.ts  (après psql -f schema.sql)
// Méthode : grilles et cours insérés comme documents ; NDJSON envoyé tel quel (un paramètre texte par fichier),
// découpé et converti en lignes d'historique par SQL (version = rang dans la clé, ordre (horodatage, writeId)) ;
// puis chaque dossier est construit depuis l'historique par la vue b.dossier_rejoue (même requête que S8).
import { readFileSync } from "node:fs";
import { connecter, cours, JEU, maintenant } from "./commun";

const sql = connecter();
const t0 = maintenant();
await sql.begin(async (tx) => {
  await tx`insert into b.cours values (${cours.cours.id}, ${cours}::jsonb)`;
  for (const g of cours.grilles) {
    const doc = JSON.parse(readFileSync(`${JEU}/${g.fichier}`, "utf8"));
    const [s] = await tx`insert into b.structure (id, doc) values (b.uuidv7(), ${doc}::jsonb) returning id`;
    await tx`insert into b.grille (id, cours_id, nom, structure_id, principale, ouverture_saisie)
             values (${g.id}, ${cours.cours.id}, ${g.cle}, ${s.id}, ${g.principale}, ${g.ouvertureSaisie})`;
    await tx`insert into b.dossier (grille_id, participant_id)
             select ${g.id}, (p->>'id')::uuid from b.cours c, jsonb_array_elements(c.doc->'participants') p where c.id = ${cours.cours.id}`;
  }
  for (const f of ["evenements-g3-v1.ndjson", "evenements-g3-v2.ndjson"]) {
    const texte = readFileSync(`${JEU}/${f}`, "utf8").trim();
    await tx`
      with e as (select l::jsonb e from regexp_split_to_table(${texte}::text, E'\n') l),
      h as (
        select (e->>'writeId')::uuid w, g.id gid, (e->>'participant')::uuid pid, e->>'nature' nat,
               case e->>'nature' when 'nonEvaluation' then (e->>'noeud') || '|' || coalesce(e->>'axe', '')
                                 when 'joker' then e->>'jokerDef' when 'finalisation' then '' else e->>'noeud' end cle,
               (e->>'auteur')::uuid aut, (e->>'horodatage')::timestamptz ts,
               case e->>'nature' when 'note' then jsonb_build_object('valeur', e->'valeur')
                                 when 'commentaire' then jsonb_build_object('texte', e->'texte')
                                 when 'nonEvaluation' then jsonb_build_object('noeud', e->'noeud', 'axe', e->'axe', 'active', e->'active')
                                 when 'joker' then jsonb_build_object('noeud', e->'noeud', 'justification', e->'justification')
                                 else jsonb_build_object('erreursAcceptees', e->'erreursAcceptees') end charge
          from e join b.grille g on g.nom = e->>'grille')
      insert into b.historique
      select w, gid, pid, nat, cle, row_number() over (partition by gid, pid, nat, cle order by ts, w), aut, ts, charge from h`;
  }
  await tx`update b.dossier d set doc = r.doc, version = r.version from b.dossier_rejoue r
           where r.grille_id = d.grille_id and r.participant_id = d.participant_id`;
});
const ms = maintenant() - t0;
const [c] = await sql`select (select count(*) from b.historique) h, (select count(*) from b.dossier) d, (select count(*) from b.structure) s`;
console.log(JSON.stringify({ chargement_ms: +ms.toFixed(1), historique: Number(c.h), dossiers: Number(c.d), structures: Number(c.s) }));
await sql.close();
