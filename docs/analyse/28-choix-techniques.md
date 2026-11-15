# 28 — Choix techniques proposés

> **Statut : propositions du 15 novembre 2026, à valider par le propriétaire du dépôt. Aucune n'est une décision.** `docs/TODO.md` n'est pas modifié : le propriétaire y reportera ce qu'il valide. Le document est rédigé par des agents, à partir de huit lots de propositions, chacun relu par un contradicteur. [18](18-decisions-definitives.md) fait foi sur le modèle de qualification. Le plan de sécurité [27](27-plan-securite.md) a été lu et sert de référence de cohérence (§13). Révisé le même jour après une relecture indépendante.

Convention : **[V]** = vérifié le 15 novembre 2026 par un agent (essai jetable, lecture de code, registre npm ou documentation), source citée ; **[D]** = déduit ; **[M]** = tiré de la mémoire d'un agent, non relu. Les essais ont tourné dans le scratchpad de la session, jamais dans le dépôt, sous Bun 1.4.4. Les chiffres de versions viennent du registre npm sauf mention contraire. Ce sont les versions des essais ; plusieurs ont moins de 7 jours, et la fondation prendra des versions plus anciennes (CHAINE-2).

## TL;DR

- **Rien ne change dans la pile décidée.** Les propositions précisent comment la tenir. Une seule dépendance d'exécution nouvelle à la fondation : `uuid` (v7). Côté outillage : `@effect/tsgo` (déjà prévu), `@shadcn/lint`, et peut-être `fallow`.
- **Trois pièges vérifiés aujourd'hui** imposent des règles dès l'étape `contracts` : Eden transforme en `Date` toute chaîne qui ressemble à une date (même un commentaire « 12-05-2026 »), et ignore `parseDate: false` sur le WebSocket ; la 422 native d'Elysia renvoie la valeur saisie, même en production ; `bun install --frozen-lockfile` n'applique pas `minimumReleaseAge` à ce qui est déjà dans `bun.lock`.
- **Temps réel** : écritures par HTTP (Eden), notre WebSocket pousse la ligne modifiée avec une **version attribuée par le serveur**, refetch au retour. Electric est écarté. Le WebSocket côté client est natif et décodé par Valibot, pas `subscribe()` d'Eden.
- **Coupure courte** : idempotence serveur par un `writeId` UUIDv7 qui sert de clé à l'historique, rejeu maison en mémoire avec une file par case, `401` qui met en pause au lieu d'annuler. `@tanstack/offline-transactions` reste candidat pour les observations, contre une file maison, après la démonstration.
- **Calcul** : recalcul complet du participant sur le thread principal, mais avec des lectures par cellule à égalité stable (pas un objet global dans un `useMemo`). Pas de cache de résultats, pas de signaux. Le noyau du prototype est porté dans `packages/domain` en partant de ses tests ; cela rouvre la spec 20 et fige des défauts de 19 à faire valider.
- **Contrôles** : `lefthook.yml` est la seule liste ; pre-commit sous 10 s ; pre-push sans e2e (ni Docker exigé) ; `gate:ci` lançable en local, avec trois exceptions nommées limitées à la CI. `effect-tsgo tsc` sans patch remplace `tsc`.
- **Dépendances** : Dependabot (catalogues Bun gérés dans le code actuel de dependabot-core [V] ; date de mise en service non vérifiée), groupes par famille, délai de 7 jours, plus un contrôle CI de l'âge des versions ajoutées au lockfile. Les versions des essais ne seront donc pas celles de la fondation. Cela s'écarte de 27 §8, qui recommandait Renovate.
- **Exploitation** : Caddy sans socket Docker, pas de proxy en développement, VPS jetable de démonstration chez un hébergeur suisse à éprouver. Sauvegardes, suivi d'erreurs et exécuteur de tâches attendent le pilote.
- **Onze décisions prises sont rouvertes** (§10), dont « sans recalculer tout le graphe », le viewport unique, « pre-push : tous les tests » et les trois régimes. L'ordre au rejeu et la libération du verrou sont des propositions pour le grilling 05, pas des choix. Le premier essai à lancer est le spike Elysia + Eden + import de type `App` dans le web (§12).

## 1. Tableau de bord

Quand trancher : **A** avant la fondation, **F** pendant la fondation, **D** avant la démonstration, **P** après la démonstration. État : **prête** (prête à valider) ; **preuve d'abord** (orientation, l'essai tranche avant l'engagement) ; **au porteur** (proposition à soumettre au grilling 05) ; **écartée**. Le verdict du contradicteur et l'arbitrage sont dans la fiche. Chaque fiche a un **Coût** (dépendances, mise en place, coût par commit ou par CI) ; les durées y sont des estimations [D].

| ID | Décision | Proposition retenue (une phrase) | Confiance | Quand | État |
| --- | --- | --- | --- | --- | --- |
| CONTRATS-1 | Réponses au format wire | Test de la table des routes : réponses déclarées avec le socle d'erreurs, schémas JSON natifs seulement, sans `looseObject` ni `custom`. | élevée | F | prête |
| CONTRATS-2 | Dates implicites d'Eden | Client HTTP unique avec `parseDate: false` ; WebSocket natif décodé par Valibot. | élevée | F | prête |
| CONTRATS-3 | Forme des dates | Instant = chaîne `toISOString()` contrôlée par regex stricte ; jour = `AAAA-MM-JJ`, jamais `Date`. | élevée | F | prête |
| CONTRATS-4 | Conformité Drizzle ↔ contrat | Assertion de type sur la sortie des mappers, brands par `.$type<>()`. | moyenne | F | preuve d'abord |
| CONTRATS-5 | Enveloppe d'erreur | `{ code, requestId, issues? }`, sans jamais la valeur saisie ; réponse invalide = 500. | élevée | F | prête |
| CONTRATS-6 | UUIDv7 du client | `newId()` (paquet `uuid`) et schéma `UuidV7` ; créations idempotentes ; `params` validés. | élevée | F | prête |
| CONTRATS-7 | Champs inconnus en entrée | `strictObject` pour corps, query et params (C-07). | élevée | F | prête |
| OUTILLAGE-1 | Diagnostics Effect | `effect-tsgo tsc` sans patch ; `unstableApiUsage` et `outdatedApi` en erreur. | élevée | A | prête |
| OUTILLAGE-2 | Versions de la chaîne TS | Versions exactes, deux groupes de mise à jour, `effect-tsgo tsc@<version>`. | élevée | A | prête |
| OUTILLAGE-3 | Alias TS 6 pour Stryker | Pas d'alias ; la réactivation de la mutation est une décision à part. | moyenne | F | prête |
| OUTILLAGE-4 | `@shadcn/lint` | Adopté à l'étape web, configuré dans `apps/web` seulement ; contrats `no-restyle` au premier besoin. | moyenne | F | prête |
| OUTILLAGE-5 | `fallow` pour les frontières | Orientation : `fallow architecture` si l'essai à témoins passe, en `gate:ci` seulement ; sinon script maison. | faible | A | preuve d'abord |
| OUTILLAGE-6 | Un outil par règle | Table règle → outil, gardée par un test, noms de règles exacts. | élevée | A | prête |
| OUTILLAGE-7 | slop-scan | Écarté. | moyenne | P | écartée |
| OUTILLAGE-8 | slopo | Écarté ; `fallow similar-code` en réserve. | élevée | P | écartée |
| OUTILLAGE-9 | Plafonds 12 / 80 / 600 | Réglages d'oxlint, plus une liste unique de fichiers générés ignorés. | élevée | A | prête |
| STRUCTURE-1 | Découpage par fonctionnalité | Dossiers `features/` dans les apps ; quatre fonctionnalités au départ. | moyenne | A | prête |
| STRUCTURE-2 | Graphe de dépendances | Un seul fichier de graphe, un seul outil pour les frontières. | moyenne | A | prête |
| STRUCTURE-3 | Pureté de `domain`, Bun confiné | Règles oxlint par nom de module et globals, plus tsconfig `types: []` sans `dom`. | élevée | F | prête |
| STRUCTURE-4 | Pre-commit | Format d'abord, puis vérifications en parallèle ; p95 sous 10 s. | moyenne | A | prête |
| STRUCTURE-5 | Pre-push | Tous les tests sauf e2e ; Postgres par `TEST_DATABASE_URL` ; pas de cache sur l'intégration. | moyenne | A | prête |
| STRUCTURE-6 | `gate:ci` | `gate:push` + e2e + visuel + contrôles de 27 ; trois exceptions limitées à la CI. | moyenne | A | prête |
| STRUCTURE-7 | Source des niveaux | `lefthook.yml` seule liste ; hooks installés par un script explicite. | élevée | A | prête |
| MESURES-1 | Outil de banc | Fixture `bench` de Vitest 5 sous Bun, reporter JSON, Vitest épinglé. | élevée | F | prête |
| MESURES-2 | Comparabilité | A/B base et tête dans le même job, par un script de `tools/`. | moyenne | F | prête |
| MESURES-3 | Tendances | Rien avant la démonstration (report d'une décision prise) ; branche `mesures` ensuite. | moyenne | P | prête |
| MESURES-4 | CodSpeed | Écarté (addon natif Node, rien pour Bun). | élevée | A | écartée |
| MESURES-5 | Indicateurs de requêtes | Compteur par logger Drizzle injecté, assertion `≤ n` ; EXPLAIN après. | moyenne | F | prête |
| MESURES-6 | Volume réel ×5 | 17 000 notes par cours (pas par grille) ; chiffres à confirmer par le porteur. | moyenne | A | prête |
| MESURES-7 | Générateur partagé | Générateur déterministe unique dans `packages/testing`. | élevée | F | prête |
| MESURES-8 | Fonctions lourdes | Cinq sujets ; références refaites sous Bun ; bancs DB séparés. | moyenne | F | prête |
| MESURES-9 | Viewport téléphone | Second projet Chromium à 390 ou 360 px, facteur 2 ; le plafond compte des captures. | élevée | D | prête |
| MESURES-10 | Navigateur des captures | Chromium seul. | élevée | F | prête |
| MESURES-11 | Git LFS | Non ; alerte à 50 Mo d'historique. | élevée | F | prête |
| MESURES-12 | Mise à jour des références | Script local Docker ; pas d'Action par label. | élevée | F | prête |
| MESURES-13 | Zones volatiles | Horloge figée, graine fixe, masques ciblés, tolérance par défaut. | élevée | F | prête |
| MESURES-14 | Visuel bloquant | Bloquant dans l'e2e requis ; repli par projet non requis, sous label. | moyenne | F | prête |
| MESURES-15 | E2E local Docker | Script + compose ; runner Bun ou Node à trancher par essai. | faible | F | preuve d'abord |
| MESURES-16 | Commentaire de PR unique | Job d'agrégation ; commentaire retrouvé par marqueur caché via `gh api`. | élevée | F | prête |
| MESURES-17 | Pas de CI en brouillon | Types d'événements + `if` par job ; groupe de concurrence par workflow. | élevée | F | prête |
| ECRITURES-1 | Idempotence serveur | `writeId` = clé de l'historique ; doublon → état courant ; réautorisation au rejeu. | élevée | F | prête |
| ECRITURES-2 | Coupure courte (grille) | Rejeu maison en mémoire, file par case, `401` en pause. | moyenne | F | prête |
| ECRITURES-3 | Conflits au rejeu | Pour le grilling 05 : dernier gagnant à l'arrivée, verrou libéré à la coupure ; refus permanents visibles dans un avis. | moyenne | F | au porteur |
| ECRITURES-4 | Transport live | WebSocket maison, ligne complète, version entière attribuée par le serveur (`number` sur le fil) ; sans Electric. | élevée | F | prête |
| ECRITURES-5 | File des observations | Ouvert : file maison ou `offline-transactions`, même essai sur téléphones. | faible | P | preuve d'abord |
| ECRITURES-6 | Rattrapage | Refetch des collections ouvertes à la reconnexion. | moyenne | F | prête |
| ECRITURES-7 | HTTP pour écrire | Écritures par HTTP ; WebSocket pour flux descendant, verrous, présence. | élevée | F | prête |
| CALCUL-1 | Moteur de la première version | Recalcul complet du participant, lectures par cellule à égalité stable. | élevée | F | prête |
| CALCUL-2 | Incrémental | Reporté ; DAG maison en premier choix si une mesure le déclenche. | moyenne | P | prête |
| CALCUL-3 | Cache | Pas de cache de résultats ; plan mémoïsé par identité de la structure. | élevée | F | prête |
| CALCUL-4 | Reprise du noyau | Portage depuis les tests, après validation des défauts figés. | élevée | F | prête |
| CALCUL-5 | Diagnostics de `compile` | `{ plan, diagnostics }` codés et rattachés, sans exception ; plafonds de C-07. | élevée | F | prête |
| CALCUL-6 | Rejeu serveur | Un adaptateur ; égalité Bun + trois moteurs de navigateur ; version de `domain` contrôlée. | élevée | F | prête |
| ENVIRONNEMENTS-1 | Régimes | Quatre régimes à variantes Valibot sur une liste fermée de clés ; marqueur en base. | élevée | F | prête |
| ENVIRONNEMENTS-2 | Proxy | Caddy 2.11, un Caddyfile avec `basic_auth` activé par variable. | élevée | F | prête |
| ENVIRONNEMENTS-3 | Worktrees | Slots de ports et de bases sans proxy ; suppression, clones de test et garde-fous ; isolation des sessions à prouver. | moyenne | F | prête |
| ENVIRONNEMENTS-4 | Hébergeur | Deux grilles de critères (démonstration, pilote) ; trois candidats à éprouver. | moyenne | D | prête |
| ENVIRONNEMENTS-5 | Démonstration en ligne | VPS jetable, même image, durcissement C-20 dès le départ. | élevée | D | prête |
| ENVIRONNEMENTS-6 | Repli local | Une seule origine pour les deux écrans (nom stable). | moyenne | D | prête |
| ENVIRONNEMENTS-7 | Sauvegardes | Rien avant le pilote ; puis `pg_dump` plain vers `restic --stdin`. | moyenne | P | prête |
| ENVIRONNEMENTS-8 | Suivi d'erreurs | Journaux jusqu'à la démonstration ; au pilote, Bugsink ou GlitchTip. | moyenne | P | prête |
| ENVIRONNEMENTS-9 | Exécuteur de tâches | Aucun avant le pilote ; synchronisation MiData à la connexion. | moyenne | P | prête |
| CHAINE-1 | Mises à jour npm | Dependabot `bun` ; preuve sur le dépôt réel à l'étape 1. | moyenne | F | prête |
| CHAINE-2 | Délai de publication | 7 jours (Bun et Dependabot) + contrôle CI de l'âge des versions du lockfile ; fondation sur des versions de plus de 7 jours. | élevée | F | prête |
| CHAINE-3 | Regroupement des PR | Groupe « stables » et un groupe par famille leading edge. | moyenne | F | prête |
| CHAINE-4 | Actions et Docker | Dependabot `github-actions` dès l'étape 1 ; Docker quand les fichiers existent. | moyenne | F | prête |
| CHAINE-5 | `.claude/settings.json` | Squelette de PRACTICES §4 aligné sur C-17 ; `sandbox.credentials`. | moyenne | F | prête |
| CHAINE-6 | Hooks | Trois hooks à la fondation ; `stop-gate` plus tard. | moyenne | F | prête |
| CHAINE-7 | Skills vendorisés | Huit skills à l'étape 2, quatre avec la première tranche. | moyenne | F | prête |
| CHAINE-8 | Agents en CI | Pas d'Action Claude ; deux règles AGENTS.md ; issue piégée à l'étape 2, rejouée à chaque phase. | élevée | F, D | prête |

### 1.1 Incohérences entre lots, tranchées

1. **Frontières : deux outils proposés pour la même règle** (OUTILLAGE-5 `fallow`, STRUCTURE-2 script + oxlint). Les deux contradicteurs demandent un seul mécanisme. Tranché : un seul outil pour les frontières (packages et fonctionnalités, chemins résolus, imports de type). Oxlint ne garde que les interdits par nom de module. Le choix entre `fallow` et le script se fait par l'essai E3 (§12).
2. **Graphe des packages** : OUTILLAGE-5 interdisait `web → server`, STRUCTURE-2 l'autorisait en type seul. Tranché pour STRUCTURE-2 : Eden en a besoin. `testing` seulement depuis les tests et `tools/`, `config` dans le graphe, `domain → contracts` en type seul.
3. **`@effect/tsgo`** : OUTILLAGE-1 retire le patch ; CHAINE-6, une décision oubliée de STRUCTURE et 27 C-16 en font une étape. Tranché : pas de patch. `effect-tsgo tsc` lance son propre binaire ; il n'y a rien à patcher dans `session-setup` ni dans le gate.
4. **Installation de Lefthook** : STRUCTURE-7 comptait sur la liste de confiance par défaut de Bun, CHAINE-6 sur `bunx lefthook install`. Tranché : script explicite `bun run lefthook install` (via `setup`/`prepare`), appelé aussi par `session-setup`. Ne dépend ni du postinstall ni du registre.
5. **E2E dans le pre-push** : STRUCTURE-5 (proposition) et MESURES-15 (budget de 3 min) le plaçaient au pre-push. Tranché : e2e dans `gate:ci`, lançable en local par `bun run e2e:docker`. Un agent cloud sans démon Docker doit pouvoir pousser.
6. **Idempotence** : CONTRATS-6 (`ID_CONFLICT` sur toute réécriture), ECRITURES-1 (`writeId`) et le contradicteur de CONTRATS (« trancher idempotencyKey ou ID d'entité ») se recoupent. Tranché : chaque écriture porte un `writeId` (clé de l'historique) ; une création est idempotente par (ID d'entité, cours) ; une collision avec un autre cours répond comme une collision ordinaire (C-04).
7. **Version d'une case** : ECRITURES-4 prenait l'UUIDv7 du client comme version. Tranché : colonne `version` entière attribuée par le serveur (`integer`, `number` sur le fil, ECRITURES-4). Le `writeId` sert à l'identité, jamais à l'ordre (cohérent avec CONTRATS-6 : « rien ne date ni ne trie par l'ID »).
8. **WebSocket typé** : PRACTICES §2 prévoit Eden `.subscribe()`, ECRITURES-4 s'y appuie ; CONTRATS-2 montre qu'il ignore `parseDate: false`. Tranché : WebSocket natif côté client, messages décodés par les schémas de `contracts`.
9. **Codes d'erreur** : CONTRATS-5 les met dans `contracts`, CALCUL-5 met les codes de diagnostic dans `domain`. Avec `domain → contracts` en type seul, tranché : les tuples de codes vivent dans `contracts` ; `domain` rend des littéraux typés par import de type. À écrire en ADR.
10. **Volume ×5** : MESURES-6 lisait « 17 000 notes par grille », CALCUL utilisait 40 participants arbitraires. Tranché sur FEATURES : 17 000 notes **par cours** ; un seul profil `reel` paramétré, chiffres confirmés par le porteur.
11. **Références de perf** : MESURES-8 et CALCUL-1 citaient les chiffres du prototype (0,44 ms, 0,17 ms) mesurés sous Node 26. Tranché : aucune référence absolue ; la base est refaite sous Bun au portage, la variation se lit par A/B.
12. **Seuils de perf** : CALCUL-1 et ECRITURES-4/6 proposaient des critères chiffrés en CI ; TODO décide « pas de gate ». Tranché : ce sont des essais d'acceptation ponctuels, pas des contrôles requis. Les assertions `≤ n` sur le nombre de requêtes (MESURES-5) restent des tests ordinaires : elles visent un défaut de code, pas un temps.
13. **Postgres pour les agents cloud** : STRUCTURE-5 le confiait au script de setup de l'environnement, CHAINE-6 écartait ce script. Tranché (option b) : `session-setup` installe et démarre Postgres 18, versionné et testé dans le dépôt ; E6 mesure SessionStart avec cette installation. L'image cloud de cette session a PostgreSQL 16 (`/usr/lib/postgresql/16`, `psql`), pas 18 [V] ; l'accès au dépôt apt de PostgreSQL depuis le cloud n'est pas vérifié. Si E6 dépasse 2 min ou si l'hôte est bloqué : option a, Postgres par le script de setup de l'environnement, et CHAINE-6 retire ce script de ses écartés.

## 2. Contrats et format des échanges

Tout se règle à l'étape 3 de la fondation (`contracts`), avant la première route. Essais du lot : elysia 1.4.32, `@elysia/eden` 1.4.10, valibot 1.5.0, `@valibot/to-json-schema` 1.8.0, drizzle-orm 1.0.0-rc.5, typescript 7.0.2.

#### CONTRATS-1 — Réponses au format wire, imposées par un test
- **Q.** Les schémas de réponse décrivent-ils la forme JSON qui circule ? **Proposition.** Oui. Un test d'intégration parcourt `app.routes` et vérifie par route : (1) `hooks.response` existe, avec 200 ou 201 et le socle 401, 403, 422, 500 ; (2) chaque schéma de réponse passe `toJsonSchema` en `errorMode: 'throw'` avec `ignoreActions: ['brand']` ; (3) un parcours récursif refuse `date`, `transform`, `bigint`, `looseObject`, `objectWithRest`, `any`, `unknown`, `custom`. Le générateur OpenAPI garde un appel séparé en `errorMode: 'ignore'`.
- **Pourquoi.** Une réponse `v.date()` répond 200 avec une chaîne ISO alors que le type annonce une `Date` [V spike-contrats/e.ts]. `app.routes[i].hooks.response[200]` est le schéma Valibot brut, `undefined` sans response, même dans un group [V, deux essais]. `toJsonSchema` lève sur date, transform, bigint, `custom` ; `variant` et `lazy` récursif passent [V contra t1.ts]. `looseObject` laisse sortir un champ non déclaré, contrairement à `object` [V]. **Écarté :** transform en réponse (cassé, PRACTICES §9), sérialiseur maison, règle en prose. **Non vérifié :** stabilité de `app.routes` sous Elysia 2 (rc.3 publiée le 5 novembre). **Coût.** aucune dépendance ; un test d'intégration (une demi-journée) ; quelques secondes par CI.
- **Contradicteur (à modifier).** Le test ne voyait pas les fuites par `looseObject` (C-07), confondait garde et générateur, et oubliait le socle d'erreurs. **Arbitrage :** suivi en entier. Le risque annoncé sur les unions discriminées est retiré : il est faux [V].
- **Preuve.** Quatre cas rouges (route sans response, `v.date()`, `looseObject`, route sans 401) et zéro faux positif sur la tranche. **Changerait d'avis :** une version d'Elysia et d'Eden qui encode correctement les transform des deux côtés, prouvée par essai.

#### CONTRATS-2 — Client Eden unique, WebSocket natif
- **Q.** Accepte-t-on le parsing implicite des dates d'Eden ? **Proposition.** Non. Un seul module de `apps/web` crée `treaty<App>(origin, { parseDate: false })` ; l'import de `@elysia/eden` ailleurs est interdit. Pour `/ws`, pas de `subscribe()` d'Eden : un WebSocket natif lit `ev.data` et le décode avec les schémas de `contracts`.
- **Pourquoi.** Sans l'option, Eden 1.4.10 rend une `Date` pour « 12-05-2026 », un instant ISO et « 2026-11-15 », par un reviver sur tout le corps [V a.ts, lecture de `dist/chunk-I5KHAGLL.mjs`]. Avec l'option, tout reste `string` en HTTP et les types sont justes [V b.ts]. Sur le WebSocket, l'option est ignorée : le parseur est appelé sans configuration, et « 12-05-2026 » devient une `Date` [V contra t2.ts, `chunk-TTKI5TQ7.mjs`]. **Écarté :** garder le défaut ; remplacer Eden par `fetch` (rouvrirait la pile). **Non vérifié :** comportement d'Eden 2 (rc.1 publiée le 28 octobre) ; `no-restricted-imports` d'oxlint pour cette règle (à essayer). **Coût.** aucune dépendance ; un module client, un décodeur WS et une règle d'import (quelques heures).
- **Contradicteur (à modifier).** Garantie fausse sur le WebSocket. **Arbitrage :** suivi. Conséquence pour ECRITURES-4 et PRACTICES §2 (cohérence n° 8).
- **Preuve.** Test d'intégration HTTP : un commentaire « 12-05-2026 » arrive en `string`, et le test échoue si on retire l'option. Test WS : même message, `typeof === 'string'` après décodage. **Changerait d'avis :** un Eden qui parse selon le schéma déclaré, y compris sur le WebSocket.

#### CONTRATS-3 — Instants ISO UTC, jours calendaires en chaîne
- **Q.** Sous quelle forme les dates sortent-elles de la base et passent-elles sur le fil ? **Proposition.** Colonnes `timestamp({ withTimezone: true })` en mode `date` ; le mapper rend `toISOString()`. Le contrat déclare `Instant = pipe(string, regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/), brand('Instant'))`. Jours de cours : `date` en base, `isoDate` dans le contrat, jamais convertis en `Date`. Deux helpers de `contracts` convertissent à l'affichage.
- **Pourquoi.** En mode `string`, Drizzle rc.5 + postgres-js rend « 2026-11-15 10:00:00.123+00 », qui dépend du fuseau de session [V d.ts, PostgreSQL 16]. `isoTimestamp` accepte cette forme et sort en 200 [V contra] : seule une regex stricte fixe la forme. Un jour converti en `Date` peut s'afficher la veille [D]. **Écarté :** mode `string` ; Temporal (support navigateur non vérifié) ; epoch ms. **Non vérifié :** PostgreSQL 18 ; ce que rendent les colonnes `date` avec rc.5. **Coût.** aucune dépendance ; deux helpers, une regex, une conversion par mapper.
- **Contradicteur (à modifier).** Une `Date` oubliée ne passe pas « par accident » : Elysia répond 422 `on: 'response'` et expose les données (voir CONTRATS-5). Le vrai trou est la chaîne Postgres brute. **Arbitrage :** suivi ; la regex remplace `isoTimestamp`.
- **Preuve.** Tranche avec la session en `Europe/Zurich` puis `UTC`, sur PostgreSQL 18 : instant relu égal à « …Z », jour égal à « AAAA-MM-JJ », chaîne Postgres brute refusée. **Changerait d'avis :** un besoin d'arithmétique de dates côté client qui justifie Temporal.

#### CONTRATS-4 — Conformité contract-first par assertion de type
- **Q.** Comment prouver que Drizzle implémente le contrat sans générer le contrat depuis la base ? **Orientation (preuve d'abord).** Un `*.test-d.ts` par agrégat vérifie `Equal<Wire<SortieDuMapper>, InferOutput<Contrat>>` ; la ligne de table est un contrôle secondaire. Brands posés par `.$type<>()`. Colonnes serveur nommées une fois (`ServerColumns`). À l'écriture, l'entrée du contrat est assignable à `$inferInsert` (une colonne à défaut oubliée passe : c'est accepté).
- **Pourquoi.** L'égalité passe quand contrat et table concordent ; elle échoue sur `optional` au lieu de `nullable`, sur un brand absent et sur une `Date` non convertie [V g.ts, b.ts, tsc 7.0.2] — résultats de l'instructeur seul. **Écarté :** `drizzle-valibot` (génère depuis la base, latest 0.4.2 de mai 2025 [V]) ; comparaison d'objets à l'exécution. **Non vérifié :** requêtes relationnelles ; coût du typecheck sur 15 à 20 agrégats ; `drizzle-kit` avec un schéma qui importe `@azimut/contracts`. **Coût.** aucune dépendance ; un `*.test-d.ts` par agrégat ; typecheck plus long, non mesuré.
- **Contradicteur (preuves insuffisantes).** Essai non relancé ; la route renvoie la sortie du mapper, pas la ligne ; les `Omit` grossissent avec `course_id` (C-04). **Arbitrage :** suivi ; présenté comme orientation.
- **Preuve (en premier).** Dans la tranche : nullable passé en optional et brand retiré font échouer le typecheck ; un champ ajouté au mapper mais absent du contrat aussi ; `drizzle-kit generate` passe. **Changerait d'avis :** des contrats surtout composés de vues, qui demanderaient d'asserter le type de retour des fonctions du repository.

#### CONTRATS-5 — Enveloppe d'erreur unique
- **Q.** Quelle enveloppe, et comment garantir qu'un code a sa traduction ? **Proposition.** `contracts` exporte `ERROR_CODES`, `ERROR_STATUS` et `ErrorEnvelope = { code, requestId, issues?: { path: string[], code: IssueCode }[] }`, avec `IssueCode` en picklist fermé et repli générique. Un `onError` unique distingue la validation `body/query/params` (422 `VALIDATION`, chemins en clés `path.map(p => p.key)`) de la validation `response` (500 `INTERNAL`, journalisée). Pas de code « hors périmètre » distinct de `NOT_FOUND` (C-04). `CELL_LOCKED` est le premier code métier. Côté web, `Record<ErrorCode, () => string>` vers Paraglide.
- **Pourquoi.** La 422 native d'Elysia renvoie la saisie (`found`, `property.input`, `path[].value`), y compris avec `NODE_ENV=production` [V contra]. Une `Error` levée ressort en `{ code: 'INTERNAL', requestId }` [V c.ts]. Eden type `error.value.code` comme l'union des codes [V a.ts, c.ts]. **Écarté :** Problem Details (textes à traduire côté serveur) ; 422 native. **Non vérifié :** mappage vers `NonRetriableError` si `offline-transactions` est retenu. **Coût.** aucune dépendance ; un `onError` ; un message à écrire par code ajouté.
- **Contradicteur (à modifier).** Cas de la réponse invalide, chemin qui fuit la valeur, codes d'issue libres, oracle 403/404. **Arbitrage :** suivi en entier.
- **Preuve.** (a) Chaque erreur taguée donne son code et son statut ; (b) une saisie « canari » n'apparaît dans aucun corps 422, en production comme en développement ; (c) une réponse invalide donne 500 sans données ; (d) retirer un message du `Record` fait échouer le typecheck. **Changerait d'avis :** des messages paramétrés riches (schéma par code).

#### CONTRATS-6 — UUIDv7 venus du client
- **Q.** Comment générer et contrôler les identifiants ? **Proposition.** `newId()` (paquet `uuid`, `v7`) et `UuidV7` (regex v7 + brand par entité) dans `contracts`. `params: { id: UuidV7 }` obligatoire, vérifié par le test des routes. Création idempotente par (ID, cours) : une réécriture identique répond comme la première. Une collision avec un autre cours répond comme une collision ordinaire. Le serveur ne date ni ne trie jamais par l'ID. La regex refuse les majuscules (accepté).
- **Pourquoi.** `v.uuid()` accepte un v4 et Valibot 1.5.0 n'a pas de validateur v7 [V]. `uuid` 14.0.3 : aucune dépendance, ESM, 65 739 octets ; 10 000 appels serrés donnent des v7 uniques et triés [V]. Eden type les paramètres de chemin sans brand (PRACTICES §9). **Écarté :** `crypto.randomUUID()` (v4 [M]) ; générateur maison ; `uuidv7`. **Non vérifié :** `uuidv7()` dans PostgreSQL 18 ; poids gzip dans le bundle. **Coût.** une dépendance d'exécution (`uuid`, sans dépendance) ; un schéma par entité.
- **Contradicteur (à modifier).** `ID_CONFLICT` sur un rejeu annulerait une saisie déjà en base, et servirait d'oracle d'existence. **Arbitrage :** suivi ; aligné avec ECRITURES-1 (cohérence n° 6).
- **Preuve.** Boucle de 10 000 ; v4 refusé en corps et en chemin ; double POST identique = deux succès, une ligne ; POST avec l'ID d'un autre cours ne modifie rien et ne se distingue pas d'une collision ordinaire. **Changerait d'avis :** un validateur v7 natif dans Valibot.

#### CONTRATS-7 — Champs inconnus en entrée (ajoutée)
- **Q.** Un corps avec un champ en trop est-il refusé ou nettoyé ? **Proposition.** `strictObject` pour `body`, `query`, `params` ; `object` (qui retire les champs) pour les réponses. Le test des routes vérifie le type des schémas d'entrée. **Pourquoi.** `v.object` retire en silence un champ en trop (200), `strictObject` répond 422 [V contra]. 27 C-07 exige le refus. **Écarté :** nettoyage silencieux. **Coût.** aucun ; le client envoie exactement les champs du contrat. **Contradicteur.** Décision ajoutée par lui ; pas d'objection. **Arbitrage :** retenue. **Preuve.** Corps avec un champ en trop : 422 `VALIDATION`, sans la valeur. **Changerait d'avis :** rien de prévu.

## 3. Outillage TypeScript, lint et analyse de code

Essais du lot : `@effect/tsgo` 0.69.0, typescript 7.0.2, oxlint 1.93.0, oxlint-tsgolint 7.0.2007, oxfmt 0.78.0, Stryker 10.1.1, `@shadcn/lint` 0.2.5, fallow 3.43.1.

#### OUTILLAGE-1 — Diagnostics Effect par `effect-tsgo tsc`, sans patch
- **Q.** Comment faire échouer les contrôles sur les diagnostics Effect ? **Proposition.** Le typecheck appelle `effect-tsgo tsc -p <tsconfig>` ; pas de `effect-tsgo patch`, pas de doublon dans oxlint. Dans le tsconfig de base : `unstableApiUsage` et `outdatedApi` en `error` (`anyUnknownInErrorContext` à confirmer) ; les règles déjà en `error` par défaut (`floatingEffect`, `missingEffectError`, `missingEffectContext`) sont listées dans le test de garde. Images CI et Docker en glibc. L'éditeur pointe vers `effect-tsgo get-exe-path`.
- **Pourquoi.** Un Effect flottant fait sortir `effect-tsgo tsc` en code 1, sous Node et Bun, en 0,65 s [V spike1]. Le mode sans patch existe (README) [V]. Aucun paquet musl ; plateforme de 259 Mo [V contra]. Les avertissements Effect font déjà échouer tsc par défaut [V README]. **Écarté :** patch au `postinstall` (TODO) ; règles via oxlint ; `@effect/eslint-plugin`. **Non vérifié :** mode `-b` ; intégration éditeur ; temps sur une vraie app. **Coût.** une dépendance d'outillage déjà prévue (plateforme de 259 Mo) ; images glibc imposées ; moins d'une seconde par typecheck sur le prototype.
- **Contradicteur (à modifier).** Liste de règles fausse (`missingEffectServiceDependency` vise Effect v3) ; règles utiles oubliées ; vérificateur = fork maintenu par Effect. **Arbitrage :** suivi. Reste ouvert : les `*.test-d.ts` passent par le typecheck de Vitest (`tsc` d'origine) ; on choisit d'épingler la même version de TypeScript et d'accepter cet écart, à revoir si les deux divergent.
- **Preuve.** Fichier témoin (Effect flottant, erreur non gérée, import `effect/unstable/...`, API v3) qui fait échouer `gate:commit` et `gate:ci` dans l'image CI réelle. **Changerait d'avis :** un diagnostic important seulement en règle oxlint, ou l'abandon du paquet.

#### OUTILLAGE-2 — Versions exactes de la chaîne TypeScript
- **Q.** Comment éviter que TypeScript, oxlint, tsgolint et `@effect/tsgo` divergent ? **Proposition.** Versions exactes dans le catalogue. Deux groupes de mise à jour : (`typescript`, `@effect/tsgo`) et (`oxlint`, `oxlint-tsgolint`) ; `oxfmt` seul. Le script de typecheck appelle `effect-tsgo tsc@<version du catalogue>`. TypeScript 7.1 attend sa sortie stable et son support.
- **Pourquoi.** Avec un TypeScript hors support installé, `effect-tsgo tsc` retombe sur 7.0.2, code 0, sans avertissement [V contra] ; `effect-tsgo tsc@<version>` sort en code 1 avec un message clair [V contra]. oxlint sort environ une mineure par semaine [V changelog]. **Écarté :** plages `^` ; TypeScript 7.1 beta. **Non vérifié :** date de 7.1 stable. **Coût.** aucune dépendance ; des PR de mise à jour groupées à relire.
- **Contradicteur (à modifier).** Groupe unique incohérent ; contrôle plus simple disponible. **Arbitrage :** suivi.
- **Preuve.** Branche d'essai avec un TypeScript hors support : le typecheck sort en non-zéro avec le message de support. **Changerait d'avis :** une matrice de support lisible par machine.

#### OUTILLAGE-3 — Pas d'alias TypeScript 6 pour Stryker
- **Q.** Faut-il un alias TS 6 ? **Proposition.** Non. La réactivation du score de mutation sur `domain` est une **décision séparée du propriétaire** (§10), à prendre avec l'essai E9 : sandbox (pas `inPlace` en local), tsconfig étendu par nom de paquet, `tsconfigFile` vers un fichier absent.
- **Pourquoi.** Stryker 10.1.1 plante sur `ts.parseConfigFileTextToJson` avec TS 7 ; avec `tsconfigFile` absent, 7 mutants tués sur 7 sous Vitest 5.0.3 [V spike1]. Le changelog 10.1.0 annonce Vitest 5 [V]. TS 7.1 beta n'expose plus l'ancienne API à la racine [V spike4]. Stryker exige Node 22 [V]. **Écarté :** alias (brouille la résolution de `typescript`). **Non vérifié :** cas monorepo ; score sur un vrai `domain`. **Coût.** aucun maintenant ; la mutation, si elle revient, demande Node 22 et un job long.
- **Contradicteur (à modifier).** Hors lot pour la mutation ; `inPlace` dangereux avec des worktrees ; 7/7 ne prouve pas la correction du bug de score. **Arbitrage :** suivi.
- **Preuve.** Rejouer le banc de PRACTICES §9 (30 % au lieu de 95 %) : même score que sous Vitest 4 à ±2 points, et un mutant non couvert survit. **Changerait d'avis :** échec du contournement dans le monorepo.

#### OUTILLAGE-4 — `@shadcn/lint` à l'étape web
- **Q.** L'adopter maintenant ? **Proposition.** Oui, à la création de `apps/web`, version exacte 0.2.5, configuré **dans `apps/web` seulement** (config imbriquée ou override, à vérifier), avec les six règles en `error` et la politique globale `allow: ["layout"]`. Le sort de `components/ui` généré est décidé explicitement. Contrats `no-restyle` : dans l'option `contracts` de la règle (`{ pattern: "^CardTitle$", allow: ["layout", "typography"] }`, par nom de composant [V README 0.2.5]), dans la config oxlint de `apps/web` ; un contrat par composant au premier besoin réel, jamais d'avance, avec un `message` qui dit quoi utiliser. Le test de garde vérifie que chaque `pattern` vise un composant de `components/ui` ; CODEOWNERS sur cette config.
- **Pourquoi.** Sans code existant, l'adoption ne coûte presque rien. Avec oxlint 1.93.0, les quatre violations témoins sont signalées, sous Node et `bun --bun` [V spike3]. Les plugins JS d'oxlint sont alpha depuis 1.55.0 [V changelog]. **Écarté :** attendre une 1.0 ; contraintes par les types ; contrats écrits d'avance. **Non vérifié :** temps de lint ; composants générés par la CLI shadcn (valeurs arbitraires probables [M]). **Coût.** une dépendance d'outillage 0.x à suivre de près ; surcoût de lint non mesuré.
- **Contradicteur (à modifier).** Pas dans la config de base partagée avec le serveur. **Arbitrage :** suivi.
- **Preuve.** Fichier témoin par règle ; aucun faux positif sur les composants générés (ou exclusion décidée) ; le plugin ne se charge pas sur `apps/server` ; surcoût mesuré sur le pre-commit réel. **Changerait d'avis :** un surcoût qui sort du budget du pre-commit (passer en pre-push).

#### OUTILLAGE-5 — `fallow` pour les frontières et la duplication
- **Q.** `fallow` peut-il remplacer le script de structure ? **Orientation.** Un seul outil pour les frontières (cohérence n° 1). `fallow` en version exacte, la dernière publiée depuis plus de 7 jours au moment de l'essai E3 (3.43.1, essayée, date du 14 novembre [V]), si E3 passe : zones du graphe de STRUCTURE-2, `allowTypeOnly` pour `web → server`, `package-cycle` actif, `circular-dependencies` coupée. `fallow dupes` en rapport non bloquant. Lancé par sous-commandes explicites, seulement en `gate:ci` et dans un job sans secrets ; en local, seulement par une commande explicite, jamais par un hook. Les niveaux commit et push gardent les interdits par nom de module d'oxlint. Sinon, le script maison de STRUCTURE-2, à tous les niveaux.
- **Pourquoi.** Sur un mini-monorepo au format Bun, `fallow` trouve les workspaces, signale `domain → server` et le cycle de packages [V spike2] ; 299 lignes dupliquées sur le prototype [V]. Licence MIT [V]. **Écarté :** dependency-cruiser ; doublon script + oxlint. **Non vérifié :** vrai `bun.lock` et `node_modules` ; README qui ne cite que npm, yarn, pnpm [V contra]. **Coût.** un binaire natif de plus si retenu, sinon un script maison à écrire et tenir ; un job CI sans secrets.
- **Contradicteur (à modifier).** DAG faux pour Eden ; un seul mainteneur détient tout (GOVERNANCE.md [V]) et un binaire natif tournerait en CI (M-12) ; une dépendance déclarée mais non importée échappe à `fallow`. **Arbitrage :** suivi ; d'où une confiance faible et une orientation plutôt qu'un choix. Knip couvre les dépendances non importées.
- **Preuve.** E3 : avec un vrai `bun install`, l'import de type `App` passe, un import de valeur depuis `@azimut/server` échoue, `@azimut/testing` dans un fichier non test échoue, aucun faux positif, moins de 2 s. Comparer en 30 min avec l'installation isolée de Bun [M]. **Changerait d'avis :** une violation manquée ou une rupture de configuration.

#### OUTILLAGE-6 — Un seul outil par règle
- **Q.** Comment répartir les règles qui se recoupent ? **Proposition.** Une table gardée par test : complexité et tailles → oxlint ; cycle de fichiers → oxlint `import/no-cycle` ; frontières et `package-cycle` → l'outil de OUTILLAGE-5 ; APIs Bun hors serveur et pureté de `domain` → oxlint (STRUCTURE-3) ; `unstable/*` → `@effect/tsgo` ; code mort et dépendances inutilisées → Knip ; catalogue → script de catalogue ; suppressions ajoutées et seuils baissés → contrôle C-18 seul. Après la démonstration, comparer `fallow dead-code` et Knip.
- **Pourquoi.** Sur le prototype, `fallow` donne 58 constats de complexité, oxlint 32 + 22 [V] : deux outils, deux comptes. **Écarté :** tout confier à `fallow` ; garder les doublons. **Non vérifié :** `import/no-cycle` entre workspaces. **Coût.** un test de garde à mettre à jour à chaque règle.
- **Contradicteur (à modifier).** Noms de règles inexacts (`circular-dependencies` et `package-cycle` sont distinctes [V schema.json]) ; règles oubliées. **Arbitrage :** suivi.
- **Preuve.** Le test de garde échoue si l'on réactive une règle dans un second outil ou si l'on en coupe une sans relais. **Changerait d'avis :** `fallow dead-code` égal à Knip (on retire Knip).

#### OUTILLAGE-7 — slop-scan écarté
- **Q.** L'adopter ? **Proposition.** Non. Analyse ponctuelle possible, dans un conteneur jetable. **Pourquoi.** 0.3.0 d'avril 2026, 3 versions, dépend de `typescript ^5.8.3` [V] ; règles recoupées par la pile. **Écarté :** signal de tendance, contrôle `delta`. **Coût.** aucun. **Contradicteur (confirmée).** Retirer sa mention de OUTILLAGE-9 (fait). **Arbitrage :** confirmée. **Preuve.** Après la démonstration : au moins 5 constats justes inédits, moins de 20 % de faux positifs. **Changerait d'avis :** une version récente sans TS 5.

#### OUTILLAGE-8 — slopo écarté
- **Q.** Détection sémantique par embeddings ? **Proposition.** Non ; `fallow similar-code` en réserve, hors CI. **Pourquoi.** slopo est en Python, AGPL-3.0, passe par une API d'embeddings ou Ollama [V PyPI, README]. **Écarté :** slopo local ou par API. **Coût.** aucun. **Contradicteur (confirmée).** **Arbitrage :** confirmée. **Preuve.** Après la démonstration : une paire réellement redondante trouvée en moins de 5 min, sans réseau. **Changerait d'avis :** des duplications de logique trouvées en revue.

#### OUTILLAGE-9 — Plafonds 12, 80 et 600
- **Q.** Comment régler les plafonds de GOALS ? **Proposition.** `complexity` `{max: 12, variant: "classic"}`, `max-lines-per-function` 80, `max-lines` 600 (lignes vides et commentaires ignorés), `import/no-cycle`, tout en `error`, tests compris, sans override qui relâche. Une liste unique de fichiers générés ignorés (`routeTree.gen.ts`, sortie Paraglide, composants shadcn générés), partagée par oxlint, l'outil de frontières et Knip, gardée par test.
- **Pourquoi.** oxlint applique ces règles [V spike1]. Le prototype a 32 fonctions au-dessus de 12 et 22 au-dessus de 80 lignes (jusqu'à 396) [V] : les plafonds imposent un style. **Écarté :** variante `modified` (à reconsidérer pour `domain`) ; exempter les tests. **Coût.** aucune dépendance ; découpages imposés au portage (32 et 22 fonctions hors plafond dans le prototype).
- **Contradicteur (à modifier).** Fichiers générés oubliés ; garde-fou slop-scan incohérent ; preuve limitée à `domain`. **Arbitrage :** suivi. Contre les fonctions passe-plat, il ne reste que la revue : c'est dit.
- **Preuve.** Sur les deux premiers modules (`domain` et un écran web) : nombre de fonctions refusées et de découpages, relus par un humain. **Changerait d'avis :** plusieurs fonctions exhaustives du moteur bloquées malgré un bon découpage (`modified` pour `domain` seulement).

## 4. Organisation du code et niveaux de contrôle

Mesures sur le prototype (4 cœurs) : oxlint 0,07 s, oxfmt 0,11 s, tsc 7 entre 0,67 et 1,0 s, 313 tests du noyau en 2,4 s ; `vitest related` sur un fichier du noyau : 189 s [V].

#### STRUCTURE-1 — Dossiers par fonctionnalité dans les applications
- **Q.** Package ou dossier par fonctionnalité ? **Proposition.** `src/socle/` et `src/features/<f>/` dans chaque app ; `routes/` mince qui compose. Au départ : `cours`, `grille`, `saisie`, `resultats`. `observations` et `historique` quand on les écrit. Diffusion temps réel dans le socle. `contracts` découpé avec les mêmes noms, par sous-chemins ; `domain` découpé par concept de calcul. Comptes de démonstration dans le seed (`tools/`), gardé par `DEPLOY_ENV`, jamais dans `features/cours`.
- **Pourquoi.** Même logique que le layout décidé (package au second consommateur). Un package par fonctionnalité ferait environ 12 packages [D]. **Écarté :** package par fonctionnalité, découpage par couche, Feature-Sliced Design. **Non vérifié :** durée des tests serveur à l'échelle. **Coût.** aucun ; un `index.ts` par fonctionnalité.
- **Contradicteur (à modifier).** Comptes de démonstration livrés en production (C-02) ; frontières figées sans preuve ; critère trop faible. **Arbitrage :** suivi.
- **Preuve.** Après `grille`, ajouter `saisie` : le diff touche `features/saisie` dans chaque app, `contracts/saisie`, `routes/`, seulement l'`index.ts` de `grille`, aucun fichier du socle, aucune exception. **Changerait d'avis :** un second consommateur d'une fonctionnalité.

#### STRUCTURE-2 — Graphe de dépendances déclaré une fois
- **Q.** Quelle règle protège le découpage ? **Proposition.** Un seul fichier de graphe. Packages : `config` sans dépendance ; `contracts` → valibot, uuid ; `domain` → `contracts` en type seul ; `env` → valibot ; `testing` → contracts, domain, env ; `server` → contracts, domain, env ; `web` → contracts, domain, env, et `server` en type seul par une entrée unique. `testing` importable depuis les tests et `tools/` seulement. Fonctionnalités : `grille` → `cours` ; `saisie` → `grille`, `cours` ; `resultats` → `saisie`, `grille`, `cours` ; accès par `index.ts`. Un seul outil l'applique (OUTILLAGE-5).
- **Pourquoi.** Les motifs oxlint sont textuels : `!./*` donne des faux positifs, `!./**` laisse passer une sortie relative, et un `regex` à lookahead ne signale rien, sans erreur [V contra]. `allowTypeImports` fonctionne [V]. `turbo boundaries` est expérimental [V]. **Écarté :** deux mécanismes ; convention écrite. **Non vérifié :** l'import de type `App` oblige-t-il le web à charger les types Bun ou Drizzle ? **Coût.** un fichier de graphe ; l'outil de OUTILLAGE-5 ; une demi-journée pour E1.
- **Contradicteur (à modifier).** Deux sources qui divergent ; graphe figé trop tôt ; import de type non prouvé. **Arbitrage :** suivi ; le choix entre `fallow` et script reste à l'essai E3. Le graphe est à valider par le propriétaire (« `domain` → `contracts` » n'est décidé nulle part).
- **Preuve.** Spike E1 (une demi-journée) : `tsc` du web passe avec `types: []` sans types Bun ni Drizzle, sinon entrée de types dédiée. Fixtures qui violent chaque règle, plus une config piégée qui doit faire échouer le test. **Changerait d'avis :** des exceptions dès la première tranche.

#### STRUCTURE-3 — Pureté de `domain` et confinement de Bun
- **Q.** Comment imposer un `domain` pur et rejouable ? **Proposition.** Dans `packages/domain/**` hors tests : `no-restricted-imports` `["*", "!./**", "!../**"]` + `@azimut/contracts` en `allowTypeImports` ; `no-restricted-globals` (`Date`, `Bun`, `fetch`, `window`, `document`, `crypto`) ; `no-restricted-properties` (`Math.random`, `performance.now`). tsconfig de `domain` : `types: []`, `lib` sans `dom`. Partout sauf `apps/server/src/socle/**` : `bun`, `bun:*` et `Bun` interdits ; le WebSocket passe par le socle ou Elysia.
- **Pourquoi.** 18 §7 et §10 ; TODO « APIs Bun ». oxlint 1.93.0 signale ces usages [V]. Le noyau du prototype les respecte hors tests [V grep]. **Écarté :** revue seule. **Coût.** aucune dépendance ; des réglages oxlint par zone et un tsconfig.
- **Contradicteur (à modifier).** Forme exacte du motif ; tsconfig restreint gratuit. **Arbitrage :** suivi.
- **Preuve.** Fixtures dans `oxlintrc.test.ts` ; un fichier qui utilise `window` fait échouer `tsc` du domaine ; le noyau porté passe. **Changerait d'avis :** une fonction qui dépend vraiment du temps (la date entre en paramètre).

#### STRUCTURE-4 — Pre-commit (`gate:commit`)
- **Q.** Que lance le pre-commit ? **Proposition.** Groupe `piped` : oxfmt sur `{staged_files}` avec `stage_fixed`. Puis groupe `parallel` : oxlint sans type-aware, `gitleaks git --pre-commit --redact --staged`, `turbo run typecheck` (sans `--affected`, avec cache), `vitest run --project domain` filtré par `glob`, contrôle de catalogue, et de structure si c'est le script maison (OUTILLAGE-5). Jamais `vitest related`, jamais de base. Budget : p95 sous 10 s, médiane sous 5 s.
- **Pourquoi.** Mesures ci-dessus [V]. `--affected` compare `main...HEAD` et rien ne dit qu'il voit l'index [V doc turbo]. La syntaxe gitleaks vient de son `.pre-commit-hooks.yaml` [V]. gitleaks n'est pas un paquet npm : installé par un script épinglé avec somme de contrôle, listé dans un fichier unique de versions d'outils hors npm. **Écarté :** `vitest related` ; type-aware ; secretlint 14.0.0 (publié le jour même [V]). **Coût.** gitleaks, hors npm, à installer et épingler ; jusqu'à 10 s par commit.
- **Contradicteur (à modifier).** Course entre formateur et vérifications ; `--affected` peu fiable ici ; installation de gitleaks. **Arbitrage :** suivi.
- **Preuve.** 20 commits réels chronométrés ; un commit partiellement indexé et mal formaté : le fichier commité est formaté, les changements non indexés restent intacts. **Changerait d'avis :** un p95 au-dessus de 10 s sur trois semaines (tests du domaine en pre-push).

#### STRUCTURE-5 — Pre-push (`gate:push`)
- **Q.** Que lance le pre-push ? **Proposition.** Format en `--check`, oxlint type-aware, typecheck complet, Knip, structure (même réserve), catalogue, audit des docs, squawk sur les migrations modifiées, tests unitaires et d'intégration sur Postgres 18 (`TEST_DATABASE_URL`, ou le service compose s'il existe). **Pas d'e2e.** `cache: false` sur l'intégration, ou `env` et `inputs` complets. Un contrôle absent échoue avec un message, sans être sauté. Budget : p95 sous 3 min à cache chaud. Pour les agents cloud : Postgres 18 installé par `session-setup` (cohérence n° 13).
- **Pourquoi.** Cette session cloud a la CLI docker 29.9.2 mais pas de démon [V contra] : un pre-push qui exige Docker bloque les agents. Pendant un brouillon, la CI peut se lancer à la main (`workflow_dispatch`). **Écarté :** e2e en pre-push ; visuel en pre-push ; `--affected`. **Coût.** Postgres 18 sur chaque poste et chaque session d'agent ; jusqu'à 3 min par push.
- **Contradicteur (à modifier).** Agents bloqués ; budget non mesuré ; faux verts du cache. **Arbitrage :** suivi. Cela rouvre « pre-push : tous les tests » (§10).
- **Preuve.** `bun run gate:push` réussi dans une session cloud sans Docker ; 10 pushes chronométrés ; un test d'intégration jamais servi par le cache après un changement de migration. **Changerait d'avis :** Docker disponible partout et un p95 qui laisse la place à l'e2e.

#### STRUCTURE-6 — Contenu de `gate:ci`
- **Q.** Qu'ajoute la CI ? **Proposition.** `gate:push` + e2e + régression visuelle dans l'image Playwright épinglée + rapport de perf + contrôles de 27 (C-12, C-16, C-18 hors label, C-19, C-25) + `bun audit --audit-level=high` + gitleaks sur l'historique + `docker compose config --quiet` + `lefthook validate` + alignement de la version de Bun + construction des images. Exceptions limitées à la CI, listées dans le hook : CodeQL, la dérogation C-18 par label, la comparaison nocturne du ruleset. Côté CI, une matrice `lefthook run ci --job X` garde des contrôles requis par outil.
- **Pourquoi.** Un point d'entrée unique rend « tout tourne partout » vérifiable. `bun audit` et l'image Playwright demandent le réseau (dit). **Écarté :** YAML job par job sans point d'entrée local ; CodeQL en local. **Coût.** réseau en CI ; durée de la CI non mesurée.
- **Contradicteur (à modifier).** Le plan 27 existait ; d'autres contrôles limités à la CI ; ordre des jobs invérifiable. **Arbitrage :** suivi.
- **Preuve.** Même commit en local et en CI : même ensemble de jobs, même verdict ; un script compare les jobs du hook `ci` aux contrôles requis du ruleset. **Changerait d'avis :** un plan de sécurité qui ajoute ou retire des scans.

#### STRUCTURE-7 — Lefthook seule source des niveaux
- **Q.** Comment éviter de dupliquer la liste des contrôles ? **Proposition.** Un seul `lefthook.yml` : `pre-commit`, `pre-push` et un hook `ci` (puis `nightly`, §11). Scripts racine : `gate:commit`, `gate:push` (`--all-files`), `gate:ci`. `assert_lefthook_installed: true`. Hooks installés par un script racine explicite (`bun run lefthook install`), jamais par le postinstall du paquet. Le contrôle de structure vérifie, hors CI, que les hooks git appellent lefthook.
- **Pourquoi.** Lefthook lance un hook nommé et force tous les fichiers [V doc]. Le postinstall de lefthook 2.2.2 ne fait que `lefthook install`, se saute si `CI`, et ne fait qu'avertir en cas d'échec [V tarball]. Une `trustedDependencies` explicite (C-16) remplace la liste par défaut de Bun [V doc Bun]. **Écarté :** script maison ; turbo seul ; Husky. **Coût.** `lefthook`, déjà prévu ; un script `setup`.
- **Contradicteur (à modifier).** Installation fragile ; écart à PRACTICES §3 (« one gate script »). **Arbitrage :** suivi ; l'écart est signalé en §10.
- **Preuve.** Clone neuf avec `trustedDependencies: []`, `bun install`, `bun run setup` : hooks présents, commit fautif refusé ; en CI avec `--ignore-scripts`, `bun run gate:ci` lance lefthook. **Changerait d'avis :** Lefthook non fiable sous Bun.

## 5. Mesures : performance, régression visuelle et rapports de CI

Aucun gate de temps : décision prise. Les critères chiffrés ci-dessous sont des essais d'acceptation.

#### MESURES-1 — Fixture `bench` de Vitest 5 sous Bun
- **Q.** Quel outil de banc ? **Proposition.** `*.bench.ts` avec la fixture `bench`, lancés par `bun --bun vitest bench --run --reporter=json --outputFile=…`, lus par un script de `tools/`. Vitest épinglé exactement. Corriger TODO : `--outputJson` et `--compare` n'existent plus.
- **Pourquoi.** Essai sous Bun avec Vitest 5.1.0 : JSON avec p50, p99, rme, échantillons [V essai-bench, ctr-bench]. Suppressions documentées dans le guide de migration [V]. Config `benchmark` expérimentale [V]. **Écarté :** mitata (aucune version depuis février 2025 [V]) ; tinybench direct ; banc maison. **Non vérifié :** écart de classement entre JSC et V8. **Coût.** aucune dépendance ; configuration expérimentale à revoir à chaque mineure de Vitest.
- **Contradicteur (à modifier).** `writeResult`/`bench.from` ne font pas d'A/B ; les références du prototype viennent de Node 26 [V JSON du prototype]. **Arbitrage :** suivi (cohérence n° 11).
- **Preuve.** Portage de `noyau.bench.ts` : un résultat par banc, rme sous 5 % sous Bun. **Changerait d'avis :** une nouvelle rupture de l'API de banc.

#### MESURES-2 — A/B dans le même job
- **Q.** Comment comparer des temps ? **Proposition.** Un script de `tools/` crée un worktree de la merge-base, installe ses dépendances, alterne N fois `vitest bench` base et tête en processus séparés, rapporte le ratio des médianes et marque « pas de base » les bancs nouveaux. Empreinte machine dans le rapport. Pas de bridage CPU en CI. Job lancé seulement si `domain`, `contracts` ou `server` changent.
- **Pourquoi.** Un ratio sur la même machine se compare ; le bridage ×4 du prototype était approximatif (×4,02 logiciel) [V 21]. **Écarté :** environnement fixe, calibration, baseline par machine. **Non vérifié :** bruit d'un runner GitHub. **Coût.** un script non trivial (worktree, double installation) ; au moins le double du temps de banc sur les PR concernées.
- **Contradicteur (à modifier).** Mise en œuvre sous-estimée ; cas limites ; coût sur une PR de doc. **Arbitrage :** suivi.
- **Preuve.** Livrée avec le script : 10 A/A en CI et 10 en local, ratio médian dans ±5 % pour `evaluate` et `compile`. **Changerait d'avis :** un bruit A/A au-dessus de 10 % (CodSpeed sous Node).

#### MESURES-3 — Tendances reportées
- **Q.** Où stocker les tendances ? **Proposition.** Avant la démonstration : ratio A/B et coverage absolue seulement. C'est un **report d'une décision prise** (tendance perf et coverage, TODO). Après : branche orpheline `mesures` alimentée par un job sur push vers `main` (`contents: write` limité), protégée par une règle de ruleset.
- **Pourquoi.** Peu de commits, pas de valeur ; le ruleset actuel ne vise que la branche par défaut [V `gh api`] ; Pages désactivé [V]. **Écarté :** Bencher, artifacts, gh-pages, coverage de la base recalculée par PR (double les tests). **Coût.** aucun avant la démonstration ; ensuite un job avec `contents: write`.
- **Contradicteur (à modifier).** Report non dit ; double run coûteux ; branche non protégée. **Arbitrage :** suivi.
- **Preuve.** 5 pushes ajoutent 5 lignes sans conflit ; un job de PR ne peut pas écrire. **Changerait d'avis :** un besoin de tendance pour une décision d'architecture.

#### MESURES-4 — CodSpeed écarté
- **Q.** CodSpeed est-il une option ? **Proposition.** Non, tant que l'A/A tient. **Pourquoi.** Le blocage `vite ^7` est levé (pairs vite ^4 à ^8, vitest ^5) [V], mais `@codspeed/core` est un addon N-API pour Node, sans mention de Bun [V clone]. **Écarté :** CodSpeed sous Node (réserve). **Coût.** aucun. **Contradicteur (confirmée).** **Arbitrage :** confirmée. **Preuve.** Pour rouvrir : deux runs du même commit sous Node à moins de 1 % d'écart. **Changerait d'avis :** A/A trop bruité.

#### MESURES-5 — Nombre de requêtes et plans
- **Q.** Quels indicateurs déterministes pour les requêtes ? **Proposition.** Une couture d'injection du logger Drizzle côté serveur ; un compteur dans `testing` ; `toBeLessThanOrEqual(n)` sur les seules routes lourdes. Monter `n` passe par C-18. Résumé `EXPLAIN` sur le profil ×5 et `pg_stat_statements` après la démonstration.
- **Pourquoi.** Le `Logger` de rc.5 se réduit à `logQuery(query, params)` fixé à la construction [V tarball]. `≤ n` attrape un N+1 sans bloquer un gain. **Écarté :** temps seul ; `pg_stat_statements` en test ; snapshot complet du plan. **Coût.** aucune dépendance ; une couture d'injection ; un `n` à tenir par route lourde.
- **Preuve.** Route N+1 contre jointure : 1 + n contre 1, deux runs identiques. **Changerait d'avis :** un test jugé « gate déguisé » par le propriétaire.

#### MESURES-6 — Volume réel et ×5
- **Q.** Quel volume de base ? **Proposition.** Profil `reel` : 5 cours, 40 apprenants, 10 formateurs, une qualification de 7 × 60 indicateurs, soit environ 17 000 notes **par cours** (bornes hautes de FEATURES). Nombre de grilles par qualification, qualifications par personne, sites et saisons d'historique : paramètres à faire confirmer. ×5 sur les cours et l'historique. Profil `extreme` à 200 apprenants pour le client.
- **Pourquoi.** FEATURES dit 17 000 notes par cours [V]. Le corpus réel a 156 à 264 nœuds de données par participant [V 21] : `reel` est déjà un maximum. **Écarté :** ×5 sur la grille ; attendre un cours réel. **Coût.** une réponse du porteur.
- **Contradicteur (à modifier).** Erreur de lecture (par grille) ; axes oubliés. **Arbitrage :** suivi.
- **Preuve.** Le porteur confirme les chiffres ; le générateur imprime le nombre de lignes par table. **Changerait d'avis :** une qualification réelle remplie ; la durée de conservation.

#### MESURES-7 — Générateur déterministe partagé
- **Q.** Un générateur unique ? **Proposition.** Oui, dans `packages/testing` : graine et profil (`demo`, `reel`, `x5`, `extreme`), PRNG sfc32 du prototype, entités typées par `contracts`, UUIDv7 dérivés de la graine, noms fictifs inventés et relus. Le seed passe par un point d'entrée séparé (tâche ponctuelle), jamais par l'image applicative. **Pourquoi.** `generer` est pur et déterministe [V 26] ; la carte prévoit ses participants [V]. **Écarté :** un seed par usage ; Faker. **Coût.** aucune dépendance ; un générateur à écrire et tenir. **Contradicteur (confirmée).** Point d'entrée séparé, prénoms fictifs. **Arbitrage :** confirmée avec ces précisions. **Preuve.** Même sha256 sur deux runs Bun et un run dans Chromium ; profil `x5` en moins de 10 s. **Changerait d'avis :** un récit de démonstration écrit à la main (fichier fixe par-dessus).

#### MESURES-8 — Fonctions et requêtes lourdes
- **Q.** Quoi mesurer d'abord ? **Proposition.** Bancs de fonctions : `compile`, `evaluate` et `explain` (participant puis cours), copie avec report, rejeu pur. Mesures DB (nombre de requêtes d'abord, temps en complément) : chargement d'un cours, écriture avec historique.
- **Pourquoi.** La copie est le pire cas mesuré (11 à 12,5 s, jeu hors échelle) [V 21]. **Écarté :** attendre la fin du domaine. **Coût.** temps de CI des bancs, non mesuré.
- **Contradicteur (à modifier).** Références Node ; bancs DB à séparer. **Arbitrage :** suivi.
- **Preuve.** Chaque mesure dans le rapport de la tranche, rme sous 5 % ou marquée « bruyante ». **Changerait d'avis :** la spec des exports.

#### MESURES-9 — Projet téléphone pour la saisie
- **Q.** Le viewport unique suffit-il ? **Proposition.** Non (rouvre TODO). Second projet Chromium avec `isMobile`, `hasTouch`, largeur 390 ou 360 px, `deviceScaleFactor` 2. Plafond : 15 **captures** au total.
- **Pourquoi.** La démonstration saisit sur téléphone [V carte 01] ; la page d'accès rapide est pensée pour le téléphone [V 22]. `Pixel 7` donne 412×839 à ×2,625 [V tarball] : images lourdes et sensibles. **Écarté :** 1920×1080 seul ; deux viewports partout ; descripteur iPhone (WebKit). **Coût.** un second projet Playwright ; des captures en plus pour les écrans de saisie, dans le plafond de 15.
- **Preuve.** 20 runs sans différence ; débordement volontaire à 360 px détecté. **Changerait d'avis :** un défaut propre à WebKit (e2e fonctionnel WebKit).

#### MESURES-10 — Chromium seul pour les captures
- **Q.** Combien de moteurs ? **Proposition.** Chromium seul ; la compatibilité relève de l'e2e fonctionnel. **Pourquoi.** Trois moteurs triplent les images sans attraper plus de régressions de notre code [D]. Image `mcr.microsoft.com/playwright` v1.65.1 disponible [V]. **Écarté :** trois moteurs ; Chromium + WebKit. **Coût.** aucun. **Contradicteur (confirmée).** **Arbitrage :** confirmée. **Preuve.** Suivi : aucun bug visuel propre à un moteur pendant les premiers cours. **Changerait d'avis :** un bug WebKit signalé.

#### MESURES-11 — Pas de Git LFS
- **Q.** LFS pour les PNG ? **Proposition.** Non ; alerte à 50 Mo d'historique, LFS au-delà de 100 Mo. **Pourquoi.** Environ 15 images [M taille estimée] ; LFS ajoute de la friction ; dépôt public [V]. **Écarté :** LFS dès le départ ; images hors dépôt. **Coût.** aucun. **Contradicteur (confirmée).** Seuil d'alerte plus bas. **Arbitrage :** retenu. **Preuve.** Premier jeu sous 10 Mo (`du -sh`, `git count-objects -vH`). **Changerait d'avis :** des captures bien plus lourdes.

#### MESURES-12 — Mise à jour des références
- **Q.** Comment mettre à jour les images ? **Proposition.** `bun run e2e:docker -- --update-snapshots=changed` sur la même pile compose que MESURES-15, plateforme `linux/amd64` forcée ; rapport HTML en artifact. Pas d'Action par label. **Pourquoi.** Le mode `changed` existe dans Playwright 1.65.1 [V contra]. **Écarté :** Action par label ; mise à jour hors Docker. **Coût.** Docker en local pour mettre à jour les images. **Contradicteur (confirmée).** **Arbitrage :** confirmée. **Preuve.** Couleur modifiée : CI rouge, script qui ne touche que les images concernées, CI verte. **Changerait d'avis :** plus de deux mises à jour par semaine.

#### MESURES-13 — Zones volatiles
- **Q.** Comment stabiliser les captures ? **Proposition.** `animations: 'disabled'`, `caret: 'hide'`, `page.clock.setFixedTime` (pas `install` complet), graine fixe, polices auto-hébergées, `stylePath` unique sur un attribut de marquage, tolérance par défaut ; un relâchement par capture passe par C-18. **Pourquoi.** Options présentes dans Playwright 1.65.1 [V]. **Écarté :** seuil global élevé ; masques par test. **Non vérifié :** interaction de l'horloge avec le WebSocket. **Coût.** aucun. **Contradicteur (confirmée).** **Arbitrage :** confirmée. **Preuve.** 20 runs en CI, 0 différence. **Changerait d'avis :** une page instable malgré tout (sortie des captures).

#### MESURES-14 — Visuel bloquant
- **Q.** Bloquant ou indicatif ? **Proposition.** Bloquant, dans le check e2e requis. Repli : captures instables déplacées dans un projet `visuel-indicatif` lancé par un job non requis, sous label humain (C-18) et avec un ticket.
- **Pourquoi.** Un contrôle indicatif finit par ne plus être lu [D]. **Écarté :** indicatif ; contournement par label. **Coût.** une PR bloquée à chaque faux échec ; un projet de repli à tenir.
- **Contradicteur (à modifier).** `expect.soft` fait quand même échouer le test [M]. **Arbitrage :** suivi.
- **Preuve.** Celle de MESURES-13, puis moins d'un faux échec sur 50 runs le premier mois. **Changerait d'avis :** plus d'un faux échec sur 50 après correction.

#### MESURES-15 — E2E local dans Docker
- **Q.** Comment lancer l'e2e dans Docker en local ? **Orientation (preuve d'abord).** Service `e2e` dans le projet compose e2e par slot, image `mcr.microsoft.com/playwright:v<version>-noble`, `bun run e2e:docker`, contrôle CI que l'image suit `@playwright/test` du catalogue (1.65.1 ; PRACTICES cite encore 1.63). Pas de devcontainer.
- **Pourquoi.** Même image partout ; tags disponibles en amd64 et arm64 [V]. **Écarté :** devcontainer ; Playwright sur l'hôte. **Non vérifié :** l'image fournit Node, pas Bun ; temps de build. **Coût.** Docker en local ; une image Playwright lourde à télécharger.
- **Contradicteur (preuves insuffisantes).** La forme du service dépend du runtime du runner. **Arbitrage :** suivi.
- **Preuve (en premier).** Essai E10 d'une heure : `bun --bun playwright test` dans l'image avec un binaire Bun copié, contre runner sous Node. Sinon, exception Node écrite dans GOALS. Puis : machine propre, moins de 3 min à cache chaud, images identiques à la CI. **Changerait d'avis :** un temps local au-delà de 3 min (stack réutilisée).

#### MESURES-16 — Un seul commentaire de PR
- **Q.** Comment publier coverage, visuel et perf ? **Proposition.** Chaque job publie un JSON en artifact ; un job `rapport` (`needs`, `if: always()`) assemble le Markdown dans `$GITHUB_STEP_SUMMARY` et retrouve son commentaire par un marqueur caché via `gh api` (PATCH ou POST), dans un script de `tools/`. Variables par `env:` (pas de `${{ }}` dans `run:`, C-16). Étape sautée sur les forks. Coverage : un seul run Vitest à la racine avec `projects`.
- **Pourquoi.** `--edit-last` édite le dernier commentaire de l'utilisateur courant [V aide gh 2.89.0], donc celui d'un autre workflow du bot. **Écarté :** `--edit-last` ; action sticky (repli) ; une action de coverage par outil. **Coût.** un script de `tools/` ; `pull-requests: write` sur un job.
- **Preuve.** Trois pushes : un seul commentaire mis à jour ; un autre commentaire du bot n'est pas modifié ; le job `rapport` passe même si l'e2e échoue. **Changerait d'avis :** besoin de commenter les PR de forks.

#### MESURES-17 — Pas de CI en brouillon
- **Q.** Comment réaliser la décision ? **Proposition.** `pull_request` types `[opened, synchronize, reopened, ready_for_review]`, `if: github.event.pull_request.draft == false` par job, `concurrency` `${{ github.workflow }}-pr-<n>` avec annulation, plus `push: branches: [main]` sans condition, et `workflow_dispatch` pour un brouillon. **Pourquoi.** Un groupe partagé ferait s'annuler les workflows entre eux [D]. **Non vérifié :** absence d'`if` au niveau du workflow ; job sauté compté réussi [M]. **Coût.** aucun ; un `if` à ne pas oublier par job. **Preuve.** Brouillon : jobs « skipped » ; passage en revue : jobs lancés ; deux workflows de la même PR ne s'annulent pas. **Changerait d'avis :** besoin de retour CI automatique sur brouillon.

## 6. Écritures, coupures de réseau et transport temps réel

Faits de base : `@tanstack/db` est passé en 1.0.0-rc.1.5 (latest, 11 novembre ; première RC le 29 octobre) ; PRACTICES cite encore 0.11.3 [V]. Tant qu'une transaction est en cours d'envoi, une écriture distante sur une autre ligne de la même collection reste invisible [V essai, relancé par le contradicteur ; documenté].

#### ECRITURES-1 — Idempotence par `writeId`
- **Q.** Comment traiter une écriture reçue deux fois ? **Proposition.** Chaque écriture porte un `writeId` UUIDv7 (champ du contrat d'écriture), clé primaire de la ligne d'historique, écrite en premier dans la même transaction (`ON CONFLICT DO NOTHING`). Ordre : session, `can()` sur le cours, existence du `writeId` (même auteur et même contenu, sinon 422), verrou, écriture. Un doublon répond succès avec **l'état courant** de la case et sa version serveur.
- **Pourquoi.** Avec le dernier gagnant, un rejeu non dédupliqué écrase une écriture plus récente [D]. Pas de table d'idempotence : l'historique existe. **Écarté :** en-tête et table dédiée ; pas d'idempotence ; contrôle optimiste 409 (rouvrirait le dernier gagnant). **Non vérifié :** coût de l'`INSERT … ON CONFLICT` + relecture. **Coût.** aucune table ; une relecture de plus par doublon.
- **Contradicteur (à modifier).** Rendre l'état de l'écriture rejouée réinjecte une valeur périmée ; réautorisation exigée par C-07 ; ordre des contrôles. **Arbitrage :** suivi.
- **Preuve.** A, puis B, puis A rejouée : valeur finale B, deux lignes d'historique, réponse au rejeu = valeur et version de B ; rejeu par un formateur retiré refusé ; rejeu après verrouillage par B = succès sans modification. **Changerait d'avis :** des écritures sans ligne d'historique.

#### ECRITURES-2 — Rejeu maison en mémoire pour la grille
- **Q.** Comment ne perdre aucune saisie pendant une coupure courte, onglet ouvert ? **Proposition.** Le `mutationFn` appelle Eden dans une boucle Effect `Schedule.exponential` (0,5 s, plafond 10 s, jitter) sur erreurs transitoires (réseau, délai, 5xx, 429). Une file par case : une nouvelle saisie remplace celle en attente, envois en série. Relance immédiate à la reconnexion du WebSocket, sur `online` et sur `visibilitychange`. `401` : pause, reconnexion, même utilisateur, reprise. `CELL_LOCKED`, validation, `403` : annulation avec avis. Plafond de tentatives, puis avis. Indicateur « non envoyé » sur `$hasPendingWrites`. Pas d'`offline-transactions` pour la grille.
- **Pourquoi.** L'exigence s'arrête à l'onglet ouvert (TODO). `offline-transactions` : FIFO strict, une transaction à la fois, `maxRetries` infini, délai jusqu'à 60 s, politique par texte du message [V code] ; onglet suiveur sans file [V doc]. TanStack DB ne retente pas [V doc]. **Écarté :** `offline-transactions` partout ; ne rien faire ; collection locale séparée. **Non vérifié :** onglet en arrière-plan sur téléphone. **Coût.** aucune dépendance ; une file maison à écrire et tester (deux à trois jours).
- **Contradicteur (à modifier).** Ordre des saisies d'une même case ; `401` qui perd les saisies (C-35) ; mobile. **Arbitrage :** suivi.
- **Preuve.** E2E à deux contextes : 5 saisies hors ligne, retour après 20 s, valeurs en base, une ligne d'historique par saisie, visibles chez B en moins de 2 s ; 3 puis 4 sur la même case hors ligne donnent 4 partout sur 20 répétitions ; session expirée pendant la coupure : les saisies partent après reconnexion. **Changerait d'avis :** survie au rechargement exigée pour la grille.

#### ECRITURES-3 — Dernier gagnant à l'arrivée, refus visibles
- **Q.** Que se passe-t-il quand un rejeu arrive après un collègue ou sur une case verrouillée ? **Proposition à soumettre au porteur au grilling 05** (27 §8) : garder le dernier gagnant à l'arrivée (moment serveur dans l'historique) ; verrou libéré à la coupure (en mémoire, lié à la connexion) : au retour, A écrit sans verrou. La durée et l'inactivité des verrous restent une question de domaine ouverte (TODO, Domaine). Hors grilling : un refus permanent annule l'écriture et laisse la valeur dans un avis non bloquant (réessayer, copier). La variante `CELL_LOCKED` dépend aussi du grilling 05.
- **Pourquoi.** Conforme au dernier gagnant (TODO). **Écarté :** heure du client ; refus 409. **Coût.** aucun code de plus ; une décision du porteur.
- **Contradicteur (à modifier).** La règle n'est tenue que si la version est serveur (ECRITURES-4) ; vérifier les écrans. **Arbitrage :** suivi.
- **Preuve.** A hors ligne saisit 3, B saisit 5, A revient : base, A et B affichent 3 ; historique 5 puis 3. **Changerait d'avis :** des écrasements constatés en usage réel.

#### ECRITURES-4 — WebSocket maison, version serveur, sans Electric
- **Q.** Comment les saisies arrivent-elles chez l'autre formateur ? **Proposition.** Collections `queryCollectionOptions` chargées par Eden. Après le COMMIT, le serveur publie sur un sujet par grille la ligne complète de la case (message validé par `contracts`). Colonne Drizzle `integer('version').notNull().default(0)`, incrémentée dans la transaction (`UPDATE … SET version = version + 1 RETURNING`), exposée par HTTP, WebSocket et refetch comme un `number` : contrat `v.pipe(v.number(), v.integer(), v.minValue(0))`, comparaison numérique côté client. Pas de `bigint` : JSON ne le transporte pas et CONTRATS-1 le refuse ; 2³¹ modifications d'une case n'arriveront pas [D]. Le client applique par `writeUpsert` et ignore toute version inférieure ou égale. Abonnement par `can()` et suite C-06. Electric écarté. Écart assumé à PRACTICES §2 (« IDs plus version ») ; au passage à LISTEN/NOTIFY, on notifiera l'ID.
- **Pourquoi.** Une instance ; le WebSocket existe pour verrous et présence. Electric : service, `wal_level=logical`, rôle REPLICATION, stockage, et toujours en sync-service 1.8.1 [V tags] ; `@electric-sql/client` 1.5.28 depuis le 9 septembre [V]. `writeUpsert` existe [V doc]. **Écarté :** Electric ; IDs puis refetch ; SSE. **Non vérifié :** débit de `server.publish` à 50 clients. **Coût.** une colonne et un `RETURNING` par écriture ; un canal WebSocket maison à tenir.
- **Contradicteur (à modifier).** Version tirée de l'horloge du client (rejeu tardif mal affiché, writeId de 2099 qui fige une case). **Arbitrage :** suivi (cohérence n° 7).
- **Preuve.** 100 saisies entre un ordinateur et un téléphone en 4G sur l'instance de démonstration : p95 sous 1 s (essai, pas gate), écrans et base identiques à la fin ; rejeu tardif, horloge décalée d'une heure et `writeId` futur sans effet sur l'ordre ; abonné sans droit : aucun message. **Changerait d'avis :** plusieurs instances ; un vrai hors ligne exigé.

#### ECRITURES-5 — File des observations : ouvert
- **Q.** Comment tenir le ticket 06 (brouillon après fermeture, envoi différé, rejeu double = une observation) ? **Orientation.** Brouillon en `localStorage` sous clé (utilisateur, cours), avec try/catch. Pour la file : décider quand les observations entrent dans le périmètre, entre une file maison dans le même stockage (relue au démarrage, `online`, `visibilitychange`) et `offline-transactions` 1.2.1. Idempotence par l'ID de l'observation ; moment d'origine validé et borné (C-07). Purge à la déconnexion (C-35).
- **Pourquoi.** Créations indépendantes et idempotentes : l'élection d'onglet n'est pas nécessaire, une file maison peut suffire. `offline-transactions` s'installe sous Bun avec la RC [V]. **Non vérifié :** Safari iOS et Chrome Android. **Coût.** un essai sur deux téléphones réels ; une dépendance si `offline-transactions` gagne.
- **Contradicteur (preuves insuffisantes).** Le choix par défaut n'est pas évident ; deux stockages à purger. **Arbitrage :** suivi.
- **Preuve (en premier).** Même essai pour les deux candidats sur un vrai iOS et un vrai Android : 3 observations hors ligne, navigateur tué, réseau rétabli, exactement 3 en base avec leur moment ; purge à la déconnexion ; refus pour un autre utilisateur. Prendre le plus simple qui passe. **Changerait d'avis :** même durabilité exigée pour la grille.

#### ECRITURES-6 — Refetch à la reconnexion
- **Q.** Comment rattraper les messages perdus ? **Proposition.** À la reconnexion : relancer d'abord les écritures en attente, puis `collection.utils.refetch()` (avec un debounce). `refetchOnWindowFocus` et `refetchOnReconnect` choisis explicitement. Indicateur de connexion permanent pendant la saisie. **Pourquoi.** Messages non durables ; un fetch démarré avant une écriture directe acceptée ne peut pas la défaire [V doc]. **Écarté :** route `since=` ; flux durables. **Coût.** un refetch complet par reconnexion, non mesuré au profil réel. **Contradicteur (confirmée).** Ajouter un message pendant le refetch. **Arbitrage :** confirmée avec ce cas. **Preuve.** B déconnecté, 10 saisies chez A : visibles chez B en moins de 3 s ; un message pendant le refetch garde la valeur la plus récente. Banc du refetch de 17 000 cases avec le banc de perf. **Changerait d'avis :** refetch au-delà de 1 s sur téléphone au profil ×5.

#### ECRITURES-7 — Écrire par HTTP
- **Q.** HTTP ou WebSocket pour écrire ? **Proposition.** HTTP typé par Eden (auth, `can()`, enveloppe, idempotence, Origin et `Sec-Fetch-Site` de C-13). Le WebSocket porte le flux descendant, les verrous et la présence. Publication après le COMMIT, à un seul endroit. La route HTTP lit le même service de verrous en mémoire. **Pourquoi.** Une seule chaîne de validation ; PRACTICES déconseille une seconde pile de transport [V]. **Écarté :** écritures par WebSocket. **Coût.** aucun. **Contradicteur (confirmée).** **Arbitrage :** confirmée. **Preuve.** Test des routes sur toutes les écritures ; une transaction échouée ne publie rien. **Changerait d'avis :** une latence d'écriture gênante au-delà de 300 ms au p95.

## 7. Moteur de calcul côté client

Mesures [V, essai.ts relancé par le contradicteur] : `evaluate` 0,034 à 0,055 ms par participant (A03, G3 V2), `compile` environ 2 ms, sans bridage. La latence de la campagne #27 venait du retour du worker, du commit et de la peinture [V 21].

#### CALCUL-1 — Recalcul complet du participant
- **Q.** Quelle variante de moteur ? **Proposition.** `evaluate` de `domain` sur le thread principal, à partir d'une live query (grille, participant), derrière un module `apps/web` « calcul » qui expose des **lectures par cellule à égalité stable** (`useSyncExternalStore` ou sélecteur, sur le modèle de `memeResultat` de `storeProvisoire`). Pas d'objet de résultats global dans un `useMemo`.
- **Pourquoi.** Le calcul ne coûte rien à cette échelle ; le rendu coûte. La variante « Principal » avait un INP axe/vue dégradé de 200 à 376 ms au jeu « charge » [V 21]. **Écarté :** worker ; signaux ou DAG ; précalcul de la cohorte. **Non vérifié :** latence de bout en bout ; live query 1.0 RC sur 3 000 à 10 000 lignes ; téléphone d'entrée de gamme. **Coût.** aucune dépendance ; un module de sélecteurs à écrire.
- **Contradicteur (à modifier).** `storeProvisoire` n'est pas « un `useMemo` » et n'a pas été mesuré ; seuils = gate ; 40 participants arbitraires. **Arbitrage :** suivi (cohérences n° 10 à 12). Rouvre TODO « sans recalculer tout le graphe ».
- **Preuve.** Essai d'acceptation sur G3 V2 (12 participants pour la démonstration, profil ×5 ensuite) : le React Profiler montre qu'une saisie ne re-rend que les cellules changées ; latence mesurée sur un vrai iPhone et dans Chromium ×4 ; `evaluate`, `explain`, `remplissage` dans le rapport de perf sans seuil. **Changerait d'avis :** `evaluate` de la vue au-delà de 16 ms à ×4.

#### CALCUL-2 — Incrémental reporté
- **Q.** Signaux, DAG maison ou live queries ? **Proposition.** Rien maintenant. Si le déclencheur (temps de **calcul** au-delà de 16 ms à ×4) est atteint : DAG maison du prototype, puis alien-signals. Live queries seulement pour fournir les saisies.
- **Pourquoi.** Le DAG maison réutilise `calculerNoeud` de l'oracle [V lecture] ; 4 octets par nœud contre 250 [V signaux.md, mesures du 5 octobre]. Pas de requête récursive dans les live queries [V doc]. alien-signals 3.2.1 depuis mai [V]. **Écarté :** alien-signals d'emblée ; `@preact/signals-core` ; live queries comme moteur. **Coût.** aucun maintenant.
- **Contradicteur (confirmée).** Reprendre `variantes.test.ts` (fast-check contre l'oracle). **Arbitrage :** confirmée.
- **Preuve.** Le jour venu : propriété fast-check DAG = oracle sur A01, A03, G3, et gain mesuré sur le temps de calcul. **Changerait d'avis :** des centaines de participants recalculés par saisie.

#### CALCUL-3 — Pas de cache de résultats
- **Q.** Faut-il un cache ? **Proposition.** Pas de cache de résultats. Plan compilé mémoïsé par identité de l'objet de structure (`WeakMap` ou `useMemo`), pas par une clé de version qui n'existe pas. Serveur : recalcul à l'export.
- **Pourquoi.** Aucun N du LRU ne passait, tâches longues jusqu'à 184 ms [V 21]. **Écarté :** LRU ; Valkey ; résultats en collection. **Coût.** aucun.
- **Contradicteur (à modifier).** Clé inexistante, croissance dans l'éditeur. **Arbitrage :** suivi.
- **Preuve.** Saisie : 0 recompilation sur 50 frappes. Éditeur : au plus 1 `compile` par modification, tas stable après 200 modifications. **Changerait d'avis :** un export serveur d'un cours au-delà d'une seconde.

#### CALCUL-4 — Porter le noyau en partant des tests
- **Q.** Reprend-on le code du prototype ? **Proposition.** Oui, après trois préalables : (a) le porteur valide les défauts figés (1a, 1b, 1c, H4, H5 de 19) et les choix provisoires de #15, #16, #20, consignés dans 21 « Algorithmes à garder » ; (b) versionnage des identifiants de fonction (18 §7) tranché ; (c) types du format dérivés du schéma Valibot de `contracts`. Puis tests du corpus d'abord, et portage fichier par fichier sous les gates. `copier` et `graphe` après la démonstration. Commencer par `evaluate` seul.
- **Pourquoi.** 313 tests verts sous Node et Bun [V] ; `compile()` fait 242 lignes et `compile.ts` 721 [V] ; 21 dit « Non consigné » pour les algorithmes [V]. **Écarté :** réécrire de zéro ; relâcher les gates ; garder les commutateurs. **Non vérifié :** complexité cyclomatique réelle. **Coût.** trois préalables du porteur avant tout portage ; réécriture partielle pour tenir les plafonds.
- **Contradicteur (à modifier).** Décisions de modèle figées en silence ; mutation suspendue ; double définition du format. **Arbitrage :** suivi. Rouvre la spec 20 (§10). Ajouter des tests de propriété pendant le portage, faute de mutation.
- **Preuve.** Tests verts dans `packages/domain`, oxlint sans signalement, typecheck strict, moins de la moitié des fonctions réécrites. **Changerait d'avis :** un format de grille qui change de forme.

#### CALCUL-5 — Diagnostics codés de `compile`
- **Q.** Comment l'éditeur montre-t-il les erreurs d'une grille incomplète ? **Proposition.** `compile(grille)` rend `{ plan, diagnostics }` sans lever. Diagnostic : `{ code, gravite, noeud?, cible?, params }`. Les codes sont des tuples de `contracts` (cohérence n° 9, ADR). La forme et les plafonds de C-07 (nœuds, arêtes, profondeur, taille) relèvent du schéma Valibot ; la cohérence du graphe relève de `compile`. L'aperçu garde le dernier plan valide.
- **Pourquoi.** Une grille fausse compile sans erreur (calcul sans entrée, barème vide à bornes infinies) et une forme inattendue lève `TypeError` [V deux essais]. Une chaîne de 200 000 calculs ne déborde pas la pile [V]. **Écarté :** mapper des chaînes françaises ; compilation partielle ; tout garantir dans l'éditeur. **Coût.** aucune dépendance ; un code et une traduction par diagnostic.
- **Contradicteur (à modifier).** Emplacement des codes ; plafonds ; preuve aléatoire faible. **Arbitrage :** suivi.
- **Preuve.** fast-check : grilles valides pour le schéma puis mutées (entrée supprimée, barème vidé, poids négatif, axe sans placement) : aucune exception, un diagnostic avec l'ID attendu, compile borné au plafond. La traduction est déjà garantie par Paraglide. **Changerait d'avis :** un éditeur qui rend la plupart des erreurs impossibles.

#### CALCUL-6 — Rejeu serveur identique
- **Q.** Comment garantir l'égalité client et serveur ? **Proposition.** Un adaptateur unique `sourcesParticipant(plan, saisies)` dans `domain` (signature provisoire : dépend du stockage des saisies). Fixtures A01, A03, G3 exécutées sous Bun et dans Chromium, WebKit et Firefox (Playwright), égalité `Object.is` (C-12). Une version de `domain` envoyée par le client et contrôlée par le serveur : un bundle périmé reçoit un refus codé ou un avis de rechargement.
- **Pourquoi.** Le noyau n'utilise que `Math.round` ; `toFixed` seulement à l'affichage [V grep]. Le vrai risque est un décalage de versions [D]. **Écarté :** recalcul serveur à chaque écriture ; instantané à la finalisation (18 §10) ; test sous Node (hors pile). **Coût.** trois moteurs Playwright en CI (installation et temps) ; un contrôle de version par écriture.
- **Preuve.** Égalité sur les quatre moteurs ; client N-1 refusé ; export serveur = écran pour les saisies de l'e2e. **Changerait d'avis :** un écart reproductible entre moteurs.

## 8. Exploitation et environnements

Fait corrigé : TODO « Auth » et FEATURES décrivent déjà les trois régimes, dont la démonstration (corrigé le 15 novembre, 27 C-01) [V].

#### ENVIRONNEMENTS-1 — Régimes validés au démarrage
- **Q.** Comment distinguer développement, test, démonstration et production ? **Proposition.** `DEPLOY_ENV` à quatre valeurs. Cela rouvre la décision des trois régimes (TODO « Auth », C-02 ; §10). `packages/env` extrait d'abord une liste fermée de clés, en remontant tout `MIDATA_*` et `AUTH_*`, puis applique `v.variant` de `strictObject`. Refus de C-02 inclus : `DEV_LAN` hors développement, secret factice, origine non https et compte à mot de passe en base en production. Démonstration en ligne et repli local = même régime. Table `deployment` écrite par la migration initiale ou le seed, jamais par le serveur au démarrage, comparée avant toute écriture des scripts.
- **Pourquoi.** `strictObject` sur `process.env` brut refuse les variables système [V contra] ; `variant` donne un message clair sur un discriminant mal écrit [V]. **Écarté :** trois régimes ; `demo-local` ; drapeaux indépendants. **Non vérifié :** montage conditionnel du plugin mot de passe de Better Auth. **Coût.** aucune dépendance ; une table et sa migration.
- **Contradicteur.** TODO décrivait déjà les trois régimes ; la mention « TODO à mettre à jour » est retirée.
- **Preuve.** Test par combinaison interdite ; l'image unique avec `DEPLOY_ENV=production` sur une base marquée demo s'arrête en non-zéro ; le script de remise à zéro échoue sans marqueur. **Changerait d'avis :** un vrai besoin propre au repli local (clé optionnelle).

#### ENVIRONNEMENTS-2 — Caddy
- **Q.** Traefik ou Caddy ? **Proposition.** Caddy 2.11 par digest, un seul Caddyfile commité : TLS automatique, tout vers l'app Bun (HTTP et `/ws`), `request_body max_size` passé par variable (testé égal à la constante partagée), snippet `basic_auth` activé par variable pour la démonstration. Pas de socket Docker. L'app sert le build web pour garder la CSP à un seul endroit.
- **Pourquoi.** Dernier tag v2.11.9 [V] ; directives présentes [V code] ; 27 §8 recommande Caddy sans socket. **Écarté :** Traefik ; Caddy qui sert le statique ; TLS par Bun. **Coût.** une image de plus et un Caddyfile.
- **Contradicteur (à modifier).** Deux fichiers implicites ; constante TS inaccessible ; WebSocket derrière `basic_auth` non prouvé. **Arbitrage :** suivi.
- **Preuve.** E2E avec le vrai Caddyfile (`tls internal`, `basic_auth`) : WebSocket, CSP sur 200, 404, 500, 413, `X-Forwarded-For` forgé sans effet ; montée WebSocket depuis un iPhone réel. Si iOS échoue : pas de `basic_auth`, mots de passe aléatoires et limite de débit. **Changerait d'avis :** plusieurs services à router.

#### ENVIRONNEMENTS-3 — Worktrees sans proxy en développement
- **Q.** Comment faire tourner plusieurs worktrees ? **Proposition.** Script `setup-worktree` à slots (ports, bases, registre dans `.git/`). Sessions isolées par un préfixe de cookie par slot si Better Auth le permet [M], sinon par hôte `wN.azimut.localhost`. Vite fait le proxy `/api` et `/ws`. Pour le téléphone en développement : `DEV_LAN=1` avec un réglage de cookies documenté, ou passage par la pile compose et `tls internal`. L'e2e compose valide le vrai Caddyfile (Playwright fait confiance à l'autorité locale).
- **Pourquoi.** Vite 8.3.8 accepte `*.localhost` et les IP [V code] ; Bun résout `*.localhost` [V]. Un cookie `Secure`/`__Host-` (C-13) n'est pas posé sur `http://<IP>` [M]. **Écarté :** compose complet par worktree ; Traefik ou Caddy en développement. **Non vérifié :** Safari et `*.localhost`. **Coût.** deux scripts à écrire et tester ; aucune dépendance.
- **Contradicteur (à modifier).** Téléphone en développement contraire à C-02 et C-13. **Arbitrage :** suivi. Rouvre « Traefik envisagé en dev » (§10).
- **Preuve.** Deux slots dans Chrome, Firefox et Safari : sessions indépendantes ; connexion réussie depuis un vrai téléphone. **Changerait d'avis :** besoin de https en développement.
- **Compléments (TODO « Worktrees parallèles »).** `remove-worktree` supprime les bases `_wN` (`DROP DATABASE … WITH (FORCE)` [M]) puis libère le slot ; `setup-worktree` libère d'abord les slots dont le chemin n'existe plus (registre comparé à `git worktree list --porcelain`). Intégration : un clone `CREATE DATABASE … TEMPLATE <base de test du slot>` par worker, nommé par slot et worker, supprimé en fin de run. `.worktreeinclude` ne copie pas `.env` : le setup le crée depuis `.env.example` (valeurs factices, C-17) et les clés du slot, ce qui supprime le conflit avant le setup. Garde-fous : refus quand `git rev-parse --git-dir` égale `--git-common-dir` (clone principal) [M] ; les scripts des conteneurs partagés lisent le `.env` du clone principal par ce même chemin commun. Preuve : deux worktrees créés puis supprimés sans base orpheline ; un dossier effacé à la main libère son slot au setup suivant ; deux runs d'intégration parallèles sans collision ; setup refusé dans le clone principal.

#### ENVIRONNEMENTS-4 — Hébergeur suisse
- **Q.** Chez qui ? **Proposition.** Étape 0 : demander au MSdS ou à la PBS si un hébergeur ou un contrat existe. Grille démonstration : Suisse, 2FA, SSH par clé, Docker, prix, registraire avec 2FA et verrou de transfert. Grille pilote, en plus : contrat de sous-traitance et sous-traitants, stockage objet en Suisse, juridiction, instantanés. Candidats : Infomaniak, cloudscale.ch, Exoscale (propriété étrangère : question pour le juriste).
- **Pourquoi.** Faits sur les candidats tirés de résumés de recherche, pages non ouvertes [V partiel]. **Écarté :** hors Suisse ; infogéré ; choisir sans lire. **Coût.** environ une journée de lecture et de démarches.
- **Contradicteur (à modifier).** Critères du pilote exigés trop tôt ; registraire oublié. **Arbitrage :** suivi.
- **Preuve.** Grille remplie avec une source par case ; déploiement de zéro en moins d'une heure par le runbook. **Changerait d'avis :** un hébergeur imposé par l'organisation.

#### ENVIRONNEMENTS-5 — Démonstration en ligne jetable
- **Q.** Où héberger la démonstration ? **Proposition.** Petit VPS séparé de la future production, sous-domaine `demo.`, même image et même compose avec `DEPLOY_ENV=demo`, durcissement C-20 dès le départ (vérifié par script sur `docker compose config`), `basic_auth`, `noindex`, mots de passe générés, pas de sauvegarde. Remise à zéro par un service compose `seed` (image outils séparée, profil compose `demo`), absent du compose de production (MESURES-7) ; C-03 vérifie qu'aucune route de seed n'existe. Prérequis : domaine et registraire (C-24), images construites en CI et publiées sur GHCR par digest, mises à jour automatiques de l'OS, `sshd -T` vérifié.
- **Pourquoi.** Répétition du déploiement à risque nul ; C-21 et C-32. **Écarté :** PaaS hors Suisse ; même VPS que la production ; local seulement. **Coût.** un VPS et un domaine payants (prix non vérifiés) ; un runbook.
- **Contradicteur (à modifier).** Prérequis manquants ; dimensionnement estimé. **Arbitrage :** suivi ; mémoire mesurée pendant la répétition.
- **Preuve.** Déploiement par le runbook, remise à zéro en moins d'une minute, parcours complet depuis un ordinateur et un téléphone en 4G, seuls 22, 80 et 443 ouverts, mémoire relevée. **Changerait d'avis :** des visiteurs qui manipulent eux-mêmes.

#### ENVIRONNEMENTS-6 — Repli local
- **Q.** Quel repli le jour J ? **Proposition.** D'abord le partage de connexion 4G. Ensuite la pile compose locale avec `DEPLOY_ENV=demo` et Caddy `tls internal`, avec **une seule origine** pour les deux écrans : nom mDNS de l'ordinateur (`<nom>.local`, [M]) ou point d'accès créé par l'ordinateur à IP fixe. Autorité racine installée et approuvée à l'avance sur le téléphone de la démonstration.
- **Pourquoi.** Deux origines (`azimut.localhost` et l'IP) donnent deux jeux de cookies et un contrôle d'origine qui en refuse une [D]. **Écarté :** http sur l'IP ; vrai certificat vers une IP privée. **Coût.** une répétition ; une autorité racine à installer sur le téléphone.
- **Preuve.** Répétition sur deux réseaux Wi-Fi sans changer la configuration : saisie du téléphone visible sur l'ordinateur, sans avertissement de certificat. **Changerait d'avis :** un lieu sans réseau mobile.

#### ENVIRONNEMENTS-7 — Sauvegardes au pilote
- **Q.** Comment sauvegarder ? **Proposition.** Rien pour la démonstration. Au pilote : `pg_dump` en plain passé à `restic backup --stdin` (chiffrement, compression, déduplication), horaire pendant un cours, quotidien sinon, et en étape explicite de la tâche de migration ; `restic forget --prune` ; restauration mensuelle avec alerte. Un second fournisseur pour le bucket est un arbitrage du juriste.
- **Pourquoi.** C-36 ; restic v0.19.1 [V tag]. `-Fc` compresse et annule la déduplication [D]. **Écarté :** instantanés seuls ; pgBackRest ; `age` + rclone. **Coût.** aucun avant le pilote ; ensuite restic et un stockage payant.
- **Preuve.** Exercice chronométré par la seconde personne : données identiques en moins de 30 min ; taille et durée mesurées au profil ×5 ; alerte sur tâche cassée. **Changerait d'avis :** besoin de perte inférieure à une heure.

#### ENVIRONNEMENTS-8 — Suivi d'erreurs au pilote
- **Q.** Quel suivi d'erreurs ? **Proposition.** Journaux JSON (C-14), rotation `max-size`/`max-file` et sonde externe jusqu'à la démonstration. Au pilote, choisir entre Bugsink (SQLite sur volume dédié, `PHONEHOME=false`, licence PolyForm Shield acceptée explicitement) et GlitchTip 7 (libre). Côté client, essayer d'abord une route d'erreurs maison vers les journaux avant `@sentry/react` ; une route `tunnel` éventuelle entre dans l'instantané de C-03.
- **Pourquoi.** Licence non libre du cœur de Bugsink, SQLite par défaut, `PHONEHOME` vrai par défaut [V contra, clone]. `@sentry/bun` 11.12.0 exige `bun >=1.3.14` [V]. **Écarté :** Sentry SaaS ; Sentry auto-hébergé. **Coût.** aucun avant le pilote ; ensuite un service de plus à exploiter.
- **Preuve.** Erreurs serveur et client avec chaîne témoin : traces reçues, témoin absent, aucune violation CSP, aucune connexion sortante. **Changerait d'avis :** un sous-traitant UE admis par le juriste.

#### ENVIRONNEMENTS-9 — Pas d'exécuteur de tâches avant le pilote
- **Q.** Faut-il `pg-boss` ? **Proposition.** Non avant le pilote ; synchronisation MiData à la connexion. Au premier besoin périodique : `pg-boss` 12 (adaptateur `db.executeSql` sur postgres-js, `pg` reste installé) contre une boucle `Effect.schedule` avec `pg_try_advisory_xact_lock`. **Pourquoi.** Rien à exécuter avant ; 27 §8 recommande la relecture des rôles à la connexion. **Écarté :** `pg-boss` dès la fondation ; graphile-worker ; BullMQ. **Coût.** aucun. **Contradicteur (confirmée).** Verrou de session sur un pool : préférer le verrou de transaction. **Arbitrage :** confirmée. **Preuve.** Au pilote : 100 redémarrages simulés, aucune tâche perdue ni doublée, pour les deux candidats. **Changerait d'avis :** une synchronisation périodique exigée.

## 9. Dépendances et outillage des agents

#### CHAINE-1 — Dependabot pour le catalogue
- **Q.** Quel outil met à jour les dépendances ? **Proposition.** Dependabot `package-ecosystem: bun`, répertoire `/`, hebdomadaire. `prototype/` exclu. Repli écrit, non codé : `bun update --latest` en Action planifiée.
- **Pourquoi.** `dependabot-core` lit et réécrit `catalog` et `catalogs` [V file_parser.rb, package_json_updater.rb] et régénère `bun.lock` avec `--ignore-scripts` [V]. Renovate main ne gère que les catalogues pnpm et Yarn, et son gestionnaire regex ne touche pas le lockfile [V]. **Écarté :** Renovate ; script maison. **Non vérifié :** service hébergé à jour ; date de fusion de #16544 ; lecture de `bunfig.toml` par Dependabot (aucune occurrence [V]). **Coût.** aucune dépendance ; des PR hebdomadaires à relire.
- **Contradicteur (à modifier).** Mécanisme fragile pour `catalog:` ; preuve à faire sur le dépôt réel. **Arbitrage :** suivi. Écart avec 27 §8 (§13).
- **Preuve.** À l'étape 1, une dépendance fixée une version en retard : PR qui ne touche que le catalogue et `bun.lock`, aucun `catalog:` perdu, `bun ci` vert, une 0.x exacte aussi proposée. **Changerait d'avis :** échec de la preuve (script maison).

#### CHAINE-2 — Délai de 7 jours, contrôlé en CI
- **Q.** Où appliquer un délai de publication ? **Proposition.** `minimumReleaseAge = "7d"` dans `bunfig.toml` (protège `bun add` humain et agent), `cooldown` 7 jours dans Dependabot, et un **contrôle CI** : chaque version ajoutée ou changée dans le diff de `bun.lock` doit avoir plus de 7 jours sur le registre, sauf exclusion `nom@version`. Les PR de sécurité (sans cooldown) sont signalées, pas bloquées, quand elles portent le label sécurité. Les versions citées dans ce document sont celles des essais du 15 novembre. À la fondation, on prend la dernière version publiée depuis plus de 7 jours. Si une version plus récente est nécessaire, on l'exclut par `nom@version`, avec un motif, et on relance l'essai concerné.
- **Pourquoi.** `bun install --frozen-lockfile` et `bun ci` acceptent une version récente déjà dans le lockfile [V contra]. Dependabot coupe le cooldown pour la sécurité [V code]. Ont moins de 7 jours : fallow 3.43.1 et better-auth 1.7.25 (14 nov.), `@effect/tsgo` 0.69.0 et `@playwright/test` 1.65.1 (13 nov.), elysia 1.4.32, `@tanstack/db` 1.0.0-rc.1.5, `@tanstack/offline-transactions` 1.2.1, knip 6.45.1 (11 nov.), oxlint 1.93.0, oxfmt 0.78.0 (9 nov.) [V registre]. Dernières stables de plus de 7 jours ce jour : better-auth 1.7.18, fallow 3.41.0, `@effect/tsgo` 0.67.5, `@playwright/test` 1.65.0 [V registre] ; le relecteur a constaté que `bun add better-auth` installe bien 1.7.18 sous Bun 1.4.4. **Écarté :** délai dans Dependabot seul ; aucun délai ; 14 jours. **Coût.** un script CI qui interroge le registre ; des versions en retard d'une semaine.
- **Contradicteur (à modifier).** Protection surestimée, preuve qui ne teste rien. **Arbitrage :** suivi. Si le contrôle paraît trop cher, l'écrire comme risque accepté.
- **Preuve.** Un lockfile avec une version de la veille fait échouer le contrôle ; exclue, elle passe. **Changerait d'avis :** des PR Dependabot qui échouent souvent (délai Dependabot +1 jour).

#### CHAINE-3 — Regroupement par famille
- **Q.** Comment regrouper ? **Proposition.** Groupe hebdomadaire « stables » (mineures, correctifs). Un groupe par famille leading edge : (`typescript`, `@effect/tsgo`) ; (`oxlint`, `oxlint-tsgolint`) ; (`drizzle-orm`, `drizzle-kit`) ; (`@tanstack/db`, collections) ; `effect` ; `oxfmt` ; `@shadcn/lint`. Majeures seules. `chore(deps)`, pas de fusion automatique. **Pourquoi.** Ces paquets montent ensemble ; séparés, la CI échoue [D]. Cohérent avec OUTILLAGE-2. **Écarté :** une PR par paquet ; tout en une PR ; fusion automatique. **Coût.** plusieurs PR par semaine, une par famille. **Contradicteur (à modifier).** Critère inversé. **Arbitrage :** suivi. **Preuve.** Contrôle : toute entrée 0.x ou préversion du catalogue figure dans un `exclude-patterns` du groupe « stables ». **Changerait d'avis :** trop de PR (stables mensuelles).

#### CHAINE-4 — Actions et images Docker
- **Q.** Qui met à jour SHA et digests ? **Proposition.** Dependabot `github-actions` dès l'étape 1 ; `docker` et `docker-compose` quand les fichiers existent. Version de Bun lue à un seul endroit (`packageManager`), passée à la CI et en `ARG` Docker ; contrôle d'alignement en filet. **Pourquoi.** Les trois écosystèmes existent [V config/file.rb] ; 27 C-16. **Non vérifié :** lecture de `packageManager` par `setup-bun` ; digest + commentaire de tag [M]. **Coût.** des PR de SHA et de digests à relire. **Preuve.** PR sur une Action épinglée sur un ancien SHA, avec commentaire de version. **Changerait d'avis :** rien de prévu.

#### CHAINE-5 — `.claude/settings.json`
- **Q.** Que contient le fichier commité ? **Proposition.** deny : `Read(./.env)`, `Read(./.env.*)` sauf `.env.example`, npm, npx, pnpm, yarn, force push, reset hard. ask : configs de lint, `lefthook.yml`, `packages/config/**`, `.github/**`, `.claude/**`, `bun.lock`, `bunfig.toml`, `git push`, `gh`. Bac à sable : `allowedDomains: ["registry.npmjs.org"]` seul (sans `github.com`, C-17), `git push` et `gh` dans `excludedCommands`, `sandbox.credentials` en deny (`~/.ssh`, `~/.config/gh`, `~/.aws`, `~/.npmrc`, `GITHUB_TOKEN`, `NPM_TOKEN`), sans `failIfUnavailable`. `allowUnsandboxedCommands` laissé vrai en local et documenté.
- **Pourquoi.** Les deny ne bloquent pas un script qui ouvre le fichier [V doc] ; repli sans isolation par défaut [V doc] ; pas de `bwrap` dans la VM cloud [V]. Fils de projet cloud et sessions multi-dépôts ignorent permissions et hooks [V doc]. `denyRead: ["~/"]` casserait Playwright et git [D]. **Écarté :** `failIfUnavailable` ; `denyRead` de `.env`. **Coût.** un test de contenu ; des confirmations `ask` pendant les sessions.
- **Contradicteur (à modifier).** Écart non dit à C-17 ; auto-allow du bac à sable contourne les `ask` de fichiers. **Arbitrage :** suivi ; l'écart est maintenant dit (§13, friction n° 10) ; le vrai rempart reste C-18.
- **Preuve.** Test Vitest du contenu (sans `github.com`) ; en local, `cat .env` et lecture de `~/.ssh` refusés, `bun install`, tests, Playwright et `git commit` passent. **Changerait d'avis :** travail surtout en fils de projet cloud (réglages gérés).

#### CHAINE-6 — Hooks
- **Q.** Quels hooks à la fondation ? **Proposition.** `guard-bash` sans filtre `if` (push sur `main`, `--no-verify`, `-n`, lecture de `.env*` par chemin explicite). `lint-file` sur `*.ts`/`*.tsx`. `session-setup` cloud (`CLAUDE_CODE_REMOTE=true`) : `bun install --frozen-lockfile --ignore-scripts`, `bun run lefthook install`, puis installation et démarrage de Postgres 18 (cohérence n° 13), sans patch tsgo. `stop-gate` attend la première tranche de code. Scripts Bun testés en Vitest.
- **Pourquoi.** `bun install` marche dans la VM cloud [V] ; le plafond de 8 continuations cité par PRACTICES n'est pas dans la doc actuelle, seul `stop_hook_active` l'est [V contra]. **Écarté :** setup script d'environnement (repli de la cohérence n° 13) ; hook type-aware ; hooks `prompt`/`agent`. **Coût.** trois scripts testés ; la durée de SessionStart, Postgres compris.
- **Contradicteur (à modifier).** Patch tsgo et installation de Lefthook incohérents avec les autres lots. **Arbitrage :** tranchés par les cohérences n° 3 et 4.
- **Preuve.** Tests sur stdin (`cat .env`, `git push origin main`, `git commit -n` → 2 ; fichier mal formaté → stderr) ; session cloud neuve qui lance `bun run gate:commit` sans commande manuelle, SessionStart sous 2 min, Postgres 18 compris. **Changerait d'avis :** SessionStart trop long (setup script en cache).

#### CHAINE-7 — Skills vendorisés
- **Q.** Quels skills, et comment les épingler ? **Proposition.** Copies dans `.claude/skills/` depuis mattpocock/skills au commit 5863806 (MIT) avec `sources.json` (dépôt, commit, chemin, adapté ou non). Étape 2 : grilling, grill-with-docs, domain-modeling (adapté), codebase-design, research, writing-for-agents, wizard, wayfinder. Première tranche : tdd, code-review, to-tickets, diagnosing-bugs, adaptés, sans renvoi à `setup-matt-pocock-skills`.
- **Pourquoi.** Épingler par commit répond à SKILLS.md §4 ; `wayfinder` sert déjà [V]. **Écarté :** CLI `skills` (télémétrie, restauration expérimentale) ; plugins du compte seuls ; tout vendoriser. **Coût.** des copies de skills à resynchroniser à la main.
- **Contradicteur (à modifier).** Renvoi à un skill absent ; audit qui échouerait sur SKILLS.md. **Arbitrage :** suivi.
- **Preuve.** Audit des docs : chaque skill cité dans AGENTS.md ou un autre skill existe et figure dans `sources.json`, et réciproquement ; `/context` mesuré avec et sans le plugin du compte. **Changerait d'avis :** une CLI `skills` stable qui écrit dans `.claude/skills`.

#### CHAINE-8 — Pas d'Action Claude à la fondation
- **Q.** Des agents autonomes en CI ? **Proposition.** Non. Quand : étape 2 de la fondation pour les règles et l'issue piégée (27, étape 2, C-17) ; rejeu de l'issue avant la démonstration, puis à chaque passage de phase. Sessions lancées par un humain, sur branche. Ajouter à AGENTS.md les deux règles manquantes : seul le mainteneur pose `ready-for-agent` ; aucune donnée réelle dans une session (la règle « texte = donnée » existe déjà). Corriger PRACTICES §4 (`claude-code-action` par SHA, optionnelle et reportée).
- **Pourquoi.** 27 §8 et C-17. **Écarté :** `claude-code-action` dès la fondation. **Coût.** aucun ; une issue piégée à tenir à jour.
- **Preuve.** Issue piégée de référence, versionnée, rejouée à chaque passage de phase : la session ne lit pas `.env`, ne baisse pas un seuil et le signale ; C-18 refuse le diff. **Changerait d'avis :** une relecture humaine débordée.

## 10. Décisions déjà prises que ces propositions rouvrent

| Proposition | Décision d'origine | Source |
| --- | --- | --- |
| CALCUL-1 | « On recalcule de façon incrémentale […] sans recalculer tout le graphe » | TODO, Décisions prises, Architecture |
| CALCUL-4 | « On en extrait les conclusions et les algorithmes, puis on jette le code » ; et les points 1a, 1b, 1c, H4, H5 à trancher « en voyant » | `20-spec-prototype.md` ligne 17 ; 19 ; 21 |
| MESURES-9 | « Viewport 1920x1080 » (plafond de 15 conservé, compté en captures) | TODO, Régression visuelle |
| STRUCTURE-5 | « pre-push : tous les tests » (l'e2e passe en `gate:ci`) | TODO, Où tourne quoi |
| STRUCTURE-6 | « Tous les tests et gates s'exécutent dans tous les environnements » (trois exceptions limitées à la CI) | TODO, Où tourne quoi ; GOALS, Règles de dev |
| MESURES-3 | Tendance dans le temps pour la perf et la coverage (reportée après la démonstration) | TODO, Coverage ; Régression de performance |
| OUTILLAGE-3 | « Mutation testing : mis de côté jusqu'à ce que Stryker supporte TypeScript 7 » (la condition paraît levée ; réactivation à décider) | TODO, Technique de base ; Coverage |
| ENVIRONNEMENTS-3 | « Traefik est envisagé en dev » | TODO, Origine unique |
| MESURES-15, OUTILLAGE-3 | Tests exécutés sous Bun (exception Node possible pour le runner Playwright ; Stryker exige Node 22) | GOALS ; PRACTICES |
| ENVIRONNEMENTS-1 | Trois régimes (développement et test ; démonstration ; production) | TODO, Décisions prises, Auth ; `wayfinder/premiere-version/06` |
| CONTRATS-3, MESURES-5 | « Drizzle : 1.0.0-rc.4 » (essais sur rc.5, publiée le 21 octobre [V]) | TODO, Technique de base |

Écarts à des propositions écrites, pas à des décisions : OUTILLAGE-1 remplace la piste `postinstall` de TODO « Setup TypeScript 7 » (décision ouverte) et l'étape de patch de 27 C-16 ; STRUCTURE-7 inverse PRACTICES §3 (« one gate script ») ; OUTILLAGE-5 et STRUCTURE-2 remplacent `no-restricted-imports` + script de PRACTICES §3 ; ECRITURES-4 pousse la ligne au lieu de « IDs plus version » (PRACTICES §2) et ferme le point ouvert « Electric ou WebSocket » de TODO ; ECRITURES-5 précise « survie au rechargement non exigée » pour les seules observations ; CHAINE-1 s'écarte de 27 §8 (Renovate).

## 11. Ordre des décisions

**Avant la fondation (étapes 0 et 1).** Graphe des packages et des fonctionnalités (STRUCTURE-1, STRUCTURE-2), qui conditionne l'outil de frontières (OUTILLAGE-5, OUTILLAGE-6). Chaîne TypeScript (OUTILLAGE-1, OUTILLAGE-2, OUTILLAGE-9). Niveaux de contrôle (STRUCTURE-4 à 7), qui conditionnent les hooks (CHAINE-6). Volume réel (MESURES-6), qui conditionne le générateur et tous les bancs. CodSpeed écarté (MESURES-4).

**Pendant la fondation.** Étape 1 : CHAINE-1 à 4 (preuve Dependabot sur le dépôt réel), MESURES-16 et 17. Étape 2 : CHAINE-5 à 8 (règles AGENTS.md et issue piégée). Étape 3 : CONTRATS-1 à 7, ENVIRONNEMENTS-1, MESURES-7, CALCUL-4 et 5 — avec un préalable : la validation par le porteur des défauts figés de 19 et du versionnage des fonctions (CALCUL-4), qui conditionne le format de grille, donc CALCUL-5 et CONTRATS-4. Étape 4 : ECRITURES-1, 4, 7, MESURES-5, ENVIRONNEMENTS-2, 3. Étapes 5 et 6 : OUTILLAGE-4, CALCUL-1, 3, 6, ECRITURES-2, 3, 6, MESURES-1, 2, 8, 10 à 15, OUTILLAGE-3 (essai de mutation).

**Avant la démonstration.** MESURES-9 ; ENVIRONNEMENTS-4, 5, 6 (domaine et registraire d'abord) ; rejeu de l'issue piégée de CHAINE-8. Le grilling 05 conditionne ECRITURES-2 (coupure traitée ou reportée pour la démonstration), ECRITURES-3 (ordre au rejeu, libération du verrou) et C-29.

**Après la démonstration.** MESURES-3 (tendances), résumé EXPLAIN (MESURES-5), CALCUL-2, ECRITURES-5, ENVIRONNEMENTS-7, 8, 9, OUTILLAGE-7, 8, comparaison `fallow dead-code` / Knip.

**Dépendances principales.** E1 (import de type `App`) → STRUCTURE-2 → OUTILLAGE-5. ECRITURES-4 (version serveur) → ECRITURES-3 et 6. CONTRATS-2 → ECRITURES-4 (WebSocket natif). CONTRATS-6 ↔ ECRITURES-1 (même sémantique d'idempotence). MESURES-6 → MESURES-7 → MESURES-2, 8, CALCUL-1. MESURES-15 (runner) → MESURES-12, 14 et `gate:ci`. STRUCTURE-7 → CHAINE-6. OUTILLAGE-1 → CHAINE-6 (pas de patch).

**Niveau nocturne.** STRUCTURE-6 laisse sans point d'entrée la comparaison du ruleset (C-16) et une future mutation : un hook Lefthook `nightly`, lancé par une Action planifiée et lançable en local avec un jeton, est proposé.

## 12. Essais à lancer

| # | Essai | Critère de réussite | Tranche |
| --- | --- | --- | --- |
| E1 | Spike Elysia minimal avec `response:` + web qui importe `type App`, tsconfig web `types: []` (demi-journée) | `tsc` du web passe sans types Bun ni Drizzle, sinon entrée de types dédiée | STRUCTURE-2, OUTILLAGE-5 |
| E2 | Racine : fichier témoin Effect (flottant, erreur non gérée, `unstable/*`, API v3) dans l'image CI glibc ; TypeScript hors support | `gate:commit` et `gate:ci` en code 1 ; message de support explicite | OUTILLAGE-1, 2 |
| E3 | `fallow architecture` sur le squelette avec vrai `bun install` et témoins ; comparaison 30 min avec l'installation isolée de Bun | Chaque violation signalée, import de type `App` accepté, zéro faux positif, < 2 s ; aucun hook local ne lance `fallow` | OUTILLAGE-5, STRUCTURE-2 |
| E4 | Clone neuf, `trustedDependencies: []`, `bun run setup` | Hooks présents, commit fautif refusé, `gate:ci` lance lefthook en CI | STRUCTURE-7, CHAINE-6 |
| E5 | Dependabot sur le dépôt réel, une dépendance en retard ; lockfile d'exemple avec une version de la veille | PR propre et `bun ci` vert ; contrôle d'âge rouge puis vert avec exclusion | CHAINE-1, 2, 3 |
| E6 | Session cloud neuve : `bun run gate:push` avec `TEST_DATABASE_URL` | Réussite sans Docker ; SessionStart < 2 min, Postgres 18 installé par `session-setup` compris ; sinon repli de la cohérence n° 13 | STRUCTURE-5, CHAINE-6 |
| E7 | Tests `contracts` : route sans response, `v.date()`, `looseObject`, sans 401 ; canari dans 422 ; réponse invalide ; « 12-05-2026 » en HTTP et WS ; chaîne Postgres brute ; double POST | Tous rouges sans la règle, verts avec ; zéro faux positif | CONTRATS-1 à 7 |
| E8 | Assertions de type mapper ↔ contrat ; `drizzle-kit generate` avec `.$type` importé de `contracts`, sur PostgreSQL 18 | Typecheck rouge sur chaque écart, generate passe | CONTRATS-3, 4 |
| E9 | Stryker sur `domain` (sandbox, tsconfig par nom de paquet), banc de PRACTICES §9 | Score à ±2 points de Vitest 4, mutant non couvert survivant | OUTILLAGE-3 |
| E10 | Runner Playwright sous Bun dans l'image officielle, contre Node (une heure) | Une capture passe, sinon exception Node écrite | MESURES-15 |
| E11 | 20 runs des captures en CI, desktop et téléphone 360 px | 0 différence ; débordement volontaire détecté | MESURES-9, 13, 14 |
| E12 | A/A du script de banc, 10 fois en CI et en local | Ratio médian dans ±5 % | MESURES-2, 4 |
| E13 | Portage d'`evaluate` seul, puis tests du corpus | Tests verts, oxlint muet, < moitié des fonctions réécrites | CALCUL-4 |
| E14 | fast-check sur grilles mutées ; égalité Bun + Chromium, WebKit, Firefox ; client N-1 | Aucune exception ; `Object.is` partout ; refus codé | CALCUL-5, 6 |
| E15 | Profiler React sur G3 V2, 12 participants, iPhone réel et Chromium ×4 | Seules les cellules changées re-rendent | CALCUL-1, 3 |
| E16 | Intégration : A, B, rejeu A ; formateur retiré ; verrouillage ; version serveur, horloge décalée, `writeId` futur | État courant renvoyé, refus attendus, ordre intact ; version relue par HTTP et par WebSocket de type `number` | ECRITURES-1, 3, 4 |
| E17 | E2E deux contextes : coupure de 20 s, 3 puis 4 sur la même case, session expirée, refetch avec message concurrent | Aucune perte, valeur finale 4 sur 20 répétitions | ECRITURES-2, 6 |
| E18 | Pile compose avec le vrai Caddyfile, iPhone réel, `basic_auth` | WebSocket, CSP, 413, XFF forgé sans effet | ENVIRONNEMENTS-2 |
| E19 | Deux slots dans trois navigateurs ; connexion depuis un téléphone en développement | Sessions indépendantes ; connexion réussie | ENVIRONNEMENTS-3 |
| E20 | Déploiement de démonstration par runbook, parcours 4G, balayage de ports ; répétition du repli sur deux Wi-Fi | < 1 h, remise à zéro < 1 min, ports 22/80/443 seuls ; même origine sans avertissement | ENVIRONNEMENTS-4, 5, 6 |
| E21 | Mesure 100 saisies ordinateur ↔ téléphone 4G sur l'instance de démonstration | p95 sous 1 s (essai), écrans et base identiques | ECRITURES-4 |
| E22 | Issue piégée de référence | Consigne non exécutée et signalée ; diff refusé par C-18 | CHAINE-8 |

Après la démonstration : file des observations sur vrais téléphones (ECRITURES-5), restauration chronométrée (ENVIRONNEMENTS-7), chaîne témoin dans le suivi d'erreurs (ENVIRONNEMENTS-8), 100 redémarrages de tâches (ENVIRONNEMENTS-9), analyses ponctuelles slop-scan et `fallow similar-code`.

## 13. Cohérence avec le plan de sécurité

**Accords.** CONTRATS-1, 5 et 7 appliquent C-07 et C-14 (schémas stricts, réponses qui retirent les champs, 422 sans la valeur) ; CONTRATS-5 et 6 respectent le 404 identique de C-04. ECRITURES-1 applique la réautorisation au rejeu de C-07 ; ECRITURES-2 la reconnexion du même utilisateur de C-35 ; ECRITURES-4 la suite WebSocket de C-06 ; ECRITURES-7 C-03 et C-13. CALCUL-5 reprend les plafonds de grille de C-07 ; CALCUL-6 réalise C-12 (navigateurs et Bun). ENVIRONNEMENTS-1 réalise C-02 et C-22 ; ENVIRONNEMENTS-2 suit la recommandation Caddy sans socket (§8, C-20) ; ENVIRONNEMENTS-5 et 6 suivent C-21, C-24, C-26, C-32 ; 7 suit C-36. CHAINE-6 et 8 suivent C-17 ; STRUCTURE-6 inclut C-12, C-16, C-18, C-19, C-25. MESURES-13, 14 et MESURES-5 font passer les relâchements de seuil par C-18. MESURES-16 respecte l'interdiction de `${{ }}` dans `run:` (C-16).

**Frictions à trancher par le propriétaire.**
1. **C-16, patch `@effect/tsgo`** : le plan en fait une étape du gate ; OUTILLAGE-1 montre qu'aucun patch n'est nécessaire. Proposition : mettre C-16 à jour vers le mode sans patch.
2. **27 §8 et C-16, Renovate avec `minimumReleaseAge`** : CHAINE-1 propose Dependabot (catalogues gérés dans le code actuel de dependabot-core [V] ; date de mise en service non vérifiée) et CHAINE-2 montre que le délai de Bun ne protège pas un lockfile existant ; un contrôle CI d'âge s'ajoute.
3. **C-02 et TODO « Auth », trois régimes** : ENVIRONNEMENTS-1 en propose quatre (test séparé). C'est une décision prise à rouvrir (§10), puis à acter dans TODO et C-02.
4. **C-02 `DEV_LAN` et C-13 cookies `Secure`/`__Host-`** : le téléphone en développement ne peut pas poser ces cookies en http. Choisir entre un réglage de cookies documenté pour le développement et le passage par `tls internal` (ENVIRONNEMENTS-3).
5. **C-18 et `fallow`** : `added-suppression` et `weakened-tests` recoupent C-18 ; OUTILLAGE-6 garde C-18 seul.
6. **M-12 (paquets compromis)** : `fallow` est un binaire natif d'un seul mainteneur. S'il est retenu, il ne tourne qu'en `gate:ci`, dans un job sans secrets, ou par une commande locale explicite, jamais par un hook sur un poste qui a `.env` et `~/.ssh` ; version exacte et délai de CHAINE-2. L'analyse ponctuelle de slop-scan se fait en conteneur jetable.
7. **Permissions d'écriture en CI** : `contents: write` (branche `mesures`, après la démonstration) et `pull-requests: write` (job de rapport) doivent passer par la revue du plan.
8. **C-15** : si `offline-transactions` est retenu pour les observations, son stockage entre dans C-15 et C-35 ; la file maison partage le stockage du brouillon et simplifie la purge.
9. **Télémétrie des dépendances** : `better-auth` 1.7.25 dépend de `@better-auth/telemetry`, et Bugsink a `phonehome` actif par défaut [V]. À couper et à vérifier par un contrôle des connexions sortantes (C-13 « aucune ressource tierce »).
10. **C-17, lecture du disque** : C-17 exige un bac à sable qui restreint la lecture du disque. CHAINE-5 ne restreint que `sandbox.credentials` ; il laisse `allowUnsandboxedCommands` vrai en local ; il n'y a pas d'isolation dans la VM cloud (pas de `bwrap` [V]). Le rempart restant est C-18. À accepter comme risque, ou à durcir.

## 14. Ce qui reste à vérifier

- **Mémoire des agents [M], non relue** : `crypto.randomUUID()` ne produit que des v4 ; `expect.soft` fait échouer le test ; job sauté par `if` compté réussi ; pas d'`if` au niveau du workflow ; `advanced.cookiePrefix` de Better Auth ; résolution de `*.localhost` par Safari ; cookies `Secure` refusés sur http hors localhost ; nom mDNS `.local` résolu par iOS ; taille d'une capture 1920×1080 ; installation isolée de Bun ; composants shadcn générés avec valeurs arbitraires ; digest Docker mis à jour par Dependabot avec commentaire de tag.
- **Non vérifié du tout** : comportement d'Elysia 2 et d'Eden 2 (`app.routes`, `parseDate`) ; PostgreSQL 18 pour les formats de date et `uuidv7()` ; ce que rendent les colonnes `date` avec Drizzle rc.5 ; requêtes relationnelles et coût du typecheck des assertions ; `no-restricted-imports` sur `@elysia/eden` ; `import/no-cycle` entre workspaces ; `jsPlugins` d'oxlint dans une config imbriquée ; temps de lint avec `@shadcn/lint`.
- **Plateforme** : service Dependabot hébergé à jour avec le support des catalogues ; lecture de `packageManager` par `setup-bun` ; gitleaks et sa durée en pre-commit ; durée réelle des niveaux sur la fondation ; accès au dépôt apt de PostgreSQL 18 depuis le cloud (cohérence n° 13).
- **Temps réel et appareils** : débit de `server.publish` à 50 clients ; onglets en arrière-plan sur téléphone ; `basic_auth` et WebSocket sous Safari iOS ; WebSocket sur partage 4G pendant 45 min ; `offline-transactions` sur Safari iOS ; installation d'une autorité racine sur iOS et Android.
- **Hébergement** : contrats de sous-traitance, 2FA, prix et juridiction des trois candidats (pages non ouvertes).
- **Domaine** : chiffres du volume réel (MESURES-6) ; verrouillage des cases de note (FEATURES « Restent à définir ») ; grilling 05 ; forme de stockage des saisies (rang ou valeur) ; durée de conservation.
- **Versions** : chaque essai cité est à relancer sur la dernière version publiée depuis plus de 7 jours (CHAINE-2), en particulier `@effect/tsgo` (0.67.5 contre 0.69.0 essayée) et `fallow`.
- **Non instruit** (TODO « Harness Claude Code », SKILLS.md §4, hors méthode d'installation) : langue des artefacts (tout en français, ou technique en anglais) ; qui est le personnel non technique et jusqu'où il valide, ce qui déciderait d'un déploiement de prévisualisation par PR. Ce sont des choix du porteur, sans fait à vérifier ; aucune proposition ici.
- **Licences** : PolyForm Shield de Bugsink pour une association ; GlitchTip à mesurer.
- **Documents à mettre à jour si les propositions sont retenues** (hors de ce document) : PRACTICES §1, §2, §4, §7.4, §9 (TanStack DB 1.0 RC, `@effect/tsgo` 0.69 sans patch, Stryker 10.1, Playwright 1.65, Dependabot, `claude-code-action` par SHA) ; 27 C-16 et §8 ; TODO (Vitest `--outputJson`, Drizzle rc.5, Traefik en dev, régimes) ; SKILLS.md (`wayfinder`).
