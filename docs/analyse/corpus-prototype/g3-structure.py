"""Transcription de G3 « Moniteur camp » (V1 et V2) au format commun du prototype.

Écrit `g3-v1-structure.json` et `g3-v2-structure.json` à côté de ce script,
d'après `g3-moniteur-camp.md` : le noyau nœud par nœud, le volume E4–E8 par motifs.
V2 est la copie du matin de J4 : elle porte `provenance` et un `origine` sur
chaque nœud, axe et définition de joker repris de V1.

    uv run docs/analyse/corpus-prototype/g3-structure.py
"""

import copy
import json
from pathlib import Path

ICI = Path(__file__).parent

BAREMES = [
    {"id": "ok-ko", "type": "ordinal", "libelle": "OK/KO", "prereglage": "binaire"},
    {
        "id": "niveau-1-5",
        "type": "ordinal",
        "libelle": "Niveau 1–5",
        "paliers": [
            {"valeur": 1, "libelle": "Insuffisant"},
            {"valeur": 2, "libelle": "Fragile"},
            {"valeur": 3, "libelle": "Suffisant"},
            {"valeur": 4, "libelle": "Bon"},
            {"valeur": 5, "libelle": "Très bon"},
        ],
    },
]


class Grille:
    def __init__(self):
        self.noeuds = []

    def donnee(self, id, libelle, bareme, definition=None, obligatoire=False):
        n = {"id": id, "type": "donnees", "libelle": libelle, "bareme": bareme}
        if definition:
            n["definition"] = definition
        if obligatoire:
            n["obligatoire"] = True
        self.noeuds.append(n)
        return id

    def commentaire(self, id, libelle):
        self.noeuds.append({"id": id, "type": "donnees", "libelle": libelle})
        return id

    def calcul(self, id, libelle, fonction, entrees, params=None, definition=None):
        n = {"id": id, "type": "calcul", "libelle": libelle}
        if definition:
            n["definition"] = definition
        n["fonction"] = fonction
        n["entrees"] = [
            {"noeud": e, "poids": 1} if isinstance(e, str) else {"noeud": e[0], "poids": e[1]}
            for e in entrees
        ]
        if params:
            n["params"] = params
        self.noeuds.append(n)
        return id

    def regroupement(self, id, libelle):
        self.noeuds.append({"id": id, "type": "regroupement", "libelle": libelle})
        return id


def p(noeud, *enfants):
    """Placement {noeud, enfants}."""
    return {"noeud": noeud, "enfants": list(enfants)} if enfants else {"noeud": noeud}


def feuilles(ids):
    return [p(i) for i in ids]


# --- Volume E4–E8, par motifs -------------------------------------------------

EXERCICES_VOLUME = [
    ("e4", "E4 Nœuds et cordes"),
    ("e5", "E5 Montage du bivouac"),
    ("e6", "E6 Jeu de nuit"),
    ("e7", "E7 Conduite d'une réunion d'équipe"),
    ("e8", "E8 Retour sur une journée"),
]
COMPETENCES_VOLUME = [
    ("communication", "Communication"),
    ("technique", "Technique"),
    ("reflexion", "Réflexion"),
    ("cooperation", "Coopération"),
]


def volume(g):
    """Exercices E4–E8 (10 critères, un indicateur placé sans compter, Remarques)
    et les 4 compétences du volume. Retourne (placements Exercices, ids des
    exercices, placements Compétences du volume)."""
    placements, exercices = [], []
    par_competence = {c: [] for c, _ in COMPETENCES_VOLUME}
    for k, (ex, libelle) in enumerate(EXERCICES_VOLUME):
        criteres = []
        for c in range(1, 11):
            bareme = "niveau-1-5" if c % 2 == 1 else "ok-ko"
            nb = 3 + (c + k) % 3  # 3 à 5 indicateurs
            ind = [
                g.donnee(f"{ex}/c{c}/{i}", f"{ex.upper()} critère {c} indicateur {i}", bareme)
                for i in range(1, nb + 1)
            ]
            crit = g.calcul(f"{ex}/c{c}", f"{ex.upper()} critère {c}", "F1", ind)
            criteres.append(p(crit, *feuilles(ind)))
            # Compétence j : critères j+1 et j+5 de E4 à E7 (8 critères chacune).
            if ex != "e8" and c <= 8:
                par_competence[COMPETENCES_VOLUME[(c - 1) % 4][0]].append(crit)
        transverse = g.donnee(
            f"{ex}/transverse", f"{ex.upper()} indicateur transversal", "niveau-1-5"
        )
        par_competence[COMPETENCES_VOLUME[k % 4][0]].append(transverse)
        exo = g.calcul(ex, libelle, "F1", [c["noeud"] for c in criteres])
        exercices.append(exo)
        reg = g.regroupement(f"reg:{ex}", libelle)
        placements.append(p(reg, p(exo), *criteres, p(transverse)))
        rem = g.regroupement(f"reg:{ex}/remarques", f"Remarques {ex.upper()}")
        notes = [
            g.commentaire(f"{ex}/remarques/{i}", f"Remarque {i} {ex.upper()}") for i in (1, 2)
        ]
        placements.append(p(rem, *feuilles(notes)))
    axe = []
    for comp, libelle in COMPETENCES_VOLUME:
        entrees = par_competence[comp]
        n = g.calcul(f"comp:{comp}", libelle, "F1", entrees)
        s = g.calcul(
            f"seuil:comp:{comp}", f"{libelle} ≥ 60 % (indicatif)", "F2", [n], {"seuil": 60}
        )
        axe.append(p(n, p(s), *feuilles(entrees)))
    return placements, exercices, axe


# --- Noyau, V1 ------------------------------------------------------------------


def occurrence_e1(g, k):
    o = f"e1#{k}"
    obj = g.donnee(f"{o}/objectifs", f"E1#{k} Objectifs", "niveau-1-5", "def:g3-objectifs")
    der = g.donnee(f"{o}/deroulement", f"E1#{k} Déroulement", "niveau-1-5", "def:g3-deroulement")
    mat = [
        g.donnee(f"{o}/materiel/{i}", f"E1#{k} {lib}", "ok-ko", f"def:g3-materiel-{i}")
        for i, lib in (("pret", "Matériel prêt"), ("adapte", "Matériel adapté"), ("plan-b", "Plan B prévu"))
    ]
    m = g.calcul(f"{o}/materiel", f"E1#{k} Matériel", "F1", mat, definition="def:g3-materiel")
    e = g.calcul(o, f"E1#{k} (occurrence {k})", "F1", [obj, der, m], definition="def:g3-e1")
    return e, p(e, p(obj), p(der), p(m, *feuilles(mat)))


def g3_v1():
    g = Grille()
    cours = g.regroupement("reg:cours", "Cours")
    m6 = g.donnee("m6", "M6 A suivi le cours en entier", "ok-ko", obligatoire=True)

    reg_e1 = g.regroupement("reg:e1", "E1 Planification d'activité")
    e1_1, pl_e1_1 = occurrence_e1(g, 1)
    e1_2, pl_e1_2 = occurrence_e1(g, 2)
    planif_e1 = g.calcul(
        "planif-e1", "Planif-E1", "F5", [e1_1, e1_2], {"mode": "meilleure", "plafond": 60}
    )

    reg_e2 = g.regroupement("reg:e2", "E2 Animation d'un jeu")
    cons_e2 = g.donnee("consignes-e2", "Consignes E2", "niveau-1-5")
    gestion = g.donnee("gestion", "Gestion du groupe", "niveau-1-5", obligatoire=True)
    app_e2 = g.donnee("appreciation-e2", "Appréciation globale E2", "niveau-1-5")
    sj = [
        g.donnee(f"sj{i}", f"SJ{i} {lib}", "ok-ko", obligatoire=True)
        for i, lib in enumerate(
            ("Terrain vérifié", "Règles de sécurité annoncées", "Trousse à portée"), 1
        )
    ]
    sec_jeu = g.calcul("securite-jeu", "Sécurité du jeu", "F1", sj)
    e2 = g.calcul("e2", "E2", "F1", [cons_e2, gestion, app_e2, sec_jeu])
    seuil_e2 = g.calcul("seuil:e2", "E2 ≥ 60 %", "F2", [e2], {"seuil": 60})

    reg_e3 = g.regroupement("reg:e3", "E3 Randonnée de nuit")
    cons_e3 = g.donnee("consignes-e3", "Consignes E3", "niveau-1-5")
    itin = g.donnee("itineraire", "Itinéraire", "niveau-1-5")
    sr = [
        g.donnee(f"sr{i}", f"SR{i} {lib}", "ok-ko", obligatoire=True)
        for i, lib in enumerate(
            ("Lampes contrôlées", "Effectif compté", "Itinéraire annoncé", "Point de repli"), 1
        )
    ]
    sec_rando = g.calcul("securite-rando", "Sécurité rando", "F1", sr)
    e3 = g.calcul("e3", "E3", "F1", [cons_e3, sec_rando])

    vol_ex, exercices_vol, vol_comp = volume(g)

    posture = g.regroupement("reg:posture", "Posture")
    post = [
        g.commentaire(f"posture/{i}", lib)
        for i, lib in (("engagement", "Engagement"), ("collaboration", "Collaboration"), ("remarques", "Remarques"))
    ]

    # Axe Compétences.
    anim = g.calcul("animation", "Animation", "F1", [cons_e2, cons_e3, gestion])
    secu = g.calcul("securite", "Sécurité", "F4", sj + sr, {"k": 5})
    planif = g.calcul("planification", "Planification", "F1", [planif_e1, itin])
    moy = g.calcul(
        "moyenne-generale", "Moyenne générale (indicative)", "F1", [e2, e3, planif] + exercices_vol
    )
    seuil_anim = g.calcul("seuil:animation", "Animation ≥ 3", "F2", [anim], {"seuil": 3})
    seuil_planif = g.calcul(
        "seuil:planification", "Planification ≥ 60 %", "F2", [planif], {"seuil": 60}
    )

    # Axe Minimaux J+S.
    m1 = g.calcul("m1", "M1 Assure la sécurité de ses activités", "F4", sr, {"k": "toutes"})
    m2 = g.calcul("m2", "M2 Connaît les mesures de base", "F4", sj, {"k": 2})
    m3 = g.calcul("m3", "M3 Donne des consignes claires", "F4", [cons_e2, cons_e3], {"k": 1, "seuil": 3})
    m4 = g.calcul("m4", "M4 Conduit le groupe", "F2", [gestion], {"seuil": 3})
    dom_s = g.calcul("domaine:securite", "Domaine Sécurité", "F3", [m1, m2])
    dom_a = g.calcul("domaine:animation", "Domaine Animation", "F3", [m3, m4])
    dom_o = g.calcul("domaine:organisation", "Domaine Organisation", "F3", [seuil_planif, m6])
    minimaux = g.calcul("minimaux", "Minimaux remplis", "F3", [dom_s, dom_a, dom_o])

    reussite = g.calcul(
        "reussite", "Réussite", "F3", [seuil_anim, secu, seuil_planif, seuil_e2, minimaux]
    )

    axes = [
        {
            "id": "exercices",
            "libelle": "Exercices",
            "principal": True,
            "arbre": [
                p(cours, p(m6)),
                p(reg_e1, p(planif_e1), pl_e1_1, pl_e1_2),
                p(reg_e2, p(e2), p(seuil_e2), p(cons_e2), p(gestion), p(app_e2), p(sec_jeu, *feuilles(sj))),
                p(reg_e3, p(e3), p(cons_e3), p(itin), p(sec_rando, *feuilles(sr))),
                *vol_ex,
                p(posture, *feuilles(post)),
                p(reussite),
            ],
        },
        {
            "id": "competences",
            "libelle": "Compétences",
            "arbre": [
                p(anim, p(seuil_anim), p(cons_e2), p(cons_e3), p(gestion)),
                p(secu, *feuilles(sj + sr)),
                p(planif, p(seuil_planif), p(planif_e1), p(itin)),
                p(moy, p(e2), p(e3), p(planif), *feuilles(exercices_vol)),
                p(reussite),
            ],
        },
        {
            "id": "minimaux",
            "libelle": "Minimaux J+S",
            "arbre": [
                p(
                    minimaux,
                    p(dom_s, p(m1, *feuilles(sr)), p(m2, *feuilles(sj))),
                    p(dom_a, p(m3, p(cons_e2), p(cons_e3)), p(m4, p(gestion))),
                    p(dom_o, p(seuil_planif), p(m6)),
                ),
            ],
        },
        {"id": "competences-volume", "libelle": "Compétences du volume", "arbre": vol_comp},
    ]
    return {
        "grille": "G3 V1",
        "source": "g3-moniteur-camp.md",
        "baremes": BAREMES,
        "noeuds": g.noeuds,
        "axes": axes,
        "decisif": reussite,
        "exigences": {"minimumParRegroupement": [{"noeud": anim, "minActives": 2}]},
        "jokers": {
            "quota": 1,
            "autorises": [
                {
                    "id": "joker:animation",
                    "noeud": anim,
                    "action": {"type": "seuil", "noeudSeuil": seuil_anim},
                    "libelle": "Remonter au seuil",
                },
                {
                    "id": "joker:e2",
                    "noeud": e2,
                    "action": {"type": "ajout", "valeur": 10},
                    "libelle": "+10 %",
                },
            ],
        },
    }


# --- Copie V2 (matin de J4) -------------------------------------------------------


def retirer_placement(arbre, id):
    out = []
    for pl in arbre:
        if pl["noeud"] == id:
            continue
        pl = dict(pl)
        if "enfants" in pl:
            pl["enfants"] = retirer_placement(pl["enfants"], id)
        out.append(pl)
    return out


def inserer_apres(arbre, apres, nouveau):
    """Ajoute `nouveau` après chaque placement de `apres`, au même niveau."""
    out = []
    for pl in arbre:
        pl = dict(pl)
        if "enfants" in pl:
            pl["enfants"] = inserer_apres(pl["enfants"], apres, nouveau)
        out.append(pl)
        if pl["noeud"] == apres:
            out.append({"noeud": nouveau})
    return out


def g3_v2(v1):
    v2 = copy.deepcopy(v1)
    v2["grille"] = "G3 V2"
    v2["provenance"] = {"grille": v1["grille"]}
    for n in v2["noeuds"]:
        n["origine"] = n["id"]
    for a in v2["axes"]:
        a["origine"] = a["id"]
    for j in v2["jokers"]["autorises"]:
        j["origine"] = j["id"]
    noeuds = {n["id"]: n for n in v2["noeuds"]}

    # 1. SR5, nouveau, obligatoire : Sécurité rando, Sécurité, M1.
    sr5 = {
        "id": "sr5",
        "type": "donnees",
        "libelle": "SR5 Numéro d'urgence communiqué",
        "bareme": "ok-ko",
        "obligatoire": True,
    }
    v2["noeuds"].insert(v2["noeuds"].index(noeuds["sr4"]) + 1, sr5)
    for c in ("securite-rando", "securite", "m1"):
        noeuds[c]["entrees"].append({"noeud": "sr5", "poids": 1})
    # 2. Appréciation globale E2 supprimée.
    v2["noeuds"].remove(noeuds["appreciation-e2"])
    noeuds["e2"]["entrees"] = [e for e in noeuds["e2"]["entrees"] if e["noeud"] != "appreciation-e2"]
    # 3. Poids de Gestion du groupe dans Animation : 2.
    for e in noeuds["animation"]["entrees"]:
        if e["noeud"] == "gestion":
            e["poids"] = 2
    # 4. Sécurité : au moins 6 OK.
    noeuds["securite"]["params"]["k"] = 6

    for a in v2["axes"]:
        a["arbre"] = inserer_apres(retirer_placement(a["arbre"], "appreciation-e2"), "sr4", "sr5")
    return v2


def ecrire(nom, grille):
    (ICI / nom).write_text(json.dumps(grille, ensure_ascii=False, indent=1) + "\n")
    types = [n["type"] for n in grille["noeuds"]]
    donnees = sum(1 for n in grille["noeuds"] if n["type"] == "donnees" and "bareme" in n)
    print(
        f"{nom} : {len(types)} nœuds, {donnees} données, "
        f"{types.count('calcul')} calculs, {types.count('donnees') - donnees} commentaires, "
        f"{types.count('regroupement')} regroupements"
    )


if __name__ == "__main__":
    v1 = g3_v1()
    ecrire("g3-v1-structure.json", v1)
    ecrire("g3-v2-structure.json", g3_v2(v1))
