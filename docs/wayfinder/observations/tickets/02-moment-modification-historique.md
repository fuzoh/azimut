> Publié dans l'issue [#61](https://github.com/fuzoh/azimut/issues/61) le 16 novembre 2026. L'issue fait foi ; ce fichier n'est plus tenu à jour.

## Ce qu'il faut construire

**Corriger une observation** : son moment, son texte, ou la supprimer (spec §3, ticket 05 de la carte).

- Le moment est prérempli avec l'heure de saisie et modifiable à la saisie comme après coup, à la minute. L'heure réelle de saisie est conservée.
- Tout membre de l'équipe du cours peut modifier ou supprimer une observation, pas seulement son auteur.
- Chaque modification et suppression est tracée : qui, quand, ancienne et nouvelle valeur.
- La fiche de l'apprenant trie sur le moment observé, pas sur l'heure de saisie.

## Critères d'acceptation

- [ ] Une observation saisie le soir avec un moment fixé à 14h10 s'affiche à 14h10 dans la fiche, et son heure réelle de saisie reste consultable.
- [ ] Un formateur modifie le texte d'une observation écrite par un collègue ; l'historique montre l'auteur de la modification et l'ancien texte.
- [ ] Une observation supprimée disparaît de la fiche et reste dans l'historique.
- [ ] Un moment dans le futur est refusé.

## Prérequis hors spec

Historique des modifications (le même mécanisme que pour les cases, `TODO.md`).

## Bloqué par

- Ticket 1 : tracer, observation générale
