// Réglages : l'URL fait foi au chargement et une URL copiée reproduit la
// configuration complète (ticket #22).

import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { creerEssai } from "./essai";
import { CHOIX_GENERATEUR, CHOIX_STORE, demandeRechargement, ecrireUrl, lireUrl, PARAMS_MODELE, type Reglages, reglagesParDefaut } from "./reglages";
import type { CommutateursResolus } from "./noyau/compile";

const commutateursArb: fc.Arbitrary<CommutateursResolus> = fc.record({
  dispense1a: fc.constantFrom("A" as const, "B" as const),
  feuilles1b: fc.constantFrom("A" as const, "B" as const, "C" as const),
  minimum1c: fc.boolean(),
  h4Strict: fc.boolean(),
  h5a: fc.constantFrom("accepte" as const, "refuse" as const),
  h5b: fc.constantFrom("unSeul" as const, "cumules" as const),
  f5Derniere: fc.boolean(),
  f5SansPlafond: fc.boolean(),
});

const reglagesArb: fc.Arbitrary<Reglages> = fc.record({
  modele: commutateursArb,
  store: fc.record({
    calcul: fc.constantFrom(...CHOIX_STORE.calcul),
    lieu: fc.constantFrom(...CHOIX_STORE.lieu),
    cohorte: fc.constantFrom(...CHOIX_STORE.cohorte),
    distante: fc.constantFrom(...CHOIX_STORE.distante),
    lru: fc.integer({ min: 1, max: 500 }),
  }),
  generateur: fc.record({
    jeu: fc.constantFrom(...CHOIX_GENERATEUR.jeu),
    remplissage: fc.constantFrom(...CHOIX_GENERATEUR.remplissage),
    graine: fc.nat(),
    participants: fc.integer({ min: 0, max: 1000 }),
  }),
  session: fc.record({ verification: fc.boolean(), simulateur: fc.boolean() }),
  comparaison: fc.option(commutateursArb, { nil: null }),
});

/** Ordre canonique des clés, pour comparer sans dépendre de l'ordre d'écriture. */
const canon = (r: Reglages) => JSON.parse(JSON.stringify(r, (_, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v)));

describe("URL des réglages", () => {
  test("sans paramètre : défauts de la spec (jeu corpus, vérification active, simulateur arrêté)", () => {
    const { reglages, avertissements } = lireUrl("");
    expect(avertissements).toEqual([]);
    expect(reglages.generateur.jeu).toBe("corpus");
    expect(reglages.generateur.participants).toBe(0);
    expect(reglages.session).toEqual({ verification: true, simulateur: false });
    expect(reglages.comparaison).toBeNull();
    expect(reglages.modele).toEqual({
      dispense1a: "A",
      feuilles1b: "A",
      minimum1c: true,
      h4Strict: false,
      h5a: "accepte",
      h5b: "unSeul",
      f5Derniere: false,
      f5SansPlafond: false,
    });
  });

  test("une URL copiée reproduit la configuration complète (toutes classes, B compris)", () => {
    fc.assert(
      fc.property(reglagesArb, (r) => {
        const lu = lireUrl(ecrireUrl(r));
        expect(lu.avertissements).toEqual([]);
        expect(canon(lu.reglages)).toEqual(canon(r));
      }),
    );
  });

  test("les noms des paramètres sont fixés", () => {
    const url = ecrireUrl(reglagesParDefaut());
    expect([...new URLSearchParams(url).keys()]).toEqual([
      ...PARAMS_MODELE.map((p) => p.param),
      "cmp",
      "calcul",
      "lieu",
      "cohorte",
      "distante",
      "lru",
      "jeu",
      "remplissage",
      "graine",
      "participants",
      "verif",
      "simu",
    ]);
    expect(PARAMS_MODELE.map((p) => p.param)).toEqual(["1a", "1b", "1c", "h4", "h5a", "h5b", "f5rang", "f5plafond"]);
    expect(lireUrl("?1b=B&cmp=1&b.h4=strict").reglages).toMatchObject({
      modele: { feuilles1b: "B" },
      comparaison: { h4Strict: true, feuilles1b: "A" },
    });
  });

  test("verif=0 désactive la vérification", () => {
    expect(lireUrl("?verif=0").reglages.session.verification).toBe(false);
    const essai = creerEssai("?verif=0");
    expect(essai.etat().verification).toBeNull();
    essai.dispose();
    const actif = creerEssai("");
    expect(actif.etat().verification).not.toBeNull();
    actif.dispose();
  });

  test("valeur invalide ou paramètre inconnu : défaut et avertissement", () => {
    const { reglages, avertissements } = lireUrl("?h4=peutetre&lru=-3&x=1");
    expect(reglages.modele.h4Strict).toBe(false);
    expect(reglages.store.lru).toBe(50);
    expect(avertissements).toHaveLength(3);
  });

  test("le jeu « charge » prend 200 participants générés par défaut", () => {
    expect(lireUrl("?jeu=charge").reglages.generateur.participants).toBe(200);
  });

  test("store et générateur : au rechargement ; modèle, session et comparaison : à chaud", () => {
    const a = reglagesParDefaut();
    expect(demandeRechargement(a, { ...a, store: { ...a.store, lieu: "principal" } })).toBe(true);
    expect(demandeRechargement(a, { ...a, generateur: { ...a.generateur, graine: 7 } })).toBe(true);
    expect(demandeRechargement(a, { ...a, modele: { ...a.modele, h4Strict: true } })).toBe(false);
    expect(demandeRechargement(a, { ...a, session: { ...a.session, verification: false } })).toBe(false);
    expect(demandeRechargement(a, { ...a, comparaison: a.modele })).toBe(false);
  });

  test("une URL rechargée recompile la session avec ses commutateurs et retrouve sa comparaison", () => {
    const r = reglagesParDefaut();
    const voulu: Reglages = {
      ...r,
      modele: { ...r.modele, feuilles1b: "C", h5b: "cumules", f5SansPlafond: true },
      session: { verification: false, simulateur: true },
      comparaison: { ...r.modele, h4Strict: true },
      store: { ...r.store, lru: 80 },
    };
    const essai = creerEssai(ecrireUrl(voulu));
    expect(canon(essai.etat().reglages)).toEqual(canon(voulu));
    for (const plan of essai.session.plans) expect(plan.commutateurs).toEqual(voulu.modele);
    expect(essai.etat().verification).toBeNull();
    essai.dispose();
  });
});
