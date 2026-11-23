-- S7 : cases couvertes par les non-évaluations d'un participant (règle 1b-A : le nœud lui-même s'il porte une case,
-- et les feuilles à barème du sous-arbre de chaque placement du nœud, sur tous les axes). Un SQL récursif.
-- $1 = version, $2 = participant
with recursive
ne as (select noeud_id from non_evaluations where version_id = $1 and participant_id = $2 and active),
couvre (placement_id, noeud_id) as (
  select p.id, ne.noeud_id from ne left join placements p on p.noeud_id = ne.noeud_id
  union
  select c.id, c.noeud_id from couvre s join placements c on c.parent_id = s.placement_id
)
select distinct n.code, n.rang from couvre k join noeuds n on n.id = k.noeud_id
where n.type = 'donnees' and n.bareme_id is not null
order by n.rang;
