// Jokers par les sources TanStack DB et le store provisoire : pose, retrait,
// marques, quota et bascule de H5 (recompilation, sources conservées).
// Valeurs attendues : participants types figés par `g3-controle.py --figer`.

import g3Figes from "@corpus/g3-participants.json";
import v2Json from "@corpus/g3-v2-structure.json";
import { describe, expect, test } from "vitest";
import { type Commutateurs, compile } from "../noyau/compile";
import { MARQUE_INFLUENCE_JOKER, MARQUE_JOKER_APPLIQUE } from "../noyau/evaluate";
import type { FichierG3, FichierParticipants, Grille } from "../noyau/format";
import { chargerParticipantsTypes } from "../sources/chargement";
import { creerSources, ecrireCase, poserJoker, retirerJoker, type Sources } from "../sources/collections";
import { creerStoreProvisoire } from "./storeProvisoire";

const g3 = g3Figes as unknown as FichierG3;
const v2 = v2Json as unknown as Grille;
const final: FichierParticipants = { grille: "G3 V2", source: g3.source, participants: g3.etats["V2-final"].participants };
const emmaFige = final.participants.find((p) => p.nom === "Emma")!;

function monter(commutateurs: Commutateurs = {}, grille: Grille = v2, sources?: Sources) {
  const plan = compile(grille, commutateurs);
  const s = sources ?? creerSources();
  if (!sources) chargerParticipantsTypes(s, 0, plan, final);
  const store = creerStoreProvisoire(s, [plan]);
  const n = (id: string) => plan.index.get(id)!;
  const p = (nom: string) => s.participants.toArray.find((l) => l.nom === nom)!.p;
  const jokersDe = (q: number) => s.jokers.toArray.filter((l) => l.p === q);
  return { plan, sources: s, store, n, p, jokersDe };
}

describe("jokers dans les sources et le store", () => {
  test("Emma chargée avec son joker : Animation 3, Réussite OK, marques", () => {
    const { store, n, p } = monter();
    const emma = p("Emma");
    expect(store.getResult(0, emma, n("animation")).valeur).toBe(emmaFige.attendus.animation);
    expect(store.getResult(0, emma, n("reussite")).valeur).toBe(1);
    expect(store.getResult(0, emma, n("animation")).marques & MARQUE_JOKER_APPLIQUE).toBeTruthy();
    expect(store.getResult(0, emma, n("seuil:animation")).marques & MARQUE_INFLUENCE_JOKER).toBeTruthy();
    expect(store.getResult(0, emma, n("reussite")).marques & MARQUE_INFLUENCE_JOKER).toBeTruthy();
    expect(store.getResult(0, emma, n("minimaux")).marques).toBe(0);
  });

  test("retirer le joker : résultats sans joker, marques effacées, cellules notifiées, quota libéré", () => {
    const { plan, sources, store, n, p, jokersDe } = monter();
    const emma = p("Emma");
    let notifs = 0;
    store.subscribeResult(0, emma, n("reussite"), () => notifs++);
    const [joker] = jokersDe(emma);
    retirerJoker(sources, joker.id);
    expect(jokersDe(emma)).toEqual([]);
    expect(notifs).toBe(1);
    for (const [id, attendu] of Object.entries(emmaFige.attendusSansJoker!)) {
      const v = store.getResult(0, emma, n(id)).valeur;
      if (attendu === null) expect(v, id).toBeNaN();
      else expect(v, id).toBeCloseTo(attendu, 9);
      expect(store.getResult(0, emma, n(id)).marques, id).toBe(0);
    }
    // Quota libéré : le joker sur E2 se pose.
    const e2 = plan.indexJoker.get("joker:e2")!;
    expect(poserJoker(sources, plan, 0, emma, e2, "Rattrapage", store.getResult(0, emma, n("e2")).valeur)).toBeNull();
    expect(store.getResult(0, emma, n("e2")).marques & MARQUE_JOKER_APPLIQUE).toBeTruthy();
    expect(store.getResult(0, emma, n("e2")).valeur).toBeCloseTo(emmaFige.attendus.e2! + 10, 9);
  });

  test("pose : justification exigée, quota de 1 respecté ; auteur et date fixes", () => {
    const { plan, sources, store, n, p, jokersDe } = monter();
    const alice = p("Alice");
    const anim = plan.indexJoker.get("joker:animation")!;
    const e2 = plan.indexJoker.get("joker:e2")!;
    const valeur = (id: string) => store.getResult(0, alice, n(id)).valeur;
    expect(poserJoker(sources, plan, 0, alice, anim, "  ", valeur("animation"))).toBe("justification");
    expect(poserJoker(sources, plan, 0, alice, anim, "Animation fragile", valeur("animation"))).toBeNull();
    expect(poserJoker(sources, plan, 0, alice, e2, "Encore", valeur("e2"))).toBe("quota");
    const lignes = jokersDe(alice);
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({ justification: "Animation fragile", auteur: expect.any(String), date: expect.any(String) });
    // Alice a 4,25 en Animation : « remonter au seuil » est sans effet sur la valeur, mais marqué.
    expect(valeur("animation")).toBe(final.participants.find((x) => x.nom === "Alice")!.attendus.animation);
    expect(store.getResult(0, alice, n("animation")).marques & MARQUE_JOKER_APPLIQUE).toBeTruthy();
  });

  test("H5a « accepté » : joker posé sur un nœud sans résultat, appliqué quand la note arrive", () => {
    const { plan, sources, store, n, p } = monter();
    const felix = p("Félix");
    // Félix : E1#2 non faite ; on vide aussi Consignes E2, E3 et Gestion → Animation sans résultat.
    for (const id of ["consignes-e2", "consignes-e3", "gestion"]) ecrireCase(sources, 0, felix, plan.indexDonnee[n(id)], NaN);
    expect(store.getResult(0, felix, n("animation")).valeur).toBeNaN();
    const anim = plan.indexJoker.get("joker:animation")!;
    expect(poserJoker(sources, plan, 0, felix, anim, "Absent", NaN)).toBeNull();
    expect(store.getResult(0, felix, n("animation")).marques).toBe(0);
    expect(store.getFillStatus(0, felix).erreurs.filter((e) => e.type === "quotaDepasse")).toEqual([]);
    // Gestion = 2 (rang 1) : Animation = 2, remontée au seuil 3.
    ecrireCase(sources, 0, felix, plan.indexDonnee[n("gestion")], 1);
    expect(store.getResult(0, felix, n("animation")).valeur).toBe(3);
    expect(store.getResult(0, felix, n("animation")).marques & MARQUE_JOKER_APPLIQUE).toBeTruthy();
  });

  test("bascule H5a → « refusé » : le joker d'un nœud sans résultat reste posé, erreur « quota dépassé »", () => {
    const avant = monter();
    const felix = avant.p("Félix");
    for (const id of ["consignes-e2", "consignes-e3", "gestion"])
      ecrireCase(avant.sources, 0, felix, avant.plan.indexDonnee[avant.n(id)], NaN);
    poserJoker(avant.sources, avant.plan, 0, felix, avant.plan.indexJoker.get("joker:animation")!, "Absent", NaN);
    avant.store.dispose();

    // Recompilation sous H5a « refusé », sources conservées.
    const apres = monter({ h5a: "refuse" }, v2, avant.sources);
    expect(apres.jokersDe(felix)).toHaveLength(1);
    expect(apres.store.getFillStatus(0, felix).erreurs.filter((e) => e.type === "quotaDepasse")).toEqual([
      { type: "quotaDepasse", n: apres.n("animation"), joker: apres.jokersDe(felix)[0].id, raison: "sansResultat" },
    ]);
    // La pose d'un nouveau joker sur un nœud sans résultat est refusée (et le quota est déjà pris).
    expect(poserJoker(apres.sources, apres.plan, 0, felix, apres.plan.indexJoker.get("joker:animation")!, "x", NaN)).toBe("quota");
  });

  test("bascule H5b « cumulés » → « un seul » : second joker conservé, en erreur, non appliqué", () => {
    const quota2: Grille = { ...v2, jokers: { ...v2.jokers!, quota: 2 } };
    const avant = monter({ h5b: "cumules" }, quota2);
    const david = avant.p("David");
    const e2 = avant.plan.indexJoker.get("joker:e2")!;
    const base = avant.store.getResult(0, david, avant.n("e2")).valeur;
    expect(poserJoker(avant.sources, avant.plan, 0, david, e2, "un", base)).toBeNull();
    expect(poserJoker(avant.sources, avant.plan, 0, david, e2, "deux", base)).toBeNull();
    // David : E2 83,3 % (figé) + 10 + 10, borné à 100 %.
    expect(avant.store.getResult(0, david, avant.n("e2")).valeur).toBe(100);
    avant.store.dispose();

    const apres = monter({}, quota2, avant.sources);
    const poses = apres.jokersDe(david);
    expect(poses).toHaveLength(2);
    expect(apres.store.getFillStatus(0, david).erreurs.filter((e) => e.type === "quotaDepasse")).toEqual([
      { type: "quotaDepasse", n: apres.n("e2"), joker: Math.max(...poses.map((j) => j.id)), raison: "plusieursSurLeNoeud" },
    ]);
    const davidFige = final.participants.find((x) => x.nom === "David")!;
    expect(apres.store.getResult(0, david, apres.n("e2")).valeur).toBeCloseTo(davidFige.attendus.e2! + 10, 9);
    // Retirer le second joker lève l'erreur.
    retirerJoker(apres.sources, Math.max(...poses.map((j) => j.id)));
    expect(apres.store.getFillStatus(0, david).erreurs.filter((e) => e.type === "quotaDepasse")).toEqual([]);
  });
});
