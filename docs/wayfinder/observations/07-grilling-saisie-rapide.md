> Publié dans l'issue [#53](https://github.com/fuzoh/azimut/issues/53) le 16 novembre 2026. L'issue fait foi ; ce fichier n'est plus tenu à jour.

## Question

Comment saisit-on une observation **vite**, sur le terrain ?

#29 demande une page d'accès rapide « pour bondir à tous les types d'observations », avec raccourcis et recherche floue. Acquis : l'observation (ticket 01), l'exercice gardé d'une saisie à l'autre et le groupe (ticket 05), les parcours de Qualix (`docs/analyse/23-saisie-qualix.md`).

À trancher :

- **le point d'entrée** : ce que montre la page d'accès rapide et vers quoi elle mène ;
- **l'appareil visé** : téléphone sur le terrain, ordinateur le soir, ou les deux ;
- **la recherche floue** : sur quoi elle porte (apprenants, exercices, indicateurs) ;
- **le nombre de gestes** pour une observation, et pour la suivante ;
- **le raccourci de groupe** : une observation indépendante par membre ;
- **la liste « à classer »** : où elle apparaît, qui la vide ;
- **le réseau** : ce qui se passe sans connexion (C9 est « plus tard » dans les analyses).

## Résolution (15 novembre 2026)

Grill clos.

- **Une seule page d'accès rapide**, pensée d'abord pour le téléphone sur le terrain, cas principal de saisie.
- **Premier écran** : l'exercice et le groupe en cours du formateur, avec les membres du groupe en gros boutons. Depuis un apprenant, on ouvre la saisie d'une observation ou sa qualification. Déduit, non contredit : l'appui simple ouvre la saisie, la qualification passe par un second geste.
- **Recherche** : un seul champ, en haut, qui trouve exercices, nœuds et apprenants, avec tolérance aux fautes de frappe. Il sert à changer de contexte.
- **Pour enregistrer** : un apprenant et un contenu (texte ou pièce jointe). L'exercice en cours est rattaché d'office ; préciser un indicateur est facultatif et peut se faire plus tard.
- **Groupe** : sélection multiple des membres, avec « tout cocher ». Une observation indépendante par personne cochée.
- **À préciser** : un compteur sur la page du formateur ouvre ses propres observations sans indicateur. Chacun vide sa liste ; pas de liste d'équipe.
- **Sans réseau** : l'observation en cours est gardée sur l'appareil et part au retour de la connexion. Pas de saisie hors ligne complète (elle relève de la synchronisation de toute l'application).
- **Pas de prototype dans la carte** : la spec décrit le parcours ; la première tranche à construire est cette saisie, à essayer sur un vrai exercice.
- **Hypothèses posées, non contredites** : le bouton photo ouvre l'appareil photo ; sur ordinateur, un seul raccourci clavier ouvre la recherche.
