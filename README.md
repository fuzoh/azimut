# Azimut

Application de gestion des qualifications en cours de formation : les formateurs d'un cours y saisissent ensemble, en temps réel, les évaluations des participants, et l'app calcule les résultats à partir d'une grille de qualification.

Licence : AGPL-3.0.

## État du projet

Le projet est en **phase de définition**. Il n'y a pas encore d'application.

- Le **modèle de qualification** est décidé : [`docs/analyse/18-decisions-definitives.md`](docs/analyse/18-decisions-definitives.md) fait foi.
- Un **prototype jetable** éprouve ce modèle (calcul, couverture des cas, performance) dans [`prototype/`](prototype/). Sa spec est [`docs/analyse/20-spec-prototype.md`](docs/analyse/20-spec-prototype.md).
- Les **constats du prototype** sont en cours de rédaction : [`docs/analyse/21-constats-prototype.md`](docs/analyse/21-constats-prototype.md).
- La **stack de l'application** est choisie mais pas encore montée : [`docs/TODO.md`](docs/TODO.md).

Le travail en cours et les propositions ouvertes sont dans les [issues](https://github.com/fuzoh/azimut/issues).

## Par où commencer

Dans cet ordre :

1. [`docs/FEATURES.md`](docs/FEATURES.md) : le domaine et le comportement attendu.
2. [`GLOSSARY.md`](GLOSSARY.md) : le vocabulaire.
3. [`docs/analyse/18-decisions-definitives.md`](docs/analyse/18-decisions-definitives.md) : le modèle de qualification. [`18-visualisation.html`](docs/analyse/18-visualisation.html) en donne une vue interactive.
4. [`docs/analyse/19-constats-maquette.md`](docs/analyse/19-constats-maquette.md) : les points encore à trancher.
5. [`docs/analyse/README.md`](docs/analyse/README.md) : le statut de chaque document d'analyse.

Pour le versant technique :

- [`docs/GOALS.md`](docs/GOALS.md) : objectifs, stack visée, règles de dev.
- [`docs/TODO.md`](docs/TODO.md) : décisions prises et points à explorer.
- [`docs/PRACTICES.md`](docs/PRACTICES.md) : faits techniques vérifiés.
- [`docs/research/`](docs/research/) : recherches qui fondent les choix du prototype (signaux, stockage local, rattachement suggéré).

## Lancer le prototype

Il faut [Bun](https://bun.sh).

```sh
cd prototype
bun install
bun run dev        # l'app dans le navigateur
bun run test       # tests du noyau et des variantes du store
bun run bench      # micro-benchmarks du noyau
bun run mesure:fumee   # série de mesures courte, pour vérifier le harnais
```

Les rapports de mesure sont dans [`prototype/mesures/`](prototype/mesures/). Le prototype est jetable : il n'applique pas les règles de qualité prévues pour l'application.

## Contribuer

Voir [`CONTRIBUTING.md`](CONTRIBUTING.md).
