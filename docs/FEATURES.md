# Azimut — fonctionnalités

Ce document décrit le domaine et le comportement attendu. Il ne décrit pas le code.

> **Le modèle de qualification est fixé par [18 — Décisions définitives](analyse/18-decisions-definitives.md)** (4 octobre 2026), qui fait foi. Ce document résume ce modèle et renvoie vers 18 pour le détail. Il décrit en propre ce que 18 ne traite pas : accès, connexion, saisie en temps réel, historique, hors ligne, langues, volumes, hébergement.

## Contexte

Azimut permet à l'équipe d'un cours de formation scout de préparer les grilles de qualification du cours, puis de les remplir pour chaque apprenant pendant le cours. Plusieurs formateurs saisissent en même temps dans les grilles du même cours.

Un cours Azimut peut réunir plusieurs événements MiData, et plusieurs grilles peuvent y coexister (18 §2).

## Vocabulaire (provisoire)

Le vocabulaire produit définitif reste ouvert (18 §13, point 9). Les termes ci-dessous sont ceux de 18.

| Terme | Sens |
| --- | --- |
| **Cours** | Une session de formation donnée à un endroit. Il peut réunir plusieurs événements MiData. Plusieurs cours peuvent avoir lieu en même temps à des endroits différents. |
| **Apprenant, participant** | Une personne qui suit un cours et dont on évalue la qualification. La liste vient exclusivement de MiData. |
| **Formateur** | Une personne de l'équipe d'un cours. Elle remplit les qualifications des apprenants de ce cours. |
| **Équipe de cours** | L'ensemble des formateurs d'un cours. |
| **Grille** | La structure de qualification d'un cours : nœuds, règles de calcul, vues. Un cours peut en avoir plusieurs ; la **grille principale** est affichée par défaut. |
| **Dossier** | Les données d'un apprenant dans une grille. Il se finalise par apprenant. |
| **Case** | Un apprenant × une occurrence évaluée. Elle porte une note courante et un commentaire. |
| **Nœud de données, nœud de calcul** | Le nœud de données porte les évaluations saisies. Le nœud de calcul combine les résultats d'autres nœuds selon une règle du catalogue. |
| **Sphère, objectif, critère, indicateur, exercice** | Les mots des cours pour nommer les nœuds. Ils n'imposent ni types ni nombre de niveaux. Un exercice est un nœud. |
| **Axe** | Une lecture du graphe : exercices, compétences, thèmes… Chaque grille a un **axe principal**, qui sert à la conception, à la navigation et aux vues standard. |
| **Occurrence** | Une utilisation d'une définition de critère à un endroit de la grille, par exemple le même critère dans deux exercices. Chaque occurrence a ses propres cases. |
| **Résultat final** | Le nœud de calcul désigné comme résultat de la grille et marqué décisif. Ce qui n'y contribue pas est indicatif. Une grille peut ne pas en avoir. |
| **Barème** | Les valeurs possibles d'une note (ok/ko, 1 à 5, paliers nommés…). Les types viennent de l'application ; l'équipe règle les paliers, noms et couleurs. |
| **Vide, non évalué** | Vide : case encore à traiter. Non évalué : évaluation volontairement exclue, notamment par une **dispense**. Les deux sont exclus du calcul, sans pénalité. |
| **Joker** | Une action prévue par la grille (ex. remonter au seuil), appliquée sur un nœud autorisé, avec quota par apprenant et justification. |
| **Gabarit** | Une grille copiée puis personnalisée, indépendante de sa source. |
| **Finaliser, archiver** | Finaliser verrouille un dossier, qui peut être rouvert tant qu'il n'est pas archivé. Après archivage, plus aucune réédition. |
| **Groupe** | Un sous-ensemble des apprenants d'un cours, par exemple un groupe d'évaluation. |
| **Critère éliminatoire** | Un motif binaire (OUI/NON) qui peut faire échouer le cours, quels que soient les résultats : plagiat, absences, mise en danger… Il exige une justification. ⚠️ Non traité par 18. |
| **Posture** | Une grille d'observation du comportement, notée et commentée, qui n'entre pas dans le résultat. Dans le modèle de 18, ce sont des nœuds indicatifs. |
| **Verrou** | La réservation temporaire d'une cellule par le formateur qui est en train de la modifier. |

## Modèle de qualification

Résumé de 18. Le détail et les points encore ouverts sont dans 18.

- **Graphe, axes et réussite (§3).** Une grille est un graphe sans cycle de nœuds de données et de calcul, lisible selon plusieurs axes de profondeur libre. La réussite est portée par un nœud de calcul décisif. Un élément peut être placé à un endroit et compter ailleurs. Une évaluation qui compte par plusieurs chemins est autorisée et signalée.
- **Évaluations répétées (§4).** Une définition de critère peut avoir plusieurs occurrences, chacune avec ses notes. Les tentatives et leur règle (meilleure, dernière…) sont prévues avant le cours. Une réévaluation imprévue remplace la note, l'ancienne reste dans l'historique.
- **Saisie (§5).** Une note courante par case, partagée par les formateurs. Commentaires facultatifs sur tous les nœuds, avec ou sans note. La saisie par groupe copie la donnée dans les cases des membres.
- **Remplissage (§6).** Trois états : note, vide, non évalué. La dispense passe par « non évalué », sur une case ou un regroupement. La grille déclare ses exigences de remplissage ; tant qu'elles ne sont pas satisfaites, un avertissement de données provisoires reste affiché. On peut finaliser malgré des erreurs, après acceptation explicite.
- **Calcul et barèmes (§7).** Catalogue fermé de fonctions, conversions et types de barèmes, paramétrés par nœud, sans formule libre. Une fonction publiée ne change jamais. À poids égal, deux contributions ont la même influence, quel que soit leur barème.
- **Joker (§8).** Action prévue avant le cours, quota configurable par apprenant, justification obligatoire. Une action numérique change la valeur effective utilisée en aval. Le signalement « joker appliqué » ou « influencé par un joker » se propage jusqu'à la synthèse.
- **Gabarits et copies (§9).** Changer le calcul pendant le cours exige une copie complète de la grille avec les données. Originale et copie restent indépendantes. L'équipe peut publier une structure sans données dans une bibliothèque publique.
- **Cycle de vie (§10).** Brouillon, saisie, finalisation par apprenant, réouverture possible avant archivage, archivage automatique après un délai configurable ou manuel. Tout résultat se recalcule depuis les données sources ; un cache reste possible.
- **Vues et exports (§11).** Vues standard tirées de l'axe principal, vues avancées partagées par l'équipe et adaptables pendant le cours sans toucher au calcul. Tables, listes, graphe de propagation, matrices libres et graphiques. Toute vue s'exporte ; l'attestation est une vue exportée.

### Projections attendues

Cas d'usage qui ont guidé le modèle. Dans 18, chacun est une vue sur des nœuds existants (§11) : une cellule de vue affiche le résultat d'un nœud, elle ne crée pas de calcul.

1. **Évaluer un exercice de groupe** (ex. une randonnée) : seulement les critères et indicateurs de cet exercice, et seulement les apprenants du groupe évalué.
2. **Préparer un retour à un apprenant que je suis** (ex. sur ses capacités d'organisation) : tous les objectifs, critères et indicateurs liés à ce thème, avec les commentaires.
3. **Évaluer une activité rendue individuellement** par tous les apprenants : les critères et indicateurs en lignes, les apprenants en colonnes. Soit un apprenant à la fois avec des flèches, soit tous avec du défilement horizontal.
4. **Voir si un apprenant a réussi son cours**, sous plusieurs angles :
   - une liste avec la moyenne par sphère et le rappel des notes de chaque objectif ;
   - une matrice avec les rendus en colonnes et les thèmes en lignes, pour voir l'évolution d'un rendu à l'autre ;
   - une partie calculée par thème qui fait office de seuil de réussite, complétée par des moyennes pour certains types de critères.
5. **Voir l'état de tout le cours** : où en sont les apprenants, s'il y a des disparités, quels indicateurs manquent.

### Suivi et statistiques

18 fixe les exigences de remplissage, l'avertissement et l'onglet d'erreurs (§6). Les autres mesures restent à définir :

- le nombre d'indicateurs pas encore remplis ;
- le nombre d'indicateurs sans commentaire ;
- des statistiques par apprenant : écart type des notes, évolution au fil du cours, etc.

## Acteurs et accès

- Pour l'instant, l'application est **réservée aux formateurs**. Les apprenants n'y ont pas accès, et aucun espace apprenant n'est prévu (18 §11).
- Un formateur ne voit **que les cours auxquels il participe**, et seulement les qualifications des apprenants de ces cours. Il n'a jamais accès aux autres cours.
- Les droits dépendent de deux choses : le **rôle** de la personne et le **cours** auquel elle participe.
- À affiner : les groupes d'évaluation, le formateur référent d'un apprenant, et les autres mécanismes internes au cours.

## Connexion et MiData

- **Production :** SSO avec la base de données scoute suisse (MiData, [db.scout.ch](https://db.scout.ch)). C'est aussi d'elle que viennent les cours auxquels un formateur participe, avec son rôle dans chaque cours.
- **Développement et tests :** des comptes locaux.
- **Rôles de cours qui existent dans MiData :** Kursleiter·in (qui a le droit de qualifier), Klassenlehrer·in, Referent·in, Kurshelfer·in, Küche, Participant et LKB. Il reste à décider comment ils correspondent aux droits dans Azimut.
- **Participants (18 §2) :** MiData est la seule source. La liste réunit les participants des événements rattachés au cours et reste synchronisée ; aucun ajout manuel. L'équipe peut **écarter** un participant (absent, parti) : il disparaît de toutes les grilles du cours, sans changer son inscription MiData.

## Analyse de trois qualifications réelles (2026-10-03)

> Constats sur les Excel actuels, antérieurs aux décisions. Les conclusions retenues sont dans 18 ; chaque constat y renvoie.

Trois modèles Excel vierges, nommés qualif1, qualif2 et qualif3, ont été analysés. Ils viennent de `.scratch/`, qui n'est pas versionné. Le constat est que **l'arbre seul ne suffit pas**. Il y a en général un arbre principal qui sert au calcul du résultat, plus d'autres regroupements, utilisés soit dans le calcul soit seulement à titre indicatif.

### Ce qui est commun

- **Un classeur par apprenant**, dupliqué pour chaque personne. Il n'y a jamais de matrice apprenants × indicateurs.
- Une feuille de **Synthèse**, une feuille par grand regroupement, une feuille de **critères éliminatoires** et une feuille imprimable (attestation).
- Les lignes forment l'arbre. Les colonnes contiennent le poids, la note, la moyenne calculée et le commentaire.
- Les termes objectif, critère et indicateur se retrouvent partout. Le niveau du dessus est une **sphère** (qualif2, qualif3) ou un **exercice** (qualif1).
- **Case vide = non observé** dans les moyennes de qualif2 et qualif3 : elle en est exclue. Deux exceptions : en o/k (qualif2), une case vide compte comme « non » ; dans qualif1, une case vide vaut 0 point et compte dans le possible (`Construction de cours!K12`, `L12`, `O11`).
- L'identité des nœuds est fragile. Les liens passent par des recherches sur le code ou le préfixe du libellé, et certaines plages et lignes sont codées en dur. On trouve des formules cassées : une sphère oubliée dans la règle finale (qualif2), l'objectif « Topographie » de Trekking qui vaut toujours 1 (qualif2, `Trekking!N142`), un dossier entièrement vide affiché « Réussi » pour chaque sphère et pour le cours (qualif3, `Synthèse!F24`, `F26`, `F35`, `F42`). **Il faut des identifiants stables et des règles déclaratives.**

### Les trois modèles

| | qualif1 | qualif2 | qualif3 |
| --- | --- | --- | --- |
| Niveau du dessus | 7 exercices (rendus) | 4 sphères + Posture | 3 sphères + Posture |
| Taille | ~24 objectifs, 50 critères, 156 indicateurs | ~17 objectifs, ~49 critères, ~290 indicateurs | 15 objectifs, 45 critères, 219 indicateurs |
| Échelle des indicateurs | points de 0 à un poids (toujours 1) | 1 à 5 **et** o/k mélangés dans une même sphère | 1 à 5 |
| Agrégation | somme des points / points possibles, à chaque niveau ; une case vide vaut 0 | o/k → % de « o » → note 1 à 5 par une table de seuils **propre à chaque critère** ; ensuite moyennes pondérées, arrondies à l'entier | moyennes pondérées (poids 1 ou 2), sans arrondi, puis conversion non linéaire vers un % (1 → 0 %, 3 → 100 %, 5 → 150 %) |
| Résultat final | **aucun** : des % colorés, la décision reste humaine | chaque sphère ≥ 3 → réussi ; cours réussi si toutes les sphères sont réussies (règle ET) ; moyenne globale indicative à côté | toutes les sphères ≥ 80 % (3 sur 3) **et** aucun critère éliminatoire |
| Regroupements hors de l'arbre | 4 **thèmes transversaux** (listes libres de critères pris dans les exercices, qui comptent aussi dans leur exercice) ; 2 moyennes d'un même objectif sur plusieurs exercices, dont 4.1, absent du calcul des exercices | objectif 0 « sécurité » : les critères de sécurité sont affichés sous leur objectif mais **comptés seulement dans l'objectif 0** ; critères répétés (planification individuelle puis en groupe) | livrables encodés dans les libellés ; table de couverture des objectifs officiels du cours ; méta-axes de la Posture |
| Joker | absent | dans une liste seulement, non branché | AUCUN/UTILISÉ + justification, un demi-point sur une sphère une seule fois, appliqué à la main |
| Éliminatoires | menu Utilisé/Inutilisé, non branché | OUI/NON, non branché | OUI/NON, **bloque** le résultat |

### Constats

1. **Définition et occurrence sont distinctes.** Un même objectif ou critère est évalué dans plusieurs exercices, avec des notes indépendantes (qualif1 : l'objectif 4.1 apparaît dans 4 exercices). La clé réelle est (exercice, critère). → 18 §4 (définition et occurrence évaluée). Les objectifs officiels restent des étiquettes facultatives, pas un référentiel imposé (18 §2).
2. **Être placé à un endroit n'implique pas d'y être compté.** Les trois cas observés :
   - qualif1, thèmes : un critère compte dans son exercice **et** dans un thème transversal (indicatif, puisque qualif1 n'a pas de décision finale).
   - qualif1, objectif 4.1 : il est **placé** dans 4 exercices, mais **compté** seulement dans une moyenne transversale. La somme de l'exercice l'exclut (`Construction de cours!M7 = SUM(M11:M51)`, 4.1 est en ligne 52) ; la moyenne `Synthèse!C55 = AVERAGE(C56:C59)` le reprend. qualif1 calcule donc deux chemins en parallèle.
   - qualif2, sécurité : les critères de sécurité sont affichés sous leur objectif, mais **ne comptent qu'une fois**, dans l'objectif 0. `Sport de camp!N12` calcule l'objectif 1 sur `I13:I44` ; les lignes 45 à 51 (sécurité) sont calculées par `N10` (objectif 0).

   → 18 §3 (placement et contribution distincts ; chemins multiples autorisés et signalés).
3. **L'exercice ou le rendu est un axe de premier rang.** Dans qualif1 il remplace la sphère, dans qualif2 il est confondu avec l'objectif, dans qualif3 il est caché dans les libellés. → 18 §3 : un exercice est un nœud, et les axes sont des lectures du graphe.
4. **Le résultat est une règle de décision, pas la racine d'un arbre.** Par exemple « n sphères ≥ seuil ET aucun éliminatoire ». Cette règle peut ne pas exister du tout (qualif1). Il y a souvent **plusieurs résultats en parallèle** : la décision, une moyenne indicative, des % par thème. → 18 §3 : nœud de calcul décisif, facultatif ; le reste est indicatif.
5. **L'échelle et la conversion sont portées par le critère.** Une même sphère mélange o/k et 1 à 5, et les seuils de conversion changent d'un critère à l'autre. Il y a aussi des conversions non linéaires (1 à 5 → %). → 18 §7 ; conversions encore ouvertes.
6. **Les paramètres d'agrégation sont posés sur chaque nœud** : les poids (sur les indicateurs, les critères et les objectifs selon le modèle), l'arrondi ou non, ignorer les vides, l'arrondi intermédiaire ou final, des bonus codés en dur (+1 ou +1,5 dans qualif2). → 18 §7 : méthode et paramètres par nœud, catalogue fermé, pas de formule libre.
7. **Des ensembles sont hors du calcul.** La Posture est une grille d'observation notée 1 à 5 avec commentaire et une colonne « Quand », mais elle n'entre pas dans le résultat. Les critères éliminatoires agissent comme un veto booléen avec justification. Le joker ajuste le résultat. → 18 §3 (nœuds indicatifs) et §8 (joker) ; les éliminatoires ne sont pas traités.
8. **Les observations sont contextualisées.** La colonne « Quand » de la Posture, et une note de relecture qui dit qu'un indicateur sans commentaire est ambigu (rien à dire, ou oubli ?), suggèrent un besoin d'observations datées, avec un auteur, éventuellement plusieurs par item. → 18 §5 : une note courante par case et un historique, pas d'observations multiples ; la temporalité passe par les occurrences (§4) ; vide et non évalué se distinguent (§6).
9. **Des commentaires existent à tous les niveaux** : indicateur, objectif, sphère ou exercice, item de Posture, éliminatoire, plus un commentaire général, 3 points positifs et 3 points à améliorer. → 18 §5.
10. **Le suivi existe déjà, en bricolage.** qualif2 calcule un taux de remplissage par objectif. qualif3 compte les indicateurs vides et garde la moyenne brute et l'écart dû à l'arrondi, dans des colonnes techniques « à ne pas imprimer ». → 18 §6 (exigences de remplissage) et « Suivi et statistiques » plus haut.
11. **Une structure par cours.** Le modèle est recopié pour chaque cours et chaque session, avec des dates et des textes en dur. La structure ne varie pas d'un apprenant à l'autre ; elle n'est modifiée qu'en éditant le fichier, sans versioning. Les concepteurs se laissent des notes de relecture dans le fichier. → 18 §9 (gabarits et copies).
12. **Ce qui n'a pas été vu dans ces modèles** : les échelles ++/+/-/-- et 1 à 10, les évaluateurs par ligne, les groupes d'apprenants, les dates par indicateur.
13. **Limite de l'analyse** : les trois fichiers sont vierges. On ne voit rien de l'usage réel : volume des commentaires, cases laissées vides, ajustements à la main en fin de cours. Une qualification remplie et anonymisée permettrait de le vérifier.

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
- L'historique est consultable par les formateurs ; la restitution à l'apprenant présente l'état final (18 §4).
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

Idées notées pour plus tard. Rien n'est décidé. Le brouillon hors cours, le figement, le seuil final et les éléments commentés sans note sont tranchés par 18 (§3, §5, §9, §10).

### Archivage et anonymisation

- **Archivage :** 18 §10 fixe le délai configurable, l'archivage automatique ou manuel, et la consultation sans réédition. Reste à décider qui voit une qualification archivée.
- **Anonymisation :** 3 mois après la fin du cours, supprimer tous les noms et garder le détail de la qualification (notes, commentaires, structure). Les commentaires libres peuvent contenir des noms : comment les traiter ? Rejoint la conservation des données et la nLPD (voir « Hébergement et données »).

### Affichage personnalisé

L'accueil dépend du formateur connecté :

- en premier, la qualification du cours où il est formateur en ce moment ;
- des raccourcis vers les qualifications individuelles des apprenants dont il fait le suivi ;
- des raccourcis par groupe, par exemple pour aller directement au groupe qu'il évalue.

### Statistiques

- **Par cours et entre cours :** des statistiques sur un cours, ou sur plusieurs cours, par exemple tous les cours d'un même type. Il faut vérifier quels accès MiData le permettent : aujourd'hui, un formateur ne voit que ses propres cours (voir « Acteurs et accès »). La notion de type de cours est aussi à vérifier dans MiData. Les statistiques entre cours pourraient s'appuyer sur les étiquettes d'objectifs officiels (18 §2).
- **Statistiques temporelles :** l'évolution de la réussite d'un cours à l'autre, ou l'ordre dans lequel les indicateurs ont été remplis (l'historique contient ces dates).
- Les statistiques entre cours pourraient porter sur des données anonymisées, ce qui lie ce point à l'anonymisation.

### Intégrations

- **Synchronisation des participants :** 18 §2 fixe MiData comme seule source et la synchronisation au fil du cours. Restent à préciser : à quel moment synchroniser, et ce que deviennent les données d'un participant écarté ou retiré dans MiData.
- **Envoi automatique par mail :** à préciser : quoi (un export de vue, comme l'attestation ?), à qui (l'apprenant, l'équipe ?) et quand. Envoyer aux apprenants ne contredit pas « l'application est réservée aux formateurs », mais il faut alors leur adresse.

## Questions ouvertes (domaine)

Les points ouverts du modèle de qualification sont listés dans 18 §13 : catalogue de calcul et conversions, catalogue des jokers, rendu du remplissage, navigation et vues, cycle de vie, gabarits et publication, exports, architecture.

Hors modèle :

- Le vocabulaire produit définitif (grille, dossier, case, exercice, thème…).
- La conception des grilles : comment un formateur compose-t-il nœuds, axes et regroupements sans que ça devienne un tableur ? La facilité réelle reste à éprouver (18 §1).
- Les critères éliminatoires : veto automatique, ou simple information pour la décision humaine ? Comment les représenter dans le graphe ?
- Les statistiques et le suivi : quelles mesures (indicateurs manquants, sans commentaire, écart type, évolution dans le temps), à quels niveaux (apprenant, groupe, cours) ?
- Un commentaire absent : comment distinguer « rien à dire » d'« oubli » ?
- Les groupes d'évaluation et le formateur référent : les règles.
- La correspondance entre les rôles de cours MiData et les droits dans Azimut.
- Les verrous : la durée et la détection d'inactivité.
- La consultation de l'historique et la restauration d'une partie de grille.
- La durée de conservation, la purge et l'anonymisation des données.
- Faut-il reporter les qualifications dans MiData ?
- Le positionnement face à [Qualix](https://github.com/gloggi/qualix), une app existante pour les qualifications de cours scouts suisses, connectée à MiData. Qu'est-ce qu'Azimut fait de différent, et que peut-on reprendre de son modèle ?
