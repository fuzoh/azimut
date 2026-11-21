# Série de mesures 2026-11-20T15-40-51-perf-g3v1-p12-fin-s1-x4-fumee-headless

> **Validation du harnais, pas un verdict de performance du produit.** Cette série vérifie que le harnais pilote la session et produit ses mesures ; ses chiffres ne jugent ni le moteur ni les critères.

> **Série en nouveau headless : ses chiffres ne comptent pas.** Les critères se jugent en fenêtre visible (spec 20, « Conditions »).

> Série de fumée : 1 run par scénario et par configuration, sans run de chauffe.

> Déroulés raccourcis (`--court`) : moins d'opérations que le protocole.

> Population : **taille réelle**, profil `perf-g3v1-p12-fin-s1`, bridage ×4, instrumentation « mesure ». Les verdicts ci-dessous valent pour cette population seule : ils ne se combinent ni avec une autre catégorie (taille réelle, composite synthétique, charge historique), ni avec un autre taux, et chaque configuration est jugée à part.

## Profil de données

- Identifiant : `perf-g3v1-p12-fin-s1` (taille réelle)
- Jeu : perf ; structures : g3v1, non étendues
- Effectif total : 12 participants générés (demandé : 12) ; remplissage « fin » ; graine 1
- Grille active : 0 (G3 V1)
- Somme de contrôle des sources : `cases 2403:a01329e0499992a2 / nonEvaluations 10:65e4d1c3d352aaef / jokers 1:1e57ea331e57ea33`
- URL (configuration de base) : `http://localhost:4173/?jeu=perf&remplissage=fin&graine=1&participants=12&structures=g3v1&verif=0&simu=0&calcul=signaux&lieu=worker&cohorte=paresseux&distante=perimee&lru=50`

Cohorte synthétique : la distribution des notes vient du générateur, elle n'est pas une observation de cours réels.

| g | Grille | structure | empreinte | données (D) | calculs | regroupements | axes | cases possibles | cases stockées | remplissage observé | non-évaluations | dispenses | jokers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | G3 V1 | g3v1 | `a1299ca1` | 229 | 88 | 15 | 4 | 2748 | 2403 | 87.4 % | 10 | 0 | 1 |

Dimensions visibles au chargement (grille active, viewport 1600 × 1000) : table 12 lignes × 323 colonnes, 12 × 24 rendues ; débordement vertical 0 px, horizontal 19564 px.

## Conditions

- Date : 2026-11-20T15:40:51.982Z
- Mode : nouveau headless
- Commande : `bun harnais/serie.ts --headless --fumee --court --jeu perf --structures g3v1 --participants 12 --configs base,principal --bridage 4 --lru-balayage 5,50 --scenarios changement-participant,defilement,ouverture-graphe`
- Options : `{"bridage":4,"runs":1,"chauffe":0,"configs":["base","principal"],"scenarios":["changement-participant","defilement","ouverture-graphe","mesures"],"court":true,"viewport":{"width":1600,"height":1000},"lru":50,"lruBalayage":[5,50],"jeu":"perf","structures":["g3v1"],"participants":12,"remplissage":"fin","graine":1,"grille":0}`
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

- Ratio ×4 / ×1, thread principal : 3.98 (accepté entre 3.00 et 5.00)
- Ratio ×4 / ×1, worker, bridage de la page seul : 1.00
- Bridage du worker retenu : logiciel (ratio avec bridage logiciel : 4.04)
- Touche Playwright → entrée Event Timing : oui ; INP rapporté par web-vitals : oui
- Durées du calcul de calibration (ms) : page ×1 45.8, worker ×1 45.7, page ×4 182.3, worker ×4 (page bridée) 45.5, worker ×4 (bridage logiciel) 184.8
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

| Configuration | changement-participant | defilement | ouverture-graphe |
| --- | --- | --- | --- |
| base | ✅ · INP 40/40 · LT 0 | ✅ · INP —/— · LT 0 · LoAF 0 | ❌ · INP 80/80 · LT 2 |
| principal | ✅ · INP 40/40 · LT 0 | ✅ · INP —/— · LT 0 · LoAF 0 | ❌ · INP 88/88 · LT 4 |

Motifs :

- base / ouverture-graphe (échec) : 2 longtask(s)
- principal / ouverture-graphe (échec) : 4 longtask(s)

## Opérations exécutées et cadence

Par configuration et scénario, sur les runs valides hors chauffe : opérations exécutées / prévues (pire run), durée, et pour la saisie rapide la cadence obtenue (visée : une validation toutes les 200 ms). Un pilote plus lent que la cadence visée se voit ici, pas dans les critères.

| Configuration | Scénario | runs valides | opérations (pire run) | durée médiane (s) | intervalle moyen médian / pire (ms) | validations en retard (pire) | retard max (ms) | détails | non applicable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| base | changement-participant | 1 | 6/6 | 2.3 | — | — | — | — | — |
| base | defilement | 1 | 2/2 | 3.1 | — | — | — | — | défilement vertical : pas de débordement |
| base | ouverture-graphe | 1 | 2/2 | 1.3 | — | — | — | — | — |
| base | mesures | 1 | 5/5 | 0.8 | — | — | — | — | — |
| principal | changement-participant | 1 | 6/6 | 2.2 | — | — | — | — | — |
| principal | defilement | 1 | 2/2 | 3.1 | — | — | — | — | défilement vertical : pas de débordement |
| principal | ouverture-graphe | 1 | 2/2 | 1.2 | — | — | — | — | — |
| principal | mesures | 1 | 5/5 | 0.7 | — | — | — | — | — |

## Navigation avec et sans instanciation

Une action « avec instanciation » a créé au moins une instance de participant pendant le choix du participant (observé, pas supposé). Cellule : nombre d'actions · médiane / pire (ms). « non mesurée » : aucune action de cette catégorie, par exemple quand toute la cohorte tient dans le cache ; ce n'est pas une réussite.

| Configuration | Scénario | action | sans instanciation | avec instanciation |
| --- | --- | --- | --- | --- |
| base | changement-participant | participant | 6 · 48 / 89 | non mesurée |
| base | ouverture-graphe | graphe | 2 · 82 / 96 | non mesurée |
| principal | changement-participant | participant | 6 · 32 / 65 | non mesurée |
| principal | ouverture-graphe | graphe | 2 · 81 / 88 | non mesurée |

### Changement d'axe et de vue

| Configuration | type | n | médiane (ms) | pire (ms) |
| --- | --- | --- | --- | --- |

## Défilement : déplacement effectif

Par run : débordement possible et plus grand déplacement obtenu (px). Un axe sans débordement est « non applicable » ; un débordement sans déplacement invalide le run.

| Run | Configuration | axe | débordement | déplacement | événements molette | statut |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | base | vertical | 0 | 0 | 62 | non applicable |
| 3 | base | horizontal | 19564 | 2800 | 28 | mesuré |
| 4 | principal | vertical | 0 | 0 | 60 | non applicable |
| 4 | principal | horizontal | 19564 | 2900 | 29 | mesuré |

## Latence décomposée (saisie rapide)

Médiane des écarts entre étapes successives (ms), runs valides, marques des deux threads ramenées à l'horloge de la page par `performance.timeOrigin`. `calcul` : début et fin du calcul (worker ou thread principal). Les médianes des étapes ne s'additionnent pas pour reconstituer une latence.

Bridage logiciel du worker : l'attente active suit le calcul et précède `workerEnvoi`, elle compte dans « workerReception → workerEnvoi » ; la colonne `calcul` (fenêtre mesurée par le moteur) reste à vitesse native.

| Configuration | saisies | sans latence | evenement → validation | validation → ecriture | ecriture → subscribeChanges | subscribeChanges → envoi | envoi → workerReception | workerReception → workerEnvoi | workerEnvoi → retour | retour → commit | commit → peinture | calcul (worker non bridé) | total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Mesures sans critère

### Démarrage par phases (médiane des runs valides, ms)

| Configuration | structures | extension | compile | generation | insertion | somme | worker-pret | table-peinte |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| base | 0 | — | 14 | 8 | 22 | 3 | 398 | 460 |
| principal | 0 | — | 14 | 7 | 21 | 4 | — | 372 |

`worker-pret` et `table-peinte` : instants depuis le début de la navigation ; les autres : durées. `extension` n'existe que pour le jeu de charge.

### Mémoire par cible (Mo, après GC, médiane des runs valides)

Tas JS utilisé + stockage des ArrayBuffer (`Runtime.getHeapUsage` : `usedSize + backingStorageSize`).

| Configuration | page chargement | worker chargement | page LRU plein | worker LRU plein | page fin | worker fin |
| --- | --- | --- | --- | --- | --- | --- |
| base | 6.4 | 2.2 | 7.1 | 2.3 | 8.0 | 2.4 |
| principal | 6.4 | — | 7.1 | — | 8.8 | — |

### Écritures en série, copies de grille, bascule du modèle

Sur la grille active. `copie-grille` : copie à l'identique ; `copie-grille-provenance` : copie vers la structure du corpus qui en provient (G3 V1 → V2), seulement si elle existe.

| Configuration | Mesure | valeurs | garde-fou 50 ms |
| --- | --- | --- | --- |
| base | remplissage-lru | lignes 12, lruDebut 12, lruFin 12, instanciations 0, instanciationMs 0, instanciationMsParParticipant null | ok |
| base | ecritures-en-serie | grille 0, nombre 100, totalMs 496.4, medianeMs 0.1, p95Ms 0.8, maxMs 3.4 | ok |
| base | copie-grille | grille 1, cible "copie à l'identique", cases 2414, principalMs 66.6, totalMs 88.5 | ⚠ 1 tâche(s) > 50 ms, max 74 ms — constat bloquant |
| base | copie-grille-provenance | grille 2, cible "G3 V2", cases 2402, principalMs 51.6, totalMs 69.7 | ⚠ 1 tâche(s) > 50 ms, max 59 ms — constat bloquant |
| base | bascule-modele | principalMs 15.3, totalMs 55.4 | ok |
| principal | remplissage-lru | lignes 12, lruDebut 12, lruFin 12, instanciations 0, instanciationMs 0, instanciationMsParParticipant null | ok |
| principal | ecritures-en-serie | grille 0, nombre 100, totalMs 465.5, medianeMs 0.1, p95Ms 0.9, maxMs 4.6 | ok |
| principal | copie-grille | grille 1, cible "copie à l'identique", cases 2414, principalMs 64, totalMs 71.7 | ⚠ 1 tâche(s) > 50 ms, max 73 ms — constat bloquant |
| principal | copie-grille-provenance | grille 2, cible "G3 V2", cases 2402, principalMs 51.3, totalMs 56 | ⚠ 1 tâche(s) > 50 ms, max 58 ms — constat bloquant |
| principal | bascule-modele | principalMs 15.4, totalMs 49.6 | ok |

Constats du garde-fou (thread principal bloqué plus de 50 ms une fois l'app interactive) :

- base / mesures : copie-grille : 1 tâche(s) > 50 ms, max 74 ms — constat bloquant
- base / mesures : copie-grille-provenance : 1 tâche(s) > 50 ms, max 59 ms — constat bloquant
- principal / mesures : copie-grille : 1 tâche(s) > 50 ms, max 73 ms — constat bloquant
- principal / mesures : copie-grille-provenance : 1 tâche(s) > 50 ms, max 58 ms — constat bloquant

## Balayage du N du LRU (configuration de base)

Valeurs testées : 5, 50 ; effectif 12. Hors LRU : action pendant laquelle le worker a créé au moins une instance (observé). Si P ≤ N, toute la cohorte de la grille active tient dans le cache : la catégorie hors LRU n'est pas observée, elle est « non mesurée ». Mémoire par participant : écart de tas du worker (chargement → LRU plein) divisé par les instances entrées dans le LRU pendant le remplissage ; « — » si le LRU était déjà plein au chargement.

Instanciation : temps mesuré dans le worker à vitesse native, multiplié par le taux du bridage logiciel.

| N | changement de participant | runs invalides | P ≤ N | actions dans / hors LRU | latence hors LRU, médiane (ms) | tas worker LRU plein (Mo) | mémoire worker par participant (Ko) | instanciation par participant (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 5 | ✅ | 0 | non | 3 / 3 | 48 | 2.1 | — | — |
| 50 | ✅ | 0 | oui | 6 / non mesurée | — | 2.3 | — | — |

Plus petit N dont tous les runs « Changement de participant » sont valides et passent : 5.

## Runs

12 runs dont 0 invalide(s), JSON brut dans `runs/` (non versionné).
