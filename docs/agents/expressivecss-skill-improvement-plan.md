# ExpressiveCSS skill improvement implementation plan

## Goal

Make the ExpressiveCSS skill more deterministic, easier to load correctly, and harder to declare complete without evidence. Preserve the current focused design-and-review structure. Do not add a broad command suite or replace Material 3 Expressive rules with generic aesthetic guidance.

This plan covers every recommendation made after skill versions 0.3.0 and 0.4.0:

1. deterministic installed-version and contract resolution;
2. behavioral evaluations;
3. optional integration with the existing ExpressiveCSS MCP tools;
4. a generated component decision index;
5. atomic, mode-specific review criteria;
6. stronger direct-loading boundaries for support guides;
7. a mode and feature guide-loading map;
8. component-specific review rows;
9. a bounded evidence coverage ledger;
10. matched before-and-after evidence for Refine and Redesign;
11. explicit limits on what an MCP or static-check `pass` proves.

## Constraints

- Material 3 Expressive remains authoritative for design intent, component choice, adaptive behavior, hierarchy, shape, motion, and interaction.
- `semantics.json` remains authoritative for authored semantics.
- The installed ExpressiveCSS version remains authoritative for shipped classes, options, methods, events, and runtime behavior.
- Application identity continues to enter through semantic color and type tokens, icon configuration, imagery, assets, and content.
- Critique and Audit remain no-edit modes unless the user separately requests fixes.
- Missing evidence must never become `Pass` or `Not applicable`.
- The skill must remain useful without the MCP server. MCP integration is an optional accelerator.
- New implementation work follows vertical test-driven slices. Add one failing test, confirm the expected failure, implement the smallest change, and rerun focused and regression tests.
- Generated files must come from one declared source. Do not create parallel hand-maintained versions of the same contract.

## Target structure

The completed workflow should have five layers:

1. **Routing:** the root skill chooses the operating mode and loads only the applicable support guides.
2. **Contract resolution:** a portable resolver identifies the declared dependency, exact installed version, matching contract version, and documentation source.
3. **Design decisions:** a generated component decision index narrows candidates before the agent reads complete component guides.
4. **Evidence:** the review matrix, component checks, coverage ledger, and matched captures record what was tested and what remains blocked.
5. **Automation:** optional MCP tools and behavioral evaluations check mechanical rules without pretending to replace browser, accessibility, or visual review.

## Recommendation traceability

| Recommendation | Primary phase | Completion evidence |
| --- | --- | --- |
| Deterministic version resolution | Phase 3 | Resolver fixtures pass for installed packages, supported lockfiles, ranges, missing versions, and mismatches. |
| Behavioral evaluations | Phase 6 | Every critical case produces a per-case pass or fail report with no unreviewed critical invariant. |
| Optional MCP integration | Phase 5 | Skill maps tools to workflow stages and works unchanged when those tools are absent. |
| Generated component decision index | Phase 4 | Every generated component guide is represented exactly once or explicitly marked non-selectable. |
| Atomic review matrix | Phase 1 | Each criterion accepts one honest status and one evidence record. |
| Direct-loading boundaries | Phase 2 | Every support guide states when to use it and when not to use it. |
| Mode and feature load map | Phase 2 | Runtime, theming, installation, usage, and accessibility load only under documented conditions. |
| Component-specific checks | Phase 1 and Phase 4 | Selected components produce concrete contract checks from their generated guides. |
| Coverage ledger | Phase 1 | Every reachable state and responsive boundary maps to evidence or `Blocked`. |
| Matched captures | Phase 1 | Refine and Redesign reports pair comparable before and after evidence. |
| Bounded MCP pass semantics | Phase 5 | Tool output names checked and unchecked areas and cannot imply full review completion. |

## Phase 0: lock the baseline and test contracts

### Purpose

Create failing tests and fixtures before changing production skill or MCP behavior.

### Changes

- Extend `tests/expressivecss-skill.test.js` with one vertical slice at a time for:
  - atomic review rows and the `Blocked` status;
  - mode-specific review sections;
  - guide-loading conditions;
  - direct-load `When to use` and `Do not use` boundaries;
  - version resolver invocation and output fields;
  - generated component decision inventory;
  - optional MCP routing and limited pass wording;
  - evidence ledger and matched-capture requirements.
- Add resolver fixtures under `tests/fixtures/expressivecss-version-resolution/` for:
  - an exact installed package version;
  - npm lockfile resolution;
  - pnpm lockfile resolution;
  - Yarn lockfile resolution;
  - a manifest range without an installed or locked version;
  - a framework checkout whose `package.json` version is authoritative;
  - a contract mismatch;
  - no ExpressiveCSS dependency.
- Add behavioral case definitions under `tests/fixtures/expressivecss-skill-evals/`. The runner arrives in Phase 6, but the expected behaviors are defined now.

### Acceptance criteria

- Each new test fails for the missing behavior, not because of a syntax or fixture error.
- Existing skill tests continue to pass when run without the new focused assertion.
- Fixtures contain no network dependency and no machine-local path.

## Phase 1: rebuild review evidence around atomic checks

### 1.1 Split the review matrix by mode

Update `skills/expressivecss/expressivecss-design/references/review-matrix.md`.

Create separate sections for:

- **Critique:** task hierarchy, emphasis, containment, shape, type, icon treatment, motion, state layers, visual coherence, adaptive composition, themes, content fit, and visible state communication.
- **Audit:** host elements, anatomy, relationships, authored semantics, runtime-owned ARIA, keyboard behavior, focus, announcements, contrast, zoom, reflow, touch targets, RTL, reduced motion, initialization, teardown, console state, and target-version conformance.

Each row must test one claim. Add `Blocked` to the status vocabulary:

- `Pass`: evidence proves the criterion.
- `Intentional adaptation`: the design differs from the default treatment, has a recorded rationale, and preserves Material behavior, semantics, and accessibility.
- `Fail`: evidence contradicts an applicable requirement.
- `Not applicable`: the criterion cannot occur in the scoped feature, with a reason.
- `Blocked`: the criterion applies, but required evidence could not be collected.

Do not calculate an aggregate Material or quality score.

### 1.2 Add component-specific review entries

After component selection, require one review group per selected component or component family. Each group records:

- documented host element;
- required child anatomy;
- labels, IDs, targets, and relationships;
- static authored semantics;
- runtime-owned state;
- initialization owner and teardown obligations;
- adaptive substitutions;
- applicable rules copied or referenced from the generated component guide.

The generic component row may summarize coverage, but it cannot replace these entries.

### 1.3 Add a bounded evidence ledger

Create `skills/expressivecss/expressivecss-design/references/evidence-ledger.md` with a reusable table:

| Task path | State | Width or boundary | Theme | Input or assistive path | Evidence | Result |
| --- | --- | --- | --- | --- | --- | --- |

Rules:

- Cover every reachable state at least once.
- Cover immediately below and above every responsive boundary the feature reaches.
- Cover each required theme and input path with representative combinations.
- Do not require the full Cartesian product.
- Record unavailable evidence as `Blocked`.
- Link screenshots, accessibility-tree captures, commands, test output, or source locations rather than saying only "verified."

### 1.4 Require matched baselines

For Refine and Redesign, add a matched-capture record with the same:

- route and task point;
- data and state;
- viewport and device scale;
- color scheme and motion preference;
- locale and direction when relevant.

Classify each visible difference as intended, required by the framework, or a regression. If no baseline can be captured, record the limitation before editing.

### Files

- `skills/expressivecss/expressivecss-design/SKILL.md`
- `skills/expressivecss/expressivecss-design/references/review-matrix.md`
- `skills/expressivecss/expressivecss-design/references/evidence-ledger.md`
- `tests/expressivecss-skill.test.js`

### Acceptance criteria

- No matrix row combines independently failing checks.
- Critique evidence is recorded before Audit evidence in combined reviews.
- A missing screenshot, accessibility tree, state fixture, or runtime path cannot be marked `Pass`.
- A review report can trace every reachable state and responsive boundary to evidence or `Blocked`.
- Refine and Redesign require comparable before and after evidence.

## Phase 2: make routing and direct loading precise

### 2.1 Add a mode and feature load map

Replace the unconditional guide-loading sentence in `expressivecss-design/SKILL.md` with this policy:

| Guide | Load condition |
| --- | --- |
| Usage | Every interface implementation or review. |
| Accessibility | Every interface implementation or review. |
| Theming | Color, typography, icon styling, theme, scheme, vibrant-region, or other visual-token work. |
| Runtime | Interactive components, initialization, dynamic content, remounting, teardown, or Audit. |
| Installation | Setup, imports, package changes, version problems, or contract-source uncertainty. |
| Component guides | Every plausible candidate during selection, then every selected component during implementation and review. |

Audit must load runtime when any selected component has JavaScript behavior. Critique should not load runtime unless interaction evidence is in scope.

### 2.2 Harden every support guide for direct loading

Add concise `When to use` and `Do not use when` sections to:

- `expressivecss-install/SKILL.md`;
- `expressivecss-usage/SKILL.md`;
- `expressivecss-theming/SKILL.md`;
- `expressivecss-runtime/SKILL.md`;
- `expressivecss-accessibility/SKILL.md`.

Counter-triggers must prevent common scope errors, such as loading theming for unrelated markup repair or treating accessibility guidance as a substitute for the component contract.

### 2.3 Keep frontmatter and discoverability consistent

- Keep each description at 60 characters or fewer and make its capability clear before truncation.
- Preserve portable paths and avoid machine-local references.
- Keep root routing broad enough for setup, usage, theming, runtime, accessibility, design, review, and framework contribution tasks.
- Treat the root version as the skill version. Do not imply that it is the framework contract version.

### Files

- `skills/expressivecss/SKILL.md`
- all six support `SKILL.md` files
- `tests/expressivecss-skill.test.js`

### Acceptance criteria

- A narrow task loads no unrelated guide by default.
- An interactive Audit cannot omit runtime guidance.
- Each support guide is safe to load without the root router.
- Discovery still reaches every supported ExpressiveCSS task class.

## Phase 3: add deterministic version and contract resolution

### 3.1 Define one resolver contract

Create a dependency-free resolver with a stable JSON result:

```json
{
  "projectRoot": "...",
  "packageManager": "npm|pnpm|yarn|unknown",
  "declaredRange": "^0.8.0",
  "resolvedVersion": "0.8.1",
  "resolutionSource": "installed-package|lockfile|framework-source|manifest-only|none",
  "skillVersion": "0.4.0",
  "contractVersion": "0.8.0",
  "matchingTag": "v0.8.1",
  "status": "match|mismatch|unresolved",
  "documentationMode": "current|matching-tag|installed-package|unavailable"
}
```

Resolution precedence:

1. framework source checkout `package.json` when the target is ExpressiveCSS itself;
2. `node_modules/@expressivecss/expressive/package.json`;
3. the active lockfile;
4. manifest declaration as unresolved range evidence, never as an exact installed version;
5. no dependency.

Support npm, pnpm, and Yarn fixtures used by the repository. If a lockfile format cannot be parsed safely, return `unresolved` with the reason rather than guessing.

### 3.2 Keep distributed copies synchronized

Use one canonical resolver implementation under `scripts/lib/resolve-expressivecss-version.mjs`. Extend the existing generation or sync steps to place portable copies where distribution requires them:

- `skills/expressivecss/scripts/resolve-version.mjs`;
- the published MCP package, if it cannot import the repository-level module.

Generated copies must carry a marker and fail synchronization checks when stale.

### 3.3 Stamp generated contract provenance

Update `scripts/gen-expressivecss-skill.mjs` so generated component guides expose:

- framework contract version;
- stable hash of the contract inputs used to generate them;
- source files used, including `llm.md`, `semantics.json`, and the component catalogue;
- current documentation URL;
- matching tag URL when the version has a release tag.

Keep output deterministic. Do not embed generation timestamps or dirty working-tree state in committed files.

Distinguish visibly between:

- skill workflow version;
- ExpressiveCSS framework version;
- generated contract version.

### 3.4 Enforce mismatch behavior

When the resolved installed version and generated contract version differ:

- contract-dependent checks become `Blocked` or `mismatch`, not `Pass`;
- the agent reads the installed package and matching tag;
- current public documentation is not treated as authoritative for shipped behavior;
- the final report names the mismatch and any unavailable matching documentation.

### Files

- `scripts/lib/resolve-expressivecss-version.mjs`
- `skills/expressivecss/scripts/resolve-version.mjs`, generated
- `scripts/gen-expressivecss-skill.mjs`
- generated component guides
- `tests/expressivecss-skill.test.js`
- resolver fixtures and focused resolver tests

### Acceptance criteria

- A declaration such as `^0.8.0` is never reported as an exact resolution by itself.
- Installed package and lockfile disagreement is reported rather than silently reconciled.
- Every generated guide identifies its contract version and deterministic source hash.
- Current and tag-based documentation choices follow the resolver result.
- Clean regeneration produces no diff.

## Phase 4: generate a component decision index

### 4.1 Introduce a structured decision source

Do not parse free-form prose heuristically at runtime. Add one structured catalogue used by the skill generator and MCP component selection. Each component entry should contain:

- canonical slug and display name;
- user jobs;
- use-when conditions;
- do-not-use conditions;
- commonly confused alternatives;
- Compact, Medium, Expanded, Large, and Extra-large substitutions where applicable;
- CSS-only, Auto Init, manual, native, or shared-runtime behavior;
- links to the generated guide and Material guidance.

Place the canonical data beside the existing documentation catalogue or another repository-owned source location. Document which file owns component-selection metadata. Add a synchronization test against the 46 generated component guides and the documentation catalogue.

### 4.2 Generate the reference

Generate `skills/expressivecss/references/component-decisions.md` from the structured catalogue. Keep it compact enough for candidate narrowing. It must not duplicate full syntax or semantic rules from component guides.

The root selection protocol becomes:

1. identify the user job and reachable window classes;
2. use the decision index to produce all plausible candidates;
3. read every candidate guide when ambiguity remains;
4. choose the smallest documented component set that covers the job;
5. record rejected alternatives and the reason when the choice is not obvious.

### 4.3 Reuse the catalogue in MCP

Replace hand-maintained component aliases or goal hints in the MCP server where the structured catalogue provides the same information. Keep fuzzy matching only as a fallback and label fallback suggestions as uncertain.

### Files

- canonical component decision data file, path chosen during the first test slice
- `scripts/gen-expressivecss-skill.mjs`
- `skills/expressivecss/references/component-decisions.md`, generated
- `skills/expressivecss/SKILL.md`
- `mcp/expressivecss/scripts/sync-guides.mjs`
- `mcp/expressivecss/server.js`
- generated MCP data
- skill and MCP tests

### Acceptance criteria

- Every generated component is represented exactly once or explicitly excluded with a reason.
- Every decision entry links to an existing generated guide.
- Common confusions such as dialog versus snackbar versus banner, switch versus checkbox, and navigation versus command surfaces are represented.
- Adaptive substitutions are explicit where Material changes the component by width.
- Generator and MCP inventory tests fail on drift.

## Phase 5: integrate the skill with MCP without making it dependent on MCP

### 5.1 Add optional tool routing

Document the following mapping when the ExpressiveCSS MCP server is available:

| Workflow need | MCP tool | Evidence scope |
| --- | --- | --- |
| Setup and version check | `setup_expert` | Manifest, resolved framework version, contract compatibility, and available local artifacts. |
| Markup and authored semantics | `rules_enforcer` | Rules actually inspected in the supplied snippet. |
| Candidate syntax and contract | `component_syntax_expert` | Bundled or local generated component contract for named candidates. |
| Static changed-file checks | `quality_inspector` | Inspected files, configured static rules, and commands that actually ran. |

Do not require the broad MCP stage chain. Call only the tools that match the task and operating mode.

### 5.2 Share version resolution

Replace `setup_expert` manifest-range comparison with the Phase 3 resolver. Return declared range, exact resolved version, contract version, resolution source, matching tag, and documentation mode.

### 5.3 Bound pass semantics

Extend MCP results with:

- `checksPerformed`;
- `evidenceSources`;
- `uncheckedAreas`;
- `contractCompatibility`;
- `coverageStatus`;
- `blockedChecks`.

A static tool may return `pass` only for its named checks. It must not imply that visual hierarchy, motion, focus, responsive rendering, screen-reader announcements, or other unobserved review rows passed.

When practical, rename or supplement broad statuses with scoped wording such as `static_contract_pass`. Preserve backward compatibility if external clients rely on the existing `status` field.

### 5.4 Align MCP checks with the skill

Add mechanical rules for high-confidence defects already named by the skill, when they can be detected without excessive false positives:

- retired Materialize classes and globals;
- card actions inside navigation landmarks;
- authored dynamic ARIA where the selected component owns it;
- duplicate initialization patterns;
- raw color use where a Material role is required;
- missing teardown evidence for manually initialized components;
- contract-version mismatch.

Do not encode subjective visual judgments as regex rules.

### Files

- `skills/expressivecss/SKILL.md`
- `skills/expressivecss/expressivecss-design/SKILL.md`
- `mcp/expressivecss/server.js`
- `mcp/expressivecss/smoke.mjs`
- `mcp/expressivecss/README.md`
- MCP generated data and sync script
- resolver tests

### Acceptance criteria

- The skill still works when no MCP tools are present.
- MCP setup reports the exact resolved version or an explicit unresolved state.
- Tool output lists what it did not inspect.
- No static-tool result can satisfy the entire review matrix by itself.
- MCP smoke tests cover version match, mismatch, missing evidence, scoped pass, and blocked checks.

## Phase 6: add behavioral evaluations

### 6.1 Define the case format

Each case should contain:

- user request;
- project fixture and ExpressiveCSS version state;
- expected operating mode;
- guides that must load and guides that must not load;
- candidate and rejected components where applicable;
- required evidence categories;
- required decisions or report fields;
- forbidden edits, markup, classes, ARIA, and unsupported claims;
- critical invariants that must all pass.

Use per-case pass or fail results. Do not hide a critical failure inside an aggregate score.

### 6.2 Cover the critical behaviors

Include at least these cases:

1. Critique reports findings without editing.
2. Audit reports measurable failures without editing.
3. Refine preserves identity, content, information architecture, and behavior.
4. Redesign may change structure but preserves requirements and accessibility.
5. Snackbar, banner, and dialog are distinguished by interruption and persistence.
6. Switch and checkbox are distinguished by immediate versus deferred commit.
7. Compact navigation changes appropriately at wider window classes without duplication.
8. Application branding uses semantic tokens and does not replace Material behavior.
9. Runtime-owned ARIA is not pre-authored.
10. A manually initialized component excludes Auto Init and is destroyed on teardown.
11. An older or mismatched installed version uses installed or tag-matched documentation.
12. Reachable loading, empty, error, permission, offline, long-content, and RTL states map to evidence or `Blocked`.
13. Refine and Redesign use matched before-and-after evidence.
14. An MCP static pass remains scoped and does not become a full review pass.

### 6.3 Build a portable runner

Create a runner that can:

- assemble the root skill and required linked references;
- execute a configured agent adapter or accept saved candidate outputs;
- validate structured invariants deterministically;
- store the prompt, selected guides, response, tool trace when available, and per-invariant result;
- redact secrets and machine-local paths from committed fixtures;
- rerun one case or the complete suite.

Do not hardwire the suite to one model vendor. Keep provider configuration outside committed fixtures.

### 6.4 Establish CI and release policy

- Deterministic fixture and schema tests run in normal CI.
- Live model evaluations run in a credentialed workflow or before skill releases.
- Until variance is measured, live evaluations report per-case results and do not become a flaky merge gate.
- Any failure of a critical invariant blocks a skill release until reviewed.
- Save reviewed outputs only when they help diagnose regressions. Do not treat prose snapshots as golden text.

### Files

- `tests/fixtures/expressivecss-skill-evals/`
- `scripts/eval-expressivecss-skill.mjs`
- evaluator schema and adapter modules under `scripts/lib/`
- focused deterministic evaluator tests
- package scripts for focused and full evaluation
- `docs/agents/expressivecss-skill-research.md` or a dedicated evaluator README

### Acceptance criteria

- Every critical behavior has at least one case.
- Cases test decisions and boundaries, not exact prose.
- The runner can replay saved outputs without network access.
- A live adapter can be replaced without changing case definitions.
- Reports show every critical invariant and preserve failure evidence.

## Ordered commit plan

Keep commits independently reviewable and green:

1. `test(skill): define remaining workflow contracts`
   - Add failing tests and fixtures for the first Phase 1 slice.
2. `feat(skill): make review evidence atomic`
   - Add mode-specific matrix rows, component entries, `Blocked`, the evidence ledger, and matched captures.
3. `feat(skill): load guides by mode and feature`
   - Add the load map and direct-loading boundaries.
4. `feat(skill): resolve framework contract versions`
   - Add the canonical resolver, generated portable copies, provenance, and mismatch handling.
5. `feat(skill): generate component decision guidance`
   - Add structured decision data, generated reference, and inventory checks.
6. `feat(mcp): align tools with skill contracts`
   - Reuse version and decision data, scope pass results, and add mechanical checks.
7. `test(skill): add behavioral evaluations`
   - Add the portable runner, critical cases, replay mode, and documentation.
8. `docs(skill): record final workflow and provenance`
   - Update research, changelog, and generated documentation after all behavior is stable.

If a phase grows beyond one coherent review unit, split it by vertical behavior rather than by file type.

## Verification commands

Run focused checks after every vertical slice, then the complete set before each commit that changes a shipped contract:

```text
terminal(command="node --test tests/expressivecss-skill.test.js", timeout=180)
terminal(command="npm run build:skill -- --check", timeout=180)
terminal(command="npm --prefix mcp/expressivecss test", timeout=300)
terminal(command="npm run typecheck", timeout=300)
terminal(command="npm test", timeout=600)
terminal(command="npm run docs:build", timeout=600)
terminal(command="git diff --check", timeout=60)
```

Add the resolver and evaluator focused commands to `package.json` when those runners exist. Use the package script as the documented command after that point.

For documentation and generated artifacts, also verify:

- every relative Markdown link resolves;
- every generated file has its marker;
- clean regeneration produces no diff;
- no machine-local path or credential is committed;
- component, decision-index, semantics, and MCP inventories agree;
- the working tree contains only intended files.

## Independent review gates

Request an independent no-edit review after Phases 1, 3, 5, and 6.

The reviewer checks:

- Phase 1: honest status granularity, Critique-before-Audit ordering, and evidence completeness.
- Phase 3: range versus exact-version handling, lockfile fixtures, provenance determinism, and mismatch behavior.
- Phase 5: optional MCP behavior, bounded pass semantics, and false-positive risk in static checks.
- Phase 6: whether cases test actual skill decisions rather than keyword presence or preferred prose.

Resolve P0 and P1 findings before continuing. Resolve P2 findings within the phase unless they require an explicitly approved scope change.

## Definition of done

All recommendations are complete only when:

- the review matrix is atomic, mode-specific, and supports `Blocked`;
- selected components create concrete contract checks;
- the coverage ledger accounts for reachable states and responsive boundaries;
- Refine and Redesign require matched baseline evidence;
- guide loading follows mode and feature needs;
- every support guide is safe to load directly;
- installed version, contract version, skill version, and documentation source are distinct and machine-resolved;
- generated guides carry deterministic contract provenance;
- the component decision index is generated from structured data and synchronized with guides and MCP;
- MCP use is optional and every tool result states its evidence limits;
- behavioral evaluations cover all critical boundaries and can replay offline;
- focused tests, full tests, typecheck, skill generation, MCP smoke tests, docs build, link checks, and diff checks pass;
- an independent final review reports no unresolved P0, P1, or in-scope P2 findings.

## Out of scope

- Recreating Impeccable's broad command suite.
- A numeric Material or design-quality score.
- A live visual overlay or always-running review service.
- Generic aesthetic bans unrelated to Material 3 Expressive.
- Automatically changing product copy, information architecture, or brand decisions during Refine.
- Treating regex or static analysis as proof of visual, interaction, or accessibility conformance.
