#!/bin/bash
# Recharge une base propre : schéma + chargement en masse.
cd "$(dirname "$0")"
psql -h /var/lib/postgresql/azimut-essai -p 55432 -U postgres -d ${BASE:-stock_b} -v ON_ERROR_STOP=1 -q -f schema.sql 2>&1 | grep -v -e NOTICE -e DETAIL -e 'drop cascades'
bun run charger.ts
