import { useState } from "react";
import { creerSession } from "../session";
import { StoreContext } from "../store/hooks";
import { Table } from "./Table";

export function App() {
  const [session] = useState(creerSession);
  const [filtre, setFiltre] = useState("");
  const g = 0;
  const plan = session.plans[g];
  return (
    <StoreContext.Provider value={session.store}>
      <header>
        <strong>Azimut — prototype</strong> · grille {plan.grille.grille} · axe{" "}
        {plan.grille.axes[plan.axePrincipal].libelle}
        <label>
          {" "}
          · colonnes contenant <input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder="ex. C/3" />
        </label>
        <span className="legende">
          <span className="cellule-vide">vide</span> <span className="cellule-note">note</span>{" "}
          <span className="sans-resultat">— sans résultat</span>
        </span>
      </header>
      <Table g={g} plan={plan} sources={session.sources} filtre={filtre} />
    </StoreContext.Provider>
  );
}
