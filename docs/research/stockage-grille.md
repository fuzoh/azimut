# Modèle de stockage d'une grille et de ses notes

Ticket : fuzoh/azimut#96. Essai du 2026-11-22. Statut : **faits et mesures, aucune décision**. Aucune option n'est recommandée ici.

Vocabulaire de [`GLOSSARY.md`](../../GLOSSARY.md) : **grille**, **nœud**, **occurrence**, **case**, **barème**, **palier**, **non évalué**, **dispense**. Contexte : [18](../analyse/18-decisions-definitives.md) (fait foi), [`TODO.md`](../TODO.md), [25](../analyse/25-perimetre-v1.md), [28](../analyse/28-choix-techniques.md), format `prototype/src/noyau/format.ts`.

Les fichiers de l'essai sont dans [`stockage-bench/`](stockage-bench/) : `jeu/` (générateur déterministe, protocole, sommes de contrôle ; les données se régénèrent), `option-A/`, `option-B/`, `option-C/` (un schéma chacun), `avocat/` (contre-expertise et rejeux). Les journaux d'exécution (`sorties/`) ne sont pas versionnés. Tout chiffre vient d'une exécution dont la commande figure en annexe. Marques : **[V]** exécuté, **[D]** déduit d'un calcul ou du code, **[P]** plausible, non démontré. Machine de bureau, 4 cœurs, PostgreSQL 16.15 jetable, Bun : les chiffres sont indicatifs, pas des cibles de production.

## Résumé

1. **Les trois options passent tous les scénarios du protocole.** Tout en tables (A), tout en documents (B) et hybride (C) chargent les 17 642 écritures du jeu, redonnent l'état attendu (`verifier.ts --ecritures` : IDENTIQUE pour V1 et V2) et les résultats du noyau pour les 40 participants, à 1e-9 près [V]. Le protocole ne départage donc pas les options sur la justesse.
2. **Les écarts de performance sont réels mais sans enjeu à l'échelle d'un cours.** Toutes les latences mesurées sont sous 15 ms une fois le JIT coupé [V]. Le débit d'écriture le plus faible (B, environ 1 600 transactions/s sur un même participant [V]) dépasse de trois ordres de grandeur le besoin du jeu (12 309 écritures en 6 jours [V]).
3. **Ce qui sépare les options est ailleurs : intégrité, évolution du format, exploitation.**
   - A éclate `format.ts` en 12 tables de structure et 11 colonnes de paramètres. Il a l'intégrité la plus forte sur la structure, mais chaque évolution du format touche le DDL, l'import et la reconstruction. Sa reconstruction coûte environ 12 ms par lecture [V]. Son invariant « état = rejeu de l'historique » est rompu après une copie (4 jokers d'écart) [V].
   - B réécrit tout le dossier à chaque note. Il sérialise deux formateurs sur un même participant, produit environ 3,6 ko de WAL par écriture [V] et ne valide pas la valeur saisie [V]. Son rejeu dépend du fuseau de la session [V].
   - C garde la structure en document immuable et les saisies en lignes. Il n'a aucune clé étrangère vers les nœuds [V], et il partage avec B l'exposition à une dérive du format dans les requêtes jsonb [D].
4. **Les trois options ont les mêmes angles morts.** Aucune ne survit à une restauration sans réglage de base : `search_path`, `jit`, `TimeZone` [V]. Aucune n'interdit le DML direct qui contourne l'historique [V]. Toutes écrivent l'historique en plpgsql, alors que `TODO.md` le confie au repository Drizzle. Aucune n'a éprouvé l'anonymisation.
5. **Le jeu ne discrimine pas plusieurs comportements.** Il ne contient aucune non-évaluation avec un axe, aucun retrait de joker, aucune réouverture, aucun barème numérique, aucun participant ajouté en cours, et aucune évolution du format. Plusieurs questions de comportement restent à trancher avant de choisir (section 8).

## 1. La question et pourquoi elle est structurelle

La question : **comment une grille de qualification et ses notes vivent-elles dans PostgreSQL ?** Elle couvre la structure (nœuds, axes, placements, barèmes, fonctions, jokers autorisés), les saisies (notes, commentaires, non-évaluations, jokers, finalisations), leur historique et les copies.

Elle est structurelle pour quatre raisons :

- **Elle n'a jamais été instruite.** 18 §12 range « les tables d'appartenances, de cases, d'historique et de jokers » parmi les « pistes à évaluer ». Il ajoute : « Le besoin d'historique ne prescrit pas un schéma de tables. Un stockage plus plat reste une piste, pas un choix arrêté. » 28 §14 liste « forme de stockage des saisies (rang ou valeur) » parmi les points non vérifiés.
- **Elle conditionne le format de grille.** 25 §6 exige, avant l'étape `domain` de la fondation, « la validation du versionnage des fonctions, qui conditionne le format de grille (28 CALCUL-4) ». CALCUL-4 nomme ce qui le ferait changer d'avis : « un format de grille qui change de forme ». Le stockage décide si le format est une colonne, un document ou douze tables.
- **Elle touche presque tout.** Écriture, rejeu (18 §10 : « tout résultat se recalcule »), copie (18 §9), finalisation, exports et requêtes transverses en dépendent.
- **Elle coûte cher à défaire.** Une fois des cours saisis, changer de forme de stockage demande une migration des données et de leur historique.

## 2. Ce que les documents imposent déjà

| Source | Contrainte |
| --- | --- |
| 18 §3 | Graphe sans cycle. Plusieurs axes de placement. Le placement est distinct du calcul. |
| 18 §4 | Les occurrences sont des nœuds distincts de même définition. Une case vaut participant × occurrence. |
| 18 §5 | Une note courante par case. Commentaires sur tout nœud. Historique des changements (qui, quoi, quand). |
| 18 §6 | Non évalué posé sur une case ou sur un regroupement (dispense). Les notes sont conservées. |
| 18 §7 | Barèmes numériques ou ordinaux. Les fonctions publiées sont immuables. |
| 18 §8 | Jokers. |
| 18 §9 | Copie complète avec les données. Original et copie sont indépendants. Correspondances stables entre éléments. |
| 18 §10 | Finalisation par participant, réouverture, archivage. Tout résultat se recalcule depuis les sources, la structure et les fonctions publiées. |
| 18 §12 | Rejouabilité intégrale et immuabilité des fonctions publiées contraignent la conception. Aucun schéma prescrit. |
| `TODO.md` | Serveur qui fait autorité. Dernier gagnant, plus un historique de chaque modification (auteur, date, ancienne et nouvelle valeur). Table d'état courant et table d'historique append-only, écrites par le repository dans la même transaction. Auteur tiré de l'utilisateur connecté. UUIDv7. Drizzle et postgres-js, migrations générées par `drizzle-kit generate`. Données maîtres côté serveur seulement. Calculs côté client. |
| 25 §2.3 | Les libellés restent corrigeables après l'ouverture de la saisie. Un changement de calcul passe par une copie. |
| 25 §6 | Versionnage des fonctions validé avant l'étape `domain`. |
| 28 §2, §6 | Contrats typés. Version attribuée par le serveur. `writeId` idempotent. |

## 3. Le jeu et le protocole

Un jeu commun a été généré pour les trois options (`jeu/`).

- **Génération déterministe** : `bun run generer.ts`, graine 20261122, environ 1,4 s [V]. Deux exécutions donnent le même `SHA256SUMS` [V]. Le générateur utilise le noyau du prototype comme oracle et échoue si les participants types du corpus ne retrouvent pas leurs attendus [V].
- **Grilles** : `g3-v1.json` et `g3-v2.json` du corpus, copiées octet pour octet. 345 nœuds chacune : 242 de données (229 à barème, 13 de commentaire seul), 88 de calcul, 15 regroupements. 4 axes. 2 barèmes ordinaux (OK/KO, niveau 1 à 5).
- **Cours fictif** : 6 jours, 4 formateurs, 4 groupes de 10, 40 participants. L'effectif de 40 est le haut de la fourchette de `FEATURES.md` (10 à 40).
- **Historique G3 V2** : 12 309 écritures (11 121 notes, 1 168 commentaires, 14 non-évaluations, 3 jokers, 3 finalisations) [V]. État final : 7 307 notes courantes sur 9 160 cases possibles [V].
- **Historique G3 V1** au jour 3 : 5 333 écritures [V].
- **Oracle** : `verifier.ts` compare un état exporté à l'attendu, au nombre d'écritures par case près avec `--ecritures`.

Le protocole compte onze scénarios : S0 chargement, S1 lecture pour le calcul, S2 écriture idempotente, S3 concurrence, S4 correction de libellé, S5 copie, S6 dossier finalisé, S7 dispense et nœud ajouté, S8 rejeu, S9 requêtes transverses, S10 taille. Les mesures se font avec un client Bun.sql sur une connexion, après 20 itérations de chauffe : médiane et p95.

## 4. Les trois options

### A. Tout en tables

- Structure relationnelle : `versions_grille`, `noeuds` (11 colonnes `p_*` pour les paramètres), `entrees`, `axes`, `placements` (liste d'adjacence), `baremes`, `paliers`, `jokers_autorises`, etc. 12 tables de structure.
- Clés étrangères composites (objet, version) : aucune référence ne traverse deux versions.
- Saisies en lignes : `cases`, `commentaires`, `non_evaluations`, `jokers_poses`, `finalisations`.
- Une table `historique` unique, append-only, `write_id` en clé primaire, avec `valeur_avant` et `texte_avant`.
- Un trigger refuse toute modification d'une version publiée, sauf le libellé, tracé dans `historique_structure`.
- `document_grille()` reconstruit `format.ts` à la lecture (54 + 26 lignes de SQL).
- Volume : 26 tables, 19 fonctions, 12 triggers, 211 objets, 1 084 lignes de SQL [V].

### B. Tout en documents

- `structure` : un document jsonb immuable par version, `format.ts` tel quel.
- `dossier` : un document jsonb par (grille, participant) avec notes, commentaires, non-évaluations, jokers et finalisation, et une version par clé.
- `historique` append-only en table.
- Une fonction serveur unique `b.ecrire` prend un verrou de ligne sur le dossier, puis fait `jsonb_set` et l'insertion d'historique.
- Cours et participants dans un document, sans clé étrangère.
- Volume : 6 tables, 8 fonctions, 3 triggers, 41 objets, 489 lignes de SQL [V].

### C. Hybride

- `grille_versions` : un document jsonb immuable par version, haché en sha256 par un trigger. Un index dérivé `cles` (nœuds, barèmes, axes, jokers) sert à valider les écritures.
- Saisies en lignes, avec l'id texte du nœud de `format.ts` comme clé, sans table de nœuds.
- `libelles` : une surcouche des libellés corrigés.
- Historique append-only, une fonction plpgsql par nature d'écriture.
- Copie : `correspondances` et `rapports_copie` en tables.
- Volume : 15 tables, 13 fonctions, 3 triggers, 53 objets, 640 lignes de SQL [V].

### Choix communs aux trois

Les trois agents sont arrivés aux mêmes choix sur plusieurs points, sans se concerter :

- la valeur stockée est le **rang du palier** pour un ordinal, la note pour un numérique, comme `CaseFigee` ;
- un effacement garde la ligne avec une valeur nulle, pour que la version soit égale au nombre d'écritures ;
- une dispense est **une seule ligne** (nœud, axe), jamais dépliée en feuilles ; sa couverture se calcule à la lecture ;
- une ligne d'historique par écriture ;
- le libellé se corrige en place, sans nouvelle version de structure ; tout dossier, finalisé ou non, affiche le libellé courant ;
- la copie ne recopie pas l'historique source : chaque élément repris reçoit une ligne d'historique « copie » en version 1 ;
- la copie ne reprend pas les finalisations ;
- un `writeId` rejoué avec le même contenu rend la version d'origine ; avec un autre contenu, il rend une erreur.

Ces convergences sont des choix d'implémentation, pas des décisions. Elles sont reprises en questions dans la section 8.

## 5. Scénarios et mesures

Les valeurs viennent des rapports de chaque option, sauf la dernière colonne (rejeu de l'avocat du diable sur les bases finales, avec un seul harnais pgbench côté serveur).

| Scénario | A — tables | B — documents | C — hybride | Rejeu contradictoire |
| --- | --- | --- | --- | --- |
| **S0** chargement, chemin d'écriture normal | 7,5 s, 0,43 ms/écriture ; IDENTIQUE [V] | 8,5 s, 0,43 ms/écriture ; IDENTIQUE [V]. En masse : 515 ms [V] | 7,4 s, 0,42 ms/écriture ; IDENTIQUE [V] | – |
| **S1 (a)** structure + sources, médiane / p95 | 12,7 / 13,7 ms [V] | 0,74 / 1,33 ms [V] | 1,14 / 1,80 ms [V] | serveur : 12,9 / 0,61 / 1,00 ms [V] |
| **S1 (b)** sources seules | 1,06 / 1,26 ms [V] | 0,14 / 0,19 ms [V] | 0,39 / 0,61 ms (sans commentaires) [V] | serveur : 0,99 / 0,17 / 0,32 ms [V] |
| Requêtes par lecture | 1 [V] | 1 [V] | 1 [V] | – |
| Reconstruction de `format.ts` | oui, ≈ 12 ms [V] | non | non | – |
| **S2** écriture idempotente | médiane 0,27 ms, p95 0,38 ms. Rejeu : même version. Autre contenu : erreur AZ422. Rollback : md5 identiques [V] | médiane 0,74 ms, p95 1,26 ms (un premier passage : 0,48 ms). Autre contenu : erreur AZ409 [V] | médiane 0,51 ms, p95 0,84 ms. Autre contenu : erreur ID_CONFLICT [V] | – |
| **S3** deux cases du même participant, 2 × 500 | 0 échec, versions sans trou, ≈ 4 100 tps [V] | 0 échec, versions sans trou, 1 291 à 1 342 tps (Bun) [V] | 0 échec, versions sans trou, 2 593 tps [V] | 3 660–5 070 / 1 550–1 690 / 3 400–3 770 tps [V] |
| S3, même case | dernier gagnant, 1 000 versions sans trou [V] | idem [V] | idem [V] | – |
| S3, témoin deux participants | – | 0,79 ms contre 1,43 ms sur un participant [V] | – | B sérialise le dossier [V] |
| WAL par écriture | – | 5 à 7 ko [V] | – | ≈ 770 o / ≈ 3 650 o / ≈ 930 o [V] |
| **S4** libellé corrigé après ouverture | en place, 2 lignes, 4,5 ms ; saisies inchangées ; finalisés identiques [V] | surcouche, 1 ligne, 0,83 ms ; correction **non historisée** [V] | surcouche, 2 lignes (dont historique), 3,0 ms [V] | – |
| **S5** copie V1 → V2 avec données, médiane de 5 | 107 ms ; 8 711 lignes [V] | 84 ms ; 40 dossiers + 3 585 lignes d'historique [V] | 129 ms ; 7 566 lignes [V] | – |
| S5, correspondance, rapport, état, indépendance | 344 appariés, 37 casePerdue, 5 commentaires perdus, IDENTIQUE, md5 indépendants [V] | idem [V] | idem [V] | – |
| **S6** dossier finalisé | E1 = E2, écriture refusée (AZ423) [V] | E1 = E2, écriture refusée (AZ423) [V] | E1 = E2, écriture refusée [V] | – |
| **S7** dispense et nœud ajouté | 1 ligne, couverture exacte avec sr5, 0,26 ms [V] | 1 entrée, couverture exacte [V] | 1 ligne, couverture exacte, 1,2 ms [V] | – |
| **S8** rejeu depuis l'historique, base chargée | 0/0, 35 ms [V] | 0/0, 48 ms [V] | 0/0, ≈ 45 ms [V] | – |
| S8 après copies (S5, S6) | non rejoué | 0/0, 104 ms [V] | non rejoué | **A : 4/4 écarts sur `jokers_poses`** ; B : 0/0 (176 ms) ; C : 0/0 [V] |
| **S9 (a)** OK/KO toutes grilles | 3,5 ms [V] | 7,6 ms (104 et 525 ms pour deux formes équivalentes) [V] | 3,6 ms [V] | 8,6 / 15,3 / 7,5 ms [V] |
| **S9 (b)** cases vides, un SQL récursif | 3,6 ms jit coupé ; ≈ 40 ms jit par défaut [V] | 9,3 et 11,5 ms ; ≈ 600 ms jit par défaut [V] | 8,6 et 2,7 ms ; ≈ 500 ms jit par défaut [V] | A en base : 35,5 ms (jit toujours actif) ; C restaurée : 366,7 ms [V] |
| Structure côté client pour S9 | non [V] | non [V] | non [V] | – |
| **S10** après S0 : par note courante | 231 o dans `cases` [D] | 27 o dans `dossier` en masse [D] ; ×32 de place morte en chemin normal [V] | 223 o dans `cases` [D] | – |
| S10 : par ligne d'historique | 267 o [D] | 284 o [D] | 278 o [D] | – |
| S10 : par version de structure | ≈ 790 ko [D] | 13,7 ko [V] | 13,7 ko [V] | – |
| S10 : schéma après S0 | 9,71 Mo [V] | 5,65 Mo [V] | 8,43 Mo [V] | – |
| Objets du schéma | 211 [V] | 41 [V] | 53 [V] | – |
| Dump puis restauration sans `--create` | – | – | – | A : écriture KO ; B : rejeu faux hors UTC ; C : écriture KO, S9 ×70 [V] |

Remarques :

- Les débits de S3 des rapports viennent de trois harnais différents. Seule la colonne de rejeu se compare.
- Les tailles après S5 ne se comparent pas entre options : les copies purgées pendant la mesure diffèrent en nombre et en méthode, et la place n'a pas été récupérée.
- S5 : la consigne annonçait 3 166 notes et 376 commentaires repris. Le fichier attendu en donne 3 167 et 416. Les trois options obtiennent 3 167 et 416. L'écart n'est pas expliqué.

## 6. Critiques de l'avocat du diable

Un agent contradictoire a relu les trois schémas et rejoué les mesures (`avocat/contre-expertise.md`). Il ne classe pas les options. Les écritures ont tourné sur des clones jetables, les tests d'intégrité en `begin … rollback`.

### A — tout en tables (gravité moyenne)

- **Invariant rompu après copie** : `copier_grille` tire `jokers_poses.id` et `historique.write_id` par deux appels distincts à `uuidv7()`. Le rejeu diffère de l'état sur 4 jokers dans chaque sens [V]. C'est un défaut de code, pas de modèle.
- Le JIT n'est coupé que dans deux fonctions. La base reste en `jit = on`, et S9 (b) prend 35,5 ms au lieu de 5,7 ms [V].
- Aucune clé étrangère sur `auteur_id`, ni sur `historique.participant_id` ou `historique.noeud_id`. `ecrire_note` accepte un auteur `00000000-…` [V].
- Un `UPDATE` direct de `cases.valeur` à 3,7 sur une case ordinale passe, sans CHECK et sans historique [V].
- 17 fonctions sur 19 n'ont pas de `set search_path`. Après `pg_restore`, `ecrire_note` échoue [V].
- Chaque nouveau paramètre ou nouvelle fonction (18 §13.1) touche le DDL, `importer_grille`, `document_grille` et les CHECK [D].
- 19 fonctions et 12 triggers demandent des migrations SQL écrites à la main avec Drizzle [D].
- Pas de retrait de joker. `texte_avant` duplique chaque commentaire dans l'historique [D].
- Un uuid par nœud et par version : suivre un nœud d'une grille à l'autre passe par `code` ou par les correspondances. Avec des gabarits, la structure est dupliquée à chaque instanciation [D].

### B — tout en documents (gravité forte)

- Le chargement à 515 ms ne mesure pas le chemin d'écriture : le chemin normal coûte 8,5 s et laisse 32 fois plus de place morte dans `dossier` [V].
- À harnais égal, le débit sur un même participant est 2 à 3 fois inférieur à A et C [V].
- `b.ecrire` ne valide pas la valeur. Elle accepte `{"valeur":"abc"}`, `{"valeur":7}` sur une case binaire et un auteur `00000000-…`. La faute de frappe `{"valuer":1}` devient un effacement silencieux, version + 1 [V].
- `to_jsonb(timestamptz)` écrit le décalage de la session. En session `Europe/Zurich`, l'EXCEPT de S8 trouve 12 dossiers différents [V]. `TimeZone=UTC` est perdu à la restauration [V].
- `b.feuilles_placement` sur un document où `axes` est renommé rend 0 feuille, sans erreur [V]. Les structures immuables ne se migrent pas, d'où un lecteur multi-format à garder pour toujours [D].
- Le dossier doit exister avant toute écriture, et aucune fonction ne le crée. S9 (b) joint `dossier` : un participant sans dossier disparaît du compte sans erreur [D].
- Participants sans clé étrangère. Clé de non-évaluation par concaténation `noeud|axe`. Pas de retrait de joker [D].
- Le contrat Drizzle se réduit à `$type<>()` sur du jsonb ; `jsonb_set` impose du SQL brut [D].
- Le texte libre est à trois endroits (document, charge d'historique, copies). Le réécrire passe par `session_replication_role = replica`, qui coupe aussi les clés étrangères [D].
- Tout `jsonb_set` fait hors de `b.ecrire` (migration, script) perd des écritures concurrentes [D].

### C — hybride (gravité moyenne)

- Aucune clé étrangère vers les nœuds. Un `INSERT` direct dans `cases` avec `noeud = 'noeud-inexistant'` et `valeur = 42` passe, sans historique. Un `UPDATE` à 3,7 passe aussi [V]. Il faudrait des rôles séparés (27 §C-09), absents de l'essai.
- Aucune des 13 fonctions n'a de `set search_path`. Après `pg_restore`, l'écriture échoue [V]. Sans `jit = off`, S9 (b) passe de 5,2 à 366,7 ms [V].
- Les débits de S3 étaient sous-estimés (harnais différent de A) [V].
- S1 (b) ne lit pas les commentaires, alors que B lit le dossier entier : léger avantage de scénario [D].
- Mêmes requêtes jsonb récursives que B, donc même dérive silencieuse si le format change. L'index `cles` est calculé une fois par trigger et ne suit pas une évolution de sa logique [D].
- `sha256(structure::text)` dépend de la sérialisation jsonb de PostgreSQL ; à surveiller lors d'une montée de version [P].
- Pas d'ancienne valeur dans l'historique : elle se lit sur la version − 1, ce qui casse si une purge partielle touche l'historique [D].
- Le `FOR UPDATE` sur `participants` sérialise la finalisation avec les écritures de ce participant dans toutes les grilles, et avec une mise à jour MiData de la ligne [D].
- Les fonctions plpgsql contredisent « le repository écrit l'historique ». C est la seule option qui le dit [D].

### Angles morts communs

1. **Restauration** : les trois options dépendent de réglages de base (`search_path`, `jit`, `TimeZone`) perdus par `pg_dump` sans `--create` ou par une base modèle [V].
2. **Invariant « état = rejeu »** vérifié à un seul instant par le protocole (S8 avant S5 et S6). Il devrait tourner après chaque scénario.
3. **DML direct** non interdit : un `UPDATE` de l'état contourne historique et validation dans les trois options [V]. Les essais tournent en superutilisateur.
4. **Anonymisation (nLPD, 27 §C-10)** : le texte libre est dans un historique append-only, dupliqué dans chaque copie. Seul un contournement des gardes permet de l'effacer. Aucun scénario ne l'éprouve.
5. **Jeu peu discriminant** : 27 non-évaluations, toutes à axe nul [V]. En S9 (b), « hors non-évaluation » égale « sans note ». Pas de retrait de joker, de report de non-évaluation, de `quotaDepasse`, de réouverture, de participant ajouté en cours, ni de barème numérique.
6. **Micro-mesures** : toutes sous 15 ms à l'échelle réelle. Le coût de maintenance pour un mainteneur bénévole travaillant avec des agents n'est pas mesuré.
7. **Évolution du modèle 18** non simulée : ni paramètre, ni fonction, ni axe ajoutés, ni gabarit partagé.
8. **Copies** : chaque copie réécrit environ 3 600 lignes d'historique et duplique les commentaires. Plusieurs grilles par cours multiplient le volume et les points d'anonymisation.
9. **Historique en plpgsql** dans les trois options, contre `TODO.md`.
10. **Tailles après S5** non comparables.

## 7. Ce qui reste non mesuré

- **PostgreSQL 18**, version visée par 28 : l'essai tourne sur la 16.15. Non vérifiés : `uuidv7()` natif, comportement du JIT, sérialisation jsonb.
- **Drizzle** : aucun schéma n'a été écrit en Drizzle. Ni le coût des migrations écrites à la main pour les fonctions et triggers, ni l'assertion de type contrat / `$inferSelect` (TODO) sur du jsonb.
- **Historique écrit par le repository** plutôt que par une fonction plpgsql : latence, nombre d'allers-retours, garantie de la même transaction.
- **Rôles séparés** (27 §C-09) : `REVOKE` du DML direct sur l'état et l'historique, et effet sur les trois options.
- **Restauration avec les correctifs connus** (`set search_path` et `set jit` sur chaque fonction, dump avec `--create`).
- **Évolution du format** : ajout d'un paramètre, d'une fonction ou d'un axe, avec le nombre de fichiers touchés et le temps de migration par option.
- **Anonymisation** complète d'un participant, et vérification que le rejeu et le recalcul tiennent ensuite.
- **Réouverture**, retrait de joker, report d'une non-évaluation sur un nœud supprimé, `quotaDepasse`, non-évaluation avec axe, barème numérique, participant ajouté en cours.
- **Plusieurs cours et plusieurs années** : le volume réel (MESURES-6, TODO) n'est toujours pas défini.
- **Gabarits** partagés entre cours et leur coût de structure.
- **Lecture côté client hors ligne** (stockage local) et synchronisation : hors du protocole.
- **Débit sous charge réelle** : une cinquantaine de formateurs simultanés (TODO), temps réel.

## 8. Questions de comportement à trancher

Questions, pas réponses. Elles s'adressent au porteur et au mainteneur. La plupart ont reçu une réponse implicite et identique dans les trois options ; ce n'est pas une décision.

1. **Libellé renommé après l'ouverture.** Une correction de libellé crée-t-elle une nouvelle version de structure, ou modifie-t-elle la version en place ? Un dossier finalisé affiche-t-il le libellé du jour de la finalisation, ou le libellé courant ? Une attestation imprimée doit-elle reproduire le texte exact d'alors ? La correction doit-elle être historisée (B ne le fait pas) ?
2. **Frontière entre libellé et calcul.** `definition` et `origine` sont-ils des identifiants, immuables, ou du texte corrigeable ? Une couleur de palier, un nom de palier, une coloration sont-ils corrigeables après l'ouverture ?
3. **Versionnage des fonctions (25 §6).** Une fonction publiée est-elle identifiée par un nom et un numéro de version dans la structure ? Que fait-on d'une grille ouverte quand une nouvelle version d'une fonction est publiée : rien, copie obligatoire, ou proposition de copie ?
4. **Ce que fige une finalisation.** Fige-t-elle seulement les sources du participant, ou aussi la version de structure et une empreinte ? Sur quoi porte l'empreinte : structure de calcul sans libellés, sources, résultats ? Une réouverture garde-t-elle l'ancienne empreinte dans l'historique ?
5. **Finalisation et copie.** Une copie reprend-elle les finalisations, les réouvertures, l'archivage (18 §13.5) ? Un participant finalisé dans l'original l'est-il dans la copie ?
6. **Où vit une dispense.** Une dispense est-elle une seule ligne sur le regroupement, dont la couverture se calcule à la lecture, ou une marque par case ? Un nœud ajouté sous le regroupement après la dispense (copie, sr5) est-il couvert ? Que devient une dispense dont le nœud est supprimé par une copie : perdue, ou reportée sur les feuilles comme le fait le noyau par défaut ?
7. **Dispense et axes.** Une dispense posée sur un regroupement d'un axe secondaire couvre-t-elle les feuilles sur cet axe seulement, ou sur tous les axes (règle 1b-A) ?
8. **Rang ou valeur.** Stocke-t-on le rang du palier ou la valeur numérique associée ? Que se passe-t-il si un palier change de valeur numérique, ou si un palier est inséré entre deux autres, avant ou après l'ouverture ? La copie reprend-elle une note quand la signature du barème change ?
9. **Historique de quoi.** Quelles natures sont historisées : notes, commentaires, non-évaluations, jokers, finalisations, réouvertures, libellés, structure ? L'historique garde-t-il l'ancienne valeur en colonne, ou la déduit-il de la version précédente ? Faut-il pouvoir restaurer une valeur depuis l'historique (TODO, « consultation de l'historique et restauration ») ?
10. **Historique et copie.** Une copie reprend-elle l'historique source, ou ouvre-t-elle son propre historique avec une ligne par élément repris ? Le nombre d'écritures par case doit-il survivre à une copie ?
11. **Historique et anonymisation.** Comment efface-t-on un nom dans un commentaire présent dans l'état, l'historique et les copies (27 §C-10) ? Le rejeu doit-il rester exact après anonymisation ?
12. **writeId rejoué.** Un `writeId` déjà vu avec un autre contenu est-il une erreur, ou la réponse de l'écriture d'origine ?
13. **Retrait de joker.** Un joker posé peut-il être retiré ? Est-ce une écriture historisée de plus ?
14. **Participant ajouté en cours.** Faut-il qu'il ait un dossier créé à l'inscription, ou ses cases naissent-elles à la première écriture ?
15. **Verrou du dossier.** Une finalisation doit-elle bloquer les écritures du participant dans toutes les grilles du cours, ou seulement dans la grille finalisée ?
16. **Qui écrit l'historique.** Le repository Drizzle (TODO) ou une fonction de la base ? Accepte-t-on des fonctions plpgsql et des triggers, avec des migrations écrites à la main ?

## Sources

- Dépôt : [`docs/analyse/18-decisions-definitives.md`](../analyse/18-decisions-definitives.md) §3 à §13 ; [`docs/TODO.md`](../TODO.md) ; [`docs/analyse/25-perimetre-v1.md`](../analyse/25-perimetre-v1.md) §2.3 et §6 ; [`docs/analyse/28-choix-techniques.md`](../analyse/28-choix-techniques.md) §2, §6, CALCUL-4, §14 ; [`docs/analyse/26-acquis-prototype.md`](../analyse/26-acquis-prototype.md) ; [`docs/analyse/27-plan-securite.md`](../analyse/27-plan-securite.md) §C-09 et §C-10 ; `prototype/src/noyau/format.ts` et le noyau (`compile`, `evaluate`, `copier`) ; corpus `docs/analyse/corpus-prototype/g3-v1-structure.json`, `g3-v2-structure.json`, `g3-participants.json`.
- Essai : `stockage-bench/jeu/protocole.md`, `stockage-bench/option-A/`, `stockage-bench/option-B/`, `stockage-bench/option-C/` (schémas, scripts, `sorties/`), `stockage-bench/avocat/contre-expertise.md` et `stockage-bench/avocat/rejeu/`.
- Aucune source externe : tous les chiffres viennent des exécutions ci-dessous.

## Annexe : commandes

Connexion : `psql -h /var/lib/postgresql/azimut-essai -p 55432 -U postgres -d <base>`. Bases : `stock_a`, `stock_b`, `stock_c`. Les commandes se lancent depuis le dossier de chaque option.

### Jeu

```sh
cd docs/research/stockage-bench/jeu && bun run generer.ts          # ≈ 1,4 s ; deux exécutions → même SHA256SUMS
sha256sum -c SHA256SUMS                         # OK
bun run verifier.ts <attendu.json> <obtenu.json> [--ecritures]
```

### Option A

```sh
cd docs/research/stockage-bench/option-A
./tout.sh                                       # séquence complète, base neuve, ≈ 29 s
./reinit.sh && bun run charger.ts               # S0
bun run exporter.ts "G3 V2" sorties/etat-s0-v2.json
bun run ../jeu/verifier.ts ../jeu/attendu/etat-g3-v2.json sorties/etat-s0-v2.json --ecritures
bun run s1.ts ; JIT=off bun run s1.ts           # S1
bun run s2.ts                                   # S2
sh s3.sh ; MEME=1 sh s3.sh                      # S3 (deux pgbench -n -c 1 -j 1 -t 500)
bun run s4.ts ; bun run s6.ts ; bun run s5.ts ; bun run s7.ts
bun run s8.ts                                   # S8
bun run s9.ts ; JIT=off bun run s9.ts           # S9
psql … -d stock_a -f s10.sql                    # S10 (sorties/s10-apres-s{0,3,5}.log)
```

### Option B

```sh
cd docs/research/stockage-bench/option-B
./jouer.sh                                      # séquence complète
./recharger.sh                                  # S0 en masse (5 fois)
BASE=stock_b_chemin bun run charger-chemin-normal.ts   # S0 chemin normal
bun run s1.ts > sorties/s1.json
bun run s2.ts > sorties/s2.json
bun run s3.ts cases ; bun run s3.ts meme-case ; bun run s3.ts deux-participants
bun run s4.ts ; bun run s5.ts ; bun run s6.ts ; bun run s7.ts
bun run s8.ts && bun run exporter.ts "G3 V2" sorties/s8-rejoue-v2.json --rejoue
bun run s9.ts ; JIT=on bun run s9.ts
psql … -d stock_b -f s10.sql
```

### Option C

```sh
cd docs/research/stockage-bench/option-C
bash tout.sh                                    # séquence complète, journal dans sorties/journal.txt
bun run charger.ts                              # S0
bun run s1.ts ; bun run s2.ts
bash s3.sh                                      # pgbench -n -c 2 -j 2 -t 500 -f s3-ecrire.sql, puis s3-meme-case.sql
bun run s4.ts ; bun run s5.ts ; bun run s6.ts   # S7 dans s5.ts (s7.sql)
bun run s8.ts                                   # s8.sql
bun run s9.ts                                   # s9.sql
psql … -d stock_c -f s10.sql
```

### Contre-expertise

```sh
cd docs/research/stockage-bench/avocat/rejeu
createdb … -T stock_x stock_x_av                # clone jetable pour les tests qui écrivent
pgbench -h /var/lib/postgresql/azimut-essai -p 55432 -U postgres -n -c 2 -j 2 -t 500 -f s3-<a|b|c>.sql <base>   # S3, 3 passes
pgbench … -n -f s1a-<a|b|c>.sql <base> ; pgbench … -n -f s1b-<a|b|c>.sql <base>                             # S1 côté serveur
pgbench … -n -f s9a-<a|b|c>.sql <base> ; pgbench … -n -f s9b-<a|c>.sql <base>                               # S9
pg_dump -Fc <base> | pg_restore -d <base_neuve>                                                              # restauration sans --create
```
