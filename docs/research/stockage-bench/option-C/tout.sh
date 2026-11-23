#!/bin/bash
# Enchaîne S0 puis S10, S1, S9, S8, S2, S3, S10, S4, S6, S5 (+S7), S10. bash tout.sh  → sorties/journal.txt
set -e
cd "$(dirname "$0")"
mkdir -p sorties
P="-h /var/lib/postgresql/azimut-essai -p 55432 -U postgres -d stock_c"
J=../jeu
{
echo "### $(date -u +%FT%TZ) — nproc=$(nproc) — $(psql $P -Atc 'select version()' 2>/dev/null || true) — bun $(bun --version)"
echo "### S0 : bun run charger.ts"; TIMEFORMAT="S0 durée totale (création base + schéma + chargement + export) : %R s"; time bun run charger.ts
for v in 1 2; do echo "### S0 contrôle V$v : bun run $J/verifier.ts $J/attendu/etat-g3-v$v.json sorties/etat-g3-v$v.json --ecritures"; bun run $J/verifier.ts $J/attendu/etat-g3-v$v.json sorties/etat-g3-v$v.json --ecritures; done
echo "### S10 après S0 : psql -f s10.sql"; psql $P -f s10.sql
echo "### S1 : bun run s1.ts"; bun run s1.ts
echo "### S9 : bun run s9.ts"; bun run s9.ts
echo "### S8 : bun run s8.ts"; bun run s8.ts
for v in 1 2; do echo "### S8 contrôle V$v : bun run $J/verifier.ts $J/attendu/etat-g3-v$v.json sorties/rejeu-g3-v$v.json --ecritures"; bun run $J/verifier.ts $J/attendu/etat-g3-v$v.json sorties/rejeu-g3-v$v.json --ecritures; done
echo "### S2 : bun run s2.ts"; bun run s2.ts
echo "### S3 : bash s3.sh"; TIMEFORMAT="S3 durée (deux pgbench + contrôles) : %R s"; time bash s3.sh
psql $P -Atc "select 'S3 deadlocks='||deadlocks||' rollbacks='||xact_rollback from pg_stat_database where datname='stock_c'"
echo "### S10 après S3 : psql -f s10.sql"; psql $P -f s10.sql
echo "### S4 : bun run s4.ts"; bun run s4.ts
echo "### S6 : bun run s6.ts"; bun run s6.ts
echo "### S5 + S7 : bun run s5.ts"; bun run s5.ts
echo "### S10 après S5 : psql -f s10.sql"; psql $P -f s10.sql
echo "### Information : après vacuum full (les 5 copies purgées de S5 laissent des pages mortes)"
psql $P -qc "vacuum full analyze" && psql $P -Atc "select 'apres vacuum full : schema='||sum(pg_total_relation_size(oid))||' octets ; cases='||pg_total_relation_size('azimut.cases')||' ; historique='||pg_total_relation_size('azimut.historique') from pg_class where relnamespace='azimut'::regnamespace and relkind='r'"
} 2>&1 | tee sorties/journal.txt
