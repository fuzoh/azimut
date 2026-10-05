# Azimut — agent skills: selection and workflow

**Status:** a proposal, not a decision (analysis of 2026-10-04). How skills are installed and vendored is covered in `PRACTICES.md` §4.

## TL;DR

- **Goals:**
  - code that stays maintainable;
  - non-technical staff take part in defining tasks.
- **Base: [mattpocock/skills](https://github.com/mattpocock/skills).** Take only single skills or ideas from the other packs.
- **No pack lets non-technical staff define tasks directly.** We fill the gap with:
  - a GitHub issue form;
  - a project spec skill with a **product part**, which the stakeholder approves, and a **technical part**;
  - acceptance criteria that become named e2e tests.
- **Install only one pack's router.** addyosmani's `using-agent-skills`, mattpocock's `ask-matt` and pstack's `poteto-mode` would compete with each other. Our workflow lives in §3 of this file instead.
- **Change from the 2026-10-03 pass:**
  - Back in, adapted: `grill-with-docs`, `to-spec`, `to-tickets`, `to-questionnaire` and `pr`.
  - Still out: `implement-spec`, `wayfinder` and `triage`.

## 1. The packs at a glance

| Pack | Code quality | Non-technical staff | Verdict |
| --- | --- | --- | --- |
| **mattpocock/skills** | Strong:<br>• deep modules<br>• tests at seams agreed up front<br>• review on two axes (Standards and Spec)<br>• vertical-slice tickets<br>• retro | The best of the four, but indirect:<br>• the glossary bridges devs and domain experts<br>• `to-questionnaire`<br>• user stories and acceptance criteria<br>Grilling only ever interviews the developer. | **Base.** Already installed on the dev machine, as unmanaged copies that will drift from upstream. |
| **addyosmani/agent-skills** | Strong on process:<br>• six phases, each with a human gate<br>• `CONSTRAINTS.md` plus a guard against weakened checks<br>• Definition of Done | Weak. Specs mix product and technical content, and there is no glossary. | **Ideas and a few references.** It brings its own router and `/plan`, uses many tokens, and leans towards JS. |
| **cursor/plugins `pstack`** | Strong ideas:<br>• verify on the running app<br>• `/correct` (lesson → gate)<br>• design red flags | None. "Never block on the human" works against our goal. | **Ideas only.** The orchestration depends on Cursor and on specific models. It is about 4 weeks old. |
| **DietrichGebert/ponytail** | Narrow: an always-on "write less code" mode and a review that only looks for over-engineering | None | **Skip the plugin.** It injects a hook on every prompt. "No abstractions, fewest files" conflicts with deep modules and a rich domain model. |
| **emilkowalski/skills** (pass of 2026-10-03) | UI taste: easing, feedback, animations | n/a | A few skills, scoped to `apps/web`. |

## 2. Suggested skills

Legend:
- **Adopt**: vendor the skill as is.
- **Adapt**: vendor it, then edit it for the Azimut stack.
- **Later**: wait until there is code or a measured need.
- **Idea**: no skill; turn the idea into a gate, a template or one line in AGENTS.md.

### mattpocock/skills

| Skill | Verdict | Why, and what to change |
| --- | --- | --- |
| `grilling` | Adopt | Interview primitive. |
| `grill-with-docs` | Adopt | Grilling and domain modelling in one pass. It is the entry point of the workflow (§3, step 2). |
| `domain-modeling` | Adapt | Pin `GLOSSARY.md` and `docs/adr/`. Terms are in French and match `analyse/18-decisions-definitives.md`. |
| `codebase-design` | Adopt | Deep-module vocabulary, the deletion test, design it twice. |
| `diagnosing-bugs` | Adopt | Feedback loop before any fix. |
| `research` | Adopt | Sourced notes in the repo (Markdown file). |
| `writing-for-agents` | Adopt | For AGENTS.md, rules and project skills. |
| `prototype` | Adapt | UI mode on React and shadcn. Useful for showing a stakeholder a variant before writing the spec. |
| `wizard` | Adopt | For human-only steps: MiData OIDC, secrets, Swiss hosting. |
| `to-questionnaire` | Adopt | Plain-language questions sent to course designers or trainers, answered asynchronously. |
| `tdd` | Adapt | Use the Vitest, Playwright and Stryker layers and drop the jest examples. The seam confirmation step becomes optional. |
| `code-review` | Adapt | The Standards axis is the lint gates plus a short list of rules. The Spec axis checks the ticket's acceptance criteria. Remove the issue-tracker dependency. |
| `to-spec` | Adapt, as the project skill `azimut-spec` | See §3, step 3. In French, glossary terms only. The product part (problem, user stories, acceptance criteria, out of scope) and the technical part are kept separate. |
| `to-tickets` | Adapt | Each ticket carries the IDs of the acceptance criteria it covers. Local `.scratch/<feature>/issues/` or GitHub issues. |
| `pr` | Adapt | The before/after visuals become the stakeholder's evidence. Add a summary in French with no jargon. |
| `implement` | Later | For a single ticket, once the gates exist. |
| `retro` | Adopt | Combine it with the "lesson → gate" rule (pstack, below). |
| `git-guardrails-claude-code` | Idea | Template for the `guard-bash` hook (`PRACTICES.md` §4). |
| `improve-codebase-architecture` | Later | Once there is code with a git history. |
| `triage` | Later | Only if the volume of stakeholder issues justifies it. |
| `handoff` | Later | For long sessions. |
| `setup-ts-deep-modules` | Later | Compare it with fallow and `import/no-cycle` (`TODO.md`, Analyse de code). |
| `ask-matt`, `setup-matt-pocock-skills` | Skip | Router and generic setup. This file and AGENTS.md cover them. |
| `implement-spec`, `wayfinder` | Skip | Too much ceremony for a small team (worktrees, ticket graph). |
| `setup-pre-commit`, `teach`, `scaffold-exercises`, `migrate-to-shoehorn` | Skip | They conflict with Lefthook and oxfmt, or are off topic. |

### addyosmani/agent-skills

| Skill or file | Verdict | Why, and what to change |
| --- | --- | --- |
| `constraint-driven-development` | Idea | Make it a CI "no weakening" check rather than a skill. The check fails when:<br>• a threshold drops (complexity 12, 80 lines, 600 lines, coverage, mutation score);<br>• a new `oxlint-disable` or `@ts-ignore` appears;<br>• a test is skipped. |
| `doubt-driven-development` | Adapt | User-invoked. An adversarial fresh-context review for decisions that are costly to get wrong: the calculation engine, auth, nLPD. |
| `references/security-checklist.md` | Adapt | The `code-review` reference for auth, minors' data and MiData. |
| `references/accessibility-checklist.md` | Adapt | WCAG AA reference for `apps/web` (`paths:`). |
| `references/definition-of-done` | Idea | Goes into the PR template, not into a skill. |
| `planning-and-task-breakdown` (Phase 0 capability map) | Idea | Only if a feature spans several packages. Otherwise `to-tickets` is enough. |
| `using-agent-skills`, `/build auto`, `/ship`, `interview-me`, `documentation-and-adrs`, TDD, debugging, review | Skip | Router, or a duplicate of a mattpocock skill. |

### cursor/plugins `pstack`

| Skill or file | Verdict | Why, and what to change |
| --- | --- | --- |
| `create-verification-skill` + `maintain-verification-skill` | Adapt | Generates `verify-azimut`, a feature map and app control through agent-browser or Playwright (instead of Cursor's `control-ui`). This produces the screenshots for the PR. |
| `correct` | Idea | A lesson seen twice becomes a type, a lint rule or a CI check. Prose comes last. |
| `architect/references/design-red-flags.md` | Idea | Add it to the Standards axis of `code-review`. |
| `typescript-best-practices` | Adapt | Rewrite it for Valibot and Effect (it assumes Zod). Better still, `.claude/rules/` with `paths:`. |
| Principles: `test-behavior-not-implementation`, `model-the-domain`, `boundary-discipline`, `encode-lessons-in-structure` | Idea | One line each in AGENTS.md. |
| `bro` | Idea | A plain-language restatement for a stakeholder. Overlaps with mattpocock's `wait-what`; pick one if needed, in French. |
| `poteto-mode` and its playbooks, `arena`, `swarm`, `interrogate`, `setup-pstack`, `reflect`, `automate-me` | Skip | Coupled to Cursor and to specific models, and uses many tokens. |

### DietrichGebert/ponytail

| Skill or file | Verdict | Why |
| --- | --- | --- |
| `ponytail` (always-on mode) and its hooks | Skip | Prompt injection on every turn, which `PRACTICES.md` §4 rules out. It also conflicts with deep modules. |
| `ponytail-review` / `ponytail-audit` | Later | An occasional over-engineering lens, user-invoked. Compare first with fallow and slop-scan. |
| `ponytail: <ceiling>, <upgrade path>` comments | Idea | A convention for deliberate shortcuts. It is only worth adopting if a script lists them and flags the ones with no trigger. |

### emilkowalski/skills (unchanged since 2026-10-03)

| Skill | Verdict | Note |
| --- | --- | --- |
| `emil-design-eng`, `animate`, `review-animations` | Adopt | `paths:` `apps/web/**/*.tsx`. |
| `apple-design`, `mobile-native` | Adapt | Springs and gestures only. Mobile only if a PWA matters. For Radix popovers, replace `--transform-origin` with `--radix-popover-content-transform-origin`. |
| `pick-ui-library`, `ask-sonner`, `expo`, `swift` | Skip | Zustand conflicts with TanStack DB, and shadcn already wraps sonner. |

Ideas to carry into our own project skills:

- Write them as "the mistakes agents make here, and the fix for each".
- Make review skills flag by default: approval is earned.

## 3. Workflow (proposal)

1. **Intake (non-technical).** A GitHub issue form called "Besoin", in French with domain words. Its fields:
   - the actor (`analyse/05-acteurs-et-parcours.md`);
   - the situation;
   - what is a problem today;
   - a real example;
   - what "good" looks like.
2. **Clarification (dev + agent).** `grill-with-docs` updates `GLOSSARY.md` and the ADRs. Questions that only the domain expert can answer go through `to-questionnaire`.
3. **Spec (`azimut-spec`).**
   - The product part: problem, user stories, numbered acceptance criteria, out of scope. The stakeholder approves it on the issue.
   - The technical part is written for devs and agents.
4. **Tickets (`to-tickets`).** Vertical slices. Each acceptance criterion becomes a named Playwright e2e test, so the stakeholder's sentence turns into an automated check.
5. **Build.** `tdd`, then `code-review` (the Standards axis is the gates, the Spec axis is the criteria).
6. **Show.** `verify-azimut` and `pr` provide screenshots or a video, so the stakeholder approves without reading code.
7. **Upkeep.** `retro` (lesson → gate), and `improve-codebase-architecture` once there is code.

## 4. Open questions

- [ ] **Who are the non-technical staff?** Jobtrek staff, course designers or trainers? Do they have GitHub accounts? If not, intake goes through a form or a shared doc that a dev turns into an issue.
- [ ] **How far do they go?** Only the need and the approval of the product part, or also the approval of the result (which needs a preview deployment per PR)?
- [ ] **Language of the artifacts:** everything in French, or the product part in French and the technical part in English? The mattpocock skills write in English by default.
- [ ] **Install method:** vendor into `.claude/skills/` (`PRACTICES.md` §4), and pin a commit for each source. The upstream packs rename things often (`CONTEXT.md` became `GLOSSARY.md`, `to-prd` became `to-spec`).
