# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "sentence-transformers==6.3.0",
#   "torch==2.15.0",
#   "transformers==5.23.0",
#   "numpy==2.5.5",
#   "snowballstemmer==3.1.1",
# ]
# [[tool.uv.index]]
# name = "pytorch-cpu"
# url = "https://download.pytorch.org/whl/cpu"
# explicit = true
# [tool.uv.sources]
# torch = { index = "pytorch-cpu" }
# ///
"""Banc d'essai du rattachement suggéré : lexical (trigrammes, BM25 français) contre embeddings locaux.

Usage : uv run bench.py [--threads 4] [--modeles e5-small,e5-base,minilm,bge-m3,qwen3] [--sortie resultats.json]

Tout est local. Les modèles viennent de Hugging Face (révisions épinglées) et sont mis en cache hors du dépôt.
Règle de rang : pessimiste. Un nœud attendu est dans le top-k seulement si moins de k AUTRES nœuds
ont un score supérieur ou égal au sien (une égalité, y compris un score nul, compte contre nous).
"""
import argparse
import json
import math
import re
import resource
import statistics
import time
import unicodedata
from pathlib import Path

import numpy as np
import snowballstemmer

ICI = Path(__file__).resolve().parent

# nom court -> (dépôt HF, révision épinglée, préfixe requête, préfixe libellé, prompt_name)
MODELES = {
    "minilm": ("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2", "e8f8c211226b894fcb81acc59f3b34ba3efd5f42", "", "", None),
    "e5-small": ("intfloat/multilingual-e5-small", "614241f622f53c4eeff9890bdc4f31cfecc418b3", "query: ", "passage: ", None),
    "e5-base": ("intfloat/multilingual-e5-base", "d128750597153bb5987e10b1c3493a34e5a4502a", "query: ", "passage: ", None),
    "bge-m3": ("BAAI/bge-m3", "5617a9f61b028005a4858fdac845db406aefb181", "", "", None),
    "qwen3": ("Qwen/Qwen3-Embedding-0.6B", "97b0c614be4d77ee51c0cef4e5f07c00f9eb65b3", "", "", "query"),
}


def sans_accent(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def mots(s):
    return re.findall(r"[0-9a-z]+", sans_accent(s.lower()))


# ---------- trigrammes (équivalent pg_trgm) ----------
def trigrammes(s):
    t = set()
    for m in mots(s):
        p = "  " + m + " "
        t.update(p[i:i + 3] for i in range(len(p) - 2))
    return t


def similarity(a, b):
    ta, tb = trigrammes(a), trigrammes(b)
    return len(ta & tb) / len(ta | tb) if ta | tb else 0.0


def word_similarity(a, b):
    """pg_trgm word_similarity(a, b) : meilleure étendue de mots de b la plus proche de a (approximation par fenêtres de mots)."""
    ta = trigrammes(a)
    mb = mots(b)
    meilleur = 0.0
    for i in range(len(mb)):
        for j in range(i + 1, len(mb) + 1):
            te = trigrammes(" ".join(mb[i:j]))
            # pg_trgm : |ta ∩ extent| / |ta|
            meilleur = max(meilleur, len(ta & te) / len(ta) if ta else 0.0)
    return meilleur


# ---------- BM25 sur racines françaises (Snowball, comme PostgreSQL) ----------
STEM = snowballstemmer.stemmer("french")
VIDES = set("le la les un une des du de d l au aux et ou en a à y est pas qui que qu ce se sa son ses il elle ne n plus sur par pour dans avec sans mais ca ça".split())


def racines(s):
    return [STEM.stemWord(m) for m in mots(s) if m not in VIDES]


class BM25:
    def __init__(self, docs, k1=1.2, b=0.75):
        self.d = [racines(x) for x in docs]
        self.k1, self.b = k1, b
        self.moy = sum(len(x) for x in self.d) / len(self.d)
        n = len(self.d)
        df = {}
        for x in self.d:
            for t in set(x):
                df[t] = df.get(t, 0) + 1
        self.idf = {t: math.log(1 + (n - c + 0.5) / (c + 0.5)) for t, c in df.items()}

    def scores(self, requete):
        q = set(racines(requete))
        out = []
        for x in self.d:
            s = 0.0
            for t in q:
                f = x.count(t)
                if f:
                    s += self.idf[t] * f * (self.k1 + 1) / (f + self.k1 * (1 - self.b + self.b * len(x) / self.moy))
            out.append(s)
        return out


# ---------- métriques ----------
def rang_pessimiste(scores, i_attendu):
    s = scores[i_attendu]
    return 1 + sum(1 for j, v in enumerate(scores) if j != i_attendu and v >= s)


def resume(rangs, cats):
    def pct(sel, k):
        r = [x for x, c in zip(rangs, cats) if sel(c)]
        return sum(1 for x in r if x <= k), len(r)
    out = {}
    for nom, sel in [("tout", lambda c: True), ("lexical", lambda c: c == "lexical"),
                     ("paraphrase", lambda c: c == "paraphrase"), ("ambigu", lambda c: c == "ambigu")]:
        out[nom] = {"top1": pct(sel, 1), "top3": pct(sel, 3)}
    return out


def rss_mo():
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--threads", type=int, default=4)
    ap.add_argument("--modeles", default=",".join(MODELES))
    ap.add_argument("--sortie", default=str(ICI / "resultats.json"))
    a = ap.parse_args()

    nd = json.loads((ICI / "noeuds.json").read_text(encoding="utf-8"))
    obs = json.loads((ICI / "observations.json").read_text(encoding="utf-8"))["observations"]
    cats = [o["cat"] for o in obs]
    grilles = {"A_53_noeuds": nd["noeuds"], "B_325_noeuds": nd["noeuds"] + nd["distracteurs"]}
    resultats = {"threads": a.threads, "grilles": {}}

    for gnom, noeuds in grilles.items():
        ids = [n["id"] for n in noeuds]
        libs = [n["libelle"] for n in noeuds]
        att = [ids.index(o["attendu"]) for o in obs]
        res = {}
        # lexical
        for nom, fn in [("trigrammes similarity", lambda q: [similarity(l, q) for l in libs]),
                        ("trigrammes word_similarity", lambda q: [word_similarity(l, q) for l in libs])]:
            t0 = time.perf_counter()
            rangs = [rang_pessimiste(fn(o["texte"]), i) for o, i in zip(obs, att)]
            res[nom] = {"rangs": rangs, "resume": resume(rangs, cats), "ms_par_requete": (time.perf_counter() - t0) / len(obs) * 1000}
        bm = BM25(libs)
        t0 = time.perf_counter()
        rangs = [rang_pessimiste(bm.scores(o["texte"]), i) for o, i in zip(obs, att)]
        res["BM25 racines francaises"] = {"rangs": rangs, "resume": resume(rangs, cats), "ms_par_requete": (time.perf_counter() - t0) / len(obs) * 1000}
        resultats["grilles"][gnom] = res

    # embeddings
    import torch
    from sentence_transformers import SentenceTransformer
    torch.set_num_threads(a.threads)
    modeles_res = {}
    for court in a.modeles.split(","):
        depot, rev, pq, pl, prompt = MODELES[court]
        t0 = time.perf_counter()
        m = SentenceTransformer(depot, revision=rev, device="cpu")
        charge = time.perf_counter() - t0
        rss = rss_mo()
        params = sum(p.numel() for p in m.parameters())
        info = {"depot": depot, "revision": rev, "parametres": params, "dim": m.get_sentence_embedding_dimension(),
                "max_seq": m.max_seq_length, "chargement_s": charge, "rss_max_mo_apres_chargement": rss, "grilles": {}}
        for gnom, noeuds in grilles.items():
            ids = [n["id"] for n in noeuds]
            libs = [pl + n["libelle"] for n in noeuds]
            att = [ids.index(o["attendu"]) for o in obs]
            t0 = time.perf_counter()
            E = m.encode(libs, batch_size=32, normalize_embeddings=True)
            t_grille = time.perf_counter() - t0
            m.encode([pq + "chauffe"], normalize_embeddings=True)  # échauffement
            lat = []
            Q = []
            for o in obs:
                t1 = time.perf_counter()
                kw = {"prompt_name": prompt} if prompt else {}
                q = m.encode([pq + o["texte"]], normalize_embeddings=True, **kw)[0]
                lat.append((time.perf_counter() - t1) * 1000)
                Q.append(q)
            rangs = [rang_pessimiste(list(E @ q), i) for q, i in zip(Q, att)]
            lat_s = sorted(lat)
            info["grilles"][gnom] = {
                "rangs": rangs, "resume": resume(rangs, cats),
                "encodage_grille_s": t_grille, "libelles": len(libs),
                "latence_requete_ms": {"mediane": statistics.median(lat), "p95": lat_s[int(0.95 * (len(lat_s) - 1))], "max": lat_s[-1]},
            }
        modeles_res[court] = info
        del m
    resultats["embeddings"] = modeles_res
    resultats["ids_observations"] = [o["id"] for o in obs]
    Path(a.sortie).write_text(json.dumps(resultats, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # tableau
    print(f"{'approche':34} {'grille':13} top1  top3  (lexical/paraphrase/ambigu top1)")
    for gnom, res in resultats["grilles"].items():
        def ligne(nom, r):
            s = r["resume"]
            print(f"{nom:34} {gnom:13} {s['tout']['top1'][0]:>2}/30 {s['tout']['top3'][0]:>2}/30  "
                  f"{s['lexical']['top1'][0]}/{s['lexical']['top1'][1]} {s['paraphrase']['top1'][0]}/{s['paraphrase']['top1'][1]} {s['ambigu']['top1'][0]}/{s['ambigu']['top1'][1]}")
        for nom, r in res.items():
            ligne(nom, r)
        for court, info in modeles_res.items():
            ligne(court, info["grilles"][gnom])


if __name__ == "__main__":
    main()
