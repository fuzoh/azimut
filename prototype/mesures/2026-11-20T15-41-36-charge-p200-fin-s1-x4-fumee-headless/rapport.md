# Série de mesures 2026-11-20T15-41-36-charge-p200-fin-s1-x4-fumee-headless

> **Validation du harnais, pas un verdict de performance du produit.** Cette série vérifie que le harnais pilote la session et produit ses mesures ; ses chiffres ne jugent ni le moteur ni les critères.

> **Série en nouveau headless : ses chiffres ne comptent pas.** Les critères se jugent en fenêtre visible (spec 20, « Conditions »).

> Série de fumée : 1 run par scénario et par configuration, sans run de chauffe.

> Déroulés raccourcis (`--court`) : moins d'opérations que le protocole.

> Population : **charge historique**, profil `charge-p200-fin-s1`, bridage ×4, instrumentation « mesure ». Les verdicts ci-dessous valent pour cette population seule : ils ne se combinent ni avec une autre catégorie (taille réelle, composite synthétique, charge historique), ni avec un autre taux, et chaque configuration est jugée à part.

## Profil de données

- Identifiant : `charge-p200-fin-s1` (charge historique)
- Jeu : charge ; 3 × G3 étendue
- Effectif total : 200 participants générés (demandé : 200) ; remplissage « fin » ; graine 1
- Grille active : 0 (G3 V2 étendue ×6 #1)
- Somme de contrôle des sources : `cases 789502:46af8e20e17f476a / nonEvaluations 4538:375a4c689327b1da / jokers 183:9f23105a9642c5c2`
- URL (configuration de base) : `http://localhost:4173/?jeu=charge&remplissage=fin&graine=1&participants=200&verif=0&simu=0&calcul=signaux&lieu=worker&cohorte=paresseux&distante=perimee&lru=50`

Référence historique : jeu de charge à environ six fois la taille des grilles réelles. Ses verdicts ne remplacent pas ceux des profils de taille réelle, et inversement.

Cohorte synthétique : la distribution des notes vient du générateur, elle n'est pas une observation de cours réels.

| g | Grille | structure | empreinte | données (D) | calculs | regroupements | axes | cases possibles | cases stockées | remplissage observé | non-évaluations | dispenses | jokers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | G3 V2 étendue ×6 #1 | — | `97b65e84` | 1465 | 473 | 81 | 4 | 293000 | 263148 | 89.8 % | 1519 | 7 | 63 |
| 1 | G3 V2 étendue ×6 #2 | — | `1f3d456b` | 1465 | 473 | 81 | 4 | 293000 | 262979 | 89.8 % | 1489 | 5 | 64 |
| 2 | G3 V2 étendue ×6 #3 | — | `ed9ff426` | 1465 | 473 | 81 | 4 | 293000 | 263375 | 89.9 % | 1514 | 4 | 56 |

Dimensions visibles au chargement (grille active, viewport 1600 × 1000) : table 200 lignes × 2064 colonnes, 46 × 24 rendues ; débordement vertical 3973 px, horizontal 130988 px.

## Conditions

- Date : 2026-11-20T15:41:36.426Z
- Mode : nouveau headless
- Commande : `bun harnais/serie.ts --headless --fumee --court --sans-build --jeu charge --participants 200 --remplissage fin --graine 1 --bridage 4 --configs base,principal --sans-lru`
- Options : `{"bridage":4,"runs":1,"chauffe":0,"configs":["base","principal"],"scenarios":["saisie-rapide","saisies-distantes","changement-participant","changement-axe-vue","defilement","ouverture-graphe","mesures"],"court":true,"viewport":{"width":1600,"height":1000},"lru":50,"lruBalayage":null,"jeu":"charge","structures":[],"participants":200,"remplissage":"fin","graine":1,"grille":0}`
- Commit : 29876a7 (modifications locales)

## Machine

- CPU : AMD RYZEN AI MAX+ 395 w/ Radeon 8060S (32 cœurs logiques)
- RAM : 60 Go
- OS : Linux 7.3.4-1-cachyos
- Chrome : 157.0.8103.78 (`/usr/bin/chromium`)
- Sur secteur : inconnu
- Harnais : bun 1.4.5, Playwright 1.63.0
- Versions : react 19.3.0, @tanstack/db 0.11.3, alien-signals 3.2.1, vite 8.3.2

## Calibration

- Ratio ×4 / ×1, thread principal : 4.05 (accepté entre 3.00 et 5.00)
- Ratio ×4 / ×1, worker, bridage de la page seul : 1.00
- Bridage du worker retenu : logiciel (ratio avec bridage logiciel : 4.04)
- Touche Playwright → entrée Event Timing : oui ; INP rapporté par web-vitals : oui
- Durées du calcul de calibration (ms) : page ×1 45.4, worker ×1 45.5, page ×4 184.0, worker ×4 (page bridée) 45.6, worker ×4 (bridage logiciel) 183.6
- Résultat : réussie
- Comparaison fenêtre visible / nouveau headless : non faite dans cette série (`--comparer-modes`).

### Bridage du worker : mécanisme et limites

Le bridage CPU de la page (`Emulation.setCPUThrottlingRate`) n'atteint pas le worker dédié, et Chrome refuse cette commande sur la cible worker. Le worker est donc ralenti par logiciel (`bridageWorker` dans l'URL, `src/store/worker/worker.ts`) : après chaque message traité et chaque minuterie du moteur, une attente active de (taux − 1) × la durée du traitement, puis l'envoi des messages produits.

Limites :

- ni le ramasse-miettes, ni la sérialisation (structured clone) et le transfert des messages, ni l'attente dans la file des messages ne sont ralentis ;
- l'attente suit le calcul : elle compte dans « workerReception → workerEnvoi », et la fenêtre `calcul` mesurée par le moteur reste à vitesse native ;
- un message reçu pendant l'attente attend la fin de celle-ci, comme sous un vrai bridage, mais l'ordonnancement fin du thread n'est pas reproduit ;
- la précision dépend de la granularité de `performance.now()` dans le worker ; le ratio est vérifié une fois, à la calibration, sur un calcul fixe.

## Critères : configurations × scénarios

Jugés sur le pire run valide : zéro longtask > 50 ms, INP < 100 ms, latence de recalcul p95 < 100 ms (saisies), zéro LoAF (défilement). Cellule : statut, p95 et INP en ms (médiane/pire run), longtasks du pire run. Un run invalide (erreur, erreur de page, délai de stabilité dépassé, scénario incomplet, mesure manquante, sources différentes) est exclu des agrégats : la cellule devient « incomplet » si aucun run valide n'échoue. « non applicable » : le scénario n'a rien pu exercer (défilement sans débordement).

| Configuration | saisie-rapide | saisies-distantes | changement-participant | changement-axe-vue | defilement | ouverture-graphe |
| --- | --- | --- | --- | --- | --- | --- |
| base | ❌ · p95 723/723 · INP 104/104 · LT 10 | ❌ · p95 305/305 · INP 112/112 · LT 8 | ❌ · INP 216/216 · LT 11 | ❌ · INP 184/184 · LT 14 | ❌ · INP —/— · LT 28 · LoAF 8 | ❌ · INP 272/272 · LT 15 |
| principal | ❌ · p95 549/549 · INP 136/136 · LT 24 | ❌ · p95 169/169 · INP 104/104 · LT 18 | ❌ · INP 96/96 · LT 10 | ❌ · INP 328/328 · LT 8 | ❌ · INP —/— · LT 35 · LoAF 21 | ❌ · INP 376/376 · LT 9 |

Motifs :

- base / saisie-rapide (échec) : 10 longtask(s), INP 104 ms, p95 723 ms
- principal / saisie-rapide (échec) : 24 longtask(s), INP 136 ms, p95 549 ms
- base / saisies-distantes (échec) : 8 longtask(s), INP 112 ms, p95 305 ms
- principal / saisies-distantes (échec) : 18 longtask(s), INP 104 ms, p95 169 ms
- base / changement-participant (échec) : 11 longtask(s), INP 216 ms
- principal / changement-participant (échec) : 10 longtask(s)
- base / changement-axe-vue (échec) : 14 longtask(s), INP 184 ms
- principal / changement-axe-vue (échec) : 8 longtask(s), INP 328 ms
- base / defilement (échec) : 28 longtask(s), 8 LoAF
- principal / defilement (échec) : 35 longtask(s), 21 LoAF
- base / ouverture-graphe (échec) : 15 longtask(s), INP 272 ms
- principal / ouverture-graphe (échec) : 9 longtask(s), INP 376 ms

## Opérations exécutées et cadence

Par configuration et scénario, sur les runs valides hors chauffe : opérations exécutées / prévues (pire run), durée, et pour la saisie rapide la cadence obtenue (visée : une validation toutes les 200 ms). Un pilote plus lent que la cadence visée se voit ici, pas dans les critères.

| Configuration | Scénario | runs valides | opérations (pire run) | durée médiane (s) | intervalle moyen médian / pire (ms) | validations en retard (pire) | retard max (ms) | détails | non applicable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| base | saisie-rapide | 1 | 20/20 | 5.8 | 289 / 289 | 20 | 1776 | validations 20 | — |
| base | saisies-distantes | 1 | 20/20 | 6.0 | 298 / 298 | 20 | 1959 | validations 20, saisiesDistantes 24 | — |
| base | changement-participant | 1 | 6/6 | 3.9 | — | — | — | — | — |
| base | changement-axe-vue | 1 | 7/7 | 3.8 | — | — | — | axes 4 | — |
| base | defilement | 1 | 2/2 | 3.5 | — | — | — | — | — |
| base | ouverture-graphe | 1 | 2/2 | 3.8 | — | — | — | — | — |
| base | mesures | 1 | 4/4 | 13.1 | — | — | — | — | — |
| principal | saisie-rapide | 1 | 20/20 | 4.7 | 237 / 237 | 15 | 983 | validations 20 | — |
| principal | saisies-distantes | 1 | 20/20 | 4.9 | 246 / 246 | 17 | 1031 | validations 20, saisiesDistantes 21 | — |
| principal | changement-participant | 1 | 6/6 | 3.5 | — | — | — | — | — |
| principal | changement-axe-vue | 1 | 7/7 | 3.3 | — | — | — | axes 4 | — |
| principal | defilement | 1 | 2/2 | 4.3 | — | — | — | — | — |
| principal | ouverture-graphe | 1 | 2/2 | 2.9 | — | — | — | — | — |
| principal | mesures | 1 | 4/4 | 9.3 | — | — | — | — | — |

## Navigation avec et sans instanciation

Une action « avec instanciation » a créé au moins une instance de participant pendant le choix du participant (observé, pas supposé). Cellule : nombre d'actions · médiane / pire (ms). « non mesurée » : aucune action de cette catégorie, par exemple quand toute la cohorte tient dans le cache ; ce n'est pas une réussite.

| Configuration | Scénario | action | sans instanciation | avec instanciation |
| --- | --- | --- | --- | --- |
| base | changement-participant | participant | 3 · 124 / 125 | 3 · 532 / 558 |
| base | ouverture-graphe | graphe | 1 · 395 / 395 | 1 · 418 / 418 |
| principal | changement-participant | participant | 3 · 82 / 97 | 3 · 432 / 474 |
| principal | ouverture-graphe | graphe | non mesurée | 2 · 328 / 385 |

### Changement d'axe et de vue

| Configuration | type | n | médiane (ms) | pire (ms) |
| --- | --- | --- | --- | --- |
| base | axe | 3 | 324 | 389 |
| base | vue | 4 | 315 | 348 |
| principal | axe | 3 | 187 | 265 |
| principal | vue | 4 | 206 | 358 |

## Défilement : déplacement effectif

Par run : débordement possible et plus grand déplacement obtenu (px). Un axe sans débordement est « non applicable » ; un débordement sans déplacement invalide le run.

| Run | Configuration | axe | débordement | déplacement | événements molette | statut |
| --- | --- | --- | --- | --- | --- | --- |
| 9 | base | vertical | 3973 | 1300 | 13 | mesuré |
| 9 | base | horizontal | 130988 | 700 | 8 | mesuré |
| 10 | principal | vertical | 3973 | 1600 | 16 | mesuré |
| 10 | principal | horizontal | 130988 | 700 | 8 | mesuré |

## Latence décomposée (saisie rapide)

Médiane des écarts entre étapes successives (ms), runs valides, marques des deux threads ramenées à l'horloge de la page par `performance.timeOrigin`. `calcul` : début et fin du calcul (worker ou thread principal). Les médianes des étapes ne s'additionnent pas pour reconstituer une latence.

Bridage logiciel du worker : l'attente active suit le calcul et précède `workerEnvoi`, elle compte dans « workerReception → workerEnvoi » ; la colonne `calcul` (fenêtre mesurée par le moteur) reste à vitesse native.

| Configuration | saisies | sans latence | evenement → validation | validation → ecriture | ecriture → subscribeChanges | subscribeChanges → envoi | envoi → workerReception | workerReception → workerEnvoi | workerEnvoi → retour | retour → commit | commit → peinture | calcul (worker non bridé) | total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| base | 20 | 0 | 0.9 | 0.1 | 1.0 | 0.0 | 0.1 | 0.8 (depuis envoi) | 71.2 | 11.7 | 34.8 | 0.2 | 127.9 |
| principal | 20 | 0 | 0.9 | 0.1 | 1.0 | — | — | — | — | 50.5 (depuis subscribeChanges) | 30.4 | 3.9 | 83.4 |

## Mesures sans critère

### Démarrage par phases (médiane des runs valides, ms)

| Configuration | structures | extension | compile | generation | insertion | somme | worker-pret | table-peinte |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| base | 12 | 11 | 98 | 476 | 3706 | 531 | 6122 | 6276 |
| principal | 12 | 11 | 98 | 481 | 3340 | 485 | — | 5010 |

`worker-pret` et `table-peinte` : instants depuis le début de la navigation ; les autres : durées. `extension` n'existe que pour le jeu de charge.

### Mémoire par cible (Mo, après GC, médiane des runs valides)

Tas JS utilisé + stockage des ArrayBuffer (`Runtime.getHeapUsage` : `usedSize + backingStorageSize`).

| Configuration | page chargement | worker chargement | page LRU plein | worker LRU plein | page fin | worker fin |
| --- | --- | --- | --- | --- | --- | --- |
| base | 157.8 | 16.7 | 158.9 | 17.0 | 161.8 | 18.2 |
| principal | 161.6 | — | 164.1 | — | 166.8 | — |

### Écritures en série, copies de grille, bascule du modèle

Sur la grille active. `copie-grille` : copie à l'identique ; `copie-grille-provenance` : copie vers la structure du corpus qui en provient (G3 V1 → V2), seulement si elle existe.

| Configuration | Mesure | valeurs | garde-fou 50 ms |
| --- | --- | --- | --- |
| base | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 7.8, instanciationMsParParticipant 0.1 | ⚠ 7 tâche(s) > 50 ms, max 162 ms — constat bloquant |
| base | ecritures-en-serie | grille 0, nombre 100, totalMs 663.2, medianeMs 0.1, p95Ms 1.3, maxMs 3.1 | ok |
| base | copie-grille | grille 3, cible "copie à l'identique", cases 263158, principalMs 7677, totalMs 10225 | ⚠ 1 tâche(s) > 50 ms, max 7712 ms — constat bloquant |
| base | bascule-modele | principalMs 97.6, totalMs 380.5 | ⚠ 3 tâche(s) > 50 ms, max 179 ms — constat non bloquant |
| principal | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 54.6, instanciationMsParParticipant 0.4 | ⚠ 8 tâche(s) > 50 ms, max 90 ms — constat bloquant |
| principal | ecritures-en-serie | grille 0, nombre 100, totalMs 453.6, medianeMs 0, p95Ms 2.1, maxMs 3.8 | ok |
| principal | copie-grille | grille 3, cible "copie à l'identique", cases 263158, principalMs 6980.9, totalMs 6993.1 | ⚠ 1 tâche(s) > 50 ms, max 7014 ms — constat bloquant |
| principal | bascule-modele | principalMs 217.9, totalMs 306.5 | ⚠ 1 tâche(s) > 50 ms, max 275 ms — constat non bloquant |

Constats du garde-fou (thread principal bloqué plus de 50 ms une fois l'app interactive) :

- base / mesures : remplissage-lru : 7 tâche(s) > 50 ms, max 162 ms — constat bloquant
- base / mesures : copie-grille : 1 tâche(s) > 50 ms, max 7712 ms — constat bloquant
- base / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 179 ms — constat non bloquant
- principal / mesures : remplissage-lru : 8 tâche(s) > 50 ms, max 90 ms — constat bloquant
- principal / mesures : copie-grille : 1 tâche(s) > 50 ms, max 7014 ms — constat bloquant
- principal / mesures : bascule-modele : 1 tâche(s) > 50 ms, max 275 ms — constat non bloquant

## Runs

14 runs dont 0 invalide(s), JSON brut dans `runs/` (non versionné).
