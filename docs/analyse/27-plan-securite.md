# Plan de sécurité

Ce document propose un plan de sécurité pour Azimut : ce qu'on protège, contre qui, et quels contrôles mettre en place à chaque phase, de la fondation à la production.

> **Statut : proposition du 15 novembre 2026, pas une décision.** Rien de ce qui est décrit ici n'est construit : le dépôt ne contient que de la documentation et un prototype jetable du calcul (`prototype/`), sans serveur, sans CI (`.github/` n'existe pas) et sans donnée réelle. [18 — Décisions définitives](18-decisions-definitives.md) fait foi pour le modèle ; ce plan ne le rouvre pas, sauf là où il le signale. **La partie nLPD n'a pas été vérifiée sur les textes officiels et n'est pas un avis juridique.** Rédigé par des agents à partir de sept analyses de menaces et de trois contre-analyses (non versionnées), puis révisé après une relecture indépendante. À valider par le propriétaire du dépôt.

Convention : **[V]** = vérifié dans le dépôt (fichier et section) ; **[D]** = déduit ou su de mémoire, à confirmer. Tout fait de mémoire sur une bibliothèque (Better Auth, Elysia, TanStack DB, Electric, hitobito, Bun) est **à vérifier dans la documentation**. Dans les tableaux du plan, **[cher]** marque un contrôle cher à rattraper s'il n'est pas fait à la phase indiquée. Au §4, entre parenthèses, les domaines d'analyse d'où vient chaque menace (AUTHN, AUTHZ, PRIV, APP, INFRA, CHAINE, INT) ; l'annexe les détaille. « Ticket » renvoie à `docs/wayfinder/`, avec son chemin.

## TL;DR

- **Le risque réaliste vient de l'intérieur et de l'exploitation**, pas d'un attaquant ciblé : un formateur qui lit ou change ce qu'il ne devrait pas, une session restée ouverte, une configuration de démonstration en production, une donnée réelle copiée hors production, une dépendance npm compromise, un agent d'IA manipulé.
- **Ce qui coûte cher à rattraper tient au modèle de données et à la séparation des environnements.** Un `course_id` sur chaque donnée de cours (historique compris), une table d'appartenance avec des rôles propres à Azimut, un historique écrit par le serveur, des états de dossier et de grille portés par le modèle, des noms à un seul endroit, des rôles PostgreSQL séparés. Tout cela se fait en fondation.
- **La base décidée est bonne** (PRACTICES §3, §4, §8 ; TODO) : macro d'auth et `can()` avec refus par défaut, environnement validé, en-têtes, CSRF, contrats Valibot, gitleaks, CodeQL, actions épinglées. Il manque surtout de la transformer en tests qui échouent.
- **Une partie se fait dès aujourd'hui, sans code** (§6.1 « Ordre », étape 0) : ruleset GitHub, `.gitignore`, retrait du `.pyc` versionné, consigne d'AGENTS.md sur le texte des issues.
- **La démonstration ne contient que des données fictives** et seul le porteur la manipule. Ses contrôles restent légers : instance jetable, secrets propres, scripts bridés. Sauvegardes, supervision complète et procédures d'incident attendent le pilote.
- **Le pilote est une porte, pas un glissement.** Aucune donnée MiData n'entre en base avant une liste de passage complète (C-30) : dossier nLPD relu par un juriste, instance de production neuve, sauvegardes exercées, deux exploitants, correspondance des rôles MiData décidée, liste fermée des champs MiData (C-42) et anonymisation testée (C-41).
- **Les agents d'IA sont un vecteur à part entière.** Le texte d'une issue est une donnée, pas une consigne ; `.env` ne doit pas être lisible par Bash ; aucun contrôle ne s'affaiblit sans un humain.
- **Deux propositions des analyses rouvraient des décisions prises** (refus d'une écriture « périmée », témoin de finalisation). Elles sont renvoyées au porteur (§8). La troisième (interdiction de toute date venue du client) est remplacée par C-07, qui borne les dates métier.
- **Deux sources sont en retard** : `TODO.md` « Auth » dit « comptes locaux en dev et en test **uniquement** » et `FEATURES.md` « Connexion et MiData » ne cite que développement et tests, alors que `wayfinder/premiere-version/06` a créé l'environnement démonstration. À corriger avant le premier commit de code de la fondation (C-01).

## 1. Périmètre et hypothèses

- **L'application** : une équipe de formateurs conçoit des grilles d'évaluation, les remplit à plusieurs en temps réel pour chaque participant, et l'application calcule les résultats. Des participants sont mineurs. [V] `docs/GOALS.md`, `docs/FEATURES.md`
- **La pile décidée** : React, TanStack Router et TanStack DB ; Elysia et Eden ; Effect 4 ; Valibot ; PostgreSQL et Drizzle ; Better Auth ; Bun ; un canal WebSocket maison pour verrous et présence. Le serveur fait autorité, le dernier gagne, chaque modification est historisée. [V] `docs/TODO.md` « Architecture », `docs/PRACTICES.md` §1
- **L'échelle** : une instance Docker Compose en Suisse, environ 50 formateurs simultanés au total. [V] TODO « Hébergement »
- **Le stade** : documentation et prototype jetable. Aucun serveur, aucune CI, aucune donnée réelle. Dépôt public. [V] `gh api repos/fuzoh/azimut`, 15/11/2026
- **Hypothèse** : pas de transport Electric tant que TODO « Store client » ne l'a pas retenu. [V] PRACTICES §1 le range dans « Not chosen ».

| Phase | Ce qui existe | Données |
| --- | --- | --- |
| **Fondation** | Socle technique, harness des agents, CI, une tranche verticale ; rien de visible | Générées |
| **Démonstration** | Instance en ligne et repli local ; deux comptes (responsable de cours, formateur) ; présentée par le porteur seul [V] `wayfinder/premiere-version/00-carte.md`, `wayfinder/premiere-version/06` | Fictives, remises à zéro par script |
| **Pilote** | Premier vrai cours, connexion MiData, vraies personnes | Réelles, mineurs compris |
| **Production** | Plusieurs cours, exploitation durable, seconde tranche des observations | Réelles |

## 2. Ce qu'on protège

| Actif | Sensibilité | Pourquoi |
| --- | --- | --- |
| Notes, cases, non évalué, dispenses, jokers et leurs justifications | élevée | Fondent la réussite d'un participant ; tout résultat se recalcule depuis elles (18 §10) |
| Commentaires de case et observations | élevée | Texte libre sur des mineurs ; le commentaire est restitué, l'observation reste interne (22 §3) |
| Historique des modifications | élevée | Seule preuve en cas de recours ; garde les anciennes valeurs, donc les textes retirés |
| Structure des grilles et fonctions publiées | élevée | Un seuil changé change tous les résultats ; les fonctions publiées sont immuables (18 §7, §10) |
| Appartenance aux équipes et rôles | élevée | Toute décision d'accès en dépend |
| Identité des participants (nom, nom de scout, groupe, identifiant MiData) | élevée | Rend nominatives toutes les autres données |
| Sessions, identité liée (fournisseur, `sub`), jetons MiData | élevée | Ouvrent Azimut, et MiData au-delà d'Azimut |
| Secrets (session, client OAuth, PostgreSQL, sauvegardes, déploiement) | élevée | Permettent de forger des sessions ou de lire toute la base |
| Sauvegardes et dumps | élevée | Copie complète, souvent moins surveillée, qui survit à l'anonymisation |
| Exports et attestations | élevée | Quittent l'application et tout contrôle |
| Branche `main`, `bun.lock`, workflows, harness des agents | élevée | Tout ce qui y entre finit dans l'image déployée |
| Domaine et DNS | élevée | Qui les détient peut détourner le retour OIDC et les cookies |
| Disponibilité pendant un cours, surtout le dernier soir | élevée | Une panne renvoie l'équipe au tableur (05 §5) |
| Journaux | moyenne | Peuvent contenir des textes saisis, des jetons, des IP |
| Brouillons, file d'envoi et données sur l'appareil | moyenne | Téléphones personnels, parfois partagés ou perdus |
| Présence et verrous | faible | Révèlent qui travaille sur quel participant, sensible seulement hors de l'équipe |
| Instance de démonstration | faible | Données fictives ; le risque est qu'elle serve de modèle à la production |

## 3. Qui peut nuire

Du plus au moins probable.

1. **Le formateur de bonne foi qui se trompe** : écrase une saisie, finalise trop tôt, copie la mauvaise grille, saisit sur le poste d'un collègue, garde un export sur son ordinateur.
2. **L'exploitant ou le développeur qui se trompe** : configuration de démonstration en production, port PostgreSQL publié, dump copié sur un portable, script de remise à zéro sur la mauvaise base.
3. **L'agent d'IA** : affaiblit un seuil pour faire passer la CI, oublie `can()` sur une route, obéit à une consigne cachée dans une issue publique.
4. **Le formateur indiscret ou partial** : lit un autre cours par un identifiant, change une note après la réunion, pose un joker sans raison, note un participant avec qui il a un lien personnel (05 §6 M1), prête son compte, garde ses droits après avoir quitté l'équipe.
5. **L'écosystème npm** : une dépendance compromise qui s'exécute à l'installation.
6. **Le robot opportuniste** : essaie `demo/demo` sur l'instance publique, sonde les ports ouverts.
7. **Le tiers qui trouve un appareil** ou reçoit un lien.
8. **L'administrateur curieux** : lit la base par `psql`.
9. **L'attaquant ciblé** capable de compromettre GitHub ou le registre npm : hors de portée, accepté (§9).

## 4. Les risques principaux

| ID | Scénario en une phrase | Vrais. | Impact | Déjà couvert | Écart |
| --- | --- | --- | --- | --- | --- |
| M-01 (AUTHZ, APP, AUTHN) | Un formateur atteint un autre cours par un identifiant, une route de synchronisation ou un abonnement WebSocket | moyenne | élevé | `can()` et grille rôle × route [V] PRACTICES §3 | Le cours n'est pas déduit de l'objet ; le WebSocket n'a aucune règle |
| M-02 (AUTHN, INFRA, INT, AUTHZ) | La production démarre avec des comptes locaux, un secret de démonstration ou une exception « démo » dans `can()` | moyenne | élevé | Env validé [V] TODO « Auth », PRACTICES §3, `wayfinder/premiere-version/06` | Aucun test ; scripts non bridés ; `TODO.md` et `FEATURES.md` en retard |
| M-03 (AUTHN, PRIV, APP, INT) | Une session reste ouverte sur un poste partagé ou un téléphone perdu, avec brouillons et cache lisibles | élevée | moyen | Brouillon local prévu [V] 22 §4, `wayfinder/observations/tickets/06-brouillon-sans-reseau.md` | Ni durée de session, ni purge, ni révocation ; file d'envoi durable non tranchée (§8) |
| M-04 (AUTHZ) | Un ancien membre ou un rôle MiData trop large (aide, cuisine) garde l'accès aux dossiers | élevée | élevé | Rôles PBS [V] PRACTICES §8 ; 05 §6 M2 (proposé) | Correspondance et délai de retrait non décidés |
| M-05 (INT, AUTHZ) | Une note, un seuil ou un joker est changé après coup, ou une action réservée est faite par appel direct | moyenne | élevé | Finalisation, copie, joker tracé [V] 18 §8, §9, §10 | Rien n'est mis en force côté serveur |
| M-06 (INT) | Lors d'un recours, on ne peut pas prouver qui a décidé quoi, ou un résultat finalisé a changé après une mise à jour | moyenne | élevé | Historique des cases [V] TODO ; fonctions immuables [V] 18 §7, §10 | Historique limité aux cases ; aucun contrôle CI des fonctions |
| M-07 (PRIV, INFRA) | L'anonymisation laisse des noms dans l'historique, les copies, les journaux ou les sauvegardes | élevée | élevé | Anonymisation à 3 mois (idée) [V] FEATURES ; 03 K6 | Modèle non pensé pour elle ; aucune rétention de sauvegarde |
| M-08 (PRIV, INFRA, CHAINE) | Des données réelles finissent sur un poste, dans une session d'agent ou dans le dépôt public | élevée | élevé | Données générées pour la démo [V] 00-carte | Aucune règle écrite ni contrôle |
| M-09 (PRIV, AUTHZ, INT, APP) | Un export embarque des contenus internes, part au mauvais destinataire ou contient une formule active | moyenne | élevé | Observations hors restitution [V] 22 §3 | Titulaire, journal, échappement non décidés |
| M-10 (PRIV, APP, INFRA) | Des textes saisis, des jetons ou des IP partent dans les journaux ou un suivi d'erreurs hors de Suisse | élevée | moyen | Journaux JSON [V] PRACTICES §3 | Pas de liste blanche ni de rétention |
| M-11 (APP) | Un texte libre exécute du code chez les collègues, ou une grille pathologique bloque le serveur | moyenne | élevé | CSP, en-têtes, contrats [V] PRACTICES §3 | HTML brut non interdit ; grilles non bornées |
| M-12 (CHAINE) | Un paquet npm compromis s'exécute à l'installation et vole jetons et `.env` | moyenne | élevé | `bun audit`, `--ignore-scripts` pour les bots [V] PRACTICES §3 | Pas d'installation figée ni de liste fermée des scripts ; plages `^` dans `prototype/package.json` [V] |
| M-13 (CHAINE) | Un agent d'IA est manipulé par une issue, lit `.env` par Bash, ou affaiblit un contrôle, et sa PR est fusionnée sans vraie relecture | élevée | élevé | deny/ask, hooks [V] PRACTICES §4 | `settings.json` absent ; `deny Read` ne bloque pas `cat .env` [D] |
| M-14 (INFRA, APP) | Une panne, une migration ratée ou un verrou orphelin bloque la saisie le dernier soir, sans restauration ni second exploitant | moyenne | élevé | Sauvegardes avec restauration testée [V] PRACTICES §3 | Ni fréquence, ni alerte, ni suppléant |
| M-15 (INFRA, CHAINE, INT) | Un secret fuit, un port PostgreSQL est publié, un accès d'administration ou le domaine est pris, et la base est lue ou modifiée hors application | faible | élevé | gitleaks, actions par SHA [V] PRACTICES §3 ; ruleset sur `main` [V] §5 | Rien sur ports, rôles PostgreSQL, 2FA, accès `psql`, registraire |

## 5. Ce qui est déjà décidé

Seul ce qui est écrit dans une source compte ici. Les ajouts proposés figurent au §6.

| Contrôle acquis | Source exacte |
| --- | --- |
| Macro d'auth unique, caller typé, `can()` à moteur pur, rôle `none` par défaut, test qui échoue si une route n'a pas de politique, grille rôle × route | [V] PRACTICES §3 « Auth helper » |
| Environnement validé, `DEPLOY_ENV` distinct de `NODE_ENV`, secrets factices refusés hors développement | [V] PRACTICES §3 « Validated env » |
| Comptes locaux interdits en production ; environnement démonstration à part, sans MiData ; trois cas au démarrage | [V] TODO « Auth » ; `wayfinder/premiere-version/06-grilling-socle-minimal.md` Résolution |
| `SameSite=Lax`, contrôle `Origin` et `Sec-Fetch-Site` sur les routes d'écriture ; origine unique, sans CORS | [V] PRACTICES §3 « Cookies and CSRF » ; TODO « Origine unique » |
| CSP, HSTS, `nosniff`, `DENY` posés dans `onRequest` | [V] PRACTICES §3 « HTTP headers » |
| Limites de débit sur l'auth ; constante de taille de corps partagée par proxy et app | [V] PRACTICES §3 « Limits » |
| Contrats Valibot partagés ; une enveloppe d'erreur à codes ; schémas de réponse exigés par un test | [V] TODO « Contrats » ; PRACTICES §3 |
| Auteur de l'historique tiré de l'utilisateur connecté ; historique append-only écrit dans la même transaction ; UUIDv7 vérifiés | [V] TODO « Historique », « Génération des UUIDv7 » |
| Historique des corrections consultable par les formateurs | [V] 18 §5 ; FEATURES « Historique » |
| Le serveur ne stocke que les données maîtres ; il peut recalculer avec `domain` (exports) | [V] TODO « Données stockées » |
| Fonctions publiées immuables ; rejouabilité ; dossier finalisé verrouillé ; réouverture tracée ; changement de calcul par copie | [V] 18 §7, §9, §10 |
| Joker : quota, justification obligatoire, auteur, date, signalement | [V] 18 §8 |
| Observations hors de toute restitution au participant ; supprimées à l'anonymisation ; pièces jointes en tranche 2, après avis juridique | [V] 22 §3, §6, §8 |
| Images non root, construites en CI, publiées sur GHCR par tag ; migrations en tâche ponctuelle ; squawk ; sauvegardes avec restauration testée ; sonde de disponibilité | [V] PRACTICES §3 « Images », « Data », « Migrations », « Observability » |
| Actions épinglées par SHA, `contents: read` ; CodeQL, `bun audit --audit-level=high`, gitleaks en pre-commit et en CI | [V] PRACTICES §3 « Actions hardening », « CI scans », « Same gates locally and in CI » |
| Garde de configuration du lint (`oxlintrc.test.ts`), CODEOWNERS ; hooks `guard-bash` contre `--no-verify` | [V] PRACTICES §3, §4 « Hooks » |
| Squelette `.claude/settings.json` (deny `Read(./.env)`, ask sur `.github/**`, `.claude/**`, `git push` ; bac à sable avec `registry.npmjs.org` et `github.com`) ; aucun MCP par défaut, jamais `@latest` ; skills vendorisés | [V] PRACTICES §4. **Contenu encore ouvert** : [V] TODO « Technique : décisions ouvertes » |
| OIDC MiData : `genericOAuth`, `discoveryUrl`, PKCE S256, redirect URI https, liste cible des scopes | [V] PRACTICES §8 |
| `main` protégée, toute modification par PR relue | [V] CONTRIBUTING ; [V] ruleset 27321413 lu par `gh api` le 15/11/2026 : PR obligatoire avec 1 approbation, ni suppression ni force push ; pas de contrôle requis ; `require_last_push_approval` désactivé ; acteurs autorisés à contourner non lus |

## 6. Le plan par phases

### 6.1 Fondation

**À ne pas faire ici** : rien qui dépende de MiData, de vraies données ou d'une exploitation durable (sauvegardes chiffrées, supervision, procédures d'incident). Ce serait du coût sans menace, et la fondation est déjà la phase la plus lourde.

#### Ordre

Les contrôles suivent l'ordre de PRACTICES §6, que `wayfinder/premiere-version/02` impose avant la démonstration. Un contrôle arrive avec l'étape qui crée ce qu'il protège ; son test entre dans la même PR.

| Étape | Contenu (PRACTICES §6) | Contrôles |
| --- | --- | --- |
| 0 | Dépôt actuel, sans code, dès maintenant | C-01 ; C-19 (retrait du `.pyc`, `.gitignore`) ; partie GitHub de C-16 (ruleset, 2FA, push protection) ; consigne AGENTS.md de C-17 ; prototype installé avec `bun install --frozen-lockfile --ignore-scripts` [D] à vérifier qu'il fonctionne ainsi |
| 1 | Racine, gate, CI | C-16, C-18 |
| 2 | Harness des agents | C-17 |
| 3 | `contracts`, `domain`, `env`, `testing` | C-02, C-07, C-12, C-14 |
| 4 | Serveur | C-03, C-06, C-09, C-13, C-20 |
| 5 et 6 | Application web, première tranche | C-04, C-05, C-08, C-10, C-11, C-15 |

Les revues nommées ci-dessous sont faites par le propriétaire du dépôt, sauf mention contraire, et laissent une trace : ADR ou commentaire d'approbation de PR qui cite le contrôle.

| ID | Ce qu'on fait | Menaces | Vérification | Coût |
| --- | --- | --- | --- | --- |
| C-01 | Reporter la décision de `wayfinder/premiere-version/06` dans TODO « Auth » et FEATURES « Connexion et MiData » (trois régimes). Créer `docs/adr/` et consigner chaque décision de sécurité tranchée en ADR courte. | M-02 | PR approuvée par le propriétaire ; chaque contrôle « décidé » cite une ADR | faible |
| C-02 **[cher]** | Environnement validé à trois régimes (développement et test, démonstration, production). La production refuse : comptes locaux, secret factice, origine non https, base marquée « démonstration », compte à mot de passe en base. La démonstration refuse toute configuration MiData. Le régime développement refuse d'écouter hors de `localhost`, sauf option explicite `DEV_LAN=1`, refusée hors du régime développement et signalée au démarrage (essai sur un vrai téléphone). `BASE_URL` et origines de confiance viennent de l'environnement, jamais de `Host`. | M-02, M-15 | Tests du schéma `env` par combinaison interdite, dont `DEV_LAN` hors développement ; test de démarrage en CI : image de production avec la configuration de démonstration, arrêt attendu | faible |
| C-03 **[cher]** | Toute route HTTP et la montée WebSocket passent par la macro d'auth et `can()`. Routes publiques listées. `can()` ne lit jamais `DEPLOY_ENV`. Instantané de **toute** la table des routes par environnement : en production, ni inscription, ni mot de passe, ni réinitialisation, ni administration, ni route de test, de seed ou de documentation d'API. | M-01, M-02 | Test de parcours des routes ; instantané versionné, toute modification relue en PR ; `no-restricted-imports` de `env` dans la politique | faible |
| C-04 **[cher]** | Chaque table de cours, historique compris, porte un `course_id` non nul (et `participant_id` s'il y a lieu). Le serveur déduit le cours de l'objet, jamais du corps. Le repository exige un `CourseScope` typé obtenu par `can()`. À la création, le parent doit être du même cours. Hors périmètre, réponse identique à « absent » (404). Jeu « deux cours » dans `testing` et cas « autre cours » obligatoire dans la grille de chaque module. | M-01, M-07 | Test de type du repository ; cas « autre cours » par route ; 404 identique | moyen |
| C-05 **[cher]** | Table d'appartenance (utilisateur, cours, rôle Azimut, source, début, fin, révoqué le). Identité liée par (fournisseur, `sub`), jamais par e-mail. La démonstration utilise la même table. | M-04, M-02 | Tests du moteur de politique sur les dates ; ADR du schéma d'appartenance | faible |
| C-06 **[cher]** | Canal WebSocket : session et `Origin` vérifiées à l'ouverture ; `can()` à chaque abonnement et chaque prise de verrou ; identité de présence tirée de la session ; messages validés ; taille, débit et connexions par utilisateur bornés ; index des sockets par session et par utilisateur ; fermeture à la déconnexion. | M-01, M-11 | Une suite : sans cookie, `Origin` étrangère, sujet d'un autre cours, présence au nom d'autrui, message invalide, déconnexion | moyen |
| C-07 | Contrats stricts : champs inconnus refusés, longueurs maximales. Auteur et horodatage d'enregistrement toujours serveur ; dates métier (moment d'une observation, 22 §3) validées et bornées. Note validée contre le barème ; aucun résultat accepté. Grilles plafonnées (nœuds, arêtes, profondeur, taille). Clé d'idempotence unique ; réautorisation à l'arrivée d'une écriture rejouée. Schémas de réponse qui retirent les champs non déclarés. `sql.raw` interdit hors migrations ; tris et filtres par liste fermée. | M-11, M-05 | Test de parcours étendu aux corps et messages ; champ inconnu, texte trop long, note hors barème, double envoi, observation envoyée en différé ; propriétés fast-check sur graphes énormes | moyen |
| C-08 **[cher]** | Historique structurel : la seule fonction d'écriture du repository exige un événement typé. Couvre cases, non évalué, dispenses, jokers, transitions, observations (décidé) et copies, bascule de grille principale (ajout). Identifiant d'opération pour annuler une saisie par groupe. Écriture SQL directe interdite hors du repository. | M-06, M-05 | Test par repository : une écriture, un événement ; auteur forgé ignoré | moyen |
| C-09 **[cher]** | Rôles PostgreSQL séparés : migration (DDL) et application (DML seul). Sur l'historique, l'application n'a qu'`INSERT` et `SELECT`. Une fonction de purge tracée sert à l'anonymisation et à toute suppression. `scram-sha-256` ; volume nommé à ne jamais supprimer. | M-15, M-06 | Test : `CREATE`, `DROP`, `UPDATE` d'historique échouent avec le rôle applicatif ; GRANT vérifiés après migration | faible |
| C-10 **[cher]** | Modèle conçu pour l'anonymisation : nom d'une personne à un seul endroit, ailleurs des identifiants ; textes libres et leurs anciennes valeurs dans des tables vidables sans casser le calcul. Toute suppression de cours, d'historique ou de texte passe par la fonction de purge tracée de C-09, seul chemin autorisé ; pas de suppression logique sans purge. Elle couvre l'historique des observations ([V] `wayfinder/observations/tickets/09-copie-de-grille-anonymisation.md`). | M-07 | ADR du modèle à la première migration ; test : la fonction de purge appliquée à un cours de test ne laisse aucune référence, historique d'observation compris | faible |
| C-11 **[cher]** | État du dossier (en cours, finalisé, archivé) et statut de grille portés par le modèle, avec provenance des copies. Un point unique du repository vérifie l'état dans la transaction. Le refus testé arrive avec chaque fonctionnalité. | M-05 | ADR du schéma des états ; tests par état quand la fonctionnalité existe | faible |
| C-12 **[cher]** | Corpus de référence (`corpus-prototype`) exécuté en CI sous le navigateur et sous Bun : résultats identiques. Empreinte des sorties par fonction publiée commitée ; la changer fait échouer la CI. | M-06 | Contrôle CI requis | moyen |
| C-13 | Textes libres rendus comme texte ; `dangerouslySetInnerHTML` et `innerHTML` interdits. CSP précise (`script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `connect-src 'self'`), `Referrer-Policy`, `Permissions-Policy` ; aucune ressource tierce. Cookie `HttpOnly`, `Secure`, préfixe `__Host-`, identifiant renouvelé à la connexion. Aucun `GET` qui modifie l'état. L'app ne croit `X-Forwarded-*` que du proxy. | M-11, M-01 | Règle oxlint ; e2e qui injecte des charges XSS ; en-têtes sur 200, 404, 422, 500 ; `Set-Cookie` ; `POST` d'origine étrangère refusé ; `X-Forwarded-For` forgé sans effet | faible |
| C-14 | Logger typé à liste fermée de champs (identifiants, route, code, durée) : ni corps, ni texte saisi, ni cookie, ni jeton. Une 500 ne renvoie ni trace ni SQL ; une 422 donne le chemin du champ, pas sa valeur. | M-10 | Test unitaire du logger ; 500 et 422 provoquées sans fuite | faible |
| C-15 | Stockage sur l'appareil réduit : aucune collection persistée ; seul le brouillon d'observation est local, sous une clé (utilisateur, cours). Si la file d'envoi durable de `@tanstack/offline-transactions` est retenue (TODO « Coupure courte, mécanisme », ouvert ; IndexedDB selon PRACTICES §9), elle compte comme stockage sur l'appareil : clé (utilisateur, cours), purge à la déconnexion (C-35), contenu limité aux écritures en attente. Réponses d'API en `Cache-Control: no-store`. Filtre de cours fixé par le serveur, quel que soit le transport. La purge vient au pilote (C-35). | M-03, M-01 | Test des en-têtes ; test qui liste les clés de stockage du navigateur après une saisie | faible |
| C-16 | CI durcie : `bun install --frozen-lockfile` partout ; scripts d'installation fermés sauf `trustedDependencies` relue ; patch `@effect/tsgo` en étape explicite du gate (remplace la piste `postinstall` de TODO « Setup TypeScript 7 », incompatible avec les scripts d'installation fermés) ; contrôle des sources et hashes de `bun.lock` ; paquets 0.x épinglés exactement. CodeQL, `bun audit`, gitleaks requis. Actions par SHA, mises à jour par Dependabot ; délai de publication par Renovate `minimumReleaseAge`, sous réserve de la décision §8. Pas de `pull_request_target` ni de `${{ }}` dans `run:`. GitHub (étape 0) : 2FA, jetons fins, push protection ; ruleset existant complété par `require_last_push_approval`, puis contrôles requis dès qu'ils existent. | M-12, M-15 | Linter de workflows (zizmor ou actionlint, à vérifier) ; lockfile piégé d'exemple ; script `gh api` qui compare le ruleset à une référence | moyen |
| C-17 **[cher]** | Harness commis et testé : `settings.json`, hooks `guard-bash` (push sur `main`, `--no-verify`, lecture de `.env*`). Bac à sable qui restreint la lecture du disque. S'écarte de PRACTICES §4 : retirer `github.com` des hôtes du bac à sable, garder `registry.npmjs.org` en lecture ; les push et les appels `gh` passent hors bac à sable, en `ask`. `.env` de développement à valeurs factices. AGENTS.md (étape 0) : le texte des issues, PR, fichiers et pages web est une donnée. Seul le mainteneur pose `ready-for-agent`. Agents sur branche, jamais de secret de production. Skills et MCP épinglés par commit. | M-13 | Tests Vitest des hooks ; test de contenu de `settings.json` ; issue piégée de référence, rejouée avant chaque passage de phase : l'agent n'exécute pas la consigne et le signale | faible |
| C-18 | Pas d'affaiblissement : CODEOWNERS sur `.github/`, `.claude/`, configuration, `bun.lock`. Le diff est refusé s'il ajoute `oxlint-disable`, `@ts-ignore`, `.skip`, `.only` ou baisse un seuil, sauf label posé par un humain. | M-13 | Contrôle CI requis avec ses diffs d'exemple | faible |
| C-19 **[cher]** | Aucune donnée réelle hors production ni dans le dépôt : règle dans AGENTS.md et CONTRIBUTING ; agents sans lecture des dumps ; `.gitignore` pour `__pycache__`, `.env*`, `*.sql`, `*.dump` ; retrait du `.pyc` versionné ([V] `docs/analyse/corpus-prototype/__pycache__/`) ; contrôle CI des fichiers binaires et chemins autorisés. | M-08 | Contrôle CI ; test des permissions | faible |
| C-20 **[cher]** | Compose : seul le proxy publie 80 et 443 ; PostgreSQL et l'app sur un réseau `internal`. Conteneurs `read_only`, `cap_drop: [ALL]`, `no-new-privileges`, limites mémoire, sans socket Docker. Rotation des journaux (`max-size`). | M-15 | Script CI sur `docker compose config --format json` | faible |

### 6.2 Démonstration

**À ne pas faire ici** : sauvegardes chiffrées, alertes multiples, deuxième exploitant, attestation de provenance, durées de session fines. L'instance ne contient que des données fictives recréées par script et seul le porteur s'en sert : ces contrôles n'y protègent rien.

| ID | Ce qu'on fait | Menaces | Vérification | Coût |
| --- | --- | --- | --- | --- |
| C-21 | Instance jetable : authentification HTTP au proxy, pas d'inscription, mots de passe aléatoires et longs générés au déploiement et gardés hors dépôt, hachés par Better Auth (algorithme à vérifier dans la documentation), limites de débit (décidé), `noindex`, marqueur « données fictives » en base, remise à zéro avant chaque démonstration (décidé), aucune sauvegarde, rien en commun avec la future production. | M-02, M-08 | e2e : pas d'inscription ; N échecs donnent 429 | faible |
| C-22 | Scripts de seed et de remise à zéro bridés : environnement validé **et** marqueur d'environnement en base, comparés avant toute écriture. | M-02, M-14 | Test : le script échoue en production ou sans marqueur | faible |
| C-23 | Secrets générés par environnement, hors dépôt et hors build arg, en fichier `0600` ou secrets Docker. Secrets de déploiement dans un environnement GitHub protégé, jamais accessible aux jobs de PR. | M-15 | gitleaks ; `docker history` sans secret ; environnements GitHub relus par le propriétaire | faible |
| C-24 | Hôte : proxy unique avec TLS automatique et redirection HTTPS ; 2FA chez l'hébergeur et chez le registraire du domaine, verrou de transfert, DNS modifiable par les seuls exploitants ; SSH par clé, sans root. Balayage de ports une fois à la mise en ligne. | M-15 | Test de fumée après déploiement ; `sshd -T` | faible |
| C-25 | Image de base et déploiement par digest. Sonde externe sur la sonde de disponibilité et alerte d'expiration du certificat. | M-12, M-14 | Contrôle CI du `FROM` ; alerte exercée | faible |
| C-26 | Repli local : même image avec `DEPLOY_ENV=demo`, derrière le même proxy avec certificat local, ou téléphone en partage de connexion. Jamais le serveur Vite exposé au Wi-Fi du lieu, jamais `Secure` désactivé « pour la démo ». | M-02 | Repli exercé une fois avant la première démonstration | faible |
| C-27 | Matrice action × rôle versionnée : concevoir et modifier la structure réservés au responsable de cours, saisir ouvert aux deux rôles ([D] déduit de `wayfinder/premiere-version/01` (saisie à deux écrans) et `06` (un compte par rôle) ; à confirmer par le porteur). Toute nouvelle action y entre avant sa route. | M-05 | Instantané de la matrice ; grille rôle × route générée depuis elle | faible |
| C-28 | Une modification du calcul après le début de la saisie passe par une copie (18 §9) ; le serveur refuse toute autre modification. Le déclencheur du gel reste à décider (§8). | M-05 | Test : seuil modifié sur grille gelée refusé, accepté sur la copie | faible |
| C-29 | **Si** la démonstration a des verrous (`wayfinder/premiere-version/05` non résolu) : expiration par inactivité, libération à la déconnexion. | M-14 | Tests du service avec horloge simulée | faible |
| C-30 | Liste de passage vers le pilote, versionnée : C-31 à C-42 faits ; C-43 planifié ; instance de production neuve ; correspondance des rôles et matrice action × rôle du pilote décidées. Le premier import MiData l'exige complète. | tous | Liste cochée et approuvée en PR par le propriétaire et le porteur | faible |

### 6.3 Pilote

**À ne pas faire ici** : pièces jointes, bibliothèque publique, report dans MiData, chaînage de l'historique par empreintes. Ils n'ont ni conception ni feu vert juridique, et le premier cours réel doit rester simple.

| ID | Ce qu'on fait | Menaces | Vérification | Coût |
| --- | --- | --- | --- | --- |
| C-31 | Dossier nLPD relu par un juriste : responsable du traitement, registre, texte d'information pour participants et parents (il rappelle aussi qu'un compte ne se prête pas), note sur l'analyse d'impact, procédure de violation. Le fournisseur du modèle d'IA figure dans la liste des sous-traitants ; le gabarit d'issue interdit captures et noms réels. | M-08, M-07, M-04 | Avis juridique référencé dans le dépôt | moyen |
| C-32 | Production sur un hôte, une base et des secrets neufs ; jamais promue depuis la démonstration. | M-02 | C-02 refuse une base marquée « démonstration » | faible |
| C-33 | MiData : correspondance des rôles en fonction pure, refus par défaut (aide, cuisine, participant, LKB tant que non clarifié). Rôles relus à la connexion, retrait local immédiat par le responsable, fermeture des sessions et sockets du membre retiré. Fin d'appartenance après le cours. Tests de **notre** configuration OIDC : URL de retour externe refusée, deux `sub` au même e-mail. Une application OAuth par environnement, au nom de l'association. | M-04, M-01 | Tests unitaires sur réponses JSON:API enregistrées ; retrait qui coupe HTTP et WebSocket | moyen |
| C-34 | Sessions : durées décidées, option « appareil partagé », nom du connecté toujours visible, liste et révocation des sessions. Jetons MiData jamais en journal ni en réponse ; chiffrés s'ils sont gardés. Journal des événements d'auth, alerte sur échecs en rafale seulement. Une session ouverte survit à une panne MiData ; aucun compte de secours. | M-03, M-04 | Horloge simulée : session expirée, 401 ; fournisseur arrêté, sessions actives | moyen |
| C-35 | Purge de l'appareil (brouillon et file d'envoi éventuelle) à la déconnexion volontaire, après avertissement si une observation attend l'envoi. À l'expiration, pas de purge : reconnexion, vérification du même utilisateur et de ses droits, puis envoi ([D] ajouté par ce plan ; `wayfinder/observations/tickets/06-brouillon-sans-reseau.md` ne traite que le brouillon). Brouillon à durée maximale. Pas de service worker sans décision écrite. | M-03 | e2e : stockage vide après déconnexion ; observation en attente envoyée après reconnexion du même utilisateur, refusée pour un autre | faible |
| C-36 | Sauvegardes : dump horaire pendant un cours, quotidien sinon, et avant chaque migration ; chiffré, hors serveur, en Suisse ; rétention écrite courte. Restauration testée chaque mois ; le runbook relance l'anonymisation avant de rouvrir l'accès. | M-14, M-07 | Tâche de restauration avec alerte ; exercice chronométré avant le pilote | moyen |
| C-37 | Deux exploitants nommés, coffre partagé, runbook dans le dépôt. Alertes (disque, sauvegarde, redémarrages) à deux personnes. Gel des déploiements pendant un cours ; export de secours la veille du dernier soir. Procédure d'incident et de violation, exercée sur table. Second relecteur pour les chemins sensibles (`can()`, auth, `domain`, CI, harness). | M-14, M-13 | La seconde personne restaure et déploie seule ; workflow qui refuse un déploiement en période de cours | moyen |
| C-38 | Administrateur : aucun accès au contenu par l'interface ; accès de support par un ajout daté et journalisé à l'équipe ; accès `psql` exceptionnel par un rôle de lecture distinct, noté dans un registre ; aucune correction métier en SQL. | M-15 | Test : administrateur sans appartenance reçoit 404 ; registre relu à chaque fin de cours par le second exploitant | faible |
| C-39 | Exports : restitution au participant sans observation (décidé). Exports internes : titulaire décidé, journal (qui, quoi, quand), métadonnées (date, auteur, état), recalcul par le serveur. Cellules de tableur commençant par `= + - @` neutralisées ; PDF sans HTML venant de l'utilisateur. | M-09 | Export d'un dossier témoin sans texte d'observation ; charges de formule neutralisées | moyen |
| C-40 | Actions sensibles selon la matrice du pilote (finaliser, rouvrir, joker, copier, exporter en lot, restaurer une valeur ; 05 §2 propose une base) : joker validé par le serveur (nœud, quota, justification, rôle) ; réouverture motivée, tracée, signalée ; refus testé d'écrire sur un dossier finalisé ou archivé. | M-05 | Tests d'intégration par cas refusé de la matrice ; e2e réouverture | faible |
| C-41 | Catalogue des colonnes personnelles et de leur fin de vie ; job d'anonymisation idempotent, avec alerte en cas d'échec. Noms témoins semés, puis recherche dans un `pg_dump` complet : zéro occurrence. | M-07 | Test CI du catalogue ; test des noms témoins | moyen |
| C-42 | Liste fermée des champs MiData gardés (pas de date de naissance, d'adresse ni d'URL de photo). Script versionné qui extrait toutes les données d'un participant, avec procédure de demande. Rappel à la saisie des textes libres. | M-07, M-09 | Test de contrat sur réponse enrichie ; sortie croisée avec le catalogue | faible |
| C-43 | Mises à jour automatiques de l'OS ; images reconstruites et scannées chaque semaine. Rétention des journaux écrite ; test e2e des chaînes témoins dans les journaux. | M-12, M-10 | Job planifié ; test des témoins | moyen |

### 6.4 Production

**À ne pas faire ici** : WAF, SIEM, haute disponibilité, SLSA élevé. Disproportionnés pour une instance et quelques dizaines d'utilisateurs.

| ID | Ce qu'on fait | Menaces | Vérification | Coût |
| --- | --- | --- | --- | --- |
| C-44 | Pièces jointes, après avis juridique : hors base, nom généré, magic bytes, `attachment`, images réencodées sans EXIF, taille et quota, lecture par route autorisée, suppression à la dernière référence. Appels sortants limités aux hôtes de l'environnement. | M-09, M-07 | Tests de 24 « Recommandation » | moyen |
| C-45 | Publication en bibliothèque par sérialiseur en liste blanche ; relecture des textes libres. | M-09 | Aucun nom du jeu de test dans le JSON publié | faible |
| C-46 | Report des qualifications dans MiData : décision d'abord. Si une clé de service existe, job séparé, portée minimale, validation humaine, rotation convenue avec la PBS. | M-15 | Revue par le propriétaire avant toute demande à la PBS, consignée en ADR | moyen |
| C-47 | Attestation de provenance des images, vérifiée au déploiement, si les ressources le permettent. | M-12 | Script de déploiement | moyen |
| C-48 | Fin de vie d'une instance : export pour l'organisateur, purge, destruction des sauvegardes, révocation OAuth et secrets. | M-07 | Procédure exercée sur la démonstration | faible |

## 7. Contrôles automatiques

À rendre requis en CI ou en test. Budget proposé : 10 minutes pour la CI requise ; le reste en tâche nocturne.

- Schéma `env` : chaque combinaison interdite échoue ; démarrage de production avec configuration de démonstration refusé (C-02).
- Parcours des routes : politique ou marque « publique » obligatoire (C-03).
- Instantané de la table des routes par environnement (C-03).
- Cas « autre cours » dans la grille rôle × route de chaque module, 404 identique (C-04).
- Test de type : repository sans `CourseScope` refusé à la compilation (C-04).
- Suite WebSocket : cookie, `Origin`, sujet, présence, message, déconnexion (C-06).
- Parcours des corps et messages : schéma strict obligatoire (C-07).
- Fast-check : grilles cycliques, profondes, énormes refusées (C-07).
- Une écriture produit un événement d'historique ; auteur forgé ignoré (C-08).
- Rôle applicatif sans DDL, sans `UPDATE` ni `DELETE` d'historique (C-09).
- Fonction de purge sur un cours de test : aucune référence restante (C-10).
- Empreinte des fonctions publiées et égalité navigateur/Bun sur le corpus (C-12).
- Règle oxlint contre le HTML brut ; e2e de charges XSS ; e2e sans violation CSP (C-13).
- En-têtes de sécurité et `Set-Cookie` sur 200, 404, 422, 500 (C-13).
- `POST` d'origine étrangère refusé ; `X-Forwarded-For` forgé sans effet (C-13).
- Logger : champ non listé refusé ; 500 et 422 sans fuite (C-14).
- `bun install --frozen-lockfile` sans modification ; lockfile limité au registre npm ; `trustedDependencies` comparé à la liste relue (C-16).
- CodeQL, `bun audit`, gitleaks, linter de workflows (C-16).
- Ruleset réel comparé à la référence (C-16, nocturne).
- Hooks des agents testés en Vitest ; contenu de `settings.json` vérifié, sans `github.com` dans le bac à sable (C-17).
- Diff sans `oxlint-disable`, `@ts-ignore`, `.skip`, `.only`, seuil baissé (C-18).
- Fichiers binaires et chemins autorisés (C-19).
- Compose : pas de `ports` hors du proxy, `read_only`, pas de socket Docker, `max-size` (C-20).
- Script de remise à zéro refusé en production ou sans marqueur (C-22).
- `FROM` par digest (C-25).
- Pilote : restauration mensuelle, noms témoins dans un `pg_dump`, catalogue des colonnes, chaînes témoins dans les journaux, purge de l'appareil en e2e (C-35, C-36, C-41, C-43).

## 8. Décisions à prendre

| Question | Options | Recommandation | Qui tranche |
| --- | --- | --- | --- |
| Refuser une écriture rejouée plus ancienne que la valeur courante ? Rouvre « dernier gagnant » (TODO « Concurrence », FEATURES) | Dernier gagnant strict ; refus avec la valeur courante | Garder le dernier gagnant ; stocker une version de case (colonne bon marché) ; trancher à `wayfinder/premiere-version/05` | porteur du projet |
| Témoin de finalisation ? Touche 18 §10, §14 arbitrage 1 et TODO « Données stockées » | Aucun ; empreinte des données et versions seulement | Aucun avant la production ; au plus une empreinte, sans résultat stocké, si une dérive est constatée | porteur du projet |
| Qui fige la structure et à quel moment (18 §13.5 et §13.6, ouverts) | Statut explicite posé par le responsable ; première note | Statut explicite, pour que la démonstration reste jouable ; s'il ajoute une étape au déroulé de `wayfinder/premiere-version/01`, la placer avant la saisie | porteur du projet |
| Mécanisme de coupure courte (TODO « Coupure courte, mécanisme ») | File durable sur l'appareil (`@tanstack/offline-transactions`) ; reprise en mémoire | La reprise en mémoire suffit à TODO « Coupure courte » et ne laisse rien sur l'appareil (M-03) ; si la file durable est retenue, C-15 et C-35 s'appliquent | propriétaire du dépôt |
| Correspondance des rôles MiData | Tous les rôles ; stricte ; attribution manuelle | Stricte : Leader → responsable de cours ; ClassLeader, Speaker → formateur ; le reste → aucun accès | porteur du projet |
| Relecture des rôles et conservation du jeton de rafraîchissement (à usage unique, PRACTICES §8) | À la connexion ; périodique avec jeton chiffré ; accès de service | À la connexion, plus retrait local immédiat ; demander au MSdS si un accès de service existe | porteur du projet, MSdS |
| Durées de session | Courte ; durée du cours ; longue avec option « appareil partagé » | Environ 7 jours glissants et 24 h d'inactivité ; 30 min en « appareil partagé » ; à éprouver au pilote | porteur du projet |
| Mode de secours si MiData tombe (03 A6) | Comptes locaux ; compte de secours ; aucun | Aucun compte local en production ; sessions assez longues ; procédure écrite | porteur du projet |
| Matrice action × rôle du pilote et titulaire des actions sensibles (joker, finaliser, rouvrir, copier, exporter en lot, restaurer une valeur) | Tout formateur ; responsable seul ; proposition et validation | Partir de 05 §2 ; responsable de cours au pilote ; chaque refus devient un test de C-40 | porteur du projet |
| Retrait de `email` des scopes (s'écarte de PRACTICES §8) | Liste cible ; scopes minimaux | Retirer seulement si le compte n'en a pas besoin | propriétaire du dépôt |
| Outil de mise à jour des dépendances (catalogues Bun non gérés, PRACTICES §7.4) | Renovate avec regex ; script ; attendre | Dependabot pour les Actions ; Renovate avec `minimumReleaseAge` pour le catalogue | propriétaire du dépôt |
| Agents autonomes avec écriture en CI | Sessions lancées par un humain seulement ; agents déclenchés par label | Un agent lancé par un humain peut travailler sans surveillance sur une issue `ready-for-agent`, sur une branche, sans secret ; aucun agent n'est déclenché par un événement GitHub, jusqu'à la production | propriétaire du dépôt |
| Transport temps réel : Electric ? | WebSocket maison ; Electric | Si Electric : réseau interne, accès par le proxy d'auth, rôle de réplication dédié, coût listé dans la décision | propriétaire du dépôt |
| Hébergeur suisse et proxy | VPS ; stockage objet ; Caddy ou Traefik | VPS avec 2FA, contrat de sous-traitance, stockage objet en Suisse ; Caddy sans socket Docker | porteur du projet, propriétaire du dépôt |
| Rétention des sauvegardes et des journaux | 7, 30, 90 jours | 30 jours au plus, écrits dans le registre | juriste |
| Responsable du traitement | Exploitant ; organisateur du cours ; MSdS | Demander au MSdS et à un juriste avant le pilote | juriste, MSdS |
| Données sensibles (santé, comportement) dans les commentaires et observations | Interdites par règle de saisie ; admises avec analyse d'impact ; admises sans | Demander au juriste si elles imposent l'analyse d'impact ou des règles de saisie ; rappel à la saisie (C-42) en attendant | juriste |
| Que garder après l'anonymisation ; suspension en cas de recours | Tout supprimer sauf la structure ; garder anonymisé | Tout supprimer sauf la structure ; suspension motivée par cours | porteur du projet, juriste |
| Droit d'accès : observations et historique inclus ? | Oui ; en partie ; non | Concevoir l'extraction complète ; le juriste dit ce qui est remis | juriste |
| Retrait tracé d'un texte illicite, historique compris | Jamais ; par le responsable ; sur demande | Retrait par le responsable, avec motif, sans garder le texte | juriste |
| Information ou accord des parents | Information ; accord écrit | Information type ; accord seulement si le juriste l'exige | juriste |

## 9. Risques acceptés

- **Pas de double authentification dans Azimut** : en production, elle relève de MiData (à vérifier si hitobito l'offre) ; en démonstration, les données sont fictives.
- **Pas de RLS PostgreSQL** au début : une seule instance, un seul repository, et C-04 couvre le risque. À revoir si un second service lit la base.
- **Un formateur voit tout son cours** : c'est voulu ([V] FEATURES « Acteurs et accès », 18 §11). Pas de journal de chaque lecture.
- **L'historique est lisible par toute l'équipe** [V] 18 §5 ; seul l'export en lot est restreint (C-39).
- **Conflit d'intérêts** (05 §6 M1) : pas de mécanisme de retrait d'un participant à un formateur au pilote ; l'historique montre l'auteur de chaque note ; à reconsidérer avec les groupes d'évaluation (FEATURES « Acteurs et accès », à affiner).
- **Compte prêté** : impossible à empêcher ; le nom du connecté reste visible (C-34) et la règle est rappelée dans le texte d'information (C-31).
- **Statistiques entre cours** (05 §6 M8, FEATURES « Idées à explorer ») : hors périmètre jusqu'à une décision ; ce jour-là, seuil d'effectif minimal exigé.
- **Photo d'écran et recopie manuelle** : impossibles à empêcher.
- **Collusion de toute une équipe** et **administrateur root sur l'hôte** : hors de portée d'un outil ; l'historique et C-38 réduisent le risque.
- **Limiteur de débit en mémoire**, pas de WAF, d'IDS ni de SIEM, DDoS volumétrique accepté : une instance, quelques dizaines d'utilisateurs.
- **Une seule instance sans réplication** : une courte panne hors du dernier soir est tolérable avec sauvegardes, alertes et export de secours.
- **Pas de chiffrement par colonne** : le chiffrement de disque de l'hébergeur devrait suffire, [D] à confirmer quand l'hébergeur est choisi (§10) ; les sauvegardes, elles, sont chiffrées.
- **Résidu de l'anonymisation des commentaires** (surnoms, fautes) : acceptable s'il est écrit dans le registre, à valider par le juriste (§8), et évité si l'on supprime tout.
- **Exports déjà remis** aux participants ou aux parents : hors de portée d'une suppression.
- **Prototype jetable** (`innerHTML` échappé à la main, `localStorage`) : jamais déployé, sans donnée réelle. Ses dépendances ont des plages `^`, dont `@tanstack/db` 0.x ([V] `prototype/package.json`) ; le risque d'installation est réduit par l'étape 0 (§6.1 « Ordre ») et non par un épinglage, inutile pour du code jetable.
- **Pas de SLSA élevé, de builds reproductibles ni de commits signés** ; pas de mutation testing tant que Stryker ne supporte pas TS 7 ([V] TODO).
- **Délai de publication sur les nouvelles versions** (si retenu, §8) : il retarde un correctif, avec une exception manuelle.

## 10. Ce qui reste à vérifier

- **Toute la partie nLPD** (articles LPD et OPDo, annonce au PFPDT, recommandations PFPDT, MSdS, J+S) : extraits non relus sur les textes officiels ([V] 24, tableau des sources). À faire relire par un juriste.
- **Conditions d'utilisation de MiData** (« MiData Datennutzung ») pour une application tierce qui copie des données de participants : non lues.
- **Better Auth** (à vérifier dans la documentation) : hachage des mots de passe des comptes locaux, chiffrement des jetons OAuth, attributs et préfixe des cookies, renouvellement de session, liaison de comptes par e-mail désactivable, routes montées par plugin, IP et agent utilisateur stockés dans les sessions, réglage de l'IP derrière un proxy.
- **hitobito / db.scout.ch** (à vérifier) : durée des jetons, révocation, double authentification, instance d'intégration, rôles renvoyés par `event_participations`, sens du rôle LKB, accès de service, clé `*_full` pour le report.
- **Elysia et Bun** (à vérifier dans la documentation) : cookies et `Origin` à la montée WebSocket, fermeture d'une connexion depuis le serveur, taille des messages, filtrage des champs non déclarés dans les schémas de réponse, plugin OpenAPI.
- **Bun** (à vérifier) : scripts d'installation par défaut, `trustedDependencies`, option native d'âge minimum de publication, couverture de `bun audit`, `--ignore-scripts` sur le prototype.
- **TanStack DB et `@tanstack/offline-transactions`** (à vérifier) : emplacement de la file d'envoi, purge, forme de la clé d'idempotence.
- **Electric** (à vérifier), s'il est retenu : rôle `REPLICATION`, exposition de sa route d'administration.
- **Claude Code** (à vérifier) : `deny Read` ne bloque pas `cat .env` par Bash ; restriction de lecture du bac à sable ; bac à sable sans `github.com` (écart à PRACTICES §4, C-17) et effet sur `bun install` et `gh`. [V] PRACTICES §4 cite `anthropics/claude-code-action@v1` par tag, contre sa propre règle d'épinglage par SHA.
- **Docker** (à vérifier) : publication de ports qui contourne le pare-feu de l'hôte ; secrets par fichier (`*_FILE`) dans l'image PostgreSQL ; utilisateur non root de l'image Bun.
- **GitHub** : push protection selon l'offre ; acteurs autorisés à contourner le ruleset 27321413 ; environnements protégés ; qui peut poser un label.
- **Outils** : zizmor ou actionlint, attestations de provenance GHCR, scan d'images (Trivy ou autre).
- **Hébergeurs suisses et registraire** : 2FA, verrou de transfert, stockage objet en Suisse, chiffrement au repos, contrat de sous-traitance.
- **Serveurs MCP et connecteurs** configurés hors du dépôt dans l'environnement des agents : inventaire à faire par le propriétaire [D].
- **`wayfinder/premiere-version/05`** (saisie temps réel) non résolu : verrous et écran d'historique en démonstration.
- **Noms du corpus** : [V] `corpus-prototype/a01-participants.json` a des prénoms (« Ana ») ; le générateur produit « Participant 1 », « Participant 2 » ([V] 26 §2). Vérifier un par un que les prénoms du corpus sont fictifs.

## Annexe : registre des menaces par domaine

Une ligne par menace retenue des analyses, avec la menace principale qui la regroupe.

| ID d'origine | Menace | Regroupée dans |
| --- | --- | --- |
| AUTHN-1 | Session restée ouverte sur un appareil partagé | M-03 |
| AUTHN-2 | Comptes locaux actifs en production | M-02 |
| AUTHN-3 | Bourrage d'identifiants sur l'instance de démonstration | M-02 |
| AUTHN-4 | Compte MiData prêté à un collègue | M-04 ; risque accepté (§9) |
| AUTHN-5 | Téléphone perdu avec une session active | M-03 |
| AUTHN-6 | Fuite des jetons MiData | M-15 |
| AUTHN-7 | Faille dans le flux OIDC ou la liaison des comptes | M-04 |
| AUTHN-8 | WebSocket ouvert sans session ou gardé après révocation | M-01 |
| AUTHN-9 | Cookie mal configuré ou CSRF de connexion | M-11 |
| AUTHN-10 | Secrets partagés entre environnements ou commités | M-15 |
| AUTHN-11 | Contournement de l'auth pendant une panne MiData | M-02 |
| AUTHN-12 | Route d'auth inutile exposée | M-02 |
| AUTHZ-1 | Accès à un objet d'un autre cours par son identifiant | M-01 |
| AUTHZ-2 | Fuite entre cours par la synchronisation du store | M-01 |
| AUTHZ-3 | Abonnement temps réel ou verrou hors périmètre | M-01 |
| AUTHZ-4 | Droits périmés après un retrait de l'équipe | M-04 |
| AUTHZ-5 | Correspondance trop large des rôles MiData (Helper a `participations_read`, Cook `participations_read_details`, [V] PRACTICES §8) | M-04 |
| AUTHZ-6 | Action réservée faite par un formateur | M-05 |
| AUTHZ-7 | Écriture sur un dossier finalisé ou une grille archivée | M-05 |
| AUTHZ-8 | Données de participants dans un gabarit publié | M-09 |
| AUTHZ-9 | Exports et historique qui contournent la lecture | M-09 |
| AUTHZ-10 | Exception d'autorisation pour la démonstration | M-02 |
| AUTHZ-11 | Pièces jointes lisibles hors de l'équipe | M-09 |
| AUTHZ-12 | Administrateur de l'instance lisant les cours | M-15 |
| PRIV-1 | Anonymisation de façade | M-07 |
| PRIV-2 | Données réelles hors production (dump, agent, qualification reçue pour étude) | M-08 |
| PRIV-3 | Export qui sort sans contrôle | M-09 |
| PRIV-4 | Données personnelles dans journaux et suivi d'erreurs | M-10 |
| PRIV-5 | Sauvegardes qui ressuscitent des données supprimées | M-07 |
| PRIV-6 | Conservation au-delà de la durée prévue | M-07 |
| PRIV-7 | Traitement sans base claire ni information | M-07 |
| PRIV-8 | Données restées sur un téléphone | M-03 |
| PRIV-9 | Sur-collecte depuis MiData | M-07 |
| PRIV-10 | Textes libres excessifs sur des mineurs | M-09 |
| PRIV-11 | Droit d'accès impossible à servir | M-07 |
| PRIV-12 | Sous-traitants et ressources hors de Suisse | M-10 |
| APP-1 | XSS stocké par un texte libre | M-11 |
| APP-2 | Contenu actif dans les exports | M-09 |
| APP-3 | Canal WebSocket qui fait confiance au client | M-01 |
| APP-4 | Verrous abusifs ou orphelins | M-14 |
| APP-5 | Écriture hors contrat ou champs imposés par le client | M-11 |
| APP-6 | Grille pathologique ou gros corps | M-11 |
| APP-7 | Écritures rejouées qui contournent droits ou finalisation | M-05 |
| APP-8 | Brouillon lisible sur un téléphone partagé | M-03 |
| APP-9 | Pièce jointe active ou mal protégée | M-09 |
| APP-10 | Fuite par les erreurs et les journaux | M-10 |
| APP-11 | Requête intersite sur une route d'écriture | M-11 |
| APP-12 | SSRF lors des appels à MiData | M-15 |
| INFRA-1 | Production démarrée avec une autre configuration | M-02 |
| INFRA-2 | Perte de données sans restauration | M-14 |
| INFRA-3 | Base ou service interne exposé | M-15 |
| INFRA-4 | Sauvegardes qui fuient ou survivent à l'anonymisation | M-07 |
| INFRA-5 | Fuite d'un secret d'exploitation | M-15 |
| INFRA-6 | Accès d'administration ou domaine compromis | M-15 |
| INFRA-7 | Indisponibilité pendant un cours | M-14 |
| INFRA-8 | Correctifs non appliqués | M-12 |
| INFRA-9 | Données réelles copiées hors production | M-08 |
| INFRA-10 | Journaux trop bavards ou absents | M-10 |
| INFRA-11 | Personne clé unique, incident sans procédure | M-14 |
| INFRA-12 | Instance orpheline en fin de vie | M-07 |
| CHAINE-1 | Paquet npm compromis à l'installation | M-12 |
| CHAINE-2 | Injection d'instructions dans un agent | M-13 |
| CHAINE-3 | Agent qui affaiblit les contrôles | M-13 |
| CHAINE-4 | Code généré fusionné sans vraie relecture | M-13 |
| CHAINE-5 | Workflow GitHub Actions exploitable | M-15 |
| CHAINE-6 | Fuite de secrets par dépôt, journaux ou agents | M-15 |
| CHAINE-7 | Compte GitHub du mainteneur compromis | M-15 |
| CHAINE-8 | Lockfile modifié sans relecture | M-12 |
| CHAINE-9 | Skill, plugin ou MCP tiers piégé | M-13 |
| CHAINE-10 | Faille connue jamais corrigée | M-12 |
| CHAINE-11 | Image déployée différente de ce qui a été relu | M-12 |
| CHAINE-12 | Données réelles commises dans le dépôt public | M-08 |
| INT-1 | Note modifiée après coup | M-05 |
| INT-2 | Écrasement honnête de la saisie d'un collègue | M-06 |
| INT-3 | Grille ou seuils changés pour changer un résultat | M-05 |
| INT-4 | Abus de joker | M-05 |
| INT-5 | Recours impossible à prouver | M-06 |
| INT-6 | Modification niée ou faite sous le compte d'un collègue | M-03 |
| INT-7 | Propos déplacés ou données de santé, effacement d'une observation | M-09 ; juriste (§8) |
| INT-8 | Export massif conservé par un formateur | M-09 |
| INT-9 | Administrateur qui lit ou modifie la base | M-15 |
| INT-10 | Erreur de cycle de vie (finalisation, copie, grille principale) | M-06 |
| INT-11 | Script de remise à zéro sur la mauvaise base | M-02 |
| INT-12 | Résultat finalisé qui change sans changement de données | M-06 |
| 05 §6 M1 | Formateur qui note un participant avec qui il a un lien personnel | risque accepté (§9) |
| 05 §6 M8 | Réidentification par des statistiques entre cours | risque accepté (§9) |
| CONTRE-1 | Repli local de la démonstration mal classé | M-02 |
| CONTRE-2 | Routes de test, de seed ou de documentation montées hors développement | M-02 |
| CONTRE-3 | Confiance dans `X-Forwarded-*` | M-11 |
| CONTRE-4 | Clé de service MiData pour le report | M-15 |
| CONTRE-5 | Lecture de `.env` par Bash dans une session d'agent | M-13 |
| CONTRE-6 | Service Electric exposé, s'il est retenu | M-01 |
| CONTRE-7 | Propriétés en trop dans les réponses | M-01 |
| CONTRE-8 | Injection SQL par fragments bruts | M-11 |
| CONTRE-9 | Agents d'IA comme destinataires de données personnelles | M-08 |
| CONTRE-10 | Service worker et cache persistants | M-03 |
| CONTRE-11 | Production promue depuis la démonstration | M-02 |
