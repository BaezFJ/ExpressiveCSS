# ExpressiveCSS skill improvement implementation plan

## Framework gap follow-up: motion integration

The first framework repair closes the two motion integration gaps from the
capability roadmap. The scale utility now suppresses and cancels transitions
under reduced motion without changing its final transform or disclosure
ownership. Expanding-card cleanup waits for its actual CSS clip transition,
including cancellation, instead of a separate 500ms timer. Zero-duration and
reduced-motion paths close immediately; reopening and destruction invalidate
old completion, and removed cards do not take focus. `onClose` remains a
start-of-close callback. Public names and default animation values are unchanged.

The browser regressions cover these paths in Chromium, Firefox and WebKit.
They test timing and behavior, not Material spring fidelity or human design
acceptance. The capability collector maps the Chromium assertions; the same
file also records explicitly named Firefox and WebKit cases. Its engine-version
field identifies the collector's Chromium preflight only.

Validation passed: `npm run verify` ran 1,013 tests with no failures or skips,
including six new motion browser tests across the three engines; typechecking,
generation checks and the 66-page docs build passed. `npm run test:skill` passed
240 tests and 22 replay cases. All seven MCP smoke checks and isolated framework
and MCP package verification passed. The capability collector recorded 23
passing tests in `.cache/material-capabilities/run-7qdm7T/report.json`, with
SHA-256 `2fb82d844b2c0e7411aa9ed38e86501553087457fe3af84c9dc4ccdd98cc2a4b`.
No live agent benchmark, full-page screenshot comparison, or human visual
acceptance is claimed for these behavior fixes.

Source review compared the full source inventory with the preceding commit:
only the scale partial and expanding-card runtime changed. The reviewed delta
updates their source pins and the inventory guard; other source pins and prior
upstream-review dates carry forward unchanged. Browser evidence is collected
again against the changed build. This is not a renewed full Material audit.

Remaining feature work still needs contracts for standalone button shape
morphing, modal pickers, emphasized typography/font coverage, shared shape
roles and shared motion roles. The older follow-up sections below describe
their historical snapshots; the generated roadmap records current gaps.

## Cross-browser critical flows, September 7, 2026

The [browser coverage report](./expressivecss-browser-coverage.md) adds the same
critical-flow cases across Chromium, Firefox and WebKit, with keyboard and
compact Arabic RTL/touch/text-reflow profiles. CI requires all engines and retains
case results and failure traces. Native zoom, physical devices, screen readers
and full visual/language review remain explicit manual release checks.
The skill now asks agents to name tested engines when reporting browser evidence.
All six critical-flow cases passed. Contributor verification passed 998 tests,
the explicit browser suite passed 29, and skill/MCP/package/generated checks
passed. The report preserves two framework follow-ups: rapid Menu reversal and
enlarged RTL select-label overlap. Those findings are not repaired by this change.

No framework behavior or public API changes are included. The existing fixture
server, Playwright dependency and Node runner provide the implementation.


## Capability roadmap follow-up, September 7, 2026

The [generated roadmap](../../skills/expressivecss/references/capability-roadmap.md)
uses the existing component catalogue for all 46 components and separate
typography, shape and motion records. Each entry states its documented scope,
reviewed source hashes, upstream review limits, intentional web adaptations,
feature/integration gaps, available browser checks and recorded results.
`implemented` applies only to the named scope. It never means full Material parity.

Source changes require a new review; changed browser inputs require a new run.
The source inventory guard is conservative: any `src/` change invalidates all
reviews, including changes to shared tokens or runtime helpers. Review owners
listed per entry before renewing pins; matching hashes are never a new audit.
Missing evidence remains unavailable. The operator collector executes native
Node tests, records Chromium and Node versions, hashes inputs and retains a raw
report. It cannot ingest candidate-authored verification prose. Skill and MCP
receive generated snapshots; MCP blocks dependent results on version/provenance
failure. The roadmap is optional reading, outside the ordinary component path.

Concrete feature gaps include standalone common-button shape morphing, modal
date/time pickers, an emphasized type scale with font coverage, shared shape
roles, and shared motion roles. Separate integration findings concern the scale
utility's reduced-motion behavior and expanding-card CSS/runtime timing. These
remain roadmap items; this change adds no framework APIs or style behavior.
Retained navigation components and intentionally excluded variants are usage
constraints, not automatically missing capabilities. Stale picker prose now
states that `open()`/`close()` methods are absent.

Foundation design evidence comes from inspectable Google Android documentation.
The JavaScript-only Material pages were not fully reviewed, so full web
specification coverage stays unassessed. Existing expanding-card tests call
`cubic-bezier(0.2, 0, 0, 1)` emphasized; Google's inspected motion guidance calls
it standard. This naming mismatch is recorded without changing the curve.

Validation passed: `npm run verify` completed 992 tests with no skips,
typecheck, generated-file checks, and the documentation build/site checks.
`npm run test:skill` passed 231 tests and 22 replay cases; the explicit browser
suite passed 23 tests. MCP smoke checks passed for seven tools, and isolated
framework/MCP package verification passed. Generated files were checked again
after packaging. The basic-button reading path is 30,407 bytes, 25.23% below the
original 40,670-byte baseline.

The accepted operator collection records 17 passing tests on Chromium
151.0.7922.34 and Node v24.20.0, dated September 8 UTC. Inputs stayed unchanged.
Its raw report SHA-256 is
`519796bd2f6583a831928a3bafd0e05adbe012d56f8fdef69fb1cf7036df990c`.
Thirteen components and all three foundations have scoped mapped assertions;
33 components have no directly mapped browser checks. An earlier run passed
its tests but was discarded because collector inputs changed during collection.
Independent review confirmed the source guards, MCP foundation blocking,
complete script/semantics fingerprints and matching generated snapshots.

No live agent benchmark, new human visual assessment, published-package parity
claim, installation or publication is part of this follow-up.


## Material decision evaluation follow-up, September 7, 2026

The existing benchmark now tests component fit, expressive hierarchy, installed
typography/shape contracts, and motion preferences in three runnable editor tasks.
Intentional Material weaknesses remain semantically valid so markup conformance
cannot substitute for design judgment. Read-only review and CSS-only repair
scopes are independently enforced. Matched operator captures and behavior checks
remain separate from pending human judgments about the design.

No skill instructions, framework APIs, stylesheets, or dependencies change in
this iteration. The existing Skill Creator viewer shows source, captures and
results. See the [evaluation protocol](./expressivecss-skill-evals.md#material-decision-cases)
for reproducible commands and review boundaries. The [comparison report](./expressivecss-skill-comparison.md#material-decision-evaluation-follow-up) records six completed tasks, the transparent report-label correction, and pending human design review.


## Web accessibility follow-up, September 7, 2026

Accessibility guidance now separates Material target recommendations, WCAG 2.2
criteria, and measured browser behavior. A focused reference covers target-size
exceptions, independent pointer alternatives to dragging, forced colors, and
contrast after theme overrides. Root routing includes explicit contrast and
forced-colors investigations while ordinary token work uses focused Theming
checks. The required basic-button reading path remains below the 25% reduction
budget at 30,253 bytes.

The source drag-handle documentation and generated guides now require a non-drag
pointer alternative as well as keyboard access. Audit rows distinguish those
checks and treat Material's 48dp recommendation separately from WCAG failures.
The existing evaluator gains forced-colors emulation and a deliberately flawed
fixture for a no-edit review and scoped repair. No framework behavior, public
API, or dependency changed. See the [comparison report](./expressivecss-skill-comparison.md#web-accessibility-follow-up)
for results, evidence limits, and review artifacts.


## Complete examples follow-up, September 7, 2026

Three runnable Common Ground examples now teach composition through workspace
settings, a newsletter editor, and a reading-list/detail flow. Each switches
between restrained and expressive treatments without resetting content or state.
Inline disclosures explain how action size, containment, typography, semantic
color, and shape serve different product contexts. Sample state is explicitly
session-only; no account settings, messages, or reading history reach a backend.

The Design guide links to these optional assets after component selection.
The examples remain outside the basic-button reading path. Their source lives
inside the portable skill and is reused directly by the existing evaluator.
A small contributor preview command uses the existing restricted fixture server
and removes its temporary consumer on shutdown. No server framework, frontend
dependency, public framework API, or component stylesheet was added.

Browser review corrected textarea typography/theme styling, unintended article
card styling, mobile action placement, and doubled-text editor overflow. The
regression checks cover responsive boundaries, both treatments and themes,
native keyboard behavior, feedback, safe text preview, and teardown/remount.
See the [comparison report](./expressivecss-skill-comparison.md#complete-examples-follow-up)
for matched captures, focused adaptation runs, and remaining review limits.

## Component selection follow-up, September 7, 2026

All 21 generic avoidance warnings now name the competing job or component.
Thirty selected guides include a concrete scenario showing why a plausible
choice is wrong. The existing catalogue owns the examples; the generator and
optional MCP bundle carry them without another catalogue or runtime dependency.

The main distinctions cover app destinations versus local panels, native form
values versus command/toggle buttons, transient versus persistent versus blocking
feedback, and measured versus unmeasured waits. Button-group toggle support,
indeterminate linear progress, snackbar Undo, native input alternatives, and
inline picker limits remain explicit. These are selection examples grounded in
the existing package contracts, not new claims of Google specification parity.

The complete basic-button reading path is 30,159 bytes, 25.84% below the original
40,670-byte baseline and 285 bytes below the preceding revision. Examples live in
the selected guides rather than the mandatory index. Regression checks protect
example coverage, generation, existing MCP selection outcomes, and the reading
budget. See the [focused comparison](./expressivecss-skill-comparison.md#component-selection-follow-up)
for the two approved tasks, observed outputs, and validation limits.

## Material mapping and expressive foundations, September 7, 2026

The existing component catalogue now owns dated upstream evidence, documented
support, web adaptations, and known boundaries. Its 46 entries distinguish 34
Material components, including the explicitly marked legacy bottom app bar, one
layout pattern, six related patterns, and five web extensions. The selected
generated guide and optional MCP decision response carry the same mapping.
Upstream inventory review confirms an observed Google entry; it does not certify
every specification or the framework's visual parity. Source-reviewed support
does not constitute a browser pass. Specification links remain pointers unless
the evidence scope says the specification itself was reviewed.

Shape and motion have focused Theming references; typography now explains
emphasized treatments through existing scoped weight tokens and actual font
coverage. These references identify framework gaps rather than inventing APIs:
no reusable emphasized type scale, global shape scale, or global motion theme is
shipped. Component-specific shape/motion remains available. The common-button
square/toggle morph boundary, inline picker behavior, and independent expanding
card CSS/cleanup timing are documented limits, not implementation changes.

Shared floating-sheet and banner documentation was corrected where it implied
unverified upstream authority. Search mapping preserves application ownership of
view opening. Current Google guidance about expanded rails and docked toolbars is
recorded without removing the existing drawer or bottom-app-bar contracts.

The complete basic-button path is 30,444 bytes, a 25.14% reduction from the original
40,670-byte baseline. Repeated selection text was shortened to keep the new
evidence within the existing reading budget. No dependency, stylesheet behavior,
runtime API, export, or installation changed. See the
[comparison report](./expressivecss-skill-comparison.md#material-mapping-and-foundations)
for the focused old/new task review and validation evidence.

## Reliability and performance follow-up, September 2026

The phases below record the original implementation plan. The follow-up keeps
the six support guides and existing evaluator, with these changes:

- One root routing policy, useful discovery descriptions, and a shorter generated
  decision index. Adaptive details live with their selected component guide.
- Resolve once per task and prefer matching bundled guidance. A bundled version
  match does not verify the current public website.
- Focused asset-loading, lifecycle, media, and browser-measurement guidance.
- Runnable consumer fixtures, source-based completion checks, structured evidence
  matching, retained infrastructure failures, and an operator-owned Codex adapter.

The complete basic-button read path is now 30,501 bytes, compared with 40,670 bytes
before the change: 25.0% less. This counts entire files, including the whole index;
it is a deterministic context-size comparison, not a token or latency benchmark.

The completed measurements and evidence limits are recorded in the
[comparison report](./expressivecss-skill-comparison.md).

The next reliability increment adds browser access during candidate execution,
recorded capability failures, proof-backed error reporting, structured audit and
version assertions, and full-project edit boundaries. Six focused live executions
exercise lifecycle repair, no-edit audit, and unavailable version documentation.
Their results and a correction to the console-error validator are recorded in the
comparison report; they are separate from the original 36-run performance study.

The live catalogue now contains eight cases and twenty discovery probes in
`tests/fixtures/expressivecss-skill-evals/benchmark.json`. Keep an immutable copy of
the original skill before editing. Run old and revised versions on independent
copies of the same fixtures with the same Codex configuration:

```sh
node scripts/benchmark-expressivecss-skill.mjs --baseline=/absolute/path/to/original-skill --output=/tmp/expressivecss-comparison
node scripts/benchmark-expressivecss-skill.mjs --baseline=/absolute/path/to/original-skill --output=/tmp/expressivecss-discovery --triggers=true
```

The unfiltered comparison runs each case three times per version, for 48
runs. Each old/new pair runs concurrently; the dispatch order alternates. The
report includes per-case medians, variability, observed usage, correctness checks,
screenshots, and source outputs. Missing telemetry stays unavailable. Discovery
uses constrained selection probes and is reported separately from task completion;
it does not estimate natural-task invocation rates.

The two complete-interface cases add full-page refinement and no-edit review,
using matched browser scenes and task interactions. Measured assertions remain
separate from the existing Design matrix's qualitative verdicts. See the
[evaluation protocol](./expressivecss-skill-evals.md#complete-interface-evaluations)
for scene coverage and review limits. The earlier six-case, 36-run study retains
its original scope and results.

For an interrupted comparison, `--resume=true` retains completed results only
when skill, fixture, grader, plan and recorded runtime/settings provenance match.
Legacy archives without provenance and orphan attempt directories require a new
output directory; validation happens before any resume writes. Select only
operator-reviewed local results. Interrupted attempts are not successful runs.
Natural discovery now has an independently authored held-out split and a frozen
protocol; see its [separate workflow](./expressivecss-skill-evals.md#natural-discovery-and-frozen-comparisons).
The responsive case removes
the fixture's unrelated header overflow before introducing navigation and hero
defects; it does not grade that inherited defect as a candidate regression.

Review the outputs with Skill Creator's existing viewer, not a new dashboard:

```sh
python /absolute/path/to/skill-creator/eval-viewer/generate_review.py /tmp/expressivecss-comparison --skill-name expressivecss --benchmark /tmp/expressivecss-comparison/benchmark.json --static /tmp/expressivecss-comparison/review.html
```

The installed viewer generator embeds raw JSON in a script block. Until it
escapes HTML delimiters upstream, source snippets containing `</script>` break
the export. Its statistics formatter also throws on unavailable token means.
Apply these two export fixes; preserve missing telemetry as unavailable:

```sh
python3 - /tmp/expressivecss-comparison/review.html <<'PY'
import json, sys
from pathlib import Path
p = Path(sys.argv[1])
html = p.read_text()
prefix = '    const EMBEDDED_DATA = '
line = next(line for line in html.splitlines() if line.startswith(prefix))
data = json.loads(line[len(prefix):].removesuffix(';'))
safe = json.dumps(data, ensure_ascii=True).replace('<', '\\u003c')
html = html.replace(line, prefix + safe + ';', 1)
html = html.replace('if (!stat) return "—";',
                    'if (!stat || stat.mean == null || stat.stddev == null) return "Unavailable";', 1)
p.write_text(html)
PY
```

Human review remains necessary for visual quality and the accuracy of audit
findings. Browser measurements describe these local fixtures, not field Core Web
Vitals. A failed critical check or infrastructure failure cannot support a release
claim. Publishing and installing the revised skill are separate work.

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
| Theming | Color, typography, icon styling, theme, scheme, vibrant-region, elevation, shadow, state-layer, or other visual-token work. |
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
  "skillVersion": "0.7.0",
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

## Durable product context

Design now routes work across pages to an optional product-context reference.
Theming can consult it directly for shared brand decisions without loading the
full Design workflow. The reference reuses existing project records, separates
acceptance from observed implementation and proposals, and scopes exceptions
to their recorded purpose. It gives a fallback when documentation is absent
and preserves planning and review as no-edit work.

The focused comparison uses the existing consumer and Codex adapter. It checks
a new-page plan and an authorized update to existing design notes, including
stale implementation notes and unapproved navigation ideas. See the
[comparison and limits](expressivecss-product-context.md). No mandatory
configuration format, new dependency, or product-context service was added.

## Maintenance across requests

The evaluator now carries the settings and editor examples through three
requests each, with a fresh agent per stage. Cumulative browser checks preserve
earlier behavior while accepting an explicit replacement requirement. Parent
hashes and scoped file checks prevent silent resets, and failed stages block
their successors while retaining evidence. The
[maintenance report](expressivecss-maintenance.md) records outcomes and limits.
No new skill instructions are added without evidence that maintenance needs them.

## Autonomous scope and recovery follow-up

Roadmap item 7 extends the existing skill, MCP, and evaluator. The optional
[workflow reference](../../skills/expressivecss/references/autonomy.md) defines
allowed work and safe recovery without a mandatory project configuration or
extra approval step for already authorized changes. MCP permissions now support
a narrower server-controlled script list and fail-fast command sequences.
Output schemas and conservative annotations describe the tools; byte-level
inspection evidence and optional expected hashes detect stale candidates.

Two focused benchmark tasks cover a permitted repair preserving user edits and a
failed-check investigation whose required repair is outside scope. The
[autonomy report](./expressivecss-autonomy.md) records results and limits.
The implementation adds no package dependencies, public framework API, or
automatic rollback of shared files.

## Follow-up 8: cost of accepted results

Extend the existing implementation benchmark with skill-only, ExpressiveCSS
MCP-only and combined assistance, initially on form-action and navigation/media.
Three sequential attempts per mode rotate order. Preserve separate input/cached/
output tokens, agent and operator elapsed time, observed tool failures and actual
MCP/guide use. Keep first-pass acceptance and human correction requests separate
from automated checks, bound to the exact retained attempt. Export bounded
transcripts, source and captures outside the checkout with hashes; commit only a
compact evidence record. Use Skill Creator's existing review viewer. See the
[comparison protocol and results](expressivecss-assistance-cost.md).
