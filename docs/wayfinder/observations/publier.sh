#!/usr/bin/env bash
# Publie la carte et ses tickets dans GitHub Issues, puis affiche les numéros.
# À lancer une fois, depuis un clone avec `gh` authentifié en écriture.
set -euo pipefail
cd "$(dirname "$0")"

repo=fuzoh/azimut
num() { basename "$1"; }                       # .../issues/42 -> 42
dbid() { gh api "repos/$repo/issues/$1" --jq .id; }

map=$(num "$(gh issue create -R "$repo" --label wayfinder:map \
  --title "Carte : spec des observations et du suivi en cours de formation" \
  --body-file 00-carte.md)")

declare -A n
ticket() { # clé, type, titre, fichier
  local body
  body=$(cat "$4")
  n[$1]=$(num "$(gh issue create -R "$repo" --label "wayfinder:$2" --title "$3" \
    --body "Part of #$map"$'\n\n'"$body")")
  gh api --method POST "repos/$repo/issues/$map/sub_issues" \
    -F sub_issue_id="$(dbid "${n[$1]}")" >/dev/null
}

clos() { gh issue close -R "$repo" "${n[$1]}" >/dev/null; } # résolution déjà dans le corps

ticket 01 grilling "Nature de l'observation et rapport au modèle de 18" 01-grilling-nature-observation.md
ticket 02 grilling "Programme de cours dans Azimut : périmètre" 02-grilling-programme-de-cours.md
ticket 03 research "Saisie d'observations dans Qualix" 03-research-saisie-qualix.md
ticket 04 research "Photos des apprenants et pièces jointes : sources et contraintes nLPD" 04-research-photos-apprenants.md
ticket 05 grilling "Le « quand » d'une observation et la suggestion d'exercice" 05-grilling-quand-exercice.md
ticket 07 grilling "Saisie rapide des observations" 07-grilling-saisie-rapide.md
ticket 08 grilling "Suivi de l'effort d'observation et missions" 08-grilling-suivi-effort-observation.md
ticket 09 grilling "De l'observation à la note et au retour" 09-grilling-observation-vers-note.md

clos 01
clos 02
clos 03
clos 05

echo "Carte #$map ; tickets : ${n[01]} ${n[02]} ${n[03]} ${n[04]} ${n[05]} ${n[07]} ${n[08]} ${n[09]}"
