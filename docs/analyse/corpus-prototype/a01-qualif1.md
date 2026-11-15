# A01 « qualif1 » : TOP - Expert·e J+S dans le modèle de 18

> **Statut : modélisation du ticket [Modélisation de A01 et A03 dans le modèle de 18](https://github.com/fuzoh/azimut/issues/6), arbitrages du 5 octobre 2026.** Source : `qualif1.xlsx` (vierge, hors dépôt, dans `.scratch/`). Vocabulaire de [18](../18-decisions-definitives.md), du [grill barèmes et fonctions de calcul](https://github.com/fuzoh/azimut/issues/4#issuecomment-5991014865) et de [`GLOSSARY.md`](../../../GLOSSARY.md). Description de l'archétype : [09, A01](../09-corpus-qualifications.md#a01-qualif1--points-exercices-et-thèmes-transversaux-excel-actuel-v).

## Fichiers

- [`a01-structure.json`](a01-structure.json) : la grille complète (nœuds, contributions, axes, exigences), produite par [`extraire-structure.py`](extraire-structure.py) depuis l'Excel. Le dépôt est public : les objectifs et critères portent un libellé abrégé, et les indicateurs sont numérotés sans leur texte.
- [`a01-a03-controle.py`](a01-a03-controle.py) : résultats attendus des participants types, en sémantique 18 et en sémantique Excel (`uv run docs/analyse/corpus-prototype/a01-a03-controle.py`).
- [`a01-participants.json`](a01-participants.json) : sources et résultats attendus des participants types, figés par `a01-a03-controle.py --figer` pour les tests du prototype.

## Rôle dans le corpus

A01 éprouve ce que G3 et A03 ne couvrent pas : une grille **sans nœud décisif**, des regroupements transversaux qui recâblent les indicateurs, des **définitions partagées** entre exercices sous des codes différents, et le passage du « vide = 0 » au vide exclu. Ses 156 indicateurs, avec 83 nœuds de calcul, en font une grille de taille réelle.

## Ce que contient l'Excel

| Élément | Contenu |
| --- | --- |
| Exercices | 7 feuilles : Construction de cours, Programme de cours, PdC filmé, Planif PdC OZR, Anim PdC OZR, Entretien de qualif, Système de qualif |
| Arbre | exercice → objectif → critère → indicateur ; 20 objectifs placés, 50 critères, 156 indicateurs, tous de poids 1 |
| Calcul | à chaque niveau, Σ obtenu / Σ possible sur les indicateurs ; le vide vaut 0 et compte dans le possible |
| Objectifs transversaux | 4.1 (placé dans 4 exercices) et 2.1 (dans 3), **exclus** de la somme de leur exercice ; synthèse = moyenne simple des % de leurs occurrences |
| Thèmes | 4 listes pré-remplies (exercice, code de critère) : T1 6 critères, T2 14, T3 11, T4 3 ; rapport de sommes |
| Décision | aucune : pas de seuil, pas de règle, des % colorés en dégradé |
| Hors calcul | commentaire par indicateur et par exercice, commentaire général, 17 motifs éliminatoires (Inutilisé/Utilisé, sans effet calculé) |

## Modélisation

### Barème

| Barème | Type | Valeurs | Présentation |
| --- | --- | --- | --- |
| `Points 0–1` | numérique borné | 0 à 1, pas 0,5 | en % |

L'Excel ne valide pas la saisie ; la mise en forme conditionnelle prévoit une couleur pour les valeurs entre 0 et le poids. Le pas de 0,5 garde le demi-point. Toutes les fonctions ont des entrées sur ce barème commun et sortent sur `Points 0–1`, présenté en %. Aucune conversion, aucun arrondi propagé.

### Nœuds et contributions

| Nœud | Nombre | Fonction | Entrées |
| --- | --- | --- | --- |
| Indicateur | 156 | données, `Points 0–1`, obligatoire | — |
| Critère | 50 | F1 | ses indicateurs |
| Objectif (occurrence dans un exercice) | 20 | F1 | ses indicateurs, **directement** |
| Exercice | 7 | F1 | les indicateurs de ses objectifs, **hors 4.1 et 2.1** |
| Thème | 4 | F1 | les indicateurs des critères listés |
| Objectif transversal 4.1, 2.1 | 2 | F1 | les occurrences de l'objectif (4 et 3 nœuds d'objectif) |

Les poids valent tous 1 : F1 sur les indicateurs d'un regroupement donne le rapport Σ obtenu / Σ possible, vide exclu. C'est la règle du grill barèmes pour les thèmes, étendue aux objectifs et aux exercices. Câbler l'exercice sur ses objectifs donnerait une moyenne de pourcentages. Un critère de 8 indicateurs n'y pèserait plus deux fois un critère de 4 (voir Cléo).

Les objectifs transversaux, eux, moyennent bien les **pourcentages** de leurs occurrences, comme l'Excel (`Synthèse!C55 = AVERAGE(C56:C59)`).

Le critère n'a pas de % dans l'Excel (seulement Σ possible et Σ obtenu). Il devient un nœud F1 indicatif, utile à l'affichage et à l'explication d'un thème.

### Axes et placements

| Axe | Arbre | Remarque |
| --- | --- | --- |
| **Exercices** (principal) | exercice → objectif → critère → indicateur | 4.1 et 2.1 sont **placés** sous leur exercice sans y **compter** |
| Thèmes transversaux | thème → critères listés | placement des critères ; la contribution part des indicateurs |
| Objectifs transversaux | 4.1, 2.1 → leurs occurrences | |

### Définitions et occurrences

Une définition est reconnue au texte identique (`definition` dans le JSON). 33 définitions ont plusieurs occurrences :

- objectif 4.1 (2 critères, 7 indicateurs) dans Construction, Programme, Planif et Système ; un indicateur de 4.1.2 a une variante de texte dans Planif, ce qui en fait une définition distincte ;
- objectif 2.1 (critère 2.1.1, 3 indicateurs) dans PdC filmé, Anim et Entretien ;
- objectif 2.6/3.8 dans PdC filmé et Anim, avec 5 critères communs **sous des codes différents** : « Maîtrise du sujet » est 2.6.3 dans PdC filmé et 2.6.4 dans Anim, « Capacité d'expérimentation » 2.6.5 et 2.6.7.

Le code d'un critère n'est donc pas une identité. Les thèmes de l'Excel désignent un critère par (exercice, code) : T3 liste « 2.6.1 à 2.6.4 » dans PdC filmé et « 2.6.1 à 2.6.6 » dans Anim, soit d'autres définitions sous les mêmes codes. Le JSON résout ces références vers les identifiants des occurrences.

### Nœud décisif, seuils, jokers

Aucun. A01 est la grille **formative** du corpus (18 §3 : une grille peut n'avoir aucun nœud décisif). Tous les nœuds sont indicatifs, et l'Excel ne prévoit pas de joker (quota 0).

Sans exigence de réussite, aucun signalement de chemins multiples n'est attendu, alors que des indicateurs comptent dans plusieurs résultats (exercice, objectif, critère, thème). Le critère 3.4.5 de Système, par exemple, compte dans T1 et dans T4. Les deux signalements de 18 §3 ne visent que les exigences de réussite et l'influence multiple sur **un même** résultat.

### Exigences de remplissage

**Les 156 indicateurs sont obligatoires.** Dans l'Excel, une case vide vaut 0 et chaque indicateur est attendu. En 18, le vide est exclu sans pénalité. L'obligation garde l'attente : l'avertissement de données provisoires reste affiché tant qu'un indicateur est vide. Un non-rendu se saisit 0 à la main (18 §6).

## Écarts avec l'Excel

| # | Excel | Modèle | Effet |
| --- | --- | --- | --- |
| 1 | Vide = 0, compté dans le possible | Vide exclu ; indicateur obligatoire, avertissement | Les % montent tant que la saisie est partielle (Ben, Dan) |
| 2 | Occurrence de 4.1 entièrement vide = 0 % dans la moyenne | Occurrence sans résultat, ignorée | 55,4 % → 73,8 % (Cléo) |
| 3 | Pas de % de critère | Critère = F1 indicatif | Ajout d'affichage, sans effet sur les autres résultats |
| 4 | Thème désigné par (feuille, code), recherche `VLOOKUP` + `INDIRECT` | Contributions explicites des indicateurs | Plus de dépendance au libellé de feuille ni au code |
| 5 | Note libre, sans validation | `Points 0–1`, pas 0,5 | Saisie bornée |
| 6 | Motifs éliminatoires (6 catégories, 17 motifs), avertissement puis élimination humaine | Non repris | Hors périmètre de la carte (critères éliminatoires) |
| 7 | Commentaires par indicateur, par exercice, général | Commentaire sur tout nœud (18 §5) | Aucun |
| 8 | Dégradé de couleur relatif (min/max de la synthèse) | Non repris | Colorations hors prototype (grill barèmes) |

Aucun cas du catalogue manquant : F1 seule suffit.

## Participants types

Règles de remplissage, appliquées par [`a01-a03-controle.py`](a01-a03-controle.py) :

| Participant | Cases | Ce qu'il montre |
| --- | --- | --- |
| **Ana** | tout à 1 | chemin nominal, aucun avertissement |
| **Ben** | tout à 1, sauf dans PdC filmé : 2.6.4 indicateur 2 **vide**, 2.6.5 indicateur 1 à **0** (non-rendu saisi), indicateur 2 à 0,5 | vide exclu et 0 saisi ; un obligatoire vide |
| **Cléo** | tout à 1, sauf 4.1 : Planif à 0,5, Programme 4.1.2 à 0,5, Système **vide** ; Construction 1.7 (3 critères, 11 indicateurs) à 0 | occurrence vide ignorée dans 4.1 ; rapport de sommes contre moyenne des % dans T2 ; 4.1 placé sans compter dans l'exercice |
| **Dan** | Construction de cours seule, tout à 0,5 (4.1 compris) | dossier partiel : résultats sur les seules cases présentes, 120 obligatoires vides |

## Résultats attendus

Sortie de `a01-a03-controle.py`. « — » : sans résultat.

### Sémantique 18

| Participant | Constr. | Progr. | PdC filmé | Planif | Anim | Entretien | Système | T1 | T2 | T3 | T4 | 4.1 | 2.1 | Obligatoires vides |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ana | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 0 |
| Ben | 100,0 % | 100,0 % | 86,4 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 96,4 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 1 |
| Cléo | 62,1 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 73,8 % | 100,0 % | 100,0 % | 73,8 % | 100,0 % | 7 |
| Dan | 50,0 % | — | — | — | — | — | — | 50,0 % | 50,0 % | — | — | 50,0 % | — | 120 |

### Sémantique Excel, pour les écarts

| Participant | Constr. | Progr. | PdC filmé | Planif | Anim | Entretien | Système | T1 | T2 | T3 | T4 | 4.1 | 2.1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ana | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % |
| Ben | 100,0 % | 100,0 % | 79,2 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 96,4 % | 96,6 % | 100,0 % | 100,0 % | 100,0 % |
| Cléo | 62,1 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 100,0 % | 73,8 % | 100,0 % | 100,0 % | 55,4 % | 100,0 % |
| Dan | 50,0 % | 0,0 % | 0,0 % | 0,0 % | 0,0 % | 0,0 % | 0,0 % | 16,7 % | 26,2 % | 0,0 % | 0,0 % | 12,5 % | 0,0 % |

### Détails

**Ben**, PdC filmé :

| Nœud | 18 | Excel |
| --- | --- | --- |
| Critère 2.6.4 | 100,0 % | 50,0 % |
| Critère 2.6.5 | 25,0 % | 25,0 % |
| Exercice PdC filmé | 86,4 % | 79,2 % |
| T2 | 96,4 % | 96,4 % |
| T3 | 100,0 % | 96,6 % |

Le 0 saisi compte dans les deux sémantiques ; seul le vide diffère.

**Cléo**, objectif 4.1 :

| Nœud | 18 | Excel |
| --- | --- | --- |
| 4.1 dans Construction | 100,0 % | 100,0 % |
| 4.1 dans Programme | 71,4 % | 71,4 % |
| 4.1 dans Planif | 50,0 % | 50,0 % |
| 4.1 dans Système | — | 0,0 % |
| Objectif transversal 4.1 | 73,8 % | 55,4 % |
| Exercice Planif | 100,0 % | 100,0 % |

L'exercice Planif reste à 100 % : 4.1 y est placé sans compter.

**Cléo**, T2 : le rapport de sommes vaut **73,8 %** ; la moyenne simple des 14 critères vaudrait **78,6 %**. Les 3 critères à 0 de Construction 1.7 pèsent par leurs 11 indicateurs (31 / 42).

## Laissé à d'autres tickets

- **Volume** : A01 fait 239 nœuds. La mise à l'échelle (1500 + 500 nœuds par grille) relève du générateur déterministe.
- **Copie de grille** : A01 n'en prévoit pas ; G3 porte ce cas.
