# Série de mesures 2026-10-07T14-29-50-serie

## Conditions

- Date : 2026-10-07T14:29:50.388Z
- Mode : fenêtre visible
- Options : `{"bridage":4,"runs":5,"chauffe":1,"configs":["base","dag","principal","precalcul","immediat"],"scenarios":["saisie-rapide","saisies-distantes","changement-participant","changement-axe-vue","defilement","ouverture-graphe","mesures"],"court":false,"viewport":{"width":1600,"height":1000},"jeu":"charge","remplissage":"fin","graine":1}`
- Commit : e5ca4d8

## Machine

- CPU : AMD RYZEN AI MAX+ 395 w/ Radeon 8060S (32 cœurs logiques)
- RAM : 62 Go
- OS : Linux 7.2.9-1-cachyos
- Chrome : 153.0.8010.52 (`/usr/bin/chromium`)
- Sur secteur : oui
- Harnais : bun 1.4.2, Playwright 1.63.0

## Calibration

- Ratio ×4 / ×1, thread principal : 4.13
- Ratio ×4 / ×1, worker, bridage de la page seul : 0.99
- Bridage du worker retenu : logiciel (ratio avec bridage logiciel : 4.02)
- Touche Playwright → entrée Event Timing : oui ; INP rapporté par web-vitals : oui
- Durées du calcul de calibration (ms) : page ×1 45.6, worker ×1 47.2, page ×4 188.3, worker ×4 (page bridée) 46.5, worker ×4 (bridage logiciel) 189.7
- Résultat : réussie
- Comparaison fenêtre visible / nouveau headless : non faite dans cette série (`--comparer-modes`).

## Critères : configurations × scénarios

Jugés sur le pire run : zéro longtask > 50 ms, INP < 100 ms, latence de recalcul p95 < 100 ms (saisies), zéro LoAF (défilement). Cellule : réussite, p95 et INP en ms (médiane/pire run), longtasks du pire run.

| Configuration | saisie-rapide | saisies-distantes | changement-participant | changement-axe-vue | defilement | ouverture-graphe |
| --- | --- | --- | --- | --- | --- | --- |
| base | ❌ · p95 771/839 · sans latence 1 · INP 144/160 · LT 71 | ❌ · p95 341/379 · INP 136/152 · LT 67 | ❌ · INP 176/192 · LT 42 | ❌ · INP 200/200 · LT 44 | ❌ · INP —/— · LT 58 · LoAF 32 | ❌ · INP 264/296 · LT 68 |
| dag | ❌ · p95 763/790 · INP 128/144 · LT 64 | ❌ · p95 360/467 · INP 136/152 · LT 64 | ❌ · INP 128/128 · LT 49 | ❌ · INP 200/216 · LT 43 | ❌ · INP —/— · LT 56 · LoAF 36 | ❌ · INP 264/280 · LT 65 |
| principal | ❌ · p95 549/568 · INP 152/168 · LT 86 | ❌ · p95 303/324 · INP 152/160 · LT 84 | ❌ · INP 112/112 · LT 32 | ❌ · INP 376/376 · LT 27 | ❌ · INP —/— · LT 57 · LoAF 33 | ❌ · INP 408/424 · LT 38 |
| precalcul | ❌ · p95 782/815 · INP 136/160 · LT 69 | ❌ · p95 377/431 · INP 136/152 · LT 69 | ❌ · INP 128/240 · LT 44 | ❌ · INP 216/232 · LT 46 | ❌ · INP —/— · LT 59 · LoAF 32 | ❌ · INP 264/264 · LT 66 |
| immediat | ❌ · p95 778/783 · INP 136/144 · LT 70 | ❌ · p95 366/375 · INP 144/160 · LT 68 | ❌ · INP 224/224 · LT 49 | ❌ · INP 200/208 · LT 44 | ❌ · INP —/— · LT 60 · LoAF 29 | ❌ · INP 264/280 · LT 64 |

Motifs d'échec :

- base / saisie-rapide : 71 longtask(s), INP 136 ms, p95 839 ms, 67 longtask(s), INP 152 ms, p95 771 ms, 52 longtask(s), INP 128 ms, p95 766 ms, 1 saisie(s) sans latence, 65 longtask(s), INP 144 ms, p95 805 ms, INP 160 ms, p95 743 ms
- dag / saisie-rapide : 62 longtask(s), INP 144 ms, p95 790 ms, 64 longtask(s), INP 128 ms, p95 733 ms, 61 longtask(s), p95 731 ms, 59 longtask(s), p95 763 ms, 63 longtask(s), p95 773 ms
- principal / saisie-rapide : 69 longtask(s), INP 144 ms, p95 542 ms, 82 longtask(s), p95 549 ms, 77 longtask(s), INP 152 ms, p95 536 ms, 78 longtask(s), INP 168 ms, p95 550 ms, 86 longtask(s), p95 568 ms
- precalcul / saisie-rapide : 59 longtask(s), INP 144 ms, p95 756 ms, 66 longtask(s), INP 160 ms, p95 771 ms, 65 longtask(s), INP 120 ms, p95 785 ms, 69 longtask(s), INP 136 ms, p95 815 ms, 60 longtask(s), INP 128 ms, p95 782 ms
- immediat / saisie-rapide : 59 longtask(s), INP 128 ms, p95 778 ms, 70 longtask(s), INP 136 ms, p95 779 ms, 58 longtask(s), INP 144 ms, p95 783 ms, p95 753 ms, 66 longtask(s), p95 748 ms
- base / saisies-distantes : 61 longtask(s), INP 152 ms, p95 379 ms, 65 longtask(s), INP 128 ms, p95 309 ms, 67 longtask(s), INP 136 ms, p95 355 ms, p95 341 ms, p95 334 ms
- dag / saisies-distantes : 64 longtask(s), INP 152 ms, p95 360 ms, 62 longtask(s), INP 136 ms, p95 392 ms, p95 467 ms, 61 longtask(s), INP 128 ms, 60 longtask(s), INP 144 ms, p95 307 ms
- principal / saisies-distantes : 84 longtask(s), INP 160 ms, p95 324 ms, 76 longtask(s), INP 152 ms, p95 318 ms, 72 longtask(s), INP 136 ms, p95 303 ms, 73 longtask(s), p95 281 ms, 69 longtask(s), INP 144 ms, p95 286 ms
- precalcul / saisies-distantes : 68 longtask(s), INP 136 ms, p95 336 ms, 66 longtask(s), INP 152 ms, p95 372 ms, 58 longtask(s), p95 431 ms, 69 longtask(s), p95 377 ms, 63 longtask(s), INP 144 ms, p95 389 ms
- immediat / saisies-distantes : 56 longtask(s), INP 160 ms, p95 353 ms, 67 longtask(s), INP 144 ms, p95 375 ms, 61 longtask(s), INP 136 ms, 68 longtask(s), INP 152 ms, p95 366 ms, 59 longtask(s)
- base / changement-participant : 38 longtask(s), INP 176 ms, 41 longtask(s), INP 192 ms, 42 longtask(s), INP 112 ms
- dag / changement-participant : 42 longtask(s), INP 120 ms, 49 longtask(s), INP 128 ms, 46 longtask(s), 43 longtask(s), 45 longtask(s)
- principal / changement-participant : 24 longtask(s), INP 112 ms, 32 longtask(s), 25 longtask(s), 26 longtask(s)
- precalcul / changement-participant : 44 longtask(s), INP 224 ms, 42 longtask(s), INP 128 ms, INP 240 ms, 39 longtask(s), INP 112 ms, INP 120 ms
- immediat / changement-participant : 38 longtask(s), INP 112 ms, 34 longtask(s), INP 224 ms, 41 longtask(s), 36 longtask(s), 49 longtask(s), INP 128 ms
- base / changement-axe-vue : 43 longtask(s), INP 200 ms, 42 longtask(s), 40 longtask(s), 44 longtask(s)
- dag / changement-axe-vue : 42 longtask(s), INP 200 ms, INP 216 ms, 43 longtask(s)
- principal / changement-axe-vue : 25 longtask(s), INP 376 ms, INP 360 ms, 27 longtask(s)
- precalcul / changement-axe-vue : 43 longtask(s), INP 200 ms, 42 longtask(s), INP 216 ms, 45 longtask(s), 44 longtask(s), INP 232 ms, 46 longtask(s)
- immediat / changement-axe-vue : 44 longtask(s), INP 200 ms, 43 longtask(s), 42 longtask(s), INP 208 ms
- base / defilement : 50 longtask(s), 31 LoAF, 49 longtask(s), 30 LoAF, 32 LoAF, 48 longtask(s), 29 LoAF, 58 longtask(s)
- dag / defilement : 56 longtask(s), 35 LoAF, 46 longtask(s), 27 LoAF, 40 longtask(s), 28 LoAF, 36 LoAF, 54 longtask(s), 26 LoAF
- principal / defilement : 41 longtask(s), 30 LoAF, 48 longtask(s), 32 LoAF, 39 longtask(s), 43 longtask(s), 33 LoAF, 57 longtask(s), 31 LoAF
- precalcul / defilement : 57 longtask(s), 27 LoAF, 59 longtask(s), 28 LoAF, 53 longtask(s), 58 longtask(s), 32 LoAF, 29 LoAF
- immediat / defilement : 49 longtask(s), 28 LoAF, 37 longtask(s), 29 LoAF, 50 longtask(s), 39 longtask(s), 27 LoAF, 60 longtask(s)
- base / ouverture-graphe : 68 longtask(s), INP 264 ms, 62 longtask(s), INP 296 ms, 61 longtask(s), 59 longtask(s)
- dag / ouverture-graphe : 64 longtask(s), INP 264 ms, 63 longtask(s), 62 longtask(s), INP 280 ms, 65 longtask(s)
- principal / ouverture-graphe : 38 longtask(s), INP 384 ms, 36 longtask(s), INP 424 ms, 34 longtask(s), INP 416 ms, 35 longtask(s), INP 408 ms
- precalcul / ouverture-graphe : 63 longtask(s), INP 264 ms, 61 longtask(s), 64 longtask(s), 62 longtask(s), 66 longtask(s)
- immediat / ouverture-graphe : 61 longtask(s), INP 280 ms, 62 longtask(s), INP 264 ms, 63 longtask(s), 59 longtask(s), 64 longtask(s)

## Latence décomposée (saisie rapide)

Médiane des écarts entre étapes successives (ms), marques des deux threads ramenées à l'horloge de la page par `performance.timeOrigin`. `calcul` : début et fin du calcul (worker ou thread principal).

Bridage logiciel du worker : l'attente active suit le calcul et précède `workerEnvoi`, elle compte dans « workerReception → workerEnvoi » ; la colonne `calcul` (fenêtre mesurée par le moteur) reste à vitesse native.

| Configuration | saisies | sans latence | evenement → validation | validation → ecriture | ecriture → subscribeChanges | subscribeChanges → envoi | envoi → workerReception | workerReception → workerEnvoi | workerEnvoi → retour | retour → commit | commit → peinture | calcul (worker non bridé) | total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| base | 500 | 1 | 0.8 | 0.0 | 0.8 | 0.0 | 0.1 | 0.8 (depuis envoi) | 71.9 (depuis envoi) | 32.3 | 34.3 | 0.2 | 129.8 |
| dag | 500 | 0 | 0.9 | 0.0 | 0.8 | 0.0 | 0.1 | 0.7 (depuis envoi) | 71.9 | 31.9 | 34.3 | 0.1 | 141.3 |
| principal | 500 | 0 | 0.8 | 0.1 | 0.7 | — | — | — | — | 46.5 (depuis subscribeChanges) | 32.8 | 3.3 | 90.1 |
| precalcul | 500 | 0 | 0.8 | 0.0 | 0.8 | 0.0 | 0.1 | 0.8 (depuis envoi) | 72.1 | 32.9 | 34.2 | 0.2 | 133.0 |
| immediat | 500 | 0 | 0.9 | 0.0 | 0.8 | 0.0 | 0.1 | 0.8 (depuis envoi) | 71.7 | 33.3 | 34.3 | 0.2 | 136.2 |

## Actions (sans critère propre)

| Configuration | Scénario | type | dans le LRU | n | médiane (ms) | pire (ms) |
| --- | --- | --- | --- | --- | --- | --- |
| base | changement-participant | participant | non | 75 | 487 | 606 |
| base | changement-participant | participant | oui | 75 | 113 | 132 |
| base | changement-axe-vue | axe | — | 50 | 303 | 414 |
| base | changement-axe-vue | vue | — | 50 | 302 | 396 |
| base | ouverture-graphe | graphe | non | 20 | 347 | 379 |
| base | ouverture-graphe | graphe | oui | 30 | 347 | 397 |
| dag | changement-participant | participant | non | 75 | 494 | 646 |
| dag | changement-participant | participant | oui | 75 | 114 | 135 |
| dag | changement-axe-vue | axe | — | 50 | 303 | 392 |
| dag | changement-axe-vue | vue | — | 50 | 299 | 380 |
| dag | ouverture-graphe | graphe | non | 20 | 360 | 397 |
| dag | ouverture-graphe | graphe | oui | 30 | 347 | 372 |
| principal | changement-participant | participant | non | 65 | 83 | 490 |
| principal | changement-participant | participant | oui | 85 | 311 | 407 |
| principal | changement-axe-vue | axe | — | 50 | 206 | 303 |
| principal | changement-axe-vue | vue | — | 50 | 208 | 379 |
| principal | ouverture-graphe | graphe | non | 35 | 345 | 409 |
| principal | ouverture-graphe | graphe | oui | 15 | 344 | 473 |
| precalcul | changement-participant | participant | non | 5 | 656 | 708 |
| precalcul | changement-participant | participant | oui | 145 | 131 | 614 |
| precalcul | changement-axe-vue | axe | — | 50 | 304 | 456 |
| precalcul | changement-axe-vue | vue | — | 50 | 315 | 380 |
| precalcul | ouverture-graphe | graphe | non | 5 | 379 | 385 |
| precalcul | ouverture-graphe | graphe | oui | 45 | 347 | 398 |
| immediat | changement-participant | participant | non | 75 | 489 | 615 |
| immediat | changement-participant | participant | oui | 75 | 113 | 131 |
| immediat | changement-axe-vue | axe | — | 50 | 306 | 410 |
| immediat | changement-axe-vue | vue | — | 50 | 330 | 396 |
| immediat | ouverture-graphe | graphe | non | 20 | 355 | 413 |
| immediat | ouverture-graphe | graphe | oui | 30 | 347 | 398 |

## Mesures sans critère

### Démarrage par phases (médiane des runs, ms)

| Configuration | structures | extension | compile | generation | insertion | somme | worker-pret | table-peinte |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| base | 15 | 15 | 110 | 469 | 3376 | 495 | 5892 | 6041 |
| dag | 16 | 15 | 109 | 458 | 3374 | 496 | 5818 | 5975 |
| principal | 16 | 15 | 107 | 460 | 3390 | 499 | — | 5128 |
| precalcul | 15 | 14 | 109 | 461 | 3395 | 489 | 5865 | 6172 |
| immediat | 15 | 15 | 108 | 466 | 3379 | 484 | 5862 | 6022 |

`worker-pret` et `table-peinte` : instants depuis le début de la navigation ; les autres : durées.

### Mémoire par cible (Mo, après GC, médiane des runs)

Tas JS utilisé + stockage des ArrayBuffer (`Runtime.getHeapUsage` : `usedSize + backingStorageSize`).

| Configuration | page chargement | worker chargement | page LRU plein | worker LRU plein | page fin | worker fin |
| --- | --- | --- | --- | --- | --- | --- |
| base | 157.8 | 16.7 | 159.0 | 17.0 | 161.5 | 18.3 |
| dag | 157.8 | 14.2 | 159.0 | 14.5 | 161.5 | 14.5 |
| principal | 161.6 | — | 164.9 | — | 168.3 | — |
| precalcul | 157.8 | 24.3 | 159.0 | 24.1 | 161.5 | 24.3 |
| immediat | 157.8 | 16.7 | 159.0 | 17.1 | 161.5 | 18.3 |

### Écritures en série, copie de grille, bascule du modèle

| Configuration | Mesure | valeurs | garde-fou 50 ms |
| --- | --- | --- | --- |
| base | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 9.4, instanciationMsParParticipant 0.1 | ⚠ 8 tâche(s) > 50 ms, max 151 ms — constat bloquant |
| base | ecritures-en-serie | nombre 1000, totalMs 5068.8, medianeMs 0, p95Ms 0.8, maxMs 3.3 | ok |
| base | copie-grille | grille 3, cases 263265, principalMs 11335.4, totalMs 17903.4 | ⚠ 1 tâche(s) > 50 ms, max 11370 ms — constat bloquant |
| base | bascule-modele | principalMs 110.4, totalMs 381.9 | ⚠ 3 tâche(s) > 50 ms, max 184 ms — constat non bloquant |
| dag | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 3.3, instanciationMsParParticipant 0.0 | ⚠ 9 tâche(s) > 50 ms, max 149 ms — constat bloquant |
| dag | ecritures-en-serie | nombre 1000, totalMs 5348.8, medianeMs 0, p95Ms 0.9, maxMs 3.9 | ok |
| dag | copie-grille | grille 3, cases 263265, principalMs 11425.9, totalMs 17992.3 | ⚠ 1 tâche(s) > 50 ms, max 11458 ms — constat bloquant |
| dag | bascule-modele | principalMs 86.4, totalMs 346.4 | ⚠ 3 tâche(s) > 50 ms, max 155 ms — constat non bloquant |
| principal | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 69.9, instanciationMsParParticipant 0.5 | ⚠ 10 tâche(s) > 50 ms, max 100 ms — constat bloquant |
| principal | ecritures-en-serie | nombre 1000, totalMs 4500.5, medianeMs 0, p95Ms 1.5, maxMs 3.8 | ok |
| principal | copie-grille | grille 3, cases 263265, principalMs 11738.5, totalMs 11753.6 | ⚠ 1 tâche(s) > 50 ms, max 11774 ms — constat bloquant |
| principal | bascule-modele | principalMs 213, totalMs 306.1 | ⚠ 1 tâche(s) > 50 ms, max 274 ms — constat non bloquant |
| precalcul | remplissage-lru | lignes 200, lruDebut 0, lruFin 0, instanciations 341, instanciationMs 9.2, instanciationMsParParticipant 0.0 | ⚠ 8 tâche(s) > 50 ms, max 172 ms — constat bloquant |
| precalcul | ecritures-en-serie | nombre 1000, totalMs 5406.6, medianeMs 0.1, p95Ms 0.9, maxMs 3.6 | ok |
| precalcul | copie-grille | grille 3, cases 263265, principalMs 11528.1, totalMs 17886.8 | ⚠ 1 tâche(s) > 50 ms, max 11560 ms — constat bloquant |
| precalcul | bascule-modele | principalMs 89.4, totalMs 399.9 | ⚠ 3 tâche(s) > 50 ms, max 164 ms — constat non bloquant |
| immediat | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 9.2, instanciationMsParParticipant 0.1 | ⚠ 10 tâche(s) > 50 ms, max 88 ms — constat bloquant |
| immediat | ecritures-en-serie | nombre 1000, totalMs 5691, medianeMs 0.1, p95Ms 0.9, maxMs 3.9 | ok |
| immediat | copie-grille | grille 3, cases 263265, principalMs 11524.7, totalMs 18092.4 | ⚠ 1 tâche(s) > 50 ms, max 11557 ms — constat bloquant |
| immediat | bascule-modele | principalMs 95.1, totalMs 361.4 | ⚠ 3 tâche(s) > 50 ms, max 164 ms — constat non bloquant |
| base | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 150, instanciationMs 8.9, instanciationMsParParticipant 0.1 | ⚠ 8 tâche(s) > 50 ms, max 149 ms — constat bloquant |
| base | ecritures-en-serie | nombre 1000, totalMs 5127.5, medianeMs 0.1, p95Ms 0.9, maxMs 3.1 | ok |
| base | copie-grille | grille 3, cases 263265, principalMs 11262, totalMs 17802.9 | ⚠ 1 tâche(s) > 50 ms, max 11295 ms — constat bloquant |
| base | bascule-modele | principalMs 89.7, totalMs 359.7 | ⚠ 3 tâche(s) > 50 ms, max 161 ms — constat non bloquant |
| dag | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 150, instanciationMs 2.9, instanciationMsParParticipant 0.0 | ⚠ 8 tâche(s) > 50 ms, max 155 ms — constat bloquant |
| dag | ecritures-en-serie | nombre 1000, totalMs 5217, medianeMs 0, p95Ms 0.9, maxMs 3.8 | ok |
| dag | copie-grille | grille 3, cases 263265, principalMs 12339, totalMs 18791.8 | ⚠ 1 tâche(s) > 50 ms, max 12373 ms — constat bloquant |
| dag | bascule-modele | principalMs 180.3, totalMs 441.9 | ⚠ 3 tâche(s) > 50 ms, max 253 ms — constat non bloquant |
| principal | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 54.2, instanciationMsParParticipant 0.4 | ⚠ 10 tâche(s) > 50 ms, max 98 ms — constat bloquant |
| principal | ecritures-en-serie | nombre 1000, totalMs 4543.5, medianeMs 0, p95Ms 1.7, maxMs 4.2 | ok |
| principal | copie-grille | grille 3, cases 263265, principalMs 11704.1, totalMs 11713.9 | ⚠ 1 tâche(s) > 50 ms, max 11739 ms — constat bloquant |
| principal | bascule-modele | principalMs 211.1, totalMs 300.9 | ⚠ 1 tâche(s) > 50 ms, max 270 ms — constat non bloquant |
| precalcul | remplissage-lru | lignes 200, lruDebut 0, lruFin 0, instanciations 428, instanciationMs 20.5, instanciationMsParParticipant 0.0 | ⚠ 9 tâche(s) > 50 ms, max 184 ms — constat bloquant |
| precalcul | ecritures-en-serie | nombre 1000, totalMs 5818.3, medianeMs 0.1, p95Ms 1, maxMs 3.7 | ok |
| precalcul | copie-grille | grille 3, cases 263265, principalMs 12046.5, totalMs 18774.3 | ⚠ 1 tâche(s) > 50 ms, max 12077 ms — constat bloquant |
| precalcul | bascule-modele | principalMs 87, totalMs 512 | ⚠ 3 tâche(s) > 50 ms, max 236 ms — constat non bloquant |
| immediat | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 9.5, instanciationMsParParticipant 0.1 | ⚠ 10 tâche(s) > 50 ms, max 92 ms — constat bloquant |
| immediat | ecritures-en-serie | nombre 1000, totalMs 4952.2, medianeMs 0, p95Ms 0.8, maxMs 3.3 | ok |
| immediat | copie-grille | grille 3, cases 263265, principalMs 11820.9, totalMs 18490.5 | ⚠ 1 tâche(s) > 50 ms, max 11853 ms — constat bloquant |
| immediat | bascule-modele | principalMs 161.1, totalMs 428.6 | ⚠ 3 tâche(s) > 50 ms, max 232 ms — constat non bloquant |
| base | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 9.4, instanciationMsParParticipant 0.1 | ⚠ 8 tâche(s) > 50 ms, max 156 ms — constat bloquant |
| base | ecritures-en-serie | nombre 1000, totalMs 5406.6, medianeMs 0.1, p95Ms 0.8, maxMs 3.7 | ok |
| base | copie-grille | grille 3, cases 263265, principalMs 12024.4, totalMs 18742.1 | ⚠ 1 tâche(s) > 50 ms, max 12055 ms — constat bloquant |
| base | bascule-modele | principalMs 175.7, totalMs 439.4 | ⚠ 3 tâche(s) > 50 ms, max 247 ms — constat non bloquant |
| dag | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 3.0, instanciationMsParParticipant 0.0 | ⚠ 9 tâche(s) > 50 ms, max 115 ms — constat bloquant |
| dag | ecritures-en-serie | nombre 1000, totalMs 5239.6, medianeMs 0.1, p95Ms 0.8, maxMs 3.4 | ok |
| dag | copie-grille | grille 3, cases 263265, principalMs 11245.1, totalMs 17910.4 | ⚠ 1 tâche(s) > 50 ms, max 11275 ms — constat bloquant |
| dag | bascule-modele | principalMs 101.5, totalMs 367.4 | ⚠ 3 tâche(s) > 50 ms, max 174 ms — constat non bloquant |
| principal | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 62.6, instanciationMsParParticipant 0.4 | ⚠ 10 tâche(s) > 50 ms, max 104 ms — constat bloquant |
| principal | ecritures-en-serie | nombre 1000, totalMs 4517.3, medianeMs 0, p95Ms 1.4, maxMs 4 | ok |
| principal | copie-grille | grille 3, cases 263265, principalMs 11829.5, totalMs 11839.4 | ⚠ 1 tâche(s) > 50 ms, max 11863 ms — constat bloquant |
| principal | bascule-modele | principalMs 209.3, totalMs 301.8 | ⚠ 1 tâche(s) > 50 ms, max 269 ms — constat non bloquant |
| precalcul | remplissage-lru | lignes 200, lruDebut 0, lruFin 0, instanciations 425, instanciationMs 15.8, instanciationMsParParticipant 0.0 | ⚠ 9 tâche(s) > 50 ms, max 184 ms — constat bloquant |
| precalcul | ecritures-en-serie | nombre 1000, totalMs 5241, medianeMs 0.1, p95Ms 0.9, maxMs 3.2 | ok |
| precalcul | copie-grille | grille 3, cases 263265, principalMs 12175.8, totalMs 18269.5 | ⚠ 1 tâche(s) > 50 ms, max 12208 ms — constat bloquant |
| precalcul | bascule-modele | principalMs 178, totalMs 466.6 | ⚠ 3 tâche(s) > 50 ms, max 254 ms — constat non bloquant |
| immediat | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 13.4, instanciationMsParParticipant 0.1 | ⚠ 9 tâche(s) > 50 ms, max 115 ms — constat bloquant |
| immediat | ecritures-en-serie | nombre 1000, totalMs 5097.6, medianeMs 0.1, p95Ms 0.8, maxMs 3.3 | ok |
| immediat | copie-grille | grille 3, cases 263265, principalMs 12245, totalMs 18840.5 | ⚠ 1 tâche(s) > 50 ms, max 12277 ms — constat bloquant |
| immediat | bascule-modele | principalMs 121.2, totalMs 416.9 | ⚠ 3 tâche(s) > 50 ms, max 226 ms — constat non bloquant |
| base | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 8.6, instanciationMsParParticipant 0.1 | ⚠ 10 tâche(s) > 50 ms, max 101 ms — constat bloquant |
| base | ecritures-en-serie | nombre 1000, totalMs 5017.2, medianeMs 0.1, p95Ms 0.8, maxMs 3.4 | ok |
| base | copie-grille | grille 3, cases 263265, principalMs 11514.6, totalMs 18303.4 | ⚠ 1 tâche(s) > 50 ms, max 11546 ms — constat bloquant |
| base | bascule-modele | principalMs 174.2, totalMs 447.8 | ⚠ 3 tâche(s) > 50 ms, max 246 ms — constat non bloquant |
| dag | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 3.7, instanciationMsParParticipant 0.0 | ⚠ 8 tâche(s) > 50 ms, max 150 ms — constat bloquant |
| dag | ecritures-en-serie | nombre 1000, totalMs 5357.7, medianeMs 0, p95Ms 0.8, maxMs 3.5 | ok |
| dag | copie-grille | grille 3, cases 263265, principalMs 12044.9, totalMs 18748.6 | ⚠ 1 tâche(s) > 50 ms, max 12078 ms — constat bloquant |
| dag | bascule-modele | principalMs 178.5, totalMs 443.4 | ⚠ 3 tâche(s) > 50 ms, max 251 ms — constat non bloquant |
| principal | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 58.2, instanciationMsParParticipant 0.4 | ⚠ 10 tâche(s) > 50 ms, max 97 ms — constat bloquant |
| principal | ecritures-en-serie | nombre 1000, totalMs 4494.5, medianeMs 0, p95Ms 1.5, maxMs 3.9 | ok |
| principal | copie-grille | grille 3, cases 263265, principalMs 11875.7, totalMs 11886.2 | ⚠ 1 tâche(s) > 50 ms, max 11910 ms — constat bloquant |
| principal | bascule-modele | principalMs 214.8, totalMs 308.3 | ⚠ 1 tâche(s) > 50 ms, max 276 ms — constat non bloquant |
| precalcul | remplissage-lru | lignes 200, lruDebut 0, lruFin 0, instanciations 369, instanciationMs 7.4, instanciationMsParParticipant 0.0 | ⚠ 10 tâche(s) > 50 ms, max 105 ms — constat bloquant |
| precalcul | ecritures-en-serie | nombre 1000, totalMs 4875.7, medianeMs 0.1, p95Ms 0.9, maxMs 3.2 | ok |
| precalcul | copie-grille | grille 3, cases 263265, principalMs 12078, totalMs 18168.2 | ⚠ 1 tâche(s) > 50 ms, max 12108 ms — constat bloquant |
| precalcul | bascule-modele | principalMs 173.8, totalMs 460.2 | ⚠ 3 tâche(s) > 50 ms, max 248 ms — constat non bloquant |
| immediat | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 8.0, instanciationMsParParticipant 0.1 | ⚠ 10 tâche(s) > 50 ms, max 91 ms — constat bloquant |
| immediat | ecritures-en-serie | nombre 1000, totalMs 5267.7, medianeMs 0.1, p95Ms 0.9, maxMs 3.5 | ok |
| immediat | copie-grille | grille 3, cases 263265, principalMs 12448.5, totalMs 19120.4 | ⚠ 1 tâche(s) > 50 ms, max 12481 ms — constat bloquant |
| immediat | bascule-modele | principalMs 122.5, totalMs 421.2 | ⚠ 3 tâche(s) > 50 ms, max 232 ms — constat non bloquant |
| base | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 8.8, instanciationMsParParticipant 0.1 | ⚠ 8 tâche(s) > 50 ms, max 150 ms — constat bloquant |
| base | ecritures-en-serie | nombre 1000, totalMs 5260.5, medianeMs 0.1, p95Ms 0.8, maxMs 3.8 | ok |
| base | copie-grille | grille 3, cases 263265, principalMs 11470.3, totalMs 18222.7 | ⚠ 1 tâche(s) > 50 ms, max 11502 ms — constat bloquant |
| base | bascule-modele | principalMs 170.4, totalMs 447.7 | ⚠ 3 tâche(s) > 50 ms, max 243 ms — constat non bloquant |
| dag | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 2.5, instanciationMsParParticipant 0.0 | ⚠ 10 tâche(s) > 50 ms, max 87 ms — constat bloquant |
| dag | ecritures-en-serie | nombre 1000, totalMs 5306.5, medianeMs 0.1, p95Ms 0.9, maxMs 3.3 | ok |
| dag | copie-grille | grille 3, cases 263265, principalMs 11680.4, totalMs 18396 | ⚠ 1 tâche(s) > 50 ms, max 11710 ms — constat bloquant |
| dag | bascule-modele | principalMs 107.1, totalMs 372.5 | ⚠ 3 tâche(s) > 50 ms, max 177 ms — constat non bloquant |
| principal | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 51.7, instanciationMsParParticipant 0.3 | ⚠ 10 tâche(s) > 50 ms, max 104 ms — constat bloquant |
| principal | ecritures-en-serie | nombre 1000, totalMs 4521.2, medianeMs 0, p95Ms 1.5, maxMs 3.6 | ok |
| principal | copie-grille | grille 3, cases 263265, principalMs 11762.7, totalMs 11773.7 | ⚠ 1 tâche(s) > 50 ms, max 11798 ms — constat bloquant |
| principal | bascule-modele | principalMs 220, totalMs 314.7 | ⚠ 1 tâche(s) > 50 ms, max 283 ms — constat non bloquant |
| precalcul | remplissage-lru | lignes 200, lruDebut 0, lruFin 0, instanciations 419, instanciationMs 9.0, instanciationMsParParticipant 0.0 | ⚠ 10 tâche(s) > 50 ms, max 105 ms — constat bloquant |
| precalcul | ecritures-en-serie | nombre 1000, totalMs 5920.3, medianeMs 0.1, p95Ms 1, maxMs 3.1 | ok |
| precalcul | copie-grille | grille 3, cases 263265, principalMs 12131.1, totalMs 18672.7 | ⚠ 1 tâche(s) > 50 ms, max 12167 ms — constat bloquant |
| precalcul | bascule-modele | principalMs 131.3, totalMs 452 | ⚠ 3 tâche(s) > 50 ms, max 243 ms — constat non bloquant |
| immediat | remplissage-lru | lignes 200, lruDebut 46, lruFin 50, instanciations 154, instanciationMs 10.9, instanciationMsParParticipant 0.1 | ⚠ 8 tâche(s) > 50 ms, max 171 ms — constat bloquant |
| immediat | ecritures-en-serie | nombre 1000, totalMs 6023.6, medianeMs 0.1, p95Ms 0.8, maxMs 3.7 | ok |
| immediat | copie-grille | grille 3, cases 263265, principalMs 12284.3, totalMs 18992.6 | ⚠ 1 tâche(s) > 50 ms, max 12320 ms — constat bloquant |
| immediat | bascule-modele | principalMs 113.6, totalMs 422.3 | ⚠ 3 tâche(s) > 50 ms, max 228 ms — constat non bloquant |

Constats du garde-fou (thread principal bloqué plus de 50 ms une fois l'app interactive) :

- base / mesures : remplissage-lru : 8 tâche(s) > 50 ms, max 150 ms — constat bloquant
- base / mesures : copie-grille : 1 tâche(s) > 50 ms, max 12391 ms — constat bloquant
- base / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 162 ms — constat non bloquant
- dag / mesures : remplissage-lru : 8 tâche(s) > 50 ms, max 158 ms — constat bloquant
- dag / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11384 ms — constat bloquant
- dag / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 167 ms — constat non bloquant
- principal / mesures : remplissage-lru : 10 tâche(s) > 50 ms, max 96 ms — constat bloquant
- principal / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11707 ms — constat bloquant
- principal / mesures : bascule-modele : 1 tâche(s) > 50 ms, max 271 ms — constat non bloquant
- precalcul / mesures : remplissage-lru : 8 tâche(s) > 50 ms, max 171 ms — constat bloquant
- precalcul / mesures : copie-grille : 1 tâche(s) > 50 ms, max 12115 ms — constat bloquant
- precalcul / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 244 ms — constat non bloquant
- immediat / mesures : remplissage-lru : 8 tâche(s) > 50 ms, max 155 ms — constat bloquant
- immediat / mesures : copie-grille : 1 tâche(s) > 50 ms, max 12045 ms — constat bloquant
- immediat / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 155 ms — constat non bloquant
- base / mesures : remplissage-lru : 8 tâche(s) > 50 ms, max 151 ms — constat bloquant
- base / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11370 ms — constat bloquant
- base / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 184 ms — constat non bloquant
- dag / mesures : remplissage-lru : 9 tâche(s) > 50 ms, max 149 ms — constat bloquant
- dag / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11458 ms — constat bloquant
- dag / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 155 ms — constat non bloquant
- principal / mesures : remplissage-lru : 10 tâche(s) > 50 ms, max 100 ms — constat bloquant
- principal / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11774 ms — constat bloquant
- principal / mesures : bascule-modele : 1 tâche(s) > 50 ms, max 274 ms — constat non bloquant
- precalcul / mesures : remplissage-lru : 8 tâche(s) > 50 ms, max 172 ms — constat bloquant
- precalcul / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11560 ms — constat bloquant
- precalcul / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 164 ms — constat non bloquant
- immediat / mesures : remplissage-lru : 10 tâche(s) > 50 ms, max 88 ms — constat bloquant
- immediat / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11557 ms — constat bloquant
- immediat / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 164 ms — constat non bloquant
- base / mesures : remplissage-lru : 8 tâche(s) > 50 ms, max 149 ms — constat bloquant
- base / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11295 ms — constat bloquant
- base / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 161 ms — constat non bloquant
- dag / mesures : remplissage-lru : 8 tâche(s) > 50 ms, max 155 ms — constat bloquant
- dag / mesures : copie-grille : 1 tâche(s) > 50 ms, max 12373 ms — constat bloquant
- dag / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 253 ms — constat non bloquant
- principal / mesures : remplissage-lru : 10 tâche(s) > 50 ms, max 98 ms — constat bloquant
- principal / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11739 ms — constat bloquant
- principal / mesures : bascule-modele : 1 tâche(s) > 50 ms, max 270 ms — constat non bloquant
- precalcul / mesures : remplissage-lru : 9 tâche(s) > 50 ms, max 184 ms — constat bloquant
- precalcul / mesures : copie-grille : 1 tâche(s) > 50 ms, max 12077 ms — constat bloquant
- precalcul / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 236 ms — constat non bloquant
- immediat / mesures : remplissage-lru : 10 tâche(s) > 50 ms, max 92 ms — constat bloquant
- immediat / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11853 ms — constat bloquant
- immediat / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 232 ms — constat non bloquant
- base / mesures : remplissage-lru : 8 tâche(s) > 50 ms, max 156 ms — constat bloquant
- base / mesures : copie-grille : 1 tâche(s) > 50 ms, max 12055 ms — constat bloquant
- base / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 247 ms — constat non bloquant
- dag / mesures : remplissage-lru : 9 tâche(s) > 50 ms, max 115 ms — constat bloquant
- dag / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11275 ms — constat bloquant
- dag / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 174 ms — constat non bloquant
- principal / mesures : remplissage-lru : 10 tâche(s) > 50 ms, max 104 ms — constat bloquant
- principal / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11863 ms — constat bloquant
- principal / mesures : bascule-modele : 1 tâche(s) > 50 ms, max 269 ms — constat non bloquant
- precalcul / mesures : remplissage-lru : 9 tâche(s) > 50 ms, max 184 ms — constat bloquant
- precalcul / mesures : copie-grille : 1 tâche(s) > 50 ms, max 12208 ms — constat bloquant
- precalcul / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 254 ms — constat non bloquant
- immediat / mesures : remplissage-lru : 9 tâche(s) > 50 ms, max 115 ms — constat bloquant
- immediat / mesures : copie-grille : 1 tâche(s) > 50 ms, max 12277 ms — constat bloquant
- immediat / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 226 ms — constat non bloquant
- base / mesures : remplissage-lru : 10 tâche(s) > 50 ms, max 101 ms — constat bloquant
- base / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11546 ms — constat bloquant
- base / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 246 ms — constat non bloquant
- dag / mesures : remplissage-lru : 8 tâche(s) > 50 ms, max 150 ms — constat bloquant
- dag / mesures : copie-grille : 1 tâche(s) > 50 ms, max 12078 ms — constat bloquant
- dag / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 251 ms — constat non bloquant
- principal / mesures : remplissage-lru : 10 tâche(s) > 50 ms, max 97 ms — constat bloquant
- principal / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11910 ms — constat bloquant
- principal / mesures : bascule-modele : 1 tâche(s) > 50 ms, max 276 ms — constat non bloquant
- precalcul / mesures : remplissage-lru : 10 tâche(s) > 50 ms, max 105 ms — constat bloquant
- precalcul / mesures : copie-grille : 1 tâche(s) > 50 ms, max 12108 ms — constat bloquant
- precalcul / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 248 ms — constat non bloquant
- immediat / mesures : remplissage-lru : 10 tâche(s) > 50 ms, max 91 ms — constat bloquant
- immediat / mesures : copie-grille : 1 tâche(s) > 50 ms, max 12481 ms — constat bloquant
- immediat / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 232 ms — constat non bloquant
- base / mesures : remplissage-lru : 8 tâche(s) > 50 ms, max 150 ms — constat bloquant
- base / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11502 ms — constat bloquant
- base / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 243 ms — constat non bloquant
- dag / mesures : remplissage-lru : 10 tâche(s) > 50 ms, max 87 ms — constat bloquant
- dag / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11710 ms — constat bloquant
- dag / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 177 ms — constat non bloquant
- principal / mesures : remplissage-lru : 10 tâche(s) > 50 ms, max 104 ms — constat bloquant
- principal / mesures : copie-grille : 1 tâche(s) > 50 ms, max 11798 ms — constat bloquant
- principal / mesures : bascule-modele : 1 tâche(s) > 50 ms, max 283 ms — constat non bloquant
- precalcul / mesures : remplissage-lru : 10 tâche(s) > 50 ms, max 105 ms — constat bloquant
- precalcul / mesures : copie-grille : 1 tâche(s) > 50 ms, max 12167 ms — constat bloquant
- precalcul / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 243 ms — constat non bloquant
- immediat / mesures : remplissage-lru : 8 tâche(s) > 50 ms, max 171 ms — constat bloquant
- immediat / mesures : copie-grille : 1 tâche(s) > 50 ms, max 12320 ms — constat bloquant
- immediat / mesures : bascule-modele : 3 tâche(s) > 50 ms, max 228 ms — constat non bloquant
- base / mesures-lru : remplissage-lru : 8 tâche(s) > 50 ms, max 149 ms — constat bloquant
- base / mesures-lru : remplissage-lru : 8 tâche(s) > 50 ms, max 153 ms — constat bloquant
- base / mesures-lru : remplissage-lru : 10 tâche(s) > 50 ms, max 89 ms — constat bloquant
- base / mesures-lru : remplissage-lru : 9 tâche(s) > 50 ms, max 152 ms — constat bloquant
- base / mesures-lru : remplissage-lru : 8 tâche(s) > 50 ms, max 159 ms — constat bloquant
- base / mesures-lru : remplissage-lru : 8 tâche(s) > 50 ms, max 152 ms — constat bloquant
- base / mesures-lru : remplissage-lru : 10 tâche(s) > 50 ms, max 95 ms — constat bloquant
- base / mesures-lru : remplissage-lru : 8 tâche(s) > 50 ms, max 158 ms — constat bloquant
- base / mesures-lru : remplissage-lru : 11 tâche(s) > 50 ms, max 95 ms — constat bloquant
- base / mesures-lru : remplissage-lru : 10 tâche(s) > 50 ms, max 100 ms — constat bloquant
- base / mesures-lru : remplissage-lru : 9 tâche(s) > 50 ms, max 153 ms — constat bloquant
- base / mesures-lru : remplissage-lru : 10 tâche(s) > 50 ms, max 90 ms — constat bloquant
- base / mesures-lru : remplissage-lru : 10 tâche(s) > 50 ms, max 97 ms — constat bloquant
- base / mesures-lru : remplissage-lru : 8 tâche(s) > 50 ms, max 85 ms — constat bloquant
- base / mesures-lru : remplissage-lru : 8 tâche(s) > 50 ms, max 159 ms — constat bloquant
- base / mesures-lru : remplissage-lru : 11 tâche(s) > 50 ms, max 91 ms — constat bloquant
- base / mesures-lru : remplissage-lru : 10 tâche(s) > 50 ms, max 95 ms — constat bloquant
- base / mesures-lru : remplissage-lru : 8 tâche(s) > 50 ms, max 154 ms — constat bloquant

## Balayage du N du LRU (configuration de base)

Hors LRU : action pendant laquelle le worker a créé au moins une instance (observé). Mémoire par participant : écart de tas du worker (chargement → LRU plein) divisé par les instances entrées dans le LRU pendant le remplissage ; « — » si le LRU était déjà plein au chargement (comparer alors le tas à LRU plein d'un N à l'autre).

Instanciation : temps mesuré dans le worker à vitesse native, multiplié par le taux du bridage logiciel.

| N | changement de participant | latence hors LRU, médiane (ms) | tas worker LRU plein (Mo) | mémoire worker par participant (Ko) | instanciation par participant (ms) |
| --- | --- | --- | --- | --- | --- |
| 10 | ❌ | 136 | 13.0 | — | 0.242 |
| 50 | ❌ | 489 | 17.1 | 80.9 | 0.257 |
| 200 | ❌ | 531 | 32.4 | 104.8 | 0.242 |

Plus petit N qui passe « Changement de participant » : aucun.

## Runs

246 runs, JSON brut dans `runs/`.
