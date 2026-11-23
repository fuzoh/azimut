// S0 bis : chargement par le chemin d'écriture normal (b.ecrire, un appel et une transaction par écriture).
// BASE=stock_b_chemin bun run charger-chemin-normal.ts
import { readFileSync } from "node:fs";
import { connecter, cours, JEU, lireNdjson, maintenant, stats } from "./commun";
const sql = connecter();
const grilles = new Map<string, string>();
for (const g of cours.grilles) grilles.set(g.cle, g.id);
await sql.begin(async (tx) => {
  await tx`insert into b.cours values (${cours.cours.id}, ${cours}::jsonb)`;
  for (const g of cours.grilles) {
    const doc = JSON.parse(readFileSync(`${JEU}/${g.fichier}`, "utf8"));
    const [s] = await tx`insert into b.structure (id, doc) values (b.uuidv7(), ${doc}::jsonb) returning id`;
    await tx`insert into b.grille (id, cours_id, nom, structure_id, principale, ouverture_saisie) values (${g.id}, ${cours.cours.id}, ${g.cle}, ${s.id}, ${g.principale}, ${g.ouvertureSaisie})`;
    await tx`insert into b.dossier (grille_id, participant_id) select ${g.id}, (p->>'id')::uuid from b.cours c, jsonb_array_elements(c.doc->'participants') p`;
  }
});
const evs = [...lireNdjson(`${JEU}/evenements-g3-v1.ndjson`), ...lireNdjson(`${JEU}/evenements-g3-v2.ndjson`)];
const charge = (e: any) => e.nature === "note" ? { valeur: e.valeur } : e.nature === "commentaire" ? { texte: e.texte }
  : e.nature === "nonEvaluation" ? { noeud: e.noeud, axe: e.axe, active: e.active } : e.nature === "joker" ? { noeud: e.noeud, justification: e.justification }
  : { erreursAcceptees: e.erreursAcceptees };
const cle = (e: any) => e.nature === "nonEvaluation" ? `${e.noeud}|${e.axe ?? ""}` : e.nature === "joker" ? e.jokerDef : e.nature === "finalisation" ? "" : e.noeud;
const ms: number[] = [];
let erreurs = 0;
const t0 = maintenant();
for (const e of evs) {
  const t = maintenant();
  try { await sql`select * from b.ecrire(${grilles.get(e.grille)}, ${e.participant}, ${e.nature}, ${cle(e)}, ${charge(e)}::jsonb, ${e.writeId}, ${e.auteur}, ${e.horodatage}::timestamptz)`; }
  catch (x: any) { erreurs++; if (erreurs < 5) console.error(x.message, e.nature, e.participant); }
  ms.push(maintenant() - t);
}
console.log(JSON.stringify({ ecritures: evs.length, erreurs, total_ms: +(maintenant() - t0).toFixed(0), parEcriture: stats(ms) }));
await sql.close();
