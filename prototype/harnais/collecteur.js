// Collecteur injecté dans chaque page avant l'app (Playwright `addInitScript`),
// après web-vitals (IIFE, global `webVitals`). Rien n'est envoyé : le harnais
// relit `window.__mesures` en fin de run.
(() => {
  const M = (window.__mesures = { longtasks: [], loaf: [], events: [], inp: [], actions: [], erreurs: [] });
  const observer = (type, f, options = {}) => {
    try {
      new PerformanceObserver((liste) => liste.getEntries().forEach(f)).observe({ type, buffered: true, ...options });
    } catch (e) {
      M.erreurs.push(`${type} : ${e}`);
    }
  };
  observer("longtask", (e) => M.longtasks.push({ debut: e.startTime, duree: e.duration }));
  observer("long-animation-frame", (e) => M.loaf.push({ debut: e.startTime, duree: e.duration, blocage: e.blockingDuration }));
  observer(
    "event",
    (e) => M.events.push({ nom: e.name, debut: e.startTime, duree: e.duration, interactionId: e.interactionId }),
    { durationThreshold: 16 },
  );
  // Actions : `timeStamp` des événements qui valident une case (Tab, Entrée) ou changent la vue.
  for (const type of ["keydown", "click", "change"]) {
    addEventListener(
      type,
      (ev) => {
        if (type === "keydown" && ev.key !== "Tab" && ev.key !== "Enter") return;
        M.actions.push({ type, cle: ev.key ?? null, t: ev.timeStamp });
      },
      { capture: true },
    );
  }
  try {
    // INP au sens de web-vitals ; reportAllChanges : chaque nouvelle valeur.
    (typeof webVitals !== "undefined" ? webVitals : window.webVitals).onINP((m) => M.inp.push({ valeur: m.value, t: performance.now() }), { reportAllChanges: true, durationThreshold: 16 });
  } catch (e) {
    M.erreurs.push(`web-vitals : ${e}`);
  }
})();
