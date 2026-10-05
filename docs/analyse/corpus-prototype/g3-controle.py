"""Contrôle des résultats attendus de la grille G3 « Moniteur camp ».

Calcul direct, nœud par nœud, du noyau de G3 (voir g3-moniteur-camp.md).
Ce n'est pas le moteur du prototype : c'est une seconde source pour ses tests.

    uv run docs/analyse/corpus-prototype/g3-controle.py
"""

from decimal import ROUND_HALF_UP, Decimal

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


def f4(values, k, seuil=None):
    """Au moins k (k = None : toutes), seuil optionnel sur les entrées."""
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
    materiel = f1_pct([(okko(m), 1) for m in mat])
    return f1_pct([(n5(obj), 1), (n5(der), 1), (pct(materiel), 1)])


def calcule(d, version, sw=None):
    """d : cases du participant (None = vide ou non évalué). version : 'V1' ou 'V2'."""
    sw = {"f5_mode": "meilleure", "plafond": 60, "h4_strict": False, **(sw or {})}
    r = {}
    sj = d["SJ"]
    sr = d["SR"] if version == "V2" else d["SR"][:4]

    r["E1#1"] = occurrence_e1(*d["E1#1"])
    r["E1#2"] = occurrence_e1(*d["E1#2"])
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
    r["M1"] = f4(sr, None)
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
