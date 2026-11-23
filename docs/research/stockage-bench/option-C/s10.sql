-- S10 — taille et objets du schéma azimut. psql -h /var/lib/postgresql/azimut-essai -p 55432 -U postgres -d stock_c -f s10.sql
vacuum analyze;
\pset footer off
select c.relname as table, c.reltuples::bigint as lignes,
       pg_relation_size(c.oid) as table_octets, pg_indexes_size(c.oid) as index_octets,
       pg_total_relation_size(c.oid) as total_octets
  from pg_class c where c.relnamespace = 'azimut'::regnamespace and c.relkind = 'r' order by total_octets desc;
select sum(pg_total_relation_size(c.oid)) as total_schema_octets, sum(pg_relation_size(c.oid)) as tables_octets,
       sum(pg_indexes_size(c.oid)) as index_octets, pg_database_size(current_database()) as base_octets
  from pg_class c where c.relnamespace = 'azimut'::regnamespace and c.relkind = 'r';
select (select count(*) from azimut.cases where valeur is not null) as notes_courantes,
       (select count(*) from azimut.historique) as lignes_historique,
       round(pg_total_relation_size('azimut.cases')::numeric / nullif((select count(*) from azimut.cases where valeur is not null), 0), 1) as octets_cases_par_note,
       round(pg_total_relation_size('azimut.historique')::numeric / (select count(*) from azimut.historique), 1) as octets_par_ligne_historique,
       pg_total_relation_size('azimut.grille_versions') as octets_structures;
select relkind, count(*) from pg_class where relnamespace = 'azimut'::regnamespace group by relkind order by relkind;
select 'fonctions' as objet, count(*) from pg_proc where pronamespace = 'azimut'::regnamespace
union all select 'triggers', count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid where c.relnamespace = 'azimut'::regnamespace and not t.tgisinternal
union all select 'contraintes', count(*) from pg_constraint where connamespace = 'azimut'::regnamespace
union all select 'types (hors types de lignes)', count(*) from pg_type t where typnamespace = 'azimut'::regnamespace and typtype <> 'c' and typelem = 0 ;
select contype, count(*) from pg_constraint where connamespace = 'azimut'::regnamespace group by contype order by contype;
