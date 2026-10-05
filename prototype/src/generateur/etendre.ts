// `etendre(structure, facteur)` (spec 20, « Générateur ») : agrandit une grille
// pour le jeu « charge » en clonant les regroupements de 1er niveau de l'axe
// principal qui sont hors de la chaîne du nœud décisif. Pure.
//
// - Les clones sont de nouvelles occurrences des mêmes définitions (un nœud
//   cloné sans définition en reçoit une, `def:<id>`, partagée avec ses clones).
// - Les agrégats transversaux (calculs hors des regroupements clonés et hors de
//   la chaîne décisive, qui consomment des nœuds clonés : Moyenne générale,
//   compétences du volume et leurs seuils dans G3) sont clonés avec chaque jeu
//   de clones : chaque jeu a ses propres agrégats.
// - Les calculs clonés sans consommateur aboutissent à un nœud de synthèse
//   indicatif, placé à la racine de l'axe principal.
// - `facteur` = nombre de jeux de clones ajoutés : G3 (229 données, dont 205
//   dans le volume E4–E8) × 6 → 229 + 6 × 205 = 1459 données.

import type { Grille, Noeud, NoeudCalcul, Placement } from "../noyau/format";

export const SUFFIXE_CLONE = "~";
export const ID_SYNTHESE = "synthese:etendue";

/** Nœuds dont dépend le nœud décisif (lui compris). */
export function chaineDecisive(grille: Grille): Set<string> {
  const res = new Set<string>();
  if (!grille.decisif) return res;
  const parId = new Map(grille.noeuds.map((n) => [n.id, n]));
  const pile = [grille.decisif];
  while (pile.length > 0) {
    const id = pile.pop()!;
    if (res.has(id)) continue;
    res.add(id);
    const n = parId.get(id);
    if (n?.type === "calcul") for (const e of n.entrees) pile.push(e.noeud);
  }
  return res;
}

function idsDuSousArbre(p: Placement, acc = new Set<string>()): Set<string> {
  acc.add(p.noeud);
  for (const e of p.enfants ?? []) idsDuSousArbre(e, acc);
  return acc;
}

/** Placements de 1er niveau de l'axe principal clonables : regroupements sans nœud de la chaîne décisive. */
export function regroupementsClonables(grille: Grille): Placement[] {
  const principal = grille.axes.find((a) => a.principal);
  if (!principal) return [];
  const chaine = chaineDecisive(grille);
  const parId = new Map(grille.noeuds.map((n) => [n.id, n]));
  return principal.arbre.filter(
    (p) => parId.get(p.noeud)?.type === "regroupement" && ![...idsDuSousArbre(p)].some((id) => chaine.has(id)),
  );
}

export function etendre(structure: Grille, facteur: number): Grille {
  if (!Number.isInteger(facteur) || facteur < 0) throw new Error(`facteur ${facteur} : entier ≥ 0 attendu`);
  const clonables = regroupementsClonables(structure);
  const chaine = chaineDecisive(structure);
  /** Nœuds clonés : sous-arbres des regroupements clonables. */
  const sousArbres = new Set<string>();
  for (const p of clonables) idsDuSousArbre(p, sousArbres);
  // Agrégats transversaux : point fixe sur les calculs qui consomment un nœud cloné.
  const agregats = new Set<string>();
  for (let change = true; change; ) {
    change = false;
    for (const n of structure.noeuds) {
      if (n.type !== "calcul" || sousArbres.has(n.id) || agregats.has(n.id) || chaine.has(n.id)) continue;
      if (n.entrees.some((e) => sousArbres.has(e.noeud) || agregats.has(e.noeud))) {
        agregats.add(n.id);
        change = true;
      }
    }
  }
  const clones = (id: string) => sousArbres.has(id) || agregats.has(id);
  const idClone = (id: string, k: number) => (clones(id) ? `${id}${SUFFIXE_CLONE}${k}` : id);

  // Les originaux clonés reçoivent une définition s'ils n'en ont pas.
  const avecDefinition = (n: Noeud): Noeud =>
    clones(n.id) && n.type !== "regroupement" && n.definition === undefined ? { ...n, definition: `def:${n.id}` } : n;
  const originaux = structure.noeuds.map(avecDefinition);

  const nouveaux: Noeud[] = [];
  for (let k = 1; k <= facteur; k++) {
    for (const n of originaux) {
      if (!clones(n.id)) continue;
      const { origine: _origine, ...sansOrigine } = n;
      const clone = { ...sansOrigine, id: idClone(n.id, k), libelle: `${n.libelle} (clone ${k})` } as Noeud;
      if (clone.type === "calcul") clone.entrees = clone.entrees.map((e) => ({ noeud: idClone(e.noeud, k), poids: e.poids }));
      nouveaux.push(clone);
    }
  }

  // Synthèse indicative : les calculs clonés que rien ne consomme.
  const consommes = new Set<string>();
  for (const n of [...originaux, ...nouveaux]) if (n.type === "calcul") for (const e of n.entrees) consommes.add(e.noeud);
  const puits = nouveaux.filter((n) => n.type === "calcul" && !consommes.has(n.id)).map((n) => n.id);
  const synthese: NoeudCalcul | null =
    puits.length > 0
      ? {
          id: ID_SYNTHESE,
          type: "calcul",
          libelle: "Synthèse des clones (indicative)",
          fonction: "F1",
          entrees: puits.map((noeud) => ({ noeud, poids: 1 })),
        }
      : null;

  const clonerPlacement = (p: Placement, k: number): Placement =>
    p.enfants?.length ? { noeud: idClone(p.noeud, k), enfants: p.enfants.map((e) => clonerPlacement(e, k)) } : { noeud: idClone(p.noeud, k) };
  const axes = structure.axes.map((axe) => {
    if (axe.principal) {
      const dernier = Math.max(-1, ...clonables.map((p) => axe.arbre.indexOf(p)));
      const ajouts: Placement[] = [];
      for (let k = 1; k <= facteur; k++) for (const p of clonables) ajouts.push(clonerPlacement(p, k));
      if (synthese) ajouts.push({ noeud: synthese.id, enfants: puits.map((noeud) => ({ noeud })) });
      return { ...axe, arbre: [...axe.arbre.slice(0, dernier + 1), ...ajouts, ...axe.arbre.slice(dernier + 1)] };
    }
    const ajouts: Placement[] = [];
    for (let k = 1; k <= facteur; k++)
      for (const p of axe.arbre) if (agregats.has(p.noeud)) ajouts.push(clonerPlacement(p, k));
    return { ...axe, arbre: [...axe.arbre, ...ajouts] };
  });

  const minimums = structure.exigences?.minimumParRegroupement ?? [];
  const minimumsClones = [];
  for (let k = 1; k <= facteur; k++)
    for (const m of minimums) if (clones(m.noeud)) minimumsClones.push({ ...m, noeud: idClone(m.noeud, k) });

  return {
    ...structure,
    grille: `${structure.grille} étendue ×${facteur}`,
    noeuds: [...originaux, ...nouveaux, ...(synthese ? [synthese] : [])],
    axes,
    ...(structure.exigences ? { exigences: { ...structure.exigences, minimumParRegroupement: [...minimums, ...minimumsClones] } } : {}),
  };
}

/** Décompte des nœuds d'une structure, par sorte. */
export function compterNoeuds(grille: Grille): { donnees: number; calcul: number; regroupement: number; commentaire: number } {
  const c = { donnees: 0, calcul: 0, regroupement: 0, commentaire: 0 };
  for (const n of grille.noeuds) {
    if (n.type === "calcul") c.calcul++;
    else if (n.type === "regroupement") c.regroupement++;
    else if (n.bareme === undefined) c.commentaire++;
    else c.donnees++;
  }
  return c;
}
