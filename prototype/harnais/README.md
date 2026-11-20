# Harnais de mesure du prototype

Le harnais pilote l'app dans Chrome avec Playwright, joue les scénarios de la [spec 20](../../docs/analyse/20-spec-prototype.md) (« Scénarios de performance ») et écrit un rapport par série dans `prototype/mesures/`. Le [ticket #28](https://github.com/fuzoh/azimut/issues/28) y ajoute des profils de données de taille réelle, des scénarios qui tiennent sur de petites cohortes et des rapports qui séparent les populations.

Les effectifs 12, 20, 40 ou 200 sont des **hypothèses de travail configurables**, pas des tailles de cours établies. Les cohortes sont synthétiques : la distribution des notes vient du générateur.

## Lancer une série

Depuis `prototype/` :

```sh
bun run mesure -- <options>          # une série par taux de bridage demandé
bun run mesure:historique            # référence historique (recette 5)
bun run mesure:fumee                 # série de fumée sur le jeu de charge
```

Une série = un profil de données × un taux de bridage. Elle comprend : build de production (`vite build`, sauf `--sans-build`), `vite preview`, lecture du profil sur une page à part, calibration, puis les runs, chacun sur une page neuve, configurations alternées run par run, chauffe puis runs mesurés.

**Affichage.** Les critères se jugent en fenêtre visible (spec 20, « Conditions »). Sans `DISPLAY` ni `WAYLAND_DISPLAY`, le harnais refuse de partir. `--headless` lance le nouveau headless de Chrome : utile pour valider le harnais, **ses chiffres ne valent pas campagne** et le rapport le dit en tête.

## Options

| Option | Défaut | Rôle |
| --- | --- | --- |
| `--jeu charge\|perf` | `charge` | `charge` : 3 × G3 étendue (référence historique). `perf` : structures du corpus non étendues. Le jeu `corpus` (validation) est refusé. |
| `--structures a01,a03,g3v1,g3v2` | requis avec `perf` | Structures chargées, ordre canonique. Refusé avec `charge`. |
| `--composite` | non | Obligatoire dès deux structures : la session est alors « composite synthétique ». G3 V1 et V2 ensemble ne se chargent qu'ainsi, comme scénario explicite (sources générées indépendamment, pas une copie). |
| `--participants P` | 200 (`charge`), 20 (`perf`) | Effectif **total** exact, de 1 à 1024. Aucun participant type n'est ajouté. |
| `--remplissage debut\|milieu\|fin` | `fin` | Profil de remplissage du générateur. |
| `--graine N` | 1 | Graine du générateur (même graine sur la page et dans le worker). |
| `--grille i\|structure` | 0 | Grille active : index, ou nom d'une structure chargée (`--grille g3v2`). Les scénarios et les mesures portent sur elle. |
| `--bridage 4` ou `1,4` | `4` | Taux de bridage CPU ; une série (dossier, calibration, rapport) par taux. |
| `--configs base,dag,…` | les cinq | Configurations du store : `base`, `dag`, `principal`, `precalcul`, `immediat`. |
| `--scenarios …` | les six | `saisie-rapide`, `saisies-distantes`, `changement-participant`, `changement-axe-vue`, `defilement`, `ouverture-graphe` ; `mesures` (sans critère) est ajouté sauf `--sans-mesures`. |
| `--runs 5`, `--chauffe 1` | 5 et 1 (fumée : 1 et 0) | Runs mesurés et de chauffe par scénario et configuration. |
| `--lru 50` | 50 | N du LRU des runs ordinaires. |
| `--lru-balayage 10,50,200` | `10,50,200` | Valeurs du balayage du N (configuration de base) ; `--sans-lru` le supprime. |
| `--fumee`, `--court` | non | Fumée : 1 run, sans chauffe. Court : déroulés raccourcis. Les deux marquent le rapport « validation du harnais ». |
| `--headless`, `--navigateur`, `--canal`, `--port`, `--comparer-modes`, `--sans-build` | | Comme avant #28. |

Les arguments sont validés avant tout lancement : option ou choix inconnus, doublons, listes vides, effectif hors bornes, grille inexistante et série vide sont refusés, avec la liste de tous les problèmes. Les mêmes réglages existent dans l'URL de l'app (`jeu=perf&structures=a03&participants=20&grille=0`).

## Recettes

Chaque recette est une suite de commandes à lancer à la demande ; rien ne lance le produit cartésien complet. Les recettes 1 et 3 sont les plus utiles ; les autres sont facultatives.

**1. Taille réelle.** Base, A03 non étendue, P = 20 puis 40, remplissage `milieu` puis `fin`, ×1 et ×4, six scénarios et mesures complémentaires :

```sh
for P in 20 40; do for R in milieu fin; do
  bun run mesure -- --jeu perf --structures a03 --participants $P --remplissage $R --configs base --bridage 1,4
done; done
```

**2. Couverture des structures.** A01 et G3 non étendues, base, P = 20, `fin`, ×1 et ×4. G3 V1 fait aussi la copie V1 → V2 (mesure `copie-grille-provenance`) ; G3 V2 sert aux axes multiples :

```sh
for S in a01 g3v1 g3v2; do
  bun run mesure -- --jeu perf --structures $S --participants 20 --remplissage fin --configs base --bridage 1,4
done
```

**3. Comparaison technique.** Même profil A03 / P = 40 / `fin`, cinq configurations, ×1 et ×4 ; répéter en changeant `--structures` ou `--participants` :

```sh
bun run mesure -- --jeu perf --structures a03 --participants 40 --remplissage fin --bridage 1,4
```

**4. Sensibilité au volume.** P = 200 sur des structures non étendues ; la session composite A01 + A03 + G3 V2 est à part et nommée synthétique :

```sh
for S in a01 a03 g3v2; do
  bun run mesure -- --jeu perf --structures $S --participants 200 --remplissage fin --configs base --bridage 4
done
bun run mesure -- --jeu perf --structures a01,a03,g3v2 --composite --participants 200 --remplissage fin --configs base --bridage 4
```

**5. Référence historique.** Jeu `charge`, P = 200, `fin`, graine 1, ×4, cinq configurations, mêmes URL de run que la série du 7 octobre :

```sh
bun run mesure:historique
# équivaut à : bun run mesure -- --jeu charge --participants 200 --remplissage fin --graine 1 --bridage 4
```

Le diagnostic ciblé (traces Chromium, compteurs, phases de la copie) relève d'un ticket suivant.

## Sorties

Chaque série écrit dans un dossier neuf `prototype/mesures/<horodatage>-<profil>-x<taux>[-fumee][-headless]/` : `serie.json`, `rapport.md` et le JSON brut par run dans `runs/` (non versionné). Le harnais refuse d'écrire dans un dossier existant : les artefacts du 7 octobre ne peuvent pas être écrasés.

L'identifiant de profil résume ce qui fixe les sources : `perf-a03-p20-fin-s1`, `perf-composite-a01+a03+g3v2-p200-fin-s1`, `charge-p200-fin-s1` (suffixe `-g<i>` si la grille active n'est pas la première).

## Lire un rapport

- **Population.** Un rapport porte sur une seule population : catégorie (taille réelle, composite synthétique, charge historique), profil, taux de bridage, instrumentation « mesure ». Aucun verdict ne mélange deux populations ; chaque configuration est jugée à part. Deux séries ne se comparent que si le profil, le taux et le protocole concordent.
- **Profil.** Structures et empreintes, effectif, nœuds de données et de calcul par grille, cases possibles et stockées, non-évaluations, dispenses, jokers, remplissage observé, dimensions visibles de la table, somme de contrôle. Un run dont la somme de contrôle diffère de celle du profil est invalide : les sources sont les mêmes d'une configuration à l'autre, et le worker vérifie au démarrage qu'il a les mêmes que la page.
- **Runs invalides.** Une erreur, une erreur de page, un délai de stabilité dépassé, un scénario incomplet, une mesure manquante (validations observées ≠ exécutées), un worker en erreur ou des sources différentes invalident le run. Il est listé avec ses motifs et exclu des agrégats.
- **Statuts d'une cellule.** `✅` réussite (tous les runs valides et conformes, jugés sur le pire run) ; `❌` échec d'au moins un run valide ; `⚠ incomplet` au moins un run invalide sans échec valide ; « non applicable » : rien à exercer (défilement sans débordement) ; « non mesurée » : aucun run valide.
- **Opérations et cadence.** Opérations exécutées / prévues, durée, et pour la saisie rapide l'intervalle moyen obtenu, les validations en retard et le retard maximal : un pilote plus lent que 200 ms par case se voit.
- **Navigation.** Changement de participant et ouverture du graphe séparés selon que l'action a instancié un participant ou non. Une catégorie non observée est « non mesurée » ; le scénario ordinaire ne vide pas le cache pour la provoquer.
- **Défilement.** Débordement et déplacement effectif par axe. Sans débordement, l'axe est « non applicable ».
- **Balayage du LRU.** Valeurs testées, runs invalides, P ≤ N, actions dans et hors LRU. Un N n'est retenu que si tous ses runs sont valides et passent ; s'il n'a observé aucune action hors LRU, le rapport le dit.

## Bridage ×1 et ×4

- À ×1, rien n'est bridé et aucun ralentissement n'est attendu : la calibration relève les durées de référence et vérifie l'entrée Event Timing, sans ratio.
- À ×taux > 1, le ratio du thread principal doit tenir entre 0,75 et 1,25 × taux (×4 : de 3 à 5, critère inchangé).
- Le bridage de la page n'atteint pas le worker dédié, et Chrome refuse `Emulation.setCPUThrottlingRate` sur la cible worker. Le worker est alors bridé par logiciel (`bridageWorker` dans l'URL) : après chaque message et chaque minuterie du moteur, une attente active de (taux − 1) × la durée du traitement. Le ratio obtenu est vérifié à la calibration.
- Limites de ce bridage logiciel : le ramasse-miettes, la sérialisation et le transfert des messages et l'attente en file ne sont pas ralentis ; l'attente compte dans « workerReception → workerEnvoi » et la fenêtre `calcul` reste à vitesse native ; la précision dépend de `performance.now()` dans le worker.
- Le ×4 est relatif à la machine de mesure : enlever le bridage ne simule pas un « ordinateur normal ».

## Changements de protocole depuis la série du 7 octobre

Le profil historique garde ses sources, ses URL de run, ses scénarios et sa cadence. Ce qui change, et peut rendre une série ancienne non comparable telle quelle :

- les runs invalides (erreur de page, délai de stabilité dépassé, scénario incomplet, mesure manquante) sont exclus des agrégats au lieu d'y entrer avec une durée tronquée ; avant, un délai de stabilité dépassé rendait silencieusement l'instant courant ;
- les scénarios lisent la grille active (le jeu de charge reste sur la grille 0) ; les écritures en série portent sur elle ;
- changement de participant : mêmes blocs de 50 lignes dès 100 participants ; en dessous, la cible « hors LRU » alterne entre la dernière ligne et le haut de la table ;
- défilement : déplacement vérifié par axe ;
- les mesures complémentaires ajoutent la copie vers la structure d'origine quand elle existe (G3 V1 → V2), jamais sur le jeu de charge ;
- calibration : ratio accepté proportionnel au taux (identique à ×4) ; pas de ratio à ×1.

## Limites connues

- Sans affichage sur la machine, seul le nouveau headless est possible : validation du harnais seulement.
- Les lignes de la table suivent l'index p des participants générés (0…P−1) : le harnais vise une ligne par son index.
- Le compteur d'instanciation et la taille du LRU couvrent toutes les grilles ; les scénarios n'en affichent qu'une.
- Le mode diagnostic (trace de performance Chromium, compteurs de notifications et de commits, build React de profilage, corrélation des lots par version, phases de la copie) n'existe pas encore : le rapport annonce l'instrumentation « mesure ».
