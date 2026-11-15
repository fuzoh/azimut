## Question

Quel **socle minimal** porte la démonstration ?

Décidé : comptes de démonstration et cours d'exemple, sans MiData.

À trancher :

- les **comptes** : combien, créés comment, avec quels rôles (tous égaux, ou responsable de cours et formateur) ;
- le **cours d'exemple** : créé par un script, réinitialisable entre deux démonstrations ;
- ce qu'on garde de l'**autorisation** (scope par cours) même sans MiData ;
- la règle de `TODO.md` qui **interdit les comptes locaux en production** : comment une démonstration s'y conforme ;
- les **participants et groupes** : fixes, ou modifiables dans l'application.

## Résolution (15 novembre 2026)

Grill clos.

- **Deux rôles** : un responsable de cours, qui conçoit la grille, et un formateur, qui la remplit seulement. Deux comptes de démonstration, un par rôle. L'autorisation reste portée par cours.
- **Un environnement « démonstration » à part** : les comptes locaux y sont autorisés et la connexion MiData en est absente. La règle « pas de comptes locaux en production » ne change pas ; la validation de l'environnement au démarrage distingue les trois cas (développement et test, démonstration, production).
- **Cours d'exemple fixe** : un script crée le cours, ses participants et ses groupes, et le remet à zéro entre deux démonstrations. Aucun écran de gestion des participants ni des groupes.
