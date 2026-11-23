// S0 — base propre, schéma, données maîtres, grilles, puis rejeu des écritures par le chemin normal
// (une transaction et un appel de fonction d'écriture par événement, dans l'ordre du fichier).
// bun run charger.ts
import { $ } from "bun";
import { writeFileSync } from "node:fs";
import { BASE, connexion, cours, exporterEtat, grilleId, ICI, JEU, lireJson, lireNdjson } from "./commun";

const PSQL = ["-h", "/var/lib/postgresql/azimut-essai", "-p", "55432", "-U", "postgres"];
await $`psql ${PSQL} -d postgres -qc ${"drop database if exists " + BASE}`;
await $`psql ${PSQL} -d postgres -qc ${"create database " + BASE}`;
await $`psql ${PSQL} -d postgres -qc ${"alter database " + BASE + " set search_path = azimut, public"}`;
await $`psql ${PSQL} -d postgres -qc ${"alter database " + BASE + " set jit = off"}`;
await $`psql ${PSQL} -d ${BASE} -q -f ${ICI + "/schema.sql"}`;

const sql = connexion();
const t0 = performance.now();
const c = cours.cours;
await sql`insert into azimut.utilisateurs ${sql(cours.formateurs.map((f: any) => ({ id: f.id, totem: f.totem })))}`;
await sql`insert into azimut.cours (id, nom, debut, fin) values (${c.id}, ${c.nom}, ${c.debut}, ${c.fin})`;
await sql`insert into azimut.groupes ${sql(cours.groupes.map((g: any) => ({ id: g.id, cours_id: c.id, nom: g.nom, referent: g.referent })))}`;
await sql`insert into azimut.participants ${sql(cours.participants.map((p: any) => ({ id: p.id, cours_id: c.id, nom: p.nom, groupe_id: p.groupe })))}`;
for (const g of cours.grilles) {
  const structure = lireJson(`${JEU}/${g.fichier}`);
  await sql.begin(async (tx) => {
    await tx`insert into azimut.grilles (id, cours_id, cle, principale) values (${g.id}, ${c.id}, ${g.cle}, ${g.principale})`;
    await tx`insert into azimut.grille_versions (grille_id, version, structure, cree_le) values (${g.id}, 1, ${structure}::jsonb, ${g.ouvertureSaisie})`;
    await tx`update azimut.grilles set etat = 'saisie', version_saisie = 1, ouverture_saisie = ${g.ouvertureSaisie} where id = ${g.id}`;
  });
}
const tMaitres = performance.now() - t0;

const compte: Record<string, number> = {};
const t1 = performance.now();
for (const f of ["evenements-g3-v1.ndjson", "evenements-g3-v2.ndjson"]) {
  for (const e of lireNdjson(`${JEU}/${f}`)) {
    const g = grilleId(e.grille);
    const a = [g, e.participant];
    switch (e.nature) {
      case "note":
        await sql`select * from azimut.ecrire_note(${g}, ${e.participant}, ${e.noeud}, ${e.valeur}, ${e.writeId}, ${e.auteur}, ${e.horodatage})`;
        break;
      case "commentaire":
        await sql`select * from azimut.ecrire_commentaire(${g}, ${e.participant}, ${e.noeud}, ${e.texte}, ${e.writeId}, ${e.auteur}, ${e.horodatage})`;
        break;
      case "nonEvaluation":
        await sql`select * from azimut.ecrire_non_evaluation(${g}, ${e.participant}, ${e.noeud}, ${e.axe}, ${e.active}, ${e.writeId}, ${e.auteur}, ${e.horodatage})`;
        break;
      case "joker":
        await sql`select * from azimut.poser_joker(${g}, ${e.participant}, ${e.writeId}, ${e.jokerDef}, ${e.justification}, ${e.writeId}, ${e.auteur}, ${e.horodatage})`;
        break;
      case "finalisation":
        await sql`select * from azimut.finaliser(${g}, ${e.participant}, true, ${e.erreursAcceptees}::text[], ${e.writeId}, ${e.auteur}, ${e.horodatage})`;
        break;
    }
    compte[e.nature] = (compte[e.nature] ?? 0) + 1;
  }
}
const tEcritures = performance.now() - t1;
const [h] = await sql`select count(*)::int as n from azimut.historique`;
console.log(JSON.stringify({ maitresEtGrillesMs: +tMaitres.toFixed(1), ecrituresMs: +tEcritures.toFixed(1), ecritures: compte, lignesHistorique: h.n, msParEcriture: +(tEcritures / h.n).toFixed(3) }));

for (const cle of ["G3 V1", "G3 V2"]) {
  const etat = await exporterEtat(sql, grilleId(cle));
  writeFileSync(`${ICI}/sorties/etat-${cle.replace(" ", "-").toLowerCase()}.json`, JSON.stringify(etat, null, 1));
}
await sql.close();
