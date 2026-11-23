// S9 — requêtes transverses, 50 mesures après 20 de chauffe chacune. bun run s9.ts
import { readFileSync } from "node:fs";
import { connexion, cours, grilleId, ICI, JEU, lireJson, mesurer, participants } from "./commun";

const sql = connexion();
const texte = readFileSync(`${ICI}/s9.sql`, "utf8");
const req = Object.fromEntries(texte.split("-- name: ").slice(1).map((b) => {
  const [nom, ...l] = b.split("\n");
  return [nom.trim(), l.join("\n").trim().replace(/;$/, "")];
}));
const attendu = lireJson(`${JEU}/attendu/compteurs.json`).S9;
const groupeB = cours.groupes.find((g: any) => g.nom === "Groupe B").id;

const rOk = await sql.unsafe(req.okko);
const okV2 = rOk.filter((r: any) => r.grille === "G3 V2" && Number(r.valeur) === 1).length;
const [rc] = await sql.unsafe(req.calcul, ["G3 V2", groupeB, "comp:communication"]);
const [rp] = await sql.unsafe(req.placement, ["G3 V2", groupeB, "reg:e4"]);
// Contrôle de la variante « hors NE » sur un cas où elle mord : groupe de Noé, reg:e3 (NE sur la case vide itineraire).
const noe = participants.find((p) => p.nom === "Noé")!;
const [rx] = await sql.unsafe(req.placement, ["G3 V2", noe.groupe, "reg:e3"]);
const ok =
  rOk.length === attendu.okKoToutesGrilles.lignes && okV2 === attendu.okKoToutesGrilles.okDansV2 &&
  Number(rc.feuilles) === attendu.casesVidesObjectifGroupe.parCalcul.feuilles && Number(rc.sans_note) === attendu.casesVidesObjectifGroupe.parCalcul.sansNote &&
  Number(rc.sans_note_hors_ne) === attendu.casesVidesObjectifGroupe.parCalcul.sansNoteEtNonCouvertes &&
  Number(rp.feuilles) === attendu.casesVidesObjectifGroupe.parPlacement.feuilles && Number(rp.sans_note) === attendu.casesVidesObjectifGroupe.parPlacement.sansNote &&
  Number(rp.sans_note_hors_ne) === attendu.casesVidesObjectifGroupe.parPlacement.sansNoteEtNonCouvertes;
console.log(JSON.stringify({ a: { lignes: rOk.length, okDansV2: okV2 }, b_calcul: rc, b_placement: rp, controle_hors_ne_groupe_noe_reg_e3: rx, conforme: ok }));

const ma = await mesurer(50, 20, () => sql.unsafe(req.okko));
const mc = await mesurer(50, 20, () => sql.unsafe(req.calcul, ["G3 V2", groupeB, "comp:communication"]));
const mp = await mesurer(50, 20, () => sql.unsafe(req.placement, ["G3 V2", groupeB, "reg:e4"]));
console.log(JSON.stringify({ a_okko: ma, b_calcul: mc, b_placement: mp }));
await sql.close();
