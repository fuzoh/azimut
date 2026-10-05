// Prerequis : bun add @solidjs/signals@next alien-signals ; node --expose-gc bench.mjs <alien|solid|solidlazy> 600
// Micro-benchmark indicatif : graphe "grille" (1500 donnees + 500 calculs, 5 sources/calcul)
// usage: node --expose-gc b.mjs <alien|solid|solidlazy> <grilles>
const lib = process.argv[2];
const GRIDS = +process.argv[3] || 1;
const D = 1500, C = 500, FAN = 5;
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const r0 = rng(42), T = [];
for (let i = 0; i < C; i++) { const d = []; for (let k = 0; k < FAN; k++) { if (i > 0 && r0() < 0.3) d.push({ c: Math.floor(r0() * i) }); else d.push({ d: Math.floor(r0() * D) }); } T.push(d); }

let I;
if (lib === 'alien') {
  const m = await import('alien-signals');
  I = { sig: (v) => m.signal(v), set: (s, v) => s(v), comp: (f) => m.computed(f), root: (fn) => { fn(); return () => {}; } };
} else {
  const m = await import('@solidjs/signals');
  const lazy = lib === 'solidlazy';
  I = {
    sig: (v) => { const [g, s] = m.createSignal(v); g._s = s; return g; },
    set: (s, v) => { s._s(v); m.flush(); },
    comp: (f) => m.createMemo(f, { lazy, sync: true }),
    root: (fn) => { let d; m.createRoot(dd => { d = dd; fn(); }); return d; },
  };
}
function build() {
  const data = [], comps = [];
  for (let i = 0; i < D; i++) data.push(I.sig(i % 5));
  for (let i = 0; i < C; i++) {
    const d = T[i];
    comps.push(I.comp(() => { let s = 0; for (const x of d) s += x.d !== undefined ? data[x.d]() : comps[x.c]() & 1023; return s % 101; }));
  }
  return { data, comps };
}
const heap = () => { global.gc(); global.gc(); return process.memoryUsage().heapUsed; };
const h0 = heap(); const t0 = performance.now();
const grids = [];
for (let g = 0; g < GRIDS; g++) {
  let gr; const disp = I.root(() => { gr = build(); });
  for (const c of gr.comps) c();
  gr.disp = disp; grids.push(gr);
}
const tBuild = performance.now() - t0, h1 = heap(), nodes = GRIDS * (D + C);
console.log(JSON.stringify({ lib, grids: GRIDS, nodes, buildMs: +tBuild.toFixed(0), heapMB: +((h1 - h0) / 1e6).toFixed(1), bytesPerNode: +((h1 - h0) / nodes).toFixed(0) }));
const g0 = grids[0], times = [], r = rng(7);
for (let i = 0; i < 2200; i++) {
  const k = Math.floor(r() * D), v = Math.floor(r() * 5);
  const a = performance.now();
  I.set(g0.data[k], v + (i & 1) * 5 + 1);
  for (const c of g0.comps) c();
  const b = performance.now(); if (i >= 200) times.push(b - a);
}
times.sort((a, b) => a - b);
const q = (p) => +times[Math.floor(p * (times.length - 1))].toFixed(4);
console.log(JSON.stringify({ lib, op: 'set 1 case + relecture 500 calculs', p50ms: q(0.5), p99ms: q(0.99), maxMs: q(1) }));
// disposal
const td = performance.now(); for (const g of grids) g.disp(); const tDisp = performance.now() - td;
grids.length = 0; const h2 = heap();
console.log(JSON.stringify({ lib, disposeAllMs: +tDisp.toFixed(1), heapAfterDisposeMB: +((h2 - h0) / 1e6).toFixed(1) }));
