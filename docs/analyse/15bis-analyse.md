# Décisions issues de la discussion sur le modèle de qualification

## Source et portée

Ce document restitue les choix exprimés et précisés pendant la conversation avec le porteur du projet. La synthèse finale de cette conversation a été validée par celui-ci. Ce document est rédigé uniquement à partir de cet échange, sans nouvelle consultation des autres analyses.

Les **décisions retenues** fixent le comportement attendu. Les **orientations à approfondir** donnent une direction sans figer tous ses mécanismes. Les **points ouverts** identifient ce que la discussion n'a pas tranché. Les exemples illustrent ces choix ; ils ne constituent pas un catalogue exhaustif des fonctions à développer.

Les précisions les plus récentes remplacent les formulations antérieures lorsqu'elles les corrigent. C'est notamment le cas du joker et de la distinction entre nœuds de données et nœuds de calcul.

## 1. Intention générale : un modèle générique dès le départ

### Décisions retenues

L'intérêt d'Azimut est de permettre aux équipes de cours de prendre en charge des workflows de qualification variés. Les trois qualifications déjà présentées constituent des exemples, sans borner le modèle. D'autres cours ont des approches différentes ; l'application doit aussi permettre aux équipes d'explorer de nouvelles pratiques.

Le modèle doit donc utiliser des abstractions génériques dès le départ. La préparation des grilles en amont, les templates et les brouillons doivent faciliter la conception. La charge de configuration ne justifie pas de limiter le modèle aux trois exemples connus.

Le principe général est **convention over configuration** : proposer des choix standards efficaces pour créer une grille, tout en permettant une configuration encadrée.

### Points ouverts

- Un stockage plus plat a été évoqué comme une possibilité pour faciliter les requêtes, pas comme une décision d'architecture.
- La forme physique du stockage reste à déterminer. Le besoin de relations multiples entre nœuds ne tranche pas, à lui seul, le choix des tables ou du moteur de stockage.
- La facilité réelle de conception et la couverture d'autres workflows devront encore être explorées.

## 2. Structure : des nœuds, sans hiérarchie métier imposée

### Deux rôles fonctionnels

Le modèle distingue :

- les **nœuds de données**, qui portent les évaluations saisies ;
- les **nœuds de calcul**, qui combinent les résultats d'autres nœuds selon une règle configurée.

Les noms « sphère », « objectif », « critère » et « indicateur » relèvent du vocabulaire des cours. Ils n'imposent ni un nombre de niveaux ni une succession obligatoire.

Une grille peut ainsi suivre une organisation familière :

> Qualification → sphères → objectifs → critères → indicateurs.

Elle peut aussi se limiter à des indicateurs et une moyenne, ou adopter une autre organisation.

Les **types fonctionnels** de nœuds sont fournis par l'application. La liberté d'organisation ne signifie pas que les équipes programment de nouveaux types.

### Appréciation directe sur un regroupement

L'idée d'un même nœud portant simultanément une saisie et un calcul a été corrigée pendant l'échange.

Si un formateur veut donner une appréciation globale en complément de plusieurs critères, cette appréciation est représentée par **un nœud de données supplémentaire**. Elle entre dans le calcul parent avec sa pondération, comme les autres contributions.

### Construction progressive et repères

La conception doit permettre de partir d'un arbre familier, puis d'ajouter des critères transversaux ou de sortir certains éléments du calcul initial pour les faire compter ailleurs.

Un axe principal a été évoqué comme repère de conception et de navigation. Son caractère obligatoire, la façon de le choisir et la possibilité de basculer entre axes n'ont pas été fixés.

Une visualisation en graphe, avec nœuds et arêtes, est souhaitée pour comprendre la propagation des résultats. Sa forme et ses interactions restent à concevoir.

## 3. Placement, calcul et chemins multiples

### Placement et contribution sont distincts

Un élément peut être présenté près de l'exercice ou du moment où il est évalué, tout en contribuant à un autre regroupement de calcul.

Exemple : des critères de sécurité restent proches de leurs exercices pour faciliter la saisie, mais leur résultat peut être regroupé dans une sphère dédiée.

La même évaluation peut être affichée à plusieurs endroits sans nouvelle saisie : il s'agit alors d'une donnée partagée **à l'intérieur d'une même qualification**.

### Plusieurs lectures des mêmes évaluations

Une équipe doit pouvoir :

- saisir et naviguer par exercice ;
- restituer des résultats par compétence ;
- comparer les évaluations au fil des exercices pour montrer une évolution ;
- utiliser des regroupements transversaux pour informer l'apprenant ou pour déterminer la réussite.

Exemple : au lieu de restituer uniquement « animation d'un point de cours dans cet exercice », une synthèse peut montrer la compétence d'animation à travers plusieurs exercices.

### Plusieurs exigences décisives sont autorisées

Une même évaluation peut contribuer à plusieurs conditions de réussite.

Exemple explicitement accepté :

> Au moins 60 % dans chaque exercice **et** au moins 70 % dans la compétence animation.

Ce cas combine des conditions. Il ne constitue pas, à lui seul, un double comptage dans une moyenne.

Une moyenne globale peut également combiner des résultats d'exercices et de compétences, même si certaines évaluations l'influencent par plusieurs chemins. Ce cas est rare, mais autorisé.

Une information signalant les chemins multiples est envisagée ; son caractère systématique et son interface restent ouverts. Aucun principe d'interdiction du double comptage n'a été retenu.

Le fonctionnement courant décrit reste un seuil par sphère, transversal ou exercice, puis une réussite lorsque tous les seuils requis sont atteints. Cela ne ferme pas le catalogue aux autres combinaisons.

## 4. Évaluations répétées et progression

### Trois situations distinctes

| Situation | Comportement attendu |
| --- | --- |
| Une évaluation affichée à plusieurs endroits | Une seule donnée, plusieurs affichages. |
| Un même exercice prévu plusieurs fois | Des évaluations distinctes des mêmes critères, aux moments prévus. |
| Des exercices différents travaillent une même compétence | Des évaluations distinctes, éventuellement fondées sur des critères différents, rapprochées pour observer une progression. |

Comparer une évolution ne suppose donc pas des critères strictement identiques. La temporalité des exercices suffit souvent à organiser cette lecture.

### Tout est prévu dans la grille

Les tentatives et les règles déterminant comment elles comptent sont fixées avant le cours. Le formateur ne choisit pas au moment de la réévaluation de retenir la meilleure, la dernière ou une combinaison.

Toutes les tentatives prévues sont créées en amont. Elles ne sont pas ajoutées librement pendant le cours. Lorsqu'une répétition est prévue, tous les apprenants la réalisent généralement ; cette pratique n'a pas été érigée en obligation universelle.

### Rattrapage exceptionnel

Un rattrapage exceptionnel se traduit par le remplacement des notes de l'exercice concerné. Les anciennes valeurs restent dans l'historique habituel.

Il n'existe pas de distinction métier obligatoire entre ce remplacement et une correction de saisie. Aucun objet ou statut spécifique de « rattrapage exceptionnel » n'est demandé.

## 5. Notes, commentaires et saisie par groupe

### Une note courante

Pour un apprenant et un indicateur évalué, il existe **une seule note courante**, partagée par les formateurs. Les modifications restent dans l'historique.

Des notes distinctes par évaluateur, combinées ensuite comme dans un jury, ne sont pas demandées.

### Commentaires sur tous les nœuds

Tous les types de nœuds peuvent recevoir un commentaire, y compris les nœuds de calcul. Notes et commentaires sont toujours propres à l'apprenant.

Le commentaire est facultatif et peut exister avec ou sans note. Certains cours doivent pouvoir fonctionner avec des commentaires seuls, éventuellement accompagnés d'appréciations, sans résultat chiffré obligatoire. La note finale n'est pas nécessairement montrée à l'apprenant.

### Saisie par groupe

Certaines vues peuvent permettre de saisir une note ou un commentaire pour un groupe. Cette opération **copie la donnée chez chaque apprenant du groupe**.

Elle ne crée pas une donnée collective liée aux membres. Les données individuelles restent ensuite indépendantes.

## 6. Cases vides, non-évaluation et exigences de remplissage

### États distingués

| Situation | Sens et effet |
| --- | --- |
| Une note est présente | L'apprenant a été évalué sur le barème ; la note contribue selon les règles de calcul. |
| La case est vide | Aucune note n'est renseignée ; la case est exclue du calcul, sans pénalité. |
| La case est explicitement « non évaluée » | L'équipe a examiné la situation et laisse volontairement la case sans note ; elle est exclue du calcul, sans pénalité. |

Une absence de note peut notamment venir d'un défaut de transmission ou de l'impossibilité d'observer l'indicateur dans l'exercice. Elle ne doit pas être assimilée automatiquement à une mauvaise performance.

Le statut « non évalué » doit être visible et distinguable d'une case encore à traiter. Couleur ou hachures ont été évoquées ; le rendu exact reste ouvert.

Un état supplémentaire « absent », avec une pénalité automatique, n'a pas été retenu dans cette discussion.

### Exigences configurées dans la grille

La grille peut prévoir :

- des indicateurs obligatoires ;
- un nombre minimal d'indicateurs renseignés.

Un indicateur obligatoire exige une note. Le marquer « non évalué » ne satisfait pas l'exigence.

Un onglet doit permettre de consulter les erreurs de la qualification, notamment les exigences de remplissage non satisfaites. Les autres catégories d'erreurs à y présenter restent à préciser.

### Dispense d'un exercice

Une dispense marque l'exercice comme **non évalué** pour l'apprenant concerné. Les éléments sans note sont exclus du calcul.

La dispense **ne lève pas les exigences de remplissage**. Si des indicateurs sont obligatoires, leurs erreurs restent visibles. Il faut accepter explicitement ces erreurs pour finaliser.

### Avertissement pendant le cours

L'orientation retenue est d'afficher les résultats actuels avec un avertissement du type « données provisoires », par exemple dans la navigation.

Cet avertissement disparaît **dès que les exigences de remplissage sont satisfaites**, sans attendre la finalisation. Des cases facultatives peuvent donc rester vides sans maintenir l'avertissement.

Le libellé, l'emplacement et la présentation exacte des statuts restent à préciser. Aucun mécanisme de réussite fondée sur l'intervalle de toutes les valeurs futures possibles n'a été adopté pendant cet échange.

## 7. Fonctions, barèmes et conversions

### Catalogue fourni par l'application

Les équipes ne programment pas leurs propres fonctions. Elles composent leur grille à partir de fonctions et de règles proposées par l'application.

Les méthodes explicitement souhaitées comprennent :

- la moyenne ;
- la moyenne pondérée ;
- le décompte, par exemple un nombre minimal de « OK » ou de « en cours ou acquis ».

D'autres méthodes restent possibles. Le catalogue précis n'a pas été arrêté.

Chaque nœud de calcul possède sa méthode et les paramètres nécessaires, notamment ses poids ou ses seuils. Des nœuds différents peuvent utiliser des règles différentes.

### Types de barèmes génériques et personnalisables

L'application fournit les types de barèmes et propose leurs variantes les plus standards. Les équipes peuvent configurer :

- le nombre de paliers ;
- les noms des paliers ;
- leurs couleurs.

Des échelles et palettes par défaut facilitent la création. Il ne s'agit pas d'un système permettant de programmer librement de nouveaux types de barèmes.

La liberté de définir des correspondances numériques arbitraires n'a pas été tranchée séparément. Elle fait partie du travail restant sur les conversions.

### Affichage et propagation

L'équipe doit pouvoir choisir la présentation à chaque nœud. Un résultat final peut être une appréciation ou « OK / KO », sans nécessairement afficher sa valeur numérique.

L'orientation retenue pour la propagation est de **rester au plus près des valeurs calculées**, pour éviter les conversions inutiles dues au seul affichage.

Exemple discuté : un objectif obtient `3,7/5`, affiché « acquis ». Une moyenne suivante peut utiliser `3,7/5`, tandis qu'un décompte des objectifs acquis utilise son statut. La formalisation exacte des informations disponibles pour chaque fonction reste à concevoir.

### Barèmes différents, poids égal

À poids égal, deux contributions doivent avoir **la même influence**, quelle que soit l'étendue de leur barème.

Un objectif sur 20 ne pèse donc pas naturellement davantage qu'un objectif sur 5. Les valeurs doivent être rendues comparables pour la moyenne ; la convention exacte n'a pas été fixée.

### Conversions : orientation, pas solution définitive

Le système doit proposer des conversions sensées par défaut, avec une configuration possible. Ce point est explicitement à approfondir.

Un pourcentage peut être une représentation intermédiaire, mais **aucun pourcentage universel de propagation n'a été choisi**.

La conversion doit préciser ce qu'elle exprime. Par exemple, sur une échelle de 1 à 5, la valeur 3 peut représenter :

- 50 % de la distance entre les extrêmes ;
- 100 % d'atteinte si 3 est la cible attendue.

Ces interprétations ne sont pas équivalentes. Les defaults, les compatibilités entre fonctions et barèmes, les arrondis et les paramètres exposés doivent encore être définis.

## 8. Joker

### Règle retenue après précision

Le joker n'est pas seulement un drapeau de réussite sans effet défini sur le calcul. **Son action doit être prévue précisément dans la grille.**

Exemples discutés :

- amener la note d'un nœud au seuil de réussite ;
- ajouter un point ;
- retirer un point ;
- imposer un échec sur un nœud.

Le catalogue exact des actions reste à définir, notamment la façon dont une action sur le statut se propage par rapport à une action numérique.

### Contraintes retenues

- Un seul usage par apprenant pour l'ensemble de sa qualification.
- Application à un nœud parmi ceux autorisés par la grille.
- Action favorable ou défavorable possible.
- Justification obligatoire.
- Propagation selon les règles prévues ; si l'action ne suffit pas à compenser l'insuffisance, la qualification reste échouée.

Le joker ne constitue donc pas une autorisation générale de forcer arbitrairement le résultat final.

### Indépendance vis-à-vis des erreurs de remplissage

L'acceptation des erreurs pour finaliser une qualification incomplète est **indépendante du joker**. Elle ne consomme pas son unique usage.

## 9. Templates, copies et coexistence des grilles

### Templates

Une grille créée depuis un template est une **copie indépendante**. Une modification ultérieure du template ne se répercute pas sur cette grille.

Les brouillons et templates servent à préparer la grille avant le cours. Leur cycle détaillé de création et de publication n'a pas été discuté.

### Correction de la structure pendant un cours

Les règles sont fixées en amont. En cas d'erreur nécessitant de changer la structure, l'équipe doit pouvoir **copier la grille avec toutes les notes de tous les participants**, modifier cette copie, puis poursuivre depuis les données reprises.

Ce mécanisme permet de repartir du travail déjà réalisé, sans changer les règles de la grille d'origine sur place.

### Plusieurs grilles dans un cours

Plusieurs grilles peuvent coexister. Une grille peut être marquée **principale** pour s'afficher par défaut. Les autres peuvent être supprimées ou archivées.

Après duplication, les notes sont indépendantes. Une saisie dans une qualification ne se propage jamais dans une autre, même si les deux proviennent de la même copie.

La copie est donc une nouvelle grille avec ses données propres, pas une variante de calcul restant connectée aux notes d'une autre qualification.

## 10. Finalisation, réouverture et archivage

### Finalisation

Un état est figé uniquement à la finalisation. Il n'est pas demandé de conserver des bilans intermédiaires figés et nommés.

La finalisation est possible apprenant par apprenant ou par action groupée. L'export de tous les dossiers en une opération doit également être possible.

### Finalisation avec erreurs

Une erreur de remplissage n'interdit pas définitivement de finaliser. L'équipe doit toutefois cocher explicitement une option du type **« ignorer les erreurs »**.

L'incomplétude reste affichée dans l'export. Accepter les erreurs ne les transforme pas en exigences satisfaites.

La portée exacte d'une acceptation dans une action groupée n'a pas été précisée.

### Réouverture

Après finalisation, il doit être possible de revenir à l'édition tant que la qualification n'est pas archivée.

Une nouvelle finalisation remplace la précédente. Seul l'historique habituel des changements ou versions est conservé ; il n'est pas demandé de conserver séparément les anciens exports.

Le support technique de l'état figé, la conservation des résultats calculés et la reproductibilité du moteur restent à définir. Le choix métier ne prescrit pas encore un schéma d'instantanés ou de versions.

### Archivage

L'archivage intervient quelques semaines après le cours. **Après archivage, la qualification ne peut plus être rééditée.**

Le délai exact et le caractère manuel ou automatique de l'opération n'ont pas été fixés.

## 11. Vues, matrices et exports

### Composition lors de la conception

Les vues sont composées **lors de la conception de la grille**. Pendant le cours, les formateurs utilisent ces vues.

Ils peuvent les filtrer, par exemple par participant, groupe ou exercice, pour les consulter ou les exporter sans modifier leur configuration.

### Résultats explicitement choisis

Chaque résultat affiché référence explicitement un nœud. Il peut s'agir :

- d'un indicateur ou critère d'un exercice ;
- d'un objectif ;
- d'un regroupement plus complexe combinant plusieurs exercices.

Les vues ne déduisent pas automatiquement une nouvelle règle de calcul à partir de leur disposition.

### Matrice libre

Une matrice n'est pas nécessairement un tableau croisé strict où chaque cellule représente mathématiquement l'intersection de sa ligne et de sa colonne.

Elle constitue une **disposition libre de résultats choisis**. Chaque cellule peut afficher le nœud approprié, même si les autres cellules de la même ligne ou colonne affichent des niveaux ou des regroupements différents.

Un intitulé « exercices × compétences » n'impose donc pas de recalcul automatique par intersection. Si une combinaison particulière doit produire un résultat, ce résultat est porté par le nœud de calcul choisi pour l'affichage.

### Plusieurs formes de restitution

Les équipes souhaitent pouvoir restituer les points forts, les zones à améliorer et les évolutions sous plusieurs formes, notamment des matrices et des graphiques. Plusieurs angles peuvent figurer sur une même synthèse ou sur plusieurs vues.

Les types précis de graphiques et les outils de composition restent à concevoir.

### Export

**On exporte des vues.** La synthèse constitue le cas courant, mais une équipe peut aussi exporter une grille avec commentaires ou une vue centrée sur un objectif.

L'export n'est donc pas limité à un document final unique imposé. Les formats de fichiers, les détails de mise en page et l'assemblage de plusieurs vues dans un seul fichier n'ont pas été fixés.

## 12. Points à approfondir

La discussion a fixé les intentions et les comportements ci-dessus. Les sujets suivants restent ouverts :

1. **Conversions et compatibilités** : conventions par défaut, paramètres configurables, valeurs associées aux paliers, normalisation entre barèmes et règles d'arrondi.
2. **Catalogue de calcul** : liste précise des fonctions, conditions et types de barèmes proposés, ainsi que leurs paramètres.
3. **Actions du joker** : catalogue exact et propagation des effets numériques ou des statuts forcés.
4. **Conception et navigation** : rôle éventuel d'un axe principal, bascule entre axes, visualisation du graphe et information sur les chemins multiples.
5. **Présentation des données incomplètes** : rendu du statut « non évalué », libellé de l'avertissement, contenu de l'onglet d'erreurs et portée des acceptations groupées.
6. **Persistance** : schéma du stockage, représentation des liens, historique et support de la finalisation sans conservation des exports.
7. **Restitution** : catalogue des vues et graphiques, configuration de leur disposition et formats d'export.

Ces points ne remettent pas en cause le cadrage validé. Ils demandent une conception complémentaire, sans transformer les hypothèses techniques évoquées pendant la conversation en décisions acquises.
