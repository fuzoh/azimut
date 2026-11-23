// Exporte l'état d'une grille au format attendu/etat-*.json.
// bun run exporter.ts "<nom grille>" <sortie.json> [--rejoue]   (--rejoue : depuis b.dossier_rejoue, c.-à-d. l'historique seul)
import { connecter, ecrireJson, exporterEtat } from "./commun";
const [nom, sortie, opt] = process.argv.slice(2);
const sql = connecter();
const src = opt === "--rejoue" ? sql`b.dossier_rejoue` : sql`b.dossier`;
const lignes = await sql`select d.participant_id, d.doc from ${src} d join b.grille g on g.id = d.grille_id where g.nom = ${nom}`;
ecrireJson(sortie, exporterEtat(lignes as any));
await sql.close();
