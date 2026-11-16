# Azimut

Gestion des qualifications des participants en cours de formation : grilles d'évaluation, saisie des notes et calcul des résultats.

## Calcul et barèmes

**Barème** :
Ensemble des valeurs possibles d'une note ou d'un résultat : numérique borné (min, max, pas) ou ordinal à paliers nommés. Le binaire OK/KO est un barème ordinal à deux paliers. Tout résultat, saisi ou calculé, est exprimé sur un barème.
_Avoid_ : échelle, notation

**Palier** :
Valeur nommée d'un barème ordinal, avec sa couleur et sa valeur numérique associée.
_Avoid_ : niveau, échelon

**Sans résultat** :
Situation d'un nœud qui ne produit aucune valeur pour un participant : case vide, non évaluée, ou nœud de calcul sans contribution active. Ignoré par les calculs qui le consomment, sans pénalité.
_Avoid_ : zéro, null, vide (le vide est un état de case, pas un résultat)

**Normalisation** :
Expression d'une valeur dans 0–1 selon la distance entre les extrêmes de son barème, pour que deux contributions de barèmes différents aient la même influence à poids égal.
_Avoid_ : pourcentage, conversion

**Conversion** :
Correspondance explicite d'un barème vers un autre, posée sur un nœud, par exemple 1–5 vers 0–150 % (1 → 0 %, 3 → 100 %, 5 → 150 %). Distincte de la normalisation.
_Avoid_ : normalisation, mise à l'échelle

**Seuil** :
Valeur minimale qu'un résultat doit atteindre pour qu'une fonction de calcul le déclare OK. Paramètre d'une fonction, jamais propriété d'un barème.
_Avoid_ : palier de réussite, note limite

**Coloration** :
Bandes de couleur d'un barème, pour la présentation seulement ; elles n'agissent pas sur le calcul.
_Avoid_ : seuil, statut

**Arrondi propagé** :
Arrondi d'un résultat au pas configuré sur son nœud, transmis tel quel aux calculs en aval. S'oppose à l'arrondi d'affichage, qui ne change pas la valeur transmise.
_Avoid_ : arrondi (sans précision)

## Grille

**Définition** :
Énoncé d'un critère ou d'un indicateur, réutilisable dans plusieurs exercices. Elle ne porte aucune note et ne compte dans aucun calcul.
_Avoid_ : critère (pour l'énoncé), modèle d'indicateur

**Occurrence** :
Nœud de données qui reprend une définition à un endroit précis de la grille, par exemple un exercice. Chaque occurrence porte ses propres cases.
_Avoid_ : instance, tentative

**Exercice** :
Quelque chose que font les participants, sur quoi on les observe et on les évalue. Selon la grille, c'est un niveau de l'arbre (dans qualif1, il remplace la sphère ; dans qualif2, il se confond avec l'objectif) ou une lecture transversale qui réunit des indicateurs pris dans plusieurs sphères (`docs/FEATURES.md`, constat 3). Dans le modèle, c'est un nœud (18 §3).
_Avoid_ : UA, leçon, plage, bloc

**Nœud de commentaire** :
Nœud de données sans barème. Ses cases ne portent qu'un commentaire, et il ne contribue à aucun calcul.
_Avoid_ : nœud texte, nœud libre

## Saisie

**Case** :
Note courante et commentaire éventuel d'un participant sur une occurrence. Une case sans note est vide ; son réaffichage à plusieurs endroits ne crée pas de nouvelle case.
_Avoid_ : cellule, évaluation

**Non évalué** :
Exclusion volontaire d'un nœud du calcul pour un participant, posée sur une case ou sur un regroupement. La note déjà saisie est conservée et redevient active si l'exclusion est retirée.
_Avoid_ : non applicable, absent

**Dispense** :
Non-évaluation posée sur un regroupement, qui s'hérite par ses feuilles.
_Avoid_ : exemption, dispensé (comme état de case)

## Observations

**Observation** :
Fait noté par un formateur sur un participant : un texte ou une pièce jointe, un auteur, un moment. Elle ne porte ni note ni avis, n'entre dans aucun calcul et reste interne à l'équipe du cours.
_Avoid_ : évaluation, note, commentaire (le commentaire est la synthèse restituée au participant)

**Observation générale** :
Observation sans rattachement. C'est l'état par défaut, pas un travail en retard.
_Avoid_ : à classer, à préciser, non classée

**Rattachement** :
Lien facultatif entre une observation et un nœud de la grille : une sphère, un objectif, un indicateur, la Posture, un exercice. Une observation peut en avoir plusieurs.
_Avoid_ : classement, catégorie

**Moment** :
Date et heure, à la minute, où le fait a été observé. Prérempli avec l'heure de saisie et modifiable.
_Avoid_ : plage, bloc, horaire

## Hors d'Azimut

**UA** :
Unité d'apprentissage : un point de cours, une leçon, ce que l'équipe enseigne. Azimut ne la connaît pas. Un exercice évalue une UA ou plusieurs, sans correspondance stricte.
_Avoid_ : exercice

**Programme de cours** :
Horaire du cours, tenu par l'équipe dans son propre outil. Azimut n'en porte ni les plages ni les UA.
_Avoid_ : planning (comme donnée d'Azimut)
