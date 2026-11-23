# Jeu et protocole communs de l'essai de stockage

Ce document sert d'entrée aux trois schémas à comparer. Il ne propose aucun schéma. Chaque schéma charge le même jeu, exécute les scénarios S1 à S10 et rapporte chaque chiffre avec la commande qui l'a produit, marqué [V] (exécuté) ou [D] (déduit). Machine de bureau : 4 cœurs (`nproc`), PostgreSQL 16.15 jetable. Les chiffres sont indicatifs et ne sont pas des cibles de production.

## 1. Le jeu

Régénération : `cd stockage/jeu && bun run generer.ts`. Le générateur est déterministe (graine 20261122, PRNG sfc32 et `flux` du prototype, UUIDv7 dérivés de la graine). Deux exécutions donnent le même `SHA256SUMS` [V]. Il importe en lecture le noyau du prototype (`compile`, `evaluate`, `copier`, `remplissage`), qui sert d'oracle pour les fichiers `attendu/`. Il échoue si les participants types ne retrouvent pas les attendus de `g3-participants.json` (V2-final, J3 V1, J3 V2-copie, marques de joker, couverture de Chloé).

| Fichier | Contenu |
| --- | --- |
| `grilles/g3-v1.json`, `grilles/g3-v2.json` | Les structures du corpus, copiées octet pour octet (format `format.ts`). 345 nœuds chacune : 242 de données (229 avec barème, 13 nœuds de commentaire seul), 88 de calcul, 15 regroupements. 4 axes. V2 diffère de V1 : `appreciation-e2` supprimé, `sr5` ajouté (sans `origine`, placé sous `reg:e3`), 5 nœuds modifiés. `origine` donne la correspondance. |
| `cours.json` | Le cours (6 jours, du 11 au 16 juillet 2026), 4 formateurs, 4 groupes de 10 avec un formateur référent, 40 participants, 2 grilles (`G3 V2` principale). |
| `evenements-g3-v2.ndjson` | **Source de vérité de G3 V2** : 12 309 écritures datées, triées par (`horodatage`, `writeId`). |
| `evenements-g3-v1.ndjson` | État de G3 V1 au moment de la copie (jour 3, 13:00 UTC) : 5 333 écritures. |
| `attendu/etat-g3-v{1,2}.json` | État courant attendu par participant : notes (valeur et nombre d'écritures), commentaires (texte et nombre d'écritures), notes effacées, non-évaluations, jokers, finalisation. |
| `attendu/resultats-g3-v{1,2}.ndjson` | Résultat de chaque nœud de calcul par participant (noyau du prototype), marques de joker, erreurs de remplissage. |
| `attendu/copie-v1-v2.json` | Copie V1 → V2 attendue : correspondance des nœuds, rapport, totaux, état de chaque participant dans la copie, attendu de S7. |
| `attendu/compteurs.json` | Comptes de contrôle (événements par nature, taux de remplissage, attendus de S9). |
| `verifier.ts` | `bun run verifier.ts <attendu.json> <obtenu.json> [--ecritures]` compare un état exporté par un schéma à l'état attendu. Il affiche `IDENTIQUE` (code 0) ou les différences (code 1). |

### Forme d'une écriture (NDJSON)

Champs communs : `writeId` (UUIDv7, unique), `horodatage` (ISO UTC, à la ms), `auteur` (id de formateur), `grille` (`"G3 V1"` ou `"G3 V2"`), `participant` (id), `nature`. Champs propres à chaque nature :

- `note` : `noeud`, `valeur`. La valeur est le rang du palier pour un barème ordinal (`ok-ko` : 0 = KO, 1 = OK ; `niveau-1-5` : 0 à 4), comme `CaseFigee`. `null` efface la note.
- `commentaire` : `noeud` (nœud de données, nœud de commentaire seul ou nœud de calcul), `texte`. `null` efface le commentaire.
- `nonEvaluation` : `noeud` (case ou regroupement), `axe` (null = axe principal), `active` (false = retrait).
- `joker` : `noeud`, `jokerDef`, `justification`.
- `finalisation` : `erreursAcceptees` (ids des exigences acceptées, vide ici).

L'état courant est la dernière écriture par (grille, participant, nœud, nature) dans l'ordre du fichier. Une non-évaluation est identifiée par (nœud, axe). Les jokers s'ajoutent.

### Volumes [V] (`attendu/compteurs.json`)

| | G3 V2 | G3 V1 (jour 3) |
| --- | --- | --- |
| Écritures `note` / `commentaire` / `nonEvaluation` / `joker` / `finalisation` | 11 121 / 1 168 / 14 / 3 / 3 | 4 822 / 509 / 1 / 1 / 0 |
| Cases touchées / écritures par case touchée | 7 365 / 1,51 | 3 229 / 1,49 |
| Notes courantes / cases possibles (229 × 40) | 7 307 / 9 160 | 3 204 / 9 160 |
| Commentaires courants (dont nœuds de calcul) | 968 (24) | 421 (18) |
| Non-évaluations courantes / jokers / dossiers finalisés | 12 / 3 / 3 | 1 / 1 / 0 |

- **Effectif : 40 participants.** C'est la borne haute de FEATURES (« Apprenants par cours : 10 à 40 »), retenue comme profil `reel` par 28 MESURES-6, qui applique le ×5 aux cours et à l'historique, pas à l'effectif d'un cours. Aucun chiffre de « 8 réels » n'a été trouvé dans les docs.
- **Participants types** : les 6 participants de `g3-participants.json` (Alice à Félix) sont repris tels quels. En V2, ce sont les sources de `V2-final`, donc creuses (15 à 23 cases), avec leurs attendus connus. En V1, ce sont celles de `copie.J3.V1`. Les 34 autres sont générés, avec 92,2 % des cases à note remplies. Le taux global est de 79,8 %, à cause des types creux.
- **Occurrences** : `e1#1/…` (jour 1) et `e1#2/…` (jour 4) sont des nœuds distincts de même `definition`. Une case vaut participant × nœud de données.
- **Non-évaluations V2** : 10 sur des cases (8 avec note conservée, 2 sur case vide), 2 dispenses de regroupement (Chloé sur `reg:e3`, Eloïse sur `reg:e5`, notes conservées dessous), 1 non-évaluation posée puis retirée (Joris, `e3`). Le rejeu doit la retirer.
- **Jokers** : Emma (`joker:animation`, type), Ivana (`joker:e2`), Maïwenn (`joker:animation`). Les deux derniers sont posés sur des participants dont le seuil échouait sans joker.
- **Historique** : 4 formateurs, dont le référent du groupe pour 75 % des écritures. Corrections : 0 (58 %), 1 (34 %) ou 2 (8 %) après la première saisie. 12 % des cases vides de participants générés ont eu une note puis un effacement (`valeur: null`).
- **Finalisés** : Alice, David et Cassien, le 16 juillet à 19:00 UTC.

### Simplification à connaître

G3 V1 et G3 V2 sont chargées comme deux grilles indépendantes du même cours. Les données de V2 ne sont pas le produit d'une copie de V1. S5 crée donc une troisième grille, « G3 V2 (copie S5) », à partir de V1.

## 2. Règles communes de mesure

- **Chargement (S0, préalable à tout scénario).** Créer une base propre (`create database stockage_<schema>`), charger les grilles, le cours et les deux fichiers d'événements. Le chargement doit produire l'historique avec les `writeId`, auteurs et horodatages d'origine, et l'état courant. Contrôle : exporter l'état au format de `attendu/etat-g3-v2.json` (et v1), puis `verifier.ts … --ecritures` doit afficher `IDENTIQUE`. Le nombre de lignes d'historique doit égaler le nombre d'écritures (ou s'en déduire, à justifier). Rapporter la durée du chargement et la méthode (chemin d'écriture normal ou chargement en masse).
- **Ordre.** S10, S1, S9 et S8 se lancent sur la base chargée, avant toute modification. S2, S3, S4, S6, puis S5 et S7 s'enchaînent ensuite. Un schéma peut aussi recharger une base propre avant chaque scénario, à condition de le dire.
- **Client.** Bun (`Bun.sql`, socket `/var/lib/postgresql/azimut-essai`, port 55432), une connexion sauf mention contraire. Le temps est mesuré du côté du client, de l'envoi à la fin du décodage. 20 itérations de chauffe sont exclues. Médiane et p95 au rang le plus proche : `trie[ceil(0,95 × n) − 1]`.
- **Les nœuds se désignent par leur id de `format.ts`.** Chaque schéma est libre de leur donner une identité physique (UUID, entier), mais doit les retrouver par cet id.
- **Résultat de chaque scénario** : la commande exacte, les chiffres [V], le critère tenu ou non, et ce que le schéma a dû faire de particulier (requête récursive, trigger, copie de lignes, etc.).

## 3. Scénarios

### S1 — Lire tout ce qu'il faut pour calculer un participant
- **Protocole.** Pour un participant de G3 V2, lire la structure de la grille, ses cases (notes), ses non-évaluations et ses jokers, puis construire `SourcesParticipant` et la `Grille` du noyau. Faire 200 lectures, en tournant 5 fois sur les 40 participants, après 20 lectures de chauffe. Mesurer deux variantes : (a) structure relue à chaque fois, (b) structure lue une fois et mise en cache par le client, avec seulement les sources par participant. Compter les requêtes par lecture.
- **Critère.** Pour les 40 participants, `evaluate(compile(grille), sources)` redonne `attendu/resultats-g3-v2.ndjson` à 1e-9 près (`null` ↔ sans résultat), avec les marques de joker. Rapporter la médiane et le p95 en ms pour (a) et (b), et le nombre de requêtes.

### S2 — Écrire une note avec son historique (version serveur, writeId idempotent)
- **Protocole.** Participant Romuald (`019e807a-ec7b-720a-b15f-731ba7609bb3`), G3 V2, case `sr5` (valeur courante 1, 1 écriture). (1) Lire la version v0. (2) Écrire `valeur = 0` avec `writeId = 019f7000-0000-7000-8000-000000000002` (UUIDv7 fixe), auteur Arnica, dans une transaction qui met à jour l'état courant et ajoute la ligne d'historique. (3) Rejouer exactement la même écriture. (4) Rejouer le même `writeId` avec `valeur = 1`. (5) Provoquer une erreur après l'insertion d'historique, dans la même transaction (par exemple un `raise` ou une contrainte violée) : rien ne doit rester. (6) Faire 200 écritures successives sur des cases différentes avec des `writeId` neufs, et mesurer la médiane et le p95.
- **Critère.** Après (2), version = v0 + 1, attribuée par le serveur, et exactement 1 ligne d'historique de plus, portant ce `writeId`. Après (3), état, version et nombre de lignes d'historique inchangés ; la réponse rend la même version. Après (4), rien ne change et le schéma dit s'il répond par une erreur ou par l'écriture d'origine. Après (5), aucune ligne n'a changé : compter les lignes et comparer le md5 du dump trié de l'état et de l'historique, avant et après.

### S3 — Deux connexions, deux cases différentes du même participant
- **Protocole.** Participant Victorine (`019e807a-ec7f-7798-9e58-3c88f712626f`), G3 V2, cases `gestion` (connexion 1) et `consignes-e2` (connexion 2). Chaque connexion fait 500 écritures, chacune dans sa propre transaction avec un `writeId` neuf. Deux processus Bun lancés ensemble, ou `pgbench -n -c 2 -j 2 -t 500 -f c1.sql -f c2.sql` avec un script par case. Variante facultative : les deux connexions sur la même case.
- **Critère.** Aucune erreur, aucun interblocage, aucun échec de sérialisation. Si le schéma prévoit des reprises, il les compte. Chaque case finit à v0 + 500. L'historique contient exactement 1 000 lignes de plus, une par écriture, chaque `writeId` une seule fois, avec des versions consécutives par case sans trou ni doublon. Rapporter la durée totale et les transactions par seconde. Variante sur la même case : la dernière écriture gagne, les versions vont de v0 + 1 à v0 + 1000 sans trou, et l'historique compte 1 000 lignes.
- **Note.** La consigne d'origine dit « deux lignes d'historique par écriture ». Ce protocole l'interprète comme une ligne d'historique par écriture, soit deux par paire d'écritures concurrentes. Un schéma qui écrit davantage doit le justifier.

### S4 — Corriger un libellé après l'ouverture de la saisie
- **Protocole.** G3 V2 est ouverte à la saisie (`ouvertureSaisie` dans `cours.json`). Alice, David et Cassien sont finalisés. Renommer le libellé de `gestion` en « Gestion du groupe pendant le jeu » (25 §2.3 : les libellés restent corrigeables, le calcul passe par une copie).
- **Critère.** (a) Le schéma dit ce qui se passe : modification en place, ou nouvelle version de structure. (b) Aucune ligne de saisie ni d'historique de saisie n'est modifiée (md5 du dump trié identique avant et après). (c) Les résultats recalculés des 3 dossiers finalisés sont identiques à `attendu/resultats-g3-v2.ndjson`. (d) Le schéma dit quel libellé ces dossiers affichent ensuite, et la règle doit être la même pour tous. (e) Rapporter le nombre de lignes écrites et la durée.

### S5 — Copie complète V1 → V2 avec toutes les données
- **Protocole.** À partir de G3 V1 chargée, créer une nouvelle grille « G3 V2 (copie S5) » avec la structure de `grilles/g3-v2.json` (correspondance par `origine`) et les données de tous les participants : notes, commentaires, non-évaluations, jokers. L'historique peut être repris ou non (le dire). Mesurer la médiane de 5 copies, chacune suivie d'une suppression ou d'un rechargement. Ensuite, écrire une note dans la copie (Alice, `e1#1/objectifs`, valeur 0) et une dans V1 (Bruno, `e1#1/objectifs`, valeur 0).
- **Critère.** (a) La table de correspondance des identifiants V1 → copie est persistée et interrogeable : 344 nœuds appariés, `appreciation-e2` sans correspondant, `sr5` ajouté. (b) Le rapport liste exactement les 37 `casePerdue` de `attendu/copie-v1-v2.json` (toutes sur `appreciation-e2`) et les 5 commentaires perdus. (c) L'état de la copie, exporté, égale `participants` de `attendu/copie-v1-v2.json` : 3 166 notes, 376 commentaires, 1 non-évaluation, 1 joker. (d) Indépendance : l'écriture dans la copie ne change pas le md5 de V1, et celle dans V1 ne change pas le md5 de la copie. G3 V2 principale reste intacte. (e) Rapporter la durée et le nombre de lignes écrites.

### S6 — Un dossier finalisé se relit à l'identique
- **Protocole.** Finaliser Ulysse (`019e807a-ec7e-721d-bcc5-2915a69eac80`, G3 V2, sans erreur de remplissage). Exporter son dossier (structure utilisée pour le calcul et sources) et en calculer l'empreinte E1. Puis : (1) renommer un libellé (S4) ; (2) copier G3 V2 à l'identique avec les données ; (3) écrire une note pour un autre participant ; (4) tenter une écriture sur Ulysse. Réexporter, et calculer E2.
- **Critère.** Le dossier se rattache à la même version de structure qu'à la finalisation. E1 = E2 sur la structure de calcul (ids, types, barèmes, fonctions, entrées, paramètres, placements, jokers autorisés) et sur les sources. L'écriture (4) est refusée par le serveur. Les résultats recalculés égalent `attendu/resultats-g3-v2.ndjson` pour Ulysse. Le traitement des libellés suit la règle déclarée en S4.

### S7 — Une dispense de regroupement couvre un nœud ajouté par copie
- **Protocole.** Après S5, dans la copie, lire les non-évaluations de Chloé et calculer les cases couvertes par sa dispense sur `reg:e3`. La couverture suit la règle 1b-A du prototype : nœuds de données à barème du sous-arbre de chaque placement du nœud, sur tous les axes.
- **Critère.** Il y a exactement 1 ligne de non-évaluation pour Chloé dans la copie, sur `reg:e3`, et aucune ligne par feuille. La couverture, en SQL ou côté client, rend exactement `consignes-e3, itineraire, sr1, sr2, sr3, sr4, sr5`, `sr5` compris alors que ce nœud n'existait pas en V1 (`attendu/copie-v1-v2.json` → `S7`). Les notes de Chloé sous `reg:e3` sont conservées dans la copie.

### S8 — Rejeu depuis l'historique seul
- **Protocole.** Sur la base chargée, reconstruire l'état courant de toutes les cases, de toutes les grilles, depuis les seules lignes d'historique : dernière écriture par clé, effacements et retraits compris. Comparer à l'état courant stocké.
- **Critère.** Égalité exacte, avec 0 ligne dans chaque sens d'un `EXCEPT` (ou équivalent) sur les valeurs, les textes, les non-évaluations, les jokers et les versions. L'état rejoué, exporté, donne `IDENTIQUE` avec `verifier.ts --ecritures` pour V1 et V2. La non-évaluation de Joris sur `e3` est absente. Rapporter la durée du rejeu.

### S9 — Requêtes transverses
- **Protocole.** Sur la base chargée, chacune des requêtes est lancée 50 fois après chauffe ; rapporter la médiane et le p95. (a) Toutes les notes courantes des nœuds de données à barème binaire (`ok-ko`), sur toutes les grilles : grille, participant, nœud, valeur. (b) Pour le Groupe B (`cours.json`, 10 membres), les cases sans note d'un objectif de G3 V2, selon deux règles : par calcul, les feuilles à barème atteintes en descendant les entrées de `comp:communication` ; par placement, les feuilles à barème du sous-arbre de `reg:e4` sur tous les axes. Donner aussi la variante qui exclut les cases couvertes par une non-évaluation, directe ou héritée.
- **Critère.** (a) 5 367 lignes, dont 3 210 OK dans G3 V2. (b) Par calcul : 35 feuilles, 88 cases sans note, 88 hors non-évaluation. Par placement : 41 feuilles, 107 cases sans note, 107 hors non-évaluation. Valeurs de `attendu/compteurs.json` → `S9`. Dire si la requête tient en un seul SQL (récursif ou non) ou si elle demande la structure côté client.

### S10 — Taille sur disque et nombre d'objets
- **Protocole.** Après le chargement (S0), puis après S3 et après S5 : `vacuum analyze`, puis `select relname, pg_total_relation_size(oid), pg_relation_size(oid), pg_indexes_size(oid) from pg_class where relnamespace = '<schema>'::regnamespace and relkind = 'r'`, et `pg_database_size(current_database())`. Compter les objets du schéma : tables, index, séquences, vues, fonctions, triggers, types, contraintes (`pg_class` par `relkind`, `pg_proc`, `pg_trigger`, `pg_constraint`, `pg_type` du schéma).
- **Critère.** Rapporter un tableau par table (lignes, tables + index) et les totaux, avec les commandes. Pour comparer, rapporter aussi les octets par note courante et par ligne d'historique [D]. Aucun seuil : la comparaison se fait entre schémas.

## 4. Empreintes du jeu (SHA256SUMS)

Le fichier `SHA256SUMS` du dossier fait foi. Régénérer, puis lancer `sha256sum -c SHA256SUMS` pour vérifier qu'on mesure bien le même jeu.
