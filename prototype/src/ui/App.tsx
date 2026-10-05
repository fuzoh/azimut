import { useState } from "react";
import { creerSession } from "../session";
import { StoreContext } from "../store/hooks";
import { Table } from "./Table";

export function App() {
  const [session] = useState(creerSession);
  const [filtre, setFiltre] = useState("");
  const [g, setG] = useState(0);
  const plan = session.plans[g];
  const decisif = plan.decisif < 0 ? "aucun nœud décisif" : `décisif ${plan.ids[plan.decisif]}`;
  return (
    <StoreContext.Provider value={session.store}>
      <header>
        <strong>Azimut — prototype</strong> ·{" "}
        <label>
          grille{" "}
          <select value={g} onChange={(e) => setG(Number(e.target.value))} data-testid="grille">
            {session.plans.map((p, i) => (
              <option key={i} value={i}>
                {p.grille.grille}
              </option>
            ))}
          </select>
        </label>{" "}
        · axe {plan.grille.axes[plan.axePrincipal].libelle} · {decisif}
        <label>
          {" "}
          · colonnes contenant <input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder="ex. C/3" />
        </label>
        <span className="legende">
          <span className="cellule-vide">vide</span> <span className="cellule-note">note</span>{" "}
          <span className="sans-resultat">— sans résultat</span>
        </span>
      </header>
      <Table key={g} g={g} plan={plan} sources={session.sources} filtre={filtre} />
    </StoreContext.Provider>
  );
}
