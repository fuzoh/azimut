-- Contrôle de S3 : variables psql v0g, v0c (versions initiales), h0 (lignes d'historique), t0 (horodatage de départ)
select noeud, version, version - case noeud when 'gestion' then :v0g else :v0c end as ecritures_en_plus
  from azimut.cases where grille_id = '019e807a-ec1f-791c-96fa-7ee2192c21ca' and participant_id = '019e807a-ec7f-7798-9e58-3c88f712626f'
   and noeud in ('gestion', 'consignes-e2') order by noeud;
select (select count(*) from azimut.historique) - :h0 as lignes_historique_en_plus;
select noeud, count(*) as lignes, count(distinct write_id) as writeid_distincts, count(distinct version) as versions_distinctes,
       min(version), max(version), max(version) - min(version) + 1 = count(*) as sans_trou
  from azimut.historique where grille_id = '019e807a-ec1f-791c-96fa-7ee2192c21ca' and participant_id = '019e807a-ec7f-7798-9e58-3c88f712626f'
   and nature = 'note' and noeud in ('gestion', 'consignes-e2') and version > case noeud when 'gestion' then :v0g else :v0c end
 group by noeud order by noeud;
-- dernière écriture gagne : l'état courant égale la ligne d'historique de version maximale
select c.noeud, c.valeur = h.valeur and c.write_id = h.write_id as dernier_gagne
  from azimut.cases c join azimut.historique h on h.grille_id = c.grille_id and h.participant_id = c.participant_id and h.noeud = c.noeud and h.version = c.version and h.nature = 'note'
 where c.grille_id = '019e807a-ec1f-791c-96fa-7ee2192c21ca' and c.participant_id = '019e807a-ec7f-7798-9e58-3c88f712626f' and c.noeud in ('gestion', 'consignes-e2');
