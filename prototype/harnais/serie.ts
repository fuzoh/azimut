// Harnais de mesure (spec 20, « Scénarios de performance ») : une commande
// lance une série complète et écrit le JSON brut par run, `serie.json` et
// `rapport.md` dans `prototype/mesures/<horodatage>/`.
//
//   bun run mesure                 série complète (Chrome visible, 1 chauffe + 5 runs)
//   bun run mesure -- --fumee      série de fumée (1 run par scénario et par configuration)
//   options : --headless (nouveau headless, chiffres non valables), --navigateur <chemin>,
//             --canal chrome|chromium, --bridage 4, --runs 5, --chauffe 1, --configs base,dag,
//             --scenarios saisie-rapide,…, --sans-lru, --sans-mesures, --comparer-modes,
//             --court (déroulés raccourcis, essai du harnais), --sans-build, --port 4173

import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { type Browser, chromium, type LaunchOptions, type Page } from "playwright";
import { agreger, type Marque, type MarquesThread, mediane, planifier, ramener, decomposerSaisies, resumerRun, type Tache } from "./analyse";
import { CiblesCdp } from "./cdp";
import { type Calibration, type Machine, rapportMarkdown, type RunJson, type SerieJson } from "./rapport";
import { type Contexte, mesuresLru, mesuresSansCritere, type ResultatScenario, SCENARIOS } from "./scenarios";

const RACINE = path.resolve(import.meta.dirname, "..");
const WEB_VITALS = path.join(RACINE, "node_modules/web-vitals/dist/web-vitals.iife.js");
const COLLECTEUR = path.join(import.meta.dirname, "collecteur.js");
const VIEWPORT = { width: 1600, height: 1000 };

/** Les 5 configurations de `src/store/fabriques.ts` (CONFIGURATIONS), recopiées : le harnais ne charge pas l'app. */
const CONFIGURATIONS = [
  { nom: "base", store: { calcul: "signaux", lieu: "worker", cohorte: "paresseux", distante: "perimee" } },
  { nom: "dag", store: { calcul: "dag", lieu: "worker", cohorte: "paresseux", distante: "perimee" } },
  { nom: "principal", store: { calcul: "signaux", lieu: "principal", cohorte: "paresseux", distante: "perimee" } },
  { nom: "precalcul", store: { calcul: "signaux", lieu: "worker", cohorte: "precalcul", distante: "perimee" } },
  { nom: "immediat", store: { calcul: "signaux", lieu: "worker", cohorte: "paresseux", distante: "immediat" } },
] as const;
type Configuration = (typeof CONFIGURATIONS)[number];

const LRU_DEFAUT = 50;
const LRU_BALAYAGE = [10, 50, 200];

const { values: o } = parseArgs({
  options: {
    fumee: { type: "boolean", default: false },
    headless: { type: "boolean", default: false },
    navigateur: { type: "string" },
    canal: { type: "string" },
    bridage: { type: "string", default: "4" },
    runs: { type: "string" },
    chauffe: { type: "string" },
    configs: { type: "string" },
    scenarios: { type: "string" },
    "sans-lru": { type: "boolean", default: false },
    "sans-mesures": { type: "boolean", default: false },
    "comparer-modes": { type: "boolean", default: false },
    court: { type: "boolean", default: false },
    "sans-build": { type: "boolean", default: false },
    port: { type: "string", default: "4173" },
  },
  allowPositionals: true,
});

const taux = Number(o.bridage);
const runs = Number(o.runs ?? (o.fumee ? 1 : 5));
const chauffe = Number(o.chauffe ?? (o.fumee ? 0 : 1));
const configs = o.configs ? CONFIGURATIONS.filter((c) => o.configs!.split(",").includes(c.nom)) : [...CONFIGURATIONS];
const scenarios = [...(o.scenarios ? Object.keys(SCENARIOS).filter((s) => o.scenarios!.split(",").includes(s)) : Object.keys(SCENARIOS)), ...(o["sans-mesures"] ? [] : ["mesures"])];
const base = `http://localhost:${o.port}`;

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const journal = (m: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

// --- Navigateur ------------------------------------------------------------------------

function optionsLancement(headless: boolean): LaunchOptions {
  // Chrome en fenêtre visible par défaut (pas chrome-headless-shell) ; headless = nouveau headless du vrai Chrome.
  const args = ["--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows", `--window-size=${VIEWPORT.width},${VIEWPORT.height + 120}`];
  const executable = o.navigateur ?? process.env.CHROME_PATH;
  if (executable) return { executablePath: executable, headless, args };
  return { channel: o.canal ?? "chrome", headless, args };
}

async function lancer(headless: boolean): Promise<Browser> {
  if (!headless && process.platform === "linux" && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY)
    throw new Error("fenêtre visible impossible : pas d'affichage (DISPLAY absent) ; --headless pour le nouveau headless");
  try {
    return await chromium.launch(optionsLancement(headless));
  } catch (e) {
    // Sans Chrome installé : Chromium du système, s'il existe.
    if (!o.navigateur && !process.env.CHROME_PATH && existsSync("/usr/bin/chromium")) {
      journal(`canal ${o.canal ?? "chrome"} indisponible, repli sur /usr/bin/chromium`);
      o.navigateur = "/usr/bin/chromium";
      return chromium.launch(optionsLancement(headless));
    }
    throw e;
  }
}

function urlDe(config: Configuration, lru: number, bridageLogiciel: boolean): string {
  const q = new URLSearchParams({ jeu: "charge", remplissage: "fin", graine: "1", participants: "200", verif: "0", simu: "0", ...config.store, lru: String(lru) });
  if (bridageLogiciel && config.store.lieu === "worker") q.set("bridageWorker", String(taux));
  return `${base}/?${q}`;
}

async function nouvellePage(browser: Browser) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  // Un seul script : Playwright isole chaque script injecté, le global `webVitals` de l'IIFE doit être visible du collecteur.
  await context.addInitScript({ content: `${readFileSync(WEB_VITALS, "utf8")}\n${readFileSync(COLLECTEUR, "utf8")}` });
  const page = await context.newPage();
  page.on("pageerror", (e) => journal(`erreur de page : ${e.message}`));
  const cdp = await CiblesCdp.ouvrir(context, page);
  return { context, page, cdp };
}

async function attendrePret(page: Page): Promise<void> {
  const statut = await page.waitForFunction(
    () => {
      const s = (document.querySelector('[data-testid="worker"]') as HTMLElement | null)?.dataset.statut;
      return s && s !== "demarrage" ? s : null;
    },
    null,
    { timeout: 300_000, polling: 100 },
  );
  const s = await statut.jsonValue();
  if (s === "desaccord" || s === "erreur") throw new Error(`worker : ${s}`);
  await page.waitForFunction(() => performance.getEntriesByName("demarrage:table-peinte").length > 0, null, { timeout: 300_000, polling: 200 });
}

// --- Un run ----------------------------------------------------------------------------

interface Brut {
  page: MarquesThread & { mesures: { nom: string; debut: number; duree: number }[] };
  worker: (MarquesThread & { stats: unknown }) | null;
  collecteur: { longtasks: Tache[]; loaf: Tache[]; events: unknown[]; inp: { valeur: number; t: number }[]; actions: { type: string; cle: string | null; t: number }[]; erreurs: string[] };
}

async function lireBrut(page: Page): Promise<Brut> {
  const pageBrut = await page.evaluate(() => ({
    origine: performance.timeOrigin,
    marques: performance.getEntriesByType("mark").map((m) => ({ nom: m.name, t: m.startTime, detail: (m as PerformanceMark).detail ?? null })),
    mesures: performance.getEntriesByType("measure").map((m) => ({ nom: m.name, debut: m.startTime, duree: m.duration })),
    collecteur: (window as unknown as { __mesures: Brut["collecteur"] }).__mesures,
  }));
  const w = page.workers()[0];
  const worker = w
    ? await w.evaluate(() => ({
        origine: performance.timeOrigin,
        marques: performance.getEntriesByType("mark").map((m) => ({ nom: m.name, t: m.startTime, detail: (m as PerformanceMark).detail ?? null })),
        stats: (globalThis as { __azimutStats?: unknown }).__azimutStats ?? null,
      }))
    : null;
  return { page: { origine: pageBrut.origine, marques: pageBrut.marques, mesures: pageBrut.mesures }, worker, collecteur: pageBrut.collecteur };
}

function demarrage(brut: Brut): Record<string, number> {
  const res: Record<string, number> = {};
  for (const m of brut.page.mesures) if (m.nom.startsWith("demarrage:")) res[m.nom.slice(10)] = m.duree;
  for (const m of brut.page.marques) if (m.nom === "demarrage:worker-pret" || m.nom === "demarrage:table-peinte") res[m.nom.slice(10)] = m.t;
  return res;
}

interface DemandeRun {
  index: number;
  config: Configuration;
  scenario: string;
  lru: number;
  chauffe: boolean;
  balayage: boolean;
}

async function executerRun(browser: Browser, d: DemandeRun, bridageLogiciel: boolean, dossier: string | null): Promise<RunJson> {
  const fichier = `${String(d.index).padStart(3, "0")}-${d.config.nom}-lru${d.lru}-${d.scenario}${d.chauffe ? "-chauffe" : ""}.json`;
  const url = urlDe(d.config, d.lru, bridageLogiciel);
  const tauxBridageLogiciel = bridageLogiciel && d.config.store.lieu === "worker" ? taux : 1;
  const run: RunJson = { index: d.index, fichier, config: d.config.nom, scenario: d.scenario, lru: d.lru, chauffe: d.chauffe, balayage: d.balayage, url, tauxBridageLogiciel, resume: null, saisies: [], actions: [], mesures: [], memoire: {}, demarrage: {}, constats: [] };
  const { context, page, cdp } = await nouvellePage(browser);
  let brut: Brut | null = null;
  try {
    await cdp.brider(taux);
    await page.goto(url);
    await attendrePret(page);
    run.memoire.chargement = await cdp.memoire();
    const c: Contexte = { page, cdp, lru: d.lru, court: o.court };
    const debut = await page.evaluate(() => performance.now());
    let r: ResultatScenario;
    if (d.scenario === "mesures") r = await mesuresSansCritere(c);
    else if (d.scenario === "mesures-lru") r = await mesuresLru(c);
    else r = await SCENARIOS[d.scenario](c);
    const fin = await page.evaluate(() => performance.now());
    run.memoire = { ...run.memoire, ...r.memoire, fin: await cdp.memoire() };
    run.actions = r.actions;
    run.mesures = r.mesures;
    brut = await lireBrut(page);
    run.demarrage = demarrage(brut);
    const marques: Marque[] = [...brut.page.marques, ...(brut.worker ? ramener(brut.worker, brut.page.origine) : [])];
    const validations = brut.collecteur.actions.filter((a) => a.type === "keydown" && a.cle === "Tab" && a.t >= debut && a.t <= fin).map((a) => a.t);
    run.saisies = decomposerSaisies(marques, validations);
    if (SCENARIOS[d.scenario])
      run.resume = resumerRun({
        scenario: d.scenario,
        fenetre: { debut, fin },
        longtasks: brut.collecteur.longtasks,
        loaf: brut.collecteur.loaf,
        inp: brut.collecteur.inp.filter((x) => x.t >= debut).map((x) => x.valeur),
        saisies: run.saisies,
      });
    // Garde-fou des mesures sans critère : rien ne bloque le thread principal plus de 50 ms.
    for (const m of r.mesures) {
      const lt = brut.collecteur.longtasks.filter((t) => t.debut >= m.fenetre.debut && t.debut < m.fenetre.fin);
      if (lt.length > 0)
        run.constats.push(`${m.nom} : ${lt.length} tâche(s) > 50 ms, max ${Math.round(Math.max(...lt.map((t) => t.duree)))} ms — ${m.exceptionGardeFou ? "constat non bloquant" : "constat bloquant"}`);
    }
  } catch (e) {
    run.erreur = e instanceof Error ? e.message.split("\n")[0] : String(e);
    journal(`  erreur : ${run.erreur}`);
  } finally {
    await context.close();
  }
  if (dossier) writeFileSync(path.join(dossier, "runs", fichier), JSON.stringify({ ...run, brut }, null, 1));
  return run;
}

// --- Calibration -----------------------------------------------------------------------

const ITERATIONS = 30_000_000;
const procheDe4 = (r: number | null) => r !== null && r >= 3 && r <= 5;

async function calibrer(browser: Browser): Promise<Calibration> {
  const dureesMs: Record<string, number> = {};
  const motifs: string[] = [];
  const travailPage = (n: number) => {
    const t0 = performance.now();
    let x = 0;
    for (let i = 0; i < n; i++) x += Math.sqrt(i);
    return x > 0 ? performance.now() - t0 : 0;
  };
  const travailWorker = (n: number) => (self as unknown as { __calibrer(n: number): number }).__calibrer(n);
  const med3 = async (f: () => Promise<number>) => mediane([await f(), await f(), await f()])!;

  let { context, page, cdp } = await nouvellePage(browser);
  await page.goto(`${base}/?verif=0`);
  await attendrePret(page);
  const w = page.workers()[0];
  dureesMs["page ×1"] = await med3(() => page.evaluate(travailPage, ITERATIONS));
  dureesMs["worker ×1"] = await med3(() => w.evaluate(travailWorker, ITERATIONS));
  await cdp.brider(taux);
  dureesMs[`page ×${taux}`] = await med3(() => page.evaluate(travailPage, ITERATIONS));
  dureesMs[`worker ×${taux} (page bridée)`] = await med3(() => w.evaluate(travailWorker, ITERATIONS));
  const ratioPage = dureesMs[`page ×${taux}`] / dureesMs["page ×1"];
  const ratioWorkerNatif = dureesMs[`worker ×${taux} (page bridée)`] / dureesMs["worker ×1"];
  if (!procheDe4(ratioPage)) motifs.push(`ratio du thread principal ${ratioPage.toFixed(2)}`);
  let bridageWorker: Calibration["bridageWorker"] = "natif";
  let ratioWorkerLogiciel: number | null = null;
  if (!procheDe4(ratioWorkerNatif)) {
    // Chrome refuse `Emulation.setCPUThrottlingRate` sur la cible worker (#26) : bridage logiciel.
    bridageWorker = "logiciel";
    await context.close();
    ({ context, page, cdp } = await nouvellePage(browser));
    await cdp.brider(taux);
    await page.goto(`${base}/?verif=0&bridageWorker=${taux}`);
    await attendrePret(page);
    dureesMs[`worker ×${taux} (bridage logiciel)`] = await med3(() => page.workers()[0].evaluate(travailWorker, ITERATIONS));
    ratioWorkerLogiciel = dureesMs[`worker ×${taux} (bridage logiciel)`] / dureesMs["worker ×1"];
    if (!procheDe4(ratioWorkerLogiciel)) motifs.push(`ratio du worker avec bridage logiciel ${ratioWorkerLogiciel.toFixed(2)}`);
  }
  // Une touche pressée par Playwright produit une entrée Event Timing (gestionnaire lent : au-delà du seuil de 16 ms).
  await page.evaluate(() => {
    const champ = document.createElement("input");
    champ.id = "calibration-event-timing";
    champ.addEventListener("keydown", () => {
      const fin = performance.now() + 60;
      while (performance.now() < fin) {
        // gestionnaire lent
      }
    });
    document.body.prepend(champ);
  });
  await page.click("#calibration-event-timing");
  await page.keyboard.press("a");
  await dormir(1000);
  const et = await page.evaluate(() => {
    const m = (window as unknown as { __mesures: { events: { nom: string; interactionId: number }[]; inp: unknown[] } }).__mesures;
    return { eventTiming: m.events.some((e) => e.nom === "keydown" && e.interactionId > 0), inp: m.inp.length > 0 };
  });
  if (!et.eventTiming) motifs.push("pas d'entrée Event Timing pour une touche Playwright");
  await context.close();
  return {
    ratioPage,
    ratioWorkerNatif,
    bridageWorker,
    ratioWorkerLogiciel,
    eventTiming: et.eventTiming,
    inpRapporte: et.inp,
    reussite: motifs.length === 0,
    motifs: bridageWorker === "logiciel" ? [...motifs, `worker non bridé par la page (ratio ${ratioWorkerNatif.toFixed(2)}), bridage logiciel appliqué`] : motifs,
    comparaisonModes: null,
    dureesMs,
  };
}

// --- Machine ---------------------------------------------------------------------------

function surSecteur(): boolean | null {
  const racine = "/sys/class/power_supply";
  if (!existsSync(racine)) return null;
  for (const n of readdirSync(racine)) {
    try {
      if (readFileSync(path.join(racine, n, "type"), "utf8").trim() === "Mains") return readFileSync(path.join(racine, n, "online"), "utf8").trim() === "1";
    } catch {
      // ignoré
    }
  }
  return null;
}

function machine(browser: Browser, headless: boolean): Machine {
  let commit = "inconnu";
  try {
    commit = execSync("git rev-parse --short HEAD", { cwd: RACINE }).toString().trim();
    if (execSync("git status --porcelain -- .", { cwd: RACINE }).toString().trim() !== "") commit += " (modifications locales)";
  } catch {
    // hors dépôt
  }
  return {
    cpu: os.cpus()[0]?.model ?? "inconnu",
    coeurs: os.cpus().length,
    ramGo: Math.round(os.totalmem() / 1024 ** 3),
    os: `${os.type()} ${os.release()}`,
    chrome: browser.version(),
    executable: o.navigateur ?? process.env.CHROME_PATH ?? `canal ${o.canal ?? "chrome"}`,
    mode: headless ? "nouveau headless" : "fenêtre visible",
    secteur: surSecteur(),
    node: `${process.versions.bun ? `bun ${process.versions.bun}` : `node ${process.version}`}, Playwright ${JSON.parse(readFileSync(path.join(RACINE, "node_modules/playwright/package.json"), "utf8")).version}`,
    commit,
  };
}

// --- Série -----------------------------------------------------------------------------

async function attendreServeur(): Promise<void> {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base)).ok) return;
    } catch {
      // pas encore prêt
    }
    await dormir(200);
  }
  throw new Error(`vite preview ne répond pas sur ${base}`);
}

async function main() {
  if (!o["sans-build"]) {
    journal("vite build");
    execSync("bunx vite build", { cwd: RACINE, stdio: "ignore" });
  }
  const serveur = spawn("bunx", ["vite", "preview", "--port", o.port!, "--strictPort"], { cwd: RACINE, stdio: "ignore" });
  try {
    await attendreServeur();
    const browser = await lancer(o.headless);
    const date = new Date();
    const nom = `${date.toISOString().slice(0, 19).replaceAll(":", "-")}-${o.fumee ? "fumee" : "serie"}${o.headless ? "-headless" : ""}`;
    const dossier = path.join(RACINE, "mesures", nom);
    mkdirSync(path.join(dossier, "runs"), { recursive: true });
    journal(`série ${nom} : ${browser.version()}, ${o.headless ? "nouveau headless" : "fenêtre visible"}, bridage ×${taux}`);

    journal("calibration");
    const calibration = await calibrer(browser);
    journal(`  ${calibration.reussite ? "réussie" : `échec : ${calibration.motifs.join(" ; ")}`}`);
    const logiciel = calibration.bridageWorker === "logiciel";

    if (o["comparer-modes"]) {
      calibration.comparaisonModes = [];
      for (const headless of [false, true]) {
        const mode = headless ? "nouveau headless" : "fenêtre visible";
        try {
          const b = headless === o.headless ? browser : await lancer(headless);
          const r = await executerRun(b, { index: 0, config: CONFIGURATIONS[0], scenario: "saisie-rapide", lru: LRU_DEFAUT, chauffe: false, balayage: false }, logiciel, null);
          if (b !== browser) await b.close();
          calibration.comparaisonModes.push({ mode, p95Ms: r.resume?.p95Ms ?? null, inpMs: r.resume?.inpMs ?? null, longtasks: r.resume?.longtasks ?? null, erreur: r.erreur });
        } catch (e) {
          calibration.comparaisonModes.push({ mode, p95Ms: null, inpMs: null, longtasks: null, erreur: e instanceof Error ? e.message.split("\n")[0] : String(e) });
        }
      }
    }

    const demandes: DemandeRun[] = planifier(configs, scenarios, chauffe, runs).map((p, i) => ({ index: i + 1, config: p.config, scenario: p.scenario, lru: LRU_DEFAUT, chauffe: p.chauffe, balayage: false }));
    if (!o["sans-lru"])
      for (let r = 0; r < chauffe + runs; r++)
        for (const scenario of ["changement-participant", "mesures-lru"])
          for (const lru of LRU_BALAYAGE)
            demandes.push({ index: demandes.length + 1, config: CONFIGURATIONS[0], scenario, lru, chauffe: r < chauffe, balayage: true });

    const resultats: RunJson[] = [];
    for (const d of demandes) {
      journal(`run ${d.index}/${demandes.length} : ${d.config.nom} · ${d.scenario} · LRU ${d.lru}${d.chauffe ? " (chauffe)" : ""}`);
      const r = await executerRun(browser, d, logiciel, dossier);
      if (r.resume) journal(`  ${r.resume.reussite ? "réussite" : `échec : ${r.resume.motifs.join(", ")}`}`);
      resultats.push(r);
    }
    const infoMachine = machine(browser, o.headless);
    await browser.close();

    const juges = resultats.filter((r) => !r.chauffe && !r.balayage && r.resume);
    const cellules = agreger(juges.map((r) => ({ config: r.config, scenario: r.scenario, resume: r.resume! })));
    const balayageLru = o["sans-lru"]
      ? []
      : LRU_BALAYAGE.map((lru) => {
          const du = resultats.filter((r) => r.balayage && !r.chauffe && r.lru === lru && !r.erreur);
          const changements = du.filter((r) => r.scenario === "changement-participant");
          const lrus = du.filter((r) => r.scenario === "mesures-lru");
          const total = (t: { usedSize: number; backingStorageSize: number } | null | undefined) => (t ? t.usedSize + t.backingStorageSize : undefined);
          // Écart de tas divisé par les instances réellement entrées dans le LRU pendant le remplissage
          // (le LRU contient déjà les lignes visibles au chargement) ; rien à diviser si le LRU était déjà plein.
          const memoire = lrus.flatMap((r) => {
            const a = total(r.memoire.chargement?.worker);
            const b = total(r.memoire["lru-plein"]?.worker);
            const ajoutees = Number(r.mesures[0]?.valeurs.lruFin ?? 0) - Number(r.mesures[0]?.valeurs.lruDebut ?? 0);
            return a !== undefined && b !== undefined && ajoutees > 0 ? [(b - a) / ajoutees / 1024] : [];
          });
          const tasPlein = lrus.flatMap((r) => {
            const b = total(r.memoire["lru-plein"]?.worker);
            return b === undefined ? [] : [b];
          });
          // Instanciation chronométrée dans le worker à vitesse native : × taux sous bridage logiciel.
          const inst = lrus.flatMap((r) => {
            const v = r.mesures[0]?.valeurs.instanciationMsParParticipant;
            return typeof v === "number" ? [v * r.tauxBridageLogiciel] : [];
          });
          return {
            lru,
            reussite: changements.length > 0 ? changements.every((r) => r.resume?.reussite) : null,
            latenceHorsLruMs: mediane(changements.flatMap((r) => r.actions.filter((a) => a.dansLru === false).map((a) => a.latence))),
            memoireWorkerParParticipantKo: mediane(memoire),
            memoireWorkerLruPleinMo: tasPlein.length > 0 ? mediane(tasPlein)! / 1048576 : null,
            instanciationMsParParticipant: mediane(inst),
          };
        });
    const serie: SerieJson = {
      nom,
      date: date.toISOString(),
      fumee: o.fumee,
      options: { bridage: taux, runs, chauffe, configs: configs.map((c) => c.nom), scenarios, court: o.court, viewport: VIEWPORT, jeu: "charge", remplissage: "fin", graine: 1 },
      machine: infoMachine,
      calibration,
      runs: resultats,
      cellules,
      balayageLru,
    };
    writeFileSync(path.join(dossier, "serie.json"), JSON.stringify(serie, null, 1));
    writeFileSync(path.join(dossier, "rapport.md"), rapportMarkdown(serie));
    journal(`rapport : ${path.relative(process.cwd(), path.join(dossier, "rapport.md"))}`);
  } finally {
    serveur.kill();
  }
}

await main();
