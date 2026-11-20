> Publié dans l'issue [#51](https://github.com/fuzoh/azimut/issues/51) le 16 novembre 2026. L'issue fait foi ; ce fichier n'est plus tenu à jour.

## Tâche

Proposer une réponse argumentée à chaque **décision technique ouverte** de `docs/TODO.md` (« Technique : décisions ouvertes » et « À explorer / confirmer »), pour que le propriétaire du dépôt valide ou corrige.

La fondation complète décidée au ticket sur le niveau d'exigence oblige à les régler avant de construire.

Pour chaque décision :

- la **proposition**, en une phrase ;
- la **raison**, appuyée sur `PRACTICES.md`, les recherches de `docs/research/` et les constats du prototype (`docs/analyse/21-constats-prototype.md`, `26-acquis-prototype.md`) ;
- ce qu'elle **coûte** et ce qui la ferait **changer** ;
- si elle peut **attendre** après la démonstration.

Résultat attendu : un document dans `docs/analyse/`, une section par décision, sans rien modifier dans `TODO.md` tant que le propriétaire n'a pas validé.

## Résolution (15 novembre 2026)

Propositions dans `docs/analyse/28-choix-techniques.md` : 70 fiches en huit lots. Chacune a été instruite par un agent, puis relue par un contradicteur qui a revérifié les faits : 12 confirmées, 54 modifiées, 3 gardées comme orientations faute de preuves, aucune rejetée. Une synthèse a tranché treize incohérences entre lots ; une relecture indépendante a relevé 16 problèmes, tous corrigés.

- **Rien n'est décidé** : `docs/TODO.md` n'est pas modifié, le propriétaire du dépôt y reportera ce qu'il valide.
- **Onze décisions prises seraient rouvertes** (28 §10), dont « sans recalculer tout le graphe », « on jette le code du prototype », le viewport unique et les trois régimes d'environnement.
- **Dix frictions avec le plan de sécurité** (28 §13) sont à trancher avec lui.
- **Au porteur** : valider les défauts figés de 19 avant le portage du noyau, confirmer le volume réel d'un cours, et trancher au ticket sur la saisie en temps réel l'ordre au rejeu et la libération du verrou.
- **Non instruit** : la langue des artefacts et la place du personnel non technique (`docs/SKILLS.md` §4).
