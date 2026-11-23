// bun run exporter.ts "<grille>" <sortie.json> [schéma d'état]
import { writeFileSync } from "node:fs";
import { connecter, exporterEtat, versionDe } from "./commun";
const [grille, sortie, schema] = process.argv.slice(2);
const sql = connecter();
const etat = await exporterEtat(sql, await versionDe(sql, grille), schema ?? "azimut");
writeFileSync(sortie, JSON.stringify(etat, null, 1));
await sql.close();
