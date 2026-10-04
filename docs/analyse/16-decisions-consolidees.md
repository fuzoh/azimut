# Décisions consolidées sur le modèle de qualification

> **Document remplacé par [18 — Décisions définitives](18-decisions-definitives.md).** Le texte ci-dessous conserve la consolidation antérieure ; en cas de divergence, 18 fait foi.

But : fusionner les deux comptes rendus des entretiens du 2026-10-04 avec le porteur, **14** (structuré par les cinq axes de 13) et **15bis** (structuré par thèmes, issu d'une seconde conversation), en un seul document de référence. Les divergences entre les deux ont été tranchées une à une avec le porteur ; la section « Arbitrages » en garde la trace. Ce document **remplace 14 et 15bis**.

Le document ne parle que du **métier** : comportement attendu, règles, cycle de vie, vues. Les implications pour le stockage et le moteur seront dérivées à la conception technique, pas fixées ici.

Trois niveaux : les **décisions** fixent le comportement ; les **orientations** donnent une direction sans figer les mécanismes ; les **points ouverts** restent à trancher.

## TL;DR

- **Modèle générique dès le départ**, convention plutôt que configuration : des choix standards efficaces, une configuration encadrée.
- **Un graphe de nœuds**, pas une hiérarchie imposée : des nœuds de données (saisis) et des nœuds de calcul (combinés par une règle du catalogue). Les niveaux « sphère, objectif, critère, indicateur » sont du vocabulaire, pas des types.
- **Placer et compter sont distincts** ; une même évaluation peut compter par plusieurs chemins, c'est signalé, jamais interdit.
- **La réussite est un nœud de calcul marqué décisif**, qui peut citer des nœuds de n'importe quel axe. Une grille peut n'en avoir aucun.
- **Un axe principal par grille**, repère d'édition et de navigation ; les autres axes sont des lectures.
- **Une note courante par case**, un journal technique des modifications, pas d'avis multiples. Commentaire possible sur tout nœud.
- **Trois états de case** : note, vide, non évalué. Le vide et le non évalué sortent du calcul sans pénaliser. Pas d'état « absent ».
- **Les exigences de remplissage** (obligatoire, au moins n) produisent des erreurs visibles, acceptables explicitement à la finalisation. Un avertissement « données provisoires » reste affiché tant qu'elles ne sont pas satisfaites.
- **Catalogue fermé** de fonctions, règles et barèmes paramétrables. Pas de formule libre.
- **Joker** : un catalogue d'actions déclarées dans la grille (amener au seuil, ajouter ou retirer un point, imposer un échec), nombre d'usages déclaré dans la grille, justification obligatoire, propagation normale.
- **Tout se rejoue** : aucun instantané de résultats, une fonction publiée ne change jamais. Finalisation **par apprenant**, réouverture possible, archivage automatique quelques semaines après le cours.
- **Copie partout** : template, correction en cours de route, bibliothèque publique. Chaque copie est une grille indépendante avec sa provenance.
- **On exporte des vues.** Les vues se composent à la conception et ne montrent que des nœuds. Matrices libres et graphiques sont dans le périmètre.

---

## Arbitrages entre 14 et 15bis

| Point | 14 | 15bis | Retenu |
| --- | --- | --- | --- |
| Action du joker | force un statut, valeur intacte | catalogue d'actions, y compris numériques | **15bis** |
| Nombre de jokers | déclaré dans la grille | un seul par apprenant, fixe | **14** |
| Obligatoire vide à la finalisation | bloque | erreur acceptable en cochant « ignorer les erreurs » | **15bis** |
| Troisième état | « non applicable » = dispense sur un nœud, héritée | « non évalué » explicite, visible, ne satisfait pas l'obligatoire | **fusion** : un seul état « non évalué », posable sur case ou nœud, hérité, ne satisfait pas l'obligatoire |
| Structure | n axes arborescents, double comptage contrôlé par axe | graphe libre, chemins multiples autorisés | **graphe libre**, l'axe est un repère de navigation |
| Décision de réussite | racine de l'axe principal | plusieurs exigences décisives possibles | **nœud marqué décisif**, indépendant des axes |
| Axe principal | obligatoire, porte la décision | évoqué, non fixé | **obligatoire**, repère de navigation seulement |
| Chemins multiples | interdits dans un axe | autorisés, signalement envisagé | **autorisés**, signalement systématique et informatif |
| Avertissement en cours | reporté | « données provisoires » lié aux exigences | **15bis** |
| Modification en cours | versions d'une qualification | grilles indépendantes qui coexistent | **15bis**, avec identité stable des éléments |
| Finalisation | par qualification | par apprenant ou groupée | **15bis** |
| Archivage | quelques jours | quelques semaines, déclenchement ouvert | **quelques semaines, automatique, délai paramétrable** |
| Rejouabilité stricte | décidée | ouverte | **14** |
| Matrices et graphiques | reportés | dans le périmètre | **15bis** |
| Verrouillages de stockage | tables fixées | forme non déterminée | **retirés** du document |

Repris sans divergence : de 14, la bibliothèque publique avec provenance, les étiquettes de l'organisation faîtière, la liste MiData et le statut « écarté », les vues de saisie pour la correction, l'absence de vue personnelle ; de 15bis, les commentaires sur tout nœud, l'appréciation directe comme nœud de données, les conversions et barèmes, l'onglet d'erreurs, les tentatives créées en amont, l'indépendance entre acceptation des erreurs et joker.

---

## 1. Cadrage

**Décisions.**

- Le modèle porte des abstractions génériques dès le départ. Les trois Excel sont des exemples, pas une borne : l'application sert des dizaines de cours aux approches différentes et doit leur permettre d'explorer de nouvelles pratiques.
- La préparation en amont (templates, brouillons) absorbe le coût de modélisation. Il ne justifie pas de réduire le modèle.
- **Convention plutôt que configuration** : des choix standards efficaces pour créer une grille, une configuration encadrée pour s'en écarter.

---

## 2. Structure : un graphe de nœuds

**Décisions.**

- Deux rôles fonctionnels : les **nœuds de données** portent les évaluations saisies ; les **nœuds de calcul** combinent d'autres nœuds selon une règle du catalogue, avec ses paramètres (poids, seuils).
- Les types fonctionnels sont fournis par l'application. Les mots « sphère », « objectif », « critère », « indicateur », « exercice » sont du vocabulaire de cours : ni nombre de niveaux ni succession imposés. Une grille suit l'arbre familier (qualification → sphères → objectifs → critères → indicateurs), ou se limite à des indicateurs et une moyenne, ou adopte une autre organisation.
- L'**exercice** n'est pas un concept à part : c'est un nœud qui regroupe ce qui s'évalue à un moment donné.
- **Appréciation directe sur un regroupement** : si un formateur veut donner une appréciation globale en plus des critères, c'est un **nœud de données supplémentaire**, qui entre dans le calcul parent avec sa pondération. Un nœud ne porte pas à la fois une saisie et un calcul.
- Une grille peut **n'avoir aucune règle de calcul** : cours formatifs, commentaires seuls, appréciations sans chiffre. La structure sert alors au rangement et à la restitution.
- Une **vue graphe de la propagation** (nœuds et arêtes) fait partie du produit.

### Placer et compter

- Un nœud est **placé** à un endroit (où on le voit et le saisit) et **compté** là où des nœuds de calcul le citent. Les deux peuvent différer : des critères de sécurité restent près de leurs exercices pour la saisie, et se regroupent dans une sphère dédiée pour le calcul ; une sphère « spéciale » affiche des critères sans qu'ils pénalisent là.
- Une même évaluation affichée à plusieurs endroits est **une seule donnée**, dans une même qualification.
- **Chemins multiples autorisés.** Une évaluation peut contribuer à plusieurs nœuds de calcul, décisifs ou non. « Au moins 60 % dans chaque exercice **et** au moins 70 % en animation » est un cas accepté ; une moyenne globale qui combine des résultats d'exercices et de compétences aussi, même si des évaluations l'influencent par plusieurs chemins. C'est rare, et ce n'est pas interdit.
- Les chemins multiples sont **signalés systématiquement** dans l'éditeur et la vue graphe, à titre informatif. Rien n'est bloqué.

### Axes

- Un **axe** est une lecture du graphe : par exercice pour la saisie, par compétence pour la restitution. Les équipes qui conçoivent par exercices ajoutent ensuite des regroupements transversaux ; celles qui conçoivent par thématiques regroupent ensuite ce qui se corrige ensemble. Les deux mènent au même graphe.
- Chaque grille a **un axe principal**, obligatoire : repère d'édition et de navigation par défaut, source des vues standard. L'éditeur permet de basculer vers les autres axes.
- L'axe est un repère, pas une contrainte de calcul : il n'impose ni profondeur ni unicité de comptage.

### Réussite

- La réussite est une **règle du catalogue** portée par un **nœud de calcul marqué décisif** (par exemple « tous ces seuils atteints »). Il peut citer des nœuds de n'importe quel axe.
- Un nœud non cité par une règle décisive est **indicatif** : il informe l'apprenant et montre une évolution.
- Le fonctionnement courant reste : un seuil par sphère, transversale ou exercice, puis réussite quand tous les seuils requis sont atteints. Le catalogue n'est pas fermé aux autres combinaisons.

**Orientations.** La forme de la vue graphe, ses interactions et le rendu du signalement des chemins multiples restent à concevoir.

---

## 3. Évaluations répétées et progression

**Décisions.**

| Situation | Comportement |
| --- | --- |
| Une évaluation affichée à plusieurs endroits | Une seule donnée, plusieurs affichages. |
| Un même exercice prévu plusieurs fois | Des évaluations distinctes des mêmes critères, aux moments prévus : la même définition de critère est **placée** plusieurs fois, chaque instance est un nœud de données. |
| Des exercices différents travaillent une même compétence | Des définitions distinctes, éventuellement différentes, rapprochées par un regroupement transversal pour montrer une progression. |
| Réévaluation non prévue (rattrapage exceptionnel, correction) | **Remplacement** des notes de l'exercice ; les anciennes valeurs restent dans l'historique, visibles des formateurs. L'apprenant ne voit que l'état final. |

- **Tout est prévu dans la grille.** Les tentatives et la règle qui dit comment elles comptent (meilleure, dernière, combinaison) sont fixées avant le cours. Toutes les tentatives prévues sont créées en amont, pas ajoutées pendant le cours. Le formateur ne choisit pas au moment de la réévaluation.
- Comparer une évolution ne suppose pas des critères identiques ; l'ordre temporel des exercices suffit souvent.
- Il n'existe **aucun objet « rattrapage »** ni distinction métier entre rattrapage exceptionnel et correction de saisie.
- La vue « côte à côte » (deux instances d'une définition, ou un exercice pour plusieurs participants) est une vue ordinaire.

---

## 4. Notes, commentaires et saisie par groupe

**Décisions.**

- Pour un apprenant et un nœud de données, il existe **une seule note courante**, partagée par les formateurs. Les modifications restent dans un **journal technique** (qui, quoi, quand), à la façon d'un historique de document : il sert à comprendre un problème, il n'est pas un objet du domaine.
- **Pas d'avis multiples** par case : quand plusieurs formateurs évaluent le même apprenant, ils s'accordent et un seul saisit. Pas de jury combinant des notes par évaluateur.
- **Commentaire sur tout nœud**, y compris les nœuds de calcul. Notes et commentaires sont toujours propres à l'apprenant. Le commentaire est facultatif et peut exister sans note ; la note finale n'est pas nécessairement montrée à l'apprenant.
- **Saisie par groupe** : dans une vue de saisie d'un groupe, une colonne virtuelle « groupe » **copie** la note et le commentaire chez chaque membre, modifiable ensuite individuellement. Aucune donnée collective n'est créée ; les données individuelles restent indépendantes.

---

## 5. Cases vides, non-évaluation et exigences de remplissage

### Trois états

| État | Sens | Effet |
| --- | --- | --- |
| **Note** | L'apprenant a été évalué sur le barème. | Contribue selon les règles. |
| **Vide** | Rien n'est renseigné : case à traiter, défaut de transmission, indicateur non observable. | Exclue du calcul, sans pénalité. |
| **Non évalué** | L'équipe a examiné la situation et laisse volontairement la case sans note. | Exclue du calcul, sans pénalité. |

**Décisions.**

- « Non évalué » se pose **sur une case** ou **sur un nœud** (dispense d'un exercice entier, cas rare) ; posé sur un nœud, il s'hérite par ses feuilles. Il est **visible et distinct** d'une case à traiter (couleur ou hachures, rendu à préciser).
- Une absence de note n'est **jamais** assimilée à une mauvaise performance. Le non-rendu est une **saisie manuelle** de la pire valeur par le formateur. Le cas « vide = 0 point » de qualif1 devient une saisie manuelle.
- **Pas d'état « absent »** avec pénalité automatique. Un participant qui quitte le cours est **écarté** : statut du participant, hors de la grille, sa qualification sort du périmètre.

### Exigences de remplissage

- La grille peut déclarer des **indicateurs obligatoires** et un **nombre minimal d'indicateurs renseignés** (règle du catalogue).
- Un indicateur obligatoire exige une **note**. Le marquer « non évalué » ne satisfait pas l'exigence : l'erreur reste. Une dispense d'exercice ne lève donc pas les exigences de ses feuilles.
- Un **onglet d'erreurs** liste les exigences non satisfaites de la qualification. Les autres catégories d'erreurs à y présenter restent à préciser.
- Une erreur n'interdit pas de finaliser : il faut **accepter explicitement** (voir § 9). Cette acceptation est **indépendante du joker** et ne consomme pas son usage.

### Résultats pendant le cours

- Les résultats se calculent et s'affichent **dès que possible**, sur les cases remplies, comme dans Excel. Pas d'intervalle des possibles, pas de logique à trois valeurs.
- Un avertissement du type **« données provisoires »** reste visible (par exemple dans la navigation) tant que les exigences de remplissage ne sont pas satisfaites. Il disparaît dès qu'elles le sont, sans attendre la finalisation : des cases facultatives peuvent rester vides.
- La protection « un dossier vide ne réussit jamais » repose sur les exigences de remplissage, pas sur le moteur.

**Orientations.** Libellé, emplacement et présentation des statuts restent à préciser. La monotonie des fonctions n'est plus une contrainte du catalogue.

---

## 6. Fonctions, barèmes et conversions

### Catalogue fermé

**Décisions.**

- Les équipes **composent** leur grille à partir de fonctions, règles et barèmes fournis par l'application. **Pas de formule**, pas de fonction maison, pas de barème maison. Ce qui manque attend une version du produit.
- Méthodes explicitement souhaitées : moyenne, moyenne pondérée, décompte (au moins n « OK », n « en cours ou acquis »). D'autres restent possibles ; le catalogue précis n'est pas arrêté.
- Chaque nœud de calcul a sa méthode et ses paramètres ; des nœuds différents peuvent utiliser des règles différentes.
- Chaque chiffre reste **explicable en une phrase type**, par fonction.
- Une fonction publiée **ne change jamais de définition** ; une évolution est une nouvelle fonction (conséquence de la rejouabilité, § 9).

### Barèmes

- L'application fournit les **types de barèmes** et leurs variantes standard. L'équipe configure le nombre de paliers, leurs noms, leurs couleurs, avec des échelles et palettes par défaut. Pas de programmation de nouveaux types.
- À **poids égal, même influence** : un objectif sur 20 ne pèse pas plus qu'un objectif sur 5. Les valeurs sont rendues comparables pour la moyenne ; la convention exacte n'est pas fixée.

### Affichage et propagation

**Orientations.**

- L'équipe choisit la **présentation** à chaque nœud : un résultat peut s'afficher comme appréciation ou « OK / KO » sans montrer sa valeur numérique.
- La propagation reste **au plus près des valeurs calculées**, pour éviter les conversions dues au seul affichage. Un objectif à 3,7/5 affiché « acquis » : une moyenne suivante utilise 3,7/5, un décompte des objectifs acquis utilise son statut. La formalisation de ce qu'une fonction reçoit (valeur, statut) reste à concevoir.
- Les conversions proposent des **défauts sensés**, configurables. Un pourcentage peut être une représentation intermédiaire, mais aucun pourcentage universel n'est choisi. Une conversion dit ce qu'elle exprime : sur 1 à 5, la valeur 3 peut être 50 % de la distance entre extrêmes, ou 100 % d'atteinte si 3 est la cible. Défauts, compatibilités fonction/barème, arrondis et paramètres exposés restent à définir.

---

## 7. Joker

**Décisions.**

- L'équipe **ne peut pas écraser** un calcul. Le joker est le seul écart humain, et il est **prévu dans la grille** à la préparation : sur quels nœuds il s'applique, quelle action il porte, combien de fois il s'utilise (une fois par apprenant en règle générale).
- Son **action** est choisie dans un catalogue : amener la note d'un nœud au seuil de réussite, ajouter un point, retirer un point, imposer un échec. Favorable ou défavorable.
- Il **se propage selon les règles de la grille**, comme n'importe quelle contribution. Si l'action ne suffit pas à compenser l'insuffisance, la qualification reste échouée. Le joker n'est pas une autorisation de forcer le résultat final.
- **Justification obligatoire**, tracé, visible : un cadeau assumé pour des cas très exceptionnels, ou une sanction.
- Il est **indépendant** de l'acceptation des erreurs de remplissage.

**Orientations.** Le catalogue exact des actions et la façon dont une action sur un statut se propage par rapport à une action numérique restent à définir. La décision D20 de 10 est tranchée dans ce sens : le joker agit par une action déclarée, pas par un écart libre.

---

## 8. Grilles, copies et cours

### Le cours possède la grille

**Décisions.**

- Une grille vit **dans un cours**, couvre l'intégralité du cours (donc tous ses événements MiData), et n'est visible que de ses membres.
- La liste des participants est **toujours celle de MiData**, synchronisée au fil du cours. Pas d'ajout manuel. Un participant peut être **écarté** localement.
- **Plusieurs grilles** peuvent coexister dans un cours. Une grille est marquée **principale** pour s'afficher par défaut. Les autres peuvent être archivées ou supprimées.

### Copie partout

- **Template** : une grille créée depuis un template est une **copie indépendante**. Modifier le template ensuite ne touche pas la grille. On copie puis on personnalise, parfois en profondeur.
- **Correction en cours de route** : modifier la structure pendant le cours est rare et prudent (formulation, indicateur manquant). L'équipe **copie la grille avec toutes les notes de tous les participants**, modifie la copie, la marque principale et poursuit. La grille d'origine n'est pas modifiée sur place.
- **Bibliothèque publique** : l'équipe peut **publier** une grille, d'où tout le monde peut repartir par copie. La copie garde sa **provenance**.
- Après copie, les notes sont **indépendantes** : une saisie dans une grille ne se propage jamais dans une autre. Une copie est une nouvelle grille avec ses données, pas une variante de calcul connectée aux notes d'une autre.
- Les éléments gardent une **identité stable à travers les copies**, pour permettre une comparaison entre grilles d'une même lignée.

### Organisation faîtière

- **Pas de référentiel partagé.** Les objectifs édités par l'organisation faîtière sont un vocabulaire d'**autocomplétion et d'étiquettes** sur les nœuds, pas des références obligatoires. Elle n'impose ni ne suit les grilles. Les statistiques entre cours, si elles viennent, passeront par ces étiquettes.

**Orientations.** Le cycle de création et de publication des templates, la forme de l'autocomplétion et un éventuel outil de comparaison de grilles restent à concevoir.

---

## 9. Finalisation, réouverture et archivage

**Décisions.**

- **Tout se rejoue.** Aucun instantané de résultats : tout résultat se recalcule depuis les notes et la structure. Une attestation est reproductible tant que les données existent. Il n'est pas demandé de conserver des bilans intermédiaires figés et nommés.
- **Finalisation par apprenant**, ou par action groupée. L'export de tous les dossiers en une opération est possible.
- **Finalisation avec erreurs** : une erreur de remplissage n'interdit pas de finaliser, mais l'équipe doit cocher explicitement « ignorer les erreurs ». L'incomplétude reste affichée dans l'export ; accepter les erreurs ne les satisfait pas.
- **Réouverture** : après finalisation, l'édition reste possible tant que la grille n'est pas archivée. La réouverture est signalée clairement à l'équipe et tracée. Une nouvelle finalisation remplace la précédente ; seul le journal habituel est conservé, pas les anciens exports.
- **Archivage** : **automatique**, quelques semaines après la fin du cours, délai **paramétrable** au niveau de l'application. Après archivage, plus aucune édition.
- Les transitions (finaliser, rouvrir, archiver) sont des opérations nommées, avec auteur et date.

**Orientations.** La portée exacte d'une acceptation des erreurs dans une action groupée, et le statut de la grille dans son ensemble (brouillon, en cours, archivée) par rapport aux finalisations par apprenant, restent à préciser.

---

## 10. Vues, matrices et exports

**Décisions.**

- **Tout est vue.** Les vues standard sont **générées** depuis l'axe principal sans réglage ; les vues avancées se **composent à la conception** de la grille, par listes de choix. Pendant le cours, les formateurs utilisent ces vues et peuvent les **filtrer** (participant, groupe, exercice) pour consulter ou exporter, sans modifier leur configuration.
- Une vue appartient à la **grille** : toute l'équipe utilise les mêmes. **Pas de vue personnelle.** Les vues sont copiées avec la grille.
- **Une vue montre des nœuds, rien d'autre.** Chaque résultat affiché référence explicitement un nœud (indicateur, critère, objectif, regroupement). Les vues ne déduisent aucune règle de calcul de leur disposition.
- **Matrice libre** : une matrice est une **disposition libre de nœuds choisis**, pas un tableau croisé où chaque cellule serait l'intersection mathématique de sa ligne et de sa colonne. Un intitulé « exercices × compétences » n'impose aucun recalcul ; si une combinaison doit produire un résultat, un nœud de calcul le porte.
- **Graphiques** : les équipes veulent restituer points forts, zones à améliorer et évolutions sous plusieurs formes (matrices, graphiques), sur une ou plusieurs vues. Un graphique affiche des nœuds.
- Les **grilles intermédiaires de correction** (regrouper ce qui se corrige ensemble) sont des **vues de saisie**, pas des nœuds. L'organisation de la saisie ne crée pas de structure.
- **On exporte des vues.** La synthèse est le cas courant ; une équipe peut aussi exporter une grille avec commentaires, une vue centrée sur un objectif, ou la grille d'un seul exercice. L'**attestation** est une vue exportée : le plus souvent la synthèse, parfois complétée d'une **page officielle** (réussite du cours, texte officiel, données du participant), qui est une vue de type « document » déclarée dans la grille.
- **Pas d'espace apprenant** dans l'application pour l'instant.

**Orientations.** Les types de graphiques, les outils de composition, les formats de fichiers, la mise en page et l'assemblage de plusieurs vues dans un fichier restent à concevoir.

---

## Points ouverts

1. **Conversions et compatibilités** : conventions par défaut, valeurs associées aux paliers, normalisation entre barèmes, arrondis, paramètres exposés.
2. **Catalogue de calcul** : liste précise des fonctions, règles (dont la règle de réussite et « au moins n remplis ») et types de barèmes, avec leurs paramètres.
3. **Actions du joker** : catalogue exact, propagation des effets numériques et des statuts forcés.
4. **Conception et navigation** : bascule entre axes, forme de la vue graphe, rendu du signalement des chemins multiples, forme de l'autocomplétion depuis les objectifs de l'organisation faîtière.
5. **Données incomplètes** : rendu de « non évalué », libellé de l'avertissement, contenu de l'onglet d'erreurs, portée des acceptations groupées.
6. **Cycle de vie** : états de la grille face aux finalisations par apprenant, cycle de création et publication des templates, comparaison de grilles.
7. **Restitution** : catalogue des vues et graphiques, composition, formats d'export.

Restent en aval, inchangés par ces entretiens : le vocabulaire (D9 de 10), les droits, la correspondance des rôles MiData, la nLPD, le positionnement face à Qualix.

## Ce que ces décisions règlent dans 10 et 11

| Décision de 10 §11 | Résultat |
| --- | --- |
| D1 Expressivité | catalogue fermé |
| D2 Statut décisif | un nœud marqué décisif ; le reste est indicatif |
| D3 Afficher ici, compter ailleurs | placé / compté distincts, chemins multiples autorisés |
| D4 Défaut du vide | toujours ignoré ; obligatoire et « au moins n » protègent, avec acceptation explicite |
| D6 Tentatives | des instances d'une définition, prévues en amont ; sinon remplacement |
| D8 S'écarter de la proposition | interdit, sauf joker à action déclarée |
| D13 Reproduire l'Excel | non ; rejouer, oui |
| D16 Proposition pendant le cours | valeur courante, avertissement « provisoire » lié aux exigences |
| D20 Joker | action déclarée dans la grille, propagée normalement |
| L4 Variantes | non retenues ; une copie est une grille indépendante |
| Q2 de 11 Vues personnelles | non |
| Q11 de 11 Attestation | une vue exportée |

## Prochaine étape

Rejouer qualif1, qualif2 et qualif3 à la main dans ce modèle, puis reporter dans `FEATURES.md` (comportement) et `TODO.md` (décisions). Frictions attendues : la sphère non pénalisante de qualif2 (placé / compté), l'objectif 4.1 de qualif1 (définition placée quatre fois, regroupement transversal), le vide à 0 point de qualif1 (saisie manuelle), et le double chemin de qualif1 (compétences par exercice et par thème, désormais ordinaire).
