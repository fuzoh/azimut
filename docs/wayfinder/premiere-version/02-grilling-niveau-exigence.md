## Question

La première version est-elle une **fondation** de la vraie application, ou une **démonstration jetable** ?

`GOALS.md` et `PRACTICES.md` prévoient un socle de qualité strict dès le départ (gates, pyramide de tests, contrats, Effect). Le prototype du modèle de calcul, lui, était jetable et hors des gates.

À trancher :

- **jetable ou fondation**, et si c'est une fondation, ce qui peut rester provisoire ;
- la part de l'**ordre de la première semaine** de `PRACTICES.md` §6 à faire avant la première tranche visible ;
- les **décisions techniques ouvertes** de `TODO.md` qu'il faut trancher maintenant, et celles qui attendent ;
- où **tourne** la démonstration : poste du présentateur ou serveur.

## Résolution (15 novembre 2026)

Grill clos.

- **Fondation complète** : on met d'abord en place tout le socle prévu par `PRACTICES.md` §6 (racine et contrôles de qualité, outillage des agents, contrats et domaine, serveur, application web, première tranche de bout en bout), puis on construit le parcours de la démonstration dessus. Ce n'est pas un second prototype jetable.
- **Pas de contrainte de date** : la qualité passe avant l'échéance.
- **Instance en ligne avec un repli local** : l'application tourne sur un petit serveur avec des données d'exemple seulement ; une installation locale est prête en cas de panne de réseau.
- **Décisions techniques ouvertes de `TODO.md`** : l'agent propose une réponse argumentée pour chacune, dans un ticket de la carte ; le propriétaire du dépôt valide ou corrige.
