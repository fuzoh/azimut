# Contribuer à Azimut

Le projet est en phase de définition. Les contributions les plus utiles aujourd'hui sont des idées, des besoins de terrain et des retours sur le modèle, pas du code.

## Proposer une idée ou un besoin

Ouvrir une [issue](https://github.com/fuzoh/azimut/issues/new), une par sujet.

- Décrire le **besoin** et le **comportement attendu**, du point de vue de la personne qui utilise l'app. La réalisation technique vient plus tard.
- Donner un exemple concret tiré d'un cours : quel exercice, quel moment, qui fait quoi.
- Reprendre le vocabulaire de [`GLOSSARY.md`](GLOSSARY.md) et de [`docs/FEATURES.md`](docs/FEATURES.md). S'il manque un terme, le proposer dans l'issue.
- Un texte long peut être écrit directement dans le corps de l'issue : il y est lisible et commentable, ce qu'une pièce jointe ne permet pas.

Une idée encore floue est bienvenue telle quelle. Elle sera précisée dans la discussion.

## Quand une proposition contredit une décision

[`docs/analyse/18-decisions-definitives.md`](docs/analyse/18-decisions-definitives.md) fixe le modèle de qualification et fait foi. Une proposition peut le remettre en cause, à condition de le dire :

- citer la section concernée (par exemple « 18 §5 ») ;
- décrire l'écart : ce que 18 décide, ce que la proposition change, et pourquoi ;
- laisser 18 tel quel. Il n'est modifié qu'une fois l'écart discuté et accepté dans l'issue.

Les documents `03`, `05`, `06` et `09` de [`docs/analyse/`](docs/analyse/README.md) sont des analyses antérieures : leurs propositions ne sont pas des décisions.

## Ce que devient une issue

| Label | Sens |
| --- | --- |
| `needs-triage` | à évaluer par le mainteneur |
| `needs-info` | en attente de précisions de l'auteur |
| `ready-for-agent` | spécifiée, réalisable par un agent |
| `ready-for-human` | demande une réalisation humaine |
| `wontfix` | ne sera pas traitée |

Une proposition acceptée est reportée dans `docs/FEATURES.md`, et dans 18 si elle touche le modèle.

## Modifier les docs ou le code

- La branche `main` est protégée : toute modification passe par une pull request, relue avant fusion.
- Messages de commit en anglais, au format [Conventional Commits](https://www.conventionalcommits.org) : `docs(analyse): …`, `feat(prototype): …`.
- Les docs sont en français. Elles décrivent le domaine et la façon de travailler, pas le code.
- Le prototype est dans `prototype/` ; son lancement est décrit dans le [`README.md`](README.md).

Les consignes destinées aux agents de code sont dans [`AGENTS.md`](AGENTS.md).
