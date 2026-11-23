#!/bin/bash
# S3 — deux connexions, deux cases du même participant (puis variante : même case). bash s3.sh
set -e
cd "$(dirname "$0")"
P="-h /var/lib/postgresql/azimut-essai -p 55432 -U postgres"
Q="psql $P -d stock_c -At"
G=019e807a-ec1f-791c-96fa-7ee2192c21ca; V=019e807a-ec7f-7798-9e58-3c88f712626f
v0() { $Q -c "select version from azimut.cases where grille_id='$G' and participant_id='$V' and noeud='$1'"; }
echo "== deux cases (client 0 : gestion, client 1 : consignes-e2)"
V0G=$(v0 gestion); V0C=$(v0 consignes-e2); H0=$($Q -c "select count(*) from azimut.historique")
echo "v0 gestion=$V0G consignes-e2=$V0C historique=$H0"
T0=$(date +%s.%N); pgbench $P -d stock_c -n -c 2 -j 2 -t 500 -f s3-ecrire.sql 2>&1 | grep -E "transactions actually|failed|latency average|tps|duration|number of"; echo "durée pgbench (horloge murale, connexions comprises) : $(echo "$(date +%s.%N) - $T0" | bc) s"
psql $P -d stock_c -v v0g=$V0G -v v0c=$V0C -v h0=$H0 -f s3-controle.sql
echo "== variante : même case (gestion) sur les deux connexions"
V0G=$(v0 gestion); V0C=$(v0 consignes-e2); H0=$($Q -c "select count(*) from azimut.historique")
echo "v0 gestion=$V0G historique=$H0"
T0=$(date +%s.%N); pgbench $P -d stock_c -n -c 2 -j 2 -t 500 -f s3-meme-case.sql 2>&1 | grep -E "transactions actually|failed|latency average|tps|duration|number of"; echo "durée pgbench (horloge murale, connexions comprises) : $(echo "$(date +%s.%N) - $T0" | bc) s"
psql $P -d stock_c -v v0g=$V0G -v v0c=$V0C -v h0=$H0 -f s3-controle.sql
