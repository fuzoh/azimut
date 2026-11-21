# 25 — Périmètre de la première version de démonstration

Ce document dit ce que contient la première version d'Azimut, ce qui en est exclu, dans quel ordre on la construit et ce qui reste à trancher. C'est la destination de la carte [Carte : périmètre de la première version de démonstration](https://github.com/fuzoh/azimut/issues/38).

> **Statut : proposition du 21 novembre 2026, à valider par le mainteneur.** Ce document assemble les résolutions des tickets de la carte ; il n'ajoute aucune décision. Les choix sont ceux du porteur de la carte (wfdwefwefff, qui a mené les grills ; ce n'est pas « le porteur du projet » de 18 et 20), précisés par deux commentaires du mainteneur du 20 novembre. [18 — Décisions définitives](18-decisions-definitives.md) fait foi sur le modèle de qualification et n'est pas modifié. [27 — Plan de sécurité](27-plan-securite.md) et [28 — Choix techniques proposés](28-choix-techniques.md), cités ici, sont des propositions non validées. Le découpage en tickets de construction et la construction sont des efforts séparés.

Chaque section renvoie au ticket qui porte le détail. En cas d'écart entre ce document et la résolution d'un ticket, le ticket fait foi.

## TL;DR

- **But** : une démonstration de 30 à 45 minutes devant d'autres équipes de cours, pour qu'elles acceptent d'essayer Azimut sur un vrai cours. Le porteur la présente seul, sur deux écrans. Pas de date fixée.
- **Contenu** : un éditeur de grille en tableau, la saisie à deux en temps réel avec un noyau d'observations, le résultat d'un participant avec son explication, et un export `.xlsx` en lecture seule. Deux rôles, des comptes locaux, un cours d'exemple créé par script.
- **Niveau d'exigence** : ce n'est pas un second prototype. La fondation complète de `PRACTICES.md` §6 est posée d'abord.
- **Exclus** : MiData, les droits fins, le cycle de vie au-delà de l'ouverture de la saisie, le reste du catalogue de calcul, les exigences de remplissage, le PDF, l'attestation, l'exploitation durable.
- **Ordre** : fondation et socle, éditeur de grille, saisie à deux et observations ensemble, résultat et explication, export `.xlsx`.
- **Un écart à 18**, provisoire : la règle du résultat « incomplet » (§4).
- **Rien n'est décidé tant que le mainteneur n'a pas validé** les résolutions de la carte et les propositions de 28 (§8).

## 1. Cadre

Résolutions : [Scénario de la démonstration](https://github.com/fuzoh/azimut/issues/39), [Niveau d'exigence](https://github.com/fuzoh/azimut/issues/40).

- **Public** : d'autres équipes de cours. Durée : une demi-heure à trois quarts d'heure, questions comprises.
- **Argument central** : la simplicité et la continuité avec les habitudes. On retrouve sa façon de travailler, avec en plus la saisie à plusieurs, un résultat fiable et expliqué, et une préparation plus rapide.
- **Forme** : le porteur présente seul et suit un parcours préparé. Personne d'autre ne manipule l'application.
- **Données** : fictives seulement, sans lien avec MiData.
- **Fondation, pas jetable** : tout le socle de `PRACTICES.md` §6 est en place avant le parcours. La qualité passe avant l'échéance.

### Parcours

1. Ouvrir le cours d'exemple : ses participants, ses groupes.
2. Construire la grille de zéro : deux ou trois sphères, des objectifs, des critères, des indicateurs notés de 1 à 5 ; une moyenne par sphère ; une sphère réussie à partir de 3 ; le cours réussi si toutes les sphères le sont.
3. Ouvrir la saisie, puis remplir quelques cases à deux écrans : la saisie du téléphone apparaît sur l'écran projeté. Une observation notée sur le téléphone est relue à côté de la case.
4. Basculer sur la même grille déjà remplie « comme en fin de cours » : résultat d'un participant, explication, état du cours.
5. Montrer le classeur `.xlsx` exporté.
6. Questions.

Le déroulé vient du ticket du scénario, où il est proposé « à ajuster ». S'y ajoutent l'ouverture de la saisie ([Saisie à deux en temps réel](https://github.com/fuzoh/azimut/issues/46)), et l'observation de l'étape 3 et l'étape 5, qui viennent de [Observations et export dans la démonstration](https://github.com/fuzoh/azimut/issues/70).

## 2. Ce que contient la première version

On ne construit que ce que le parcours montre.

### 2.1 Socle

Résolution : [Socle minimal](https://github.com/fuzoh/azimut/issues/48), précisée par le mainteneur le 20 novembre.

- **Deux rôles** : le responsable de cours conçoit la grille, le formateur la remplit. Un compte de démonstration par rôle. L'autorisation reste portée par cours.
- **Deux régimes d'authentification**, distingués par la validation de l'environnement au démarrage (`TODO.md` « Auth ») : comptes locaux en développement, test, démonstration et staging, avec des données fictives uniquement en démonstration ; SSO MiData en production, où les comptes locaux sont interdits. La résolution du socle parlait de trois régimes et 28 (ENVIRONNEMENTS-1) en propose quatre : c'est le chiffre du mainteneur qui vaut ; 27 (C-02) et 28 sont à aligner.
- **Cours d'exemple fixe** : une douzaine de participants, deux ou trois groupes, deux formateurs. Un script le crée et le remet à zéro entre deux démonstrations. Participants issus du générateur du prototype. Deux jeux de données pour le même cours : vide et rempli.
- **Aucun écran de gestion** des participants ni des groupes.
- **Où elle tourne** : une instance en ligne sur un petit serveur, avec des données d'exemple seulement, et une installation locale prête en cas de panne de réseau. L'instance n'est pas ouverte à des tiers.

### 2.2 Éditeur de grille

Résolution : [Éditeur de grille minimal](https://github.com/fuzoh/azimut/issues/44).

- **Forme** : un tableau comme Excel, sans écriture de formule. Une ligne par élément de la grille, indentée selon son niveau ; les réglages se modifient dans les cases.
- **Six colonnes** : libellé ; barème (1 à 5, ok/ko) pour les indicateurs ; poids ; calcul ; seuil de réussite ; compte dans le résultat (oui ou indicatif).
- **Trois calculs**, choisis ligne par ligne dans une liste : moyenne pondérée, seuil, « toutes réussies ». Une ligne créée reçoit la moyenne pondérée, poids 1.
- **Quatre niveaux** : sphère, objectif, critère, indicateur, dans cet ordre ; on peut en sauter un.
- **Seuil** : une colonne. L'éditeur crée et cache le nœud de seuil du modèle, qui ne change pas.
- **Retour immédiat** : les erreurs s'affichent sur la ligne fautive ; une dernière colonne montre le résultat d'un participant d'exemple, recalculé à chaque modification. Cela suppose que `compile` rattache chaque erreur à son nœud, avec un code, ce qu'il ne fait pas aujourd'hui ([26](26-acquis-prototype.md) ; 28 CALCUL-5 le propose).
- **Coller depuis Excel** : une liste de libellés collée sous un élément crée une ligne par libellé.
- **Point de départ** : page blanche.

### 2.3 Saisie à deux en temps réel

Résolution : [Saisie à deux en temps réel](https://github.com/fuzoh/azimut/issues/46).

- **Deux vues.** Par participant, sur ordinateur et sur téléphone : la grille en lignes ; la note, le résultat et le commentaire en colonnes ; des flèches vers le participant suivant. La table, sur ordinateur seulement : une ligne par élément de la grille, une colonne par participant ; cases d'indicateur modifiables, lignes calculées en lecture seule, commentaire ouvert depuis la case.
- **En direct** : la note saisie par l'autre apparaît dans la case ; chacun voit qui regarde quel participant.
- **Historique** : chaque case montre les initiales de l'auteur de sa dernière modification ; un appui ouvre la liste des modifications (qui, quand, ancienne valeur), sans restauration.
- **Verrou par case** : modifier la note ou le commentaire verrouille la case ; le serveur refuse l'écriture de l'autre (`CELL_LOCKED`). Libération en quittant la case, à la déconnexion, ou après deux minutes sans activité.
- **Saisie arrivée en retard** : la dernière arrivée gagne ; l'ancienne valeur reste dans l'historique.
- **Coupure courte** : la saisie attend et part au retour du réseau, sans perte. Bandeau « hors connexion » ; marque « en attente d'envoi » sur chaque case concernée.
- **Ouverture de la saisie** : le responsable fait passer la grille du brouillon à la saisie par un bouton (18 §10). Ensuite les libellés restent corrigeables ; tout ce qui touche au calcul passe par une copie (18 §9).

### 2.4 Noyau d'observations

Résolution : [Observations et export dans la démonstration](https://github.com/fuzoh/azimut/issues/70). Spec : [22](22-spec-observations.md).

Les observations sont intégrées à la saisie à deux, parce que cet ensemble décide de la mise en page autour de la case. La première version construit le noyau minimal de la tranche 1 :

- saisie rapide sur téléphone et relecture dans la fiche ([Tracer : saisir une observation générale et la relire](https://github.com/fuzoh/azimut/issues/60)) ;
- rattachement facultatif à un élément de la grille ([Rattachement facultatif d'une observation à la grille](https://github.com/fuzoh/azimut/issues/62)) ;
- panneau à côté de la case, avec copie dans le commentaire de case ([Panneau d'observations à côté de la case et copie dans le commentaire](https://github.com/fuzoh/azimut/issues/66)) ;
- mise à jour en direct entre les deux écrans, par le canal de la saisie à deux.

### 2.5 Résultat et explication

Résolution : [Résultat d'un apprenant et son explication](https://github.com/fuzoh/azimut/issues/49).

- **Résultat d'un participant** : un bandeau en tête de sa vue de saisie, avec le résultat final, puis une ligne par sphère (moyenne, seuil, état). Pas d'écran de synthèse à part.
- **Explication** : un panneau qui s'ouvre sur un résultat, en phrases et en chiffres ; on peut monter et descendre d'un niveau. Calculée par `explain`, sous réserve de la reprise du noyau (28 CALCUL-4).
- **État du cours** : la table de la saisie à deux, avec une ligne « résultat du cours » en tête et les lignes calculées colorées : réussi, non réussi, incomplet. Pas d'écran de synthèse du cours.
- **Incomplet** : un résultat dont une entrée est vide porte la marque « incomplet », avec le compte (« 7 indicateurs sur 9 »). Règle provisoire, voir §4.
- **Non évalué** : marquable case par case, rendu distinct du vide, non compté comme incomplet.

### 2.6 Export

Résolution : [Observations et export dans la démonstration](https://github.com/fuzoh/azimut/issues/70), en accord avec [Choix de la stratégie de résilience](https://github.com/fuzoh/azimut/issues/75).

Un seul export, montré en fin de parcours : le classeur de secours `.xlsx`, en lecture seule. Il contient la table complète en valeurs : notes, état « non évalué », commentaires de case, résultats calculés avec leur phrase d'explication, ligne « résultat du cours », statuts. Il ne contient ni formule ni observation (22 §3).

## 3. Exclus de la première version

| Exclu | Raison | Source |
| --- | --- | --- |
| Connexion MiData, synchronisation des participants, droits par rôle MiData | Données fictives, comptes locaux ; hors de la carte | carte, socle |
| Instance ouverte à des tiers | Seul le porteur manipule l'application | carte |
| Écrans de gestion des participants et des groupes | Le cours d'exemple est créé par script | socle |
| Reste du catalogue de calcul (F4 à F7), joker, dispenses, conversions entre barèmes | La grille du parcours s'écrit avec trois calculs | éditeur |
| Exigences de remplissage configurables | Idem ; remplacées par la règle provisoire du §4 | éditeur, résultat |
| Axe des exercices | Le parcours n'en montre pas | scénario, éditeur |
| Gabarits de grille | La démonstration part d'une page blanche | éditeur |
| Table éléments × participants sur téléphone | Ordinateur seulement | saisie à deux |
| Restauration d'une ancienne valeur | L'historique se lit, sans restauration | saisie à deux |
| Graphe de propagation du prototype | L'explication est en phrases | résultat |
| Écrans de synthèse (participant, cours) | Le bandeau et la table suffisent | résultat |
| Reste de la tranche 1 des observations : moment et historique, saisie pour un groupe, recherche tolérante, brouillon sans réseau, tableau de suivi, copie de grille et anonymisation | Hors du noyau montré | observations et export |
| Tranche 2 des observations : pièces jointes et photos | Sous avis juridique | observations et export |
| PDF imprimable | Reporté ; sera probablement l'export le plus utilisé sur un vrai cours | observations et export |
| Attestation individuelle | Suppose les vues document (18 §11 et §13.7) | observations et export |
| Cycle de vie au-delà de brouillon → saisie : finalisation, clôture, archivage, anonymisation | Aucun dossier réel | carte |
| Hors ligne | Décidé « pas pour l'instant » (`TODO.md`) | `TODO.md` |
| Sauvegardes, supervision complète, procédures d'incident | Données fictives recréées par script (27 §6.2, proposition) | 27 |

Le découpage en tickets de construction est hors de la carte, pas hors de la première version.

## 4. Écart à 18

**Résultat incomplet (18 §6).** 18 lie l'avertissement de données provisoires aux exigences de remplissage : des cases facultatives vides ne le maintiennent pas. La première version n'a pas d'exigences de remplissage ; elle marque « incomplet » tout résultat dont une entrée est vide, hors cases marquées « non évalué ».

Le mainteneur a accepté cette règle le 20 novembre comme **comportement par défaut provisoire de la première version uniquement**. 18 §6 reste inchangé. **Condition de retrait** : la règle disparaît quand les exigences de remplissage configurables sont implémentées.

Ce document ne contient aucun autre écart à 18. Les décisions de `TODO.md` et de la spec 20 que 28 propose de rouvrir sont au §8.

## 5. À ajouter pour un cours pilote réel

Ce qui suit n'est pas spécifié par la carte. La liste dit ce qui est reporté, pas comment le faire ; 27 et la carte de résilience sont des propositions.

- **MiData** : SSO, cours et rôles d'un formateur, synchronisation des participants, correspondance des rôles (27 C-33, §8).
- **Droits** : matrice action × rôle du pilote et titulaire des actions sensibles (27 C-40, §8).
- **Modèle complet** : exigences de remplissage (qui retirent la règle du §4), reste du catalogue de calcul, joker, dispenses, axe des exercices, gabarits.
- **Cycle de vie** : finalisation du dernier soir, réouverture, clôture, archivage, anonymisation (18 §10 ; 27 C-41).
- **Exports** : PDF imprimable, attestation, vues document (18 §11 et §13.7 ; 27 C-39).
- **Observations** : le reste de la tranche 1 ; la tranche 2 après avis juridique.
- **Hébergement** : une production neuve, jamais promue depuis la démonstration (27 C-32) ; sauvegardes (C-36) ; sessions (C-34).
- **Protection des données** : dossier nLPD relu par un juriste (27 C-31), liste fermée des champs MiData (C-42). La partie nLPD de 27 n'est pas vérifiée.
- **Résilience** : les éléments « pilote » de [Trois stratégies de résilience, jugées](https://github.com/fuzoh/azimut/issues/74), dont l'observation d'un vrai dernier soir, dans la carte [Carte : résilience de l'application pendant un cours](https://github.com/fuzoh/azimut/issues/72).
- **Porte d'entrée** : aucune donnée MiData n'entre en base avant la liste de passage de 27 (C-30).

## 6. Ordre de construction

Résolutions : [Niveau d'exigence](https://github.com/fuzoh/azimut/issues/40), [Observations et export dans la démonstration](https://github.com/fuzoh/azimut/issues/70).

1. **Fondation complète et socle minimal.** Les six étapes de `PRACTICES.md` §6 : racine et contrôles de qualité ; outillage des agents ; `contracts`, `domain`, `env`, `testing` ; serveur ; application web ; une première tranche de bout en bout avant toute seconde fonctionnalité. Puis le socle du §2.1.
2. **Éditeur de grille.**
3. **Saisie à deux et noyau d'observations, ensemble**, pour concevoir la mise en page autour de la case en une fois.
4. **Résultat et explication.**
5. **Export `.xlsx`**, qui réutilise les résultats et les phrases de l'étape 4.

### Préalables

- **Avant la fondation** : valider les propositions de 28 que son §11 range « avant la fondation » (graphe des packages, chaîne TypeScript, niveaux de contrôle, volume réel). L'ordre détaillé des décisions techniques et des 22 essais est dans 28 §11 et §12 ; il n'est pas recopié ici.
- **Avant l'étape `domain` de la fondation** : validation par le porteur des défauts figés de [19](19-constats-maquette.md) et du versionnage des fonctions, qui conditionne le format de grille (28 CALCUL-4).
- **Avant l'étape 3** : arbitrer [Arbitrage des détails UX de la tranche 1 des observations](https://github.com/fuzoh/azimut/issues/84).
- **Sécurité** : 27 range ses contrôles par phase, et chaque contrôle arrive avec l'étape qui crée ce qu'il protège (C-01 à C-20 en fondation, C-21 à C-30 pour la démonstration).
- **Avant la démonstration** : hébergeur, domaine et repli local exercé une fois (28 ENVIRONNEMENTS-4 à 6 ; 27 C-26).

## 7. Ce que la carte laisse sans réponse

Relevé à l'assemblage, sans y répondre :

- **La copie de grille.** Après l'ouverture de la saisie, « tout ce qui touche au calcul passe par une copie ». Aucune résolution ne dit si la première version construit la copie, ou seulement le refus de modifier une grille ouverte.
- **Qui saisit.** Le socle dit que le formateur « remplit seulement » ; il ne dit pas si le responsable de cours saisit aussi. 27 (C-27) le déduit, « à confirmer par le porteur ».
- **Les éléments « démonstration » de la résilience.** [Trois stratégies de résilience, jugées](https://github.com/fuzoh/azimut/issues/74) range dans cette phase, outre le classeur : un essai sur table avec une vraie équipe, un onglet qui tient la panne, un essai sur de vrais téléphones. Seul le classeur est repris par une résolution de cette carte.

## 8. Points ouverts

| Point | Qui tranche |
| --- | --- |
| Valider les résolutions de la carte : ce sont les choix du porteur de la carte, pas des décisions du projet | mainteneur |
| Valider ou corriger les 70 propositions de 28, dont 11 rouvrent une décision prise (28 §10) : entre autres le recalcul complet du participant contre « sans recalculer tout le graphe » (CALCUL-1) et la reprise du code du noyau contre « on jette le code » de la spec 20 (CALCUL-4). `TODO.md` n'est pas modifié d'ici là | mainteneur |
| Les dix frictions entre 27 et 28 (28 §13), dont le nombre de régimes à aligner sur deux | mainteneur |
| Valider le plan de sécurité 27 et ses décisions à prendre (27 §8) | mainteneur, porteur du projet, juriste selon la ligne |
| Les trois points du §7 | porteur de la carte, puis mainteneur |
| Détails UX de la tranche 1 des observations ([ticket](https://github.com/fuzoh/azimut/issues/84)) | porteur de la carte |
| Défauts figés de 19 et volume réel d'un cours (28 CALCUL-4, MESURES-6) | porteur de la carte |
| Facilité réelle de l'éditeur (18 §1) : aucune maquette n'a été faite. La recommandation de triage sous la carte propose un essai devant un formateur avant la démonstration | mainteneur |
| Sort d'une saisie en attente refusée par `CELL_LOCKED` quand le verrou a changé de main. La recommandation de triage propose de la rejouer en « dernière arrivée gagne » | mainteneur, à écrire dans le ticket de la saisie à deux |
| Mesures du prototype : [campagne](https://github.com/fuzoh/azimut/issues/27) non close, [harnais](https://github.com/fuzoh/azimut/issues/28) en cours ; aucune variante de moteur retenue | mainteneur |
| Survie d'une saisie au rechargement de la page : demandée par la carte de résilience si un essai sur téléphones passe ; rouvre `TODO.md` « Coupure courte » | mainteneur, après l'essai |
| Langue des artefacts et place du personnel non technique : non instruits par 28 | mainteneur |
| Section « Consignes et données » annoncée comme faite par 27 et absente d'`AGENTS.md` ([issue](https://github.com/fuzoh/azimut/issues/88)) | mainteneur |

## Sources

- Carte et tickets : [carte](https://github.com/fuzoh/azimut/issues/38), dont les commentaires du mainteneur du 20 novembre 2026 sous la carte et sous le ticket du résultat.
- Documents : [18](18-decisions-definitives.md), [22](22-spec-observations.md), [26](26-acquis-prototype.md), [27](27-plan-securite.md), [28](28-choix-techniques.md), `docs/PRACTICES.md` §6, `docs/TODO.md`.
- Résilience : [carte](https://github.com/fuzoh/azimut/issues/72) ; son document `29-resilience.md` n'existe pas encore.
