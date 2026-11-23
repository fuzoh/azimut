#!/bin/bash
# Joue tout le protocole sur une base stock_b propre, dans l'ordre : S0, S10, S1, S9, S8, S2, S3 (+variantes), S10, S4, S6, S5, S7, S10, S8 final.
# ./jouer.sh  -> sorties/*.json|txt et sorties/journal.txt
set -e
cd "$(dirname "$0")"
PSQL="psql -h /var/lib/postgresql/azimut-essai -p 55432 -U postgres -d stock_b"
J=../jeu
log() { echo "== $(date -u +%FT%TZ) $*" | tee -a sorties/journal.txt; }
: > sorties/journal.txt
log "S0 chargement x5 (le dernier reste)"; for i in 1 2 3 4 5; do ./recharger.sh; done | tee sorties/s0-chargement.txt | tee -a sorties/journal.txt
bun run exporter.ts "G3 V2" sorties/s0-etat-v2.json; bun run exporter.ts "G3 V1" sorties/s0-etat-v1.json
log "S0 verifier V2"; bun run $J/verifier.ts $J/attendu/etat-g3-v2.json sorties/s0-etat-v2.json --ecritures | tee -a sorties/journal.txt
log "S0 verifier V1"; bun run $J/verifier.ts $J/attendu/etat-g3-v1.json sorties/s0-etat-v1.json --ecritures | tee -a sorties/journal.txt
log "S10 apres S0"; $PSQL -f s10.sql > sorties/s10-apres-s0.txt
log "S1"; bun run s1.ts > sorties/s1.json
log "S9 (jit off)"; bun run s9.ts > sorties/s9.json
log "S9 (jit on)"; JIT=on bun run s9.ts > sorties/s9-jit-on.json
log "S8"; bun run s8.ts > sorties/s8.json
bun run exporter.ts "G3 V2" sorties/s8-rejoue-v2.json --rejoue; bun run exporter.ts "G3 V1" sorties/s8-rejoue-v1.json --rejoue
log "S8 verifier V2"; bun run $J/verifier.ts $J/attendu/etat-g3-v2.json sorties/s8-rejoue-v2.json --ecritures | tee -a sorties/journal.txt
log "S8 verifier V1"; bun run $J/verifier.ts $J/attendu/etat-g3-v1.json sorties/s8-rejoue-v1.json --ecritures | tee -a sorties/journal.txt
log "S2"; bun run s2.ts > sorties/s2.json
log "S3 deux cases"; bun run s3.ts cases > sorties/s3-cases.json
log "S10 apres S3"; $PSQL -f s10.sql > sorties/s10-apres-s3.txt
log "S3 variante meme case"; bun run s3.ts meme-case > sorties/s3-meme-case.json
log "S3 temoin deux participants"; bun run s3.ts deux-participants > sorties/s3-deux-participants.json
log "S4"; bun run s4.ts > sorties/s4.json
log "S6"; bun run s6.ts > sorties/s6.json
log "S5"; bun run s5.ts > sorties/s5.json
log "S5 verifier copie"; bun run $J/verifier.ts sorties/s5-copie-attendu.json sorties/s5-copie-etat.json | tee -a sorties/journal.txt
log "S7"; bun run s7.ts > sorties/s7.json
log "S10 apres S5"; $PSQL -f s10.sql > sorties/s10-apres-s5.txt
log "S8 final, toutes grilles"; bun run s8.ts > sorties/s8-final-toutes-grilles.json
log "fin"
