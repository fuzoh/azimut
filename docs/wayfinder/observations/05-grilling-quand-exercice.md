## Question

Quel est le **« quand »** d'une observation, et comment la plage d'exercice est-elle proposée ?

#29 veut remplir une observation « avec le moment » et se voir suggérer la plage d'exercice concernée d'après l'heure. Décidé en amont : le programme n'entre pas dans Azimut, le « quand » est l'heure de saisie, aucune date n'est portée par les exercices, et l'application propose l'exercice récemment utilisé. La colonne « Quand » de la Posture (`FEATURES.md`, constats 7 et 8) dit le même besoin.

À trancher :

- **ce qu'on enregistre** : l'heure de saisie seule, ou aussi un moment observé que le formateur peut corriger ;
- **la suggestion** : dernier exercice utilisé par le formateur ou par l'équipe, et combien de temps elle reste valable ;
- **la saisie différée** : on note le soir ce qu'on a vu l'après-midi, ou on recopie du papier (N-QX10) ;
- **le lien avec les nœuds** : choisir un exercice restreint-il les nœuds proposés, et l'inverse ;
- **les observations par groupes d'exercice** : enchaîner les apprenants d'un groupe sur un même exercice.

## Résolution (15 novembre 2026)

Grill clos.

- **Moment** : date et heure, à la minute. Prérempli avec l'heure de saisie, modifiable par le formateur (saisie différée, recopie du papier). L'heure réelle de saisie reste dans l'historique.
- **Exercice proposé** : le dernier que le formateur a utilisé, propre à chaque formateur, sans limite de durée. Il reste sélectionné jusqu'à ce que le formateur en change. Aucune suggestion par l'heure.
- **Pas de champ « exercice » à part** : l'exercice est un des nœuds rattachés. Le choisir réduit la liste proposée aux indicateurs que cet exercice évalue, toutes sphères confondues.
- **Le filtre est une aide, pas une règle** : on peut élargir à toute la grille et rattacher un indicateur que l'exercice n'évalue pas.
- **Occurrences** (18 §4) : on rattache à l'occurrence, pas à l'exercice en général. L'application propose la dernière occurrence utilisée par le formateur.
- **Enchaînement** : d'une observation à la suivante, l'exercice et le groupe restent ; l'apprenant se choisit à chaque fois parmi les membres du groupe.
