## Destination

La spec des **observations et du suivi en cours de formation**, dans `docs/analyse/22-spec-observations.md` : périmètre, décisions de domaine, parcours de saisie et hors-périmètre, prête à être découpée en tickets. Elle part des idées de #29 (inspiration Qualix). La carte s'arrête quand on sait quoi construire ; la construction est un effort séparé.

## Notes

- **Origine** : #29. Idées à couvrir ou à écarter explicitement : sphère Posture, photos des apprenants, observation remplie « avec le moment », suggestion de la plage d'exercice selon l'heure, observations par groupes d'exercice, page d'accès rapide (raccourcis, recherche floue), évaluation des UA par les apprenants et les formateurs, programme de cours dans l'app, validation de cours.
- **Domaine** : `docs/analyse/18-decisions-definitives.md` fait foi. Points de friction connus, à ne pas rouvrir sans le signaler explicitement :
  - §5 : une note courante par case, pas d'avis séparés ni d'observations multiples (`FEATURES.md`, constat 8) ;
  - §4 : la temporalité passe par les exercices et occurrences prévus dans la grille, sans dimension « contexte » sur la case ;
  - §11 et `FEATURES.md` « Acteurs et accès » : l'application est réservée aux formateurs, aucun espace apprenant ;
  - `FEATURES.md` : la Posture est faite de nœuds indicatifs.
- **Qualix** : `docs/analyse/06-benchmark-qualix.md` (modèle, N-QX1 blocs, N-QX2 missions d'observation, N-QX6 observation à plusieurs apprenants, N-QX9 effort d'observation, N-QX12 séparer observer et évaluer). Le positionnement face à Qualix reste ouvert (18 §13) : cette carte le tranche pour la partie observations.
- **Skills** : grilling + domain-modeling pour les tickets de grill ; research pour les tickets de recherche. Tickets et résolutions en français.

## Decisions so far

<!-- one line per closed ticket -->

## Not yet specified

- **Saisie rapide** : page d'accès rapide, raccourcis, recherche floue, enchaînement d'observations pour un groupe. À préciser une fois l'observation et la plage définies, et la saisie de Qualix relue.
- **Suivi de l'effort d'observation** : qui a observé qui, missions d'observation (N-QX2, N-QX9). Dépend de la nature de l'observation.
- **Validation de cours** : vérifier que les observations prévues tiennent dans le programme et tombent à un moment réaliste. N'existe que si le programme entre dans l'app.
- **Passage de l'observation à la note** : comment des observations nourrissent une case, un commentaire ou un retour à l'apprenant (N-QX3).
- **Prototype de la saisie** : une maquette jetable peut être nécessaire pour trancher l'ergonomie. À décider après les grills.
- **Rédaction de la spec** : dernier ticket, quand le reste est clos.

## Out of scope

- Le modèle de calcul de 18 (barèmes, fonctions, joker, copie) : inchangé.
- La construction.
- Le contenu de #30 (parties communes, correction à la chaîne, versions, tableau de bord).
