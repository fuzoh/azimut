// S6 — un dossier finalisé se relit à l'identique. bun run s6.ts
import { createHash } from "node:crypto";
import { compile, connexion, ecarts, formateur, grilleId, JEU, lireNdjson, participants, resultats, sourcesDe, structureIdentique } from "./commun";

const sql = connexion();
const G = grilleId("G3 V2");
const ULYSSE = "019e807a-ec7e-721d-bcc5-2915a69eac80";
const ARNICA = formateur("Arnica");
const attendu = lireNdjson(`${JEU}/attendu/resultats-g3-v2.ndjson`).find((r: any) => r.participant === ULYSSE);

// Structure de calcul = document sans libellés (ids, types, barèmes, fonctions, entrées, paramètres, placements, jokers).
const sansLibelles = (x: any): any =>
  Array.isArray(x) ? x.map(sansLibelles) : x && typeof x === "object"
    ? Object.fromEntries(Object.keys(x).sort().filter((k) => k !== "libelle").map((k) => [k, sansLibelles(x[k])])) : x;
async function exporter() {
  const [f] = await sql`select f.version_structure, encode(f.hachage, 'hex') as hachage, gv.structure
                          from azimut.finalisations f join azimut.grille_versions gv on gv.grille_id = f.grille_id and gv.version = f.version_structure
                         where f.grille_id = ${G} and f.participant_id = ${ULYSSE} and f.etat = 'finalise'`;
  const cases = await sql`select noeud, valeur::text from azimut.cases where grille_id = ${G} and participant_id = ${ULYSSE} and valeur is not null order by noeud`;
  const nes = await sql`select noeud, axe from azimut.non_evaluations where grille_id = ${G} and participant_id = ${ULYSSE} and active order by noeud, axe`;
  const jk = await sql`select joker_def from azimut.jokers_poses where grille_id = ${G} and participant_id = ${ULYSSE} and actif order by horodatage`;
  const sources = { cases: [...cases], nes: [...nes], jokers: [...jk] };
  const h = (o: any) => createHash("sha256").update(JSON.stringify(o)).digest("hex");
  const plan = compile(f.structure);
  const d = ecarts(resultats(plan, sourcesDe(plan, cases, nes, jk)), attendu);
  const [lib] = await sql`select libelle from azimut.libelles_affiches where grille_id = ${G} and noeud = 'e2'`;
  return { version: f.version_structure, hachageVersion: f.hachage, structureCalcul: h(sansLibelles(f.structure)), sources: h(sources), E: h([sansLibelles(f.structure), sources]), resultatsIdentiques: d.length === 0, libelleE2Affiche: lib.libelle };
}

const [fin] = await sql`select * from azimut.finaliser(${G}, ${ULYSSE}, true, '{}'::text[], ${Bun.randomUUIDv7()}, ${ARNICA})`;
const E1 = await exporter();
// (1) libellé
await sql`select * from azimut.corriger_libelle(${G}, 'e2', 'E2 Jeu (libellé corrigé)', ${Bun.randomUUIDv7()}, ${ARNICA})`;
// (2) copie à l'identique avec les données : structureIdentique du noyau (origine = id), libellés corrigés intégrés au document
const [src] = await sql`select gv.structure from azimut.grilles g join azimut.grille_versions gv on gv.grille_id = g.id and gv.version = g.version_saisie where g.id = ${G}`;
const libs = new Map((await sql`select noeud, libelle from azimut.libelles where grille_id = ${G}`).map((l: any) => [l.noeud, l.libelle]));
const ident = structureIdentique(src.structure, "G3 V2 (copie S6)");
for (const n of ident.noeuds) if (libs.has(n.id)) n.libelle = libs.get(n.id);
const t0 = performance.now();
const [cp] = await sql`select azimut.copier_grille(${G}, 'G3 V2 (copie S6)', ${ident}::jsonb, ${ARNICA}) as id`;
const dureeCopie = performance.now() - t0;
// (3) écriture pour un autre participant
const romuald = participants.find((p) => p.nom === "Romuald")!.id;
const [w3] = await sql`select * from azimut.ecrire_note(${G}, ${romuald}, 'gestion', 3, ${Bun.randomUUIDv7()}, ${ARNICA})`;
// (4) écriture sur Ulysse
let refus: string | null = null;
try {
  await sql`select * from azimut.ecrire_note(${G}, ${ULYSSE}, 'gestion', 0, ${Bun.randomUUIDv7()}, ${ARNICA})`;
} catch (e: any) {
  refus = e.message;
}
const E2 = await exporter();
const [copie] = await sql`select (select count(*) from azimut.cases where grille_id = ${cp.id} and participant_id = ${ULYSSE})::int as cases_ulysse_copie,
  (select count(*) from azimut.finalisations where grille_id = ${cp.id})::int as finalisations_copie,
  (select libelle from azimut.libelles_affiches where grille_id = ${cp.id} and noeud = 'e2') as libelle_e2_copie`;
console.log(JSON.stringify({ finalisation: fin, E1, E2, egalite: { structureCalcul: E1.structureCalcul === E2.structureCalcul, sources: E1.sources === E2.sources, E: E1.E === E2.E, version: E1.version === E2.version && E1.hachageVersion === E2.hachageVersion }, ecritureAutre: w3, refusUlysse: refus, copie: { id: cp.id, dureeMs: +dureeCopie.toFixed(1), ...copie } }, null, 1));
await sql.close();
