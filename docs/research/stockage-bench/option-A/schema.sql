-- Option A : tout en tables. Structure de grille relationnelle + état courant + historique append-only.
-- PostgreSQL 16. Schéma « azimut ». Chargement : psql -v ON_ERROR_STOP=1 -f schema.sql
--
-- Vocabulaire :
--   grille           conteneur logique d'un cours (nom, principale, ouverture de la saisie)
--   versions_grille  une version de structure ; les saisies s'y rattachent (version_id).
--                    Publiée (publiee_le non nul) = structure de calcul immuable ; seuls les libellés
--                    restent corrigeables, en place, tracés dans historique_structure.
--   version          (colonne int des tables d'état) compteur serveur d'écritures de la clé.

drop schema if exists azimut cascade;
create schema azimut;
set search_path = azimut;

-- UUIDv7 (PostgreSQL 16 n'a pas uuidv7() ; PG 18 l'aura).
create function uuidv7() returns uuid language sql volatile parallel safe as $$
  select encode(set_bit(set_bit(overlay(uuid_send(gen_random_uuid())
    placing substring(int8send((extract(epoch from clock_timestamp()) * 1000)::bigint) from 3) from 1 for 6),
    52, 1), 53, 1), 'hex')::uuid
$$;

-- ============================================================== acteurs du cours
create table cours (
  id uuid primary key,
  nom text not null,
  debut timestamptz not null,
  fin timestamptz not null
);
create table formateurs (
  id uuid primary key,
  cours_id uuid not null references cours,
  totem text not null
);
create table groupes (
  id uuid primary key,
  cours_id uuid not null references cours,
  nom text not null,
  referent_id uuid references formateurs
);
create table participants (
  id uuid primary key,
  cours_id uuid not null references cours,
  nom text not null,
  groupe_id uuid references groupes
);
create index participants_groupe on participants (groupe_id);

-- ============================================================== structure
create table grilles (
  id uuid primary key default uuidv7(),
  cours_id uuid not null references cours,
  nom text not null,
  principale boolean not null default false,
  ouverture_saisie timestamptz,
  unique (cours_id, nom)
);

create table versions_grille (
  id uuid primary key default uuidv7(),
  grille_id uuid not null references grilles on delete cascade,
  numero int not null,
  source text,
  provenance text,                 -- format.ts provenance.grille
  decisif_id uuid,                 -- FK ajoutée après noeuds (cycle)
  quota_jokers int,                -- null : pas de section jokers
  publiee_le timestamptz,          -- non nul : structure de calcul immuable
  unique (grille_id, numero)
);

create table baremes (
  id uuid primary key default uuidv7(),
  version_id uuid not null references versions_grille on delete cascade,
  code text not null,
  rang smallint not null,
  type text not null check (type in ('ordinal', 'numerique')),
  libelle text,
  prereglage text check (prereglage = 'binaire'),
  min numeric, max numeric, pas numeric,
  presentation text check (presentation = 'pourcentage'),
  unique (version_id, code),
  unique (version_id, rang),
  unique (id, version_id),
  check ((type = 'numerique') = (min is not null and max is not null and pas is not null)),
  check (type = 'ordinal' or prereglage is null)
);
create table paliers (
  bareme_id uuid not null references baremes on delete cascade,
  rang smallint not null,          -- rang stocké dans les cases ordinales
  valeur numeric not null,
  libelle text not null,
  couleur text,
  primary key (bareme_id, rang)
);
create table colorations (
  bareme_id uuid not null references baremes on delete cascade,
  rang smallint not null,
  de numeric not null, a numeric not null, couleur text not null,
  primary key (bareme_id, rang)
);

create table noeuds (
  id uuid primary key default uuidv7(),
  version_id uuid not null references versions_grille on delete cascade,
  code text not null,              -- id de format.ts
  rang smallint not null,          -- ordre dans noeuds[]
  type text not null check (type in ('donnees', 'calcul', 'regroupement')),
  libelle text not null,
  definition text,
  origine text,                    -- id du nœud de la version d'origine (copie)
  bareme_id uuid,                  -- donnees ; null = nœud de commentaire seul
  obligatoire boolean,
  fonction text check (fonction in ('F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7')),
  bareme_sortie_id uuid,
  arrondi numeric,
  p_seuil numeric, p_min_entrees_actives int, p_k int, p_k_toutes boolean, p_mode text check (p_mode in ('meilleure', 'derniere')),
  p_plafond numeric, p_k_hautes int, p_k_basses int, p_pivot numeric, p_facteur_bas numeric, p_max_insuffisantes int,
  unique (version_id, code),
  unique (version_id, rang),
  unique (id, version_id),
  foreign key (bareme_id, version_id) references baremes (id, version_id) on delete cascade,
  foreign key (bareme_sortie_id, version_id) references baremes (id, version_id) on delete cascade,
  check ((type = 'calcul') = (fonction is not null)),
  check (type = 'donnees' or (bareme_id is null and obligatoire is null)),
  check (type = 'calcul' or (bareme_sortie_id is null and arrondi is null and p_seuil is null and p_min_entrees_actives is null
         and p_k is null and p_k_toutes is null and p_mode is null and p_plafond is null and p_k_hautes is null
         and p_k_basses is null and p_pivot is null and p_facteur_bas is null and p_max_insuffisantes is null)),
  check (p_k is null or p_k_toutes is null)
);
alter table versions_grille add foreign key (decisif_id) references noeuds deferrable initially deferred;

create table conversions (
  noeud_id uuid not null references noeuds on delete cascade,
  rang smallint not null,
  x numeric not null, y numeric not null,
  primary key (noeud_id, rang)
);

create table entrees (                  -- arêtes pondérées du graphe de calcul
  noeud_id uuid not null,
  rang smallint not null,               -- ordre des entrees (F5 : rang des occurrences)
  version_id uuid not null,
  source_id uuid not null,
  poids numeric not null,
  primary key (noeud_id, rang),
  foreign key (noeud_id, version_id) references noeuds (id, version_id) on delete cascade,
  foreign key (source_id, version_id) references noeuds (id, version_id) on delete cascade
);
create index entrees_source on entrees (source_id);

create table axes (
  id uuid primary key default uuidv7(),
  version_id uuid not null references versions_grille on delete cascade,
  code text not null,
  rang smallint not null,
  libelle text not null,
  principal boolean,
  origine text,
  unique (version_id, code),
  unique (version_id, rang),
  unique (id, version_id)
);
create unique index axes_un_principal on axes (version_id) where principal;

create table placements (               -- arbres des axes (liste d'adjacence)
  id uuid primary key default uuidv7(),
  axe_id uuid not null,
  version_id uuid not null,
  parent_id uuid references placements on delete cascade,
  rang smallint not null,
  noeud_id uuid not null,
  unique nulls not distinct (axe_id, parent_id, rang),
  foreign key (axe_id, version_id) references axes (id, version_id) on delete cascade,
  foreign key (noeud_id, version_id) references noeuds (id, version_id) on delete cascade
);
create index placements_noeud on placements (noeud_id);
create index placements_parent on placements (parent_id);

create table jokers_autorises (
  id uuid primary key default uuidv7(),
  version_id uuid not null references versions_grille on delete cascade,
  code text not null,
  rang smallint not null,
  noeud_id uuid not null,
  action text not null check (action in ('ajout', 'seuil')),
  ajout_valeur numeric,
  noeud_seuil_id uuid,
  libelle text,
  origine text,
  unique (version_id, code),
  unique (id, version_id),
  foreign key (noeud_id, version_id) references noeuds (id, version_id) on delete cascade,
  foreign key (noeud_seuil_id, version_id) references noeuds (id, version_id) on delete cascade,
  check ((action = 'ajout') = (ajout_valeur is not null) and (action = 'seuil') = (noeud_seuil_id is not null))
);

create table exigences_minimum (
  version_id uuid not null references versions_grille on delete cascade,
  rang smallint not null,
  noeud_id uuid not null,
  min_actives int not null,
  primary key (version_id, rang),
  foreign key (noeud_id, version_id) references noeuds (id, version_id) on delete cascade
);

create table historique_structure (     -- corrections de libellés après publication
  id uuid primary key default uuidv7(),
  version_id uuid not null references versions_grille on delete cascade,
  objet text not null,
  element text not null,
  avant text,
  apres text,
  auteur_id uuid,
  le timestamptz not null default now()
);

-- ============================================================== copies et correspondances
create table copies (
  id uuid primary key default uuidv7(),
  source_version_id uuid not null references versions_grille on delete cascade,
  cible_version_id uuid not null unique references versions_grille on delete cascade,
  auteur_id uuid not null references formateurs,
  faite_le timestamptz not null
);
create table correspondances (          -- persistée : source → cible, null d'un côté = supprimé / ajouté
  copie_id uuid not null references copies on delete cascade,
  objet text not null check (objet in ('noeud', 'axe', 'joker')),
  source_id uuid,
  cible_id uuid,
  check (source_id is not null or cible_id is not null),
  unique nulls not distinct (copie_id, objet, source_id, cible_id)
);
create table copie_rapport (
  id uuid primary key default uuidv7(),
  copie_id uuid not null references copies on delete cascade,
  type text not null check (type in ('casePerdue', 'caseNonReprise', 'commentairePerdu', 'nonEvaluationPerdue',
                                     'nonEvaluationSansAxe', 'jokerPerdu')),
  participant_id uuid not null,
  noeud text,
  axe text,
  joker text,
  valeur double precision
);

-- ============================================================== saisies : état courant
create table cases (
  version_id uuid not null,
  participant_id uuid not null references participants,
  noeud_id uuid not null,
  valeur double precision,         -- ordinal : RANG du palier (0..n-1) ; numérique : la note. null = effacée
  version int not null,            -- nombre d'écritures, attribué par le serveur
  auteur_id uuid not null,
  modifie_le timestamptz not null,
  primary key (version_id, participant_id, noeud_id),
  foreign key (noeud_id, version_id) references noeuds (id, version_id) on delete cascade
);
create table commentaires (
  version_id uuid not null,
  participant_id uuid not null references participants,
  noeud_id uuid not null,          -- tout nœud (données, commentaire seul, calcul, regroupement)
  texte text,
  version int not null,
  auteur_id uuid not null,
  modifie_le timestamptz not null,
  primary key (version_id, participant_id, noeud_id),
  foreign key (noeud_id, version_id) references noeuds (id, version_id) on delete cascade
);
create table non_evaluations (          -- case ou regroupement ; une ligne par (nœud, axe), jamais par feuille
  id uuid primary key default uuidv7(),
  version_id uuid not null,
  participant_id uuid not null references participants,
  noeud_id uuid not null,
  axe_id uuid,                     -- null = axe principal
  active boolean not null,
  version int not null,
  auteur_id uuid not null,
  modifie_le timestamptz not null,
  unique nulls not distinct (version_id, participant_id, noeud_id, axe_id),
  foreign key (noeud_id, version_id) references noeuds (id, version_id) on delete cascade,
  foreign key (axe_id, version_id) references axes (id, version_id) on delete cascade
);
create table jokers_poses (
  id uuid primary key,             -- writeId de la pose (UUIDv7, donc ordre de pose)
  version_id uuid not null,
  participant_id uuid not null references participants,
  joker_id uuid not null,
  justification text not null,
  auteur_id uuid not null,
  pose_le timestamptz not null,
  foreign key (joker_id, version_id) references jokers_autorises (id, version_id) on delete cascade
);
create index jokers_poses_participant on jokers_poses (version_id, participant_id);
create table finalisations (            -- une ligne par dossier (participant × version), sert aussi de verrou
  version_id uuid not null references versions_grille on delete cascade,
  participant_id uuid not null references participants,
  finalise boolean not null default false,
  version int not null default 0,
  auteur_id uuid,
  modifie_le timestamptz,
  erreurs_acceptees text[],
  empreinte text,                  -- sha256 structure de calcul + sources, à la finalisation
  primary key (version_id, participant_id)
);

-- ============================================================== historique append-only
create type nature_ecriture as enum ('note', 'commentaire', 'nonEvaluation', 'joker', 'finalisation', 'reouverture');
create table historique (
  write_id uuid primary key,       -- idempotence
  version_id uuid not null references versions_grille on delete cascade,
  participant_id uuid not null,
  nature nature_ecriture not null,
  noeud_id uuid,
  axe_id uuid,
  joker_id uuid,
  valeur double precision,
  valeur_avant double precision,
  texte text,
  texte_avant text,
  active boolean,
  justification text,
  erreurs_acceptees text[],
  version int not null,            -- version de la clé après cette écriture
  auteur_id uuid not null,
  horodatage timestamptz not null, -- moment serveur (chargement : moment d'origine)
  copie_id uuid references copies on delete cascade
);
create index historique_cle on historique (version_id, participant_id, noeud_id);

-- ============================================================== gardes
create function garde_historique() returns trigger language plpgsql as $$
begin
  if current_setting('azimut.purge', true) = 'on' then return old; end if;
  raise exception using errcode = 'AZ409', message = 'historique append-only : ' || tg_op || ' refusé';
end $$;
create trigger historique_append_only before update or delete on historique
  for each row execute function garde_historique();

-- Structure publiée : rien ne change sauf les libellés (tracés). Purge (azimut.purge) : tout passe.
create function garde_structure() returns trigger language plpgsql as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  r jsonb := coalesce(n, o);
  v uuid;
  pub timestamptz;
begin
  if current_setting('azimut.purge', true) = 'on' then return coalesce(new, old); end if;
  if tg_table_name = 'versions_grille' then
    if tg_op = 'UPDATE' and o ->> 'publiee_le' is not null then
      raise exception using errcode = 'AZ409', message = 'version publiée immuable';
    end if;
    return coalesce(new, old);
  end if;
  v := r ->> 'version_id';
  if v is null and tg_table_name in ('paliers', 'colorations') then
    select version_id into v from baremes where id = (r ->> 'bareme_id')::uuid;
  elsif v is null then
    select version_id into v from noeuds where id = (r ->> 'noeud_id')::uuid;
  end if;
  select publiee_le into pub from versions_grille where id = v;
  if pub is null then return coalesce(new, old); end if;
  if tg_op = 'UPDATE' and (n - 'libelle') = (o - 'libelle') then
    if n ->> 'libelle' is distinct from o ->> 'libelle' then
      insert into historique_structure (version_id, objet, element, avant, apres, auteur_id)
      values (v, tg_table_name, coalesce(n ->> 'code', n ->> 'bareme_id' || '/' || (n ->> 'rang')), o ->> 'libelle', n ->> 'libelle',
              nullif(current_setting('azimut.utilisateur', true), '')::uuid);
    end if;
    return new;
  end if;
  raise exception using errcode = 'AZ409', message = format('structure publiée : %s %s refusé', tg_table_name, tg_op);
end $$;
create trigger garde before update or delete on versions_grille for each row execute function garde_structure();
create trigger garde before insert or update or delete on baremes for each row execute function garde_structure();
create trigger garde before insert or update or delete on paliers for each row execute function garde_structure();
create trigger garde before insert or update or delete on colorations for each row execute function garde_structure();
create trigger garde before insert or update or delete on noeuds for each row execute function garde_structure();
create trigger garde before insert or update or delete on conversions for each row execute function garde_structure();
create trigger garde before insert or update or delete on entrees for each row execute function garde_structure();
create trigger garde before insert or update or delete on axes for each row execute function garde_structure();
create trigger garde before insert or update or delete on placements for each row execute function garde_structure();
create trigger garde before insert or update or delete on jokers_autorises for each row execute function garde_structure();
create trigger garde before insert or update or delete on exigences_minimum for each row execute function garde_structure();

-- ============================================================== import d'un document format.ts
create function importer_grille(p_grille_id uuid, p_cours uuid, p_nom text, p_doc jsonb, p_principale boolean,
                                p_ouverture timestamptz) returns uuid language plpgsql
set jit = off   -- estimations récursives sur jsonb (~5e9) : sans cela, la compilation JIT coûte ~340 ms par import
as $$
declare v uuid;
begin
  if jsonb_typeof(p_doc -> 'noeuds') is distinct from 'array' then
    raise exception using errcode = 'AZ400', message = 'document de grille invalide';
  end if;
  insert into grilles (id, cours_id, nom, principale, ouverture_saisie)
  values (coalesce(p_grille_id, uuidv7()), p_cours, p_nom, p_principale, p_ouverture) returning id into p_grille_id;
  insert into versions_grille (grille_id, numero, source, provenance, quota_jokers)
  values (p_grille_id, 1, p_doc ->> 'source', p_doc #>> '{provenance,grille}', (p_doc #>> '{jokers,quota}')::int)
  returning id into v;

  insert into baremes (version_id, code, rang, type, libelle, prereglage, min, max, pas, presentation)
  select v, b ->> 'id', o - 1, b ->> 'type', b ->> 'libelle', b ->> 'prereglage', (b ->> 'min')::numeric,
         (b ->> 'max')::numeric, (b ->> 'pas')::numeric, b ->> 'presentation'
  from jsonb_array_elements(p_doc -> 'baremes') with ordinality t(b, o);
  insert into paliers (bareme_id, rang, valeur, libelle, couleur)
  select ba.id, o - 1, (p ->> 'valeur')::numeric, p ->> 'libelle', p ->> 'couleur'
  from jsonb_array_elements(p_doc -> 'baremes') t(b)
  join baremes ba on ba.version_id = v and ba.code = b ->> 'id',
  jsonb_array_elements(coalesce(b -> 'paliers', '[]')) with ordinality u(p, o);
  insert into colorations (bareme_id, rang, de, a, couleur)
  select ba.id, o - 1, (c ->> 0)::numeric, (c ->> 1)::numeric, c ->> 2
  from jsonb_array_elements(p_doc -> 'baremes') t(b)
  join baremes ba on ba.version_id = v and ba.code = b ->> 'id',
  jsonb_array_elements(coalesce(b -> 'colorations', '[]')) with ordinality u(c, o);

  insert into noeuds (version_id, code, rang, type, libelle, definition, origine, bareme_id, obligatoire, fonction,
                      bareme_sortie_id, arrondi, p_seuil, p_min_entrees_actives, p_k, p_k_toutes, p_mode, p_plafond,
                      p_k_hautes, p_k_basses, p_pivot, p_facteur_bas, p_max_insuffisantes)
  select v, x ->> 'id', o - 1, x ->> 'type', x ->> 'libelle', x ->> 'definition', x ->> 'origine',
         b.id, (x ->> 'obligatoire')::boolean,
         x ->> 'fonction', bs.id, (x ->> 'arrondi')::numeric,
         (x #>> '{params,seuil}')::numeric, (x #>> '{params,minEntreesActives}')::int,
         case when jsonb_typeof(x #> '{params,k}') = 'number' then (x #>> '{params,k}')::int end,
         case when x #>> '{params,k}' = 'toutes' then true end,
         x #>> '{params,mode}', (x #>> '{params,plafond}')::numeric, (x #>> '{params,kHautes}')::int,
         (x #>> '{params,kBasses}')::int, (x #>> '{params,pivot}')::numeric, (x #>> '{params,facteurBas}')::numeric,
         (x #>> '{params,maxInsuffisantes}')::int
  from jsonb_array_elements(p_doc -> 'noeuds') with ordinality t(x, o)
  left join baremes b on b.version_id = v and b.code = x ->> 'bareme'
  left join baremes bs on bs.version_id = v and bs.code = x ->> 'bareme_sortie';
  if exists (select 1 from jsonb_array_elements(p_doc -> 'noeuds') x
             where (x ? 'bareme' and not exists (select 1 from baremes b where b.version_id = v and b.code = x ->> 'bareme'))
                or (x ? 'bareme_sortie' and not exists (select 1 from baremes b where b.version_id = v and b.code = x ->> 'bareme_sortie'))) then
    raise exception using errcode = 'AZ400', message = 'barème inconnu';
  end if;

  insert into conversions (noeud_id, rang, x, y)
  select n.id, o - 1, (c ->> 0)::numeric, (c ->> 1)::numeric
  from jsonb_array_elements(p_doc -> 'noeuds') t(x)
  join noeuds n on n.version_id = v and n.code = x ->> 'id',
  jsonb_array_elements(coalesce(x -> 'conversion', '[]')) with ordinality u(c, o);

  -- left join + colonnes not null : une référence inconnue lève une erreur
  insert into entrees (noeud_id, rang, version_id, source_id, poids)
  select n.id, o - 1, v, s.id, (e ->> 'poids')::numeric
  from jsonb_array_elements(p_doc -> 'noeuds') t(x)
  join noeuds n on n.version_id = v and n.code = x ->> 'id'
  cross join jsonb_array_elements(coalesce(x -> 'entrees', '[]')) with ordinality u(e, o)
  left join noeuds s on s.version_id = v and s.code = e ->> 'noeud';

  insert into axes (version_id, code, rang, libelle, principal, origine)
  select v, a ->> 'id', o - 1, a ->> 'libelle', (a ->> 'principal')::boolean, a ->> 'origine'
  from jsonb_array_elements(p_doc -> 'axes') with ordinality t(a, o);

  with recursive p (axe, chemin, parent, rang, noeud, enfants) as (
    select a ->> 'id', array[o::int], null::int[], (o - 1)::int, x ->> 'noeud', x -> 'enfants'
    from jsonb_array_elements(p_doc -> 'axes') t(a), jsonb_array_elements(a -> 'arbre') with ordinality u(x, o)
    union all
    select p.axe, p.chemin || o::int, p.chemin, (o - 1)::int, x ->> 'noeud', x -> 'enfants'
    from p, jsonb_array_elements(coalesce(p.enfants, '[]')) with ordinality u(x, o)
  ), ids as materialized (select p.*, uuidv7() as id from p)
  insert into placements (id, axe_id, version_id, parent_id, rang, noeud_id)
  select i.id, a.id, v, par.id, i.rang, n.id
  from ids i
  left join axes a on a.version_id = v and a.code = i.axe
  left join noeuds n on n.version_id = v and n.code = i.noeud
  left join ids par on par.axe = i.axe and par.chemin = i.parent;

  insert into jokers_autorises (version_id, code, rang, noeud_id, action, ajout_valeur, noeud_seuil_id, libelle, origine)
  select v, j ->> 'id', o - 1, n.id, j #>> '{action,type}', (j #>> '{action,valeur}')::numeric, s.id, j ->> 'libelle', j ->> 'origine'
  from jsonb_array_elements(coalesce(p_doc #> '{jokers,autorises}', '[]')) with ordinality t(j, o)
  left join noeuds n on n.version_id = v and n.code = j ->> 'noeud'
  left join noeuds s on s.version_id = v and s.code = j #>> '{action,noeudSeuil}';

  insert into exigences_minimum (version_id, rang, noeud_id, min_actives)
  select v, o - 1, n.id, (e ->> 'minActives')::int
  from jsonb_array_elements(coalesce(p_doc #> '{exigences,minimumParRegroupement}', '[]')) with ordinality t(e, o)
  left join noeuds n on n.version_id = v and n.code = e ->> 'noeud';

  update versions_grille set decisif_id = (select id from noeuds where version_id = v and code = p_doc ->> 'decisif')
  where id = v and p_doc ? 'decisif';
  return v;
end $$;

-- Publication : contrôle sans cycle (§3), puis structure de calcul figée.
create function publier(p_version uuid) returns void language plpgsql as $$
begin
  if exists (
    with recursive r (depart, n) as (
      select noeud_id, source_id from entrees where version_id = p_version
      union
      select r.depart, e.source_id from r join entrees e on e.noeud_id = r.n
    ) select 1 from r where r.n = r.depart) then
    raise exception using errcode = 'AZ400', message = 'graphe de calcul cyclique';
  end if;
  update versions_grille set publiee_le = now() where id = p_version;
end $$;

-- ============================================================== reconstruction du document format.ts
-- Arbres de tous les axes d'une version, assemblés de bas en haut, une requête par niveau de profondeur.
create function placements_profondeur(p_version uuid)
returns table (id uuid, parent_id uuid, axe_id uuid, rang smallint, code text, prof int) language sql stable as $$
  with recursive d (id, parent_id, axe_id, rang, noeud_id, prof) as (
    select p.id, p.parent_id, p.axe_id, p.rang, p.noeud_id, 0 from placements p where p.version_id = p_version and p.parent_id is null
    union all
    select c.id, c.parent_id, c.axe_id, c.rang, c.noeud_id, d.prof + 1 from d join placements c on c.parent_id = d.id
  ) select d.id, d.parent_id, d.axe_id, d.rang, n.code, d.prof from d join noeuds n on n.id = d.noeud_id
$$;

create function arbres_json(p_version uuid) returns jsonb language plpgsql stable as $$
declare
  m jsonb := '{}';          -- clé parent (placement, ou axe à la racine) → tableau JSON des enfants
  rows_ jsonb;
  niveau int;
begin
  select jsonb_agg(to_jsonb(x)) into rows_ from placements_profondeur(p_version) x;
  select max((r ->> 'prof')::int) into niveau from jsonb_array_elements(rows_) r;
  while niveau >= 0 loop
    select coalesce(jsonb_object_agg(cle, arr), '{}') into m from (
      select coalesce(r ->> 'parent_id', r ->> 'axe_id') cle,
             jsonb_agg(jsonb_build_object('noeud', r ->> 'code', 'enfants', m -> (r ->> 'id')) order by (r ->> 'rang')::int) arr
      from jsonb_array_elements(rows_) r where (r ->> 'prof')::int = niveau group by 1) t;
    niveau := niveau - 1;
  end loop;
  return m;                 -- clé = id de l'axe : son arbre
end $$;

-- p_libelles = false : « structure de calcul » (sans libellés, nom, source ni provenance) pour l'empreinte.
create function document_grille(p_version uuid, p_libelles boolean default true) returns jsonb language sql stable as $$
  with v as (select vg.*, g.nom from versions_grille vg join grilles g on g.id = vg.grille_id where vg.id = p_version),
  pal as (select bareme_id, jsonb_agg(jsonb_build_object('valeur', valeur, 'libelle', case when p_libelles then libelle end,
                                                         'couleur', couleur) order by rang) j
          from paliers where bareme_id in (select id from baremes where version_id = p_version) group by bareme_id),
  col as (select bareme_id, jsonb_agg(jsonb_build_array(de, a, couleur) order by rang) j
          from colorations where bareme_id in (select id from baremes where version_id = p_version) group by bareme_id),
  bar as (select jsonb_agg(jsonb_build_object('id', b.code, 'type', b.type, 'libelle', case when p_libelles then b.libelle end,
                 'prereglage', b.prereglage, 'min', b.min, 'max', b.max, 'pas', b.pas, 'presentation', b.presentation,
                 'paliers', pal.j, 'colorations', col.j) order by b.rang) j
          from baremes b left join pal on pal.bareme_id = b.id left join col on col.bareme_id = b.id
          where b.version_id = p_version),
  ent as (select e.noeud_id, jsonb_agg(jsonb_build_object('noeud', s.code, 'poids', e.poids) order by e.rang) j
          from entrees e join noeuds s on s.id = e.source_id where e.version_id = p_version group by e.noeud_id),
  cnv as (select c.noeud_id, jsonb_agg(jsonb_build_array(c.x, c.y) order by c.rang) j
          from conversions c join noeuds n on n.id = c.noeud_id where n.version_id = p_version group by c.noeud_id),
  nds as (select jsonb_agg(jsonb_build_object(
                 'id', n.code, 'type', n.type, 'libelle', case when p_libelles then n.libelle end, 'definition', n.definition,
                 'bareme', b.code, 'obligatoire', n.obligatoire, 'origine', n.origine, 'fonction', n.fonction,
                 'entrees', case when n.type = 'calcul' then coalesce(ent.j, '[]') end,
                 'params', nullif(jsonb_strip_nulls(jsonb_build_object(
                     'seuil', n.p_seuil, 'minEntreesActives', n.p_min_entrees_actives,
                     'k', case when n.p_k_toutes then to_jsonb('toutes'::text) else to_jsonb(n.p_k) end,
                     'mode', n.p_mode, 'plafond', n.p_plafond, 'kHautes', n.p_k_hautes, 'kBasses', n.p_k_basses,
                     'pivot', n.p_pivot, 'facteurBas', n.p_facteur_bas, 'maxInsuffisantes', n.p_max_insuffisantes)), '{}'),
                 'bareme_sortie', bs.code, 'conversion', cnv.j, 'arrondi', n.arrondi) order by n.rang) j
          from noeuds n left join baremes b on b.id = n.bareme_id left join baremes bs on bs.id = n.bareme_sortie_id
          left join ent on ent.noeud_id = n.id left join cnv on cnv.noeud_id = n.id
          where n.version_id = p_version),
  arb as materialized (select arbres_json(p_version) m),
  axs as (select jsonb_agg(jsonb_build_object('id', a.code, 'libelle', case when p_libelles then a.libelle end,
                 'principal', a.principal, 'arbre', coalesce(arb.m -> a.id::text, '[]'), 'origine', a.origine)
                 order by a.rang) j
          from axes a, arb where a.version_id = p_version),
  jok as (select jsonb_agg(jsonb_build_object('id', j.code, 'noeud', n.code,
                 'action', case j.action when 'ajout' then jsonb_build_object('type', 'ajout', 'valeur', j.ajout_valeur)
                                         else jsonb_build_object('type', 'seuil', 'noeudSeuil', s.code) end,
                 'libelle', case when p_libelles then j.libelle end, 'origine', j.origine) order by j.rang) j
          from jokers_autorises j join noeuds n on n.id = j.noeud_id left join noeuds s on s.id = j.noeud_seuil_id
          where j.version_id = p_version),
  exi as (select jsonb_agg(jsonb_build_object('noeud', n.code, 'minActives', e.min_actives) order by e.rang) j
          from exigences_minimum e join noeuds n on n.id = e.noeud_id where e.version_id = p_version)
  select jsonb_strip_nulls(jsonb_build_object(
    'grille', case when p_libelles then v.nom end,
    'source', case when p_libelles then v.source end,
    'baremes', coalesce(bar.j, '[]'),
    'noeuds', coalesce(nds.j, '[]'),
    'axes', coalesce(axs.j, '[]'),
    'decisif', (select code from noeuds where id = v.decisif_id),
    'exigences', case when exi.j is not null then jsonb_build_object('minimumParRegroupement', exi.j) end,
    'jokers', case when v.quota_jokers is not null then jsonb_build_object('quota', v.quota_jokers, 'autorises', coalesce(jok.j, '[]')) end,
    'provenance', case when p_libelles and v.provenance is not null then jsonb_build_object('grille', v.provenance) end))
  from v, bar, nds, axs, jok, exi
$$;

-- Sources d'un participant (SourcesParticipant, par ids format.ts).
create function sources_participant(p_version uuid, p_participant uuid) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'cases', coalesce((select jsonb_agg(jsonb_build_array(n.code, c.valeur) order by n.code)
                       from cases c join noeuds n on n.id = c.noeud_id
                       where c.version_id = p_version and c.participant_id = p_participant and c.valeur is not null), '[]'),
    'nonEvaluations', coalesce((select jsonb_agg(jsonb_build_object('noeud', n.code, 'axe', a.code) order by n.code, a.code)
                       from non_evaluations ne join noeuds n on n.id = ne.noeud_id left join axes a on a.id = ne.axe_id
                       where ne.version_id = p_version and ne.participant_id = p_participant and ne.active), '[]'),
    'jokers', coalesce((select jsonb_agg(ja.code order by jp.id)
                       from jokers_poses jp join jokers_autorises ja on ja.id = jp.joker_id
                       where jp.version_id = p_version and jp.participant_id = p_participant), '[]'))
$$;

create function empreinte_dossier(p_version uuid, p_participant uuid) returns text language sql stable as $$
  select encode(sha256(convert_to(jsonb_build_object('structure', document_grille(p_version, false),
                                                     'sources', sources_participant(p_version, p_participant))::text, 'UTF8')), 'hex')
$$;

-- ============================================================== écritures (une transaction par appel)
-- Ordre : writeId déjà vu ? (même contenu → état courant ; sinon AZ422) ; verrou partagé du dossier (refus si
-- finalisé) ; validation ; upsert de l'état (version + 1) ; ligne d'historique. Auteur fourni par le serveur
-- applicatif depuis la session, jamais par le navigateur.

create function _dossier_ouvert(p_version uuid, p_participant uuid) returns void language plpgsql as $$
declare f boolean;
begin
  select finalise into f from finalisations where version_id = p_version and participant_id = p_participant for share;
  if not found then
    insert into finalisations (version_id, participant_id) values (p_version, p_participant) on conflict do nothing;
    select finalise into f from finalisations where version_id = p_version and participant_id = p_participant for share;
  end if;
  if f then
    raise exception using errcode = 'AZ423', message = 'dossier finalisé : écriture refusée';
  end if;
end $$;

create function ecrire_note(p_write_id uuid, p_version uuid, p_participant uuid, p_noeud text, p_valeur double precision,
                            p_auteur uuid, p_horodatage timestamptz default now(),
                            out version int, out valeur double precision, out rejeu boolean)
language plpgsql as $$
declare
  h historique;
  n_id uuid; b_id uuid; b_type text; b_pre text; b_min numeric; b_max numeric; b_pas numeric;
  nb_paliers int; avant double precision;
begin
  select n.id, b0.id, b0.type, b0.prereglage, b0.min, b0.max, b0.pas into n_id, b_id, b_type, b_pre, b_min, b_max, b_pas
  from noeuds n join baremes b0 on b0.id = n.bareme_id
  where n.version_id = p_version and n.code = p_noeud;
  if n_id is null then
    raise exception using errcode = 'AZ400', message = 'nœud sans case : ' || p_noeud;
  end if;
  select * into h from historique where write_id = p_write_id;
  if found then
    if h.nature = 'note' and h.version_id = p_version and h.participant_id = p_participant and h.noeud_id = n_id
       and h.valeur is not distinct from p_valeur and h.auteur_id = p_auteur then
      select c.version, c.valeur into version, valeur from cases c
      where c.version_id = p_version and c.participant_id = p_participant and c.noeud_id = n_id;
      rejeu := true;
      return;
    end if;
    raise exception using errcode = 'AZ422', message = 'writeId déjà utilisé pour un autre contenu';
  end if;
  perform _dossier_ouvert(p_version, p_participant);
  if p_valeur is not null then
    if b_type = 'ordinal' then
      select count(*) into nb_paliers from paliers where bareme_id = b_id;
      if b_pre = 'binaire' then nb_paliers := 2; end if;
      if p_valeur <> trunc(p_valeur) or p_valeur < 0 or p_valeur >= nb_paliers then
        raise exception using errcode = 'AZ400', message = 'rang hors barème';
      end if;
    elsif p_valeur < b_min or p_valeur > b_max or abs((p_valeur - b_min) / b_pas - round((p_valeur - b_min) / b_pas)) > 1e-9 then
      raise exception using errcode = 'AZ400', message = 'note hors barème';
    end if;
  end if;
  select c.valeur into avant from cases c
  where c.version_id = p_version and c.participant_id = p_participant and c.noeud_id = n_id for update;
  insert into cases as c (version_id, participant_id, noeud_id, valeur, version, auteur_id, modifie_le)
  values (p_version, p_participant, n_id, p_valeur, 1, p_auteur, p_horodatage)
  on conflict (version_id, participant_id, noeud_id) do update
    set valeur = excluded.valeur, version = c.version + 1, auteur_id = excluded.auteur_id, modifie_le = excluded.modifie_le
  returning c.version into version;
  insert into historique (write_id, version_id, participant_id, nature, noeud_id, valeur, valeur_avant, version, auteur_id, horodatage)
  values (p_write_id, p_version, p_participant, 'note', n_id, p_valeur, avant, version, p_auteur, p_horodatage);
  valeur := p_valeur;
  rejeu := false;
end $$;

create function ecrire_commentaire(p_write_id uuid, p_version uuid, p_participant uuid, p_noeud text, p_texte text,
                                   p_auteur uuid, p_horodatage timestamptz default now(),
                                   out version int, out rejeu boolean)
language plpgsql as $$
declare h historique; n_id uuid; avant text;
begin
  select id into n_id from noeuds where version_id = p_version and code = p_noeud;
  if n_id is null then raise exception using errcode = 'AZ400', message = 'nœud inconnu : ' || p_noeud; end if;
  select * into h from historique where write_id = p_write_id;
  if found then
    if h.nature = 'commentaire' and h.version_id = p_version and h.participant_id = p_participant and h.noeud_id = n_id
       and h.texte is not distinct from p_texte and h.auteur_id = p_auteur then
      select c.version into version from commentaires c
      where c.version_id = p_version and c.participant_id = p_participant and c.noeud_id = n_id;
      rejeu := true; return;
    end if;
    raise exception using errcode = 'AZ422', message = 'writeId déjà utilisé pour un autre contenu';
  end if;
  perform _dossier_ouvert(p_version, p_participant);
  select c.texte into avant from commentaires c
  where c.version_id = p_version and c.participant_id = p_participant and c.noeud_id = n_id for update;
  insert into commentaires as c (version_id, participant_id, noeud_id, texte, version, auteur_id, modifie_le)
  values (p_version, p_participant, n_id, p_texte, 1, p_auteur, p_horodatage)
  on conflict (version_id, participant_id, noeud_id) do update
    set texte = excluded.texte, version = c.version + 1, auteur_id = excluded.auteur_id, modifie_le = excluded.modifie_le
  returning c.version into version;
  insert into historique (write_id, version_id, participant_id, nature, noeud_id, texte, texte_avant, version, auteur_id, horodatage)
  values (p_write_id, p_version, p_participant, 'commentaire', n_id, p_texte, avant, version, p_auteur, p_horodatage);
  rejeu := false;
end $$;

create function ecrire_non_evaluation(p_write_id uuid, p_version uuid, p_participant uuid, p_noeud text, p_axe text,
                                      p_active boolean, p_auteur uuid, p_horodatage timestamptz default now(),
                                      out version int, out rejeu boolean)
language plpgsql as $$
declare h historique; n_id uuid; a_id uuid;
begin
  select id into n_id from noeuds where version_id = p_version and code = p_noeud;
  if n_id is null then raise exception using errcode = 'AZ400', message = 'nœud inconnu : ' || p_noeud; end if;
  if p_axe is not null then
    select id into a_id from axes where version_id = p_version and code = p_axe;
    if a_id is null then raise exception using errcode = 'AZ400', message = 'axe inconnu : ' || p_axe; end if;
  end if;
  select * into h from historique where write_id = p_write_id;
  if found then
    if h.nature = 'nonEvaluation' and h.version_id = p_version and h.participant_id = p_participant and h.noeud_id = n_id
       and h.axe_id is not distinct from a_id and h.active = p_active and h.auteur_id = p_auteur then
      select ne.version into version from non_evaluations ne
      where ne.version_id = p_version and ne.participant_id = p_participant and ne.noeud_id = n_id and ne.axe_id is not distinct from a_id;
      rejeu := true; return;
    end if;
    raise exception using errcode = 'AZ422', message = 'writeId déjà utilisé pour un autre contenu';
  end if;
  perform _dossier_ouvert(p_version, p_participant);
  insert into non_evaluations as ne (version_id, participant_id, noeud_id, axe_id, active, version, auteur_id, modifie_le)
  values (p_version, p_participant, n_id, a_id, p_active, 1, p_auteur, p_horodatage)
  on conflict (version_id, participant_id, noeud_id, axe_id) do update
    set active = excluded.active, version = ne.version + 1, auteur_id = excluded.auteur_id, modifie_le = excluded.modifie_le
  returning ne.version into version;
  insert into historique (write_id, version_id, participant_id, nature, noeud_id, axe_id, active, version, auteur_id, horodatage)
  values (p_write_id, p_version, p_participant, 'nonEvaluation', n_id, a_id, p_active, version, p_auteur, p_horodatage);
  rejeu := false;
end $$;

create function poser_joker(p_write_id uuid, p_version uuid, p_participant uuid, p_joker text, p_justification text,
                            p_auteur uuid, p_horodatage timestamptz default now(), out rejeu boolean)
language plpgsql as $$
declare h historique; j_id uuid; quota int; poses int;
begin
  select ja.id, vg.quota_jokers into j_id, quota from jokers_autorises ja join versions_grille vg on vg.id = ja.version_id
  where ja.version_id = p_version and ja.code = p_joker;
  if j_id is null then raise exception using errcode = 'AZ400', message = 'joker inconnu : ' || p_joker; end if;
  select * into h from historique where write_id = p_write_id;
  if found then
    if h.nature = 'joker' and h.participant_id = p_participant and h.joker_id = j_id and h.auteur_id = p_auteur then
      rejeu := true; return;
    end if;
    raise exception using errcode = 'AZ422', message = 'writeId déjà utilisé pour un autre contenu';
  end if;
  perform _dossier_ouvert(p_version, p_participant);
  select count(*) into poses from jokers_poses where version_id = p_version and participant_id = p_participant;
  if poses >= quota then raise exception using errcode = 'AZ400', message = 'quota de jokers atteint'; end if;
  insert into jokers_poses (id, version_id, participant_id, joker_id, justification, auteur_id, pose_le)
  values (p_write_id, p_version, p_participant, j_id, p_justification, p_auteur, p_horodatage);
  insert into historique (write_id, version_id, participant_id, nature, joker_id, justification, version, auteur_id, horodatage)
  values (p_write_id, p_version, p_participant, 'joker', j_id, p_justification, poses + 1, p_auteur, p_horodatage);
  rejeu := false;
end $$;

create function finaliser(p_write_id uuid, p_version uuid, p_participant uuid, p_erreurs text[], p_auteur uuid,
                          p_horodatage timestamptz default now(), out version int, out empreinte text)
language plpgsql as $$
declare f finalisations;
begin
  if exists (select 1 from historique where write_id = p_write_id) then
    select x.version, x.empreinte into version, empreinte from finalisations x
    where x.version_id = p_version and x.participant_id = p_participant;
    return;
  end if;
  insert into finalisations (version_id, participant_id) values (p_version, p_participant) on conflict do nothing;
  select * into f from finalisations x where x.version_id = p_version and x.participant_id = p_participant for update;
  if f.finalise then raise exception using errcode = 'AZ409', message = 'dossier déjà finalisé'; end if;
  empreinte := empreinte_dossier(p_version, p_participant);
  update finalisations x set finalise = true, version = x.version + 1, auteur_id = p_auteur, modifie_le = p_horodatage,
         erreurs_acceptees = p_erreurs, empreinte = finaliser.empreinte
  where x.version_id = p_version and x.participant_id = p_participant
  returning x.version into version;
  insert into historique (write_id, version_id, participant_id, nature, erreurs_acceptees, version, auteur_id, horodatage)
  values (p_write_id, p_version, p_participant, 'finalisation', p_erreurs, version, p_auteur, p_horodatage);
end $$;

create function rouvrir(p_write_id uuid, p_version uuid, p_participant uuid, p_auteur uuid,
                        p_horodatage timestamptz default now(), out version int)
language plpgsql as $$
begin
  if exists (select 1 from historique where write_id = p_write_id) then
    select x.version into version from finalisations x where x.version_id = p_version and x.participant_id = p_participant;
    return;
  end if;
  update finalisations x set finalise = false, version = x.version + 1, auteur_id = p_auteur, modifie_le = p_horodatage,
         empreinte = null
  where x.version_id = p_version and x.participant_id = p_participant and x.finalise
  returning x.version into version;
  if version is null then raise exception using errcode = 'AZ409', message = 'dossier non finalisé'; end if;
  insert into historique (write_id, version_id, participant_id, nature, version, auteur_id, horodatage)
  values (p_write_id, p_version, p_participant, 'reouverture', version, p_auteur, p_horodatage);
end $$;

-- ============================================================== copie complète (18 §9)
-- p_doc null : copie à l'identique (origine = id). Les finalisations ne sont pas copiées (dossiers ouverts).
-- Chaque élément repris est une écriture de la copie : auteur = qui copie, date = moment de la copie, version 1.
-- L'auteur et la date d'origine restent lisibles dans la grille source, via la correspondance.
-- L'historique source n'est pas recopié : la copie ouvre son propre historique par une ligne par élément repris
-- (copie_id renseigné, version 1), ce qui garde « état = rejeu de l'historique » vrai dans la copie.
create function copier_grille(p_source uuid, p_nom text, p_doc jsonb, p_auteur uuid, p_horodatage timestamptz default now())
returns uuid language plpgsql set jit = off as $$
declare
  src record; v uuid; cp uuid; identique boolean := p_doc is null;
begin
  select g.cours_id, g.nom, g.ouverture_saisie into src
  from versions_grille vg join grilles g on g.id = vg.grille_id where vg.id = p_source;
  if identique then
    p_doc := document_grille(p_source) || jsonb_build_object('provenance', jsonb_build_object('grille', src.nom));
  end if;
  v := importer_grille(null, src.cours_id, p_nom, p_doc, false, src.ouverture_saisie);
  if identique then
    update noeuds set origine = code where version_id = v;
    update axes set origine = code where version_id = v;
    update jokers_autorises set origine = code where version_id = v;
  end if;
  perform publier(v);
  insert into copies (source_version_id, cible_version_id, auteur_id, faite_le) values (p_source, v, p_auteur, p_horodatage)
  returning id into cp;

  -- correspondances persistées (nœuds, axes, jokers), y compris supprimés (cible null) et ajoutés (source null)
  insert into correspondances (copie_id, objet, source_id, cible_id)
  select cp, 'noeud', s.id, c.id from (select * from noeuds where version_id = p_source) s
  full join (select * from noeuds where version_id = v) c on c.origine = s.code
  union all
  select cp, 'axe', s.id, c.id from (select * from axes where version_id = p_source) s
  full join (select * from axes where version_id = v) c on c.origine = s.code
  union all
  select cp, 'joker', s.id, c.id from (select * from jokers_autorises where version_id = p_source) s
  full join (select * from jokers_autorises where version_id = v) c on c.origine = s.code;

  -- signature de barème : mêmes valeurs possibles
  create temp table if not exists _sig (bareme_id uuid primary key, sig text) on commit drop;
  truncate _sig;
  insert into _sig
  select b.id, concat_ws('|', b.type, b.prereglage, b.min, b.max, b.pas,
                         (select string_agg(p.valeur::text, ',' order by p.rang) from paliers p where p.bareme_id = b.id))
  from baremes b where b.version_id in (p_source, v);

  create temp table if not exists _cases (participant_id uuid, noeud_s uuid, code text, valeur double precision,
                                          cible uuid, sort text) on commit drop;
  truncate _cases;
  insert into _cases
  select c.participant_id, c.noeud_id, ns.code, c.valeur, nc.id,
         case when nc.id is null or nc.type <> 'donnees' or nc.bareme_id is null then 'casePerdue'
              when ss.sig is distinct from sc.sig then 'caseNonReprise' else 'reprise' end
  from cases c
  join noeuds ns on ns.id = c.noeud_id
  left join correspondances k on k.copie_id = cp and k.objet = 'noeud' and k.source_id = c.noeud_id
  left join noeuds nc on nc.id = k.cible_id
  left join _sig ss on ss.bareme_id = ns.bareme_id
  left join _sig sc on sc.bareme_id = nc.bareme_id
  where c.version_id = p_source and c.valeur is not null;

  insert into cases (version_id, participant_id, noeud_id, valeur, version, auteur_id, modifie_le)
  select v, participant_id, cible, valeur, 1, p_auteur, p_horodatage from _cases where sort = 'reprise';
  insert into historique (write_id, version_id, participant_id, nature, noeud_id, valeur, version, auteur_id, horodatage, copie_id)
  select uuidv7(), v, participant_id, 'note', cible, valeur, 1, p_auteur, p_horodatage, cp from _cases where sort = 'reprise';
  insert into copie_rapport (copie_id, type, participant_id, noeud, valeur)
  select cp, sort, participant_id, code, valeur from _cases where sort <> 'reprise';

  -- commentaires : repris si le nœud existe
  insert into commentaires (version_id, participant_id, noeud_id, texte, version, auteur_id, modifie_le)
  select v, c.participant_id, k.cible_id, c.texte, 1, p_auteur, p_horodatage
  from commentaires c join correspondances k on k.copie_id = cp and k.objet = 'noeud' and k.source_id = c.noeud_id
  where c.version_id = p_source and c.texte is not null and k.cible_id is not null;
  insert into historique (write_id, version_id, participant_id, nature, noeud_id, texte, version, auteur_id, horodatage, copie_id)
  select uuidv7(), v, participant_id, 'commentaire', noeud_id, texte, 1, p_auteur, p_horodatage, cp
  from commentaires where version_id = v;
  insert into copie_rapport (copie_id, type, participant_id, noeud)
  select cp, 'commentairePerdu', c.participant_id, n.code
  from commentaires c join noeuds n on n.id = c.noeud_id
  join correspondances k on k.copie_id = cp and k.objet = 'noeud' and k.source_id = c.noeud_id
  where c.version_id = p_source and c.texte is not null and k.cible_id is null;

  -- non-évaluations actives : sur le nœud correspondant ; axe supprimé → sans axe ; nœud supprimé → perdue
  insert into non_evaluations (version_id, participant_id, noeud_id, axe_id, active, version, auteur_id, modifie_le)
  select v, ne.participant_id, kn.cible_id, ka.cible_id, true, 1, p_auteur, p_horodatage
  from non_evaluations ne
  join correspondances kn on kn.copie_id = cp and kn.objet = 'noeud' and kn.source_id = ne.noeud_id
  left join correspondances ka on ka.copie_id = cp and ka.objet = 'axe' and ka.source_id = ne.axe_id
  where ne.version_id = p_source and ne.active and kn.cible_id is not null;
  insert into historique (write_id, version_id, participant_id, nature, noeud_id, axe_id, active, version, auteur_id, horodatage, copie_id)
  select uuidv7(), v, participant_id, 'nonEvaluation', noeud_id, axe_id, true, 1, p_auteur, p_horodatage, cp
  from non_evaluations where version_id = v;
  insert into copie_rapport (copie_id, type, participant_id, noeud, axe)
  select cp, case when kn.cible_id is null then 'nonEvaluationPerdue' else 'nonEvaluationSansAxe' end, ne.participant_id, n.code, a.code
  from non_evaluations ne join noeuds n on n.id = ne.noeud_id left join axes a on a.id = ne.axe_id
  join correspondances kn on kn.copie_id = cp and kn.objet = 'noeud' and kn.source_id = ne.noeud_id
  left join correspondances ka on ka.copie_id = cp and ka.objet = 'axe' and ka.source_id = ne.axe_id
  where ne.version_id = p_source and ne.active and (kn.cible_id is null or (ne.axe_id is not null and ka.cible_id is null));

  -- jokers : suivent la définition ; perdus si elle disparaît ou si son nœud n'est plus le correspondant
  insert into jokers_poses (id, version_id, participant_id, joker_id, justification, auteur_id, pose_le)
  select uuidv7(), v, jp.participant_id, kj.cible_id, jp.justification, p_auteur, p_horodatage
  from jokers_poses jp
  join jokers_autorises js on js.id = jp.joker_id
  join correspondances kj on kj.copie_id = cp and kj.objet = 'joker' and kj.source_id = jp.joker_id
  join jokers_autorises jc on jc.id = kj.cible_id
  join correspondances kn on kn.copie_id = cp and kn.objet = 'noeud' and kn.source_id = js.noeud_id and kn.cible_id = jc.noeud_id
  where jp.version_id = p_source
  order by jp.id;
  insert into historique (write_id, version_id, participant_id, nature, joker_id, justification, version, auteur_id, horodatage, copie_id)
  select uuidv7(), v, participant_id, 'joker', joker_id, justification,
         row_number() over (partition by participant_id order by id), p_auteur, p_horodatage, cp
  from jokers_poses where version_id = v;
  insert into copie_rapport (copie_id, type, participant_id, joker)
  select cp, 'jokerPerdu', jp.participant_id, js.code
  from jokers_poses jp join jokers_autorises js on js.id = jp.joker_id
  where jp.version_id = p_source
    and not exists (select 1 from correspondances kj join jokers_autorises jc on jc.id = kj.cible_id
                    join correspondances kn on kn.copie_id = cp and kn.objet = 'noeud' and kn.source_id = js.noeud_id
                                           and kn.cible_id = jc.noeud_id
                    where kj.copie_id = cp and kj.objet = 'joker' and kj.source_id = jp.joker_id);
  return v;
end $$;

-- Purge d'une grille (essais et brouillons) : seule voie qui lève les gardes append-only et structure.
create function purger_grille(p_grille uuid) returns void language plpgsql as $$
begin
  perform set_config('azimut.purge', 'on', true);
  delete from grilles where id = p_grille;
  perform set_config('azimut.purge', 'off', true);
end $$;
