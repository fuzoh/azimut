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
import { decrireProfil, type ProfilSession } from "./profil";
import { type StatsInstanciation, statsInstanciation } from "./stats";

export interface Chrono {
  /** Partie synchrone sur le thread principal (ms). */
  principalMs: number;
  /** Jusqu'à la table repeinte, plus rien en calcul (ms). */
  totalMs: number;
}

/** Cible d'une copie mesurée : à l'identique, ou la structure du corpus qui provient de la grille (G3 V1 → V2). */
export type CibleCopie = "identique" | "provenance";

export interface Pilote {
  essai: Essai;
  /**
   * Attend que plus rien ne soit en vol ni « en calcul », puis la peinture suivante ; rend `performance.now()`.
   * Au-delà du délai, rend quand même l'instant et compte un dépassement (`delaisDepasses`).
   */
  stable(delaiMaxMs?: number): Promise<number>;
  /** Comme `stable`, mais un délai dépassé est une erreur : le harnais invalide le run au lieu de garder une durée tronquée. */
  attendreStable(delaiMaxMs?: number): Promise<number>;
  /** Dépassements du délai de stabilité depuis le chargement. */
  delaisDepasses(): number;
  /** Texte valide à saisir dans la case `noeud` du participant p, différent de la valeur actuelle. */
  valeurSaisie(g: number, p: number, noeud: string, i: number): string;
  simulateur(actif: boolean): void;
  /** Écritures du simulateur de saisies distantes depuis le chargement. */
  saisiesDistantes(): number;
  /** Écritures successives sur la grille g (défaut 0), participants et cases tirés au hasard. */
  ecrituresEnSerie(nombre: number, g?: number): Promise<{ dureesMs: number[]; totalMs: number }>;
  /** Cibles de copie disponibles depuis la grille g. */
  ciblesCopie(g: number): CibleCopie[];
  copier(g: number, cible?: CibleCopie): Promise<Chrono & { grille: number; cases: number; cible: string }>;
  basculerModele(): Promise<Chrono>;
  stats(): StatsInstanciation;
  /** Jeu, structures, effectif et volumes par grille de la session (rapport du harnais). */
  profil(): ProfilSession;
}

/** Délai de stabilité dépassé : le run qui l'a subi n'a pas de durée valable. */
export class DelaiStabiliteDepasse extends Error {}

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const delai = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function creerPilote(essai: Essai): Pilote {
  const session = essai.session;
  const store = session.store as StoreNotes & { stable?: () => Promise<void> };

  let depassements = 0;
  /** Instant de stabilité, ou null si le délai est dépassé. */
  const attendre = async (delaiMaxMs: number): Promise<number | null> => {
    const fin = performance.now() + delaiMaxMs;
    while (performance.now() < fin) {
      if (store.stable) await Promise.race([store.stable(), delai(Math.max(0, fin - performance.now()))]);
      await frame();
      if (!document.querySelector('[data-en-calcul="1"]')) return performance.now();
    }
    depassements++;
    return null;
  };
  const stable = async (delaiMaxMs = 60_000) => (await attendre(delaiMaxMs)) ?? performance.now();
  const attendreStable = async (delaiMaxMs = 60_000) => {
    const t = await attendre(delaiMaxMs);
    if (t === null) throw new DelaiStabiliteDepasse(`délai de stabilité dépassé (${delaiMaxMs} ms)`);
    return t;
  };
  const cibles = (g: number): { cible: CibleCopie; libelle: string; structure: ReturnType<typeof ciblesCopie>[number]["structure"] }[] => {
    const toutes = ciblesCopie(session, g);
    const identique = toutes.at(-1)!;
    const provenance = toutes.length > 1 ? toutes[0] : null;
    return [
      { cible: "identique", libelle: identique.libelle, structure: identique.structure },
      ...(provenance ? [{ cible: "provenance" as const, libelle: provenance.libelle, structure: provenance.structure }] : []),
    ];
  };

  const avecReglages = (f: (r: ReturnType<Essai["etat"]>["reglages"]) => ReturnType<Essai["etat"]>["reglages"]) =>
    essai.changer(f(essai.etat().reglages));

  return {
    essai,
    stable,
    attendreStable,
    delaisDepasses: () => depassements,
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
    saisiesDistantes: () => essai.simulateur().ecritures(),
    async ecrituresEnSerie(nombre, g = 0) {
      const plan = session.plans[g];
      const P = session.sources.participants.size;
      const tirage = flux(1, "ecritures-en-serie", 0);
      const dureesMs: number[] = [];
      const t0 = performance.now();
      for (let i = 0; i < nombre; i++) {
        const p = tirage.entier(P);
        const d = tirage.entier(plan.D);
        const debut = performance.now();
        ecrireCase(session.sources, g, p, d, valeurAuHasard(plan, d, tirage));
        dureesMs.push(performance.now() - debut);
        // Une écriture par tâche : successives, sans bloquer le thread principal d'un bloc.
        await delai(0);
      }
      await attendreStable();
      return { dureesMs, totalMs: performance.now() - t0 };
    },
    ciblesCopie: (g) => cibles(g).map((c) => c.cible),
    async copier(g, cible = "identique") {
      const c = cibles(g).find((x) => x.cible === cible);
      if (!c) throw new Error(`pas de cible de copie « ${cible} » pour la grille ${g}`);
      const avant = session.sources.cases.size;
      const t0 = performance.now();
      const { g: grille } = copierGrille(session, g, c.structure);
      const principalMs = performance.now() - t0;
      await attendreStable();
      return { grille, cible: c.libelle, cases: session.sources.cases.size - avant, principalMs, totalMs: performance.now() - t0 };
    },
    async basculerModele() {
      const t0 = performance.now();
      avecReglages((r) => ({ ...r, modele: { ...r.modele, h4Strict: !r.modele.h4Strict } }));
      const principalMs = performance.now() - t0;
      await attendreStable();
      return { principalMs, totalMs: performance.now() - t0 };
    },
    stats: () => ({ ...statsInstanciation }),
    profil: () => decrireProfil(session),
  };
}

/** Expose le pilote et marque « première table peinte » (phase du démarrage). */
export function installerPilote(essai: Essai): void {
  const pilote = creerPilote(essai);
  (window as unknown as { __azimut: Pilote }).__azimut = pilote;
  setTimeout(() => void pilote.stable().then(() => performance.mark("demarrage:table-peinte")), 0);
}
