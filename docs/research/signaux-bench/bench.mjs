// Micro-benchmark local: graphe type "grille" (1500 données + 500 calculs, layered, ~5 sources/calcul)
const lib = process.argv[2];
const GRIDS = +process.argv[3] || 1;
const D = 1500, C = 500, FAN = 5;

// PRNG déterministe
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
// Topologie : calcul i dépend de FAN sources parmi données ou calculs précédents (couches)
function topo() {
  const r = rng(42);
  const deps = [];
  for (let i = 0; i < C; i++) {
    const d = [];
    for (let k = 0; k < FAN; k++) {
      // 70% donnée, 30% calcul antérieur (si existe)
      if (i > 0 && r() < 0.3) d.push({ c: Math.floor(r() * i) });
      else d.push({ d: Math.floor(r() * D) });
    }
    deps.push(d);
  }
  return deps;
}
const T = topo();

async function makeImpl() {
  if (lib === 'alien') {
    const m = await import('alien-signals');
    return { sig: (v) => m.signal(v), set: (s, v) => s(v), get: (s) => s(), comp: (f) => m.computed(f), eff: (f) => m.effect(f), batch: (f) => { m.startBatch(); f(); m.endBatch(); } };
  }
  if (lib === 'preact') {
    const m = await import('@preact/signals-core');
    return { sig: (v) => m.signal(v), set: (s, v) => { s.value = v; }, get: (s) => s.value, comp: (f) => m.computed(f), eff: (f) => m.effect(f), batch: (f) => m.batch(f) };
  }
  if (lib === 'tc39') {
    const { Signal } = await import('signal-polyfill');
    const w = new Signal.subtle.Watcher(() => {});
    return { sig: (v) => new Signal.State(v), set: (s, v) => s.set(v), get: (s) => s.get(), comp: (f) => new Signal.Computed(f), eff: (f) => { const c = new Signal.Computed(() => { f(); }); w.watch(c); c.get(); return c; }, batch: (f) => f(), watcher: w };
  }
  if (lib === 'angular') {
    const m = await import('@angular/core');
    return { sig: (v) => m.signal(v), set: (s, v) => s.set(v), get: (s) => s(), comp: (f) => m.computed(f), eff: null, batch: (f) => f() };
  }
  throw new Error('lib?');
}

const I = await makeImpl();
function build() {
  const data = [], comps = [];
  for (let i = 0; i < D; i++) data.push(I.sig(i % 5));
  for (let i = 0; i < C; i++) {
    const d = T[i];
    comps.push(I.comp(() => {
      let s = 0;
      for (const x of d) s += x.d !== undefined ? I.get(data[x.d]) : I.get(comps[x.c]) & 1023;
      return s % 101; // cutoff possible (valeurs bornées)
    }));
  }
  return { data, comps };
}
const heap = () => { global.gc(); global.gc(); return process.memoryUsage().heapUsed; };

const h0 = heap();
let t0 = performance.now();
const grids = [];
for (let g = 0; g < GRIDS; g++) {
  const gr = build();
  // lecture initiale de tous les calculs (évaluation initiale + liens)
  for (const c of gr.comps) I.get(c);
  grids.push(gr);
}
const tBuild = performance.now() - t0;
const h1 = heap();
const nodes = GRIDS * (D + C);
console.log(JSON.stringify({ lib, grids: GRIDS, nodes, buildMs: +tBuild.toFixed(0), heapMB: +((h1 - h0) / 1e6).toFixed(1), bytesPerNode: +((h1 - h0) / nodes).toFixed(0) }));

// Mises à jour : une case à la fois sur la grille 0, relecture des 500 calculs (pull)
const g0 = grids[0];
const N = 2000;
let times = [];
const r = rng(7);
for (let i = 0; i < N + 200; i++) {
  const k = Math.floor(r() * D), v = Math.floor(r() * 5);
  const a = performance.now();
  I.set(g0.data[k], v + (i & 1) * 5 + 1);
  for (const c of g0.comps) I.get(c);
  const b = performance.now();
  if (i >= 200) times.push(b - a);
}
times.sort((a, b) => a - b);
const q = (p) => +times[Math.floor(p * (times.length - 1))].toFixed(4);
console.log(JSON.stringify({ lib, op: 'set 1 case + relecture 500 calculs (pull)', p50ms: q(0.5), p99ms: q(0.99), maxMs: q(1) }));
