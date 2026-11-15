# Série de mesures 2026-10-05T17-45-30-fumee-headless

> **Série en nouveau headless : ses chiffres ne comptent pas.** Les critères se jugent en fenêtre visible (spec 20, « Conditions »).

> Série de fumée : 1 run par scénario et par configuration, sans run de chauffe. Elle vérifie le harnais, elle ne juge pas les critères.

## Conditions

- Date : 2026-10-05T17:45:30.423Z
- Mode : nouveau headless
- Options : `{"bridage":4,"runs":1,"chauffe":0,"configs":["base","dag","principal","precalcul","immediat"],"scenarios":["saisie-rapide","saisies-distantes","changement-participant","changement-axe-vue","defilement","ouverture-graphe","mesures"],"court":false,"viewport":{"width":1600,"height":1000},"jeu":"charge","remplissage":"fin","graine":1}`
- Commit : b732323 (modifications locales)

## Machine

- CPU : AMD RYZEN AI MAX+ 395 w/ Radeon 8060S (32 cœurs logiques)
- RAM : 60 Go
- OS : Linux 7.2.9-1-cachyos
- Chrome : 153.0.8010.52 (`/usr/bin/chromium`)
- Sur secteur : inconnu
- Harnais : bun 1.4.2, Playwright 1.63.0

## Calibration

- Ratio ×4 / ×1, thread principal : 3.99
- Ratio ×4 / ×1, worker, bridage de la page seul : 1.06
- Bridage du worker retenu : logiciel (ratio avec bridage logiciel : 4.10)
- Touche Playwright → entrée Event Timing : oui ; INP rapporté par web-vitals : oui
- Durées du calcul de calibration (ms) : page ×1 46.7, worker ×1 45.8, page ×4 186.5, worker ×4 (page bridée) 48.5, worker ×4 (bridage logiciel) 188.0
- Résultat : réussie
- Comparaison fenêtre visible / nouveau headless : non faite dans cette série (`--comparer-modes`).

## Critères : configurations × scénarios

Jugés sur le pire run : zéro longtask > 50 ms, INP < 100 ms, latence de recalcul p95 < 100 ms (saisies), zéro LoAF (défilement). Cellule : réussite, p95 et INP en ms (médiane/pire run), longtasks du pire run.

| Configuration | saisie-rapide | saisies-distantes | changement-participant | changement-axe-vue | defilement | ouverture-graphe |
| --- | --- | --- | --- | --- | --- | --- |
| base | ❌ · p95 743/743 · INP 112/112 · LT 46 | ❌ · p95 358/358 · INP 112/112 · LT 39 | ❌ · INP 176/176 · LT 45 | ❌ · INP 184/184 · LT 40 | ❌ · INP —/— · LT 68 · LoAF 28 | ❌ · INP 256/256 · LT 59 |
| dag | ❌ · p95 779/779 · INP 120/120 · LT 45 | ❌ · p95 356/356 · INP 120/120 · LT 46 | ❌ · INP 104/104 · LT 42 | ❌ · INP 192/192 · LT 40 | ❌ · INP —/— · LT 47 · LoAF 30 | ❌ · INP 248/248 · LT 64 |
| principal | ❌ · p95 493/493 · INP 112/112 · LT 93 | ❌ · p95 287/287 · INP 112/112 · LT 79 | ❌ · INP 96/96 · LT 21 | ❌ · INP 352/352 · LT 25 | ❌ · INP —/— · LT 39 · LoAF 34 | ❌ · INP 392/392 · LT 37 |
| precalcul | ❌ · p95 769/769 · INP 128/128 · LT 54 | ❌ · p95 402/402 · INP 112/112 · LT 45 | ❌ · INP 104/104 · LT 38 | ❌ · INP 192/192 · LT 38 | ❌ · INP —/— · LT 53 · LoAF 31 | ❌ · INP 248/248 · LT 61 |
| immediat | ❌ · p95 858/858 · INP 112/112 · LT 58 | ❌ · p95 354/354 · INP 120/120 · LT 55 | ❌ · INP 176/176 · LT 43 | ❌ · INP 192/192 · LT 41 | ❌ · INP —/— · LT 66 · LoAF 28 | ❌ · INP 256/256 · LT 61 |

Motifs d'échec :

- base / saisie-rapide : 46 longtask(s), INP 112 ms, p95 743 ms
- dag / saisie-rapide : 45 longtask(s), INP 120 ms, p95 779 ms
- principal / saisie-rapide : 93 longtask(s), INP 112 ms, p95 493 ms
- precalcul / saisie-rapide : 54 longtask(s), INP 128 ms, p95 769 ms
- immediat / saisie-rapide : 58 longtask(s), INP 112 ms, p95 858 ms
- base / saisies-distantes : 39 longtask(s), INP 112 ms, p95 358 ms
- dag / saisies-distantes : 46 longtask(s), INP 120 ms, p95 356 ms
- principal / saisies-distantes : 79 longtask(s), INP 112 ms, p95 287 ms
- precalcul / saisies-distantes : 45 longtask(s), INP 112 ms, p95 402 ms
- immediat / saisies-distantes : 55 longtask(s), INP 120 ms, p95 354 ms
- base / changement-participant : 45 longtask(s), INP 176 ms
- dag / changement-participant : 42 longtask(s), INP 104 ms
- principal / changement-participant : 21 longtask(s)
- precalcul / changement-participant : 38 longtask(s), INP 104 ms
- immediat / changement-participant : 43 longtask(s), INP 176 ms
- base / changement-axe-vue : 40 longtask(s), INP 184 ms
- dag / changement-axe-vue : 40 longtask(s), INP 192 ms
- principal / changement-axe-vue : 25 longtask(s), INP 352 ms
- precalcul / changement-axe-vue : 38 longtask(s), INP 192 ms
- immediat / changement-axe-vue : 41 longtask(s), INP 192 ms
- base / defilement : 68 longtask(s), 28 LoAF
- dag / defilement : 47 longtask(s), 30 LoAF
- principal / defilement : 39 longtask(s), 34 LoAF
- precalcul / defilement : 53 longtask(s), 31 LoAF
- immediat / defilement : 66 longtask(s), 28 LoAF
- base / ouverture-graphe : 59 longtask(s), INP 256 ms
- dag / ouverture-graphe : 64 longtask(s), INP 248 ms
- principal / ouverture-graphe : 37 longtask(s), INP 392 ms
- precalcul / ouverture-graphe : 61 longtask(s), INP 248 ms
- immediat / ouverture-graphe : 61 longtask(s), INP 256 ms

## Latence décomposée (saisie rapide)

Médiane des écarts entre étapes successives (ms), marques des deux threads ramenées à l'horloge de la page par `performance.timeOrigin`. `calcul` : début et fin du calcul (worker ou thread principal).

Bridage logiciel du worker : l'attente active suit le calcul et précède `workerEnvoi`, elle compte dans « workerReception → workerEnvoi » ; la colonne `calcul` (fenêtre mesurée par le moteur) reste à vitesse native.

| Configuration | saisies | sans latence | evenement → validation | validation → ecriture | ecriture → subscribeChanges | subscribeChanges → envoi | envoi → workerReception | workerReception → workerEnvoi | workerEnvoi → retour | retour → commit | commit → peinture | calcul (worker non bridé) | total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| base | 100 | 0 | 0.9 | 0.0 | 0.8 | 0.0 | 0.2 | 0.8 | 74.1 | 43.2 | 27.8 | 0.1 | 129.3 |
| dag | 100 | 0 | 0.8 | 0.1 | 0.8 | 0.0 | 0.0 | 0.8 (depuis envoi) | 73.1 | 39.3 | 35.3 | 0.1 | 125.2 |
| principal | 100 | 0 | 0.8 | 0.1 | 0.8 | — | — | — | — | 48.7 (depuis subscribeChanges) | 32.5 | 3.5 | 83.8 |
| precalcul | 100 | 0 | 0.8 | 0.1 | 0.8 | 0.0 | 0.1 | 0.8 | 75.9 | 42.0 | 34.5 | 0.2 | 150.4 |
| immediat | 100 | 0 | 0.8 | 0.0 | 0.8 | 0.0 | 0.2 | 0.8 | 74.8 | 40.0 | 35.3 | 0.1 | 129.0 |

## Actions (sans critère propre)

| Configuration | Scénario | type | dans le LRU | n | médiane (ms) | pire (ms) |
| --- | --- | --- | --- | --- | --- | --- |
| base | changement-participant | participant | non | 15 | 487 | 634 |
| base | changement-participant | participant | oui | 15 | 113 | 131 |
| base | changement-axe-vue | axe | — | 10 | 292 | 399 |
| base | changement-axe-vue | vue | — | 10 | 288 | 367 |
| base | ouverture-graphe | graphe | non | 4 | 349 | 384 |
| base | ouverture-graphe | graphe | oui | 6 | 345 | 363 |
| dag | changement-participant | participant | non | 15 | 495 | 602 |
| dag | changement-participant | participant | oui | 15 | 108 | 127 |
| dag | changement-axe-vue | axe | — | 10 | 293 | 397 |
| dag | changement-axe-vue | vue | — | 10 | 290 | 364 |
| dag | ouverture-graphe | graphe | non | 4 | 347 | 376 |
| dag | ouverture-graphe | graphe | oui | 6 | 347 | 370 |
| principal | changement-participant | participant | non | 13 | 84 | 478 |
| principal | changement-participant | participant | oui | 17 | 310 | 350 |
| principal | changement-axe-vue | axe | — | 10 | 193 | 273 |
| principal | changement-axe-vue | vue | — | 10 | 201 | 358 |
| principal | ouverture-graphe | graphe | non | 7 | 347 | 405 |
| principal | ouverture-graphe | graphe | oui | 3 | 320 | 326 |
| precalcul | changement-participant | participant | non | 1 | 673 | 673 |
| precalcul | changement-participant | participant | oui | 29 | 130 | 543 |
| precalcul | changement-axe-vue | axe | — | 10 | 305 | 450 |
| precalcul | changement-axe-vue | vue | — | 10 | 300 | 360 |
| precalcul | ouverture-graphe | graphe | non | 1 | 373 | 373 |
| precalcul | ouverture-graphe | graphe | oui | 9 | 335 | 398 |
| immediat | changement-participant | participant | non | 15 | 493 | 586 |
| immediat | changement-participant | participant | oui | 15 | 113 | 125 |
| immediat | changement-axe-vue | axe | — | 10 | 292 | 397 |
| immediat | changement-axe-vue | vue | — | 10 | 299 | 376 |
| immediat | ouverture-graphe | graphe | non | 4 | 346 | 380 |
| immediat | ouverture-graphe | graphe | oui | 6 | 340 | 365 |

## Mesures sans critère

### Démarrage par phases (médiane des runs, ms)

| Configuration | structures | extension | compile | generation | insertion | somme | worker-pret | table-peinte |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| base | 16 | 15 | 103 | 491 | 3389 | 491 | 5867 | 6027 |
| dag | 14 | 14 | 114 | 498 | 3154 | 489 | 5620 | 5779 |
| principal | 14 | 14 | 111 | 496 | 3316 | 453 | — | 4981 |
| precalcul | 15 | 15 | 110 | 499 | 3173 | 507 | 5651 | 5957 |
| immediat | 15 | 14 | 110 | 495 | 3201 | 493 | 5653 | 5811 |

`worker-pret` et `table-peinte` : instants depuis le début de la navigation ; les autres : durées.

### Mémoire par cible (Mo, après GC, médiane des runs)

Tas JS utilisé + stockage des ArrayBuffer (`Runtime.getHeapUsage` : `usedSize + backingStorageSize`).

| Configuration | page chargement | worker chargement | page LRU plein | worker LRU plein | page fin | worker fin |
| --- | --- | --- | --- | --- | --- | --- |
| base | 157.7 | 16.7 | 158.9 | 17.0 | 161.5 | 18.3 |
| dag | 157.7 | 14.2 | 159.0 | 14.5 | 161.5 | 14.5 |
| principal | 161.6 | — | 164.8 | — | 168.3 | — |
| precalcul | 157.7 | 24.2 | 158.9 | 24.0 | 161.5 | 24.3 |
| immediat | 157.7 | 16.7 | 159.0 | 17.1 | 161.5 | 18.3 |

### Écritures en série, copie de grille, bascule du modèle

| Configuration | Mesure | valeurs | garde-fou 50 ms |
| --- | --- | --- | --- |
| base | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 9.5, instanciationMsParParticipant 0.1 | ⚠ 7 tâche(s) > 50 ms, max 154 ms — constat bloquant |
| base | ecritures-en-serie | nombre 1000, totalMs 5322.9, medianeMs 0.1, p95Ms 0.8, maxMs 3.7 | ok |
| base | copie-grille | grille 3, cases 263265, principalMs 11360.4, totalMs 18510 | ⚠ 1 tâche(s) > 50 ms, max 11391 ms — constat bloquant |
| base | bascule-modele | principalMs 117.3, totalMs 385.9 | ⚠ 3 tâche(s) > 50 ms, max 184 ms — constat non bloquant |
| dag | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 3.5, instanciationMsParParticipant 0.0 | ⚠ 8 tâche(s) > 50 ms, max 154 ms — constat bloquant |
| dag | ecritures-en-serie | nombre 1000, totalMs 5487.5, medianeMs 0, p95Ms 0.8, maxMs 4.2 | ok |
| dag | copie-grille | grille 3, cases 263265, principalMs 11425.8, totalMs 18114.9 | ⚠ 1 tâche(s) > 50 ms, max 11458 ms — constat bloquant |
| dag | bascule-modele | principalMs 111, totalMs 376.8 | ⚠ 3 tâche(s) > 50 ms, max 182 ms — constat non bloquant |
| principal | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 59.1, instanciationMsParParticipant 0.4 | ⚠ 9 tâche(s) > 50 ms, max 104 ms — constat bloquant |
| principal | ecritures-en-serie | nombre 1000, totalMs 4566.5, medianeMs 0, p95Ms 1.4, maxMs 4 | ok |
| principal | copie-grille | grille 3, cases 263265, principalMs 11517, totalMs 11531.6 | ⚠ 1 tâche(s) > 50 ms, max 11552 ms — constat bloquant |
| principal | bascule-modele | principalMs 206.8, totalMs 298.6 | ⚠ 1 tâche(s) > 50 ms, max 266 ms — constat non bloquant |
| precalcul | remplissage-lru | lignes 200, lruDebut 0, lruFin 0, instanciations 327, instanciationMs 9.2, instanciationMsParParticipant 0.0 | ⚠ 7 tâche(s) > 50 ms, max 167 ms — constat bloquant |
| precalcul | ecritures-en-serie | nombre 1000, totalMs 5600.8, medianeMs 0.1, p95Ms 0.9, maxMs 3.7 | ok |
| precalcul | copie-grille | grille 3, cases 263265, principalMs 12125.6, totalMs 18532.3 | ⚠ 1 tâche(s) > 50 ms, max 12161 ms — constat bloquant |
| precalcul | bascule-modele | principalMs 177, totalMs 470 | ⚠ 3 tâche(s) > 50 ms, max 254 ms — constat non bloquant |
| immediat | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 11.8, instanciationMsParParticipant 0.1 | ⚠ 10 tâche(s) > 50 ms, max 95 ms — constat bloquant |
| immediat | ecritures-en-serie | nombre 1000, totalMs 5143.8, medianeMs 0, p95Ms 0.9, maxMs 4.1 | ok |
| immediat | copie-grille | grille 3, cases 263265, principalMs 11932.1, totalMs 18875.7 | ⚠ 1 tâche(s) > 50 ms, max 11964 ms — constat bloquant |
| immediat | bascule-modele | principalMs 110.7, totalMs 385.5 | ⚠ 3 tâche(s) > 50 ms, max 181 ms — constat non bloquant |

Constats du garde-fou (thread principal bloqué plus de 50 ms une fois l'app interactive) :

- base / mesures : remplissage-lru : 7 tâche(s) > 50 ms, max 154 ms — constat bloquant
- base / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11391 ms — constat bloquant
- base / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 184 ms — constat non bloquant
- dag / mesures : remplissage-lru : 8 tâche(s) > 50 ms, max 154 ms — constat bloquant
- dag / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11458 ms — constat bloquant
- dag / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 182 ms — constat non bloquant
- principal / mesures : remplissage-lru : 9 tâche(s) > 50 ms, max 104 ms — constat bloquant
- principal / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11552 ms — constat bloquant
- principal / mesures : bascule-modele : 1 tâche(s) > 50 ms, max 266 ms — constat non bloquant
- precalcul / mesures : remplissage-lru : 7 tâche(s) > 50 ms, max 167 ms — constat bloquant
- precalcul / mesures : copie-grille : 1 tâche(s) > 50 ms, max 12161 ms — constat bloquant
- precalcul / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 254 ms — constat non bloquant
- immediat / mesures : remplissage-lru : 10 tâche(s) > 50 ms, max 95 ms — constat bloquant
- immediat / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11964 ms — constat bloquant
- immediat / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 181 ms — constat non bloquant
- base / mesures-lru : remplissage-lru : 8 tâche(s) > 50 ms, max 152 ms — constat bloquant
- base / mesures-lru : remplissage-lru : 7 tâche(s) > 50 ms, max 155 ms — constat bloquant
- base / mesures-lru : remplissage-lru : 7 tâche(s) > 50 ms, max 155 ms — constat bloquant

## Balayage du N du LRU (configuration de base)

Hors LRU : action pendant laquelle le worker a créé au moins une instance (observé). Mémoire par participant : écart de tas du worker (chargement → LRU plein) divisé par les instances entrées dans le LRU pendant le remplissage ; « — » si le LRU était déjà plein au chargement (comparer alors le tas à LRU plein d'un N à l'autre).

Instanciation : temps mesuré dans le worker à vitesse native, multiplié par le taux du bridage logiciel.

| N | changement de participant | latence hors LRU, médiane (ms) | tas worker LRU plein (Mo) | mémoire worker par participant (Ko) | instanciation par participant (ms) |
| --- | --- | --- | --- | --- | --- |
| 10 | ❌ | 131 | 13.0 | — | 0.260 |
| 50 | ❌ | 480 | 17.0 | 89.2 | 0.236 |
| 200 | ❌ | 522 | 32.4 | 104.9 | 0.234 |

Plus petit N qui passe « Changement de participant » : aucun.

## Runs

41 runs, JSON brut dans `runs/`.
