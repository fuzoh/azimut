// S6 : un dossier finalisé se relit à l'identique. bun run s6.ts
import { createHash } from "node:crypto";
import { comparerResultats, compile, connecter, formateur, grilleId, JEU, lireNdjson, MAIN, participant, resultats, sourcesDepuisDoc } from "./commun";
const { structureIdentique } = await import(`${MAIN}/prototype/src/noyau/copier.ts`);
const sql = connecter();
const G = grilleId("G3 V2");
const ulysse = participant("Ulysse");
const arnica = formateur("Arnica");
const att = lireNdjson(`${JEU}/attendu/resultats-g3-v2.ndjson`).find((x: any) => x.participant === ulysse);
const canon = (x: any): any => Array.isArray(x) ? x.map(canon) : x && typeof x === "object"
  ? Object.fromEntries(Object.keys(x).sort().filter((k) => k !== "libelle").map((k) => [k, canon(x[k])])) : x;
const sha = (x: any) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
async function exporter() {
  const [l] = await sql`select d.doc, s.id sid, s.doc structure, s.empreinte, g.structure_id gsid
    from b.dossier d join b.grille g on g.id = d.grille_id join b.structure s on s.id = (d.doc->'finalisation'->>'structure')::uuid
    where d.grille_id = ${G} and d.participant_id = ${ulysse}`;
  const calcul = canon({ ...l.structure, grille: undefined, source: undefined, provenance: undefined });
  const sources = {
    notes: Object.fromEntries(Object.entries<any>(l.doc.notes).filter(([, e]) => e.v !== null).map(([k, e]) => [k, e.v]).sort()),
    nonEvaluations: Object.values<any>(l.doc.nonEvaluations).filter((x) => x.active).map((x) => `${x.noeud}|${x.axe ?? ""}`).sort(),
    jokers: l.doc.jokers.map((j: any) => j.jokerDef),
  };
  const plan = compile(l.structure);
  return { structure: l.sid, rattacheeALaGrille: l.sid === l.gsid, empreinteStructure: l.empreinte,
    Ecalcul: sha(calcul), Esources: sha(sources), ecarts: comparerResultats(att, resultats(plan, sourcesDepuisDoc(plan, l.doc))) };
}
const out: any = { erreursRemplissageAttendues: att.erreursRemplissage };
out.finalisation = (await sql`select * from b.ecrire(${G}, ${ulysse}, 'finalisation', '', ${{ erreursAcceptees: [] }}::jsonb, ${Bun.randomUUIDv7()}, ${arnica})`)[0];
out.E1 = await exporter();
// (1) libellé
await sql`update b.grille set libelles = jsonb_set(libelles, '{consignes-e2}', to_jsonb('Consignes de l''exercice 2 (corrigé)'::text)) where id = ${G}`;
// (2) copie à l'identique de G3 V2 avec les données (même fonction que S5)
const [{ structure }] = await sql`select s.doc structure from b.grille g join b.structure s on s.id = g.structure_id where g.id = ${G}`;
const [{ id: copie }] = await sql`select b.copier_grille(${G}, ${structureIdentique(structure, "G3 V2 (copie S6)")}::jsonb, 'G3 V2 (copie S6)', ${arnica}) id`;
out.copie = copie;
// (3) une note pour un autre participant
out.autreEcriture = (await sql`select * from b.ecrire(${G}, ${participant("Yanis")}, 'note', 'gestion', ${{ valeur: 2 }}::jsonb, ${Bun.randomUUIDv7()}, ${arnica})`)[0];
// (4) tentative sur Ulysse
try { await sql`select * from b.ecrire(${G}, ${ulysse}, 'note', 'gestion', ${{ valeur: 0 }}::jsonb, ${Bun.randomUUIDv7()}, ${arnica})`; out.ecritureUlysse = "ACCEPTÉE (échec)"; }
catch (e: any) { out.ecritureUlysse = { refusee: true, code: e.errno ?? e.code, message: e.message }; }
out.E2 = await exporter();
out.E1egalE2 = out.E1.Ecalcul === out.E2.Ecalcul && out.E1.Esources === out.E2.Esources && out.E1.structure === out.E2.structure;
out.libelleAffiche = (await sql`select coalesce(g.libelles->>'consignes-e2', (select n->>'libelle' from jsonb_array_elements(s.doc->'noeuds') n where n->>'id' = 'consignes-e2')) l
  from b.grille g join b.structure s on s.id = g.structure_id where g.id = ${G}`)[0].l;
out.ulysseDansLaCopie = (await sql`select doc->'finalisation' f, jsonb_path_query_array(doc, '$.notes.*.v') <@ '[0,1,2,3,4,null]' ok,
  (select count(*) from jsonb_object_keys(doc->'notes'))::int notes from b.dossier where grille_id = ${copie} and participant_id = ${ulysse}`)[0];
console.log(JSON.stringify(out, null, 1));
await sql.close();
