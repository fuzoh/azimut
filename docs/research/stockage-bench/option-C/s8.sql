-- S8 — rejeu de l'état courant depuis la seule table historique (dernière version par clé).
-- Les tables temporaires r_* ont la forme des tables d'état ; la comparaison EXCEPT suit dans s8.ts.
create temp table r_cases as
select distinct on (grille_id, participant_id, noeud) grille_id, participant_id, noeud, valeur, version, write_id, auteur, horodatage
  from azimut.historique where nature = 'note' order by grille_id, participant_id, noeud, version desc;
create temp table r_commentaires as
select distinct on (grille_id, participant_id, noeud) grille_id, participant_id, noeud, texte, version, write_id, auteur, horodatage
  from azimut.historique where nature = 'commentaire' order by grille_id, participant_id, noeud, version desc;
create temp table r_non_evaluations as
select distinct on (grille_id, participant_id, noeud, axe) grille_id, participant_id, noeud, axe, active, version, write_id, auteur, horodatage
  from azimut.historique where nature = 'nonEvaluation' order by grille_id, participant_id, noeud, axe, version desc;
create temp table r_jokers_poses as
select distinct on (joker_id) joker_id as id, grille_id, participant_id, joker_def, noeud, texte as justification, active as actif, version, write_id, auteur, horodatage
  from azimut.historique where nature = 'joker' order by joker_id, version desc;
create temp table r_finalisations as
select distinct on (grille_id, participant_id) grille_id, participant_id, case when active then 'finalise' else 'rouvert' end as etat,
       erreurs as erreurs_acceptees, version, write_id, auteur, horodatage
  from azimut.historique where nature = 'finalisation' order by grille_id, participant_id, version desc;
create temp table r_libelles as
select distinct on (grille_id, noeud) grille_id, noeud, texte as libelle, version, write_id, auteur, horodatage
  from azimut.historique where nature = 'libelle' order by grille_id, noeud, version desc;
