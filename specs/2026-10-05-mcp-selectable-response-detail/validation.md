# Phase 6 validation

Feature: MCP selectable response detail
Date: 2026-10-05
Roadmap phase: Phase 6, selectable response detail
Branch: `feature/2026-10-05-mcp-selectable-response-detail`
Base: local `origin/master` at `cecd86d33cf0c9f078fe56e96dc213d0f5b7d251`
Status: V1 through V7 locally verified; required CI and repository review pending

Validate [requirements](requirements.md#requirements) through the ordered [plan](plan.md). Follow [roadmap Phase 6](../roadmap.md#phase-6-selectable-response-detail), the [mission](../mission.md#success-criteria) and [technical constraints](../tech-stack.md#testing-and-release-checks).

## Requirement coverage

| Requirement | Planned group | Acceptance checks |
| --- | --- | --- |
| R1 | 1 and 2; verification in 3 | V1, V4, V6, V7 |
| R2 | 1 and 2; verification in 3 | V1, V2, V5, V6 |
| R3 | 1 and 2; verification in 3 | V2, V3, V5, V6 |
| R4 | 1 and 2; verification in 3 | V4, V5, V6, V7 |
| R5 | 1 and 2; verification in 3 | V1, V3, V5, V6 |
| R6 | 2 and 3 | V6, V7 |

## Automated checks

### V1: complete rules and legacy defaults

Setup: reuse the live stdio client, matching-version fixture and independent bundled Markdown expectations in `mcp/expressivecss/smoke.mjs`. Request all 41 guides in batches within the existing 12-component input limit.

Action: compare requests omitting the new arguments, explicit detailed requests, and compact requests with a fixed `workflowId` and target. Compare all pre-existing fields of the first two, excluding only the specified additive metadata. Compare identity, full rules and normative IDs across modes against bundled source, including all 16 Cards rules and the autocomplete supporting-text linkage rule. Check fallback guides separately.

Expected: legacy defaults preserve existing values and character limits. Compact has no contract/syntax properties. Both modes preserve every applicable rule, source order, lookup results and compatibility outcome. Fallback advice does not become normative evidence. Result: passed; see the execution evidence below.

### V2: runtime API selection

Setup: use the catalogue-wide and synthetic section fixtures already in the smoke suite.

Action: in both modes, request no sections, Options, Methods and both in each supported order. Repeat with component capabilities explicitly on and off. Include Datepicker, Autocomplete, Cards and the existing nested/fenced/empty section cases.

Expected: requested API records equal independently derived complete Markdown or the existing absent/null records. Unselected properties remain absent; selector order does not change results. Detail/capability settings cannot suppress explicitly requested sections. Result: passed; see the execution evidence below.

### V3: component capability and foundation selection

Setup: use matching, mismatched, unknown-version and invalid-provenance targets from the existing smoke fixtures.

Action: exercise both detail modes with omitted, true and false `includeCapabilities`. Request components alone, components plus foundations, and foundations alone. Include `includeCapabilities: false` with explicit foundations.

Expected: component capability defaults follow detail and explicit booleans override them. Included safe records match the bundled snapshot; included blocked records retain null. Disabled component capability properties are absent. Explicit foundation results and their blocked checks match existing behavior. `capabilityEvidence`, compatibility, provenance and status remain truthful; optional projection cannot bypass safety checks. Result: passed; see the execution evidence below.

### V4: selectors, output schemas and intentional omissions

Setup: inspect the syntax tool's live `tools/list` input/output schemas and validate response metadata with those advertised constraints.

Action: reject unknown detail strings, null/nonstring detail and nonboolean capability values. For both modes and selector combinations, compare effective selectors and each entry's `omittedFields` with actual property absence. Validate enums, no duplicate fields and deterministic order. Follow recovery by requesting detailed output, the omitted API sections or component capabilities.

Expected: every selector-driven omission has the specified field/reason record, and included absent/null records have none. Recovery delivers the requested existing detail or its explicit absence/blocking state. New syntax fields have concrete schema constraints rather than only loose additional-property permission. Other tools retain their schemas. Disabled-tool envelopes still validate without successful-retrieval metadata. Result: passed; see the execution evidence below.

### V5: evidence and protocol regressions

Setup: retain the existing live eight-tool suite, target/provenance fixtures, command-root restrictions and disabled-tool tests.

Action: request unknown and mixed names, no components/foundations, repeated names, foundation-only input and blocked targets in each mode. Parse every result's text and compare it with structured content. Retain full listing/search, exact syntax lookup, unknown-name suggestions, API selector limits, read-only annotations and denied-command checks.

Expected: missing entries, found counts and rule-coverage outcomes retain existing behavior. Shared evidence fields remain present and describe actual checks, consumer compatibility and unchecked browser behavior. Compact retrieval runs no project script and writes no consumer file. Existing tool names and aliases remain callable. Clients, transports and fixtures close in `finally` blocks. Result: passed; see the execution evidence below.

### V6: contributor and isolated-package verification

Setup: use Node 24 and project dependencies, or the established container workflow in [CONTRIBUTING.md](../../CONTRIBUTING.md#verify). Confirm environment readiness during implementation; it was not exercised during specification.

Action: run the established commands after implementation:

```sh
npm run verify
npm test --prefix mcp/expressivecss
npm run verify:packages
```

Install missing MCP dependencies with `npm ci --prefix mcp/expressivecss` before its tests if needed. Container equivalents are `npm run test:docker -- npm run verify` and `npm run test:packages:docker`. If generator inputs change, run `npm run build:semantics` and `npm run build:skill`, then verify generated consistency through the contributor checks. Confirm package verification runs the expanded smoke suite from installed tarballs.

Expected: contributor checks, live MCP behavior and isolated consumers pass using packaged guidance without repository source/build scripts at consumer runtime. Record command results and skipped checks accurately. Browser evidence requires actual engine execution; no separate visual comparison is required for this documentation-response change. Result: passed; see the execution evidence below.

## Manual checks

### V7: documentation and merge review

Action: review README examples, tool description, unreleased changelog and final diff against R1 through R6. Confirm documented detail/capability defaults, API/foundation precedence, omitted-field meanings and supported recovery. Verify the documentation states existing prose/example limits and reserves aggregate budgets/resources for later phases.

Expected: examples agree with live results. No documentation equates retrieval with interaction, visual or accessibility approval. All changes stay in the confirmed MCP scope, with generated data changed through its owner only. Result: passed; see the execution evidence below.

## Merge conditions

- [x] V1 through V7 pass with recorded implementation evidence; every in-scope requirement has an observable passing check.
- [ ] Affected regressions, contributor verification, MCP smoke tests and isolated packages pass. Required CI passes without an unreported browser or visual skip.
- [ ] The branch is up to date, conversations are resolved, API scope is accepted through the contributor process and applicable repository review is satisfied. BaezFJ's own PRs need CI but no independent approval under current policy.
- [x] The diff preserves existing clients, tool names/aliases, markup/accessibility contracts, generated-data ownership, trust boundaries and package self-containment.

Local acceptance checks passed. Required CI and repository review remain pending. Local verification does not establish merge readiness or authorize publication.


## Execution evidence on 2026-10-05

The user authorized implementation of the plan on 2026-10-05. All local task groups are complete on the specified branch. Changes remain uncommitted. Required external CI, accepted API scope process and applicable repository review remain pending; no commit, push, pull request, merge or release occurred. Constitution and roadmap completion state remain unchanged as required by the plan.

| Check | Command or review | Result |
| --- | --- | --- |
| Group 1 red check | `npm test --prefix mcp/expressivecss` before server changes | Failed at the new live schema check because `detail` was absent from advertised syntax inputs. The log reports access to the missing `detail.enum` property at `smoke.mjs:355`. |
| V1 through V5 | `npm test --prefix mcp/expressivecss` after implementation and final test edits | Passed, all eight tools. Covered every shipped guide, both modes, all supported section combinations, capability defaults/overrides, independent full rule text/IDs, synthetic API sections, seven version/provenance targets, missing/repeated names, foundation-only requests, invalid empty requests, schema-negative cases, disabled tools, text/structured agreement and original regressions. |
| V6 contributor verification | `npm run test:docker -- npm run verify` | Passed. Framework build, typecheck, 1,445 tests passed, zero failed, three optional evaluation-browser checks skipped, generated data, docs build and site verification. Container command completed in 329.65 seconds. |
| V6 isolated packages | `npm run test:packages:docker` | Passed MCP dependency installation and smoke tests, then `npm run verify:packages` for both packages. Framework 0.12.0 and MCP 0.2.2 passed isolated consumers. The expanded MCP suite passed from the installed tarball outside the checkout. Container command completed in 63.41 seconds. |
| V7 documentation/diff review | README, tool description, unreleased changelog and final diff review; `git diff --check` | Passed. Defaults, selector precedence, deterministic omission metadata, recovery and existing prose/example limits agree with the implementation. No dependency, generated source, framework behavior or catalogue behavior change. |

Contributor verification executed framework browser checks in Chromium, Firefox and WebKit. All six exported critical-flow results passed for keyboard and arabic-touch-reflow profiles. Touch, enlarged text and responsive conditions are emulated; native zoom, real devices and assistive technology remain untested. The three skipped tests require the optional evaluation SDK or its browser setup, and do not represent a skipped framework browser engine. No separate visual comparison ran.

Logs:

- `/tmp/expressivecss-mcp-phase6-install.log`
- `/tmp/expressivecss-mcp-phase6-red.log`
- `/tmp/expressivecss-mcp-phase6-green.log`
- `/tmp/expressivecss-mcp-phase6-verification.log`
- `/tmp/expressivecss-mcp-phase6-packages.log`

Contributor reports are in `.cache/container-tests/expressivecss-204164c2-9992-4593-b1e5-0d8bc667de64/`. Package-run reports are in `.cache/container-tests/expressivecss-a7e60a0c-df58-4c78-ad82-2bbfb76b7853/`. These logs and reports remain outside committed source.
