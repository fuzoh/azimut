// S9 : requêtes transverses. bun run s9.ts  (50 exécutions mesurées après 20 de chauffe)
import { connecter, cours, maintenant, stats } from "./commun";
const sql = connecter();
if (process.env.JIT === "on") await sql`set jit = on`;
const groupeB = cours.groupes.find((g: any) => g.nom === "Groupe B").id;

// (a) notes courantes des cases à barème binaire, toutes grilles : un seul SQL, non récursif.
const okko = () => sql`
  with okko as (
    select g.id gid, g.nom, n->>'id' noeud
      from b.grille g join b.structure s on s.id = g.structure_id, jsonb_array_elements(s.doc->'noeuds') n
     where n->>'type' = 'donnees'
       and exists (select 1 from jsonb_array_elements(s.doc->'baremes') br where br->>'id' = n->>'bareme' and br->>'prereglage' = 'binaire'))
  select o.nom grille, d.participant_id, o.noeud, (d.doc->'notes'->o.noeud->>'v')::int valeur
    from okko o join b.dossier d on d.grille_id = o.gid
   where d.doc->'notes'->o.noeud->>'v' is not null`;

// (b) cases sans note d'un objectif pour le Groupe B : un seul SQL récursif (fonctions b.feuilles_calcul / b.feuilles_placement).
const vides = (regle: "calcul" | "placement", objectif: string) => sql`
  with s as (select s.doc, g.id gid from b.grille g join b.structure s on s.id = g.structure_id where g.nom = 'G3 V2'),
  membres as (select (p->>'id')::uuid pid from b.cours c, jsonb_array_elements(c.doc->'participants') p where p->>'groupe' = ${groupeB}),
  feuilles as (select f from s, lateral (select * from b.feuilles_calcul(s.doc, ${objectif}) where ${regle} = 'calcul'
                                         union all select * from b.feuilles_placement(s.doc, ${objectif}) where ${regle} = 'placement') x(f)),
  vides as (select m.pid, f.f from membres m cross join feuilles f join b.dossier d on d.participant_id = m.pid
             where d.grille_id = (select gid from s) and (d.doc->'notes'->f.f->>'v') is null),
  couvertes as (select d.participant_id pid, fp from s join b.dossier d on d.grille_id = s.gid, jsonb_each(d.doc->'nonEvaluations') ne(k, e),
                       b.feuilles_placement(s.doc, e->>'noeud') fp
                 where (e->>'active')::boolean and d.participant_id in (select pid from membres))
  select (select count(*) from feuilles)::int feuilles, count(*)::int sans_note,
         count(*) filter (where not exists (select 1 from couvertes c where c.pid = v.pid and c.fp = v.f))::int hors_ne
    from vides v`;

async function mesurer(f: () => Promise<any>) {
  const ms: number[] = [];
  let r: any;
  for (let i = 0; i < 70; i++) { const t = maintenant(); r = await f(); if (i >= 20) ms.push(maintenant() - t); }
  return { r, ...stats(ms) };
}
// (a') même résultat, document décompressé une seule fois par dossier (jsonb_each) puis jointure par hachage.
const okko2 = () => sql`
  with okko as materialized (
    select g.id gid, g.nom,
           (select jsonb_object_agg(n->>'id', true) from jsonb_array_elements(s.doc->'noeuds') n
             where n->>'type' = 'donnees' and n->>'bareme' in (select br->>'id' from jsonb_array_elements(s.doc->'baremes') br
                                                               where br->>'prereglage' = 'binaire')) ids
      from b.grille g join b.structure s on s.id = g.structure_id)
  select o.nom grille, d.participant_id, t.k noeud, (t.e->>'v')::int valeur
    from okko o join b.dossier d on d.grille_id = o.gid cross join lateral jsonb_each(d.doc->'notes') t(k, e)
   where o.ids ? t.k and t.e->'v' <> 'null'`;
const a0 = await mesurer(okko);
const a = await mesurer(okko2);
const verif = a0.r.length === a.r.length;
const lignes = a.r.length;
const okV2 = a.r.filter((x: any) => x.grille === "G3 V2" && x.valeur === 1).length;
const c = await mesurer(() => vides("calcul", "comp:communication"));
const p = await mesurer(() => vides("placement", "reg:e4"));
console.log(JSON.stringify({
  a_naif_detoast_par_case: { lignes: a0.r.length, mediane: a0.mediane, p95: a0.p95 },
  a: { lignes, okV2, memesLignes: verif, mediane: a.mediane, p95: a.p95 },
  b_calcul: { ...c.r[0], mediane: c.mediane, p95: c.p95 },
  b_placement: { ...p.r[0], mediane: p.mediane, p95: p.p95 },
}, null, 1));
await sql.close();
