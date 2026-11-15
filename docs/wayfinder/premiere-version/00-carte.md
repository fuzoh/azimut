## Destination

Le **périmètre d'une première version de démonstration** d'Azimut et son **ordre de construction**, dans `docs/analyse/25-perimetre-v1.md`. La carte s'arrête quand on sait ce que contient cette version, ce qui en est exclu et par quoi on commence ; le découpage en tickets et la construction sont des efforts séparés.

## Notes

- **Cadre fixé au lancement (15 novembre 2026)** :
  - **But** : une démonstration à d'autres équipes de cours, pour qu'elles acceptent d'essayer Azimut sur un vrai cours. Pas de date fixée.
  - **Forme** : le porteur la présente lui-même, en suivant un parcours préparé. Personne d'autre ne manipule l'application.
  - **À voir absolument** : concevoir une grille simple dans l'application ; remplir une grille à deux formateurs en temps réel ; voir le résultat calculé d'un apprenant, avec son explication.
  - **S'il reste du temps** : les observations (spec 22), un export ou une attestation.
  - **Données** : comptes de démonstration et cours d'exemple, sans lien avec MiData. Participants issus du générateur du prototype.
  - **Éditeur de grille** : dans la première version, par choix du porteur. C'est la partie la moins définie du projet (18 §1 : la facilité réelle reste à éprouver) ; la carte la traite en premier.
- **Domaine** : `docs/analyse/18-decisions-definitives.md` fait foi. Vocabulaire : `GLOSSARY.md`. Ne pas rouvrir 18 sans le signaler.
- **Acquis** : spec et prototype du modèle de calcul (issue #14, branche `spec/prototype`), dont la campagne de mesures (#27) n'est pas faite ; spec des observations (22) ; décisions techniques dans `TODO.md` et `PRACTICES.md`.
- **Skills** : grilling + domain-modeling pour les tickets de grill ; research pour les tickets de recherche. Tickets et résolutions en français.

## Decisions so far

<!-- one line per closed ticket -->

## Not yet specified

- **Observations et export dans la démonstration** : à décider quand le parcours principal est fixé.
- **Ce qui suit la démonstration** : ce qu'il faudrait ajouter pour un cours pilote réel (MiData, droits, cycle de vie, hébergement). Hors de cette carte, mais le document de périmètre doit dire ce qui est reporté.
- **Rédaction du document de périmètre et de l'ordre de construction** : dernier ticket, quand le reste est clos.

## Out of scope

- La connexion MiData, la synchronisation des participants et les droits par rôle MiData.
- Une instance en ligne ouverte à des tiers.
- Le découpage en tickets de construction.
