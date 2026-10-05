// Somme de contrôle des sources (spec 20, « Worker ») : indépendante de l'ordre
// des lignes, pour comparer des sources tenues sous des formes différentes
// (lignes générées, collections TanStack DB, tableaux du worker).

import type { LigneCase, LigneJoker, LigneNonEvaluation } from "../sources/collections";

export interface SourcesAControler {
  cases: Iterable<Pick<LigneCase, "k" | "valeur">>;
  nonEvaluations: Iterable<Pick<LigneNonEvaluation, "k" | "axe">>;
  jokers: Iterable<Pick<LigneJoker, "g" | "p" | "jokerDef">>;
}

const vue = new DataView(new ArrayBuffer(8));

function melanger(h: number, x: number): number {
  h = Math.imul(h ^ x, 0x5bd1e995);
  return (h ^ (h >>> 15)) >>> 0;
}

/** Hachage 32 bits d'une suite de nombres (entiers jusqu'à 2^53 ou réels). */
function hacher(...xs: number[]): number {
  let h = 0x9747b28c;
  for (const x of xs) {
    vue.setFloat64(0, x);
    h = melanger(h, vue.getUint32(0));
    h = melanger(h, vue.getUint32(4));
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

class Accumulateur {
  n = 0;
  somme = 0;
  xor = 0;
  ajouter(h: number) {
    this.n++;
    this.somme = (this.somme + h) >>> 0;
    this.xor = (this.xor ^ h) >>> 0;
  }
  texte() {
    return `${this.n}:${this.somme.toString(16).padStart(8, "0")}${this.xor.toString(16).padStart(8, "0")}`;
  }
}

/** « cases n:hash / nonEvaluations n:hash / jokers n:hash ». Une valeur NaN (case vide) n'est pas une ligne. */
export function sommeControle(s: SourcesAControler): string {
  const cases = new Accumulateur();
  for (const l of s.cases) cases.ajouter(hacher(1, l.k, l.valeur));
  const ne = new Accumulateur();
  for (const l of s.nonEvaluations) ne.ajouter(hacher(2, l.k, l.axe ?? -1));
  const jokers = new Accumulateur();
  for (const l of s.jokers) jokers.ajouter(hacher(3, l.g, l.p, l.jokerDef));
  return `cases ${cases.texte()} / nonEvaluations ${ne.texte()} / jokers ${jokers.texte()}`;
}
