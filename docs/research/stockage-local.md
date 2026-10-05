# Stockage local du prototype : options et compatibilités

Ticket : fuzoh/azimut#2 (carte #1). Recherche du 2026-10-05. Sources primaires uniquement (docs officielles via `ctx7`, dépôts GitHub, npm registry). Rien n'a été exécuté ni mesuré : tous les chiffres de performance cités sont ceux des auteurs, pas les nôtres.

## Résumé

1. **Le « stockage » du prototype se joue en mémoire.** Dans TanStack DB, les live queries tournent sur des collections **en mémoire, sur le thread où elles vivent**. La persistance (SQLite/OPFS) n'est qu'un cache d'écriture/relecture sous les collections, jamais un moteur de requête pour les live queries. Pour un prototype jetable dont les 900k cases sont générées de façon déterministe, la persistance n'apporte rien à l'incertitude visée.
2. **Aucune des options ne fait le calcul de propagation à notre place.** TanStack DB maintient incrémentalement ses live queries (d2ts, differential dataflow). PGlite relance la requête et diffe. Dexie relance la requête. SQLite WASM n'a pas de live query. La propagation (signaux) reste à notre charge dans tous les cas.
3. **Le Web Worker n'est pas un mode supporté de TanStack DB.** Aucune doc ni issue trouvée sur l'exécution du moteur de live queries hors du thread principal. Seuls PGlite (`PGliteWorker`) et SQLite WASM (OPFS, worker obligatoire) ont un mode worker officiel, au prix du clonage structuré des résultats.
4. **Fidélité à la prod** : PGlite est du vrai Postgres (WASM) ; TanStack DB est le futur store client. Aucun adaptateur TanStack DB officiel pour PGlite n'a été trouvé dans le dépôt.

## Versions vérifiées (npm, 2026-10-05)

| Paquet | Version | Dernière publication |
| --- | --- | --- |
| `@tanstack/db` | 0.11.3 | 2026-10-02 |
| `@tanstack/react-db` | 0.5.3 | 2026-10-02 |
| `@tanstack/browser-db-sqlite-persistence` | 0.2.28 | 2026-10-02 |
| `@tanstack/db-sqlite-persistence-core` | 0.4.3 | 2026-10-02 |
| `@electric-sql/pglite` | 0.5.8 | 2026-08-26 |
| `@sqlite.org/sqlite-wasm` | 3.53.4-build2 | 2026-10-02 |
| `@journeyapps/wa-sqlite` (utilisé par la persistance TanStack) | 2.0.6 | 2026-09-23 |
| `wa-sqlite` (paquet non scopé) | 1.0.0 | 2024-01-05 (périmé sur npm ; le dépôt `rhashimoto/wa-sqlite` est actif) |
| `dexie` | 4.4.6 | 2026-09-10 |
| `@preact/signals-core` / `alien-signals` | 1.14.4 / 3.2.1 | 2026-07 / 2026-05 |

Peer deps de `@tanstack/react-db` : `react >=18` (donc React 19 OK). `@tanstack/db` : `typescript >=4.7`. Bun 1.4.2 et Vite 8.3.2 sont les versions courantes ; aucune des sources lues ne signale d'incompatibilité Bun, mais **rien n'a été testé** (voir « À vérifier »).

## Option 1 : collections TanStack DB locales (en mémoire)

- **Types** : `localOnlyCollectionOptions` (mémoire, `initialData`, sans persistance) et `localStorageCollectionOptions` (persiste dans `localStorage`/`sessionStorage`, synchronise les onglets par événements `storage`). Sources : [local-only-collection.md](https://github.com/TanStack/db/blob/main/docs/collections/local-only-collection.md), [référence localStorageCollectionOptions](https://github.com/tanstack/db/blob/main/docs/reference/functions/localStorageCollectionOptions.md).
- **`localStorageCollection` est inadapté** à ce volume : `localStorage` est synchrone et plafonné à quelques Mo par origine (limite navigateur, non documentée par TanStack).
- **Live queries** : natives. Les requêtes sont compilées en pipelines IVM (differential dataflow, `d2ts`, voir [db-ivm README](https://github.com/tanstack/db/blob/main/packages/db-ivm/README.md)). Le dépôt annonce « ~0,7 ms pour mettre à jour une ligne dans une collection triée de 100 000 éléments sur M1 Pro » ([overview.md](https://github.com/TanStack/db/blob/main/docs/overview.md)). Mesure des auteurs, 100k et non 900k lignes, sans CPU bridé.
- **Mode de chargement** : `eager` (défaut) charge toute la collection ; l'overview le recommande pour « <10k lignes » et recommande `on-demand` pour « >50k lignes ». `on-demand` charge ce que demandent les live queries via `loadSubset`, ce qui suppose une **source** capable de répondre à des prédicats (Query, Electric, PowerSync, ou la persistance SQLite), pas une collection locale pure. Nos 900k cases en `eager` dépassent nettement la plage recommandée par la doc : à éprouver, c'est précisément une des incertitudes du prototype.
- **Piège documenté** : filtrer avec `.filter()` JS après la requête annule la maintenance incrémentale ; il faut utiliser les opérateurs de requête (`eq`, `where`…). Même constat pour l'API fonctionnelle (`fn.select`), qui n'utilise ni l'optimiseur ni les index de collection ([live-queries.md](https://github.com/TanStack/db/blob/main/docs/guides/live-queries.md), [SKILL live-queries](https://github.com/TanStack/db/blob/main/packages/db/skills/db-core/live-queries/SKILL.md)). Le calcul de propagation du graphe (agrégats récursifs sur DAG) n'est a priori pas exprimable en requête et restera en code (signaux).
- **Web Worker** : non documenté. Les collections et le moteur IVM sont du JS exécuté sur le thread qui les crée. Rien n'empêche techniquement de créer les collections dans un worker et de poster les résultats au thread principal, mais ce n'est pas un chemin supporté ni illustré. La recherche d'issues « worker », « SharedWorker », « off main thread » dans `TanStack/db` n'a renvoyé aucun ticket pertinent hors persistance et Cloudflare Workers.
- **Fidélité** : maximale, c'est le futur store client (`docs/TODO.md`, `docs/PRACTICES.md`).
- **Maturité** : 0.x, sorties fréquentes (cf. `PRACTICES.md`). Note : l'overview actuel utilise `collectionOptions`/`DbClient`/`DbProvider`, alors que les docs de collection locale utilisent encore `createCollection`. L'API bouge ; figer la version dans le prototype.

## Option 2 : persistance SQLite de TanStack DB (`persistedCollectionOptions`)

- **Nature** : paquet `@tanstack/browser-db-sqlite-persistence` (wa-sqlite + OPFS). Sans option `sync`, la collection charge/sauve ses lignes locales via un adaptateur « loopback » ; avec `sync`, elle enveloppe Query/Electric/PowerSync. Les lignes sont **chargées en mémoire** dans la collection (mode `eager`), ou à la demande en `syncMode: 'on-demand'`. Sources : [guide sqlite-persistence](https://github.com/TanStack/db/blob/main/docs/guides/sqlite-persistence.md), [README du paquet](https://github.com/TanStack/db/blob/main/packages/browser-db-sqlite-persistence/README.md), [SKILL persistence](https://github.com/TanStack/db/blob/main/packages/db/skills/db-core/persistence/SKILL.md).
- **Worker** : `openBrowserWASQLiteOPFSDatabase` démarre **son propre Web Worker dédié** pour le SQL (OPFS sync access handles). Seule l'E/S de persistance y est déportée ; les live queries restent sur le thread principal.
- **Migration** : pas de fonction de migration ; un changement de `schemaVersion` réinitialise la collection (et lève une erreur pour les collections locales sans source). Les données générées seraient perdues à chaque changement de forme (acceptable si régénérées).
- **Coût d'écriture à grande échelle (primaire)** : l'issue [TanStack/db#1752](https://github.com/TanStack/db/issues/1752) (fermée, 2026-09-28) mesure, avec la version 0.2.12, 66 000 à 80 000 mutations → **24,8 s de temps d'adaptateur sérialisé**, un seul appel jusqu'à 7,4 s, environ 3 allers-retours worker par ligne ; ~14 000 mutations ≈ 1,7 à 2,1 s. La correction #1916 (batch des remplacements à froid) est livrée, mais le RFC [#1659](https://github.com/TanStack/db/issues/1659) précise que la latence Chromium/OPFS multi-collections n'a **pas été remesurée**. Ordre de grandeur pour nous : 900k cases = plus de 10× ces volumes. Aucune donnée primaire à ce volume.
- **Autres points du RFC #1659** : propriété exclusive OPFS multi-onglets non garantie, récupération de fichier corrompu non fournie, `Collection.isReady` n'attend pas la restauration (signaux `isPersistedReady` séparés, `initialRender` en mode eager uniquement). Exige un contexte sécurisé et OPFS.
- **Vite** : l'issue [#1413](https://github.com/TanStack/db/issues/1413) rapportait un chemin absolu de Worker dans le bundle (`/assets/opfs-worker-….js`) ; fermée, statut du correctif non vérifié sur `0.2.28`. À tester au premier build.
- **Fidélité** : bonne côté API (même collection), mais SQLite côté client ≠ Postgres serveur. Sans serveur dans le prototype, cela ne change pas l'incertitude visée.

## Option 3 : PGlite (Postgres WASM) 0.5.8

- **Live queries** ([doc](https://github.com/electric-sql/pglite/blob/main/docs/docs/live-queries.md)) : extension `live` avec trois méthodes. `live.query` relance la requête à chaque changement des tables dépendantes (fenêtrage offset/limit possible). `live.incrementalQuery` maintient une table temporaire de l'état précédent dans Postgres, relance la requête, diffe, et ne copie que les changements de WASM vers JS ; il exige une colonne clé. `live.changes` émet les insert/update/delete. Donc **pas de calcul incrémental au sens IVM** : le coût de requête est repayé à chaque modification, seule la copie vers JS est incrémentale. Aucun chiffre officiel à 900k lignes trouvé.
- **Worker** ([multi-tab-worker.md](https://github.com/electric-sql/pglite/blob/main/docs/docs/multi-tab-worker.md)) : `PGliteWorker` expose la même API depuis un worker, avec élection d'un leader entre onglets. L'extension `live` s'utilise côté thread principal via les options de `PGliteWorker`. Les résultats sont clonés vers le thread principal (coût proportionnel à la taille des résultats ; pas de chiffre officiel).
- **Persistance** ([filesystems.md](https://github.com/electric-sql/pglite/blob/main/docs/docs/filesystems.md)) : mémoire (`memory://`, défaut), IndexedDB (`idb://`, charge tous les fichiers en mémoire au démarrage et les flushe fichier entier après requête ; `relaxedDurability` pour différer), OPFS AHP (`opfs-ahp://`, worker obligatoire). PGlite est **mono-connexion**.
- **Fidélité** : la plus haute côté SQL (vrai Postgres, mêmes types et fonctions que le serveur futur). Mais le futur client est TanStack DB, pas du SQL côté client. Un usage naturel : PGlite comme « source » et collections TanStack DB alimentées depuis elle ; aucun adaptateur officiel trouvé dans les paquets du dépôt `TanStack/db` (angular, browser/capacitor/cloudflare/electron/expo/node/react-native/tauri sqlite-persistence, db-collections, electric, offline-transactions, powersync, query, rxdb, trailbase, vue…). Un pont se ferait à la main (par ex. `live.changes` vers une collection).
- **Poids/maturité** : paquet décompressé ~25 Mo (npm `unpackedSize`), 0.x, dernier push dépôt 2026-08-26. Vite : `optimizeDeps.exclude: ['@electric-sql/pglite']`, et `worker.format: 'es'` pour le multi-tab worker ([bundler-support.md](https://github.com/electric-sql/pglite/blob/main/docs/docs/bundler-support.md)).

## Option 4 : SQLite WASM (`@sqlite.org/sqlite-wasm`, wa-sqlite)

- **Live queries** : aucune fonctionnalité fournie. Le build expose `sqlite3_update_hook` / `sqlite3_preupdate_hook` ([api-c-style](https://sqlite.org/wasm/doc/trunk/api-c-style.md)), donc une invalidation maison est possible ; ce serait du développement, pas une option clés en main.
- **Worker** : OPFS n'est disponible qu'en contexte worker ([persistence](https://sqlite.org/wasm/doc/trunk/persistence.md)). Deux familles de VFS : `opfs` (performances/concurrence, exige les en-têtes COOP/COEP) et `opfs-sahpool` (sans COOP/COEP, une seule connexion). Le README du paquet donne la config Vite (en-têtes COOP/COEP + `optimizeDeps.exclude: ['@sqlite.org/sqlite-wasm']`) ([README](https://github.com/sqlite/sqlite-wasm/blob/main/README.md)). Les API Worker1/Promiser sont signalées comme dépréciées dans la doc officielle ([api-worker1](https://sqlite.org/wasm/doc/trunk/api-worker1.md)) : prévoir un wrapper postMessage maison.
- **Fidélité** : faible côté dialecte (SQLite ≠ Postgres), mais c'est le moteur sous la persistance TanStack DB et sous PowerSync.
- **Maturité** : très actif (3.53.4 du 2026-10-02).

## Option 5 : IndexedDB / Dexie 4.4.6

- **Live queries** : `liveQuery()` / `useLiveQuery` ré-exécutent la fonction de requête quand un changement touche les données observées ([doc](https://dexie.org/docs/liveQuery%28%29), [useLiveQuery](https://dexie.org/docs/dexie-react-hooks/useLiveQuery%28%29)). Pas d'incrémental : on repaie la requête. À 900k enregistrements et agrégats, le coût serait dominé par la désérialisation IndexedDB (clonage structuré, asynchrone) ; déduction, non mesurée.
- **Worker** : IndexedDB est accessible dans les workers ; la doc lue ne détaille pas liveQuery dans ce contexte : à vérifier si retenu.
- **Fidélité** : faible (clé-valeur indexé, pas de relationnel). `@tanstack/dexie-db-collection` n'existe pas sur npm (E404) ; seul un paquet communautaire apparaît dans `ctx7`, non évalué.
- **Maturité** : bonne (4.4.6, dépôt actif au 2026-09-28).

## Tableau comparatif

| Critère | TanStack DB local-only (mémoire) | TanStack DB + persistance SQLite/OPFS | PGlite | SQLite WASM | Dexie/IndexedDB |
| --- | --- | --- | --- | --- | --- |
| Live queries sur données brutes | Oui, incrémentales (IVM) | Idem (sur la copie mémoire) | Oui, re-requête + diff (`incrementalQuery`) | Non (à construire via hooks) | Oui, re-requête |
| Mise à jour d'une case à ~900k | ~0,7 ms/ligne annoncé à 100k (non remesuré) | Idem + écriture persistée async | Dépend de la requête ; aucun chiffre officiel | À construire | Re-requête, désérialisation |
| Calcul de propagation (signaux) | Hors scope, à brancher sur les changements de collection | Idem | Hors scope | Hors scope | Hors scope |
| Web Worker | Non supporté officiellement | Seule la persistance, dans un worker dédié | `PGliteWorker` officiel, `live` côté main | OPFS exige un worker ; wrapper maison | Possible, non détaillé |
| Coût de communication main/worker | Nul (même thread), ou à construire | Écritures SQL async (~3 allers-retours/ligne avant #1916) | Clonage structuré des résultats | À construire | Clonage structuré |
| Fidélité au couple Postgres + TanStack DB | Totale côté client | Totale côté API, SQLite dessous | Postgres réel, pas de pont TanStack officiel | Faible | Faible |
| Persistance inter-sessions | Aucune | Oui (OPFS) | Oui (idb/opfs-ahp) | Oui (OPFS) | Oui |
| Maturité / version | 0.11.3 (0.x) | 0.2.28 (0.x, RFC durcissement clos 2026-09-30) | 0.5.8 (0.x) | 3.53.4 (stable) | 4.4.6 (stable) |
| Vite 8 / Bun | Non testé | Non testé (chemin du Worker à vérifier) | `optimizeDeps.exclude` requis | `optimizeDeps.exclude` + COOP/COEP | Non testé |

## Recommandation (faits ; la décision reste à l'humain)

Ce que les sources permettent d'affirmer :

- Pour les incertitudes visées (le modèle tient-il, la généralisation couvre-t-elle, l'app reste-t-elle fluide), **le stockage le moins coûteux et le plus fidèle au futur client est des collections TanStack DB en mémoire** (`localOnlyCollectionOptions`), alimentées par le générateur déterministe. La persistance ne répond à aucune de ces incertitudes et ajoute un coût et un risque mesurés ailleurs (#1752).
- Le risque principal de cette option : 900k lignes en collections `eager` sont **hors de la plage recommandée** par la doc (< 10k eager, > 50k on-demand), et le moteur IVM tourne sur le thread de la collection. Le prototype devrait précisément mesurer cela (tâche > 50 ms ?). Si c'est bloquant, deux replis : (a) PGlite en worker avec `live.incrementalQuery`, au prix d'une re-requête par modification ; (b) collections créées dans un worker maison, hors cadre supporté.
- « Base locale comme source + collections TanStack DB » : seule la persistance SQLite de TanStack DB est un chemin officiel ; PGlite vers TanStack DB n'a pas d'adaptateur officiel.
- Les données étant synthétiques et déterministes (carte #1, « Not yet specified »), la régénération remplace tout besoin de persistance.

Reste à trancher par l'humain :

1. Mémoire seule (local-only) ou ajout d'une couche persistante ? Les sources suggèrent que la persistance ne vaut pas son coût pour un prototype jetable.
2. La fidélité SQL au Postgres serveur est-elle un objectif **du prototype** (par ex. tester la propagation en SQL) ? Si oui PGlite devient pertinent ; sinon la fidélité utile est celle du store client.
3. Où exécuter la propagation (signaux) et le moteur de live queries : thread principal, ou worker maison (non supporté par TanStack DB) ? Cela dépend de mesures précoces.
4. Accepter de dépendre d'une API 0.x qui bouge (`collectionOptions`/`DbClient` vs `createCollection`) ?

## À vérifier (non fait ici)

- Mesure réelle : charger 900k cases dans des collections `localOnly` (tâches longues au chargement, mémoire, latence d'une mise à jour avec CPU ×4).
- Démarrage sous Bun + Vite 8.3.2 de `@tanstack/react-db` 0.5.3 (aucune incompatibilité trouvée, non exécuté).
- Si la persistance est retenue : état du bug #1413 sur `0.2.28`.
- Si PGlite est retenu : coût d'un `live.incrementalQuery` sur 900k lignes et taille des clones vers le thread principal.

## Sources principales

- TanStack DB : https://github.com/TanStack/db (`docs/overview.md`, `docs/guides/live-queries.md`, `docs/guides/sqlite-persistence.md`, `docs/collections/local-only-collection.md`, `packages/browser-db-sqlite-persistence/README.md`, `packages/db-ivm/README.md`), issues #1752, #1659, #1413.
- PGlite : https://github.com/electric-sql/pglite (docs `live-queries.md`, `multi-tab-worker.md`, `filesystems.md`, `bundler-support.md`).
- SQLite WASM : https://sqlite.org/wasm/doc/trunk/persistence.md, https://sqlite.org/wasm/doc/trunk/api-c-style.md, https://github.com/sqlite/sqlite-wasm.
- Dexie : https://dexie.org/docs/liveQuery%28%29, https://dexie.org/docs/dexie-react-hooks/useLiveQuery%28%29.
- Versions : `npm view <paquet> version time.modified` le 2026-10-05.
