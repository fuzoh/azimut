import { Worker, isMainThread, parentPort } from 'node:worker_threads';
if (isMainThread) { const w = new Worker(new URL(import.meta.url)); w.on('message', m => { console.log(m); w.terminate(); }); }
else {
  const m = await import('@solidjs/signals'); const a = await import('alien-signals');
  let out;
  m.createRoot(d => { const [x, setX] = m.createSignal(1); const y = m.createMemo(() => x() * 2); setX(5); const before = y(); m.flush(); out = { solidBeforeFlush: before, solidAfterFlush: y() }; d(); });
  const s = a.signal(1), c = a.computed(() => s() * 2); s(5);
  parentPort.postMessage({ ...out, alien: c(), hasWindow: typeof window, hasDoc: typeof document });
}
