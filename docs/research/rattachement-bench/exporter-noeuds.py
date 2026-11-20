# /// script
# requires-python = ">=3.11"
# ///
"""Exporte les libellés de nœuds de G3 V2 (corpus du prototype) vers noeuds.json.

Source : docs/analyse/corpus-prototype/g3-v2-structure.json (grille fictive « Moniteur camp »).
Deux listes sont produites :
- `noeuds` : les nœuds portant un libellé textuel (ceux que le formateur peut viser) ;
- `distracteurs` : les nœuds au libellé générique (« E4 critère 3 indicateur 2 »), sans texte utile,
  ajoutés dans la variante « grille complète ».
La règle d'exclusion est fixée ici, avant toute mesure.
"""
import json
import re
import sys
from pathlib import Path

ici = Path(__file__).resolve().parent
src = ici.parent.parent / "analyse" / "corpus-prototype" / "g3-v2-structure.json"
g = json.loads(src.read_text(encoding="utf-8"))

GENERIQUE = re.compile(r"^e[4-8]/c\d+(/\d+)?$|/remarques|^e[4-8]/transverse$")
SEUIL = re.compile(r"^seuil:")
# agrégats sans contenu lexical propre, ou doublons d'un regroupement
SANS_TEXTE = {"e2", "e3", "e4", "e5", "e6", "e7", "e8", "planif-e1", "moyenne-generale",
              "minimaux", "reussite", "e1#1", "e1#2"}

noeuds, distracteurs = [], []
for n in g["noeuds"]:
    i, lib = n["id"], n["libelle"]
    if SEUIL.match(i) or i in SANS_TEXTE:
        continue
    if GENERIQUE.search(i):
        distracteurs.append({"id": i, "libelle": lib})
    else:
        noeuds.append({"id": i, "libelle": lib})

sortie = {"source": "docs/analyse/corpus-prototype/g3-v2-structure.json", "grille": g["grille"],
          "noeuds": noeuds, "distracteurs": distracteurs}
(ici / "noeuds.json").write_text(json.dumps(sortie, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(len(noeuds), "noeuds,", len(distracteurs), "distracteurs", file=sys.stderr)
