## Ce qu'il faut construire

**Un seul champ de recherche** en haut de la page d'accès rapide (spec §4).

- Il trouve des apprenants, des groupes et des éléments de la grille, sans tenir compte des accents ni de la casse, et tolère les fautes de frappe.
- Choisir un apprenant ouvre sa saisie et bascule sur son groupe. Choisir un groupe en fait le groupe en cours. Choisir un élément de la grille ouvre les observations qui y sont rattachées.
- Sur ordinateur, un raccourci clavier place le curseur dans la recherche (hypothèse de la spec : c'est le seul raccourci).

## Critères d'acceptation

- [ ] « bivuac » trouve l'exercice « Bivouac » ; « meteo » trouve « Anticipe la météo ».
- [ ] Les résultats indiquent leur nature (apprenant, groupe, sphère, objectif, indicateur, exercice).
- [ ] La recherche ne renvoie que des apprenants et des nœuds du cours du formateur.
- [ ] Sur un cours de 40 participants et 300 nœuds, les résultats s'affichent sans délai perceptible à la frappe.

## Prérequis hors spec

Grille : structure des nœuds (pour la recherche d'éléments de la grille).

## Bloqué par

- Ticket 1 : tracer, observation générale
- Ticket 3 : rattachement facultatif (pour la liste des observations d'un élément)
