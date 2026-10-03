# Azimut — fonctionnalités

Ce document décrit le domaine et le comportement attendu. Il ne décrit pas le code.

> Ce document est encore une ébauche. Le domaine sera détaillé dans une prochaine session de grill, à partir d'exemples de qualifications réelles.

## Contexte

Azimut permet à l'équipe d'un cours de formation scout de créer la qualification du cours, puis de la remplir pour chaque apprenant pendant le cours. Plusieurs formateurs saisissent en même temps sur les qualifications du même cours.

## Vocabulaire (provisoire)

| Terme | Sens |
| --- | --- |
| **Cours** | Une session de formation donnée à un endroit. Plusieurs cours peuvent avoir lieu en même temps à des endroits différents. |
| **Apprenant** | Une personne qui suit un cours et dont on évalue la qualification. |
| **Formateur** | Une personne de l'équipe d'un cours. Elle remplit les qualifications des apprenants de ce cours. |
| **Équipe de cours** | L'ensemble des formateurs d'un cours. |
| **Qualification** | L'arbre d'évaluation utilisé dans un cours. ⚠️ Le terme désigne aujourd'hui à la fois la *structure* (l'arbre) et les *données remplies* pour chaque apprenant. Il faudra deux termes distincts. |
| **Indicateur** | Le niveau le plus fin de l'arbre. C'est là qu'on met une note et un commentaire. |
| **Critère, objectif, sphère** | Les niveaux de regroupement habituels, de l'indicateur vers la racine : indicateur → critère → objectif → sphère. Chaque niveau agrège celui du dessous. |
| **Échelle** | L'ensemble des valeurs possibles d'une note, par exemple ok/ko, ++/+/-/--, 1 à 5 ou 1 à 10. |
| **Seuil** | Une valeur minimale à atteindre, sur une échelle ou dans une agrégation. |
| **Agrégation** | Le calcul qui produit le résultat d'un niveau à partir de ses enfants : moyenne, pourcentage de réussite, seuil minimum… |
| **Commentaire de synthèse** | Le commentaire qui résume, à un niveau donné, les niveaux du dessous. |
| **Groupe** | Un sous-ensemble des apprenants d'un cours, par exemple un groupe d'évaluation. |
| **Joker** | Un mécanisme utilisé lors de la finalisation. Les règles restent à préciser. |
| **Verrou** | La réservation temporaire d'une cellule par le formateur qui est en train de la modifier. |
| **Figer** | Rendre une qualification non modifiable : la structure avant le cours, puis les données à la fin. |

## Structure d'une qualification

- On crée une qualification **entièrement dans l'application**, à partir de primitives.
- C'est un **arbre** :
  - Les feuilles sont les indicateurs, notés et commentés.
  - Chaque nœud au-dessus produit un résultat calculé à partir de ses enfants. **Il y a toujours un résultat calculé.**
- Chaque nœud peut avoir un commentaire de synthèse.
- **Échelles :**
  - Plusieurs échelles cohabitent dans une même qualification. Les branches de l'arbre n'utilisent pas toutes la même.
  - Il faut trouver une généralisation qui couvre tous les types d'échelle : binaire, symbolique ordonnée, numérique.
  - On doit pouvoir **convertir d'une échelle à l'autre** quand on agrège des enfants notés sur des échelles différentes.
  - Les seuils varient selon les parties de l'arbre.
- **Recalcul :** le comportement attendu est celui d'un tableur. Quand une note change, seuls les résultats qui en dépendent sont recalculés, pas l'arbre entier.

## Cycle de vie

1. **Préparation :** la qualification est créée avant le cours, puis sa structure est figée.
2. **Pendant le cours :** les formateurs remplissent les indicateurs et les commentaires.
   - La structure peut quand même changer en cours de route, par exemple quand on supprime un indicateur. L'effet sur les données déjà saisies reste à définir.
   - On peut **copier une qualification au milieu du cours, avec les données des apprenants**, pour tester un changement et comparer les résultats.
3. **Finalisation (dernier soir) :** l'équipe reformule les commentaires, rédige un commentaire général et utilise éventuellement un joker.
4. **Clôture :** la qualification est figée, puis imprimée ou exportée en PDF.

## Acteurs et accès

- Pour l'instant, l'application est **réservée aux formateurs**. Les apprenants n'y ont pas accès.
- Un formateur ne voit **que les cours auxquels il participe**, et seulement les qualifications des apprenants de ces cours. Il n'a jamais accès aux autres cours.
- Les droits dépendent de deux choses : le **rôle** de la personne et le **cours** auquel elle participe.
- À affiner : les groupes d'évaluation, le formateur référent d'un apprenant, et les autres mécanismes internes au cours.

## Connexion

- **Production :** SSO avec la base de données scoute suisse (MiData, [db.scout.ch](https://db.scout.ch)). C'est aussi d'elle que viennent les cours auxquels un formateur participe, avec son rôle dans chaque cours.
- **Développement et tests :** des comptes locaux.
- **Rôles de cours qui existent dans MiData :** Kursleiter·in (qui a le droit de qualifier), Klassenlehrer·in, Referent·in, Kurshelfer·in, Küche, Participant et LKB. Il reste à décider comment ils correspondent aux droits dans Azimut.

## Vues de saisie

Le même arbre de qualification se consulte sous plusieurs angles :

- **Par apprenant :** toutes les sphères et tous les indicateurs d'un apprenant.
- **Par sphère :** une sphère pour tous les apprenants du cours.
- **Par sphère et par groupe :** une sphère, avec tous ses indicateurs, pour les apprenants d'un groupe.

## Saisie collaborative en temps réel

Le comportement visé est proche d'Excel Online ou de Google Sheets :

- Quand un formateur affiche une grille, il voit les valeurs **arriver dans les cellules** au fur et à mesure que les autres formateurs les remplissent. Les résultats calculés se mettent à jour en même temps.
- **Verrou :**
  - Une cellule de texte en cours d'édition est **verrouillée** pour les autres formateurs, qui voient qui l'occupe.
  - Le verrou **expire** quand l'utilisateur devient inactif.
  - Restent à définir : la durée du verrou, la façon de détecter l'inactivité, et si les cellules de note sont aussi verrouillées.
- **Dernier gagnant :** en cas de coupure ou de conflit, la dernière écriture l'emporte, pour ne rien perdre de ce qui a été saisi.
- On ne fait **pas** d'édition à plusieurs dans une même cellule, caractère par caractère.
- **Moment de la sauvegarde :** encore à décider. La piste privilégiée est d'enregistrer les notes à la sortie de la cellule, et les textes longs à la sortie plus par brouillons réguliers.

## Historique

- **Chaque modification** d'une cellule (texte ou note) est versionnée : qui a écrit quoi, et quand.
- On peut suivre l'**évolution d'une note** au fil du cours.
- Il y a un journal des modifications.
- On peut **revenir en arrière** sur une cellule, ou sur une partie de la grille.
- La façon de consulter l'historique dans l'interface reste à définir.

## Hors ligne

- Pas de vrai mode hors ligne au départ.
- Une coupure réseau courte ne doit pas faire perdre de saisie.
- Un mode hors ligne reste à évaluer plus tard.

## Langues

L'application est d'abord en français. Elle doit pouvoir devenir multilingue sans retoucher chaque écran.

## Volumes attendus

Ordres de grandeur pour un cours :

| Élément | Volume |
| --- | --- |
| Apprenants par cours | 10 à 40 |
| Sphères par qualification | 5 à 7 |
| Indicateurs par sphère | 10 à 60 |
| Formateurs par cours | 6 à 10 |
| Cours en parallèle | 4 à 5 |

Au maximum, un cours compte donc environ 40 × 7 × 60 ≈ 17 000 notes d'indicateurs, sans compter les commentaires ni les niveaux agrégés. Une cinquantaine de formateurs saisissent en même temps sur l'ensemble des cours.

## Hébergement et données

- Hébergement en Suisse, dans des conteneurs Docker déployés avec Docker Compose pour le moment.
- Les qualifications concernent des personnes, souvent mineures. Il faudra une durée de conservation et une purge ou une anonymisation automatique (à discuter).

## Questions ouvertes (domaine)

- La généralisation des échelles : les types, les seuils, et les règles de conversion d'une échelle à l'autre.
- Le catalogue des agrégations : moyenne, pourcentage de réussite, seuil minimum, autres.
- Le vocabulaire : comment distinguer la structure d'une qualification et les données d'un apprenant ?
- Les modifications de structure en cours de cours : que deviennent les notes d'un indicateur supprimé ?
- La copie d'une qualification pour comparer : est-ce une copie indépendante ou une variante liée à l'originale ? Comment se fait la comparaison ?
- Le joker : les règles.
- Les groupes d'évaluation et le formateur référent : les règles.
- La correspondance entre les rôles de cours MiData et les droits dans Azimut.
- Les verrous : la durée et la détection d'inactivité.
- La consultation de l'historique et la restauration d'une partie de grille.
- Le contenu et la mise en page du PDF.
- La durée de conservation et la purge des données.
- Faut-il reporter les qualifications dans MiData ?
- Le positionnement face à [Qualix](https://github.com/gloggi/qualix), une app existante pour les qualifications de cours scouts suisses, connectée à MiData. Qu'est-ce qu'Azimut fait de différent, et que peut-on reprendre de son modèle ?
