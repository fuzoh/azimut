with bin as materialized (
  select g.id as grille_id, g.cle, k.noeud
    from azimut.grilles g
    join azimut.grille_versions gv on gv.grille_id = g.id and gv.version = g.version_saisie
    cross join lateral jsonb_each(gv.cles -> 'n') as k(noeud, d)
   where (k.d ->> 'bin')::boolean)
select bin.cle as grille, c.participant_id, c.noeud, c.valeur
  from bin join azimut.cases c on c.grille_id = bin.grille_id and c.noeud = bin.noeud
 where c.valeur is not null;

