# Analyse du domaine

**La référence est [18 — Décisions définitives](18-decisions-definitives.md), validée le 4 octobre 2026.** Elle fixe le modèle de qualification : graphe et réussite, évaluations répétées, saisie, remplissage, calcul et barèmes, joker, gabarits et copies, cycle de vie, vues et exports. En cas de contradiction avec un autre document, 18 fait foi.

Les autres documents datent de l'analyse du 3 octobre 2026, avant les décisions. Ils sont conservés pour les sujets que 18 ne tranche pas (section 13, point 9 : droits, rôles MiData, protection des données, Qualix) et comme banc d'essai. Leurs propositions sur le modèle ne sont pas retenues.

## Les documents

| # | Document | Statut | Usage |
| --- | --- | --- | --- |
| 18 | [Décisions définitives](18-decisions-definitives.md) | **référence** | Modèle de qualification, garanties techniques et points restant ouverts |
| 03 | [Zones d'ombre](03-zones-d-ombre.md) | analyse antérieure, sous réserve de 18 | Contradictions des docs, hypothèses, données de terrain à collecter |
| 05 | [Acteurs et parcours](05-acteurs-et-parcours.md) | analyse antérieure, sous réserve de 18 | Acteurs, matrice de droits, moments du cours, pre-mortem, cas d'abus |
| 06 | [Benchmark Qualix](06-benchmark-qualix.md) | analyse antérieure, sous réserve de 18 | Modèle de Qualix, ce qu'on peut reprendre, positionnement |
| 09 | [Corpus de qualifications](09-corpus-qualifications.md) | analyse antérieure, sous réserve de 18 | 19 archétypes et cas de test pour éprouver la couverture du modèle |

Les documents de travail intermédiaires (01 à 17, hors 03, 05, 06 et 09) ont été retirés. Ils restent consultables dans l'historique git, jusqu'au commit `5c18369`.

## Faits vérifiés dans les Excel

Vérifiés dans les formules des trois Excel actuels. Les points 1 et 2 ne sont pas encore reportés dans `FEATURES.md` (constat 2).

| # | Fait | Preuve |
| --- | --- | --- |
| 1 | Dans qualif2, les critères de **sécurité ne comptent qu'une fois** : ils s'affichent sous leur objectif, mais seul l'objectif 0 les calcule. C'est un cas « placé ici, compté là ». | `Sport de camp!N12` calcule l'objectif 1 sur `I13:I44` ; les lignes 45 à 51 (sécurité) sont calculées par `N10` (objectif 0). |
| 2 | Dans qualif1, l'objectif 4.1 est **placé** dans les exercices mais **compté** seulement dans une moyenne transversale. qualif1 calcule donc deux chemins en parallèle. | `Construction de cours!M7 = SUM(M11:M51)` exclut 4.1 ; `Synthèse!C55 = AVERAGE(C56:C59)` |
| 3 | Dans qualif1, une **case vide vaut 0 point** (elle compte dans le possible). | `Construction de cours!K12`, `L12`, `O11` |
| 4 | **Bug** : dans qualif3, un dossier entièrement vide affiche « Réussi », pour chaque sphère et pour le cours. | `Synthèse!F24`, `F26`, `F35`, `F42` : valeur en cache « Réussi » sur le modèle vierge |
| 5 | **Bug** : dans qualif2, l'objectif « Topographie » de Trekking vaut toujours 1. | `Trekking!N142` porte sur `G143` et `G70:G71` |

## Identifiants des features

Les documents 03, 05, 06 et 09 citent les features de `FEATURES.md` et `TODO.md` par ces identifiants. Les identifiants `N-PA` (05) et `N-QX` (06) sont des propositions définies dans leur document.

- **Structure et évaluation (S)** : S1 création dans l'app à partir de primitives · S2 arbre indicateur→critère→objectif→sphère, résultat calculé à chaque nœud · S3 échelles multiples et conversion · S4 seuils par partie de l'arbre · S5 agrégations paramétrées (poids, arrondi, vides) · S6 commentaire de synthèse par nœud · S7 recalcul incrémental type tableur · S8 référentiel vs instances (exercice × critère) · S9 regroupements n-n (thèmes, sécurité) décisifs/indicatifs/organisationnels · S10 axes (exercice/rendu, thème, type de critère, moment) · S11 règle de décision / seuil final · S12 critères éliminatoires (veto + justification) · S13 joker · S14 Posture / grilles hors calcul · S15 éléments commentés sans note · S16 observations datées et attribuées
- **Cycle de vie (L)** : L1 brouillon hors cours puis lien à un cours · L2 figer la structure · L3 modifier la structure pendant le cours · L4 copie avec données pour comparer · L5 finalisation du dernier soir (reformulation, commentaire général, 3 points +/-, joker) · L6 clôture (figer les données) · L7 export PDF / impression (attestation) · L8 archivage · L9 anonymisation à 3 mois, conservation, purge
- **Saisie et collaboration (C)** : C1 vues de saisie (par apprenant, par sphère, par sphère × groupe) · C2 temps réel · C3 verrou de cellule texte · C4 dernier gagnant · C5 moment de sauvegarde, brouillons · C6 coupure courte sans perte · C7 historique par cellule et journal · C8 restauration d'une cellule ou d'une partie de grille · C9 hors ligne (plus tard)
- **Projections et suivi (P)** : P1 projections (les 5 exemples de FEATURES.md) · P2 suivi de remplissage (vides, sans commentaire) · P3 stats par apprenant (écart type, évolution) · P4 état du cours, disparités · P5 stats entre cours / par type de cours · P6 stats temporelles · P7 accueil personnalisé
- **Acteurs et accès (A)** : A1 réservé aux formateurs · A2 visibilité limitée à ses cours · A3 droits rôle × cours, correspondance rôles MiData · A4 groupes d'évaluation · A5 formateur référent · A6 connexion SSO MiData (comptes locaux en dev)
- **Intégrations (I)** : I1 cours et rôles depuis MiData · I2 participants depuis MiData et synchronisation · I3 envoi automatique par mail · I4 report dans MiData
- **Transverse (T)** : T1 multilingue · T2 hébergement suisse, nLPD, données de mineurs · T3 volumes
