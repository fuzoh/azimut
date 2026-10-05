// PRNG sfc32 et flux dérivés de la graine par hachage (spec 20, « Générateur ») :
// un flux par (grille, participant), pour qu'un participant se génère
// indépendamment des autres et de l'ordre de génération.

/** Hachage cyrb128 d'une chaîne : quatre mots de 32 bits, graine de sfc32. */
export function cyrb128(texte: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < texte.length; i++) {
    const k = texte.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** Générateur sfc32 : rend un réel uniforme dans [0, 1). */
export function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export interface Flux {
  /** Uniforme dans [0, 1). */
  uniforme(): number;
  /** Loi normale centrée réduite (Box-Muller). */
  normale(): number;
  /** Entier uniforme dans [0, n). */
  entier(n: number): number;
}

/** Flux déterministe nommé : même graine et même nom → même suite. */
export function flux(graine: number, ...nom: (string | number)[]): Flux {
  const [a, b, c, d] = cyrb128(`${graine}|${nom.join("|")}`);
  const u = sfc32(a, b, c, d);
  for (let i = 0; i < 15; i++) u(); // mise en train
  return {
    uniforme: u,
    normale() {
      const u1 = 1 - u(); // ]0, 1]
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u());
    },
    entier: (n) => Math.floor(u() * n),
  };
}
