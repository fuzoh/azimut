## Question

Azimut affiche-t-il des **photos des apprenants**, et d'où viennent-elles ?

#29 les demande pour reconnaître vite la bonne personne en saisissant. La recherche (`docs/analyse/24-photos-pieces-jointes.md`) établit que MiData expose la photo de profil, que la part de profils avec photo est inconnue, et que la partie juridique n'a pas pu être vérifiée sur les textes officiels.

À trancher :

- **avec ou sans photo** dans la spec, et le repli sans photo (nom de scout, groupe d'origine, initiales) ;
- **la source** : import MiData, portrait pris par un formateur, ou les deux ;
- **la conservation** des photos d'apprenants, distincte de celle des pièces jointes ;
- **ce qui attend un avis juridique** avant d'être construit ;
- **les pièces jointes à la copie de grille** : fichier partagé ou copié.

## Résolution (15 novembre 2026)

Grill clos : le porteur a retenu les trois recommandations et l'hypothèse.

- **Pas de photos des apprenants dans cette spec.** On reconnaît un apprenant à son nom de scout, son groupe d'origine et une pastille d'initiales. L'import depuis MiData devient une extension, conditionnée à une mesure sur un cours réel et à un avis juridique.
- **Deux tranches** : les observations en texte se construisent d'abord ; les pièces jointes suivent, une fois l'avis juridique obtenu. La spec décrit les deux.
- **Copie de grille** : le fichier joint est partagé entre les deux observations et supprimé quand plus aucune ne s'y réfère.
- **Hypothèse retenue** : l'application fixe une taille maximale par fichier et un quota par cours ; les valeurs se décident à la construction.
