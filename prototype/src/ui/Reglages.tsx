// Panneau de réglages : modèle, comparaison et session à chaud (URL réécrite par
// history.replaceState) ; store et générateur au rechargement, après
// confirmation si des saisies existent. Rapport du mode « vérification ».

import { useState } from "react";
import type { Essai, EtatEssai } from "../essai";
import type { CommutateursResolus } from "../noyau/compile";
import {
  CHOIX_GENERATEUR,
  CHOIX_STORE,
  ecrireUrl,
  indexValeur,
  PARAMS_MODELE,
  PARTICIPANTS_PAR_DEFAUT,
  type Reglages as ReglagesEssai,
} from "../reglages";

/** Applique des réglages : à chaud, ou rechargement de la page avec la nouvelle URL. */
export function appliquerReglages(essai: Essai, r: ReglagesEssai): void {
  const res = essai.changer(r);
  if (!res.rechargement) {
    history.replaceState(null, "", res.url);
    return;
  }
  const ok =
    !essai.aDesSaisies() ||
    confirm("Ce réglage recharge la page : les saisies de l'essai seront perdues (rien n'est persisté). Continuer ?");
  if (ok) location.assign(res.url);
}

function Commutateurs({
  valeur,
  onChange,
  prefixe,
  desactive = false,
}: {
  valeur: CommutateursResolus;
  onChange: (c: CommutateursResolus) => void;
  prefixe: string;
  desactive?: boolean;
}) {
  return (
    <div className="grille-reglages">
      {PARAMS_MODELE.map((p) => (
        <label key={p.param}>
          <span>{p.libelle}</span>
          <select
            data-reglage={prefixe + p.param}
            disabled={desactive}
            value={indexValeur(p, valeur)}
            onChange={(e) => onChange({ ...valeur, ...p.valeurs[Number(e.target.value)].lire })}
          >
            {p.valeurs.map((v, i) => (
              <option key={v.url} value={i}>
                {v.libelle}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

function Choix<T extends string>({ nom, valeur, choix, onChange }: { nom: string; valeur: T; choix: readonly T[]; onChange: (v: T) => void }) {
  return (
    <label>
      <span>{nom}</span>
      <select data-reglage={nom} value={valeur} onChange={(e) => onChange(e.target.value as T)}>
        {choix.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}

function Entier({ nom, valeur, min, onChange }: { nom: string; valeur: number; min: number; onChange: (v: number) => void }) {
  return (
    <label>
      <span>{nom}</span>
      <input
        type="number"
        data-reglage={nom}
        min={min}
        value={valeur}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isInteger(v) && v >= min) onChange(v);
        }}
      />
    </label>
  );
}

export function Reglages({ essai, etat }: { essai: Essai; etat: EtatEssai }) {
  const r = etat.reglages;
  // Store et générateur : brouillon, appliqué d'un coup par rechargement.
  const [brouillon, setBrouillon] = useState({ store: r.store, generateur: r.generateur });
  const modifie = JSON.stringify(brouillon) !== JSON.stringify({ store: r.store, generateur: r.generateur });
  const appliquer = (n: ReglagesEssai) => appliquerReglages(essai, n);
  const v = etat.verification;
  const lien = `${location.origin}${location.pathname}${ecrireUrl(r)}`;

  return (
    <section className="reglages" data-testid="reglages">
      <fieldset>
        <legend>Modèle (à chaud : recompilation, sources conservées)</legend>
        <Commutateurs prefixe="" valeur={r.modele} onChange={(modele) => appliquer({ ...r, modele })} />
      </fieldset>

      <fieldset>
        <legend>Comparaison avec une configuration B</legend>
        {!essai.comparaisonDisponible() && <p className="aide">Réservée au jeu « corpus ».</p>}
        <label>
          <input
            type="checkbox"
            data-reglage="cmp"
            disabled={!essai.comparaisonDisponible()}
            checked={r.comparaison !== null}
            onChange={(e) => appliquer({ ...r, comparaison: e.target.checked ? r.modele : null })}
          />{" "}
          comparer le participant affiché avec B (« A → B » dans la table, le graphe et l'explication)
        </label>
        {r.comparaison && (
          <Commutateurs prefixe="b." valeur={r.comparaison} onChange={(comparaison) => appliquer({ ...r, comparaison })} />
        )}
      </fieldset>

      <fieldset>
        <legend>Session (à chaud)</legend>
        <label>
          <input
            type="checkbox"
            data-reglage="verif"
            checked={r.session.verification}
            onChange={(e) => appliquer({ ...r, session: { ...r.session, verification: e.target.checked } })}
          />{" "}
          mode « vérification » (oracle après chaque saisie)
        </label>
        <label>
          <input
            type="checkbox"
            data-reglage="simu"
            checked={r.session.simulateur}
            onChange={(e) => appliquer({ ...r, session: { ...r.session, simulateur: e.target.checked } })}
          />{" "}
          simulateur de saisies distantes <span className="aide">(5 formateurs, une case toutes les 2 s chacun)</span>
        </label>
        <p className="aide" data-testid="saisies-distantes">
          {etat.saisiesDistantes} saisie(s) distante(s) depuis le chargement{essai.simulateur().actif() ? " · en cours" : ""}
        </p>
      </fieldset>

      <fieldset>
        <legend>Store et générateur (au rechargement)</legend>
        <p className="aide">
          Base : signaux, worker, paresseux, saisie distante marquée périmée ; on fait varier un axe à la fois. Le précalcul de la cohorte
          n'existe que dans le worker (ignoré avec lieu « principal »).
        </p>
        <div className="grille-reglages">
          {(Object.keys(CHOIX_STORE) as (keyof typeof CHOIX_STORE)[]).map((k) => (
            <Choix
              key={k}
              nom={k}
              valeur={brouillon.store[k]}
              choix={CHOIX_STORE[k]}
              onChange={(x) => setBrouillon({ ...brouillon, store: { ...brouillon.store, [k]: x } })}
            />
          ))}
          <Entier nom="lru" min={1} valeur={brouillon.store.lru} onChange={(lru) => setBrouillon({ ...brouillon, store: { ...brouillon.store, lru } })} />
          <Choix
            nom="jeu"
            valeur={brouillon.generateur.jeu}
            choix={CHOIX_GENERATEUR.jeu}
            onChange={(jeu) =>
              setBrouillon({ ...brouillon, generateur: { ...brouillon.generateur, jeu, participants: PARTICIPANTS_PAR_DEFAUT[jeu] } })
            }
          />
          <Choix
            nom="remplissage"
            valeur={brouillon.generateur.remplissage}
            choix={CHOIX_GENERATEUR.remplissage}
            onChange={(remplissage) => setBrouillon({ ...brouillon, generateur: { ...brouillon.generateur, remplissage } })}
          />
          <Entier
            nom="graine"
            min={0}
            valeur={brouillon.generateur.graine}
            onChange={(graine) => setBrouillon({ ...brouillon, generateur: { ...brouillon.generateur, graine } })}
          />
          <Entier
            nom="participants"
            min={0}
            valeur={brouillon.generateur.participants}
            onChange={(participants) => setBrouillon({ ...brouillon, generateur: { ...brouillon.generateur, participants } })}
          />
        </div>
        <button type="button" data-action="recharger" disabled={!modifie} onClick={() => appliquer({ ...r, ...brouillon })}>
          recharger avec ces réglages
        </button>
      </fieldset>

      <p className="lien">
        Lien de l'essai : <input readOnly value={lien} data-testid="lien" onFocus={(e) => e.target.select()} />
      </p>
      {etat.avertissements.length > 0 && (
        <ul className="avertissements" data-testid="avertissements-url">
          {etat.avertissements.map((a, i) => (
            <li key={i}>URL : {a}</li>
          ))}
        </ul>
      )}
      {v && v.ecarts.length > 0 && (
        <div className="verification-ecarts" data-testid="verification-ecarts">
          <strong>Vérification n° {v.numero} : {v.ecarts.length} écart(s) entre le store et l'oracle</strong>
          <ul>
            {v.ecarts.slice(0, 30).map((e, i) => (
              <li key={i}>
                {essai.session.plans[e.g]?.grille.grille} · {essai.session.sources.participants.get(e.p)?.nom ?? `p${e.p}`} · {e.id} ·{" "}
                {e.champ} : oracle {String(e.oracle)}, store {String(e.store)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Pastille d'état du mode « vérification », dans l'en-tête. */
export function PastilleVerification({ etat }: { etat: EtatEssai }) {
  if (!etat.reglages.session.verification) return <span className="verif off" data-testid="verification">vérif. désactivée</span>;
  const v = etat.verification;
  if (!v) return <span className="verif" data-testid="verification">vérif. …</span>;
  const ok = v.ecarts.length === 0;
  const enAttente = ok && v.enCalcul > 0;
  return (
    <span
      className={`verif ${enAttente ? "" : ok ? "ok" : "ko"}`}
      data-testid="verification"
      data-ecarts={v.ecarts.length}
      title={`Vérification n° ${v.numero} : ${v.comparees} cellules comparées à l'oracle en ${v.dureeMs.toFixed(1)} ms${v.enCalcul ? `, ${v.enCalcul} en calcul` : ""}`}
    >
      {!ok ? `vérif. ⚠ ${v.ecarts.length} écart(s)` : enAttente ? `vérif. … ${v.enCalcul} en calcul` : "vérif. ✓"}
    </span>
  );
}
