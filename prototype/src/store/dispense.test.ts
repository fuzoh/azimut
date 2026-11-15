// Store provisoire : poser puis retirer une dispense dans TanStack DB rend les
// notes à nouveau actives et rétablit les résultats ; l'état de remplissage suit.
// Valeurs attendues : `g3-controle.py --figer` (Chloé avec et sans dispense).

import figesJson from "@corpus/g3-participants.json";
import v2Json from "@corpus/g3-v2-structure.json";
import { describe, expect, test } from "vitest";
import { compile } from "../noyau/compile";
import { CAUSE } from "../noyau/evaluate";
import type { FichierG3, Grille } from "../noyau/format";
import { idsExigences } from "../noyau/remplissage";
import { chargerParticipantsTypes } from "../sources/chargement";
import { basculerNonEvaluation, creerSources, ecrireCase } from "../sources/collections";
import { creerStoreProvisoire } from "./storeProvisoire";

const figes = figesJson as unknown as FichierG3;
const plan = compile(v2Json as unknown as Grille);
const final = figes.etats["V2-final"];
const chloe = final.participants.find((p) => p.nom === "Chloé")!;
const sansDispense = figes.commutateurs.find((c) => c.nom === "Chloé" && Object.keys(c.commutateurs).length === 0)!;

function monter() {
  const sources = creerSources();
  chargerParticipantsTypes(sources, 0, plan, { grille: final.grille, source: "", participants: final.participants });
  const store = creerStoreProvisoire(sources, [plan]);
  const p = sources.participants.toArray.find((l) => l.nom === "Chloé")!.p;
  const n = (id: string) => plan.index.get(id)!;
  const egale = (attendus: Record<string, number | null>) => {
    for (const [id, a] of Object.entries(attendus)) {
      const v = store.getResult(0, p, n(id)).valeur;
      if (a === null) expect(v, id).toBeNaN();
      else expect(v, id).toBeCloseTo(a, 9);
    }
  };
  return { sources, store, p, n, egale };
}

describe("store provisoire, dispense de Chloé sur E3", () => {
  test("poser puis retirer la dispense rend les notes actives et rétablit les résultats", () => {
    const { sources, store, p, n, egale } = monter();
    egale(chloe.attendus);
    const consignes = store.getResult(0, p, n("consignes-e3"));
    expect(consignes.cause).toBe(CAUSE.nonEvalue);
    expect(consignes.saisie).toBe(2); // note conservée (Niveau 3, rang 2)

    const reussite: number[] = [];
    store.subscribeResult(0, p, n("reussite"), () => reussite.push(store.getResult(0, p, n("reussite")).valeur));
    let notifsRemplissage = 0;
    store.subscribeFillStatus(0, p, () => notifsRemplissage++);
    expect(trie(idsExigences(plan, store.getFillStatus(0, p)))).toEqual(trie(chloe.erreursRemplissage));
    expect(store.getFillStatus(0, p).provisoire).toBe(true);

    expect(basculerNonEvaluation(sources, 0, p, n("reg:e3"))).toBe(false); // retrait
    egale(sansDispense.attendus);
    expect(store.getResult(0, p, n("consignes-e3"))).toMatchObject({ valeur: 3, saisie: 2, cause: CAUSE.aucune });
    expect(store.getFillStatus(0, p)).toEqual({ erreurs: [], signalements: [], provisoire: false });

    expect(basculerNonEvaluation(sources, 0, p, n("reg:e3"))).toBe(true); // pose
    egale(chloe.attendus);
    expect(trie(idsExigences(plan, store.getFillStatus(0, p)))).toEqual(trie(chloe.erreursRemplissage));
    expect(reussite).toEqual([1, 0]);
    expect(notifsRemplissage).toBe(2);
  });

  test("« non évalué » sur une case : exclue du calcul, note conservée, obligatoire en erreur", () => {
    const { sources, store, p, n } = monter();
    basculerNonEvaluation(sources, 0, p, n("reg:e3"));
    basculerNonEvaluation(sources, 0, p, n("gestion"));
    expect(store.getResult(0, p, n("gestion"))).toMatchObject({ cause: CAUSE.nonEvalue, saisie: 2 });
    expect(store.getResult(0, p, n("gestion")).valeur).toBeNaN();
    expect(store.getFillStatus(0, p).erreurs).toEqual([{ type: "obligatoire", n: n("gestion"), etat: "nonEvalue" }]);
    // Une saisie sur une case non évaluée change la note conservée, pas l'état.
    ecrireCase(sources, 0, p, plan.indexDonnee[n("gestion")], 4);
    expect(store.getResult(0, p, n("gestion"))).toMatchObject({ cause: CAUSE.nonEvalue, saisie: 4 });
    basculerNonEvaluation(sources, 0, p, n("gestion"));
    expect(store.getResult(0, p, n("gestion")).valeur).toBe(5);
  });

  test("effacer une case chargée avant la souscription invalide bien le participant", () => {
    const { sources, store, p, n } = monter();
    expect(store.getResult(0, p, n("m6")).valeur).toBe(1);
    ecrireCase(sources, 0, p, plan.indexDonnee[n("m6")], NaN);
    expect(store.getResult(0, p, n("m6"))).toMatchObject({ cause: CAUSE.vide });
    expect(store.getFillStatus(0, p).erreurs.some((e) => e.type === "obligatoire" && e.n === n("m6") && e.etat === "vide")).toBe(true);
  });
});

function trie(l: string[]) {
  return [...l].sort();
}
