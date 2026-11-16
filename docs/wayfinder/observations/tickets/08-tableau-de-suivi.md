> Publié dans l'issue [#67](https://github.com/fuzoh/azimut/issues/67) le 16 novembre 2026. L'issue fait foi ; ce fichier n'est plus tenu à jour.

## Ce qu'il faut construire

**Voir qui a été peu observé** (spec §5 « Suivi »).

- Un tableau par groupe : pour chaque apprenant, le nombre d'observations et la date de la dernière. **Forme proposée à la révision 12, à confirmer par le porteur.**
- Un apprenant sans observation est mis en évidence.
- Le tableau informe seulement : ni avertissement, ni blocage, ni décompte par formateur.

## Critères d'acceptation

- [ ] Un apprenant sans observation affiche 0 et « jamais », mis en évidence.
- [ ] La date de la dernière observation suit le moment observé, pas l'heure de saisie.
- [ ] Finaliser la qualification d'un apprenant sans observation ne déclenche ni erreur ni avertissement.
- [ ] Le tableau ne montre aucun nom de formateur.

## Bloqué par

- Ticket 1 : tracer, observation générale
