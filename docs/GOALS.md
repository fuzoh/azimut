# Azimut — objectifs

Note d'intention du projet : préparer un setup qui garantit la qualité dès le départ. Les décisions prises depuis sont dans `TODO.md`.

## Features requises

- Temps réel entre les formateurs. Le P2P et les CRDT ont été évalués puis écartés : le serveur fait autorité (voir `TODO.md`).

## Stack technique

- React + TanStack Router
- Elysia + Eden
- Effect TS
- shadcn/ui
- Playwright
- Vitest
- Mutation testing
- Vérification de la complexité cyclomatique
- oxlint, oxfmt
- Bun
- PostgreSQL
- Valkey ou autre pour le temps réel, seulement si un besoin mesuré apparaît
- shadcn lint ([`@shadcn/lint`](https://github.com/shadcn-ui/lint), plugin JS oxlint)
- TanStack DB comme store client
- React Compiler
- Outils d'analyse de code à évaluer : [slop-scan](https://github.com/modem-dev/slop-scan), [slopo](https://github.com/rafal-qa/slopo), [fallow](https://github.com/fallow-rs/fallow)

## Règles de dev

- Pas de doc qui duplique ce que le code exprime déjà. La doc décrit uniquement le domaine et la façon de travailler, pas le code.
- Une pyramide de tests parcimonieuse :
  - tests unitaires uniquement sur les composants algorithmiques principaux et critiques ;
  - tests d'intégration uniquement sur les principales fonctionnalités (avec DB) ;
  - tests end-to-end sur les principaux parcours utilisateurs ;
  - tests de régression visuelle sur les éléments principaux de l'app (pages complexes, parcours principaux) ;
  - tests de régression de performance sur les principales requêtes et fonctions lourdes.
- Pas de tests tautologiques.
- Statistiques de code coverage.
- Contraindre les agents de façon stricte (Effect, TypeScript, règles de lint strictes).
- Viser les navigateurs récents (2 ans maximum).
- Le client fait un maximum de calculs. Le serveur sert principalement au stockage des données et de proxy.
- Mises à jour automatiques des dépendances (Dependabot ou Renovate, à décider).
- release-please.
- Toutes les dépendances sont hissées dans le catalogue principal, pour éviter les écarts de version.
- Tous les tests et gates s'exécutent dans tous les environnements (local comme CI), répartis entre pre-commit, pre-push et CI.
- Pre-commit parallélisé.
- Complexité cyclomatique plafonnée à 12, fonctions à 80 lignes, fichiers à 600 lignes.
- `import/no-cycle` activé.
- Une seule enveloppe d'erreur.
- Env validé.

## Architecture

- Type safety de bout en bout (payloads, données et erreurs) : tout est typé.
- Un helper d'auth qui centralise l'auth et la traite toujours de la même façon, avec les mêmes types.
- tsconfig et lint stricts.
