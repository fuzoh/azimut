# Solid 2.0 (`@solidjs/signals`) contre alien-signals pour le graphe de qualification

Date de l'étude : 5 octobre 2026. Complète `docs/research/signaux.md` (branche `research/signaux`, version vérifiée alien-signals 3.2.1).
Statut : constats et mesures indicatives, pas de décision.

## Résumé

- **Solid 2.0 n'est pas sorti** : `@solidjs/signals` et `solid-js` sont en release candidate (`2.0.0-rc.13`, 30 septembre 2026, tag npm `next`). Le tag `latest` de `solid-js` reste 1.9.15 et celui de `@solidjs/signals` pointe sur `rc.0`. Le README annonce « API frozen barring showstoppers ».
- Le cœur est **utilisable seul** (`@solidjs/signals`, sans DOM, testé dans un Worker Node et Bun), mais il exige un **propriétaire** (`createRoot`) pour la durée de vie, et ses **écritures sont différées** (microtask) : après `setX(v)`, la lecture d'un mémo rend l'ancienne valeur jusqu'à `flush()`. Contrat différent de celui d'alien-signals (écriture puis lecture synchrone).
- Les **signaux asynchrones** (calculs qui renvoient une Promise ou un AsyncIterable, `isPending`, `latest`, `Loading`, transitions, `action`, optimistic) ne servent à rien pour un graphe de calcul synchrone. La notification TanStack DB ou le message du Worker sont des écritures de signaux ordinaires, pas des calculs asynchrones.
- **Laziness** : les mémos Solid 2.0 sont **eager par défaut** (calcul à la création). `lazy: true` diffère le calcul mais active aussi l'**autodisposition** : sans abonné, le mémo est détruit et recalculé à chaque lecture. Mesuré : 500 relectures sans abonné coûtent 0,13 à 0,19 ms contre 0,003 ms pour alien-signals, qui garde le cache d'un calcul non observé.
- **Mémoire** (indicatif, 1,2 M de nœuds) : alien-signals 250 à 292 octets/nœud, Solid 2.0 460 à 520 octets/nœud (environ 1,8 à 2,1×). Création 1,7 à 2,3× plus lente. Mise à jour d'une case plus relecture : 3 µs (alien) contre 9 µs (Solid eager).
- Les auteurs de Solid écrivent eux-mêmes que leur cœur est 2,2× plus lent que le moteur « r3 » du benchmark, sur un coût de création élevé (`NODE-SHAPE.md`, section 11).
- Aucun binding React. Le patron `useSyncExternalStore` manuel marche avec les deux, mais les effets Solid partent après la microtask.
- **Recommandation : garder alien-signals.** Solid 2.0 n'apporte rien au cas d'usage, double la mémoire par nœud, change le contrat de lecture et reste en RC. À reconsidérer seulement si le projet adopte Solid pour le rendu.

## 1. Statut et utilisation autonome

| Élément | Constat | Source |
| --- | --- | --- |
| Versions npm (5 oct. 2026) | `solid-js` latest 1.9.15, next 2.0.0-rc.13. `@solidjs/signals` latest 2.0.0-rc.0, next 2.0.0-rc.13. Bêta depuis le 3 mars 2026, rc.0 le 12 août 2026 | `npm view solid-js dist-tags time`, `npm view @solidjs/signals dist-tags` |
| Releases GitHub | `solid-js@2.0.0-rc.13`, `@solidjs/signals@2.0.0-rc.13`, 30 sept. 2026, marquées pré-release | https://github.com/solidjs/solid/releases |
| Dépôt | Le cœur vit dans le monorepo `solidjs/solid`, dossier `packages/signals` (branche `next`), plus dans un dépôt séparé | `package.json` du paquet, champ `repository.directory` |
| Statut déclaré | « Release Candidate … The API is frozen barring showstoppers » | README de `@solidjs/signals` 2.0.0-rc.13 (https://github.com/solidjs/solid/blob/next/packages/signals/README.md) |
| Utilisation autonome | Paquet indépendant (`createSignal`, `createMemo`, `createEffect`, `createRoot`, `flush`, stores, async). Aucune référence à `window`/`document` dans `dist/prod`. Test local : signal, mémo, `flush()` dans un `worker_threads` Node 26 et Bun 1.4.2 : OK | README ; `docs/research/signaux-solid2-bench/worker.mjs` |
| Prérequis | `engines.node >= 22.12`. ESM uniquement. Conditions d'export `development`, `test`, `observe`, `default` (build prod). Un build prod est ~780 Ko non minifiés dans `dist/prod` (alien-signals : 16 Ko) | `package.json`, mesure locale |

Propriétaire et disposition :
- Une lecture ou création **hors `createRoot`** fonctionne (testé) ; un mémo non possédé s'autodispose quand il n'a plus d'abonné (RFC 02, https://github.com/solidjs/solid/blob/next/documentation/solid-2.0/01-reactivity-batching-effects.md, section « Lazy memos »).
- `createRoot(dispose => …)` : `dispose()` détruit l'arbre. En 2.0 un root créé sous un propriétaire est possédé par lui ; pour un détachement il faut `runWithOwner(null, …)` (RFC 02 `02-signals-derived-ownership.md`). Pour notre cas (un root par participant affiché, LRU) c'est direct.
- Écrire dans un signal depuis un contexte possédé (effet, mémo) lève une erreur en dev, sauf `ownedWrite: true`.
- Dispose de 600 roots de 2000 nœuds : 81 à 84 ms (mesure locale, Node et Bun), contre un simple abandon de référence pour alien-signals.

## 2. Que sont les « signaux asynchrones » de Solid 2.0

Source : RFC « Async data » (https://github.com/solidjs/solid/blob/next/documentation/solid-2.0/05-async-data.md) et README du paquet.

- Un `createMemo` (ou une dérivée de store) peut renvoyer une **Promise** ou un **AsyncIterable**. Tant qu'elle n'est pas résolue, la lecture est « pas prête » et suit le chemin `Loading` (frontière d'UI, équivalent de Suspense). Les consommateurs gardent l'ancienne valeur jusqu'au règlement.
- `isPending(fn)` : un changement est en vol. `latest(fn)` : dernière valeur résolue. `refresh()` : relance quiète. `resolve(fn)` : promesse de stabilisation.
- Transitions intégrées (plusieurs en vol, « entangling ») ; `action()` pour des mutations en plusieurs étapes dans une transaction ; `createOptimistic` (valeur provisoire qui revient à la résolution).
- Écritures groupées par microtask ; `batch` supprimé ; `flush()` force. Effet en deux phases (calcul qui suit les dépendances, puis callback).

Utilité pour le projet : **aucune pour la propagation**. Le graphe de qualification est synchrone ; le seul asynchrone (notification `subscribeChanges` de TanStack DB, message de Worker) se traduit par des écritures de signaux, après quoi le calcul est synchrone. Le coût est en revanche présent : drapeaux de nœud, voies (« lanes »), contrôle de forme de Promise à chaque calcul. L'option `sync: true` du mémo saute le test de forme, mais le reste du modèle (transactions, microtask) reste. Les docs internes (`SPEC-ASYNC-SEMANTICS.md`) comptent des dizaines de règles pour ce modèle (https://github.com/solidjs/solid/blob/next/packages/signals/docs/SPEC-ASYNC-SEMANTICS.md), ce qui est de la complexité à porter pour un prototype jetable.

## 3. Laziness et disposition

| | alien-signals 3.2.1 | `@solidjs/signals` 2.0.0-rc.13 |
| --- | --- | --- |
| Calcul à la création | Non, pull : un `computed` ne s'exécute qu'à la première lecture | Oui par défaut ; `createMemo(fn, { lazy: true })` pour différer |
| Cache d'un calcul non observé | Oui (valeurs et liens conservés, revalidation par drapeaux) | Mémo par défaut : oui, tant que son propriétaire vit. Mémo `lazy` : non, **autodisposé sans abonné, recalculé à chaque lecture** (doc « Lazy memos »). Mesuré : 0,13 à 0,19 ms pour relire 500 mémos lazy sans abonné |
| Perte du dernier abonné | `unwatched` : un calcul qui était observé détache ses dépendances (`index.mjs`) | Option `unobserved` (callback) ; autodisposition des mémos lazy et non possédés |
| Disposition | `effect()` et `effectScope()` renvoient une fonction d'arrêt ; un calcul n'a pas de dispose, il est libéré par le GC quand le graphe n'est plus référencé | `createRoot(dispose)` ; nettoyage en déroulement (enfants avant parents) ; `onCleanup` |
| Lecture après écriture | Immédiate, synchrone | Valeur validée précédente jusqu'à `flush()` (microtask ou explicite) |

Note alien-signals : un calcul jamais observé reste lié aux signaux sources ; le libérer suppose d'abandonner aussi les sources (c'est le cas si l'on lâche tout le graphe d'un participant).

## 4. Performance et mémoire

### Benchmarks publiés

- js-reactivity-benchmark (https://github.com/transitive-bullshit/js-reactivity-benchmark, README) liste `solid` (1.9, « le point d'entrée Node n'a pas le même comportement ») et `xreactivity` (« Solid Signals » autonome). Le dernier `results/latest.md` consulté pour la recherche précédente ne contient pas Solid 2.0 : **aucun chiffre publié, tiers et reproductible, pour Solid 2.0 face à alien-signals**.
- Données du projet Solid lui-même (`packages/signals/docs/NODE-SHAPE.md`, https://github.com/solidjs/solid/blob/next/packages/signals/docs/NODE-SHAPE.md, section 11, 21 août 2026) : « overall solid-next / r3 = 2.20x » ; coût de création 4 à 13× celui de r3 ; « alien-signals is not the answer » (au sens du choix de moteur pour Solid, à cause des formes de diamant). Ce sont des chiffres internes, non un classement général.
- Solid 1.9 : 2 à 4× plus lent qu'alien-signals (tableau de `signaux.md` section 2).

### Mesure locale (indicative)

Scripts : `docs/research/signaux-solid2-bench/bench.mjs` (même graphe que `signaux.md` : 1500 données, 500 calculs à 5 sources, `% 101`, 600 grilles = 1,2 M de nœuds). Node v26.10.0 et Bun 1.4.2, AMD Ryzen AI Max+ 395, `--expose-gc`, sans bridage CPU, un seul passage. Solid : `createMemo(fn, { sync: true })` dans un `createRoot` par grille, écriture suivie de `flush()`.

| Moteur | Runtime | Octets/nœud | Construction + 1ère évaluation | Mise à jour 1 case + relecture 500 calculs (p50 / p99) |
| --- | --- | ---: | ---: | --- |
| alien-signals 3.2.1 | Node | 250 | 143 ms | 0,003 / 0,030 ms |
| alien-signals 3.2.1 | Bun | 292 | 88 ms | 0,006 / 0,043 ms |
| Solid 2.0 rc.13, mémos eager | Node | 460 | 337 ms | 0,010 / 0,107 ms |
| Solid 2.0 rc.13, mémos eager | Bun | 512 | 150 ms | 0,009 / 0,083 ms |
| Solid 2.0 rc.13, mémos `lazy` sans abonné | Node | 469 | 294 ms | 0,188 / 0,215 ms |
| Solid 2.0 rc.13, mémos `lazy` sans abonné | Bun | 521 | 210 ms | 0,127 / 0,147 ms |

Lecture : à l'échelle du projet (un participant, 2000 à 6000 nœuds, mise à jour d'une case) la propagation reste très sous le seuil de 50 ms pour les deux. Le critère discriminant est la **mémoire** (1,8 à 2,1×) et la création (~2×), sans compter le contrat de lecture. Réserves : graphe synthétique, un échantillon, poste de bureau sans bridage ×4, mesure du tas sur 1,2 M de nœuds (le prototype n'en aura que ~100 000 avec un LRU de 50 participants). Le dispose en bloc de 600 roots Solid (81 ms) est un coût que l'éviction LRU paiera au fil de l'eau, par participant (~0,14 ms).

## 5. Intégration React

- Ni alien-signals ni `@solidjs/signals` n'ont de binding React officiel (pour alien-signals, des paquets communautaires sont listés dans son README). Voir `signaux.md` section 5 pour le patron `useSyncExternalStore` (https://react.dev/reference/react/useSyncExternalStore).
- alien-signals : `subscribe = cb => effect(() => { node(); cb(); })` ; l'effet est synchrone, la notification arrive dans le même appel que l'écriture.
- Solid 2.0 : `subscribe = cb => { let stop; createRoot(d => { stop = d; createEffect(() => node(), () => cb()); }); return stop; }` ; l'effet est en deux phases et part au `flush` (microtask), donc la notification React est asynchrone d'un tick et `getSnapshot` doit lire la valeur validée. Cela fonctionne mais ajoute un modèle de propriétaires à gérer à côté du cycle de vie React. Je n'ai pas exécuté ce patron dans un composant React : à vérifier.
- Pas de compilateur Babel ou hook à adopter dans les deux cas, ce qui évite la question de compatibilité avec le compilateur React (voir `signaux.md`).

## 6. alien-signals : état actuel

- Version npm : **3.2.1** (14 mai 2026), inchangée depuis la recherche précédente. Tags `v3.2.1`, `v3.2.0`, `v3.1.x`. Dernier push du dépôt 10 juin 2026 : correctif « writing a signal inside trigger after reading it crashes flush ». Sources : https://github.com/stackblitz/alien-signals, `npm view alien-signals`. L'API n'a pas changé sur les points qui nous concernent.
- API exportée (`types/index.d.ts`) : `signal`, `computed` (le getter reçoit la valeur précédente), `effect` (peut renvoyer un cleanup, renvoie un disposeur), `effectScope` (renvoie un disposeur), `trigger`, `startBatch`/`endBatch`, `getActiveSub`/`setActiveSub`, `isSignal`/`isComputed`/`isEffect`/`isEffectScope`.
- Les notes de release 3.2.0 mentionnent : cleanup retourné par `effect`, correctifs (`effectScope` dans la propagation, écriture interne), et une suite de conformité de 180 tests où alien-signals est le seul à tout passer (https://github.com/stackblitz/alien-signals/releases/tag/v3.2.0).
- Laziness inchangée : `computed` pull, pas de dispose propre au calcul, `unwatched` détache les dépendances d'un calcul qui perd son dernier abonné.

## 7. Décision à prendre par l'humain

Faits à disposition :
1. **alien-signals** : 250 à 292 octets/nœud, contrat synchrone simple, 16 Ko, version stable 3.2.1, aucun besoin de propriétaire. Convient à l'instanciation par participant avec éviction LRU (abandon de référence).
2. **Solid 2.0** : RC, mémoire ~2×, `flush()` obligatoire pour lire après écriture, fonctionnalités asynchrones sans usage ici, un `createRoot` par participant pour la disposition (dispose explicite à l'éviction). À envisager seulement si le rendu passait à Solid.
3. Si le prototype doit comparer, un adaptateur « nœud, fonction, sources » (voir `signaux.md` section 7) permet d'échanger le moteur sans toucher au domaine.

## 8. Sources

- Solid : https://github.com/solidjs/solid (branche `next`) ; README `packages/signals` ; `documentation/solid-2.0/01-reactivity-batching-effects.md`, `02-signals-derived-ownership.md`, `05-async-data.md` ; `packages/signals/docs/NODE-SHAPE.md`, `SPEC-ASYNC-SEMANTICS.md` ; releases GitHub (30 sept. 2026).
- npm : `npm view solid-js`, `@solidjs/signals`, `alien-signals`, `@preact/signals-core` (5 oct. 2026) ; code de `@solidjs/signals@2.0.0-rc.13` (types `dist/types/signals.d.ts`, options `lazy`, `sync`, `unobserved`).
- alien-signals : https://github.com/stackblitz/alien-signals (README, `esm/index.mjs`, releases, tags).
- js-reactivity-benchmark : https://github.com/transitive-bullshit/js-reactivity-benchmark (README).
- React : https://react.dev/reference/react/useSyncExternalStore
- Mesures locales : `docs/research/signaux-solid2-bench/`.
- Non vérifié : date de sortie finale de Solid 2.0 (aucune annonce trouvée), comportement de `@solidjs/signals` dans un composant React, résultats de js-reactivity-benchmark pour Solid 2.0.
