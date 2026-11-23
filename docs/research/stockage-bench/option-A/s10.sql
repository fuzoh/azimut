-- S10 : tailles et objets. psql -d stock_a -f s10.sql
vacuum analyze;
\pset footer off
select c.relname as table, c.reltuples::bigint as lignes_estimees,
       (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from azimut.%I', c.relname), false, true, '')))[1]::text::int as lignes,
       pg_relation_size(c.oid) as table_octets, pg_indexes_size(c.oid) as index_octets, pg_total_relation_size(c.oid) as total_octets
from pg_class c where c.relnamespace = 'azimut'::regnamespace and c.relkind = 'r' order by total_octets desc;
select sum(pg_relation_size(c.oid)) table_octets, sum(pg_indexes_size(c.oid)) index_octets, sum(pg_total_relation_size(c.oid)) total_octets,
       pg_database_size(current_database()) base_octets
from pg_class c where c.relnamespace = 'azimut'::regnamespace and c.relkind = 'r';
select (select pg_total_relation_size('azimut.cases'))::numeric / nullif((select count(*) from azimut.cases where valeur is not null), 0) as octets_par_note_courante_cases,
       (select pg_total_relation_size('azimut.historique'))::numeric / (select count(*) from azimut.historique) as octets_par_ligne_historique,
       (select sum(pg_total_relation_size(c.oid)) from pg_class c where c.relnamespace = 'azimut'::regnamespace and c.relkind = 'r'
          and c.relname in ('cases','commentaires','non_evaluations','jokers_poses','finalisations','historique'))::numeric
        / (select count(*) from azimut.cases where valeur is not null) as octets_saisies_par_note_courante,
       (select sum(pg_total_relation_size(c.oid)) from pg_class c where c.relnamespace = 'azimut'::regnamespace and c.relkind = 'r'
          and c.relname in ('grilles','versions_grille','baremes','paliers','colorations','noeuds','conversions','entrees','axes','placements','jokers_autorises','exigences_minimum'))
        / (select count(*) from azimut.versions_grille) as octets_structure_par_version;
select relkind, count(*) from pg_class where relnamespace = 'azimut'::regnamespace group by 1 order by 1;
select (select count(*) from pg_proc where pronamespace = 'azimut'::regnamespace) fonctions,
       (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid where c.relnamespace = 'azimut'::regnamespace and not t.tgisinternal) triggers,
       (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid where c.relnamespace = 'azimut'::regnamespace and t.tgisinternal) triggers_internes_fk,
       (select count(*) from pg_constraint where connamespace = 'azimut'::regnamespace) contraintes,
       (select string_agg(contype::text || '=' || n, ' ') from (select contype, count(*) n from pg_constraint where connamespace = 'azimut'::regnamespace group by 1 order by 1) x) par_type,
       (select count(*) from pg_type where typnamespace = 'azimut'::regnamespace and typtype = 'e') types_enum,
       (select count(*) from pg_type where typnamespace = 'azimut'::regnamespace) types_tous;
