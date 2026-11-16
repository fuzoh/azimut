> Publié dans l'issue [#46](https://github.com/fuzoh/azimut/issues/46) le 16 novembre 2026. L'issue fait foi ; ce fichier n'est plus tenu à jour.

Blocked by: {{01}}

## Question

Quel **temps réel minimal** faut-il pour remplir une grille à deux formateurs devant un public ?

Décidé dans `TODO.md` : le serveur fait autorité, dernier gagnant, historique de chaque modification, verrous et présence par un canal WebSocket.

À trancher pour la démonstration :

- la **vue de saisie** : par apprenant, par exercice, table apprenants × nœuds ;
- ce qu'on **voit de l'autre** : sa saisie qui apparaît, sa présence, la case qu'il modifie ;
- le **verrou de case** : nécessaire à la démonstration ou reporté ;
- l'**historique** : construit, ou seulement enregistré sans écran ;
- la **coupure courte** : traitée ou reportée.
