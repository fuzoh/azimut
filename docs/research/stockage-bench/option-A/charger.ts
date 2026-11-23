// S0 : chargement par le chemin d'écriture normal (une transaction par écriture, fonctions ecrire_*).
// bun run charger.ts
import { readFileSync } from "node:fs";
import { connecter, cours, JEU, log } from "./commun";

const sql = connecter();
const t0 = performance.now();
await sql.begin(async (tx) => {
  await tx`insert into cours values (${cours.cours.id}, ${cours.cours.nom}, ${cours.cours.debut}, ${cours.cours.fin})`;
  for (const f of cours.formateurs) await tx`insert into formateurs values (${f.id}, ${cours.cours.id}, ${f.totem})`;
  for (const g of cours.groupes) await tx`insert into groupes values (${g.id}, ${cours.cours.id}, ${g.nom}, ${g.referent})`;
  for (const p of cours.participants) await tx`insert into participants values (${p.id}, ${cours.cours.id}, ${p.nom}, ${p.groupe})`;
});
const versions: Record<string, string> = {};
for (const g of cours.grilles) {
  const doc = readFileSync(`${JEU}/${g.fichier}`, "utf8");
  const [r] = await sql`select importer_grille(${g.id}, ${cours.cours.id}, ${g.cle}, ${doc}::text::jsonb, ${g.principale}, ${g.ouvertureSaisie}) v`;
  await sql`select publier(${r.v})`;
  versions[g.cle] = r.v;
}
const t1 = performance.now();
log(`structures importées et publiées : ${(t1 - t0).toFixed(0)} ms`);

let n = 0;
for (const fichier of ["evenements-g3-v1.ndjson", "evenements-g3-v2.ndjson"]) {
  const lignes = readFileSync(`${JEU}/${fichier}`, "utf8").trim().split("\n");
  for (const l of lignes) {
    const e = JSON.parse(l);
    const v = versions[e.grille];
    switch (e.nature) {
      case "note":
        await sql`select * from ecrire_note(${e.writeId}, ${v}, ${e.participant}, ${e.noeud}, ${e.valeur}, ${e.auteur}, ${e.horodatage})`;
        break;
      case "commentaire":
        await sql`select * from ecrire_commentaire(${e.writeId}, ${v}, ${e.participant}, ${e.noeud}, ${e.texte}, ${e.auteur}, ${e.horodatage})`;
        break;
      case "nonEvaluation":
        await sql`select * from ecrire_non_evaluation(${e.writeId}, ${v}, ${e.participant}, ${e.noeud}, ${e.axe}, ${e.active}, ${e.auteur}, ${e.horodatage})`;
        break;
      case "joker":
        await sql`select * from poser_joker(${e.writeId}, ${v}, ${e.participant}, ${e.jokerDef}, ${e.justification}, ${e.auteur}, ${e.horodatage})`;
        break;
      case "finalisation":
        await sql`select * from finaliser(${e.writeId}, ${v}, ${e.participant}, ${e.erreursAcceptees}::text[], ${e.auteur}, ${e.horodatage})`;
        break;
      default:
        throw new Error(e.nature);
    }
    n++;
  }
}
const t2 = performance.now();
log(`écritures : ${n} en ${(t2 - t1).toFixed(0)} ms (${((t2 - t1) / n).toFixed(3)} ms/écriture)`);
log(`total S0 : ${(t2 - t0).toFixed(0)} ms`);
await sql.close();
