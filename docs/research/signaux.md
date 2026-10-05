# Propagation des calculs par signaux : bibliothèques et intégration

Ticket : fuzoh/azimut#3 (carte #1). Date de l'étude : 5 octobre 2026.
Statut : constats et mesures. Les décisions sont listées en fin de document, elles restent à prendre par l'humain.

## Résumé

- Pour l'échelle visée (2000 nœuds par participant et par grille, une case modifiée à la fois), **toutes les bibliothèques candidates sont largement assez rapides** : une mise à jour d'une case plus la relecture des 500 calculs coûte de l'ordre de 3 à 80 microsecondes en Node (mesure locale, voir section 3). Le seuil de 50 ms par tâche n'est pas menacé par la propagation elle-même.
- Le vrai discriminant est **la mémoire à 1,2 M de nœuds** (environ 240 à 620 octets par nœud selon la bibliothèque, soit 290 à 740 Mo) et **le coût d'instanciation** (180 ms à 900 ms pour construire 1,2 M nœuds sur un poste de bureau, avant bridage CPU ×4). Cela plaide pour instancier le graphe **à la demande** (participant ouvert) plutôt que tout d'un coup, quelle que soit la bibliothèque.
- Classement des benchmarks publiés (js-reactivity-benchmark, snapshot du 19 septembre 2026) : alien-signals est le plus rapide sur toutes les familles, @preact/signals-core est à 1,2 à 1,5× derrière, Angular et Solid à 2 à 4×, le polyfill TC39 est le plus lent (jusqu'à 10× sur les graphes dynamiques).
- **Le polyfill TC39 est à écarter** : proposition au stade 1, README du polyfill : « Do not use this in production », dernière publication en janvier 2025.
- Aucune bibliothèque n'a de binding React 19 officiel qui soit sans réserve. Le chemin le plus simple et le plus sûr est un `useSyncExternalStore` écrit à la main, par cellule ou par nœud affiché (section 5).
- Un **DAG maison** (tableaux typés, ordre topologique, propagation de « dirty » avec coupure) est faisable, a un coût mémoire quasi nul (4 octets par nœud mesurés) et reste le plus rapide, mais il faut écrire et prouver soi-même la correction (dépendances dynamiques, explication d'un résultat). Voir section 6.

## 1. Versions et maintenance (vérifiées le 5 octobre 2026)

| Candidat | Version npm | Dernière publication | Dépôt, dernier push | Remarques |
| --- | --- | --- | --- | --- |
| alien-signals | 3.2.1 | 14 mai 2026 | stackblitz/alien-signals, 10 juin 2026, 3,2 k étoiles, 7 issues ouvertes | Algorithme repris dans Vue 3.6 et dans xstate (README). Un seul mainteneur principal (auteur du réactif de Vue). |
| @preact/signals-core | 1.14.4 | 7 juillet 2026 | preactjs/signals, 30 septembre 2026, 4,5 k étoiles | Maintenu activement par l'équipe Preact. |
| @preact/signals-react | 3.12.0 | 4 août 2026 | idem | Binding React (voir section 5). |
| signal-polyfill (TC39) | 0.2.2 | 17 janvier 2025 | proposal-signals/signal-polyfill ; tc39/proposal-signals, push du 25 janvier 2026 | Stade 1 TC39. Le README du polyfill dit de ne pas l'utiliser en production. |
| @angular/core (signals) | 22.2.1 | 30 septembre 2026 | angular/angular | Les signaux sont dans le paquet `@angular/core` entier. Utilisables hors composant (les mesures du benchmark le font avec le primitif Watch), mais on tire tout `@angular/core`. |
| solid-js | 1.9.15 | 30 septembre 2026 | solidjs/solid | `createSignal`/`createMemo` exigent un `createRoot` (propriétaire). Le benchmark note que l'entrée Node/serveur n'a pas le même comportement que l'entrée client. Solid 2.0 : `@solidjs/signals` en 2.0.0-rc.0 (tag latest) et rc.13 (tag next). |
| @tanstack/db | 0.11.3 | 2 octobre 2026 | TanStack/db, 3 octobre 2026 | README : « currently in BETA » (badge status-beta). |
| @tanstack/react-db | 0.5.3 | 2 octobre 2026 | idem | |

Sources : `npm view` (versions et dates), API GitHub (push, étoiles), README des dépôts cités.

## 2. Benchmarks publiés

Source : https://github.com/transitive-bullshit/js-reactivity-benchmark (README et `results/latest.md`, exécution du 19 septembre 2026, Node 25.9.0, Apple M3 Pro, minimum de 3 échantillons, versions : alien-signals 3.2.1, @preact/signals-core 1.14.4, signal-polyfill 0.2.2, @angular/core 22.1.7, solid-js 1.9.15).

Moyenne géométrique du rapport au plus rapide, par famille (1,00× = le plus rapide partout) :

| Moteur | kairo | mol | s | dynamic | cellx |
| --- | ---: | ---: | ---: | ---: | ---: |
| alien-signals | 1,02 | 1,33 | 1,02 | 1,00 | 1,00 |
| @preact/signals-core | 1,20 | 1,30 | 1,31 | 1,29 | 1,45 |
| Angular signals | 2,93 | 1,35 | 2,39 | 2,70 | 2,26 |
| SolidJS 1.9 | 4,07 | 1,58 | 2,92 | 3,54 | 1,84 |
| Polyfill TC39 | 6,19 | 1,41 | 3,63 | 10,45 | 3,28 |

Exemple absolu, graphe dynamique « 1000x12 - 4 sources - dynamic (large web app) » (ms par charge de travail, pas par opération) : alien-signals 202, Preact 266, Angular 554, Solid 545, polyfill TC39 10 089.

Limites déclarées par le benchmark lui-même : graphes de petites primitives, mesure en Node, **pas de mesure de mémoire**, pas de rendu, pas de framework ; « a few minimum-of-three samples are a local snapshot, not a statistically robust universal ranking ». Il n'existe donc **pas de benchmark publié de la mémoire par nœud ni du comportement à 1 M de nœuds** dans cette source ; c'est pourquoi une mesure locale a été faite (section 3).

## 3. Mesure locale (indicative)

Scripts reproductibles : `docs/research/signaux-bench/` (`bench.mjs`, `custom.mjs`, `deep.mjs`). Environnement : Node v26.10.0, AMD Ryzen AI Max+ 395, `--expose-gc`, sans bridage CPU. Les versions sont celles de la section 1.

Graphe synthétique par « grille » : 1500 signaux de données (valeurs 0 à 4), 500 calculs avec 5 sources chacun (70 % données, 30 % calculs antérieurs), résultat borné par `% 101` (coupure possible quand la valeur ne change pas). Aucun effet n'est enregistré : lecture paresseuse (pull) de tous les calculs.

**Mémoire et construction, 600 grilles = 1,2 M de nœuds** (200 participants × 3 grilles, structure complète en mémoire) :

| Moteur | Mémoire du tas | Octets par nœud | Construction + évaluation initiale |
| --- | ---: | ---: | ---: |
| alien-signals | 300 Mo | 250 | 181 ms |
| @preact/signals-core | 288 Mo | 240 | 176 ms |
| Polyfill TC39 | 381 Mo | 317 | 710 ms |
| Angular signals | 739 Mo | 616 | 884 ms |
| DAG maison (Int32Array, adjacence CSR partagée) | 5 Mo | 4 | 5 ms |

Pour une seule grille (2000 nœuds), les coûts par nœud sont 325 (alien), 325 (Preact), 435 (polyfill) et 885 octets (Angular) : même ordre de grandeur.

**Mise à jour d'une case plus relecture des 500 calculs de la grille** (2000 mises à jour, tas de 1,2 M de nœuds présent) :

| Moteur | médiane | p99 | max |
| --- | ---: | ---: | ---: |
| alien-signals | 0,003 ms | 0,030 ms | 0,064 ms |
| @preact/signals-core | 0,009 ms | 0,033 ms | 0,067 ms |
| Polyfill TC39 | 0,065 ms | 0,112 ms | 0,156 ms |
| Angular signals | 0,079 ms | 0,103 ms | 0,125 ms |
| DAG maison | 0,001 ms | 0,006 ms | 0,026 ms |

Réserves à garder en tête :

- Le graphe est synthétique. La coupure par valeur égale limite la propagation ; un cas pire (chaque changement traverse tout le graphe) n'a pas été mesuré. Il reste borné par 500 recalculs de ~5 additions.
- Ces temps sont ceux d'un poste de bureau récent. Le critère du projet est Chrome avec CPU bridé ×4, sur le fil principal avec le rendu : la mesure sera à refaire dans le prototype.
- La mémoire mesurée est celle du moteur et des fermetures de ce micro-benchmark. Dans le prototype s'ajoutent les données brutes (900 k cases dans une collection TanStack DB, voir section 5) : la valeur d'une case existera alors à deux endroits si chaque case est aussi un signal.
- **Profondeur de récursion** (`deep.mjs`) : une chaîne de calculs dépendants lue d'un coup échoue avec `RangeError: Maximum call stack size exceeded` entre 1500 et 5000 niveaux de profondeur pour les quatre moteurs (la lecture d'un calcul non évalué appelle récursivement ses sources). Sans objet pour des grilles de qualification dont la profondeur de DAG est de quelques dizaines de niveaux, à vérifier sur la grille réelle.

## 4. Comparaison fonctionnelle

| Critère | alien-signals | @preact/signals-core | Polyfill TC39 | Angular signals | Solid 1.9 | DAG maison |
| --- | --- | --- | --- | --- | --- | --- |
| Modèle | push-pull, calculs paresseux, effets poussés | push-pull, calculs paresseux, effets poussés | Pull, notification via `Watcher` (les effets sont à écrire) | Pull, notification via `Watch` interne | Push-pull, mémos dans un propriétaire (`createRoot`) | Au choix (typiquement push de « dirty » puis recalcul en ordre topologique) |
| Batching | `startBatch()` / `endBatch()` (flush des effets à la sortie, profondeur imbriquée) | `batch(fn)` | Pas de batch intégré : l'effet est écrit par l'appelant | Pas d'API de batch publique pour les calculs, effets planifiés par le framework | `batch(fn)` | Par construction : on pose les « dirty », on recalcule une fois |
| Dépendances dynamiques | Oui, suivi automatique à chaque exécution | Oui | Oui | Oui | Oui | Non par défaut, à construire |
| Création et destruction dynamiques de nœuds | `computed()` sans propriétaire ; `effectScope` et `effect` retournent un disposeur ; effets imbriqués nettoyés à la ré-exécution. Un calcul sans abonné est libérable par le GC (liens doublement chaînés détachés quand plus observé). | Idem : `effect` retourne un disposeur, un calcul non observé se désabonne de ses sources | Idem, mais le polyfill est préliminaire | Les calculs sont libérés par le GC quand non référencés, les effets exigent le contexte d'injection ou `untracked` | Le mémo meurt avec son `createRoot` (`dispose` à appeler) | Totalement sous contrôle, mais copie de grille et correspondances stables à écrire |
| Coupure si valeur égale | Oui (égalité stricte) | Oui | Oui (option `equals`) | Oui (option `equal`) | Oui (`equals`) | À écrire (fait dans la mesure ci-dessus) |
| Expliquer un résultat / nœud décisif | Pas d'API de graphe publique ; l'ensemble des dépendances n'est pas exposé en API stable | Pas d'API publique | `Signal.subtle` expose notamment `introspectSources` / `introspectSinks` | Pas d'API publique | Pas d'API publique | Natif : on possède les arêtes |
| Web Worker | Pas de dépendance au DOM ni à `window` ; utilisable tel quel | Idem | Idem | Tire `@angular/core` ; fonctionne sans DOM mais poids du paquet | L'entrée navigateur est à résoudre explicitement (le benchmark signale que l'entrée Node/serveur diffère) | Idem, et tableaux typés transférables (`SharedArrayBuffer` exige l'isolation cross-origin COOP/COEP) |
| Maturité | Stable 3.x, adopté par Vue 3.6 et xstate | Stable, très utilisé | Stade 1, « ne pas utiliser en production » | Stable (framework Google) | Stable 1.9 ; 2.0 en release candidate | Aucune, c'est du code du projet |

Notes de sources : API alien-signals (`signal`, `computed`, `effect`, `effectScope`, `startBatch`, `endBatch`) dans https://github.com/stackblitz/alien-signals (README et documentation de l'API) ; `batch`, `effect` avec cleanup dans https://github.com/preactjs/signals/tree/main/packages/core ; Watcher, `Signal.subtle` dans https://github.com/tc39/proposal-signals ; algorithme Angular dans https://github.com/angular/angular/blob/main/packages/core/primitives/signals/README.md. Le comportement d'égalité et la compatibilité Worker des cases « Oui » ou « Pas de dépendance au DOM » ont été déduits de l'API et du code des paquets, pas de tests dans un vrai Worker. **Non vérifié** : le détail de l'API `Signal.subtle` au-delà du README, et le comportement des effets Angular hors injection.

### Contraintes de conception de l'algorithme alien-signals (à connaître)

Le README annonce un cœur sans `Array`/`Set`/`Map` ni récursion (listes doublement chaînées, `Link` par arête). Conséquence mesurée : environ 250 octets par nœud, dont les arêtes. Le cœur de propagation n'est pas récursif, mais la première lecture d'un calcul, elle, appelle les fonctions utilisateur récursivement (limite de profondeur de la section 3).

## 5. Intégration

### React 19

- **`useSyncExternalStore`** (doc React, https://react.dev/reference/react/useSyncExternalStore) : `subscribe(callback)` renvoie une fonction de désabonnement, `getSnapshot` doit renvoyer la même valeur (`Object.is`) tant que le store n'a pas changé ; ne jamais créer un nouvel objet à chaque appel. Pour un nœud de calcul dont la valeur est un nombre ou une chaîne, c'est direct. Pour une valeur objet (valeur effective plus signalements), il faut renvoyer une référence stable tant que le calcul n'a pas produit une nouvelle valeur.
- Patron sans dépendance supplémentaire, valable avec alien-signals ou Preact : `subscribe = (cb) => effect(() => { node(); cb(); })` (avec la première exécution ignorée), `getSnapshot = () => node()`. Un abonnement par cellule visible : à valider en performance sur une table 200 × ~100 colonnes (20 000 cellules visibles au maximum sans virtualisation, ce qui n'a pas été mesuré).
- **@preact/signals-react 3.12.0** (peer React 16.14 à 19.x) : recommande une transformation Babel (`@preact/signals-react-transform`) ou le hook `useSignals()` à appeler dans chaque composant. Il s'appuie sur un hook interne de React et sur `use-sync-external-store`. Un ticket ouvert puis fermé, preactjs/signals#652, rapporte que la combinaison avec `babel-plugin-react-compiler` ne fonctionne pas avec des signaux globaux (un commentaire de mainteneur les situe comme non supportés, `useSignal` local fonctionne) ; l'issue #566 portait sur le support de React 19. **Je n'ai pas vérifié l'état actuel de cette incompatibilité avec le compilateur React ; c'est à tester dans le prototype si ce binding est retenu.** Le `useSyncExternalStore` à la main évite la question : le compilateur voit un hook standard.
- **alien-signals** : pas de binding officiel. Des projets communautaires existent (listés dans le README : `react-alien-signals`, `reactjs-signal`), non évalués ici.
- Le polyfill TC39, Angular et Solid n'ont pas de binding React pertinent.

### Live queries TanStack DB comme source de signaux

- TanStack DB (0.11.3, bêta) implémente ses live queries avec d2ts, une bibliothèque TypeScript de differential dataflow ; la doc affirme des mises à jour « sub-millisecond », par exemple environ 0,7 ms pour une ligne dans une collection triée de 100 000 éléments sur un MacBook M1 Pro (doc `overview`). Aucune mesure publiée à 900 000 lignes n'a été trouvée.
- **Alimenter des signaux depuis une collection** : `collection.subscribeChanges(callback, { includeInitialState, where })` appelle le callback avec des changements `{ type: 'insert' | 'update' | 'delete', key, value }` par lot ; la même API existe sur une collection de live query. Le pont se fait donc en ouvrant un batch de signaux (`startBatch` ou `batch`), en écrivant chaque cellule modifiée dans son signal, puis en fermant le batch. Source : https://tanstack.com/db (référence `CollectionImpl.subscribeChanges`).
- Points d'attention :
  - Le moteur de live query de TanStack DB est lui-même un moteur incrémental. Utiliser **à la fois** d2ts (jointures, agrégats) et un graphe de signaux (propagation de la qualification) crée deux mécanismes de propagation à cohérencer. Frontière à choisir : les live queries ne servent qu'à filtrer et projeter les données brutes, les signaux portent tout le calcul de qualification.
  - La mémoire de 900 k cases dans une collection plus un signal par case double le stockage de la donnée brute (section 3). Alternative : les nœuds de données ne sont des signaux que pour le participant ouvert.
  - Les écritures de synchronisation dans une collection personnalisée passent par `begin()` / `write()` / `commit()` (une écriture sans `begin()` lève `NoPendingSyncTransactionWriteError`).
  - Bêta : l'API peut changer d'une version mineure à l'autre.

### Web Worker

- Toutes les bibliothèques de signaux étudiées sont du JavaScript pur sans accès au DOM. Seule une vérification dans un vrai Worker manque (non faite).
- Les mises à jour d'une case coûtant quelques microsecondes à dizaines de microsecondes (section 3), un Worker ne se justifie pas par le coût de propagation d'une saisie. Il peut se justifier par **l'instanciation initiale** (180 à 900 ms pour 1,2 M de nœuds sur poste de bureau, donc bien plus avec CPU ×4, supérieur au seuil de 50 ms par tâche si fait d'un bloc sur le fil principal), ou par une évaluation complète de l'oracle.
- Coût d'un Worker : copie structurée des messages (`postMessage`), pas de partage d'objets ; les signaux et leurs fermetures ne sont pas transférables ; seul un état de type tableaux typés est partageable (`SharedArrayBuffer` avec en-têtes COOP/COEP). Avec un Worker, les valeurs affichées (résultats par cellule) doivent être renvoyées au fil principal par messages, avec une latence supplémentaire à budgéter dans les 100 ms visées.

## 6. DAG maison

La mesure `custom.mjs` implémente : valeurs dans un `Int32Array` par grille, arêtes sources dans un `Uint16Array` partagé, adjacence inverse en CSR partagée entre grilles identiques, ordre topologique égal à l'ordre des indices, propagation de « dirty » avec coupure si la valeur recalculée est identique. Résultat : 4 octets par nœud et 1 à 6 microsecondes par mise à jour (section 3).

Ce que cette mesure ne couvre pas, et que le prototype devra ajouter : dépendances conditionnelles (joker, dispense héritée, exigences de remplissage, chemins multiples), plusieurs barèmes et conversions, explication d'un résultat et nœud décisif, copie de grille avec correspondances stables, abonnements React par nœud. C'est précisément ce que le prototype cherche à éprouver. Le recalcul complet comme oracle (carte #1) se prête bien à un DAG maison : même fonction d'évaluation de nœud, deux ordonnanceurs.

## 7. Ce qui reste à décider par l'humain

Faits à la disposition de la décision, sans choix de ma part :

1. **Signaux ou DAG maison pour le moteur de propagation du prototype.** Les signaux apportent le suivi automatique des dépendances (dynamiques) et la coupure par égalité ; le DAG maison apporte la mémoire minimale, l'accès aux arêtes (explication, nœud décisif) et deux ordonnanceurs comparables (incrémental et complet). La carte prévoit déjà de comparer des variantes ; ces deux options peuvent être deux variantes d'un même contrat « nœud, fonction, sources ».
2. Si signaux : **alien-signals ou @preact/signals-core**. Écart de performance de 1,2 à 1,5× en faveur d'alien-signals dans le benchmark publié, mémoire par nœud équivalente à la mesure locale, Preact a un écosystème React (binding, transformation) plus fourni et une maintenance plus visible ; alien-signals a une API plus petite et n'est pas lié à React. Écartés par les faits : polyfill TC39 (stade 1, avertissement de non-production, lent), Angular (mémoire 2,5× plus élevée, tire `@angular/core`), Solid 1.9 (propriétaires `createRoot`, entrée serveur/client à surveiller, 2 à 4× plus lent ; Solid 2.0 en release candidate).
3. **Granularité des signaux** : un signal par cellule de données (900 k signaux, doublon avec TanStack DB) ou seulement par nœud de calcul et par participant ouvert.
4. **Instanciation à la demande** du graphe d'un participant ou graphe complet au chargement, et donc place d'un Worker dans le prototype.
5. **Intégration React** : `useSyncExternalStore` écrit à la main, ou binding `@preact/signals-react` (à valider contre le compilateur React si retenu).
6. **Frontière entre live queries (TanStack DB) et propagation** : voir section 5 ; dépend aussi de la décision de stockage des données plates (point « Not yet specified » de la carte).

## 8. Sources

- js-reactivity-benchmark : https://github.com/transitive-bullshit/js-reactivity-benchmark (README, `results/latest.md`, `src/config.ts`)
- alien-signals : https://github.com/stackblitz/alien-signals (README, `src/system.ts`), documentation Context7 `/stackblitz/alien-signals`
- Preact Signals : https://github.com/preactjs/signals (packages `core`, `react`, `react-transform`), issues #566 et #652
- Proposition TC39 Signals : https://github.com/tc39/proposal-signals (stade 1) et polyfill https://github.com/proposal-signals/signal-polyfill
- Angular signals : https://github.com/angular/angular/blob/main/packages/core/primitives/signals/README.md
- Solid : https://github.com/solidjs/solid ; `@solidjs/signals` (npm)
- TanStack DB : https://github.com/TanStack/db (README, `docs/overview.md`, référence `CollectionImpl.subscribeChanges`, `liveQueryCollectionOptions`)
- React `useSyncExternalStore` : https://react.dev/reference/react/useSyncExternalStore
- Versions et dates : `npm view <paquet> version time.modified`, API GitHub `repos/<owner>/<repo>` (consultées le 5 octobre 2026)
- Mesures locales : `docs/research/signaux-bench/`
