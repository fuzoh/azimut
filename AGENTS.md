# Azimut application - gestion des qualifications en cours de formation

## Docs

- `docs/GOALS.md` : objectifs initiaux, stack visée, règles de dev.
- `docs/FEATURES.md` : domaine et comportement attendu (pas le code).
- `docs/PRACTICES.md` : faits techniques vérifiés (stack, harness, outillage, auth).
- `docs/SKILLS.md` : sélection des skills d'agent et workflow de définition des tâches (proposition).
- `docs/TODO.md` : décisions prises et points à explorer.
- `docs/analyse/18-decisions-definitives.md` : décisions définitives du modèle de qualification. Fait foi sur toute autre analyse.
- `docs/analyse/` : analyses antérieures conservées pour les sujets hors modèle (zones d'ombre, acteurs et droits, Qualix, corpus de qualifications). Commencer par `README.md`. Propositions, pas décisions.

## Agent skills

### Issue tracker

Issues live in GitHub Issues (`fuzoh/azimut`), managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
