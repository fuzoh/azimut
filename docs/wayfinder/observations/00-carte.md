## Destination

La spec des **observations et du suivi en cours de formation**, dans `docs/analyse/22-spec-observations.md` : périmètre, décisions de domaine, parcours de saisie et hors-périmètre, prête à être découpée en tickets. Elle part des idées de #29 (inspiration Qualix). La carte s'arrête quand on sait quoi construire ; la construction est un effort séparé.

## Notes

- **Origine** : #29. Idées à couvrir ou à écarter explicitement : sphère Posture, photos des apprenants, observation remplie « avec le moment », suggestion de la plage d'exercice selon l'heure, observations par groupes d'exercice, page d'accès rapide (raccourcis, recherche floue), évaluation des UA par les apprenants et les formateurs, programme de cours dans l'app, validation de cours.
- **Domaine** : `docs/analyse/18-decisions-definitives.md` fait foi. Points de friction connus, à ne pas rouvrir sans le signaler explicitement :
  - §5 : une note courante par case, pas d'avis séparés ni d'observations multiples (`FEATURES.md`, constat 8) ;
  - §4 : la temporalité passe par les exercices et occurrences prévus dans la grille, sans dimension « contexte » sur la case ;
  - §11 et `FEATURES.md` « Acteurs et accès » : l'application est réservée aux formateurs, aucun espace apprenant ;
  - `FEATURES.md` : la Posture est faite de nœuds indicatifs.
- **Qualix** : `docs/analyse/06-benchmark-qualix.md` (modèle, N-QX1 blocs, N-QX2 missions d'observation, N-QX6 observation à plusieurs apprenants, N-QX9 effort d'observation, N-QX12 séparer observer et évaluer). Le positionnement face à Qualix reste ouvert (18 §13) : cette carte le tranche pour la partie observations.
- **Vocabulaire** (validé le 15 novembre 2026) : une **UA** est un point de cours, une leçon : ce que l'équipe enseigne ; elle n'existe pas dans Azimut. Un **exercice** est quelque chose que font les apprenants, sur quoi on les observe et on les évalue ; il réunit des indicateurs pris dans plusieurs sphères, objectifs et critères, et traverse donc l'arbre au lieu d'en être un étage (second axe de lecture, 18 §3).
- **Skills** : grilling + domain-modeling pour les tickets de grill ; research pour les tickets de recherche. Tickets et résolutions en français.

## Decisions so far

<!-- one line per closed ticket -->

- Nature de l'observation et rapport au modèle de 18 (`01-grilling-nature-observation.md`) : objet distinct des cases, sans note ni tendance, jamais dans le calcul ; texte ou pièce jointe (tout fichier), auteur, moment ; un seul apprenant, zéro à plusieurs nœuds (« à classer » sinon) ; modifiable par toute l'équipe avec historique ; interne à l'équipe, le commentaire de case reste la synthèse restituée ; dupliquée à la copie de grille ; supprimée à l'anonymisation. 18 §5 n'est pas rouvert, seulement précisé.
- Programme de cours dans Azimut : périmètre (`02-grilling-programme-de-cours.md`) : le programme n'entre pas dans Azimut (il reste dans un Excel SharePoint), ni plages ni UA ; le « quand » d'une observation est son heure de saisie, sans date sur les exercices ; l'évaluation des UA et la validation de cours sortent du périmètre.
- Saisie d'observations dans Qualix (`03-research-saisie-qualix.md`, constats dans `docs/analyse/23-saisie-qualix.md`) : un formulaire prérempli par la page d'origine, qui reste ouvert après l'enregistrement avec le même contexte et le texte vidé ; aucun bloc courant présélectionné ni mémoire du dernier bloc ; le Spick (photos des apprenants à observer, compteur) est le chemin le plus court ; rien pour le hors-ligne. Issues GitHub et comportement à l'écran non vérifiés.

- Le « quand » d'une observation et la suggestion d'exercice (`05-grilling-quand-exercice.md`) : moment à la minute, prérempli avec l'heure de saisie et modifiable ; l'exercice est un nœud rattaché, pas un champ ; l'application propose le dernier exercice (ou la dernière occurrence) utilisé par le formateur, et le garde ; le filtre par exercice est une aide, pas une règle ; d'une observation à la suivante, l'exercice et le groupe restent, l'apprenant se rechoisit.
- Saisie rapide des observations (`07-grilling-saisie-rapide.md`) : une page d'accès rapide, téléphone d'abord, qui montre l'exercice et le groupe en cours avec leurs membres ; un champ de recherche tolérant sur exercices, nœuds et apprenants ; un apprenant et un contenu suffisent, l'exercice est rattaché d'office ; sélection multiple pour un groupe ; compteur personnel « à préciser » ; brouillon gardé sur l'appareil sans réseau ; pas de prototype dans la carte.
- Photos des apprenants et pièces jointes (`04-research-photos-apprenants.md`, constats dans `docs/analyse/24-photos-pieces-jointes.md`) : MiData expose la photo de profil par son API, part de profils avec photo inconnue ; les pièces jointes se sécurisent au stockage et à la restitution, pas par une liste de types ; partie nLPD non vérifiée sur les textes officiels (hôtes injoignables), neuf points demandent un avis juridique.
- Suivi de l'effort d'observation et missions (`08-grilling-suivi-effort-observation.md`) : un tableau apprenants × exercices avec le nombre d'observations, sans décompte par formateur ; pas de missions d'observation ; une observation manquante n'est jamais signalée comme une erreur.

## Not yet specified

- **Rédaction de la spec** : dernier ticket, quand le reste est clos.

## Out of scope

- Le modèle de calcul de 18 (barèmes, fonctions, joker, copie) : inchangé.
- La construction.
- Le programme de cours (plages horaires, UA) : il reste dans l'outil de planification de l'équipe (`02-grilling-programme-de-cours.md`).
- L'évaluation des UA par les apprenants et les formateurs, et la validation de cours : elles supposent les UA dans l'app et évaluent le cours, pas l'apprenant (`02-grilling-programme-de-cours.md`).
- Le contenu de #30 (parties communes, correction à la chaîne, versions, tableau de bord).
