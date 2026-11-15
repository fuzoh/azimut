## Question

Comment Qualix fait-il saisir une observation ?

`docs/analyse/06-benchmark-qualix.md` décrit le modèle de Qualix, pas ses parcours de saisie. #29 s'en inspire pour la saisie rapide. Il faut les faits avant les grills sur la plage d'exercice et la saisie.

À établir, sur le dépôt `gloggi/qualix` et ses docs (`docs/Features/`, `docs/Vision/`), en citant fichiers et issues :

- le **formulaire d'observation** : champs, valeurs par défaut, ce qui est prérempli (bloc courant, observateur, apprenants), nombre d'actions pour une observation ;
- le **choix du bloc** : comment le bloc courant est proposé, selon la date ou l'heure ;
- la **saisie à plusieurs apprenants** et par groupe d'apprenants ;
- le **Spick** et les missions d'observation : ce que le formateur voit pendant un bloc ;
- les **grilles d'évaluation** rattachées à un bloc : saisie, impression papier ;
- la **photo** du participant : d'où elle vient, où elle est affichée ;
- les **demandes ouvertes** sur la saisie (rapidité, mobile, hors ligne) depuis le clonage du 3 octobre 2026.

Résultat attendu : `docs/analyse/` reçoit un document de constats, avec les faits vérifiés séparés des déductions, comme dans 06.

## Résolution (15 novembre 2026)

Constats dans `docs/analyse/23-saisie-qualix.md` (commit Qualix `c914db9` du 2026-11-06, lecture du code, rien exécuté).

- **Un seul formulaire en page entière**, prérempli par l'URL selon la page d'origine. L'observateur est l'utilisateur connecté.
- **Après l'enregistrement, on reste sur le formulaire** avec les mêmes apprenants, bloc et observateurs ; le texte est vidé et reprend le focus. C'est tout l'enchaînement.
- **Le bloc courant n'est jamais présélectionné** : un bloc n'a qu'une date, Qualix trie seulement les blocs récents en tête. Aucune mémoire du dernier bloc hors de l'enchaînement.
- **Choisir un bloc coche les exigences liées** : seul mécanisme de suggestion.
- **Le Spick** affiche, par bloc, les photos des apprenants de mes missions avec un compteur de mes observations ; un clic ouvre le formulaire prérempli. C'est le chemin le plus court.
- **Photo** : téléversée à la main, pas d'import MiData, absente du formulaire d'observation, supprimée à l'archivage.
- **Hors ligne** : rien sur ce formulaire, sauf la restauration des champs après une session expirée.

Non vérifié : les issues GitHub de Qualix (accès refusé depuis la session), les nouveautés depuis le 3 octobre 2026, le comportement réel à l'écran (déduit du code), l'accès aux photos sur une instance.
