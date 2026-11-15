# Glossaire

Le vocabulaire du domaine d'Azimut. Quand un texte nomme un concept (issue, spec, test, code), il utilise le terme défini ici.

> **Statut.** Les termes du modèle de qualification viennent de [18 — Décisions définitives](docs/analyse/18-decisions-definitives.md), qui fait foi, et du vocabulaire de [`FEATURES.md`](docs/FEATURES.md). Le vocabulaire produit définitif reste ouvert (18 §13). Les termes des observations viennent de la [spec 22](docs/analyse/22-spec-observations.md). Dernière mise à jour : 15 novembre 2026.

## Le cours et les personnes

| Terme | Sens | Aussi appelé |
| --- | --- | --- |
| **Cours** | Une session de formation scoute donnée à un endroit. Il peut réunir plusieurs événements MiData et porter plusieurs grilles. | |
| **Apprenant** | Une personne qui suit un cours et dont on évalue la qualification. La liste vient exclusivement de MiData. Il n'a pas accès à l'application. | participant (terme de MiData) |
| **Formateur** | Une personne de l'équipe d'un cours. Elle observe, note et commente les apprenants de ce cours. | |
| **Équipe de cours** | L'ensemble des formateurs d'un cours. Elle partage les notes, les commentaires et les observations. | |
| **Groupe** | Un sous-ensemble des apprenants d'un cours, par exemple ceux qui font un exercice ensemble. | |
| **Participant écarté** | Un apprenant que l'équipe retire du cours (absent, parti). Il disparaît des grilles, sans changer son inscription MiData. | |
| **MiData** | La base de données du Mouvement Scout de Suisse (db.scout.ch). Source des comptes, des cours, des rôles et des apprenants. | |

## La grille

| Terme | Sens | Aussi appelé |
| --- | --- | --- |
| **Grille** | La structure de qualification d'un cours : nœuds, règles de calcul, vues. Un cours peut en avoir plusieurs ; la **grille principale** est affichée par défaut. | qualification (au sens large) |
| **Nœud** | Un élément de la grille, quel que soit son niveau. | ligne |
| **Nœud de données** | Un nœud que les formateurs remplissent. | |
| **Nœud de calcul** | Un nœud dont le résultat est calculé à partir d'autres nœuds, selon une règle du catalogue. | |
| **Sphère, objectif, critère, indicateur** | Les mots des cours pour les niveaux de la grille, du plus large au plus fin. Ils n'imposent ni types ni nombre de niveaux. L'indicateur est en général ce qu'on note. | |
| **Exercice** | Quelque chose que font les apprenants, sur quoi on les observe et on les évalue. Il réunit des indicateurs pris dans plusieurs sphères, objectifs et critères : il traverse l'arbre au lieu d'en être un étage. Dans la grille, c'est un nœud d'un second axe. | rendu |
| **Axe** | Une lecture de la grille : par sphères, par exercices, par thèmes. Chaque grille a un **axe principal**. | |
| **Occurrence** | Une utilisation d'une définition de critère à un endroit de la grille, par exemple le même critère dans deux exercices, ou un exercice prévu deux fois. Chaque occurrence a ses propres cases. | |
| **Posture** | Une partie de la grille sur le comportement, notée et commentée, qui n'entre pas dans le résultat. Ce sont des nœuds indicatifs. | |
| **Résultat final** | Le nœud de calcul désigné comme résultat de la grille et marqué **décisif**. Ce qui n'y contribue pas est **indicatif**. Une grille peut ne pas en avoir. | |
| **Barème** | Les valeurs possibles d'une note : ok/ko, 1 à 5, paliers nommés. | échelle |
| **Joker** | Une action prévue par la grille, appliquée sur un nœud autorisé, avec un quota par apprenant et une justification. | |
| **Critère éliminatoire** | Un motif binaire qui peut faire échouer le cours quels que soient les résultats. Non traité par 18. | veto |
| **Gabarit** | Une grille copiée puis personnalisée, indépendante de sa source. | |
| **Copie de grille** | La duplication complète d'une grille avec ses données, pour en changer le calcul en cours de route. Originale et copie restent indépendantes. | |

## La saisie

| Terme | Sens | Aussi appelé |
| --- | --- | --- |
| **Case** | Le croisement d'un apprenant et d'une occurrence évaluée. Elle porte une note courante et un commentaire. | cellule |
| **Note** | La valeur saisie dans une case, sur le barème du nœud. Il n'y en a qu'une par case, partagée par l'équipe. C'est un jugement. | |
| **Commentaire** | Le texte attaché à un nœud pour un apprenant. C'est la synthèse de l'équipe, restituée à l'apprenant. | commentaire de case, commentaire de synthèse |
| **Vide** | L'état d'une case encore à traiter. Exclue du calcul, sans pénalité. | |
| **Non évalué** | L'état d'une case volontairement exclue de l'évaluation, notamment par une **dispense**. Exclue du calcul, sans pénalité. | |
| **Dossier** | Les données d'un apprenant dans une grille. Il se finalise par apprenant. | |
| **Finaliser** | Verrouiller un dossier. Il peut être rouvert tant qu'il n'est pas archivé. | |
| **Archiver** | Clore définitivement : plus aucune réédition. | |
| **Anonymisation** | La suppression des noms après le cours, en gardant le détail de la qualification. Les observations sont supprimées à ce moment. | |
| **Historique** | La trace de chaque modification : qui, quand, ancienne et nouvelle valeur. | |
| **Verrou** | La réservation temporaire d'une case par le formateur qui la modifie. | |

## Les observations

| Terme | Sens | À éviter |
| --- | --- | --- |
| **Observation** | Un fait noté par un formateur sur un apprenant : un texte ou une pièce jointe, un auteur, un moment. Elle ne juge pas, n'entre jamais dans le calcul et reste interne à l'équipe. | « évaluation », « note » : une observation n'évalue pas. |
| **Observation générale** | Une observation sans rattachement. C'est l'état par défaut. | « à classer », « à préciser » : ce n'est pas un travail en retard. |
| **Rattachement** | Le lien facultatif entre une observation et un nœud : une sphère, un objectif, un indicateur, la Posture, un exercice. Une observation peut en avoir plusieurs. | « classement » |
| **Moment** | Quand le fait a été observé, à la minute. Prérempli avec l'heure de saisie et modifiable. | « plage », « bloc » : Azimut ne connaît pas l'horaire. |
| **Pièce jointe** | Un fichier attaché à une observation. Seconde tranche, après avis juridique. | |
| **Page d'accès rapide** | L'écran de saisie des observations, pensé pour le téléphone : le groupe en cours et ses membres. | |
| **Fiche de l'apprenant** | La liste de toutes les observations d'un apprenant, dans l'ordre du temps. Lieu principal de relecture. | |
| **Suivi** | Le tableau qui donne, par apprenant, le nombre d'observations et la date de la dernière. Il informe, il n'avertit pas. | |

## Hors d'Azimut

Ces notions existent dans les cours mais pas dans l'application. Les nommer évite de les confondre avec ce qui précède.

| Terme | Sens | À ne pas confondre avec |
| --- | --- | --- |
| **Programme de cours** | L'horaire du cours, tenu par l'équipe dans son propre outil. | |
| **UA** (unité d'apprentissage) | Un point de cours, une leçon : ce que l'équipe enseigne. | **Exercice** : ce que font les apprenants. Un exercice évalue une UA ou plusieurs, sans correspondance stricte. |
| **Plage d'exercice** | Le moment du programme où un exercice a lieu. Azimut ne l'enregistre pas. | **Moment** d'une observation. |
| **Qualix** | Une application existante de collecte d'observations pour les cours scouts. Source d'inspiration, pas un composant. | |

## Trois mots à ne pas mélanger

- Une **observation** est un fait.
- Une **note** est un jugement.
- Un **commentaire** est une synthèse.

L'observation nourrit les deux autres et disparaît à l'anonymisation ; la note et le commentaire restent.
