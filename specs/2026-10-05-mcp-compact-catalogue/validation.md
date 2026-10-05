# Phase 4 validation

Feature: compact MCP catalogue listing
Date: 2026-10-05
Roadmap phase: Phase 4, compact catalogue listing
Branch: `feature/2026-10-05-mcp-compact-catalogue`
Base: local `origin/master` at `59d26fcfcae86b5d175788056daa0c3a2f9df7ce`
Status: V1 through V5 and manual review passed locally; required CI and review pending

Validate [requirements R1 through R5](requirements.md#requirements) using the [plan](plan.md), [roadmap Phase 4](../roadmap.md#phase-4-compact-catalogue-listing) and [repository testing constraints](../tech-stack.md#testing-and-release-checks). The checks below define implementation acceptance; recorded results follow in the execution evidence.

## Automated checks

### V1: registration and complete inventory

Requirements: R1, R4. Plan groups: 1 and 2. Result: passed locally on 2026-10-05.

Setup: extend the existing live stdio client in `mcp/expressivecss/smoke.mjs`; read packaged `component-guides.json` independently. Close the client/transport in `finally`.

Action: run `npm test --prefix mcp/expressivecss`; exercise `tools/list` and call `component_catalog` with `{}` and a workflow identifier. Reject wrong input types and project-root/workflow strings beyond existing bounds.

Expected: eight registrations, including all seven original names. New annotations equal `readAnnotations`. Entries contain every shipped guide exactly once, sorted by canonical slug; count agrees. The inspected base has 41 guides, but expected membership must derive from the bundle. Canonical slugs work through existing exact syntax lookup in batches within its 12-component limit.

### V2: compact metadata and snapshot identity

Requirements: R2, R3, R4. Plan groups: 1 and 2. Result: passed locally on 2026-10-05.

Setup: independently derive expected fields from packaged guide Markdown, component decisions and `contract.json`. Extend the suite's disposable package fixture to cover missing decision metadata, an empty alias array, absent use cases/jobs and missing documentation links. Remove fixtures in `finally`.

Action: compare all entry fields and top-level snapshot fields, then parse the text result and compare it with structured content.

Expected: every entry has exactly the six specified fields; description follows the first-useWhen/first-job/null rule; aliases/runtime/docs retain their source values. App bar includes its existing aliases and `auto-init` runtime. Missing values use the specified empty array or null. Version/hash equal packaged contract metadata. No entry or result contains full syntax, rule, API, capability or decision records. Text and structured content agree. Completeness never depends on a hard-coded 41-entry ceiling.

### V3: optional-target compatibility and provenance

Requirements: R3, R4. Plan groups: 1 and 2. Result: passed locally on 2026-10-05.

Setup: reuse matching consumer, mismatched/missing version and invalid/stale/divergent framework provenance fixtures. Launch no-target calls from both a consumer and framework-source working directory.

Action: request the same catalogue without `projectRoot`, then with each explicit fixture root. Use existing invalid-path and bounded-read cases where applicable.

Expected: omitted targets produce the same bundled entries and snapshot in both working directories, status available for successful listing, compatibility unknown and explicit unchecked target evidence. No consumer compatibility follows from bundled provenance. Explicit matching targets retain the existing matching outcome; mismatches and unavailable or invalid provenance block compatibility checks without omitting reference entries or changing bundled version/hash. Errors at invalid trust boundaries fail truthfully. No result claims browser, visual, runtime or accessibility approval.

### V4: read-only behavior and old-tool regressions

Requirements: R1, R3, R4. Plan groups: 1 and 2. Result: passed locally on 2026-10-05.

Setup: disposable projects have script markers and before/after file contents. Keep existing skipped-stage, denied-command, injected-prose, rule completeness, Options/Methods, foundation and exact-lookup cases.

Action: perform catalogue calls against those projects; run the entire expanded MCP suite. Observe script markers, project contents and existing result assertions.

Expected: catalogue calls execute no project script, initialize no component and change no target file. Guidance always comes from the bundle, even with conflicting consumer prose. All original tools and both page architect names remain callable; previous request forms, blocked outcomes, complete rules, selected sections and command-denial checks pass. Aliases returned by discovery do not change current syntax lookup rules. No-target listing needs no network resolution; explicit-target checks preserve existing guarded resolution behavior.

### V5: contributor checks and isolated package

Requirements: R1 through R5. Plan group: 3. Result: passed locally on 2026-10-05.

Setup: use Node 24 and the dependencies/browser setup described in `CONTRIBUTING.md`, or its established container equivalents. These are existing commands, not checks executed during specification.

Run the following in order during implementation verification:

```sh
npm ci --prefix mcp/expressivecss
npm test --prefix mcp/expressivecss
npm run verify
npm run verify:packages
```

Expected: the expanded MCP suite passes; framework build, typecheck, repository tests, generated-data checks and docs verification pass. Isolated package verification runs the expanded live suite from the installed tarball using bundled files outside the checkout. Required browser checks must have actual passing evidence; record skipped or unavailable checks explicitly. The new tool needs no source-checkout dependency. If source inputs changed, regenerate with `npm run build:semantics` and `npm run build:skill` before verification. A separate `npm run check:generated` is available after generation; it is already included in `verify`.

## Manual checks

Result: passed locally on 2026-10-05. Review the implementation diff and README examples for R2 through R5. Check empty and explicit-target forms, field meanings, metadata fallbacks, descriptive aliases, framework version/source hash and blocked evidence. Confirm that search, selectable detail, budgets, resources, releases and framework behavior stayed outside this change. Check source ownership and cleanup in `finally`.

No visual change is planned. A visual comparison is required only if implementation introduces one, following `CONTRIBUTING.md`. Never claim a visual or browser check passed when it was skipped.

## Requirement coverage

| Requirement | Planned work | Observable checks |
| --- | --- | --- |
| R1 | Groups 1, 2 and 3 | V1, V4, V5 |
| R2 | Groups 1, 2 and 3 | V2, V5, manual review |
| R3 | Groups 1, 2 and 3 | V2, V3, V4, V5, manual review |
| R4 | Groups 1, 2 and 3 | V1 through V5, manual review |
| R5 | Groups 2 and 3 | V5, manual review |

## Merge conditions

All in-scope requirements and V1 through V5 must pass with recorded results, including affected regressions and manual review. Required CI must pass, conversations must be resolved and the branch must be up to date. Follow the contributor process for accepted public API scope and applicable review. BaezFJ's own PRs require CI but no independent approval under the current single-maintainer policy.

No decision remains deferred. Implementation and local verification are complete; external merge checks remain pending. Commit, push, pull request creation, merge and publication remain separate actions.


## Execution evidence on 2026-10-05

The user authorized implementing this plan. `component_catalog` now delivers all 41 shipped component guides through the shared loader and existing decision data. Its entries include only the specified compact fields. The loader skips target-dependent reads when no target is supplied; all existing callers still pass their resolved roots. No dependency, generated-data source, framework behavior or command permission changed.

| Check | Recorded result |
| --- | --- |
| Red/green MCP regression | The base failed at `smoke.mjs` tool registration because `component_catalog` was missing. The completed live suite passes with eight tools. Two initial fixture expectations were corrected to preserve existing resolver behavior: symlinked or oversized framework marker files yield unresolved compatibility, with invalid provenance. |
| V1 through V4 | Passed catalogue-wide metadata and canonical lookup, snapshot identity, text/structured agreement, input bounds, metadata fallbacks, omitted-target behavior from different working directories with a CLI root default, matching and blocked target fixtures, conflicting consumer prose and original-tool regressions. Byte comparisons and script markers establish unchanged fixture files and no script execution, including a project inside the allowed command root. |
| V5 contributor verification | Docker `npm run verify` passed. Of 1,448 tests, 1,445 passed, zero failed and three optional evaluation-browser tests were skipped. Build, typecheck, generated-data checks and documentation build/verification passed. Both keyboard and arabic-touch-reflow critical-flow profiles passed in Chromium, Firefox and WebKit; all six exported `result.json` records report passed. |
| V5 MCP and isolated packages | MCP smoke and both isolated package checks passed in the full Docker command. A subsequent `npm run test:packages:docker` passed against the final smoke suite after adding CLI-default and allowlisted-script fixture checks. The installed MCP tarball passed all eight tools outside the checkout. |
| Manual review and limits | Reviewed source, registrations, fixtures, cleanup and README examples against R1 through R5. Exact syntax lookup, shared evidence and execution policy are preserved. Only the four intended MCP files and feature/status documents changed. No visual comparison ran. Required external CI, API scope process and repository review remain pending. |

Commands run:

```sh
npm ci --prefix mcp/expressivecss
npm test --prefix mcp/expressivecss
npm run test:docker -- sh -c 'npm run verify && npm ci --prefix mcp/expressivecss && npm test --prefix mcp/expressivecss && npm run verify:packages'
npm run test:packages:docker
```

The full Docker command completed with exit 0 in 381.60 seconds, plus a 0.82-second image build. The final package command completed with exit 0 in 55.81 seconds. Its final fixture additions changed tests only; contributor verification covered the same production implementation. Syntax checks, specification links, requirement coverage and whitespace checks passed. Generated data stayed unchanged because none of its inputs changed.

The three optional evaluation-browser tests report `Optional evaluation SDK or Chromium is not installed`. Framework Chromium, Firefox and WebKit checks did run; the skip concerns the separate optional evaluation setup. No optional evaluation pass is claimed.

Logs are `/tmp/expressivecss-mcp-phase4-red.log`, `/tmp/expressivecss-mcp-phase4-green.log`, `/tmp/expressivecss-mcp-phase4-verification.log` and `/tmp/expressivecss-mcp-phase4-packages.log`. Contributor reports are in `.cache/container-tests/expressivecss-e6d08d81-f226-41b1-b250-828f0a84230d`; final package reports are in `.cache/container-tests/expressivecss-4865e286-1ae8-49f4-b98a-308a1b78419d`. Both runners removed their containers and unique image tags. Mission and technical constraints retain their prior hashes. The roadmap records local Phase 4 completion; Phases 5 through 10 remain unstarted. Changes are uncommitted.
