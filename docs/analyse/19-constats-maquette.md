# Constats de la maquette interactive du modèle

> **Statut : constats et points à trancher (5 octobre 2026).** Ce document ne décide rien. [18 — Décisions définitives](18-decisions-definitives.md) fait foi. Les options marquées « rouvre 18 » remettraient en cause une décision validée.

## Source

Les constats viennent de la maquette [`18-visualisation.html`](18-visualisation.html), qui exécute une grille d'exemple selon les règles de 18. La grille comprend :

- deux exercices : Ex.1 « Jeu de piste » (moyenne pondérée) et Ex.2 « Veillée » (moyenne) ;
- deux compétences transversales : Animation (moyenne de Consignes Ex.1, Consignes Ex.2, Gestion du groupe) et Sécurité (moyenne de Sécurité Ex.1, Sécurité veillée) ;
- trois exigences : chaque exercice ≥ 60 %, Animation ≥ 70 %, Sécurité ≥ 50 % ; le nœud décisif exige les trois ;
- « Sécurité de la veillée » est placée dans Ex.2 mais compte seulement pour Sécurité ;
- deux indicateurs obligatoires (Sécurité Ex.1, Gestion du groupe Ex.2) et au moins 4 indicateurs renseignés sur 5.

Les valeurs ci-dessous utilisent la conversion « distance entre extrêmes » (1 → 0 %, 3 → 50 %, 5 → 100 %).

## Constat 1 — Une dispense sur un regroupement agit hors de ce regroupement

### Ce qui se passe

18 §6 : une dispense « posée sur un nœud, s'hérite par ses feuilles », et « non évalué » est un état de la **case**. Une feuille dispensée est donc exclue de **tous** les calculs où elle compte, pas seulement du regroupement dispensé.

Exemple avec Noah (notes : Consignes Ex.1 = 4, Sécurité Ex.1 = 3, Appréciation Ex.1 = 3, Consignes Ex.2 = 3, Gestion du groupe = 4, Sécurité veillée = 3) :

| Situation | Ex.1 | Ex.2 | Animation | Sécurité | Réussite |
| --- | --- | --- | --- | --- | --- |
| Sans joker ni dispense | 56 % KO | 63 % | 67 % KO | 50 % OK | Échoué |
| Dispense sur Ex.2 | 56 % KO | — | **75 % OK** | 50 % OK | Échoué |
| Joker « remonter au seuil » sur Ex.1 | 60 % OK | 63 % | 67 % KO | 50 % OK | Échoué |
| Joker sur Ex.1 + dispense sur Ex.2 | 60 % OK | — | **75 % OK** | 50 % OK | **Réussi** |

Dispenser Noah de l'exercice 2 retire aussi deux de ses trois notes d'Animation. La compétence n'est plus calculée que sur une seule note (Consignes Ex.1), qui la fait passer au-dessus du seuil. La dispense d'un exercice change ainsi le résultat d'une compétence transversale.

Deuxième effet : « Sécurité de la veillée » est **placée** dans Ex.2 sans y **compter**. Si ses « feuilles » sont les éléments placés sous Ex.2, la dispense de l'exercice l'exclut aussi de la compétence Sécurité.

### À trancher

**1a. Portée de la dispense héritée.**

| Option | Effet | Remarque |
| --- | --- | --- |
| A. Sur la case (lecture actuelle de 18) | La feuille est non évaluée partout. | Cohérent avec « une évaluation = une donnée ». Une dispense d'exercice modifie les compétences. |
| B. Sur la contribution | La feuille est exclue seulement des calculs du regroupement dispensé et de ce qui en dépend ; elle compte encore ailleurs. | Rouvre 18 §6 : la dispense ne serait plus un état de case. Plus complexe à expliquer : une même note est à la fois active et exclue. |

Proposition : garder A, qui est la décision de 18, et rendre l'effet visible. Quand on pose une dispense, l'éditeur liste les autres nœuds touchés, comme pour le signalement des chemins multiples (§3).

**1b. Définition des « feuilles » d'un regroupement.**

| Option | Feuilles de Ex.2 | Conséquence |
| --- | --- | --- |
| A. Éléments placés sous le regroupement dans l'axe | Consignes Ex.2, Gestion du groupe, Sécurité veillée | La dispense suit ce que le formateur voit sous l'exercice. Elle exclut aussi des éléments qui n'y comptent pas. |
| B. Dépendances de calcul du nœud | Consignes Ex.2, Gestion du groupe | La dispense suit le calcul. Un élément affiché sous l'exercice reste actif alors que l'exercice est dispensé. |
| C. Selon l'axe où la dispense est posée | Dépend de l'axe | Plus précis, mais un même nœud peut être un regroupement de plusieurs axes. |

Proposition : A. Une dispense d'exercice signifie en pratique « n'a pas fait l'exercice », donc tout ce qui y est évalué. À confirmer avec un cas réel.

**1c. Minimum de contributions par regroupement.** Après la dispense, Animation est calculée sur une seule note sur trois. 18 §6 prévoit « un nombre minimal d'indicateurs renseignés » sans préciser sa portée.

- La grille entière seulement ?
- Ou aussi par regroupement, par exemple « Animation exige au moins 2 notes actives » ?

Un minimum par regroupement ne bloquerait pas le calcul (§6 : calcul dès que possible) : il produirait une erreur de remplissage et maintiendrait l'avertissement.

## Constat 2 — Une dispense couvrant un indicateur obligatoire rend le dossier provisoire pour toujours

### Ce qui se passe

18 §6 est explicite : « Une dispense ne lève pas les exigences de remplissage de ses feuilles », et « non évalué » ne satisfait pas un obligatoire.

Dans l'exemple, dispenser Noah de l'Ex.2 couvre « Gestion du groupe », qui est obligatoire. On obtient deux erreurs de remplissage : l'obligatoire manquant, et 2 indicateurs actifs sur 5 au lieu de 4. Conséquences :

- l'avertissement « données provisoires » ne peut plus disparaître pour ce dossier ;
- la finalisation exige l'acceptation explicite des erreurs ;
- l'export garde la mention d'incomplétude, y compris sur l'attestation.

Une dispense légitime (raison médicale, exercice annulé) produit donc le même résultat visible qu'un oubli de saisie.

### À trancher

**2a. Confirmer ce comportement en connaissance de cause.**

| Option | Effet | Remarque |
| --- | --- | --- |
| A. Confirmer 18 tel quel | Acceptation explicite requise ; incomplétude visible à l'export. | La dérogation reste tracée et consciente. Une dispense attendue est traitée comme une anomalie. |
| B. Garder la règle, distinguer la cause | L'onglet d'erreurs, l'avertissement et l'export distinguent « exigence non satisfaite par dispense » de « exigence non satisfaite ». | Compatible avec 18 : le rendu et le contenu de l'onglet d'erreurs sont ouverts (§13.3). |
| C. La dispense lève les exigences couvertes | Pas d'erreur ni d'avertissement pour les feuilles dispensées. | Rouvre 18 §6. Risque : une dispense posée par erreur passe inaperçue. |

Proposition : B.

**2b. Libellé dans l'export.** Si B est retenu, l'attestation mentionne-t-elle la dispense (« dispensé de l'exercice 2 ») ou seulement une incomplétude générique ? Ce choix touche aussi la protection des données (motif médical).

## Hypothèses de la maquette à confirmer

La maquette a dû choisir là où 18 laisse un point ouvert. Ces choix ne sont pas des décisions ; ils montrent ce qu'il faudra fixer.

| # | Hypothèse retenue dans la maquette | Question à trancher | Point ouvert de 18 |
| --- | --- | --- | --- |
| H1 | Conversion 1–5 → % au choix : distance entre extrêmes (3 = 50 %) ou atteinte d'une cible (3 = 100 %). | Quelle convention par défaut, et où se règle-t-elle (barème, nœud, fonction) ? La maquette montre que les seuils changent complètement de sens selon ce choix. | §13.1 |
| H2 | Un « point » de joker = un palier du barème, soit 25 % sur une échelle 1–5. | Sur une valeur calculée et normalisée, que vaut « +1 point » : un palier, un point du barème source, un pourcentage ? | §13.2 |
| H3 | « Remonter au seuil » utilise un seuil paramétré sur le nœud autorisé (60 % pour un exercice, 70 % pour Animation). | Le seuil appartient à un nœud d'exigence en aval (« chaque exercice ≥ 60 % »). Le joker référence-t-il ce nœud d'exigence, ou porte-t-il son propre paramètre ? | §13.2 |
| H4 | « Toutes les exigences » et « tous au seuil » ignorent les entrées sans résultat, comme un tableur. | Conforme à §6, mais un dossier incomplet peut afficher « Réussi » : Zoé, dont l'indicateur obligatoire « Gestion du groupe » est vide, ou un dossier dont une seule exigence a un résultat. Faut-il un libellé distinct pour une réussite provisoire, au-delà de l'avertissement ? | §13.3 |
| H5 | Un joker posé sur un nœud qui n'a pas encore de résultat consomme le quota sans effet. Un seul joker par nœud. | Autoriser un joker sur un nœud sans résultat ? Plusieurs jokers sur un même nœud, et comment ils se combinent ? | §13.2 |
| H6 | L'archivage manuel archive le cours entier, y compris les dossiers non finalisés. | Périmètre de l'archivage et sort des dossiers non finalisés. | §13.5 |

## Lien avec la relecture du 5 octobre

D'après [`relecture-18-2026-10-05.md`](relecture-18-2026-10-05.md) :

- **Constat 1** découle de l'arbitrage 4 (dispense), validé en relecture. Il reste à confirmer que la portée sur la case et l'effet sur les compétences sont voulus.
- **Constat 2** et **H4** relèvent du remplissage (§13.3), à rediscuter après un premier prototype.
- **H1** sera traitée dans la session prévue sur les barèmes, colorations et fonctions de calcul (§13.1).
- **H6** : la relecture fixe le délai d'archivage par défaut à 30 jours (intégré dans 18 §10). Le périmètre de l'archivage et le sort des dossiers non finalisés restent à trancher.
