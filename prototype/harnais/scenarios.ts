// Scénarios de performance (spec 20, tableau « Scénario / Déroulé ») joués au
// clavier et à la souris par Playwright, plus les mesures sans critère. Chaque
// scénario rend ses fenêtres et ses chronos ; les tâches longues, l'INP et les
// marques sont relus par le harnais en fin de run.

import type { Page } from "playwright";
import type { CiblesCdp, MemoireCibles } from "./cdp";

export interface Contexte {
  page: Page;
  cdp: CiblesCdp;
  /** N du LRU de la configuration. */
  lru: number;
  /** Version courte des déroulés (essai du harnais, pas une série). */
  court: boolean;
}

/** Chrono d'une action : du début (timeStamp de l'événement, ou de l'action pilotée) à la peinture stable. */
export interface ChronoAction {
  type: string;
  debut: number;
  fin: number;
  latence: number;
  /** Changement de participant / graphe : aucune instance créée pendant le choix du participant (observé). */
  dansLru?: boolean;
  /** Instances de participant créées pendant le choix du participant. */
  instanciations?: number;
}

/** Mesure sans critère, avec sa fenêtre pour le garde-fou des 50 ms. */
export interface MesureSansCritere {
  nom: string;
  fenetre: { debut: number; fin: number };
  valeurs: Record<string, unknown>;
  /** Un dépassement des 50 ms est un constat non bloquant (bascule du modèle). */
  exceptionGardeFou?: boolean;
}

export interface ResultatScenario {
  actions: ChronoAction[];
  mesures: MesureSansCritere[];
  memoire: Record<string, MemoireCibles>;
}

type Scenario = (c: Contexte) => Promise<ResultatScenario>;

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const maintenant = (page: Page) => page.evaluate(() => performance.now());
const stable = (page: Page) => page.evaluate(() => (window as unknown as { __azimut: { stable(): Promise<number> } }).__azimut.stable());

/** `timeStamp` de la dernière action du collecteur d'un type donné, après `apres`. */
async function derniereAction(page: Page, type: string, apres: number): Promise<number | null> {
  return page.evaluate(
    ([type, apres]) => {
      const a = (window as unknown as { __mesures: { actions: { type: string; t: number }[] } }).__mesures.actions.filter(
        (x) => x.type === type && x.t >= (apres as number),
      );
      return a.length > 0 ? a[a.length - 1].t : null;
    },
    [type, apres] as const,
  );
}

const HAUTEUR_LIGNE = 24;
const TABLE = '[data-testid="table"]';

async function participantsRendus(page: Page): Promise<number[]> {
  return page.$$eval(`${TABLE} th.nom[data-participant]`, (els) => els.map((e) => Number((e as HTMLElement).dataset.participant)));
}

async function defilerVersLigne(page: Page, ligne: number): Promise<void> {
  await page.evaluate(
    ([sel, y]) => {
      document.querySelector(sel as string)!.scrollTop = y as number;
    },
    [TABLE, ligne * HAUTEUR_LIGNE] as const,
  );
  await page.waitForSelector(`${TABLE} th.nom[data-participant="${ligne}"]`);
}

// --- Saisie rapide -------------------------------------------------------------------

async function saisieRapide(c: Contexte, nombre = c.court ? 20 : 100, intervalleMs = 200, parParticipant = 20): Promise<void> {
  const { page } = c;
  const visibles = await participantsRendus(page);
  const debut = Date.now();
  let p = -1;
  let noeuds: string[] = [];
  for (let i = 0; i < nombre; i++) {
    if (i % parParticipant === 0) {
      // Changement de participant toutes les 20 cases : un participant affiché, 3 lignes plus bas.
      p = visibles[Math.min(visibles.length - 1, 3 * (i / parParticipant))];
      await page.click(`${TABLE} th.nom[data-participant="${p}"]`);
      noeuds = (await page.$$eval(`${TABLE} input[data-participant="${p}"]`, (els) => els.map((e) => (e as HTMLElement).dataset.noeud!))).slice(0, parParticipant);
      if (noeuds.length === 0) throw new Error(`aucune case saisissable pour le participant ${p}`);
    }
    const noeud = noeuds[i % parParticipant % noeuds.length];
    // Valeur différente de la valeur actuelle (sinon React n'émet pas de changement) ; Tab a pu faire
    // défiler la table vers la droite (colonnes virtualisées) : retour à gauche.
    const valeur = await page.evaluate(
      ([sel, p, noeud, i]) => {
        const t = document.querySelector(sel as string)!;
        if (t.scrollLeft !== 0) t.scrollLeft = 0;
        const az = (window as unknown as { __azimut: { valeurSaisie(g: number, p: number, n: string, i: number): string } }).__azimut;
        return az.valeurSaisie(0, p as number, noeud as string, i as number);
      },
      [TABLE, p, noeud, i] as const,
    );
    await page.click(`${TABLE} input[data-participant="${p}"][data-noeud="${noeud}"]`);
    await page.keyboard.press("Control+A");
    await page.keyboard.type(valeur);
    await page.keyboard.press("Tab");
    const attente = debut + (i + 1) * intervalleMs - Date.now();
    if (attente > 0) await dormir(attente);
  }
}

// --- Changement de participant, ouverture du graphe -----------------------------------

/**
 * Choisit un participant : visé dans le LRU (une autre ligne affichée), ou
 * hors du LRU (saut vers un bloc de 50 lignes non affiché récemment, puis
 * clic). Rend le début de l'action (horloge de la page) et le compteur
 * d'instanciations avant l'action : l'appartenance au LRU est observée par
 * l'appelant, pas supposée (avec N ≥ 200, tout le jeu tient dans le LRU).
 */
async function choisirParticipant(c: Contexte, i: number, etat: { bloc: number }): Promise<{ debut: number; instAvant: number }> {
  const { page } = c;
  const viseDansLru = i % 2 === 1;
  const total = Number(await page.getAttribute(TABLE, "data-lignes"));
  const blocs = Math.max(1, Math.floor(total / 50));
  if (viseDansLru) {
    const p = etat.bloc * 50 + 5 + (i % 10);
    // La table remontée (retour du graphe) revient en haut : on réaffiche le bloc courant, encore dans le LRU.
    if ((await page.$(`${TABLE} th.nom[data-participant="${p}"]`)) === null) {
      await defilerVersLigne(page, etat.bloc * 50);
      await stable(page);
    }
    const instAvant = (await statsInstanciation(page)).nombre;
    const avant = await maintenant(page);
    await page.click(`${TABLE} th.nom[data-participant="${p}"]`);
    return { debut: (await derniereAction(page, "click", avant)) ?? avant, instAvant };
  }
  etat.bloc = (etat.bloc + 1) % blocs;
  const instAvant = (await statsInstanciation(page)).nombre;
  const debut = await maintenant(page);
  await defilerVersLigne(page, etat.bloc * 50);
  await page.click(`${TABLE} th.nom[data-participant="${etat.bloc * 50 + 2}"]`);
  return { debut, instAvant };
}

/** Instanciations depuis `instAvant`, lues une fois l'affichage stable. */
async function lruObserve(page: Page, instAvant: number): Promise<{ dansLru: boolean; instanciations: number }> {
  const instanciations = (await statsInstanciation(page)).nombre - instAvant;
  return { dansLru: instanciations === 0, instanciations };
}

async function changementParticipant(c: Contexte): Promise<ResultatScenario> {
  const actions: ChronoAction[] = [];
  const etat = { bloc: 0 };
  for (let i = 0; i < (c.court ? 6 : 30); i++) {
    const { debut, instAvant } = await choisirParticipant(c, i, etat);
    const fin = await stable(c.page);
    actions.push({ type: "participant", debut, fin, latence: fin - debut, ...(await lruObserve(c.page, instAvant)) });
    await dormir(300);
  }
  return { actions, mesures: [], memoire: {} };
}

async function ouvertureGraphe(c: Contexte): Promise<ResultatScenario> {
  const { page } = c;
  const actions: ChronoAction[] = [];
  const etat = { bloc: 0 };
  for (let i = 0; i < (c.court ? 2 : 10); i++) {
    const { instAvant } = await choisirParticipant(c, i, etat);
    await stable(page);
    const lru = await lruObserve(page, instAvant);
    const avant = await maintenant(page);
    await page.click('[data-action="vue"]');
    await page.waitForSelector('[data-testid="graphe"]');
    const fin = await stable(page);
    const debut = (await derniereAction(page, "click", avant)) ?? avant;
    actions.push({ type: "graphe", debut, fin, latence: fin - debut, ...lru });
    await page.click('[data-action="vue"]');
    await page.waitForSelector(TABLE);
    await stable(page);
    await dormir(300);
  }
  return { actions, mesures: [], memoire: {} };
}

// --- Changement d'axe / de vue ------------------------------------------------------

async function changementAxeVue(c: Contexte): Promise<ResultatScenario> {
  const { page } = c;
  const actions: ChronoAction[] = [];
  const axes = await page.$$eval('[data-testid="axe"] option', (os) => os.map((o) => (o as HTMLOptionElement).value));
  const n = c.court ? 3 : 10;
  for (let i = 0; i < n; i++) {
    const avant = await maintenant(page);
    await page.selectOption('[data-testid="axe"]', axes[(i + 1) % axes.length]);
    const fin = await stable(page);
    const debut = (await derniereAction(page, "change", avant)) ?? avant;
    actions.push({ type: "axe", debut, fin, latence: fin - debut });
    await dormir(200);
  }
  for (let i = 0; i < n + (n % 2); i++) {
    const avant = await maintenant(page);
    await page.click('[data-action="vue"]');
    await page.waitForSelector(i % 2 === 0 ? '[data-testid="graphe"]' : TABLE);
    const fin = await stable(page);
    const debut = (await derniereAction(page, "click", avant)) ?? avant;
    actions.push({ type: "vue", debut, fin, latence: fin - debut });
    await dormir(200);
  }
  return { actions, mesures: [], memoire: {} };
}

// --- Défilement -----------------------------------------------------------------------

async function defilement(c: Contexte): Promise<ResultatScenario> {
  const { page } = c;
  const boite = (await page.locator(TABLE).boundingBox())!;
  await page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
  const dureeMs = c.court ? 1500 : 5000;
  for (const [dx, dy] of [
    [0, 100],
    [100, 0],
  ]) {
    const debut = Date.now();
    while (Date.now() - debut < dureeMs) {
      await page.mouse.wheel(dx, dy);
      await dormir(16);
    }
  }
  await stable(page);
  return { actions: [], mesures: [], memoire: {} };
}

// --- Scénarios jugés ------------------------------------------------------------------

export const SCENARIOS: Record<string, Scenario> = {
  "saisie-rapide": async (c) => {
    await saisieRapide(c);
    return { actions: [], mesures: [], memoire: {} };
  },
  "saisies-distantes": async (c) => {
    const { page } = c;
    const simulateur = (actif: boolean) =>
      page.evaluate((a) => (window as unknown as { __azimut: { simulateur(a: boolean): void } }).__azimut.simulateur(a), actif);
    await simulateur(true);
    await saisieRapide(c);
    // Puis les saisies distantes seules pendant 30 s.
    await dormir(c.court ? 4000 : 30_000);
    await simulateur(false);
    return { actions: [], mesures: [], memoire: {} };
  },
  "changement-participant": changementParticipant,
  "changement-axe-vue": changementAxeVue,
  defilement,
  "ouverture-graphe": ouvertureGraphe,
};

// --- Mesures sans critère -------------------------------------------------------------

/** Remplit le LRU : défile toute la table par blocs, en attendant la stabilité à chaque bloc. */
async function remplirLru(c: Contexte): Promise<MesureSansCritere> {
  const { page } = c;
  const debut = await maintenant(page);
  const total = Number(await page.getAttribute(TABLE, "data-lignes"));
  const avant = await statsInstanciation(page);
  for (let ligne = 0; ligne < total; ligne += 30) {
    await defilerVersLigne(page, ligne);
    await stable(page);
  }
  const fin = await maintenant(page);
  const apres = await statsInstanciation(page);
  return {
    nom: "remplissage-lru",
    fenetre: { debut, fin },
    valeurs: {
      lignes: total,
      lruDebut: avant.lruTaille,
      lruFin: apres.lruTaille,
      instanciations: apres.nombre - avant.nombre,
      instanciationMs: apres.totalMs - avant.totalMs,
      instanciationMsParParticipant: apres.nombre > avant.nombre ? (apres.totalMs - avant.totalMs) / (apres.nombre - avant.nombre) : null,
    },
  };
}

/** Compteurs d'instanciation : dans le worker s'il existe, sinon sur le thread principal. */
async function statsInstanciation(page: Page): Promise<{ nombre: number; totalMs: number; lruTaille: number }> {
  const w = page.workers()[0];
  const lire = () =>
    (globalThis as unknown as { __azimutStats?: { nombre: number; totalMs: number; lruTaille: number } }).__azimutStats ?? { nombre: 0, totalMs: 0, lruTaille: 0 };
  return w ? w.evaluate(lire) : page.evaluate(lire);
}

async function piloter<T extends Record<string, unknown>>(page: Page, nom: string, f: string, arg: number | null, exception = false): Promise<MesureSansCritere> {
  const debut = await maintenant(page);
  const valeurs = (await page.evaluate(
    ([f, arg]) => {
      const az = (window as unknown as { __azimut: Record<string, (a: unknown) => Promise<unknown>> }).__azimut;
      return az[f as string](arg);
    },
    [f, arg] as const,
  )) as T;
  const fin = await maintenant(page);
  return { nom, fenetre: { debut, fin }, valeurs, exceptionGardeFou: exception };
}

/** Mesures sans critère d'une configuration : LRU plein (mémoire), 1000 écritures, copie, bascule du modèle. */
export async function mesuresSansCritere(c: Contexte, avecLru = true): Promise<ResultatScenario> {
  const { page, cdp } = c;
  const mesures: MesureSansCritere[] = [];
  const memoire: Record<string, MemoireCibles> = {};
  if (avecLru) {
    mesures.push(await remplirLru(c));
    memoire["lru-plein"] = await cdp.memoire();
  }
  const serie = await piloter<{ dureesMs: number[]; totalMs: number }>(page, "ecritures-en-serie", "ecrituresEnSerie", c.court ? 100 : 1000);
  const d = [...(serie.valeurs.dureesMs as number[])].sort((a, b) => a - b);
  serie.valeurs = {
    nombre: d.length,
    totalMs: serie.valeurs.totalMs,
    medianeMs: d[Math.floor(d.length / 2)],
    p95Ms: d[Math.min(d.length - 1, Math.ceil(0.95 * d.length) - 1)],
    maxMs: d[d.length - 1],
  };
  mesures.push(serie);
  mesures.push(await piloter(page, "copie-grille", "copier", 0));
  mesures.push(await piloter(page, "bascule-modele", "basculerModele", null, true));
  return { actions: [], mesures, memoire };
}

/** Balayage du N du LRU : seulement le remplissage du LRU (mémoire et instanciation). */
export async function mesuresLru(c: Contexte): Promise<ResultatScenario> {
  const mesure = await remplirLru(c);
  return { actions: [], mesures: [mesure], memoire: { "lru-plein": await c.cdp.memoire() } };
}
