import { useState } from "react";
import { creerSession } from "../session";
import { StoreContext } from "../store/hooks";
import { Erreurs } from "./Erreurs";
import { Table } from "./Table";
import { useLiveParticipants } from "./useParticipants";

export function App() {
  const [session] = useState(creerSession);
  const [filtre, setFiltre] = useState("");
  const [g, setG] = useState(0);
  const [selection, setSelection] = useState(0);
  const participants = useLiveParticipants(session.sources);
  const choisi = participants.find((pt) => pt.p === selection) ?? participants[0];
  const plan = session.plans[g];
  const [axeChoisi, setAxe] = useState(plan.axePrincipal);
  const axe = axeChoisi < plan.grille.axes.length ? axeChoisi : plan.axePrincipal;
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
        · {decisif}
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
        </span>
      </header>
      <div className="principal">
        <Table
          key={`${g}-${axe}`}
          g={g}
          plan={plan}
          axe={axe}
          sources={session.sources}
          filtre={filtre}
          selection={choisi?.p ?? -1}
          onSelection={setSelection}
        />
        {choisi && <Erreurs g={g} p={choisi.p} nom={choisi.nom} plan={plan} />}
      </div>
    </StoreContext.Provider>
  );
}
