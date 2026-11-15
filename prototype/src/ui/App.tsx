import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { creerEssai } from "../essai";
import type { Grille } from "../noyau/format";
import { ecrireUrl } from "../reglages";
import { installerPilote } from "../mesure/pilote";
import { fabriquePourReglages } from "../store/fabriques";
import { StoreContext } from "../store/hooks";
import { PastilleWorker } from "./PastilleWorker";
import { Copie } from "./Copie";
import { Erreurs } from "./Erreurs";
import { Explication } from "./Explication";
import { Graphe } from "./Graphe";
import { Jokers } from "./Jokers";
import { PastilleVerification, Reglages } from "./Reglages";
import { Table } from "./Table";
import { useComparaison } from "./useComparaison";
import { useLiveParticipants } from "./useParticipants";

/** Télécharge la structure (par ex. G3 étendue, en mémoire) pour l'inspecter. */
function exporterStructure(grille: Grille) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(grille, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${grille.grille.replace(/[^\p{L}\p{N}]+/gu, "-")}-structure.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function App() {
  // Les paramètres d'URL font foi au chargement ; l'URL est aussitôt réécrite
  // complète, pour qu'un lien copié reproduise toute la configuration.
  const [essai] = useState(() => {
    const e = creerEssai(location.search, { fabrique: fabriquePourReglages });
    installerPilote(e);
    return e;
  });
  const etat = useSyncExternalStore(essai.abonner, essai.etat);
  useEffect(() => history.replaceState(null, "", ecrireUrl(essai.etat().reglages)), [essai]);
  const session = essai.session;
  const [reglagesOuverts, setReglagesOuverts] = useState(false);
  const [filtre, setFiltre] = useState("");
  const [g, setG] = useState(0);
  const [selection, setSelection] = useState(0);
  /** Nœud expliqué (index n de la grille g), -1 = aucun. */
  const [noeud, setNoeud] = useState(-1);
  const [vue, setVue] = useState<"table" | "graphe">("table");
  const choisir = useCallback((p: number, n: number) => {
    setSelection(p);
    setNoeud(n);
  }, []);
  const participants = useLiveParticipants(session.sources);
  const choisi = participants.find((pt) => pt.p === selection) ?? participants[0];
  const plan = session.plans[g];
  const [axeChoisi, setAxe] = useState(plan.axePrincipal);
  const axe = axeChoisi < plan.grille.axes.length ? axeChoisi : plan.axePrincipal;
  const ecarts = useComparaison(essai, etat, g, choisi?.p ?? -1);
  const decisif = plan.decisif < 0 ? "aucun nœud décisif" : `décisif ${plan.ids[plan.decisif]}`;
  return (
    <StoreContext.Provider value={session.store}>
      <header>
        <strong>Azimut — prototype</strong> ·{" "}
        <label>
          grille{" "}
          <select
            value={g}
            onChange={(e) => {
              const nouvelle = Number(e.target.value);
              setG(nouvelle);
              setAxe(session.plans[nouvelle].axePrincipal);
              setNoeud(-1);
            }}
            data-testid="grille"
          >
            {session.plans.map((p, i) => (
              <option key={i} value={i}>
                {p.grille.grille}
              </option>
            ))}
          </select>
        </label>{" "}
        ·{" "}
        <label>
          axe{" "}
          <select value={axe} onChange={(e) => setAxe(Number(e.target.value))} data-testid="axe">
            {plan.grille.axes.map((a, i) => (
              <option key={a.id} value={i}>
                {a.libelle}
                {a.principal ? " (principal)" : ""}
              </option>
            ))}
          </select>
        </label>{" "}
        · {decisif} ·{" "}
        <button type="button" data-action="vue" onClick={() => setVue(vue === "table" ? "graphe" : "table")}>
          {vue === "table" ? "graphe du participant" : "retour à la table"}
        </button>
        <button type="button" data-action="exporter" title="Structure de la grille affichée, en JSON (pour l'inspecter)" onClick={() => exporterStructure(plan.grille)}>
          exporter JSON
        </button>
        <span className="jeu" data-testid="jeu" data-somme={session.sommeControle} title={`Somme de contrôle des sources au chargement : ${session.sommeControle}`}>
          jeu {session.jeu}
        </span>
        <button type="button" data-action="reglages" onClick={() => setReglagesOuverts(!reglagesOuverts)}>
          réglages
        </button>
        <PastilleVerification etat={etat} />
        <PastilleWorker store={session.store} />
        <span className="config-store" data-testid="config-store" title="Configuration du store (au rechargement)">
          · store {etat.reglages.store.calcul}/{etat.reglages.store.lieu}/{etat.reglages.store.cohorte}/{etat.reglages.store.distante}
        </span>
        {etat.reglages.session.simulateur && (
          <span className="simulateur" data-testid="simulateur" title="Simulateur de saisies distantes actif">
            · ⇄ {etat.saisiesDistantes} saisie(s) distante(s)
          </span>
        )}
        {etat.reglages.comparaison && (
          <span className="comparaison-active" data-testid="comparaison-active" title="Comparaison avec la configuration B active">
            A → B{ecarts ? ` : ${ecarts.size} nœud(s) diffèrent` : ""}
          </span>
        )}
        <label>
          {" "}
          · colonnes contenant <input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder="ex. C/3" />
        </label>
        <span className="legende">
          <span className="cellule-vide">vide</span> <span className="cellule-note">note</span>{" "}
          <span className="cellule-non-evaluee">non évalué</span>
          <span className="sans-resultat">— sans résultat</span>
          <span title="clic droit sur une case, un calcul ou un regroupement">clic droit : non évalué / dispense</span>
          <span title="données provisoires : exigences de remplissage insatisfaites">⚠ provisoire</span>
          <span title="placé ici sans y compter">↗ placé sans compter</span>
          <span title="contribue à plusieurs exigences">◆ plusieurs exigences</span>
          <span title="influence plusieurs fois un même résultat">⇉ influence multiple</span>
          <span className="joker-applique" title="joker appliqué sur ce nœud">★ joker appliqué</span>
          <span className="joker-influence" title="résultat influencé par un joker en amont">☆ influencé</span>
        </span>
      </header>
      {reglagesOuverts && <Reglages essai={essai} etat={etat} />}
      <div className="principal">
        {vue === "table" || !choisi ? (
          <Table
            key={`${g}-${axe}`}
            g={g}
            plan={plan}
            axe={axe}
            sources={session.sources}
            filtre={filtre}
            selection={choisi?.p ?? -1}
            onSelection={setSelection}
            noeud={noeud}
            onChoisir={choisir}
            ecarts={ecarts}
          />
        ) : (
          <Graphe g={g} p={choisi.p} nom={choisi.nom} plan={plan} n={noeud} onChoisir={setNoeud} ecarts={ecarts} />
        )}
        {choisi && (
          <aside className="erreurs">
            <Explication g={g} p={choisi.p} n={noeud} plan={plan} onGraphe={() => setVue("graphe")} ecarts={ecarts} />
            <Erreurs g={g} p={choisi.p} nom={choisi.nom} plan={plan} />
            <Jokers key={`${g}-${choisi.p}`} g={g} p={choisi.p} plan={plan} sources={session.sources} />
            <Copie
              session={session}
              g={g}
              onCopie={(nouvelle) => {
                setG(nouvelle);
                setAxe(session.plans[nouvelle].axePrincipal);
                setNoeud(-1);
              }}
            />
          </aside>
        )}
      </div>
    </StoreContext.Provider>
  );
}
