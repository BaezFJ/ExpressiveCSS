# Phase 7 validation

Feature: MCP aggregate response limits and recovery
Date: 2026-10-05
Roadmap phase: Phase 7, aggregate response limits and recovery
Branch: `feature/2026-10-05-mcp-aggregate-response-limits`
Base: local `origin/master` at `57171f738c5967841af48bd73f6fed6dcf74c462`
Status: V1 through V7 locally verified; required CI and repository review pending

Validate [requirements](requirements.md#requirements) through the ordered [plan](plan.md). Follow the [mission](../mission.md#success-criteria), [technical constraints](../tech-stack.md#testing-and-release-checks) and [roadmap Phase 7](../roadmap.md#phase-7-aggregate-response-limits-and-recovery).

## Coverage map

| Requirement | Planned work | Checks |
| --- | --- | --- |
| R1 configuration and request compatibility | Groups 1 and 2 | V1, V5, V6 |
| R2 complete-result byte bound | Groups 1 and 2 | V1, V2, V4, V6 |
| R3 whole rules, sections and code | Groups 1 and 2 | V2, V3, V6 |
| R4 validated omission and recovery metadata | Groups 1 and 2 | V2, V3, V4, V7 |
| R5 deterministic delivery and truthful evidence | Groups 1 and 2 | V2, V3, V5 |
| R6 working recovery and explicit failure | Groups 1 and 2 | V3, V4, V7 |
| R7 preserved trust boundaries and QA behavior | Groups 1 and 2 | V5, V6, V7 |
| R8 documentation and merge checks | Groups 2 and 3 | V6, V7 |

## Automated checks

### V1: operator configuration and complete-result measurement

Setup: extend existing stdio launches in `mcp/expressivecss/smoke.mjs` with default and explicit budgets. Measure the final result independently with `Buffer.byteLength(JSON.stringify(result), 'utf8')`. Include every SDK-returned tool-result property; inspect the wire result if the client normalizes its shape.

Action: run `npm test --prefix mcp/expressivecss`. Call every scoped tool with fitting results at the default 65,536 bytes. Launch valid positive budgets and invalid empty, zero, negative, fractional, signed, nonnumeric, nonfinite and unsafe settings. Construct deterministic boundary fixtures with fixed workflow IDs, avoiding UUID length changes. Establish exact-fit and one-byte-over cases against the final result including metadata.

Expected: valid configuration starts; invalid configuration fails explicitly at startup. Exact-fit results return whole content. Results exceeding the limit reduce or fail as specified. Text and structured duplication, escaped JSON, metadata and error flags count toward one budget. No returned scoped tool-result object exceeds its limit. Result: passed; see the execution evidence below.

### V2: whole material at boundaries and across scoped tools

Setup: use bundled guide content as independent expectations and disposable fixture guides with long code, Unicode, escaped strings and large rule/API records. Request 12 known components with Options/Methods and capabilities, plus separate foundation requests. Exercise setup, creative, both page aliases and catalogue list/search under fitting and constrained budgets.

Action: run the expanded MCP smoke suite. Compare delivered rules, API Markdown, code and skeletons against independent full source expectations. Compare repeated requests for deterministic ordering and omissions with fixed workflow IDs. Cover duplicate and mixed known/unknown names, foundation-only requests and valid search result limits.

Expected: delivered components retain all rules in source order. Every requested API section and code unit is whole or explicitly omitted. No delivered syntax/skeleton contains a truncation fragment. Retained contract prose clamps have length-limit disclosure. Optional syntax fields disappear before requested sections, then whole components/foundations. Catalogue and creative results retain their existing ordering. Both page aliases apply the same policy; architecture remains whole. Delivered counts and partial/error coverage match the actual result. Search-limit and byte-limit omissions remain distinct. Result: passed; see the execution evidence below.

### V3: omission schemas and working recovery

Setup: inspect `tools/list` output schemas using the smoke suite's existing schema validator. Produce byte omissions for components, API sections, foundations, catalogue entries, suggestions and architecture. Retain selector and legacy-prose omissions as separate reasons.

Action: validate text and structured agreement and each omission's identity/counts. Reject malformed fields/reasons, negative counts and invalid recovery arguments. Execute advertised narrower requests through the live client, preserving the target context. Cover compact detail, one-component/section/foundation retrieval, exact catalogue slug query and reduced suggestions where material fits alone.

Expected: every omitted requested unit has schema-valid accounting; duplicates remain distinguishable by request position. Absent documentation and unknown components do not become byte omissions. Recovery returns the stated whole unit or its truthful absent/blocked state at the same budget when possible. No recovery claims to bypass compatibility or enlarge operator policy. Result: passed; see the execution evidence below.

### V4: indivisible material and impossible error budgets

Setup: launch a small-budget server with a giant Options section, a component whose complete rules cannot fit and oversized essential evidence. Launch a server with budget 1. Include blocked and disabled-tool paths, long valid workflow/project context and omission metadata that cannot fit by itself.

Action: request the fixtures and compare any returned error with its full byte limit. Execute narrower recovery where possible. For indivisible content, verify the operator-increase advice, restart with an adequate budget and retrieve it whole. For budget 1, inspect the actual JSON-RPC error response rather than expecting an ordinary tool result.

Expected: fitting errors preserve truthful essential evidence and expose no successful coverage. Indivisible units have explicit errors and do not promise same-budget recovery. If a truthful minimal result cannot fit, the tool call fails explicitly through the protocol. No oversized fallback tool-result object, silently discarded omission record or successful empty coverage is returned. Document the chosen protocol error code/message and its framing exclusion. Result: passed; see the execution evidence below.

### V5: compatibility, provenance, QA and read-only regressions

Setup: reuse the existing matching, mismatched, unresolved, divergent and invalid-source targets, disabled-tool fixtures, no-target catalogue and permitted/denied command roots. Snapshot consumer files and script markers using existing tests.

Action: run the complete smoke suite across original tools and both aliases. Compare fitting results with existing values, allowing only specified additive metadata and whole-code/clamp-disclosure changes. Exercise constrained results with each evidence state. Run existing static inspection and QA command-denial checks without applying the new guidance budget to them.

Expected: compatibility/provenance outcomes remain identical; partial delivery never becomes available complete guidance. Disabled tools stay blocked, and catalogue without a target stays unknown for consumer compatibility. Exact lookup, missing-name recovery and selector behavior remain intact. QA limits, evidence, script policy, environment filtering and redaction remain effective. Guidance requests change no consumer file, run no script and initialize no component. Fixtures, transports and timers are cleaned up in `finally` blocks. Result: passed; see the execution evidence below.

### V6: contributor and isolated-package verification

Setup: follow [CONTRIBUTING.md](../../CONTRIBUTING.md#verify). Commands below are established repository commands, inspected but not run for this specification. Host execution requires Node/dependencies and the documented browser setup; container execution requires Docker or the documented Podman setup.

Action: run `npm run verify`, `npm ci --prefix mcp/expressivecss`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`. The established container alternatives are `npm run test:docker -- npm run verify` and `npm run test:packages:docker`. Run `npm run check:generated` after source/generator changes, with regeneration through the documented owners only.

Expected: contributor checks, MCP behavior and both isolated packages pass. The installed MCP tarball executes the expanded suite with packaged guidance and enforces budgets outside the checkout. Record actual passes, failures and skips. Browser evidence requires real engine execution; this response-only feature requires no separate visual comparison. Result: passed; see the execution evidence below.

## Manual checks

### V7: documentation, scope and merge review

Setup: review the MCP README, descriptions, unreleased changelog and final diff against R1 through R8.

Action: verify the byte formula/default, all six scoped registrations, preserved QA behavior, configuration failures, legacy setting, ordering/count semantics, existing prose limit disclosure and runnable recovery examples. Compare examples with live results. Confirm protocol failure excludes only the outer error envelope from the tool-result guarantee. Review pending external checks separately from local records.

Expected: documentation and schemas agree with implementation. No reference suggests same-budget recovery for indivisible content, unrestricted full-guide retrieval, unchecked consumer compatibility or browser approval. No extra dependency, inventory, framework change, generated-data hand edit, resource registration or publication is present. Result: passed; see the execution evidence below.

## Merge conditions and evidence

All in-scope requirements must pass their mapped acceptance checks. Affected regressions, contributor verification, MCP smoke tests and isolated packages must pass. Required CI, resolved conversations, an up-to-date branch, accepted API scope and applicable repository review must be satisfied before merge. Record real browser/visual execution and skips accurately.

No feature migration is required. Existing clients retain their request forms; oversized results gain explicit partial/error behavior and previously clipped code becomes whole or explicitly omitted. These behavior changes require documented compatibility review. Resource URI/version migration belongs to later phases.

Specification preparation ran only consistency checks. The user subsequently authorized implementation. V1 through V7 now have local passing evidence. Required CI, accepted API scope process and applicable repository review remain pending. Local verification does not establish merge or release readiness.

## Execution evidence on 2026-10-05

The user authorized implementing the plan. Local implementation and verification are complete on the specified branch. Changes remain uncommitted. Constitution and roadmap completion state remain unchanged. No push, pull request, merge or release occurred.

| Check | Command or review | Result |
| --- | --- | --- |
| Initial red regression | `npm test --prefix mcp/expressivecss` before server changes | Failed on `setup_expert must advertise the aggregate response budget` at the added live schema assertion. Remaining boundary cases were added while completing the implementation. |
| V1 through V5 live behavior | `npm test --prefix mcp/expressivecss` | Passed all eight tools and the expanded budget suite. Checked actual wire results, default and exact-fit/one-byte-over limits, all twelve requested components, complete rules/API records, Unicode and escaped long code, constrained listing and suggestion recovery, repeated/missing names, foundations, mismatched targets, disabled tools, invalid operator settings and giant sections/rules. Executed advertised narrower requests and independently validated metadata schemas. Budget 1 and an oversized SDK validation error returned protocol error `-32001` with no tool result. Original compatibility/provenance, read-only and QA command-denial regressions passed. Legacy catalogue-wide completeness checks use an explicit larger budget; dedicated checks exercise the default. |
| V6 contributor verification | `npm run test:docker -- npm run verify` | Passed framework build, typecheck, 1,445 tests with zero failures and three optional evaluation checks skipped, generated-data checks, docs build and site verification. Container command completed in 334.39 seconds. |
| V6 isolated packages | `npm run test:packages:docker` | Passed MCP installation and smoke tests, then `npm run verify:packages` for framework 0.12.0 and MCP 0.2.2. The expanded smoke suite passed from the installed MCP tarball outside the checkout. Container command completed in 107.12 seconds. |
| V7 documentation and scope | README, tool descriptions, unreleased changelog, source diff and `git diff --check` | Passed. Measurement, configuration, scope, complete/partial/error metadata, whole-unit ordering, legacy summary disclosure, executable recovery and protocol failures agree with the implementation. Only four MCP source/test/documentation files and the three feature documents changed. |

Contributor verification ran framework browser checks in Chromium, Firefox and WebKit. All six exported keyboard and arabic-touch-reflow `result.json` reports have `status: "passed"`. Touch, text enlargement and responsive conditions are emulated; native zoom, real devices and assistive technology remain untested. The three optional evaluation skips do not represent missing framework browser engines. No separate visual comparison ran.

Contributor reports are in `.cache/container-tests/expressivecss-723fcafe-1764-482a-b892-3727487e8c9b/`. Isolated-package reports are in `.cache/container-tests/expressivecss-7e63c817-6f99-4caf-94c4-3cb165410814/`.

Logs are `/tmp/expressivecss-mcp-phase7-install.log`, `/tmp/expressivecss-mcp-phase7-red.log`, `/tmp/expressivecss-mcp-phase7-green.log`, `/tmp/expressivecss-mcp-phase7-verification.log` and `/tmp/expressivecss-mcp-phase7-packages.log`. Required external CI and review conditions remain pending.
