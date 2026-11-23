# Structure de grille en document immuable, saisies en lignes

> **Proposition, à trancher par le mainteneur.** Ce brouillon n'est pas une décision. Il part de l'option la mieux étayée par l'essai de stockage (mesures et contre-expertise). Chaque point marqué « à trancher » renvoie à une question de la recherche [`stockage-grille.md`](../research/stockage-grille.md) (§8). Ticket : fuzoh/azimut#96.

Statut : proposé. Date : 2026-11-22.

## Contexte

18 §12 ne prescrit aucun schéma. 25 §6 demande de valider le versionnage des fonctions avant l'étape `domain`, parce qu'il conditionne le format de grille. `TODO.md` impose une table d'état courant et une table d'historique append-only, écrites dans la même transaction, avec Drizzle.

L'essai a comparé trois options sur un jeu commun (G3 V1 et V2, 40 participants, 17 642 écritures) : tout en tables (A), tout en documents (B) et hybride (C). Les trois passent les onze scénarios. Les écarts de performance sont sans enjeu à l'échelle d'un cours : toutes les latences sont sous 15 ms une fois le JIT coupé.

Ce qui les sépare :

- **B** réécrit le dossier entier à chaque note : environ 3 650 o de WAL par écriture, contre 930 o pour C [V]. Il sérialise deux formateurs sur un même participant, avec 2 à 3 fois moins de débit [V]. Il ne valide pas la valeur saisie [V], et son rejeu dépend du fuseau de la session [V]. La contre-expertise lui donne la gravité la plus forte.
- **A** éclate `format.ts` en 12 tables et 11 colonnes de paramètres (211 objets [V]). Chaque paramètre ou fonction ajouté touche le DDL, l'import et la reconstruction, alors que le catalogue des fonctions reste ouvert (18 §13.1). Il reconstruit la structure en environ 12 ms par lecture [V]. Son rejeu diffère de l'état après une copie (4 jokers) [V]. Il garde l'intégrité la plus forte sur la structure.
- **C** lit la structure telle quelle, sans reconstruction (S1 en 1,1 ms [V]). Il stocke 13,7 ko par version de structure [V], et son invariant « état = rejeu » tient encore après toutes les copies [V]. Il a 53 objets [V]. Il n'a pas de clé étrangère vers les nœuds [V].

## Décision proposée

1. **Structure.** Chaque version de grille est un document `jsonb` immuable, au format `Grille` de `format.ts`, haché par le serveur. Un trigger refuse sa modification et sa suppression. Un changement de calcul passe par une copie (25 §2.3). Le versionnage des fonctions vit dans le document (identifiant et version de fonction) ; *sa forme est à trancher*.
2. **Libellés.** Une correction de libellé après l'ouverture va dans une surcouche mutable et historisée, hors du document haché. Tout dossier affiche le libellé courant. *À trancher : libellé du jour de la finalisation pour une attestation.*
3. **Saisies.** Une ligne par clé, dans des tables d'état courant : `cases`, `commentaires`, `non_evaluations`, `jokers_poses`, `finalisations`. La clé de nœud est l'id de `format.ts`. La valeur stockée est le rang du palier pour un ordinal, la note pour un numérique ; *à trancher : rang ou valeur*. Un effacement garde la ligne, pour que la version soit égale au nombre d'écritures.
4. **Dispense.** Une seule ligne (nœud, axe), jamais dépliée. La couverture se calcule à la lecture (règle 1b-A). *À trancher : couverture d'un nœud ajouté, sort d'un nœud supprimé, axes.*
5. **Historique.** Une table unique, append-only, avec le `writeId` en clé primaire. Une ligne par écriture, version attribuée par le serveur, dans la même transaction que l'état. *À trancher : ancienne valeur stockée ou déduite ; écriture par le repository Drizzle ou par une fonction de la base.*
6. **Finalisation.** Elle retient la version de structure et son hachage. Le serveur refuse une écriture sur un dossier finalisé. *À trancher : ce que fige la finalisation et ce que reprend une copie.*
7. **Copie.** Correspondances et rapport persistés en tables. Les grilles sont indépendantes. L'historique source n'est pas recopié : chaque élément repris reçoit une ligne d'historique de copie. *À trancher.*
8. **Correctifs exigés par la contre-expertise**, quelle que soit la suite :
   - `set search_path` et `set jit = off` déclarés sur chaque fonction, pas sur la base ;
   - `TimeZone` sans effet sur les données stockées ;
   - rôle applicatif sans DML direct sur l'état et l'historique (27 §C-09), ou validation équivalente dans le repository ;
   - test permanent « état = rejeu » après chaque opération, copies comprises ;
   - test de restauration dans une base neuve.

## Conséquences

- Le moteur reçoit la grille sans reconstruction. Le format peut gagner un champ sans migration de tables.
- L'état courant reste en lignes : verrou par case, pas de réécriture de document, débit d'écriture du même ordre que A [V].
- **Intégrité déléguée** : aucune clé étrangère ne lie une case à un nœud du document. La validation passe par un index dérivé du document et par le seul chemin d'écriture autorisé. Sans rôles séparés, un `INSERT` direct sur un nœud inexistant passe [V].
- **Lecteur multi-format** : les documents immuables ne se migrent pas. Le noyau et les requêtes jsonb (copie, couverture, requêtes transverses) doivent lire tous les formats publiés. Un champ renommé rend un résultat vide sans erreur [D, démontré sur B]. Il faut un numéro de version du format dans chaque document et des tests sur chaque format publié.
- Les requêtes récursives sur jsonb sont mal estimées : sans `jit = off`, S9 passe de 5 ms à 367 ms [V].
- L'empreinte `sha256(structure::text)` dépend de la sérialisation jsonb de PostgreSQL [P]. Un hachage canonique calculé par le domaine serait plus stable ; à vérifier.
- Les fonctions plpgsql et les triggers ne se modélisent pas dans Drizzle : migrations SQL écrites à la main, ou historique écrit par le repository (non mesuré).
- L'anonymisation du texte libre dans l'historique append-only n'a pas de solution éprouvée. C'est commun aux trois options.

## Options écartées

- **A, tout en tables.** Intégrité de structure la plus forte, et des requêtes transverses en SQL simple. Écartée dans cette proposition pour le coût d'évolution du format (DDL, import et reconstruction à garder synchrones), le volume d'objets (211 contre 53) et la reconstruction à chaque lecture. Le défaut de rejeu après copie est un défaut de code, corrigeable ; il ne pèse pas dans ce choix. **Ce qui ferait revenir à A** : un catalogue de fonctions et un format jugés stables, ou une exigence de clés étrangères vers chaque nœud que les rôles séparés ne suffisent pas à remplacer.
- **B, tout en documents.** Lecture la plus rapide et état le plus compact. Écartée pour la réécriture du dossier à chaque note (WAL, place morte), la sérialisation par participant, l'absence de validation de la valeur et la dépendance au fuseau de session. Le risque de perte de mise à jour hors de la fonction d'écriture est propre à B.
- **Structure en document, saisies en document par dossier, sans historique séparé** : non essayée ; contraire à `TODO.md` (table d'historique append-only).
