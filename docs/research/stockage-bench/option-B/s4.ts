// S4 : corriger un libellé après ouverture de la saisie. bun run s4.ts
import { comparerResultats, compile, connecter, grilleId, JEU, lireNdjson, maintenant, resultats, sourcesDepuisDoc } from "./commun";
const sql = connecter();
const G = grilleId("G3 V2");
const empreinte = async () => (await sql`select
   (select md5(string_agg(x, E'\n' order by x)) from (select row(d.*)::text x from b.dossier d) a) dossiers,
   (select md5(string_agg(x, E'\n' order by x)) from (select row(h.*)::text x from b.historique h) a) historique,
   (select md5(string_agg(x, E'\n' order by x)) from (select row(s.*)::text x from b.structure s) a) structures`)[0];
const avant = await empreinte();
const [{ o: ouverte }] = await sql`select ouverture_saisie <= now() o from b.grille where id = ${G}`;
const t = maintenant();
const r = await sql`update b.grille set libelles = jsonb_set(libelles, '{gestion}', to_jsonb(${"Gestion du groupe pendant le jeu"}::text)) where id = ${G}`;
const duree = maintenant() - t;
const apres = await empreinte();
// Règle d'affichage unique : surcouche de la grille, sinon libellé de la structure ; pour tout dossier, finalisé ou non.
const libelle = await sql`select d.participant_id, d.doc->'finalisation' is distinct from 'null'::jsonb finalise,
    coalesce(g.libelles->>'gestion', (select n->>'libelle' from jsonb_array_elements(s.doc->'noeuds') n where n->>'id' = 'gestion')) libelle,
    (select n->>'libelle' from jsonb_array_elements(s.doc->'noeuds') n where n->>'id' = 'gestion') libelle_structure
  from b.dossier d join b.grille g on g.id = d.grille_id join b.structure s on s.id = g.structure_id
  where d.grille_id = ${G} and d.doc->'finalisation' <> 'null'`;
// Recalcul des finalisés depuis la structure à laquelle leur finalisation est rattachée.
const att = new Map(lireNdjson(`${JEU}/attendu/resultats-g3-v2.ndjson`).map((x: any) => [x.participant, x]));
const ecarts: string[] = [];
for (const l of await sql`select d.participant_id, d.doc, s.doc structure, s.empreinte = d.doc->'finalisation'->>'empreinte' meme_structure
                            from b.dossier d join b.structure s on s.id = (d.doc->'finalisation'->>'structure')::uuid
                           where d.grille_id = ${G} and d.doc->'finalisation' <> 'null'`) {
  const plan = compile(l.structure);
  ecarts.push(...comparerResultats(att.get(l.participant_id), resultats(plan, sourcesDepuisDoc(plan, l.doc))));
  if (!l.meme_structure) ecarts.push("structure changée");
}
console.log(JSON.stringify({ saisieOuverte: ouverte, mode: "surcouche de libellés sur la grille, structure inchangée", lignesEcrites: r.count, duree_ms: +duree.toFixed(3),
  saisiesEtHistoriqueInchanges: avant.dossiers === apres.dossiers && avant.historique === apres.historique, structuresInchangees: avant.structures === apres.structures,
  avant, apres, finalises: libelle.length, libellesAffiches: libelle, ecartsResultatsFinalises: ecarts }, null, 1));
await sql.close();
