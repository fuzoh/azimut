-- Option C — HYBRIDE : structure de grille = document jsonb immuable par version (format.ts tel quel, haché) ;
-- saisies = lignes (état courant) + historique append-only écrit dans la même transaction.
-- PostgreSQL 16. Tout vit dans le schéma `azimut`.
\set ON_ERROR_STOP on
create schema azimut;
set search_path = azimut;

-- ------------------------------------------------------------------ utilitaires
-- UUIDv7 (PG16 n'a pas uuidv7()) : 48 bits de millisecondes + aléa, bits de version 0111 et variante 10.
create function uuid_v7() returns uuid language sql volatile as $$
  select encode(set_bit(set_bit(overlay(uuid_send(gen_random_uuid())
           placing substring(int8send((extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
           from 1 for 6), 52, 1), 53, 1), 'hex')::uuid
$$;

-- Garde : tables append-only et versions immuables. Une purge explicite (suppression d'une copie d'essai)
-- passe par `set local azimut.purge = 'on'`.
create function interdire_modification() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and current_setting('azimut.purge', true) = 'on' then return old; end if;
  raise exception '% interdit sur %', tg_op, tg_table_name using errcode = 'P0001';
end $$;

create type nature_ecriture as enum ('note', 'commentaire', 'nonEvaluation', 'joker', 'finalisation', 'libelle');

-- ------------------------------------------------------------------ données maîtres
create table utilisateurs (
  id    uuid primary key,
  totem text not null
);
create table cours (
  id    uuid primary key,
  nom   text not null,
  debut timestamptz not null,
  fin   timestamptz not null
);
create table groupes (
  id       uuid primary key,
  cours_id uuid not null references cours,
  nom      text not null,
  referent uuid references utilisateurs
);
create table participants (
  id        uuid primary key,
  cours_id  uuid not null references cours,
  nom       text not null,
  groupe_id uuid references groupes
);
create index participants_groupe on participants (groupe_id);

-- ------------------------------------------------------------------ grilles et versions de structure
create table grilles (
  id               uuid primary key,
  cours_id         uuid not null references cours,
  cle              text not null,                       -- « G3 V2 »
  principale       boolean not null default false,
  etat             text not null default 'brouillon' check (etat in ('brouillon', 'saisie', 'archivee')),
  version_saisie   integer,                             -- version de structure ouverte à la saisie (une seule)
  ouverture_saisie timestamptz,
  copiee_de        uuid references grilles,
  unique (cours_id, cle),
  check (etat = 'brouillon' or version_saisie is not null)
);

create table grille_versions (
  grille_id  uuid not null references grilles,
  version    integer not null,
  structure  jsonb not null,                            -- Grille de format.ts, tel quel
  hachage    bytea not null,                            -- sha256(structure::text), calculé par le trigger
  cles       jsonb not null,                            -- index dérivé (nœuds, axes, jokers), calculé par le trigger
  cree_le    timestamptz not null default now(),
  cree_par   uuid references utilisateurs,
  primary key (grille_id, version)
);
alter table grilles add foreign key (id, version_saisie) references grille_versions (grille_id, version)
  deferrable initially deferred;

-- Index dérivé du document : n = {id: {t type, b barème, s signature du barème, k nb de rangs (ordinal),
-- min/max/pas (numérique), bin (binaire)}}, a = [ids d'axes], j = {jokerDef: nœud}.
create function avant_insertion_version() returns trigger language plpgsql as $$
declare etat_grille text;
begin
  select etat into etat_grille from grilles where id = new.grille_id;
  if etat_grille <> 'brouillon' then
    raise exception 'STRUCTURE_FIGEE : la grille % est ouverte, toute modification du calcul passe par une copie', new.grille_id
      using errcode = 'P0001';
  end if;
  new.hachage := sha256(convert_to(new.structure::text, 'UTF8'));
  select jsonb_build_object(
    'n', (select jsonb_object_agg(n ->> 'id', jsonb_strip_nulls(jsonb_build_object(
            't', n ->> 'type',
            'b', n ->> 'bareme',
            's', case b ->> 'type'
                   when 'ordinal' then 'o:' || coalesce(b ->> 'prereglage', '') || ':' || coalesce((select string_agg(p ->> 'valeur', ',') from jsonb_array_elements(b -> 'paliers') p), '')
                   when 'numerique' then 'n:' || (b ->> 'min') || ':' || (b ->> 'max') || ':' || (b ->> 'pas') end,
            'k', case when b ->> 'type' = 'ordinal' then coalesce(jsonb_array_length(b -> 'paliers'), 2) end,
            'min', case when b ->> 'type' = 'numerique' then b -> 'min' end,
            'max', case when b ->> 'type' = 'numerique' then b -> 'max' end,
            'pas', case when b ->> 'type' = 'numerique' then b -> 'pas' end,
            'bin', case when b ->> 'prereglage' = 'binaire' then true end)))
          from jsonb_array_elements(new.structure -> 'noeuds') n
          left join jsonb_array_elements(new.structure -> 'baremes') b on b ->> 'id' = n ->> 'bareme'),
    'a', (select coalesce(jsonb_agg(a ->> 'id'), '[]') from jsonb_array_elements(new.structure -> 'axes') a),
    'j', (select coalesce(jsonb_object_agg(j ->> 'id', j ->> 'noeud'), '{}')
          from jsonb_array_elements(coalesce(new.structure -> 'jokers' -> 'autorises', '[]')) j))
  into new.cles;
  return new;
end $$;
create trigger grille_versions_calcul before insert on grille_versions
  for each row execute function avant_insertion_version();
create trigger grille_versions_immuables before update or delete on grille_versions
  for each row execute function interdire_modification();

-- Libellés corrigés après l'ouverture (25 §2.3) : surcouche de présentation, hors document haché.
create table libelles (
  grille_id  uuid not null references grilles,
  noeud      text not null,
  libelle    text not null,
  version    integer not null,
  write_id   uuid not null,
  auteur     uuid not null references utilisateurs,
  horodatage timestamptz not null,
  primary key (grille_id, noeud)
);

-- ------------------------------------------------------------------ saisies : état courant (une ligne par clé)
-- Case = participant × nœud de données à barème (une occurrence est un nœud distinct).
create table cases (
  grille_id      uuid not null references grilles,
  participant_id uuid not null references participants,
  noeud          text not null,
  valeur         numeric,                -- ordinal : rang du palier (0..k-1) ; numérique : la note ; null = effacée
  version        integer not null,       -- attribuée par le serveur ; = nombre d'écritures de la case
  write_id       uuid not null,
  auteur         uuid not null references utilisateurs,
  horodatage     timestamptz not null,
  primary key (grille_id, participant_id, noeud)
);
create table commentaires (
  grille_id      uuid not null references grilles,
  participant_id uuid not null references participants,
  noeud          text not null,          -- tout nœud (données, commentaire seul, calcul, regroupement)
  texte          text,                   -- null = effacé
  version        integer not null,
  write_id       uuid not null,
  auteur         uuid not null references utilisateurs,
  horodatage     timestamptz not null,
  primary key (grille_id, participant_id, noeud)
);
-- Non-évaluation d'une case ou d'un regroupement (dispense) : une seule ligne, jamais dépliée en feuilles.
create table non_evaluations (
  grille_id      uuid not null references grilles,
  participant_id uuid not null references participants,
  noeud          text not null,
  axe            text not null default '',   -- '' = axe principal (format.ts : axe absent)
  active         boolean not null,           -- false = retirée (la ligne reste pour la continuité des versions)
  version        integer not null,
  write_id       uuid not null,
  auteur         uuid not null references utilisateurs,
  horodatage     timestamptz not null,
  primary key (grille_id, participant_id, noeud, axe)
);
create table jokers_poses (
  id             uuid primary key,
  grille_id      uuid not null references grilles,
  participant_id uuid not null references participants,
  joker_def      text not null,
  noeud          text not null,
  justification  text not null,
  actif          boolean not null default true,
  version        integer not null,
  write_id       uuid not null,
  auteur         uuid not null references utilisateurs,
  horodatage     timestamptz not null
);
create index jokers_participant on jokers_poses (grille_id, participant_id);
-- Finalisation par participant, rattachée à la version de structure et à son hachage.
create table finalisations (
  grille_id         uuid not null references grilles,
  participant_id    uuid not null references participants,
  etat              text not null check (etat in ('finalise', 'rouvert')),
  version_structure integer not null,
  hachage           bytea not null,
  erreurs_acceptees text[] not null default '{}',
  version           integer not null,
  write_id          uuid not null,
  auteur            uuid not null references utilisateurs,
  horodatage        timestamptz not null,
  primary key (grille_id, participant_id),
  foreign key (grille_id, version_structure) references grille_versions (grille_id, version)
);

-- ------------------------------------------------------------------ historique append-only (clé = writeId)
create table historique (
  write_id       uuid primary key check (substr(write_id::text, 15, 1) = '7' and substr(write_id::text, 20, 1) in ('8', '9', 'a', 'b')),
  grille_id      uuid not null references grilles,
  participant_id uuid,                    -- null pour un libellé
  nature         nature_ecriture not null,
  noeud          text,
  axe            text,
  valeur         numeric,
  texte          text,                    -- commentaire, justification de joker, libellé
  active         boolean,                 -- non-évaluation, joker, finalisation (false = réouverture)
  joker_id       uuid,
  joker_def      text,
  erreurs        text[],
  version        integer not null,        -- version de la clé après cette écriture
  auteur         uuid not null references utilisateurs,
  horodatage     timestamptz not null,
  copie_de       uuid                     -- writeId source quand la ligne vient d'une copie de grille
);
create index historique_cle on historique (grille_id, participant_id, nature, noeud, version);
create trigger historique_append_only before update or delete on historique
  for each row execute function interdire_modification();

-- ------------------------------------------------------------------ copie de grille
create table correspondances (
  grille_source uuid not null references grilles,
  grille_cible  uuid not null references grilles,
  genre         text not null check (genre in ('noeud', 'axe', 'joker')),
  id_source     text,                     -- null : élément ajouté dans la cible
  id_cible      text,                     -- null : élément sans correspondant
  check (id_source is not null or id_cible is not null),
  unique (grille_cible, genre, id_source),
  unique (grille_cible, genre, id_cible)
);
create table rapports_copie (
  grille_cible   uuid not null references grilles,
  type           text not null,           -- casePerdue, caseNonReprise, commentairePerdu, nonEvaluationPerdue, jokerPerdu
  participant_id uuid not null,
  noeud          text,
  axe            text,
  valeur         numeric,
  texte          text,
  joker_def      text
);
create index rapports_copie_cible on rapports_copie (grille_cible);

-- ------------------------------------------------------------------ écritures (le « repository » en un aller-retour)
-- Contrôle commun : writeId v7, grille ouverte, dossier non finalisé (verrou partagé sur le participant,
-- que finaliser() prend en exclusif). Rend l'entrée de `cles` du nœud.
create function _controle(p_grille uuid, p_participant uuid, p_noeud text, p_write_id uuid) returns jsonb
language plpgsql as $$
declare r record;
begin
  if substr(p_write_id::text, 15, 1) <> '7' then
    raise exception 'ID_INVALIDE : writeId % n''est pas un UUIDv7', p_write_id using errcode = 'P0001';
  end if;
  perform 1 from participants where id = p_participant for key share;
  select g.etat, gv.cles -> 'n' -> p_noeud as cle, f.etat as etat_dossier into r
    from grilles g
    join grille_versions gv on gv.grille_id = g.id and gv.version = g.version_saisie
    left join finalisations f on f.grille_id = g.id and f.participant_id = p_participant
   where g.id = p_grille;
  if not found or r.etat <> 'saisie' then
    raise exception 'GRILLE_FERMEE' using errcode = 'P0001';
  end if;
  if r.etat_dossier = 'finalise' then
    raise exception 'DOSSIER_FINALISE : le dossier est verrouillé' using errcode = 'P0001';
  end if;
  if p_noeud is not null and r.cle is null then
    raise exception 'NOEUD_INCONNU : %', p_noeud using errcode = 'P0001';
  end if;
  return coalesce(r.cle, '{}');
end $$;

-- Rejeu d'un writeId : même contenu → version d'origine (déjà appliquée) ; contenu différent → ID_CONFLICT.
create function _rejeu(p_write_id uuid, p_attendu historique) returns integer language plpgsql as $$
declare h historique;
begin
  select * into h from historique where write_id = p_write_id;
  if not found then return null; end if;
  if (h.grille_id, h.participant_id, h.nature, h.noeud, h.axe, h.valeur, h.texte, h.active, h.joker_def)
     is not distinct from
     (p_attendu.grille_id, p_attendu.participant_id, p_attendu.nature, p_attendu.noeud, p_attendu.axe, p_attendu.valeur,
      p_attendu.texte, p_attendu.active, p_attendu.joker_def) then
    return h.version;
  end if;
  raise exception 'ID_CONFLICT : writeId % déjà utilisé pour une autre écriture', p_write_id using errcode = 'P0001';
end $$;

create function ecrire_note(p_grille uuid, p_participant uuid, p_noeud text, p_valeur numeric, p_write_id uuid,
                            p_auteur uuid, p_horodatage timestamptz default now(),
                            out version integer, out deja_appliquee boolean)
language plpgsql as $$
declare cle jsonb; att historique;
begin
  att.grille_id := p_grille; att.participant_id := p_participant; att.nature := 'note'; att.noeud := p_noeud; att.valeur := p_valeur;
  version := _rejeu(p_write_id, att);
  if version is not null then deja_appliquee := true; return; end if;
  cle := _controle(p_grille, p_participant, p_noeud, p_write_id);
  if cle ->> 'b' is null then
    raise exception 'PAS_DE_CASE : % n''a pas de barème', p_noeud using errcode = 'P0001';
  end if;
  if p_valeur is not null and (
       (cle ? 'k' and (p_valeur <> trunc(p_valeur) or p_valeur < 0 or p_valeur >= (cle ->> 'k')::int))
    or (cle ? 'max' and (p_valeur < (cle ->> 'min')::numeric or p_valeur > (cle ->> 'max')::numeric
                         or mod(p_valeur - (cle ->> 'min')::numeric, (cle ->> 'pas')::numeric) <> 0))) then
    raise exception 'VALEUR_HORS_BAREME : % pour %', p_valeur, p_noeud using errcode = 'P0001';
  end if;
  insert into cases as c (grille_id, participant_id, noeud, valeur, version, write_id, auteur, horodatage)
  values (p_grille, p_participant, p_noeud, p_valeur, 1, p_write_id, p_auteur, p_horodatage)
  on conflict (grille_id, participant_id, noeud) do update
     set valeur = excluded.valeur, version = c.version + 1, write_id = excluded.write_id,
         auteur = excluded.auteur, horodatage = excluded.horodatage
  returning c.version into version;
  insert into historique (write_id, grille_id, participant_id, nature, noeud, valeur, version, auteur, horodatage)
  values (p_write_id, p_grille, p_participant, 'note', p_noeud, p_valeur, version, p_auteur, p_horodatage);
  deja_appliquee := false;
end $$;

create function ecrire_commentaire(p_grille uuid, p_participant uuid, p_noeud text, p_texte text, p_write_id uuid,
                                   p_auteur uuid, p_horodatage timestamptz default now(),
                                   out version integer, out deja_appliquee boolean)
language plpgsql as $$
declare att historique;
begin
  att.grille_id := p_grille; att.participant_id := p_participant; att.nature := 'commentaire'; att.noeud := p_noeud; att.texte := p_texte;
  version := _rejeu(p_write_id, att);
  if version is not null then deja_appliquee := true; return; end if;
  perform _controle(p_grille, p_participant, p_noeud, p_write_id);
  insert into commentaires as c (grille_id, participant_id, noeud, texte, version, write_id, auteur, horodatage)
  values (p_grille, p_participant, p_noeud, p_texte, 1, p_write_id, p_auteur, p_horodatage)
  on conflict (grille_id, participant_id, noeud) do update
     set texte = excluded.texte, version = c.version + 1, write_id = excluded.write_id,
         auteur = excluded.auteur, horodatage = excluded.horodatage
  returning c.version into version;
  insert into historique (write_id, grille_id, participant_id, nature, noeud, texte, version, auteur, horodatage)
  values (p_write_id, p_grille, p_participant, 'commentaire', p_noeud, p_texte, version, p_auteur, p_horodatage);
  deja_appliquee := false;
end $$;

create function ecrire_non_evaluation(p_grille uuid, p_participant uuid, p_noeud text, p_axe text, p_active boolean,
                                      p_write_id uuid, p_auteur uuid, p_horodatage timestamptz default now(),
                                      out version integer, out deja_appliquee boolean)
language plpgsql as $$
declare cle jsonb; att historique; v_axe text := coalesce(p_axe, '');
begin
  att.grille_id := p_grille; att.participant_id := p_participant; att.nature := 'nonEvaluation'; att.noeud := p_noeud;
  att.axe := v_axe; att.active := p_active;
  version := _rejeu(p_write_id, att);
  if version is not null then deja_appliquee := true; return; end if;
  cle := _controle(p_grille, p_participant, p_noeud, p_write_id);
  if cle ->> 't' = 'donnees' and cle ->> 'b' is null then
    raise exception 'NON_EVALUABLE : % est un nœud de commentaire', p_noeud using errcode = 'P0001';
  end if;
  if v_axe <> '' and not exists (select 1 from grilles g join grille_versions gv on gv.grille_id = g.id and gv.version = g.version_saisie
                                  where g.id = p_grille and gv.cles -> 'a' ? v_axe) then
    raise exception 'AXE_INCONNU : %', v_axe using errcode = 'P0001';
  end if;
  insert into non_evaluations as c (grille_id, participant_id, noeud, axe, active, version, write_id, auteur, horodatage)
  values (p_grille, p_participant, p_noeud, v_axe, p_active, 1, p_write_id, p_auteur, p_horodatage)
  on conflict (grille_id, participant_id, noeud, axe) do update
     set active = excluded.active, version = c.version + 1, write_id = excluded.write_id,
         auteur = excluded.auteur, horodatage = excluded.horodatage
  returning c.version into version;
  insert into historique (write_id, grille_id, participant_id, nature, noeud, axe, active, version, auteur, horodatage)
  values (p_write_id, p_grille, p_participant, 'nonEvaluation', p_noeud, v_axe, p_active, version, p_auteur, p_horodatage);
  deja_appliquee := false;
end $$;

-- Pose d'un joker. Le quota et H5 (validité selon les résultats) relèvent du calcul, fait par le client et le domaine.
create function poser_joker(p_grille uuid, p_participant uuid, p_joker_id uuid, p_joker_def text, p_justification text,
                            p_write_id uuid, p_auteur uuid, p_horodatage timestamptz default now(),
                            out version integer, out deja_appliquee boolean)
language plpgsql as $$
declare v_noeud text; att historique;
begin
  att.grille_id := p_grille; att.participant_id := p_participant; att.nature := 'joker'; att.joker_def := p_joker_def;
  att.texte := p_justification; att.active := true;
  select h.noeud into att.noeud from historique h where h.write_id = p_write_id;
  version := _rejeu(p_write_id, att);
  if version is not null then deja_appliquee := true; return; end if;
  perform _controle(p_grille, p_participant, null, p_write_id);
  select gv.cles -> 'j' ->> p_joker_def into v_noeud
    from grilles g join grille_versions gv on gv.grille_id = g.id and gv.version = g.version_saisie where g.id = p_grille;
  if v_noeud is null then
    raise exception 'JOKER_INCONNU : %', p_joker_def using errcode = 'P0001';
  end if;
  insert into jokers_poses (id, grille_id, participant_id, joker_def, noeud, justification, actif, version, write_id, auteur, horodatage)
  values (p_joker_id, p_grille, p_participant, p_joker_def, v_noeud, p_justification, true, 1, p_write_id, p_auteur, p_horodatage);
  version := 1;
  insert into historique (write_id, grille_id, participant_id, nature, noeud, texte, active, joker_id, joker_def, version, auteur, horodatage)
  values (p_write_id, p_grille, p_participant, 'joker', v_noeud, p_justification, true, p_joker_id, p_joker_def, 1, p_auteur, p_horodatage);
  deja_appliquee := false;
end $$;

-- Finalisation (p_finaliser = true) ou réouverture (false). Rattache le dossier à la version de structure et à son hachage.
create function finaliser(p_grille uuid, p_participant uuid, p_finaliser boolean, p_erreurs text[], p_write_id uuid,
                          p_auteur uuid, p_horodatage timestamptz default now(),
                          out version integer, out deja_appliquee boolean)
language plpgsql as $$
declare att historique; g record;
begin
  att.grille_id := p_grille; att.participant_id := p_participant; att.nature := 'finalisation'; att.active := p_finaliser;
  version := _rejeu(p_write_id, att);
  if version is not null then deja_appliquee := true; return; end if;
  perform 1 from participants where id = p_participant for update;   -- exclut les écritures en vol sur ce participant
  select gr.etat, gr.version_saisie, gv.hachage into g
    from grilles gr join grille_versions gv on gv.grille_id = gr.id and gv.version = gr.version_saisie where gr.id = p_grille;
  if g.etat <> 'saisie' then raise exception 'GRILLE_FERMEE' using errcode = 'P0001'; end if;
  if p_finaliser and exists (select 1 from finalisations where grille_id = p_grille and participant_id = p_participant and etat = 'finalise') then
    raise exception 'DEJA_FINALISE' using errcode = 'P0001';
  end if;
  insert into finalisations as f (grille_id, participant_id, etat, version_structure, hachage, erreurs_acceptees, version, write_id, auteur, horodatage)
  values (p_grille, p_participant, case when p_finaliser then 'finalise' else 'rouvert' end, g.version_saisie, g.hachage,
          coalesce(p_erreurs, '{}'), 1, p_write_id, p_auteur, p_horodatage)
  on conflict (grille_id, participant_id) do update
     set etat = excluded.etat, version_structure = excluded.version_structure, hachage = excluded.hachage,
         erreurs_acceptees = excluded.erreurs_acceptees, version = f.version + 1, write_id = excluded.write_id,
         auteur = excluded.auteur, horodatage = excluded.horodatage
  returning f.version into version;
  insert into historique (write_id, grille_id, participant_id, nature, active, erreurs, version, auteur, horodatage)
  values (p_write_id, p_grille, p_participant, 'finalisation', p_finaliser, coalesce(p_erreurs, '{}'), version, p_auteur, p_horodatage);
  deja_appliquee := false;
end $$;

-- Correction d'un libellé (25 §2.3) : ne touche ni la structure hachée ni les saisies.
create function corriger_libelle(p_grille uuid, p_noeud text, p_libelle text, p_write_id uuid, p_auteur uuid,
                                 p_horodatage timestamptz default now(), out version integer, out deja_appliquee boolean)
language plpgsql as $$
declare att historique;
begin
  att.grille_id := p_grille; att.nature := 'libelle'; att.noeud := p_noeud; att.texte := p_libelle;
  version := _rejeu(p_write_id, att);
  if version is not null then deja_appliquee := true; return; end if;
  if not exists (select 1 from grilles g join grille_versions gv on gv.grille_id = g.id and gv.version = g.version_saisie
                  where g.id = p_grille and g.etat in ('brouillon', 'saisie') and gv.cles -> 'n' ? p_noeud) then
    raise exception 'NOEUD_INCONNU : %', p_noeud using errcode = 'P0001';
  end if;
  insert into libelles as l (grille_id, noeud, libelle, version, write_id, auteur, horodatage)
  values (p_grille, p_noeud, p_libelle, 1, p_write_id, p_auteur, p_horodatage)
  on conflict (grille_id, noeud) do update
     set libelle = excluded.libelle, version = l.version + 1, write_id = excluded.write_id,
         auteur = excluded.auteur, horodatage = excluded.horodatage
  returning l.version into version;
  insert into historique (write_id, grille_id, nature, noeud, texte, version, auteur, horodatage)
  values (p_write_id, p_grille, 'libelle', p_noeud, p_libelle, version, p_auteur, p_horodatage);
  deja_appliquee := false;
end $$;

-- Libellé affiché : règle unique pour tous les dossiers (finalisés ou non) = correction courante, sinon document.
create view libelles_affiches as
select g.id as grille_id, n ->> 'id' as noeud, coalesce(l.libelle, n ->> 'libelle') as libelle, l.libelle is not null as corrige
  from grilles g
  join grille_versions gv on gv.grille_id = g.id and gv.version = g.version_saisie
  cross join lateral jsonb_array_elements(gv.structure -> 'noeuds') n
  left join libelles l on l.grille_id = g.id and l.noeud = n ->> 'id';

-- ------------------------------------------------------------------ copie complète d'une grille avec ses données
-- Correspondance par `origine` (nœuds, axes, jokers). Case reprise si le nœud cible porte une case de même
-- signature de barème. Les éléments copiés repartent en version 1 avec une ligne d'historique chacun
-- (copie_de = writeId source) : l'historique source n'est pas recopié, il reste lisible via correspondances.
create function copier_grille(p_source uuid, p_cle text, p_structure jsonb, p_auteur uuid,
                              p_horodatage timestamptz default now()) returns uuid
language plpgsql as $$
declare v_cible uuid := uuid_v7(); v_cours uuid; cs jsonb; cc jsonb;
begin
  select g.cours_id, gv.cles into v_cours, cs
    from grilles g join grille_versions gv on gv.grille_id = g.id and gv.version = g.version_saisie where g.id = p_source;
  insert into grilles (id, cours_id, cle, etat, copiee_de) values (v_cible, v_cours, p_cle, 'brouillon', p_source);
  insert into grille_versions (grille_id, version, structure, cree_par) values (v_cible, 1, p_structure, p_auteur)
    returning cles into cc;
  update grilles set etat = 'saisie', version_saisie = 1, ouverture_saisie = p_horodatage where id = v_cible;

  -- correspondances : chaque élément source (apparié ou non) et chaque élément cible sans origine source
  with src(genre, id) as (
         select 'noeud', k from jsonb_object_keys(cs -> 'n') k
         union all select 'axe', a from jsonb_array_elements_text(cs -> 'a') a
         union all select 'joker', j from jsonb_object_keys(cs -> 'j') j),
       cib(genre, id, origine) as (
         select 'noeud', n ->> 'id', n ->> 'origine' from jsonb_array_elements(p_structure -> 'noeuds') n
         union all select 'axe', a ->> 'id', a ->> 'origine' from jsonb_array_elements(p_structure -> 'axes') a
         union all select 'joker', j ->> 'id', j ->> 'origine' from jsonb_array_elements(coalesce(p_structure -> 'jokers' -> 'autorises', '[]')) j)
  insert into correspondances (grille_source, grille_cible, genre, id_source, id_cible)
  select p_source, v_cible, coalesce(s.genre, c.genre), s.id, c.id
    from src s full join cib c on c.genre = s.genre and c.origine = s.id;

  -- cases reprises (writeId neufs tirés une fois dans un CTE matérialisé, partagé par l'état et l'historique)
  with src as materialized (
    select c.participant_id, m.id_cible as noeud, c.valeur, uuid_v7() as wid, c.write_id as wid_source
      from cases c join correspondances m on m.grille_cible = v_cible and m.genre = 'noeud' and m.id_source = c.noeud
     where c.grille_id = p_source and c.valeur is not null
       and cc -> 'n' -> m.id_cible ->> 's' = cs -> 'n' -> c.noeud ->> 's'),
  ins as (
    insert into cases (grille_id, participant_id, noeud, valeur, version, write_id, auteur, horodatage)
    select v_cible, participant_id, noeud, valeur, 1, wid, p_auteur, p_horodatage from src)
  insert into historique (write_id, grille_id, participant_id, nature, noeud, valeur, version, auteur, horodatage, copie_de)
  select wid, v_cible, participant_id, 'note', noeud, valeur, 1, p_auteur, p_horodatage, wid_source from src;

  insert into rapports_copie (grille_cible, type, participant_id, noeud, valeur)
  select v_cible, case when m.id_cible is null or cc -> 'n' -> m.id_cible ->> 'b' is null then 'casePerdue' else 'caseNonReprise' end,
         c.participant_id, c.noeud, c.valeur
    from cases c join correspondances m on m.grille_cible = v_cible and m.genre = 'noeud' and m.id_source = c.noeud
   where c.grille_id = p_source and c.valeur is not null
     and (m.id_cible is null or (cc -> 'n' -> m.id_cible ->> 's') is distinct from (cs -> 'n' -> c.noeud ->> 's'));

  -- commentaires
  with src as materialized (
    select c.participant_id, m.id_cible as noeud, c.texte, uuid_v7() as wid, c.write_id as wid_source
      from commentaires c join correspondances m on m.grille_cible = v_cible and m.genre = 'noeud' and m.id_source = c.noeud
     where c.grille_id = p_source and c.texte is not null and m.id_cible is not null),
  ins as (
    insert into commentaires (grille_id, participant_id, noeud, texte, version, write_id, auteur, horodatage)
    select v_cible, participant_id, noeud, texte, 1, wid, p_auteur, p_horodatage from src)
  insert into historique (write_id, grille_id, participant_id, nature, noeud, texte, version, auteur, horodatage, copie_de)
  select wid, v_cible, participant_id, 'commentaire', noeud, texte, 1, p_auteur, p_horodatage, wid_source from src;
  insert into rapports_copie (grille_cible, type, participant_id, noeud, texte)
  select v_cible, 'commentairePerdu', c.participant_id, c.noeud, c.texte
    from commentaires c join correspondances m on m.grille_cible = v_cible and m.genre = 'noeud' and m.id_source = c.noeud
   where c.grille_id = p_source and c.texte is not null and m.id_cible is null;

  -- non-évaluations actives (axe '' = principal ; sinon axe apparié) ; nœud ou axe supprimé → perdue et signalée
  with ne as (
    select n.*, m.id_cible as noeud_cible,
           case when n.axe = '' then '' else ma.id_cible end as axe_cible
      from non_evaluations n
      join correspondances m on m.grille_cible = v_cible and m.genre = 'noeud' and m.id_source = n.noeud
      left join correspondances ma on ma.grille_cible = v_cible and ma.genre = 'axe' and ma.id_source = n.axe
     where n.grille_id = p_source and n.active),
  ins as (
    insert into non_evaluations (grille_id, participant_id, noeud, axe, active, version, write_id, auteur, horodatage)
    select v_cible, participant_id, noeud_cible, axe_cible, true, 1, uuid_v7(), p_auteur, p_horodatage
      from ne where noeud_cible is not null and axe_cible is not null
    returning *),
  perdues as (
    insert into rapports_copie (grille_cible, type, participant_id, noeud, axe)
    select v_cible, 'nonEvaluationPerdue', participant_id, noeud, axe from ne where noeud_cible is null or axe_cible is null)
  insert into historique (write_id, grille_id, participant_id, nature, noeud, axe, active, version, auteur, horodatage, copie_de)
  select i.write_id, i.grille_id, i.participant_id, 'nonEvaluation', i.noeud, i.axe, true, 1, i.auteur, i.horodatage, ne.write_id
    from ins i join ne on ne.participant_id = i.participant_id and ne.noeud_cible = i.noeud and ne.axe_cible = i.axe;

  -- jokers actifs, suivis par définition
  with jk as (
    select j.*, m.id_cible as def_cible, uuid_v7() as nouvel_id
      from jokers_poses j join correspondances m on m.grille_cible = v_cible and m.genre = 'joker' and m.id_source = j.joker_def
     where j.grille_id = p_source and j.actif),
  ins as (
    insert into jokers_poses (id, grille_id, participant_id, joker_def, noeud, justification, actif, version, write_id, auteur, horodatage)
    select nouvel_id, v_cible, participant_id, def_cible, cc -> 'j' ->> def_cible, justification, true, 1, uuid_v7(), p_auteur, p_horodatage
      from jk where def_cible is not null
    returning *),
  perdus as (
    insert into rapports_copie (grille_cible, type, participant_id, joker_def)
    select v_cible, 'jokerPerdu', participant_id, joker_def from jk where def_cible is null)
  insert into historique (write_id, grille_id, participant_id, nature, noeud, texte, active, joker_id, joker_def, version, auteur, horodatage, copie_de)
  select i.write_id, i.grille_id, i.participant_id, 'joker', i.noeud, i.justification, true, i.id, i.joker_def, 1, i.auteur, i.horodatage, jk.write_id
    from ins i join jk on jk.nouvel_id = i.id;

  return v_cible;
end $$;

-- Suppression d'une grille d'essai (mesure de S5) : purge explicite, seule exception à l'append-only.
create function purger_grille(p_grille uuid) returns void language plpgsql as $$
begin
  perform set_config('azimut.purge', 'on', true);
  delete from historique where grille_id = p_grille;
  delete from rapports_copie where grille_cible = p_grille;
  delete from correspondances where grille_cible = p_grille;
  delete from cases where grille_id = p_grille;
  delete from commentaires where grille_id = p_grille;
  delete from non_evaluations where grille_id = p_grille;
  delete from jokers_poses where grille_id = p_grille;
  delete from finalisations where grille_id = p_grille;
  delete from libelles where grille_id = p_grille;
  update grilles set version_saisie = null, etat = 'brouillon' where id = p_grille;
  delete from grille_versions where grille_id = p_grille;
  delete from grilles where id = p_grille;
  perform set_config('azimut.purge', 'off', true);
end $$;
