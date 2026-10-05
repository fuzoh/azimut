// Graphe de propagation d'un participant : SVG en couches (données à gauche,
// nœud décisif à droite). Un clic sur un nœud ouvre son explication.

import { useEffect, useMemo, useState } from "react";
import { CAUSE } from "../noyau/evaluate";
import type { Plan } from "../noyau/compile";
import type { Graphe as GrapheNoyau, NoeudGraphe } from "../noyau/graphe";
import type { EcartAB } from "../comparaison";
import { useStoreNotes } from "../store/hooks";
import { useVersionParticipant } from "./useVersionParticipant";

const L = 200;
const H = 20;
const LARGEUR = 180;

function marques(x: NoeudGraphe): string {
  return (
    (x.jokerApplique ? "★" : "") +
    (x.influence ? "☆" : "") +
    (x.plusieursExigences ? "◆" : "") +
    (x.influenceMultiple ? "⇉" : "") +
    (x.cheminDispense ? "⇶" : "")
  );
}

function classes(x: NoeudGraphe, choisi: boolean): string {
  const c = ["g-noeud", x.donnees ? "g-donnees" : "g-calcul"];
  if (Number.isNaN(x.valeur)) c.push("g-sans-resultat");
  if (x.cause === CAUSE.nonEvalue || x.couverteParDispense || x.nonEvalueDirect) c.push("g-non-evalue");
  if (x.decisif) c.push("g-decisif");
  if (x.indicatif) c.push("g-indicatif");
  if (x.jokerApplique) c.push("g-joker");
  if (choisi) c.push("g-choisi");
  return c.join(" ");
}

/** Nœuds du cône de n : son amont et son aval. */
function cone(gr: GrapheNoyau, n: number): Set<number> {
  const res = new Set<number>([n]);
  for (const sens of [
    { de: "vers", vers: "de" },
    { de: "de", vers: "vers" },
  ] as const) {
    const vus = new Set<number>([n]);
    const pile = [n];
    while (pile.length > 0) {
      const x = pile.pop()!;
      for (const a of gr.aretes)
        if (a[sens.de] === x && !vus.has(a[sens.vers])) {
          vus.add(a[sens.vers]);
          pile.push(a[sens.vers]);
        }
    }
    for (const x of vus) res.add(x);
  }
  return res;
}

export function Graphe({
  g,
  p,
  nom,
  plan,
  n,
  onChoisir,
  ecarts = null,
}: {
  g: number;
  p: number;
  nom: string;
  plan: Plan;
  n: number;
  onChoisir: (n: number) => void;
  /** Comparaison A → B du participant ; null sans comparaison. */
  ecarts?: Map<number, EcartAB> | null;
}) {
  const store = useStoreNotes();
  const version = useVersionParticipant(g, p);
  const [gr, setGr] = useState<GrapheNoyau | null>(null);
  const [seulementCone, setSeulementCone] = useState(false);
  const [masquerVides, setMasquerVides] = useState(false);
  useEffect(() => {
    let actif = true;
    void store.graphe(g, p).then((x) => actif && setGr(x));
    return () => {
      actif = false;
    };
  }, [store, g, p, version]);

  const vue = useMemo(() => {
    if (!gr) return null;
    const dansCone = seulementCone && n >= 0 ? cone(gr, n) : null;
    const visibles = gr.noeuds.filter(
      (x) => (!dansCone || dansCone.has(x.n)) && (!masquerVides || !Number.isNaN(x.valeur) || x.n === n || x.couverteParDispense),
    );
    // Position : couche, puis rang parmi les visibles de la couche.
    const pos = new Map<number, { x: number; y: number }>();
    const parCouche = new Map<number, NoeudGraphe[]>();
    for (const x of visibles) parCouche.set(x.couche, [...(parCouche.get(x.couche) ?? []), x]);
    let hauteur = 0;
    for (const [c, l] of parCouche) {
      l.sort((a, b) => a.ordre - b.ordre);
      l.forEach((x, i) => pos.set(x.n, { x: 10 + c * L, y: 10 + i * H }));
      hauteur = Math.max(hauteur, l.length);
    }
    const largeur = Math.max(...visibles.map((x) => x.couche), 0) + 1;
    const aretes = gr.aretes.filter((a) => pos.has(a.de) && pos.has(a.vers));
    return { visibles, pos, aretes, w: largeur * L + 20, h: hauteur * H + 20 };
  }, [gr, n, seulementCone, masquerVides]);

  if (!gr || !vue) return <div className="graphe">calcul du graphe…</div>;
  return (
    <div className="graphe" data-testid="graphe">
      <div className="graphe-entete">
        <strong>Graphe de propagation — {nom}</strong> · {plan.grille.grille} ·{" "}
        <label>
          <input type="checkbox" checked={seulementCone} onChange={(e) => setSeulementCone(e.target.checked)} /> cône du nœud choisi
        </label>{" "}
        <label>
          <input type="checkbox" checked={masquerVides} onChange={(e) => setMasquerVides(e.target.checked)} /> masquer les nœuds sans résultat
        </label>
        <span className="legende">
          <span className="g-legende g-donnees">donnée</span>
          <span className="g-legende g-calcul">calcul</span>
          <span className="g-legende g-sans-resultat">sans résultat</span>
          <span className="g-legende g-non-evalue">non évalué / dispense</span>
          <span className="g-legende g-decisif">décisif</span>
          <span className="g-legende g-indicatif">indicatif</span>
          <span>★ joker appliqué</span>
          <span>☆ influencé</span>
          <span>◆ plusieurs exigences</span>
          <span>⇉ influence multiple</span>
          <span>⇶ 1a-B</span>
          <span>— active · - - ignorée</span>
          {ecarts && <span className="g-legende g-ecart">A → B : {ecarts.size} nœud(s) diffèrent</span>}
        </span>
        {gr.dispenses.length > 0 && (
          <p className="dispenses" data-testid="graphe-dispenses">
            {gr.dispenses.map((d) => `Dispense sur ${d.id} : couvre ${d.feuilles.join(", ") || "aucune feuille"}`).join(" · ")}
          </p>
        )}
      </div>
      <svg width={vue.w} height={vue.h} className="graphe-svg">
        {vue.aretes.map((a, i) => {
          const de = vue.pos.get(a.de)!;
          const vers = vue.pos.get(a.vers)!;
          const proche = a.de === n || a.vers === n;
          return (
            <line
              key={i}
              x1={de.x + LARGEUR}
              y1={de.y + 8}
              x2={vers.x}
              y2={vers.y + 8}
              className={`g-arete${a.active ? "" : " g-inactive"}${proche ? " g-proche" : ""}`}
            />
          );
        })}
        {vue.visibles.map((x) => {
          const { x: px, y: py } = vue.pos.get(x.n)!;
          const m = marques(x);
          const ecart = ecarts?.get(x.n);
          return (
            <g
              key={x.n}
              transform={`translate(${px},${py})`}
              className={classes(x, x.n === n) + (ecart ? " g-ecart" : "")}
              data-ecart={ecart?.texte}
              data-noeud={x.id}
              data-marques={m}
              data-decisif={x.decisif ? "1" : "0"}
              data-indicatif={x.indicatif ? "1" : "0"}
              data-couverte={x.couverteParDispense ? "1" : "0"}
              onClick={() => onChoisir(x.n)}
            >
              <title>{`${x.id} — ${x.libelle}\n${x.texte}${x.indicatif ? "\nindicatif (hors du cône du nœud décisif)" : ""}${x.couverteParDispense ? "\ncouverte par une dispense" : ""}${ecart ? `\nA → B : ${ecart.texte}` : ""}`}</title>
              <rect width={ecart ? LARGEUR - 4 : LARGEUR} height={16} rx={3} />
              <text x={4} y={12}>
                {ecart
                  ? `${x.id.length > 12 ? `${x.id.slice(0, 11)}…` : x.id} ${ecart.texte}`
                  : `${x.id.length > 18 ? `${x.id.slice(0, 17)}…` : x.id} ${x.texte} ${m}`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
