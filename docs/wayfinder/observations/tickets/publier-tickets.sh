#!/usr/bin/env bash
# Publie l'issue parente de la spec des observations et ses neuf tickets de construction.
# À lancer une fois, depuis un clone avec `gh` authentifié en écriture.
set -euo pipefail
cd "$(dirname "$0")"

repo=fuzoh/azimut
num() { basename "$1"; }
dbid() { gh api "repos/$repo/issues/$1" --jq .id; }

parent=$(num "$(gh issue create -R "$repo" --label documentation \
  --title "Spec : observations et suivi en cours de formation" --body-file 00-spec-parente.md)")

declare -A n
ticket() { # clé, titre, fichier, bloqueurs...
  local k=$1 titre=$2 f=$3; shift 3
  n[$k]=$(num "$(gh issue create -R "$repo" --label needs-triage --title "$titre" \
    --body "## Parent"$'\n\n'"#$parent"$'\n\n'"$(cat "$f")")")
  gh api --method POST "repos/$repo/issues/$parent/sub_issues" -F sub_issue_id="$(dbid "${n[$k]}")" >/dev/null
  for b in "$@"; do
    gh api --method POST "repos/$repo/issues/${n[$k]}/dependencies/blocked_by" -F issue_id="$(dbid "${n[$b]}")" >/dev/null
  done
}

ticket 1 "Tracer : saisir une observation générale et la relire" 01-tracer-observation-generale.md
ticket 2 "Moment, modification et historique d'une observation" 02-moment-modification-historique.md 1
ticket 3 "Rattachement facultatif d'une observation à la grille" 03-rattachement-facultatif.md 1
ticket 4 "Saisie d'une observation pour plusieurs personnes" 04-saisie-plusieurs-personnes.md 1
ticket 5 "Recherche tolérante sur la page d'accès rapide" 05-recherche-tolerante.md 1 3
ticket 6 "Brouillon d'observation gardé sans réseau" 06-brouillon-sans-reseau.md 1
ticket 7 "Panneau d'observations à côté de la case et copie dans le commentaire" 07-panneau-case-copie-commentaire.md 3
ticket 8 "Tableau de suivi des observations par apprenant" 08-tableau-de-suivi.md 1
ticket 9 "Observations : copie de grille et anonymisation" 09-copie-de-grille-anonymisation.md 2 3

echo "Spec #$parent ; tickets : ${n[1]} ${n[2]} ${n[3]} ${n[4]} ${n[5]} ${n[6]} ${n[7]} ${n[8]} ${n[9]}"
