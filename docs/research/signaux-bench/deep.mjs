const lib = process.argv[2], N = +process.argv[3];
let sig, set, comp, get;
if (lib === 'alien') { const m = await import('alien-signals'); sig = m.signal; set = (s, v) => s(v); get = (s) => s(); comp = m.computed; }
if (lib === 'preact') { const m = await import('@preact/signals-core'); sig = m.signal; set = (s, v) => { s.value = v; }; get = (s) => s.value; comp = m.computed; }
if (lib === 'tc39') { const { Signal } = await import('signal-polyfill'); sig = (v) => new Signal.State(v); set = (s, v) => s.set(v); get = (s) => s.get(); comp = (f) => new Signal.Computed(f); }
if (lib === 'angular') { const m = await import('@angular/core'); sig = m.signal; set = (s, v) => s.set(v); get = (s) => s(); comp = m.computed; }
try {
  const s = sig(0); let prev = s;
  for (let i = 0; i < N; i++) { const p = prev; prev = comp(() => get(p) + 1); }
  console.log(lib, N, 'first read', get(prev));
  set(s, 1); console.log(lib, N, 'after set', get(prev));
} catch (e) { console.log(lib, N, 'FAIL', String(e).slice(0, 80)); }
