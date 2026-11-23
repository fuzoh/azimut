# Essai : modèle de stockage d'une grille et de ses notes

Fichiers de l'essai décrit dans [`../stockage-grille.md`](../stockage-grille.md) (ticket fuzoh/azimut#96). Faits et mesures, aucune décision.

## Rejouer

1. Générer le jeu commun (déterministe ; lit le noyau dans `prototype/src/noyau`) :
   `cd jeu && bun run generer.ts && sha256sum -c SHA256SUMS`
2. Lancer un PostgreSQL jetable. Les scripts visent le socket `/var/lib/postgresql/azimut-essai`, port `55432`, utilisateur `postgres` sans mot de passe (PostgreSQL 16.15 pendant l'essai). Adapter `commun.ts` et les scripts `.sh` pour une autre adresse.
3. Jouer une option : `cd option-A && ./tout.sh` (même principe pour `option-B`, avec `jouer.sh`, et `option-C`). L'annexe de `../stockage-grille.md` donne les commandes scénario par scénario.
4. Contre-expertise : `avocat/contre-expertise.md` et les requêtes de `avocat/rejeu/`.

Les données générées (`jeu/cours.json`, `jeu/*.ndjson`, `jeu/grilles/`, `jeu/attendu/`) et les journaux (`option-*/sorties/`) ne sont pas versionnés. Aucune donnée réelle de participant n'est utilisée.
