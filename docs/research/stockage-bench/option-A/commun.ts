// Outils communs aux scénarios de l'option A.
import { SQL } from "bun";
import { readFileSync } from "node:fs";

export const JEU = `${import.meta.dir}/../jeu`;
export const NOYAU = `${import.meta.dir}/../../../../prototype/src/noyau`;
export const URL = "postgres://postgres@localhost:55432/stock_a?host=/var/lib/postgresql/azimut-essai";
export const connecter = () => new SQL(URL, { max: 1 });
export const cours = JSON.parse(readFileSync(`${JEU}/cours.json`, "utf8"));
export const formateur = (totem: string) => cours.formateurs.find((f: any) => f.totem === totem).id;
export const participant = (nom: string) => cours.participants.find((p: any) => p.nom === nom).id;

export async function versionDe(sql: SQL, nomGrille: string): Promise<string> {
  const [r] = await sql`select vg.id from versions_grille vg join grilles g on g.id = vg.grille_id where g.nom = ${nomGrille}`;
  return r.id;
}

export function stats(ms: number[]) {
  const t = [...ms].sort((a, b) => a - b);
  const med = t.length % 2 ? t[(t.length - 1) / 2] : (t[t.length / 2 - 1] + t[t.length / 2]) / 2;
  const p95 = t[Math.ceil(0.95 * t.length) - 1];
  return { n: t.length, mediane: +med.toFixed(3), p95: +p95.toFixed(3), min: +t[0].toFixed(3), max: +t[t.length - 1].toFixed(3) };
}

/** Export de l'état au format attendu/etat-*.json. `s` = schéma des tables d'état (azimut ou rejeu). */
export async function exporterEtat(sql: SQL, version: string, s = "azimut") {
  const rows = await sql.unsafe(
    `select p.id participant, p.nom,
      coalesce((select jsonb_object_agg(n.code, jsonb_build_object('valeur', c.valeur, 'ecritures', c.version))
                from ${s}.cases c join azimut.noeuds n on n.id = c.noeud_id
                where c.version_id = $1 and c.participant_id = p.id and c.valeur is not null), '{}') notes,
      coalesce((select jsonb_object_agg(n.code, jsonb_build_object('texte', c.texte, 'ecritures', c.version))
                from ${s}.commentaires c join azimut.noeuds n on n.id = c.noeud_id
                where c.version_id = $1 and c.participant_id = p.id and c.texte is not null), '{}') commentaires,
      coalesce((select jsonb_agg(n.code order by n.code) from ${s}.cases c join azimut.noeuds n on n.id = c.noeud_id
                where c.version_id = $1 and c.participant_id = p.id and c.valeur is null), '[]') "notesEffacees",
      coalesce((select jsonb_agg(jsonb_build_object('noeud', n.code, 'axe', a.code)) from ${s}.non_evaluations ne
                join azimut.noeuds n on n.id = ne.noeud_id left join azimut.axes a on a.id = ne.axe_id
                where ne.version_id = $1 and ne.participant_id = p.id and ne.active), '[]') "nonEvaluations",
      coalesce((select jsonb_agg(jsonb_build_object('jokerDef', ja.code, 'justification', jp.justification,
                       'auteur', jp.auteur_id, 'horodatage', jp.pose_le) order by jp.id)
                from ${s}.jokers_poses jp join azimut.jokers_autorises ja on ja.id = jp.joker_id
                where jp.version_id = $1 and jp.participant_id = p.id), '[]') jokers,
      (select jsonb_build_object('auteur', f.auteur_id, 'horodatage', f.modifie_le, 'erreursAcceptees', to_jsonb(f.erreurs_acceptees))
       from ${s}.finalisations f where f.version_id = $1 and f.participant_id = p.id and f.finalise) finalisation
     from azimut.participants p order by p.id`,
    [version],
  );
  return rows.map((r: any) => ({ ...r }));
}

/** md5 du dump trié des saisies (état + historique) d'une version, ou de toutes si null. */
export async function md5Saisies(sql: SQL, version: string | null = null) {
  const [r] = await sql`
    select md5(coalesce((select string_agg(t::text, '|' order by t::text) from cases t where ${version}::uuid is null or version_id = ${version}), '')) cases,
           md5(coalesce((select string_agg(t::text, '|' order by t::text) from commentaires t where ${version}::uuid is null or version_id = ${version}), '')) commentaires,
           md5(coalesce((select string_agg(t::text, '|' order by t::text) from non_evaluations t where ${version}::uuid is null or version_id = ${version}), '')) non_evaluations,
           md5(coalesce((select string_agg(t::text, '|' order by t::text) from jokers_poses t where ${version}::uuid is null or version_id = ${version}), '')) jokers,
           md5(coalesce((select string_agg(t::text, '|' order by t::text) from finalisations t where ${version}::uuid is null or version_id = ${version}), '')) finalisations,
           md5(coalesce((select string_agg(t::text, '|' order by t::text) from historique t where ${version}::uuid is null or version_id = ${version}), '')) historique,
           (select count(*)::int from historique where ${version}::uuid is null or version_id = ${version}) lignes_historique`;
  return { ...r };
}

export const journal: string[] = [];
export function log(...a: any[]) {
  const l = a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" ");
  console.log(l);
}
