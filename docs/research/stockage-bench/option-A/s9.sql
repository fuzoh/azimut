-- S9 (a) : notes courantes des nœuds à barème binaire (ok-ko), toutes grilles. Un SQL, non récursif.
-- :'a'
select g.nom as grille, c.participant_id, n.code as noeud, c.valeur
from cases c
join noeuds n on n.id = c.noeud_id
join baremes b on b.id = n.bareme_id
join versions_grille vg on vg.id = c.version_id
join grilles g on g.id = vg.grille_id
where b.prereglage = 'binaire' and c.valeur is not null;

-- S9 (b) : cases sans note d'un objectif pour un groupe, couverture par non-évaluation (directe ou héritée, 1b-A).
-- Un SQL récursif. $1 = version, $2 = nœud objectif, $3 = groupe, $4 = règle ('calcul' | 'placement').
with recursive
cible as (select id from noeuds where version_id = $1 and code = $2),
cone (id) as (                                   -- par calcul : on descend les entrées
  select id from cible where $4 = 'calcul'
  union
  select e.source_id from cone join entrees e on e.noeud_id = cone.id
),
sous_arbre (placement_id, noeud_id) as (         -- par placement : sous-arbre de chaque placement, tous axes
  select p.id, p.noeud_id from placements p join cible on p.noeud_id = cible.id where $4 = 'placement'
  union
  select c.id, c.noeud_id from sous_arbre s join placements c on c.parent_id = s.placement_id
),
feuilles as (
  select n.id, n.code from noeuds n
  where n.type = 'donnees' and n.bareme_id is not null
    and n.id in (select id from cone union select noeud_id from sous_arbre)
),
membres as (select p.id from participants p where p.groupe_id = $3),
ne as (select ne.participant_id, ne.noeud_id from non_evaluations ne
       where ne.version_id = $1 and ne.active and ne.participant_id in (select id from membres)),
couvre (participant_id, placement_id, noeud_id) as (   -- 1b-A : la NE couvre son nœud et le sous-arbre de ses placements
  select ne.participant_id, p.id, ne.noeud_id from ne left join placements p on p.noeud_id = ne.noeud_id
  union
  select c.participant_id, enf.id, enf.noeud_id from couvre c join placements enf on enf.parent_id = c.placement_id
)
select m.id as participant_id, f.code as noeud,
       exists (select 1 from couvre cv where cv.participant_id = m.id and cv.noeud_id = f.id) as couvert,
       (select count(*) from feuilles)::int as nb_feuilles
from membres m cross join feuilles f
where not exists (select 1 from cases c where c.version_id = $1 and c.participant_id = m.id and c.noeud_id = f.id and c.valeur is not null)
order by 1, 2;
