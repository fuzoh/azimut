## Destination

Le **périmètre d'une première version de démonstration** d'Azimut et son **ordre de construction**, dans `docs/analyse/25-perimetre-v1.md`. La carte s'arrête quand on sait ce que contient cette version, ce qui en est exclu et par quoi on commence ; le découpage en tickets et la construction sont des efforts séparés.

## Notes

- **Cadre fixé au lancement (15 novembre 2026)** :
  - **But** : une démonstration à d'autres équipes de cours, pour qu'elles acceptent d'essayer Azimut sur un vrai cours. Pas de date fixée.
  - **Forme** : le porteur la présente lui-même, en suivant un parcours préparé. Personne d'autre ne manipule l'application.
  - **À voir absolument** : concevoir une grille simple dans l'application ; remplir une grille à deux formateurs en temps réel ; voir le résultat calculé d'un apprenant, avec son explication.
  - **S'il reste du temps** : les observations (spec 22), un export ou une attestation.
  - **Données** : comptes de démonstration et cours d'exemple, sans lien avec MiData. Participants issus du générateur du prototype.
  - **Éditeur de grille** : dans la première version, par choix du porteur. C'est la partie la moins définie du projet (18 §1 : la facilité réelle reste à éprouver) ; la carte la traite en premier.
- **Domaine** : `docs/analyse/18-decisions-definitives.md` fait foi. Vocabulaire : `GLOSSARY.md`. Ne pas rouvrir 18 sans le signaler.
- **Acquis** : spec et prototype du modèle de calcul (issue #14, branche `spec/prototype`), dont la campagne de mesures (#27) n'est pas faite ; spec des observations (22) ; décisions techniques dans `TODO.md` et `PRACTICES.md`.
- **Sécurité** : `docs/analyse/27-plan-securite.md` (proposition) range ses contrôles dans les mêmes phases que cette carte : fondation, démonstration, pilote, production. Il renvoie trois questions au ticket sur la saisie en temps réel : dernier gagnant, verrous, qui fige la structure d'une grille.
- **Skills** : grilling + domain-modeling pour les tickets de grill ; research pour les tickets de recherche. Tickets et résolutions en français.

## Decisions so far

<!-- one line per closed ticket -->

- Scénario de la démonstration (`01-grilling-scenario-demonstration.md`) : 30 à 45 minutes devant d'autres équipes ; argument central, la simplicité et la continuité avec les habitudes ; grille construite de zéro sous la forme courante (sphères, objectifs, critères, indicateurs de 1 à 5, moyenne et seuil par sphère, réussite si toutes), sans axe par exercice ; cours d'une douzaine d'apprenants ; saisie à deux écrans par le porteur ; bascule sur la même grille déjà remplie pour les résultats.
- Acquis du prototype du modèle de calcul (`03-research-acquis-prototype.md`, constats dans `docs/analyse/26-acquis-prototype.md`) : le code est sur `main` dans `prototype/` ; noyau pur et testé, réutilisable ; aucun éditeur de grille ; format JSON typé à cacher derrière l'éditeur ; F1 à F3 suffisent pour une grille simple ; `compile` valide partiellement ; aucune variante de moteur retenue, mais un recalcul complet par participant suffit à l'échelle de la démonstration ; aucun acquis pour le temps réel.
- Niveau d'exigence (`02-grilling-niveau-exigence.md`) : fondation complète selon `PRACTICES.md` §6 avant le parcours de démonstration, sans contrainte de date ; instance en ligne à données d'exemple, avec repli local ; les décisions techniques ouvertes de `TODO.md` font l'objet de propositions de l'agent, validées par le propriétaire.
- Socle minimal (`06-grilling-socle-minimal.md`) : deux rôles, responsable de cours (conçoit la grille) et formateur (la remplit) ; un environnement « démonstration » distinct où les comptes locaux sont autorisés, la production restant stricte ; cours d'exemple créé et remis à zéro par un script, sans écran de gestion des participants.
- Propositions pour les décisions techniques ouvertes (`08-task-decisions-techniques-ouvertes.md`, document `docs/analyse/28-choix-techniques.md`) : 70 propositions en huit lots, chacune relue par un contradicteur ; écritures par HTTP et WebSocket maison sans Electric, recalcul complet du participant, noyau du prototype porté depuis ses tests, Dependabot, Caddy ; 11 décisions prises seraient rouvertes ; 22 essais à lancer. À valider par le propriétaire ; l'ordre au rejeu et la libération du verrou sont renvoyés au ticket sur la saisie en temps réel.

## Not yet specified

- **Observations et export dans la démonstration** : à décider quand le parcours principal est fixé.
- **Ce qui suit la démonstration** : ce qu'il faudrait ajouter pour un cours pilote réel (MiData, droits, cycle de vie, hébergement). Hors de cette carte, mais le document de périmètre doit dire ce qui est reporté.
- **Rédaction du document de périmètre et de l'ordre de construction** : dernier ticket, quand le reste est clos.

## Out of scope

- La connexion MiData, la synchronisation des participants et les droits par rôle MiData.
- Une instance en ligne ouverte à des tiers.
- Le découpage en tickets de construction.
