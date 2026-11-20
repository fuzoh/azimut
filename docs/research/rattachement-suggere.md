# Rattachement suggéré d'une observation : embeddings locaux ou recherche lexicale

Ticket : fuzoh/azimut#85 (recherche préalable au grill de #79). Étude du 2026-11-20. Sources primaires uniquement (fiches de modèles et dépôts sur Hugging Face, dépôts GitHub, documentation PostgreSQL, README de pgvector, registre npm). Statut : faits et mesures. Aucune décision, aucun choix de modèle.

Vocabulaire de [`GLOSSARY.md`](../../GLOSSARY.md) : **observation**, **rattachement**, **nœud**. Contexte : [spec des observations](../analyse/22-spec-observations.md) (§3 : rattachement facultatif, « pas de suggestion automatique en tranche 1 »), #62 (rattachement manuel, « rien n'est proposé »), #64 (recherche tolérante).

Les dossiers et scripts de l'essai sont dans [`rattachement-bench/`](rattachement-bench/). Tout chiffre de ce document vient d'une exécution dont la commande figure en section 6, sauf mention « fiche » ou « doc » (chiffre d'une source).

## Résumé

1. **Sur 30 observations fictives et une grille, aucune approche n'est nettement meilleure.** En première position, le meilleur résultat est 18/30 (BM25 sur racines françaises, Python) ; les embeddings locaux vont de 9/30 à 17/30, `pg_trgm` (vrai PostgreSQL 18.4) donne 17/30. En troisième position, tout tient entre 15/30 et 26/30. Avec 30 observations, un écart de 1 à 3 observations n'est pas significatif (l'intervalle à 95 % d'un taux voisin de 55 % est d'environ ±18 points, calcul approché).
2. **Les approches se complètent.** Les observations qui partagent des mots avec un libellé sont mieux trouvées par le lexical ; celles qui n'en partagent aucun (« A compté son monde » pour « Effectif compté ») le sont mieux par les embeddings. Une union « lexical ou embeddings dans le top 3 » (un maximum théorique, pas un classement combiné) couvre 29/30 avec trois des modèles essayés. Aucune des 30 observations n'échappe au top 3 de toutes les approches à la fois, mais deux (9 et 10) ne sont en première position pour aucune.
3. **Les libellés du dépôt sont presque vides de texte.** Le dépôt est public : les grilles A01 et A03 portent des libellés abrégés (« A 1.1 indicateur 3 ») et G3 compte 272 nœuds génériques (« E4 critère 3 indicateur 2 ») sur 325. Seuls 53 nœuds de G3 V2 ont un vrai libellé. L'essai ne mesure donc pas la qualité sur de vrais libellés de qualification.
4. **Le coût d'infrastructure est faible pour quelques centaines de libellés.** 325 libellés en 1024 dimensions pèsent environ 1,3 Mo dans pgvector (formule du README) ; une recherche exacte suffit, sans index. Encoder la grille complète prend 0,5 à 6 s sur CPU selon le modèle (4 threads). Le coût réel est le poids du modèle (470 Mo à 2,3 Go en fichier de poids original) et son hébergement, pas le stockage.
5. **Toutes les approches essayées tournent sans réseau**, donc sans envoi de l'observation à un tiers. Les API d'embeddings hébergées sont écartées pour cette raison (section 5).

## 1. Modèles d'embeddings multilingues utilisables sans API externe

Fiches lues le 2026-11-20 via l'API de Hugging Face (`https://huggingface.co/api/models/<id>?blobs=true`). Les révisions sont celles du dépôt à cette date et sont épinglées dans `bench.py`.

| Modèle | Licence (fiche) | Paramètres | Dimension | Séquence max | Fichier de poids d'origine | Préfixes |
| --- | --- | --- | --- | --- | --- | --- |
| [`intfloat/multilingual-e5-small`](https://huggingface.co/intfloat/multilingual-e5-small) | MIT | 117,7 M | 384 | 512 jetons | 470,6 Mo (`model.safetensors`) | `query: ` / `passage: ` obligatoires |
| [`intfloat/multilingual-e5-base`](https://huggingface.co/intfloat/multilingual-e5-base) | MIT | 278,0 M | 768 | 512 jetons | 1,11 Go | idem |
| [`BAAI/bge-m3`](https://huggingface.co/BAAI/bge-m3) | MIT | 567,8 M (mesuré) | 1024 | 8192 jetons | 2,27 Go (`pytorch_model.bin`) | aucun pour les requêtes (fiche) |
| [`sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2) | Apache-2.0 | 117,7 M | 384 | 128 jetons | 470,6 Mo | aucun |
| [`Qwen/Qwen3-Embedding-0.6B`](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B) | Apache-2.0 | 595,8 M | 1024 | 32 768 (mesuré) | 1,19 Go (bf16) | requête avec instruction (`prompt_name="query"`) |
| [`google/embeddinggemma-300m`](https://huggingface.co/google/embeddinggemma-300m) | licence « gemma » (fiche), dépôt à accès **manuel** (`gated: manual`) | 302,9 M | non vérifié | non vérifié | 1,21 Go | non vérifié |

Remarques de fiche :

- Les fiches e5 imposent le préfixe (« Each input text should start with "query: " or "passage: ", even for non-English texts ») et indiquent que les textes longs sont tronqués à 512 jetons.
- La fiche de bge-m3 annonce plus de 100 langues, des textes jusqu'à 8192 jetons et « no longer requires adding instructions to the queries ».
- La fiche de MiniLM décrit un espace de 384 dimensions et `max_seq_length: 128` (`sentence_bert_config.json`).
- **EmbeddingGemma** n'a pas été essayé : le dépôt est à accès manuel (acceptation de la licence Gemma, soumise à approbation), ce qui ne se télécharge pas de façon automatisée et reproductible. Sa licence n'est pas une licence libre standard : à lire par une personne avant tout usage.
- **Qualité annoncée en français sur textes courts** : aucune des fiches lues ne donne de chiffre propre à des observations courtes en français. Le banc de référence existe : MTEB-French ([arXiv 2405.20468](https://arxiv.org/abs/2405.20468), 2024-05-30), mais ses scores par modèle n'ont pas été extraits ici (tableau de classement dynamique, non lu). La qualité réelle sur nos textes ne ressort que de l'essai de la section 6.

### Exécution sur un serveur sans GPU

Mesuré ici (section 6) avec `sentence-transformers` 6.3.0, PyTorch 2.15.0 (roue CPU), **4 threads**, sur un poste de bureau (AMD Ryzen AI Max+ 395, 32 threads logiques). Ce n'est pas un VPS : la latence d'un petit serveur partagé serait plus haute. Latence d'une requête isolée (une observation, taille de lot 1), médiane et 95e centile sur les 30 observations, après un échauffement :

| Modèle | Médiane | p95 | Encoder 53 libellés | Encoder 325 libellés |
| --- | --- | --- | --- | --- |
| paraphrase-multilingual-MiniLM-L12-v2 | 6,8 ms | 7,8 ms | 0,11 s | 0,46 s |
| multilingual-e5-small | 7,2 ms | 7,7 ms | 0,10 s | 0,54 s |
| multilingual-e5-base | 21,6 ms | 23,9 ms | 0,38 s | 2,01 s |
| Qwen3-Embedding-0.6B | 42,1 ms | 45,3 ms | 0,37 s | 2,07 s |
| bge-m3 | 74,7 ms | 77,7 ms | 1,19 s | 6,09 s |

Non mesuré : consommation mémoire par modèle (le pic mémoire du processus est cumulatif sur les cinq modèles chargés à la suite, il n'est donc pas attribuable à l'un d'eux), temps de chargement à froid (la première exécution inclut le téléchargement), débit sous charge simultanée (une cinquantaine de formateurs, `docs/TODO.md`).

### Exécution dans le navigateur

- [Transformers.js](https://github.com/huggingface/transformers.js) (paquet npm `@huggingface/transformers` 4.3.2, Apache-2.0, dernier push du dépôt le 2026-11-18) exécute par défaut sur CPU via WASM ; `device: 'webgpu'` bascule sur GPU (API signalée « expérimentale dans de nombreux navigateurs » par le README). `dtype` permet des poids quantifiés : `q8` par défaut en WASM, `q4` possible (README).
- Des conversions ONNX existent (listing d'API Hugging Face, 2026-11-20) : `Xenova/multilingual-e5-small` (`model_quantized.onnx` 118,3 Mo ; `model_q4.onnx` 398,6 Mo), `Xenova/multilingual-e5-base` (278,6 Mo en quantifié), `Xenova/paraphrase-multilingual-MiniLM-L12-v2` (118,3 Mo), `Xenova/bge-m3` (licence MIT ; 569,7 Mo en quantifié). Les dépôts `Xenova/` e5 et MiniLM ne déclarent pas de licence dans leurs métadonnées ; la licence du modèle d'origine est MIT ou Apache-2.0 (tableau ci-dessus).
- **Non exécuté ici** : aucune mesure dans un navigateur, donc ni latence, ni taille réellement téléchargée, ni équivalence de résultats entre poids quantifiés et poids d'origine. Les chiffres de l'essai sont ceux des poids d'origine sous PyTorch.
- Dans le navigateur, le modèle (118 à 570 Mo selon la quantification) serait à télécharger sur l'appareil du formateur ; la spec prévoit un usage sur téléphone et sans réseau (`22` §4), non évalué ici.

## 2. Stockage et recherche de vecteurs avec Postgres

- **pgvector** ([dépôt](https://github.com/pgvector/pgvector), dernière étiquette `v0.8.7`, licence « PostgreSQL License » d'après le fichier `LICENSE`, README du 2026-11-20) : Postgres 13+, recherche exacte par défaut (« perfect recall »), index approchés HNSW et IVFFlat en option. Distances : L2, produit scalaire, cosinus (`<=>`), L1.
- **Taille** : « Each vector takes `4 * dimensions + 8` bytes » (README), jusqu'à 16 000 dimensions ; index limités à 2 000 dimensions pour `vector` et 4 000 pour `halfvec`. Par calcul sur cette formule : 325 libellés × 1024 dimensions ≈ 1,33 Mo ; 2000 nœuds (volume visé par grille, [signaux.md](signaux.md)) × 1024 ≈ 8,2 Mo ; en 384 dimensions, 325 libellés ≈ 0,5 Mo.
- **Index inutile à cette échelle** : quelques centaines de vecteurs se parcourent en entier ; le README précise que la recherche exacte est le comportement par défaut. Non mesuré ici dans Postgres (pgvector n'a pas été installé, seule l'image officielle `postgres:18.4` a été utilisée) ; la comparaison de l'essai a été faite en Python (produit scalaire sur vecteurs normalisés).
- **Alternative sans extension** : stocker les vecteurs dans une colonne `real[]` ou `bytea` et comparer côté application ; non essayé.
- **Recalcul** : une copie de grille (18 §9) ou la modification d'un libellé implique de recalculer les vecteurs des libellés touchés. Coût mesuré : 0,5 à 6 s pour 325 libellés selon le modèle (section 1). Un changement de modèle impose de tout recalculer et de changer la dimension de la colonne.
- **Hébergement** : pgvector figure dans la liste des extensions disponibles chez de nombreux hébergeurs (README, section « Hosted Postgres »). Sa disponibilité chez un hébergeur suisse précis n'a pas été vérifiée (hébergeur non choisi, `docs/analyse/28-choix-techniques.md`).
- **Recherche hybride** : le README décrit l'usage conjoint avec la recherche plein texte Postgres, avec fusion par rang réciproque (RRF) ou ré-ordonnancement. Non essayé ici (voir l'union de la section 6 pour un majorant).

## 3. Recherche lexicale tolérante (référence de #64)

- **`pg_trgm`** ([doc](https://www.postgresql.org/docs/current/pgtrgm.html)) : trigrammes, `similarity()`, `word_similarity()`, seuils par défaut 0,3 (`%`), 0,6 (`<%`) et 0,5 (`<<%`) ; index GiST et GIN ; module « trusted ». Il ignore les caractères non alphanumériques et ne retire pas les accents : il faut y adjoindre `unaccent` (« trusted » aussi, [doc](https://www.postgresql.org/docs/current/unaccent.html)).
- **Recherche plein texte** ([doc](https://www.postgresql.org/docs/current/textsearch-dictionaries.html)) : la configuration `french` s'appuie sur un dictionnaire Snowball (racinisation). `ts_rank_cd` est un classement par densité de couverture (Clarke, Cormack, Tudhope, 1999) ; la doc précise que les fonctions de classement « do not use any global information », donc **pas de BM25 natif** dans PostgreSQL (pas de pondération par fréquence inverse de document).
- Documentation consultée sur la version courante du site au 2026-11-20 (PostgreSQL 19 vient de sortir, 2026-11-19). L'essai tourne sur **PostgreSQL 18.4** avec `pg_trgm` 1.6 et `unaccent` 1.1.

## 4. Granularité et ambiguïtés de la grille (observées pendant l'essai)

Faits relevés sur la grille G3 V2 :

- Des libellés sont **identiques à un numéro près** (`E1#1 Objectifs` et `E1#2 Objectifs`, deux occurrences d'un exercice, `18 §4`) : aucune approche ne peut les départager sans indice dans le texte (les observations 13, 14 et 15 donnent un indice « 1re » ou « 2e planif » que seuls certains modèles exploitent peut-être ; non analysé).
- Un même contenu a plusieurs nœuds défendables (`Sécurité du jeu`, `SJ2 Règles de sécurité annoncées`, `M1 Assure la sécurité de ses activités`, `Domaine Sécurité`). Le jeu d'essai n'attend qu'un nœud par observation : c'est une limite (section 7).
- Les libellés génériques (272 sur 325) ne sont pas « suggérables » par leur texte. Une suggestion ne peut viser que les nœuds dont le libellé dit quelque chose.

## 5. Données personnelles et hébergement

- Une observation est une donnée personnelle sur un participant, souvent mineur (ticket #79 ; le commentaire de triage de #79 cite `docs/analyse/24` et `27`, C-14, non relus ici). Le projet vise un hébergement en Suisse (`docs/TODO.md`, ligne « Hébergement »). La nLPD est citée dans `docs/TODO.md` ; son texte n'a pas été relu pour cette étude et aucune analyse juridique n'est faite ici.
- **Toutes les approches de l'essai s'exécutent sans réseau** une fois les poids téléchargés depuis Hugging Face. Le texte d'une observation ne quitte pas la machine. Les poids du modèle, eux, sont téléchargés depuis un tiers (Hugging Face) au déploiement, sans donnée du projet.
- **API d'embeddings hébergées par un tiers : écartées** pour l'essai, car chaque appel enverrait le texte de l'observation à un sous-traitant (hors Suisse dans le cas général, contrat de sous-traitance à prévoir). Aucune n'a été utilisée ni évaluée.
- Les vecteurs d'une observation sont eux-mêmes dérivés d'une donnée personnelle. Ce document ne dit pas s'ils en sont une au sens de la loi (question pour le juriste, section 8). Les vecteurs des **libellés** de grille ne portent aucune donnée personnelle.
- Les observations de l'essai sont **fictives** ; seul prénom : « Sacha », inventé. Aucune donnée réelle n'a été utilisée.

## 6. Essai chiffré

### Protocole

- **Grille** : G3 V2 « Moniteur camp » (cours fictif), fichier [`g3-v2-structure.json`](../analyse/corpus-prototype/g3-v2-structure.json) ([description](../analyse/corpus-prototype/g3-moniteur-camp.md)). C'est la seule grille du corpus dont les libellés ne sont pas abrégés pour la publication ; A01 et A03 sont abrégées (`a01-qualif1.md`). [`exporter-noeuds.py`](rattachement-bench/exporter-noeuds.py) produit [`noeuds.json`](rattachement-bench/noeuds.json) : **53 nœuds à libellé textuel** (grille « A ») et **272 nœuds génériques** ajoutés comme distracteurs (grille « B », 325 nœuds). Exclus avant mesure : seuils (`seuil:*`), agrégats sans texte (`E2`, `Réussite`, `Minimaux remplis`…), nœuds de remarques.
- **Observations** : [`observations.json`](rattachement-bench/observations.json), **30 observations fictives**, courtes et elliptiques, avec le nœud attendu. **Les nœuds attendus ont été écrits avant la première exécution et le jeu n'a pas été retouché après avoir vu les résultats.** Chaque observation porte une catégorie fixée à l'écriture : *lexical* (13, partage un mot ou une racine avec le libellé), *paraphrase* (13, aucun mot en commun), *ambigu* (4, plusieurs nœuds défendables ou occurrence à deviner).
- **Texte comparé** : le libellé seul (« SR1 Lampes contrôlées »), sans chemin ni parent. Pour e5 : préfixes `query: ` (observation) et `passage: ` (libellé).
- **Règle de rang pessimiste** : le nœud attendu est dans le top-k seulement si moins de k *autres* nœuds ont un score supérieur ou égal au sien. Une égalité, y compris un score nul, compte contre l'approche.
- **Approches** :
  - `pg_trgm` dans un **vrai PostgreSQL 18.4** (conteneur jetable) : `similarity()` et `word_similarity()` sur `unaccent(...)` ; `ts_rank_cd` avec la configuration `french` (requête en OU sur les racines de l'observation).
  - **Équivalents Python** : trigrammes (réimplémentation de `similarity()` et approximation de `word_similarity()`) et BM25 sur racines Snowball françaises (`snowballstemmer` 3.1.1, k1 = 1,2, b = 0,75, idf calculé sur les seuls libellés).
  - **Embeddings locaux** : cinq modèles, similarité cosinus, poids d'origine, CPU, 4 threads.

### Résultats (grille A, 53 nœuds, 30 observations)

| Approche | Top 1 | Top 3 | Top 1 lexical (13) | Top 1 paraphrase (13) | Top 1 ambigu (4) |
| --- | --- | --- | --- | --- | --- |
| PostgreSQL `pg_trgm` `similarity()` | 17/30 | 25/30 | non détaillé | non détaillé | non détaillé |
| PostgreSQL `pg_trgm` `word_similarity()` | 11/30 | 25/30 | non détaillé | non détaillé | non détaillé |
| PostgreSQL plein texte `french`, `ts_rank_cd` | 9/30 | 19/30 | non détaillé | non détaillé | non détaillé |
| Python : trigrammes `similarity` | 16/30 | 25/30 | 8 | 6 | 2 |
| Python : trigrammes `word_similarity` (approx.) | 12/30 | 26/30 | 6 | 5 | 1 |
| Python : BM25 racines françaises | 18/30 | 22/30 | 9 | 8 | 1 |
| multilingual-e5-small | 11/30 | 21/30 | 5 | 5 | 1 |
| multilingual-e5-base | 17/30 | 20/30 | 9 | 5 | 3 |
| bge-m3 | 16/30 | 22/30 | 7 | 7 | 2 |
| Qwen3-Embedding-0.6B | 17/30 | 22/30 | 8 | 7 | 2 |
| paraphrase-multilingual-MiniLM-L12-v2 | 9/30 | 15/30 | 5 | 3 | 1 |

Grille B (325 nœuds dont 272 génériques) : PostgreSQL `similarity` 17/25, `word_similarity` 11/24, plein texte 9/18 ; Python trigrammes et BM25 inchangés ; embeddings : e5-small 11/20, e5-base 16/20, bge-m3 16/22, Qwen3 17/22, MiniLM 9/15 (top 1 / top 3 sur 30). Les 272 distracteurs génériques ont peu changé les résultats (au plus une observation d'écart par approche et par colonne, sauf plein texte PostgreSQL : 19 à 18 en top 3) ; cause non analysée.

Écarts entre les deux implémentations du lexical : `pg_trgm` réel (17/25) et ma réimplémentation (16/25), `word_similarity` réelle (11/25) et approchée (12/26). L'écart vient de ma réimplémentation (approximation de `word_similarity`, détails de normalisation), pas d'une propriété des approches. Le chiffre PostgreSQL fait foi pour `pg_trgm`.

### Complémentarité (grille A, [`complementarite.py`](rattachement-bench/complementarite.py))

Union = observations dont le nœud attendu est dans le top-k d'**au moins une** des deux approches. C'est un majorant, pas un classement fusionné (pas de RRF essayé).

| Top 1 | Seul | Union avec (trigrammes ∪ BM25 = 20/30) |
| --- | --- | --- |
| e5-base | 17/30 | 27/30 |
| Qwen3 | 17/30 | 24/30 |
| MiniLM | 9/30 | 23/30 |
| e5-small / bge-m3 | 11/30 / 16/30 | 22/30 / 22/30 |

En top 3, l'union trigrammes ∪ BM25 donne 26/30 ; avec e5-base, MiniLM ou bge-m3 elle monte à 29/30. Les observations 9 et 10 (« consignes ») ne sont en première position pour aucune approche : les libellés `Consignes E2` et `Consignes E3` sont voisins et l'observation cite le jeu ou la randonnée par une paraphrase.

### Lecture factuelle

- Toutes les approches échouent complètement (rang 53) sur l'observation 22 (« Travaille bien avec Sacha, partage les tâches ») en lexical : aucune racine commune avec « Collaboration » ; les cinq modèles d'embeddings la placent entre le rang 1 et le rang 7 (rangs 2, 7, 1, 1 et 4 pour MiniLM, e5-small, e5-base, bge-m3 et Qwen3).
- Les modèles de plus de 500 M de paramètres ne dominent pas : e5-base (278 M) fait aussi bien en première position que bge-m3 et Qwen3. e5-small et MiniLM, les moins coûteux, sont en dessous du lexical en première position (11/30 et 9/30 contre 16 à 18/30).
- Le temps de calcul lexical est négligeable à cette taille (Python : 0,12 ms par requête pour BM25, 0,76 ms pour la similarité par trigrammes, 12 ms pour l'approximation de `word_similarity`), de 7 à 75 ms pour un embedding de requête en CPU 4 threads. Les durées d'exécution de `pg_bench.py` incluent un `docker exec` par requête et ne mesurent pas la latence de PostgreSQL ; elles ne sont pas citées.

### Limites de l'essai

- **30 observations, une seule grille, une seule rédactrice ou rédacteur** (l'agent), avec ses habitudes d'écriture : les observations de vrais responsables seront plus bruitées, plus courtes, avec des abréviations, des fautes, des prénoms, du jargon de camp (sigles, noms de jeux, « veillée »). L'ordre de grandeur est utile, pas le chiffre.
- Un écart de 1 à 3 observations n'est pas significatif (±18 points environ à 95 %).
- **Libellés de G3 V2 seulement**, et la grille est fictive : ses libellés sont courts (« E1#1 Matériel prêt »). Les vraies grilles ont des textes d'indicateurs plus longs (non disponibles dans le dépôt public). Aucun essai sur les niveaux sphère, objectif, critère de vraies qualifications.
- **Un seul nœud attendu par observation**, alors que la spec autorise plusieurs rattachements et qu'un même contenu a plusieurs nœuds défendables. Le taux « bon nœud » est donc un plancher.
- Libellé seul, sans chemin hiérarchique, sans sinonymes, sans réglage : aucun réglage des seuils, des préfixes ou du BM25 n'a été essayé. L'idf du BM25 est calculé sur 53 courts libellés, donc peu informatif.
- Pas de réglage fin (fine-tuning), pas de modèle de reclassement (cross-encoder), pas de fusion RRF, pas de recherche hybride réelle.
- Latences : poste de bureau, 4 threads, requête isolée, aucune charge concurrente ; pas de mesure dans le navigateur, pas de mémoire par modèle, pas de pgvector installé.
- Embeddings en poids d'origine ; les versions quantifiées pour le navigateur peuvent donner d'autres rangs.
- Qwen3 et EmbeddingGemma n'étaient pas dans la liste de départ de la question ; Qwen3 a été ajouté comme cinquième modèle, EmbeddingGemma écarté (accès manuel).

### Commandes pour reproduire

Prérequis : `uv`, Docker avec l'image `postgres:18.4` (pour `pg_bench.py`), accès réseau à Hugging Face et à l'index de roues CPU de PyTorch. Depuis la racine du dépôt :

```
cd docs/research/rattachement-bench
uv run exporter-noeuds.py                  # régénère noeuds.json depuis le corpus
HF_HOME=/tmp/rattachement-hf CUDA_VISIBLE_DEVICES="" uv run bench.py --threads 4   # écrit resultats.json (~4 Go de poids téléchargés)
uv run pg_bench.py                         # écrit resultats-pg.json (conteneur jetable, supprimé à la fin)
uv run complementarite.py                  # lit resultats.json, écrit sur la sortie standard
```

`HF_HOME` place le cache des poids hors du dépôt ; ne rien versionner de ce cache. Les latences varient d'une machine à l'autre ; les rangs ne dépendent pas des latences. Les sorties de la présente étude sont versionnées : [`resultats.json`](rattachement-bench/resultats.json) (rangs par observation et approche, latences, révisions des modèles), [`resultats-pg.json`](rattachement-bench/resultats-pg.json), [`complementarite.txt`](rattachement-bench/complementarite.txt).

## 7. À vérifier (non fait ici)

- Qualité sur de **vraies observations** et de **vrais libellés** (textes d'indicateurs complets), avec les formateurs ; ce que le dépôt public ne contient pas.
- Taux « bon nœud » avec plusieurs nœuds acceptables par observation.
- Latence et mémoire dans un navigateur (Transformers.js, WASM et WebGPU), poids quantifiés compris.
- pgvector dans la pile réelle : disponibilité chez l'hébergeur suisse, coût dans la même base que les autres données.
- Fusion lexical + embeddings (RRF) mesurée, et seuil de confiance en dessous duquel ne rien proposer.
- Charge simultanée d'une cinquantaine de formateurs sur un serveur sans GPU.
- Statut juridique d'un vecteur d'embedding calculé sur une observation.
- Licence d'EmbeddingGemma (lecture humaine) et score MTEB-French par modèle (classement non extrait ici).

## 8. Questions que le grill de #79 devra trancher

Sans les trancher ici :

1. **Suggestion ou rattachement automatique ?** Proposer des nœuds qu'une personne confirme, ou poser un rattachement marqué « automatique » ? (spec 22 §3 : « générale par défaut »).
2. **À quel moment ?** À la saisie, en arrière-plan, ou à la relecture à côté de la case (spec 22 §4 : saisie sans friction) ?
3. **Quel seuil justifie de construire ?** Quel taux de bon nœud en première et en troisième position, mesuré sur quoi, face à la recherche lexicale de #64 ? Ce seuil est à fixer avant de lire de nouveaux résultats.
4. **Où tourne le modèle ?** Serveur sans GPU (coût d'hébergement, poids de 0,5 à 2,3 Go à héberger en Suisse) ou navigateur (téléchargement de 118 à 570 Mo par appareil, usage sans réseau) ? Quel statut juridique pour les vecteurs d'observations, et pour le téléchargement initial des poids depuis un tiers ?
5. **À quelle granularité ?** Sphère et objectif, ou jusqu'à l'indicateur, sachant que les libellés génériques ne se suggèrent pas par leur texte ?
6. **Quel texte comparer ?** Libellé seul ou chemin complet (exercice, objectif, indicateur) ; que faire de deux occurrences d'un même exercice ?
7. **Quel gain face à une recherche lexicale améliorée ?** Compte tenu de la complémentarité observée, faut-il un ensemble des deux, ou la recherche de #64 suffit-elle ?
8. **Quelle trace de l'origine** d'un rattachement (personne ou suggestion), et que devient-il à la copie de grille ?
9. **Quand et comment recalculer** les vecteurs (copie de grille, modification d'un libellé, changement de modèle) ?
10. **Quel jeu de test réel** (observations réelles anonymisées, avec accord), et qui l'écrit ?

## 9. Sources

- Fiches et API Hugging Face : [multilingual-e5-small](https://huggingface.co/intfloat/multilingual-e5-small), [multilingual-e5-base](https://huggingface.co/intfloat/multilingual-e5-base), [bge-m3](https://huggingface.co/BAAI/bge-m3), [paraphrase-multilingual-MiniLM-L12-v2](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2), [Qwen3-Embedding-0.6B](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B), [embeddinggemma-300m](https://huggingface.co/google/embeddinggemma-300m), [Xenova/multilingual-e5-small](https://huggingface.co/Xenova/multilingual-e5-small), [Xenova/bge-m3](https://huggingface.co/Xenova/bge-m3). Consultées le 2026-11-20.
- [MTEB-French, arXiv 2405.20468](https://arxiv.org/abs/2405.20468).
- [pgvector](https://github.com/pgvector/pgvector) : README, `LICENSE`, `CHANGELOG.md`, étiquettes.
- PostgreSQL : [`pg_trgm`](https://www.postgresql.org/docs/current/pgtrgm.html), [`unaccent`](https://www.postgresql.org/docs/current/unaccent.html), [dictionnaires de recherche plein texte](https://www.postgresql.org/docs/current/textsearch-dictionaries.html), [classement des résultats](https://www.postgresql.org/docs/current/textsearch-controls.html).
- [Transformers.js](https://github.com/huggingface/transformers.js) : README, `LICENSE` ; registre npm (`@huggingface/transformers` 4.3.2).
- Dépôt : `docs/analyse/22-spec-observations.md`, `docs/analyse/corpus-prototype/`, `docs/TODO.md`, tickets #29, #59, #62, #64, #79, #85.
- Non consultées : documentation Context7 (quota mensuel atteint), pages dynamiques du classement MTEB.
