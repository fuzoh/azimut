# Décisions prises sur les cinq axes

But : consigner les décisions prises lors de l'entretien du 2026-10-04 avec le porteur (Bastien), sur les cinq axes de 13. Le document garde, pour chaque axe, la **décision**, les **faits métier** qui l'ont motivée (tels que rapportés par le porteur, marqués **rapporté**), ce que cela **verrouille** pour le stockage et les vues, et l'**écart** avec la recommandation de 13. Les décisions ici sont **prises**, sauf ce qui est marqué **à réfléchir**.

## TL;DR

| Axe | Recommandation de 13 | Décision prise | Écart |
| --- | --- | --- | --- |
| 0 Cadrage | modèle générique dès le départ | **Confirmé** | aucun |
| 1 Topologie | T1,5, contexte comme dimension de la case | **T2** : n axes de calcul de profondeur libre, un axe principal ; **pas de dimension contexte**, définition et instance séparées | plus large que recommandé sur la topologie, plus simple sur la case |
| 4 Case | N1 (la note est l'enregistrement), quatre états, P1 (intervalle des possibles) | **N0** (une valeur par case, journal de versions), **trois états**, **P0** (la valeur courante décide) | plus simple sur les trois sous-questions |
| 2 Expressivité | E2 catalogue fermé, arrêt justifié | **E2 catalogue fermé**, échelles paramétrables ; **pas d'arrêt**, un **joker** déclaré dans la grille qui force le statut sans toucher la valeur | conforme sur le catalogue, plus strict sur l'écart humain |
| 3 Persistance | S1 instantanés, V1 journal + versions publiées, C0 copie | **S0** recalcul avec cycle de vie (brouillon, en cours, validée, archivée), **versions par copie** complète, **C0** copie avec provenance et bibliothèque publique | plus simple sur les résultats, par copie sur la structure |
| 5 Vues | W1, X1 résultat restreint, attestation déclarée dans la grille | **W1** par qualification, **X0** (une vue montre des nœuds, rien d'autre), attestation = **vue exportée** ; toute vue est exportable | plus strict sur ce qu'une vue calcule |

Trois conséquences à retenir :

- **La monotonie n'est plus requise** (P0), donc le catalogue peut accueillir des fonctions non monotones si un cas réel le demande.
- **Une fonction du catalogue publiée ne change jamais** (S0) : rejouer une qualification archivée doit donner le même chiffre. Une évolution est une nouvelle fonction.
- **Les éléments gardent une identité stable à travers les copies** (versions par copie, gabarits, définition placée plusieurs fois), sinon ni les notes ni les comparaisons ne suivent.

---

## Axe 0. Cadrage : la généralité du modèle

**Décision.** Le modèle de données porte les concepts génériques dès le départ. Le produit n'en expose qu'une partie au début.

**Rapporté.** L'intérêt de l'application est de servir des dizaines de cours dont les approches de la qualification diffèrent, pas seulement les trois Excel. Les équipes préparent leur grille à l'avance avec des gabarits et des brouillons : le coût de modélisation est absorbé par la préparation. Attente : un stockage généralisé, plus plat, donc plus facile à requêter. L'application doit aussi ouvrir des perspectives nouvelles aux équipes.

**Verrouille.** Toutes les décisions ci-dessous sont prises pour le modèle complet, pas pour un pilote.

---

## Axe 1. Topologie

### Décision 1a. T2 : plusieurs axes de calcul, un axe principal

- Une grille contient **n axes de calcul** posés sur les mêmes feuilles. Chaque axe a **sa propre profondeur**, sans niveaux nommés ni imposés : une grille s'arrête aux critères, une autre regroupe par thématique puis moyenne. Les mots « sphère », « objectif », « critère », « indicateur » sont des usages, pas des types du modèle.
- Un axe est marqué **principal** : il porte la décision de réussite, structure l'éditeur et la navigation par défaut. Les autres axes sont le plus souvent **indicatifs**, pour montrer à l'apprenant et faire apparaître une évolution.
- Dans un axe, une feuille est **placée** à un endroit et **comptée** à un endroit, qui peuvent différer (la sphère spéciale des critères qu'on range près du moment d'évaluation sans qu'ils pénalisent là).
- Une grille peut **n'avoir aucune règle** : cours formatifs, commentaires seuls, note finale cachée. La structure sert alors au rangement et à la restitution.
- Une **vue graphe de la propagation** (nœuds et arêtes) fait partie du produit.

**Rapporté.** La plupart des cours ont un arbre de visualisation qui est aussi l'arbre de calcul : racine, sphères par thématique, objectifs, critères, indicateurs. Deux limites courantes : des critères qu'on veut répartir dans les objectifs sans qu'ils pénalisent là ; une grille organisée par exercices pour la saisie, alors qu'on veut dire à l'apprenant « tu es bon en animation, tous ces exercices le montrent ». Les équipes qui conçoivent par exercices ajoutent ensuite des regroupements transversaux ; celles qui conçoivent par thématiques ont ensuite besoin de regrouper ce qui se corrige ensemble. Les deux modes de pensée mènent au même problème de projection. L'édition sera structurée autour d'un axe, avec la possibilité de passer de l'un à l'autre.

**Verrouille.** Une **table d'appartenances** (axe, parent, membre, placé, compté) plutôt qu'une colonne `parent`. Un moteur de recalcul par **graphe acyclique** avec contrôle de cycle et de double comptage par axe. Un éditeur qui sait « placer dans l'axe X au niveau Y ».

**Écart avec 13.** 13 recommandait T1,5 (un seul arbre de placement, regroupements transversaux plats). Le porteur confirme que les axes secondaires ont parfois **plusieurs niveaux de calcul**, ce qui impose T2. 13 annonçait le passage T1,5 → T2 comme additif ; on part directement de T2.

### Décision 1b. Pas de dimension « contexte » sur la case

- Une case est **(participant, élément placé)**. Le moment d'observation est porté par l'emplacement, c'est-à-dire l'exercice où l'élément est rangé. L'exercice n'est **pas** un concept à part : c'est un nœud d'un axe.
- **Définition et instance sont séparées.** Une même définition de critère peut être **placée** dans plusieurs exercices. Deux exercices qui partagent des critères sont deux nœuds qui référencent les mêmes définitions.
- Deux critères « proches » dans deux exercices (même compétence, formulation différente) restent **deux définitions distinctes**, reliées par un regroupement transversal. L'évolution se lit par l'ordre temporel des exercices.
- La **réévaluation du même exercice** après correction par l'apprenant est une **correction** : la nouvelle note remplace l'ancienne dans le calcul, l'ancienne reste dans l'historique visible des formateurs, l'apprenant ne voit que l'état final.
- La vue « côte à côte » (deux instances d'une même définition, ou un même exercice pour plusieurs participants) est une **vue ordinaire**, pas un concept de stockage.

**Rapporté.** Deux situations existent : réévaluer le même exercice après correction (le cas courant, on remplace), ou deux exercices différents aux critères quasi identiques (on considère alors que ce sont deux exercices). Le cas « même exercice évalué deux fois et affiché côte à côte » est un cas particulier de visualisation, comparable à afficher un exercice pour plusieurs personnes.

**Verrouille.** Pas de table de contextes ni de famille de tentatives. Les fonctions « meilleure tentative » et « dernière tentative » du catalogue s'appliquent à des **membres** d'un regroupement (plusieurs instances d'une définition), pas à une dimension de la case.

**Écart avec 13.** 13 recommandait le contexte comme dimension de la case. Écarté : la séparation définition / instance suffit.

---

## Axe 4. La case et son silence

### Décision 4a. N0 : une valeur par case, journal de versions

- Une case porte **une valeur** et un **commentaire**.
- L'historique est un **journal de versions** technique, à la Git ou Google Docs : qui a changé quoi, quand. Il sert à comprendre un problème ou à aller voir la personne qui a modifié. Il n'est pas un objet du domaine.
- **Pas d'avis multiples** par case : quand plusieurs formateurs évaluent le même apprenant, ils s'accordent et un seul saisit.
- La **note de groupe** est un **raccourci de saisie** : dans la vue de saisie d'un groupe (critères en lignes, membres en colonnes), une colonne virtuelle « groupe » en tête propage la valeur et le commentaire à l'identique dans la case de chaque membre, modifiable ensuite individuellement. Le stockage reste une note par participant.

**Verrouille.** La table centrale est une table de **cases** (état courant) plus une table d'**historique** append-only, comme déjà décidé dans `TODO.md`. Pas de table de notes avec auteur, rôle, portée, origine.

**Écart avec 13.** 13 recommandait N1 (la note est l'enregistrement) pour préparer jury, journal et reprise sans migration. Écarté : aucun de ces cas n'est rapporté.

### Décision 4b. Trois états : valeur, vide, non applicable

- **Valeur** : le participant a été évalué sur l'échelle, avec ou sans commentaire.
- **Vide** : la case **sort du calcul** et ne pénalise jamais. Il couvre « pas observable » (erreur de transmission, indicateur non observé) et « pas vu, pas pénalisé » sans les distinguer.
- **Non applicable** : dispense. Se pose **au niveau d'un nœud** (un exercice entier, cas rare) et s'hérite par ses feuilles. La dispense d'une case seule reste possible.
- **Pas d'état « absent »**. Le non-rendu est une **saisie manuelle** de la pire valeur par le formateur. Un participant qui quitte le cours est **écarté** : statut du participant, hors de la grille, sa qualification sort du périmètre.
- **Obligatoire** est un attribut de l'élément, pas un état : une case obligatoire vide **bloque la validation** au lieu de produire un résultat.
- **« Au moins n indicateurs remplis »** est une règle du catalogue (axe 2), pas un état.

**Rapporté.** Une case vide signale que l'équipe n'a pas pu évaluer, et ne doit pas pénaliser. Certaines cases sont obligatoires ; certaines grilles exigent un nombre minimal d'indicateurs remplis. Les dispenses d'un exercice complet sont rares. Un participant qui n'a pas rendu est en général écarté du cours.

**Écart avec 13.** 13 recommandait quatre états avec « absent » en option et une « valeur du vide » déclarée par l'échelle. Écarté : le vide est toujours neutre ; le cas qualif1 (vide = 0 point) devient une saisie manuelle.

### Décision 4c. P0 : la valeur courante décide

- Les résultats se calculent **dès que possible** sur les cases remplies et s'affichent tels quels, comme dans Excel. Une partie de la grille non encore remplie n'est simplement pas prise en compte.
- Pas d'intervalle des possibles, pas de logique à trois valeurs, pas de « réussi pour l'instant ».
- Un affichage « pas encore sûr » pourra venir plus tard comme **évolution de l'affichage**, pas du stockage.

**Verrouille.** La **monotonie** des fonctions n'est plus une contrainte du catalogue. La protection « un dossier vide ne réussit jamais » repose sur les cases **obligatoires** et la règle « au moins n remplis », pas sur le moteur.

**Écart avec 13.** 13 recommandait P1 et le présentait comme la décision à « ressentir ». Le porteur choisit le comportement d'Excel.

---

## Axe 2. Expressivité

### Décision 2a. E2 : catalogue fermé

- Les équipes **choisissent** parmi des fonctions, conversions et règles proposées. Le tout doit être intuitif.
- **Pas de formule**, pas de fonction maison, pas d'échelle maison. Une échelle du catalogue se **paramètre** (nombre de paliers, couleurs, avec des palettes par défaut), elle ne s'invente pas.
- Ce qui n'est pas au catalogue attend une version du produit.
- Chaque chiffre reste **explicable en une phrase type**, par fonction.

**Rapporté.** Les équipes ont l'impression d'inventer des formules, mais reproduisent en réalité des schémas connus.

**Verrouille.** Le package `domain` est un interpréteur d'un arbre de calcul **typé et fermé**. Une fonction publiée garde sa définition pour toujours (voir 3a). Les clés d'explication et de traduction sont par fonction.

### Décision 2b. Pas d'arrêt justifié, un joker

- L'équipe **ne peut pas écraser** un calcul.
- Le **joker** est **déclaré dans la grille** à la préparation : sur quels types de nœuds il s'applique, combien de fois (une, en règle générale).
- Il **force le statut** d'un nœud pour un participant (réussi, ou échoué), **sans toucher à la valeur calculée** : l'apprenant voit toujours sa note.
- Il est **tracé et visible** : un cadeau assumé pour des cas très exceptionnels où la grille n'est pas favorable mais l'équipe juge la réussite méritée, ou une sanction.

**Verrouille.** Une table (joker × nœud × participant, auteur, date, motif). Le statut d'un nœud est le résultat de la règle **ou** le joker s'il existe. Le joker ne se propage pas comme une valeur.

**Écart avec 13 et 10.** 10 décrivait l'arrêt comme une primitive (valeur posée à la place du calcul, bornée, justifiée) couvrant joker, jury et reprise. Réduit au seul joker, qui agit sur le **statut**, jamais sur la valeur. La décision D20 de 10 (« le joker ajoute-t-il un écart ou fixe-t-il une valeur ? ») est tranchée : ni l'un ni l'autre, il fixe un statut.

---

## Axe 3. Stocké ou recalculé, copié ou partagé

### Décision 3a. S0 : tout se rejoue, avec un cycle de vie

- **Pas d'instantané de résultats.** Tout résultat se rejoue depuis les notes et la structure.
- La qualification a un **cycle de vie** : *brouillon* → *en cours* → *validée* → *archivée*.
  - **Validée** : édition bloquée. Réouverture possible pour corriger une erreur, **signalée clairement à l'équipe** et tracée.
  - **Archivée** : quelques jours après le cours. Plus aucune édition.

**Verrouille.** Une fonction du catalogue publiée **ne change jamais de définition** ; une évolution est une **nouvelle fonction**. L'attestation imprimée est reproductible tant que les données sont archivées. Les transitions d'état sont des opérations nommées avec auteur et date.

**Écart avec 13.** 13 recommandait S1 (instantanés à la clôture) pour répondre à 03 K8. Le porteur préfère la rejouabilité stricte, l'archivage tenant lieu de gel.

### Décision 3b. Versions de structure par copie

- Modifier la grille une fois le cours commencé est **rare et prudent** : fautes de formulation, indicateur manquant.
- Une modification en cours crée une **nouvelle version** : **copie de la structure et des notes**. L'ancienne version passe en lecture seule.
- Pas de journal fin sur la structure ; le journal de versions reste pour les cases.
- Un outil de **comparaison de versions** est éventuel, pas exigé.

**Verrouille.** Les éléments gardent une **identité stable à travers les copies** pour que les notes suivent et qu'une comparaison reste possible. Une qualification pointe la version en vigueur.

**Écart avec 13.** 13 recommandait V1 (état courant + journal + versions publiées, variante en lecture seule). Remplacé par une copie complète, plus simple à raisonner. Les variantes de calcul (L4) ne sont pas retenues.

### Décision 3c. C0 : copie avec provenance, bibliothèque publique

- Un **gabarit** est une grille que l'on copie puis personnalise, parfois en profondeur (on aime la structure d'une grille conçue pour un autre cours).
- Une grille vit **dans un cours** et n'est visible que de ses membres. L'équipe peut la **publier** dans une bibliothèque publique, d'où tout le monde peut repartir. La copie garde sa **provenance**.
- **Pas de référentiel partagé.** Les objectifs édités par l'organisation faîtière sont un vocabulaire d'**autocomplétion et d'étiquettes** sur les éléments, pas des clés étrangères. **À réfléchir** : la forme de cette autocomplétion.
- L'organisation faîtière **n'impose ni ne suit** les grilles.

**Verrouille.** Une table de grilles avec un lien de provenance, un drapeau « publique ». Les statistiques entre cours, si elles viennent, se feront par étiquette.

### Décision 3d. Le cours possède la grille

- Une grille couvre **l'intégralité d'un cours**, donc tous ses événements MiData.
- La liste des participants est **toujours celle de MiData**, synchronisée au fil du cours. Pas d'ajout manuel. Un participant peut être **écarté** localement.

**Verrouille.** Le cours est l'objet racine ; les événements MiData lui sont rattachés ; la liste des participants est l'union. Un statut « écarté » par participant et par qualification.

---

## Axe 5. Les vues

### Décision 5a. W1 : générées et configurées, par qualification

- **Tout est vue.** Les vues standard sont **générées** depuis la structure sans réglage ; les vues avancées se **configurent** par listes de choix.
- Une vue appartient à la **qualification** : toute l'équipe utilise les mêmes. **Pas de vue personnelle.**
- Les **grilles intermédiaires de correction** (regrouper ce qui se corrige ensemble) sont des **vues de saisie**, pas des branches d'un axe. L'organisation de la saisie ne crée pas de nœuds.

**Verrouille.** Un store client interrogeable selon toutes les dimensions (participant, élément, axe, étiquette, auteur, temps). Des définitions de vue stockées par identifiants stables, rattachées à la qualification et copiées avec elle.

### Décision 5b. X0 : une vue montre des nœuds, rien d'autre

- Une vue est une **série de nœuds** affichés sous une forme : table à la Excel, liste, graphe de propagation. Chaque chiffre affiché est un résultat de la grille, avec sa chaîne de calcul claire.
- Les **tableaux croisés** (exercices × compétences) et **graphiques** qui exigeraient un chiffre hors grille sont **reportés**. Le jour venu, la vue déclarera explicitement d'où vient chaque cellule ou axe. **À réfléchir**, dans un second temps.

**Écart avec 13.** 13 recommandait X1 (résultat restreint marqué « partiel ») pour la projection « rendus × thèmes » de `FEATURES.md`. Reporté. Rien dans le stockage ne l'empêche.

### Décision 5c. L'attestation est une vue exportée

- L'attestation est aujourd'hui un **document papier** : le plus souvent la grille de synthèse, parfois complétée d'une **page officielle** (réussite du cours, texte officiel, données du participant).
- **Toute vue est exportable** en document, y compris la grille d'un seul exercice. L'export est une sortie de vue, pas un objet à part.
- La page officielle est une vue de type « document » déclarée dans la qualification.

**Verrouille.** Pas d'espace apprenant dans l'application pour l'instant. Un rendu document par vue.

---

## Ce que ces décisions règlent dans 10 et 11

| Décision de 10 §11 | Tranchée par | Résultat |
| --- | --- | --- |
| D1 Expressivité | 2a | catalogue fermé |
| D2 Statut décisif | 1a | déduit : l'axe principal porte la décision ; les autres sont indicatifs sauf si une règle les cite |
| D3 Afficher ici, compter ailleurs | 1a | placé / compté par appartenance |
| D4 Défaut du vide | 4b | toujours ignoré ; obligatoire et « au moins n » protègent |
| D6 Tentatives | 1b | pas de famille de tentatives ; des instances d'une définition |
| D8 S'écarter de la proposition | 2b | interdit, sauf joker sur le statut |
| D13 Reproduire l'Excel | 3a | non ; rejouer, oui |
| D16 Proposition pendant le cours | 4c | valeur courante, pas d'« incomplet » |
| D20 Joker | 2b | fixe un statut, jamais une valeur |
| L4 Variantes | 3b | non retenues |
| Q2 de 11 Vues personnelles | 5a | non |
| Q11 de 11 Attestation | 5c | une vue exportée |

Restent en aval, inchangés par cet entretien : D9 vocabulaire, les droits, la correspondance des rôles MiData, la nLPD, le positionnement face à Qualix.

## À réfléchir, hors de ces décisions

- La forme de l'**autocomplétion** depuis les objectifs de l'organisation faîtière (3c).
- Les **tableaux croisés et graphiques** : d'où vient la donnée de chaque cellule (5b).
- Un **outil de comparaison** de versions ou de grilles (3b).
- Un affichage « **pas encore sûr** » pendant le cours, si une équipe le demande (4c).

## Prochaine étape

Rejouer qualif1, qualif2 et qualif3 à la main dans ce modèle, puis reporter dans `FEATURES.md` (comportement) et `TODO.md` (décisions). Les points de friction attendus : la sphère non pénalisante de qualif2 (placé / compté), l'objectif 4.1 de qualif1 (définition placée quatre fois, axe secondaire), et le vide à 0 point de qualif1 (devient une saisie manuelle).
