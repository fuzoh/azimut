// Analyse du harnais : horloge commune des deux threads, décomposition de la
// latence, critères jugés sur le pire run. Chronologies écrites à la main.

import { describe, expect, it } from "vitest";
import { agreger, decomposerSaisies, ETAPES, type Marque, percentile, planifier, ramener, type ResumeRun, resumerRun } from "./analyse";

const m = (nom: string, t: number, version?: number, taille?: number): Marque => ({ nom, t, detail: version === undefined ? null : { version, ...(taille === undefined ? {} : { taille }) } });

describe("ramener", () => {
  it("place une marque du worker sur l'horloge de la page par les timeOrigin", () => {
    // Worker créé 1000,5 ms après la page : sa marque à 10 ms tombe à 1010,5 ms sur l'horloge de la page.
    expect(ramener({ origine: 1_700_000_001_000.5, marques: [m("x", 10)] }, 1_700_000_000_000)).toEqual([m("x", 1010.5)]);
  });
});

describe("decomposerSaisies", () => {
  /** Page : timeOrigin 0 ; worker : timeOrigin +50 ms. Une saisie validée à 100 ms. */
  const page: Marque[] = [
    m("chaine:validation", 101),
    m("chaine:ecriture", 102),
    m("chaine:subscribeChanges", 103, 1),
    m("chaine:envoi", 104, 1, 1),
    m("chaine:commit", 105), // passage « en calcul »
    m("chaine:peinture", 106),
    m("chaine:calcul:debut", 110, 1),
    m("chaine:calcul:fin", 119, 1),
    m("chaine:retour", 125, 1),
    m("chaine:commit", 130), // résultat
    m("chaine:commit", 133), // explication
    m("chaine:peinture", 140),
  ];
  const worker = { origine: 50, marques: [m("chaine:worker:reception", 60, 1), m("chaine:worker:envoi", 70, 1)] };

  it("couvre chaque étape, sur les deux threads, sur l'horloge de la page", () => {
    const [s] = decomposerSaisies([...page, ...ramener(worker, 0)], [100]);
    expect(s.etapes).toEqual({
      evenement: 100,
      validation: 101,
      ecriture: 102,
      subscribeChanges: 103,
      envoi: 104,
      workerReception: 110,
      workerEnvoi: 120,
      retour: 125,
      commit: 133,
      peinture: 140,
    });
    expect(s.version).toBe(1);
    expect(s.taille).toBe(1);
    expect(s.calcul).toEqual([110, 119]);
    expect(s.latence).toBe(40);
    // Ordre de la chaîne respecté une fois les horloges ramenées.
    const t = ETAPES.map((e) => s.etapes[e]!);
    expect(t).toEqual([...t].sort((a, b) => a - b));
  });

  it("s'arrête au lot suivant : un commit dû à une saisie distante n'allonge pas la latence", () => {
    const [s] = decomposerSaisies([...page.filter((x) => x.t !== 133 && x.t !== 140), m("chaine:subscribeChanges", 135, 2), m("chaine:commit", 138), m("chaine:peinture", 139)], [100]);
    expect(s.etapes.commit).toBe(130);
    expect(s.etapes.peinture).toBe(139);
    expect(s.latence).toBe(39);
  });

  it("saisie distante partie pendant le calcul : le commit du résultat local compte, la fenêtre se ferme au résultat suivant", () => {
    // subscribeChanges v1 → subscribeChanges v2 (distante) → retour v1 → commit → retour v2 → commit.
    const [s] = decomposerSaisies(
      [
        m("chaine:validation", 101),
        m("chaine:ecriture", 102),
        m("chaine:subscribeChanges", 103, 1),
        m("chaine:envoi", 104, 1, 1),
        m("chaine:subscribeChanges", 110, 2),
        m("chaine:envoi", 111, 2, 1),
        m("chaine:retour", 125, 1),
        m("chaine:commit", 127),
        m("chaine:peinture", 135),
        m("chaine:retour", 150, 2),
        m("chaine:commit", 152),
        m("chaine:peinture", 160),
      ],
      [100],
    );
    expect(s.etapes.retour).toBe(125);
    expect(s.etapes.commit).toBe(127);
    expect(s.etapes.peinture).toBe(135);
    expect(s.latence).toBe(35);
  });

  it("variante thread principal : sans envoi ni retour, la fin suit le calcul", () => {
    const [s] = decomposerSaisies(
      [m("chaine:validation", 11), m("chaine:ecriture", 12), m("chaine:subscribeChanges", 13, 4), m("chaine:calcul:debut", 13, 4), m("chaine:calcul:fin", 20, 4), m("chaine:commit", 22), m("chaine:peinture", 31)],
      [10],
    );
    expect(s.etapes.envoi).toBeNull();
    expect(s.etapes.workerReception).toBeNull();
    expect(s.etapes.retour).toBeNull();
    expect(s.calcul).toEqual([13, 20]);
    expect(s.latence).toBe(21);
  });

  it("une saisie sans écriture (valeur invalide ou inchangée) n'a pas de latence", () => {
    const s = decomposerSaisies([m("chaine:validation", 101), m("chaine:validation", 301), m("chaine:ecriture", 302)], [100, 300]);
    expect(s[0].latence).toBeNull();
    expect(s[0].etapes.ecriture).toBeNull();
    expect(s[1].etapes.ecriture).toBe(302);
  });
});

describe("percentile", () => {
  it("rang le plus proche", () => {
    const xs = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(percentile(xs, 0.95)).toBe(19);
    expect(percentile(xs, 0.5)).toBe(10);
    expect(percentile([], 0.95)).toBeNull();
  });
});

describe("resumerRun", () => {
  const saisie = (latence: number | null) => ({ etapes: {} as never, calcul: null, version: null, taille: null, latence });

  it("ne compte que les tâches longues de la fenêtre du scénario et juge les trois critères", () => {
    const r = resumerRun({
      scenario: "saisie-rapide",
      fenetre: { debut: 1000, fin: 2000 },
      longtasks: [
        { debut: 500, duree: 4000 }, // chargement : hors fenêtre
        { debut: 1500, duree: 60 },
      ],
      loaf: [],
      inp: [40, 104],
      saisies: [...Array.from({ length: 19 }, () => saisie(50)), saisie(120), saisie(null)],
    });
    expect(r).toMatchObject({ longtasks: 1, longtaskMaxMs: 60, inpMs: 104, p95Ms: 50, saisies: 21, saisiesIncompletes: 1, reussite: false });
    expect(r.motifs).toEqual(["1 longtask(s)", "INP 104 ms", "1 saisie(s) sans latence"]);
  });

  it("défilement : jugé aussi sur les LoAF, sans latence de recalcul", () => {
    const r = resumerRun({ scenario: "defilement", fenetre: { debut: 0, fin: 10 }, longtasks: [], loaf: [{ debut: 5, duree: 70 }], inp: [], saisies: [] });
    expect(r.reussite).toBe(false);
    expect(r.motifs).toEqual(["1 LoAF"]);
    expect(r.inpMs).toBeNull();
  });
});

describe("agreger", () => {
  const resume = (p95Ms: number, reussite: boolean): ResumeRun => ({
    longtasks: 0,
    longtaskMaxMs: 0,
    loaf: 0,
    inpMs: 30,
    p95Ms,
    saisies: 100,
    saisiesIncompletes: 0,
    reussite,
    motifs: reussite ? [] : [`p95 ${p95Ms} ms`],
  });

  it("juge sur le pire run, rapporte médiane et pire run", () => {
    const [c] = agreger([40, 60, 50, 45, 130].map((p, i) => ({ config: "base", scenario: "saisie-rapide", resume: resume(p, i !== 4) })));
    expect(c).toMatchObject({ runs: 5, reussite: false, p95: { mediane: 50, pire: 130 }, motifs: ["p95 130 ms"] });
  });
});

describe("planifier", () => {
  it("alterne les configurations run par run, chauffe en premier", () => {
    const plan = planifier(["a", "b"], ["s"], 1, 2);
    expect(plan.map((p) => `${p.config}${p.chauffe ? "*" : ""}`)).toEqual(["a*", "b*", "a", "b", "a", "b"]);
  });
});
