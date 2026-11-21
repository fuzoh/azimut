# Série de mesures 2026-11-20T15-39-34-perf-a03-p20-fin-s1-x1-fumee-headless

> **Validation du harnais, pas un verdict de performance du produit.** Cette série vérifie que le harnais pilote la session et produit ses mesures ; ses chiffres ne jugent ni le moteur ni les critères.

> **Série en nouveau headless : ses chiffres ne comptent pas.** Les critères se jugent en fenêtre visible (spec 20, « Conditions »).

> Série de fumée : 1 run par scénario et par configuration, sans run de chauffe.

> Déroulés raccourcis (`--court`) : moins d'opérations que le protocole.

> Population : **taille réelle**, profil `perf-a03-p20-fin-s1`, bridage ×1, instrumentation « mesure ». Les verdicts ci-dessous valent pour cette population seule : ils ne se combinent ni avec une autre catégorie (taille réelle, composite synthétique, charge historique), ni avec un autre taux, et chaque configuration est jugée à part.

## Profil de données

- Identifiant : `perf-a03-p20-fin-s1` (taille réelle)
- Jeu : perf ; structures : a03, non étendues
- Effectif total : 20 participants générés (demandé : 20) ; remplissage « fin » ; graine 1
- Grille active : 0 (A03)
- Somme de contrôle des sources : `cases 4914:3607ed6c3a9477bc / nonEvaluations 23:62827e3790981369 / jokers 7:304edbca51a5b1b2`
- URL (configuration de base) : `http://localhost:4173/?jeu=perf&remplissage=fin&graine=1&participants=20&structures=a03&verif=0&simu=0&calcul=signaux&lieu=worker&cohorte=paresseux&distante=perimee&lru=50`

Cohorte synthétique : la distribution des notes vient du générateur, elle n'est pas une observation de cours réels.

| g | Grille | structure | empreinte | données (D) | calculs | regroupements | axes | cases possibles | cases stockées | remplissage observé | non-évaluations | dispenses | jokers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | A03 | a03 | `de7776f5` | 264 | 82 | 14 | 2 | 5280 | 4914 | 93.1 % | 23 | 0 | 7 |

Dimensions visibles au chargement (grille active, viewport 1600 × 1000) : table 20 lignes × 301 colonnes, 20 × 24 rendues ; débordement vertical 0 px, horizontal 18156 px.

## Conditions

- Date : 2026-11-20T15:39:34.511Z
- Mode : nouveau headless
- Commande : `bun harnais/serie.ts --headless --fumee --court --sans-build --jeu perf --structures a03 --participants 20 --configs base,principal --bridage 1 --sans-lru`
- Options : `{"bridage":1,"runs":1,"chauffe":0,"configs":["base","principal"],"scenarios":["saisie-rapide","saisies-distantes","changement-participant","changement-axe-vue","defilement","ouverture-graphe","mesures"],"court":true,"viewport":{"width":1600,"height":1000},"lru":50,"lruBalayage":null,"jeu":"perf","structures":["a03"],"participants":20,"remplissage":"fin","graine":1,"grille":0}`
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
- Durées du calcul de calibration (ms) : page ×1 46.0, worker ×1 45.4
- Résultat : réussie
- Comparaison fenêtre visible / nouveau headless : non faite dans cette série (`--comparer-modes`).

## Critères : configurations × scénarios

Jugés sur le pire run valide : zéro longtask > 50 ms, INP < 100 ms, latence de recalcul p95 < 100 ms (saisies), zéro LoAF (défilement). Cellule : statut, p95 et INP en ms (médiane/pire run), longtasks du pire run. Un run invalide (erreur, erreur de page, délai de stabilité dépassé, scénario incomplet, mesure manquante, sources différentes) est exclu des agrégats : la cellule devient « incomplet » si aucun run valide n'échoue. « non applicable » : le scénario n'a rien pu exercer (défilement sans débordement).

| Configuration | saisie-rapide | saisies-distantes | changement-participant | changement-axe-vue | defilement | ouverture-graphe |
| --- | --- | --- | --- | --- | --- | --- |
| base | ❌ · p95 200/200 · INP 32/32 · LT 0 | ❌ · p95 190/190 · INP 32/32 · LT 0 | ✅ · INP 24/24 · LT 0 | ✅ · INP 32/32 · LT 0 | ✅ · INP —/— · LT 0 · LoAF 0 | ✅ · INP 40/40 · LT 0 |
| principal | ❌ · p95 185/185 · INP 32/32 · LT 0 | ❌ · p95 193/193 · INP 24/24 · LT 0 | ✅ · INP 24/24 · LT 0 | ✅ · INP 32/32 · LT 0 | ✅ · INP —/— · LT 0 · LoAF 0 | ✅ · INP 32/32 · LT 0 |

Motifs :

- base / saisie-rapide (échec) : p95 200 ms
- principal / saisie-rapide (échec) : p95 185 ms
- base / saisies-distantes (échec) : p95 190 ms
- principal / saisies-distantes (échec) : p95 193 ms

## Opérations exécutées et cadence

Par configuration et scénario, sur les runs valides hors chauffe : opérations exécutées / prévues (pire run), durée, et pour la saisie rapide la cadence obtenue (visée : une validation toutes les 200 ms). Un pilote plus lent que la cadence visée se voit ici, pas dans les critères.

| Configuration | Scénario | runs valides | opérations (pire run) | durée médiane (s) | intervalle moyen médian / pire (ms) | validations en retard (pire) | retard max (ms) | détails | non applicable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| base | saisie-rapide | 1 | 20/20 | 4.0 | 200 / 200 | 0 | 0 | validations 20 | — |
| base | saisies-distantes | 1 | 20/20 | 4.0 | 200 / 200 | 0 | 0 | validations 20, saisiesDistantes 20 | — |
| base | changement-participant | 1 | 6/6 | 2.1 | — | — | — | — | — |
| base | changement-axe-vue | 1 | 7/7 | 1.8 | — | — | — | axes 2 | — |
| base | defilement | 1 | 2/2 | 3.1 | — | — | — | — | — |
| base | ouverture-graphe | 1 | 2/2 | 1.1 | — | — | — | — | — |
| base | mesures | 1 | 4/4 | 0.6 | — | — | — | — | — |
| principal | saisie-rapide | 1 | 20/20 | 4.0 | 200 / 200 | 0 | 0 | validations 20 | — |
| principal | saisies-distantes | 1 | 20/20 | 4.0 | 200 / 200 | 0 | 0 | validations 20, saisiesDistantes 20 | — |
| principal | changement-participant | 1 | 6/6 | 2.0 | — | — | — | — | — |
| principal | changement-axe-vue | 1 | 7/7 | 1.7 | — | — | — | axes 2 | — |
| principal | defilement | 1 | 2/2 | 3.0 | — | — | — | — | — |
| principal | ouverture-graphe | 1 | 2/2 | 1.0 | — | — | — | — | — |
| principal | mesures | 1 | 4/4 | 0.5 | — | — | — | — | — |

## Navigation avec et sans instanciation

Une action « avec instanciation » a créé au moins une instance de participant pendant le choix du participant (observé, pas supposé). Cellule : nombre d'actions · médiane / pire (ms). « non mesurée » : aucune action de cette catégorie, par exemple quand toute la cohorte tient dans le cache ; ce n'est pas une réussite.

| Configuration | Scénario | action | sans instanciation | avec instanciation |
| --- | --- | --- | --- | --- |
| base | changement-participant | participant | 6 · 34 / 48 | non mesurée |
| base | ouverture-graphe | graphe | 2 · 47 / 48 | non mesurée |
| principal | changement-participant | participant | 6 · 20 / 33 | non mesurée |
| principal | ouverture-graphe | graphe | 2 · 29 / 31 | non mesurée |

### Changement d'axe et de vue

| Configuration | type | n | médiane (ms) | pire (ms) |
| --- | --- | --- | --- | --- |
| base | axe | 3 | 38 | 47 |
| base | vue | 4 | 47 | 49 |
| principal | axe | 3 | 25 | 32 |
| principal | vue | 4 | 32 | 33 |

## Défilement : déplacement effectif

Par run : débordement possible et plus grand déplacement obtenu (px). Un axe sans débordement est « non applicable » ; un débordement sans déplacement invalide le run.

| Run | Configuration | axe | débordement | déplacement | événements molette | statut |
| --- | --- | --- | --- | --- | --- | --- |
| 9 | base | vertical | 0 | 0 | 46 | non applicable |
| 9 | base | horizontal | 18156 | 3400 | 34 | mesuré |
| 10 | principal | vertical | 0 | 0 | 46 | non applicable |
| 10 | principal | horizontal | 18156 | 4200 | 42 | mesuré |

## Latence décomposée (saisie rapide)

Médiane des écarts entre étapes successives (ms), runs valides, marques des deux threads ramenées à l'horloge de la page par `performance.timeOrigin`. `calcul` : début et fin du calcul (worker ou thread principal). Les médianes des étapes ne s'additionnent pas pour reconstituer une latence.

| Configuration | saisies | sans latence | evenement → validation | validation → ecriture | ecriture → subscribeChanges | subscribeChanges → envoi | envoi → workerReception | workerReception → workerEnvoi | workerEnvoi → retour | retour → commit | commit → peinture | calcul | total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| base | 20 | 0 | 0.1 | 0.0 | 0.2 | 0.0 | 0.1 | 0.1 (depuis envoi) | 15.0 | 0.8 | 12.1 | 0.2 | 31.1 |
| principal | 20 | 0 | 0.1 | 0.0 | 0.2 | — | — | — | — | 3.7 (depuis subscribeChanges) | 9.5 | 0.3 | 14.5 |

## Mesures sans critère

### Démarrage par phases (médiane des runs valides, ms)

| Configuration | structures | extension | compile | generation | insertion | somme | worker-pret | table-peinte |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| base | 0 | — | 4 | 3 | 9 | 2 | 134 | 160 |
| principal | 0 | — | 4 | 3 | 9 | 2 | — | 121 |

`worker-pret` et `table-peinte` : instants depuis le début de la navigation ; les autres : durées. `extension` n'existe que pour le jeu de charge.

### Mémoire par cible (Mo, après GC, médiane des runs valides)

Tas JS utilisé + stockage des ArrayBuffer (`Runtime.getHeapUsage` : `usedSize + backingStorageSize`).

| Configuration | page chargement | worker chargement | page LRU plein | worker LRU plein | page fin | worker fin |
| --- | --- | --- | --- | --- | --- | --- |
| base | 8.1 | 3.5 | 8.8 | 3.6 | 9.9 | 3.7 |
| principal | 8.9 | — | 9.6 | — | 11.5 | — |

### Écritures en série, copies de grille, bascule du modèle

Sur la grille active. `copie-grille` : copie à l'identique ; `copie-grille-provenance` : copie vers la structure du corpus qui en provient (G3 V1 → V2), seulement si elle existe.

| Configuration | Mesure | valeurs | garde-fou 50 ms |
| --- | --- | --- | --- |
| base | remplissage-lru | lignes 20, lruDebut 20, lruFin 20, instanciations 0, instanciationMs 0, instanciationMsParParticipant null | ok |
| base | ecritures-en-serie | grille 0, nombre 100, totalMs 467.9, medianeMs 0.2, p95Ms 0.6, maxMs 1.3 | ok |
| base | copie-grille | grille 1, cible "copie à l'identique", cases 4925, principalMs 31.5, totalMs 42.9 | ok |
| base | bascule-modele | principalMs 2.8, totalMs 19.6 | ok |
| principal | remplissage-lru | lignes 20, lruDebut 20, lruFin 20, instanciations 0, instanciationMs 0, instanciationMsParParticipant null | ok |
| principal | ecritures-en-serie | grille 0, nombre 100, totalMs 444.2, medianeMs 0.3, p95Ms 0.7, maxMs 1.3 | ok |
| principal | copie-grille | grille 1, cible "copie à l'identique", cases 4925, principalMs 28.3, totalMs 42.7 | ok |
| principal | bascule-modele | principalMs 5.3, totalMs 16.2 | ok |
## Runs

14 runs dont 0 invalide(s), JSON brut dans `runs/` (non versionné).
