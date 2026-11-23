// S8 — rejeu depuis l'historique seul, comparaison EXCEPT dans les deux sens, export pour verifier.ts.
// bun run s8.ts
import { readFileSync, writeFileSync } from "node:fs";
import { connexion, exporterEtat, grilleId, ICI, participants } from "./commun";

const sql = connexion();
const rejeu = readFileSync(`${ICI}/s8.sql`, "utf8");
const comparaisons: [string, string][] = [
  ["cases", "grille_id, participant_id, noeud, valeur, version, write_id, auteur, horodatage"],
  ["commentaires", "grille_id, participant_id, noeud, texte, version, write_id, auteur, horodatage"],
  ["non_evaluations", "grille_id, participant_id, noeud, axe, active, version, write_id, auteur, horodatage"],
  ["jokers_poses", "id, grille_id, participant_id, joker_def, noeud, justification, actif, version, write_id, auteur, horodatage"],
  ["finalisations", "grille_id, participant_id, etat, erreurs_acceptees, version, write_id, auteur, horodatage"],
  ["libelles", "grille_id, noeud, libelle, version, write_id, auteur, horodatage"],
];
const durees: number[] = [];
let ecarts: Record<string, [number, number]> = {};
for (let i = 0; i < 6; i++) {
  await sql.unsafe("drop table if exists r_cases, r_commentaires, r_non_evaluations, r_jokers_poses, r_finalisations, r_libelles");
  const t0 = performance.now();
  await sql.unsafe(rejeu).simple();
  ecarts = {};
  for (const [t, cols] of comparaisons) {
    const [r] = await sql.unsafe(`select (select count(*) from (select ${cols} from pg_temp.r_${t} except all select ${cols} from azimut.${t}) a)::int as rejoue_moins_stocke,
                                         (select count(*) from (select ${cols} from azimut.${t} except all select ${cols} from pg_temp.r_${t}) b)::int as stocke_moins_rejoue`);
    ecarts[t] = [r.rejoue_moins_stocke, r.stocke_moins_rejoue];
  }
  durees.push(performance.now() - t0);
}
const [joris] = await sql`select count(*)::int as n from pg_temp.r_non_evaluations
  where participant_id = ${participants.find((p) => p.nom === "Joris")!.id} and noeud = 'e3' and active`;
const [lignes] = await sql`select (select count(*) from pg_temp.r_cases)::int as cases, (select count(*) from pg_temp.r_commentaires)::int as commentaires`;
for (const cle of ["G3 V1", "G3 V2"]) {
  const etat = await exporterEtat(sql, grilleId(cle), "pg_temp.r_");
  writeFileSync(`${ICI}/sorties/rejeu-${cle.replace(" ", "-").toLowerCase()}.json`, JSON.stringify(etat, null, 1));
}
console.log(JSON.stringify({ ecarts, jorisE3Active: joris.n, lignesRejouees: lignes, dureeRejeuEtComparaisonMs: durees.slice(1).map((d) => +d.toFixed(1)) }));
await sql.close();
