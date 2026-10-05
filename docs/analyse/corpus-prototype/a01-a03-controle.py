"""Contrôle des résultats attendus de A01 (qualif1) et A03 (qualif3).

Évalue `a01-structure.json` et `a03-structure.json` pour les participants types
décrits dans `a01-qualif1.md` et `a03-qualif3.md`, selon deux sémantiques :

- **18** : le modèle de 18 et du grill barèmes (vide exclu, sans résultat ignoré) ;
- **Excel** : les formules d'origine, pour lister les écarts (vide = 0 dans
  qualif1 ; indicateur omis, joker manuel et dossier vide « Réussi » dans qualif3).

Ce n'est pas le moteur du prototype : c'est une seconde source pour ses tests.

    uv run docs/analyse/corpus-prototype/a01-a03-controle.py
    uv run docs/analyse/corpus-prototype/a01-a03-controle.py --figer

`--figer` écrit aussi `a03-participants.json` : sources des participants types,
dans la forme des collections du prototype (nœuds désignés par leur id, case
ordinale en rang du palier, à partir de 0), et résultats attendus de tous les
nœuds de calcul (`null` : sans résultat) ; pour Basile, aussi sans arrondi propagé.
"""

import json
import sys
from decimal import ROUND_HALF_UP, Decimal
from itertools import pairwise
from pathlib import Path

ICI = Path(__file__).parent
D = Decimal


# --- Évaluation ----------------------------------------------------------------


def convertir(v, table):
    """Table affine par morceaux [[x, y], ...], bornée aux deux extrémités."""
    if v <= D(table[0][0]):
        return D(table[0][1])
    for (x0, y0), (x1, y1) in pairwise(table):
        if v <= x1:
            return D(y0) + (v - D(x0)) * (D(y1) - D(y0)) / (D(x1) - D(x0))
    return D(table[-1][1])


def evaluer(grille, cases, excel=False, jokers=(), arrondi=True, h4_strict=False):
    """Valeurs de tous les nœuds pour un participant. None = sans résultat."""
    noeuds = {n["id"]: n for n in grille["noeuds"]}
    omis = (
        {i for e in grille.get("ecarts_excel", []) for i in e["indicateurs_omis"]}
        if excel
        else set()
    )
    joker = {
        j: next(
            a["action"]["valeur"]
            for a in grille["jokers"]["autorises"]
            if a["noeud"] == j
        )
        for j in jokers
    }
    memo = {}

    def val(i):
        if i in memo:
            return memo[i]
        n = noeuds[i]
        if n["type"] == "regroupement":
            r = None
        elif n["type"] == "donnees":
            v = cases.get(i)
            r = (
                D(str(v))
                if v is not None
                else (D(0) if excel and grille["grille"] == "A01" else None)
            )
        else:
            entrees = [
                (val(e["noeud"]), D(e["poids"]))
                for e in n["entrees"]
                if e["noeud"] not in omis
            ]
            actives = [(v, w) for v, w in entrees if v is not None and w > 0]
            f = n["fonction"]
            if f == "F1":
                r = (
                    sum(v * w for v, w in actives) / sum(w for _, w in actives)
                    if actives
                    else None
                )
            elif f == "F2":
                v = entrees[0][0]
                # Excel : un texte vide est jugé supérieur à 0,8, donc « Réussi ».
                r = (
                    (D(1) if excel else None)
                    if v is None
                    else D(int(v >= n["params"]["seuil"]))
                )
            elif f == "F3":
                if h4_strict and any(v is None for v, _ in entrees):
                    r = None
                else:
                    r = D(int(all(v == 1 for v, _ in actives))) if actives else None
            if r is not None and "conversion" in n:
                r = convertir(r, n["conversion"])
            if r is not None and arrondi and "arrondi" in n:
                r = r.quantize(D(n["arrondi"]), rounding=ROUND_HALF_UP)
            if r is not None and i in joker:
                r = min(r + joker[i], D(150))
        memo[i] = r
        return r

    for i in noeuds:
        val(i)
    return memo


def erreurs(grille, cases):
    """Exigences de remplissage non satisfaites.

    Lit le format commun (`obligatoire` sur le nœud, `minimumParRegroupement`)
    et l'ancien format de A01 (`obligatoires`, `minimum_par_regroupement`).
    """
    noeuds = {n["id"]: n for n in grille["noeuds"]}
    ex = grille["exigences"]
    err = []
    if ex.get("obligatoires"):
        err += [
            n["id"]
            for n in grille["noeuds"]
            if n["type"] == "donnees" and cases.get(n["id"]) is None
        ]
    err += [
        n["id"]
        for n in grille["noeuds"]
        if n.get("obligatoire") and cases.get(n["id"]) is None
    ]
    minimums = [
        (m["regroupement"], m["min_actives"])
        for m in ex.get("minimum_par_regroupement", [])
    ] + [(m["noeud"], m["minActives"]) for m in ex.get("minimumParRegroupement", [])]
    for rid, mini in minimums:
        actives = sum(cases.get(e["noeud"]) is not None for e in noeuds[rid]["entrees"])
        if actives < mini:
            err.append(rid)
    return err


# --- Affichage -----------------------------------------------------------------


def pct01(v):
    return "—" if v is None else f"{v * 100:.1f} %".replace(".", ",")


def pct(v):
    return "—" if v is None else f"{v:.0f} %"


def note(v):
    return "—" if v is None else f"{v:.2f}".replace(".", ",")


def okko(v):
    return "—" if v is None else ("OK" if v == 1 else "KO")


def table(titre, colonnes, lignes):
    print(f"\n### {titre}\n")
    print("| " + " | ".join(colonnes) + " |")
    print("| " + " | ".join("---" for _ in colonnes) + " |")
    for ligne in lignes:
        print("| " + " | ".join(ligne) + " |")


def donnees(grille, prefixe=""):
    return [
        n["id"]
        for n in grille["noeuds"]
        if n["type"] == "donnees" and n["id"].startswith(prefixe)
    ]


def remplir(grille, cases, prefixe, v):
    for i in donnees(grille, prefixe):
        cases[i] = v
    return cases


# --- A01 -----------------------------------------------------------------------


def participants_a01(g):
    ana = remplir(g, {}, "ind:", 1)

    ben = remplir(g, {}, "ind:", 1)
    ben["ind:pdc-filme/2.6.4/2"] = None  # vide : exclu en 18, 0 dans l'Excel
    ben["ind:pdc-filme/2.6.5/1"] = 0  # non-rendu saisi à la main
    ben["ind:pdc-filme/2.6.5/2"] = 0.5

    cleo = remplir(g, {}, "ind:", 1)
    remplir(g, cleo, "ind:planif-ozr/4.1", 0.5)
    remplir(g, cleo, "ind:programme/4.1.2", 0.5)
    remplir(g, cleo, "ind:systeme/4.1", None)
    remplir(
        g, cleo, "ind:construction/1.7", 0
    )  # 3 critères, 11 indicateurs : poids de la taille dans T2

    dan = remplir(g, {}, "ind:construction", 0.5)
    return {"Ana": ana, "Ben": ben, "Cléo": cleo, "Dan": dan}


def controle_a01():
    g = json.loads((ICI / "a01-structure.json").read_text())
    print("## A01 (qualif1)")
    ex = [n["id"] for n in g["noeuds"] if n["id"].startswith("ex:")]
    th = [n["id"] for n in g["noeuds"] if n["id"].startswith("theme:")]
    tr = ["transv:4.1", "transv:2.1"]
    noms = {
        "ex:construction": "Constr.",
        "ex:programme": "Progr.",
        "ex:pdc-filme": "PdC filmé",
        "ex:planif-ozr": "Planif",
        "ex:anim-ozr": "Anim",
        "ex:entretien": "Entretien",
        "ex:systeme": "Système",
        "theme:T1": "T1",
        "theme:T2": "T2",
        "theme:T3": "T3",
        "theme:T4": "T4",
        "transv:4.1": "4.1",
        "transv:2.1": "2.1",
    }
    cols = ex + th + tr
    for sem, excel in (("18", False), ("Excel", True)):
        lignes = []
        for nom, cases in participants_a01(g).items():
            v = evaluer(g, cases, excel=excel)
            err = erreurs(g, cases)
            lignes.append(
                [nom]
                + [pct01(v[c]) for c in cols]
                + ([str(len(err))] if not excel else [])
            )
        table(
            f"Résultats, sémantique {sem}",
            ["Participant"]
            + [noms[c] for c in cols]
            + (["Obligatoires vides"] if not excel else []),
            lignes,
        )
    p = participants_a01(g)
    v = evaluer(g, p["Ben"])
    ve = evaluer(g, p["Ben"], excel=True)
    table(
        "Ben, détail de PdC filmé",
        ["Nœud", "18", "Excel"],
        [
            [i, pct01(v[i]), pct01(ve[i])]
            for i in (
                "crit:pdc-filme/2.6.4",
                "crit:pdc-filme/2.6.5",
                "ex:pdc-filme",
                "theme:T2",
                "theme:T3",
            )
        ],
    )
    v = evaluer(g, p["Cléo"])
    ve = evaluer(g, p["Cléo"], excel=True)
    occ = [
        e["noeud"]
        for e in next(n for n in g["noeuds"] if n["id"] == "transv:4.1")["entrees"]
    ]
    table(
        "Cléo, objectif 4.1",
        ["Nœud", "18", "Excel"],
        [[i, pct01(v[i]), pct01(ve[i])] for i in occ + ["transv:4.1", "ex:planif-ozr"]],
    )
    crits_t2 = [
        c["noeud"]
        for c in next(a for a in g["axes"] if a["id"] == "themes")["arbre"][1][
            "enfants"
        ]
    ]
    moy = sum(v[c] for c in crits_t2) / len(crits_t2)
    print(
        f"\nCléo, T2 : rapport de sommes {pct01(v['theme:T2'])}, "
        f"moyenne simple des {len(crits_t2)} critères {pct01(moy)}."
    )


# --- A03 -----------------------------------------------------------------------


def participants_a03(g):
    alix = remplir(g, {}, "ind:A", 4)
    remplir(g, alix, "ind:B", 3)
    remplir(g, alix, "ind:C", 3)
    alix["ind:C/3.4/9"] = 5  # indicateur omis par C - Scoutisme!I56
    remplir(g, alix, "pos:", 4)  # Posture : sans effet sur le calcul

    basile = remplir(g, {}, "ind:A", 2.6)
    basile["ind:A/2.1/4"] = 2.2  # sphère A brute 2,595, soit 79,75 %
    remplir(g, basile, "ind:B", 4)
    remplir(g, basile, "ind:C", 4)

    capucine = remplir(g, {}, "ind:A", 4)
    remplir(g, capucine, "ind:B", 4)
    remplir(g, capucine, "ind:C/1", 3)
    remplir(g, capucine, "ind:C/2", 2)
    remplir(g, capucine, "ind:C/3", 2)

    dorian = remplir(g, {}, "ind:A", 4)
    remplir(g, dorian, "ind:C", 4)
    for o, v in (("1", 5), ("2", 5), ("3", 1), ("4", 1), ("5", 3)):
        remplir(g, dorian, f"ind:B/{o}.", v)

    fanny = {"ind:A/1.1/1": 3, "ind:B/1.1/1": 3}  # sphère C vide
    return {
        "Alix": (alix, ()),
        "Basile": (basile, ()),
        "Capucine": (capucine, ("sph:C",)),
        "Dorian": (dorian, ()),
        "Élodie": ({}, ()),
        "Fanny": (fanny, ()),
    }


def controle_a03():
    g = json.loads((ICI / "a03-structure.json").read_text())
    print("\n## A03 (qualif3)")
    lignes = []
    for nom, (cases, jokers) in participants_a03(g).items():
        v = evaluer(g, cases, jokers=jokers)
        ve = evaluer(g, cases, excel=True)
        lignes.append(
            [nom]
            + [pct(v[f"sph:{s}"]) for s in "ABC"]
            + [okko(v[f"seuil:{s}"]) for s in "ABC"]
            + [okko(v["reussite"]), str(len(erreurs(g, cases)))]
            + [" / ".join(pct(ve[f"sph:{s}"]) for s in "ABC"), okko(ve["reussite"])]
        )
    table(
        "Résultats",
        [
            "Participant",
            "Sph. A",
            "Sph. B",
            "Sph. C",
            "A ≥ 80",
            "B ≥ 80",
            "C ≥ 80",
            "Réussite",
            "Critères sans note",
            "Excel A / B / C",
            "Excel réussite",
        ],
        lignes,
    )

    p = participants_a03(g)
    v, ve = evaluer(g, p["Alix"][0]), evaluer(g, p["Alix"][0], excel=True)
    table(
        "Alix, critère C 3.4 (indicateur omis par l'Excel)",
        ["Nœud", "18", "Excel"],
        [[i, note(v[i]), note(ve[i])] for i in ("crit:C/3.4", "obj:C/3")]
        + [[i, pct(v[i]), pct(ve[i])] for i in ("obj-pct:C/3", "sph:C")],
    )

    cases = p["Basile"][0]
    v, vs = evaluer(g, cases), evaluer(g, cases, arrondi=False)
    table(
        "Basile, arrondi propagé sur la sphère A",
        ["", "Avec arrondi (défaut)", "Sans arrondi"],
        [
            ["Objectif A2", note(v["obj:A/2"]), note(vs["obj:A/2"])],
            ["Sphère A", pct(v["sph:A"]), f"{vs['sph:A']:.2f} %".replace(".", ",")],
            ["A ≥ 80", okko(v["seuil:A"]), okko(vs["seuil:A"])],
            ["Réussite", okko(v["reussite"]), okko(vs["reussite"])],
        ],
    )

    cases, jok = p["Capucine"]
    v, vs = evaluer(g, cases, jokers=jok), evaluer(g, cases)
    table(
        "Capucine, joker sur la sphère C",
        ["", "Avec joker", "Sans joker"],
        [
            ["Sphère C", pct(v["sph:C"]), pct(vs["sph:C"])],
            ["C ≥ 80", okko(v["seuil:C"]), okko(vs["seuil:C"])],
            ["Réussite", okko(v["reussite"]), okko(vs["reussite"])],
        ],
    )

    cases = p["Dorian"][0]
    v = evaluer(g, cases)
    sph_b = next(n for n in g["noeuds"] if n["id"] == "sph:B")["entrees"]
    moy_pct = sum(
        v[f"obj-pct:B/{e['noeud'].split('/')[1]}"] * e["poids"] for e in sph_b
    ) / sum(e["poids"] for e in sph_b)
    table(
        "Dorian, ordre conversion et moyenne (T6)",
        ["Objectif B", "Poids", "Brut", "En %"],
        [
            [
                e["noeud"],
                str(e["poids"]),
                note(v[e["noeud"]]),
                pct(v[f"obj-pct:B/{e['noeud'].split('/')[1]}"]),
            ]
            for e in sph_b
        ]
        + [
            ["Sphère B (moyenne puis conversion)", "", "", pct(v["sph:B"])],
            [
                "Moyenne pondérée des %, pour comparaison",
                "",
                "",
                f"{moy_pct:.1f} %".replace(".", ","),
            ],
        ],
    )

    for nom in ("Élodie", "Fanny"):
        cases = p[nom][0]
        v, vh = evaluer(g, cases), evaluer(g, cases, h4_strict=True)
        print(
            f"\n{nom} : Réussite {okko(v['reussite'])} (H4 strict : {okko(vh['reussite'])}), "
            f"{len(erreurs(g, cases))} critères sans note active."
        )


# --- Participants figés ----------------------------------------------------------


def en_nombre(v):
    return None if v is None else float(v)


def figer_a03():
    """Écrit `a03-participants.json`, seconde source des tests du prototype."""
    g = json.loads((ICI / "a03-structure.json").read_text())
    noeuds = {n["id"]: n for n in g["noeuds"]}
    baremes = {b["id"]: b for b in g["baremes"]}
    jokers = {a["noeud"]: a["id"] for a in g["jokers"]["autorises"]}

    def stocke(i, v):
        b = baremes[noeuds[i]["bareme"]]
        if b["type"] == "ordinal":
            return [p["valeur"] for p in b["paliers"]].index(v)
        return v

    participants = []
    for nom, (cases, jok) in participants_a03(g).items():
        v = evaluer(g, cases, jokers=jok)
        participants.append(
            {
                "nom": nom,
                "sources": {
                    "cases": [
                        {"noeud": i, "valeur": stocke(i, x)}
                        for i, x in cases.items()
                        if x is not None
                    ],
                    "nonEvaluations": [],
                    "jokers": [
                        {
                            "jokerDef": jokers[n],
                            "justification": "Participant type",
                            "auteur": "corpus",
                            "date": "2026-10-05",
                        }
                        for n in jok
                    ],
                },
                "attendus": {
                    i: en_nombre(v[i]) for i, n in noeuds.items() if n["type"] == "calcul"
                },
                "erreursRemplissage": erreurs(g, cases),
            }
        )
        if nom == "Basile":  # arrondi propagé : la même grille sans `arrondi`
            vs = evaluer(g, cases, jokers=jok, arrondi=False)
            participants[-1]["attendusSansArrondi"] = {
                i: en_nombre(vs[i]) for i in ("sph:A", "seuil:A", "reussite")
            }
        if nom == "Fanny":  # saisie « 1 » sur un indicateur de C 1.1 (test du store)
            case = "ind:C/1.1/1"
            vs = evaluer(g, {**cases, case: 1}, jokers=jok)
            participants[-1]["apresSaisie"] = {
                "case": {"noeud": case, "valeur": stocke(case, 1)},
                "attendus": {
                    i: en_nombre(vs[i])
                    for i in ("crit:C/1.1", "obj:C/1", "sph:C", "seuil:C", "reussite")
                },
            }
    sortie = {
        "grille": "A03",
        "source": "a01-a03-controle.py --figer",
        "participants": participants,
    }
    (ICI / "a03-participants.json").write_text(
        json.dumps(sortie, ensure_ascii=False, indent=1) + "\n"
    )
    print(f"\na03-participants.json : {len(participants)} participants")


if __name__ == "__main__":
    controle_a01()
    controle_a03()
    if "--figer" in sys.argv:
        figer_a03()
