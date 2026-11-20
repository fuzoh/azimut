> Publié dans l'issue [#60](https://github.com/fuzoh/azimut/issues/60) le 16 novembre 2026. L'issue fait foi ; ce fichier n'est plus tenu à jour.

## Ce qu'il faut construire

Le chemin complet le plus court : **saisir une observation générale sur téléphone et la relire dans la fiche de l'apprenant** (spec §3, §4, §5).

- Page d'accès rapide : le groupe en cours du formateur et ses membres en gros boutons, chacun avec son nom de scout, son nom, son groupe d'origine, une pastille d'initiales et son nombre d'observations. On change de groupe sur la page.
- Un appui sur un apprenant ouvre la saisie : un texte, puis « Enregistrer ». L'observation porte l'apprenant, le texte, l'auteur et le moment (l'heure de saisie). Elle est générale : aucun rattachement.
- Après l'enregistrement, retour à la page d'accès rapide, sur le même groupe.
- Fiche de l'apprenant, ouverte par un second geste depuis sa tuile : ses observations dans l'ordre du temps, avec auteur et moment, et l'accès à sa qualification.
- Lecture et écriture réservées à l'équipe du cours. Une observation n'apparaît dans aucune restitution à l'apprenant et n'entre dans aucun calcul.

## Critères d'acceptation

- [ ] Sur un écran de téléphone, une observation s'enregistre en trois gestes : apprenant, texte, enregistrer.
- [ ] L'observation enregistrée apparaît dans la fiche de l'apprenant pour un autre formateur du même cours.
- [ ] Un formateur d'un autre cours ne peut ni la lire ni en créer (test d'autorisation côté serveur).
- [ ] Une observation sans texte est refusée.
- [ ] Le groupe choisi est conservé d'une saisie à la suivante et au rechargement de la page.
- [ ] Aucun export de vue ni attestation ne contient d'observation (test).

## Prérequis hors spec

Socle : comptes, cours, participants, groupes, droits par cours.

## Bloqué par

Rien dans cette spec.
