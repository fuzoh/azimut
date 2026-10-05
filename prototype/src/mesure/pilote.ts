// Pilote du harnais de mesure (spec 20, « Scénarios de performance ») :
// `window.__azimut`, appelé par Playwright pour ce que la souris et le clavier
// ne font pas (écritures en série, copie, bascule du modèle, attente de la
// stabilité). L'app n'en dépend pas.

import type { Essai } from "../essai";
import { flux } from "../generateur/prng";
import { ciblesCopie, copierGrille } from "../session";
import { cle } from "../sources/cle";
import { ecrireCase } from "../sources/collections";
import { valeurAuHasard } from "../simulateur";
import type { StoreNotes } from "../store/store";
import { type StatsInstanciation, statsInstanciation } from "./stats";

export interface Chrono {
  /** Partie synchrone sur le thread principal (ms). */
  principalMs: number;
  /** Jusqu'à la table repeinte, plus rien en calcul (ms). */
  totalMs: number;
}

export interface Pilote {
  essai: Essai;
  /** Attend que plus rien ne soit en vol ni « en calcul », puis la peinture suivante ; rend `performance.now()`. */
  stable(delaiMaxMs?: number): Promise<number>;
  /** Texte valide à saisir dans la case `noeud` du participant p, différent de la valeur actuelle. */
  valeurSaisie(g: number, p: number, noeud: string, i: number): string;
  simulateur(actif: boolean): void;
  ecrituresEnSerie(nombre: number): Promise<{ dureesMs: number[]; totalMs: number }>;
  copier(g: number): Promise<Chrono & { grille: number; cases: number }>;
  basculerModele(): Promise<Chrono>;
  stats(): StatsInstanciation;
}

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const delai = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function creerPilote(essai: Essai): Pilote {
  const session = essai.session;
  const store = session.store as StoreNotes & { stable?: () => Promise<void> };

  const stable = async (delaiMaxMs = 60_000) => {
    const fin = performance.now() + delaiMaxMs;
    while (performance.now() < fin) {
      if (store.stable) await Promise.race([store.stable(), delai(Math.max(0, fin - performance.now()))]);
      await frame();
      if (!document.querySelector('[data-en-calcul="1"]')) return performance.now();
    }
    return performance.now();
  };

  const avecReglages = (f: (r: ReturnType<Essai["etat"]>["reglages"]) => ReturnType<Essai["etat"]>["reglages"]) =>
    essai.changer(f(essai.etat().reglages));

  return {
    essai,
    stable,
    valeurSaisie(g, p, noeud, i) {
      const plan = session.plans[g];
      const n = plan.index.get(noeud);
      if (n === undefined) throw new Error(`nœud inconnu : ${noeud}`);
      const d = plan.indexDonnee[n];
      const b = plan.baremes[plan.bareme[n]];
      const courant = session.sources.cases.get(cle(g, p, d))?.valeur ?? NaN;
      // Valeurs affichables, dans l'ordre ; la saisie d'un ordinal est la valeur du palier.
      const choix =
        b.type === "ordinal"
          ? Array.from(b.valeurs, (v, rang) => ({ texte: String(v), stockee: rang }))
          : Array.from({ length: b.pas > 0 ? Math.round((b.max - b.min) / b.pas) + 1 : 11 }, (_, k) => {
              const v = b.pas > 0 ? Number((b.min + k * b.pas).toFixed(10)) : b.min + (k / 10) * (b.max - b.min);
              return { texte: String(v), stockee: v };
            });
      for (let k = 0; k < choix.length; k++) {
        const c = choix[(i + k) % choix.length];
        if (!Object.is(c.stockee, courant)) return c.texte;
      }
      return choix[0].texte;
    },
    simulateur(actif) {
      avecReglages((r) => ({ ...r, session: { ...r.session, simulateur: actif } }));
    },
    async ecrituresEnSerie(nombre) {
      const plan = session.plans[0];
      const P = session.sources.participants.size;
      const tirage = flux(1, "ecritures-en-serie", 0);
      const dureesMs: number[] = [];
      const t0 = performance.now();
      for (let i = 0; i < nombre; i++) {
        const p = tirage.entier(P);
        const d = tirage.entier(plan.D);
        const debut = performance.now();
        ecrireCase(session.sources, 0, p, d, valeurAuHasard(plan, d, tirage));
        dureesMs.push(performance.now() - debut);
        // Une écriture par tâche : successives, sans bloquer le thread principal d'un bloc.
        await delai(0);
      }
      await stable();
      return { dureesMs, totalMs: performance.now() - t0 };
    },
    async copier(g) {
      const cible = ciblesCopie(session, g).at(-1)!; // copie à l'identique
      const avant = session.sources.cases.size;
      const t0 = performance.now();
      const { g: grille } = copierGrille(session, g, cible.structure);
      const principalMs = performance.now() - t0;
      await stable();
      return { grille, cases: session.sources.cases.size - avant, principalMs, totalMs: performance.now() - t0 };
    },
    async basculerModele() {
      const t0 = performance.now();
      avecReglages((r) => ({ ...r, modele: { ...r.modele, h4Strict: !r.modele.h4Strict } }));
      const principalMs = performance.now() - t0;
      await stable();
      return { principalMs, totalMs: performance.now() - t0 };
    },
    stats: () => ({ ...statsInstanciation }),
  };
}

/** Expose le pilote et marque « première table peinte » (phase du démarrage). */
export function installerPilote(essai: Essai): void {
  const pilote = creerPilote(essai);
  (window as unknown as { __azimut: Pilote }).__azimut = pilote;
  setTimeout(() => void pilote.stable().then(() => performance.mark("demarrage:table-peinte")), 0);
}
