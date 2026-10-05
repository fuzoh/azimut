// Simulateur de saisies distantes (#25) et les 5 configurations du store
// choisies par l'URL, sur les deux jeux : le mode « vérification » (oracle
// `evaluate` sur tout) ne signale aucun écart pendant les saisies distantes.

import { describe, expect, test } from "vitest";
import { creerEssai, type Essai } from "./essai";
import { TYPE_CALCUL } from "./noyau/compile";
import { ecrireUrl, lireUrl } from "./reglages";
import { creerSession } from "./session";
import { creerSimulateur } from "./simulateur";
import { cle } from "./sources/cle";
import { basculerNonEvaluation, ecrireCase, origineDistante } from "./sources/collections";
import { GENERATION_PAR_DEFAUT } from "./sources/initiales";
import { canalLocal } from "./store/canal";
import { CONFIGURATIONS, fabriqueBase, fabriquePourReglages } from "./store/fabriques";
import type { Changement, VersWorker } from "./store/protocole";
import type { StoreVerifiable } from "./store/store";
import type { RapportVerification } from "./verification";

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Attend une vérification postérieure à `apres`, une fois le store stable. */
async function verificationApres(essai: Essai, apres: number): Promise<RapportVerification> {
  for (let i = 0; i < 400; i++) {
    await (essai.session.store as StoreVerifiable).stable();
    const r = essai.etat().verification;
    if (r && r.numero > apres && r.enCalcul === 0) return r;
    await attendre(10);
  }
  throw new Error("pas de vérification");
}

describe("simulateur de saisies distantes", () => {
  test("ses écritures partent au worker marquées `distante`, une saisie locale non", async () => {
    const lots: Changement[][] = [];
    const alterer = (m: VersWorker) => {
      if (m.type === "lot") lots.push(m.changements);
      return m;
    };
    const session = creerSession({}, { ...GENERATION_PAR_DEFAUT, participants: 5 }, fabriqueBase(50, () => canalLocal({ alterer })));
    const store = session.store as StoreVerifiable;
    const simu = creerSimulateur(session, { graine: 3 });
    const saisies = [];
    for (let i = 0; i < 40; i++) {
      const s = simu.saisir(i % 5);
      if (s) saisies.push(s);
    }
    await store.stable();
    expect(saisies.length).toBe(40);
    expect(simu.ecritures()).toBe(40);
    const changements = lots.flat();
    // Une écriture qui ne change rien (même valeur) ne produit pas de lot.
    expect(changements.length).toBeGreaterThan(30);
    for (const c of changements) {
      expect(c[0]).toBe("case");
      expect(c[5], JSON.stringify(c)).toBe(1);
    }
    // Les saisies portent sur plusieurs grilles et plusieurs participants, avec des valeurs valides.
    expect(new Set(saisies.map((s) => s.g)).size).toBeGreaterThan(1);
    expect(new Set(saisies.map((s) => s.p)).size).toBeGreaterThan(1);
    for (const s of saisies) {
      const v = session.sources.cases.get(cle(s.g, s.p, s.d))?.valeur ?? NaN;
      expect(Object.is(v, s.valeur) || saisies.some((t) => t !== s && t.g === s.g && t.p === s.p && t.d === s.d)).toBe(true);
    }
    expect(origineDistante.cases.size).toBe(0);
    lots.length = 0;
    // Saisie locale qui change la case (la vide si elle est remplie) : sans marque.
    const v = session.sources.cases.has(cle(0, 0, 0)) ? NaN : 1;
    ecrireCase(session.sources, 0, 0, 0, v);
    await store.stable();
    expect(lots.flat()).toEqual([["case", 0, 0, 0, v]]);
    store.dispose();
  });

  test("même graine : mêmes saisies", () => {
    const a = creerSimulateur(creerSession(), { graine: 9 });
    const b = creerSimulateur(creerSession(), { graine: 9 });
    const sa = Array.from({ length: 10 }, (_, i) => a.saisir(i % 5));
    const sb = Array.from({ length: 10 }, (_, i) => b.saisir(i % 5));
    expect(sa).toEqual(sb);
  });

  test("démarre et s'arrête par le réglage de session (panneau, URL `simu`) : 5 formateurs, chacun à son rythme", async () => {
    const essai = creerEssai("?participants=3", { fabrique: fabriquePourReglages, simulateur: { intervalleMs: 20 } });
    const simu = essai.simulateur();
    expect(simu.actif()).toBe(false);
    const parFormateur = new Map<number, number>();
    simu.abonner((s) => parFormateur.set(s.formateur, (parFormateur.get(s.formateur) ?? 0) + 1));
    const r = essai.changer({ ...essai.etat().reglages, session: { ...essai.etat().reglages.session, simulateur: true } });
    expect(r.rechargement).toBe(false);
    expect(lireUrl(r.url).reglages.session.simulateur).toBe(true);
    expect(simu.actif()).toBe(true);
    await attendre(130);
    essai.changer({ ...essai.etat().reglages, session: { ...essai.etat().reglages.session, simulateur: false } });
    expect(simu.actif()).toBe(false);
    const n = simu.ecritures();
    expect(n).toBeGreaterThanOrEqual(15);
    expect([...parFormateur.keys()].sort()).toEqual([0, 1, 2, 3, 4]);
    expect(essai.etat().saisiesDistantes).toBe(n);
    await attendre(60);
    expect(simu.ecritures()).toBe(n);
    essai.dispose();
  });

  test("`simu=1` dans l'URL : démarré au chargement", async () => {
    const essai = creerEssai("?simu=1", { fabrique: fabriquePourReglages, simulateur: { intervalleMs: 10 } });
    expect(essai.simulateur().actif()).toBe(true);
    await attendre(40);
    expect(essai.etat().saisiesDistantes).toBeGreaterThan(0);
    essai.dispose();
    expect(essai.simulateur().actif()).toBe(false);
  });
});

/** URL d'une configuration du store sur un jeu (paramètres d'URL de la classe Store). */
function url(config: (typeof CONFIGURATIONS)[number]["store"], jeu: string, extra = "") {
  const r = lireUrl(`?jeu=${jeu}${extra}`).reglages;
  return ecrireUrl({ ...r, store: { ...r.store, ...config }, session: { verification: true, simulateur: true } });
}

describe.each(CONFIGURATIONS)("configuration $nom choisie par l'URL", ({ store: config }) => {
  test.each([
    ["corpus", "&participants=3"],
    ["charge", "&participants=4&remplissage=fin"],
  ])("jeu « %s » : saisies locales et simulateur, aucun écart signalé par la vérification", async (jeu, extra) => {
    const essai = creerEssai(url(config, jeu, extra), { fabrique: fabriquePourReglages, simulateur: { intervalleMs: 15 } });
    expect(essai.etat().reglages.store).toMatchObject(config);
    expect(essai.simulateur().actif()).toBe(true);
    const { sources, plans, store } = essai.session;
    // Une table affichée : un participant, ses nœuds de calcul souscrits (au plus 200).
    const g = plans.length - 1;
    const calcul = plans[g].ids.map((_, n) => n).filter((n) => plans[g].type[n] === TYPE_CALCUL);
    for (const n of calcul.slice(0, 200)) store.subscribeResult(g, 1, n, () => {});
    store.subscribeFillStatus(g, 1, () => {});
    let r = await verificationApres(essai, 0);
    expect(r.ecarts).toEqual([]);
    // Saisies locales pendant que le simulateur écrit.
    ecrireCase(sources, g, 1, 0, plans[g].baremes[plans[g].bareme[plans[g].donnees[0]]].min);
    basculerNonEvaluation(sources, 0, 2, plans[0].donnees[1]);
    await attendre(120);
    essai.changer({ ...essai.etat().reglages, session: { ...essai.etat().reglages.session, simulateur: false } });
    expect(essai.etat().saisiesDistantes).toBeGreaterThanOrEqual(10);
    r = await verificationApres(essai, r.numero);
    expect(r.ecarts).toEqual([]);
    expect(r.comparees).toBeGreaterThan(0);
    if (config.lieu === "worker") expect(r.souscrites).toBeGreaterThan(0);
    essai.dispose();
  }, 60_000);
});
