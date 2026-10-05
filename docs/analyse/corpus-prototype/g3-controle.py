"""Contrôle des résultats attendus de la grille G3 « Moniteur camp ».

Calcul direct, nœud par nœud, du noyau de G3 (voir g3-moniteur-camp.md).
Ce n'est pas le moteur du prototype : c'est une seconde source pour ses tests.

    uv run docs/analyse/corpus-prototype/g3-controle.py
    uv run docs/analyse/corpus-prototype/g3-controle.py --figer

`--figer` écrit aussi `g3-participants.json` : sources des participants types
dans la forme des collections du prototype (nœuds désignés par leur id dans
`g3-v1-structure.json` / `g3-v2-structure.json`, case ordinale en rang du palier),
résultats attendus de tous les nœuds de calcul (`null` : sans résultat) en V1 à
la copie, en V2 juste après la copie et en V2 à l'état final, résultats des
commutateurs F5, 1b et H4 (avec leurs non-évaluations et erreurs de
remplissage) et de Chloé sans dispense, et chemins multiples de chaque structure.
"""

import json
import sys
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

ICI = Path(__file__).parent

OK, KO = 1, 0

# --- Barèmes et normalisation (distance entre extrêmes) ---------------------


def n5(v):
    return None if v is None else (v - 1) / 4


def okko(v):
    return v


def pct(v):
    return None if v is None else v / 100


# --- Catalogue ---------------------------------------------------------------


def f1(entries):
    """Moyenne pondérée. entries = [(valeur normalisée ou None, poids)]."""
    act = [(v, w) for v, w in entries if v is not None and w > 0]
    if not act:
        return None
    return sum(v * w for v, w in act) / sum(w for _, w in act)


def f1_pct(entries):
    r = f1(entries)
    return None if r is None else 100 * r


def f1_n5(values, weights):
    """F1 sur des entrées ordinales 1–5 : sortie numérique 1–5."""
    act = [(v, w) for v, w in zip(values, weights) if v is not None and w > 0]
    if not act:
        return None
    return sum(v * w for v, w in act) / sum(w for _, w in act)


def f2(v, s):
    return None if v is None else (OK if v >= s - 1e-9 else KO)


def f3(values, strict=False):
    """Toutes. H4 par défaut : les entrées sans résultat sont ignorées."""
    if strict and any(v is None for v in values):
        return None
    act = [v for v in values if v is not None]
    if not act:
        return None
    return OK if all(v == OK for v in act) else KO


def f4(values, k, seuil=None, strict=False):
    """Au moins k (k = None : toutes), seuil optionnel sur les entrées.

    H4 strict : « au moins k = toutes » rend sans résultat dès qu'une entrée l'est.
    """
    if strict and k is None and any(v is None for v in values):
        return None
    act = [v for v in values if v is not None]
    if not act:
        return None
    hits = sum(1 for v in act if (v >= seuil if seuil is not None else v == OK))
    need = len(act) if k is None else k
    return OK if hits >= need else KO


def f5(occurrences, mode="meilleure", plafond=60):
    """Meilleure / dernière occurrence, plafond sur les rangs >= 2 (None : aucun)."""
    vals = []
    for rang, v in enumerate(occurrences, start=1):
        if v is None:
            continue
        if rang >= 2 and plafond is not None:
            v = min(v, plafond)
        vals.append(v)
    if not vals:
        return None
    return max(vals) if mode == "meilleure" else vals[-1]


# --- Grille -------------------------------------------------------------------


def occurrence_e1(obj, der, mat):
    """(E1#k, Matériel de l'occurrence)."""
    materiel = f1_pct([(okko(m), 1) for m in mat])
    return f1_pct([(n5(obj), 1), (n5(der), 1), (pct(materiel), 1)]), materiel


def calcule(d, version, sw=None):
    """d : cases du participant (None = vide ou non évalué). version : 'V1' ou 'V2'."""
    sw = {"f5_mode": "meilleure", "plafond": 60, "h4_strict": False, **(sw or {})}
    r = {}
    sj = d["SJ"]
    sr = d["SR"] if version == "V2" else d["SR"][:4]

    r["E1#1"], r["Matériel E1#1"] = occurrence_e1(*d["E1#1"])
    r["E1#2"], r["Matériel E1#2"] = occurrence_e1(*d["E1#2"])
    r["Planif-E1"] = f5([r["E1#1"], r["E1#2"]], sw["f5_mode"], sw["plafond"])

    r["Sécurité du jeu"] = f1_pct([(okko(v), 1) for v in sj])
    e2 = [(n5(d["ConsE2"]), 1), (n5(d["Gest"]), 1), (pct(r["Sécurité du jeu"]), 1)]
    if version == "V1":
        e2.append((n5(d["AppE2"]), 1))
    r["E2"] = f1_pct(e2)
    if d.get("joker") == "E2" and r["E2"] is not None:
        r["E2"] = min(r["E2"] + 10, 100)

    r["Sécurité rando"] = f1_pct([(okko(v), 1) for v in sr])
    r["E3"] = f1_pct([(n5(d["ConsE3"]), 1), (pct(r["Sécurité rando"]), 1)])

    poids_gest = 2 if version == "V2" else 1
    r["Animation"] = f1_n5([d["ConsE2"], d["ConsE3"], d["Gest"]], [1, 1, poids_gest])
    if d.get("joker") == "Animation" and r["Animation"] is not None:
        r["Animation"] = max(r["Animation"], 3)
    r["Sécurité"] = f4(sj + sr, 6 if version == "V2" else 5)
    r["Planification"] = f1_pct([(pct(r["Planif-E1"]), 1), (n5(d["Itin"]), 1)])
    r["Moyenne générale"] = f1_pct([(pct(r[k]), 1) for k in ("E2", "E3", "Planification")])

    r["Animation ≥ 3"] = f2(r["Animation"], 3)
    r["Planification ≥ 60 %"] = f2(r["Planification"], 60)
    r["E2 ≥ 60 %"] = f2(r["E2"], 60)

    st = sw["h4_strict"]
    r["M1"] = f4(sr, None, strict=st)
    r["M2"] = f4(sj, 2)
    r["M3"] = f4([d["ConsE2"], d["ConsE3"]], 1, seuil=3)
    r["M4"] = f2(d["Gest"], 3)
    r["M5"] = r["Planification ≥ 60 %"]
    r["M6"] = d["Pres"]
    r["Domaine Sécurité"] = f3([r["M1"], r["M2"]], st)
    r["Domaine Animation"] = f3([r["M3"], r["M4"]], st)
    r["Domaine Organisation"] = f3([r["M5"], r["M6"]], st)
    r["Minimaux remplis"] = f3(
        [r["Domaine Sécurité"], r["Domaine Animation"], r["Domaine Organisation"]], st
    )
    r["Réussite"] = f3(
        [r["Animation ≥ 3"], r["Sécurité"], r["Planification ≥ 60 %"], r["E2 ≥ 60 %"],
         r["Minimaux remplis"]],
        st,
    )
    r["Erreurs"] = erreurs(d, version)
    return r


def erreurs(d, version):
    """Exigences de remplissage : obligatoires + minimum de 2 notes actives dans Animation."""
    e = []
    sr = d["SR"] if version == "V2" else d["SR"][:4]
    for i, v in enumerate(d["SJ"], 1):
        if v is None:
            e.append(f"SJ{i}")
    for i, v in enumerate(sr, 1):
        if v is None:
            e.append(f"SR{i}")
    for k in ("Gest", "Pres"):
        if d[k] is None:
            e.append(k)
    if sum(v is not None for v in (d["ConsE2"], d["ConsE3"], d["Gest"])) < 2:
        e.append("Animation < 2 actives")
    return e


# --- Participants ---------------------------------------------------------------
# Cases à l'état final (V2, après J5). SR a 5 indicateurs : SR5 n'existe qu'en V2.
# « a_la_copie » liste les cases déjà saisies au matin de J4 (copie) :
# E1#1, E2 ; tout le reste est vide dans V1 à la copie.

_ = None
PARTICIPANTS = {
    "Alice": dict(
        **{"E1#1": (4, 4, [OK, OK, OK]), "E1#2": (4, 5, [OK, OK, OK])},
        ConsE2=4, Gest=4, AppE2=4, SJ=[OK, OK, OK],
        ConsE3=5, Itin=4, SR=[OK, OK, OK, OK, OK], Pres=OK,
    ),
    "Bruno": dict(
        **{"E1#1": (5, 4, [OK, OK, OK]), "E1#2": (2, 3, [OK, KO, KO])},
        ConsE2=5, Gest=4, AppE2=5, SJ=[OK, KO, KO],
        ConsE3=4, Itin=4, SR=[OK, KO, OK, KO, OK], Pres=OK,
    ),
    # Dispensée de E3 après sa saisie : notes conservées, non évaluées.
    "Chloé": dict(
        **{"E1#1": (4, 3, [OK, OK, KO]), "E1#2": (4, 4, [OK, OK, OK])},
        ConsE2=4, Gest=3, AppE2=4, SJ=[OK, OK, OK],
        ConsE3=3, Itin=4, SR=[OK, OK, OK, OK, OK], Pres=OK,
        dispense_E3=True,
    ),
    "David": dict(
        **{"E1#1": (2, 2, [OK, KO, KO]), "E1#2": (5, 4, [OK, OK, OK])},
        ConsE2=4, Gest=4, AppE2=3, SJ=[OK, OK, OK],
        ConsE3=4, Itin=4, SR=[OK, OK, OK, OK, OK], Pres=OK,
    ),
    # Joker « remonter au seuil » sur Animation, posé en V2 après E3.
    "Emma": dict(
        **{"E1#1": (3, 4, [OK, OK, OK]), "E1#2": (4, 4, [OK, OK, OK])},
        ConsE2=3, Gest=3, AppE2=3, SJ=[OK, OK, OK],
        ConsE3=2, Itin=3, SR=[OK, OK, OK, OK, OK], Pres=OK,
        joker="Animation",
    ),
    # Gestion du groupe, SR5 et présence vides (obligatoires) ; E1#2 non faite.
    "Félix": dict(
        **{"E1#1": (4, 4, [OK, OK, OK]), "E1#2": (_, _, [_, _, _])},
        ConsE2=4, Gest=_, AppE2=4, SJ=[OK, OK, OK],
        ConsE3=4, Itin=4, SR=[OK, OK, OK, OK, _], Pres=_,
    ),
}


def appliquer_dispense_e3(d, feuilles="placées"):
    """1b A : éléments placés sous E3 ; 1b B : dépendances de calcul de E3."""
    d = dict(d)
    d["ConsE3"] = None
    d["SR"] = [None] * 5
    if feuilles == "placées":
        d["Itin"] = None
    return d


def a_la_copie(d):
    d = dict(d)
    for k in ("ConsE3", "Itin", "Pres"):
        d[k] = None
    d["SR"] = [None] * 5
    d["E1#2"] = (None, None, [None, None, None])
    d.pop("joker", None)
    return d


def etat_final(d, feuilles="placées"):
    return appliquer_dispense_e3(d, feuilles) if d.get("dispense_E3") else d


# --- Affichage -------------------------------------------------------------------

COLONNES = ["E1#1", "E1#2", "Planif-E1", "E2", "E3", "Animation", "Sécurité",
            "Planification", "Moyenne générale", "Minimaux remplis", "Réussite"]


def arrondi(v, pas):
    """Arrondi d'affichage, demi vers le haut."""
    return Decimal(repr(round(v, 9))).quantize(Decimal(pas), rounding=ROUND_HALF_UP)


def fmt(k, v):
    if v is None:
        return "—"
    if k in ("Sécurité", "Minimaux remplis", "Réussite") or k.startswith(("M", "Domaine")) and k != "Moyenne générale":
        return "OK" if v == OK else "KO"
    if k == "Animation":
        return str(arrondi(v, "0.01")).replace(".", ",")
    return f"{arrondi(v, '0.1')} %".replace(".", ",")


def table(titre, rows):
    print(f"\n### {titre}\n")
    print("| Participant | " + " | ".join(COLONNES) + " | Erreurs de remplissage |")
    print("| --- " * (len(COLONNES) + 2) + "|")
    for nom, r in rows:
        cells = [fmt(k, r[k]) for k in COLONNES]
        err = ", ".join(r["Erreurs"]) or "aucune"
        print(f"| {nom} | " + " | ".join(cells) + f" | {err} |")


def details(titre, rows, cles):
    print(f"\n### {titre}\n")
    print("| Participant | " + " | ".join(cles) + " |")
    print("| --- " * (len(cles) + 1) + "|")
    for nom, r in rows:
        print(f"| {nom} | " + " | ".join(fmt(k, r[k]) for k in cles) + " |")

# --- Chemins multiples (propriété de la structure) ---------------------------------
#
# Lit les structures au format commun ; seconde implémentation, indépendante du
# prototype, de la règle provisoire (voir le ticket #17) :
# - exigence = nœud de calcul à sortie binaire (F2, F3, F4, F7) du cône du nœud
#   décisif (lui compris) dont aucune entrée n'est un nœud de calcul binaire ;
#   « contribution à plusieurs exigences » : un nœud atteint au moins 2 exigences ;
# - « influence multiple » : un nœud atteint un même nœud de calcul R par au
#   moins 2 de ses consommateurs directs (ou est entrée directe de R et l'atteint
#   aussi autrement).

BINAIRES = {"F2", "F3", "F4", "F7"}


def chemins_multiples(grille):
    noeuds = {n["id"]: n for n in grille["noeuds"]}
    entrees = {i: [e["noeud"] for e in n.get("entrees", [])] for i, n in noeuds.items()}
    consommateurs = {i: [] for i in noeuds}
    for i, es in entrees.items():
        for e in es:
            if i not in consommateurs[e]:
                consommateurs[e].append(i)

    atteint = {}

    def aval(i):
        """Nœuds de calcul atteints depuis i (i exclu)."""
        if i not in atteint:
            r = set()
            for c in consommateurs[i]:
                r |= {c} | aval(c)
            atteint[i] = r
        return atteint[i]

    def binaire(i):
        return noeuds[i]["type"] == "calcul" and noeuds[i]["fonction"] in BINAIRES

    decisif = grille.get("decisif")
    exigences = set()
    if decisif:
        cone, pile = set(), [decisif]
        while pile:
            i = pile.pop()
            if i not in cone:
                cone.add(i)
                pile += entrees[i]
        exigences = {
            i for i in cone if binaire(i) and not any(binaire(e) for e in entrees[i])
        }
    ordre = [n["id"] for n in grille["noeuds"]]
    plusieurs, influences = {}, {}
    for i in ordre:
        n = noeuds[i]
        if n["type"] == "regroupement" or (n["type"] == "donnees" and "bareme" not in n):
            continue
        ex = [e for e in ordre if e in exigences and (e == i or e in aval(i))]
        if len(ex) >= 2:
            plusieurs[i] = ex
        rs = [
            r for r in ordre
            if sum(1 for c in consommateurs[i] if c == r or r in aval(c)) >= 2
        ]
        if rs:
            influences[i] = rs
    return {"plusieursExigences": plusieurs, "influenceMultiple": influences}


# --- Participants figés ----------------------------------------------------------

IDS = {
    "E1#1": "e1#1", "E1#2": "e1#2",
    "Matériel E1#1": "e1#1/materiel", "Matériel E1#2": "e1#2/materiel",
    "Planif-E1": "planif-e1", "Sécurité du jeu": "securite-jeu", "E2": "e2",
    "Sécurité rando": "securite-rando", "E3": "e3", "Animation": "animation",
    "Sécurité": "securite", "Planification": "planification",
    "Moyenne générale": "moyenne-generale", "Animation ≥ 3": "seuil:animation",
    "Planification ≥ 60 %": "seuil:planification", "E2 ≥ 60 %": "seuil:e2",
    "M1": "m1", "M2": "m2", "M3": "m3", "M4": "m4",
    "Domaine Sécurité": "domaine:securite", "Domaine Animation": "domaine:animation",
    "Domaine Organisation": "domaine:organisation", "Minimaux remplis": "minimaux",
    "Réussite": "reussite",
}
ERREURS = {"Gest": "gestion", "Pres": "m6", "Animation < 2 actives": "animation"}
VOLUME = ("e4", "e5", "e6", "e7", "e8", "comp:", "seuil:comp:")


def structure(version):
    return json.loads((ICI / f"g3-{version.lower()}-structure.json").read_text())


def sources(d, version):
    """Cases de d (rang du palier : Niveau 1–5 → v − 1, OK/KO → v)."""
    cases = []

    def case(i, v, niveau):
        if v is not None:
            cases.append({"noeud": i, "valeur": v - 1 if niveau else v})

    for k in (1, 2):
        obj, der, mat = d[f"E1#{k}"]
        case(f"e1#{k}/objectifs", obj, True)
        case(f"e1#{k}/deroulement", der, True)
        for nom, v in zip(("pret", "adapte", "plan-b"), mat):
            case(f"e1#{k}/materiel/{nom}", v, False)
    case("consignes-e2", d["ConsE2"], True)
    case("gestion", d["Gest"], True)
    if version == "V1":
        case("appreciation-e2", d["AppE2"], True)
    for i, v in enumerate(d["SJ"], 1):
        case(f"sj{i}", v, False)
    case("consignes-e3", d["ConsE3"], True)
    case("itineraire", d["Itin"], True)
    for i, v in enumerate(d["SR"] if version == "V2" else d["SR"][:4], 1):
        case(f"sr{i}", v, False)
    case("m6", d["Pres"], False)
    return cases


def attendus(grille, r):
    out = {}
    for n in grille["noeuds"]:
        if n["type"] != "calcul":
            continue
        cle = next((k for k, i in IDS.items() if i == n["id"]), None)
        if cle is None:
            # Volume : les cases des participants types y sont vides.
            assert n["id"].startswith(VOLUME), n["id"]
            out[n["id"]] = None
        else:
            v = r[cle]
            out[n["id"]] = None if v is None else float(v)
    return out


def figer_participant(nom, d_sources, r, version, grille, dispense=False, joker=None):
    return {
        "nom": nom,
        "sources": {
            "cases": sources(d_sources, version),
            "nonEvaluations": [{"noeud": "reg:e3"}] if dispense else [],
            "jokers": [
                {
                    "jokerDef": f"joker:{joker.lower()}",
                    "justification": "Participant type",
                    "auteur": "corpus",
                    "date": "2026-10-05",
                }
            ] if joker else [],
        },
        "attendus": attendus(grille, r),
        "erreursRemplissage": [
            ERREURS.get(e, e.lower()) for e in r["Erreurs"]
        ],
    }


def figer():
    P = PARTICIPANTS
    v1, v2 = structure("V1"), structure("V2")
    etats = {
        "V1-copie": {
            "grille": v1["grille"],
            "participants": [
                figer_participant(n, a_la_copie(d), calcule(a_la_copie(d), "V1"), "V1", v1)
                for n, d in P.items()
            ],
        },
        "V2-copie": {
            "grille": v2["grille"],
            "participants": [
                figer_participant(n, a_la_copie(d), calcule(a_la_copie(d), "V2"), "V2", v2)
                for n, d in P.items()
            ],
        },
        "V2-final": {
            "grille": v2["grille"],
            "participants": [
                figer_participant(
                    n, d, calcule(etat_final(d), "V2"), "V2", v2,
                    dispense=d.get("dispense_E3", False), joker=d.get("joker"),
                )
                for n, d in P.items()
            ],
        },
    }
    commutateurs = [
        ("Bruno", {"f5Derniere": True}, {"f5_mode": "dernière"}),
        ("David", {"f5SansPlafond": True}, {"plafond": None}),
        ("David", {"f5Derniere": True}, {"f5_mode": "dernière"}),
    ]
    # Non-évaluations et H4 (ticket #18). En 1b-B, une dispense sur le
    # regroupement E3 est sans effet : la variante du doc (« feuilles =
    # dépendances de calcul de E3 ») se pose donc sur le nœud de calcul E3.
    chloe, felix = P["Chloé"], P["Félix"]
    variantes = [
        ("Chloé", {"feuilles1b": "B"}, [{"noeud": "e3"}],
         appliquer_dispense_e3(chloe, "dépendances"), {}),
        ("Chloé", {}, [], chloe, {}),
        ("Félix", {"h4Strict": True}, [], felix, {"h4_strict": True}),
    ]
    sortie = {
        "grille": "G3",
        "source": "g3-controle.py --figer",
        "etats": etats,
        "commutateurs": [
            {
                "etat": "V2-final",
                "nom": nom,
                "commutateurs": ts,
                "attendus": attendus(v2, calcule(etat_final(P[nom]), "V2", sw)),
            }
            for nom, ts, sw in commutateurs
        ]
        + [
            {
                "etat": "V2-final",
                "nom": nom,
                "commutateurs": ts,
                "nonEvaluations": ne,
                "attendus": attendus(v2, r := calcule(d, "V2", sw)),
                "erreursRemplissage": [ERREURS.get(e, e.lower()) for e in r["Erreurs"]],
            }
            for nom, ts, ne, d, sw in variantes
        ],
        "cheminsMultiples": {g["grille"]: chemins_multiples(g) for g in (v1, v2)},
    }
    (ICI / "g3-participants.json").write_text(
        json.dumps(sortie, ensure_ascii=False, indent=1) + "\n"
    )
    print(f"\ng3-participants.json : 3 états × 6 participants, {len(sortie['commutateurs'])} commutateurs")
    for g, cm in sortie["cheminsMultiples"].items():
        print(f"\n### Chemins multiples, {g}\n")
        for i, ex in cm["plusieursExigences"].items():
            print(f"- {i} : plusieurs exigences ({', '.join(ex)})")
        for i, rs in cm["influenceMultiple"].items():
            print(f"- {i} : influence multiple sur {', '.join(rs)}")


if __name__ == "__main__":
    P = PARTICIPANTS
    table("V1 à la copie (matin de J4)",
          [(n, calcule(a_la_copie(d), "V1")) for n, d in P.items()])
    table("V2 juste après la copie (mêmes données)",
          [(n, calcule(a_la_copie(d), "V2")) for n, d in P.items()])
    final = [(n, calcule(etat_final(d), "V2")) for n, d in P.items()]
    table("V2 à l'état final (après J5)", final)
    details("Minimaux, V2 à l'état final", final,
            ["M1", "M2", "M3", "M4", "M5", "M6", "Domaine Sécurité",
             "Domaine Animation", "Domaine Organisation"])

    print("\n### Commutateurs, V2 à l'état final\n")
    b = calcule(P["Bruno"], "V2", {"f5_mode": "dernière"})
    print(f"- Bruno, F5 « dernière » : Planif-E1 {fmt('E2', b['Planif-E1'])}, "
          f"Planification {fmt('E2', b['Planification'])}, Réussite {fmt('Réussite', b['Réussite'])}")
    dv = calcule(P["David"], "V2", {"plafond": None})
    print(f"- David, F5 sans plafond : Planif-E1 {fmt('E2', dv['Planif-E1'])}, "
          f"Planification {fmt('E2', dv['Planification'])}")
    dd = calcule(P["David"], "V2", {"f5_mode": "dernière"})
    print(f"- David, F5 « dernière » : Planif-E1 {fmt('E2', dd['Planif-E1'])}")
    c = calcule(etat_final(P["Chloé"], "dépendances"), "V2")
    print(f"- Chloé, 1b B (feuilles = dépendances de calcul) : Planification "
          f"{fmt('E2', c['Planification'])}, Réussite {fmt('Réussite', c['Réussite'])}")
    c0 = calcule(P["Chloé"], "V2")
    print(f"- Chloé sans dispense : Animation {fmt('Animation', c0['Animation'])}, "
          f"Sécurité {fmt('Sécurité', c0['Sécurité'])}, Planification {fmt('E2', c0['Planification'])}, Réussite {fmt('Réussite', c0['Réussite'])}")
    e0 = calcule({k: v for k, v in P["Emma"].items() if k != "joker"}, "V2")
    print(f"- Emma sans joker : Animation {fmt('Animation', e0['Animation'])}, "
          f"Réussite {fmt('Réussite', e0['Réussite'])}")
    f = calcule(P["Félix"], "V2", {"h4_strict": True})
    print(f"- Félix, H4 strict (une entrée sans résultat rend F3 sans résultat) : "
          f"Minimaux {fmt('Réussite', f['Minimaux remplis'])}, Réussite {fmt('Réussite', f['Réussite'])}")
    if "--figer" in sys.argv:
        figer()
