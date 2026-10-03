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

### Coverage
- Statistique indicative avec suivi de tendance. **Aucun seuil, aucun gate.** Le seul gate qualité des tests reste le score de mutation sur `domain`.
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

### Runtime et outillage de test
- [ ] Bun natif : `bun test --coverage` (reporters lcov/text) peut-il remplacer Vitest pour unit + intégration ? Comparer vitesse, fusion des rapports et compatibilité avec le browser mode et les projets Vitest.
- [ ] Mutation testing avec Bun : existe-t-il un runner Stryker pour `bun test` (officiel ou communautaire), ou un outil de mutation natif Bun ? Sinon, rester sur Vitest 4.1 + Stryker 10.
- [ ] Si Vitest reste : le lancer sous Node (coverage v8, ne marche pas sous Bun) ou sous Bun avec istanbul ? Mesurer l'écart de vitesse.
- [ ] Confirmer que `vitest run --coverage` sur plusieurs projets (unit + intégration) donne un seul rapport, et que `--merge-reports` fusionne la coverage des shards.
- [ ] Confirmer dans le guide de migration v4 que l'AST-aware remapping v8 est actif par défaut.

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

### Répartition pre-commit / pre-push / CI
- [ ] Définir précisément ce que contient chaque niveau et les budgets de temps (ex. pre-commit < 10 s, pre-push < 3 min).
- [ ] Un point d'entrée par niveau (`gate:commit`, `gate:push`, `gate:ci`), tous lançables en local.

## Grill — reprendre ici

Le prochain grill porte d'abord sur la **partie technique de base (tooling)**, puis sur le domaine, à partir d'exemples de qualifications réelles.

### Technique : décisions ouvertes
- [ ] **Bibliothèque de schémas : Valibot ou Effect Schema.** Préférence pour Valibot. Faits établis :
  - Effect Schema v4 est stable et s'exporte en Standard Schema avec `Schema.toStandardSchemaV1`.
  - Valibot 1.5 marche avec Elysia 1.4 via Standard Schema.
  - Un spike doit vérifier deux points : l'inférence Eden des réponses par statut (`response: {200, 400…}`) avec Valibot, et la génération OpenAPI via `@valibot/to-json-schema`.
- [ ] **Conformité contract-first :** assertion de type entre `$inferSelect` / `$inferInsert` de Drizzle et le type du contrat, dans un `*.test-d.ts`. On ne génère jamais le contrat à partir de la DB.
- [ ] **Drizzle : 0.45.3 stable ou 1.0.0-rc.4.** La rc.4 intègre `drizzle-orm/valibot` et `drizzle-orm/effect-schema`, mais elle est toujours en RC depuis fin juin, avec des refactors cassants.
- [ ] **Store client et transport :**
  - TanStack DB (0.11), avec des Query collections alimentées par Eden et une invalidation par WebSocket ?
  - Ou des Electric collections (sync service 1.8, collection 0.5) ? Electric demande un conteneur en plus, `wal_level=logical`, un proxy d'auth qui fixe le `WHERE` côté serveur, et un volume persistant.
  - Le WebSocket des verrous et de la présence reste nécessaire dans les deux cas.
- [ ] **Recalcul incrémental côté client :** signaux (bibliothèque ?), graphe de dépendances maison, ou live queries TanStack DB ?
- [ ] **Mises à jour de dépendances :** ni Dependabot (#14320) ni Renovate (PR #42909 non fusionnée) ne gèrent les catalogues Bun. Options :
  - Renovate avec un `customManagers` en regex ;
  - un script maison ;
  - attendre la PR Renovate.
- [ ] **`@shadcn/lint` :** l'adopter dès maintenant (version 0.2, un mois d'existence, l'API va bouger) ? Comment définir les contrats `no-restyle` ?
- [ ] **Bibliothèque i18n :** Paraglide 2.25 (fonctions typées, éliminées du bundle si inutilisées), Lingui 6.9 (supporte explicitement Vite 8) ou i18next 26 ?
- [ ] **Runner de tests :** Vitest 4.1 sous Node, comme indiqué plus haut. Stryker ne marche ni avec Vitest 5 (#6210) ni officiellement avec `bun test`, où il n'existe qu'un runner communautaire. Clore ou non la piste `bun test` (section « Runtime et outillage de test » plus bas).
- [ ] **TypeScript :** 6.0.3 pour la compilation, avec TS 7 en vérification seulement ?
- [ ] **Monorepo :** Turborepo et le découpage en packages (`contracts`, `domain`, `env`, `testing`, `ui`, apps).
- [ ] **Hooks :** répartition pre-commit / pre-push / CI et budgets de temps (voir plus bas).
- [ ] **Outils d'analyse :** fallow, slop-scan, slopo (voir plus bas).
- [ ] **Licence :** open source, laquelle choisir ?
- [ ] **Harness Claude Code :** `.claude/settings.json`, hooks, skills vendorisés (PRACTICES §4).

### Domaine : décisions ouvertes
Voir « Questions ouvertes » dans `FEATURES.md`. Points à traiter en priorité :
- la généralisation des échelles, des seuils, des conversions et des agrégations, à partir des exemples de qualifications réelles ;
- la correspondance entre les rôles de cours MiData et les droits dans Azimut, la synchronisation des cours (à la connexion ? périodique ?), et le report des qualifications dans MiData ;
- le positionnement face à Qualix ;
- les verrous (durée, inactivité) et le moment de la sauvegarde ;
- l'historique et la restauration ;
- la conservation des données et la nLPD.
