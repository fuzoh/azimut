// Le store provisoire suit les écritures dans TanStack DB et rend l'oracle.
// Valeurs attendues : participants types figés par `a01-a03-controle.py`.

import a03 from "@corpus/a03-structure.json";
import figes from "@corpus/a03-participants.json";
import { describe, expect, test } from "vitest";
import { compile } from "../noyau/compile";
import type { FichierParticipants, Grille } from "../noyau/format";
import { chargerParticipantsTypes } from "../sources/chargement";
import { cle, decrireCle } from "../sources/cle";
import { creerSources, ecrireCase } from "../sources/collections";
import { creerStoreProvisoire } from "./storeProvisoire";

const plan = compile(a03 as unknown as Grille);
const fichier = figes as FichierParticipants;

function monter() {
  const sources = creerSources();
  chargerParticipantsTypes(sources, 0, plan, fichier);
  const store = creerStoreProvisoire(sources, [plan]);
  const n = (id: string) => plan.index.get(id)!;
  const d = (id: string) => plan.indexDonnee[n(id)];
  const p = (nom: string) => sources.participants.toArray.find((l) => l.nom === nom)!.p;
  return { sources, store, n, d, p };
}

describe("sources et store provisoire", () => {
  test("les 6 participants types sont chargés avec leurs résultats figés", () => {
    const { sources, store, n, p } = monter();
    expect(sources.participants.toArray.map((l) => l.nom)).toEqual(fichier.participants.map((x) => x.nom));
    for (const pt of fichier.participants) {
      for (const [id, attendu] of Object.entries(pt.attendus)) {
        const v = store.getResult(0, p(pt.nom), n(id)).valeur;
        if (attendu === null) expect(v, `${pt.nom} ${id}`).toBeNaN();
        else expect(v, `${pt.nom} ${id}`).toBeCloseTo(attendu, 9);
      }
    }
  });

  test("une saisie dans la collection notifie les cellules en aval et seulement elles", () => {
    const { sources, store, n, d, p } = monter();
    const fanny = p("Fanny");
    const notifs = new Map<string, number>();
    for (const id of ["crit:C/1.1", "obj:C/1", "sph:C", "seuil:C", "reussite", "sph:A"]) {
      store.subscribeResult(0, fanny, n(id), () => notifs.set(id, (notifs.get(id) ?? 0) + 1));
    }
    expect(store.getResult(0, fanny, n("sph:C")).valeur).toBeNaN();

    // Fanny reçoit « 1 » sur un indicateur de C 1.1 ; attendus figés par le script.
    const saisie = fichier.participants.find((x) => x.nom === "Fanny")!.apresSaisie!;
    ecrireCase(sources, 0, fanny, d(saisie.case.noeud), saisie.case.valeur);
    for (const [id, attendu] of Object.entries(saisie.attendus)) {
      expect(store.getResult(0, fanny, n(id)).valeur, id).toBe(attendu);
    }
    expect(Object.fromEntries(notifs)).toEqual({ "crit:C/1.1": 1, "obj:C/1": 1, "sph:C": 1, "seuil:C": 1, reussite: 1 });

    // Effacer la case rend la sphère C sans résultat et la Réussite OK (figée).
    ecrireCase(sources, 0, fanny, d(saisie.case.noeud), NaN);
    expect(store.getResult(0, fanny, n("sph:C")).valeur).toBeNaN();
    expect(store.getResult(0, fanny, n("reussite")).valeur).toBe(
      fichier.participants.find((x) => x.nom === "Fanny")!.attendus.reussite,
    );
  });

  test("decrireCle rend la forme lisible d'une clé", () => {
    const k = cle(2, 5, 17);
    expect(k).toBe((2 * 1024 + 5) * 65536 + 17);
    expect(decrireCle(k)).toBe("g2 p5 d17");
    expect(decrireCle(cle(0, 1, 3), { grille: () => "A03", participant: () => "Basile", noeud: () => "ind:A/1.1/4" })).toBe(
      "A03 · Basile · ind:A/1.1/4 (g0 p1 d3)",
    );
  });
});
