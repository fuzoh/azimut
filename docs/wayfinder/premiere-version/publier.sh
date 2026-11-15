#!/usr/bin/env bash
# Publie la carte « première version » et ses tickets dans GitHub Issues.
# À lancer une fois, depuis un clone avec `gh` authentifié en écriture.
set -euo pipefail
cd "$(dirname "$0")"

repo=fuzoh/azimut
num() { basename "$1"; }
dbid() { gh api "repos/$repo/issues/$1" --jq .id; }

map=$(num "$(gh issue create -R "$repo" --label wayfinder:map \
  --title "Carte : périmètre de la première version de démonstration" --body-file 00-carte.md)")

declare -A n
ticket() { # clé, type, titre, fichier, bloqueurs...
  local k=$1 type=$2 titre=$3 f=$4 body; shift 4
  body=$(sed -e "s/{{01}}/#${n[01]:-}/g" -e "s/{{03}}/#${n[03]:-}/g" "$f")
  n[$k]=$(num "$(gh issue create -R "$repo" --label "wayfinder:$type" --title "$titre" \
    --body "Part of #$map"$'\n\n'"$body")")
  gh api --method POST "repos/$repo/issues/$map/sub_issues" -F sub_issue_id="$(dbid "${n[$k]}")" >/dev/null
  for b in "$@"; do
    gh api --method POST "repos/$repo/issues/${n[$k]}/dependencies/blocked_by" -F issue_id="$(dbid "${n[$b]}")" >/dev/null
  done
}

ticket 01 grilling "Scénario de la démonstration" 01-grilling-scenario-demonstration.md
ticket 02 grilling "Niveau d'exigence : fondation ou démonstration jetable" 02-grilling-niveau-exigence.md
ticket 03 research "Acquis du prototype du modèle de calcul" 03-research-acquis-prototype.md
ticket 04 grilling "Éditeur de grille minimal" 04-grilling-editeur-de-grille.md 01 03
ticket 05 grilling "Saisie à deux en temps réel : périmètre minimal" 05-grilling-saisie-temps-reel.md 01
ticket 06 grilling "Socle minimal : comptes et cours de démonstration" 06-grilling-socle-minimal.md
ticket 07 grilling "Résultat d'un apprenant et son explication" 07-grilling-resultat-et-explication.md 01 03
ticket 08 task "Propositions pour les décisions techniques ouvertes" 08-task-decisions-techniques-ouvertes.md

echo "Carte #$map ; tickets : ${n[01]} ${n[02]} ${n[03]} ${n[04]} ${n[05]} ${n[06]} ${n[07]} ${n[08]}"

clos() { gh issue close -R "$repo" "${n[$1]}" >/dev/null; } # résolution déjà dans le corps
clos 01
clos 03
clos 02
