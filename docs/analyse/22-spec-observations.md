# Spec : observations et suivi en cours de formation

Cette spec décrit les **observations** d'Azimut : des faits notés par les formateurs pendant le cours, qui aident à noter puis servent de preuve. Elle part des idées de l'issue #29 (inspiration Qualix) et rassemble les décisions de la carte `docs/wayfinder/observations/`.

> **Statut : spec prête à découper (15 novembre 2026).** Elle ne contient aucune décision nouvelle : chaque règle renvoie au ticket qui l'a tranchée. Le modèle de qualification reste fixé par [18 — Décisions définitives](18-decisions-definitives.md), qui fait foi. La construction est un effort séparé.

Sources : tickets 01 à 10 de `docs/wayfinder/observations/`, [23 — Saisie dans Qualix](23-saisie-qualix.md), [24 — Photos et pièces jointes](24-photos-pieces-jointes.md), [06 — Benchmark Qualix](06-benchmark-qualix.md).

## 1. En bref

- Une **observation** est un fait sur un apprenant : un texte ou une pièce jointe, un auteur, un moment. Elle ne porte aucun jugement et n'entre jamais dans le calcul.
- Elle vit **à côté de la grille**. La case garde sa note courante unique et son commentaire de synthèse (18 §5).
- On la saisit **vite, sur téléphone**, depuis une page d'accès rapide qui garde l'exercice et le groupe en cours.
- On la **relit au moment de noter**, à côté de la case, et dans la fiche de l'apprenant.
- Elle reste **interne à l'équipe** et disparaît à l'anonymisation.
- Le **programme de cours n'entre pas dans Azimut** : ni plages horaires, ni UA.

## 2. Vocabulaire

| Terme | Sens |
| --- | --- |
| **Observation** | Un fait noté par un formateur sur un apprenant. |
| **Moment** | Quand le fait a été observé : date et heure, à la minute. |
| **Rattachement** | Le lien entre une observation et les nœuds qu'elle concerne. Il peut n'y en avoir aucun. |
| **À préciser** | L'état d'une observation sans indicateur rattaché. Elle peut déjà porter un exercice. |
| **À classer** | L'état d'une observation rattachée à aucun nœud. |
| **Exercice** | Quelque chose que font les apprenants, sur quoi on les observe et on les évalue. Il réunit des indicateurs pris dans plusieurs sphères, objectifs et critères : il traverse l'arbre, c'est un second axe de lecture (18 §3). |
| **UA** | Un point de cours, une leçon : ce que l'équipe enseigne. Absente d'Azimut. |
| **Commentaire de case** | La synthèse écrite par l'équipe, restituée à l'apprenant (18 §5). |

## 3. L'observation

### Ce qu'elle porte

| Élément | Règle | Ticket |
| --- | --- | --- |
| Contenu | Un texte, des pièces jointes, ou les deux. Il faut au moins l'un des deux. | 01 |
| Pièces jointes | Tout type de fichier. Une pièce jointe seule est une observation valide. | 01 |
| Apprenant | Un seul. | 01 |
| Auteur | Le formateur qui la saisit. | 01 |
| Moment | Prérempli avec l'heure de saisie, modifiable. L'heure réelle de saisie reste dans l'historique. | 05 |
| Rattachement | Zéro, un ou plusieurs nœuds, de n'importe quel type. | 01 |
| Jugement | Aucun : ni note, ni tendance. | 01 |

### Ce qu'elle n'est pas

- Elle **n'entre jamais dans le calcul**. Observer et évaluer sont deux phases (01).
- Elle **ne remplace pas le commentaire de case** : les observations sont les faits, le commentaire est la synthèse (01).
- Elle **n'est jamais obligatoire** : aucune exigence de remplissage de 18 §6 ne porte sur elle, et une observation manquante n'est ni une erreur ni un avertissement (08).
- Elle **ne rouvre pas 18 §5**. Ce paragraphe écarte les évaluations concurrentes d'un jury ; une observation n'évalue pas. C'est une précision de §5.

### Rattachement et exercice

- L'exercice **n'est pas un champ à part** : c'est un des nœuds rattachés (05).
- Quand un exercice a plusieurs **occurrences** (18 §4), on rattache à l'occurrence (05).
- Choisir un exercice **réduit la liste proposée** aux indicateurs qu'il évalue, toutes sphères confondues. C'est une aide, pas une règle : on peut élargir à toute la grille (05).
- La Posture est le cas de référence, sans exclusivité (01).

### Droits et visibilité

- **Toute l'équipe du cours** peut lire, modifier, reclasser et supprimer une observation, avec historique (01).
- Les observations ne figurent dans **aucune restitution à l'apprenant** : ni attestation, ni export de vue (01).

## 4. Saisie

### Page d'accès rapide

Une seule page, pensée d'abord pour le **téléphone sur le terrain** (07).

- **Premier écran** : l'exercice et le groupe en cours du formateur, avec les membres du groupe en gros boutons.
- **Depuis un apprenant** : ouvrir la saisie d'une observation, ou sa qualification. L'appui simple ouvre la saisie ; la qualification passe par un second geste (déduit, non contredit).
- **Recherche** : un seul champ, en haut, qui trouve exercices, nœuds et apprenants, avec tolérance aux fautes de frappe. Il sert à changer de contexte.
- **Compteur « à préciser »** : il ouvre les observations du formateur restées sans indicateur. Chacun vide sa liste ; il n'y a pas de liste d'équipe.

### Enregistrer une observation

1. Choisir un apprenant.
2. Taper un texte ou joindre un fichier. Le bouton photo ouvre l'appareil photo (hypothèse).
3. Enregistrer.

L'exercice en cours est rattaché d'office. Préciser un indicateur est facultatif et peut se faire plus tard (07).

### D'une observation à la suivante

- **L'exercice et le groupe restent** ; l'apprenant se choisit à chaque fois parmi les membres du groupe (05).
- L'exercice proposé est **le dernier utilisé par ce formateur**, sans limite de durée. Pour un exercice à occurrences, la dernière occurrence utilisée. Aucune suggestion par l'heure (05).

### Groupe

Une sélection multiple des membres, avec « tout cocher ». Elle crée **une observation indépendante par personne cochée**, ensuite modifiable séparément (01, 07). Il n'existe pas d'observation partagée entre plusieurs apprenants.

### Sans réseau

L'observation en cours est **gardée sur l'appareil** et part au retour de la connexion. Il n'y a pas de saisie hors ligne complète : elle relève de la synchronisation de toute l'application (07).

### Sur ordinateur

Les mêmes parcours. Un seul raccourci clavier, qui ouvre la recherche (hypothèse).

## 5. Relecture et usage

### Au moment de noter

Un **panneau à côté de la case** montre, pour l'apprenant et l'indicateur :

1. les observations rattachées à cet indicateur ;
2. puis celles du même exercice restées sans indicateur, d'où on les rattache d'un geste (09).

### Fiche de l'apprenant

Toutes ses observations, dans l'ordre du temps (09).

### Reprise dans le commentaire

Un geste **copie** le texte d'une observation dans le commentaire de synthèse, où on le retravaille. Aucun lien n'est gardé entre les deux. Le texte copié devient visible par l'apprenant, puisque le commentaire lui est restitué : c'est un geste volontaire (09).

### Finalisation

Les observations « à préciser » ne gênent pas la finalisation : ni blocage, ni rappel (09).

### Suivi

Un tableau **apprenants × exercices** avec le nombre d'observations, pour repérer celui dont on n'a rien noté. Pas de décompte par formateur, pas de missions d'observation (08).

## 6. Cycle de vie

| Événement | Effet sur les observations | Ticket |
| --- | --- | --- |
| Copie de grille (18 §9) | Dupliquées dans la copie, rattachées aux lignes correspondantes, y compris celles « à classer ». Une observation appartient donc à une grille. | 01 |
| Ligne disparue dans la copie | L'observation perd ce rattachement ; sans autre nœud, elle redevient « à classer ». | 01 |
| Fichier joint lors d'une copie | Partagé entre les deux observations, supprimé quand plus aucune ne s'y réfère. | 10 |
| Anonymisation | Texte et pièces jointes supprimés ; la grille reste. | 01 |

## 7. Pièces jointes et photos

- **Pièces jointes** : tout type de fichier. L'application fixe une taille maximale par fichier et un quota par cours ; les valeurs se décident à la construction (hypothèse). Les garde-fous de stockage et de restitution proposés sont dans 24 : fichiers hors de la base, noms générés, images réencodées sans géolocalisation, lecture limitée à l'équipe du cours.
- **Photos des apprenants** : **pas dans cette spec**. On reconnaît un apprenant à son nom de scout, son groupe d'origine et une pastille d'initiales. L'import depuis MiData reste une extension, conditionnée à une mesure sur un cours réel et à un avis juridique (10).

## 8. Tranches de construction

| Tranche | Contenu | Condition |
| --- | --- | --- |
| **1. Observations en texte** | Page d'accès rapide, saisie, groupe, « à préciser », brouillon sur l'appareil, panneau à côté de la case, fiche de l'apprenant, copie dans le commentaire, tableau de suivi, copie de grille, suppression à l'anonymisation. | Aucune. À essayer sur un vrai exercice, puis à corriger : il n'y a pas de prototype préalable (07). |
| **2. Pièces jointes** | Fichiers joints, photo depuis le téléphone, partage à la copie de grille, suppression effective. | **Avis juridique obtenu** (10). |
| **Extension** | Photo de profil importée de MiData. | Mesure du taux de profils avec photo, et avis juridique (10). |

## 9. Hors périmètre

- Le **programme de cours** : plages horaires, UA. Il reste dans l'outil de planification de l'équipe (02).
- L'**évaluation des UA** par les apprenants et les formateurs, et la **validation de cours**. Elles supposent les UA dans l'app et évaluent le cours, pas l'apprenant. Idées gardées dans `TODO.md` (02).
- Les **missions d'observation** et le décompte par formateur (08).
- La **tendance** (négatif, neutre, positif) sur une observation. Elle pourra s'ajouter plus tard comme champ facultatif (01).
- La **saisie hors ligne complète** (07).
- Le modèle de calcul de 18 : inchangé.

## 10. Points ouverts

**Juridique.** La partie nLPD de 24 n'a pas pu être vérifiée sur les textes officiels. Neuf points demandent un avis, dont : le responsable du traitement, la réutilisation de la photo MiData par une application tierce, l'accord parental pour les mineurs, les photos d'activité montrant des tiers, et la portée du droit d'accès sur des observations internes. Ce dernier point touche aussi la tranche 1.

**À vérifier.**

- Les demandes d'utilisateurs de Qualix depuis le 3 octobre 2026 (issues non relues) et son comportement réel à l'écran (23).
- Les droits de lecture des participants et de leur photo par un appel réel à db.scout.ch (24).

**À reporter dans les autres documents.**

- 18 §5 : préciser que les observations ne sont pas des évaluations concurrentes.
- `FEATURES.md` : constat 8 (« pas d'observations multiples »), la définition de l'exercice, et l'entrée « Observation » du glossaire.
- Les hypothèses marquées dans cette spec (second geste vers la qualification, bouton photo, raccourci clavier, taille et quota) sont à confirmer au découpage.
