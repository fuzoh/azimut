# Décisions définitives sur le modèle de qualification

## Source et portée

**Statut : référence définitive des décisions du modèle, validées avec le porteur du projet le 4 octobre 2026.**

Ce document remplace les documents 16 (Décisions consolidées) et 17 (Combinaison des analyses), ainsi que leurs sources 14 et 15bis, retirés du dépôt. Il reprend leurs décisions communes et fixe les huit arbitrages issus de leur dernière comparaison. En cas de contradiction avec une analyse antérieure, ce document fait foi.

Les décisions ci-dessous sont acquises. Les orientations et détails encore à concevoir sont explicitement identifiés ; ils ne rouvrent pas les arbitrages validés. La section 13 les rassemble, la section 14 conserve la trace des huit arbitrages finaux.

Le document fixe les comportements du modèle complet et la garantie de rejouabilité. Le schéma technique reste à concevoir dans ce cadre. Les fonctions peuvent être exposées progressivement dans le produit.

## 1. Cadrage général

Azimut doit prendre en charge des pratiques de qualification variées, au-delà des trois exemples Excel analysés. Le modèle utilise des abstractions génériques dès le départ ; le produit peut les exposer progressivement.

Les équipes préparent les grilles avant le cours, à partir de brouillons et de gabarits. Cette préparation doit permettre de partir d'une organisation familière, puis d'ajouter des regroupements transversaux. Le coût de configuration ne justifie pas de réduire le modèle aux exemples existants.

Le principe est **convention over configuration** : choix standards et valeurs par défaut utiles, avec configuration encadrée. L'application fournit les types de nœuds, les fonctions et les types de barèmes. Les équipes les composent et les paramètrent sans les programmer.

La facilité réelle de conception et la couverture de pratiques supplémentaires restent à éprouver.

## 2. Cours et participants

### Le cours porte les grilles

Un cours Azimut peut réunir plusieurs événements MiData. Chaque grille couvre le cours dans son ensemble, et plusieurs grilles peuvent y coexister.

**MiData est la source exclusive des participants.** La liste réunit les participants des événements rattachés et reste synchronisée au fil du cours. Aucun ajout manuel n'est prévu.

**Écarter un participant s'applique au cours entier, donc à toutes ses grilles.** C'est notamment le cas d'une personne inscrite dans MiData qui ne s'est pas présentée au cours, ou qui l'a quitté. Le participant écarté n'apparaît plus dans les listes et vues de qualification du cours ; il ne peut pas rester actif dans une autre grille du même cours.

Cette exclusion locale relève du statut du participant dans le cours. Elle ne modifie pas son inscription MiData et ne se traduit pas par un état de ses cases. Les règles de conservation ou de suppression de ses données restent à concevoir.

### Objectifs officiels facultatifs

Les objectifs de l'organisation faîtière servent de vocabulaire proposé, d'aide à la saisie et d'étiquettes facultatives. Ils ne constituent pas un référentiel partagé imposé auquel les éléments doivent être liés.

Chaque grille reste indépendante. L'organisation faîtière n'impose ni ne suit les grilles dans ce modèle. La forme de l'autocomplétion reste à concevoir. D'éventuelles statistiques entre cours pourraient s'appuyer sur les étiquettes ; elles ne sont pas une fonction arrêtée ici.

## 3. Graphe et réussite

### Deux rôles fonctionnels

Le modèle distingue les **nœuds de données**, qui portent les évaluations saisies, et les **nœuds de calcul**, qui combinent les résultats d'autres nœuds selon une règle configurée.

Les mots « sphère », « objectif », « critère », « indicateur » et « exercice » décrivent les usages des cours. Ils n'imposent ni une succession de types ni un nombre de niveaux. Un exercice est représenté par un nœud ; il n'ajoute pas une dimension métier séparée à la case.

Une appréciation globale saisie en complément de plusieurs critères est un **nœud de données supplémentaire**, éventuellement pondéré dans le calcul parent. Elle ne transforme pas un nœud de calcul en nœud portant simultanément une note saisie et une note calculée. Un commentaire reste possible sur les deux types de nœuds.

### Plusieurs axes de profondeur libre

Une grille peut organiser les mêmes évaluations selon plusieurs axes : exercices, compétences, thèmes ou autres regroupements. Chaque axe possède sa propre profondeur, sans niveaux imposés. Les axes secondaires peuvent comporter plusieurs niveaux de calcul.

**Un axe principal est obligatoire.** Il sert de point d'entrée pour la conception et la navigation, et de source aux vues standard. Un axe est une lecture du graphe ; il n'impose ni profondeur ni unicité de comptage. Les autres axes restent accessibles ; l'éditeur permet de passer de l'un à l'autre.

### Réussite portée par un nœud de calcul

**La réussite est portée par un nœud de calcul ordinaire, désigné comme résultat final de la grille et marqué décisif.** Ce nœud applique une règle du catalogue et référence les résultats nécessaires, sur un ou plusieurs axes. Ses dépendances, directes ou indirectes, sont les éléments qui contribuent à la réussite ; elles n'ont pas besoin d'un marquage décisif propre.

Changer l'axe principal ne change pas la décision de réussite. Un nœud qui ne contribue pas au résultat final reste indicatif : il informe l'apprenant ou montre une évolution.

Le cas courant consiste à vérifier un seuil par sphère, puis la réussite de tous les seuils requis. Le catalogue peut fournir d'autres combinaisons.

Une grille peut n'avoir aucun nœud décisif, voire aucune règle de calcul : cours formatif, commentaires seuls ou restitution sans note finale. La structure sert alors au rangement et à la présentation.

### Placement et contribution distincts

Un élément peut être affiché près de l'exercice où il est évalué et contribuer à un autre regroupement de calcul. Être placé à un endroit n'implique pas d'y être compté.

Une même évaluation affichée à plusieurs endroits reste une seule donnée à l'intérieur de la qualification. Une modification est visible dans tous ses affichages.

Les regroupements servant uniquement à organiser la correction sont des vues de saisie. Ils n'exigent pas de créer des nœuds de calcul.

### Chemins multiples autorisés et signalés

Une même évaluation peut contribuer à plusieurs exigences, par exemple :

> Chaque exercice atteint 60 % et la compétence animation atteint 70 %.

Combiner ces conditions ne constitue pas, à lui seul, un double comptage numérique.

Une même note peut aussi influencer plusieurs fois une moyenne ou une somme par des chemins différents. Par exemple, une moyenne globale combine un résultat d'exercice et un résultat de compétence qui utilisent la même note.

**Les deux usages sont autorisés et systématiquement signalés, sans confirmation obligatoire :**

- une évaluation contribue à plusieurs conditions ou exigences de réussite distinctes ;
- une évaluation influence plusieurs fois un même résultat numérique par des chemins différents.

Le signalement apparaît dans l'éditeur et dans la vue graphe, à titre informatif. Il ne bloque aucun de ces usages. Sa forme visuelle reste à concevoir.

Une vue du graphe de propagation, avec nœuds et arêtes, fait partie du produit. Elle doit aider à comprendre les dépendances et les résultats. Les dépendances de calcul doivent rester sans cycle ; cette contrainte ne prescrit pas un moteur de stockage particulier.

## 4. Évaluations répétées

### Définition et occurrence évaluée

Une même définition de critère peut être utilisée dans plusieurs exercices. Chaque occurrence à évaluer porte ses propres notes par participant. Une case correspond à **un participant et une occurrence évaluée** ; le simple réaffichage de cette occurrence ne crée pas une nouvelle case.

Deux critères proches, visant la même compétence avec des formulations différentes, restent deux définitions distinctes. Un regroupement transversal permet de rapprocher leurs résultats.

La temporalité est portée par les exercices ou occurrences prévus dans la grille. Aucune dimension supplémentaire « contexte » ou « tentative » n'est requise sur la case pour exprimer ces situations ; leur représentation technique reste ouverte.

| Situation | Comportement retenu |
| --- | --- |
| Même évaluation affichée plusieurs fois | Une seule donnée, plusieurs affichages. |
| Même exercice prévu plusieurs fois | Occurrences et évaluations distinctes, préparées en amont. |
| Exercices différents travaillant une même compétence | Évaluations distinctes, rapprochées pour lire la progression. |
| Correction ou rattrapage exceptionnel du même exercice | Remplacement des notes courantes ; anciennes valeurs conservées dans l'historique. |

### Répétitions préparées en amont

Toutes les tentatives prévues sont créées avant le cours dans la grille. Les règles déterminant comment elles comptent sont également fixées en amont : meilleure, dernière ou combinaison. Le formateur ne choisit pas une autre règle au moment d'une réévaluation.

Ces choix s'appliquent aux occurrences membres d'un regroupement. Ils n'exigent pas une famille de tentatives séparée. Dans la grille courante, une réévaluation imprévue remplace les notes ; elle ne crée pas une tentative supplémentaire.

**Modifier la grille entière est une opération distincte.** L'équipe peut copier la grille complète avec les données de tous les participants, ajouter des occurrences ou changer ses règles, puis poursuivre la qualification dans cette nouvelle grille modifiée. Cette refonte suit le mécanisme de copie de la section 9. Elle est compatible avec la règle de remplacement des notes dans une grille inchangée.

Une répétition peut concerner tous les apprenants, sans que cette pratique soit imposée universellement. Comparer une progression ne suppose pas des critères strictement identiques ; l'ordre temporel des exercices peut suffire.

### Correction et rattrapage exceptionnel

Un rattrapage exceptionnel remplace les notes de l'exercice concerné. Aucun objet ni statut métier spécifique n'est requis pour le distinguer d'une correction de saisie.

L'historique des corrections est consultable par les formateurs. La restitution à l'apprenant présente l'état final, sans imposer l'affichage de cet historique. La visibilité spécifique des ajustements par joker reste obligatoire, comme décrit en section 8.

Les comparaisons côte à côte entre occurrences ou entre participants sont des vues ordinaires.

## 5. Saisie des notes et commentaires

### Une note courante par case

Une case porte une seule note courante, partagée par les formateurs, et peut recevoir un commentaire. Plusieurs formateurs s'accordent sur l'évaluation ; leurs avis séparés ne sont pas enregistrés puis agrégés comme dans un jury.

Les modifications restent dans un historique permettant de savoir qui a changé quoi et quand. Cet historique sert à retrouver et comprendre les changements ; il ne constitue pas une collection d'évaluations concurrentes.

### Commentaires sur tous les nœuds

Les nœuds de données et de calcul peuvent recevoir un commentaire propre à chaque apprenant. Le commentaire est facultatif et peut exister sans note.

Les cours fonctionnant avec des commentaires seuls, éventuellement accompagnés d'appréciations, sont pris en charge. Aucun résultat chiffré final ni son affichage à l'apprenant ne sont obligatoires.

### Saisie par groupe

Une vue peut permettre de saisir une note ou un commentaire pour un groupe. L'opération copie la donnée dans les cases de ses membres, ensuite modifiables individuellement.

Il n'existe pas de note collective restant liée aux membres. Une colonne virtuelle « groupe » dans une vue de saisie est une présentation possible de ce raccourci, sans imposer sa forme précise.

## 6. Remplissage et résultats courants

### Trois états

| État | Sens | Effet sur le calcul |
| --- | --- | --- |
| **Note** | Une note est renseignée sur le barème, sans dispense applicable. | Contribution selon les règles de la grille. |
| **Vide** | Case encore à traiter, sans note. | Exclue du calcul, sans pénalité. |
| **Non évalué** | Situation examinée ; évaluation volontairement exclue, avec ou sans note antérieure conservée. | Exclue du calcul, sans pénalité. |

« Vide » et « non évalué » doivent être distinguables visuellement. Le rendu exact reste ouvert.

### Dispense sur une case ou un regroupement

Une dispense utilise **« non évalué »**, sans état supplémentaire « non applicable » ou « dispensé ». Pour un apprenant, elle peut viser une case ou **n'importe quel regroupement**, notamment un exercice, un objectif ou une sphère. Posée sur un nœud, elle s'hérite par ses feuilles.

**Les notes déjà présentes sont conservées, mais ne comptent plus lorsqu'elles sont couvertes par la dispense.** Elles peuvent rester affichées à titre indicatif, avec leur exclusion du calcul visible. La dispense n'efface donc pas la saisie antérieure ; elle change sa prise en compte.

Les résultats utilisent uniquement les contributions encore actives, sans pénalité automatique pour les éléments dispensés.

Aucun état « absent » avec pénalité automatique n'est prévu. Si un non-rendu doit être pénalisé, le formateur saisit manuellement la valeur appropriée, notamment la pire valeur du barème. Le vide ne se transforme jamais automatiquement en zéro ou en mauvaise note.

### Exigences de remplissage

La grille peut déclarer des indicateurs obligatoires et un nombre minimal d'indicateurs renseignés. « Obligatoire » est une exigence sur l'élément, pas un état de case.

Un indicateur obligatoire exige une note active. « Non évalué », y compris au titre d'une dispense avec note antérieure conservée à titre indicatif, ne satisfait pas cette exigence. Une dispense ne lève pas les exigences de remplissage de ses feuilles.

Un onglet permet de consulter les erreurs de la qualification, notamment les exigences non satisfaites. Les autres catégories d'erreurs restent à préciser.

### Résultats actuels et avertissement

Les résultats se calculent dès que possible sur les notes présentes et non dispensées, comme dans un tableur. Le moteur n'utilise ni intervalle des valeurs futures possibles ni logique à trois valeurs pour décider si une réussite est déjà certaine. La protection contre un dossier vide déclaré réussi repose sur les exigences de remplissage, pas sur le moteur.

**Un avertissement de données provisoires reste visible tant que les exigences de remplissage sont insatisfaites.** Il disparaît dès qu'elles sont satisfaites, sans attendre la finalisation. Des cases facultatives vides ne le maintiennent pas.

L'absence d'avertissement ne signifie donc pas que le dossier est verrouillé ou que ses notes ne pourront plus évoluer. Complétude, résultat courant et finalisation restent distincts.

### Finaliser malgré des erreurs

L'équipe peut finaliser un dossier incomplet après **acceptation explicite des erreurs de remplissage**. Cette acceptation :

- ne transforme pas les exigences en exigences satisfaites ;
- ne supprime pas l'avertissement d'incomplétude ;
- laisse l'incomplétude visible dans l'export ;
- ne consomme aucun joker et ne modifie pas le résultat calculé.

La portée exacte de cette acceptation dans une finalisation groupée reste à définir. Cette dérogation concerne le remplissage ; elle ne définit pas un droit général à ignorer toute erreur technique ou toute incohérence de calcul.

## 7. Calcul et barèmes

### Catalogue fermé et paramétrable

L'application fournit les fonctions, conversions, règles et types de barèmes. Les équipes choisissent leurs paramètres sans écrire de formules libres ni programmer de nouveaux types. Un besoin hors catalogue attend une évolution du produit.

Les méthodes souhaitées comprennent la moyenne, la moyenne pondérée et le décompte, par exemple un nombre minimal de « OK » ou de « en cours ou acquis ». Chaque nœud de calcul possède sa méthode et ses paramètres, notamment poids ou seuils. Des nœuds différents peuvent suivre des règles différentes.

Le catalogue exact reste à définir. Les fonctions non monotones ne sont pas exclues par principe : le calcul sur les valeurs courantes n'impose pas la monotonie.

Chaque résultat doit être explicable par une phrase type propre à sa fonction et par sa chaîne de calcul.

**Une fonction publiée ne change jamais de définition.** Toute évolution introduit une nouvelle fonction ; les grilles existantes conservent celle qu'elles utilisent. Cette immuabilité garantit la rejouabilité définie en section 10.

### Barèmes personnalisables

L'application fournit les types de barèmes et leurs variantes usuelles. Les équipes peuvent configurer le nombre de paliers, leurs noms et leurs couleurs. Des échelles et palettes par défaut facilitent la préparation.

La liberté de définir des correspondances numériques arbitraires reste ouverte dans le travail sur les conversions. Personnaliser les libellés d'un barème ne signifie pas programmer un nouveau type.

### Présentation et propagation

L'équipe choisit la présentation des résultats à chaque nœud. Une appréciation ou « OK / KO » peut être affiché sans montrer la valeur numérique.

**Orientation retenue :** rester au plus près des valeurs calculées pour éviter qu'un choix d'affichage n'introduise des conversions inutiles. Par exemple, un résultat de `3,7/5` affiché « acquis » peut transmettre `3,7/5` à une moyenne, tandis qu'un décompte des objectifs acquis utilise son statut.

Les informations disponibles pour chaque fonction et leurs compatibilités restent à formaliser.

### Influence comparable à poids égal

À poids égal, deux contributions doivent avoir la même influence, quelle que soit l'étendue de leur barème. Un objectif sur 20 ne doit pas peser davantage qu'un objectif sur 5 du seul fait de son échelle.

Les valeurs doivent donc être rendues comparables. La convention de normalisation n'est pas encore choisie.

### Conversions encore à concevoir

Le système doit proposer des conversions cohérentes par défaut, avec configuration encadrée. Aucun pourcentage universel de propagation n'est imposé.

Sur une échelle de 1 à 5, la valeur 3 peut représenter 50 % de la distance entre les extrêmes ou 100 % d'atteinte d'une cible fixée à 3. Ces interprétations ne sont pas interchangeables.

Les conventions, arrondis, paramètres exposés, valeurs associées aux paliers et compatibilités entre fonctions et barèmes restent ouverts.

## 8. Joker et propagation de son influence

### Action prévue par la grille

Le joker applique une action définie avant le cours, sur un nœud autorisé. Cette action peut être favorable ou défavorable et agir sur une valeur ou un statut.

Les exemples envisagés comprennent : amener au seuil de réussite, ajouter un point, retirer un point ou imposer un échec. Le catalogue exact et la propagation des actions portant seulement sur un statut restent à définir.

**Une action numérique modifie la valeur effective utilisée par les calculs suivants.** Par exemple, si un objectif vaut `2,5/5`, avec seuil à `3/5`, un joker « remonter au seuil » produit une valeur effective de `3/5`. La moyenne suivante utilise `3/5`.

Le joker n'autorise pas à remplacer arbitrairement un calcul ou à garantir la réussite finale. Si son effet ne suffit pas, la qualification reste échouée selon les règles de la grille.

### Quota et traçabilité

**Le quota est configurable par grille, avant le cours, pour chaque apprenant.** Il n'est pas limité universellement à un seul usage.

Chaque application exige une justification et conserve auteur, date, nœud concerné et action appliquée. La valeur initiale, l'ajustement et la valeur effective restent consultables. L'effet du joker ne doit pas effacer l'information d'origine.

### Signalement local et en aval

Le signalement est propagé :

- nœud directement modifié : **« joker appliqué »** ;
- résultats en aval influencés : **« influencé par un joker »**, avec accès à l'origine et au détail de l'ajustement.

Cette visibilité doit permettre de comprendre l'effet jusqu'à la synthèse. Elle fait partie de la restitution du résultat, pas seulement d'un historique technique.

L'acceptation d'erreurs de remplissage reste indépendante du quota et de l'usage des jokers.

## 9. Gabarits et copies

### Gabarits indépendants et bibliothèque publique

Un gabarit est une grille copiée puis personnalisée, éventuellement en profondeur. Modifier le gabarit ne modifie jamais les grilles déjà créées depuis celui-ci.

Une grille de cours est privée aux membres du cours. L'équipe peut publier sa **structure sans données d'apprenants** dans une bibliothèque publique. Chacun peut repartir de cette structure ; la copie conserve sa provenance et devient indépendante.

Le cycle détaillé des brouillons, gabarits et publications reste à concevoir.

### Changer la grille de calcul exige une copie

Les règles sont préparées avant le cours. Une reconfiguration de la grille de calcul en cours de formation exige une copie complète de la structure avec les données de tous les participants, notamment notes et commentaires, ainsi que les définitions de vues associées.

La copie permet de modifier la structure, de la marquer principale puis de poursuivre la qualification dans cette nouvelle grille avec les données reprises. Cela comprend l'ajout d'un indicateur, d'une occurrence ou une modification des règles de calcul. Les correspondances entre éléments doivent rester stables et traçables à travers les copies pour reprendre correctement les notes et permettre une éventuelle comparaison. Cela n'impose ni des identifiants physiques identiques ni un partage des données entre copies.

### Grilles coexistantes

**Copier ne fige pas l'originale.** Originale et copie restent utilisables indépendamment, sous réserve de leurs propres états de finalisation et d'archivage.

Une grille principale sert d'affichage par défaut dans le cours. Les autres peuvent être archivées ou supprimées. Les règles détaillées de suppression et de conservation restent hors des arbitrages de cet entretien.

Après copie, une saisie dans une grille ne se propage jamais dans l'autre. Il ne s'agit pas de variantes de calcul connectées aux mêmes notes.

Un journal fin des modifications de structure n'est pas exigé. Un outil de comparaison de grilles reste éventuel.

L'**axe principal** organise la navigation à l'intérieur d'une grille ; la **grille principale** désigne celle affichée par défaut dans le cours. Aucun des deux choix ne modifie à lui seul les règles de réussite.

## 10. Cycle de vie des qualifications

### Finalisation par apprenant

La préparation se fait en brouillon, puis les évaluations sont saisies pendant le cours. **La finalisation se fait par apprenant**, avec une action groupée possible.

Un dossier finalisé est verrouillé tandis que les autres peuvent rester en cours. Les erreurs de remplissage exigent l'acceptation explicite décrite en section 6.

Les résultats finalisés doivent rester **stables et consultables**, jusqu'à une éventuelle réouverture explicite. Aucun bilan intermédiaire figé et nommé n'est exigé avant finalisation.

### Réouverture avant archivage

Un dossier finalisé peut être rouvert pour correction tant qu'il n'est pas archivé. La réouverture est signalée à l'équipe et tracée. Les transitions conservent leur auteur et leur date.

Une nouvelle finalisation remplace la précédente. L'historique habituel des changements est conservé ; conserver séparément tous les anciens exports n'est pas demandé.

### Archivage automatique ou manuel

Un délai d'archivage est proposé par défaut après le cours. **Ce délai reste configurable par cours et déclenche l'archivage automatique. L'archivage manuel reste également possible.**

La durée par défaut n'est pas fixée. Après archivage, aucune réédition n'est possible ; les résultats restent consultables.

L'articulation détaillée entre archivage du cours, des grilles coexistantes et des dossiers individuels reste à concevoir, notamment si certains dossiers ne sont pas finalisés à l'échéance.

### Rejouabilité intégrale et cache éventuel

**Tout résultat se recalcule depuis les données sources et la structure de la grille, avec les fonctions publiées immuables qu'elle utilise.** Les données sources comprennent les notes, états de non-évaluation et actions de joker nécessaires au calcul. Une attestation reste reproductible tant que les données nécessaires existent.

**Aucun instantané de résultats ne sert de référence pour leur conservation.** La finalisation verrouille le dossier ; la consultation de ses résultats reste fondée sur leur rejouabilité.

Un **cache de résultats est possible** pour accélérer le calcul ou la consultation. Il reste dérivé des données sources, supprimable et entièrement reconstructible. Il doit restituer le même résultat que le recalcul et ne remplace ni les sources ni les fonctions nécessaires à ce recalcul.

La stratégie de cache reste un choix technique. La rejouabilité intégrale, l'immuabilité des fonctions publiées et la stabilité des résultats finalisés sont des décisions acquises.

## 11. Vues et exports

### Vues communes à l'équipe

Les vues standard sont générées depuis l'axe principal, sans réglage ; les vues avancées se composent par des choix proposés. Les définitions de vues appartiennent à la grille de qualification et sont partagées par l'équipe. Elles sont copiées avec la grille. Aucune vue personnelle enregistrée n'est prévue.

**Les vues peuvent être adaptées pendant le cours sans copier la grille**, à la manière des filtres et présentations d'un tableau Excel : filtrer, rechercher, masquer, ajouter une colonne affichant des nœuds existants, réordonner ces nœuds ou créer une vue à partir d'eux.

Ces adaptations changent la présentation et la sélection des données affichées. **Elles ne reconfigurent jamais l'architecture de calcul** : aucun nouveau nœud de calcul, changement de dépendances, de règle ou de pondération n'est créé implicitement par une vue. Toute reconfiguration du calcul passe par une copie de la grille.

### Chaque résultat référence un nœud

Une vue présente des nœuds et leurs résultats, avec leur chaîne de calcul. Sa disposition ne crée ni nouvelle règle ni résultat implicite.

Les formes retenues comprennent tables, listes, graphe de propagation, **matrices libres et graphiques**. Ces deux dernières formes font partie du périmètre ; leurs types précis et outils de composition restent à concevoir.

Une matrice libre place dans chaque cellule le résultat d'un nœud choisi. Les cellules d'une même ligne ou colonne peuvent référencer des niveaux ou regroupements différents.

Un titre « exercices × compétences » n'impose pas un recalcul automatique à chaque intersection. Si une combinaison doit produire un résultat propre, un nœud de calcul doit le porter. Même principe pour les graphiques : les résultats représentés proviennent de nœuds identifiés.

Les vues doivent permettre de restituer points forts, difficultés et évolutions, éventuellement sous plusieurs angles dans une même synthèse.

### Exporter les vues

**Toute vue est exportable en document** : synthèse, exercice, objectif, grille avec commentaires ou autre restitution. L'export de tous les dossiers en une opération est également prévu.

L'attestation est une vue exportée. Une page officielle, avec texte de réussite et données du participant, peut être une vue de type document déclarée dans la grille.

L'incomplétude acceptée lors de la finalisation reste visible dans l'export. Les résultats influencés par un joker conservent leur signalement dans la restitution.

Les formats de fichiers, détails de mise en page et assemblages de plusieurs vues dans un fichier restent à définir. Aucun espace apprenant dans l'application n'est prévu pour l'instant.

## 12. Conception technique dans le cadre des décisions

**La rejouabilité intégrale et l'immuabilité des fonctions publiées contraignent la conception technique.** Le recours éventuel à un cache doit respecter la section 10.

Les autres prescriptions techniques des analyses antérieures restent des pistes à évaluer. Cela concerne notamment les tables d'appartenances, de cases, d'historique et de jokers, le moteur de stockage et l'organisation du client.

Les exigences à préserver sont les comportements décrits dans ce document : relations multiples entre nœuds, placement distinct du calcul, historique des changements, correspondances stables entre éléments, copies indépendantes, calculs explicables et stabilité des résultats finalisés.

Le besoin de requêtes selon plusieurs dimensions ne prescrit pas un store client particulier. Le besoin d'historique ne prescrit pas un schéma de tables. Un stockage plus plat reste une piste, pas un choix arrêté.

## 13. Points restant ouverts

Les points ci-dessous demandent une conception complémentaire ; ils ne remettent pas en cause les décisions précédentes.

1. **Calcul et barèmes** : catalogue précis, paramètres, conventions de conversion, normalisation à poids égal, valeurs associées aux paliers, arrondis et compatibilités entre fonctions.
2. **Jokers** : catalogue d'actions, propagation d'un statut forcé, règles de combinaison de plusieurs usages et rendu visuel du signalement jusqu'à la synthèse.
3. **Remplissage** : rendu de « non évalué » et des notes conservées à titre indicatif, contenu complet de l'onglet d'erreurs, libellé de l'avertissement et portée de l'acceptation groupée.
4. **Navigation et vues** : interactions du graphe, rendu des deux signalements de chemins multiples, catalogue de graphiques, outils de composition des matrices et d'adaptation des vues.
5. **Cycle de vie** : durée d'archivage par défaut, articulation des périmètres d'archivage, traitement des dossiers non finalisés à l'échéance et devenir des états lors d'une copie.
6. **Gabarits et publication** : cycle des brouillons et publications, forme de l'autocomplétion des objectifs officiels ; comparaison de grilles éventuelle.
7. **Exports et conservation** : formats, mise en page, assemblage des vues et mise en œuvre de la rejouabilité, sans exiger la conservation des anciens exports.
8. **Architecture** : schéma de stockage, représentation des liens et identités, historique, moteur de calcul, cache éventuel et organisation du client, dans le respect des garanties fixées.
9. **Sujets hors entretien** : vocabulaire produit définitif, droits, correspondance des rôles MiData, protection des données, suppression ou anonymisation et positionnement face à Qualix.

## 14. Arbitrages finaux validés

Ces huit arbitrages fixent les écarts entre les documents 16 et 17. Ils sont intégrés dans les sections précédentes.

| Point | Décision définitive |
| --- | --- |
| 1. Conservation des résultats | Choix de 16 : recalcul intégral, aucun instantané de référence, fonctions publiées immuables. Cache dérivé et reconstructible possible. |
| 2. Archivage | Choix de 17 : délai proposé par défaut, configurable par cours ; archivage automatique et manuel. Durée par défaut encore à fixer. |
| 3. Réussite | Nœud de calcul ordinaire désigné comme résultat final et marqué décisif ; ses dépendances contribuent à la réussite. Choix indépendant de l'axe principal. |
| 4. Dispense | Possible sur une case ou n'importe quel regroupement, héritée par ses feuilles. Notes déjà saisies conservées, exclues du calcul et affichables à titre indicatif. |
| 5. Vues pendant le cours | Adaptation et création à partir de nœuds existants permises sans copie ; aucune reconfiguration de l'architecture de calcul par une vue. |
| 6. Tentatives et refonte | Dans une grille inchangée, tentatives préparées en amont et réévaluation imprévue par remplacement. Une copie complète permet de modifier la grille, puis de poursuivre la qualification dans cette nouvelle grille. Les deux règles coexistent. |
| 7. Participant écarté | Exclusion locale au niveau du cours entier ; le participant n'apparaît plus dans ses listes et vues de qualification, toutes grilles confondues. |
| 8. Chemins multiples | Signalement systématique des contributions à plusieurs exigences distinctes et des influences multiples sur un même résultat numérique ; usages autorisés, sans blocage ni confirmation obligatoire. |
