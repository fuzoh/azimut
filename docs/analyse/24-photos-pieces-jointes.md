# Photos des apprenants et pièces jointes des observations

Ce document répond à la question [04 — research photos des apprenants](../wayfinder/observations/04-research-photos-apprenants.md) : d'où peuvent venir les photos des apprenants, à quelles conditions Azimut peut les afficher, et quels garde-fous poser sur les pièces jointes d'une observation.

> **Statut : recherche (15 novembre 2026).** Propositions, pas décisions. [18 — Décisions définitives](18-decisions-definitives.md) fait foi pour le modèle. Les décisions de la [carte des observations](../wayfinder/observations/00-carte.md) ne sont pas rediscutées : pièce jointe de tout type, pièce jointe seule valide, observations internes à l'équipe, supprimées à l'anonymisation, dupliquées à la copie de grille. **Ce document n'est pas un avis juridique.**

Sources, consultées le 2026-11-15 :

| Source | Accès | Usage |
| --- | --- | --- |
| `hitobito/hitobito`, commit `4ede47ee` (2026-11-13), clone superficiel | lu | section 1 |
| `hitobito/hitobito_pbs`, commit `7dc46a35` (2026-11-13), clone superficiel | lu | section 1 |
| Docs hitobito dans le dépôt : `doc/developer/common/api/json_api.md`, `rest_api.md`, `service_accounts.md`, `doc/developer/people/oauth.md` | lu | section 1 |
| OWASP File Upload Cheat Sheet, <https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/File_Upload_Cheat_Sheet.md>, commit `98b59c58` | lu | section 3 |
| [23 — Saisie dans Qualix](23-saisie-qualix.md), section 6 | lu | section 1.5 |
| LPD, RS 235.1, <https://www.fedlex.admin.ch/eli/cc/2022/491/fr> ; OPDo, RS 235.11, <https://www.fedlex.admin.ch/eli/cc/2022/568/fr> | **inaccessible** (proxy) | section 2, extraits seulement |
| PFPDT : <https://www.edoeb.admin.ch/fr/prendre-et-publier-des-photos>, <https://www.edoeb.admin.ch/fr/protection-des-donnees-dans-les-associations> | **inaccessible** | section 2, extraits seulement |
| MSdS : notice « Le droit à l'image dans les activités scoutes », <https://pfadi.swiss/fr/publications-telechargements/downloads/detail/686/notice-le-droit-a-limage-dans-les-activites-scoutes> ; notice « Prendre des photos aux scouts » (2017), `.../detail/685/...` ; « MiData Datennutzung », `.../detail/153/...` | **inaccessible** | section 2, extraits seulement |
| J+S (OFSPO) : feuille d'information « Protection des données », février 2022 | **inaccessible** | section 2, extrait seulement |

Convention : **[V]** = vérifié dans une source lue (chemins relatifs au dépôt cité) ; **[D]** = déduit, à confirmer ; **[E]** = extrait renvoyé par un moteur de recherche, page officielle non ouverte. Les sites `fedlex.admin.ch`, `edoeb.admin.ch`, `pfadi.swiss`, `jugendundsport.ch` et `cheatsheetseries.owasp.org` ne sont pas joignables depuis cette session. **Tout ce qui est marqué [E] doit être relu sur la page officielle avant d'être cité ailleurs.**

## TL;DR

- **L'API JSON:API de hitobito expose la photo de profil** : attribut `picture` de la ressource `people`, une URL, sans garde de lecture propre. Qui peut lire la personne lit sa photo. [V]
- **Les participants d'un cours y sont accessibles** par `/api/event_participations?filter[event_id]=…&include=participant`, pour un formateur qui a un rôle de cours avec `participations_read` ou plus. Le wagon scout ne change rien à la photo. [V pour le code, D pour le comportement sur db.scout.ch]
- **L'URL pointe sur l'original**, pas sur une vignette : JPEG, GIF ou PNG, jusqu'à 8000 × 8000 px. Sans photo, l'API renvoie l'URL d'une image par défaut, pas une valeur vide. [V]
- **L'URL de la photo est probablement un lien permanent, lisible sans session.** À ne jamais transmettre telle quelle au navigateur ni stocker en clair plus longtemps que nécessaire. [D]
- **Le taux de profils MiData qui portent une photo est inconnu.** C'est la donnée qui décide si la piste MiData vaut l'effort. Qualix, lui, n'importe aucune photo et fait téléverser à la main (23 §6). [V pour Qualix]
- **nLPD : une photo d'une personne reconnaissable est une donnée personnelle.** Elle n'est une donnée sensible que dans des cas particuliers. Les principes (finalité, proportionnalité, destruction dès que plus nécessaire, information, sécurité) s'appliquent, mineur ou non. [E, D]
- **Les recommandations trouvées (PFPDT, MSdS) portent sur la publication de photos**, pas sur un usage interne par une équipe de cours. L'usage d'Azimut est plus étroit, mais aucun texte lu ne le traite directement. [E]
- **Pièces jointes « de tout type » : le risque se gère au stockage et à la restitution**, pas par une liste de types. Stockage hors webroot, nom généré, taille bornée, jamais servi en ligne, images réencodées sans EXIF, suppression qui couvre aussi les copies et les sauvegardes. [V OWASP, D]

## 1. MiData (hitobito) : la photo de profil dans l'API

### 1.1 Ce que le modèle stocke

| Point | Constat | Source (`hitobito/hitobito`) |
| --- | --- | --- |
| Stockage | `has_one_attached :picture` (Active Storage). Une seule variante déclarée : `thumb`, 32 × 32, recadrée. | `app/models/person.rb:203-205` |
| Formats | `image/jpeg`, `image/gif`, `image/png`. | `app/models/person.rb:335-336`, `config/settings.yml:17-22` |
| Taille | 8000 × 8000 px au plus. Aucune limite de poids trouvée sur ce champ. | idem |
| Sans photo | Image par défaut `profile.svg`. | `app/models/person.rb:589-595` |
| Qui la met | Champ fichier du formulaire de la personne, avec case « retirer ». Facultatif. | `app/views/people/_picture_fields.html.haml` |
| Service de fichiers | Disque local ou S3 (cloudscale), selon `RAILS_STORAGE_SERVICE`. | `config/storage.yml`, `config/environments/production.rb:34` |

### 1.2 JSON:API (`/api/…`, depuis 2023)

- **`PersonResource` expose `picture`**, une chaîne : l'URL complète calculée par `picture_full_url`. L'attribut n'a pas de condition `readable:`, au contraire de `gender` et `birthday` qui exigent `show_details`. [V] (`app/resources/person_resource.rb:46-51`)
- **L'URL est celle du fichier d'origine** (`url_for(picture)`), ou celle de `profile.svg` si rien n'est attaché. La variante `thumb` n'est pas exposée par l'API. [V] (`app/decorators/person_decorator.rb:76-90`)
- **Participants d'un événement** : `Event::ParticipationResource` (`/api/event_participations`, filtrable par `event_id`) a une relation polymorphe `participant` vers `PersonResource`. [V] (`app/resources/event/participation_resource.rb:16-36`)
- **Droits sur les participations** : rôle d'événement avec `participations_read`, `participations_read_details`, `participations_full` ou `event_full`, ou droits de couche ou de groupe. Seules les participations actives sont listées. [V] (`app/abilities/json_api/event_participation_readables.rb:12-18`, `participation_resource.rb:38-40`) Selon `PRACTICES.md` §8, cela couvre Leader, ClassLeader, Speaker, Helper et Cook.
- **Scopes OAuth** : `event_participations` ou `api` pour les participations ; `people` ou `api` pour `/api/people`. [V] (`participation_resource.rb:12`, `person_resource.rb:10`, `app/resources/application_resource.rb:58-60`)
- **Point à tester** : la relation `participant` est déclarée avec `base_scope: ::Person.all` et un renvoi à `hitobito/hitobito_pbs#466`. [V] Elle semble donc contourner le filtre de `PersonResource` (droits sur les personnes et scope `people`). [D] La doc dit l'inverse : une ressource incluse subit son propre contrôle, « the same applies for event leaders and participants » (`json_api.md`, « Sideloading via include »). [V] Seul un appel réel tranche si le scope `people` est nécessaire.
- **`Event::ContactDetailsResource`** expose aussi `picture`, mais seulement pour le contact de l'événement, si l'événement le publie. Sans intérêt pour les participants. [V] (`app/resources/event/contact_details_resource.rb:32-34`)

### 1.3 Ancienne API (`….json`)

- **Dépréciée, documentation retirée du dépôt** (elle renvoie à l'historique git). Le code est toujours là. [V] (`doc/developer/common/api/rest_api.md`, `app/controllers/people_controller.rb:55-66`, `227-236`)
- `PersonSerializer` et `PeopleSerializer` exposent `picture`. [V] (`app/serializers/person_serializer.rb:34`, `people_serializer.rb:34`)
- **`EventParticipationSerializer` exclut explicitement `picture`** : l'ancienne API ne donne pas la photo par la liste des participants. [V] (`app/serializers/event_participation_serializer.rb:26`)
- À ne pas utiliser : `PRACTICES.md` §8 a déjà retenu la JSON:API.

### 1.4 Wagon scout (`hitobito_pbs`)

- `Pbs::PersonResource` n'ajoute que `pronouns`. Rien sur `picture`, ni dans les ressources, ni dans les droits. [V] (`app/resources/pbs/person_resource.rb`)
- Le wagon affiche la vignette 32 × 32 dans une vue d'approbation, sans effet sur l'API. [V] (`app/views/event/approvals/index.html.haml:9`)

### 1.5 Ce que cela implique

- **L'URL est de la forme `/rails/active_storage/blobs/redirect/<id signé>/<nom>`.** Aucune authentification propre n'a été trouvée sur les contrôleurs Active Storage (`config/initializers/active_storage.rb` ne gère que le fichier manquant). [V] Un document J+S servi par l'instance scoute (`pbs.puzzle.ch`) est indexé par un moteur de recherche avec ce format d'URL, et son jeton décodé contient `"exp":null`. [V pour l'URL] **Déduction : qui connaît l'URL lit la photo, sans limite de durée.** [D]
- **Une photo d'origine peut peser plusieurs Mo.** Les afficher telles quelles dans un sélecteur d'apprenants est exclu : il faut une vignette produite côté Azimut. [D]
- **Détecter « pas de photo »** : l'URL se termine par le nom de l'image par défaut (`profile…svg`), et non par un chemin Active Storage. [D]
- **Qualix** ne synchronise aucune photo depuis MiData : téléversement manuel, 2000 Ko, fichier servi par un lien public, suppression après la transaction d'archivage (23 §6). [V]

## 2. nLPD : photo d'identification, photos d'activité, mineurs

Les textes officiels n'ont pas pu être ouverts. Les numéros d'articles ci-dessous sont ceux de la LPD du 25 septembre 2020 (RS 235.1) et sont **à relire sur Fedlex**.

### 2.1 Ce que disent les textes

| Sujet | Contenu | Marque |
| --- | --- | --- |
| Donnée personnelle | Toute information concernant une personne physique identifiée ou identifiable (art. 5 let. a). | à relire |
| Donnée sensible | Liste fermée (art. 5 let. c), dont « les données biométriques identifiant une personne physique de manière univoque », la santé, les opinions ou activités religieuses, l'origine raciale ou ethnique. | [E] |
| Principes | Licéité, bonne foi, proportionnalité, finalité reconnaissable, exactitude (art. 6). | à relire |
| Durée | Les données « sont détruites ou anonymisées dès qu'elles ne sont plus nécessaires au regard des finalités du traitement » (art. 6 al. 4). | [E] |
| Consentement | Quand il est requis, il doit être libre et éclairé ; exprès pour les données sensibles (art. 6 al. 6 et 7). | à relire |
| Conception | Protection dès la conception et par défaut (art. 7). | à relire |
| Sécurité | Mesures organisationnelles et techniques appropriées au risque (art. 8 ; OPDo art. 1 à 6). | à relire |
| Sous-traitance | Un hébergeur traite pour le compte du responsable, par contrat (art. 9). | à relire |
| Information | Devoir d'informer lors de la collecte, y compris quand les données ne viennent pas de la personne elle-même (art. 19 ; exceptions art. 20). | [E] pour le principe |
| Violation | Annonce au PFPDT d'une violation de la sécurité à risque élevé (art. 24). | à relire |
| Droits | Droit d'accès (art. 25) ; rectification, effacement, opposition (art. 32). | à relire |
| Atteinte et justification | Traiter contre les principes, ou contre la volonté expresse de la personne, est une atteinte (art. 30). Elle peut être justifiée par le consentement, un intérêt prépondérant privé ou public, ou la loi (art. 31). | [E] pour l'art. 31 |
| Droit à l'image | Protection de la personnalité, art. 28 CC. | à relire |
| Mineurs | La LPD ne fixe pas d'âge. Le Code civil laisse le mineur capable de discernement exercer seul ses droits strictement personnels (art. 19c CC). | [E] pour le CC ; absence d'âge : rien trouvé |

### 2.2 Ce que disent le PFPDT, le MSdS et J+S

- **PFPDT, associations.** Les données des membres peuvent être traitées sans consentement si c'est nécessaire au but de l'association, et seulement pour la finalité de leur collecte. Toute collecte ou utilisation supplémentaire suppose une information préalable et reste facultative. [E]
- **PFPDT, photos.** Avant de **publier** une image, il faut le consentement des personnes, sauf intérêt prépondérant. Pour un mineur, les parents doivent aussi consentir. Photo de groupe : informer suffit, une opposition bloque la publication. Le consentement se retire en tout temps. [E]
- **PFPDT, employeurs.** Les photos de personnes peuvent révéler la religion, l'origine ou un handicap. [E]
- **MSdS, notice « Le droit à l'image dans les activités scoutes ».** Principe : pas de prise ni de publication de photo sans autorisation. Dès 14 ans environ, la personne décide elle-même de son image. Un accord écrit des parents est plus sûr. La notice contient un modèle d'accord parental, tourné vers la publication. [E]
- **J+S (OFSPO), feuille d'information de février 2022.** Une section 1.8 traite de la prise et de la publication d'images pendant les cours et camps J+S. Contenu non lu. [E]
- **MSdS, « MiData Datennutzung ».** Le document existe ; il règle probablement la réutilisation des données MiData. Non lu.

### 2.3 Ce que j'en déduis

- **Une photo de profil ou une photo prise en cours est une donnée personnelle** dès que la personne est reconnaissable. [D]
- **Elle n'est pas une donnée biométrique tant qu'Azimut ne fait aucun traitement technique de reconnaissance.** Elle peut devenir sensible par ce qu'elle montre (santé, religion). Position courante, non confirmée par une source lue. [D]
- **Trois cas à distinguer** :

| Cas | Finalité | Lecture [D] |
| --- | --- | --- |
| Photo de profil MiData, affichée à l'équipe du cours | Reconnaître l'apprenant pendant la saisie | L'équipe la voit déjà dans MiData. La copie dans Azimut est une réutilisation proche, mais reste une nouvelle copie à justifier, à annoncer et à supprimer. |
| Photo d'identification prise ou téléversée par un formateur | Idem | Nouvelle collecte : information préalable, possibilité de refuser sans conséquence. |
| Photo d'activité en pièce jointe d'une observation | Garder la trace d'un fait observé | Montre souvent des tiers. La finalité est l'évaluation d'**un** apprenant : les autres personnes visibles n'ont rien à y faire. |

- **Proportionnalité** : une vignette suffit à reconnaître quelqu'un. Garder l'original est plus que nécessaire. [D]
- **Durée** : la finalité « reconnaître pendant la saisie » s'éteint avec la saisie. L'anonymisation à 3 mois est la borne haute déjà décidée ; l'archivage (30 jours) serait plus proche de la finalité. [D]
- **Information** : les participants (et les parents des mineurs) devraient savoir qu'Azimut existe, ce qu'il contient, qui y accède et quand c'est supprimé. Le canal naturel est la communication d'avant-cours. [D]
- **Mineurs** : pas de régime séparé dans la LPD, mais la pesée d'intérêts est plus stricte et les recommandations demandent l'accord des parents pour une publication. Azimut ne publie rien : l'accord parental n'est pas établi comme nécessaire, ni comme superflu. [D]

## 3. Pièces jointes téléversées depuis un téléphone

Source principale : OWASP File Upload Cheat Sheet. La décision « tout type de fichier » écarte sa première recommandation (liste d'extensions autorisées) : les autres couches doivent compenser.

| Risque | Garde-fou usuel | Marque |
| --- | --- | --- |
| Fichier actif (HTML, SVG, script) exécuté chez un autre formateur | Ne jamais servir en ligne : `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, type générique, origine séparée si possible. Aperçu réservé aux images réencodées. | [V] menace OWASP « client-side active content » ; [D] pour les en-têtes |
| Type déclaré faux | Ne pas se fier au `Content-Type` ; contrôler la signature du fichier, sans s'y fier seule. | [V] |
| Nom de fichier hostile | Nom généré par l'application ; nom d'origine gardé comme simple libellé, longueur et caractères bornés. | [V] |
| Disque rempli, déni de service | Taille maximale par fichier ; limites sur le téléversement et le téléchargement. Ajouter un quota par cours. | [V] ; quota [D] |
| Archives | ZIP déconseillé (bombes, contenu arbitraire). Ne jamais décompresser côté serveur. | [V] |
| Faille du décodeur d'images | Bibliothèque à jour, formats restreints, limites de ressources. | [V] |
| Métadonnées EXIF (GPS, appareil, date) | Décoder et réencoder l'image en retirant les métadonnées. Le lieu d'un camp de mineurs n'a pas à voyager avec la photo. | [V] pour le réencodage ; [D] pour le motif |
| Logiciel malveillant | Antivirus ou bac à sable « si disponible ». Attention aux services publics d'analyse : ils reçoivent le fichier. | [V] |
| Accès non autorisé | Téléversement et lecture réservés aux utilisateurs authentifiés et autorisés ; stockage sur un autre hôte ou hors webroot. | [V] |
| Stockage en base | Possible mais déconseillé sans raison précise (poids des sauvegardes, performances). | [V] |
| URL devinable ou partagée | Lecture par une route qui vérifie l'appartenance à l'équipe du cours, ou URL signée à durée courte. Le contre-exemple est l'URL permanente de hitobito (1.5) et le lien public de Qualix (23 §6). | [D] |
| Photo montrant plusieurs personnes | Pas de garde-fou technique fiable. Règle d'usage affichée à la saisie ; recadrage possible avant envoi. | [D] |
| Fichiers orphelins | Suppression des fichiers après la transaction, plus un balayage périodique des fichiers sans référence (23, idée 11). | [D] |
| Copie de grille | Les observations sont dupliquées : un fichier partagé par plusieurs observations ne disparaît qu'avec la dernière référence, ou chaque copie a son fichier. À trancher, sinon la suppression est incomplète. | [D] |
| Sauvegardes | Une suppression n'est effective que quand la dernière sauvegarde qui contient le fichier a expiré. La rétention des sauvegardes s'ajoute donc aux 3 mois. | [D] |
| Copies hors du serveur | Cache du navigateur, galerie du téléphone, hors-ligne : hors de portée d'une suppression serveur. `Cache-Control: private, no-store` sur les fichiers ; ne pas enregistrer la photo prise dans la galerie. | [D] |

Formats de téléphone : un iPhone produit du HEIC, que tous les navigateurs n'affichent pas. Une conversion en JPEG ou WebP au téléversement règle l'affichage et le retrait des métadonnées d'un coup. [D]

## 4. L'alternative sans photo

Ce qu'on a sans photo : nom de scout (totem), prénom et nom, groupe d'origine, pastille d'initiales colorée, formateur référent, groupe d'évaluation. Tout vient de MiData ou d'Azimut, sans donnée nouvelle.

| Critère | Avec photo | Sans photo |
| --- | --- | --- |
| Reconnaître quelqu'un dont on ne sait pas encore le nom (premiers jours) | Oui : c'est le seul cas où la photo est irremplaçable. | Non. Il faut demander le nom, ou regarder le foulard et le groupe. |
| Retrouver vite une personne dont on connaît le nom | Gain faible. | Suffisant : recherche floue sur le nom de scout. |
| Distinguer deux homonymes | Oui. | Oui, par le groupe d'origine. |
| Vue « qui dois-je observer » (Spick de Qualix, 23 §3) | Visages et compteur. | Pastilles et compteur : même information, moins immédiate. |
| Apprentissage des noms par l'équipe | Possible (jeu des noms de Qualix). | Non. |
| Données, stockage, suppression, information | Charge réelle (sections 2 et 3). | Aucune. |
| Couverture | Partielle si la source est MiData ; il faut de toute façon un repli. | Totale. |

- **La pastille d'initiales n'identifie pas** : sa couleur ne correspond à rien de visible sur le terrain. Elle aide seulement à retrouver une ligne déjà repérée. [D]
- **Le repli sans photo est obligatoire dans tous les cas** (profil sans photo, refus, photo retirée). L'alternative n'est donc pas un autre produit : c'est le socle. [D]
- **Ce qu'on perd se concentre sur les deux ou trois premiers jours**, pour les formateurs qui ne connaissent pas les apprenants. Dans Qualix, la photo n'est d'ailleurs pas dans le formulaire d'observation (23 §6). [V pour Qualix, D pour le reste]

## Recommandation

Propositions, à trancher par l'équipe.

**Source des photos d'apprenants**

1. **Construire d'abord le socle sans photo** : nom de scout, groupe d'origine, pastille d'initiales, recherche floue. Il sert dans tous les cas.
2. **Mesurer avant de construire** : sur un cours réel, compter les participants qui ont une photo dans MiData. Si la couverture est faible, s'arrêter là.
3. **Si la couverture le justifie, prendre la photo dans MiData à la synchronisation**, avec le jeton du formateur. Azimut télécharge l'original côté serveur, en tire une vignette (256 px environ, réencodée, sans métadonnées) et ne garde ni l'original ni l'URL MiData. Le navigateur ne reçoit jamais l'URL MiData.
4. **Pas de téléversement de portrait par les formateurs dans un premier temps.** C'est une collecte nouvelle, sur des mineurs, qui demande une information préalable et un avis juridique. Un formateur peut déjà joindre une photo à une observation, ce qui n'en fait pas un portrait de profil.
5. **Un apprenant, ou son représentant, doit pouvoir faire retirer sa photo d'Azimut** sans toucher à MiData : un réglage par apprenant, à la main de la direction de cours.

**Conservation**

- Vignettes : supprimées **à l'archivage** du cours (30 jours par défaut), au plus tard à l'anonymisation. Supprimées aussi quand un participant est écarté ou disparaît de MiData, et rafraîchies quand la photo MiData change ou est retirée.
- Pièces jointes : supprimées à l'anonymisation (décidé). Ajouter la suppression des fichiers eux-mêmes, le balayage des orphelins, et une rétention des sauvegardes courte et écrite.

**Garde-fous pour les pièces jointes**

- Stockage hors de la base et hors webroot (volume ou stockage objet chez l'hébergeur suisse), nom généré, métadonnées en base.
- Taille maximale par fichier et quota par cours. Ordre de grandeur à fixer : 10 à 25 Mo par fichier.
- Tout type accepté, mais **rien n'est servi en ligne** sauf les images réencodées par Azimut. Le reste se télécharge.
- Images : réencodage systématique, retrait des EXIF, conversion du HEIC, dimension maximale.
- Lecture par une route authentifiée qui vérifie l'appartenance à l'équipe du cours ; `no-store`.
- Rappel à la saisie : « une photo jointe concerne l'apprenant observé ; évite les autres visages ».
- Antivirus (ClamAV en conteneur) : utile mais secondaire tant que seuls des formateurs authentifiés téléversent et que rien n'est servi en ligne. À décider avec l'hébergement.
- Copie de grille : décider si le fichier est partagé (compteur de références) ou copié.

## Points qui demandent un avis juridique

1. **Qui est le responsable du traitement** pour Azimut : l'exploitant de l'instance, l'association cantonale qui organise le cours, le MSdS ? En découlent le devoir d'informer, le contrat avec l'hébergeur et le registre des activités.
2. **Réutiliser la photo de profil MiData dans Azimut** : finalité compatible avec celle pour laquelle la personne l'a déposée ? Les conditions d'utilisation de MiData et le document « MiData Datennutzung » le permettent-ils à une application tierce ?
3. **Information des participants et des parents** : contenu, moment, canal ; suffit-il de compléter la déclaration de protection des données du MSdS ou du cours ?
4. **Mineurs** : faut-il un accord des parents pour un usage interne non publié, ou l'information suffit-elle ? À partir de quel âge l'accord du jeune seul vaut-il ?
5. **Photo d'identification prise par un formateur** : base de justification, forme du refus, conséquences d'un refus.
6. **Photos d'activité montrant des tiers** jointes à l'observation d'un apprenant : admissible, et à quelles conditions ?
7. **Statut de la photo** : confirmer qu'un portrait sans reconnaissance automatique n'est pas une donnée biométrique sensible, et traiter le cas d'une photo qui révèle la santé ou la religion.
8. **Durée** : 3 mois pour les pièces jointes et 30 jours pour les vignettes sont-ils défendables ? Quelle rétention pour les sauvegardes ?
9. **Analyse d'impact (art. 22) et droit d'accès (art. 25)** : nécessaires ici ? Le droit d'accès s'étend-il aux observations internes et à leurs pièces jointes ?

## Ce qui reste à vérifier

- **Les textes officiels** : LPD et OPDo sur Fedlex, pages du PFPDT, notices du MSdS (686, 685), « MiData Datennutzung » (153), feuille d'information J+S, section 1.8. Aucun n'a pu être ouvert ; tout le [E] est à relire.
- **Sur db.scout.ch, avec un vrai jeton de formateur** : `include=participant` renvoie-t-il `picture` avec les seuls scopes `events event_participations`, ou faut-il `people` (1.2) ? Quelle version de hitobito est déployée ?
- **L'URL de la photo** : lisible sans session, et sans expiration (1.5) ? Si oui, le signaler au MSdS n'est pas du ressort d'Azimut, mais la conception doit en tenir compte.
- **Le taux de participants avec photo** dans MiData, sur un ou deux cours réels.
- **Le poids réel des photos MiData** (aucune limite de poids trouvée dans le code).
- **Le profil OAuth** (`/oauth/profile`, `/oauth/userinfo`) : expose-t-il la photo du formateur connecté ? Non regardé.
- **Le PFPDT ou le MSdS ont-ils publié quelque chose sur les outils internes d'évaluation** de participants ? Rien trouvé.
- **L'hébergeur** : stockage objet disponible, chiffrement au repos, durée et suppression des sauvegardes.
- **Issue `hitobito/hitobito_pbs#466`** : non lue ; elle explique pourquoi la relation `participant` contourne le filtre des personnes.
