// Générateur déterministe du jeu commun de l'essai de stockage (G3 V1 et V2, 40 participants).
// Lancer : bun run generer.ts            (écrit à côté de ce fichier)
// Variables : MAIN = copie de main (lecture seule), GRAINE = graine (défaut 20261122).
// Le noyau du prototype (compile, evaluate, copier, remplissage) sert d'oracle pour les attendus ;
// il est importé en lecture depuis MAIN, rien n'y est écrit.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MAIN = process.env.MAIN ?? `${import.meta.dir}/../../../..`;
const GRAINE = Number(process.env.GRAINE ?? 20261122);
const SORTIE = import.meta.dir;
const NOYAU = `${MAIN}/prototype/src/noyau`;
const CORPUS = `${MAIN}/docs/analyse/corpus-prototype`;

const { compile, TYPE_CALCUL, TYPE_DONNEES } = await import(`${NOYAU}/compile.ts`);
const { evaluate, MARQUE_JOKER_APPLIQUE, MARQUE_INFLUENCE_JOKER } = await import(`${NOYAU}/evaluate.ts`);
const { copier } = await import(`${NOYAU}/copier.ts`);
const { remplissage, idsExigences } = await import(`${NOYAU}/remplissage.ts`);
const { couverture } = await import(`${NOYAU}/dispense.ts`);
const { jokersInvalides } = await import(`${MAIN}/prototype/src/noyau/jokers.ts`);
const { flux } = await import(`${MAIN}/prototype/src/generateur/prng.ts`);

type Flux = { uniforme(): number; normale(): number; entier(n: number): number };

// ---------------------------------------------------------------- paramètres
const NB_PARTICIPANTS = 40; // FEATURES « Apprenants par cours : 10 à 40 » (borne haute), 28 MESURES-6 profil `reel`
const DEBUT = Date.UTC(2026, 6, 11); // 11 juillet 2026, 6 jours
const FIN_COURS = DEBUT + 5 * 86400e3 + 20 * 3600e3; // jour 6, 20:00 UTC
const COPIE_V1 = DEBUT + 2 * 86400e3 + 13 * 3600e3; // jour 3, 13:00 UTC : état de V1 au moment de la copie
const OUVERTURE_SAISIE = DEBUT - 2 * 3600e3; // veille 22:00 UTC
const T_ENTITES = Date.UTC(2026, 5, 1); // horodatage des UUIDv7 des entités

const grilleV1 = JSON.parse(readFileSync(`${CORPUS}/g3-v1-structure.json`, "utf8"));
const grilleV2 = JSON.parse(readFileSync(`${CORPUS}/g3-v2-structure.json`, "utf8"));
const figes = JSON.parse(readFileSync(`${CORPUS}/g3-participants.json`, "utf8"));
const planV1 = compile(grilleV1);
const planV2 = compile(grilleV2);

// ---------------------------------------------------------------- UUIDv7 déterministe
function uuidv7(ms: number, f: Flux): string {
  const b = new Uint8Array(16);
  let t = BigInt(Math.floor(ms));
  for (let i = 5; i >= 0; i--) {
    b[i] = Number(t & 0xffn);
    t >>= 8n;
  }
  for (let i = 6; i < 16; i++) b[i] = f.entier(256);
  b[6] = 0x70 | (b[6] & 0x0f);
  b[8] = 0x80 | (b[8] & 0x3f);
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
const fIds = flux(GRAINE, "ids");
const iso = (ms: number) => new Date(ms).toISOString();

// ---------------------------------------------------------------- entités
const PRENOMS = ["Aurèle", "Bastienne", "Cassien", "Daphné", "Eloïse", "Firmin", "Gaëlle", "Hilaire", "Ivana", "Joris", "Katell", "Léandre", "Maïwenn", "Noé", "Ombeline", "Pacôme", "Quitterie", "Romuald", "Solène", "Tanguy", "Ulysse", "Victorine", "Wendel", "Xavière", "Yanis", "Zélie", "Anselme", "Bérénice", "Clovis", "Dorine", "Elouan", "Fanchon", "Gédéon", "Honorine"];
const TYPES = ["Alice", "Bruno", "Chloé", "David", "Emma", "Félix"];
const FORMATEURS = ["Arnica", "Balou", "Castor", "Diabolo"].map((totem, i) => ({ id: uuidv7(T_ENTITES + i, fIds), totem }));
const GROUPES = ["A", "B", "C", "D"].map((l, i) => ({ id: uuidv7(T_ENTITES + 10 + i, fIds), nom: `Groupe ${l}`, referent: FORMATEURS[i].id }));
const cours = { id: uuidv7(T_ENTITES + 20, fIds), nom: "Cours de moniteurs de camp (fictif)", debut: iso(DEBUT), fin: iso(FIN_COURS) };
const grilles = {
  "G3 V1": { id: uuidv7(T_ENTITES + 30, fIds), cle: "G3 V1", fichier: "grilles/g3-v1.json", principale: false, ouvertureSaisie: iso(OUVERTURE_SAISIE) },
  "G3 V2": { id: uuidv7(T_ENTITES + 31, fIds), cle: "G3 V2", fichier: "grilles/g3-v2.json", principale: true, ouvertureSaisie: iso(OUVERTURE_SAISIE) },
};
interface Participant { id: string; nom: string; type: boolean; groupe: string; niveau: number; remplissage: number }
const participants: Participant[] = [];
for (let i = 0; i < NB_PARTICIPANTS; i++) {
  const f = flux(GRAINE, "participant", i);
  const type = i < TYPES.length;
  participants.push({
    id: uuidv7(T_ENTITES + 100 + i, fIds),
    nom: type ? TYPES[i] : PRENOMS[i - TYPES.length],
    type,
    groupe: GROUPES[i % 4].id,
    niveau: f.normale(),
    remplissage: 0.86 + 0.12 * f.uniforme(), // moyenne 0,92 sur les cases à note
  });
}
const parNom = new Map(participants.map((p) => [p.nom, p]));
const generes = participants.filter((p) => !p.type);

// ---------------------------------------------------------------- calendrier par exercice (axe principal)
function sommets(g: any): Map<string, string> {
  const m = new Map<string, string>();
  const axe = g.axes.find((a: any) => a.principal) ?? g.axes[0];
  const visiter = (p: any, top: string) => {
    if (!m.has(p.noeud)) m.set(p.noeud, top);
    for (const e of p.enfants ?? []) visiter(e, top);
  };
  for (const p of axe.arbre) visiter(p, p.noeud);
  return m;
}
const JOUR: Record<string, number> = { "reg:e1": 1, "reg:e2": 2, "reg:e3": 2, "reg:e4": 3, "reg:e4/remarques": 3, "reg:e5": 3, "reg:e5/remarques": 3, "reg:e6": 4, "reg:e6/remarques": 4, "reg:e7": 5, "reg:e7/remarques": 5, "reg:e8": 5, "reg:e8/remarques": 5, "reg:posture": 6, "reg:cours": 6 };
function jour(g: any, id: string): number {
  if (id.startsWith("e1#2")) return 4; // seconde occurrence de E1
  return JOUR[sommets(g).get(id) ?? ""] ?? 6;
}

// ---------------------------------------------------------------- événements
type Ev =
  | { nature: "note"; noeud: string; valeur: number | null }
  | { nature: "commentaire"; noeud: string; texte: string | null }
  | { nature: "nonEvaluation"; noeud: string; axe: string | null; active: boolean }
  | { nature: "joker"; noeud: string; jokerDef: string; justification: string }
  | { nature: "finalisation"; erreursAcceptees: string[] };
type Evenement = Ev & { writeId: string; horodatage: string; ms: number; auteur: string; grille: string; participant: string };

const COMMENTAIRES = ["Bonne préparation, à confirmer sur la prochaine occurrence.", "A pris le temps d'expliquer les consignes.", "Oubli du plan B, discuté après coup.", "Très à l'aise avec le groupe.", "Hésitant au départ, mieux en fin d'activité.", "À revoir avec le référent.", "Sécurité bien prise en compte.", "Manque de rythme dans l'animation.", "Bonne gestion du matériel.", "Retour fait oralement le soir même.", "Progrès net depuis la veille.", "Attention au temps de parole."];

function auteur(f: Flux, p: Participant): string {
  const g = GROUPES.find((x) => x.id === p.groupe)!;
  return f.uniforme() < 0.75 ? g.referent : FORMATEURS[f.entier(4)].id;
}
function noteGeneree(f: Flux, g: any, noeud: any, p: Participant): number {
  const b = g.baremes.find((x: any) => x.id === noeud.bareme);
  if (b.prereglage === "binaire") return f.uniforme() < 1 / (1 + Math.exp(-(1.8 + 0.8 * p.niveau))) ? 1 : 0;
  const n = (b.paliers ?? []).length;
  return Math.max(0, Math.min(n - 1, Math.round(2.4 + 0.8 * p.niveau + 0.7 * f.normale())));
}
function autreNote(f: Flux, g: any, noeud: any, v: number): number {
  const b = g.baremes.find((x: any) => x.id === noeud.bareme);
  if (b.prereglage === "binaire") return 1 - v;
  const n = (b.paliers ?? []).length;
  const w = v + (f.uniforme() < 0.5 ? -1 : 1);
  return w < 0 ? 1 : w >= n ? n - 2 : w;
}

/** Historique d'une case : valeurs successives se terminant par `finale` (null = vide). Moyenne visée 1,5 écriture. */
function historiqueNote(f: Flux, g: any, noeud: any, finale: number | null, t0: number, borne: number, p: Participant, initiale?: number) {
  const evs: { ms: number; valeur: number | null; auteur: string }[] = [];
  const u = f.uniforme();
  const corrections = u < 0.08 ? 2 : u < 0.42 ? 1 : 0; // 1 + 0,34 + 2×0,08 = 1,5
  const vals: (number | null)[] = [];
  if (finale === null) {
    vals.push(initiale ?? noteGeneree(f, g, noeud, p), null); // saisie puis effacement
  } else {
    let v = finale;
    const avant: number[] = [];
    for (let k = 0; k < corrections; k++) {
      v = autreNote(f, g, noeud, v);
      avant.unshift(v);
    }
    vals.push(...avant, finale);
  }
  // Première saisie au plus tard 2 h avant la borne ; chaque correction 10 min à 26 h après la précédente,
  // ramenée au hasard dans l'intervalle restant si elle dépasserait la borne (pas d'amas à la borne).
  let t = Math.min(t0, borne - 2 * 3600e3 - f.uniforme() * 3600e3);
  for (const valeur of vals) {
    evs.push({ ms: Math.floor(t), valeur, auteur: auteur(f, p) });
    const reste = borne - t;
    const delai = f.uniforme() < 0.7 ? 10 * 60e3 + f.uniforme() * 3 * 3600e3 : 10 * 60e3 + f.uniforme() * 26 * 3600e3;
    t = t + (delai < reste - 60e3 ? delai : (0.05 + 0.9 * f.uniforme()) * reste);
  }
  return evs;
}

function heureSaisie(f: Flux, j: number): number {
  return DEBUT + (j - 1) * 86400e3 + 7 * 3600e3 + f.uniforme() * 12 * 3600e3;
}

interface Etat {
  notes: Map<string, number>;
  commentaires: Map<string, string>;
  nonEvaluations: { noeud: string; axe: string | null }[];
  jokers: { jokerDef: string; justification: string; auteur: string; horodatage: string }[];
  finalisation: { auteur: string; horodatage: string; erreursAcceptees: string[] } | null;
}

function construire(g: any, plan: any, cle: string, borne: number, joursMax: number, sourcesTypes: Map<string, any>) {
  const evs: Evenement[] = [];
  const push = (p: Participant, ms: number, aut: string, e: Ev, f: Flux) => {
    ms = Math.floor(ms);
    evs.push({ ...e, writeId: uuidv7(ms, f), horodatage: iso(ms), ms, auteur: aut, grille: cle, participant: p.id } as Evenement);
  };
  const donnees = g.noeuds.filter((n: any) => n.type === "donnees");
  const calculs = g.noeuds.filter((n: any) => n.type === "calcul");

  for (const p of participants) {
    const f = flux(GRAINE, cle, "notes", p.nom);
    const typ = p.type ? sourcesTypes.get(p.nom) : undefined;
    const valeursType = new Map<string, number>((typ?.sources.cases ?? []).map((c: any) => [c.noeud, c.valeur]));
    for (const n of donnees) {
      const j = jour(g, n.id);
      if (j > joursMax) continue;
      if (n.bareme) {
        let finale: number | null | undefined;
        if (p.type) finale = valeursType.has(n.id) ? valeursType.get(n.id)! : undefined;
        else if (f.uniforme() < p.remplissage) finale = noteGeneree(f, g, n, p);
        else finale = f.uniforme() < 0.12 ? null : undefined; // 12 % des cases vides ont eu une note effacée
        if (finale !== undefined) for (const e of historiqueNote(f, g, n, finale, heureSaisie(f, j), borne, p)) push(p, e.ms, e.auteur, { nature: "note", noeud: n.id, valeur: e.valeur }, f);
      }
      // Commentaires : ~8,5 % des cases à note, ~35 % des nœuds de commentaire.
      if (f.uniforme() < (n.bareme ? 0.085 : 0.35)) {
        let t = heureSaisie(f, j) + 30 * 60e3;
        if (t >= borne) t = borne - 3600e3 - f.uniforme() * 6 * 3600e3;
        push(p, t, auteur(f, p), { nature: "commentaire", noeud: n.id, texte: COMMENTAIRES[f.entier(COMMENTAIRES.length)] }, f);
        if (f.uniforme() < 0.2) push(p, Math.min(t + 3600e3 * (1 + 10 * f.uniforme()), borne - 1000), auteur(f, p), { nature: "commentaire", noeud: n.id, texte: COMMENTAIRES[f.entier(COMMENTAIRES.length)] + " (complété)" }, f);
      }
    }
    // Commentaires sur quelques nœuds de calcul (exercices, compétences, réussite).
    const cibles = calculs.filter((n: any) => /^(e[1-8]|animation|securite|planification|reussite)$/.test(n.id) && jour(g, n.id) <= joursMax);
    if (f.uniforme() < 0.5) {
      const n = cibles[f.entier(cibles.length)];
      push(p, Math.min(heureSaisie(f, Math.min(joursMax, 6)) + 3600e3, borne - 1000), auteur(f, p), { nature: "commentaire", noeud: n.id, texte: "Synthèse : " + COMMENTAIRES[f.entier(COMMENTAIRES.length)] }, f);
    }
    // Non-évaluations et jokers des participants types (sources du corpus).
    for (const ne of typ?.sources.nonEvaluations ?? []) push(p, heureSaisie(f, Math.min(joursMax, 3)), auteur(f, p), { nature: "nonEvaluation", noeud: ne.noeud, axe: ne.axe ?? null, active: true }, f);
    for (const jk of typ?.sources.jokers ?? []) {
      const def = g.jokers.autorises.find((x: any) => x.id === jk.jokerDef);
      push(p, Math.min(heureSaisie(f, Math.min(joursMax, 5)), borne - 2000), FORMATEURS[0].id, { nature: "joker", noeud: def.noeud, jokerDef: jk.jokerDef, justification: "Participant type du corpus (Emma)" }, f);
    }
  }
  return evs;
}

/** Ajoute les NE de case, la dispense de regroupement générée et une NE posée puis retirée (V2). */
function ajoutsV2(evs: Evenement[], cle: string) {
  const f = flux(GRAINE, cle, "ne");
  const push = (p: Participant, ms: number, e: Ev) => {
    ms = Math.floor(ms);
    evs.push({ ...e, writeId: uuidv7(ms, f), horodatage: iso(ms), ms, auteur: auteur(f, p), grille: cle, participant: p.id } as Evenement);
  };
  const derniere = (p: Participant, noeud: string) => evs.filter((e) => e.participant === p.id && e.nature === "note" && (e as any).noeud === noeud).sort((a, b) => a.ms - b.ms).at(-1);
  // 8 NE sur des cases notées (note conservée), 2 NE sur des cases vides.
  const cand = ["gestion", "consignes-e2", "e1#2/objectifs", "itineraire", "e5/c2/1", "e6/c1/2", "e7/c3/1", "e8/c2/2", "e4/c4/3", "e6/c5/1"];
  const ajoutees: { participant: string; noeud: string; avecNote: boolean }[] = [];
  let k = 0;
  for (let i = 1; i < 3 * generes.length && ajoutees.length < 10; i += 3) {
    if (i % generes.length === 4 || i % generes.length === 9) continue; // réservés à la dispense et à la NE retirée
    const p = generes[i % generes.length];
    if (ajoutees.some((x) => x.participant === p.nom)) continue;
    const noeud = cand[k++ % cand.length];
    const d = derniere(p, noeud);
    const avecNote = !!d && (d as any).valeur !== null;
    if ((ajoutees.filter((a) => a.avecNote).length < 8 && avecNote) || (ajoutees.filter((a) => !a.avecNote).length < 2 && !avecNote)) {
      push(p, (d ? d.ms : DEBUT + 4 * 86400e3) + 3600e3, { nature: "nonEvaluation", noeud, axe: null, active: true });
      ajoutees.push({ participant: p.nom, noeud, avecNote });
    }
  }
  // Dispense de regroupement générée (la seconde est celle de Chloé sur reg:e3).
  const pd = generes[4];
  push(pd, DEBUT + 3 * 86400e3 + 18 * 3600e3, { nature: "nonEvaluation", noeud: "reg:e5", axe: null, active: true });
  // NE posée puis retirée : sans effet final, à rejouer correctement (S8).
  const pr = generes[9];
  push(pr, DEBUT + 2 * 86400e3 + 15 * 3600e3, { nature: "nonEvaluation", noeud: "e3", axe: null, active: true });
  push(pr, DEBUT + 2 * 86400e3 + 17 * 3600e3, { nature: "nonEvaluation", noeud: "e3", axe: null, active: false });
  return { ajoutees, dispense: { participant: pd.nom, noeud: "reg:e5" }, poseeRetiree: { participant: pr.nom, noeud: "e3" } };
}

// ---------------------------------------------------------------- état courant (dernier gagnant) et sources noyau
function etatCourant(evs: Evenement[]): Map<string, Etat> {
  const m = new Map<string, Etat>();
  for (const p of participants) m.set(p.id, { notes: new Map(), commentaires: new Map(), nonEvaluations: [], jokers: [], finalisation: null });
  for (const e of [...evs].sort((a, b) => a.ms - b.ms || (a.writeId < b.writeId ? -1 : 1))) {
    const s = m.get(e.participant)!;
    if (e.nature === "note") e.valeur === null ? s.notes.delete(e.noeud) : s.notes.set(e.noeud, e.valeur);
    else if (e.nature === "commentaire") e.texte === null ? s.commentaires.delete(e.noeud) : s.commentaires.set(e.noeud, e.texte);
    else if (e.nature === "nonEvaluation") {
      s.nonEvaluations = s.nonEvaluations.filter((x) => !(x.noeud === e.noeud && x.axe === e.axe));
      if (e.active) s.nonEvaluations.push({ noeud: e.noeud, axe: e.axe });
    } else if (e.nature === "joker") s.jokers.push({ jokerDef: e.jokerDef, justification: e.justification, auteur: e.auteur, horodatage: e.horodatage });
    else if (e.nature === "finalisation") s.finalisation = { auteur: e.auteur, horodatage: e.horodatage, erreursAcceptees: e.erreursAcceptees };
  }
  return m;
}
function sources(plan: any, s: Etat) {
  const cases = new Float64Array(plan.D).fill(NaN);
  for (const [noeud, v] of s.notes) cases[plan.indexDonnee[plan.index.get(noeud)]] = v;
  const nonEvaluations = s.nonEvaluations.map((ne) => ({ n: plan.index.get(ne.noeud), ...(ne.axe ? { axe: plan.grille.axes.findIndex((a: any) => a.id === ne.axe) } : {}) }));
  const jokers = s.jokers.map((j, id) => ({ id, jokerDef: plan.indexJoker.get(j.jokerDef) }));
  return { cases, nonEvaluations, jokers };
}
function resultats(plan: any, src: any) {
  const r = evaluate(plan, src);
  const valeurs: Record<string, number | null> = {};
  const jokerApplique: string[] = [];
  const influence: string[] = [];
  for (let n = 0; n < plan.N; n++) {
    if (plan.type[n] !== TYPE_CALCUL) continue;
    valeurs[plan.ids[n]] = Number.isNaN(r.valeurs[n]) ? null : r.valeurs[n];
    if (r.marques[n] & MARQUE_JOKER_APPLIQUE) jokerApplique.push(plan.ids[n]);
    if (r.marques[n] & MARQUE_INFLUENCE_JOKER) influence.push(plan.ids[n]);
  }
  return { valeurs, jokerApplique, influence, brut: r };
}
function comparerAttendus(nom: string, obtenu: Record<string, number | null>, attendu: Record<string, number | null>) {
  for (const [k, v] of Object.entries(attendu)) {
    const o = obtenu[k];
    const ok = v === null ? o === null : o !== null && Math.abs(o - v) < 1e-9;
    if (!ok) throw new Error(`${nom} : ${k} attendu ${v}, obtenu ${o}`);
  }
}

// ================================================================ G3 V2 (grille principale, jours 1 à 6)
const typesV2 = new Map(figes.etats["V2-final"].participants.map((p: any) => [p.nom, p]));
const evV2 = construire(grilleV2, planV2, "G3 V2", FIN_COURS, 6, typesV2);
const ajouts = ajoutsV2(evV2, "G3 V2");

// Jokers générés : deux participants dont le seuil visé échoue sans joker.
{
  const f = flux(GRAINE, "G3 V2", "jokers");
  const etat = etatCourant(evV2);
  const choisis: string[] = [];
  for (const [def, seuil] of [["joker:e2", "seuil:e2"], ["joker:animation", "seuil:animation"]] as const) {
    const p = generes.find((q) => !choisis.includes(q.id) && etat.get(q.id)!.nonEvaluations.length === 0 && resultats(planV2, sources(planV2, etat.get(q.id)!)).valeurs[seuil] === 0);
    if (!p) throw new Error(`aucun candidat pour ${def}`);
    choisis.push(p.id);
    const d = grilleV2.jokers.autorises.find((x: any) => x.id === def);
    const ms = DEBUT + 5 * 86400e3 + 16 * 3600e3 + choisis.length * 600e3;
    evV2.push({ nature: "joker", noeud: d.noeud, jokerDef: def, justification: "Décision d'équipe en réunion du soir", writeId: uuidv7(ms, f), horodatage: iso(ms), ms, auteur: FORMATEURS[1].id, grille: "G3 V2", participant: p.id } as Evenement);
  }
}
// Finalisations : Alice, David (types) et un participant généré, le dernier soir.
const finalises = [parNom.get("Alice")!, parNom.get("David")!, generes[2]];
{
  const f = flux(GRAINE, "G3 V2", "finalisation");
  const etat = etatCourant(evV2);
  finalises.forEach((p, i) => {
    const src = sources(planV2, etat.get(p.id)!);
    const r = resultats(planV2, src);
    const erreurs = idsExigences(planV2, remplissage(planV2, src, r.brut.valeurs));
    const ms = FIN_COURS - 3600e3 + i * 60e3;
    evV2.push({ nature: "finalisation", erreursAcceptees: erreurs, writeId: uuidv7(ms, f), horodatage: iso(ms), ms, auteur: FORMATEURS[0].id, grille: "G3 V2", participant: p.id } as Evenement);
  });
}

// ================================================================ G3 V1 (état au moment de la copie, jours 1 à 3)
const typesV1 = new Map(figes.copie.J3.V1.participants.map((p: any) => [p.nom, p]));
const evV1 = construire(grilleV1, planV1, "G3 V1", COPIE_V1, 3, typesV1);

// ---------------------------------------------------------------- tri, écriture
const tri = (a: Evenement, b: Evenement) => a.ms - b.ms || (a.writeId < b.writeId ? -1 : 1);
evV2.sort(tri);
evV1.sort(tri);
const ligne = (e: Evenement) => {
  const { ms, ...reste } = e;
  return JSON.stringify(reste);
};
mkdirSync(join(SORTIE, "grilles"), { recursive: true });
mkdirSync(join(SORTIE, "attendu"), { recursive: true });
writeFileSync(join(SORTIE, "grilles/g3-v1.json"), readFileSync(`${CORPUS}/g3-v1-structure.json`));
writeFileSync(join(SORTIE, "grilles/g3-v2.json"), readFileSync(`${CORPUS}/g3-v2-structure.json`));
writeFileSync(join(SORTIE, "evenements-g3-v2.ndjson"), evV2.map(ligne).join("\n") + "\n");
writeFileSync(join(SORTIE, "evenements-g3-v1.ndjson"), evV1.map(ligne).join("\n") + "\n");
writeFileSync(
  join(SORTIE, "cours.json"),
  JSON.stringify({ graine: GRAINE, cours, formateurs: FORMATEURS, groupes: GROUPES, participants: participants.map(({ niveau, remplissage, ...p }) => p), grilles: Object.values(grilles) }, null, 1) + "\n",
);

// ---------------------------------------------------------------- attendus
const etatV2 = etatCourant(evV2);
const etatV1 = etatCourant(evV1);
const versionsDe = (evs: Evenement[]) => {
  const m = new Map<string, number>();
  for (const e of evs) if (e.nature === "note" || e.nature === "commentaire") {
    const k = `${e.participant}|${e.noeud}|${e.nature}`;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
};
function dumpEtat(evs: Evenement[], etat: Map<string, Etat>) {
  const v = versionsDe(evs);
  return participants.map((p) => {
    const s = etat.get(p.id)!;
    return {
      participant: p.id,
      nom: p.nom,
      notes: Object.fromEntries([...s.notes].sort().map(([k, x]) => [k, { valeur: x, ecritures: v.get(`${p.id}|${k}|note`)! }])),
      commentaires: Object.fromEntries([...s.commentaires].sort().map(([k, x]) => [k, { texte: x, ecritures: v.get(`${p.id}|${k}|commentaire`)! }])),
      notesEffacees: [...new Set(evs.filter((e) => e.participant === p.id && e.nature === "note").map((e: any) => e.noeud))].filter((k) => !s.notes.has(k)).sort(),
      nonEvaluations: s.nonEvaluations,
      jokers: s.jokers,
      finalisation: s.finalisation,
    };
  });
}
writeFileSync(join(SORTIE, "attendu/etat-g3-v2.json"), JSON.stringify(dumpEtat(evV2, etatV2), null, 1) + "\n");
writeFileSync(join(SORTIE, "attendu/etat-g3-v1.json"), JSON.stringify(dumpEtat(evV1, etatV1), null, 1) + "\n");

function dumpResultats(plan: any, etat: Map<string, Etat>, controle?: Map<string, any>) {
  return participants.map((p) => {
    const src = sources(plan, etat.get(p.id)!);
    const r = resultats(plan, src);
    if (controle && p.type) {
      comparerAttendus(`${plan.grille.grille} ${p.nom}`, r.valeurs, controle.get(p.nom).attendus);
      const m = controle.get(p.nom).marques;
      if (m && (JSON.stringify(m.jokerApplique.sort()) !== JSON.stringify([...r.jokerApplique].sort()) || JSON.stringify(m.influence.sort()) !== JSON.stringify([...r.influence].sort()))) throw new Error(`marques ${p.nom}`);
    }
    const inval = jokersInvalides(plan, src.jokers, r.brut.valeurs);
    if (inval.length) throw new Error(`joker invalide ${p.nom}`);
    const erreurs = idsExigences(plan, remplissage(plan, src, r.brut.valeurs));
    return { participant: p.id, nom: p.nom, resultats: r.valeurs, jokerApplique: r.jokerApplique, influenceJoker: r.influence, erreursRemplissage: erreurs };
  });
}
const resV2 = dumpResultats(planV2, etatV2, typesV2);
const resV1 = dumpResultats(planV1, etatV1, typesV1);
writeFileSync(join(SORTIE, "attendu/resultats-g3-v2.ndjson"), resV2.map((r) => JSON.stringify(r)).join("\n") + "\n");
writeFileSync(join(SORTIE, "attendu/resultats-g3-v1.ndjson"), resV1.map((r) => JSON.stringify(r)).join("\n") + "\n");

// ---------------------------------------------------------------- copie V1 → V2 (S5, S7)
const idx = new Map(participants.map((p, i) => [i, p]));
const srcV1 = new Map(participants.map((p, i) => [i, sources(planV1, etatV1.get(p.id)!)]));
const { sourcesV2, rapport } = copier(grilleV1, grilleV2, srcV1);
const origV2 = new Map(grilleV2.noeuds.filter((n: any) => n.origine).map((n: any) => [n.origine, n.id]));
const copieParticipants = participants.map((p, i) => {
  const s2 = sourcesV2.get(i);
  const notes: Record<string, number> = {};
  for (let d = 0; d < planV2.D; d++) if (!Number.isNaN(s2.cases[d])) notes[planV2.ids[planV2.donnees[d]]] = s2.cases[d];
  const com = etatV1.get(p.id)!.commentaires;
  const commentaires: Record<string, string> = {};
  const commentairesPerdus: string[] = [];
  for (const [k, t] of [...com].sort()) origV2.has(k) ? (commentaires[origV2.get(k)!] = t) : commentairesPerdus.push(k);
  const r = resultats(planV2, s2);
  if (p.type) {
    const att = figes.copie.J3["V2-copie"].participants.find((x: any) => x.nom === p.nom);
    comparerAttendus(`copie ${p.nom}`, r.valeurs, att.attendus);
  }
  const couvert = couverture(planV2, s2.nonEvaluations);
  const couvertes: string[] = [];
  for (let d = 0; d < planV2.D; d++) if (couvert[d]) couvertes.push(planV2.ids[planV2.donnees[d]]);
  return {
    participant: p.id,
    nom: p.nom,
    notes,
    commentaires,
    commentairesPerdus,
    nonEvaluations: s2.nonEvaluations.map((ne: any) => ({ noeud: planV2.ids[ne.n], axe: ne.axe === undefined ? null : grilleV2.axes[ne.axe].id })),
    jokers: s2.jokers.map((j: any) => planV2.jokerDefs[j.jokerDef].id),
    casesCouvertesParDispense: couvertes,
    resultats: r.valeurs,
  };
});
const chloe = copieParticipants.find((c) => c.nom === "Chloé")!;
if (JSON.stringify(chloe.casesCouvertesParDispense) !== JSON.stringify([...figes.copie.J3.couvertesParDispenseV2["Chloé"]].sort((a: string, b: string) => planV2.indexDonnee[planV2.index.get(a)] - planV2.indexDonnee[planV2.index.get(b)])))
  throw new Error("couverture de Chloé après copie");
const rapportNomme = rapport.map((e: any) => ({ ...e, p: undefined, participant: idx.get(e.p)!.id, nom: idx.get(e.p)!.nom }));
writeFileSync(
  join(SORTIE, "attendu/copie-v1-v2.json"),
  JSON.stringify(
    {
      regle: "Correspondance par `origine` (V2.noeud.origine = id V1) ; case reprise si le nœud V2 existe, porte une case et garde un barème de mêmes valeurs ; NE copiées sur le nœud correspondant ; jokers suivis par définition. Commentaires repris si le nœud existe en V2. Historique : non exigé.",
      correspondanceNoeuds: Object.fromEntries(grilleV1.noeuds.map((n: any) => [n.id, origV2.get(n.id) ?? null])),
      noeudsAjoutesEnV2: grilleV2.noeuds.filter((n: any) => !n.origine).map((n: any) => n.id),
      rapport: rapportNomme,
      totaux: {
        notesSource: participants.reduce((s, p) => s + etatV1.get(p.id)!.notes.size, 0),
        notesReprises: copieParticipants.reduce((s, c) => s + Object.keys(c.notes).length, 0),
        casesPerdues: rapport.filter((e: any) => e.type === "casePerdue").length,
        casesNonReprises: rapport.filter((e: any) => e.type === "caseNonReprise").length,
        commentairesSource: participants.reduce((s, p) => s + etatV1.get(p.id)!.commentaires.size, 0),
        commentairesRepris: copieParticipants.reduce((s, c) => s + Object.keys(c.commentaires).length, 0),
        commentairesPerdus: copieParticipants.reduce((s, c) => s + c.commentairesPerdus.length, 0),
        nonEvaluations: copieParticipants.reduce((s, c) => s + c.nonEvaluations.length, 0),
        jokers: copieParticipants.reduce((s, c) => s + c.jokers.length, 0),
      },
      S7: { participant: chloe.participant, nom: "Chloé", dispense: "reg:e3", noeudAjouteCouvert: "sr5", casesCouvertes: chloe.casesCouvertesParDispense, lignesDeDispenseAttendues: 1 },
      participants: copieParticipants,
    },
    null,
    1,
  ) + "\n",
);

// ---------------------------------------------------------------- requêtes transverses (S9)
function feuillesParPlacement(g: any, noeud: string): string[] {
  const res = new Set<string>();
  const sous = (p: any) => {
    const n = g.noeuds.find((x: any) => x.id === p.noeud);
    if (n.type === "donnees" && n.bareme) res.add(p.noeud);
    for (const e of p.enfants ?? []) sous(e);
  };
  const chercher = (p: any) => {
    if (p.noeud === noeud) sous(p);
    else for (const e of p.enfants ?? []) chercher(e);
  };
  for (const a of g.axes) for (const p of a.arbre) chercher(p);
  return [...res].sort();
}
const okko = (g: any) => new Set(g.noeuds.filter((n: any) => n.type === "donnees" && g.baremes.find((b: any) => b.id === n.bareme)?.prereglage === "binaire").map((n: any) => n.id));
const okkoV1 = okko(grilleV1);
const okkoV2 = okko(grilleV2);
let lignesOkKo = 0;
let okV2 = 0;
for (const p of participants) {
  for (const [k, v] of etatV1.get(p.id)!.notes) if (okkoV1.has(k)) lignesOkKo++;
  for (const [k, v] of etatV2.get(p.id)!.notes) if (okkoV2.has(k)) (lignesOkKo++, v === 1 && okV2++);
}
function feuillesParCalcul(g: any, noeud: string): string[] {
  const N = new Map(g.noeuds.map((n: any) => [n.id, n]));
  const res = new Set<string>();
  const vus = new Set<string>();
  const desc = (id: string) => {
    if (vus.has(id)) return;
    vus.add(id);
    const n: any = N.get(id);
    if (n.type === "donnees" && n.bareme) res.add(id);
    for (const e of n.entrees ?? []) desc(e.noeud);
  };
  desc(noeud);
  return [...res].sort();
}
const GROUPE = GROUPES[1];
const membres = participants.filter((p) => p.groupe === GROUPE.id);
function vides(feuilles: string[]) {
  let sansNote = 0;
  let sansNoteEtNonCouvertes = 0;
  for (const p of membres) {
    const s = etatV2.get(p.id)!;
    const couvert = couverture(planV2, sources(planV2, s).nonEvaluations);
    for (const k of feuilles) if (!s.notes.has(k)) {
      sansNote++;
      if (!couvert[planV2.indexDonnee[planV2.index.get(k)]]) sansNoteEtNonCouvertes++;
    }
  }
  return { feuilles: feuilles.length, sansNote, sansNoteEtNonCouvertes };
}
const S9b = {
  groupe: GROUPE.nom,
  groupeId: GROUPE.id,
  membres: membres.length,
  parCalcul: { objectif: "comp:communication", regle: "feuilles à note atteintes en descendant les entrées de calcul (cône)", ...vides(feuillesParCalcul(grilleV2, "comp:communication")) },
  parPlacement: { objectif: "reg:e4", regle: "feuilles à note du sous-arbre de chaque placement du nœud, tous axes (règle 1b-A de la dispense)", ...vides(feuillesParPlacement(grilleV2, "reg:e4")) },
};
const compte = (evs: Evenement[], n: string) => evs.filter((e) => e.nature === n).length;
const etatTotaux = (etat: Map<string, Etat>) => ({
  notesCourantes: [...etat.values()].reduce((s, e) => s + e.notes.size, 0),
  commentairesCourants: [...etat.values()].reduce((s, e) => s + e.commentaires.size, 0),
  commentairesSurCalcul: [...etat.values()].reduce((s, e) => s + [...e.commentaires.keys()].filter((k) => !k.includes("/") && /^(e[1-8]|animation|securite|planification|reussite)$/.test(k)).length, 0),
  nonEvaluationsCourantes: [...etat.values()].reduce((s, e) => s + e.nonEvaluations.length, 0),
  jokers: [...etat.values()].reduce((s, e) => s + e.jokers.length, 0),
  finalises: [...etat.values()].filter((e) => e.finalisation).length,
});
const casesANote = (g: any) => g.noeuds.filter((n: any) => n.type === "donnees" && n.bareme).length;
const casesTouchees = (evs: Evenement[]) => new Set(evs.filter((e) => e.nature === "note").map((e: any) => `${e.participant}|${e.noeud}`)).size;
const compteurs = {
  graine: GRAINE,
  participants: NB_PARTICIPANTS,
  participantsTypes: TYPES,
  formateurs: FORMATEURS.length,
  "G3 V2": {
    noeuds: grilleV2.noeuds.length,
    casesANoteParParticipant: casesANote(grilleV2),
    noeudsCommentaireSeul: grilleV2.noeuds.filter((n: any) => n.type === "donnees" && !n.bareme).length,
    casesPossibles: casesANote(grilleV2) * NB_PARTICIPANTS,
    evenements: evV2.length,
    parNature: Object.fromEntries(["note", "commentaire", "nonEvaluation", "joker", "finalisation"].map((n) => [n, compte(evV2, n)])),
    casesTouchees: casesTouchees(evV2),
    ecrituresNoteParCaseTouchee: +(compte(evV2, "note") / casesTouchees(evV2)).toFixed(3),
    tauxRemplissageGeneres: +(generes.reduce((s, p) => s + etatV2.get(p.id)!.notes.size, 0) / (generes.length * casesANote(grilleV2))).toFixed(4),
    tauxRemplissageGlobal: +([...etatV2.values()].reduce((s, e) => s + e.notes.size, 0) / (NB_PARTICIPANTS * casesANote(grilleV2))).toFixed(4),
    ...etatTotaux(etatV2),
    nonEvaluationsDeCase: ajouts.ajoutees,
    dispensesDeRegroupement: [{ participant: "Chloé", noeud: "reg:e3" }, ajouts.dispense],
    nonEvaluationPoseeRetiree: ajouts.poseeRetiree,
    finalises: finalises.map((p) => p.nom),
    premierEvenement: evV2[0].horodatage,
    dernierEvenement: evV2.at(-1)!.horodatage,
  },
  "G3 V1": {
    noeuds: grilleV1.noeuds.length,
    casesANoteParParticipant: casesANote(grilleV1),
    evenements: evV1.length,
    parNature: Object.fromEntries(["note", "commentaire", "nonEvaluation", "joker", "finalisation"].map((n) => [n, compte(evV1, n)])),
    casesTouchees: casesTouchees(evV1),
    ecrituresNoteParCaseTouchee: +(compte(evV1, "note") / casesTouchees(evV1)).toFixed(3),
    ...etatTotaux(etatV1),
    dernierEvenement: evV1.at(-1)!.horodatage,
  },
  S9: {
    okKoToutesGrilles: { lignes: lignesOkKo, okDansV2: okV2 },
    casesVidesObjectifGroupe: S9b,
  },
};
writeFileSync(join(SORTIE, "attendu/compteurs.json"), JSON.stringify(compteurs, null, 1) + "\n");

// ---------------------------------------------------------------- empreintes
const fichiers = ["cours.json", "evenements-g3-v1.ndjson", "evenements-g3-v2.ndjson", "attendu/etat-g3-v1.json", "attendu/etat-g3-v2.json", "attendu/resultats-g3-v1.ndjson", "attendu/resultats-g3-v2.ndjson", "attendu/copie-v1-v2.json", "attendu/compteurs.json", "grilles/g3-v1.json", "grilles/g3-v2.json"];
const sums = fichiers.map((f) => `${createHash("sha256").update(readFileSync(join(SORTIE, f))).digest("hex")}  ${f}`).join("\n") + "\n";
writeFileSync(join(SORTIE, "SHA256SUMS"), sums);
console.log(JSON.stringify(compteurs, (k, v) => (k === "nonEvaluationsDeCase" ? v.length : v), 1));
