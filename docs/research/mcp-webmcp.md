# MCP et WebMCP : état des spécifications, autorisation, risques

Ticket : fuzoh/azimut#86 (prépare le grill de #80). Recherche du 2026-11-20. Sources primaires uniquement : spécification MCP et son changelog, dépôts GitHub officiels (spécification MCP, SDK TypeScript, WebMCP, standards-positions de Mozilla et de WebKit), pages Chrome for Developers, Chrome Status, registre npm, OWASP. Rien n'a été exécuté ni mesuré dans le dépôt. Aucun code, aucune API et aucune décision ne sont proposés : ce document rapporte des faits, et il dit explicitement ce qui n'a pas pu être vérifié (section « Non vérifié »).

Convention : chaque fait renvoie à sa source et à sa date. « Stable » = marqué comme tel par le propriétaire de la spécification. « Expérimental » = marqué comme tel, ou non standard, ou derrière un drapeau ou un essai d'origine.

## Résumé

1. **MCP est stable et a changé de forme cette année.** La révision courante est `2026-07-28` (publiée le 2026-07-28). Elle supprime les sessions et la poignée de main `initialize`, retire le flux HTTP `GET` et déprécie l'enregistrement dynamique de clients. Les SDK TypeScript v2 l'implémentent (v2.4.0, 2026-10-23).
2. **L'autorisation MCP est OAuth 2.1 avec métadonnées de ressource protégée.** Le serveur MCP est un serveur de ressources ; il doit annoncer son serveur d'autorisation (RFC 9728), valider l'audience des jetons (RFC 8707) et ne jamais relayer un jeton reçu. Les portées sont des chaînes ; la spécification ne définit aucune portée « par cours » ni aucun mécanisme de droits par ressource.
3. **WebMCP n'est pas MCP et n'est pas un standard.** C'est un brouillon de Community Group du W3C (« not a W3C Standard nor on the W3C Standards Track », version du 2026-11-19), une API JavaScript `document.modelContext` où la page déclare des outils. Aucun navigateur ne l'a livrée en version stable : Chrome en essai d'origine, Edge en essai d'origine, Brave en nocturne, Firefox neutre et sans implémentation livrée, WebKit opposé.
4. **Aucune des deux spécifications ne résout l'injection de consignes.** Elles la reconnaissent, la renvoient à l'hôte ou à l'agent, et recommandent confirmation humaine, moindre privilège, indication des contenus non fiables et limites de taille. Les commentaires et observations d'Azimut sont exactement le type de contenu que la spécification WebMCP cite en exemple de vecteur (contenu produit par des utilisateurs).
5. **Le plan de sécurité du dépôt ne traite pas ce cas.** C-17 et le §8 portent sur les agents de développement. Un écart de fait existe aussi : le plan dit que la section « Consignes et données » d'AGENTS.md est faite, et `AGENTS.md` n'en contient pas.

## Versions et statuts vérifiés

| Objet | Valeur | Source, date |
| --- | --- | --- |
| Révision MCP courante | `2026-07-28` (« Current ») | [Versioning](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning), consulté le 2026-11-20 |
| Publication de cette révision | 2026-07-28 (release GitHub « stable release »), RC du 2026-05-29 | [releases du dépôt de la spécification](https://github.com/modelcontextprotocol/modelcontextprotocol/releases), API GitHub le 2026-11-20 |
| Révision précédente | `2025-11-25` (publiée le 2025-11-25) | idem |
| Brouillon suivant | `draft` : mises à jour mineures seulement (référence CIMD `-03`, champ `_meta` rétabli) | [changelog du brouillon](https://modelcontextprotocol.io/specification/draft/changelog), 2026-11-20 |
| SDK TypeScript, ligne v2 | `@modelcontextprotocol/server` et `client` 2.4.0 (2026-10-23) ; `node` 2.1.2 | [release v2.4.0](https://github.com/modelcontextprotocol/typescript-sdk/releases/tag/v2.4.0), npm le 2026-11-20 |
| SDK TypeScript, ligne v1 | `@modelcontextprotocol/sdk` 1.32.2 (2026-10-23), correctifs et sécurité « for at least six months after the v2 release (2026-07-27) » | [README du SDK](https://github.com/modelcontextprotocol/typescript-sdk), 2026-11-20 |
| Brouillon WebMCP | « Draft Community Group Report », 2026-11-19 | [spécification](https://webmachinelearning.github.io/webmcp/), 2026-11-20 ; dernier commit de `index.bs` : 2026-11-19 |
| Chrome stable | 159.0.8154.13 | [Version History API](https://versionhistory.googleapis.com/v1/chrome/platforms/win/channels/stable/versions?pageSize=1), 2026-11-20 |
| Better Auth, `@better-auth/mcp` | 1.7.27 (2026-11-20) | npm, 2026-11-20 |

## MCP

### Spécification courante et cycle de vie

- **Versionnement** : identifiant `AAAA-MM-JJ` de la dernière date de changement incompatible. Une révision est « Draft », « Current » ou « Final ». Une fonctionnalité peut être « Deprecated » ; elle reste alors au moins douze mois (ou 90 jours en retrait accéléré) avant retrait éventuel. Source : [Versioning (docs)](https://modelcontextprotocol.io/docs/2026-07-28/learn/versioning), 2026-11-20.
- **Changements majeurs de `2026-07-28`** (extraits du [changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)) : suppression des sessions de niveau protocole et de l'en-tête `Mcp-Session-Id` ; suppression de la poignée de main `initialize` (la version et les capacités voyagent dans `_meta` à chaque requête) ; ajout de `server/discover` (obligatoire pour les serveurs) ; `subscriptions/listen` remplace le `GET` HTTP ; suppression de la reprise de flux SSE ; les requêtes serveur vers client (échantillonnage, élicitation, racines) passent par un motif « Multi Round-Trip Requests » ; les tâches asynchrones sortent du noyau vers une extension.
- **Dépréciations** : Roots, Sampling, Logging ; transport HTTP+SSE ; enregistrement dynamique de clients (DCR). Source : même changelog.
- **Révisions antérieures** : une implémentation « dual-era » peut servir les anciennes (`2025-11-25` et avant, avec session) et la nouvelle sur le même point d'accès ([Versioning and Compatibility](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning), 2026-11-20). Je n'ai trouvé aucune source primaire indiquant quels clients d'agent grand public implémentent déjà `2026-07-28` (voir « Non vérifié »).

### Extensions : stable et expérimental

Les extensions suivent un cycle propre : Experimental (« Nothing » à attendre, peut disparaître), Beta, Stable ([Extensions Overview](https://modelcontextprotocol.io/extensions/overview), 2026-11-20). État listé à cette date :

| Extension | Stade |
| --- | --- |
| OAuth Client Credentials | Stable |
| Enterprise-Managed Authorization | Stable |
| MCP Apps | Stable |
| MCP Tasks | Beta (vers le noyau) |
| Skills over MCP, Server Cards, Events | Beta, destination non indiquée |

### Transports

Deux transports standard ([Transports](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports), 2026-11-20) :

- **stdio** : messages délimités par des retours à la ligne, sur les flux d'un sous-processus lancé par le client. L'autorisation OAuth ne s'y applique pas : la spécification dit que les implémentations stdio « SHOULD NOT » suivre la spécification d'autorisation et récupèrent leurs identifiants dans l'environnement ([Authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization), 2026-11-20).
- **Streamable HTTP** : un seul point d'accès (par exemple `https://example.com/mcp`) qui accepte `POST` ; chaque message est un `POST` ; la réponse est un objet JSON ou un flux SSE limité à la requête. Le `GET` et les sessions n'existent plus dans cette révision. Le serveur doit valider l'en-tête `Origin` (réponse 403 si présent et invalide), devrait se lier à `127.0.0.1` en local et devrait authentifier toutes les connexions ([Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http), 2026-11-20).
- Des transports personnalisés sont permis s'ils préservent le modèle de métadonnées de requête.

### Modèle d'autorisation (HTTP)

Source pour toute cette sous-section : [Authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization) et ses pages [Security Considerations](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations) et [Client Registration](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration), 2026-11-20.

- **Statut** : l'autorisation est facultative. Pour un transport HTTP, les implémentations « SHOULD » la suivre.
- **Base normative** : brouillon OAuth 2.1 (`draft-ietf-oauth-v2-1-13`), RFC 6750 (porteur), RFC 8414 (métadonnées du serveur d'autorisation), RFC 9728 (métadonnées de ressource protégée), RFC 8707 (indicateurs de ressource), RFC 9207 (paramètre `iss`), OpenID Connect Discovery. C'est un brouillon d'IETF qui est référencé, pas un RFC publié.
- **Rôles** : le serveur MCP est un serveur de ressources OAuth ; le client MCP est un client OAuth ; le serveur d'autorisation peut être hébergé avec la ressource ou à part.
- **Découverte** : le serveur MCP « MUST » implémenter les métadonnées de ressource protégée (RFC 9728) ; une réponse 401 porte `WWW-Authenticate` avec `resource_metadata`. Le serveur d'autorisation « MUST » fournir RFC 8414 ou OpenID Connect Discovery ; les clients « MUST » supporter les deux.
- **Enregistrement du client**, par ordre de priorité pour un client qui les supporte tous : informations préenregistrées, puis « Client ID Metadata Documents » (CIMD, « SHOULD » côté serveur et client), puis enregistrement dynamique (RFC 7591, **déprécié**, conservé pour compatibilité), puis saisie par l'utilisateur.
- **Flux** : code d'autorisation avec PKCE ; le client « MUST » vérifier que `code_challenge_methods_supported` est présent (sinon refuser) et utiliser `S256`. Le client enregistre l'émetteur et valide `iss` à la réponse (RFC 9207). Les URI de redirection sont `localhost` ou HTTPS et doivent correspondre exactement à celles enregistrées.
- **Portée des jetons** :
  - Le client « MUST » envoyer le paramètre `resource` (URI canonique du serveur MCP) dans les requêtes d'autorisation et de jeton.
  - Le serveur « MUST » valider que le jeton lui est destiné (audience) et « MUST NOT » accepter ni relayer un autre jeton (interdiction du « token passthrough », détaillée dans [Security Best Practices](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices)).
  - Le jeton va dans l'en-tête `Authorization: Bearer`, jamais dans l'URL ; il doit figurer dans chaque requête HTTP.
  - Les jetons d'accès « SHOULD » être de courte durée ; pour les clients publics, les jetons de rafraîchissement « MUST » être renouvelés (rotation).
- **Portées (scopes)** : chaînes opaques. Le serveur « SHOULD » indiquer la portée requise dans `WWW-Authenticate` ; une portée insuffisante donne 403 avec `error="insufficient_scope"` et déclenche une réautorisation incrémentale (« step-up »). Les bonnes pratiques recommandent un modèle progressif de moindre privilège (portée initiale minimale de lecture, élévation à la demande, journalisation des élévations). La spécification ne définit **aucune** portée structurée par ressource, par cours ou par locataire, ni la façon dont le serveur relie un jeton aux droits de l'utilisateur dans son propre modèle : je n'ai trouvé aucun passage qui le fasse. Elle exige seulement « Implement proper access controls » côté outils ([Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)).
- **Extensions d'autorisation stables** : client credentials (machine à machine) et autorisation gérée par l'entreprise ([Extensions Overview](https://modelcontextprotocol.io/extensions/overview)).

### Sécurité des outils selon la spécification

- « There SHOULD always be a human in the loop with the ability to deny tool invocations » ; les applications « SHOULD » signaler les outils exposés, indiquer les invocations et demander confirmation ([Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools), 2026-11-20).
- Les clients « MUST » considérer les annotations d'outil comme non fiables sauf si le serveur est de confiance. Les annotations existent (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) mais sont indicatives ([schéma](https://modelcontextprotocol.io/specification/2026-07-28/schema)).
- Les serveurs « MUST » valider les entrées, appliquer des contrôles d'accès, limiter le débit et assainir les sorties. Les clients « SHOULD » montrer les entrées avant l'appel « to avoid malicious or accidental data exfiltration », valider les résultats avant de les passer au modèle, et journaliser l'usage.
- Principes généraux : consentement explicite de l'utilisateur avant d'exposer ses données à un serveur et avant d'invoquer un outil ; la spécification précise que MCP « cannot enforce these security principles at the protocol level » ([Specification, section Security and Trust & Safety](https://modelcontextprotocol.io/specification/2026-07-28)).
- Les pages [Security Best Practices](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices) couvrent le « confused deputy », le « token passthrough », la SSRF, le détournement de poignée d'état, la compromission de serveur local et la minimisation des portées. Une recherche textuelle de « injection » n'y trouve que l'injection d'URL et de commande ; **je n'y ai pas trouvé de section dédiée à l'injection de consignes dans le contenu**.

### SDK TypeScript

Source : [dépôt du SDK](https://github.com/modelcontextprotocol/typescript-sdk) (README, release v2.4.0), npm, [page SDKs](https://modelcontextprotocol.io/docs/2026-07-28/sdk), 2026-11-20.

- **Stable** : la branche `main` est la v2 (`@modelcontextprotocol/server`, `@modelcontextprotocol/client`), décrite comme « the stable release line », qui implémente `2026-07-28`. La v1 (`@modelcontextprotocol/sdk`) reste maintenue (voir tableau des versions). Le SDK TypeScript est classé Tier 1.
- **Exécutions** : Node.js, Bun et Deno (README) ; `engines` : Node `>=20`.
- **Schémas** : Standard Schema (Zod v4, Valibot, ArkType ou compatible).
- **Intégrations** : paquets `node`, `express`, `fastify`, `hono` (adaptateurs minces avec validation de l'en-tête `Host`).
- **Compatibilité** : la v2.4.0 sert aussi des connexions `2025-11-25`.
- **Expérimental dans le SDK** : l'attache des « Skills over MCP » (`attach`) est signalée « experimental and may change in a minor release » (notes v2.4.0).
- **Rythme** : 2.3.1 le 2026-10-05, 2.4.0 le 2026-10-23, dernier commit le 2026-11-18.

### Autorisation côté application : Better Auth

Le dépôt a retenu Better Auth ([PRACTICES §8](../PRACTICES.md), [TODO](../TODO.md)). Faits de la documentation officielle ([mcp.mdx](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/mcp.mdx), 2026-11-20 ; paquet npm `@better-auth/mcp` 1.7.27) :

- Un plugin `mcp()` transforme l'application en **serveur d'autorisation OAuth et ressource protégée** pour des clients MCP, au-dessus du plugin « OAuth 2.1 Provider ». Il exige le plugin JWT.
- Pour le profil MCP `2026-07-28`, la documentation recommande de le composer avec `@better-auth/cimd` et la v2 du SDK officiel.
- Hors Node.js, y compris sous **Bun**, il faut injecter un transport de récupération des métadonnées qui résout chaque nom d'hôte une fois, refuse les adresses spéciales (RFC 6890), épingle l'adresse et refuse les redirections (protection SSRF de CIMD).
- La page ne porte aucune étiquette de maturité (stable, bêta, expérimental) : je n'en ai pas trouvé.
- Contexte du dépôt : PRACTICES §8 utilise `genericOAuth` (Azimut est client de MiData) et écarte `oidc-provider` « which is for being an IdP ». Servir MCP supposerait que l'application soit aussi un serveur d'autorisation.

### Métadonnées publiques de MiData (db.scout.ch)

Lues sur `https://db.scout.ch/.well-known/openid-configuration` le 2026-11-20 (document public du fournisseur) :

- PKCE : `code_challenge_methods_supported` = `plain`, `S256`.
- Pas de `registration_endpoint` (pas d'enregistrement dynamique), pas de `client_id_metadata_document_supported`, pas de `authorization_response_iss_parameter_supported`.
- Types d'octroi : `authorization_code`, `implicit_oidc`, `refresh_token`.

Ces trois absences se confrontent à la hiérarchie d'enregistrement de MCP (préenregistrement, CIMD, DCR) : un client MCP externe ne pourrait pas s'enregistrer directement auprès de MiData.

## WebMCP

### Statut de la spécification et organisme

- **Organisme** : Web Machine Learning Community Group du W3C. Le document dit : « It is not a W3C Standard nor is it on the W3C Standards Track » ([spécification](https://webmachinelearning.github.io/webmcp/), version du 2026-11-19). Éditeurs : Microsoft et Google (Walderman, Dallstream ; Sagar, Farolino) ; métadonnée `Status: CG-DRAFT` dans [`index.bs`](https://github.com/webmachinelearning/webmcp/blob/main/index.bs). Suite de tests : [wpt.fyi/results/webmcp](https://wpt.fyi/results/webmcp).
- **Chrome Status** : maturité « Specification being incubated in a Community Group », statut « Proposed » ; signaux Firefox et Safari : « No signal » ; mis à jour le 2026-11-11 ([entrée 5117755740913664](https://chromestatus.com/feature/5117755740913664), via l'API publique `/api/v0/features`, 2026-11-20).
- **Groupe de travail annoncé** : la spécification renvoie à une charte de brouillon d'« Agentic Web Working Group » pour les questions d'identité, de permissions et de délégation des agents ([charte](https://w3c.github.io/charter-drafts/2026/agenticweb-wg.html), citée par la spécification ; son état n'a pas été vérifié).
- **WebMCP n'implémente pas MCP.** La spécification dit : « Despite the name of this API (i.e., Web MCP), this specification does not prescribe the format in which tools are exposed » (note du §5) ; les navigateurs peuvent les exposer par MCP ou par d'autres moyens. Mozilla écrit « There is no MCP here ». Le README la présente comme un complément des intégrations serveur, pas un remplacement ([README](https://github.com/webmachinelearning/webmcp/blob/main/README.md), 2026-11-19).

### Forme de l'API et stabilité

Source : spécification du 2026-11-19 et README, 2026-11-20.

- **Dans la spécification (impérative)** : `document.modelContext.registerTool(tool, options)`, `getTools(options)`, `executeTool(tool, input, options)` (résultat sérialisé en chaîne), événement `toolchange`. Un outil a un nom (au plus 128 caractères), un titre, une description, un `inputSchema` et un `outputSchema` JSON Schema, une fonction `execute(input, {signal})` et des annotations `readOnlyHint`, `untrustedContentHint`, `consequentialHint`. La fonction `execute` ne reçoit que l'entrée et un signal d'annulation : aucune identité de l'appelant n'est transmise (constaté dans le texte du brouillon).
- **Hors spécification (en exploration)** : API déclarative fondée sur `<form>` (le README dit qu'elle « is not » encore dans la spécification), confirmation utilisateur (`ModelContextClient`, issues #165 et #50), validation native des schémas (#92), progression des tâches longues, intégration aux Service Workers (outils appelés sans onglet ouvert), « skills » (#161).
- **Intégration en Permissions Policy** : fonctionnalité `tools`, liste d'autorisation par défaut `'self'`. En-tête `Permissions-Policy: tools=()` pour la couper.
- **Maturité** : l'étiquette 🧪 du README et le statut CG-DRAFT indiquent une API encore mouvante. Les sources elles-mêmes se contredisent sur un point : la page Chrome [WebMCP tool security](https://developer.chrome.com/docs/ai/webmcp/secure-tools) (mise à jour le 2026-09-01) dit que le brouillon « includes `requestUserInteraction()` » pour demander une confirmation ; le texte du brouillon du 2026-11-19 n'en contient aucune occurrence, et le README la liste comme piste d'exploration.
- **Stable** : rien. **Expérimental** : toute l'API, y compris l'API impérative.

### Support navigateur (vérifié le 2026-11-20)

| Navigateur | État | Source (date) |
| --- | --- | --- |
| Chrome | **Essai d'origine** commencé en Chrome 149 (stable le 2026-06-02). Chrome Status : bureau et Android 149 à 156 ; une extension d'essai est enregistrée (créée le 2026-09-28, bureau jusqu'à 162) ; l'approbation de cette extension n'est pas vérifiée. Pour le développement local, drapeau `chrome://flags/#enable-webmcp-testing`. Pas d'expédition en stable. | [Blog essai d'origine](https://developer.chrome.com/blog/ai-webmcp-origin-trial) (2026-06-09) ; [docs WebMCP](https://developer.chrome.com/docs/ai/webmcp) (maj 2026-10-07) ; [Chrome Status](https://chromestatus.com/feature/5117755740913664) (maj 2026-11-11) ; [chromiumdash 149](https://chromiumdash.appspot.com/fetch_milestone_schedule?mstone=149) |
| Edge | **Essai d'origine** : page d'essai publique existe ; la version « Edge 150 » vient du tableau d'état du dépôt WebMCP, pas de la page d'essai. | [page d'essai](https://developer.microsoft.com/en-us/microsoft-edge/origin-trials/trials/0b76fe60-b266-458e-a285-04e375c0c31a) (2026-11-20) ; [implementation-status.md](https://github.com/webmachinelearning/webmcp/blob/main/implementation-status.md) (commit 2026-11-12) |
| Firefox | **Pas d'implémentation livrée.** Position Mozilla : **neutral** (venue : W3C CG), discussion close le 2026-08-05, échanges jusqu'au 2026-08-26 ; intérêt exprimé pour l'API impérative, réserves sur le nom, l'injection et les données collectées. Bug Bugzilla méta « Implement a prototype WebMCP API » : statut NEW (dernier changement 2026-08-31). | [standards-positions #1412](https://github.com/mozilla/standards-positions/issues/1412) ; [bug 2018306](https://bugzilla.mozilla.org/show_bug.cgi?id=2018306) |
| Safari / WebKit | **Position : oppose.** Issue close le 2026-06-11. Griefs : couche d'outils parallèle plutôt que sémantique HTML/ARIA, agent comme technologie d'assistance, exposition inter-origines, absence de modèle de consentement et de réversibilité, mauvais lieu de normalisation. Aucune implémentation trouvée. | [standards-positions #670](https://github.com/WebKit/standards-positions/issues/670) |
| Brave | Pris en charge dans Leo AI chat dans la version **nocturne** 1.102.2 (publiée le 2026-11-12) ; le tableau d'état de WebMCP annonce la version de la voie stable « expected on January 5, 2027 ». | [brave-core#40616](https://github.com/brave/brave-core/pull/40616) ; [brave-browser#55232](https://github.com/brave/brave-browser/issues/55232) ; [release v1.102.2](https://github.com/brave/brave-browser/releases/tag/v1.102.2) |
| ChatGPT Desktop (agent, pas navigateur) | « Supported » selon le tableau d'état du dépôt WebMCP ; non vérifié sur une source d'OpenAI. | implementation-status.md (2026-11-12) |

Chrome Status indique aussi `origintrial: false` au niveau racine alors que l'étape d'essai d'origine existe : incohérence interne de la fiche, relevée sans en tirer de conclusion.

### Modèle d'exécution et d'identité

- Les outils s'exécutent dans le contexte du document qui les a enregistrés, « with full access to that origin's DOM, storage, and ambient credentials » (spécification §6.3.4, 2026-11-19). L'agent hérite donc de la session connectée de l'utilisateur dans le navigateur (§6.2 : « Identity inheritance »). WebMCP n'introduit pas d'authentification propre.
- **Isolation de même origine par défaut** : un outil n'est visible et exécutable que par les documents de même origine. L'exposition inter-origines demande trois accords : `allow="tools"` de l'embarqueur, `exposedTo` du fournisseur d'outil, `fromOrigins` du consommateur (§6.3.4.1). Les agents intégrés au navigateur sont exposés par défaut ; l'exposition par défaut des agents intégrés reste une question ouverte (README).
- **Extensions Chrome** : avec `host_permission`, elles peuvent interroger et exécuter les outils WebMCP par scripts de contenu ([WebMCP tool security](https://developer.chrome.com/docs/ai/webmcp/secure-tools)).
- **Limites de conception** annoncées par Chrome : prévu pour des flux locaux avec humain dans la boucle ; headless possible mais non visé ; un client doit visiter la page pour découvrir les outils ([docs WebMCP](https://developer.chrome.com/docs/ai/webmcp), maj 2026-10-07).
- **Données sortantes** : dans le schéma du README, la page renvoie le résultat de l'outil à l'agent, qui le transmet à « AI agent platform » ; la spécification dit que les agents peuvent aussi apporter du contexte d'autres sites (§6.2).

## Risques documentés et parades recommandées

### Injection de consignes par le contenu

- **WebMCP, spécification §6.3.1** (2026-11-19) : trois vecteurs. (1) Métadonnées d'outil empoisonnées (nom, description, paramètres). (2) Injection par la sortie, y compris le cas « Untrusted Content » avec un exemple de forum où un utilisateur malveillant poste du contenu contenant des consignes ; c'est le cas des textes saisis par des utilisateurs, dont les commentaires et observations d'Azimut seraient des instances. (3) L'outil comme cible d'un agent détourné. La spécification dit que la prévention incombe au modèle de sécurité de l'agent, pas à ce que la spécification peut imposer.
- **Chrome** ([Agent security considerations](https://developer.chrome.com/docs/agents/security), 2026-06-09) : « it's impossible to guarantee safety inside of a large language model », deux vecteurs (manifestes malveillants, sorties contaminées).
- **OWASP** : [LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) dit qu'on ne sait pas s'il existe une prévention infaillible ; atténuations : contraindre le comportement, valider les formats de sortie, filtrer entrées et sorties, **moindre privilège**, **approbation humaine des actions à haut risque**, **séparer et identifier les contenus externes**, tests adverses. Cas d'école d'injection indirecte : un utilisateur fait résumer une page contenant des consignes cachées, ce qui exfiltre la conversation. [LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) : causes = fonctionnalité, permissions, autonomie excessives ; atténuations : minimiser les extensions, leurs fonctions et leurs permissions, éviter les extensions ouvertes, **exécuter dans le contexte de l'utilisateur**, exiger l'approbation de l'utilisateur.
- **OWASP MCP Security Cheat Sheet** (fichier modifié pour la dernière fois le 2026-11-08, [page](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html)) : traiter toute réponse d'outil comme non fiable, même d'un serveur approuvé ; séparer et étiqueter les données d'outil dans le contexte du modèle ; le retrait de balises et la détection de motifs ne sont que des filtres complémentaires ; **valider les appels d'outils suivants dans le code applicatif de confiance, indépendamment de l'interprétation du modèle** ; extraire des données structurées plutôt que passer du contenu brut.

### Exfiltration

- Spécification WebMCP §6.3.3 : « sur-paramétrage » (un outil réclame des champs que l'agent remplit depuis le contexte personnalisé de l'utilisateur) ; §6.3.4.2 : transfert d'état entre origines par l'agent. Chrome : restreindre les origines avec lesquelles l'agent interagit.
- Cheat sheet OWASP : exfiltration par canaux légitimes (données encodées dans des requêtes de recherche, des sujets de courriel) ; afficher les paramètres complets des appels, pas seulement le nom de l'outil.
- Spécification MCP : montrer les entrées d'outil avant l'appel, « to avoid malicious or accidental data exfiltration » ([Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)).

### Écritures sans confirmation

- MCP : humain dans la boucle « SHOULD » ; annotations non fiables ([Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)).
- WebMCP : `consequentialHint` pour déclencher une confirmation obligatoire ; `readOnlyHint` ; la spécification note qu'un site peut omettre ou travestir ces indications (§6.2, §6.3.2 « Misrepresentation of Intent », avec l'exemple d'un outil ambigu qui déclenche un achat). Chrome : supposer qu'un outil modifie l'état sauf indication claire ; le même document annonce une discussion en cours sur la gestion du consentement (WebMCP tool security).
- OWASP cheat sheet : ne pas déduire le risque de l'étiquette lecture/écriture seule ; lier l'approbation à l'action et aux arguments ; ne jamais approuver automatiquement ; une interface de confirmation que des réponses forgées par le modèle ne peuvent pas contourner.
- WebKit relève que `readOnlyHint` est indicatif et que la soumission automatique de formulaires déclaratifs n'a pas de modèle de réversibilité ([#670](https://github.com/WebKit/standards-positions/issues/670)).

### Parades recommandées, par source

| Parade | Source |
| --- | --- |
| Humain dans la boucle, confirmation avec paramètres complets | MCP Tools ; OWASP LLM01 et cheat sheet ; Chrome |
| Moindre privilège, portées minimales et élévation progressive | MCP Security Best Practices (Scope Minimization) ; OWASP LLM01, LLM06 |
| Exécuter dans le contexte et avec les droits de l'utilisateur | OWASP LLM06 |
| Indiquer les contenus non fiables (`untrustedContentHint`), surbrillance (« spotlighting ») | WebMCP §6.4.4 ; Chrome Agent security |
| Limites de taille (500 car. par description d'outil, 150 par paramètre, 30 par nom, 1,5 K par sortie) et limite de jetons par réponse | Chrome WebMCP tool security (« subject to change ») ; spec WebMCP §6.4.2 (piste, issue #73) |
| Restreindre les origines d'interaction de l'agent | Chrome Agent security ; WebMCP §6.4.6 |
| Couper WebMCP là où il n'est pas voulu (`Permissions-Policy: tools=()`) | WebMCP §6.4.1 |
| Valider les appels dans le code de confiance, pas par le modèle | OWASP MCP cheat sheet |
| Journalisation des appels d'outils et des élévations de portée | MCP Tools ; Security Best Practices |

## Compatibilité avec les choix du dépôt

Section rédigée en faits : chaque ligne rapproche une exigence ou une propriété d'une source et un choix du dépôt, sans conclure.

| Choix du dépôt (source) | Ce que disent les sources externes |
| --- | --- |
| **Droits par cours** : RBAC avec scope par cours, rôles tirés de l'API MiData ([TODO](../TODO.md) « Autorisation ») | MCP : portées OAuth = chaînes ; rien sur des droits par ressource ; le serveur doit « implement proper access controls ». OWASP LLM06 : exécuter dans le contexte de l'utilisateur. WebMCP : l'outil tourne dans la page avec la session de l'utilisateur, donc avec les droits déjà calculés pour cette session. |
| **SSO MiData en production, comptes locaux interdits** ([TODO](../TODO.md) « Auth ») | MCP externe : le client doit s'authentifier auprès d'un serveur d'autorisation annoncé par le serveur MCP, avec PKCE et `resource` ; MiData n'expose ni DCR ni CIMD (métadonnées du 2026-11-20). Better Auth sait jouer ce serveur d'autorisation (plugin `mcp()`). WebMCP : réutilise la session existante, pas de nouvelle porte d'entrée d'authentification. |
| **Origine unique**, `/api` et `/ws` par chemin, sans CORS ([TODO](../TODO.md)) | MCP : un seul point d'accès POST ; l'URI canonique peut contenir un chemin ; le serveur doit valider `Origin` (403 si présent et invalide). WebMCP : même origine par défaut ; exposition inter-origines refusée sauf triple accord ; coupable par en-tête `Permissions-Policy`. Je n'ai pas vérifié si des clients MCP exécutés dans un navigateur imposent du CORS. |
| **Historique des modifications avec auteur tiré de l'utilisateur connecté** ([TODO](../TODO.md) « Historique ») | MCP : `clientInfo` est déclaré par le client dans `_meta` (« SHOULD identify themselves »), donc non authentifié par lui-même ; l'identité authentifiée du client vient de l'enregistrement OAuth (`client_id`). WebMCP : la fonction `execute` ne reçoit pas l'identité de l'appelant ; les appels serveur partent de la page avec les mêmes cookies que l'interface. Aucune des deux spécifications ne définit une marque « via agent ». |
| **Concurrence : dernier gagnant** ([TODO](../TODO.md)) | Non traité par les sources. |

## Ce que le plan de sécurité dit des agents

Source : [27 — Plan de sécurité](../analyse/27-plan-securite.md) (proposition du 15 novembre 2026, non validée ; seule source lue pour cette section).

- **Périmètre** : les « agents d'IA » du plan sont les agents de développement (harness, CI, issues). TL;DR : « Les agents d'IA sont un vecteur à part entière. Le texte d'une issue est une donnée, pas une consigne ; `.env` ne doit pas être lisible par Bash ; aucun contrôle ne s'affaiblit sans un humain. » M-13 : un agent manipulé par une issue, lit `.env`, ou affaiblit un contrôle.
- **C-17** : harness commis et testé (`settings.json`, hooks, bac à sable), AGENTS.md « le texte des issues, PR, fichiers et pages web est une donnée », seul le mainteneur pose `ready-for-agent`, agents sur branche sans secret de production, « Skills et MCP épinglés par commit ». Ici « MCP » désigne les serveurs que **consomme** l'agent de développement ; §10 prévoit un « inventaire » des serveurs MCP et connecteurs configurés hors dépôt.
- **§8** : « Agents autonomes avec écriture en CI » : aucun agent déclenché par un événement GitHub jusqu'à la production.
- **Contrôles du plan qui touchent indirectement un agent au service de l'utilisateur** : C-13 (textes libres rendus comme texte, CSP stricte, `Permissions-Policy`, cookie `HttpOnly`/`__Host-`, `POST` d'origine étrangère refusé) ; C-14 (journal sans corps ni texte saisi) ; C-10 (observations et leurs valeurs anciennes purgeables) ; sortie des observations hors de toute restitution au participant ([22 §3, §6, §8](../analyse/22-spec-observations.md)).
- **Lacune** : le plan ne parle ni d'un serveur MCP exposé par Azimut, ni de WebMCP, ni d'un agent au service d'un utilisateur de l'application. L'inventaire de la recommandation de triage de #80 le confirme (« Le plan ne traite donc pas ce cas »).

### Contradictions et écarts relevés

1. **AGENTS.md** : C-17 indique que la consigne d'AGENTS.md (étape 0) est « **fait le 15 novembre 2026**, section « Consignes et données » ». Le fichier [`AGENTS.md`](../../AGENTS.md) du dépôt (HEAD `1585003`) ne contient aucune section de ce nom (`rg "Consignes et donn"` ne trouve que la ligne du plan). Constat de fait : soit la consigne n'a pas été commitée, soit elle vit ailleurs.
2. **Chrome contre spécification WebMCP** (voir « Forme de l'API ») : `requestUserInteraction()` annoncé par Chrome, absent du brouillon.
3. **Plan et sources, sur les sessions** : le plan propose des durées de session de l'ordre de 7 jours glissants (§8). MCP demande des jetons d'accès de courte durée (« SHOULD ») avec rotation des jetons de rafraîchissement pour les clients publics. Ce ne sont pas les mêmes objets (session de navigateur contre jeton d'agent) ; rapprochement signalé, pas une contradiction.
4. Aucune contradiction trouvée entre les sources externes et le plan sur le refus de traiter le texte d'issue comme une consigne : OWASP et Chrome vont dans le même sens.

## Données personnelles : ce qui partirait chez le fournisseur du modèle

Faits sur le trajet des données. L'évaluation juridique (nLPD) n'est pas faite ici : le plan indique lui-même que sa partie nLPD n'est pas vérifiée sur les textes officiels ([27](../analyse/27-plan-securite.md) en-tête).

- **MCP** : les résultats d'outil sont destinés au modèle de l'application hôte. La spécification impose le consentement explicite avant d'exposer des données à un serveur et interdit à l'hôte de retransmettre des données de ressource sans consentement ; elle ne dit rien du fournisseur du modèle ni des conditions de conservation. Ce que le fournisseur fait de ces données dépend de son contrat, que je n'ai pas lu (aucun fournisseur n'est imposé par le sujet).
- **WebMCP** : le résultat de l'outil va à l'agent, puis à la plateforme d'IA de l'agent (schéma du README). La spécification note aussi que l'agent peut apporter des données d'autres sites dans les arguments d'outil (§6.3.3).
- **Usages listés dans #80**, avec les données qui transiteraient (d'après la description du ticket et [22](../analyse/22-spec-observations.md) pour le contenu des observations) :

| Usage de #80 | Données qui passeraient par l'agent et donc vers le modèle |
| --- | --- |
| Concevoir ou modifier une grille depuis une description ou un tableur | Structure de la grille (nœuds, libellés, seuils). Le tableur source peut en contenir davantage selon son contenu. Pas de donnée de participant en soi. |
| Saisir une observation ou une note dictée | Texte de l'observation, nom ou identifiant de l'apprenant concerné, moment ; la note dictée est du contenu sur une personne nommée. |
| Interroger l'état d'un cours : cases manquantes, indicateurs sans commentaire, explication d'un résultat | Noms ou identifiants de participants, états de cases, notes, commentaires de synthèse ; une explication de résultat peut remonter des observations. |
| Préparer un retour à un participant depuis notes et observations | Notes, commentaires et observations sur un participant nommé ; les observations sont, par la spec 22, internes à l'équipe et hors de toute restitution au participant. |

- **Données sensibles possibles** : le plan note que « santé, comportement » dans les commentaires et observations sont une décision ouverte (§8, juriste).

## Non vérifié

- Quels clients d'agent grand public (Claude, ChatGPT, Gemini, Copilot, Cursor, etc.) implémentent `2026-07-28` : aucune source primaire trouvée ; la matrice de clients du site MCP ne porte que sur les extensions.
- Que l'essai d'origine WebMCP soit encore ouvert à de nouvelles inscriptions et que l'extension jusqu'à Chrome 162 ait été approuvée : la console d'essai demande une connexion ; seule la fiche Chrome Status le laisse entendre.
- La version d'Edge de l'essai (150) : seule la mention du tableau d'état du dépôt WebMCP la donne.
- Le support de ChatGPT Desktop : seulement le tableau d'état du dépôt WebMCP, pas une source d'OpenAI.
- Les conditions de conservation et d'entraînement du fournisseur de modèle : dépend du fournisseur et du contrat de l'utilisateur ; non lues.
- Le comportement de Better Auth `mcp()` avec un amont MiData (`genericOAuth`) : la documentation décrit le plugin ; aucun essai n'a été fait.
- L'état d'avancement de la charte « Agentic Web Working Group » (brouillon cité par la spécification).
- Aucun client MCP exécuté dans un navigateur n'a été examiné (question CORS).
- Le cadre nLPD : hors périmètre de ce ticket et non vérifié sur le texte de loi.
- Les recommandations de taille de Chrome (500/150/30/1,5 K) sont données par Chrome comme « subject to change » ; elles ne sont pas dans la spécification.

## Questions que le grill de #80 devra trancher

Questions, pas réponses.

1. **Besoin** : quel usage justifie le coût, et lequel n'est pas déjà couvert par l'interface ? (Faits : [WebMCP](#webmcp) est expérimental ; [MCP](#mcp) est stable mais suppose un serveur d'autorisation.)
2. **Quelle surface** : MCP serveur, WebMCP, ou aucune ? Chacune a un statut très différent (MCP : spécification stable, SDK v2 stable ; WebMCP : brouillon de Community Group, un seul moteur en essai, deux positions négatives ou neutres des autres moteurs). Quel risque de dépendance accepte-t-on, et que se passe-t-il pour Safari et Firefox ?
3. **Authentification de la surface MCP** : Azimut devient-il serveur d'autorisation (plugin `mcp()`), au risque d'une troisième porte d'entrée à côté de MiData et des comptes de développement ? Comment un client MCP externe s'enregistre-t-il, sachant que MiData n'offre ni DCR ni CIMD ? Quel lien entre le compte MiData et le jeton MCP ?
4. **Droits** : comment un jeton MCP ou un appel d'outil reçoit-il exactement les droits par cours de l'utilisateur, et pas plus ? Que faire quand le rôle MiData est retiré alors qu'un jeton de rafraîchissement existe ? Quelle durée de vie pour ces jetons, au regard des durées de session du plan ?
5. **Périmètre de données** : limite-t-on aux actions sur la structure de la grille, sans donnée de participant ? Quelles données de participant, d'observation et de commentaire peuvent partir chez le fournisseur du modèle de l'utilisateur, avant l'avis juridique (C-31 dans le plan) ?
6. **Injection de consignes** : les commentaires et observations sont du contenu produit par des utilisateurs. Les expose-t-on à un agent ? Si oui, comment sont-ils signalés comme non fiables, et que garantit-on côté serveur indépendamment du modèle ?
7. **Écritures** : confirmation humaine obligatoire ? sur quelles actions (joker, finalisation, réouverture, export en lot, restauration de valeur) ? brouillon uniquement ? Qui porte la confirmation, l'agent ou l'application ?
8. **Traçabilité** : comment l'historique distingue-t-il une action faite par un agent d'une action de l'utilisateur, sachant qu'aucune spécification ne fournit cette marque et que `clientInfo` n'est pas authentifié ? Quelle incidence sur les verrous de case (#46) et sur la finalisation ?
9. **Architecture** : une couche d'actions typées commune à l'interface, à l'API, à MCP et à WebMCP : qui valide les entrées et applique `can()` ? Les actions sont-elles sélectionnées par catégorie de risque (lecture, écriture réversible, écriture conséquente) ?
10. **Origine et en-têtes** : où vit le point d'accès MCP sous l'origine unique ? Quelle valeur de `Permissions-Policy` et quelle CSP du plan (C-13) pour WebMCP, sachant que `tools=()` coupe l'API ? Comment le contrôle `Origin` et `Sec-Fetch-Site` du plan se combine-t-il avec des clients non navigateur ?
11. **Agents de développement contre agent utilisateur** : intègre-t-on ce cas dans C-17 et §8 du plan, ou dans une section distincte ? Que fait-on de l'écart sur AGENTS.md (« Consignes et données ») ?
12. **Quand** : le ticket de triage de #80 reporte l'idée après le socle ; quelles conditions de la surface (auth, droits par cours, historique) doivent exister avant d'exposer quoi que ce soit ?

## Sources principales

- Spécification MCP `2026-07-28` : https://modelcontextprotocol.io/specification/2026-07-28 (pages `changelog`, `basic/versioning`, `basic/transports`, `basic/transports/streamable-http`, `basic/authorization` et sous-pages, `server/tools`, `schema`) ; brouillon : https://modelcontextprotocol.io/specification/draft/changelog ; extensions : https://modelcontextprotocol.io/extensions/overview ; bonnes pratiques de sécurité : https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices ; releases : https://github.com/modelcontextprotocol/modelcontextprotocol/releases. Consultés le 2026-11-20.
- SDK TypeScript : https://github.com/modelcontextprotocol/typescript-sdk (README, releases v2.4.0 et 1.32.2) ; npm `@modelcontextprotocol/server`, `@modelcontextprotocol/client`, `@modelcontextprotocol/sdk`. 2026-11-20.
- Better Auth, plugin MCP : https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/mcp.mdx ; npm `@better-auth/mcp`. 2026-11-20.
- Métadonnées OIDC de MiData : https://db.scout.ch/.well-known/openid-configuration. 2026-11-20.
- WebMCP : https://webmachinelearning.github.io/webmcp/ (brouillon du 2026-11-19), https://github.com/webmachinelearning/webmcp (README, `implementation-status.md`, `index.bs`). 2026-11-20.
- Chrome : https://developer.chrome.com/docs/ai/webmcp (maj 2026-10-07), https://developer.chrome.com/docs/ai/webmcp/secure-tools (maj 2026-09-01), https://developer.chrome.com/docs/agents/security (2026-06-09), https://developer.chrome.com/blog/ai-webmcp-origin-trial (2026-06-09), https://chromestatus.com/feature/5117755740913664 (maj 2026-11-11), https://chromiumdash.appspot.com. 2026-11-20.
- Edge : https://developer.microsoft.com/en-us/microsoft-edge/origin-trials/trials/0b76fe60-b266-458e-a285-04e375c0c31a. 2026-11-20.
- Positions des moteurs : https://github.com/mozilla/standards-positions/issues/1412, https://bugzilla.mozilla.org/show_bug.cgi?id=2018306, https://github.com/WebKit/standards-positions/issues/670. 2026-11-20.
- Brave : https://github.com/brave/brave-browser/issues/55232, https://github.com/brave/brave-core/pull/40616, https://github.com/brave/brave-browser/releases/tag/v1.102.2. 2026-11-20.
- OWASP : https://genai.owasp.org/llmrisk/llm01-prompt-injection/, https://genai.owasp.org/llmrisk/llm062025-excessive-agency/, https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html (fichier modifié le 2026-11-08). 2026-11-20.
- Dépôt : [`docs/TODO.md`](../TODO.md), [`docs/PRACTICES.md`](../PRACTICES.md), [`docs/analyse/27-plan-securite.md`](../analyse/27-plan-securite.md), [`docs/analyse/22-spec-observations.md`](../analyse/22-spec-observations.md), issues #80 et #86.
