> Publié dans l'issue [#42](https://github.com/fuzoh/azimut/issues/42) le 16 novembre 2026. L'issue fait foi ; ce fichier n'est plus tenu à jour.

## Question

Que nous apporte le **prototype du modèle de calcul** pour la première version ?

À établir, sur la branche `spec/prototype`, les issues #14 à #28 et `docs/analyse/19-constats-maquette.md` :

- **où est le code** du prototype et dans quel état (tests, lancement) ;
- ce qui est **réutilisable tel quel** : noyau (`compile`, `evaluate`, `explain`), format JSON d'une grille, générateur de données, corpus A01, A03 et G3 ;
- ce qui était **jetable par conception** et ne doit pas être repris ;
- ce que le prototype dit déjà de la **conception d'une grille** : contraintes de `compile`, erreurs, catalogue de fonctions et de barèmes ;
- l'**état des mesures** : ce que #27 et #28 doivent encore établir, et si une variante du moteur se dégage déjà pour un cours de démonstration de petite taille ;
- les **constats** déjà écrits et les hypothèses encore commutables.

Résultat attendu : un document de constats dans `docs/analyse/`, faits vérifiés séparés des déductions.

## Résolution (15 novembre 2026)

Constats dans `docs/analyse/26-acquis-prototype.md` (`main` au commit `bd71e51`, après la fusion de la PR #31).

- **Le code du prototype est sur `main`, dans `prototype/`.** `main` est désormais la seule branche distante ; `spec/prototype`, `research/*` et `corpus/*` ont été supprimées après fusion.
- **Le noyau fonctionne et est pur** : `compile`, `evaluate`, `explain`, `remplissage`, `copier`, `graphe`, environ 2 000 lignes sans React ni navigateur. 452 tests sur 454 passent ; les deux échecs touchent le jeu « charge » et le worker (cause déduite : délais sur une machine lente).
- **Le prototype ne contient aucun éditeur de grille.** Les grilles sont des JSON produits par des scripts ; les erreurs de `compile` ne sont affichées nulle part.
- **Le format JSON d'une grille existe et est typé.** Il sépare le calcul (`noeuds`) de l'affichage (`axes`), avec des identifiants écrits à la main : un éditeur doit cacher cette forme et générer les identifiants.
- **F1, F2 et F3 suffisent pour une grille simple** : moyenne pondérée, seuil et « toutes ». La grille A03 entière s'écrit ainsi.
- **`compile` est un juge partiel** : erreurs en chaînes françaises, sans code ni référence au nœud fautif, et plusieurs incohérences passent (barème ordinal sans paliers, bornes inversées, calcul sans entrée).
- **Aucune variante du moteur n'est retenue**, #27 n'est pas close et #28 n'est pas commencé. Mais le calcul coûte 0,2 ms par participant sur une grille six fois plus grande que les grilles réelles : pour un cours de démonstration, recalculer le participant entier à chaque saisie suffit.
- **Le temps réel à deux formateurs n'a aucun acquis** : ni serveur, ni synchronisation, ni persistance dans le prototype.

À signaler au porteur : reprendre le noyau contredit la lettre de la spec du prototype (« on garde les conclusions et les algorithmes, pas le code »).

Non vérifié : le build, le lancement dans un navigateur, le harnais de mesure, la cause exacte des deux tests en échec, le comportement de `evaluate` sur une grille incomplète.
