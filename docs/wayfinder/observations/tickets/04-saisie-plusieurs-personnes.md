> Publié dans l'issue [#63](https://github.com/fuzoh/azimut/issues/63) le 16 novembre 2026. L'issue fait foi ; ce fichier n'est plus tenu à jour.

## Ce qu'il faut construire

**Noter le même fait pour plusieurs apprenants** (spec §4 « Groupe »).

- Sur la page d'accès rapide, un mode « Plusieurs personnes » permet de cocher des membres du groupe, avec « Tout cocher ».
- La saisie crée **une observation indépendante par personne cochée**, avec le même texte, le même moment et les mêmes rattachements. Chacune se modifie ensuite séparément.
- L'écran confirme le nombre d'observations créées.

## Critères d'acceptation

- [ ] Cocher trois membres sur cinq crée trois observations, une dans chaque fiche.
- [ ] Modifier l'une des trois ne change pas les deux autres.
- [ ] La création est tout ou rien : si une des observations échoue, aucune n'est créée.
- [ ] Après l'enregistrement, le mode « Plusieurs personnes » est désactivé et la sélection vidée.

## Bloqué par

- Ticket 1 : tracer, observation générale
