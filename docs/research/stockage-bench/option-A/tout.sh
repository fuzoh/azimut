#!/bin/sh
# Rejoue tout le protocole sur une base neuve, dans l'ordre : S0, S10, S1, S9, S8, S2, S3, S10, S4, S6, S5, S7, S10.
set -e
D=$(cd "$(dirname "$0")" && pwd); cd "$D"; O=sorties; mkdir -p $O
P="psql -h /var/lib/postgresql/azimut-essai -p 55432 -U postgres -d stock_a"
./reinit.sh
bun run charger.ts | tee $O/s0.log
bun run exporter.ts "G3 V2" $O/etat-s0-v2.json; bun run exporter.ts "G3 V1" $O/etat-s0-v1.json
bun run ../jeu/verifier.ts ../jeu/attendu/etat-g3-v2.json $O/etat-s0-v2.json --ecritures | tee -a $O/s0.log
bun run ../jeu/verifier.ts ../jeu/attendu/etat-g3-v1.json $O/etat-s0-v1.json --ecritures | tee -a $O/s0.log
$P -f s10.sql > $O/s10-apres-s0.log 2>&1
bun run s1.ts | tee $O/s1.log; JIT=off bun run s1.ts | tee $O/s1-jit-off.log
bun run s9.ts | tee $O/s9.log; JIT=off bun run s9.ts | tee $O/s9-jit-off.log
bun run s8.ts | tee $O/s8.log
for v in v1 v2; do bun run ../jeu/verifier.ts ../jeu/attendu/etat-g3-$v.json $O/etat-rejeu-$v.json --ecritures | tee -a $O/s8.log; done
$P -q -c "drop schema rejeu cascade"
bun run s2.ts | tee $O/s2.log
sh s3.sh 2>&1 | tee $O/s3.log
MEME=1 sh s3.sh 2>&1 | tee $O/s3-meme-case.log
$P -f s10.sql > $O/s10-apres-s3.log 2>&1
bun run s4.ts | tee $O/s4.log
bun run s6.ts | tee $O/s6.log
bun run s5.ts | tee $O/s5.log
bun run s7.ts | tee $O/s7.log
$P -f s10.sql > $O/s10-apres-s5.log 2>&1
