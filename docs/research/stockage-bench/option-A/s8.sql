-- S8 : état courant reconstruit depuis la seule table historique (dernière écriture par clé, ordre = version serveur).
drop schema if exists rejeu cascade;
create schema rejeu;
create table rejeu.cases as
  select distinct on (version_id, participant_id, noeud_id) version_id, participant_id, noeud_id, valeur,
         (count(*) over w)::int as version, auteur_id, horodatage as modifie_le
  from azimut.historique h where nature = 'note'
  window w as (partition by version_id, participant_id, noeud_id)
  order by version_id, participant_id, noeud_id, h.version desc;
create table rejeu.commentaires as
  select distinct on (version_id, participant_id, noeud_id) version_id, participant_id, noeud_id, texte,
         (count(*) over w)::int as version, auteur_id, horodatage as modifie_le
  from azimut.historique h where nature = 'commentaire'
  window w as (partition by version_id, participant_id, noeud_id)
  order by version_id, participant_id, noeud_id, h.version desc;
create table rejeu.non_evaluations as
  select distinct on (version_id, participant_id, noeud_id, axe_id) version_id, participant_id, noeud_id, axe_id, active,
         (count(*) over w)::int as version, auteur_id, horodatage as modifie_le
  from azimut.historique h where nature = 'nonEvaluation'
  window w as (partition by version_id, participant_id, noeud_id, axe_id)
  order by version_id, participant_id, noeud_id, axe_id, h.version desc;
create table rejeu.jokers_poses as
  select write_id as id, version_id, participant_id, joker_id, justification, auteur_id, horodatage as pose_le
  from azimut.historique h where nature = 'joker';
create table rejeu.finalisations as
  select distinct on (version_id, participant_id) version_id, participant_id, nature = 'finalisation' as finalise,
         (count(*) over w)::int as version, auteur_id, horodatage as modifie_le, erreurs_acceptees
  from azimut.historique h where nature in ('finalisation', 'reouverture')
  window w as (partition by version_id, participant_id)
  order by version_id, participant_id, h.version desc;
