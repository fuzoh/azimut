// Harnais de mesure (spec 20, « Scénarios de performance » ; ticket #28) : une
// commande lance, pour un profil de données et chaque taux de bridage demandé,
// une série complète et écrit le JSON brut par run, `serie.json` et
// `rapport.md` dans `prototype/mesures/<horodatage>-<profil>-x<taux>/`.
// Options, recettes et limites : `harnais/README.md`.
//
//   bun run mesure                         référence historique (jeu « charge », P=200, fin, graine 1, ×4)
//   bun run mesure -- --jeu perf --structures a03 --participants 20 --bridage 1,4
//   bun run mesure -- --fumee --court      essai du harnais (1 run par scénario et par configuration)

import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { type Browser, chromium, type LaunchOptions, type Page } from "playwright";
import {
  agreger,
  decomposerSaisies,
  jugerDefilement,
  type Marque,
  type MarquesThread,
  mediane,
  motifsInvalidite,
  planifier,
  ramener,
  ratioAcceptable,
  resumerRun,
  type Tache,
} from "./analyse";
import { CiblesCdp } from "./cdp";
import { categorieProfil, CONFIGURATIONS, type Configuration, ErreurOptions, idProfil, lireOptions, MESURES, type Options, SCENARIOS_JUGES, urlRun } from "./options";
import { type BalayageLru, type Calibration, type Dimensions, type Machine, type ProfilRapporte, rapportMarkdown, type RunJson, type SerieJson } from "./rapport";
import { type Contexte, mesuresLru, mesuresSansCritere, type ResultatScenario, SCENARIOS } from "./scenarios";

const RACINE = path.resolve(import.meta.dirname, "..");
const WEB_VITALS = path.join(RACINE, "node_modules/web-vitals/dist/web-vitals.iife.js");
const COLLECTEUR = path.join(import.meta.dirname, "collecteur.js");
const VIEWPORT = { width: 1600, height: 1000 };

let o: Options;
try {
  o = lireOptions(process.argv.slice(2));
} catch (e) {
  if (e instanceof ErreurOptions) {
    console.error(e.message);
    console.error("Options et recettes : prototype/harnais/README.md");
    process.exit(2);
  }
  throw e;
}

const base = `http://localhost:${o.port}`;
let navigateur = o.navigateur ?? process.env.CHROME_PATH;
const commande = `bun harnais/serie.ts ${process.argv.slice(2).join(" ")}`.trim();

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const journal = (m: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const message = (e: unknown) => (e instanceof Error ? e.message.split("\n")[0] : String(e));
const estJuge = (s: string): s is (typeof SCENARIOS_JUGES)[number] => (SCENARIOS_JUGES as readonly string[]).includes(s);

// --- Navigateur ------------------------------------------------------------------------

function optionsLancement(headless: boolean): LaunchOptions {
  // Chrome en fenêtre visible par défaut (pas chrome-headless-shell) ; headless = nouveau headless du vrai Chrome.
  const args = ["--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows", `--window-size=${VIEWPORT.width},${VIEWPORT.height + 120}`];
  if (navigateur) return { executablePath: navigateur, headless, args };
  return { channel: o.canal ?? "chrome", headless, args };
}

async function lancer(headless: boolean): Promise<Browser> {
  if (!headless && process.platform === "linux" && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY)
    throw new Error("fenêtre visible impossible : pas d'affichage (DISPLAY absent) ; --headless pour le nouveau headless (chiffres non valables)");
  try {
    return await chromium.launch(optionsLancement(headless));
  } catch (e) {
    // Sans Chrome installé : Chromium du système, s'il existe.
    if (!navigateur && existsSync("/usr/bin/chromium")) {
      journal(`canal ${o.canal ?? "chrome"} indisponible, repli sur /usr/bin/chromium`);
      navigateur = "/usr/bin/chromium";
      return chromium.launch(optionsLancement(headless));
    }
    throw e;
  }
}

async function nouvellePage(browser: Browser) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  // Un seul script : Playwright isole chaque script injecté, le global `webVitals` de l'IIFE doit être visible du collecteur.
  await context.addInitScript({ content: `${readFileSync(WEB_VITALS, "utf8")}\n${readFileSync(COLLECTEUR, "utf8")}` });
  const page = await context.newPage();
  // Une erreur de page invalide le run (ticket #28) : elle est gardée, pas seulement journalisée.
  const erreursPage: string[] = [];
  page.on("pageerror", (e) => {
    erreursPage.push(message(e));
    journal(`erreur de page : ${e.message}`);
  });
  const cdp = await CiblesCdp.ouvrir(context, page);
  return { context, page, cdp, erreursPage };
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

/** Somme de contrôle des sources, statut du worker, délais dépassés et dimensions de la table. */
async function lireEtatPage(page: Page): Promise<{ somme: string | null; statutWorker: string | null; delaisDepasses: number; dimensions: Dimensions | null }> {
  return page.evaluate(() => {
    const t = document.querySelector('[data-testid="table"]') as HTMLElement | null;
    const az = (window as unknown as { __azimut?: { delaisDepasses(): number } }).__azimut;
    return {
      somme: (document.querySelector('[data-testid="jeu"]') as HTMLElement | null)?.dataset.somme ?? null,
      statutWorker: (document.querySelector('[data-testid="worker"]') as HTMLElement | null)?.dataset.statut ?? null,
      delaisDepasses: az?.delaisDepasses() ?? 0,
      dimensions: t
        ? {
            grille: Number(t.dataset.grille),
            lignes: Number(t.dataset.lignes),
            colonnes: Number(t.dataset.colonnes),
            lignesRendues: Number(t.dataset.lignesRendues),
            colonnesRendues: Number(t.dataset.colonnesRendues),
            largeur: t.clientWidth,
            hauteur: t.clientHeight,
            debordementVertical: t.scrollHeight - t.clientHeight,
            debordementHorizontal: t.scrollWidth - t.clientWidth,
          }
        : null,
    };
  });
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

interface ContexteSerie {
  taux: number;
  /** Bridage logiciel du worker (calibration) : `bridageWorker=taux` dans l'URL des configurations à worker. */
  bridageLogiciel: boolean;
  /** Somme de contrôle du profil : un run aux sources différentes est invalide. */
  sommeProfil: string | null;
}

async function executerRun(browser: Browser, d: DemandeRun, s: ContexteSerie, dossier: string | null): Promise<RunJson> {
  const fichier = `${String(d.index).padStart(3, "0")}-${d.config.nom}-lru${d.lru}-${d.scenario}${d.chauffe ? "-chauffe" : ""}.json`;
  const logiciel = s.bridageLogiciel && d.config.store.lieu === "worker";
  const url = urlRun(base, o.profil, d.config.store, d.lru, logiciel ? s.taux : null);
  const run: RunJson = {
    index: d.index,
    fichier,
    config: d.config.nom,
    scenario: d.scenario,
    lru: d.lru,
    chauffe: d.chauffe,
    balayage: d.balayage,
    url,
    tauxBridageLogiciel: logiciel ? s.taux : 1,
    valide: false,
    invalidite: [],
    erreursPage: [],
    delaisDepasses: 0,
    somme: null,
    statutWorker: null,
    dimensions: null,
    operations: null,
    nonApplicable: [],
    resume: null,
    saisies: [],
    actions: [],
    mesures: [],
    memoire: {},
    demarrage: {},
    constats: [],
  };
  const { context, page, cdp, erreursPage } = await nouvellePage(browser);
  let brut: Brut | null = null;
  try {
    await cdp.brider(s.taux);
    await page.goto(url);
    await attendrePret(page);
    const etat = await lireEtatPage(page);
    run.somme = etat.somme;
    run.dimensions = etat.dimensions;
    if (etat.dimensions?.grille !== o.profil.grille) throw new Error(`grille active ${etat.dimensions?.grille ?? "absente"} au lieu de ${o.profil.grille}`);
    run.memoire.chargement = await cdp.memoire();
    const c: Contexte = { page, cdp, lru: d.lru, court: o.court };
    const debut = await page.evaluate(() => performance.now());
    let r: ResultatScenario;
    if (d.scenario === MESURES) r = await mesuresSansCritere(c);
    else if (d.scenario === "mesures-lru") r = await mesuresLru(c);
    else if (estJuge(d.scenario)) r = await SCENARIOS[d.scenario](c);
    else throw new Error(`scénario inconnu : ${d.scenario}`);
    const fin = await page.evaluate(() => performance.now());
    run.operations = r.operations;
    run.defilement = r.defilement;
    run.nonApplicable = r.nonApplicable ?? [];
    run.memoire = { ...run.memoire, ...r.memoire, fin: await cdp.memoire() };
    run.actions = r.actions;
    run.mesures = r.mesures;
    brut = await lireBrut(page);
    run.demarrage = demarrage(brut);
    const marques: Marque[] = [...brut.page.marques, ...(brut.worker ? ramener(brut.worker, brut.page.origine) : [])];
    const validations = brut.collecteur.actions.filter((a) => a.type === "keydown" && a.cle === "Tab" && a.t >= debut && a.t <= fin).map((a) => a.t);
    run.saisies = decomposerSaisies(marques, validations);
    if (estJuge(d.scenario))
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
    run.erreur = message(e);
    journal(`  erreur : ${run.erreur}`);
  }
  try {
    const fin = await lireEtatPage(page);
    run.statutWorker = fin.statutWorker;
    run.delaisDepasses = fin.delaisDepasses;
  } catch {
    // page inutilisable : l'erreur du run suffit
  }
  await context.close();
  run.erreursPage = [...erreursPage];
  run.invalidite = motifsInvalidite({
    scenario: d.scenario,
    erreur: run.erreur,
    erreursPage: run.erreursPage,
    delaisDepasses: run.delaisDepasses,
    operations: run.operations,
    statutWorker: run.statutWorker,
    somme: run.somme,
    sommeProfil: s.sommeProfil,
    saisies: run.saisies.length,
    defilement: run.defilement,
  });
  run.valide = run.invalidite.length === 0;
  if (dossier) writeFileSync(path.join(dossier, "runs", fichier), JSON.stringify({ ...run, brut }, null, 1));
  return run;
}

// --- Profil de données -----------------------------------------------------------------

/** Écarts entre la session chargée et le profil demandé (jeu, structures, effectif, remplissage, graine, grille active). */
function verifierProfil(session: ProfilRapporte["session"], grille: number | null): string[] {
  const d = o.profil;
  const ecarts: string[] = [];
  if (session.jeu !== d.jeu) ecarts.push(`jeu ${session.jeu} au lieu de ${d.jeu}`);
  if (session.structures.join(",") !== d.structures.join(",")) ecarts.push(`structures ${session.structures.join(",")} au lieu de ${d.structures.join(",")}`);
  if (session.participants !== d.participants) ecarts.push(`${session.participants} participants au lieu de ${d.participants}`);
  if (session.remplissage !== d.remplissage) ecarts.push(`remplissage ${session.remplissage} au lieu de ${d.remplissage}`);
  if (session.graine !== d.graine) ecarts.push(`graine ${session.graine} au lieu de ${d.graine}`);
  if (grille !== d.grille) ecarts.push(`grille active ${grille} au lieu de ${d.grille}`);
  return ecarts;
}

/** Profil lu une fois, sur une page à part (configuration de base, sans bridage) : volumes, empreintes, somme. */
async function sonderProfil(browser: Browser): Promise<ProfilRapporte> {
  const { context, page, erreursPage } = await nouvellePage(browser);
  try {
    const url = urlRun(base, o.profil, CONFIGURATIONS[0].store, o.lru, null);
    await page.goto(url);
    await attendrePret(page);
    const session = (await page.evaluate(() => (window as unknown as { __azimut: { profil(): unknown } }).__azimut.profil())) as ProfilRapporte["session"];
    const etat = await lireEtatPage(page);
    if (erreursPage.length > 0) throw new Error(`erreur de page pendant la lecture du profil : ${erreursPage[0]}`);
    // Les options pilotent réellement la session : sinon, pas de série.
    const ecarts = verifierProfil(session, etat.dimensions?.grille ?? null);
    if (ecarts.length > 0) throw new Error(`la session chargée ne correspond pas aux options : ${ecarts.join(" ; ")}`);
    return {
      id: idProfil(o.profil),
      categorie: categorieProfil(o.profil),
      demande: o.profil,
      url,
      session,
      dimensions: etat.dimensions,
    };
  } finally {
    await context.close();
  }
}

// --- Calibration -----------------------------------------------------------------------

const ITERATIONS = 30_000_000;

/**
 * Calibration d'une série à ×taux. Sans bridage (×1), aucun ralentissement
 * n'est attendu : seules les durées de référence et l'entrée Event Timing sont
 * vérifiées. Avec bridage, le ratio du thread principal doit être proche du
 * taux ; si le bridage de la page n'atteint pas le worker, le worker est bridé
 * par logiciel et ce ratio-là est vérifié à son tour.
 */
async function calibrer(browser: Browser, taux: number): Promise<Calibration> {
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
  let ratioPage: number | null = null;
  let ratioWorkerNatif: number | null = null;
  let ratioWorkerLogiciel: number | null = null;
  let bridageWorker: Calibration["bridageWorker"] = "aucun";
  if (taux > 1) {
    await cdp.brider(taux);
    dureesMs[`page ×${taux}`] = await med3(() => page.evaluate(travailPage, ITERATIONS));
    dureesMs[`worker ×${taux} (page bridée)`] = await med3(() => w.evaluate(travailWorker, ITERATIONS));
    ratioPage = dureesMs[`page ×${taux}`] / dureesMs["page ×1"];
    ratioWorkerNatif = dureesMs[`worker ×${taux} (page bridée)`] / dureesMs["worker ×1"];
    if (!ratioAcceptable(ratioPage, taux)) motifs.push(`ratio du thread principal ${ratioPage.toFixed(2)}`);
    bridageWorker = "natif";
    if (!ratioAcceptable(ratioWorkerNatif, taux)) {
      // Chrome refuse `Emulation.setCPUThrottlingRate` sur la cible worker (#26) : bridage logiciel.
      bridageWorker = "logiciel";
      await context.close();
      ({ context, page, cdp } = await nouvellePage(browser));
      await cdp.brider(taux);
      await page.goto(`${base}/?verif=0&bridageWorker=${taux}`);
      await attendrePret(page);
      dureesMs[`worker ×${taux} (bridage logiciel)`] = await med3(() => page.workers()[0].evaluate(travailWorker, ITERATIONS));
      ratioWorkerLogiciel = dureesMs[`worker ×${taux} (bridage logiciel)`] / dureesMs["worker ×1"];
      if (!ratioAcceptable(ratioWorkerLogiciel, taux)) motifs.push(`ratio du worker avec bridage logiciel ${ratioWorkerLogiciel.toFixed(2)}`);
    }
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
    taux,
    ratioPage,
    ratioWorkerNatif,
    bridageWorker,
    ratioWorkerLogiciel,
    eventTiming: et.eventTiming,
    inpRapporte: et.inp,
    reussite: motifs.length === 0,
    motifs: bridageWorker === "logiciel" ? [...motifs, `worker non bridé par la page (ratio ${ratioWorkerNatif!.toFixed(2)}), bridage logiciel appliqué`] : motifs,
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

function version(paquet: string): string {
  try {
    return JSON.parse(readFileSync(path.join(RACINE, "node_modules", paquet, "package.json"), "utf8")).version;
  } catch {
    return "inconnue";
  }
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
    executable: navigateur ?? `canal ${o.canal ?? "chrome"}`,
    mode: headless ? "nouveau headless" : "fenêtre visible",
    secteur: surSecteur(),
    node: `${process.versions.bun ? `bun ${process.versions.bun}` : `node ${process.version}`}, Playwright ${version("playwright")}`,
    versions: { react: version("react"), "@tanstack/db": version("@tanstack/db"), "alien-signals": version("alien-signals"), vite: version("vite") },
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

/** Dossier neuf de la série : refuse d'écrire dans un dossier existant (artefacts du 7 octobre compris). */
function dossierNeuf(nom: string): string {
  const parent = path.join(RACINE, "mesures");
  mkdirSync(parent, { recursive: true });
  const dossier = path.join(parent, nom);
  mkdirSync(dossier); // EEXIST si le dossier existe déjà
  mkdirSync(path.join(dossier, "runs"));
  return dossier;
}

async function executerSerie(browser: Browser, taux: number, profil: ProfilRapporte): Promise<string> {
  const date = new Date();
  const nom = `${date.toISOString().slice(0, 19).replaceAll(":", "-")}-${profil.id}-x${taux}${o.fumee ? "-fumee" : ""}${o.headless ? "-headless" : ""}`;
  const dossier = dossierNeuf(nom);
  journal(`série ${nom} : ${browser.version()}, ${o.headless ? "nouveau headless" : "fenêtre visible"}, bridage ×${taux}, profil ${profil.id} (${profil.categorie})`);

  journal("calibration");
  const calibration = await calibrer(browser, taux);
  journal(`  ${calibration.reussite ? "réussie" : `échec : ${calibration.motifs.join(" ; ")}`}`);
  const contexte: ContexteSerie = { taux, bridageLogiciel: calibration.bridageWorker === "logiciel", sommeProfil: profil.session.sommeControle };

  if (o.comparerModes) {
    calibration.comparaisonModes = [];
    for (const headless of [false, true]) {
      const mode = headless ? "nouveau headless" : "fenêtre visible";
      try {
        const b = headless === o.headless ? browser : await lancer(headless);
        const r = await executerRun(b, { index: 0, config: CONFIGURATIONS[0], scenario: "saisie-rapide", lru: o.lru, chauffe: false, balayage: false }, contexte, null);
        if (b !== browser) await b.close();
        calibration.comparaisonModes.push({ mode, p95Ms: r.resume?.p95Ms ?? null, inpMs: r.resume?.inpMs ?? null, longtasks: r.resume?.longtasks ?? null, erreur: r.erreur });
      } catch (e) {
        calibration.comparaisonModes.push({ mode, p95Ms: null, inpMs: null, longtasks: null, erreur: message(e) });
      }
    }
  }

  const demandes: DemandeRun[] = planifier(o.configs, o.scenarios, o.chauffe, o.runs).map((p, i) => ({ index: i + 1, config: p.config, scenario: p.scenario, lru: o.lru, chauffe: p.chauffe, balayage: false }));
  if (o.lruBalayage)
    for (let r = 0; r < o.chauffe + o.runs; r++)
      for (const scenario of ["changement-participant", "mesures-lru"])
        for (const lru of o.lruBalayage) demandes.push({ index: demandes.length + 1, config: CONFIGURATIONS[0], scenario, lru, chauffe: r < o.chauffe, balayage: true });

  const resultats: RunJson[] = [];
  for (const d of demandes) {
    journal(`run ${d.index}/${demandes.length} : ${d.config.nom} · ${d.scenario} · LRU ${d.lru}${d.chauffe ? " (chauffe)" : ""}`);
    const r = await executerRun(browser, d, contexte, dossier);
    if (!r.valide) journal(`  invalide : ${r.invalidite.join(" ; ")}`);
    else if (r.resume) journal(`  ${r.resume.reussite ? "réussite" : `échec : ${r.resume.motifs.join(", ")}`}`);
    resultats.push(r);
  }

  const nonApplicable = (r: RunJson) => r.defilement !== undefined && jugerDefilement(r.defilement).statut === "non applicable";
  const juges = resultats.filter((r) => !r.chauffe && !r.balayage && estJuge(r.scenario));
  const cellules = agreger(juges.map((r) => ({ config: r.config, scenario: r.scenario, resume: r.resume, valide: r.valide, nonApplicable: nonApplicable(r) })));
  const balayageLru: BalayageLru[] = (o.lruBalayage ?? []).map((lru) => {
    const du = resultats.filter((r) => r.balayage && !r.chauffe && r.lru === lru);
    const valides = du.filter((r) => r.valide);
    const changements = du.filter((r) => r.scenario === "changement-participant");
    const lrus = valides.filter((r) => r.scenario === "mesures-lru");
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
    const cellule = agreger(changements.map((r) => ({ config: r.config, scenario: r.scenario, resume: r.resume, valide: r.valide })))[0];
    const actions = changements.filter((r) => r.valide).flatMap((r) => r.actions);
    return {
      lru,
      statut: cellule?.statut ?? "non mesurée",
      runsInvalides: du.length - valides.length,
      actionsHorsLru: actions.filter((a) => a.dansLru === false).length,
      actionsDansLru: actions.filter((a) => a.dansLru === true).length,
      cohorteDansLeCache: profil.session.participants <= lru,
      latenceHorsLruMs: mediane(actions.filter((a) => a.dansLru === false).map((a) => a.latence)),
      memoireWorkerParParticipantKo: mediane(memoire),
      memoireWorkerLruPleinMo: tasPlein.length > 0 ? mediane(tasPlein)! / 1048576 : null,
      instanciationMsParParticipant: mediane(inst),
    };
  });
  const infoMachine = machine(browser, o.headless);
  const serie: SerieJson = {
    nom,
    date: date.toISOString(),
    fumee: o.fumee,
    instrumentation: "mesure",
    commande,
    profil,
    options: {
      bridage: taux,
      runs: o.runs,
      chauffe: o.chauffe,
      configs: o.configs.map((c) => c.nom),
      scenarios: o.scenarios,
      court: o.court,
      viewport: VIEWPORT,
      lru: o.lru,
      lruBalayage: o.lruBalayage,
      jeu: o.profil.jeu,
      structures: o.profil.structures,
      participants: o.profil.participants,
      remplissage: o.profil.remplissage,
      graine: o.profil.graine,
      grille: o.profil.grille,
    },
    machine: infoMachine,
    calibration,
    runs: resultats,
    cellules,
    balayageLru,
  };
  writeFileSync(path.join(dossier, "serie.json"), JSON.stringify(serie, null, 1));
  writeFileSync(path.join(dossier, "rapport.md"), rapportMarkdown(serie));
  return path.join(dossier, "rapport.md");
}

async function main() {
  if (!o.sansBuild) {
    journal("vite build");
    execSync("bunx vite build", { cwd: RACINE, stdio: "ignore" });
  }
  const serveur = spawn("bunx", ["vite", "preview", "--port", String(o.port), "--strictPort"], { cwd: RACINE, stdio: "ignore" });
  try {
    await attendreServeur();
    const browser = await lancer(o.headless);
    try {
      journal(`profil ${idProfil(o.profil)}`);
      const profil = await sonderProfil(browser);
      for (const g of profil.session.grilles)
        journal(`  ${g.nom} : ${g.donnees} données, ${g.calculs} calculs, ${g.casesStockees}/${g.casesPossibles} cases, empreinte ${g.empreinte}`);
      for (const taux of o.bridages) {
        const rapport = await executerSerie(browser, taux, profil);
        journal(`rapport : ${path.relative(process.cwd(), rapport)}`);
      }
    } finally {
      await browser.close();
    }
  } finally {
    serveur.kill();
  }
}

await main();
