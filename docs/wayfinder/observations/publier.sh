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
  body=$(sed -e "s/{{01}}/#${n[01]:-}/g" -e "s/{{02}}/#${n[02]:-}/g" "$4")
  n[$1]=$(num "$(gh issue create -R "$repo" --label "wayfinder:$2" --title "$3" \
    --body "Part of #$map"$'\n\n'"$body")")
  gh api --method POST "repos/$repo/issues/$map/sub_issues" \
    -F sub_issue_id="$(dbid "${n[$1]}")" >/dev/null
}
bloque() { # ticket bloqué, bloqueur
  gh api --method POST "repos/$repo/issues/${n[$1]}/dependencies/blocked_by" \
    -F issue_id="$(dbid "${n[$2]}")" >/dev/null
}

ticket 01 grilling "Nature de l'observation et rapport au modèle de 18" 01-grilling-nature-observation.md
ticket 02 grilling "Programme de cours dans Azimut : périmètre" 02-grilling-programme-de-cours.md
ticket 03 research "Saisie d'observations dans Qualix et programme eCamp v3" 03-research-saisie-qualix-ecamp.md
ticket 04 research "Photos des apprenants : sources et contraintes nLPD" 04-research-photos-apprenants.md
ticket 05 grilling "Le « quand » d'une observation et la plage d'exercice" 05-grilling-quand-plage-exercice.md
ticket 06 grilling "Évaluation des UA par les apprenants et les formateurs" 06-grilling-evaluation-ua.md

bloque 05 01
bloque 05 02
bloque 06 02

echo "Carte #$map ; tickets : ${n[01]} ${n[02]} ${n[03]} ${n[04]} ${n[05]} ${n[06]}"
