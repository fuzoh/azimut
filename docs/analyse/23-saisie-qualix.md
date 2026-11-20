# Saisie d'une observation dans Qualix : les parcours

Ce document complète [06 — Benchmark Qualix](06-benchmark-qualix.md). 06 décrit le **modèle** de Qualix. Celui-ci décrit **comment on y saisit** : formulaire, préremplissage, enchaînement, Spick, grilles, photo. Il répond à la question [03 — research saisie Qualix](../wayfinder/observations/03-research-saisie-qualix.md).

> **Statut : constats, pas décisions.** Le modèle de qualification est fixé par [18 — Décisions définitives](18-decisions-definitives.md). La dernière section propose des reprises compatibles avec les décisions déjà prises sur les observations d'Azimut (texte et/ou pièces jointes, un seul apprenant par observation, raccourci de groupe, pas de blocs horaires).

Sources : dépôt `gloggi/qualix`, clone superficiel, commit `c914db93c28766782f0835db85dffcaec8d538a6` du 2026-11-06 (fusion Dependabot #482). Code lu, rien exécuté. Les chemins cités sont relatifs à ce dépôt. `CHANGELOG_fr.md` est cité pour les dates. Les issues GitHub n'ont **pas** pu être relues (accès refusé depuis cette session) : les numéros cités viennent du changelog ou de 06.

Convention : **[V]** = vérifié dans le dépôt Qualix ; **[D]** = déduit, à confirmer.

## TL;DR

- **Un seul formulaire, une page entière, pas de saisie en ligne.** Sept champs au plus, trois toujours obligatoires : apprenants, texte, bloc. L'observateur est prérempli avec l'utilisateur connecté. [V]
- **Le préremplissage passe par l'URL** (`?participant=…&block=…&users=…`). Chaque page d'entrée fournit ce qu'elle sait : la liste des apprenants donne l'apprenant, le Spick donne le bloc, une mission d'observation donne les deux. [V]
- **Après l'enregistrement, on reste sur le formulaire**, avec les mêmes apprenants, le même bloc et les mêmes observateurs. Seul le texte est vidé et reçoit le focus. La deuxième observation coûte donc : taper, enregistrer. [V]
- **Le bloc courant n'est jamais présélectionné.** Qualix ne connaît que la **date** d'un bloc, pas son heure. Il se contente de trier : les blocs datés de moins de deux jours (et tous les blocs à venir) passent en tête de la liste. Pas de « dernier bloc utilisé » hors de l'enchaînement ci-dessus. [V]
- **Choisir un bloc coche tout seul les exigences liées à ce bloc.** C'est le seul vrai mécanisme de suggestion. [V]
- **Un groupe est une entrée de la liste des apprenants.** Le choisir **remplace** la sélection par ses membres. Une observation à plusieurs apprenants reste **une** observation partagée. [V]
- **Le Spick est la page d'accueil de la saisie pendant le cours** : jours, blocs, exigences du bloc, et les photos des apprenants que je dois observer avec un compteur rouge tant que je n'ai rien noté. Un clic sur une photo ouvre le formulaire prérempli. [V]
- **Rien pour le hors-ligne sur ce formulaire** : pas de brouillon local, pas de sauvegarde automatique, pas de PWA. Seule protection : si la session a expiré, les champs sont restaurés après reconnexion. [V]

## 1. Le formulaire d'observation

Une route, une page : `GET /course/{course}/observation/new` (`routes/web.php`), vue `resources/views/observation/new.blade.php`, composant `resources/js/components/FormObservation.vue`. C'est un formulaire HTML classique, envoyé en POST avec rechargement de page (`resources/js/components/FormBasic.vue`). [V]

### Champs, dans l'ordre d'affichage

| # | Champ | Obligatoire | Valeur par défaut | Source |
| --- | --- | --- | --- | --- |
| 1 | Apprenants (liste à choix multiple, avec les groupes) | oui | vide, ou `?participant=` | `FormObservation.vue:4-13` |
| 2 | Texte (zone de texte, compteur, 1023 caractères) | oui | vide | `FormObservation.vue:15-24`, `app/Models/Observation.php:42` |
| 3 | Bloc (liste à choix unique) | oui | **vide**, ou `?block=` | `FormObservation.vue:26-43` |
| 4 | Exigences (choix multiple) | non | celles du bloc choisi | `FormObservation.vue:45-52`, `124-138` |
| 5 | Impression (3 boutons radio) | oui si affiché | neutre (`1`) | `FormObservation.vue:54-60`, `105` |
| 6 | Catégories (choix multiple) | non | vide | `FormObservation.vue:62-69` |
| 7 | Observateurs (choix multiple) | oui | l'utilisateur connecté, ou `?users=` | `FormObservation.vue:71-78`, `new.blade.php:29` |

- Les champs 4, 5 et 6 sont **masqués** si le cours n'a ni exigence, ni impression activée, ni catégorie (`v-if` aux lignes 46, 55, 63). Un cours minimal voit quatre champs. [V]
- Sous le champ bloc, un bouton « grille d'évaluation » apparaît si un modèle de grille est rattaché au bloc choisi (`FormObservation.vue:34-42`, `resources/js/components/ButtonNewEvaluationGrid.vue`). Voir section 5. [V]
- Validation serveur : `app/Http/Requests/ObservationRequest.php:17-25`. Aucun champ date ou heure : le « quand » est le bloc. [V]
- Pas de pièce jointe sur une observation : le seul téléversement du dépôt concerne la photo (section 6). [V]

### Ce qui est prérempli, selon la page de départ

Le contrôleur lit trois paramètres d'URL : `participant`, `block`, `users` (`app/Http/Controllers/ObservationController.php:30-38`). Il n'y a pas d'autre source de préremplissage. [V]

| Page de départ | Lien | Apprenants | Bloc | Focus à l'ouverture |
| --- | --- | --- | --- | --- |
| Liste des apprenants, bouton « ajouter une observation » | `resources/views/participants.blade.php:36` | 1 | non | texte |
| Détail d'un apprenant, bouton principal | `resources/views/participant-detail.blade.php:39` | 1 | non | texte |
| Détail d'un apprenant, un bouton par groupe dont il est membre | `participant-detail.blade.php:46-48` | tous les membres | non | texte |
| Vue d'ensemble (tableau), icône jumelles par ligne | `resources/js/components/TableObservationOverview.vue:50-56` | 1 | non | texte |
| Spick, clic sur l'en-tête d'un bloc | `resources/views/crib.blade.php:45` | non | oui | apprenants (liste ouverte) |
| Spick, clic sur la photo d'un apprenant d'une mission | `crib.blade.php:74` | 1 | oui | texte |

- Le focus va sur la liste des apprenants seulement si aucun apprenant n'est fourni, sinon sur le texte (`new.blade.php:18`, `FormObservation.vue:12` et `20`). La liste s'ouvre alors d'elle-même (`resources/js/components/MultiSelect.vue:195-197`). [V]
- L'observateur vaut toujours l'utilisateur connecté à la première ouverture. Aucune page d'entrée ne passe `users`. [V]
- Il n'y a **pas** de bouton « nouvelle observation » dans la barre de navigation : on part toujours d'un apprenant ou d'un bloc (`resources/views/includes/header.blade.php:28-37`). [V]

### Nombre d'actions pour une observation

Compté sur le code, non mesuré à l'écran. [D]

| Parcours | Actions avant de taper | Après le texte |
| --- | --- | --- |
| Spick, photo d'une mission | 1 clic | 1 clic « Enregistrer » |
| Spick, en-tête de bloc | 1 clic, puis choisir l'apprenant (frappe ou clic), puis cliquer dans le texte | 1 clic |
| Liste ou détail d'un apprenant | 1 clic | ouvrir la liste des blocs, choisir, puis 1 clic |
| Observation suivante, mêmes apprenants et bloc | 0 | 1 clic |

Le bouton est un `submit` ordinaire (`resources/js/components/form/ButtonSubmit.vue`). Aucun raccourci clavier d'envoi n'est défini dans le composant. [V]

### Après l'enregistrement

- Création : redirection vers **le même formulaire**, avec `participant`, `block` et `users` repris de l'observation qu'on vient de créer (`ObservationController.php:88`). Le texte est vide et a le focus. [V]
- Les exigences ne sont pas transmises, mais elles sont recalculées à partir du bloc au montage (`FormObservation.vue:140-144`). L'impression revient à « neutre », les catégories à vide. [V] `docs/Features/21 Observations and Participant Tracking.md` dit que « les autres champs » sont conservés : le code ne conserve que ces trois-là.
- Un message de succès affiche un lien « aller à … » par apprenant concerné (`ObservationController.php:76-85`, ajouté en avril 2022, #217). [V]
- Le retour vers la fiche de l'apprenant n'a lieu qu'après une **modification** ou une **suppression** (`ObservationController.php:169`, `184`). À la création, la liste d'options de retour est vide (`collect([])`), donc on tombe toujours sur le formulaire. [V]
- Ce comportement date de mars 2024 (#334) : « on reste désormais sur le formulaire d'observation, afin de pouvoir saisir d'autres observations […] plus utile pour saisir plusieurs petites observations » (`CHANGELOG_fr.md`). Avant, on revenait à la page de départ. [V]

## 2. Le choix du bloc

- **Un bloc n'a qu'une date**, pas d'heure : `block_date` est une date, complétée par un numéro de jour et un numéro de bloc (`app/Models/Block.php:37-44`, `175-180`). Qualix ne peut donc pas savoir quel bloc est « en cours ». [V]
- **Aucune présélection.** Sans `?block=`, le champ est vide et obligatoire (`ObservationController.php:34`, `FormObservation.vue:98`, `115`). [V]
- **Un tri, pas un choix.** La liste est d'abord chronologique (`app/Models/Course.php:42-44` : date, jour, numéro, nom). Puis `prioritize` remonte en tête les blocs dont la date est postérieure à « maintenant moins deux jours » (`ObservationController.php:36`, `40-43`). [V]
- Conséquence du test `block_date > now − 2 jours` : sont en tête **hier, aujourd'hui et tous les blocs futurs**, dans l'ordre chronologique. Les blocs plus anciens suivent. Le premier de la liste est donc le premier bloc d'hier, pas le bloc du moment. [V]
- Raison donnée : les formateurs saisissent « peu après un bloc, le soir ou pendant la nuit » (`docs/Features/21 …`, section *Prioritized block selection*). Introduit en février 2021 (#188). [V]
- **Pas de mémoire du dernier bloc utilisé** en dehors de l'enchaînement de la section 1 : ni session, ni `localStorage`. Le `localStorage` ne sert qu'aux filtres de la liste d'observations (`resources/js/components/ObservationList.vue:240-262`). [V]
- **Le bloc suggère les exigences.** À chaque changement de bloc, les exigences liées à ce bloc dans l'administration **remplacent** la sélection (`FormObservation.vue:124-138`). L'utilisateur peut ensuite les modifier. [V]
- La liste est filtrable à la frappe : c'est un `vue-multiselect` (`MultiSelect.vue:54-68`). Le libellé est « numéro : nom » (`Block.php:197-199`). [V]
- Le même tri sert au formulaire de grille (`app/Http/Controllers/EvaluationGridController.php:43`). [V]

## 3. Plusieurs apprenants et groupes

- **Sélection multiple.** Le champ apprenants est une liste à choix multiple. Après chaque choix, la liste se rouvre pour enchaîner (`MultiSelect.vue:165-166`). [V]
- **Les groupes sont des options de la même liste**, placées après les apprenants (`MultiSelect.vue:123-128`). Ils viennent de `allParticipantGroups` : nom du groupe → identifiants des membres (`new.blade.php:14-17`). [V]
- **Choisir un groupe remplace la sélection** par ses membres ; il ne s'ajoute pas (`MultiSelect.vue:149-157`). On peut ensuite retirer ou ajouter des personnes. Une croix « tout effacer » apparaît dès qu'il existe des groupes (`MultiSelect.vue:137-139`). [V]
- **Raccourci depuis la fiche d'un apprenant** : un bouton par groupe auquel il appartient ouvre le formulaire avec tous les membres (`participant-detail.blade.php:46-48`). [V]
- **Une seule observation pour tous.** L'enregistrement crée une ligne `Observation` et l'attache à N apprenants (`ObservationController.php:68-71`). Modifier le texte le modifie pour tous. La vue « par apprenant » est le pivot `ParticipantObservation` (`docs/Features/21 …`). [V] C'est la différence avec la décision d'Azimut (une observation par membre).
- Supprimer une observation partagée la supprime pour tous, et renvoie sur la fiche du premier apprenant (`ObservationController.php:180-185`). [V]
- Le formulaire de grille reprend le même champ, groupes compris (`resources/views/evaluationGrid/new.blade.php:13-25`). [V]

## 4. Spick et missions d'observation

Le Spick est la route `crib` (`routes/web.php`), premier lien du menu du cours, libellé « Points de cours » en français (`header.blade.php:28-30`, `lang/fr/t.php:248`). Il a fusionné avec l'ancienne liste des blocs en septembre 2022 (#165). [V]

### Ce que le formateur voit

Vue `resources/views/crib.blade.php`, contrôleur `app/Http/Controllers/BlockListController.php`.

- **Un panneau repliable par jour.** Sont dépliés les jours de moins de deux jours et les jours à venir (même test qu'en section 2) ; les jours passés sont repliés (`crib.blade.php:40`). [V]
- **Par bloc** : numéro et nom, puis les exigences liées, en deux couleurs — éliminatoires et non éliminatoires (`crib.blade.php:46-59`). [V]
- **Si un modèle de grille est rattaché au bloc** : un bouton pour ouvrir une grille (`crib.blade.php:61-68`). [V]
- **Si des missions existent** : à droite du bloc, les **photos rondes** des apprenants que je dois observer dans ce bloc, avec leur nom (`crib.blade.php:69-88`). [V]
- **Un compteur sur chaque photo** : le nombre d'observations que **j'ai** faites sur **cet apprenant** dans **ce bloc**. Rouge à zéro, bleu sinon (`crib.blade.php:78-79`, requête dans `app/Models/Course.php:83-108`). [V]
- Au survol, le nom des missions concernées (`crib.blade.php:74`, avril 2022, #210). [V] Pas d'équivalent tactile constaté. [D]
- Un sélecteur « voir comme » affiche le Spick d'un autre formateur (`crib.blade.php:19-30`, route `crib/{user?}`). [V]

### Passer du Spick à la saisie

| Clic sur | Résultat |
| --- | --- |
| l'en-tête d'un bloc | formulaire avec le bloc, liste des apprenants ouverte (`crib.blade.php:45`) |
| la photo d'un apprenant | formulaire avec le bloc et l'apprenant, focus dans le texte (`crib.blade.php:74`) |
| le bouton de grille | formulaire de grille avec le bloc (`crib.blade.php:63-66`) |

Après l'enregistrement, on reste sur le formulaire (section 1) : il faut revenir au Spick par le menu pour passer à l'apprenant suivant. Le compteur s'y met à jour au rechargement. [V]

### La mission elle-même

Une mission a un nom, des formateurs, des apprenants et des blocs, tous à choix multiple (`resources/views/admin/observationAssignments/index.blade.php:11-53`). Elle ne porte ni consigne ni contenu (`docs/Features/21 …`). [V] Le Spick ne montre pas ce qu'il faut observer au-delà des exigences du bloc. [V]

## 5. Grilles d'évaluation rattachées à un bloc

### Parcours de saisie

- **Un modèle est rattaché à des blocs.** Une instance ne peut être créée que pour ces blocs (`docs/Features/22 Evaluation Grids.md`). [V]
- **Trois entrées** vers `evaluationGrid.new` : le bouton du Spick (bloc fourni), le bouton sous le champ bloc du formulaire d'observation (bloc **et** apprenants déjà choisis, `FormObservation.vue:35-39`), et le « + » d'une cellule de la vue d'ensemble (apprenant fourni, `TableObservationOverview.vue:17`). [V]
- Si un seul modèle convient au bloc, un bouton direct ; sinon un menu déroulant (`ButtonNewEvaluationGrid.vue:5-17`). [V]
- **Formulaire** (`resources/views/evaluationGrid/new.blade.php`) : apprenants (multiple, groupes), bloc (limité aux blocs du modèle, même tri), puis une ligne par critère avec son contrôle et ses notes (`resources/js/components/evaluationGrid/InputEvaluationGrid.vue`). Les notes ont la même limite de 1023 caractères. Un seul bouton d'enregistrement, pas de sauvegarde automatique. [V]
- L'auteur est l'utilisateur connecté, sans choix (`EvaluationGridController.php:63`). [V]
- **Après l'enregistrement** : retour à la page d'où l'on venait (`return_to`), sinon au formulaire de grille prérempli (`EvaluationGridController.php:99`, `107-110`, `137-145`). Le comportement diffère donc de celui des observations. [V]
- Passer du formulaire d'observation à la grille **quitte la page** : le lien est un simple `href`, le texte déjà tapé n'est pas transmis. [V pour le lien, D pour la perte]

### Impression papier

- **Grille vierge** : icône d'impression sur la liste des modèles (`resources/views/admin/evaluationGridTemplates/index.blade.php:44`, route `admin.evaluation_grid_templates.print`). Prévue pour être « emportée dans un bloc et remplie au stylo » (`docs/Features/22 …`). [V]
- **Grille remplie** : icône d'impression sur la fiche de l'apprenant et dans la vue d'ensemble (`participant-detail.blade.php:96`, `TableObservationOverview.vue:16`). [V]
- Le PDF est fabriqué **dans le navigateur** : le serveur renvoie du JSON, le rendu est chargé à la demande puis téléchargé (`resources/js/components/print/ButtonPrintEvaluationGrid.vue:63-125`). Nom de fichier : modèle, bloc, apprenants. [V]
- La grille vierge ne porte ni bloc ni nom d'apprenant, et il n'existe pas d'impression en lot « une grille par apprenant » (demande #347 selon 06). [V pour l'absence dans le code]
- Aucun parcours de **ressaisie** d'une grille papier : on ouvre le formulaire normal. [V]

## 6. Photo du participant

| Point | Constat | Source |
| --- | --- | --- |
| Origine | **Téléversement manuel** uniquement, dans le formulaire d'ajout ou de modification d'un participant. Champ fichier `accept="image/*"`. | `resources/views/admin/participants/index.blade.php:16`, `edit.blade.php:16` |
| Import | L'import MiData ne traite aucune image. Pas de synchronisation de photo. | `app/Services/Import/` (aucune occurrence) |
| Contraintes | Image, 2000 Ko au plus. Aucun redimensionnement côté serveur constaté. | `app/Http/Requests/ParticipantRequest.php:18` |
| Stockage | Fichier dans `public/images` du disque par défaut, chemin dans `participants.image_url`. Servi par le lien `/storage`. | `ParticipantRequest.php:33-34`, `config/filesystems.php:16`, `75-77` |
| Sans photo | Logo de Qualix à la place. | `app/Models/Participant.php:143` |
| Remplacement, retrait | L'ancien fichier est supprimé. Case « retirer » depuis juillet 2026 (#336). | `app/Http/Controllers/ParticipantController.php:160-162` |
| Archivage, suppression du cours | Les fichiers sont supprimés **après** la transaction, pour qu'un échec de fichier ne bloque pas l'archivage. Risque assumé : des fichiers orphelins. | `app/Http/Controllers/CourseController.php:112-128` |

Où elle est affichée : liste des apprenants (grande vignette), fiche de l'apprenant, Spick (missions), en-tête de la rétroaction, avancement des rétroactions, matrice des exigences, générateur de groupes, jeu des noms, PDF de rétroaction. [V] (`participants.blade.php:26`, `participant-detail.blade.php:18`, `crib.blade.php:76`, `resources/views/feedbackContent/header.blade.php:5`, `resources/js/components/feedback/requirements_matrix/RequirementsMatrixRow.vue:5`, `resources/js/components/participantGroups/ParticipantAvatar.vue:4`, `resources/js/components/print/feedback/FeedbackDocument.jsx:14`)

- **Elle n'apparaît pas dans le formulaire d'observation** : la liste des apprenants n'affiche que le nom de scout (`FormObservation.vue:11`). [V]
- Sur téléphone, `accept="image/*"` laisse en général choisir l'appareil photo. Il n'y a pas d'attribut `capture`. [V pour le code, D pour le comportement]
- L'URL de la photo passe par le lien public `/storage` : aucun contrôle d'accès applicatif n'a été trouvé pour ces fichiers. [D]

## 7. Mobile, hors-ligne, restauration de formulaire

- **Mobile.** Mise en page adaptative (Bootstrap), zoom désactivé (`resources/views/layouts/master.blade.php:7`). Le principe écrit : « optimisé pour les ordinateurs portables », « raisonnablement utilisable sur tablette et téléphone » (`docs/Vision/61 Guiding Principles.md:21`). Pas de vue de saisie propre au téléphone. [V]
- **Pas d'application installable** : ni manifeste, ni service worker (`public/` ne contient que l'icône, les sons et les images). [V]
- **Hors-ligne.** Qualix « exige en général une connexion ». L'alternative proposée est d'héberger une instance sur un portable ou un Raspberry Pi avec un routeur wifi dans le cours (`61 Guiding Principles.md:20`). [V]
- **Avertissement hors ligne et sauvegarde automatique** : ils existent, mais **seulement** dans l'éditeur de rétroaction et les cellules de la matrice des exigences (`resources/js/components/AutoSave.vue`, utilisé par `feedback/FormFeedbackContent.vue` et `feedback/requirements_matrix/RequirementsMatrixCell.vue` ; bandeau dans `feedback/FeedbackEditor.vue:8-9`, mai 2025, #342). [V]
- **Formulaire d'observation hors ligne** : aucun brouillon local, aucune file d'attente. Un envoi sans réseau échoue comme tout POST de navigateur. [V pour l'absence de code, D pour l'effet]
- **Restauration après expiration de session.** Si un POST arrive avec un jeton CSRF périmé et sans session, les champs (hors mots de passe et fichiers) sont mis en session, l'utilisateur est renvoyé à la connexion, puis le formulaire se rouvre prérempli avec l'avertissement « tes données ont été restaurées, n'oublie pas de sauvegarder » (`bootstrap/app.php:57-66`, `app/Http/Middleware/RestoreFormDataFromExpiredSession.php`, `resources/js/mixins/input.js:13`). Rien n'est enregistré tout seul : il faut renvoyer. [V]
- Ce mécanisme couvre toutes les routes authentifiées (`routes/web.php`, groupe `restoreFormData`), donc aussi les observations et les grilles. Un fichier téléversé est perdu. [V]
- Après une erreur de validation, les champs saisis sont conservés de la même façon (`input.js:13`). [V]

## 8. Demandes ouvertes sur la rapidité de saisie

**Les issues GitHub n'ont pas pu être consultées** : l'API a refusé l'accès depuis cette session. Ce qui suit vient uniquement du dépôt.

- **Depuis le clonage du 3 octobre 2026** : `CHANGELOG.md` et `CHANGELOG_fr.md` n'ont aucune entrée après septembre 2026. Le commit lu est une mise à jour de dépendances. Rien de nouveau n'est visible sur la saisie. [V] L'historique entre les deux clones n'a pas été lu (clone superficiel).
- **Ce que le changelog montre du passé**, toujours dans le sens d'une saisie plus rapide : tri des blocs récents (février 2021, #188) ; limite de caractères visible (avril 2022, #223) ; liens vers les apprenants après une saisie multiple (avril 2022, #217) ; champs facultatifs masqués (#189) ; rester sur le formulaire (mars 2024, #334) ; plusieurs observateurs (juillet 2026, #293). [V]
- **TODO du code** : un seul dans tout `app/`, `resources/` et `routes/`, sans rapport avec la saisie (`app/Http/Controllers/EvaluationGridTemplateController.php:170`, données de grille après changement de type de contrôle). [V]
- **`docs/`** : pas de feuille de route ni de liste de demandes. `docs/Vision/61` pose seulement le principe « perdre le moins de travail possible » (sauvegarde automatique, restauration, avertissement hors ligne). [V]
- Les demandes relevées dans 06 (#59 carnet imprimable, #347 grilles vierges pour tous, #342 hors ligne, #282 et #229 pertes de texte) n'ont pas été revérifiées. Aucune ne porte directement sur la vitesse du formulaire d'observation, d'après leurs titres dans 06. [D]

## Ce qu'Azimut peut reprendre pour la saisie rapide

Propositions, pas décisions. Elles respectent : une observation = texte et/ou pièces jointes, un apprenant par observation, raccourci de groupe, zéro à plusieurs éléments de grille, pas de blocs horaires.

1. **Rester sur le formulaire après l'enregistrement, contexte conservé.** Garder l'apprenant (ou le groupe) et les éléments de grille, vider le texte, y remettre le focus. C'est le gain le plus net de Qualix, et il a été demandé par ses utilisateurs (#334).
2. **Préremplir par le contexte de la page d'entrée.** Depuis la fiche d'un apprenant : l'apprenant. Depuis une cellule ou une ligne de grille : l'apprenant et l'élément de grille. Chaque entrée fournit ce qu'elle sait, le formulaire reste unique.
3. **Remplacer « le bloc suggère les exigences » par « le contexte suggère les éléments de grille ».** Sans blocs, le contexte peut être le dernier élément de grille utilisé par ce formateur, ou l'exercice ouvert à l'écran. À la différence de Qualix, mémoriser ce dernier choix entre deux sessions de saisie.
4. **Trier plutôt que présélectionner quand on n'est pas sûr.** Qualix ne devine jamais le bloc : il met les candidats probables en tête. Même prudence pour les éléments de grille : les récents d'abord, rien de coché d'office hors enchaînement.
5. **Un groupe comme entrée de la liste des apprenants**, avec la possibilité de retirer des membres avant d'enregistrer. Azimut crée ensuite une observation par membre ; il faut le dire à l'écran (« 6 observations seront créées »), car Qualix n'en crée qu'une.
6. **Après une saisie de groupe, afficher un lien par apprenant** dans le message de succès, pour corriger une observation individuelle.
7. **Une vue « qui dois-je observer » avec photo et compteur.** Le Spick montre des visages et un compteur rouge à zéro. Sans blocs ni missions, la même idée tient avec « mes apprenants » (référent) et le nombre d'observations que j'ai faites sur chacun.
8. **Afficher la photo dans le sélecteur d'apprenants.** Qualix ne le fait pas dans le formulaire ; ses photos servent surtout au Spick et au jeu des noms. Pour un formateur qui ne connaît pas encore les noms, c'est une amélioration simple.
9. **Masquer les champs non utilisés par le cours** : sans grille liée, le formulaire se réduit à apprenant et texte.
10. **Restaurer le formulaire après une session expirée**, et aller plus loin que Qualix : un brouillon local du texte, puisque Qualix n'a rien pour un envoi sans réseau.
11. **Photo : supprimer les fichiers après la transaction d'archivage**, et prévoir le nettoyage des orphelins que Qualix accepte comme risque. Fixer aussi une taille maximale et un redimensionnement.

À ne pas reprendre tel quel :

- **L'observation partagée entre apprenants** : contraire à la décision d'Azimut.
- **Le rechargement de page à chaque enregistrement** : acceptable sur portable le soir, lent sur téléphone avec un réseau de camp. [D]
- **Le retour au menu pour changer d'apprenant** : après une saisie depuis le Spick, il faut repasser par le menu. Un bouton « apprenant suivant » manque.

## Ce qui reste à vérifier

- **Les issues GitHub de Qualix**, ouvertes ou fermées depuis le 3 octobre 2026, sur la rapidité, le mobile et le hors-ligne : non consultées (accès API refusé).
- **L'historique des commits** entre le 13 septembre et le 6 novembre 2026 : clone superficiel, un seul commit lu.
- **Le comportement réel à l'écran** : nombre de clics, ouverture automatique des listes, clavier sur téléphone, envoi au clavier. Tout est déduit du code ; un essai sur `qualix.flamberg.ch` trancherait.
- **Le comportement d'un envoi sans réseau** sur le formulaire d'observation (perte du texte ou non selon le navigateur).
- **L'accès aux photos** : servies par `/storage` sans contrôle applicatif apparent ; à confirmer sur une instance, la configuration du serveur pouvant différer.
- **Le dossier réel de stockage** des photos : dépend de `FILESYSTEM_DISK` en production.
- **L'usage réel du Spick pendant un bloc** (téléphone en main ou portable le soir) : la doc dit « le soir ou la nuit », aucune donnée d'usage dans le dépôt.
