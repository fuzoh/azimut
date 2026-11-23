# Contre-expertise des trois options de stockage

Rôle : avocat du diable. Ce document ne classe pas les options et n'en recommande aucune.
Marques : [V] rejoué ici, [D] déduit du code ou d'un calcul, [P] plausible, non démontré.

## Conditions du rejeu

- Serveur PostgreSQL 16.15 partagé, 4 cœurs, état des bases **après** tous les scénarios des trois agents : plus de données qu'au chargement (copies S5 et S6, écritures S2 et S3). Les valeurs absolues sont donc plus hautes que celles des rapports. Seul l'ordre de grandeur compte.
- Les tests qui écrivent ont tourné sur des clones (`create database stock_x_av template stock_x`), supprimés ensuite. Les tests d'intégrité ont tourné en `begin … rollback`.
- Scripts du rejeu : `docs/research/stockage-bench/avocat/rejeu/` (fichiers pgbench `s1*`, `s3-*`, `s9*`).
- Pour comparer avec **un seul harnais**, S1, S3 et S9 ont été rejoués avec `pgbench -n` sur les trois bases. pgbench ne mesure que le serveur, sans décodage côté client.

## Rejeu des mesures

| Mesure | A | B | C | Commentaire |
|---|---|---|---|---|
| S1 (a), structure + sources, serveur [V] | 12,9 ms | 0,61 ms | 1,00 ms | Conforme aux rapports. |
| S1 (b), sources seules, serveur [V] | 0,99 ms | 0,17 ms | 0,32 ms | Conforme. |
| S3, 2 cases du même participant, `pgbench -c 2 -j 2 -t 500`, 3 passes [V] | 3 660 à 5 070 tps | 1 550 à 1 690 tps | 3 400 à 3 770 tps | B et C ont **sous-estimé** leurs chiffres dans les rapports (B : 1 291 à 1 342 tps avec des processus Bun ; C : 2 593 tps). Les harnais n'étaient pas les mêmes. |
| S3, cohérence [V] | version = nombre de lignes d'historique = nombre de versions distinctes | idem | idem | 0 échec dans les trois cas. |
| WAL par écriture, 300 écritures [V] | ≈ 770 o | ≈ 3 650 o | ≈ 930 o | B réécrit le document. Le serveur est partagé, donc c'est un ordre de grandeur. |
| S8, rejeu et EXCEPT après tous les scénarios [V] | **jokers_poses : 4 / 4 écarts** | 0 / 0 (176 ms) | 0 / 0 | Voir A, défaut 1. |
| S9 (a), toutes les grilles, 4 grilles en base [V] | 8,6 ms | 15,3 ms | 7,5 ms | Les comptes par grille sont cohérents entre bases ; les différences viennent de S2 et S3. |
| S9 (b), A, JIT par défaut / coupé [V] | 35,5 / 5,7 ms | – | – | La base `stock_a` a **toujours `jit = on`**. |
| S9 (b) placement, C, base d'origine / base restaurée [V] | – | – | 5,2 / **366,7 ms** | Voir l'angle mort « restauration ». |
| Dump puis restauration sans `--create` [V] | **écriture KO** | lecture OK, `jit` revenu à `on` | **écriture KO** | Voir l'angle mort « restauration ». |

## Option A, tout en tables

### Attaques sur les mesures

1. **S8 n'est vrai qu'avant la copie.** Le protocole place S8 avant S5 et S6, et A ne l'a pas rejoué ensuite. Après les copies, l'EXCEPT sur `jokers_poses` donne 4 lignes dans chaque sens [V]. La cause : dans `copier_grille`, `jokers_poses.id` et `historique.write_id` sont tirés par deux appels distincts à `uuidv7()`. Or le schéma déclare « jokers_poses.id = writeId de la pose ». L'invariant « état = rejeu de l'historique », présenté comme une force, est donc rompu dans chaque grille copiée.
2. **Le JIT est résolu dans le rapport, pas dans la base.** A écrit « il faut `jit = off` au niveau base », mais `stock_a` est toujours en `jit = on` [V]. Seules `importer_grille` et `copier_grille` portent `set jit = off`. En l'état, S9 (b) coûte 35 ms [V] et pas 3,6 ms.
3. S1 (a) à 12,7 ms est reproduit (12,9 ms [V]). Ce n'est pas un problème à l'échelle d'un cours, mais la mise en cache de la structure côté serveur devient obligatoire, et avec elle son invalidation (correction de libellé, S4).
4. Le débit de S3 (4 100 tps) est reproduit (3 660 à 5 070 tps [V]). Il ne prouve pas grand-chose : la charge réelle tourne autour de 12 309 écritures en 6 jours.

### Coûts cachés

- **Évolutions du format.** Le format est éclaté en 12 tables et 11 colonnes `p_*`. Le catalogue de fonctions est encore ouvert (18 §13.1). Chaque paramètre ou fonction ajouté touche alors 4 endroits qui doivent rester synchrones : DDL, `importer_grille`, `document_grille` (54 + 26 lignes) et les CHECK. Une divergence entre import et reconstruction ne se voit qu'avec la comparaison canonique de S1, qu'il faudra garder en test permanent.
- **Plusieurs grilles, gabarits.** Les nœuds ont un uuid par version. Une requête qui suit « le même nœud » d'une grille à l'autre passe donc par `code` ou par `correspondances`. Avec des gabarits partagés entre cours, la structure (≈ 790 ko par version [rapport]) est dupliquée à chaque instanciation.
- **Drizzle.** 26 tables sont modélisables, mais 19 fonctions plpgsql et 12 triggers ne le sont pas : il faudra des migrations SQL manuelles (`drizzle-kit generate --custom`). TODO.md demande que le repository écrive l'historique, alors qu'ici c'est `ecrire_note` qui l'écrit. A ne le signale pas.
- **Restauration.** 17 fonctions sur 19 n'ont pas de `set search_path` et comptent sur un réglage de base (`search_path=azimut, public`). Après un `pg_restore` dans une base neuve, `ecrire_note` échoue avec `type "historique" does not exist` [V].

### Risques d'incohérence

- `cases.auteur_id`, `historique.auteur_id`, `historique.participant_id` et `historique.noeud_id` n'ont **aucune clé étrangère** [V]. `ecrire_note` accepte un auteur `00000000-…` [V].
- Un `UPDATE cases set valeur = 3.7` direct sur une case ordinale passe [V] : pas de CHECK de rang au niveau de la table, et aucune ligne d'historique. L'intégrité « forte » couvre la structure, pas les valeurs saisies ni la traçabilité.
- Pas de retrait de joker : aucune colonne `actif`, aucune fonction [D]. Le jeu ne l'exerce pas.
- `texte_avant` et `valeur_avant` dupliquent chaque ancien commentaire dans l'historique append-only. Pour l'anonymisation, cela fait deux copies du texte libre à effacer par la purge.

## Option B, tout en documents

### Attaques sur les mesures

1. **S0 « 515 ms » ne mesure pas le chemin d'écriture.** Le chargement en masse passe par la vue de rejeu. Le chemin normal coûte 8,5 s, comme A et C, et laisse 32 fois plus de place morte dans `dossier` [rapport]. Les tailles de S10 « après S0 » viennent du chargement en masse et sont donc trop favorables d'un facteur 32 sur `dossier`.
2. **Le débit de S3 était sous-estimé** par le harnais Bun : 1 550 à 1 690 tps avec pgbench [V], contre 1 291 à 1 342 tps. À harnais égal, la sérialisation par dossier reste visible : 2 à 3 fois moins que A et C [V].
3. S1 (b) à 0,14 ms est reproduit (0,17 ms [V]), mais il lit le document entier, commentaires compris. C ne lit pas les commentaires. La comparaison est équitable en ordre de grandeur, et sans enjeu à cette échelle.
4. S9 (a) : trois écritures équivalentes donnent 104, 525 et 7,6 ms dans le rapport. Rejouée sur la base finale, la version retenue prend 15,3 ms, soit 2 fois A et C [V]. La performance dépend de la forme exacte de la requête, ce qui pèse lourd quand une partie du code est écrite par des agents.

### Coûts cachés

- **Aucune validation de la valeur** [V], tests en rollback : `b.ecrire` accepte `{"valeur":"abc"}`, `{"valeur":7}` sur une case binaire et un auteur `00000000-…`. Une faute de frappe `{"valuer":1}` est enregistrée comme un **effacement silencieux** (v = null, version + 1). Le contrôle repose entièrement sur le serveur applicatif.
- **Le dossier doit exister avant toute écriture** (`AZ404 dossier inconnu`). Aucune fonction ne le crée hors copie et chargement [D]. Un participant inscrit en cours de route doit être créé par l'application. La requête S9 (b) fait `join b.dossier` : un participant sans dossier disparaît du compte des cases vides **sans erreur** [D].
- **Fuseau horaire.** `to_jsonb(timestamptz)` écrit le décalage de la session dans les documents. Dans une session `Europe/Zurich`, l'EXCEPT de S8 trouve **12 dossiers différents** [V]. Une écriture faite hors UTC stocke `+01:00`. L'égalité du rejeu dépend d'un réglage de base (`TimeZone=UTC`), et ce réglage est perdu à la restauration [V].
- **Dérive du format, en silence.** `b.feuilles_placement` sur un document où `axes` est renommé rend 0 feuille, sans erreur [V]. Les documents de structure sont immuables, donc on ne peut pas les migrer. Toute évolution de format.ts oblige le SQL (copie, S7, S9) et le noyau à lire **tous les formats passés pour toujours**.
- **Évolutions du modèle.** Clé de non-évaluation construite par concaténation `noeud|axe` : un identifiant contenant `|` provoquerait une collision [D]. Pas de retrait de joker (seule la pose est ajoutée) [D]. Les participants vivent dans `cours.doc` : aucune FK, donc un participant retiré laisse des dossiers et un historique orphelins sans erreur [D].
- **Drizzle.** Les colonnes `jsonb` se typent avec `$type<>()`, sans validation à l'exécution. `jsonb_set` et `jsonb_each` imposent du `sql` brut. Le « contrat typé » se réduit à une assertion de type sur un blob.
- **Anonymisation.** Le texte des commentaires est à trois endroits : `dossier.doc`, `historique.charge` et les dossiers et historiques des copies. Réécrire `charge` suppose de contourner le trigger append-only avec `session_replication_role = replica`, ce qui coupe **aussi les FK** de toute la session.
- **Exploitation.** Un autovacuum soutenu est nécessaire (×32 de place morte [rapport], ≈ 3,6 ko de WAL par écriture [V]). Ce n'est pas bloquant pour 12 000 écritures, mais cela pèse sur les sauvegardes incrémentales et l'archivage WAL.

### Risque de perte

- Le verrou par dossier évite les pertes de mise à jour **dans `b.ecrire`**. Tout code qui ferait `jsonb_set` hors de cette fonction (migration, script d'agent, correction manuelle) perdrait des écritures concurrentes. A et C n'ont pas ce risque, parce qu'ils verrouillent la ligne d'une case.

## Option C, hybride

### Attaques sur les mesures

1. Le débit de S3 était sous-estimé : 3 400 à 3 770 tps rejoués [V], contre 2 593. Le rapport utilisait `-c 2` dans un seul pgbench, A deux pgbench `-c 1`.
2. S1 (b) mesure des sources **sans commentaires**, alors que B lit le dossier entier. C'est léger, mais le scénario était un peu plus favorable à C.
3. S9 (b) : 2,7 ms pour le placement, 8,6 ms pour le calcul. Le rejeu donne 5,2 ms sur la base finale [V]. Dans une base restaurée sans le réglage `jit = off` : **366,7 ms** [V].
4. S8 rejoué après tous les scénarios : 0 écart sur cases, commentaires, jokers et non-évaluations [V]. C'est l'option qui tient le mieux cet invariant au-delà de ce qu'exige le protocole.

### Coûts cachés

- **Aucune FK vers les nœuds.** Un `insert into cases (…, noeud = 'noeud-inexistant', valeur = 42)` direct passe, sans ligne d'historique [V]. Un `update cases set valeur = 3.7` direct passe aussi [V]. L'intégrité repose sur le fait que seules les fonctions écrivent, ce qui suppose des rôles séparés que l'essai n'a pas mis en place (superutilisateur).
- **Restauration.** Aucune des 13 fonctions n'a de `set search_path` : après `pg_restore`, les écritures échouent [V], et sans `jit = off`, S9 est 70 fois plus lent [V].
- **Dérive du format.** C a la même exposition que B : les requêtes jsonb récursives (`arbre`, `enfants`, `entrees`) rendent un ensemble vide si le format change [D, démontré sur B]. L'index dérivé `cles` est calculé par un trigger, une seule fois à l'insertion. Si la logique du trigger évolue, les anciennes versions gardent un `cles` d'ancien format. Les documents sont immuables et hachés, donc tout lecteur doit rester multi-format.
- **Empreinte.** `sha256(structure::text)` dépend de la sérialisation jsonb de PostgreSQL. Le trigger ne rejoue pas à la restauration, ce qui conserve la valeur stockée. En revanche, un recalcul de contrôle après une montée de version majeure pourrait diverger [P].
- **Historique sans ancienne valeur.** « Ancienne et nouvelle valeur » (TODO) se lit sur la version − 1. C'est correct tant que l'historique est complet ; une purge partielle (anonymisation) casse ce calcul.
- **Drizzle.** C est le seul à reconnaître que les fonctions plpgsql contredisent « le repository écrit l'historique ». Le coût est le même pour A et B, qui ne le disent pas.
- **Verrou de finalisation.** `FOR UPDATE` sur la ligne `participants` sérialise la finalisation avec les écritures de ce participant **dans toutes les grilles**, et bloque toute mise à jour MiData de cette ligne pendant ce temps [D].

## Angles morts communs

1. **La restauration n'a pas été testée.** Les trois options dépendent de réglages de base (`search_path`, `jit`, `TimeZone`) qui ne suivent ni `create database … template`, ni `pg_dump` sans `--create`. Rejoué : A et C ne peuvent plus écrire, B perd l'égalité du rejeu hors UTC, et C devient 70 fois plus lent sur S9 [V]. Le correctif est connu (`set search_path` et `set jit` sur chaque fonction, ou dump avec `--create`), mais aucun schéma ne l'applique, et aucun test de restauration ne figure au protocole.
2. **L'invariant « état = rejeu » n'est vérifié qu'à un instant.** Le protocole place S8 avant S5 et S6, et seuls B et (ici) C l'ont vérifié ensuite. Le défaut de A sur les jokers copiés montre que l'invariant doit être un test permanent, exécuté après chaque scénario.
3. **Rien n'interdit le DML direct.** Dans les trois options, un `UPDATE` direct de l'état contourne l'historique et la validation [V]. Les essais tournent en superutilisateur. Les rôles séparés (27 §C-09) changent la conclusion sur l'intégrité. Sans eux, l'avantage « FK composites » de A ne couvre pas la valeur saisie.
4. **Anonymisation et purge (nLPD).** FEATURES prévoit d'effacer les noms à 3 mois, et les commentaires libres peuvent contenir des noms. Les trois options mettent le texte libre dans un historique append-only, et le dupliquent dans chaque copie. La seule sortie est un contournement des gardes (`azimut.purge`, `session_replication_role`). Aucun scénario ne mesure une anonymisation complète, ni ne vérifie qu'elle préserve le rejeu et le recalcul. La C-10 (27) n'est satisfaite par aucune option.
5. **Le jeu n'exerce pas ce qui distingue les options.** Aucune non-évaluation n'a d'axe (27 lignes, toutes à axe nul [V]). Dans S9 (b), « hors non-évaluation » = « sans note » (88 = 88, 107 = 107), donc la couverture héritée n'est pas discriminée. Le jeu ne contient ni retrait de joker, ni report de non-évaluation sur un nœud supprimé, ni `quotaDepasse`, ni réouverture, ni participant ajouté en cours, ni barème numérique. Chaque option a écrit « non implémenté, non exercé » au moins une fois.
6. **Les micro-mesures pèsent trop.** Toutes les latences sont sous 15 ms à l'échelle réelle (40 participants, 4 formateurs, environ 2 écritures par minute en pointe). Les écarts de débit en S3 sont de 3 ordres de grandeur au-dessus du besoin. Le protocole ne mesure pas ce qui coûtera au mainteneur bénévole : nombre de fichiers touchés par une évolution du format, temps d'écriture d'une migration, lisibilité pour un agent.
7. **Évolutions du modèle 18 non simulées.** Aucun scénario n'ajoute un paramètre de fonction, une fonction, un axe ou un gabarit partagé entre cours. Ce serait pourtant le test qui distingue « migration de tables » (A) et « lecteur multi-format éternel » (B, C).
8. **Les copies dupliquent sans limite.** Chaque copie réécrit 3 585 lignes d'historique « copie » et duplique les commentaires. Plusieurs grilles par cours (18) multiplient le volume et les points d'anonymisation. Aucun scénario ne mesure 5 copies successives d'un cours réel.
9. **Les chiffres de la consigne sont faux.** La consigne annonçait 3 166 notes et 376 commentaires pour S5, alors que le fichier attendu en donne 3 167 et 416. Les trois options l'ont remarqué, ce qui les met d'accord, mais l'origine de l'écart (un générateur ou une consigne modifiés après coup ?) n'est pas expliquée.
10. **Comparabilité des tailles de S10.** Les volumes après S5 incluent des copies purgées et non récupérées, dont le nombre et la méthode (purge par fonction, contournement par réplica) diffèrent. Les chiffres après S5 ne se comparent pas entre options.
