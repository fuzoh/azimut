# Azimut — practices: stack, harness and tooling

## TL;DR

**A rule holds only when a script, type or CI check enforces it.** Prose-only rules erode. Azimut should start with every gate in place from the first commit.

**Main choices**

1. **Bleeding edge: decided library by library.** Picks off the stable track: **Effect 4.0** (GA, LTS; core only), **TanStack DB 0.x** (the client store, behind collection definitions), **Drizzle 1.0 RC** (behind a repository layer) and **TypeScript 7** (stable, but its ecosystem is young). Elysia stays on 1.4. Tests run on **Vitest 5** under Bun.
2. **Real-time starts simple.** Use server-authoritative data with optimistic UI (TanStack DB Query collections fed by Eden). Over that, an Elysia WebSocket and Bun `server.publish` push "entity X changed" events. Don't add Valkey, CRDTs, P2P or a sync service until a measured trigger appears (§2).
3. **One contract language: Valibot.** Effect code uses it through a `decode(schema)` helper that maps failures to a tagged error. No Effect Schema.
4. **Harness committed with the repo.** That means `.claude/settings.json`, vendored skills and tested hooks. One instruction file, AGENTS.md, imported by CLAUDE.md. No per-turn injected reminders.
5. **Skills: vendor about 8, skip the ceremony chains.** From mattpocock, take tdd, codebase-design, domain-modeling, diagnosing-bugs, grilling, research and writing-for-agents. From Emil Kowalski, take emil-design-eng, animate and review-animations. From pstack, take ideas only.

Open decisions are tracked in §7 and in `TODO.md`.

---

## 1. Stack: versions checked on 2026-10-03

All versions below were verified on the npm registry. Effect 4.0.0, Vitest 5.0.3 and Elysia 2 beta are also confirmed against dist-tags.

| Layer | Pick | Why, and what to avoid |
| --- | --- | --- |
| Runtime / monorepo | **Bun 1.4.x**, Turborepo 2.11 | Pin Bun only in `packageManager`. Add a CI check that the Docker `FROM` and CI setup use the same version, so there is one source of truth for the Bun version. |
| TypeScript | **7.0.2** strict, as compiler and checker | TS 7.0 ships **no compiler API** (a new one is expected in 7.1). No ESLint, so typescript-eslint's cap doesn't matter. Effect diagnostics go through `@effect/tsgo`. Stryker 10 needs the TS 6 API, so mutation testing is deferred (§9). |
| Frontend build | **Vite 8.3** with `@vitejs/plugin-react` (Babel path) and `babel-plugin-react-compiler` 1.0 | Vite 8 has had 7 months and 3 minors, so it is no longer leading-edge. Vitest 4.1 and plugin-react 5.2 both accept `^8`. Avoid the Rust/oxc React Compiler path, which is marked experimental. |
| UI | React 19.3, TanStack Router 1 / Query 5 / Form 1, Tailwind 4.3, shadcn CLI 4 | Stable. Use `createFormHook` from day one. |
| Client store | **TanStack DB 0.11** ⚡ (leading edge) | 0.x, with a minor release every 1–2 weeks. Its blast radius stays contained because `query-db-collection` is already 1.x. Details in §2. |
| API | **Elysia 1.4.30** with Eden | Elysia 2 is a beta rewrite (WS becomes opt-in, packages move to `@elysia/*`), so avoid it. Use `@elysia/eden` (1.4.10), now the canonical package; `@elysiajs/eden` is frozen at 1.4.9 (checked 2026-10-03). Eden types errors only when each route declares per-status `response: {200, 400, 401…}` schemas. That makes a "mandatory `response:`" rule **required** for typed errors. |
| Effect | **4.0.0** ⚡ (leading edge), core only | Core `Effect`, `Stream` and `Schema` are stable and LTS. `effect/rpc`, `http`, `sql`, `reactivity` and `eventlog` are tagged `@stability unstable`, so don't use them. The fallback is 3.22.2 now, with a known v4 rewrite later. For a greenfield repo, v4 core is the better bet. |
| DB | Postgres 18, **Drizzle 1.0.0-rc.4**, driver `postgres-js` | The RC has breaking refactors, so wrap queries in a repository layer (`Effect.tryPromise`) and pass `db`/`tx` explicitly instead of using a module-global `db`. Migrations come from `drizzle-kit generate` and are committed; never use `push`. Don't use rc.4's schema generation from tables: the contract is never derived from the DB. `bun-sql` has open bugs on JSON, timezones and timestamps (drizzle #6132, #4311, #5175). `@effect/sql` is unstable in v4. |
| Auth | Better Auth 1.7 | Mount only the plugins in use, so no unused endpoint (e.g. admin) is exposed. |
| Tests | **Vitest 5** under `bun --bun`; Playwright 1.63 | Stryker is deferred until it supports TS 7 (and Vitest 5: stryker-js#6210). Measured facts in §9. |
| Lint / format | **oxlint 1.86** (stable) + oxfmt 0.71 (exact pin) | Details in §3. oxfmt is 0.x but cheap to roll back, so an exact pin is enough. |
| Hygiene | Knip 6, Lefthook 2, squawk 2.66, release-please 17 | Knip understands Bun catalogs (`--fix-type catalog`). |
| Dep updates | **Renovate**, or Dependabot plus a catalog script | **Dependabot doesn't check Bun catalogs** (dependabot-core#14320, open). That conflicts with two goals: Dependabot, and hoisting deps to the catalog. **Renovate doesn't either** (2026-10-03): PR renovatebot/renovate#42909 is open and unmerged, and its docs list only pnpm and Yarn catalog dep types. |

**Not chosen:** `bun test`, Vitest 4.1, Effect Schema, Drizzle 0.45, the `bun-sql` driver, Electric (for now), Elysia 2 beta, Yjs 14 beta, the oxc React Compiler, BullMQ, Valkey, self-hosted S3, and `effect/rpc`.

**Target browsers:** Vite's default `build.target` is `baseline-widely-available`, which roughly matches the "browsers up to 2 years old" rule. Set a matching browserslist so oxlint, Tailwind and Vite all agree.

---

## 2. Real-time, CRDTs, P2P and TanStack DB

### Decision tree (depends on the domain)

| Question | If yes |
| --- | --- |
| Do several people type into the **same text or document at the same time**? | Use a **CRDT for that document type only** (Yjs + Hocuspocus, or Loro), with snapshots stored in Postgres. Everything else stays simple. |
| Is the data mostly **records with one writer at a time** (answers, grades, statuses)? | **No CRDT.** Use last-write-wins, or a server version check that returns a 409. |
| Must it work **offline** (exam-room Wi-Fi, mobile)? | Use a **sync engine**: swap collections to Electric, or to PowerSync for real offline SQLite. |
| Are a few seconds of latency fine, with coarse events ("grade published", "session started")? | Use an **invalidation push**: the server says "X changed" and the client refetches. |
| Must the **server be authoritative** (grading, audit, compliance)? | Almost certainly yes, and that **rules out P2P as the source of truth**. |

### Is P2P realistic? Not in browsers.

- WebRTC still needs a signaling server and STUN/TURN.
- Browsers have no LAN discovery API.
- Host IPs are hidden behind mDNS `.local` candidates, which fail on school and corporate Wi-Fi that isolates clients.
- Since Chrome 142, Local Network Access shows a permission prompt.
- `y-webrtc` hasn't been released since 2023.

"LAN P2P" therefore still means a server, a TURN fallback and a permission prompt, and the result is still not authoritative. Drop it from the goals unless "no server reachable" is a hard requirement.

### Is TanStack DB the right tool? For the client store, yes. It is not the transport.

- **What it gives you:**
  - Typed collections that accept a Standard Schema (Valibot or Effect).
  - Live queries with joins and filters, kept up to date incrementally with sub-millisecond updates.
  - Optimistic `insert/update/delete` with automatic rollback.
- **Why it suits the goals:** it is a good fit for a client-heavy app, where computation runs on live queries in the client.
- **Upgrade path:** start with `queryCollectionOptions({ queryFn: () => api.x.get() })` through Eden. When a WS event arrives, call `collection.utils.refetch()` or `writeUpsert`. Later, switch a collection to `electricCollectionOptions` **without touching components**.
- **Risks:** it is 0.x with fast churn. Persistence and on-demand modes are new, and the Electric and PowerSync adapters are 0.x. Keep every collection definition in one `collections/` module per feature.
- **Side benefit:** collections replace most of a hand-written query-key factory and the copy-pasted invalidation that comes with it.

### Electric facts (checked 2026-10-03)

- **Versions:** sync service 1.8.1, `@electric-sql/client` 1.5.28 and `@tanstack/electric-db-collection` 0.5.4 (pre-1.0). The docs moved to electric.ax.
- **Writes:** writes go through our own API, which returns `pg_current_xact_id()` from **inside the same transaction**. The client then calls `awaitTxId(txid)`.
- **Auth:** a proxy (or gatekeeper) sets the table and `WHERE` server-side, never from client params. Client-side `WHERE` clauses are ANDed with the server's, so they can only narrow the result.
- **Postgres:**
  - Needs `wal_level=logical`, a role with `REPLICATION`, and a direct connection (no pooler).
  - Postgres 18 is not explicitly confirmed.
  - `ELECTRIC_STORAGE_DIR` must persist, otherwise every restart forces a full re-sync.
- **Bun proxy:** Bun caps concurrent `fetch()` at 256, so raise `BUN_CONFIG_MAX_HTTP_REQUESTS`.
- **No ephemeral state:** presence and locks still need our own WebSocket.

### Transport: the minimum path, with escalation triggers

1. **Day 1:** one Bun instance. An Elysia `.ws` route calls `server.publish(topic)` *after the write commits*. The payload is IDs plus a version, and Eden `.subscribe()` is typed.
2. **More than one instance:** add a **Postgres LISTEN/NOTIFY** bridge. Use `tx.notify` inside the write transaction; each instance listens and re-publishes locally. NOTIFY has an 8 KB limit, so send IDs only. Bun's `sql.listen` is recent, so fall back to postgres.js if it causes trouble.
3. **Measured NOTIFY bottleneck, durable replay, or a shared rate-limit store:** add **Valkey**. In-memory rate limiters block scaling out, so Valkey is also the place for those.
4. **Background jobs:** use `pg-boss` or `graphile-worker` before any Redis or Valkey queue; a few jobs don't justify one.

### Effect fit

- **Server:**
  - Use Elysia + Eden for transport and Effect for domain and services, all through **one `ManagedRuntime`**.
  - Map tagged errors to the envelope in **one** place, the single `onError` / `runPromise` adapter.
  - Don't also run `effect/rpc`, since that would mean two transport stacks.
- **Client:**
  - Use Effect `Stream` + `Schedule` for the WS reconnect and backoff loop and for message decoding.
  - Keep state in TanStack DB, not in Effect reactivity, which is unstable.
- **Schema:**
  - **Valibot** is the single contract language. Elysia takes Valibot schemas directly; Effect code decodes through a `decode(schema)` helper that maps failures to a tagged error.
  - Effect Schema was the alternative. Elysia accepts it through Standard Schema (in v4, `Schema.toStandardSchemaV1`; Elysia's docs still show the v3 name), but it needs that wrapper on every route plus a custom OpenAPI mapper (§9).

---

## 3. Gates: turn every `GOALS.md` rule into a check

| Goal rule | Gate |
| --- | --- |
| Complexity ≤ 12 | oxlint `complexity: ["error", { max: 12, variant: "classic" }]` (the default is 20) |
| Functions ≤ 80 lines, files ≤ 600 | oxlint `max-lines-per-function` / `max-lines` set to `error` from commit 1, **test files included**. Cap route files lower. |
| `import/no-cycle` | `plugins: ["import"]`. Type-only imports are ignored by default. |
| Layering / workspace DAG | oxlint has **no built-in boundary rule**. Use `no-restricted-imports` with `patterns` per folder, plus a small structure script that checks `package.json` deps against a declared DAG. The JS-plugin API is alpha, so skip custom rules for now. |
| React Compiler safety | oxlint now ships 22 React Compiler rules (`purity`, `immutability`, `refs`, `set-state-in-effect`), in `correctness`. They are about 6 weeks old: turn them on, and watch for false positives. |
| Effect correctness | Run `@effect/tsgo` (the TS 7 port of the Effect language service) with `effect-tsgo patch` so that `floatingEffect`, `missingEffectError` and similar diagnostics fail `tsc` in CI. Many are off by default, so enable them explicitly. `@effect/eslint-plugin` is stale. |
| Lint config can't be relaxed | A guard test (`oxlintrc.test.ts`) fails if any override relaxes a guarded rule. Also: CODEOWNERS on config, and Claude `ask` on config edits (§4). |
| Strict tsconfig | `packages/config/tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax` |
| Catalog / no drift | A CI script checks three things: every external dep is `catalog:`, there are no root runtime deps, and the Bun version matches across `packageManager`, Docker and CI. Knip enforces unused deps and exports. |
| One error envelope | Error codes as a **const union** in `contracts`, used to type `code` (not a plain `string`). Send codes, not localized strings. A test round-trips every error class. |
| End-to-end types | Every route declares per-status `response:` schemas, enforced by a test that walks the route table. Add `*.test-d.ts` for Eden types. Never name a resource after an HTTP verb (`options`). |
| Auth helper | Typed `caller` from one macro, `can()` with a pure policy engine, default-deny `none` role, a role × endpoint test grid per module, and a test that fails if any mounted route has no policy |
| Validated env | One entrypoint per runtime. Reject placeholder or all-zero secrets outside dev. Use `DEPLOY_ENV` separate from `NODE_ENV`. |
| Same gates locally and in CI | One `gate` script called by Lefthook pre-push and by CI. The pre-commit hook is the fast subset: `parallel: true`; gitleaks on staged files; oxfmt with `stage_fixed`; oxlint on staged files without type-aware; `check-types --affected`. Run type-aware oxlint in pre-push and CI only, since it is too slow for pre-commit. Set `assert_lefthook_installed: true`. |
| Migrations | squawk in CI (`CONCURRENTLY`, `NOT VALID`) |
| shadcn lint | [`@shadcn/lint`](https://github.com/shadcn-ui/lint) 0.2.0 (created 2026-09, fast churn) is an ESLint plugin and an **oxlint JS plugin** (oxlint ≥ 1.80, `"jsPlugins": ["@shadcn/lint"]`). It requires Tailwind v4. Confirmed rules: `shadcn/no-restyle` (per-component contracts, e.g. "Button owns its padding") and `shadcn/no-arbitrary-values`. |

### Test pyramid

| Layer | Scope | Harness |
| --- | --- | --- |
| Unit + **mutation** | Only the pure `domain` package. This is the client-heavy computation, imported by both client and server (for exports). | Vitest 5. Mutation testing is deferred until Stryker supports TS 7. When it returns: `mutate` limited to `packages/domain/**`, run nightly with `--incremental`, gate on mutation score, not coverage. |
| Integration | Main features through HTTP, on real Postgres | One DB clone per worker (`CREATE DATABASE … TEMPLATE`), truncate with `RESTART IDENTITY` per test, builders per aggregate, real sign-in, a cheap password hash in tests. No `retry`. Mock only third-party code. One shared `testing` package instead of copying setup into each feature. |
| E2E | Main user journeys | Playwright on an isolated compose stack with tmpfs Postgres and `.env` masked. **A required check from the first PR.** |

Also write down a "which test goes where" table. One cheap filter for weak tests comes from pstack: *if the test still passes when every import returns `undefined`, delete it.*

### Security and ops from day one

- **CI scans:** CodeQL, `bun audit --audit-level=high` and the gitleaks Action as required checks.
- **Actions hardening:** SHA-pinned Actions, `permissions: contents: read`, and `--ignore-scripts` on bot installs.
- **HTTP headers:** CSP, HSTS, `nosniff` and DENY, set in `onRequest` so they survive error paths.
- **Cookies and CSRF:** `SameSite=Lax`, plus an Origin / `Sec-Fetch-Site` check on mutating routes.
- **Limits:** auth rate limits, and one body-limit constant shared by the proxy and the app.
- **Uploads:** sniff magic bytes; serve `attachment` for non-images.
- **Observability:** JSON logs, request IDs, a readiness probe that checks dependencies, graceful shutdown, and one DB pool.
- **Images:** non-root, built once in CI, pushed to GHCR by release tag, and rolled back by tag.
- **Docker build:** `turbo prune --docker` instead of hand-written COPY lines.
- **Data:** run migrations as a one-shot job, not at container boot, and automate backups with a tested restore.
- **Compose:** one base file plus profiles, not 5–7 files. Validate it with `docker compose config --quiet` in CI.
- **Release:** one deploy workflow, not six.

---

## 4. Claude Code harness

Everything here was checked against code.claude.com (2026-10-03).

### Files

```
AGENTS.md                 # single source, ≤ ~800 words of pointers + decisions; cross-tool
CLAUDE.md                 # one line: @AGENTS.md  (+ Claude-only notes if any)
.claude/settings.json     # committed: permissions, hooks, sandbox
.claude/settings.local.json  # gitignored: personal overrides only
.claude/rules/*.md        # path-scoped conventions (paths: frontmatter), e.g. tests, routes, migrations
.claude/skills/<name>/    # vendored skills, committed
.worktreeinclude          # .env etc. copied into worktrees
<pkg>/CLAUDE.md           # gotcha ledger, word-capped (loads on demand when files there are read)
```

- Claude Code reads `AGENTS.md` natively, but **only when no CLAUDE.md exists** (v2.1.277+). Importing it from CLAUDE.md with `@AGENTS.md` works in every session. Use the import rather than a symlink.
- Path-scoped `.claude/rules/` replace the walk-up `CONTEXT.md` convention. The harness loads them when Claude reads a matching file, so the agent doesn't have to remember to look.
- Nested `CLAUDE.md` ledgers are good as long as they stay short. Use a word cap enforced by the docs audit; a line cap is easy to game.
- Run **`/doctor prompt-audit`** periodically. It reports stale or contradictory instruction files and missing paths (v2.1.283+). It complements the CI docs audit.

### `.claude/settings.json` (skeleton)

```json
{
  "permissions": {
    "deny": [
      "Bash(npm *)", "Bash(npx *)", "Bash(pnpm *)", "Bash(yarn *)",
      "Bash(git push --force*)", "Bash(git reset --hard*)",
      "Read(./.env)", "Read(./.env.*)"
    ],
    "ask": [
      "Edit(/.oxlintrc.json)", "Edit(/lefthook.yml)", "Edit(/packages/config/**)",
      "Edit(/.github/**)", "Edit(/.claude/**)", "Bash(git push*)"
    ]
  },
  "sandbox": {
    "enabled": true,
    "network": { "allowedDomains": ["registry.npmjs.org", "github.com"] }
  },
  "hooks": {
    "PreToolUse":  [{ "matcher": "Bash",       "hooks": [{ "type": "command", "command": "bun \"$CLAUDE_PROJECT_DIR\"/tools/hooks/guard-bash.ts" }] }],
    "PostToolUse": [{ "matcher": "Edit|Write", "hooks": [{ "type": "command", "command": "bun \"$CLAUDE_PROJECT_DIR\"/tools/hooks/lint-file.ts" }] }],
    "Stop":        [{ "hooks": [{ "type": "command", "command": "bun \"$CLAUDE_PROJECT_DIR\"/tools/hooks/stop-gate.ts" }] }]
  }
}
```

Check the path anchors with `/permissions` after the first install. Permission rules use gitignore-style paths and don't support `a|b` alternation, so write one entry per path.

### Hooks

Keep hooks few and deterministic, and test them:

- **PreToolUse `guard-bash`:** only for what permission rules can't express, such as pushes to `main` or `--no-verify`. Exit 2 blocks the call, and stderr goes back to Claude. **Name it for what it blocks**, and test that it actually blocks it.
- **PostToolUse `lint-file`:** runs oxfmt and oxlint on the edited file. PostToolUse can't undo the edit, but exit 2 or `decision: "block"` **feeds the errors back to Claude** right away. This is the cheapest way to keep the agent inside the lint rules.
- **Stop `stop-gate`:** runs `check-types --affected` and exits 2 on failure so Claude keeps working.
  - It must check `stop_hook_active` to avoid loops; Claude Code also caps a Stop hook at 8 consecutive continuations.
  - The script itself must exit 2. A pipe like `tsc | head` returns `head`'s exit status, so it never blocks.
- **No `UserPromptSubmit` injection.** A per-turn reminder costs tokens on every turn, and every rule in it could be a gate.
- **Tests:** keep the hook scripts in a `tools/` workspace with Vitest tests that feed sample JSON on stdin. That avoids a second test runner.

### Skills

Install with `npx skills add <repo> --skill <name>` and **commit the output**. A CI check verifies that every skill referenced in AGENTS.md exists on disk. That way a fresh clone has every required skill.

- Use `disable-model-invocation: true` on heavy, user-triggered skills. That keeps their description out of context entirely until you invoke them.
- Use `paths:` to auto-scope a skill, e.g. `emil-design-eng` → `apps/web/**/*.tsx`.

| Source | Adopt | Adapt | Skip |
| --- | --- | --- | --- |
| **mattpocock/skills** | codebase-design, diagnosing-bugs, grilling, research, writing-for-agents, wizard, git-guardrails (as a template for the guard hook) | **tdd** (use the Vitest/Playwright/Stryker layers, drop jest examples, make the seam-confirmation step optional) · **domain-modeling** (pin GLOSSARY and ADR paths; this is the "docs = domain" rule) · **code-review** (remove the issue-tracker dependency, make lint gates the Standards axis) · prototype (UI mode on React + shadcn) | setup-pre-commit (Husky + Prettier, which conflicts with the Lefthook + oxfmt stack) · the whole to-spec / to-tickets / triage / implement / wayfinder / ask-matt chain (too much ceremony) · scaffold-exercises, shoehorn, teach |
| **emilkowalski/skills** (standard SKILL.md, works in Claude Code as-is) | **emil-design-eng** (fixes taste gaps: easing, press feedback, shadows), **animate**, **review-animations** | apple-design (springs and gestures only) · mobile-native (only if mobile or PWA matters) · popover snippets: change `--transform-origin` (Base UI) to `--radix-popover-content-transform-origin` if the shadcn setup uses Radix | pick-ui-library (steers state to zustand, which clashes with TanStack DB) · ask-sonner (shadcn already wraps it) · expo, swift |
| **cursor/plugins/pstack** (Cursor plugin; orchestration skills are Cursor-coupled) | — | **typescript-best-practices** (rewrite for Valibot; it assumes Zod) · **create-verification-skill** (a repo-local `verify-azimut` skill plus a feature map for driving the app with agent-browser or Playwright; the best idea in the bundle) · fold principles *encode-lessons-in-structure*, *test-behavior-not-implementation* and *boundary-discipline* into AGENTS.md as one line each | poteto-mode and its 23 playbooks, arena, swarm, interrogate panels, reflect, setup-pstack (sticky router plus multi-model ceremony) |

Ideas worth stealing without the skills:

- **Promote repeated instructions to gates.** The second time you write the same instruction, turn it into a lint rule, type or script (pstack).
- **Spell out agent mistakes.** Write project skills as "the mistakes agents make here, and the fix for each" (Emil).
- **Default to flagging in review.** Review skills should flag by default; "approval is earned" (Emil).

### Subagents, MCP, CI

- **Subagents:** start with **no custom roster**. Use the built-in Explore/Plan agents. Add a `.claude/agents/reviewer.md` (Sonnet, read-only tools) only once you need one.
- **MCP:** use **none by default**. agent-browser and Playwright are CLIs, so they add no tool schemas to every session. If you add one later, pin its version and never use `npx …@latest`.
- **CI agents:**
  - `anthropics/claude-code-action@v1` for optional PR review.
  - `claude --bare -p … --permission-prompts none` for scripted runs. `--bare` skips personal hooks and CLAUDE.md, which keeps runs reproducible.
  - Either way, agents never replace the required gate.
- **Parallel sessions:** worktrees with `.worktreeinclude`. Give e2e its own compose project, so there is no Vite port juggling.

---

## 5. Docs (domain and way of working, not code)

- **What goes in docs:** `GLOSSARY.md` (via domain-modeling), ADRs capped at about 600 words that record only the current decision (delete superseded ones), and a "which test goes where" table.
- **Banned:** file trees, route lists and env tables. If `rg` can answer it, it doesn't belong in a doc.
- **Docs audit in CI:** it covers **every** `.md`, checks that backticked paths, ADR IDs and referenced skills exist, and caps words per ledger.
- **Kept out of the repo:** epics, story trackers and retros live in GitHub issues. Dead plans are deleted, not archived.

## 6. Week-one order

1. Set up the root: Bun catalog, `packages/config` (tsconfig, vitest, oxlintrc + guard test), Lefthook, the `gate` script, and CI with SHA pins, security jobs, and required e2e.
2. Commit the harness: AGENTS.md, CLAUDE.md, `.claude/settings.json`, hooks with tests, vendored skills, and the docs audit.
3. Create `contracts` (schemas, error-code union, envelope), `domain` (pure, mutation-tested), `env`, and `testing`.
4. Build the server: Elysia app with the auth macro, `can()`, `onError`, security headers, JSON logs, readiness, and the WS publish channel.
5. Build the web app: router with `beforeLoad` guards, loaders with `ensureQueryData`, TanStack DB collections, `createFormHook`, and i18n.
6. Ship one vertical slice end to end, with integration, e2e and role-grid tests, **before** adding a second feature.

## 7. Open decisions — status (grill 2026-10-03)

Decisions are recorded in `TODO.md`; the remaining ones are listed under "Grill — reprendre ici".

1. **Domain shape.** ✅ Answered: there is no concurrent editing inside a cell, so no CRDT. There are per-cell locks and presence, last-write-wins, and the history of every change. No offline mode for now.
2. **Effect 4.0 or 3.22?** ✅ Use the latest (4.x), core only.
3. **Effect Schema or Valibot?** ✅ Valibot, with contract-first shared schemas (DB and client implement the contracts). Spike results are in §9.
4. **Dependabot or Renovate?** ⏳ Open. Neither supports Bun catalogs (see §1).
5. **"shadcn lint"?** ✅ It means `@shadcn/lint` (see §3). Adoption timing is still open.
6. **i18n from day one?** ✅ Yes, French only at first, with Paraglide.

## 8. Auth: MiData / db.scout.ch (checked 2026-10-03)

- **Provider:** hitobito (Doorkeeper + doorkeeper-openid_connect) is a full **OIDC provider**.
  - Discovery: `https://db.scout.ch/.well-known/openid-configuration`.
  - PKCE S256, refresh tokens (single-use, rotated), RS256 ID token. `sub` is the person id.
  - Docs: [hitobito oauth.md](https://github.com/hitobito/hitobito/blob/master/doc/developer/people/oauth.md).
- **Better Auth:** use the `genericOAuth` plugin with `discoveryUrl` and `pkce: true`. Not `oidc-provider`, which is for *being* an IdP. Make sure the rotated refresh token is persisted.
- **Scopes:** the target set is `openid email name with_roles events event_participations`. The `roles` claim has **group roles only, no course roles**.
- **Courses and course roles:** JSON:API with the user's own token, e.g. `/api/event_participations?filter[participant_id]=<sub>&include=event,roles`. Trainers with `participations_read`/`_full` on a course can list its participants. The old REST API is deprecated.
- **PBS course roles** (`hitobito_pbs`):

  | Role | Permissions |
  | --- | --- |
  | Leader (Kursleiter·in) | `event_full`, `participations_full`, **`qualify`** |
  | ClassLeader | `participations_full` |
  | Speaker | `participations_read` |
  | Helper | `participations_read` |
  | Cook | `participations_read_details` |
  | Participant | — |
  | Advisor (LKB) | restricted role |

- **Registration:** an OAuth application is created only by root-group admins (PBS), through their application form (see the [Qualix README](https://github.com/gloggi/qualix)). Request the scopes up front, and use https redirect URIs.
- **Writing qualifications back:** `/api/qualifications` supports create and destroy (new in 2026), but needs layer-level `*_full`. A trainer's token probably can't write, so this would need a service API key. Two points are unverified: whether this version is deployed on db.scout.ch, and whether PBS grants the scope.
- **Reference apps:** [gloggi/qualix](https://github.com/gloggi/qualix) (Laravel, scout course qualifications, same domain), scout-ch/wp-hitobito-auth.

## 9. Spikes: schemas, test runners, TS 7 (run 2026-10-03)

Throwaway projects; every claim below comes from code that was run.

### Schema library with Elysia + Eden

Versions: elysia 1.4.30, @elysia/eden 1.4.10, @elysiajs/openapi 1.4.16, valibot 1.5.0, @valibot/to-json-schema 1.8.0, effect 4.0.0, @tanstack/db 0.11.3.

| Check | Valibot | Effect Schema |
| --- | --- | --- |
| Eden per-status inference (`data`, `error.status` narrowing, 422) | Works | Works; types are `readonly` |
| Body/query/params inference and decoding | Works | Works; needs `Schema.toStandardSchemaV1` on every schema |
| OpenAPI | Works with `mapJsonSchema: { valibot: (s) => toJsonSchema(s, { errorMode: 'ignore' }) }`. Without `errorMode`, brands and transforms make the 200 response silently disappear. | Needs a mapper based on `Schema.toJsonSchemaDocument`. Quirks: `optional` emits `null`, use `optionalKey`; `minLength` is halved in the output. |
| Branded IDs | Work end to end | Work end to end |
| Client bundle, 10 schemas + parse | 3.1 KB gz | 26–27.5 KB gz, mostly the Effect runtime core, already paid if Effect runs in the browser |
| TanStack DB `schema` | Works | Works |

- **Transforms on responses are broken in both.** The handler and Eden types say `Date`, but Elysia validates the returned value against the encoded side and rejects a `Date` with a 422. The wire carries the raw string, and Eden's `Date` comes from its own ISO parsing. Keep response schemas wire-shaped.
- Eden types path params as plain `string`, so brands aren't enforced there.
- `app.handle(new Request('http://x/...'))` returns 404; use `http://localhost/...`.

### Tests under Bun

Versions: Bun 1.4.2, Vitest 4.1.11 and 5.0.3, Stryker 10.0.0, drizzle-orm 0.45.3.

- **Vitest under `bun --bun`:** Bun APIs, Elysia `app.handle` and watch mode work. v8 and istanbul coverage both work and match Node's numbers. The Vitest 4 migration guide confirms AST-aware remapping is the default and only mode.
- **`bun test` 1.4.2:**
  - `--parallel` worker processes, with `BUN_TEST_WORKER_ID` for a DB per worker. Workers spawn lazily.
  - One merged lcov across packages, JUnit reporter, `mock.module`, snapshots, `--shard`, `--changed`.
  - `expectTypeOf` is a runtime no-op; only `tsc` catches type-test errors.
  - Components need a hand-set happy-dom preload.
  - About 28 ms against about 235 ms for Vitest 5 on a small suite.
- **Vitest 5:** `-t` now uses `>` as the separator. That breaks Stryker's vitest-runner (stryker-js#6210, reproduced: 30% score instead of 95%). The fix (PR #6214) is open and blocked.
- **Stryker with `bun test`:**
  - The community runner `@hughescr/stryker-bun-runner` 1.4.0 has one maintainer; it gave 95% with per-test coverage.
  - The built-in `command` runner also gave 95%, but runs the whole suite per mutant.
  - Stryker fails to load its plugins under Bun, so it must run on Node.
- **Drivers:** `postgres-js` works on both runtimes, including LISTEN/NOTIFY. `bun-sql` is Bun-only. Drizzle wraps LISTEN/NOTIFY for neither.

### TypeScript 7

Versions: typescript 7.0.2 (stable since 2026-07-08), oxlint 1.86.0, oxlint-tsgolint 7.0.2003, @effect/tsgo 0.48.0, knip 6.39.0.

- **Speed:** about 10× faster type checks than TS 6.0.3 on a small Elysia + Eden + Effect + Valibot file, with identical errors.
- **oxlint type-aware rules:** stable since 2026-07, built on typescript-go, independent of the installed `typescript`.
- **`@effect/tsgo`:**
  - Its diagnostics make `tsc` exit 1. It patches the installed TS binary, so the patch must be re-run after each install.
  - It's validated only against TS 7.0.2 and oxlint 1.82–1.86.
  - Its `setup` writes a tsconfig plugin entry that Knip flags as an unlisted dependency.
- **Unaffected tools:** Knip, Vitest typecheck and oxlint work with TS 7 alone. Playwright, TanStack Router codegen, drizzle-kit and `@valibot/to-json-schema` don't import `typescript`.
- **Broken:** Stryker 10 (`ts.parseConfigFileTextToJson is not a function`). It works when `typescript` resolves to the TS 6 API (`npm:@typescript/typescript6`). Open issues: stryker-js #6110, #6111, #6112, #5213.
- Not checked: type-check performance on a large Elysia/Eden app (elysia #1031).

### i18n libraries

Versions: Paraglide JS 2.25.4, Lingui 6.9.0, i18next 26.4.2 with react-i18next 17.0.15. Built on Vite 8.3.2 with the React Compiler and TS 7.0.2.

- **Paraglide:**
  - Builds on Vite 8, with no Babel step.
  - Keys and params are type-checked: `m.nope()` gives TS2339, a wrong param gives TS2561.
  - Messages are compiled into tree-shaken functions; the smallest bundle.
  - Plurals use variants (`Intl.PluralRules`). Raw ICU in the default JSON format compiles to garbage; ICU needs a plugin.
- **Lingui:**
  - Builds on Vite 8 with the React Compiler; `macroTransform: true` runs the macros natively, without Babel.
  - Full ICU (plural, select, selectordinal). `lingui extract` writes `.po` files, which tools like Weblate and Crowdin read.
  - The source string is the ID; typed IDs are opt-in.
  - In v6 the format must be a formatter object (`@lingui/format-po`).
- **i18next:** pure runtime, the largest bundle, suffix-based plurals; ICU needs a plugin. Key typing is opt-in.
- None of the three depends on the TS compiler API.

### Short outages with TanStack DB

Versions: `@tanstack/db` 0.11.3, `@tanstack/offline-transactions` 1.0.61. Docs only; not run.

- **Plain TanStack DB doesn't retry.** A failed mutation moves to `failed` and its optimistic state is rolled back, so the user's input disappears.
- **`@tanstack/offline-transactions` (official):**
  - **Outbox:** a durable outbox in IndexedDB, with a localStorage fallback.
  - **Tabs:** one tab leads, chosen with Web Locks or BroadcastChannel.
  - **Replay:** first-in first-out, with exponential backoff capped at 60 s.
  - **Idempotency:** a stable `idempotencyKey` per attempt, which the server must use to drop duplicates.
  - **Permanent errors:** `NonRetriableError` rolls the change back.
  - **Gotcha:** the default retry policy decides by matching strings in the error message ("401", "403", "400", "422"), so throw explicit errors.
  - **Stability:** registry keys and mutation-function names must stay stable across releases.
