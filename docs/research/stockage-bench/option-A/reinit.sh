#!/bin/sh
# Recrée la base stock_a vide avec le schéma.
P="psql -h /var/lib/postgresql/azimut-essai -p 55432 -U postgres"
$P -q -c 'drop database if exists stock_a' -c 'create database stock_a' &&
$P -q -d stock_a -c "alter database stock_a set search_path = azimut, public" &&
$P -q -d stock_a -v ON_ERROR_STOP=1 -f "$(dirname "$0")/schema.sql" 2>&1 | grep -v NOTICE; true
