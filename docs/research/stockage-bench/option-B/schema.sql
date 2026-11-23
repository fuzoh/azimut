-- Option B : tout en documents.
-- Une structure de grille = un document jsonb immuable (format.ts, tel quel).
-- Les saisies d'un participant dans une grille = un document jsonb (« dossier »).
-- L'historique = une table append-only, écrite dans la même transaction que le dossier.
-- psql -h /var/lib/postgresql/azimut-essai -p 55432 -U postgres -d stock_b -v ON_ERROR_STOP=1 -f schema.sql

drop schema if exists b cascade;
create schema b;
-- Réglage de déploiement assumé par ce schéma : les requêtes récursives sur jsonb ont des estimations de lignes
-- très fausses (100 par jsonb_array_elements) qui déclenchent le JIT (≈130 ms par requête mesurés, cf. S9).
do $$ begin execute format('alter database %I set jit = off', current_database()); end $$;

-- UUIDv7 côté serveur (PostgreSQL 16 n'a pas uuidv7()).
create function b.uuidv7() returns uuid language sql volatile as $$
  select encode(set_bit(set_bit(overlay(uuid_send(gen_random_uuid())
           placing substring(int8send((extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
           from 1 for 6), 52, 1), 53, 1), 'hex')::uuid
$$;

-- Le cours et ses données maîtres (formateurs, groupes, participants) : un document.
create table b.cours (
  id  uuid primary key,
  doc jsonb not null
);

-- Une version de structure : le document format.ts, immuable une fois inséré.
-- Colonnes générées : empreinte et listes d'ids, pour valider une écriture sans relire tout le document.
create table b.structure (
  id        uuid primary key,
  doc       jsonb not null,
  empreinte text not null generated always as (md5(doc::text)) stored,
  ids       jsonb not null generated always as (jsonb_path_query_array(doc, '$.noeuds[*].id')) stored,
  cases     jsonb not null generated always as (jsonb_path_query_array(doc, '$.noeuds[*] ? (@.type == "donnees" && exists(@.bareme)).id')) stored
);

-- Une grille du cours : pointe vers sa structure (fixe) ; libellés corrigés en surcouche.
create table b.grille (
  id               uuid primary key,
  cours_id         uuid not null references b.cours,
  nom              text not null,
  structure_id     uuid not null references b.structure,
  principale       boolean not null default false,
  ouverture_saisie timestamptz,
  libelles         jsonb not null default '{}',   -- { idNoeud: libellé corrigé }
  unique (cours_id, nom)
);

-- Le dossier : toutes les saisies d'un participant dans une grille.
-- doc = { notes: {noeud: {v, ver}}, commentaires: {noeud: {t, ver}},
--         nonEvaluations: {"noeud|axe": {noeud, axe, active, ver}},
--         jokers: [{noeud, jokerDef, justification, auteur, horodatage, writeId, ver}],
--         finalisation: null | {auteur, horodatage, erreursAcceptees, structure, empreinte, writeId, ver} }
-- Les effacements restent en pierre tombale (v / t null, active false) pour garder la version de la clé.
create table b.dossier (
  grille_id      uuid not null references b.grille,
  participant_id uuid not null,               -- pas de FK : les participants sont dans le document du cours
  doc            jsonb not null default '{"notes":{},"commentaires":{},"nonEvaluations":{},"jokers":[],"finalisation":null}',
  version        bigint not null default 0,   -- nombre d'écritures du dossier, attribué par le serveur
  primary key (grille_id, participant_id)
);

-- Historique append-only : une ligne par écriture.
create table b.historique (
  write_id       uuid primary key,
  grille_id      uuid not null,
  participant_id uuid not null,
  nature         text not null check (nature in ('note','commentaire','nonEvaluation','joker','finalisation','reouverture')),
  cle            text not null,               -- noeud ; « noeud|axe » pour une non-évaluation ; jokerDef ; '' pour la finalisation
  version        int  not null,               -- version de la clé après l'écriture
  auteur         uuid not null,
  horodatage     timestamptz not null,
  charge         jsonb not null,              -- valeur / texte / active+axe / jokerDef+justification / erreursAcceptees (+ provenance d'une copie)
  foreign key (grille_id, participant_id) references b.dossier,
  unique (grille_id, participant_id, nature, cle, version)
);

create function b.interdit() returns trigger language plpgsql as $$
begin
  raise exception '% interdit sur %', tg_op, tg_table_name using errcode = 'AZ403';
end $$;
create trigger historique_append_only before update or delete on b.historique for each row execute function b.interdit();
create trigger historique_sans_truncate before truncate on b.historique for each statement execute function b.interdit();
create trigger structure_immuable before update or delete on b.structure for each row execute function b.interdit();

-- Correspondance et rapport d'une copie de grille : un document par copie.
create table b.copie (
  id             uuid primary key,
  source_id      uuid not null references b.grille,
  cible_id       uuid not null references b.grille,
  auteur         uuid not null,
  horodatage     timestamptz not null,
  correspondance jsonb not null,  -- { noeuds: {idSource: idCible|null}, axes: {...}, jokers: {...}, ajoutes: [idCible] }
  rapport        jsonb not null   -- [ {type, participant, noeud, valeur|texte|...} ]
);

-- Écriture unique (note, commentaire, non-évaluation, joker, finalisation, réouverture).
-- Verrou de ligne sur le dossier (select ... for update) : les écritures d'un même participant sont sérialisées,
-- jsonb_set est calculé sur le document verrouillé, la version de la clé est attribuée ici.
-- writeId déjà vu : même contenu -> rend la version d'origine (statut 'rejouee') ; autre contenu -> erreur AZ409.
-- p_horodatage n'est fourni que par le chargement (horodatage d'origine) ; sinon now().
create function b.ecrire(p_grille uuid, p_participant uuid, p_nature text, p_cle text, p_charge jsonb,
                         p_write_id uuid, p_auteur uuid, p_horodatage timestamptz default null)
returns table (version int, version_dossier bigint, statut text) language plpgsql as $$
declare
  v_doc jsonb; v_vd bigint; v_h b.historique; v_s b.structure; v_ver int; v_ts timestamptz := coalesce(p_horodatage, now());
  v_noeud text; v_axe text;
begin
  select d.doc, d.version into v_doc, v_vd from b.dossier d
   where d.grille_id = p_grille and d.participant_id = p_participant for update;
  if not found then raise exception 'dossier inconnu' using errcode = 'AZ404'; end if;

  select * into v_h from b.historique h where h.write_id = p_write_id;
  if found then
    if v_h.grille_id = p_grille and v_h.participant_id = p_participant and v_h.nature = p_nature
       and v_h.cle = p_cle and v_h.charge = p_charge then
      return query select v_h.version, v_vd, 'rejouee'::text; return;
    end if;
    raise exception 'writeId % déjà utilisé avec un autre contenu', p_write_id using errcode = 'AZ409';
  end if;

  if v_doc->'finalisation' <> 'null' and p_nature <> 'reouverture' then
    raise exception 'dossier finalisé' using errcode = 'AZ423';
  end if;

  select s.* into v_s from b.grille g join b.structure s on s.id = g.structure_id where g.id = p_grille;

  if p_nature = 'note' then
    if not v_s.cases ? p_cle then raise exception 'case inconnue %', p_cle using errcode = 'AZ422'; end if;
    v_ver := coalesce((v_doc->'notes'->p_cle->>'ver')::int, 0) + 1;
    v_doc := jsonb_set(v_doc, array['notes', p_cle], jsonb_build_object('v', p_charge->'valeur', 'ver', v_ver));
  elsif p_nature = 'commentaire' then
    if not v_s.ids ? p_cle then raise exception 'noeud inconnu %', p_cle using errcode = 'AZ422'; end if;
    v_ver := coalesce((v_doc->'commentaires'->p_cle->>'ver')::int, 0) + 1;
    v_doc := jsonb_set(v_doc, array['commentaires', p_cle], jsonb_build_object('t', p_charge->'texte', 'ver', v_ver));
  elsif p_nature = 'nonEvaluation' then
    v_noeud := p_charge->>'noeud'; v_axe := p_charge->>'axe';
    if not v_s.ids ? v_noeud or p_cle <> v_noeud || '|' || coalesce(v_axe, '') then
      raise exception 'non-évaluation invalide %', p_cle using errcode = 'AZ422'; end if;
    v_ver := coalesce((v_doc->'nonEvaluations'->p_cle->>'ver')::int, 0) + 1;
    v_doc := jsonb_set(v_doc, array['nonEvaluations', p_cle],
               jsonb_build_object('noeud', v_noeud, 'axe', p_charge->'axe', 'active', p_charge->'active', 'ver', v_ver));
  elsif p_nature = 'joker' then
    if not jsonb_path_exists(v_s.doc, '$.jokers.autorises[*] ? (@.id == $j && @.noeud == $n)',
                             jsonb_build_object('j', p_cle, 'n', p_charge->>'noeud')) then
      raise exception 'joker non autorisé %', p_cle using errcode = 'AZ422'; end if;
    v_ver := (select count(*) from jsonb_array_elements(v_doc->'jokers') j where j->>'jokerDef' = p_cle)::int + 1;
    v_doc := jsonb_set(v_doc, '{jokers}', (v_doc->'jokers') || jsonb_build_array(jsonb_build_object(
               'noeud', p_charge->'noeud', 'jokerDef', p_cle, 'justification', p_charge->'justification',
               'auteur', p_auteur, 'horodatage', to_jsonb(v_ts), 'writeId', p_write_id, 'ver', v_ver)));
  elsif p_nature in ('finalisation', 'reouverture') then
    v_ver := coalesce((v_doc->'finalisation'->>'ver')::int, (v_doc->>'verFinalisation')::int, 0) + 1;
    v_doc := jsonb_set(v_doc, '{finalisation}', case when p_nature = 'finalisation' then jsonb_build_object(
               'auteur', p_auteur, 'horodatage', to_jsonb(v_ts), 'erreursAcceptees', coalesce(p_charge->'erreursAcceptees', '[]'),
               'structure', v_s.id, 'empreinte', v_s.empreinte, 'writeId', p_write_id, 'ver', v_ver) else 'null' end);
    v_doc := case when p_nature = 'reouverture' then jsonb_set(v_doc, '{verFinalisation}', to_jsonb(v_ver)) else v_doc - 'verFinalisation' end;
  else
    raise exception 'nature inconnue %', p_nature using errcode = 'AZ422';
  end if;

  update b.dossier d set doc = v_doc, version = d.version + 1
   where d.grille_id = p_grille and d.participant_id = p_participant;
  insert into b.historique values (p_write_id, p_grille, p_participant, p_nature, p_cle, v_ver, p_auteur, v_ts, p_charge);
  return query select v_ver, v_vd + 1, 'ecrite'::text;
end $$;

-- Reconstruction des dossiers depuis l'historique seul (chargement en masse et S8).
-- Dernière écriture par clé = version maximale ; les pierres tombales sont reconstruites aussi.
create view b.dossier_rejoue as
with dern as (
  select distinct on (grille_id, participant_id, nature, cle) *
    from b.historique where nature in ('note','commentaire','nonEvaluation')
   order by grille_id, participant_id, nature, cle, version desc
), agg as (
  select grille_id, participant_id,
         jsonb_object_agg(cle, jsonb_build_object('v', charge->'valeur', 'ver', version)) filter (where nature = 'note') notes,
         jsonb_object_agg(cle, jsonb_build_object('t', charge->'texte', 'ver', version)) filter (where nature = 'commentaire') commentaires,
         jsonb_object_agg(cle, jsonb_build_object('noeud', charge->'noeud', 'axe', charge->'axe', 'active', charge->'active', 'ver', version))
           filter (where nature = 'nonEvaluation') nes
    from dern group by 1, 2
), jok as (
  select grille_id, participant_id,
         jsonb_agg(jsonb_build_object('noeud', charge->'noeud', 'jokerDef', cle, 'justification', charge->'justification',
                   'auteur', auteur, 'horodatage', to_jsonb(horodatage), 'writeId', write_id, 'ver', version) order by horodatage, write_id) jokers
    from b.historique where nature = 'joker' group by 1, 2
), fin as (
  select distinct on (grille_id, participant_id) *
    from b.historique where nature in ('finalisation','reouverture')
   order by grille_id, participant_id, version desc
), cnt as (
  select grille_id, participant_id, count(*) n from b.historique group by 1, 2
)
select d.grille_id, d.participant_id,
  jsonb_build_object(
    'notes', coalesce(agg.notes, '{}'), 'commentaires', coalesce(agg.commentaires, '{}'), 'nonEvaluations', coalesce(agg.nes, '{}'),
    'jokers', coalesce(jok.jokers, '[]'),
    'finalisation', case when fin.nature = 'finalisation' then jsonb_build_object(
                      'auteur', fin.auteur, 'horodatage', to_jsonb(fin.horodatage), 'erreursAcceptees', coalesce(fin.charge->'erreursAcceptees', '[]'),
                      'structure', s.id, 'empreinte', s.empreinte, 'writeId', fin.write_id, 'ver', fin.version) else 'null' end)
  || case when fin.nature = 'reouverture' then jsonb_build_object('verFinalisation', fin.version) else '{}' end as doc,
  coalesce(cnt.n, 0) as version
from b.dossier d
join b.grille g on g.id = d.grille_id join b.structure s on s.id = g.structure_id
left join agg on agg.grille_id = d.grille_id and agg.participant_id = d.participant_id
left join jok on jok.grille_id = d.grille_id and jok.participant_id = d.participant_id
left join fin on fin.grille_id = d.grille_id and fin.participant_id = d.participant_id
left join cnt on cnt.grille_id = d.grille_id and cnt.participant_id = d.participant_id;

-- Signature d'un barème (mêmes valeurs possibles), pour la reprise des cases à la copie.
create function b.signature_bareme(p jsonb) returns jsonb language sql immutable as $$
  select case when p is null then null
              when p->>'type' = 'numerique' then jsonb_build_array('numerique', p->'min', p->'max', p->'pas')
              else jsonb_build_array('ordinal', coalesce(p->'prereglage', 'null'), coalesce(jsonb_path_query_array(p, '$.paliers[*].valeur'), '[]')) end
$$;

-- Cases (nœuds de données à barème) d'une structure, avec la signature de leur barème.
create function b.cases_structure(p_doc jsonb) returns table (noeud text, sig jsonb) language sql immutable as $$
  select n->>'id', b.signature_bareme(br)
    from jsonb_array_elements(p_doc->'noeuds') n
    left join lateral (select x from jsonb_array_elements(p_doc->'baremes') x where x->>'id' = n->>'bareme') bb(br) on true
   where n->>'type' = 'donnees' and n ? 'bareme'
$$;

-- Copie complète d'une grille vers une nouvelle structure (correspondance par `origine`).
-- Reprend notes, commentaires, non-évaluations actives, jokers ; pas la finalisation.
-- L'historique source n'est pas recopié : chaque élément repris reçoit UNE ligne d'historique (version 1)
-- dont la charge porte sa provenance (grille, clé et version source). Simplification déclarée : une
-- non-évaluation sur un nœud supprimé est rapportée perdue (pas de report sur les feuilles).
create function b.copier_grille(p_source uuid, p_structure jsonb, p_nom text, p_auteur uuid)
returns uuid language plpgsql as $$
declare
  v_src b.grille; v_doc1 jsonb; v_struct uuid := b.uuidv7(); v_cible uuid := b.uuidv7();
  v_noeuds jsonb; v_axes jsonb; v_jokers jsonb; v_cases jsonb; v_ajoutes jsonb; v_rapport jsonb; v_ts timestamptz := now();
begin
  select * into v_src from b.grille where id = p_source;
  select doc into v_doc1 from b.structure where id = v_src.structure_id;
  insert into b.structure (id, doc) values (v_struct, p_structure);
  insert into b.grille (id, cours_id, nom, structure_id, principale, ouverture_saisie)
       values (v_cible, v_src.cours_id, p_nom, v_struct, false, v_src.ouverture_saisie);

  -- correspondances : id source -> id cible (null = sans correspondant)
  select jsonb_object_agg(n1->>'id', (select n2->>'id' from jsonb_array_elements(p_structure->'noeuds') n2 where n2->>'origine' = n1->>'id'))
    into v_noeuds from jsonb_array_elements(v_doc1->'noeuds') n1;
  select coalesce(jsonb_object_agg(a1->>'id', (select a2->>'id' from jsonb_array_elements(p_structure->'axes') a2 where a2->>'origine' = a1->>'id')), '{}')
    into v_axes from jsonb_array_elements(v_doc1->'axes') a1;
  select coalesce(jsonb_object_agg(j1->>'id', (select j2->>'id' from jsonb_array_elements(p_structure->'jokers'->'autorises') j2
                                               where j2->>'origine' = j1->>'id' and j2->>'noeud' = v_noeuds->>(j1->>'noeud'))), '{}')
    into v_jokers from jsonb_array_elements(coalesce(v_doc1->'jokers'->'autorises', '[]')) j1;
  select coalesce(jsonb_agg(n2->>'id'), '[]') into v_ajoutes from jsonb_array_elements(p_structure->'noeuds') n2
   where not (n2 ? 'origine') or not v_noeuds ? (n2->>'origine');
  -- cases reprises : nœud cible à case et barème de même signature
  select coalesce(jsonb_object_agg(c1.noeud, c2.noeud), '{}') into v_cases
    from b.cases_structure(v_doc1) c1 join b.cases_structure(p_structure) c2 on c2.noeud = v_noeuds->>c1.noeud and c2.sig = c1.sig;

  -- rapport
  select coalesce(jsonb_agg(r order by r->>'participant', r->>'type', r->>'noeud'), '[]') into v_rapport from (
    select jsonb_build_object('type', case when v_noeuds->>k is not null and v_noeuds->>k = any(select noeud from b.cases_structure(p_structure))
                                           then 'caseNonReprise' else 'casePerdue' end,
                              'participant', d.participant_id, 'noeud', k, 'valeur', e->'v') r
      from b.dossier d, jsonb_each(d.doc->'notes') t(k, e)
     where d.grille_id = p_source and e->'v' <> 'null' and not v_cases ? k
    union all
    select jsonb_build_object('type', 'commentairePerdu', 'participant', d.participant_id, 'noeud', k, 'texte', e->'t')
      from b.dossier d, jsonb_each(d.doc->'commentaires') t(k, e)
     where d.grille_id = p_source and e->'t' <> 'null' and v_noeuds->>k is null
    union all
    select jsonb_build_object('type', 'nonEvaluationPerdue', 'participant', d.participant_id, 'noeud', e->>'noeud', 'axe', e->'axe')
      from b.dossier d, jsonb_each(d.doc->'nonEvaluations') t(k, e)
     where d.grille_id = p_source and (e->>'active')::boolean
       and (v_noeuds->>(e->>'noeud') is null or (e->>'axe' is not null and v_axes->>(e->>'axe') is null))
    union all
    select jsonb_build_object('type', 'jokerPerdu', 'participant', d.participant_id, 'jokerDef', j->>'jokerDef')
      from b.dossier d, jsonb_array_elements(d.doc->'jokers') j
     where d.grille_id = p_source and v_jokers->>(j->>'jokerDef') is null) x;

  insert into b.copie values (b.uuidv7(), p_source, v_cible, p_auteur, v_ts,
    jsonb_build_object('noeuds', v_noeuds, 'axes', v_axes, 'jokers', v_jokers, 'ajoutes', v_ajoutes), v_rapport);

  -- dossiers de la copie
  insert into b.dossier (grille_id, participant_id, doc, version)
  select v_cible, d.participant_id, nd.doc, 0 from b.dossier d,
  lateral (select jsonb_build_object(
    'notes', coalesce((select jsonb_object_agg(v_cases->>k, jsonb_build_object('v', e->'v', 'ver', 1))
                         from jsonb_each(d.doc->'notes') t(k, e) where e->'v' <> 'null' and v_cases ? k), '{}'),
    'commentaires', coalesce((select jsonb_object_agg(v_noeuds->>k, jsonb_build_object('t', e->'t', 'ver', 1))
                         from jsonb_each(d.doc->'commentaires') t(k, e) where e->'t' <> 'null' and v_noeuds->>k is not null), '{}'),
    'nonEvaluations', coalesce((select jsonb_object_agg((v_noeuds->>(e->>'noeud')) || '|' || coalesce(v_axes->>(e->>'axe'), ''),
                                   jsonb_build_object('noeud', v_noeuds->>(e->>'noeud'), 'axe', to_jsonb(v_axes->>(e->>'axe')), 'active', true, 'ver', 1))
                         from jsonb_each(d.doc->'nonEvaluations') t(k, e)
                        where (e->>'active')::boolean and v_noeuds->>(e->>'noeud') is not null
                          and (e->>'axe' is null or v_axes->>(e->>'axe') is not null)), '{}'),
    'jokers', coalesce((select jsonb_agg(j || jsonb_build_object('jokerDef', v_jokers->>(j->>'jokerDef'), 'noeud', v_noeuds->>(j->>'noeud'),
                                                                 'auteur', p_auteur, 'horodatage', to_jsonb(v_ts), 'writeId', b.uuidv7(), 'ver', 1)
                                         order by o)
                         from jsonb_array_elements(d.doc->'jokers') with ordinality x(j, o) where v_jokers->>(j->>'jokerDef') is not null), '[]'),
    'finalisation', 'null'::jsonb) as doc) nd
  where d.grille_id = p_source;

  -- une ligne d'historique par élément repris (provenance dans la charge)
  insert into b.historique
  select b.uuidv7(), v_cible, d.participant_id, 'note', k, 1, p_auteur, v_ts,
         jsonb_build_object('valeur', e->'v', 'copie', jsonb_build_object('grille', p_source, 'cle', s.k1, 'version', s.ver))
    from b.dossier d, jsonb_each(d.doc->'notes') t(k, e),
         lateral (select k1, (sd.doc->'notes'->k1->>'ver')::int ver from jsonb_each_text(v_cases) c(k1, k2), b.dossier sd
                   where c.k2 = k and sd.grille_id = p_source and sd.participant_id = d.participant_id) s
   where d.grille_id = v_cible
  union all
  select b.uuidv7(), v_cible, d.participant_id, 'commentaire', k, 1, p_auteur, v_ts,
         jsonb_build_object('texte', e->'t', 'copie', jsonb_build_object('grille', p_source))
    from b.dossier d, jsonb_each(d.doc->'commentaires') t(k, e) where d.grille_id = v_cible
  union all
  select b.uuidv7(), v_cible, d.participant_id, 'nonEvaluation', k, 1, p_auteur, v_ts,
         jsonb_build_object('noeud', e->'noeud', 'axe', e->'axe', 'active', true, 'copie', jsonb_build_object('grille', p_source))
    from b.dossier d, jsonb_each(d.doc->'nonEvaluations') t(k, e) where d.grille_id = v_cible
  union all
  select (j->>'writeId')::uuid, v_cible, d.participant_id, 'joker', j->>'jokerDef', 1, p_auteur, v_ts,
         jsonb_build_object('noeud', j->'noeud', 'justification', j->'justification', 'copie', jsonb_build_object('grille', p_source))
    from b.dossier d, jsonb_array_elements(d.doc->'jokers') j where d.grille_id = v_cible;

  update b.dossier d set version = (select count(*) from b.historique h where h.grille_id = v_cible and h.participant_id = d.participant_id)
   where d.grille_id = v_cible;
  return v_cible;
end $$;

-- Feuilles à barème couvertes par un nœud selon les placements (règle 1b-A) : sous-arbre de chaque placement, tous axes.
create function b.feuilles_placement(p_doc jsonb, p_noeud text) returns setof text language sql immutable as $$
  with recursive pl(noeud, enfants, dedans) as (
    select p->>'noeud', p->'enfants', p->>'noeud' = p_noeud
      from jsonb_array_elements(p_doc->'axes') a, jsonb_array_elements(a->'arbre') p
    union all
    select c->>'noeud', c->'enfants', pl.dedans or c->>'noeud' = p_noeud
      from pl, jsonb_array_elements(coalesce(pl.enfants, '[]')) c
  ), cs as materialized (select noeud from b.cases_structure(p_doc))
  select noeud from cs where noeud in (select noeud from pl where dedans union select p_noeud)
$$;

-- Feuilles à barème du cône de calcul d'un nœud (descente des entrées).
create function b.feuilles_calcul(p_doc jsonb, p_noeud text) returns setof text language sql immutable as $$
  with recursive n as materialized (select x->>'id' id, x->'entrees' entrees from jsonb_array_elements(p_doc->'noeuds') x),
  cone(id) as (
    select p_noeud
    union
    select e->>'noeud' from cone join n using (id), jsonb_array_elements(coalesce(n.entrees, '[]')) e
  ), cs as materialized (select noeud from b.cases_structure(p_doc))
  select noeud from cs where noeud in (select id from cone)
$$;
