# Azimut — décisions et points à explorer

Domaine et comportement : voir `FEATURES.md`. Faits techniques vérifiés : voir `PRACTICES.md`.

## Décisions prises

### Architecture (grill du 2026-10-03)
- **Temps réel :** le serveur fait autorité. Pas de P2P. Pas de CRDT : on n'édite jamais une même cellule à plusieurs.
- **Concurrence :** dernier gagnant, plus un historique de chaque modification de cellule (auteur, date, ancienne et nouvelle valeur).
- **Verrous et présence :** passent par un canal WebSocket géré par nous. Electric ne gère pas l'état éphémère, donc ce canal est nécessaire de toute façon.
- **Hors ligne :** pas pour l'instant. Il ne faut perdre aucune saisie lors d'une coupure courte.
- **Hébergement :** en Suisse, avec Docker Compose. Une seule instance suffit vu les volumes (environ 50 formateurs simultanés au total).
- **Auth :**
  - Better Auth.
  - Comptes locaux en dev et en test **uniquement**. Ils doivent être désactivés en production, et c'est la validation de l'env qui l'impose.
  - SSO MiData (db.scout.ch) en production, via le plugin `genericOAuth` avec PKCE.
- **Autorisation :** RBAC avec un scope par cours. Les cours et les rôles d'un formateur viennent de l'API JSON:API de MiData.
- **Effect :** dernière version, soit 4.x. Uniquement le cœur, pas de modules `unstable/*`.
- **i18n :** l'architecture est multilingue dès le départ, avec seulement le français au début. Le serveur renvoie des codes d'erreur et le client les traduit.
- **Contrats :** des schémas partagés, avec inversion des dépendances. La DB et le client *implémentent* les contrats ; les types ne remontent jamais de la DB vers le client. Type safety de bout en bout.
- **Bleeding edge :** décidé bibliothèque par bibliothèque, sans budget global.
- **shadcn lint :** il s'agit de [`@shadcn/lint`](https://github.com/shadcn-ui/lint), un plugin JS pour oxlint.
- **Calculs de qualification :** dans le package `domain`, exécutés sur le client. On recalcule de façon incrémentale, comme un tableur (piste : signaux ou graphe de dépendances), sans recalculer tout l'arbre.
- **Licence :** AGPL-3.0. Une instance modifiée et hébergée doit publier ses sources.

### Technique de base (grill du 2026-10-03, suite)
Faits mesurés pendant ce grill : `PRACTICES.md` §9.
- **Drizzle :** 1.0.0-rc.4. Migrations SQL générées par `drizzle-kit generate` et commitées ; jamais de `push`, même en dev. Toutes les requêtes passent par une couche repository, qui absorbe les changements cassants de la RC.
- **Driver Postgres :** `postgres-js`. Il marche sous Bun et sous Node, et LISTEN/NOTIFY passe par le client brut. `bun-sql` est écarté pour l'instant (bugs ouverts sur JSON, fuseaux horaires et timestamps).
- **APIs Bun :** autorisées uniquement dans `apps/server`, dans la couche infra (DB, WebSocket, hash). Les packages partagés (`contracts`, `domain`, `env`) et le web restent neutres vis-à-vis du runtime.
- **TypeScript :** 7 comme compilateur et vérificateur. Lint type-aware avec oxlint (tsgolint). Pas d'ESLint.
- **Effect :** utilisé côté serveur et côté client. Le package `domain` reste en fonctions TypeScript pures, sans `Effect`, appelées depuis le code Effect.
- **Données stockées :** le serveur ne stocke que les données maîtres, dans la structure du domaine. Moyennes et autres calculs sont faits sur le client, à l'affichage : l'accès et la mise à jour des données restent séparés des calculs d'affichage. Le serveur peut aussi calculer avec `domain` quand il en a besoin (routes d'export).
- **Store client :** TanStack DB. Eden et HTTP pour tout ce qui n'a pas besoin de live ; Electric ou WebSocket pour les parties live, à décider une fois le domaine détaillé.
- **Historique :** une table d'état courant et une table d'historique append-only, écrite par le repository dans la même transaction, avec l'auteur tiré de l'utilisateur connecté. À confirmer avec le domaine.
- **Verrous :** en mémoire dans le serveur, derrière une interface (service Effect), pour passer à Valkey le jour où c'est nécessaire.
- **IDs :** UUIDv7.
- **Origine unique :** l'app est derrière un reverse proxy, sur un seul domaine. `/api` et `/ws` sont routés par chemin, sans sous-domaines, donc sans CORS ni cookie partagé entre sous-domaines. Traefik est envisagé en dev.
- **Tests :** exécutés sous Bun.
- **Mutation testing :** mis de côté jusqu'à ce que Stryker supporte TypeScript 7. En attendant, aucun gate ne mesure la qualité des tests.
- **Layout initial du monorepo :** `apps/web`, `apps/server` (avec le schéma Drizzle, les migrations et les repositories), `packages/contracts`, `packages/domain`, `packages/env`, `packages/testing`, `packages/config`, `tools/`. `ui` reste dans `web` et `db` dans `server` jusqu'à ce qu'un deuxième consommateur apparaisse. Turborepo est conservé. Le layout doit pouvoir évoluer vers une architecture modulaire par feature ; ce découpage se décide après le domaine.
- **Schémas :** Valibot, pour les contrats partagés. Côté Effect, un helper `decode(schema)` transforme l'échec Valibot en erreur taguée.
- **Runner de tests :** Vitest 5, exécuté sous Bun. La piste `bun test` est close.
- **Génération des UUIDv7 :** par le client pour toute entité créée de façon optimiste, par Postgres (`uuidv7()`) pour le reste. Le serveur vérifie que les IDs reçus sont des v7 valides.
- **Verrous, écriture :** le serveur refuse l'écriture sur une cellule verrouillée par un autre formateur (code `CELL_LOCKED`). À confirmer avec le domaine.
- **Coupure courte :** la saisie doit survivre tant que l'onglet reste ouvert. La survie à un rechargement n'est pas exigée.
- **i18n :** Paraglide. Clés et paramètres typés ; un code d'erreur sans message fait échouer le typecheck.

### Coverage
- Statistique indicative avec suivi de tendance. **Aucun seuil, aucun gate.** Le seul gate qualité des tests prévu est le score de mutation sur `domain`, suspendu tant que Stryker ne supporte pas TypeScript 7.
- Couches mesurées : unit + intégration, fusionnées dans un seul rapport. Pas de coverage e2e.

### Régression visuelle
- Playwright natif (`toHaveScreenshot`), baselines commitées dans le repo.
- Exécution dans l'image Docker `mcr.microsoft.com/playwright` épinglée sur la version de `@playwright/test`, pour avoir le même rendu partout.
- Viewport 1920x1080. **15 pages au maximum** : quelques pages complexes et les pages principales les plus visitées, capturées pendant les parcours e2e.

### Régression de performance
- Cible : requêtes lourdes et fonctions lourdes.
- Mesure en temps réel. **Pas de gate** : rapport de variation et de tendance dans le temps.
- Doit pouvoir tourner dans n'importe quel environnement (local, CI, autre machine).
- Dataset seedé : volume réel attendu ×5, généré de façon déterministe (seed fixe).

### Reporting CI
- Coverage, visuel et perf remontés dans la PR GitHub (commentaire posté par une Action).
- **Pas de CI tant que la PR est en draft.**

### Où tourne quoi
- Règle : **tous les tests et gates s'exécutent dans tous les environnements** (local comme CI).
- Répartition indicative, à affiner :
  - pre-commit : qualité du code + tests rapides
  - pre-push : tous les tests
  - CI : toute la stack (régressions visuelles et perf, mutation, scans…)

## À explorer / confirmer

### Perf
- [ ] Choisir l'outil : `vitest bench` (`--outputJson` / `--compare`), `mitata` / `tinybench` sous Bun, ou un banc maison.
- [ ] Stockage de la tendance dans le temps : `github-action-benchmark` (branche gh-pages), Bencher.dev ou CodSpeed. Vérifier ce qui marche avec des mesures en temps réel.
- [ ] Comparabilité entre machines : un temps mesuré ailleurs n'est pas comparable. Options : baseline par machine (empreinte hardware dans le rapport), mesure relative (benchmark de référence pour calibrer), ou tendance uniquement sur un environnement fixe.
- [ ] CodSpeed : sa dépendance `vite` s'arrête à ^7 alors que la stack prévoit Vite 8, et le support Bun n'est pas documenté. Revérifier, ou écarter.
- [ ] Requêtes DB : mesurer le temps + enregistrer en complément les indicateurs déterministes (nombre de requêtes via le logger Drizzle, plan `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`, `pg_stat_statements`) comme signal de tendance.
- [ ] Lister les requêtes et fonctions lourdes à couvrir (dépend du domaine).
- [ ] Définir le volume réel attendu (apprentis, qualifications par personne, formateurs, sites, années d'historique) pour calculer le ×5.
- [ ] Générateur de seed déterministe, partagé entre dev, perf et e2e ?

### Visuel
- [ ] Baselines PNG : Git LFS ou non (≈15 pages × 1920x1080 × navigateurs).
- [ ] Un seul navigateur (Chromium) ou plusieurs ?
- [ ] Workflow de mise à jour des baselines : script local `docker run`, et/ou Action déclenchée par un label sur la PR.
- [ ] Gestion des zones volatiles : `animations: 'disabled'`, `mask`, `stylePath`, dates figées, seed fixe ; seuil `maxDiffPixelRatio`.
- [ ] Gate bloquant ou indicatif en CI ? (décision encore ouverte)
- [ ] Faire tourner l'e2e dans Docker en local sans friction (devcontainer, script `bun run e2e:docker`).

### Reporting CI
- [ ] Action(s) pour commenter la PR : coverage (ex. `davelosert/vitest-coverage-report-action` ou lcov), diff visuel (rapport Playwright en artifact + lien), perf (variation vs `main`). Un seul commentaire mis à jour, pas un par job.
- [ ] Stocker les tendances (coverage, perf) sur `main` : gh-pages, artifacts ou service externe.
- [ ] Condition `if: github.event.pull_request.draft == false` + trigger `ready_for_review`.

### Analyse de code
- [ ] [fallow](https://github.com/fallow-rs/fallow) (Rust, MIT) : code mort, duplication, complexité, frontières d'architecture, dépendances circulaires, dérive du design system. Peut-il remplacer le script de structure / `no-restricted-imports` et `import/no-cycle` ? CLI, GitHub Action, LSP, MCP.
- [ ] [slop-scan](https://github.com/modem-dev/slop-scan) (MIT) : CLI déterministe qui détecte les motifs de « slop » IA en JS/TS. Utile comme signal de tendance en CI, ou en gate ?
- [ ] [slopo](https://github.com/rafal-qa/slopo) : détection par embeddings de logique dupliquée (diff Git vs reste du code, ou codebase entière). Vérifier si un modèle local est possible : avec une API d'embeddings, le code sort du poste.
- [ ] Recoupement avec oxlint (complexité, taille des fichiers) : garder un seul outil par règle.

### Worktrees parallèles
Idée reprise d'Ascent : chaque worktree reçoit un **slot** (1 à 9), le clone principal est le slot 0. Un slot regroupe des ports, des bases et une session navigateur. Tous les worktrees partagent un seul conteneur Postgres.
- [ ] Script `setup-worktree` idempotent :
  - il réserve un slot libre, ou garde celui du worktree ;
  - il réécrit les clés du slot dans le `.env` du worktree (copié depuis le clone principal s'il manque) sans toucher aux autres lignes ;
  - il lance `bun install`, puis crée, migre et seed la base du slot.
- [ ] Script `remove-worktree` : supprime les bases du slot et libère le slot. Le setup libère aussi les slots dont le chemin n'existe plus.
- [ ] Clés par slot N : port serveur et port Vite (`base + 10N`), URLs dérivées (auth, CORS, client), `POSTGRES_DB` / `POSTGRES_TEST_DB` suffixés `_wN`, `AGENT_BROWSER_SESSION` (les cookies ignorent le port, donc deux worktrees sur une même session partagent le login). Pas de Valkey (non retenu), donc pas de bloc de DB Valkey.
- [ ] Registre des slots dans `.git/` (partagé entre les worktrees d'un même clone). Limite : deux clones séparés sur une machine distribuent les mêmes slots.
- [ ] Garde-fous : refuser le setup dans le clone principal ; les commandes qui gèrent les conteneurs partagés lisent toujours le `.env` du clone principal ; ne jamais exporter les variables du slot dans le shell.
- [ ] Recoupements à vérifier :
  - les ports viennent du `.env` validé, pas d'un calcul dans `vite.config.ts` (le « port juggling » relevé dans Oria) ;
  - les clones de DB par worker de l'intégration (`TEMPLATE`) partent de la base de test du slot ;
  - l'e2e garde son propre projet compose, nommé par slot pour que deux e2e puissent tourner en parallèle ;
  - `.worktreeinclude` copie le `.env` du slot 0 : tant que le setup n'a pas tourné, le worktree entre en conflit avec le clone principal ;
  - si Electric est retenu : un port et un slot de réplication par worktree.

### Répartition pre-commit / pre-push / CI
- [ ] Définir précisément ce que contient chaque niveau et les budgets de temps (ex. pre-commit < 10 s, pre-push < 3 min).
- [ ] Un point d'entrée par niveau (`gate:commit`, `gate:push`, `gate:ci`), tous lançables en local.

## Grill — reprendre ici

Le grill technique a commencé le 2026-10-03 (décisions dans « Technique de base » plus haut). Il reprend sur les décisions ouvertes ci-dessous, puis passe au domaine, à partir d'exemples de qualifications réelles.

### Technique : décisions ouvertes
- [ ] **Réponses au format wire :** pas de schéma de transformation dans les `response:`, car c'est cassé dans les deux bibliothèques (`PRACTICES.md` §9). Les dates voyagent en chaînes ISO et le client convertit explicitement. Un test qui parcourt les routes l'impose. Proposé, à confirmer.
- [ ] **Setup TypeScript 7 :** `@effect/tsgo` pour les diagnostics Effect (0.x ; il patche le binaire TS, donc à relancer au `postinstall`). Pins exacts pour TS, oxlint et tsgolint. Un alias TS 6 ne sera nécessaire que lorsque Stryker reviendra.
- [ ] **Architecture par feature :** packages par feature ou dossiers colocalisés dans les apps ? À décider après le domaine.
- [ ] **Coupure courte, mécanisme :** TanStack DB seul ne retente pas les écritures. Une écriture échouée est annulée et la saisie disparaît, donc il faut une couche de retry. Piste : `@tanstack/offline-transactions` 1.0 (outbox IndexedDB, replay avec backoff, `idempotencyKey` que le serveur doit dédupliquer). Il couvrirait aussi le rechargement de l'onglet, sans que ce soit exigé. Alternative : un retry maison en mémoire. À explorer (`PRACTICES.md` §9).
- [ ] **Conformité contract-first :** assertion de type entre `$inferSelect` / `$inferInsert` de Drizzle et le type du contrat, dans un `*.test-d.ts`. On ne génère jamais le contrat à partir de la DB.
- [ ] **Recalcul incrémental côté client :** signaux (bibliothèque ?), graphe de dépendances maison, ou live queries TanStack DB ? Dépend du domaine.
- [ ] **Ops :** hébergeur suisse, reverse proxy en prod (Traefik ou Caddy), sauvegardes, suivi d'erreurs (auto-hébergé à cause de la nLPD ?), job runner (`pg-boss`) pour la synchronisation MiData.
- [ ] **Mises à jour de dépendances :** ni Dependabot (#14320) ni Renovate (PR #42909 non fusionnée) ne gèrent les catalogues Bun. Options :
  - Renovate avec un `customManagers` en regex ;
  - un script maison ;
  - attendre la PR Renovate.
- [ ] **`@shadcn/lint` :** l'adopter dès maintenant (version 0.2, un mois d'existence, l'API va bouger) ? Comment définir les contrats `no-restyle` ?
- [ ] **Hooks :** répartition pre-commit / pre-push / CI et budgets de temps (voir plus bas).
- [ ] **Outils d'analyse :** fallow, slop-scan, slopo (voir plus bas).
- [ ] **Harness Claude Code :** `.claude/settings.json`, hooks, skills vendorisés (PRACTICES §4).
- [ ] **Worktrees parallèles :** scripts de slots (ports, bases, session navigateur), ou un projet compose complet par worktree ? Voir plus bas. Piste : Traefik en dev avec un hostname `*.localhost` par worktree (ex. `w1.azimut.localhost`) à la place des ports par slot ; les cookies seraient aussi isolés par worktree.

### Domaine : décisions ouvertes
Voir « Questions ouvertes » dans `FEATURES.md`. Points à traiter en priorité :
- la généralisation des échelles, des seuils, des conversions et des agrégations, à partir des exemples de qualifications réelles ;
- un modèle de données qu'on peut projeter vers plusieurs vues (par exercice, par thème, par rendu, bilan final, état du cours) et les statistiques de suivi (voir « Projections et visualisations » dans `FEATURES.md`) ;
- la généralisation au-delà de l'arbre : référentiel et instances, regroupements n-n décisifs ou indicatifs, règle de décision finale (voir « Analyse de trois qualifications réelles » dans `FEATURES.md`) ;
- obtenir au moins une qualification **remplie** et anonymisée, pour voir l'usage réel (commentaires, cases vides, ajustements de fin de cours) ;
- la correspondance entre les rôles de cours MiData et les droits dans Azimut, la synchronisation des cours (à la connexion ? périodique ?), et le report des qualifications dans MiData ;
- le positionnement face à Qualix ;
- les verrous (durée, inactivité) et le moment de la sauvegarde ;
- l'historique et la restauration ;
- la conservation des données et la nLPD ;
- les idées notées dans « Idées à explorer » de `FEATURES.md` : brouillon hors cours, figer, archivage, anonymisation à 3 mois, seuil final, éléments commentés sans note, accueil personnalisé, statistiques par cours, entre cours et dans le temps, synchronisation des participants MiData, envoi par mail.
