// S2 — note avec historique, version serveur, writeId idempotent. bun run s2.ts
import { compile, connexion, formateur, grilleId, md5Saisies, mesurer, participants } from "./commun";

const sql = connexion();
const G = grilleId("G3 V2");
const ROMUALD = "019e807a-ec7b-720a-b15f-731ba7609bb3";
const WID = "019f7000-0000-7000-8000-000000000002";
const ARNICA = formateur("Arnica");
const out: any = {};
const etatCase = async () => (await sql`select valeur, version, write_id from azimut.cases where grille_id = ${G} and participant_id = ${ROMUALD} and noeud = 'sr5'`)[0];
const nbHist = async () => (await sql`select count(*)::int as n from azimut.historique`)[0].n;
const ecrire = (v: number, wid: string) => sql`select * from azimut.ecrire_note(${G}, ${ROMUALD}, 'sr5', ${v}, ${wid}, ${ARNICA})`;

// (1)
const c0 = await etatCase();
const h0 = await nbHist();
out["1_v0"] = { valeur: Number(c0.valeur), version: c0.version };
// (2)
const [r2] = await ecrire(0, WID);
const c2 = await etatCase();
const [h2] = await sql`select count(*)::int as n from azimut.historique where write_id = ${WID}`;
out["2_ecriture"] = { reponse: r2, etat: { valeur: Number(c2.valeur), version: c2.version }, historiqueEnPlus: (await nbHist()) - h0, lignesAvecCeWriteId: h2.n, ok: c2.version === c0.version + 1 && (await nbHist()) - h0 === 1 && h2.n === 1 };
// (3)
const avant3 = await md5Saisies(sql);
const [r3] = await ecrire(0, WID);
const apres3 = await md5Saisies(sql);
out["3_rejeu_identique"] = { reponse: r3, md5Inchange: avant3.md5 === apres3.md5, lignes: apres3.lignes, memeVersion: r3.version === r2.version };
// (4)
let e4: string | null = null;
try {
  await ecrire(1, WID);
} catch (e: any) {
  e4 = e.message;
}
const apres4 = await md5Saisies(sql);
out["4_meme_writeId_autre_valeur"] = { erreur: e4, md5Inchange: apres4.md5 === avant3.md5 };
// (5) erreur après l'insertion d'historique, dans la même transaction
const avant5 = await md5Saisies(sql);
let e5: string | null = null;
try {
  await sql.begin(async (tx) => {
    await tx`select * from azimut.ecrire_note(${G}, ${ROMUALD}, 'sr5', 1, '019f7000-0000-7000-8000-000000000005', ${ARNICA})`;
    await tx`select 1 / 0`;
  });
} catch (e: any) {
  e5 = e.message;
}
const apres5 = await md5Saisies(sql);
out["5_erreur_dans_la_transaction"] = { erreur: e5, avant: avant5, apres: apres5, identique: avant5.md5 === apres5.md5 && avant5.lignes === apres5.lignes };

// (6) 220 cases différentes (20 de chauffe), writeId neufs (uuid_v7 côté client simulé par Bun.randomUUIDv7)
// Participants exclus : finalisés (Alice, David, Cassien), Ulysse (S6), Victorine (S3), Romuald.
const exclus = new Set(["Alice", "David", "Cassien", "Ulysse", "Victorine", "Romuald"]);
const [s] = await sql`select structure from azimut.grille_versions where grille_id = ${G}`;
const plan = compile(s.structure);
const feuilles = s.structure.noeuds.filter((n: any) => n.type === "donnees" && n.bareme);
const cibles: { p: string; n: string; v: number }[] = [];
for (const n of feuilles) for (const p of participants) if (!exclus.has(p.nom) && cibles.length < 220) cibles.push({ p: p.id, n: n.id, v: n.bareme === "ok-ko" ? 1 : 2 });
const h6 = await nbHist();
const m = await mesurer(200, 20, (i) => sql`select * from azimut.ecrire_note(${G}, ${cibles[i].p}, ${cibles[i].n}, ${cibles[i].v}, ${Bun.randomUUIDv7()}, ${ARNICA})`);
out["6_200_ecritures"] = { ...m, lignesHistoriqueEnPlus: (await nbHist()) - h6 };
console.log(JSON.stringify(out, null, 1));
void plan;
await sql.close();
