// DAG maison : tableaux typés, ordre topologique = index, propagation des "dirty" avec coupure si valeur inchangée
const GRIDS = +process.argv[2] || 1, D = 1500, C = 500, FAN = 5;
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const r0 = rng(42);
// sources : indices 0..D-1 = données, D..D+C-1 = calculs
const srcOff = new Uint32Array(C + 1), src = new Uint16Array(C * FAN);
for (let i = 0; i < C; i++) { srcOff[i] = i * FAN; for (let k = 0; k < FAN; k++) src[i * FAN + k] = (i > 0 && r0() < 0.3) ? D + Math.floor(r0() * i) : Math.floor(r0() * D); }
srcOff[C] = C * FAN;
// adjacence inverse (CSR), partagée entre participants
const cnt = new Uint32Array(D + C + 1);
for (let j = 0; j < C * FAN; j++) cnt[src[j] + 1]++;
for (let i = 0; i < D + C; i++) cnt[i + 1] += cnt[i];
const subs = new Uint16Array(C * FAN), fill = cnt.slice();
for (let i = 0; i < C; i++) for (let k = 0; k < FAN; k++) subs[fill[src[i * FAN + k]]++] = i;
const heap = () => { global.gc(); global.gc(); return process.memoryUsage().heapUsed + process.memoryUsage().arrayBuffers; };
const h0 = heap();
const t0 = performance.now();
const vals = [];
function evalNode(v, i) { let s = 0; for (let k = i * FAN; k < i * FAN + FAN; k++) { const x = src[k]; s += x < D ? v[x] : v[x] & 1023; } return s % 101; }
for (let g = 0; g < GRIDS; g++) {
  const v = new Int32Array(D + C); for (let i = 0; i < D; i++) v[i] = i % 5;
  for (let i = 0; i < C; i++) v[D + i] = evalNode(v, i);
  vals.push(v);
}
const tb = performance.now() - t0, h1 = heap();
console.log(JSON.stringify({ lib: 'custom', grids: GRIDS, nodes: GRIDS * (D + C), buildMs: +tb.toFixed(0), heapMB: +((h1 - h0) / 1e6).toFixed(1), bytesPerNode: +((h1 - h0) / (GRIDS * (D + C))).toFixed(0) }));
const dirty = new Uint8Array(C);
const v = vals[0], r = rng(7), times = [];
for (let it = 0; it < 2200; it++) {
  const k = Math.floor(r() * D), nv = Math.floor(r() * 5) + (it & 1) * 5 + 1;
  const a = performance.now();
  if (v[k] !== nv) {
    v[k] = nv;
    for (let j = cnt[k]; j < cnt[k + 1]; j++) dirty[subs[j]] = 1;
    for (let i = 0; i < C; i++) if (dirty[i]) { dirty[i] = 0; const n = evalNode(v, i); if (n !== v[D + i]) { v[D + i] = n; const id = D + i; for (let j = cnt[id]; j < cnt[id + 1]; j++) dirty[subs[j]] = 1; } }
  }
  const b = performance.now();
  if (it >= 200) times.push(b - a);
}
times.sort((a, b) => a - b);
const q = (p) => +times[Math.floor(p * (times.length - 1))].toFixed(4);
console.log(JSON.stringify({ lib: 'custom', op: 'set 1 case + propagation', p50ms: q(0.5), p99ms: q(0.99), maxMs: q(1) }));
