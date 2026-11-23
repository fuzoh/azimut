// Compare un état exporté par un schéma à l'état attendu (même forme que attendu/etat-g3-v2.json).
// bun run verifier.ts <attendu.json> <obtenu.json> [--ecritures]
// Clés comparées par participant : notes (valeur), commentaires (texte), nonEvaluations (ensemble noeud|axe),
// jokers (multiensemble jokerDef), finalisation (présence). Avec --ecritures : aussi le nombre d'écritures par note et commentaire.
// Sortie : « IDENTIQUE » et code 0, sinon les 20 premières différences et code 1.
import { readFileSync } from "node:fs";

const [fa, fo, opt] = process.argv.slice(2);
const A = JSON.parse(readFileSync(fa, "utf8"));
const O = JSON.parse(readFileSync(fo, "utf8"));
const ecr = opt === "--ecritures";
const parId = new Map(O.map((p: any) => [p.participant, p]));
const diffs: string[] = [];
const norm = (p: any) => ({
  notes: Object.fromEntries(Object.entries(p.notes ?? {}).map(([k, v]: any) => [k, ecr ? [v.valeur, v.ecritures] : v.valeur]).sort()),
  commentaires: Object.fromEntries(Object.entries(p.commentaires ?? {}).map(([k, v]: any) => [k, ecr ? [v.texte, v.ecritures] : v.texte]).sort()),
  nonEvaluations: (p.nonEvaluations ?? []).map((x: any) => `${x.noeud}|${x.axe ?? ""}`).sort(),
  jokers: (p.jokers ?? []).map((x: any) => x.jokerDef).sort(),
  finalise: !!p.finalisation,
});
for (const a of A) {
  const o = parId.get(a.participant);
  if (!o) {
    diffs.push(`participant absent : ${a.nom ?? a.participant}`);
    continue;
  }
  const na = norm(a);
  const no = norm(o);
  for (const k of Object.keys(na) as (keyof typeof na)[]) {
    const x = JSON.stringify(na[k]);
    const y = JSON.stringify(no[k]);
    if (x !== y) {
      if (typeof na[k] === "object" && !Array.isArray(na[k])) {
        const ka = na[k] as Record<string, unknown>;
        const ko = no[k] as Record<string, unknown>;
        for (const c of new Set([...Object.keys(ka), ...Object.keys(ko)]))
          if (JSON.stringify(ka[c]) !== JSON.stringify(ko[c])) diffs.push(`${a.nom} ${k} ${c} : attendu ${JSON.stringify(ka[c])}, obtenu ${JSON.stringify(ko[c])}`);
      } else diffs.push(`${a.nom} ${k} : attendu ${x}, obtenu ${y}`);
    }
  }
}
if (O.length !== A.length) diffs.push(`participants : attendu ${A.length}, obtenu ${O.length}`);
if (diffs.length === 0) {
  console.log("IDENTIQUE");
  process.exit(0);
}
console.log(`${diffs.length} différence(s)`);
for (const d of diffs.slice(0, 20)) console.log("  " + d);
process.exit(1);
