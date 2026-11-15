# 21 — Constats du prototype

**Statut : provisoire.** Ce document reprend la synthèse de la campagne du 7 octobre 2026, publiée dans la [campagne de mesures](https://github.com/fuzoh/azimut/issues/27). Il ne clôt aucun critère de ce ticket : les sections marquées « à faire » ne sont pas encore renseignées, et aucun choix de variante n'est arrêté.

La spec du prototype est dans [20](20-spec-prototype.md). Ce document est celui qui survit au prototype.

## État des critères

| Critère (ticket de la campagne) | État |
| --- | --- |
| Rapport de la série dans `prototype/mesures/`, calibration réussie | fait |
| Réussite ou échec des trois critères par configuration | fait, sur le jeu « charge » uniquement |
| N du LRU retenu | aucun N ne passe |
| Mesures sans critère et dépassements du garde-fou | fait |
| Constats sur 1a, 1b, 1c, H4 et H5 | à faire |
| Tenue du modèle et couverture des cas | à faire |
| Algorithmes à garder (compile, oracle, variante retenue) | à faire |

## Campagne du 7 octobre 2026

Rapport : [`prototype/mesures/2026-10-07T14-29-50-serie/rapport.md`](../../prototype/mesures/2026-10-07T14-29-50-serie/rapport.md) ; données agrégées dans `serie.json`, même répertoire. Commit mesuré : `e5ca4d8`.

### Conditions et lecture

- Jeu `charge`, remplissage `fin`, graine 1, fenêtre visible 1600 × 1000, secteur, Ryzen AI MAX+ 395, 62 Go de RAM.
- 5 configurations, chauffe + 5 runs mesurés ; 246 runs au total, balayage LRU et mesures complémentaires compris. Aucune erreur de run enregistrée.
- Calibration réussie : ralentissement principal ×4,13. Le bridage de la page ne ralentit pas le worker (×0,99) ; le worker est donc bridé par logiciel, calibré à ×4,02. Ce bridage reste une approximation. La comparaison visible/headless n'a pas été faite dans cette série.
- Critères : zéro tâche principale > 50 ms, INP < 100 ms, latence de recalcul p95 < 100 ms pour les saisies, zéro LoAF pour le défilement. Jugement sur le pire run.
- `p95 771/839` se lit : médiane des p95 des cinq runs / pire p95. L'INP mesure la réponse visuelle à l'interaction ; la latence instrumentée suit la saisie jusqu'à la peinture après mise à jour des résultats. Ce ne sont pas les mêmes durées.

### Résultats

**Les 30 combinaisons configuration × scénario échouent aux critères.** Cela établit un échec à l'échelle de charge prescrite par la spec, pas un échec démontré sur des grilles ordinaires.

Pour la configuration de base :

| Opération | Mesure |
| --- | --- |
| Saisie rapide | p95 médian/pire : 771/839 ms ; INP 144/160 ms |
| Saisie avec changements distants | p95 341/379 ms ; INP 136/152 ms |
| Changement de participant | médiane 487 ms hors cache, 113 ms en cache |
| Changement d'axe / vue | médianes 303/302 ms |
| Ouverture du graphe | médiane 347 ms, avec ou sans cache |
| Défilement | jusqu'à 32 LoAF et 58 tâches longues |

La décomposition de la saisie rapide donne un calcul médian natif de **0,2 ms**, environ **0,8 ms** autour du traitement worker avec bridage, puis environ **72 ms** autour du retour vers la page, **32 ms** jusqu'au commit et **34 ms** jusqu'à la peinture instrumentée. La latence totale médiane est de 130 ms, avec une forte queue lente.

Cela oriente l'investigation vers l'ordonnancement, le traitement des résultats et l'UI. Ce n'est pas une attribution causale précise : les 72 ms ne sont pas un coût pur de transfert, et les médianes des étapes ne s'additionnent pas. Une saisie de base sur 500 n'a pas de latence complète. Le meilleur p95 avec changements distants n'établit pas que le trafic distant accélère l'application.

### Comparaison des variantes

- **DAG** : calcul et mémoire worker réduits, sans amélioration cohérente de la réactivité globale.
- **Principal** : p95 médian de saisie rapide abaissé à 549 ms, mais INP médian axe/vue dégradé de 200 à 376 ms, et graphe de 264 à 408 ms. Achèvement plus rapide et disponibilité de l'interface sont deux propriétés différentes.
- **Précalcul** : 145/150 changements de participant classés en cache, contre 75/150 pour la base ; médiane en cache 131 ms. Mémoire worker accrue (~24 Mo). Aucun scénario ne passe.
- **Immédiat** : pas de bénéfice global clair.

**Aucun N du LRU ne passe.** N = 10/50/200 donnent respectivement ~13/17/32 Mo de tas worker plein et 136/489/531 ms de latence médiane hors cache. L'instanciation par participant ne coûte que ~0,24–0,26 ms après correction du bridage. L'inversion des latences selon N mérite investigation ; elle ne suffit pas à recommander le plus petit cache.

### Mesures sans critère

- **Copie de grille, 263 265 cases copiées : blocage continu du thread principal de ~11–12,5 s dans toutes les configurations.** Achèvement total ~18–19 s avec worker, ~12 s sur le principal. C'est le dépassement le plus sévère.
- Démarrage : table peinte vers 6 s avec worker, 5,1 s sur le principal ; insertion initiale ~3,4 s.
- Écritures individuelles : p95 ~0,8–1,7 ms, garde-fou satisfait. Le total de plusieurs secondes pour 1 000 écritures couvre une séquence plus large.
- Remplissage du LRU : tâches longues jusqu'à ~184 ms ; constat bloquant.
- Bascule du modèle : tâches longues jusqu'à ~283 ms ; exception explicitement non bloquante dans la spec.
- Mémoire : page ~158–168 Mo ; worker ~14–24 Mo dans la comparaison principale. La page domine.

## Écart de taille avec les grilles réelles

Comptage des structures exécutables présentes dans le dépôt :

| Grille | Nœuds de données par participant | Nœuds de calcul |
| --- | ---: | ---: |
| A01 | 156 | 83 |
| A03 | 264 | 82 |
| G3 V2 non étendue | 242 | 88 |
| Une grille du jeu de charge | 1 556 | 473 |

Le jeu de charge représente **933 600 cases possibles** (200 × 1 556 × 3), vides comprises. Les grilles réelles ont environ 6 à 10 fois moins de champs. Les 263 265 cases de la mesure de copie ne sont pas le nombre de cases possibles de toute la session.

Avec 250 champs et 3 grilles, des cohortes illustratives de 30/50/200 participants représentent 22 500/37 500/150 000 cases possibles, soit environ 42/25/6,2 fois moins. **30 et 50 sont des hypothèses de travail, pas des tailles usuelles établies par les docs.**

## Extrapolation indicative, non mesurée

À densité de remplissage similaire, sous hypothèse de coût proportionnel au volume, puis de travail dominé par le CPU pour la colonne sans bridage :

| Opération | Charge mesurée à ×4 | 30 participants × 250 champs, à ×4 | Même volume, machine de mesure sans bridage |
| --- | ---: | ---: | ---: |
| Insertion initiale, 3 grilles | 3,38 s | ~81 ms | ~20 ms |
| Travail principal de copie, 1 grille | ~11,5 s | ~277 ms | ~69 ms |

Pour la copie, les mêmes hypothèses donnent ~460/115 ms à 50 participants et ~1 850/460 ms à 200 participants (bridé/non bridé).

**Ces chiffres sont des calculs conditionnels, pas des prédictions validées ni des bornes.** Ils ignorent les coûts fixes et les non-linéarités. Le code de copie comporte des recherches de nœuds par parcours : une proportionnalité parfaite n'est pas acquise. La mémoire liée aux données devrait baisser, mais tout le tas JS ne se divise pas par le ratio de volume.

Le ×4 est relatif au Ryzen de cette campagne : enlever le bridage n'équivaut pas à simuler un « ordinateur normal ». Il faut choisir une machine cible représentative.

Pour la saisie, la navigation et le défilement, **on ne peut pas diviser les latences par le ratio de cases puis par quatre** : la table virtualise déjà lignes et colonnes, et le nombre de cellules visibles peut rester similaire. Commits UI, attente des frames et ordonnancement ne suivent pas nécessairement le volume ni la fréquence CPU.

## Conclusion de portée

Chargement, mémoire et copie devraient bénéficier fortement des tailles réelles. Une interaction sous 100 ms est plausible, mais non démontrée. Le calcul natif déjà très court est cohérent avec la [recherche sur les signaux](../research/signaux.md) ; les coûts de stockage et de propagation sur le thread principal restent pertinents au regard de la [recherche sur le stockage local](../research/stockage-local.md). **Aucun choix définitif de variante n'est justifié par cette série seule.**

## Suite

1. Mesurer la base sur les structures réelles du corpus avec un effectif explicitement choisi, à ×1 et ×4, en gardant viewport, remplissage et scénarios comparables. Ces mesures complètent le verdict de charge sans le remplacer. C'est l'objet du [harnais de performance sur cohortes de 20/40 participants](https://github.com/fuzoh/azimut/issues/28).
2. Sur des runs diagnostiques séparés, attribuer les tâches longues et les attentes autour du retour worker, puis examiner copie et rendu. Ne pas choisir le moteur uniquement sur le p95 de saisie.

## À faire

### Points 1a, 1b, 1c, H4 et H5 de 19

Essai des commutateurs sur le jeu « corpus », pour trancher en voyant ([19](19-constats-maquette.md)). Non consigné.

### Tenue du modèle et couverture des cas

Non consigné.

### Algorithmes à garder

`compile`, l'oracle et la variante retenue sont à décrire ici avant de jeter le prototype. Non consigné.
