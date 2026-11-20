> Publié dans l'issue [#50](https://github.com/fuzoh/azimut/issues/50) le 16 novembre 2026. L'issue fait foi ; ce fichier n'est plus tenu à jour.

## Question

D'où peuvent venir les **photos des apprenants**, et à quelles conditions Azimut peut-il les afficher ?

#29 demande les photos des apprenants, pour reconnaître vite la bonne personne pendant la saisie. Les participants viennent de MiData, seule source (18 §2), et certains sont mineurs.

À établir, sur sources primaires :

- **MiData (hitobito)** : l'API expose-t-elle une photo de profil pour les participants d'un cours, avec quels droits et quelle résolution ;
- **photo prise ou téléversée dans Azimut** : ce que cela implique pour le stockage, la durée de conservation et la suppression à l'archivage ou à l'anonymisation (`FEATURES.md`, « Archivage et anonymisation ») ;
- **nLPD** : statut d'une photo d'identification, cas des mineurs, base de traitement à invoquer, information à donner ;
- **ce que fait Qualix** : origine, stockage et suppression des photos de participants ;
- **l'alternative sans photo** : nom de scout, groupe d'origine, couleur ou initiales, et ce qu'on y perd.

- **pièces jointes d'une observation** (décidé au ticket sur la nature de l'observation : tout type de fichier, supprimées à l'anonymisation) : stockage, taille et types à borner, photos montrant plusieurs personnes, suppression effective.

Résultat attendu : une recommandation (source, conservation, garde-fous) et les points qui demandent un avis juridique.

## Résolution (15 novembre 2026)

Constats dans `docs/analyse/24-photos-pieces-jointes.md` (hitobito `4ede47ee`, hitobito_pbs `7dc46a35`, OWASP CheatSheetSeries `98b59c58`).

**Limite** : les textes officiels suisses (fedlex, PFPDT, MSdS, J+S) n'étaient pas joignables depuis la session. La partie juridique repose sur des extraits de moteur de recherche et reste à relire sur les sources ; elle ne vaut pas avis juridique.

- **MiData expose la photo de profil** : attribut `picture` de `people` dans l'API JSON:API de hitobito, lisible par qui peut lire la personne. Les participants d'un cours sont accessibles par les participations de l'événement. C'est l'URL de l'original, pas une vignette ; sans photo, l'API renvoie une image par défaut.
- **Inconnu décisif** : la part de profils MiData qui portent une photo. À mesurer sur un cours réel.
- **Qualix** n'importe aucune photo ; elles sont téléversées à la main (`docs/analyse/23-saisie-qualix.md`).
- **nLPD** : une photo d'une personne reconnaissable est une donnée personnelle. Les recommandations trouvées portent sur la publication, pas sur un usage interne à une équipe de cours.
- **Pièces jointes de tout type** : le risque se gère au stockage et à la restitution (hors base et hors webroot, nom généré, taille et quota bornés, images réencodées sans EXIF, lecture par route authentifiée limitée à l'équipe), pas par une liste de types.
- **Proposition** : socle sans photo d'abord (nom de scout, groupe d'origine, initiales), puis import d'une vignette MiData côté serveur si la mesure le justifie ; pas de portrait téléversé par les formateurs au départ.

Reste à décider par le porteur : la source des photos d'apprenants (ticket dédié). Reste à faire hors carte : les neuf points d'avis juridique listés dans 24, et un appel réel à db.scout.ch pour confirmer les droits de lecture.
