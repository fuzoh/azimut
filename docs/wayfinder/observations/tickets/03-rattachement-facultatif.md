> Publié dans l'issue [#62](https://github.com/fuzoh/azimut/issues/62) le 16 novembre 2026. L'issue fait foi ; ce fichier n'est plus tenu à jour.

## Ce qu'il faut construire

**Rattacher une observation à la grille**, à la saisie ou après (spec §3 « Rattachement », révision 12).

- Une observation peut porter zéro, un ou plusieurs rattachements, vers un nœud de n'importe quel type : sphère, objectif, indicateur, nœud de Posture, exercice. Pour un exercice à occurrences, on rattache à l'occurrence.
- À la saisie : un bouton « Rattacher », replié par défaut, ouvre le choix des nœuds. Rien n'est proposé ni repris de l'observation précédente.
- Après coup : depuis la fiche de l'apprenant, on ajoute ou retire un rattachement. Toute l'équipe peut le faire.
- Une observation sans rattachement est affichée « Générale ». Aucune liste ni compteur ne la signale comme à traiter.

## Critères d'acceptation

- [ ] Une observation enregistrée sans ouvrir « Rattacher » est générale.
- [ ] Une observation peut être rattachée à la fois à une sphère et à un exercice.
- [ ] Rattacher à un exercice qui a deux occurrences demande de choisir l'occurrence.
- [ ] Après une observation rattachée à un indicateur, la saisie suivante s'ouvre sans rattachement.
- [ ] Retirer le dernier rattachement rend l'observation générale, sans avertissement.
- [ ] Un rattachement vers un nœud d'une autre grille est refusé côté serveur.

## Prérequis hors spec

Grille : structure des nœuds et occurrences.

## Bloqué par

- Ticket 1 : tracer, observation générale
