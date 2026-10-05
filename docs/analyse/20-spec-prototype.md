# Spec du prototype du modèle de qualification

> **Statut : spec du prototype jetable, assemblée le 5 octobre 2026** à partir de la [Carte : spec du prototype modèle de qualification](https://github.com/fuzoh/azimut/issues/1). Elle ne prend aucune décision nouvelle : chaque décision renvoie au ticket de la carte qui la porte. [18](18-decisions-definitives.md) fait foi sur le modèle. Vocabulaire de [`GLOSSARY.md`](../../GLOSSARY.md).

## Problème

Le modèle de qualification de 18 est fixé sur le papier. Il reste trois incertitudes, que seul du code peut lever :

- **Le modèle de calcul et de stockage tient-il ?** Les nœuds de données et de calcul, les axes multiples, le placement distinct de la contribution, les définitions et occurrences, plusieurs barèmes, les trois états, la dispense héritée, le joker et la copie de grille doivent tenir ensemble dans un moteur et des structures concrètes.
- **La généralisation couvre-t-elle les cas ?** Le catalogue retenu doit exprimer A01, A03 et G3 sans cas particulier, et donner les résultats attendus des participants types et des cas T de [09](09-corpus-qualifications.md#5-cas-de-test).
- **L'app reste-t-elle fluide ?** À l'échelle visée (200 participants, 3 grilles, environ 900k cases possibles), la saisie et la navigation ne doivent jamais être bloquées par le calcul.

Plusieurs points de [19](19-constats-maquette.md) restent à trancher **en voyant** : la portée de la dispense (1a), les feuilles d'un regroupement (1b), le minimum par regroupement (1c), H4 et H5.

## Solution

Un **prototype jetable** dans `prototype/`, sur une branche dédiée, sans les gates du projet. On en extrait les conclusions et les algorithmes, puis on jette le code. Les conclusions survivent dans `docs/analyse/21-constats-prototype.md`.

Le prototype comprend :

- un **noyau de calcul pur** (compiler une grille, l'évaluer, expliquer un résultat, copier une grille), indépendant de React, de TanStack DB et du navigateur ;
- des **sources** (participants, cases, non-évaluations, jokers) dans des collections TanStack DB en mémoire, remplies par un générateur déterministe ;
- un **store de notes paresseux**, décliné en plusieurs variantes techniques à comparer, dont l'équivalence avec un oracle naïf est prouvée par des tests ;
- une **visualisation brute** : table participants × nœuds de l'axe principal avec édition d'une case, graphe de propagation, panneau d'explication, onglet d'erreurs, panneau de réglages ;
- un **harnais de mesure** Playwright qui juge les critères de performance.

Il n'y a ni UI applicative, ni serveur, ni persistance.

## Récits utilisateurs

Acteurs : le **porteur du projet**, qui essaie le prototype pour trancher ; le **formateur**, joué par le porteur dans la table ; le **script de mesure**, qui pilote le navigateur.

### Corpus et calcul

1. En tant que porteur du projet, je veux charger le jeu « corpus » (A01, A03 et G3 à leur taille réelle, avec leurs participants types), afin de vérifier les résultats sur des grilles réelles.
2. En tant que porteur du projet, je veux que les résultats des participants types de A01, A03 et G3 égalent les résultats attendus figés, afin de savoir que le modèle couvre ces grilles.
3. En tant que porteur du projet, je veux que les cas T2, T3, T5, T6, T8, T9, T10, T13 et T14 de 09 donnent leur résultat attendu, afin de valider chaque fonction du catalogue.
4. En tant que porteur du projet, je veux qu'un nœud transmette une valeur sur son barème de sortie ou « sans résultat », afin que le vide ne soit jamais compté 0.
5. En tant que porteur du projet, je veux qu'une fonction ignore ses entrées sans résultat et rende « sans résultat » quand aucune entrée n'est active, afin que le calcul suive 18 §6.
6. En tant que porteur du projet, je veux mélanger des barèmes numériques et ordinaux entre nœuds de calcul, et voir refusé un mélange entre les entrées de données d'un même nœud, afin d'éprouver la règle de mélange.
7. En tant que porteur du projet, je veux que la conversion, l'arrondi propagé et le joker s'appliquent dans cet ordre après la fonction, afin de reproduire A03 (arrondi 1 % avant le seuil).
8. En tant que porteur du projet, je veux que les seuils vivent dans des nœuds de seuil visibles, afin qu'ils apparaissent dans le graphe et l'explication.
9. En tant que porteur du projet, je veux qu'une grille sans nœud décisif (A01) se calcule normalement, afin de couvrir les cours formatifs.
10. En tant que porteur du projet, je veux que les nœuds de commentaire n'aient pas de case et ne comptent nulle part, afin de couvrir une partie en commentaires seuls.
11. En tant que porteur du projet, je veux qu'une même définition puisse porter plusieurs occurrences sous des codes différents, afin de couvrir les définitions partagées de A01.
12. En tant que porteur du projet, je veux qu'un nœud placé dans un regroupement sans y compter (Itinéraire, objectifs transversaux de A01) soit affiché à sa place et calculé ailleurs, afin d'éprouver placement ≠ contribution.
13. En tant que porteur du projet, je veux que F5 retienne la meilleure ou la dernière occurrence, avec un plafond sur les occurrences de rang ≥ 2, afin de couvrir les répétitions prévues.

### Saisie et navigation

14. En tant que formateur, je veux saisir ou effacer une note dans une case de la table, afin de voir les résultats recalculés aussitôt.
15. En tant que formateur, je veux valider une case par Entrée, Tab ou en la quittant, afin d'enchaîner les saisies au clavier.
16. En tant que formateur, je veux changer de participant, d'axe et de grille, afin de naviguer dans la qualification.
17. En tant que formateur, je veux que la table défile sans à-coups sur 200 participants et environ 100 colonnes, afin de parcourir une grande grille.
18. En tant que formateur, je veux qu'un nœud affiché à plusieurs endroits reste une seule case, afin qu'une modification se voie partout.
19. En tant que formateur, je veux voir qu'un résultat est « en calcul » pendant son recalcul, afin de ne pas lire une valeur périmée sans le savoir.
20. En tant que formateur, je veux distinguer visuellement une case vide, une case notée et une case non évaluée avec sa note conservée, afin de comprendre ce qui compte.

### Non-évaluations et exigences

21. En tant que formateur, je veux marquer une case « non évalué » et retirer cette marque, afin d'exclure une note du calcul sans la perdre.
22. En tant que formateur, je veux poser une dispense sur n'importe quel regroupement d'un participant, afin qu'elle s'hérite par ses feuilles.
23. En tant que formateur, je veux qu'une note couverte par une dispense redevienne active au retrait de la dispense, afin de ne jamais perdre de saisie.
24. En tant que porteur du projet, je veux basculer la portée de la dispense (1a : case ou contribution), afin de trancher le constat 1 de 19 en voyant.
25. En tant que porteur du projet, je veux basculer la définition des feuilles d'un regroupement (1b : placement, dépendances de calcul, axe de la dispense), afin de trancher 1b.
26. En tant que porteur du projet, je veux activer ou désactiver le minimum de notes actives par regroupement (1c), afin de trancher 1c.
27. En tant que porteur du projet, je veux qu'une dispense sans effet dans le réglage courant soit signalée dans l'onglet d'erreurs, afin de ne pas croire qu'elle agit.
28. En tant que formateur, je veux voir l'onglet d'erreurs d'un participant (obligatoires sans note active, minimums non atteints, quota de jokers dépassé), afin de savoir ce qui manque.
29. En tant que formateur, je veux voir l'avertissement « données provisoires » tant que les exigences de remplissage d'un participant sont insatisfaites, afin de ne pas prendre un résultat courant pour définitif.
30. En tant que porteur du projet, je veux basculer H4 (« toutes » ignore ou non les entrées sans résultat), afin de voir le cas de Félix « Réussi » malgré trois obligatoires vides.

### Joker

31. En tant que formateur, je veux appliquer un joker prévu par la grille sur un nœud autorisé, avec une justification, afin de modifier sa valeur effective.
32. En tant que formateur, je veux qu'un joker « ±n » agisse sur le barème de sortie du nœud, borné au barème, et qu'un joker « remonter au seuil » amène la valeur au seuil du nœud de seuil référencé, afin de reproduire A03 (Capucine) et G3 (Emma).
33. En tant que formateur, je veux voir « joker appliqué » sur le nœud modifié et « influencé par un joker » sur tous les résultats en aval, afin de suivre son effet jusqu'à la réussite.
34. En tant que formateur, je veux que le quota de jokers par participant soit respecté à la pose, afin de suivre les règles de la grille.
35. En tant que porteur du projet, je veux basculer H5a (joker sur un nœud sans résultat) et H5b (plusieurs jokers sur un nœud), afin de trancher H5.
36. En tant que porteur du projet, je veux qu'un joker devenu invalide après une bascule de H5 reste en place et produise une erreur « quota dépassé », afin que rien ne soit retiré en silence.
37. En tant que formateur, je veux retirer un joker, afin de libérer son quota.

### Explication et graphe

38. En tant que formateur, je veux ouvrir l'explication d'un résultat (phrase type de la fonction, entrées actives et ignorées, cause d'un « sans résultat », conversion, arrondi, joker), afin de comprendre la valeur.
39. En tant que formateur, je veux ouvrir le graphe de propagation d'un participant, afin de voir les dépendances et les résultats.
40. En tant que formateur, je veux voir dans le graphe les marques de joker, les deux sortes de chemins multiples et les feuilles couvertes par une dispense, afin de comprendre ce qui influence la réussite.
41. En tant que formateur, je veux que les chemins multiples soient signalés sans être bloqués, afin de suivre 18 §3.
42. En tant que porteur du projet, je veux identifier le nœud décisif et distinguer les nœuds indicatifs, afin de voir ce qui compte pour la réussite.

### Copie de grille

43. En tant que porteur du projet, je veux copier une grille vers une nouvelle structure (G3 V1 → V2), afin d'éprouver les correspondances stables.
44. En tant que porteur du projet, je veux que les cases soient reprises par `origine`, sauf si le barème change, afin de reprendre les notes correctement.
45. En tant que porteur du projet, je veux que les non-évaluations et les jokers soient repris, et que l'héritage des dispenses soit recalculé sur la nouvelle structure, afin que SR5, ajouté sous E3, soit couvert par la dispense de Chloé.
46. En tant que porteur du projet, je veux choisir à chaque copie le sort de la dispense d'un regroupement supprimé (reportée sur ses feuilles ou perdue), afin de comparer les deux en copiant deux fois.
47. En tant que porteur du projet, je veux lire le rapport de copie, qui liste exactement ce qui n'est pas repris tel quel, afin de contrôler la copie.
48. En tant que porteur du projet, je veux que l'originale et la copie restent utilisables indépendamment, afin qu'une saisie dans l'une ne change rien dans l'autre.
49. En tant que porteur du projet, je veux qu'une copie à l'identique donne les mêmes résultats et les mêmes marques, afin de garantir l'invariant de copie.

### Réglages et comparaison

50. En tant que porteur du projet, je veux régler les commutateurs du modèle dans un panneau, appliqués à chaud sans perdre mes saisies, afin d'essayer plusieurs règles sur les mêmes données.
51. En tant que porteur du projet, je veux que l'URL reproduise la configuration complète, afin de partager un lien vers un essai.
52. En tant que porteur du projet, je veux choisir une configuration de référence B et voir les nœuds dont la valeur ou les marques diffèrent (« A → B ») dans la table, le graphe et l'explication, afin de comparer deux règles sur un participant.
53. En tant que porteur du projet, je veux un mode « vérification » qui recalcule tout par l'oracle après chaque saisie et signale les écarts, afin de repérer un bug d'une variante pendant l'essai.
54. En tant que porteur du projet, je veux lancer un simulateur de saisies distantes (5 formateurs, une case toutes les 2 s chacun), afin d'éprouver les saisies venues de la synchronisation.
55. En tant que porteur du projet, je veux choisir le jeu de données, le préréglage de remplissage, la graine et le nombre de participants générés, afin de reproduire une situation.

### Mesure

56. En tant que script de mesure, je veux choisir la configuration du store, le jeu de données et désactiver la vérification par l'URL, afin de piloter une série sans intervention.
57. En tant que script de mesure, je veux des marques `performance.mark` à chaque étape de la chaîne de saisie, sur les deux threads, afin de décomposer la latence.
58. En tant que porteur du projet, je veux un rapport (JSON brut par run, tableau Markdown configurations × scénarios) avec la machine et la calibration, afin de juger les variantes.
59. En tant que porteur du projet, je veux des micro-benchmarks du noyau sous Node, afin de comparer les algorithmes hors rendu.
60. En tant que porteur du projet, je veux connaître le plus petit N du LRU qui passe les critères, avec la mémoire et le coût d'instanciation par participant, afin de dimensionner le cache.

## Décisions d'implémentation

### Cadre

- **Stack** : React, TypeScript, Bun, Vitest, Vite. Prototype dans `prototype/`, sur une branche dédiée, sans les gates du projet (lint strict, mutation, complexité).
- **Jetable** : on garde les conclusions et les algorithmes, pas le code.
- **Rien n'est persisté** : un rechargement perd les saisies de l'essai ([Exposition des commutateurs et réglages](https://github.com/fuzoh/azimut/issues/12#issuecomment-5994966786)).

### Format d'entrée des grilles

Source : [Structuration des données plates du prototype](https://github.com/fuzoh/azimut/issues/8#issuecomment-5994273948).

- Le schéma JSON de A01/A03 (`grille`, `baremes`, `noeuds`, `axes`, `exigences`, `jokers`, `decisif`) devient le **format commun**, étendu. Un fichier `<grille>-structure.json` par grille. G3 V1 et G3 V2 sont transcrites dans ce format, chacune dans un fichier de structure complet.
- **Types de nœuds** :
  - `donnees` : avec `bareme`, ou sans barème (nœud de commentaire, sans case dans le prototype) ;
  - `calcul` : `fonction`, `entrees` (nœud, poids), paramètres et pipeline ;
  - `regroupement` : sans résultat, seulement placé ; il peut porter une dispense.
- **Occurrence = nœud de données**, qui référence sa `definition` (libellé, barème, étiquettes). La définition ne porte aucune case et ne compte dans aucun calcul.
- **Placements** : `axes[].arbre` imbriqué `{noeud, enfants}`, avec `principal: true` sur exactement un axe. Un nœud peut figurer plusieurs fois dans un axe ou dans plusieurs axes. Une position n'a pas d'identité ; les feuilles par placement sont l'union des sous-arbres.
- **F5** : le rang d'une occurrence est l'ordre des `entrees`. « Dernière » désigne la dernière entrée qui a un résultat.
- **Jokers** : `{quota, autorises: [{id, noeud, action, libelle}]}`, avec `action` = `{type: "ajout", valeur}` ou `{type: "seuil", noeudSeuil}`. Quota par participant, pour toute la grille.
- **Exigences** : `obligatoire: true` sur le nœud de données ; `exigences.minimumParRegroupement: [{noeud, minActives}]` ; un minimum pour la grille entière s'écrit sur la racine de l'axe principal.
- **Copie** : la grille copiée porte `provenance: {grille}` ; chaque nœud, axe et définition de joker porte un `origine` facultatif (id dans la grille source). Un nœud sans `origine` est nouveau ; un nœud source sans descendant a été supprimé.
- **Participants types** : `<grille>-participants.json`, avec leurs sources dans la forme des collections et les résultats attendus `{nœud: valeur | null}`. Ils sont générés par les scripts de contrôle Python (`a01-a03-controle.py`, `g3-controle.py`), puis figés.
- Les JSON actuels de A01 et A03 précèdent l'extension (liste `obligatoires`, `minimum_par_regroupement`, jokers sans `id`) : ils sont migrés au format commun pendant la construction. Les champs nommés ci-dessus font foi ; seuls ceux qu'ils ne couvrent pas se fixent pendant la construction.

### Modèle de valeur

Source : [Grill barèmes et fonctions de calcul](https://github.com/fuzoh/azimut/issues/4).

- Un nœud transmet une **valeur exprimée sur son barème de sortie**, ou **sans résultat**. « Sans résultat » est un état unique ; sa cause (vide, non évalué, aucune contribution active, dénominateur nul) ne sert qu'à l'explication.
- Une fonction **ignore ses entrées sans résultat**. Sans aucune entrée active, elle rend « sans résultat ». Un poids 0 rend une contribution inactive.
- Toute fonction a un paramètre générique **minimum d'entrées actives**, en dessous duquel elle rend « sans résultat ». Il est distinct du minimum par regroupement de 1c, qui produit une erreur de remplissage.
- Les **marques** (joker appliqué, influencé, chemins multiples) et l'explication se calculent à côté de la valeur.
- **Pipeline d'un nœud de calcul** : `fonction → conversion → arrondi propagé → joker`.
  - **Conversion** : optionnelle, table affine par morceaux vers un barème cible (A03 : `1 → 0`, `3 → 100`, `5 → 150` en `% 0–150`). L'ordre de T6 s'exprime par la structure.
  - **Arrondi propagé** : un pas (1 ; 0,5 ; 0,1), demi vers le haut, transmis en aval. L'arrondi d'affichage est porté par le barème et ne change pas la valeur transmise.

### Barèmes

- Deux types : **numérique borné** (min, max, pas de saisie) et **ordinal à paliers nommés** (libellé, couleur, valeur associée). Le binaire OK/KO est un préréglage de l'ordinal (KO = 0, OK = 1). Les valeurs associées sont équidistantes (1…n) par défaut et configurables.
- Une **liste nommée de barèmes par grille**, référencée par les nœuds.
- **Normalisation** : distance entre extrêmes `(v − min) / (max − min)`, portée par le barème. Elle n'intervient que pour des entrées hétérogènes.
- **Règle de mélange**, vérifiée par `compile` : les nœuds de données qui entrent directement dans un même nœud de calcul partagent un barème ; les nœuds de calcul entrants peuvent venir de barèmes quelconques ; une appréciation globale (données) peut entrer à côté de critères de calcul.
- **Barème de sortie par défaut** d'une fonction numérique : le barème commun des entrées ; `0–100 %` pour des entrées hétérogènes ou binaires ; un numérique couvrant les valeurs associées pour des entrées ordinales.
- Les **colorations** sont des bandes de présentation, sans effet sur le calcul.

### Catalogue de fonctions

Chaque fonction a une phrase type d'explication.

| # | Fonction | Paramètres | Couvre |
| --- | --- | --- | --- |
| F1 | Moyenne pondérée (simple = poids 1) | poids par contribution | A01, A03, T2, T3, T5, T10, T14 |
| F2 | Seuil | s, ≥ ; sortie binaire | T2, T6, T10, T14 |
| F3 | Toutes | entrées binaires | nœud décisif, T14 |
| F4 | Au moins k | k ou « toutes », seuil optionnel sur les entrées | 18 §7, G3 |
| F5 | Meilleure / dernière occurrence | plafond sur les occurrences de rang ≥ 2 | 18 §4, T8 |
| F6 | Moyenne avec retrait des extrêmes | k hautes, k basses | T13 (+ conversion `0 → 0`, `10 → 105`) |
| F7 | Double compensation | pivot, facteur des écarts bas, nombre maximal d'insuffisantes | T9 |

Volontairement absents : la somme, min et max génériques, la décomposition de F7. A01 câble ses regroupements directement sur les indicateurs avec F1, ce qui donne le rapport de sommes sans fonction dédiée.

### Joker

- **±n** : sur la valeur finale du nœud autorisé, dans son barème de sortie, borné au barème. « +1 » sur un ordinal vaut un palier. A03 paramètre « ½ point » en +25 % et l'explication montre « ≈ ½ point ».
- **Remonter au seuil** : la définition référence un **nœud de seuil (F2) qui consomme directement** le nœud autorisé, ce que `compile` vérifie. La valeur effective vaut max(valeur, s).
- La marque « influencé par un joker » se calcule en continu avec la valeur (un bit par nœud).
- **H5a** : par défaut, un joker sur un nœud sans résultat est accepté, consomme le quota et s'applique dès qu'un résultat existe. **H5b** : par défaut, un seul joker par nœud ; en « cumulés », les ajouts s'additionnent, puis le seuil s'applique, borné au barème.
- H5 ne gouverne que la validation à la pose. En « un seul », seul le premier joker (par `id`) s'applique au calcul. Un joker devenu invalide après une bascule produit une erreur « quota dépassé », sans retrait.
- `auteur`, `date` et `justification` sont conservés et ignorés par le calcul ; le générateur remplit `auteur` et `date` avec des valeurs fixes.

### Non-évaluations, dispense et exigences

Sources : [Structuration des données plates du prototype](https://github.com/fuzoh/azimut/issues/8#issuecomment-5994273948), [Exposition des commutateurs et réglages](https://github.com/fuzoh/azimut/issues/12#issuecomment-5994966786).

- **État d'une case, dérivé** : non évalué si la case est couverte par une non-évaluation, directe ou héritée ; note si elle a une `valeur` et n'est pas couverte ; vide sinon. Une case marquée « non évalué » est une non-évaluation sur son propre nœud. Rien n'est jamais déplié en cases, pour que 1a et 1b restent commutables.
- **1a-A** (défaut) : la dispense agit sur la case, donc sur tous les calculs où la feuille compte.
- **1a-B** : le nœud dispensé est non évalué, donc sans résultat. Un nœud intermédiaire M du **cône de calcul** du nœud dispensé est calculé sans les feuilles couvertes par la dispense seulement si **tous ses consommateurs** sont dans ce cône. Sinon, M est calculé normalement et le chemin multiple est signalé. Aucun nœud n'a deux valeurs. Les exigences de remplissage restent celles de 1a-A.
- **1b** choisit les feuilles de 1a-A et de 1c : A, par placement (défaut) ; B, dépendances de calcul ; C, selon l'axe de la dispense (champ `axe` de la non-évaluation). Le cône de 1a-B est toujours celui du calcul.
- Une dispense sans effet (sur un `regroupement` en 1a-B, ou en 1b-B) est signalée par `compile` et affichée dans l'onglet d'erreurs.
- **Exigences** : un obligatoire exige une note active ; « non évalué » ne le satisfait pas, et une dispense ne lève pas les exigences de ses feuilles (18 §6). Le minimum de 1c compte les cases notées et non couvertes, sur les feuilles choisies par 1b.
- **Avertissement** : visible tant qu'une exigence de remplissage est insatisfaite.
- L'avertissement et les erreurs de remplissage se décomptent sur les cases et les non-évaluations, sans calcul complet des résultats.

### Noyau pur

Source : [Variantes techniques du moteur et abstraction de calcul](https://github.com/fuzoh/azimut/issues/7#issuecomment-5993728262).

Sans React, sans TanStack DB, sans navigateur (recalcul client et serveur, 18 §10). Toutes ses fonctions sont pures et s'exécutent à l'identique dans chaque thread :

- `compile(grille, commutateurs) → plan` : validation (barème commun, absence de cycle, nœud de seuil d'un joker qui doit être un F2 consommateur direct, scission ou fusion refusées), ordre topologique, feuilles de dispense selon 1b, chemins multiples (propriété de la structure), dispenses sans effet ;
- `evaluate(plan, sources du participant) → résultats` : valeur ou « sans résultat », plus les marques. C'est l'**oracle**, écrit en évaluation récursive naïve mémoïsée, sans partager le code d'une variante ;
- `explain(plan, sources, nœud)` : à la demande, en rejouant le noyau avec une trace ;
- `copier(structureV1, structureV2, sourcesV1, options) → {sourcesV2, rapport}` ;
- `generer(structures, graine, réglages) → sources` et `etendre(structure, facteur) → structure`.

### Plan compilé

`compile` produit des données sérialisables :

- les nœuds en ordre topologique ; les nœuds de données numérotés `0…D−1` à part ;
- les entrées en CSR : `inOffsets: Int32Array`, `inSources: Int32Array`, `inPoids: Float64Array` ;
- un code de fonction `Uint8Array` et ses paramètres ; le pipeline (conversion, arrondi, joker) référencé par index ;
- les barèmes : table rang → valeur associée, min et max pour la normalisation ;
- les feuilles de dispense par nœud, en CSR, selon 1b ;
- les marques statiques de chemins multiples, l'index du nœud décisif et les nœuds obligatoires ;
- les tables id ↔ index.

Chaque thread compile le même JSON ; le plan n'est pas envoyé d'un thread à l'autre.

### Sources dans TanStack DB

Sources : [Stockage local du prototype](https://github.com/fuzoh/azimut/issues/2), [Structuration des données plates du prototype](https://github.com/fuzoh/azimut/issues/8#issuecomment-5994273948).

- Collections **en mémoire** (`localOnlyCollectionOptions`), sans persistance, sur le thread principal. La structure n'y est jamais : c'est un objet immuable lu depuis le JSON.
- Collections, clés numériques en index denses, sans chaîne d'id dans les lignes :

| Collection | Ligne | Clé |
| --- | --- | --- |
| `participants` | index `p` → id, nom | `p` |
| `cases` | `{k, g, p, d, valeur}` | `k = (g × 1024 + p) × 65536 + d` |
| `nonEvaluations` | `{g, p, n, axe?}`, sur n'importe quel nœud | (g, p, n), même encodage |
| `jokers` | `{id, g, p, jokerDef, justification, auteur, date}` | `id` séquentiel |

- `g` désigne la grille dans la session (une copie en ajoute un), `p` le participant (commun aux grilles), `d` le nœud de données et `n` n'importe quel nœud. `decrireCle(k)` rend la forme lisible.
- Une case ordinale stocke le rang du palier.
- La vue écrit dans TanStack DB, jamais dans le store. Le store n'utilise `subscribeChanges` que pour invalider.
- Les commentaires sont hors prototype.

### Store de notes

Chaîne : saisie → écriture TanStack DB → `subscribeChanges` → recalcul paresseux → notification fine de la vue.

Interface commune à toutes les variantes, extensible selon l'expérimentation :

- `useResult(participant, nœud)` : valeur, marques, état « en calcul » ;
- `useFillStatus(participant)` : erreurs de remplissage et avertissement ;
- `explain(participant, nœud)` : promesse (l'explication peut venir du worker) ;
- `useCohort(nœud)` : la colonne entière, pour le tri et les synthèses.

Liaison React : `useSyncExternalStore` écrit à la main, **une souscription par cellule visible** d'une table virtualisée.

**Calcul paresseux** : on ne calcule que ce que l'interface lit ; une saisie marque l'aval comme périmé. Les signaux **alien-signals 3.2.1** sont instanciés par participant affiché et gardés dans un **LRU** de N participants (N mesuré, de l'ordre de 50). Les résultats sont un **cache dérivé en mémoire** par (g, p), invalidé par version, jamais dans une collection (18 §10).

### Worker

Source : [Structuration des données plates du prototype](https://github.com/fuzoh/azimut/issues/8#issuecomment-5994273948).

- **Copie compacte** des sources par grille : cases en `Float64Array(P × D)` (offset `p × D + d`, `NaN` = vide) ; non-évaluations en `Uint8Array(P × N)` (0 = aucune, 1 + index d'axe sinon) ; jokers en liste par (g, p).
- **Chargement initial** : `generer` s'exécute des deux côtés avec la même graine. Le thread principal remplit TanStack DB, le worker ses tableaux. Une somme de contrôle échangée au démarrage vérifie l'accord. Les participants types se chargent aussi des deux côtés.
- **Lots** : un lot par appel du callback `subscribeChanges`, sans regroupement supplémentaire : `{type: "lot", version, changements}`, avec un compteur de version croissant du thread principal. Changements : `["case", g, p, d, valeur]` (`NaN` pour vider), `["nonEval", g, p, n, axe | -1]`, `["nonEvalRetrait", g, p, n]`, `["joker", id, g, p, jokerDef]`, `["jokerRetrait", id]`. Le regroupement par frame s'ajoute comme réglage si les mesures montrent un coût de messages.
- **Origine distante** : le simulateur inscrit ses clés dans un `Set` avant d'écrire ; le relais marque ces changements `distante`.
- **Cache** par (g, p) : `Float64Array(N)` de valeurs (`NaN` = sans résultat), `Uint8Array(N)` de marques (bit 0 « joker appliqué », bit 1 « influencé »), une version. Dans la variante signaux, les signaux font office de cache et sont lus dans ce format pour l'envoi.
- **Intérêts** : le thread principal ne garde qu'un store mince `Map<k(g,p,n), {valeur, marques, version}>`, limité aux cellules souscrites. Il déclare ses intérêts (ajout, retrait, regroupés par frame). Le worker répond aux nouveaux intérêts et, après chaque lot, ne pousse que ceux qui ont changé. `useCohort` déclare une colonne (g, n, tous les p) ; `useFillStatus` est un intérêt par (g, p).
- **« En calcul »** : par participant. À l'envoi du lot `v`, les intérêts des (g, p) touchés passent « en calcul » jusqu'à `{calcule: g, p, version ≥ v}`.
- Avec le worker, il n'y a qu'un lieu de calcul : il reçoit tous les lots et possède toujours un état complet. La recompilation après une bascule du modèle et la copie de grille s'y exécutent aussi.

### Variantes à comparer

Source : [Variantes techniques du moteur et abstraction de calcul](https://github.com/fuzoh/azimut/issues/7#issuecomment-5993728262).

Configuration de **base** : signaux, calcul dans le worker, paresseux pur, saisie distante marquée périmée. On fait varier **un axe à la fois**, soit 5 configurations. Chaque axe est un réglage du store, choisi au chargement :

| Axe | Base | Variante |
| --- | --- | --- |
| Calcul | signaux alien-signals | DAG maison (tableaux typés, bits de version) |
| Lieu | worker (store de résultats mince sur le thread principal) | thread principal : le moteur lit les cases par clé dans la collection, sans copie compacte ni messages |
| Cohorte | paresseux pur | précalcul en arrière-plan ; ne se justifie que si un tri ou une synthèse dépasse 100 ms en paresseux |
| Saisie distante sur un participant en cache non affiché | marquée périmée | recalcul immédiat |

Une combinaison croisée ne s'ajoute que si deux axes semblent interagir. Le N du LRU est un réglage du store.

### Générateur

Source : [Générateur déterministe des données synthétiques](https://github.com/fuzoh/azimut/issues/9#issuecomment-5994534276).

- **Deux jeux**, choisis au démarrage :
  - **corpus** : A01, A03 et G3 (noyau + volume E4–E8) à leur taille réelle, avec leurs participants types ; nombre de participants générés en paramètre, 0 par défaut ;
  - **charge** : 3 instances de **G3 étendue** à environ 1500 nœuds de données (et environ 600 de calcul), 200 participants générés, sans participants types ; ≈ 900k cases possibles, vides comprises (participants × nœuds de données × grilles).
- A01 et A03 ne sont pas agrandies.
- **`etendre(structure, facteur)`** clone les regroupements de 1er niveau de l'axe principal, hors chaîne du nœud décisif, jusqu'à environ 1500 données (facteur ≈ 6). Les clones sont de nouvelles occurrences des mêmes définitions, avec leurs propres agrégats transversaux, et aboutissent à un nœud de synthèse indicatif. La structure étendue est en mémoire, exportable en JSON pour l'inspecter.
- **Notes** : un niveau par participant, une difficulté par nœud et un bruit, ramenés sur le pas du barème ; OK/KO suit une logistique sur ce niveau. Valeurs tirées en entiers sur le pas du barème.
- **Remplissage** en trois préréglages : début (20 %), milieu (55 %), fin (90 %). En fin de cours, environ 5 % d'exercices entiers non faits et environ 5 % de cases vides dispersées.
- **Non-évaluations** : 3 % des participants dispensés d'un regroupement, plus 0,5 % de cases « non évalué ». **Jokers** : 30 % des participants utilisent leur quota sur un nœud autorisé, là où la grille en prévoit.
- **PRNG sfc32**, un flux par (grille, participant) dérivé de la graine par hachage : un participant se génère indépendamment des autres.

### Copie de grille

Source : [Reprise des sources lors d'une copie de grille](https://github.com/fuzoh/azimut/issues/10#issuecomment-5994534964).

- `copier` s'exécute dans les deux threads, comme `generer` : le thread principal remplit TanStack DB avec le nouvel index `g`, le worker ses tableaux. V1 reste utilisable ; aucune saisie ne passe d'une grille à l'autre.
- La correspondance passe par `origine`, sur les nœuds, les axes et les définitions de joker.
- **Cases** : nœud conservé ou modifié (règle, poids, paramètre) → reprises telles quelles ; barème changé → non reprises, signalées ; supprimé → perdues ; nouveau → vides. Deux nœuds V2 de même `origine` (scission), ou une fusion, sont **refusés par `compile`**.
- **Non-évaluations** : sur un nœud conservé, copiées, et l'héritage se recalcule sur V2. Sur un regroupement supprimé, ou en 1b-C avec un axe supprimé : **reportées** en non-évaluations sur ses feuilles V1 encore présentes, ou **perdues**. Ce choix est un **paramètre de l'action « copier »**, reporté par défaut. Pour comparer, on copie deux fois.
- **Jokers** : définition conservée → copié, il suit la définition V2 ; définition supprimée ou nœud plus autorisé → perdu, quota libéré, signalé ; quota V2 inférieur aux jokers repris → tous gardés, erreur « quota dépassé ».
- Le **rapport de copie** liste exactement ce qui n'est pas repris tel quel.

### Réglages

Source : [Exposition des commutateurs et réglages](https://github.com/fuzoh/azimut/issues/12#issuecomment-5994966786).

**Commutateurs du modèle**, liste fermée, globale à la session (toutes les grilles), passée à `compile` :

| Réglage | Défaut | Variantes |
| --- | --- | --- |
| 1a portée de la dispense | A, sur la case | B, sur la contribution |
| 1b feuilles d'un regroupement | A, par placement | B, dépendances de calcul ; C, selon l'axe de la dispense |
| 1c minimum par regroupement | actif, si la structure le déclare | inactif |
| H4 « toutes » / « au moins k = toutes » | ignore les entrées sans résultat | strict : une entrée sans résultat rend le nœud sans résultat |
| H5a joker sur un nœud sans résultat | accepté | refusé à la pose |
| H5b plusieurs jokers sur un nœud | un seul | cumulés |
| F5 rang | selon la structure | forcer « dernière » |
| F5 plafond | selon la structure | forcer sans plafond |

**Classes de réglages** :

| Classe | Réglages | Bascule |
| --- | --- | --- |
| Modèle | commutateurs ci-dessus | à chaud : recompilation dans chaque thread, purge des caches et du LRU, sources conservées |
| Store | calcul, lieu, cohorte, saisie distante, N du LRU | au rechargement |
| Générateur | jeu, préréglage de remplissage, graine, nombre de participants générés | au rechargement |
| Session | mode « vérification », simulateur de saisies distantes | à chaud |

- Les **paramètres d'URL font foi** au chargement, pour toutes les classes. Leurs noms se fixent pendant la construction.
- Le **panneau** règle tout. Un réglage du modèle ou de la session s'applique à chaud et réécrit l'URL (`history.replaceState`). Un réglage du store ou du générateur recharge la page avec la nouvelle URL, après confirmation si des saisies existent.
- Défauts : jeu « corpus », vérification active, simulateur arrêté.
- **Comparaison** : une configuration de référence B (commutateurs du modèle seulement) ; l'oracle calcule le participant affiché sous le plan B ; la table, le graphe et l'explication signalent les nœuds qui diffèrent (« A → B »). Réservée au jeu « corpus », absente des mesures.
- **Mode « vérification »** : recalcul complet par l'oracle après chaque saisie, écarts signalés. Désactivé pendant les mesures.
- **Simulateur de saisies distantes** : 5 formateurs, une case toutes les 2 s chacun, sur des participants au hasard, écrites dans TanStack DB comme venant de la synchronisation.

### Visualisation

Visualisation brute, sans design applicatif :

- **Table** participants × nœuds de l'axe principal, virtualisée, avec édition de case (validation par Entrée, Tab ou sortie), changement de grille, d'axe et de participant. Elle distingue vide, note, non évalué (note conservée affichée) et « en calcul », et porte les marques.
- **Actions** sur un participant : marquer « non évalué », poser ou retirer une dispense sur un regroupement, appliquer ou retirer un joker avec justification.
- **Graphe de propagation** d'un participant : nœuds et arêtes, marques de joker, deux sortes de chemins multiples, feuilles couvertes par une dispense, nœud décisif, nœuds indicatifs.
- **Panneau d'explication** du nœud sélectionné.
- **Onglet d'erreurs** et avertissement « données provisoires » par participant.
- **Action « copier »** avec son paramètre et le rapport de copie.
- **Panneau de réglages**.

## Décisions de test

### Coutures

Trois coutures, de la plus haute à la plus basse utilité :

1. **Le noyau pur** : on donne une structure JSON et des sources, on compare les résultats. Toute la couverture du modèle passe par là.
2. **L'interface du store de notes**, sans React : chaque variante reçoit les mêmes lots que le navigateur et doit rendre les résultats de l'oracle.
3. **L'app dans le navigateur**, pilotée par Playwright : les mesures de performance seulement.

Un bon test vérifie un comportement observable à une couture (résultats, marques, erreurs, rapport), jamais un détail interne. Pas de test tautologique : les résultats attendus viennent d'une seconde source (scripts Python, calcul à la main dans 09).

Il n'y a pas de précédent dans le dépôt, qui ne contient pas encore de code applicatif. Les scripts de contrôle Python du corpus (`a01-a03-controle.py`, `g3-controle.py`) sont la seconde source des résultats attendus ; ils ne sont pas le moteur.

### Scénarios de couverture

Vitest, sous Bun :

- **Cas T** de 09 : T2, T3, T5, T6, T8, T9, T10, T13 et T14, chacun sur une petite structure au format commun.
- **Participants types** : A01 (Ana, Ben, Cléo, Dan), A03 (Alix, Basile, Capucine, Dorian, Élodie, Fanny) et G3 (Alice, Bruno, Chloé, David, Emma, Félix) en V1 à la copie, en V2 juste après la copie et en V2 final, plus le tableau des commutateurs de G3. L'oracle TypeScript doit égaler les résultats figés.
- **Erreurs de remplissage** : les colonnes « Erreurs de remplissage » de G3, « Obligatoires vides » de A01 et « Critères sans note » de A03.
- **`compile`** refuse un mélange de barèmes entre entrées de données, un cycle, un joker « seuil » dont le nœud de seuil n'est pas un F2 consommateur direct du nœud autorisé, une scission ou une fusion ; il signale une dispense sans effet.
- **Copie** :
  - copie à l'identique (tous les nœuds avec `origine`, sans changement) : mêmes résultats et mêmes marques sur tous les nœuds, testé par propriétés (fast-check) sur des structures et des sources aléatoires ;
  - G3 V1 → V2 : tables « V2 juste après la copie » et « V2 final » de [`g3-moniteur-camp.md`](corpus-prototype/g3-moniteur-camp.md) ;
  - nouvelle variante de G3 : dispense de E3 pour Chloé et joker d'Emma posés **avant** la copie (J3) ; résultats attendus en V2 ajoutés à `g3-controle.py` ;
  - indépendance : une écriture dans V2 ne change rien dans V1, et inversement ;
  - rapport : il contient exactement les éléments non repris tels quels, dont le report de dispense dans ses deux modes.
- **Générateur** : même graine → mêmes sources et même somme de contrôle ; un participant se génère à l'identique quel que soit l'ordre ; `etendre` produit environ 1500 données sans toucher la chaîne du nœud décisif.
- **Équivalence incrémental = oracle** : tests par propriétés (fast-check), séquences aléatoires de saisies, non-évaluations et jokers sur les 3 grilles ; après chaque pas, chaque variante du store (et le worker) est comparée à `evaluate`.
- **Marques et signalements** : marques de Capucine (A03) et d'Emma (G3), tableau « Chemins multiples attendus » de G3, aucun signalement dans A01, A03 en H4 strict (Fanny, Élodie).
- **Mode « vérification »** dans le navigateur, pendant l'essai.

### Scénarios de performance

Source : [Protocole de mesure des performances du prototype](https://github.com/fuzoh/azimut/issues/11#issuecomment-5994711770).

**Conditions** : Playwright pilote, ses chiffres font foi. Chrome en fenêtre visible, au premier plan, machine sans autre charge, sur secteur (`chrome-headless-shell` exclu). Bridage CPU ×4. Build de production (`vite build` + `vite preview`). Jeu « charge » au profil « fin », graine fixe, vérification désactivée. Une page neuve par run. Configurations alternées run par run. Les traces DevTools servent seulement au diagnostic, sur des runs à part.

**Calibration**, au début de chaque série (un échec invalide la série) :

1. Le même calcul dans le worker à ×1 puis à ×4 : ratio proche de 4, sinon bridage appliqué à part à la cible worker.
2. Une touche pressée par Playwright produit une entrée Event Timing.
3. Une seule fois : fenêtre visible contre nouveau headless, pour savoir si ce dernier suffit à une série sans surveillance.

**Critères**, jugés sur le pire run :

- zéro `longtask` > 50 ms sur le thread principal pendant les scénarios interactifs ;
- **INP** au sens de web-vitals < 100 ms (la molette n'y entre pas) ;
- **latence de recalcul** p95 < 100 ms, du `timeStamp` de l'événement qui valide la case à la peinture de la dernière cellule visible concernée, panneau d'explication compris s'il est ouvert.

Répétitions : un run de chauffe écarté, puis 5 runs par scénario et par configuration ; médiane et pire run rapportés.

**Latence décomposée** par `performance.mark`, ramenée à une même horloge par `performance.timeOrigin` : validation → écriture TanStack DB → `subscribeChanges` → envoi au worker (taille du lot) → calcul → retour → commit React → peinture.

| Scénario | Déroulé |
| --- | --- |
| Saisie rapide | 100 cases validées à 200 ms d'intervalle (valeur puis Tab) ; changement de participant toutes les 20 cases |
| Saisies distantes | 5 formateurs, une case toutes les 2 s chacun, en même temps que la saisie rapide, puis seules pendant 30 s |
| Changement de participant | 30 changements, moitié dans le LRU, moitié hors du LRU |
| Changement d'axe / de vue | 10 de chaque, en boucle sur les axes de G3 |
| Défilement | molette verticale puis horizontale, 5 s chacune, table 200 × ~100 colonnes ; jugé sur les tâches longues et les frames longues (LoAF) |
| Ouverture du graphe | 10 participants, pris dans le LRU et hors du LRU |

**Mesures sans critère**, rapportées avec un garde-fou : rien ne bloque le thread principal plus de 50 ms une fois l'app interactive, sinon c'est un constat bloquant.

- Démarrage, par phases : génération, extension de G3, `compile`, insertion `eager`, somme de contrôle, worker prêt, première table peinte.
- Écritures en série : 1000 mises à jour successives sur la collection pleine, navigateur bridé.
- Mémoire : `HeapProfiler.collectGarbage` puis `Runtime.getHeapUsage` par cible (page, worker), après le chargement, LRU plein, fin des scénarios.
- Copie de grille sur G3 étendue avec 200 participants, dans le worker en configuration de base ; si elle ne peut pas quitter le thread principal, c'est un constat.
- Bascule à chaud du modèle sur le jeu « charge » : recompilation, purge, première table repeinte. Elle fait exception au garde-fou : un dépassement est un constat non bloquant.

**N du LRU** : N ∈ {10, 50, 200} ; pour chaque N, mémoire et coût d'instanciation par participant. On retient le plus petit N avec lequel « Changement de participant » passe les critères.

**Micro-benchmarks du noyau** : `compile`, `evaluate` (un participant, une qualification entière), l'instanciation, `copier`, `etendre`, la génération, et signaux contre DAG maison hors rendu. Vitest bench sous Node, résultats en JSON ; tinybench directement si l'API expérimentale gêne. Non bridés, ils ne jugent pas les critères.

**Rapport** : JSON brut par run et tableau Markdown (configurations × scénarios, réussite ou échec), avec la machine et la calibration, dans `prototype/mesures/`. Les conclusions sont recopiées à la main dans `docs/analyse/21-constats-prototype.md`, qui survit au prototype.

## Hors périmètre

- UI applicative, serveur, auth, temps réel, multi-formateurs et verrous.
- Persistance des saisies : un rechargement les perd.
- Cycle de vie (finalisation, réouverture, archivage), dont le devenir des états lors d'une copie (18 §13.5), gabarits et publication, exports, MiData et participant écarté, saisie par groupe, matrices et graphiques composés, historique des modifications.
- Commentaires : les nœuds de commentaire existent dans la structure, sans case.
- Critères éliminatoires et veto, grille A02 complète, qualification réelle remplie, cas T1, T4, T7, T11, T12 et T15 de 09.
- Joker « imposer un échec » et statuts forcés, mesures non bornées ou à sens inversé, colorations détaillées, autres modes d'arrondi, définition produit des barèmes.
- Somme, min et max génériques, décomposition de F7.
- Cache de résultats partagé entre navigateurs via un serveur : le prototype mesure le recalcul complet pour que le produit en juge.
- Framework de rendu autre que React (Solid 2.0) : un goulot de rendu mesuré serait consigné comme constat.
- Persistance (SQLite/OPFS ou autre). Replis envisagés par la recherche si le thread principal bloque : PGlite en worker, ou worker maison hors cadre supporté ([Stockage local du prototype](https://github.com/fuzoh/azimut/issues/2)).

## Notes

- **Commutateurs et Notes de la carte** : la carte prévoyait 1a, 1b, 1c et H1–H5 commutables. H1, H2 et H3 ont été tranchés par le [Grill barèmes et fonctions de calcul](https://github.com/fuzoh/azimut/issues/4) (distance entre extrêmes, ±n sur le barème de sortie, joker qui référence un nœud de seuil). Ils ne sont donc pas commutables ; les commutateurs retenus sont ceux du tableau des réglages.
- **1a-B rouvre 18 §6** ([19](19-constats-maquette.md), constat 1) : ce n'est qu'une variante d'essai ; le défaut 1a-A suit 18.
- **Volume** : la carte visait 1500 nœuds de données et 500 de calcul par grille. G3 étendue en compte environ 600 de calcul, chiffre retenu par le générateur.
- **Mesures à refaire** : les chiffres de mémoire et de propagation de la [recherche sur les signaux](https://github.com/fuzoh/azimut/issues/3) sont des mesures Node indicatives ; le chargement `eager` de ~800k lignes est hors de la plage documentée par TanStack DB ([Stockage local du prototype](https://github.com/fuzoh/azimut/issues/2)). Le prototype les mesure.
- **Écart de G3 avec le grill** : M3 est « au moins 1 ≥ 3 » et non « toutes ≥ 3 », pour qu'un joker sur Animation puisse changer la réussite ([Description de la 3ᵉ grille du corpus](https://github.com/fuzoh/azimut/issues/5)).
- **Sources de la carte** : recherches sur les branches `research/stockage-local`, `research/signaux` et `research/signaux-solid2` ; corpus dans [`corpus-prototype/`](corpus-prototype/) (A01, A03, G3 et leurs scripts de contrôle).
- **Après le prototype** : 18 §13 prévoit de rediscuter le remplissage (§13.3), la navigation et les vues (§13.4) et l'architecture (§13.8) à la lumière de `21-constats-prototype.md`.
