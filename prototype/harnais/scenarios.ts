// Scénarios de performance (spec 20, tableau « Scénario / Déroulé ») joués au
// clavier et à la souris par Playwright, plus les mesures sans critère. Chaque
// scénario rend ses fenêtres, ses chronos et les opérations exécutées ; les
// tâches longues, l'INP et les marques sont relus par le harnais en fin de run.
//
// Ticket #28 : rien ne suppose 200 participants, la grille 0 ou les axes de G3.
// Participants, cases, axes et vues sont lus sur la page (grille active,
// lignes réellement présentes) ; un axe de défilement sans débordement est
// « non applicable » ; un délai de stabilité dépassé lève une erreur (run
// invalide) au lieu de rendre une durée tronquée.

import type { Page } from "playwright";
import type { AxeDefilement, Operations } from "./analyse";
import type { CiblesCdp, MemoireCibles } from "./cdp";
import { SCENARIOS_JUGES } from "./options";

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
  operations: Operations;
  /** Défilement : débordement et déplacement effectif par axe. */
  defilement?: AxeDefilement[];
  /** Parties du déroulé sans objet sur ce profil (par ex. une grille à un seul axe). */
  nonApplicable?: string[];
}

type Scenario = (c: Contexte) => Promise<ResultatScenario>;

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const maintenant = (page: Page) => page.evaluate(() => performance.now());
/** Stabilité de l'affichage ; un délai dépassé lève une erreur (le run devient invalide). */
const stable = (page: Page) => page.evaluate(() => (window as unknown as { __azimut: { attendreStable(): Promise<number> } }).__azimut.attendreStable());

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
/**
 * Bloc de lignes du changement de participant (protocole d'origine) : la
 * cible « hors LRU » saute au bloc suivant. Les lignes suivent l'index p
 * (participants générés 0…P−1, triés par p).
 */
const BLOC = 50;

async function grilleActive(page: Page): Promise<number> {
  return Number(await page.getAttribute(TABLE, "data-grille"));
}

async function lignesTable(page: Page): Promise<number> {
  return Number(await page.getAttribute(TABLE, "data-lignes"));
}

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

/**
 * 100 cases validées à 200 ms d'intervalle (valeur puis Tab), changement de
 * participant toutes les 20 cases. Rend les opérations exécutées et la
 * cadence obtenue : un pilote plus lent que 200 ms par case se voit.
 */
async function saisieRapide(c: Contexte, nombre = c.court ? 20 : 100, intervalleMs = 200, parParticipant = 20): Promise<Operations> {
  const { page } = c;
  const g = await grilleActive(page);
  const visibles = await participantsRendus(page);
  if (visibles.length === 0) throw new Error("aucun participant affiché");
  const debut = Date.now();
  let p = -1;
  let noeuds: string[] = [];
  let executees = 0;
  let enRetard = 0;
  let retardMaxMs = 0;
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
      ([sel, g, p, noeud, i]) => {
        const t = document.querySelector(sel as string)!;
        if (t.scrollLeft !== 0) t.scrollLeft = 0;
        const az = (window as unknown as { __azimut: { valeurSaisie(g: number, p: number, n: string, i: number): string } }).__azimut;
        return az.valeurSaisie(g as number, p as number, noeud as string, i as number);
      },
      [TABLE, g, p, noeud, i] as const,
    );
    await page.click(`${TABLE} input[data-participant="${p}"][data-noeud="${noeud}"]`);
    await page.keyboard.press("Control+A");
    await page.keyboard.type(valeur);
    await page.keyboard.press("Tab");
    executees++;
    const attente = debut + (i + 1) * intervalleMs - Date.now();
    if (attente > 0) await dormir(attente);
    else {
      enRetard++;
      retardMaxMs = Math.max(retardMaxMs, -attente);
    }
  }
  const dureeMs = Date.now() - debut;
  return {
    prevues: nombre,
    executees,
    dureeMs,
    cadence: { intervalleViseMs: intervalleMs, intervalleMoyenMs: executees > 0 ? dureeMs / executees : 0, enRetard, retardMaxMs },
    details: { validations: executees },
  };
}

// --- Changement de participant, ouverture du graphe -----------------------------------

interface EtatNavigation {
  bloc: number;
  /** Dernière ligne visée « hors LRU » quand la cohorte tient dans un seul bloc. */
  froide: number;
}

/**
 * Choisit un participant : visé dans le LRU (une ligne du bloc courant), ou
 * hors du LRU (saut vers le bloc de lignes suivant, puis clic). Avec un seul
 * bloc (P < 2 × 50), la cible « hors LRU » alterne entre la dernière ligne et
 * le haut de la table. Rend le début de l'action (horloge de la page) et le
 * compteur d'instanciations avant l'action : l'appartenance au LRU est
 * observée par l'appelant, jamais supposée. Si toute la cohorte tient dans le
 * cache, aucune action n'instancie : la catégorie froide reste non mesurée.
 */
async function choisirParticipant(c: Contexte, i: number, etat: EtatNavigation): Promise<{ debut: number; instAvant: number }> {
  const { page } = c;
  const viseDansLru = i % 2 === 1;
  const total = await lignesTable(page);
  if (total === 0) throw new Error("table sans participant");
  const blocs = Math.max(1, Math.floor(total / BLOC));
  if (viseDansLru) {
    const p = Math.min(total - 1, etat.bloc * BLOC + 5 + (i % 10));
    // La table remontée (retour du graphe) revient en haut : on réaffiche le bloc courant, encore dans le LRU.
    if ((await page.$(`${TABLE} th.nom[data-participant="${p}"]`)) === null) {
      await defilerVersLigne(page, Math.min(total - 1, etat.bloc * BLOC));
      await stable(page);
    }
    const instAvant = (await statsInstanciation(page)).nombre;
    const avant = await maintenant(page);
    await page.click(`${TABLE} th.nom[data-participant="${p}"]`);
    return { debut: (await derniereAction(page, "click", avant)) ?? avant, instAvant };
  }
  let ligne: number;
  let cible: number;
  if (blocs > 1) {
    etat.bloc = (etat.bloc + 1) % blocs;
    ligne = etat.bloc * BLOC;
    cible = Math.min(total - 1, ligne + 2);
  } else {
    cible = etat.froide === total - 1 ? Math.min(total - 1, 2) : total - 1;
    etat.froide = cible;
    ligne = cible;
  }
  const instAvant = (await statsInstanciation(page)).nombre;
  const debut = await maintenant(page);
  await defilerVersLigne(page, ligne);
  await page.click(`${TABLE} th.nom[data-participant="${cible}"]`);
  return { debut, instAvant };
}

/** Instanciations depuis `instAvant`, lues une fois l'affichage stable. */
async function lruObserve(page: Page, instAvant: number): Promise<{ dansLru: boolean; instanciations: number }> {
  const instanciations = (await statsInstanciation(page)).nombre - instAvant;
  return { dansLru: instanciations === 0, instanciations };
}

async function changementParticipant(c: Contexte): Promise<ResultatScenario> {
  const actions: ChronoAction[] = [];
  const etat: EtatNavigation = { bloc: 0, froide: -1 };
  const prevues = c.court ? 6 : 30;
  const t0 = Date.now();
  for (let i = 0; i < prevues; i++) {
    const { debut, instAvant } = await choisirParticipant(c, i, etat);
    const fin = await stable(c.page);
    actions.push({ type: "participant", debut, fin, latence: fin - debut, ...(await lruObserve(c.page, instAvant)) });
    await dormir(300);
  }
  return { actions, mesures: [], memoire: {}, operations: { prevues, executees: actions.length, dureeMs: Date.now() - t0 } };
}

async function ouvertureGraphe(c: Contexte): Promise<ResultatScenario> {
  const { page } = c;
  const actions: ChronoAction[] = [];
  const etat: EtatNavigation = { bloc: 0, froide: -1 };
  const prevues = c.court ? 2 : 10;
  const t0 = Date.now();
  for (let i = 0; i < prevues; i++) {
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
  return { actions, mesures: [], memoire: {}, operations: { prevues, executees: actions.length, dureeMs: Date.now() - t0 } };
}

// --- Changement d'axe / de vue ------------------------------------------------------

/** 10 changements d'axe en boucle sur les axes de la grille active, puis 10 bascules table ↔ graphe. */
async function changementAxeVue(c: Contexte): Promise<ResultatScenario> {
  const { page } = c;
  const actions: ChronoAction[] = [];
  const nonApplicable: string[] = [];
  const axes = await page.$$eval('[data-testid="axe"] option', (os) => os.map((o) => (o as HTMLOptionElement).value));
  const n = c.court ? 3 : 10;
  const vues = n + (n % 2);
  const t0 = Date.now();
  if (axes.length < 2) nonApplicable.push(`changement d'axe : la grille active n'a qu'un axe`);
  else
    for (let i = 0; i < n; i++) {
      const avant = await maintenant(page);
      await page.selectOption('[data-testid="axe"]', axes[(i + 1) % axes.length]);
      const fin = await stable(page);
      const debut = (await derniereAction(page, "change", avant)) ?? avant;
      actions.push({ type: "axe", debut, fin, latence: fin - debut });
      await dormir(200);
    }
  for (let i = 0; i < vues; i++) {
    const avant = await maintenant(page);
    await page.click('[data-action="vue"]');
    await page.waitForSelector(i % 2 === 0 ? '[data-testid="graphe"]' : TABLE);
    const fin = await stable(page);
    const debut = (await derniereAction(page, "click", avant)) ?? avant;
    actions.push({ type: "vue", debut, fin, latence: fin - debut });
    await dormir(200);
  }
  return {
    actions,
    mesures: [],
    memoire: {},
    operations: { prevues: (axes.length < 2 ? 0 : n) + vues, executees: actions.length, dureeMs: Date.now() - t0, details: { axes: axes.length } },
    nonApplicable,
  };
}

// --- Défilement -----------------------------------------------------------------------

/**
 * Molette verticale puis horizontale, 5 s chacune. Rapporte par axe le
 * débordement et le déplacement effectivement obtenu : sans débordement,
 * l'axe est « non applicable », pas un défilement réussi.
 */
async function defilement(c: Contexte): Promise<ResultatScenario> {
  const { page } = c;
  const boite = (await page.locator(TABLE).boundingBox())!;
  await page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
  const dureeMs = c.court ? 1500 : 5000;
  const axes: AxeDefilement[] = [];
  const t0 = Date.now();
  const position = (vertical: boolean) =>
    page.evaluate(
      ([sel, v]) => {
        const t = document.querySelector(sel as string)!;
        return v
          ? { pos: t.scrollTop, debordement: t.scrollHeight - t.clientHeight }
          : { pos: t.scrollLeft, debordement: t.scrollWidth - t.clientWidth };
      },
      [TABLE, vertical] as const,
    );
  for (const [axe, dx, dy] of [
    ["vertical", 0, 100],
    ["horizontal", 100, 0],
  ] as const) {
    const vertical = axe === "vertical";
    const depart = await position(vertical);
    let deplacement = 0;
    let evenements = 0;
    const debut = Date.now();
    while (Date.now() - debut < dureeMs) {
      await page.mouse.wheel(dx, dy);
      evenements++;
      await dormir(16);
      // Échantillon tous les 10 événements : le plus grand écart observé (la fin peut revenir au bord).
      if (evenements % 10 === 0) deplacement = Math.max(deplacement, Math.abs((await position(vertical)).pos - depart.pos));
    }
    const fin = await position(vertical);
    deplacement = Math.max(deplacement, Math.abs(fin.pos - depart.pos));
    axes.push({ axe, debordement: depart.debordement, debut: depart.pos, fin: fin.pos, deplacement, evenements });
  }
  await stable(page);
  return {
    actions: [],
    mesures: [],
    memoire: {},
    operations: { prevues: 2, executees: axes.length, dureeMs: Date.now() - t0 },
    defilement: axes,
    nonApplicable: axes.filter((a) => a.debordement <= 0).map((a) => `défilement ${a.axe} : pas de débordement`),
  };
}

// --- Scénarios jugés ------------------------------------------------------------------

const saisiesDistantesEcrites = (page: Page) => page.evaluate(() => (window as unknown as { __azimut: { saisiesDistantes(): number } }).__azimut.saisiesDistantes());

export const SCENARIOS: Record<(typeof SCENARIOS_JUGES)[number], Scenario> = {
  "saisie-rapide": async (c) => ({ actions: [], mesures: [], memoire: {}, operations: await saisieRapide(c) }),
  "saisies-distantes": async (c) => {
    const { page } = c;
    const simulateur = (actif: boolean) =>
      page.evaluate((a) => (window as unknown as { __azimut: { simulateur(a: boolean): void } }).__azimut.simulateur(a), actif);
    const avant = await saisiesDistantesEcrites(page);
    await simulateur(true);
    const operations = await saisieRapide(c);
    // Puis les saisies distantes seules pendant 30 s.
    await dormir(c.court ? 4000 : 30_000);
    await simulateur(false);
    operations.details = { ...operations.details, saisiesDistantes: (await saisiesDistantesEcrites(page)) - avant };
    return { actions: [], mesures: [], memoire: {}, operations };
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
  const total = await lignesTable(page);
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

async function piloter<T extends Record<string, unknown>>(page: Page, nom: string, f: string, args: unknown[], exception = false): Promise<MesureSansCritere> {
  const debut = await maintenant(page);
  const valeurs = (await page.evaluate(
    ([f, args]) => {
      const az = (window as unknown as { __azimut: Record<string, (...a: unknown[]) => Promise<unknown>> }).__azimut;
      return az[f as string](...(args as unknown[]));
    },
    [f, args] as const,
  )) as T;
  const fin = await maintenant(page);
  return { nom, fenetre: { debut, fin }, valeurs, exceptionGardeFou: exception };
}

/**
 * Mesures sans critère d'une configuration, sur la grille active : LRU plein
 * (mémoire), 1000 écritures, copie à l'identique, copie vers la structure qui
 * en provient s'il y en a une (G3 V1 → V2), bascule du modèle.
 */
export async function mesuresSansCritere(c: Contexte, avecLru = true): Promise<ResultatScenario> {
  const { page, cdp } = c;
  const t0 = Date.now();
  const g = await grilleActive(page);
  const cibles = await page.evaluate((g) => (window as unknown as { __azimut: { ciblesCopie(g: number): string[] } }).__azimut.ciblesCopie(g), g);
  const prevues = (avecLru ? 1 : 0) + 3 + (cibles.includes("provenance") ? 1 : 0);
  const mesures: MesureSansCritere[] = [];
  const memoire: Record<string, MemoireCibles> = {};
  if (avecLru) {
    mesures.push(await remplirLru(c));
    memoire["lru-plein"] = await cdp.memoire();
  }
  const serie = await piloter<{ dureesMs: number[]; totalMs: number }>(page, "ecritures-en-serie", "ecrituresEnSerie", [c.court ? 100 : 1000, g]);
  const d = [...(serie.valeurs.dureesMs as number[])].sort((a, b) => a - b);
  serie.valeurs = {
    grille: g,
    nombre: d.length,
    totalMs: serie.valeurs.totalMs,
    medianeMs: d[Math.floor(d.length / 2)],
    p95Ms: d[Math.min(d.length - 1, Math.ceil(0.95 * d.length) - 1)],
    maxMs: d[d.length - 1],
  };
  mesures.push(serie);
  mesures.push(await piloter(page, "copie-grille", "copier", [g, "identique"]));
  if (cibles.includes("provenance")) mesures.push(await piloter(page, "copie-grille-provenance", "copier", [g, "provenance"]));
  mesures.push(await piloter(page, "bascule-modele", "basculerModele", [], true));
  return { actions: [], mesures, memoire, operations: { prevues, executees: mesures.length, dureeMs: Date.now() - t0 } };
}

/** Balayage du N du LRU : seulement le remplissage du LRU (mémoire et instanciation). */
export async function mesuresLru(c: Contexte): Promise<ResultatScenario> {
  const t0 = Date.now();
  const mesure = await remplirLru(c);
  return { actions: [], mesures: [mesure], memoire: { "lru-plein": await c.cdp.memoire() }, operations: { prevues: 1, executees: 1, dureeMs: Date.now() - t0 } };
}
