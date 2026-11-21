# /// script
# requires-python = ">=3.11"
# ///
"""Lit resultats.json : combien d'observations chaque approche rattrape, seule et en union avec le lexical."""
import json
from pathlib import Path

r = json.loads((Path(__file__).resolve().parent / "resultats.json").read_text(encoding="utf-8"))
g = r["grilles"]["A_53_noeuds"]
L = {k: v["rangs"] for k, v in g.items()}
E = {k: v["grilles"]["A_53_noeuds"]["rangs"] for k, v in r["embeddings"].items()}


def top(rs, k):
    return {i + 1 for i, x in enumerate(rs) if x <= k}


for k in (1, 3):
    lex = top(L["trigrammes similarity"], k) | top(L["BM25 racines francaises"], k)
    print(f"top{k} : union trigrammes+BM25 = {len(lex)}/30")
    for m, rs in E.items():
        print(f"  {m:9} seul {len(top(rs, k))}/30 ; union avec le lexical {len(lex | top(rs, k))}/30")
    tous = set().union(*[top(x, k) for x in list(L.values()) + list(E.values())])
    print(f"  jamais trouvées par aucune approche : {sorted(set(range(1, 31)) - tous)}")
