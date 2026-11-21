// Options du harnais (ticket #28) : profil de données piloté par la ligne de
// commande, arguments validés, référence historique inchangée.

import { describe, expect, test } from "vitest";
import { IDS_STRUCTURES, INSTANCES_CHARGE } from "../src/generateur/jeux";
import { MAX_PARTICIPANTS } from "../src/sources/cle";
import { CONFIGURATIONS as CONFIGURATIONS_APP } from "../src/store/fabriques";
import { categorieProfil, CONFIGURATIONS, ErreurOptions, idProfil, INSTANCES_CHARGE as INSTANCES_HARNAIS, lireOptions, MAX_PARTICIPANTS as MAX_HARNAIS, SCENARIOS_JUGES, STRUCTURES, urlRun } from "./options";
import { SCENARIOS } from "./scenarios";

const problemes = (argv: string[]): string[] => {
  try {
    lireOptions(argv);
  } catch (e) {
    if (e instanceof ErreurOptions) return e.problemes;
    throw e;
  }
  return [];
};

describe("valeurs recopiées de l'app", () => {
  test("configurations, structures, borne d'effectif et instances du jeu de charge concordent", () => {
    expect(CONFIGURATIONS.map((c) => ({ nom: c.nom, store: { ...c.store } }))).toEqual(CONFIGURATIONS_APP);
    expect([...STRUCTURES]).toEqual([...IDS_STRUCTURES]);
    expect(MAX_HARNAIS).toBe(MAX_PARTICIPANTS);
    expect(INSTANCES_HARNAIS).toBe(INSTANCES_CHARGE);
    expect(Object.keys(SCENARIOS)).toEqual([...SCENARIOS_JUGES]);
  });
});

describe("référence historique (recette 5)", () => {
  test("sans option : jeu « charge », P = 200, fin, graine 1, ×4, cinq configurations, six scénarios et les mesures", () => {
    const o = lireOptions([]);
    expect(o.profil).toEqual({ jeu: "charge", structures: [], composite: false, participants: 200, remplissage: "fin", graine: 1, grille: 0 });
    expect(o.bridages).toEqual([4]);
    expect(o.configs.map((c) => c.nom)).toEqual(["base", "dag", "principal", "precalcul", "immediat"]);
    expect(o.scenarios).toEqual([...SCENARIOS_JUGES, "mesures"]);
    expect([o.runs, o.chauffe, o.lru]).toEqual([5, 1, 50]);
    expect(o.lruBalayage).toEqual([10, 50, 200]);
    expect(idProfil(o.profil)).toBe("charge-p200-fin-s1");
    expect(categorieProfil(o.profil)).toBe("charge historique");
  });

  test("même URL que la série du 7 octobre", () => {
    const o = lireOptions(["--jeu", "charge", "--participants", "200", "--remplissage", "fin", "--graine", "1", "--bridage", "4"]);
    expect(urlRun("http://localhost:4173", o.profil, CONFIGURATIONS[0].store, 50, null)).toBe(
      "http://localhost:4173/?jeu=charge&remplissage=fin&graine=1&participants=200&verif=0&simu=0&calcul=signaux&lieu=worker&cohorte=paresseux&distante=perimee&lru=50",
    );
    expect(urlRun("http://x", o.profil, CONFIGURATIONS[1].store, 10, 4)).toContain("calcul=dag&lieu=worker&cohorte=paresseux&distante=perimee&lru=10&bridageWorker=4");
  });
});

describe("profil de taille réelle", () => {
  test("structures, effectif, remplissage, graine, grille active et taux de bridage pilotent l'URL", () => {
    const o = lireOptions(["--jeu", "perf", "--structures", "a03", "--participants", "40", "--remplissage", "milieu", "--graine", "7", "--bridage", "1,4"]);
    expect(o.profil).toEqual({ jeu: "perf", structures: ["a03"], composite: false, participants: 40, remplissage: "milieu", graine: 7, grille: 0 });
    expect(o.bridages).toEqual([1, 4]);
    expect(idProfil(o.profil)).toBe("perf-a03-p40-milieu-s7");
    expect(categorieProfil(o.profil)).toBe("taille réelle");
    const q = new URL(urlRun("http://localhost:4173", o.profil, CONFIGURATIONS[2].store, 50, null)).searchParams;
    expect(Object.fromEntries(q)).toMatchObject({ jeu: "perf", structures: "a03", participants: "40", remplissage: "milieu", graine: "7", lieu: "principal", verif: "0", simu: "0" });
    expect(q.has("grille")).toBe(false);
  });

  test("P = 12 et P = 200 sont des réglages comme les autres ; défaut perf : 20", () => {
    expect(lireOptions(["--jeu", "perf", "--structures", "a01", "--participants", "12"]).profil.participants).toBe(12);
    expect(lireOptions(["--jeu", "perf", "--structures", "g3v2", "--participants", "200"]).profil.participants).toBe(200);
    expect(lireOptions(["--jeu", "perf", "--structures", "a03"]).profil.participants).toBe(20);
  });

  test("plusieurs structures : session composite demandée explicitement, ordre canonique, grille active par nom", () => {
    expect(problemes(["--jeu", "perf", "--structures", "g3v2,a01"])).toEqual([expect.stringMatching(/--composite/)]);
    const o = lireOptions(["--jeu", "perf", "--structures", "g3v2,a01,a03", "--composite", "--grille", "g3v2", "--participants", "200"]);
    expect(o.profil.structures).toEqual(["a01", "a03", "g3v2"]);
    expect(o.profil.grille).toBe(2);
    expect(idProfil(o.profil)).toBe("perf-composite-a01+a03+g3v2-p200-fin-s1-g2");
    expect(categorieProfil(o.profil)).toBe("composite synthétique");
    expect(new URL(urlRun("http://x", o.profil, CONFIGURATIONS[0].store, 50, null)).searchParams.get("grille")).toBe("2");
    // G3 V1 et V2 ensemble : seulement comme scénario explicite.
    expect(problemes(["--jeu", "perf", "--structures", "g3v1,g3v2"])).toHaveLength(1);
    expect(lireOptions(["--jeu", "perf", "--structures", "g3v1,g3v2", "--composite"]).profil.structures).toEqual(["g3v1", "g3v2"]);
  });

  test("LRU, balayage, configurations et scénarios choisis", () => {
    const o = lireOptions(["--jeu", "perf", "--structures", "a03", "--configs", "base,principal", "--scenarios", "saisie-rapide,defilement", "--sans-mesures", "--lru", "30", "--lru-balayage", "50,5"]);
    expect(o.configs.map((c) => c.nom)).toEqual(["base", "principal"]);
    expect(o.scenarios).toEqual(["saisie-rapide", "defilement"]);
    expect(o.lru).toBe(30);
    expect(o.lruBalayage).toEqual([5, 50]);
    expect(lireOptions(["--sans-lru"]).lruBalayage).toBeNull();
  });
});

describe("arguments refusés", () => {
  test.each([
    [["--inconnu"], /inconnu|Unknown/i],
    [["positionnel"], /positional|Unexpected argument/i],
    [["--jeu", "corpus"], /jeu de validation/],
    [["--jeu", "perf"], /--structures requis/],
    [["--jeu", "perf", "--structures", "a02"], /a02/],
    [["--jeu", "perf", "--structures", "a03,a03"], /en double/],
    [["--jeu", "perf", "--structures", ""], /liste vide/],
    [["--structures", "a03"], /réservé à --jeu perf/],
    [["--jeu", "perf", "--structures", "a03", "--composite"], /au moins deux structures/],
    [["--participants", "0"], /--participants/],
    [["--participants", "2000"], /--participants/],
    [["--participants", "1.5"], /--participants/],
    [["--remplissage", "plein"], /--remplissage/],
    [["--configs", "base,turbo"], /turbo/],
    [["--configs", ""], /liste vide/],
    [["--scenarios", "saisie"], /saisie/],
    [["--scenarios", ""], /liste vide/],
    [["--bridage", "0.5"], /--bridage/],
    [["--bridage", "4,4"], /en double/],
    [["--runs", "0"], /--runs/],
    [["--grille", "3"], /--grille/],
    [["--jeu", "perf", "--structures", "a03", "--grille", "a01"], /--grille/],
    [["--sans-lru", "--lru-balayage", "10"], /s'excluent/],
    [["--lru-balayage", "0"], /--lru-balayage/],
    [["--scenarios", "mesures", "--sans-mesures", "--sans-lru"], /série vide/],
  ] as [string[], RegExp][])("%j", (argv, attendu) => {
    const p = problemes(argv);
    expect(p.length).toBeGreaterThan(0);
    expect(p.join("\n")).toMatch(attendu);
  });

  test("tous les problèmes sont rapportés ensemble", () => {
    expect(problemes(["--jeu", "perf", "--structures", "a02", "--participants", "0", "--configs", "turbo"])).toHaveLength(3);
  });
});
