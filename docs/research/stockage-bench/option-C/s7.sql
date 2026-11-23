-- S7 — feuilles à barème couvertes par les non-évaluations actives d'un participant (règle 1b-A :
-- sous-arbre de chaque placement du nœud, tous axes). $1 = grille, $2 = participant. Un SQL récursif.
with recursive
s as (select gv.structure, gv.cles from azimut.grilles g
        join azimut.grille_versions gv on gv.grille_id = g.id and gv.version = g.version_saisie where g.id = $1),
pl(noeud, enfants) as (
  select p ->> 'noeud', p -> 'enfants' from s, jsonb_array_elements(s.structure -> 'axes') a, jsonb_array_elements(a -> 'arbre') p
  union all
  select e ->> 'noeud', e -> 'enfants' from pl, jsonb_array_elements(pl.enfants) e),
couv(noeud, enfants) as (
  select pl.noeud, pl.enfants from azimut.non_evaluations ne join pl on pl.noeud = ne.noeud
   where ne.grille_id = $1 and ne.participant_id = $2 and ne.active
  union all
  select e ->> 'noeud', e -> 'enfants' from couv, jsonb_array_elements(couv.enfants) e)
select distinct couv.noeud from couv, s where s.cles -> 'n' -> couv.noeud ->> 'b' is not null
