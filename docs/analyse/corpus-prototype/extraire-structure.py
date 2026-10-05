"""Extraction de la structure de A01 (qualif1) et A03 (qualif3) vers le modèle de 18.

Lit les Excel d'origine, hors dépôt (`.scratch/exemple qualif a analyser/`), et écrit
`a01-structure.json` et `a03-structure.json` à côté de ce script. Les choix de
modélisation sont décrits dans `a01-qualif1.md` et `a03-qualif3.md`.

Le dépôt est public : les libellés d'objectifs et de critères sont abrégés, les
indicateurs et les items de Posture sont numérotés sans leur texte. Le texte sert
seulement à reconnaître les définitions partagées (même texte = même définition).

    uv run --with openpyxl docs/analyse/corpus-prototype/extraire-structure.py
"""

import json
import re
import warnings
from pathlib import Path

import openpyxl

warnings.filterwarnings("ignore", category=UserWarning)

ICI = Path(__file__).parent
SOURCES = ICI.parents[2] / ".scratch" / "exemple qualif a analyser"


def abrege(texte, n=48):
    texte = " ".join(str(texte).split())
    if len(texte) <= n:
        return texte
    coupe = texte[:n].rsplit(" ", 1)[0]
    return coupe.rstrip(" ,;:.") + " …"


class Definitions:
    """Une définition par texte normalisé ; les occurrences partagent son id."""

    def __init__(self, prefixe):
        self.prefixe = prefixe
        self.ids = {}

    def __call__(self, genre, texte):
        cle = (genre, " ".join(str(texte).lower().split()))
        if cle not in self.ids:
            self.ids[cle] = f"def:{self.prefixe}{len(self.ids) + 1}"
        return self.ids[cle]


def plage(formule):
    """'=SUM(M11:M28)' -> (11, 28)."""
    a, b = re.search(r"[A-Z]+(\d+):[A-Z]+(\d+)", formule).groups()
    return int(a), int(b)


def ecrire(nom, grille):
    (ICI / nom).write_text(json.dumps(grille, ensure_ascii=False, indent=1) + "\n")
    print(f"{nom} : {len(grille['noeuds'])} nœuds")


# --- A01 ----------------------------------------------------------------------

EXERCICES_A01 = {
    "Construction de cours": "construction",
    "Programme de cours": "programme",
    "PdC filmé": "pdc-filme",
    "Planif PdC OZR": "planif-ozr",
    "Anim PdC OZR": "anim-ozr",
    "Entretien de qualif": "entretien",
    "Système de qualif": "systeme",
}
THEMES_A01 = [(65, "T1"), (82, "T2"), (99, "T3"), (116, "T4")]
TRANSVERSAUX_A01 = {"4.1": "4.1", "2.1": "2.1"}


def a01():
    wb = openpyxl.load_workbook(SOURCES / "qualif1.xlsx")
    defs = Definitions("a01-")
    noeuds, arbre_ex = [], []
    criteres = {}  # (feuille, code) -> (id du critère, ids des indicateurs)
    occurrences_transv = {code: [] for code in TRANSVERSAUX_A01}

    for feuille, ex in EXERCICES_A01.items():
        ws = wb[feuille]
        debut, fin = plage(ws["M7"].value)
        objectifs = []  # [code, id, ligne, [critères], [indicateurs]]
        for r in range(11, ws.max_row + 1):
            code, lib, ind = (
                ws.cell(r, 3).value,
                ws.cell(r, 4).value,
                ws.cell(r, 5).value,
            )
            if code is not None and lib is not None:
                code = str(code).strip()
                if code.count(".") == 2 and "/" not in code:  # critère x.y.z
                    cid = f"crit:{ex}/{code}"
                    objectifs[-1][3].append([code, cid, lib, []])
                else:  # objectif x.y ou 2.6/3.8
                    objectifs.append(
                        [code, f"obj:{ex}/{code.replace('/', '-')}", r, [], lib]
                    )
            elif ind is not None:
                crit = objectifs[-1][3][-1]
                assert float(ws.cell(r, 6).value) == 1.0
                iid = f"{crit[1].replace('crit:', 'ind:')}/{len(crit[3]) + 1}"
                crit[3].append(iid)
                noeuds.append(
                    {
                        "id": iid,
                        "type": "donnees",
                        "libelle": f"{crit[0]} indicateur {len(crit[3])}",
                        "definition": defs("indicateur", ind),
                        "bareme": "points-0-1",
                        "obligatoire": True,
                    }
                )

        compte_ex, enfants_ex = [], []
        for code, oid, ligne, crits, olib in objectifs:
            inds_obj, enfants_obj = [], []
            for ccode, cid, clib, inds in crits:
                noeuds.append(
                    {
                        "id": cid,
                        "type": "calcul",
                        "libelle": f"{ccode} {abrege(clib)}",
                        "definition": defs("critere", clib),
                        "fonction": "F1",
                        "entrees": [{"noeud": i, "poids": 1} for i in inds],
                        "bareme_sortie": "points-0-1",
                    }
                )
                criteres[(feuille, ccode)] = (cid, inds)
                inds_obj += inds
                enfants_obj.append(
                    {"noeud": cid, "enfants": [{"noeud": i} for i in inds]}
                )
            noeuds.append(
                {
                    "id": oid,
                    "type": "calcul",
                    "libelle": f"{code} {abrege(olib)}",
                    "definition": defs("objectif", f"{code} {olib}"),
                    "fonction": "F1",
                    "entrees": [{"noeud": i, "poids": 1} for i in inds_obj],
                    "bareme_sortie": "points-0-1",
                }
            )
            enfants_ex.append({"noeud": oid, "enfants": enfants_obj})
            if debut <= ligne <= fin:
                compte_ex += inds_obj
            else:
                assert code in TRANSVERSAUX_A01, (feuille, code)
                occurrences_transv[code].append(oid)
        noeuds.append(
            {
                "id": f"ex:{ex}",
                "type": "calcul",
                "libelle": ws["C1"].value,
                "fonction": "F1",
                "entrees": [{"noeud": i, "poids": 1} for i in compte_ex],
                "bareme_sortie": "points-0-1",
            }
        )
        arbre_ex.append({"noeud": f"ex:{ex}", "enfants": enfants_ex})

    syn = wb["Synthèse"]
    arbre_th = []
    for ligne, tid in THEMES_A01:
        inds, places = [], []
        for r in range(ligne + 1, ligne + 16):
            f, c = syn.cell(r, 3).value, syn.cell(r, 4).value
            if f and c:
                cid, cinds = criteres[(f, str(c).strip())]
                inds += cinds
                places.append({"noeud": cid})
        noeuds.append(
            {
                "id": f"theme:{tid}",
                "type": "calcul",
                "libelle": syn.cell(ligne, 3).value,
                "fonction": "F1",
                "entrees": [{"noeud": i, "poids": 1} for i in inds],
                "bareme_sortie": "points-0-1",
            }
        )
        arbre_th.append({"noeud": f"theme:{tid}", "enfants": places})

    arbre_tr = []
    for code, occ in occurrences_transv.items():
        noeuds.append(
            {
                "id": f"transv:{code}",
                "type": "calcul",
                "libelle": f"Objectif {code}, moyenne des exercices",
                "fonction": "F1",
                "entrees": [{"noeud": o, "poids": 1} for o in occ],
                "bareme_sortie": "points-0-1",
            }
        )
        arbre_tr.append(
            {"noeud": f"transv:{code}", "enfants": [{"noeud": o} for o in occ]}
        )

    ecrire(
        "a01-structure.json",
        {
            "grille": "A01",
            "source": "qualif1.xlsx",
            "baremes": [
                {
                    "id": "points-0-1",
                    "type": "numerique",
                    "min": 0,
                    "max": 1,
                    "pas": 0.5,
                    "presentation": "pourcentage",
                }
            ],
            "noeuds": noeuds,
            "axes": [
                {
                    "id": "exercices",
                    "libelle": "Exercices",
                    "principal": True,
                    "arbre": arbre_ex,
                },
                {"id": "themes", "libelle": "Thèmes transversaux", "arbre": arbre_th},
                {
                    "id": "objectifs-transversaux",
                    "libelle": "Objectifs transversaux",
                    "arbre": arbre_tr,
                },
            ],
            "decisif": None,
            "exigences": {
                "obligatoires": "tous les nœuds de données",
                "minimum_par_regroupement": [],
            },
            "jokers": {"quota": 0, "autorises": []},
        },
    )


# --- A03 ----------------------------------------------------------------------

SPHERES_A03 = {"A - Techniques JS": "A", "B - Organisation": "B", "C - Scoutisme": "C"}
BAREME_SPHERE = {"A": "note-1-5", "B": "note-1-5", "C": "echelle-1-5"}
CONVERSION = [[1, 0], [3, 100], [5, 150]]


def a03():
    wb = openpyxl.load_workbook(SOURCES / "qualif3.xlsx")
    defs = Definitions("a03-")
    noeuds, arbre_sph, seuils, ecarts_excel = [], [], [], []
    minimums = []

    for feuille, s in SPHERES_A03.items():
        ws = wb[feuille]
        objectifs = []  # [num, lib, poids, [[num, lib, poids, ligne, [indicateurs]]]]
        for r in range(11, ws.max_row + 1):
            o, c, ind = ws.cell(r, 3).value, ws.cell(r, 4).value, ws.cell(r, 5).value
            if o is not None:
                objectifs.append(
                    [str(o).split(".")[0], o, int(ws.cell(r, 6).value), []]
                )
            elif c is not None:
                objectifs[-1][3].append(
                    [str(c).split(".")[0], c, int(ws.cell(r, 7).value), r, []]
                )
            elif ind is not None:
                objectifs[-1][3][-1][4].append((r, ind))

        enfants_sph, entrees_sph = [], []
        for onum, olib, opoids, crits in objectifs:
            oid = f"obj:{s}/{onum}"
            entrees_obj, enfants_obj = [], []
            for cnum, clib, cpoids, cligne, inds in crits:
                cid = f"crit:{s}/{onum}.{cnum}"
                iids = []
                for k, (r, texte) in enumerate(inds, start=1):
                    iid = f"ind:{s}/{onum}.{cnum}/{k}"
                    iids.append(iid)
                    noeuds.append(
                        {
                            "id": iid,
                            "type": "donnees",
                            "libelle": f"{s} {onum}.{cnum} indicateur {k}",
                            "definition": defs("indicateur", texte),
                            "bareme": BAREME_SPHERE[s],
                        }
                    )
                formule = ws.cell(cligne, 9).value
                a, b = plage(formule)
                lignes = [r for r, _ in inds]
                if (a, b) != (lignes[0], lignes[-1]):
                    omis = [iids[i] for i, r in enumerate(lignes) if not a <= r <= b]
                    ecarts_excel.append(
                        {
                            "critere": cid,
                            "cellule": f"{feuille}!I{cligne}",
                            "formule": formule,
                            "indicateurs_omis": omis,
                        }
                    )
                noeuds.append(
                    {
                        "id": cid,
                        "type": "calcul",
                        "libelle": f"{onum}.{cnum} {abrege(clib)}",
                        "definition": defs("critere", clib),
                        "fonction": "F1",
                        "entrees": [{"noeud": i, "poids": 1} for i in iids],
                        "bareme_sortie": "note-1-5",
                    }
                )
                minimums.append({"regroupement": cid, "min_actives": 1})
                entrees_obj.append({"noeud": cid, "poids": cpoids})
                enfants_obj.append(
                    {"noeud": cid, "enfants": [{"noeud": i} for i in iids]}
                )
            noeuds.append(
                {
                    "id": oid,
                    "type": "calcul",
                    "libelle": f"{s}{onum} {abrege(str(olib).split('.', 1)[1])}",
                    "fonction": "F1",
                    "entrees": entrees_obj,
                    "bareme_sortie": "note-1-5",
                }
            )
            noeuds.append(
                {
                    "id": f"obj-pct:{s}/{onum}",
                    "type": "calcul",
                    "libelle": f"{s}{onum} en %",
                    "fonction": "F1",
                    "entrees": [{"noeud": oid, "poids": 1}],
                    "conversion": CONVERSION,
                    "bareme_sortie": "pct-0-150",
                    "arrondi": 1,
                }
            )
            entrees_sph.append({"noeud": oid, "poids": opoids})
            enfants_sph.append(
                {
                    "noeud": oid,
                    "enfants": [{"noeud": f"obj-pct:{s}/{onum}"}] + enfants_obj,
                }
            )
        noeuds.append(
            {
                "id": f"sph:{s}",
                "type": "calcul",
                "libelle": f"Sphère {feuille}",
                "fonction": "F1",
                "entrees": entrees_sph,
                "conversion": CONVERSION,
                "bareme_sortie": "pct-0-150",
                "arrondi": 1,
            }
        )
        noeuds.append(
            {
                "id": f"seuil:{s}",
                "type": "calcul",
                "libelle": f"Sphère {s} ≥ 80 %",
                "fonction": "F2",
                "params": {"seuil": 80},
                "entrees": [{"noeud": f"sph:{s}", "poids": 1}],
                "bareme_sortie": "ok-ko",
            }
        )
        seuils.append(f"seuil:{s}")
        arbre_sph.append(
            {"noeud": f"sph:{s}", "enfants": [{"noeud": f"seuil:{s}"}] + enfants_sph}
        )

    noeuds.append(
        {
            "id": "reussite",
            "type": "calcul",
            "libelle": "Réussite",
            "fonction": "F3",
            "entrees": [{"noeud": i, "poids": 1} for i in seuils],
            "bareme_sortie": "ok-ko",
        }
    )

    ws = wb["Posture"]
    metas = sorted(
        (m.min_row, m.max_row, ws.cell(m.min_row, 9).value)
        for m in ws.merged_cells.ranges
        if m.min_col == 9
    )
    arbre_pos = [
        {"noeud": f"pos-meta:{k}", "enfants": []} for k in range(1, len(metas) + 1)
    ]
    for k, (_, _, lib) in enumerate(metas, start=1):
        noeuds.append({"id": f"pos-meta:{k}", "type": "regroupement", "libelle": lib})
    axe = None
    for r in range(7, 72):
        v = ws.cell(r, 3).value
        if not v:
            continue
        m = re.match(r"^([A-J])\. ", v)
        if m:
            axe = {"noeud": f"pos-axe:{m.group(1)}", "enfants": []}
            noeuds.append(
                {"id": axe["noeud"], "type": "regroupement", "libelle": abrege(v)}
            )
            k = next(i for i, (a, b, _) in enumerate(metas) if a <= r <= b)
            arbre_pos[k]["enfants"].append(axe)
        elif re.match(r"^[A-J]\d+\. ", v):
            code = v.split(".")[0]
            noeuds.append(
                {
                    "id": f"pos:{code}",
                    "type": "donnees",
                    "libelle": f"Posture {code}",
                    "definition": defs("posture", v),
                    "bareme": "echelle-1-5",
                }
            )
            axe["enfants"].append({"noeud": f"pos:{code}"})

    echelle = wb["Echelle"]
    paliers = [
        {
            "valeur": int(echelle.cell(r, 3).value),
            "libelle": abrege(echelle.cell(r, 4).value, 40),
        }
        for r in range(8, 13)
    ]
    ecrire(
        "a03-structure.json",
        {
            "grille": "A03",
            "source": "qualif3.xlsx",
            "baremes": [
                {"id": "note-1-5", "type": "numerique", "min": 1, "max": 5, "pas": 0.1},
                {"id": "echelle-1-5", "type": "ordinal", "paliers": paliers},
                {
                    "id": "pct-0-150",
                    "type": "numerique",
                    "min": 0,
                    "max": 150,
                    "pas": 1,
                    "colorations": [
                        [0, 80, "rouge"],
                        [80, 90, "jaune"],
                        [90, 110, "vert"],
                        [110, 150, "bleu"],
                    ],
                },
                {"id": "ok-ko", "type": "ordinal", "prereglage": "binaire"},
            ],
            "noeuds": noeuds,
            "axes": [
                {
                    "id": "spheres",
                    "libelle": "Sphères",
                    "principal": True,
                    "arbre": arbre_sph + [{"noeud": "reussite"}],
                },
                {"id": "posture", "libelle": "Posture", "arbre": arbre_pos},
            ],
            "decisif": "reussite",
            "exigences": {"obligatoires": [], "minimum_par_regroupement": minimums},
            "jokers": {
                "quota": 1,
                "autorises": [
                    {
                        "noeud": f"sph:{s}",
                        "action": {"type": "ajout", "valeur": 25},
                        "libelle": "≈ ½ point",
                    }
                    for s in SPHERES_A03.values()
                ],
            },
            "ecarts_excel": ecarts_excel,
        },
    )


if __name__ == "__main__":
    a01()
    a03()
