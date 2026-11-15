## Ce qu'il faut construire

**Ne jamais perdre l'observation en cours** quand le réseau manque (spec §4 « Sans réseau »).

- Le texte en cours de saisie est gardé sur l'appareil à chaque frappe, avec l'apprenant, le moment et les rattachements choisis.
- Sans réseau, « Enregistrer » met l'observation en attente sur l'appareil, le dit clairement, et l'envoie dès que la connexion revient.
- Un indicateur montre le nombre d'observations en attente d'envoi.
- Ce n'est pas une saisie hors ligne complète : la page d'accès rapide doit avoir été chargée avec du réseau.

## Critères d'acceptation

- [ ] Fermer l'onglet en pleine saisie puis le rouvrir restaure le texte en cours.
- [ ] Réseau coupé : « Enregistrer » affiche « en attente d'envoi » ; réseau rétabli : l'observation part sans autre geste et apparaît dans la fiche.
- [ ] Une observation en attente garde son moment d'origine, pas l'heure de l'envoi.
- [ ] Un envoi rejoué deux fois ne crée qu'une observation.
- [ ] Si le stockage local est indisponible, la saisie fonctionne quand même et l'utilisateur est prévenu que le brouillon n'est pas gardé.

## Bloqué par

- Ticket 1 : tracer, observation générale
