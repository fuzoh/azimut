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

**Nœud de commentaire** :
Nœud de données sans barème. Ses cases ne portent qu'un commentaire, et il ne contribue à aucun calcul.
_Avoid_ : nœud texte, nœud libre
