// S8 : rejeu de l'état depuis l'historique seul. bun run s8.ts
import { connecter, maintenant, participant, stats } from "./commun";
const sql = connecter();
const rejeu = () => sql`select grille_id, participant_id, doc, version from b.dossier_rejoue`;
const ms: number[] = [];
for (let i = 0; i < 25; i++) { const t = maintenant(); await rejeu(); if (i >= 5) ms.push(maintenant() - t); }
// Comparaison côté serveur : documents entiers (valeurs, textes, NE, jokers, finalisation, versions par clé) + version du dossier.
const [c] = await sql`
  select (select count(*) from (select grille_id, participant_id, doc, version from b.dossier
                                except select grille_id, participant_id, doc, version from b.dossier_rejoue) x)::int stocke_moins_rejoue,
         (select count(*) from (select grille_id, participant_id, doc, version from b.dossier_rejoue
                                except select grille_id, participant_id, doc, version from b.dossier) x)::int rejoue_moins_stocke`;
// Comparaison aplatie (une ligne par clé) pour ne pas dépendre de l'égalité de documents.
const [f] = await sql`
  with plat(src, g, p, nat, k, val) as (
    select 's', grille_id, participant_id, 'note', k, e from b.dossier, jsonb_each(doc->'notes') t(k, e)
    union all select 's', grille_id, participant_id, 'com', k, e from b.dossier, jsonb_each(doc->'commentaires') t(k, e)
    union all select 's', grille_id, participant_id, 'ne', k, e from b.dossier, jsonb_each(doc->'nonEvaluations') t(k, e)
    union all select 's', grille_id, participant_id, 'joker', j->>'writeId', j from b.dossier, jsonb_array_elements(doc->'jokers') j
    union all select 'r', grille_id, participant_id, 'note', k, e from b.dossier_rejoue, jsonb_each(doc->'notes') t(k, e)
    union all select 'r', grille_id, participant_id, 'com', k, e from b.dossier_rejoue, jsonb_each(doc->'commentaires') t(k, e)
    union all select 'r', grille_id, participant_id, 'ne', k, e from b.dossier_rejoue, jsonb_each(doc->'nonEvaluations') t(k, e)
    union all select 'r', grille_id, participant_id, 'joker', j->>'writeId', j from b.dossier_rejoue, jsonb_array_elements(doc->'jokers') j)
  select (select count(*) from (select g, p, nat, k, val from plat where src = 's' except select g, p, nat, k, val from plat where src = 'r') x)::int s_moins_r,
         (select count(*) from (select g, p, nat, k, val from plat where src = 'r' except select g, p, nat, k, val from plat where src = 's') x)::int r_moins_s,
         (select count(*) from plat where src = 's')::int lignes`;
const [j] = await sql`select doc->'nonEvaluations' ne from b.dossier_rejoue r join b.grille g on g.id = r.grille_id
                      where g.nom = 'G3 V2' and participant_id = ${participant("Joris")}`;
// Versions consécutives : max(version) = nombre de lignes par clé.
const [v] = await sql`select count(*)::int cles_avec_trou from (select 1 from b.historique group by grille_id, participant_id, nature, cle
                      having max(version) <> count(*) or min(version) <> 1) x`;
console.log(JSON.stringify({ rejeu_ms: stats(ms), ...c, aplati: f, joris_nonEvaluations: j.ne, ...v }, null, 1));
await sql.close();
