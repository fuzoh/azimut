// Graphe de propagation d'un participant (spec 20, « Visualisation ») : nœuds
// de données et de calcul, arêtes de calcul, valeurs, marques de joker, deux
// sortes de chemins multiples, feuilles couvertes par une dispense, nœud
// décisif et nœuds indicatifs (hors du cône du nœud décisif, 18 §3).

import { formater } from "./affichage";
import { CHEMIN_INFLUENCE_MULTIPLE, CHEMIN_PLUSIEURS_EXIGENCES, type Plan, TYPE_CALCUL, TYPE_DONNEES } from "./compile";
import { analyse1aB, couverture, feuillesDispense } from "./dispense";
import {
  CAUSE,
  evaluate,
  MARQUE_CHEMIN_DISPENSE,
  MARQUE_INFLUENCE_JOKER,
  MARQUE_JOKER_APPLIQUE,
  type SourcesParticipant,
} from "./evaluate";
import { noteConservee } from "./explain";

export interface NoeudGraphe {
  n: number;
  id: string;
  libelle: string;
  donnees: boolean;
  /** Couche : 0 pour les données, puis le plus long chemin depuis elles. */
  couche: number;
  /** Ordre dans la couche. */
  ordre: number;
  valeur: number;
  texte: string;
  cause: number;
  jokerApplique: boolean;
  influence: boolean;
  /** 1a-B : calculé normalement, consommé hors du cône de la dispense. */
  cheminDispense: boolean;
  plusieursExigences: boolean;
  influenceMultiple: boolean;
  /** Case couverte par une dispense posée sur un autre nœud (héritée). */
  couverteParDispense: boolean;
  /** Note saisie conservée sous une dispense, exclue du calcul (18 §4) ; vide sinon. */
  noteConservee: string;
  /** Non-évaluation posée sur ce nœud lui-même. */
  nonEvalueDirect: boolean;
  decisif: boolean;
  /** Hors du cône du nœud décisif : ne compte pas pour la réussite. */
  indicatif: boolean;
}

export interface AreteGraphe {
  de: number;
  vers: number;
  poids: number;
  /** L'entrée a un résultat et un poids > 0, et n'est pas retirée par 1a-B. */
  active: boolean;
}

export interface Graphe {
  noeuds: NoeudGraphe[];
  aretes: AreteGraphe[];
  /** Non-évaluations posées sur des nœuds sans résultat propre (regroupements) : id → feuilles. */
  dispenses: { id: string; feuilles: string[] }[];
}

/**
 * Cône de calcul du nœud décisif (lui compris). Sans nœud décisif (A01), il est
 * vide : tous les nœuds sont indicatifs (choix provisoire, ticket #20).
 */
export function coneDecisif(plan: Plan): Uint8Array {
  const cone = new Uint8Array(plan.N);
  const pile = plan.decisif >= 0 ? [plan.decisif] : [];
  while (pile.length > 0) {
    const n = pile.pop()!;
    if (cone[n]) continue;
    cone[n] = 1;
    for (let i = plan.inOffsets[n]; i < plan.inOffsets[n + 1]; i++) pile.push(plan.inSources[i]);
  }
  return cone;
}

export function graphe(plan: Plan, sources: SourcesParticipant): Graphe {
  const r = evaluate(plan, sources);
  const couvert = couverture(plan, sources.nonEvaluations);
  const directs = new Set(sources.nonEvaluations.map((ne) => ne.n));
  const cone = coneDecisif(plan);
  const sansFeuilles = plan.commutateurs.dispense1a === "B" ? analyse1aB(plan, sources.nonEvaluations).sansFeuilles : null;
  const garde = (n: number) => plan.type[n] === TYPE_DONNEES || plan.type[n] === TYPE_CALCUL;

  // Couches : plus long chemin depuis les données, en ordre topologique.
  const couche = new Int32Array(plan.N);
  for (const n of plan.topo)
    for (let i = plan.inOffsets[n]; i < plan.inOffsets[n + 1]; i++) couche[n] = Math.max(couche[n], couche[plan.inSources[i]] + 1);

  // Ordre dans la couche : données dans l'ordre de placement de l'axe principal,
  // calculs au barycentre de leurs entrées.
  const rang = new Float64Array(plan.N).fill(NaN);
  let k = 0;
  const visiter = (p: { noeud: string; enfants?: { noeud: string }[] }) => {
    const n = plan.index.get(p.noeud)!;
    if (plan.type[n] === TYPE_DONNEES && Number.isNaN(rang[n])) rang[n] = k++;
    for (const e of p.enfants ?? []) visiter(e);
  };
  if (plan.axePrincipal >= 0) plan.grille.axes[plan.axePrincipal].arbre.forEach(visiter);
  for (let n = 0; n < plan.N; n++) if (plan.type[n] === TYPE_DONNEES && Number.isNaN(rang[n])) rang[n] = k++;
  for (const n of plan.topo) {
    if (plan.type[n] !== TYPE_CALCUL) continue;
    let somme = 0;
    let nb = 0;
    for (let i = plan.inOffsets[n]; i < plan.inOffsets[n + 1]; i++) {
      somme += rang[plan.inSources[i]];
      nb++;
    }
    rang[n] = nb > 0 ? somme / nb : k++;
  }
  const parCouche = new Map<number, number[]>();
  for (let n = 0; n < plan.N; n++) {
    if (!garde(n)) continue;
    const l = parCouche.get(couche[n]) ?? [];
    l.push(n);
    parCouche.set(couche[n], l);
  }
  const ordre = new Int32Array(plan.N);
  for (const l of parCouche.values()) l.sort((a, b) => rang[a] - rang[b] || a - b).forEach((n, i) => (ordre[n] = i));

  const noeuds: NoeudGraphe[] = [];
  for (let n = 0; n < plan.N; n++) {
    if (!garde(n)) continue;
    const d = plan.indexDonnee[n];
    const conservee = r.causes[n] === CAUSE.nonEvalue ? noteConservee(plan, sources, n) : "";
    const texte = formater(plan.baremes[plan.bareme[n]], r.valeurs[n]);
    noeuds.push({
      n,
      id: plan.ids[n],
      libelle: plan.grille.noeuds[n].libelle,
      donnees: plan.type[n] === TYPE_DONNEES,
      couche: couche[n],
      ordre: ordre[n],
      valeur: r.valeurs[n],
      texte: conservee ? `(${conservee}) exclue` : texte,
      cause: r.causes[n],
      jokerApplique: (r.marques[n] & MARQUE_JOKER_APPLIQUE) !== 0,
      influence: (r.marques[n] & MARQUE_INFLUENCE_JOKER) !== 0,
      cheminDispense: (r.marques[n] & MARQUE_CHEMIN_DISPENSE) !== 0,
      plusieursExigences: (plan.cheminsMultiples[n] & CHEMIN_PLUSIEURS_EXIGENCES) !== 0,
      influenceMultiple: (plan.cheminsMultiples[n] & CHEMIN_INFLUENCE_MULTIPLE) !== 0,
      couverteParDispense: d >= 0 && couvert[d] === 1 && !directs.has(n),
      noteConservee: conservee,
      nonEvalueDirect: directs.has(n),
      decisif: n === plan.decisif,
      indicatif: !cone[n],
    });
  }

  const aretes: AreteGraphe[] = [];
  for (let n = 0; n < plan.N; n++)
    for (let i = plan.inOffsets[n]; i < plan.inOffsets[n + 1]; i++) {
      const s = plan.inSources[i];
      // 1a-B : un nœud calculé sans ses feuilles couvertes n'en reçoit rien (comme `evaluate`).
      const retiree = sansFeuilles?.[n] === 1 && plan.type[s] === TYPE_DONNEES;
      aretes.push({ de: s, vers: n, poids: plan.inPoids[i], active: !retiree && !Number.isNaN(r.valeurs[s]) && plan.inPoids[i] > 0 });
    }

  const dispenses = sources.nonEvaluations
    .filter((ne) => !garde(ne.n))
    .map((ne) => ({ id: plan.ids[ne.n], feuilles: Array.from(feuillesDispense(plan, ne.n, ne.axe), (d) => plan.ids[plan.donnees[d]]) }));
  return { noeuds, aretes, dispenses };
}
