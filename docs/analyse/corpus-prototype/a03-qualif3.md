# A03 « qualif3 » : RU Chef de camp J+S dans le modèle de 18

> **Statut : modélisation du ticket [Modélisation de A01 et A03 dans le modèle de 18](https://github.com/fuzoh/azimut/issues/6), arbitrages du 5 octobre 2026.** Source : `qualif3.xlsx` (vierge, hors dépôt, dans `.scratch/`). Vocabulaire de [18](../18-decisions-definitives.md), du [grill barèmes et fonctions de calcul](https://github.com/fuzoh/azimut/issues/4#issuecomment-5991014865) et de [`GLOSSARY.md`](../../../GLOSSARY.md). Description de l'archétype : [09, A03](../09-corpus-qualifications.md#a03-qualif3--moyennes-pondérées-conversion-non-linéaire-veto-excel-actuel-v-daprès-une-première-analyse-des-excel-retirée).

## Fichiers

- [`a03-structure.json`](a03-structure.json) : la grille complète, produite par [`extraire-structure.py`](extraire-structure.py). Les objectifs et critères portent un libellé abrégé ; les indicateurs et les items de Posture sont numérotés sans leur texte.
- [`a01-a03-controle.py`](a01-a03-controle.py) : résultats attendus des participants types, en sémantique 18 et en sémantique Excel.

## Rôle dans le corpus

A03 éprouve le **pipeline complet** d'un nœud de calcul (fonction → conversion → arrondi propagé → joker) sur une grille réelle. Elle éprouve aussi les moyennes pondérées en cascade, deux barèmes d'indicateurs, un nœud décisif et une grille d'observation hors calcul (Posture). 219 indicateurs, 45 items de Posture et 82 nœuds de calcul.

## Ce que contient l'Excel

| Élément | Contenu |
| --- | --- |
| Sphères | A Techniques JS (7 objectifs, 18 critères, 99 indicateurs), B Organisation (5, 17, 78), C Scoutisme (3, 10, 42) |
| Saisie | sur l'indicateur, 1 à 5 ; décimales permises en A et B, entiers en C ; vide = non observé |
| Critère | moyenne simple de ses indicateurs (`AVERAGEIF`), vide exclu |
| Objectif | moyenne pondérée de ses critères (poids 1 ou 2 ; 11 critères de poids 2), critère sans note exclu ; affiché en %, converti et arrondi |
| Sphère | moyenne pondérée des objectifs **bruts** (7 objectifs de poids 2), puis conversion 1 → 0 %, 3 → 100 %, 5 → 150 %, puis `ROUND(…, 2)`, soit un **arrondi à 1 %** |
| Seuil | sphère arrondie ≥ 80 % |
| Décision | 3 sphères réussies sur 3 **et** aucun motif éliminatoire (veto) |
| Joker | AUCUN / UTILISÉ, justification, « un demi-point sur une sphère, une fois » ; **aucune formule ne le lit** |
| Posture | 10 axes (A à J), 45 items, 4 méta-axes, colonnes Commentaire et « Quand » ; hors calcul, barème non matérialisé |
| Autres | table de couverture des 29 objectifs officiels MSdS (texte libre), 13 motifs éliminatoires, attestation |

## Modélisation

### Barèmes

| Barème | Type | Valeurs | Usage |
| --- | --- | --- | --- |
| `Note 1–5` | numérique borné | 1 à 5, pas 0,1 | indicateurs de A et B ; sortie des critères, objectifs |
| `Échelle 1–5` | ordinal à paliers | 1 Insuffisant, 2 En voie d'acquisition, 3 Atteint au minimum, 4 Atteint avec aisance, 5 Excellent | indicateurs de C, items de Posture |
| `% 0–150` | numérique borné | 0 à 150, pas 1 ; colorations < 80 rouge, 80–90 jaune, 90–110 vert, > 110 bleu | sphères, objectifs en % |
| `OK/KO` | binaire | | seuils, Réussite |

L'Excel accepte toute décimale en A et B ; le pas de 0,1 est une hypothèse. Les paliers de C viennent de la feuille `Echelle`. Un critère de C a des entrées ordinales : F1 sort sur un numérique couvrant les valeurs associées, soit `Note 1–5`. Les entrées de données d'un même critère partagent toujours un barème, et aucun nœud ne mélange A ou B avec C avant la sphère.

### Nœuds et contributions

| Nœud | Nombre | Pipeline | Entrées |
| --- | --- | --- | --- |
| Indicateur | 219 | données | — |
| Critère | 45 | F1 → `Note 1–5` | ses indicateurs, poids 1 |
| Objectif | 15 | F1 → `Note 1–5` | ses critères, poids 1 ou 2 |
| Objectif en % (indicatif) | 15 | F1 → conversion `1 → 0, 3 → 100, 5 → 150` → arrondi 1 | l'objectif seul |
| Sphère | 3 | F1 → conversion → **arrondi 1** → joker | ses objectifs **bruts**, poids 1 ou 2 |
| Seuil de sphère | 3 | F2 ≥ 80 | la sphère |
| **Réussite** (décisif) | 1 | F3 « toutes » | les 3 seuils |
| Item de Posture | 45 | données, `Échelle 1–5`, indicatif | — |
| Regroupement de Posture | 14 | structure seule (10 axes, 4 méta-axes) | — |

L'ordre de T6 est porté par la **structure** : la sphère consomme l'objectif brut, puis convertit. Le nœud « objectif en % » reproduit l'affichage de la synthèse sans entrer dans la sphère. Convertir l'objectif lui-même changerait la décision (voir Dorian).

L'arrondi propagé de la sphère suit l'Excel : il s'applique **avant** le seuil, si bien que 79,75 % passe à 80 % (voir Basile). L'arrondi d'affichage est de 0,01 sur `Note 1–5`.

### Axes et placements

| Axe | Arbre |
| --- | --- |
| **Sphères** (principal) | sphère → seuil, objectifs → objectif en %, critères → indicateurs ; Réussite à la racine |
| Posture | méta-axe → axe → item |

Aucun placement sans contribution, aucun chemin multiple : chaque indicateur compte dans un seul critère, chaque critère dans un seul objectif. Les méta-axes reprennent le regroupement vertical de la feuille `Posture`. Ce sont des regroupements de présentation, sans nœud de calcul (18 §3).

### Définitions partagées

19 définitions ont plusieurs occurrences, reconnues au texte identique. Les critères A 6.2 et A 7.2 sont les mêmes, tout comme C 2.3 et C 3.3. Des indicateurs reviennent d'un objectif à l'autre, par exemple ceux des corrections dans A 3, A 6 et A 7, et B 1.1 et C 3.1 partagent des indicateurs. Chaque occurrence garde ses propres cases (18 §4).

### Joker

Quota de 1 par participant. Nœuds autorisés : les 3 sphères, action « +25 % » sur la valeur finale (après l'arrondi), bornée à 150 %, expliquée « ≈ ½ point » (grill barèmes). Sous 3 sur 5, un demi-point vaut 25 % ; au-dessus, il vaudrait 12,5 %. Le joker sert près du seuil (2,6 sur 5), donc toujours dans la première zone.

### Exigences de remplissage

**Chaque critère exige au moins une note active** (minimum par regroupement, 1c, commutable) : 45 regroupements. Aucun indicateur n'est obligatoire, conformément à « case vide = non observé ». Un critère entièrement vide maintient l'avertissement de données provisoires.

## Écarts avec l'Excel

| # | Excel | Modèle | Effet |
| --- | --- | --- | --- |
| 1 | Dossier ou sphère vide affiché « Réussi » : un texte vide est jugé ≥ 0,8 (`Synthèse!F24`, `F26`, `F35`, `F42`) | Sphère sans résultat, seuil sans résultat, Réussite sans résultat | Élodie : « Réussi » → sans résultat |
| 2 | `C - Scoutisme!I56` oublie l'indicateur `H65` du critère C 3.4 | Les 9 indicateurs comptent | Alix : critère 3,00 → 3,22 |
| 3 | Joker sans effet calculé, appliqué à la main | Action +25 % sur la sphère, quota et traçabilité | Capucine : 60 % → 85 %, Réussite |
| 4 | Motifs éliminatoires : veto sur la décision | Non repris | Veto retiré (hors périmètre de la carte) |
| 5 | « 3 sphères sur 3 » écrit en dur, seuil 80 % en cellule | F3 sur trois nœuds de seuil | Aucun |
| 6 | Objectif affiché en % dans la synthèse | Nœud indicatif « objectif en % » | Aucun ; 15 nœuds de plus |
| 7 | Colonnes techniques : compteur de vides (faux en B et C), « delta » d'arrondi (soustrait un % d'une note) | Non reprises ; l'explication et l'onglet d'erreurs les remplacent | Aucun |
| 8 | Posture : barème non validé, colonne « Quand » en texte libre | Items sur `Échelle 1–5`, « Quand » dans le commentaire | Pas de date structurée |
| 9 | Table de couverture MSdS en texte libre | Non reprise ; pourrait devenir des étiquettes facultatives (18 §2) | Aucun |
| 10 | Couleurs des notes incohérentes entre A et B/C | Colorations portées par le barème | Hors prototype |

Aucun cas hors catalogue : F1, F2 et F3 suffisent, avec conversion, arrondi propagé et joker.

## Participants types

Règles de remplissage, appliquées par [`a01-a03-controle.py`](a01-a03-controle.py) :

| Participant | Cases | Ce qu'il montre |
| --- | --- | --- |
| **Alix** | A tout à 4, B et C tout à 3 sauf C 3.4 indicateur 9 à 5 ; Posture tout à 4 | chemin nominal ; indicateur omis par l'Excel ; Posture sans effet |
| **Basile** | A tout à 2,6 sauf A 2.1 indicateur 4 à 2,2 ; B et C tout à 4 | arrondi propagé avant le seuil : 79,75 % → 80 % |
| **Capucine** | A et B tout à 4 ; C 1 à 3, C 2 et C 3 à 2 ; joker sur la sphère C | joker qui fait basculer la Réussite |
| **Dorian** | A et C tout à 4 ; B 1 et B 2 à 5, B 3 et B 4 à 1, B 5 à 3 | ordre conversion / moyenne (T6) sur une grille réelle |
| **Élodie** | aucune case | dossier vide sans résultat ; bug de l'Excel |
| **Fanny** | A 1.1 indicateur 1 et B 1.1 indicateur 1 à 3, rien d'autre | réussite sur des données minimales (H4) ; 43 critères sans note |

## Résultats attendus

Sortie de `a01-a03-controle.py`. « — » : sans résultat.

| Participant | Sph. A | Sph. B | Sph. C | A ≥ 80 | B ≥ 80 | C ≥ 80 | Réussite | Critères sans note | Excel A / B / C | Excel réussite |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Alix | 125 % | 100 % | 100 % | OK | OK | OK | OK | 0 | 125 % / 100 % / 100 % | OK |
| Basile | 80 % | 125 % | 125 % | OK | OK | OK | OK | 0 | 80 % / 125 % / 125 % | OK |
| Capucine | 125 % | 125 % | 85 % | OK | OK | OK | OK | 0 | 125 % / 125 % / 60 % | KO |
| Dorian | 125 % | 100 % | 125 % | OK | OK | OK | OK | 0 | 125 % / 100 % / 125 % | OK |
| Élodie | — | — | — | — | — | — | — | 45 | — / — / — | OK |
| Fanny | 100 % | 100 % | — | OK | OK | — | OK | 43 | 100 % / 100 % / — | OK |

### Détails

**Alix**, critère C 3.4 :

| Nœud | 18 | Excel |
| --- | --- | --- |
| Critère C 3.4 | 3,22 | 3,00 |
| Objectif C 3 | 3,04 | 3,00 |
| Objectif C 3 en % | 101 % | 100 % |
| Sphère C | 100 % | 100 % |

L'écart s'efface à la sphère par l'arrondi (100,4 % → 100 %).

**Basile**, sphère A :

| | Avec arrondi (défaut) | Sans arrondi |
| --- | --- | --- |
| Objectif A 2 | 2,55 | 2,55 |
| Sphère A | 80 % | 79,75 % |
| A ≥ 80 | OK | KO |
| Réussite | OK | KO |

**Capucine**, sphère C brute 2,2 :

| | Avec joker | Sans joker |
| --- | --- | --- |
| Sphère C | 85 % | 60 % |
| C ≥ 80 | OK | KO |
| Réussite | OK | KO |

Marques attendues : « joker appliqué » sur la sphère C, « influencé par un joker » sur C ≥ 80 et sur Réussite.

**Dorian**, sphère B :

| Objectif | Poids | Brut | En % |
| --- | --- | --- | --- |
| B 1 | 2 | 5,00 | 150 % |
| B 2 | 1 | 5,00 | 150 % |
| B 3 | 2 | 1,00 | 0 % |
| B 4 | 1 | 1,00 | 0 % |
| B 5 | 1 | 3,00 | 100 % |
| **Sphère B** (moyenne puis conversion) | | | **100 %** |
| Moyenne pondérée des objectifs en %, pour comparaison | | | 78,6 % |

Le nœud « objectif en % » affiche 150 % et 0 %, mais la sphère ne les consomme pas : elle passe à 100 %, là où la moyenne des % échouerait.

**Élodie** : Réussite sans résultat, H4 strict aussi ; 45 critères sans note active. L'Excel affiche « Réussi ».

**Fanny** : Réussite **OK** par défaut (H4 ignore la sphère C sans résultat), **sans résultat** en H4 strict ; 43 critères sans note active, donc avertissement. L'Excel affiche « Réussi ».

## Laissé à d'autres tickets

- **Commutateurs** : H4 strict et l'arrondi propagé désactivable sont montrés ici ; leur exposition relève du ticket sur les commutateurs de 19.
- **Volume** : A03 fait 360 nœuds. La mise à l'échelle relève du générateur déterministe.
- **Copie de grille** : A03 n'en prévoit pas ; G3 porte ce cas.
