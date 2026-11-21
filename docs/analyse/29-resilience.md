# 29 — Stratégie de résilience pendant un cours

Ce document dit ce qui peut mal tourner pendant un cours si tout repose sur Azimut, ce que l'équipe fait alors, et ce que l'application doit offrir pour que le cours continue. C'est la destination de la carte [Carte : résilience de l'application pendant un cours](https://github.com/fuzoh/azimut/issues/72).

> **Statut : proposition du 21 novembre 2026, à valider par le mainteneur.** Ce document assemble les résolutions des tickets de la carte ; il n'ajoute aucune décision. Les choix viennent de deux grills : celui du 16 novembre avec wfdwefwefff (« le porteur » de la carte, qui n'est pas « le porteur du projet » de 18 et 20), puis celui du 21 novembre avec le mainteneur, qui modifie le premier. Les écarts entre les deux restent à discuter de vive voix avec wfdwefwefff. [18 — Décisions définitives](18-decisions-definitives.md) fait foi et n'est pas modifié. [27 — Plan de sécurité](27-plan-securite.md) et [28 — Choix techniques proposés](28-choix-techniques.md), cités ici, sont des propositions non validées. Le découpage en tickets de construction et la construction sont des efforts séparés.

Chaque section renvoie au ticket qui porte le détail. En cas d'écart entre ce document et la résolution d'un ticket, le ticket fait foi.

## TL;DR

- **Question d'origine** (16 novembre 2026) : « Un Excel était exportable, ouvrable par tout le monde. Qu'en est-il de notre application ? Tout repose là-dessus, ça peut compromettre le cours. »
- **La stratégie tient en deux pièces** : un **classeur de secours** `.xlsx`, envoyé automatiquement par e-mail deux fois par jour, et **deux webmasters qui relancent le service à la main**, sans astreinte ni délai promis.
- **En panne**, l'équipe suit une fiche de panne : elle ouvre le dernier classeur reçu et continue dessus. Un cours peut se terminer entièrement sur le classeur.
- **Au retour**, on ressaisit à la main. L'application reste la référence.
- **Autour** : sauvegardes de la base chaque heure pendant un cours, gel des déploiements, runbook exercé avant le pilote, file d'envoi durable si un essai sur de vrais téléphones passe, observation d'un vrai dernier soir avant le premier cours réel.
- **Écartés** : le cours embarqué sur chaque appareil, la relance automatisée, tout rôle d'un agent en production, la machine de relève, l'import du classeur.
- **Fragile** : le comportement d'un onglet quand le serveur ne répond plus n'est pas vérifié ; l'absence de réseau sur un lieu de réunion n'a jamais été observée.

## 1. Ce qui peut mal tourner

Résolution : [Scénarios de défaillance pendant un cours](https://github.com/fuzoh/azimut/issues/73). Inventaire établi à partir du dépôt ; probabilités et gravités sont des estimations.

La colonne « Réponse » est une lecture d'assemblage : elle rapproche chaque scénario des pièces retenues aux §2 à §5. La couverture détaillée jugée dans [Trois stratégies de résilience, jugées](https://github.com/fuzoh/azimut/issues/74) portait sur des stratégies depuis modifiées ; elle n'est pas reprise ici. « Hors stratégie » signifie que la stratégie de résilience ne traite pas le scénario ; la référence citée, quand il y en a une, est une proposition ou une décision prise ailleurs.

| # | Scénario | Probabilité | Gravité | Réponse |
| --- | --- | --- | --- | --- |
| S1 | Serveur ou hébergeur en panne pendant la réunion du dernier soir | moyenne | critique | Classeur de secours, envoyé avant la séance par le bouton (§2) ; fiche de panne (§4) ; relance manuelle (§3) |
| S2 | Données corrompues ou supprimées sans restauration possible | faible | critique | Sauvegardes horaires et restauration manuelle (§3) ; le dernier classeur reçu comme copie lisible (§2) |
| S3 | Réseau absent ou instable sur le lieu du camp | élevée | élevée | Coupure courte : file d'envoi durable, sous réserve de l'essai (§5). Classeur lisible sans réseau une fois reçu (§2). Absence longue : jamais observée, à observer (§5) |
| S4 | Saisies perdues en silence : onglet fermé, rechargé ou tué | élevée | élevée | File d'envoi durable, sous réserve de l'essai (§5) |
| S5 | Seul exploitant injoignable pendant un incident | élevée | élevée | Deux webmasters, chacun capable de restaurer seul (§3) ; sans réponse, le cours continue sur le classeur (§4) |
| S6 | Erreur de saisie à grande portée | moyenne | élevée | Hors stratégie. Historique et annulation d'une saisie par groupe : 27 C-08 |
| S7 | Grille fausse découverte en cours, ou mauvaise grille copiée | moyenne | élevée | Hors stratégie |
| S8 | Résultat faux : bug de calcul ou grille mal configurée | moyenne | élevée | Hors stratégie. Tout résultat se recalcule depuis les données sources (18 §10) ; le classeur ne contient pas de formule |
| S9 | Mise à jour ratée pendant le cours | moyenne | élevée | Gel des déploiements pendant un cours (§3) |
| S10 | MiData indisponible : connexion impossible | faible | élevée | Classeur lisible sans compte (§2). Mode de secours : décision ouverte de 27 §8 |
| S11 | Données enfermées dans l'application | élevée | élevée | Classeur de secours (§2) ; toute vue s'exporte (18 §11) |
| S12 | Application plus maintenue | moyenne | élevée | Les classeurs déjà reçus restent lisibles avec n'importe quel tableur (§2) |
| S13 | Hébergement ou domaine arrêté | faible | élevée | Sauvegardes hors serveur (27 C-36) et restauration sur un autre serveur selon le runbook (§3) |
| S14 | Formateur qui ne sait pas se servir de l'outil | élevée | moyenne | Hors stratégie |
| S15 | Téléphone perdu, volé, à plat ou trop ancien | élevée | moyenne | Hors stratégie |
| S16 | Session expirée ou perdue en pleine saisie | moyenne | moyenne | Hors stratégie. Durées de session : décision ouverte de 27 §8 |
| S17 | Compte bloqué ou droits absents | moyenne | moyenne | Hors stratégie ; le classeur reste lisible sans compte par ses destinataires (§2) |
| S18 | Liste des participants fausse ou changée par MiData | moyenne | moyenne | Hors stratégie |
| S19 | La réunion du dernier soir coince : lenteur et verrous | moyenne | moyenne | Hors stratégie. Verrous : 27 C-29 |

Les trois scénarios jugés les plus lourds sont S1, S2 et S4 ; les trois plus probables parmi les graves sont S3, S5 et S11.

### Ce qu'Excel offrait, et ce qu'il n'offrait pas

- **Il offrait** un fichier lisible sans compte ni réseau, avec n'importe quel tableur ; le calcul dans le fichier ; une copie chez chacun, qui servait de sauvegarde informelle ; aucune dépendance (hébergeur, MiData, exploitant) ; une feuille imprimable ; une relecture des années plus tard.
- **Il n'offrait pas** la saisie à plusieurs ; des calculs fiables (les trois modèles analysés ont des formules cassées, `FEATURES.md` « Ce qui est commun ») ; d'historique ; de sauvegarde automatique ; de contrôle d'accès ni de purge des données de mineurs ; de saisie commode sur téléphone.
- **Limite** : les classeurs analysés sont vierges. Leur usage réel (partage, fusion, pannes vécues) n'a pas été observé.

## 2. Le classeur de secours

Résolutions : [Choix de la stratégie de résilience](https://github.com/fuzoh/azimut/issues/75), [Ce que l'agent peut faire seul pendant une panne](https://github.com/fuzoh/azimut/issues/77) (décisions 3 et 4), [Observations et export dans la démonstration](https://github.com/fuzoh/azimut/issues/70).

- **Ce que c'est** : un fichier `.xlsx` du cours, lisible sans compte ni réseau. Il contient la table complète en valeurs : notes, état « non évalué », commentaires de case, résultats calculés avec leur phrase d'explication, ligne « résultat du cours », statuts. Il ne contient ni formule ni observation ([25](25-perimetre-v1.md) §2.6, 22 §3).
- **Envoi par e-mail** : un worker génère le classeur et l'envoie en pièce jointe aux personnes configurées pour le cours.
- **Réglages**, par le responsable de cours : les destinataires, la fréquence et les dates d'envoi. Par défaut, les dates sont celles de chaque partie du cours.
- **Fréquence** : deux envois par jour par défaut, à heures réglables.
- **Bouton « envoyer le classeur maintenant »**, pour le responsable de cours. Il est à actionner avant la séance de qualification du dernier soir.
- **Ce que le canal n'a pas** : pas de journal des envois, pas de mot de passe sur le fichier, pas d'avis juridique demandé au préalable pour ce canal. Le texte d'information de 27 C-31 devra mentionner l'envoi du classeur par e-mail.
- **Dans la démonstration** : le classeur est montré en lecture seule, en fin de parcours (déjà reporté dans [25](25-perimetre-v1.md) §2.6). L'envoi par e-mail n'en fait pas partie.

## 3. La relance du service

Résolution : [Ce que l'agent peut faire seul pendant une panne](https://github.com/fuzoh/azimut/issues/77) (décisions 1, 2 et 5).

« Webmaster » est le mot de cette résolution pour les deux exploitants nommés de 27 C-37.

- **Deux webmasters**, chacun capable de restaurer seul. Pas d'astreinte, pas de délai promis.
- **Ce qui se relance seul** : le conteneur, par la politique de redémarrage de Docker. Rien d'autre.
- **Ce qui se fait à la main** : redémarrer la machine, restaurer la dernière sauvegarde sur un autre serveur. Les gestes sont décrits dans un **runbook** versionné dans le dépôt, **exercé avant le pilote**.
- **Détection** : une surveillance externe (health check) prévient les webmasters, par une adresse commune.
- **Sauvegardes de la base** : une par heure pendant un cours (27 C-36, inchangé). Elles se règlent côté infrastructure, pas dans l'application. L'outil reste à choisir (piste : pgBackRest ; les essais de [Relance sans garde humaine : automatisation et agent](https://github.com/fuzoh/azimut/issues/76) utilisaient restic, comme la proposition de 28 §8).
- **Gel des déploiements** pendant un cours (27 C-37).
- **Communication** : aucun message automatique vers l'équipe du cours. Au retour du service, un webmaster écrit au responsable de cours, avec l'heure de la sauvegarde remontée.
- **Rôle de Claude** : aucun accès à la production. Il garde son rôle ordinaire : écrire et entretenir le runbook et les scripts, sur une branche.

## 4. Pendant et après la panne

Résolution : [Ce que l'agent peut faire seul pendant une panne](https://github.com/fuzoh/azimut/issues/77) (décisions 6 et 7).

### La fiche de panne

Elle est remise à l'équipe au début du cours. Trois gestes :

1. vérifier le réseau ;
2. ouvrir le dernier classeur reçu et continuer dessus ;
3. écrire à l'adresse des webmasters, sans attendre de réponse.

Le classeur peut porter tout le reste du cours si besoin.

### Le retour vers l'application

- Aucun import du classeur, pour l'instant. La **ressaisie se fait à la main**.
- Si le cours s'est terminé sur le classeur, le responsable de cours saisit après coup les décisions de qualification.
- L'application reste la référence.

## 5. Sous réserve d'un essai ou d'une observation

Résolutions : [Choix de la stratégie de résilience](https://github.com/fuzoh/azimut/issues/75), maintenues par [Ce que l'agent peut faire seul pendant une panne](https://github.com/fuzoh/azimut/issues/77) (décision 8).

- **File d'envoi durable** : une saisie survit au rechargement de la page, **si** un essai sur de vrais téléphones (iPhone et Android) confirme que c'est fiable. Cela rouvre `TODO.md` « Coupure courte », qui n'exige pas la survie à un rechargement. Le mécanisme (service worker, moteur de synchronisation, file maison) est un choix du mainteneur, ouvert dans `TODO.md` « Coupure courte, mécanisme » ; il est hors de cette carte.
- **Observation d'un vrai dernier soir** avant le premier cours réel (`03-zones-d-ombre.md`, D5 et D6). C'est elle qui départagerait le classeur de secours et le cours embarqué : si l'absence de réseau sur le lieu de réunion était constatée, le cours embarqué remonterait.

## 6. Options étudiées et écartées

| Option | Source | Raison |
| --- | --- | --- |
| **Cours embarqué sur chaque appareil** (stratégie B) : copie du cours et calcul sans serveur | [jugement](https://github.com/fuzoh/azimut/issues/74) | Refusé par les quatre juges pour le pilote : données de mineurs sur chaque téléphone personnel, 30 à 60 jours de travail, décision « Hors ligne » de `TODO.md` rouverte, pour un besoin jamais observé. Seule sa file d'envoi durable est gardée |
| **Garde et relève comme réponse seule** (stratégie C) : seconde machine, personne de garde le dernier soir | [jugement](https://github.com/fuzoh/azimut/issues/74), [choix](https://github.com/fuzoh/azimut/issues/75) | Fait dépendre le dernier soir d'un exploitant de garde. Astreinte écartée par le porteur ; pas de machine de secours au pilote |
| **Relance par scripts** (O1) : redémarrage par l'API de l'hébergeur, workflow de restauration avec approbation, commandes de secours fermées | [recherche](https://github.com/fuzoh/azimut/issues/76), [grill du mainteneur](https://github.com/fuzoh/azimut/issues/77) | Écartée par le mainteneur : la relance est manuelle. L'approbation à donner en 20 minutes restait une garde souple |
| **Claude à la demande** (O2), depuis le téléphone du responsable de cours | idem | Écartée : l'agent sort de la stratégie, sans étape « plus tard ». Ses quatre préalables (dépôt dans une organisation GitHub, compte machine, forfait Team, test « agent compromis ») ne sont plus demandés par cette carte |
| **Claude sur alerte** (O3) | idem | Écartée ; apport propre mince, et contredisait 27 §8 |
| **Copies gardées par deux personnes sur leur ordinateur**, produites et journalisées par le serveur, après avis juridique | [choix](https://github.com/fuzoh/azimut/issues/75), modifié par le [grill du mainteneur](https://github.com/fuzoh/azimut/issues/77) | Remplacées par l'envoi par e-mail, sans journal ni avis préalable |
| **Sauvegardes toutes les 15 minutes** | [jugement](https://github.com/fuzoh/azimut/issues/74), [recherche](https://github.com/fuzoh/azimut/issues/76) | Fréquence horaire de 27 C-36 gardée |
| **Messages automatiques à l'équipe du cours** pendant une panne | [recherche](https://github.com/fuzoh/azimut/issues/76) | La fiche de panne suffit |
| **Import du classeur vers l'application** | [grill du mainteneur](https://github.com/fuzoh/azimut/issues/77) | Écarté pour l'instant : ressaisie à la main |
| Recalcul dans le classeur, copie du cours sur l'appareil | [jugement](https://github.com/fuzoh/azimut/issues/74) | Rangés en « production, seulement sur preuve » |

## 7. Écarts avec les décisions et propositions existantes

- **`TODO.md` « Coupure courte »** (décision prise) : rouverte par la file d'envoi durable, sous réserve de l'essai (§5). 27 §8 recommandait la reprise en mémoire, qui ne laisse rien sur l'appareil ; si la file durable est retenue, 27 C-15 et C-35 s'appliquent.
- **`TODO.md` « Hors ligne : pas pour l'instant »** : inchangé.
- **18** : aucun écart. La stratégie s'appuie sur 18 §10 (tout se recalcule depuis les données sources) et 18 §11 (toute vue s'exporte).
- **27 C-37** : perd l'export de secours de la veille du dernier soir, remplacé par les envois du classeur. Le reste tient : deux exploitants, runbook dans le dépôt, gel des déploiements.
- **27 C-31** : le texte d'information devra mentionner l'envoi du classeur par e-mail. L'avis d'un juriste n'est plus une condition de ce canal.
- **27 C-17 et §8** (aucun agent avec un secret de production, aucun agent déclenché par un événement) : inchangés. La contradiction ouverte par le grill du 16 novembre disparaît.
- **27 C-23, C-25 et C-36** : pas amendés.
- **28 §8, file de tâches** : l'envoi programmé du classeur est le « premier besoin périodique ». Une file de tâches arrive donc avant le pilote, alors que 28 n'en prévoyait pas avant.
- **28 §8** : un service d'envoi d'e-mails s'ajoute.
- **28 §8, sauvegardes** : 28 propose `pg_dump` et restic ; la piste citée au grill est pgBackRest. Le choix reste ouvert.
- **28 ECRITURES-5** : limite la file durable aux observations et note que « la même durabilité exigée pour la grille » changerait la proposition. C'est ce que la file d'envoi durable demanderait si l'essai passe.
- **Entre les deux grills de la carte** : l'exigence « relance automatique ou par un agent » du 16 novembre est retirée ; les copies ne sont plus gardées par deux personnes ni journalisées ; l'avis juridique n'est plus une condition. À discuter de vive voix avec wfdwefwefff.

## 8. Points non vérifiés et points à confirmer

### Non vérifié

- **Un onglet garde-t-il ses données et recalcule-t-il quand le serveur ne répond plus ?** La recommandation du jugement reposait sur ce comportement (essai d'un jour, prévu comme préalable). S'il ne tient pas, le cours embarqué remonte.
- **L'absence de réseau sur le lieu de réunion** n'a jamais été observée (`03-zones-d-ombre.md`, D5 et D6).
- **La file d'envoi durable sur Safari iOS et Chrome Android** (28 ECRITURES-5).
- **La durée d'une restauration manuelle** : aucun délai n'est promis ; l'exercice du runbook la mesurera.
- **Le coût** : l'estimation de 29 à 42 jours jusqu'au pilote portait sur la recommandation du jugement, avant le grill du mainteneur. Elle n'a pas été refaite.
- **L'usage réel des classeurs Excel** pendant un cours (partage, fusion, pannes vécues).

### À confirmer par le mainteneur

La recommandation du [jugement](https://github.com/fuzoh/azimut/issues/74), retenue par le [choix](https://github.com/fuzoh/azimut/issues/75), contenait des éléments que le [grill du mainteneur](https://github.com/fuzoh/azimut/issues/77) ne mentionne pas. Leur statut n'est pas tranché :

- l'**onglet qui tient la panne** : pas de plafond de tentatives, avertissement avant de quitter ; et la copie du classeur produite depuis un onglet encore ouvert ;
- la **grille vierge imprimable** comme second repli ;
- la **ressaisie guidée** au retour (le grill dit « ressaisie à la main ») ;
- l'**essai sur table du classeur** avec une vraie équipe ;
- en fondation : la provenance et la version de base dans l'historique (27 C-08), l'époque de restauration (corrige 28 ECRITURES-4) ;
- la **suppression des copies à la clôture** : sans objet pour des pièces jointes déjà envoyées, mais la question de leur durée de vie chez les destinataires n'est pas traitée.

## 9. Ce qu'il faut construire ou organiser

Liste d'assemblage, pour préparer le découpage. Elle ne fixe ni ordre ni tickets.

| Domaine | Élément | Phase | Section |
| --- | --- | --- | --- |
| Application | Générateur du classeur de secours `.xlsx` | démonstration | §2 |
| Application | Réglages par cours : destinataires, fréquence, dates, heures d'envoi | pilote | §2 |
| Application | Envoi programmé par un worker, en pièce jointe | pilote | §2 |
| Application | Bouton « envoyer le classeur maintenant » | pilote | §2 |
| Application | File d'envoi durable, si l'essai passe | pilote | §5 |
| Infrastructure | File de tâches et service d'envoi d'e-mails | pilote | §7 |
| Infrastructure | Redémarrage automatique du conteneur | fondation | §3 |
| Infrastructure | Surveillance externe et adresse commune des webmasters | pilote | §3 |
| Infrastructure | Sauvegardes horaires pendant un cours ; choix de l'outil | pilote | §3 |
| Infrastructure | Gel des déploiements pendant un cours | pilote | §3 |
| Organisation | Deux webmasters nommés, chacun capable de restaurer seul | pilote | §3 |
| Organisation | Runbook dans le dépôt, exercé avant le pilote | pilote | §3 |
| Organisation | Fiche de panne remise au début du cours | pilote | §4 |
| Organisation | Mention de l'envoi par e-mail dans le texte d'information (27 C-31) | pilote | §7 |
| Essai | Onglet sans serveur : données gardées et recalcul | fondation | §8 |
| Essai | File d'envoi durable sur de vrais iPhone et Android | démonstration | §5 |
| Observation | Un vrai dernier soir, avant le premier cours réel | avant le pilote | §5 |

Les phases viennent du tableau du [jugement](https://github.com/fuzoh/azimut/issues/74) quand l'élément y figure ; les éléments introduits par le [grill du mainteneur](https://github.com/fuzoh/azimut/issues/77) sont rangés au pilote, où ce grill situe le runbook et la file de tâches.

## 10. Hors de ce document

- La construction et le découpage en tickets.
- Le mécanisme de la file d'envoi durable : `TODO.md` « Coupure courte, mécanisme ».
- La supervision (Grafana et Loki, ou un outil de type Sentry) et le choix de l'outil de sauvegarde : relèvent des choix techniques.
- Les choix techniques détaillés de 28, sauf ceux que la stratégie touche (§7).
