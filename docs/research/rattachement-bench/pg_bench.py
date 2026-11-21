# /// script
# requires-python = ">=3.11"
# ///
"""Même jeu d'observations, avec un vrai PostgreSQL (pg_trgm, unaccent, configuration `french`).

Prérequis : Docker et l'image `postgres:18.4` (déjà présente ou à tirer ; image officielle, contrib inclus).
Le script démarre un conteneur jetable (sans volume, sans port publié), exécute les requêtes via `docker exec psql`,
puis le supprime. Même règle de rang pessimiste que bench.py.

Usage : uv run pg_bench.py [--sortie resultats-pg.json]
"""
import argparse
import json
import subprocess
import time
from pathlib import Path

ICI = Path(__file__).resolve().parent
NOM = "azimut-rattachement-bench-pg"
IMAGE = "postgres:18.4"


def sh(*args, entree=None):
    r = subprocess.run(args, input=entree, capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(f"{' '.join(args)}\n{r.stderr}")
    return r.stdout


def psql(sql):
    return sh("docker", "exec", "-i", NOM, "psql", "-U", "postgres", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-At", "-F", "\t", entree=sql)


def lit(s):
    return "'" + s.replace("'", "''") + "'"


def rang_pessimiste(scores, i):
    return 1 + sum(1 for j, v in enumerate(scores) if j != i and v >= scores[i])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sortie", default=str(ICI / "resultats-pg.json"))
    a = ap.parse_args()
    nd = json.loads((ICI / "noeuds.json").read_text(encoding="utf-8"))
    obs = json.loads((ICI / "observations.json").read_text(encoding="utf-8"))["observations"]

    subprocess.run(["docker", "rm", "-f", NOM], capture_output=True)
    sh("docker", "run", "-d", "--rm", "--name", NOM, "-e", "POSTGRES_HOST_AUTH_METHOD=trust", IMAGE)
    try:
        for _ in range(60):
            if subprocess.run(["docker", "exec", NOM, "pg_isready", "-U", "postgres"], capture_output=True).returncode == 0:
                time.sleep(2)  # le serveur d'initialisation redémarre une fois
                if subprocess.run(["docker", "exec", NOM, "pg_isready", "-U", "postgres"], capture_output=True).returncode == 0:
                    break
            time.sleep(1)
        version = psql("SHOW server_version;").strip()
        psql("CREATE EXTENSION pg_trgm; CREATE EXTENSION unaccent;")
        ext = psql("SELECT extname||' '||extversion FROM pg_extension WHERE extname IN ('pg_trgm','unaccent') ORDER BY 1;").split("\n")
        out = {"postgres": version, "extensions": [e for e in ext if e], "grilles": {}}
        for gnom, noeuds in {"A_53_noeuds": nd["noeuds"], "B_325_noeuds": nd["noeuds"] + nd["distracteurs"]}.items():
            psql("DROP TABLE IF EXISTS noeud; CREATE TABLE noeud (n int PRIMARY KEY, id text, libelle text);")
            psql("INSERT INTO noeud VALUES " + ",".join(f"({k},{lit(n['id'])},{lit(n['libelle'])})" for k, n in enumerate(noeuds)) + ";")
            ids = [n["id"] for n in noeuds]
            res = {"similarity": [], "word_similarity": [], "fts_ts_rank_cd": [], "ms": {}}
            for o in obs:
                q = lit(o["texte"])
                i = ids.index(o["attendu"])
                t0 = time.perf_counter()
                lignes = psql(f"""
                  SELECT n,
                    similarity(unaccent(libelle), unaccent({q})),
                    word_similarity(unaccent(libelle), unaccent({q})),
                    ts_rank_cd(to_tsvector('french', libelle),
                      to_tsquery('simple', coalesce(nullif(replace(strip(to_tsvector('french', {q}))::text, ' ', ' | '), ''), 'x')))
                  FROM noeud ORDER BY n;""")
                res["ms"].setdefault("par_requete_psql_incl_docker_exec", []).append((time.perf_counter() - t0) * 1000)
                cols = [l.split("\t") for l in lignes.strip().split("\n")]
                for k, nom in enumerate(["similarity", "word_similarity", "fts_ts_rank_cd"]):
                    res[nom].append(rang_pessimiste([float(c[k + 1]) for c in cols], i))
            out["grilles"][gnom] = {k: v for k, v in res.items()}
        # explication du plan sur la grille B (exemple, pour la section index)
        out["resume"] = {}
        for g, r in out["grilles"].items():
            out["resume"][g] = {k: {"top1": sum(1 for x in r[k] if x <= 1), "top3": sum(1 for x in r[k] if x <= 3)} for k in ["similarity", "word_similarity", "fts_ts_rank_cd"]}
        Path(a.sortie).write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(version, out["extensions"])
        for g, r in out["resume"].items():
            for k, v in r.items():
                print(f"{k:18} {g:13} top1 {v['top1']:>2}/30  top3 {v['top3']:>2}/30")
    finally:
        subprocess.run(["docker", "rm", "-f", NOM], capture_output=True)


if __name__ == "__main__":
    main()
