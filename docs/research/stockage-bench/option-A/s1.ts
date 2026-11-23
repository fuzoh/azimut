// S1 : lire tout ce qu'il faut pour calculer un participant. bun run s1.ts
import { readFileSync } from "node:fs";
import { connecter, cours, JEU, log, stats, versionDe } from "./commun";
import { canon, compile, comparer, resultats, versSources } from "./moteur";

const sql = connecter();
if (process.env.JIT === "off") await sql`set jit = off`;
const v = await versionDe(sql, "G3 V2");
const v1 = await versionDe(sql, "G3 V1");
const attendus = new Map(readFileSync(`${JEU}/attendu/resultats-g3-v2.ndjson`, "utf8").trim().split("\n").map((l) => JSON.parse(l)).map((r) => [r.participant, r]));
const ids = cours.participants.map((p: any) => p.id);

// Aller-retour du document : identique au fichier source, pour V1 et V2.
for (const [ver, f] of [[v, "g3-v2.json"], [v1, "g3-v1.json"]]) {
  const [r] = await sql`select document_grille(${ver}) g`;
  const fichier = JSON.parse(readFileSync(`${JEU}/grilles/${f}`, "utf8"));
  log(`document reconstruit = ${f} : ${JSON.stringify(canon(r.g)) === JSON.stringify(canon(fichier))}`);
}

// Variante (a) : structure relue à chaque lecture (1 requête : document + sources).
const lireA = async (p: string) => (await sql`select document_grille(${v}) g, sources_participant(${v}, ${p}) s`)[0];
// Variante (b) : structure en cache client, sources seules (1 requête).
const lireB = async (p: string) => (await sql`select sources_participant(${v}, ${p}) s`)[0];

async function mesurer(lire: (p: string) => Promise<any>) {
  for (let i = 0; i < 20; i++) await lire(ids[i % ids.length]);
  const ms: number[] = [];
  for (let i = 0; i < 200; i++) {
    const t = performance.now();
    await lire(ids[i % ids.length]);
    ms.push(performance.now() - t);
  }
  return stats(ms);
}

// Critère : les 40 participants, via (a) puis via (b).
let ecarts: string[] = [];
let tCompile = 0;
let planCache: any = null;
for (const p of ids) {
  const r = await lireA(p);
  const t = performance.now();
  const plan = compile(r.g);
  tCompile += performance.now() - t;
  planCache ??= plan;
  ecarts.push(...comparer(resultats(plan, versSources(plan, r.s)), attendus.get(p)));
  const rb = await lireB(p);
  ecarts.push(...comparer(resultats(planCache, versSources(planCache, rb.s)), attendus.get(p)));
}
log(`critère S1 (40 participants, variantes a et b) : ${ecarts.length === 0 ? "OK" : ecarts.slice(0, 10).join("; ")}`);
log(`compile() côté client, moyenne : ${(tCompile / ids.length).toFixed(2)} ms (hors mesure)`);
const a = await mesurer(lireA);
const b = await mesurer(lireB);
log("S1 (a) structure relue, 1 requête/lecture :", a);
log("S1 (b) structure en cache, 1 requête/lecture :", b);
const [taille] = await sql`select length(document_grille(${v})::text) doc, length(sources_participant(${v}, ${ids[10]})::text) src`;
log("taille texte JSON : document", taille.doc, "o, sources (participant généré)", taille.src, "o");
// Détail : document seul
const ms: number[] = [];
for (let i = 0; i < 70; i++) { const t = performance.now(); await sql`select document_grille(${v}) g`; if (i >= 20) ms.push(performance.now() - t); }
log("document_grille seul (50 lectures) :", stats(ms));
await sql.close();
