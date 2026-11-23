#!/bin/sh
# S3 : deux processus pgbench simultanés, un par case (ou la même case avec MEME=1). sh s3.sh
D=$(dirname "$0"); P="psql -h /var/lib/postgresql/azimut-essai -p 55432 -U postgres -d stock_a"
B="pgbench -h /var/lib/postgresql/azimut-essai -p 55432 -U postgres -n -c 1 -j 1 -t 500"
V=$($P -Atc "select vg.id from versions_grille vg join grilles g on g.id=vg.grille_id where g.nom='G3 V2'")
VIC=019e807a-ec7f-7798-9e58-3c88f712626f
ARNICA=019e807a-ec00-74b5-a42c-cbd6b3189014; BALOU=019e807a-ec01-74ad-9ed7-ecf7f7db66fb
S1=$D/s3-gestion.sql; S2=$D/s3-consignes-e2.sql; [ "$MEME" = 1 ] && S2=$D/s3-gestion.sql
echo "--- avant"; $P -v v=$V -v vic=$VIC -f $D/s3-controle.sql
H0=$($P -Atc "select count(*) from azimut.historique")
T0=$(date +%s.%N)
$B -D v=$V -D auteur=$ARNICA -f $S1 stock_a > ${TMPDIR:-/tmp}/s3-c1.out 2>&1 &
$B -D v=$V -D auteur=$BALOU -f $S2 stock_a > ${TMPDIR:-/tmp}/s3-c2.out 2>&1 &
wait
T1=$(date +%s.%N)
for f in c1 c2; do echo "--- connexion $f"; grep -E "processed|failed|tps|latency average|error" ${TMPDIR:-/tmp}/s3-$f.out; done
echo "--- après"; $P -v v=$V -v vic=$VIC -f $D/s3-controle.sql
H1=$($P -Atc "select count(*) from azimut.historique")
echo "lignes d'historique ajoutées : $((H1 - H0))"
python3 -c "d=$T1-$T0; print(f'durée totale : {d:.3f} s ; transactions/s : {1000/d:.0f}')"
$P -Atc "select 'interblocages (pg_stat_database) : ' || deadlocks || ', conflits : ' || conflicts from pg_stat_database where datname = 'stock_a'"
