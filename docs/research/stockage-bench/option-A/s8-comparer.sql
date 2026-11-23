-- S8 : comparaison dans les deux sens (EXCEPT), et versions = max(version) de l'historique.
select 'cases' t, (select count(*) from (select version_id, participant_id, noeud_id, valeur, version, auteur_id, modifie_le from azimut.cases
                     except select version_id, participant_id, noeud_id, valeur, version, auteur_id, modifie_le from rejeu.cases) x) etat_moins_rejeu,
                  (select count(*) from (select version_id, participant_id, noeud_id, valeur, version, auteur_id, modifie_le from rejeu.cases
                     except select version_id, participant_id, noeud_id, valeur, version, auteur_id, modifie_le from azimut.cases) x) rejeu_moins_etat
union all
select 'commentaires', (select count(*) from (select version_id, participant_id, noeud_id, texte, version, auteur_id, modifie_le from azimut.commentaires
                     except select version_id, participant_id, noeud_id, texte, version, auteur_id, modifie_le from rejeu.commentaires) x),
                  (select count(*) from (select version_id, participant_id, noeud_id, texte, version, auteur_id, modifie_le from rejeu.commentaires
                     except select version_id, participant_id, noeud_id, texte, version, auteur_id, modifie_le from azimut.commentaires) x)
union all
select 'non_evaluations', (select count(*) from (select version_id, participant_id, noeud_id, axe_id, active, version from azimut.non_evaluations
                     except select version_id, participant_id, noeud_id, axe_id, active, version from rejeu.non_evaluations) x),
                  (select count(*) from (select version_id, participant_id, noeud_id, axe_id, active, version from rejeu.non_evaluations
                     except select version_id, participant_id, noeud_id, axe_id, active, version from azimut.non_evaluations) x)
union all
select 'jokers_poses', (select count(*) from (select id, version_id, participant_id, joker_id, justification, auteur_id, pose_le from azimut.jokers_poses
                     except select id, version_id, participant_id, joker_id, justification, auteur_id, pose_le from rejeu.jokers_poses) x),
                  (select count(*) from (select id, version_id, participant_id, joker_id, justification, auteur_id, pose_le from rejeu.jokers_poses
                     except select id, version_id, participant_id, joker_id, justification, auteur_id, pose_le from azimut.jokers_poses) x)
union all
select 'finalisations', (select count(*) from (select version_id, participant_id, finalise, version, auteur_id, modifie_le, erreurs_acceptees
                       from azimut.finalisations where version > 0
                     except select version_id, participant_id, finalise, version, auteur_id, modifie_le, erreurs_acceptees from rejeu.finalisations) x),
                  (select count(*) from (select version_id, participant_id, finalise, version, auteur_id, modifie_le, erreurs_acceptees from rejeu.finalisations
                     except select version_id, participant_id, finalise, version, auteur_id, modifie_le, erreurs_acceptees from azimut.finalisations where version > 0) x)
union all
select 'versions = max(historique.version)', (select count(*) from (select version_id, participant_id, noeud_id, nature, count(*) n, max(version) m
                     from azimut.historique where nature in ('note', 'commentaire') group by 1, 2, 3, 4 having count(*) <> max(version)) x), null
union all
select 'NE active de Joris sur e3', (select count(*) from rejeu.non_evaluations r join azimut.noeuds n on n.id = r.noeud_id
                     join azimut.participants p on p.id = r.participant_id where p.nom = 'Joris' and n.code = 'e3' and r.active), null;
