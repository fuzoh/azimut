-- S3 : contrôle après les deux flux. :v version, :vic participant
select n.code, c.version, c.valeur,
       (select count(*) from historique h where h.version_id = c.version_id and h.participant_id = c.participant_id and h.noeud_id = c.noeud_id and h.nature = 'note') lignes_note,
       (select count(distinct write_id) from historique h where h.version_id = c.version_id and h.participant_id = c.participant_id and h.noeud_id = c.noeud_id and h.nature = 'note') write_ids_distincts,
       (select array_agg(h.version order by h.version) = array(select generate_series(1, c.version))
          from historique h where h.version_id = c.version_id and h.participant_id = c.participant_id and h.noeud_id = c.noeud_id and h.nature = 'note') versions_1_a_v_sans_trou,
       (select h.valeur from historique h where h.version_id = c.version_id and h.participant_id = c.participant_id and h.noeud_id = c.noeud_id and h.nature = 'note' order by h.version desc limit 1) = c.valeur as dernier_gagne
from cases c join noeuds n on n.id = c.noeud_id
where c.version_id = :'v' and c.participant_id = :'vic' and n.code in ('gestion', 'consignes-e2') order by 1;
