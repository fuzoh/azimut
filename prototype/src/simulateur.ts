// Simulateur de saisies distantes (spec 20, « Réglages », classe Session) :
// 5 formateurs, une case toutes les 2 s chacun, sur des participants au
// hasard, écrites dans TanStack DB comme venant de la synchronisation (clé
// inscrite dans `origineDistante` avant l'écriture : le relais du store marque
// le changement `distante`).

import { flux, type Flux } from "./generateur/prng";
import type { Plan } from "./noyau/compile";
import { cle } from "./sources/cle";
import { ecrireCaseDistante, type Sources } from "./sources/collections";

export interface OptionsSimulateur {
  formateurs?: number;
  intervalleMs?: number;
  graine?: number;
  /** Part des saisies qui vident une case remplie. */
  partVidages?: number;
}

export interface SaisieDistante {
  formateur: number;
  g: number;
  p: number;
  d: number;
  /** NaN : case vidée. */
  valeur: number;
}

export interface Simulateur {
  demarrer(): void;
  arreter(): void;
  actif(): boolean;
  /** Saisie immédiate du formateur f (les minuteries l'appellent ; les tests aussi). */
  saisir(f: number): SaisieDistante | null;
  ecritures(): number;
  abonner(rappel: (s: SaisieDistante) => void): () => void;
}

/** Valeur stockée valide pour la case d : rang d'un palier, ou note entière sur le pas du barème. */
export function valeurAuHasard(plan: Plan, d: number, f: Flux): number {
  const b = plan.baremes[plan.bareme[plan.donnees[d]]];
  if (b.type === "ordinal") return f.entier(b.valeurs.length);
  const pas = b.pas > 0 ? Math.round((b.max - b.min) / b.pas) : 100;
  const k = f.entier(pas + 1);
  return b.pas > 0 ? Number((b.min + k * b.pas).toFixed(10)) : b.min + (k / pas) * (b.max - b.min);
}

export function creerSimulateur(session: { plans: Plan[]; sources: Sources }, o: OptionsSimulateur = {}): Simulateur {
  const formateurs = o.formateurs ?? 5;
  const intervalle = o.intervalleMs ?? 2000;
  const partVidages = o.partVidages ?? 0.1;
  const tirages = Array.from({ length: formateurs }, (_, f) => flux(o.graine ?? 1, "simulateur", f));
  const minuteries: ReturnType<typeof setTimeout>[] = [];
  const rappels = new Set<(s: SaisieDistante) => void>();
  let ecritures = 0;
  let actif = false;

  const saisir = (f: number): SaisieDistante | null => {
    const t = tirages[f];
    const { plans, sources } = session;
    const P = sources.participants.size;
    if (P === 0 || plans.length === 0) return null;
    const g = t.entier(plans.length);
    const plan = plans[g];
    if (plan.D === 0) return null;
    const p = t.entier(P);
    const d = t.entier(plan.D);
    const courant = sources.cases.get(cle(g, p, d))?.valeur ?? NaN;
    const vider = !Number.isNaN(courant) && t.uniforme() < partVidages;
    let valeur = vider ? NaN : valeurAuHasard(plan, d, t);
    // Une case remplie reçoit une autre valeur : sinon l'écriture est ignorée
    // et le débit réel tombe sous « une case toutes les 2 s ».
    for (let essai = 0; essai < 8 && Object.is(valeur, courant); essai++) valeur = valeurAuHasard(plan, d, t);
    if (!ecrireCaseDistante(sources, g, p, d, valeur)) return null;
    ecritures++;
    const s = { formateur: f, g, p, d, valeur };
    for (const r of rappels) r(s);
    return s;
  };

  /** Chaque formateur à son rythme, départs décalés sur l'intervalle. */
  const lancer = (f: number, delai: number) => {
    minuteries[f] = setTimeout(() => {
      if (!actif) return;
      saisir(f);
      lancer(f, intervalle);
    }, delai);
  };

  return {
    demarrer() {
      if (actif) return;
      actif = true;
      for (let f = 0; f < formateurs; f++) lancer(f, ((f + 1) * intervalle) / formateurs);
    },
    arreter() {
      actif = false;
      for (const m of minuteries) clearTimeout(m);
      minuteries.length = 0;
    },
    actif: () => actif,
    saisir,
    ecritures: () => ecritures,
    abonner(rappel) {
      rappels.add(rappel);
      return () => {
        rappels.delete(rappel);
      };
    },
  };
}
