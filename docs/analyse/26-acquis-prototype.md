# 26 — Acquis du prototype pour la première version

Ce document répond à la question de recherche [`03-research-acquis-prototype.md`](../wayfinder/premiere-version/03-research-acquis-prototype.md) : que nous apporte le prototype du modèle de calcul pour la première version de démonstration ?

> **Statut : constats de recherche (15 novembre 2026).** Ce document ne décide rien. [18 — Décisions définitives](18-decisions-definitives.md) fait foi sur le modèle. La dernière section contient des propositions.

**Sources.** Clone séparé de `fuzoh/azimut`, branche `main`, commit `bd71e51` (15 novembre 2026). Code lu : `prototype/src/noyau/`, `prototype/src/generateur/`, `prototype/src/sources/`, `prototype/src/store/` (en-têtes et interface), `prototype/src/ui/` (survol). Documents lus sur ce commit : `docs/analyse/20-spec-prototype.md`, `docs/analyse/21-constats-prototype.md`, `docs/analyse/corpus-prototype/`, `prototype/mesures/`. Issues #14 à #28 : corps de #27 et #28, commentaires de #15, #16, #18, #20, #26 et #27. PR #31 et #37. Dans la branche de travail : [19](19-constats-maquette.md), `GLOSSARY.md`.

**Commandes lancées** dans le clone : `bun install`, `bun run test`, `bun --bun run test` (fichiers ciblés), `bun run typecheck`. Les chemins `prototype/…` et les documents 20 et 21 cités ici sont ceux de `main` ; ils sont absents de la branche de travail.

Convention : **[V]** = vérifié en lisant le code ou en lançant une commande ; **[D]** = déduit, à confirmer.

## TL;DR

- **Le code est sur `main`**, dans `prototype/`, depuis la fusion de la PR #31 le 15 novembre 2026. La branche `spec/prototype` n'existe plus sur GitHub : `main` est la seule branche distante. La branche de travail locale ne le contient pas encore. [V]
- **Le noyau fonctionne.** 452 tests sur 454 passent ; les 313 tests du noyau passent tous, en 1,3 seconde ; le typecheck passe. Les deux échecs touchent le jeu « charge » et le worker, et tiennent à des délais. [V] pour les chiffres, [D] pour la cause.
- **Le noyau est pur et réutilisable** : `compile`, `evaluate`, `explain`, `remplissage`, `copier`, `graphe`. Il n'importe ni React, ni TanStack DB, ni rien du navigateur. [V]
- **Le prototype ne contient aucun éditeur de grille.** Les grilles sont des fichiers JSON du corpus, produits par des scripts Python. Les erreurs de `compile` ne sont affichées nulle part dans l'interface. [V]
- **Le format JSON d'une grille existe et est typé** (`format.ts`) : barèmes, nœuds (`donnees`, `calcul`, `regroupement`), axes, jokers, exigences, nœud décisif. `compile` rend une liste de messages en français, tous d'un coup. [V]
- **`compile` ne vérifie pas tout ce qu'un éditeur doit garantir** : barème ordinal sans paliers, bornes inversées, calcul sans entrée, entrées non binaires d'un « toutes », nœud jamais placé. Ces cas passent sans erreur. [V]
- **Aucune variante du moteur n'est retenue**, et la campagne #27 n'est pas close. Mais le calcul lui-même coûte 0,2 ms par participant sur une grille six fois plus grande que les grilles réelles. À la taille d'une démonstration, le moteur n'est pas le risque. [V] pour la mesure, [D] pour la conclusion.
- **Les points 1a, 1b, 1c, H4 et H5 de 19 restent ouverts.** Le prototype les rend commutables, avec des défauts conformes à 18, mais l'essai « en voyant » n'est pas consigné. [V]

## 1. Où est le code, et dans quel état

| Fait | Détail | |
| --- | --- | --- |
| Branches distantes | `main` seule (`git ls-remote --heads` et API GitHub). Les branches `spec/prototype`, `research/*`, `corpus/*`, `analyse/donnees-plates` n'existent plus. | [V] |
| Livraison | PR #31 « Prototype du modèle de qualification, recherches et docs d'accueil », de `spec/prototype` vers `main`, fusionnée le 15 novembre 2026. PR #37 corrige ensuite un hash dans les docs. | [V] |
| Commits | Un commit par ticket, de `4fe6d73` (#15) à `6974ab6` (#26). Les commentaires de clôture des issues citent ces commits. | [V] |
| Emplacement | `prototype/` : 10 300 lignes de TypeScript dans `src/`, dont environ la moitié de tests ; `harnais/` ; `mesures/`. | [V] |
| Branche de travail | `claude/wayfinder-sujet-dfe196` part de `5c3a794`, avant le prototype. Elle n'a ni `prototype/`, ni les documents 20 et 21, ni `corpus-prototype/`. `main` n'a pas les documents 22 à 24. | [V] |
| Pile | Bun, Vite 8, Vitest 5, TypeScript 7, React 19, `@tanstack/db` 0.11, `alien-signals` 3.2.1, `fast-check`, Playwright. | [V] |

**Tests.** `bun install` prend 3 secondes. `bun run test` : 24 fichiers, 454 tests, 452 réussis, 60 secondes. `bun run typecheck` : aucune erreur. [V]

Les deux échecs :

- `src/essai.test.ts`, « sans B, ou hors du jeu « corpus », pas de comparaison » : dépasse le délai de 5 secondes. Le test construit le jeu « charge » (200 participants). L'échec se reproduit avec `bun --bun`. [V]
- `src/store/storeBase.test.ts`, « une graine différente dans le worker » : attend une notification sous 20 ms. Il passe quand on le relance avec `bun --bun`, hors de la suite complète. [V]

Les commentaires de clôture des issues annoncent 454 tests réussis sur la machine de l'auteur. Les deux échecs viennent donc probablement de la machine de test, plus lente. [D]

**Non vérifié** : `bun run build`, le lancement dans un navigateur (`bun run dev`), le harnais de mesure.

## 2. Ce qui est réutilisable tel quel

| Élément | Fichiers | État | |
| --- | --- | --- | --- |
| Format d'une grille | `src/noyau/format.ts` (229 lignes) | Types TypeScript complets. Pas de schéma de validation à l'exécution : les JSON sont importés avec `as unknown as Grille`. | [V] |
| `compile` | `src/noyau/compile.ts` (721 lignes) | Valide, ordonne, produit un plan sérialisable. Pur. | [V] |
| `evaluate` (l'oracle) | `src/noyau/evaluate.ts` (316 lignes) | Évaluation récursive mémoïsée d'un participant. Rend valeurs, causes de « sans résultat » et marques. | [V] |
| `explain` | `src/noyau/explain.ts` (408 lignes) | Rend une `Explication` structurée : phrase type de la fonction, entrées avec statut et raison, conversion, arrondi, joker, et le texte ligne par ligne. | [V] |
| Remplissage | `src/noyau/remplissage.ts`, `dispense.ts` | État des cases, obligatoires, minimums, avertissement. | [V] |
| Jokers | `src/noyau/jokers.ts` | Refus à la pose, jokers invalides. | [V] |
| Copie | `src/noyau/copier.ts` | Copie des sources par `origine`, avec rapport. | [V] |
| Graphe | `src/noyau/graphe.ts` | Nœuds, arêtes, marques d'un participant. | [V] |
| Corpus | `docs/analyse/corpus-prototype/` | A01, A03, G3 V1 et V2 en JSON, participants types avec résultats attendus, scripts Python de contrôle. | [V] |

Le noyau n'importe que ses propres fichiers. Aucune dépendance externe. [V]

**Tailles du corpus** (comptées dans les JSON) [V] :

| Grille | Données | Calculs | Regroupements | Fonctions | Barèmes | Axes | Jokers |
| --- | ---: | ---: | ---: | --- | ---: | ---: | --- |
| A01 | 156 | 83 | 0 | F1 | 1 | 3 | aucun, pas de nœud décisif |
| A03 | 264 | 82 | 14 | F1, F2, F3 | 4 | 2 | quota 1, 3 autorisés |
| G3 V1 et V2 | 242 | 88 | 15 | F1 à F5 | 2 | 4 | quota 1, 2 autorisés |

F6 et F7 ne sont exercées que par les cas T des tests, pas par une grille du corpus. [V]

**Le générateur est réutilisable avec une réserve.** `generer(plans, graine, réglages)` est pur et déterministe (PRNG sfc32, un flux par grille et par participant). Mais il rend des lignes au format des collections du prototype : clés entières `k` combinant grille, participant et nœud, plafond de 1 024 participants. [V] Les participants générés s'appellent « Participant 1 », « Participant 2 », avec l'identifiant `gen-1` : aucun nom réaliste. [V] Les participants types du corpus ont des prénoms (Alice, Bruno, Chloé, Fanny…) et des résultats attendus figés. [V]

**Ce que le noyau suppose en entrée.** `evaluate` prend un `Float64Array` de cases indexé par le rang du nœud de données, `NaN` pour une case vide. Une case ordinale stocke le **rang du palier à partir de 0**, pas sa valeur. [V] Toute couche de stockage devra produire ce tableau.

## 3. Ce qui était jetable par conception

La spec dit : « On garde les conclusions et les algorithmes, pas le code. » Le prototype n'applique pas les règles de qualité du projet (lint strict, mutation, complexité). [V]

| Élément | Pourquoi ne pas le reprendre | |
| --- | --- | --- |
| Interface (`src/ui/`, 1 500 lignes) | « Visualisation brute, sans design applicatif. » Une table participants × nœuds, pas une grille à remplir. | [V] |
| Sources (`src/sources/`) | Collections TanStack DB en mémoire. Rien n'est persisté ; un rechargement perd tout. Clés entières propres au prototype. | [V] |
| Stores et worker (`src/store/`) | Cinq variantes à comparer, cache LRU, protocole de messages. Aucune n'est retenue. | [V] |
| Simulateur de saisies distantes | Écrit dans les collections locales. Ce n'est pas du temps réel : pas de serveur, pas de multi-formateurs, pas de verrous. | [V] |
| Réglages, comparaison A → B, mode vérification | Outils d'essai des commutateurs. | [V] |
| Harnais et mesures | Liés au jeu « charge » et à la machine de mesure. | [V] |
| `etendre` | Sert seulement à gonfler G3 pour la charge. | [V] |

Hors périmètre du prototype, donc **absents** : serveur, authentification, temps réel, persistance, cycle de vie, gabarits, exports, commentaires (un nœud de commentaire existe dans la structure, sans case). [V]

## 4. Ce que le prototype dit de la conception d'une grille

### Le format JSON

Une grille est un objet à sept clés [V] :

| Clé | Contenu |
| --- | --- |
| `grille` | Nom. |
| `baremes` | Liste nommée. Numérique : `min`, `max`, `pas`, `colorations` facultatives. Ordinal : `paliers` (`valeur`, `libelle`, `couleur`) ou `prereglage: "binaire"`. |
| `noeuds` | Liste plate. Chaque nœud a un `id`, un `type`, un `libelle`. |
| `axes` | Arbres de placements `{noeud, enfants}`. Exactement un axe `principal`. |
| `decisif` | Id du nœud décisif. Facultatif (A01 n'en a pas). |
| `exigences` | `minimumParRegroupement: [{noeud, minActives}]`. L'obligatoire est porté par le nœud de données. |
| `jokers` | `{quota, autorises: [{id, noeud, action, libelle}]}`. |

Un nœud de calcul porte `fonction`, `entrees` (`[{noeud, poids}]`), `params`, et un pipeline facultatif : `bareme_sortie`, `conversion` (table de points), `arrondi`. [V]

**Le calcul et l'affichage sont deux choses séparées.** Les entrées d'un calcul sont dans `noeuds` ; la place d'un nœud à l'écran est dans `axes`. Un nœud peut être placé sous un regroupement sans y compter. C'est le modèle de 18, et c'est ce qui rend l'édition difficile : chaque nœud demande deux gestes. [V] pour le format, [D] pour la difficulté.

**Les identifiants sont des chaînes écrites à la main** (`ind:A/1.1/1`, `crit:A/1.1`, `seuil:A`). Un éditeur devra les générer. [D]

**Taille d'une grille écrite.** Les fichiers de structure pèsent de 85 à 105 Ko. Aucun n'a été écrit à la main : `extraire-structure.py` et `g3-structure.py` les produisent. [V]

### Les erreurs de compile

`compile` accumule toutes les erreurs, puis lève une `ErreurCompilation` qui porte la liste. Les messages sont des chaînes en français, préfixées par l'id du nœud (`m : entrées de données sur des barèmes différents (note, echelle)`). Pas de code d'erreur, pas de référence structurée au nœud fautif. [V]

Ce que `compile` refuse [V] :

- un id de nœud ou de joker en double ; une référence inconnue (barème, entrée, nœud d'axe, nœud décisif, nœud de joker ou de minimum) ;
- une fonction hors de F1 à F7 ; un paramètre requis absent (seuil de F2, `k` de F4, `mode` de F5, `kHautes` et `kBasses` de F6, les trois paramètres de F7) ;
- un pas d'arrondi autre que 1, 0,5 ou 0,1 ;
- une entrée qui est un regroupement ou un commentaire ;
- un cycle, boucle sur soi comprise ;
- deux nœuds de données de barèmes différents en entrée directe d'un même calcul ;
- un joker sur un nœud qui n'est pas un calcul ; un joker « seuil » dont le nœud de seuil n'est pas un F2 consommant directement le nœud autorisé ; un quota non entier ;
- zéro ou plusieurs axes principaux ; un commentaire obligatoire ; un minimum inférieur à 1 ;
- une scission ou une fusion lors d'une copie (`origine` partagée ou multiple).

Ce que `compile` laisse passer, constaté à la lecture [V] :

- un barème ordinal sans paliers ni préréglage (ses bornes deviennent infinies) ;
- un barème numérique avec `min` supérieur à `max`, ou un pas nul ;
- un nœud de calcul sans aucune entrée ; un poids négatif ;
- un F3 « toutes » dont les entrées ne sont pas binaires ; un nœud décisif non binaire ;
- un nœud placé dans aucun axe ; un nœud de données qui n'entre dans aucun calcul ;
- une table de conversion non croissante ; un libellé vide.

`compile` calcule aussi, sans erreur, deux signalements utiles à un éditeur : les **chemins multiples** (un nœud qui contribue à plusieurs exigences, ou qui influence un même résultat par deux voies) et les **dispenses sans effet**. [V]

Seuls 8 tests portent directement sur les refus de `compile` (`compile.test.ts`). Les autres règles sont couvertes par les tests des grilles. [V]

### Le catalogue de fonctions

| # | Fonction | Paramètres dans le JSON | Sortie par défaut |
| --- | --- | --- | --- |
| F1 | Moyenne pondérée | poids par entrée | barème commun des entrées, sinon 0–100 % |
| F2 | Seuil | `seuil` | binaire |
| F3 | Toutes | — | binaire |
| F4 | Au moins k | `k` (entier ou « toutes »), `seuil` facultatif | binaire |
| F5 | Meilleure ou dernière occurrence | `mode`, `plafond` facultatif | comme F1 |
| F6 | Moyenne sans les extrêmes | `kHautes`, `kBasses` | comme F1 |
| F7 | Double compensation | `pivot`, `facteurBas`, `maxInsuffisantes` | binaire |

Toute fonction accepte `minEntreesActives` (1 par défaut). Chaque fonction a une phrase type d'explication, écrite dans `explain.ts`. Somme, minimum et maximum sont volontairement absents. [V]

**Une grille simple n'a besoin que de F1, F2 et F3.** A03 entière s'écrit avec ces trois fonctions : moyennes, trois seuils, une réussite. [V]

### Les barèmes

Deux types : numérique borné et ordinal à paliers. Le binaire OK/KO est un préréglage de l'ordinal. [V] Trois barèmes implicites s'ajoutent au plan quand un calcul n'en nomme pas : `(0–100 %)`, `(binaire)`, `(min–max)`. [V] La normalisation « distance entre extrêmes » n'intervient que pour des entrées de barèmes différents. [V] Les colorations sont des bandes `[de, à, couleur]` sans effet sur le calcul. [V]

## 5. État des mesures et variante du moteur

**Fait** (campagne du 7 octobre 2026, commit `6974ab6`, jeu « charge » : 200 participants, 3 grilles de 1 556 données, bridage ×4) [V dans `21` et `rapport.md`] :

- Les 30 combinaisons configuration × scénario échouent. Saisie rapide de la base : p95 de 771 ms, INP de 144 ms, pour un critère de 100 ms.
- Le calcul lui-même prend 0,2 ms en médiane. Le reste du délai est autour du retour du worker, du commit React et de la peinture.
- Aucun N du LRU ne passe. Aucune des cinq variantes ne se détache.
- La copie d'une grille bloque le thread principal 11 à 12,5 secondes.

Micro-benchmarks sur G3 étendue ×6 (2 110 nœuds) : `compile` 3,5 ms, `evaluate` d'un participant 0,17 ms. `compile` de G3 réelle : 0,44 ms. [V dans `mesures/micro-benchmarks/`]

**Reste à faire dans #27** [V] : l'essai des commutateurs 1a, 1b, 1c, H4 et H5 sur le jeu « corpus » ; la tenue du modèle et la couverture des cas ; la description des algorithmes à garder. Les trois sections correspondantes de 21 portent « Non consigné ».

**#28, ouvert, non commencé** [V] : mesurer des structures réelles avec 20 et 40 participants, à ×1 et ×4, et diagnostiquer les latences et la copie. L'issue précise que 20 et 40 sont des hypothèses de travail.

**Une variante se dégage-t-elle pour une démonstration ?** Pas par les mesures : 21 écrit qu'« aucun choix définitif de variante n'est justifié par cette série seule ». [V] Mais pour une démonstration, la question change de nature [D] :

- Recalculer un participant entier par l'oracle coûte moins de 0,2 ms sur une grille six fois trop grande. Trente participants : quelques millisecondes.
- Le prototype contient déjà cette variante : `storeProvisoire.ts` recalcule tout le participant par `evaluate` à chaque changement, sur le thread principal. C'est l'échafaudage du ticket #15.
- Le worker, les signaux, le DAG maison et le LRU répondent à une échelle (900 000 cases) qu'une démonstration n'atteint pas.

Les latences mesurées à la charge viennent de l'interface et du stockage, pas du calcul. Une interface différente et un stockage différent ne les hériteront pas, mais rien ne garantit qu'ils feront mieux. [D]

## 6. Constats et hypothèses commutables

Les commutateurs du modèle sont passés à `compile` (`Commutateurs`, `compile.ts`) [V] :

| Point de 19 | Défaut du prototype | Variante | État |
| --- | --- | --- | --- |
| 1a portée de la dispense | A, sur la case (conforme à 18) | B, sur la contribution (rouvre 18 §6) | non tranché |
| 1b feuilles d'un regroupement | A, par placement | B, dépendances de calcul ; C, selon l'axe | non tranché |
| 1c minimum par regroupement | actif si la grille le déclare | inactif | non tranché |
| H4 « toutes » avec entrée sans résultat | l'ignore | strict : sans résultat | non tranché |
| H5a joker sur nœud sans résultat | accepté | refusé | non tranché |
| H5b plusieurs jokers par nœud | un seul | cumulés | non tranché |
| F5 rang, F5 plafond | selon la grille | forcer « dernière », sans plafond | réglage d'essai |

H1, H2 et H3 de 19 sont **tranchés** par l'issue #4 et ne sont plus commutables : normalisation par distance entre extrêmes, joker ±n sur le barème de sortie, joker « seuil » qui référence un nœud F2. [V dans la spec] H6 (archivage) est hors du prototype. [V]

Constat 2 de 19 (une dispense sur un obligatoire rend le dossier provisoire) : le prototype applique 18 tel quel. Il ajoute un cas trouvé en construction : en H4 strict, une dispense rend « toutes » sans résultat, ce qui contredit « sans pénalité automatique » de 18 §6. Choix provisoire, signalé dans #18. [V]

**Choix provisoires pris en construction**, consignés dans les commentaires des issues et jamais validés [V] :

- case ordinale stockée en rang à partir de 0 (#15) ;
- dans F4 à F7, seul le poids 0 compte (#16) ;
- F4 avec moins de k entrées actives rend KO, pas « sans résultat » (#16) ;
- F5 : une tentative 2 seule reste plafonnée (#16) ;
- pas de liste de définitions dans le format : une définition est un simple id partagé (#16) ;
- sans nœud décisif, tous les nœuds sont indicatifs (#20) ;
- le minimum de grille s'écrit sur l'id de l'axe principal (#18).

Un défaut de TanStack DB a été trouvé : `subscribeChanges` ne transmet pas la suppression d'une ligne chargée avant la souscription sans `includeInitialState: false` (#18). [V dans le commentaire, non reproduit]

## 7. Ce que cela implique pour la première version

Propositions, pas décisions.

1. **Reprendre le noyau comme point de départ, pas comme produit fini.** `format.ts`, `compile`, `evaluate`, `explain`, `remplissage` et leurs tests tiennent en 2 000 lignes sans dépendance. Les passer aux règles de qualité du projet est un travail borné. Cela contredit la lettre de la spec (« on jette le code ») : à signaler au porteur.
2. **L'éditeur de grille est entièrement à concevoir.** Le prototype fournit sa cible (le JSON) et son juge (`compile`), rien de son interface. Le format est celui d'un graphe ; l'éditeur doit en cacher la forme.
3. **Borner l'éditeur minimal à F1, F2, F3.** Moyenne pondérée, seuil, « toutes ». Deux ou trois barèmes : une note numérique, une échelle à paliers, OK/KO. Un seul axe. C'est ce qu'il faut pour une grille du type A03 réduite, et les barèmes de sortie par défaut évitent de les faire choisir.
4. **Rendre les erreurs de `compile` exploitables.** Aujourd'hui : des chaînes. Un éditeur a besoin d'un code et du nœud fautif pour montrer l'erreur au bon endroit. Il faut aussi ajouter les contrôles absents (section 4), ou garantir ces cas par construction dans l'éditeur.
5. **Pour la démonstration, recalculer le participant entier à chaque saisie.** Pas de worker, pas de signaux, pas de LRU. La question du moteur reste ouverte pour l'échelle réelle et n'a pas à être tranchée ici.
6. **Garder les défauts actuels des commutateurs** (1a-A, 1b-A, 1c actif, H4 souple, H5 « accepté » et « un seul »). Ils suivent 18. Éviter dans le parcours de démonstration les cas où ils se voient : dispense sur un exercice qui porte une compétence transversale, joker sur un nœud vide.
7. **Participants de démonstration** : le générateur donne les notes, pas les noms. Il faut des noms d'exemple et une adaptation de ses sorties au stockage retenu.
8. **L'explication est prête côté données.** `explain` rend déjà une structure et un texte par nœud. Reste sa présentation.
9. **Le temps réel à deux formateurs n'a aucun acquis dans le prototype.** Ni serveur, ni synchronisation, ni conflit. C'est, avec l'éditeur, la partie neuve de la première version.

## 8. Ce qui reste à vérifier

- Le prototype se lance-t-il et se construit-il (`bun run dev`, `bun run build`) ? Non essayé.
- Les deux tests en échec passent-ils sur la machine du porteur, comme l'annoncent les issues ?
- Une personne qui n'a pas écrit le modèle peut-elle exprimer sa grille avec F1, F2 et F3 seulement ? Aucun essai : toutes les grilles du corpus ont été écrites par script.
- Le format suffit-il à une grille conçue à la main ? Il n'a jamais été produit par une interface. La liste de définitions, absente, manquera peut-être à l'éditeur.
- Les contrôles absents de `compile` (section 4) : la liste vient d'une lecture, pas de tests. À confirmer par des cas.
- Le comportement de `evaluate` sur une grille incomplète en cours d'édition (calcul sans entrée, barème vide) : non essayé.
- Les commentaires des issues #17, #19, #21 à #25 n'ont pas été lus ; ils peuvent contenir d'autres choix provisoires.
- Les branches `research/*` et `corpus/*` ont disparu de GitHub. Leur contenu semble repris dans `main` (`docs/research/`, `corpus-prototype/`), sans comparaison faite.
- Le coût réel d'une saisie de bout en bout sur une grille de taille réelle : c'est l'objet de #28, non commencé.
