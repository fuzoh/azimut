with recursive
s as (select gv.structure, gv.cles, g.id as grille_id from azimut.grilles g
        join azimut.grille_versions gv on gv.grille_id = g.id and gv.version = g.version_saisie where g.cle = 'G3 V2'),
pl(noeud, enfants) as (
  select p ->> 'noeud', p -> 'enfants' from s, jsonb_array_elements(s.structure -> 'axes') a, jsonb_array_elements(a -> 'arbre') p
  union all
  select e ->> 'noeud', e -> 'enfants' from pl, jsonb_array_elements(pl.enfants) e),
sous(noeud, enfants) as (
  select noeud, enfants from pl where noeud = 'reg:e4'
  union all
  select e ->> 'noeud', e -> 'enfants' from sous, jsonb_array_elements(sous.enfants) e),
feuilles as (select distinct sous.noeud from sous, s where s.cles -> 'n' -> sous.noeud ->> 'b' is not null),
membres as (select id from azimut.participants where groupe_id = '019e807a-ec0b-7c29-8b12-e3d17f3e0469'::uuid),
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
