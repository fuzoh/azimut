-- S9 — requêtes transverses de l'option C (structure lue dans le document jsonb, sans table de nœuds).
-- Paramètres : $1 = clé de grille ('G3 V2'), $2 = id du groupe, $3 = objectif.

-- name: okko
-- (a) Notes courantes des nœuds à barème binaire, toutes grilles. Un SQL, non récursif. Les nœuds binaires sont
-- d'abord extraits de l'index dérivé `cles` (un détoastage par grille, pas par ligne : 68 ms → voir journal).
with bin as materialized (
  select g.id as grille_id, g.cle, k.noeud
    from azimut.grilles g
    join azimut.grille_versions gv on gv.grille_id = g.id and gv.version = g.version_saisie
    cross join lateral jsonb_each(gv.cles -> 'n') as k(noeud, d)
   where (k.d ->> 'bin')::boolean)
select bin.cle as grille, c.participant_id, c.noeud, c.valeur
  from bin join azimut.cases c on c.grille_id = bin.grille_id and c.noeud = bin.noeud
 where c.valeur is not null;

-- name: calcul
-- (b1) Par calcul : feuilles à barème du cône des entrées de l'objectif ; cases vides du groupe, avec et sans NE.
-- Un SQL récursif : arêtes d'entrées et placements dépliés depuis le document.
with recursive
s as (select gv.structure, gv.cles, g.id as grille_id from azimut.grilles g
        join azimut.grille_versions gv on gv.grille_id = g.id and gv.version = g.version_saisie where g.cle = $1),
aretes as (select n ->> 'id' as noeud, e ->> 'noeud' as entree
             from s, jsonb_array_elements(s.structure -> 'noeuds') n, jsonb_array_elements(n -> 'entrees') e),
cone(noeud) as (select $3::text union select a.entree from aretes a join cone on a.noeud = cone.noeud),
feuilles as (select cone.noeud from cone, s where s.cles -> 'n' -> cone.noeud ->> 'b' is not null),
-- placements de tous les axes (une ligne par occurrence de placement), pour la couverture 1b-A des NE
pl(noeud, enfants) as (
  select p ->> 'noeud', p -> 'enfants' from s, jsonb_array_elements(s.structure -> 'axes') a, jsonb_array_elements(a -> 'arbre') p
  union all
  select e ->> 'noeud', e -> 'enfants' from pl, jsonb_array_elements(pl.enfants) e),
membres as (select id from azimut.participants where groupe_id = $2),
couv(participant_id, noeud, enfants) as (
  select ne.participant_id, pl.noeud, pl.enfants from azimut.non_evaluations ne join s on ne.grille_id = s.grille_id
    join membres m on m.id = ne.participant_id join pl on pl.noeud = ne.noeud where ne.active
  union all
  select couv.participant_id, e ->> 'noeud', e -> 'enfants' from couv, jsonb_array_elements(couv.enfants) e),
vides as (
  select m.id as participant_id, f.noeud from membres m cross join feuilles f cross join s
   where not exists (select 1 from azimut.cases c where c.grille_id = s.grille_id and c.participant_id = m.id and c.noeud = f.noeud and c.valeur is not null))
select (select count(*) from feuilles) as feuilles,
       count(*) as sans_note,
       count(*) filter (where not exists (select 1 from couv where couv.participant_id = v.participant_id and couv.noeud = v.noeud)) as sans_note_hors_ne
  from vides v;

-- name: placement
-- (b2) Par placement : feuilles à barème du sous-arbre de chaque placement de l'objectif, tous axes.
with recursive
s as (select gv.structure, gv.cles, g.id as grille_id from azimut.grilles g
        join azimut.grille_versions gv on gv.grille_id = g.id and gv.version = g.version_saisie where g.cle = $1),
pl(noeud, enfants) as (
  select p ->> 'noeud', p -> 'enfants' from s, jsonb_array_elements(s.structure -> 'axes') a, jsonb_array_elements(a -> 'arbre') p
  union all
  select e ->> 'noeud', e -> 'enfants' from pl, jsonb_array_elements(pl.enfants) e),
sous(noeud, enfants) as (
  select noeud, enfants from pl where noeud = $3
  union all
  select e ->> 'noeud', e -> 'enfants' from sous, jsonb_array_elements(sous.enfants) e),
feuilles as (select distinct sous.noeud from sous, s where s.cles -> 'n' -> sous.noeud ->> 'b' is not null),
membres as (select id from azimut.participants where groupe_id = $2),
couv(participant_id, noeud, enfants) as (
  select ne.participant_id, pl.noeud, pl.enfants from azimut.non_evaluations ne join s on ne.grille_id = s.grille_id
    join membres m on m.id = ne.participant_id join pl on pl.noeud = ne.noeud where ne.active
  union all
  select couv.participant_id, e ->> 'noeud', e -> 'enfants' from couv, jsonb_array_elements(couv.enfants) e),
vides as (
  select m.id as participant_id, f.noeud from membres m cross join feuilles f cross join s
   where not exists (select 1 from azimut.cases c where c.grille_id = s.grille_id and c.participant_id = m.id and c.noeud = f.noeud and c.valeur is not null))
select (select count(*) from feuilles) as feuilles,
       count(*) as sans_note,
       count(*) filter (where not exists (select 1 from couv where couv.participant_id = v.participant_id and couv.noeud = v.noeud)) as sans_note_hors_ne
  from vides v;
