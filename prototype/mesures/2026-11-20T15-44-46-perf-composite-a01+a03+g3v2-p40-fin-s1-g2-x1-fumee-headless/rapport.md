# Série de mesures 2026-11-20T15-44-46-perf-composite-a01+a03+g3v2-p40-fin-s1-g2-x1-fumee-headless

> **Validation du harnais, pas un verdict de performance du produit.** Cette série vérifie que le harnais pilote la session et produit ses mesures ; ses chiffres ne jugent ni le moteur ni les critères.

> **Série en nouveau headless : ses chiffres ne comptent pas.** Les critères se jugent en fenêtre visible (spec 20, « Conditions »).

> Série de fumée : 1 run par scénario et par configuration, sans run de chauffe.

> Déroulés raccourcis (`--court`) : moins d'opérations que le protocole.

> Population : **composite synthétique**, profil `perf-composite-a01+a03+g3v2-p40-fin-s1-g2`, bridage ×1, instrumentation « mesure ». Les verdicts ci-dessous valent pour cette population seule : ils ne se combinent ni avec une autre catégorie (taille réelle, composite synthétique, charge historique), ni avec un autre taux, et chaque configuration est jugée à part.

## Profil de données

- Identifiant : `perf-composite-a01+a03+g3v2-p40-fin-s1-g2` (composite synthétique)
- Jeu : perf ; structures : a01, a03, g3v2, non étendues
- Effectif total : 40 participants générés (demandé : 40) ; remplissage « fin » ; graine 1
- Grille active : 2 (G3 V2)
- Somme de contrôle des sources : `cases 23307:b1db65f3c6a01cb9 / nonEvaluations 118:df71a2aaeb77a02e / jokers 26:4cf4200bd6cb447b`
- URL (configuration de base) : `http://localhost:4173/?jeu=perf&remplissage=fin&graine=1&participants=40&structures=a01%2Ca03%2Cg3v2&grille=2&verif=0&simu=0&calcul=signaux&lieu=worker&cohorte=paresseux&distante=perimee&lru=50`

Session composite synthétique : plusieurs structures chargées ensemble pour éprouver le volume, pas une session de cours observée.

Cohorte synthétique : la distribution des notes vient du générateur, elle n'est pas une observation de cours réels.

| g | Grille | structure | empreinte | données (D) | calculs | regroupements | axes | cases possibles | cases stockées | remplissage observé | non-évaluations | dispenses | jokers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | A01 | a01 | `ab3d0365` | 156 | 83 | 0 | 3 | 6240 | 5568 | 89.2 % | 25 | 0 | 0 |
| 1 | A03 | a03 | `de7776f5` | 264 | 82 | 14 | 2 | 10560 | 9638 | 91.3 % | 46 | 0 | 16 |
| 2 | G3 V2 | g3v2 | `caf5b2df` | 229 | 88 | 15 | 4 | 9160 | 8101 | 88.4 % | 45 | 2 | 10 |

Dimensions visibles au chargement (grille active, viewport 1600 × 1000) : table 40 lignes × 323 colonnes, 40 × 24 rendues ; débordement vertical 133 px, horizontal 19564 px.

## Conditions

- Date : 2026-11-20T15:44:46.895Z
- Mode : nouveau headless
- Commande : `bun harnais/serie.ts --headless --fumee --court --jeu perf --structures a01,a03,g3v2 --composite --grille g3v2 --participants 40 --configs base,principal --bridage 1 --scenarios saisie-rapide,changement-participant,changement-axe-vue,defilement --lru-balayage 10,50`
- Options : `{"bridage":1,"runs":1,"chauffe":0,"configs":["base","principal"],"scenarios":["saisie-rapide","changement-participant","changement-axe-vue","defilement","mesures"],"court":true,"viewport":{"width":1600,"height":1000},"lru":50,"lruBalayage":[10,50],"jeu":"perf","structures":["a01","a03","g3v2"],"participants":40,"remplissage":"fin","graine":1,"grille":2}`
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

- Série à ×1 : aucun bridage, aucun ralentissement attendu ; les ratios ne s'appliquent pas. Durées de référence relevées pour comparaison.
- Touche Playwright → entrée Event Timing : oui ; INP rapporté par web-vitals : oui
- Durées du calcul de calibration (ms) : page ×1 45.7, worker ×1 45.5
- Résultat : réussie
- Comparaison fenêtre visible / nouveau headless : non faite dans cette série (`--comparer-modes`).

## Critères : configurations × scénarios

Jugés sur le pire run valide : zéro longtask > 50 ms, INP < 100 ms, latence de recalcul p95 < 100 ms (saisies), zéro LoAF (défilement). Cellule : statut, p95 et INP en ms (médiane/pire run), longtasks du pire run. Un run invalide (erreur, erreur de page, délai de stabilité dépassé, scénario incomplet, mesure manquante, sources différentes) est exclu des agrégats : la cellule devient « incomplet » si aucun run valide n'échoue. « non applicable » : le scénario n'a rien pu exercer (défilement sans débordement).

| Configuration | saisie-rapide | changement-participant | changement-axe-vue | defilement |
| --- | --- | --- | --- | --- |
| base | ❌ · p95 185/185 · INP 32/32 · LT 0 | ✅ · INP 24/24 · LT 0 | ✅ · INP 48/48 · LT 0 | ✅ · INP —/— · LT 0 · LoAF 0 |
| principal | ❌ · p95 212/212 · INP 32/32 · LT 0 | ✅ · INP 24/24 · LT 0 | ❌ · INP 40/40 · LT 1 | ✅ · INP —/— · LT 0 · LoAF 0 |

Motifs :

- base / saisie-rapide (échec) : p95 185 ms
- principal / saisie-rapide (échec) : p95 212 ms
- principal / changement-axe-vue (échec) : 1 longtask(s)

## Opérations exécutées et cadence

Par configuration et scénario, sur les runs valides hors chauffe : opérations exécutées / prévues (pire run), durée, et pour la saisie rapide la cadence obtenue (visée : une validation toutes les 200 ms). Un pilote plus lent que la cadence visée se voit ici, pas dans les critères.

| Configuration | Scénario | runs valides | opérations (pire run) | durée médiane (s) | intervalle moyen médian / pire (ms) | validations en retard (pire) | retard max (ms) | détails | non applicable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| base | saisie-rapide | 1 | 20/20 | 4.0 | 200 / 200 | 0 | 0 | validations 20 | — |
| base | changement-participant | 1 | 6/6 | 2.2 | — | — | — | — | — |
| base | changement-axe-vue | 1 | 7/7 | 1.9 | — | — | — | axes 4 | — |
| base | defilement | 1 | 2/2 | 3.1 | — | — | — | — | — |
| base | mesures | 1 | 4/4 | 0.6 | — | — | — | — | — |
| principal | saisie-rapide | 1 | 20/20 | 4.0 | 200 / 200 | 0 | 0 | validations 20 | — |
| principal | changement-participant | 1 | 6/6 | 2.1 | — | — | — | — | — |
| principal | changement-axe-vue | 1 | 7/7 | 1.8 | — | — | — | axes 4 | — |
| principal | defilement | 1 | 2/2 | 3.1 | — | — | — | — | — |
| principal | mesures | 1 | 4/4 | 0.6 | — | — | — | — | — |

## Navigation avec et sans instanciation

Une action « avec instanciation » a créé au moins une instance de participant pendant le choix du participant (observé, pas supposé). Cellule : nombre d'actions · médiane / pire (ms). « non mesurée » : aucune action de cette catégorie, par exemple quand toute la cohorte tient dans le cache ; ce n'est pas une réussite.

| Configuration | Scénario | action | sans instanciation | avec instanciation |
| --- | --- | --- | --- | --- |
| base | changement-participant | participant | 6 · 38 / 77 | non mesurée |
| principal | changement-participant | participant | 6 · 21 / 62 | non mesurée |

### Changement d'axe et de vue

| Configuration | type | n | médiane (ms) | pire (ms) |
| --- | --- | --- | --- | --- |
| base | axe | 3 | 59 | 74 |
| base | vue | 4 | 49 | 66 |
| principal | axe | 3 | 43 | 65 |
| principal | vue | 4 | 32 | 49 |

## Défilement : déplacement effectif

Par run : débordement possible et plus grand déplacement obtenu (px). Un axe sans débordement est « non applicable » ; un débordement sans déplacement invalide le run.

| Run | Configuration | axe | débordement | déplacement | événements molette | statut |
| --- | --- | --- | --- | --- | --- | --- |
| 7 | base | vertical | 133 | 133 | 46 | mesuré |
| 7 | base | horizontal | 19564 | 3100 | 31 | mesuré |
| 8 | principal | vertical | 133 | 133 | 45 | mesuré |
| 8 | principal | horizontal | 19564 | 3100 | 31 | mesuré |

## Latence décomposée (saisie rapide)

Médiane des écarts entre étapes successives (ms), runs valides, marques des deux threads ramenées à l'horloge de la page par `performance.timeOrigin`. `calcul` : début et fin du calcul (worker ou thread principal). Les médianes des étapes ne s'additionnent pas pour reconstituer une latence.

| Configuration | saisies | sans latence | evenement → validation | validation → ecriture | ecriture → subscribeChanges | subscribeChanges → envoi | envoi → workerReception | workerReception → workerEnvoi | workerEnvoi → retour | retour → commit | commit → peinture | calcul | total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| base | 20 | 0 | 0.1 | 0.0 | 0.2 | 0.0 | 0.2 | 0.1 | 14.5 | 0.7 | 15.5 | 0.1 | 30.4 |
| principal | 20 | 0 | 0.1 | 0.0 | 0.2 | — | — | — | — | 4.0 (depuis subscribeChanges) | 10.7 | 0.3 | 14.6 |

## Mesures sans critère

### Démarrage par phases (médiane des runs valides, ms)

| Configuration | structures | extension | compile | generation | insertion | somme | worker-pret | table-peinte |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| base | 0 | — | 8 | 10 | 31 | 6 | 206 | 243 |
| principal | 0 | — | 8 | 9 | 29 | 6 | — | 183 |

`worker-pret` et `table-peinte` : instants depuis le début de la navigation ; les autres : durées. `extension` n'existe que pour le jeu de charge.

### Mémoire par cible (Mo, après GC, médiane des runs valides)

Tas JS utilisé + stockage des ArrayBuffer (`Runtime.getHeapUsage` : `usedSize + backingStorageSize`).

| Configuration | page chargement | worker chargement | page LRU plein | worker LRU plein | page fin | worker fin |
| --- | --- | --- | --- | --- | --- | --- |
| base | 13.8 | 3.4 | 14.6 | 3.5 | 16.0 | 4.0 |
| principal | 13.9 | — | 14.7 | — | 18.0 | — |

### Écritures en série, copies de grille, bascule du modèle

Sur la grille active. `copie-grille` : copie à l'identique ; `copie-grille-provenance` : copie vers la structure du corpus qui en provient (G3 V1 → V2), seulement si elle existe.

| Configuration | Mesure | valeurs | garde-fou 50 ms |
| --- | --- | --- | --- |
| base | remplissage-lru | lignes 40, lruDebut 40, lruFin 40, instanciations 0, instanciationMs 0, instanciationMsParParticipant null | ok |
| base | ecritures-en-serie | grille 2, nombre 100, totalMs 487.8, medianeMs 0.2, p95Ms 0.6, maxMs 1.3 | ok |
| base | copie-grille | grille 3, cible "copie à l'identique", cases 8109, principalMs 41.9, totalMs 49.5 | ok |
| base | bascule-modele | principalMs 5.2, totalMs 25.4 | ok |
| principal | remplissage-lru | lignes 40, lruDebut 40, lruFin 40, instanciations 0, instanciationMs 0, instanciationMsParParticipant null | ok |
| principal | ecritures-en-serie | grille 2, nombre 100, totalMs 460.1, medianeMs 0.3, p95Ms 0.9, maxMs 2 | ok |
| principal | copie-grille | grille 3, cible "copie à l'identique", cases 8109, principalMs 43.1, totalMs 45.3 | ok |
| principal | bascule-modele | principalMs 7.8, totalMs 23.8 | ok |

## Balayage du N du LRU (configuration de base)

Valeurs testées : 10, 50 ; effectif 40. Hors LRU : action pendant laquelle le worker a créé au moins une instance (observé). Si P ≤ N, toute la cohorte de la grille active tient dans le cache : la catégorie hors LRU n'est pas observée, elle est « non mesurée ». Mémoire par participant : écart de tas du worker (chargement → LRU plein) divisé par les instances entrées dans le LRU pendant le remplissage ; « — » si le LRU était déjà plein au chargement.

| N | changement de participant | runs invalides | P ≤ N | actions dans / hors LRU | latence hors LRU, médiane (ms) | tas worker LRU plein (Mo) | mémoire worker par participant (Ko) | instanciation par participant (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | ✅ | 0 | non | 2 / 4 | 36 | 2.7 | — | — |
| 50 | ✅ | 0 | oui | 6 / non mesurée | — | 3.5 | — | — |

Plus petit N dont tous les runs « Changement de participant » sont valides et passent : 10.

## Runs

14 runs dont 0 invalide(s), JSON brut dans `runs/` (non versionné).
