# Inventaire des features et conventions

Ce document fixe les IDs des features déjà notées (S, L, C, P, A, I, T) et les conventions communes aux analyses de ce dossier. Il a servi de brief aux agents qui ont rédigé les documents 01 à 08.

## Contexte
Azimut : application de qualification pour les cours de formation scouts suisses. Sources analysées :
- `docs/FEATURES.md` (domaine, le plus important)
- `docs/TODO.md` (décisions ; ne garder que ce qui touche au domaine)
- `docs/GOALS.md` (intention)
Les 3 modèles Excel analysés sont dans `.scratch/exemple qualif a analyser/` (qualif1..3.xlsx, lisibles avec `uv run --with openpyxl python`). Le dossier `.scratch/` n'est pas versionné.

## Périmètre
Domaine métier et comportement attendu uniquement. **Pas de technologie, pas d'implémentation** (pas de DB, framework, API, tables…). On parle de concepts, d'usages, de règles, d'acteurs, de moments.

## Inventaire des features (IDs utilisés dans tous les documents)
Structure et évaluation (S) :
S1 création dans l'app à partir de primitives · S2 arbre indicateur→critère→objectif→sphère, résultat calculé à chaque nœud · S3 échelles multiples et conversion · S4 seuils par partie de l'arbre · S5 agrégations paramétrées (poids, arrondi, vides) · S6 commentaire de synthèse par nœud · S7 recalcul incrémental type tableur · S8 référentiel vs instances (exercice × critère) · S9 regroupements n-n (thèmes, sécurité) décisifs/indicatifs/organisationnels · S10 axes (exercice/rendu, thème, type de critère, moment) · S11 règle de décision / seuil final · S12 critères éliminatoires (veto + justification) · S13 joker · S14 Posture / grilles hors calcul · S15 éléments commentés sans note · S16 observations datées et attribuées
Cycle de vie (L) :
L1 brouillon hors cours puis lien à un cours · L2 figer la structure · L3 modifier la structure pendant le cours · L4 copie avec données pour comparer · L5 finalisation du dernier soir (reformulation, commentaire général, 3 points +/-, joker) · L6 clôture (figer les données) · L7 export PDF / impression (attestation) · L8 archivage · L9 anonymisation à 3 mois, conservation, purge
Saisie et collaboration (C) :
C1 vues de saisie (par apprenant, par sphère, par sphère × groupe) · C2 temps réel · C3 verrou de cellule texte · C4 dernier gagnant · C5 moment de sauvegarde, brouillons · C6 coupure courte sans perte · C7 historique par cellule et journal · C8 restauration d'une cellule ou d'une partie de grille · C9 hors ligne (plus tard)
Projections et suivi (P) :
P1 projections (les 5 exemples de FEATURES.md) · P2 suivi de remplissage (vides, sans commentaire) · P3 stats par apprenant (écart type, évolution) · P4 état du cours, disparités · P5 stats entre cours / par type de cours · P6 stats temporelles · P7 accueil personnalisé
Acteurs et accès (A) :
A1 réservé aux formateurs · A2 visibilité limitée à ses cours · A3 droits rôle × cours, correspondance rôles MiData · A4 groupes d'évaluation · A5 formateur référent · A6 connexion SSO MiData (comptes locaux en dev)
Intégrations (I) :
I1 cours et rôles depuis MiData · I2 participants depuis MiData et synchronisation · I3 envoi automatique par mail · I4 report dans MiData
Transverse (T) :
T1 multilingue · T2 hébergement suisse, nLPD, données de mineurs · T3 volumes
Les **nouvelles** features proposées ont un ID préfixé par document : `N-CF` (01), `N-MG` (02), `N-HA` (04), `N-PA` (05), `N-QX` (06). Le document 08 les fusionne sous des IDs définitifs `X1`…`X70`. Le document 11 ajoute ensuite `N-PV1` à `N-PV8` (vues), qui ne sont pas fusionnés dans 08.

## Conventions de rédaction
- Français, phrases courtes et simples, voix active, comme `docs/FEATURES.md`. Gras pour les termes clés. Pas de jargon inutile, pas d'emphase marketing.
- Visualisations : diagrammes **Mermaid** (rendus par GitHub : `flowchart`, `classDiagram`, `stateDiagram-v2`, `journey`, `timeline`, `quadrantChart`, `mindmap`) et tableaux Markdown. Garder chaque diagramme lisible (< ~30 nœuds ; découper sinon). Vérifier la syntaxe Mermaid : libellés avec caractères spéciaux entre guillemets, pas d'accents dans les IDs de nœuds.
- Distinguer clairement ce qui est **constaté** (dans les docs ou les Excel) de ce qui est **proposé**.
- Chaque doc commence par un titre, une phrase de but, et un TL;DR de 5 à 8 puces.
