# Azimut — fonctionnalités

Ce document décrit le domaine et le comportement attendu. Il ne décrit pas le code.

> Ce document est encore une ébauche. Le domaine sera détaillé dans une prochaine session de grill, à partir d'exemples de qualifications réelles.

## Contexte

Azimut permet à l'équipe d'un cours de formation scout de créer la qualification du cours, puis de la remplir pour chaque apprenant pendant le cours. Plusieurs formateurs saisissent en même temps sur les qualifications du même cours.

## Vocabulaire (provisoire)

| Terme | Sens |
| --- | --- |
| **Cours** | Une session de formation donnée à un endroit. Plusieurs cours peuvent avoir lieu en même temps à des endroits différents. |
| **Apprenant** | Une personne qui suit un cours et dont on évalue la qualification. |
| **Formateur** | Une personne de l'équipe d'un cours. Elle remplit les qualifications des apprenants de ce cours. |
| **Équipe de cours** | L'ensemble des formateurs d'un cours. |
| **Qualification** | L'arbre d'évaluation utilisé dans un cours. ⚠️ Le terme désigne aujourd'hui à la fois la *structure* (l'arbre) et les *données remplies* pour chaque apprenant. Il faudra deux termes distincts. |
| **Indicateur** | Le niveau le plus fin de l'arbre. C'est là qu'on met une note et un commentaire. |
| **Critère, objectif, sphère** | Les niveaux de regroupement habituels, de l'indicateur vers la racine : indicateur → critère → objectif → sphère. Chaque niveau agrège celui du dessous. |
| **Échelle** | L'ensemble des valeurs possibles d'une note, par exemple ok/ko, ++/+/-/--, 1 à 5 ou 1 à 10. |
| **Seuil** | Une valeur minimale à atteindre, sur une échelle ou dans une agrégation. |
| **Agrégation** | Le calcul qui produit le résultat d'un niveau à partir de ses enfants : moyenne, pourcentage de réussite, seuil minimum… |
| **Commentaire de synthèse** | Le commentaire qui résume, à un niveau donné, les niveaux du dessous. |
| **Groupe** | Un sous-ensemble des apprenants d'un cours, par exemple un groupe d'évaluation. |
| **Joker** | Un mécanisme utilisé lors de la finalisation. Les règles restent à préciser. |
| **Exercice, rendu** | Une activité ou un livrable évalué : une randonnée, un point de cours filmé, un concept de sécurité… Selon le modèle, c'est le niveau du dessus (à la place de la sphère), un objectif, ou seulement un libellé. ⚠️ Provisoire, à préciser. |
| **Thème** | Un regroupement transversal de critères pris dans plusieurs exercices ou objectifs, par exemple « Animation et transmission ». ⚠️ Provisoire. |
| **Critère éliminatoire** | Un motif binaire (OUI/NON) qui peut faire échouer le cours, quels que soient les résultats : plagiat, absences, mise en danger… Il exige une justification. |
| **Posture** | Une grille d'observation du comportement, notée et commentée, qui n'entre pas dans le résultat. ⚠️ Concept ou simple regroupement indicatif ? À décider. |
| **Référentiel, regroupement, règle de décision, observation** | Des termes candidats pour généraliser l'arbre (voir « Piste de généralisation »). ⚠️ Non adoptés. |
| **Verrou** | La réservation temporaire d'une cellule par le formateur qui est en train de la modifier. |
| **Figer** | Rendre une qualification non modifiable : la structure avant le cours, puis les données à la fin. |

## Structure d'une qualification

- On crée une qualification **entièrement dans l'application**, à partir de primitives.
- C'est un **arbre** :
  - Les feuilles sont les indicateurs, notés et commentés.
  - Chaque nœud au-dessus produit un résultat calculé à partir de ses enfants. **Il y a toujours un résultat calculé.**
- Chaque nœud peut avoir un commentaire de synthèse.
- **Échelles :**
  - Plusieurs échelles cohabitent dans une même qualification. Les branches de l'arbre n'utilisent pas toutes la même.
  - Il faut trouver une généralisation qui couvre tous les types d'échelle : binaire, symbolique ordonnée, numérique.
  - On doit pouvoir **convertir d'une échelle à l'autre** quand on agrège des enfants notés sur des échelles différentes.
  - Les seuils varient selon les parties de l'arbre.
- **Recalcul :** le comportement attendu est celui d'un tableur. Quand une note change, seuls les résultats qui en dépendent sont recalculés, pas l'arbre entier.

## Cycle de vie

1. **Préparation :** la qualification est créée avant le cours, puis sa structure est figée.
2. **Pendant le cours :** les formateurs remplissent les indicateurs et les commentaires.
   - La structure peut quand même changer en cours de route, par exemple quand on supprime un indicateur. L'effet sur les données déjà saisies reste à définir.
   - On peut **copier une qualification au milieu du cours, avec les données des apprenants**, pour tester un changement et comparer les résultats.
3. **Finalisation (dernier soir) :** l'équipe reformule les commentaires, rédige un commentaire général et utilise éventuellement un joker.
4. **Clôture :** la qualification est figée, puis imprimée ou exportée en PDF.

## Acteurs et accès

- Pour l'instant, l'application est **réservée aux formateurs**. Les apprenants n'y ont pas accès.
- Un formateur ne voit **que les cours auxquels il participe**, et seulement les qualifications des apprenants de ces cours. Il n'a jamais accès aux autres cours.
- Les droits dépendent de deux choses : le **rôle** de la personne et le **cours** auquel elle participe.
- À affiner : les groupes d'évaluation, le formateur référent d'un apprenant, et les autres mécanismes internes au cours.

## Connexion

- **Production :** SSO avec la base de données scoute suisse (MiData, [db.scout.ch](https://db.scout.ch)). C'est aussi d'elle que viennent les cours auxquels un formateur participe, avec son rôle dans chaque cours.
- **Développement et tests :** des comptes locaux.
- **Rôles de cours qui existent dans MiData :** Kursleiter·in (qui a le droit de qualifier), Klassenlehrer·in, Referent·in, Kurshelfer·in, Küche, Participant et LKB. Il reste à décider comment ils correspondent aux droits dans Azimut.

## Vues de saisie

Le même arbre de qualification se consulte sous plusieurs angles :

- **Par apprenant :** toutes les sphères et tous les indicateurs d'un apprenant.
- **Par sphère :** une sphère pour tous les apprenants du cours.
- **Par sphère et par groupe :** une sphère, avec tous ses indicateurs, pour les apprenants d'un groupe.

## Projections et visualisations (à discuter)

Une qualification est un système d'évaluation. Stocker les données ne suffit pas : la façon de les voir et de les manipuler dépend de la personne et du moment. Il faut un modèle de données assez souple pour le **projeter** vers des vues différentes. Les vues de saisie ci-dessus n'en sont qu'un cas particulier.

Exemples de projections attendues :

1. **Évaluer un exercice de groupe** (ex. une randonnée) : seulement les critères et indicateurs de cet exercice, et seulement les apprenants du groupe évalué.
2. **Préparer un retour à un apprenant que je suis** (ex. sur ses capacités d'organisation) : tous les objectifs, critères et indicateurs liés à ce thème, avec les commentaires.
3. **Évaluer une activité rendue individuellement** par tous les apprenants : les critères et indicateurs en lignes, les apprenants en colonnes. Soit un apprenant à la fois avec des flèches, soit tous avec du défilement horizontal.
4. **Voir si un apprenant a réussi son cours**, sous plusieurs angles :
   - une liste avec la moyenne par sphère et le rappel des notes de chaque objectif ;
   - une matrice avec les rendus en colonnes et les thèmes en lignes, pour voir l'évolution d'un rendu à l'autre ;
   - une partie calculée par thème qui fait office de seuil de réussite, complétée par des moyennes pour certains types de critères.
5. **Voir l'état de tout le cours** : où en sont les apprenants, s'il y a des disparités, quels indicateurs manquent.

Indicateurs de suivi et statistiques attendus :

- le nombre d'indicateurs pas encore remplis ;
- le nombre d'indicateurs sans commentaire ;
- des statistiques par apprenant : écart type des notes, évolution au fil du cours, etc.

Ces exemples font apparaître des axes qui ne sont pas dans l'arbre sphère → objectif → critère → indicateur : l'**exercice** ou le **rendu**, le **thème**, le **type de critère**, le **temps**. Un même indicateur semble appartenir à plusieurs de ces axes à la fois.

## Analyse de trois qualifications réelles (2026-10-03)

Trois modèles Excel vierges, nommés qualif1, qualif2 et qualif3, ont été analysés. Ils viennent de `.scratch/`, qui n'est pas versionné. Le constat est que **l'arbre seul ne suffit pas**. Il y a en général un arbre principal qui sert au calcul du résultat, plus d'autres regroupements, utilisés soit dans le calcul soit seulement à titre indicatif.

### Ce qui est commun

- **Un classeur par apprenant**, dupliqué pour chaque personne. Il n'y a jamais de matrice apprenants × indicateurs.
- Une feuille de **Synthèse**, une feuille par grand regroupement, une feuille de **critères éliminatoires** et une feuille imprimable (attestation).
- Les lignes forment l'arbre. Les colonnes contiennent le poids, la note, la moyenne calculée et le commentaire.
- Les termes objectif, critère et indicateur se retrouvent partout. Le niveau du dessus est une **sphère** (qualif2, qualif3) ou un **exercice** (qualif1).
- **Case vide = non observé.** Une case vide est exclue des moyennes. Seule exception : en ok/ko, une case vide compte comme « non ».
- L'identité des nœuds est fragile. Les liens passent par des recherches sur le code ou le préfixe du libellé, et certaines plages et lignes sont codées en dur. On trouve des formules cassées et une sphère oubliée dans la règle finale (qualif2). **Il faut des identifiants stables et des règles déclaratives.**

### Les trois modèles

| | qualif1 | qualif2 | qualif3 |
| --- | --- | --- | --- |
| Niveau du dessus | 7 exercices (rendus) | 4 sphères + Posture | 3 sphères + Posture |
| Taille | ~24 objectifs, 50 critères, 156 indicateurs | ~17 objectifs, ~49 critères, ~290 indicateurs | 15 objectifs, 45 critères, 219 indicateurs |
| Échelle des indicateurs | points de 0 à un poids (toujours 1) | 1 à 5 **et** o/k mélangés dans une même sphère | 1 à 5 |
| Agrégation | somme des points / points possibles, à chaque niveau | o/k → % de « o » → note 1 à 5 par une table de seuils **propre à chaque critère** ; ensuite moyennes pondérées, arrondies à l'entier | moyennes pondérées (poids 1 ou 2), sans arrondi, puis conversion non linéaire vers un % (1 → 0 %, 3 → 100 %, 5 → 150 %) |
| Résultat final | **aucun** : des % colorés, la décision reste humaine | chaque sphère ≥ 3 → réussi ; cours réussi si toutes les sphères sont réussies (règle ET) ; moyenne globale indicative à côté | toutes les sphères ≥ 80 % (3 sur 3) **et** aucun critère éliminatoire |
| Regroupements hors de l'arbre | 4 **thèmes transversaux** (listes libres de critères pris dans les exercices), 2 moyennes d'un même objectif sur plusieurs exercices | objectif « sécurité » qui agrège des critères d'autres objectifs ; critères répétés (planification individuelle puis en groupe) | livrables encodés dans les libellés ; table de couverture des objectifs officiels du cours ; méta-axes de la Posture |
| Joker | absent | dans une liste seulement, non branché | AUCUN/UTILISÉ + justification, un demi-point sur une sphère une seule fois, appliqué à la main |
| Éliminatoires | menu Utilisé/Inutilisé, non branché | OUI/NON, non branché | OUI/NON, **bloque** le résultat |

### Constats pour le modèle

1. **Définition et instance sont distinctes.** Un même objectif ou critère est évalué dans plusieurs exercices, avec des notes indépendantes (qualif1 : l'objectif 4.1 apparaît dans 4 exercices). La clé réelle est (exercice, critère). Il faut séparer un **référentiel** (objectifs, critères, indicateurs réutilisables) des **instances évaluées**.
2. **Un élément a plusieurs parents.** Un critère compte dans son objectif **et** dans un regroupement transversal (le thème en qualif1, la sécurité en qualif2). C'est une relation n-n, et le regroupement transversal peut entrer dans le calcul.
3. **L'exercice ou le rendu est un axe de premier rang.** Dans qualif1 il remplace la sphère, dans qualif2 il est confondu avec l'objectif, dans qualif3 il est caché dans les libellés.
4. **Le résultat est une règle de décision, pas la racine d'un arbre.** Par exemple « n sphères ≥ seuil ET aucun éliminatoire ». Cette règle peut ne pas exister du tout (qualif1). Il y a souvent **plusieurs résultats en parallèle** : la décision, une moyenne indicative, des % par thème.
5. **L'échelle et la conversion sont portées par le critère.** Une même sphère mélange o/k et 1 à 5, et les seuils de conversion changent d'un critère à l'autre. Il y a aussi des conversions non linéaires (1 à 5 → %).
6. **Les paramètres d'agrégation sont posés sur chaque nœud** : les poids (sur les indicateurs, les critères et les objectifs selon le modèle), l'arrondi ou non, ignorer les vides, l'arrondi intermédiaire ou final, des bonus codés en dur (+1 ou +1,5 dans qualif2).
7. **Des ensembles sont hors du calcul.** La Posture est une grille d'observation notée 1 à 5 avec commentaire et une colonne « Quand », mais elle n'entre pas dans le résultat. Les critères éliminatoires agissent comme un veto booléen avec justification. Le joker ajuste le résultat.
8. **Les observations sont contextualisées.** La colonne « Quand » de la Posture, et une note de relecture qui dit qu'un indicateur sans commentaire est ambigu (rien à dire, ou oubli ?), suggèrent un besoin d'observations datées, avec un auteur, éventuellement plusieurs par item.
9. **Des commentaires existent à tous les niveaux** : indicateur, objectif, sphère ou exercice, item de Posture, éliminatoire, plus un commentaire général, 3 points positifs et 3 points à améliorer.
10. **Le suivi existe déjà, en bricolage.** qualif2 calcule un taux de remplissage par objectif. qualif3 compte les indicateurs vides et garde la moyenne brute et l'écart dû à l'arrondi, dans des colonnes techniques « à ne pas imprimer ». Cela rejoint les statistiques de suivi attendues (voir « Projections et visualisations »).
11. **Une structure par cours.** Le modèle est recopié pour chaque cours et chaque session, avec des dates et des textes en dur. La structure ne varie pas d'un apprenant à l'autre ; elle n'est modifiée qu'en éditant le fichier, sans versioning. Les concepteurs se laissent des notes de relecture dans le fichier.
12. **Ce qui n'a pas été vu dans ces modèles** : les échelles ++/+/-/-- et 1 à 10, les évaluateurs par ligne, les groupes d'apprenants, les dates par indicateur.
13. **Limite de l'analyse** : les trois fichiers sont vierges. On ne voit rien de l'usage réel : volume des commentaires, cases laissées vides, ajustements à la main en fin de cours. Une qualification remplie et anonymisée permettrait de le vérifier.

### Piste de généralisation (à discuter)

- Un **référentiel** d'éléments évaluables : indicateurs, avec leur échelle.
- Des **regroupements** nommés. Chacun a une agrégation paramétrée (fonction, poids, conversion, arrondi, seuil) et un statut : *décisif*, *indicatif* ou *organisationnel*. Un arbre devient un cas particulier, où chaque élément n'a qu'un seul parent.
- Des **axes** pour les étiquettes : exercice ou rendu, thème, type de critère, moment. Ils servent aux projections (filtrer, regrouper, mettre en lignes ou en colonnes).
- Une **règle de décision** finale, composable : seuils, nombre de regroupements réussis, veto des éliminatoires, joker.
- Les **observations** : une note, un commentaire, un auteur et une date, sur une instance (indicateur × apprenant × contexte éventuel).

## Saisie collaborative en temps réel

Le comportement visé est proche d'Excel Online ou de Google Sheets :

- Quand un formateur affiche une grille, il voit les valeurs **arriver dans les cellules** au fur et à mesure que les autres formateurs les remplissent. Les résultats calculés se mettent à jour en même temps.
- **Verrou :**
  - Une cellule de texte en cours d'édition est **verrouillée** pour les autres formateurs, qui voient qui l'occupe.
  - Le verrou **expire** quand l'utilisateur devient inactif.
  - Restent à définir : la durée du verrou, la façon de détecter l'inactivité, et si les cellules de note sont aussi verrouillées.
- **Dernier gagnant :** en cas de coupure ou de conflit, la dernière écriture l'emporte, pour ne rien perdre de ce qui a été saisi.
- On ne fait **pas** d'édition à plusieurs dans une même cellule, caractère par caractère.
- **Moment de la sauvegarde :** encore à décider. La piste privilégiée est d'enregistrer les notes à la sortie de la cellule, et les textes longs à la sortie plus par brouillons réguliers.

## Historique

- **Chaque modification** d'une cellule (texte ou note) est versionnée : qui a écrit quoi, et quand.
- On peut suivre l'**évolution d'une note** au fil du cours.
- Il y a un journal des modifications.
- On peut **revenir en arrière** sur une cellule, ou sur une partie de la grille.
- La façon de consulter l'historique dans l'interface reste à définir.

## Hors ligne

- Pas de vrai mode hors ligne au départ.
- Une coupure réseau courte ne doit pas faire perdre de saisie.
- Un mode hors ligne reste à évaluer plus tard.

## Langues

L'application est d'abord en français. Elle doit pouvoir devenir multilingue sans retoucher chaque écran.

## Volumes attendus

Ordres de grandeur pour un cours :

| Élément | Volume |
| --- | --- |
| Apprenants par cours | 10 à 40 |
| Sphères par qualification | 5 à 7 |
| Indicateurs par sphère | 10 à 60 |
| Formateurs par cours | 6 à 10 |
| Cours en parallèle | 4 à 5 |

Au maximum, un cours compte donc environ 40 × 7 × 60 ≈ 17 000 notes d'indicateurs, sans compter les commentaires ni les niveaux agrégés. Une cinquantaine de formateurs saisissent en même temps sur l'ensemble des cours.

## Hébergement et données

- Hébergement en Suisse, dans des conteneurs Docker déployés avec Docker Compose pour le moment.
- Les qualifications concernent des personnes, souvent mineures. Il faudra une durée de conservation et une purge ou une anonymisation automatique (à discuter).

## Idées à explorer (2026-10-03)

Idées notées pour plus tard. Rien n'est décidé.

### Création et cycle de vie

- **Brouillon hors cours :** créer une qualification en brouillon sans cours, puis la lier à un cours. Cela rejoint la question d'un référentiel partagé entre cours (constat 1).
- **Figer :** figer une qualification (voir « Cycle de vie »). À préciser : qui peut figer, ce qui est figé (structure, données, ou les deux), et si on peut défiger.
- **Archivage :** archiver les qualifications des cours terminés. À distinguer de l'anonymisation : que voit-on d'une qualification archivée, et qui la voit ?
- **Anonymisation :** 3 mois après la fin du cours, supprimer tous les noms et garder le détail de la qualification (notes, commentaires, structure). Les commentaires libres peuvent contenir des noms : comment les traiter ? Rejoint la conservation des données et la nLPD (voir « Hébergement et données »).

### Évaluation

- **Seuil final :** les requis pour que la qualification soit réussie, donc pour que l'apprenant obtienne son cours. C'est la règle de décision (constat 4).
- **Éléments commentés sans note :** certaines parties d'une qualification ne sont pas notées, seulement commentées. Comment les intégrer : un élément sans échelle, un regroupement hors calcul comme la Posture (constat 7) ?

### Affichage personnalisé

L'accueil dépend du formateur connecté :

- en premier, la qualification du cours où il est formateur en ce moment ;
- des raccourcis vers les qualifications individuelles des apprenants dont il fait le suivi ;
- des raccourcis par groupe, par exemple pour aller directement au groupe qu'il évalue.

### Statistiques

- **Par cours et entre cours :** des statistiques sur un cours, ou sur plusieurs cours, par exemple tous les cours d'un même type. Il faut vérifier quels accès MiData le permettent : aujourd'hui, un formateur ne voit que ses propres cours (voir « Acteurs et accès »). La notion de type de cours est aussi à vérifier dans MiData.
- **Statistiques temporelles :** l'évolution de la réussite d'un cours à l'autre, ou l'ordre dans lequel les indicateurs ont été remplis (l'historique contient ces dates).
- Les statistiques entre cours pourraient porter sur des données anonymisées, ce qui lie ce point à l'anonymisation.

### Intégrations

- **Participants depuis MiData :** récupérer les listes de participants depuis MiData et les synchroniser. À préciser : quand synchroniser, et que faire d'un apprenant retiré du cours dans MiData alors qu'il a déjà des notes ?
- **Envoi automatique par mail :** à préciser : quoi (le PDF de la qualification ?), à qui (l'apprenant, l'équipe ?) et quand. Envoyer aux apprenants ne contredit pas « l'application est réservée aux formateurs », mais il faut alors leur adresse.

## Questions ouvertes (domaine)

- La généralisation des échelles : les types, les seuils, et les règles de conversion d'une échelle à l'autre.
- Le catalogue des agrégations : moyenne, pourcentage de réussite, seuil minimum, autres.
- Le vocabulaire : comment distinguer la structure d'une qualification et les données d'un apprenant ?
- Les modifications de structure en cours de cours : que deviennent les notes d'un indicateur supprimé ?
- La copie d'une qualification pour comparer : est-ce une copie indépendante ou une variante liée à l'originale ? Comment se fait la comparaison ?
- Les projections (voir « Projections et visualisations ») : un arbre unique suffit-il, ou faut-il un modèle à plusieurs axes (exercice ou rendu, thème, type de critère, temps) ? Un indicateur peut-il appartenir à plusieurs regroupements ?
- Les vues : sont-elles prédéfinies, configurables par l'équipe, ou composées à la volée par chaque formateur (filtres, regroupements, lignes et colonnes) ?
- Les nouveaux termes (exercice, rendu, thème, type de critère) : sens précis et place dans le vocabulaire.
- Le résultat final : plusieurs agrégations en parallèle sur les mêmes données (seuil de réussite par thème, moyennes complémentaires par type de critère) ? Laquelle décide de la réussite ?
- Les statistiques et le suivi : quelles mesures (indicateurs manquants, sans commentaire, écart type, évolution dans le temps), à quels niveaux (apprenant, groupe, cours) ? L'évolution dans le temps suppose de dater les rendus ou les évaluations.
- La généralisation au-delà de l'arbre (voir « Analyse de trois qualifications réelles ») : un graphe de regroupements avec un arbre principal décisif ? Comment un formateur crée-t-il ces regroupements sans que ça devienne un tableur ?
- Le référentiel et les instances : un critère réutilisé dans plusieurs exercices est-il un seul élément noté plusieurs fois, ou plusieurs éléments liés à une même définition ? Le référentiel est-il partagé entre cours ?
- « Il y a toujours un résultat calculé » : qualif1 n'a pas de décision finale, seulement des %. Faut-il garder la règle, ou la rendre facultative ?
- Les observations : une seule note par indicateur, ou plusieurs observations datées et attribuées à un auteur (avec quelle agrégation) ? Comment distinguer « rien à dire » d'« oubli » pour un commentaire ?
- La Posture et les autres grilles d'observation hors calcul : sont-elles un regroupement indicatif comme les autres, ou un concept à part ?
- Les éliminatoires : veto automatique, ou simple information pour la décision humaine ?
- Les bonus et ajustements codés en dur (+1, +1,5) et les arrondis intermédiaires : faut-il les reproduire, ou les remplacer par des paramètres explicites ?
- Le joker : les règles. Dans qualif3, c'est un demi-point sur une sphère, une seule fois, avec une justification. Est-ce général ?
- Les groupes d'évaluation et le formateur référent : les règles.
- La correspondance entre les rôles de cours MiData et les droits dans Azimut.
- Les verrous : la durée et la détection d'inactivité.
- La consultation de l'historique et la restauration d'une partie de grille.
- Le contenu et la mise en page du PDF.
- La durée de conservation et la purge des données.
- Faut-il reporter les qualifications dans MiData ?
- Le positionnement face à [Qualix](https://github.com/gloggi/qualix), une app existante pour les qualifications de cours scouts suisses, connectée à MiData. Qu'est-ce qu'Azimut fait de différent, et que peut-on reprendre de son modèle ?
