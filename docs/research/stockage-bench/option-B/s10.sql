-- S10 : tailles et objets. psql ... -d stock_b -f s10.sql
vacuum analyze;
\pset footer off
select c.relname as table, (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from b.%I', c.relname), false, true, '')))[1]::text::bigint as lignes,
       pg_total_relation_size(c.oid) as total, pg_relation_size(c.oid) as heap,
       pg_total_relation_size(c.reltoastrelid) as toast, pg_indexes_size(c.oid) as index
  from pg_class c where c.relnamespace = 'b'::regnamespace and c.relkind = 'r' order by 1;
select sum(pg_total_relation_size(c.oid)) as total_schema from pg_class c where c.relnamespace = 'b'::regnamespace and c.relkind = 'r';
select pg_database_size(current_database()) as base;
select (select count(*) from pg_class where relnamespace = 'b'::regnamespace and relkind = 'r') tables,
       (select count(*) from pg_class where relnamespace = 'b'::regnamespace and relkind = 'i') index,
       (select count(*) from pg_class where relnamespace = 'b'::regnamespace and relkind = 'S') sequences,
       (select count(*) from pg_class where relnamespace = 'b'::regnamespace and relkind = 'v') vues,
       (select count(*) from pg_proc where pronamespace = 'b'::regnamespace) fonctions,
       (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid where c.relnamespace = 'b'::regnamespace and not t.tgisinternal) triggers,
       (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid where c.relnamespace = 'b'::regnamespace and t.tgisinternal) triggers_internes_fk,
       (select count(*) from pg_type where typnamespace = 'b'::regnamespace) types_dont_lignes_tables,
       (select count(*) from pg_constraint where connamespace = 'b'::regnamespace) contraintes;
select count(*) filter (where e->>'v' is not null and e->'v' <> 'null') notes_courantes
  from b.dossier d, jsonb_each(d.doc->'notes') t(k, e);
select g.nom, count(*) dossiers, round(avg(pg_column_size(d.doc))) doc_octets_stockes, max(pg_column_size(d.doc)) doc_max_stockes,
       round(avg(octet_length(d.doc::text))) doc_octets_texte, max(octet_length(d.doc::text)) doc_max_texte
  from b.dossier d join b.grille g on g.id = d.grille_id group by g.nom order by 1;
select pg_column_size(doc) structure_stockee, octet_length(doc::text) structure_texte from b.structure;
