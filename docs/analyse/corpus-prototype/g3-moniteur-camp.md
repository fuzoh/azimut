# G3 « Moniteur camp » : 3ᵉ grille du corpus du prototype

> **Statut : description validée en grill le 5 octobre 2026** (ticket [Description de la 3ᵉ grille du corpus](https://github.com/fuzoh/azimut/issues/5)). Cours fictif. Vocabulaire de [18](../18-decisions-definitives.md), du [grill barèmes et fonctions de calcul](https://github.com/fuzoh/azimut/issues/4#issuecomment-5991014865) et de [`GLOSSARY.md`](../../../GLOSSARY.md).

## Rôle dans le corpus

G3 éprouve ce que A01 et A03 ne couvrent pas : barèmes mixtes, répétition prévue avec plafond, « au moins k », dispense d'un exercice qui touche des compétences transversales (constat 1 de [19](../19-constats-maquette.md)), nœud indicatif, nœuds de commentaire, trois axes dont un axe de minimaux et une copie en cours de route.

La grille a deux parties :

- un **noyau** d'environ 35 nœuds de données, qui porte les six participants types et leurs résultats attendus, calculables à la main ;
- un **volume** décrit par motifs, environ 250 nœuds de données et 100 de calcul, pour la charge. Les cases des participants types y restent vides, donc ignorées : elles ne changent pas les résultats du noyau. Le générateur ×5 pousse ensuite jusqu'à la cible de la carte (1500 + 500 nœuds par grille). Le volume est vérifié par l'oracle (recalcul complet), pas à la main.

Les résultats attendus sont recalculés par [`g3-controle.py`](g3-controle.py) (`uv run docs/analyse/corpus-prototype/g3-controle.py`). Ce script est une seconde source pour les tests du moteur, pas le moteur.

La transcription au format commun est produite par [`g3-structure.py`](g3-structure.py) : [`g3-v1-structure.json`](g3-v1-structure.json) et [`g3-v2-structure.json`](g3-v2-structure.json), noyau et volume compris. `g3-controle.py --figer` écrit [`g3-participants.json`](g3-participants.json) : sources et résultats attendus des participants types, commutateurs F5 et chemins multiples.

## Barèmes

| Barème | Type | Valeurs | Normalisation |
| --- | --- | --- | --- |
| `OK/KO` | ordinal binaire (préréglage) | KO = 0, OK = 1 | v |
| `Niveau 1–5` | ordinal à paliers | Insuffisant 1, Fragile 2, Suffisant 3, Bon 4, Très bon 5 | (v − 1) / 4 |
| `% 0–100` | numérique borné | sortie des fonctions à entrées hétérogènes ou binaires | v / 100 |

Aucun arrondi propagé dans G3 : les arrondis sont couverts par T5 et T14. Arrondi d'affichage : 0,1 % et 0,01 sur `Niveau 1–5`, demi vers le haut.

## Calendrier

| Jour | Saisie |
| --- | --- |
| J2 | E1 occurrence 1 |
| J3 | E2 |
| **J4 matin** | **copie V1 → V2**, V2 devient la grille principale |
| J4 soir | E3 (dans V2) |
| J5 | E1 occurrence 2, présence (dans V2) ; dispense et joker posés |

La dispense et le joker sont posés **après** la copie : G3 ne tranche pas leur reprise par la copie (voir [Laissé à d'autres tickets](#laissé-à-dautres-tickets)).

## Noyau, grille V1

### Axe Exercices (axe principal)

Les indicateurs d'une check-list sont des nœuds de données `OK/KO` ; la check-list est un nœud de calcul F1 qui sort en %.

| Regroupement | Nœud | Rôle | Barème / fonction |
| --- | --- | --- | --- |
| **Cours** | M6 « A suivi le cours en entier » | données | `OK/KO` |
| **E1 Planification d'activité** (2 occurrences prévues, mêmes définitions) | Objectifs | données | `Niveau 1–5` |
| | Déroulement | données | `Niveau 1–5` |
| | Matériel : Matériel prêt, Matériel adapté, Plan B prévu | check-list | F1 sur 3 `OK/KO` → % |
| | E1#k (occurrence k) | calcul | F1 (Objectifs, Déroulement, Matériel), poids 1 → % |
| | Planif-E1 | calcul | F5 meilleure, plafond 60 % sur les occurrences de rang ≥ 2 |
| **E2 Animation d'un jeu** | Consignes E2 | données | `Niveau 1–5` |
| | Gestion du groupe | données | `Niveau 1–5` |
| | Appréciation globale E2 | données | `Niveau 1–5` |
| | Sécurité du jeu : SJ1 Terrain vérifié, SJ2 Règles de sécurité annoncées, SJ3 Trousse à portée | check-list | F1 sur 3 `OK/KO` → % |
| | E2 | calcul | F1 (Consignes E2, Gestion du groupe, Appréciation globale E2, Sécurité du jeu), poids 1, entrées hétérogènes → % |
| **E3 Randonnée de nuit** | Consignes E3 | données | `Niveau 1–5` |
| | Itinéraire | données, **placé** dans E3, compte **seulement** pour Planification | `Niveau 1–5` |
| | Sécurité rando : SR1 Lampes contrôlées, SR2 Effectif compté, SR3 Itinéraire annoncé, SR4 Point de repli | check-list | F1 sur 4 `OK/KO` → % |
| | E3 | calcul | F1 (Consignes E3, Sécurité rando) → % |
| **Posture** | Engagement, Collaboration, Remarques | nœuds de commentaire | aucun |

E2 mélange des données `Niveau 1–5` et une check-list : la règle de mélange est respectée, car les données entrantes partagent un barème et la check-list est un nœud de calcul.

### Axe Compétences

| Nœud | Fonction | Entrées |
| --- | --- | --- |
| Animation | F1 → `Niveau 1–5` (numérique 1–5) | Consignes E2, Consignes E3, Gestion du groupe ; poids 1 |
| Sécurité | F4 « au moins 5 OK », k absolu → `OK/KO` | SJ1–SJ3, SR1–SR4 (7 indicateurs) |
| Planification | F1 → % | Planif-E1, Itinéraire |
| Moyenne générale | F1 → %, **indicative** (ne contribue pas au nœud décisif) | E2, E3, Planification |

### Axe Minimaux J+S

| Domaine (F3 « toutes ») | Exigence | Calcul |
| --- | --- | --- |
| Sécurité | M1 Assure la sécurité de ses activités | F4 « toutes » sur SR1–SR4 |
| Sécurité | M2 Connaît les mesures de base | F4 « au moins 2 sur 3 » sur SJ1–SJ3 |
| Animation | M3 Donne des consignes claires | F4 « au moins 1 ≥ 3 » sur Consignes E2 et Consignes E3 |
| Animation | M4 Conduit le groupe | F2 Gestion du groupe ≥ 3 |
| Organisation | M5 Planifie une activité | le nœud de seuil **Planification ≥ 60 %**, le même que celui du nœud décisif, placé aussi dans cet axe |
| Organisation | M6 A suivi le cours en entier | la donnée placée sous **Cours** dans l'axe Exercices |

« Minimaux remplis » = F3 sur les trois domaines.

M3 était prévu en « toutes ≥ 3 » au grill. Il passe à « au moins 1 ≥ 3 » : avec « toutes », un participant sous le seuil d'Animation échoue toujours aussi sur M3 ou M4 (la moyenne de valeurs ≥ 3 est ≥ 3), et un joker sur Animation ne pourrait jamais changer le résultat final.

### Seuils et nœud décisif

- Nœuds de seuil (F2) : **Animation ≥ 3**, **Planification ≥ 60 %**, **E2 ≥ 60 %**.
- **Réussite**, nœud décisif : F3 « toutes » sur Animation ≥ 3, Sécurité, Planification ≥ 60 %, E2 ≥ 60 %, Minimaux remplis.

### Chemins multiples attendus

| Signalement | Cas |
| --- | --- |
| Contribution à plusieurs exigences | SJ1–SJ3 (Sécurité et M2), SR1–SR4 (Sécurité et M1), Consignes E2 (E2 ≥ 60 %, Animation ≥ 3, M3), Gestion du groupe (E2 ≥ 60 %, Animation ≥ 3, M4) |
| Influence multiple sur un même résultat | Planification ≥ 60 % atteint Réussite directement et par Minimaux remplis ; Consignes E2 et Gestion du groupe atteignent Réussite par E2, Animation et les minimaux |

### Exigences de remplissage

- **Obligatoires** : SJ1–SJ3, SR1–SR4, Gestion du groupe, M6.
- **Minimum par regroupement** (1c, commutable) : Animation exige au moins 2 notes actives.
- Le reste de la grille, volume compris, est facultatif.

### Joker

Quota de 1 par participant. Nœuds autorisés :

- Animation : « remonter au seuil », qui référence le nœud de seuil **Animation ≥ 3**, consommateur direct ;
- E2 : « +10 » en % sur son barème de sortie, borné à 100 %.

### Dispense

Une dispense de E3 rend « non évalués » les éléments **placés** sous E3 (1b A, par défaut) : Consignes E3, Itinéraire et SR1–SR5. En 1b B (dépendances de calcul), Itinéraire reste actif.

## Copie V2 (matin de J4)

| # | Changement | Correspondance éprouvée |
| --- | --- | --- |
| 1 | Ajout de **SR5 « Numéro d'urgence communiqué »** dans Sécurité rando, dans Sécurité et dans M1, obligatoire | nœud sans correspondance, cases vides |
| 2 | Suppression d'**Appréciation globale E2** | données non reprises |
| 3 | Poids de **Gestion du groupe dans Animation** passé à 2 | même nœud, règle différente |
| 4 | Sécurité passe à **« au moins 6 OK »** (sur 8) | paramètre modifié |

Tous les autres nœuds ont une correspondance dans V2, et leurs cases sont reprises telles quelles. V1 reste utilisable ; aucune saisie ne passe d'une grille à l'autre.

## Volume, par motifs

Les exercices E4 à E8 s'ajoutent à l'axe Exercices, après E3 :

- E4 Nœuds et cordes ;
- E5 Montage du bivouac ;
- E6 Jeu de nuit ;
- E7 Conduite d'une réunion d'équipe ;
- E8 Retour sur une journée.

Chaque exercice suit le même motif :

- **10 critères**, chacun F1 sur 3 à 5 indicateurs d'un même barème. Les critères alternent `Niveau 1–5` (sortie 1–5) et `OK/KO` (sortie %), soit environ 40 nœuds de données par exercice.
- L'exercice est une F1 sur ses critères. Les entrées sont hétérogènes, donc la sortie est en %.
- **Un indicateur placé sans compter** dans l'exercice. Il contribue seulement à une compétence du volume, comme Itinéraire.

S'y ajoutent :

- un regroupement de **nœuds de commentaire** par exercice (« Remarques ») ;
- un nouvel **axe Compétences du volume**, avec 4 compétences : Communication, Technique, Réflexion, Coopération. Chacune est une F1 sur environ 8 critères pris dans plusieurs exercices, avec un nœud de seuil indicatif à 60 %.

Moyenne générale prend aussi E4 à E8 en entrée. Aucun nœud du volume ne contribue à Réussite : le volume charge le moteur sans toucher au nœud décisif.

Ordre de grandeur, noyau compris : environ 250 nœuds de données et 100 de calcul.

## Participants types

Cases à l'état final. « — » : vide. SR5 n'existe qu'en V2. Avant la copie, seules E1#1 et E2 sont saisies.

| Participant | E1#1 (Obj, Dér, Matériel) | E1#2 | Cons E2 | Gestion | Appr. E2 | SJ | Cons E3 | Itin. | SR1–SR5 | M6 | Profil |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Alice | 4, 4, OK OK OK | 4, 5, OK OK OK | 4 | 4 | 4 | OK OK OK | 5 | 4 | OK ×5 | OK | réussite nette |
| Bruno | 5, 4, OK OK OK | 2, 3, OK KO KO | 5 | 4 | 5 | OK KO KO | 4 | 4 | OK KO OK KO OK | OK | échec sur Sécurité malgré de bonnes moyennes ; profil « Y » de T8 |
| Chloé | 4, 3, OK OK KO | 4, 4, OK OK OK | 4 | 3 | 4 | OK OK OK | 3 | 4 | OK ×5 | OK | **dispensée de E3** à J5, notes conservées |
| David | 2, 2, OK KO KO | 5, 4, OK OK OK | 4 | 4 | 3 | OK OK OK | 4 | 4 | OK ×5 | OK | E1 raté puis rattrapé : plafond ; profil « X » de T8 |
| Emma | 3, 4, OK OK OK | 4, 4, OK OK OK | 3 | 3 | 3 | OK OK OK | 2 | 3 | OK ×5 | OK | **joker** « remonter au seuil » sur Animation à J5 |
| Félix | 4, 4, OK OK OK | — | 4 | — | 4 | OK OK OK | 4 | 4 | OK OK OK OK — | — | incomplet affiché « Réussi » (H4) |

Posture : chaque participant a au moins un commentaire, sans valeur.

## Résultats attendus

Sortie de `g3-controle.py`.

### V1 à la copie (matin de J4)

| Participant | E1#1 | E1#2 | Planif-E1 | E2 | E3 | Animation | Sécurité | Planification | Moyenne générale | Minimaux remplis | Réussite | Erreurs de remplissage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Alice | 83,3 % | — | 83,3 % | 81,3 % | — | 4,00 | KO | 83,3 % | 82,3 % | OK | KO | SR1, SR2, SR3, SR4, Pres |
| Bruno | 91,7 % | — | 91,7 % | 77,1 % | — | 4,50 | KO | 91,7 % | 84,4 % | KO | KO | SR1, SR2, SR3, SR4, Pres |
| Chloé | 63,9 % | — | 63,9 % | 75,0 % | — | 3,50 | KO | 63,9 % | 69,4 % | OK | KO | SR1, SR2, SR3, SR4, Pres |
| David | 27,8 % | — | 27,8 % | 75,0 % | — | 4,00 | KO | 27,8 % | 51,4 % | KO | KO | SR1, SR2, SR3, SR4, Pres |
| Emma | 75,0 % | — | 75,0 % | 62,5 % | — | 3,00 | KO | 75,0 % | 68,8 % | OK | KO | SR1, SR2, SR3, SR4, Pres |
| Félix | 83,3 % | — | 83,3 % | 83,3 % | — | 4,00 | KO | 83,3 % | 83,3 % | OK | KO | SR1, SR2, SR3, SR4, Gest, Pres, Animation < 2 actives |

À la copie, Sécurité est KO pour tous : avec un k absolu, 3 indicateurs saisis ne peuvent pas atteindre 5. C'est le résultat courant attendu (18 §6) ; l'avertissement de données provisoires est affiché pour tous.

### V2 juste après la copie (mêmes données)

| Participant | E1#1 | E1#2 | Planif-E1 | E2 | E3 | Animation | Sécurité | Planification | Moyenne générale | Minimaux remplis | Réussite | Erreurs de remplissage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Alice | 83,3 % | — | 83,3 % | 83,3 % | — | 4,00 | KO | 83,3 % | 83,3 % | OK | KO | SR1, SR2, SR3, SR4, SR5, Pres |
| Bruno | 91,7 % | — | 91,7 % | 69,4 % | — | 4,33 | KO | 91,7 % | 80,6 % | KO | KO | SR1, SR2, SR3, SR4, SR5, Pres |
| Chloé | 63,9 % | — | 63,9 % | 75,0 % | — | 3,33 | KO | 63,9 % | 69,4 % | OK | KO | SR1, SR2, SR3, SR4, SR5, Pres |
| David | 27,8 % | — | 27,8 % | 83,3 % | — | 4,00 | KO | 27,8 % | 55,6 % | KO | KO | SR1, SR2, SR3, SR4, SR5, Pres |
| Emma | 75,0 % | — | 75,0 % | 66,7 % | — | 3,00 | KO | 75,0 % | 70,8 % | OK | KO | SR1, SR2, SR3, SR4, SR5, Pres |
| Félix | 83,3 % | — | 83,3 % | 87,5 % | — | 4,00 | KO | 83,3 % | 85,4 % | OK | KO | SR1, SR2, SR3, SR4, SR5, Gest, Pres, Animation < 2 actives |

E2 change (suppression d'Appréciation globale), Animation change (poids 2), SR5 ajoute une erreur de remplissage. Les autres valeurs sont identiques à V1.

### V2 à l'état final (après J5)

| Participant | E1#1 | E1#2 | Planif-E1 | E2 | E3 | Animation | Sécurité | Planification | Moyenne générale | Minimaux remplis | Réussite | Erreurs de remplissage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Alice | 83,3 % | 91,7 % | 83,3 % | 83,3 % | 100,0 % | 4,25 | OK | 79,2 % | 87,5 % | OK | OK | aucune |
| Bruno | 91,7 % | 36,1 % | 91,7 % | 69,4 % | 67,5 % | 4,25 | KO | 83,3 % | 73,4 % | KO | KO | aucune |
| Chloé | 63,9 % | 83,3 % | 63,9 % | 75,0 % | — | 3,33 | KO | 63,9 % | 69,4 % | OK | KO | SR1, SR2, SR3, SR4, SR5 |
| David | 27,8 % | 91,7 % | 60,0 % | 83,3 % | 87,5 % | 4,00 | OK | 67,5 % | 79,4 % | OK | OK | aucune |
| Emma | 75,0 % | 83,3 % | 75,0 % | 66,7 % | 62,5 % | 3,00 | OK | 62,5 % | 63,9 % | OK | OK | aucune |
| Félix | 83,3 % | — | 83,3 % | 87,5 % | 87,5 % | 4,00 | OK | 79,2 % | 84,7 % | OK | OK | SR5, Gest, Pres |

### Minimaux, V2 à l'état final

| Participant | M1 | M2 | M3 | M4 | M5 | M6 | Domaine Sécurité | Domaine Animation | Domaine Organisation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Alice | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| Bruno | KO | KO | OK | OK | OK | OK | KO | OK | OK |
| Chloé | — | OK | OK | OK | OK | OK | OK | OK | OK |
| David | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| Emma | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| Félix | OK | OK | OK | — | OK | — | OK | OK | OK |

### Commutateurs, V2 à l'état final

| Participant | Commutateur | Résultat | Par défaut |
| --- | --- | --- | --- |
| Bruno | F5 « dernière » | Planif-E1 36,1 %, Planification 55,6 %, échoue aussi sur Planification | meilleure : 91,7 %, 83,3 % |
| David | F5 sans plafond | Planif-E1 91,7 %, Planification 83,3 % | plafond : 60,0 %, 67,5 % |
| David | F5 « dernière » | Planif-E1 60,0 % (plafond sur le rang 2) | 60,0 % |
| Chloé | 1b B (feuilles = dépendances de calcul de E3) | Itinéraire reste actif : Planification 69,4 %, Réussite KO | 1b A : 63,9 % |
| Chloé | sans dispense | Animation 3,25, Sécurité OK, Planification 69,4 %, **Réussite OK** | Réussite KO |
| Emma | sans joker | Animation 2,75, **Réussite KO** | joker : 3,00, Réussite OK |
| Félix | H4 strict (une entrée sans résultat rend F3 sans résultat) | Minimaux remplis et Réussite **sans résultat** | Réussite OK |

## Ce que chaque participant montre

- **Alice** : chemin nominal. Le plafond s'applique à l'occurrence 2 (91,7 → 60), sans effet, car l'occurrence 1 est meilleure.
- **Bruno** : la Sécurité non compensatoire (4 OK sur 8) fait échouer un participant aux moyennes hautes. M1 et M2 échouent aussi : la même donnée fait échouer deux exigences, d'où le signalement de chemins multiples.
- **Chloé** : constat 1 sous sa forme la plus dure. Sans dispense, elle réussit. Dispensée de E3, Sécurité ne peut plus atteindre 6 (3 entrées actives), et elle échoue **à cause de la dispense seule**. Animation passe de 3,25 à 3,33 sans Consignes E3. M1 passe sans résultat et le domaine Sécurité ne repose plus que sur M2. Les obligatoires SR1–SR5 restent en erreur (constat 2). Ce cas alimente les décisions 1a et 2a.
- **David** : plafond de rattrapage (T8 X). La meilleure occurrence plafonnée vaut 60 %, et il réussit grâce à Itinéraire.
- **Emma** : joker « remonter au seuil » sur Animation (2,75 → 3). Il fait basculer Réussite. Animation ≥ 3 et Réussite portent la marque « influencé par un joker », pas Minimaux remplis ; Animation porte « joker appliqué ».
- **Félix** : trois obligatoires vides (Gestion du groupe, SR5, M6), mais Réussite OK selon H4 par défaut, avec l'avertissement de données provisoires. M4 et M6 sont sans résultat et ignorés.

## Laissé à d'autres tickets

- **Reprise par la copie des dispenses, des « non évalué » et des jokers** (18 §13.5, devenir des états lors d'une copie) : G3 l'évite en posant dispense et joker après la copie. À traiter dans le mécanisme de copie de grille.
- **F4 à k absolu face à une dispense** : gardé tel quel. Le résultat de Chloé est un constat à montrer, pas une décision.
- **Génération du volume et des données ×5** : relève du générateur déterministe.
