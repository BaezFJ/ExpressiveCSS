# Phase 2 validation

Feature: requested MCP runtime options
Date: 2026-10-04
Roadmap phase: Phase 2, requested runtime options
Branch: `feature/2026-10-04-mcp-runtime-options`
Base: local `origin/master` at `b46e9230a20115f6a03d2299ebdad4eb72775fd8`
Status: V1 through V5 and local manual review passed; required CI and review pending

Validate [requirements R1 through R5](requirements.md#requirements) for [roadmap Phase 2](../roadmap.md#phase-2-requested-runtime-options). Source inspection established the baseline; no tests or builds ran during specification.

## Automated acceptance checks

### V1: complete requested Options across the catalogue

Requirements: R1, R2, R3, R5. Result: passed locally.

Setup: extend the existing live stdio smoke suite, matching-version fixture and bundled `component-guides.json` expectations. At this base there are 41 guides; enumerate the actual shipped bundle rather than keeping a second inventory. Independently identify each Options body, ending at the next same-or-higher-level Markdown heading, with surrounding whitespace trimmed.

Action: call `component_syntax_expert` for every canonical slug with `sections: ["options"]`, in batches within the 12-component limit. Compare each documented `options.markdown` exactly with the full expected body and compare each absent record with `{ status: "absent", markdown: null }`. Cover missing and empty Options sections, and nested headings. If empty/nested cases need a synthetic bundle, use a disposable package-local fixture without a production test hook, then remove it in `finally`.

Expected: every found component has the correct documented or absent status. Source tables, examples, links and nested content remain complete. Datepicker includes `openByDefault`, `container`, `displayPlugin`, the `'docked'` value, its pairing with `openByDefault: true`, and `displayPluginOptions`. Autocomplete returns its bundled Options. Cards reports absence. No Methods section or fabricated entry appears. This check fails on the base implementation and passes after the feature.

### V2: existing requests and rule completeness

Requirements: R1, R3, R4. Result: passed locally.

Setup: retain the Phase 1 all-guide rule expectations and existing capability/tool-discovery assertions. Use the same matching-version client and fixtures.

Action: compare calls omitting `sections` and using `sections: []`; both omit `options`. Compare an Options request against the default result after removing only the new component `options` records and accounting for generated workflow IDs. Repeat existing foundation-only requests with and without the selector. Parse the text representation for equality with structured content.

Expected: all existing summary fields, full ordered rule strings and IDs, generic fallbacks, compatibility/provenance and capability records remain unchanged. Cards retains all 16 baseline rules; Autocomplete retains `field-supporting-text-linked`. Foundation-only results contain no component Options records. All seven tool registrations and both page architect spellings remain callable. Requested Options text and structured results agree.

### V3: invalid selectors and unknown components

Requirements: R1, R3, R4. Result: passed locally.

Setup: use the live client and existing invalid-request and unknown-name cases. Exercise `sections` as a string, null, an array containing an unknown name or `"methods"`, duplicate `"options"` entries, and arrays exceeding the allowed length.

Action: submit those invalid forms and assert protocol validation errors. Request an unknown component alongside a valid component with the valid selector. Retain the existing empty component/foundation rejection and maximum-count checks.

Expected: invalid selectors never succeed silently. The unknown name stays in the existing `missing` result, with no invented component or Options record. The valid component retains its Options, and the combined result preserves existing blocked/partial coverage behavior. An empty selector remains valid on otherwise valid requests.

### V4: compatibility, provenance and bundled authority

Requirements: R4, R5. Result: passed locally.

Setup: reuse existing unresolved/mismatched version, stale/missing/invalid/divergent provenance, tampered consumer guide and disabled-stage fixtures. Extend relevant syntax requests with the valid Options selector. Keep existing command-denial regressions in the full suite.

Action: compare shared evidence and capability restrictions with equivalent default syntax requests. Verify requested Options match the package bundle even when consumer prose contains conflicting Options. Exercise skipped-stage behavior through the existing environment-based setup.

Expected: blocked requests stay blocked, with unchanged compatibility/provenance outcomes and no expansion of capability or command permissions. Bundled Options may remain available as reference data on blocked syntax results, as existing bundled rules do; their presence never establishes consumer compatibility. Consumer text cannot replace them. Skipped stages keep their existing envelope and perform no lookup. No project scripts or browser components execute during Options lookup.

### V5: contributor and isolated package checks

Requirements: R1 through R5. Result: passed locally.

Setup: use the supported contributor runtime and installed dependencies. These commands are established in `CONTRIBUTING.md`; their Phase 2 outcomes remain unverified.

Run from the repository root, sequentially:

```sh
npm ci --prefix mcp/expressivecss
npm test --prefix mcp/expressivecss
npm run verify
npm run verify:packages
```

If generator inputs changed, first regenerate with `npm run build:semantics` and `npm run build:skill`. `npm run verify` includes generated-data checks. Use `npm run check:generated` for a focused stale-data diagnosis if needed.

Expected: V1 through V4 and the full existing MCP suite pass. Contributor checks pass. Both isolated package checks pass, and the installed MCP tarball's smoke suite retrieves Options without source-checkout access. Cleanup closes clients and transports and removes temporary fixtures in `finally`. Record browser checks that actually ran and any skips accurately. A separate visual comparison becomes relevant only if implementation unexpectedly introduces visual changes.

## Requirement coverage

| Requirement | Acceptance checks | Planned work |
| --- | --- | --- |
| R1 | V1, V2, V3, V5 | Groups 1, 2 and 3 |
| R2 | V1, V5 | Groups 1, 2 and 3 |
| R3 | V1, V2, V3, V5 | Groups 1, 2 and 3 |
| R4 | V2, V3, V4, V5 | Groups 1, 2 and 3 |
| R5 | V1, V4, V5 | Groups 1, 2 and 3 |

## Manual review

Result: passed locally; required external CI, API acceptance process and repository review remain pending.

- [x] Inspect the final diff for the Options-only contract, unchanged legacy fields and evidence, and reuse of shared parsing and summary code.
- [x] Review the MCP README examples, absence meaning and changelog entry. Require the repository's acceptance process for public API additions before merge; specification approval alone does not establish that process.
- [x] Confirm generated-data ownership, self-contained packaging, unchanged dependencies and command policy, and no claims of new runtime/accessibility approval from documentation lookup.

## Execution evidence on 2026-10-04

The implementation adds the bounded selector to the existing syntax schema, parses bundled Options, and conditionally returns the specified `options` record through the shared summary. Section extraction now respects nested headings, fenced examples and same-or-higher-level boundaries. No tool, dependency, generated data, framework behavior or command policy changed.

The live catalogue regression initially failed because `app-bar.md` returned no explicit absent-section record. The completed suite covers all 41 shipped guides: 12 have documented Options and 29 report absence. It compares full Options bodies, default and empty-selector responses, all existing rule strings and IDs, and text/structured agreement. Datepicker's visibility and docked-display options are present; Cards reports absence. Invalid selectors fail, unknown names retain partial/blocked evidence, and foundation-only requests remain unchanged.

Five disposable package-local guides exercise nested headings, literal headings inside backtick and tilde fences, longer closing fences, an empty section, end-of-file content, same-level and higher-level boundaries, CRLF preservation, and a complete Options body longer than 24,000 characters. Fixtures and clients are removed in `finally`. Consumer-authored Options cannot replace the bundle. Unresolved/mismatched versions and stale/missing/invalid/divergent provenance retain blocked statuses and capability restrictions. Skipped-stage and command-denial cases pass.

An independent comparison of the base and current section extractors returned identical Contract, Syntax and Rules bodies for every shipped guide. The existing complete-rule regression remains intact. Generated checks confirmed that no regeneration was needed.

| Command or check | Result | Log |
| --- | --- | --- |
| Dependency installation | `npm ci` and `npm ci --prefix mcp/expressivecss` passed on Node 24.21.0 / npm 11.19.0 | `/tmp/expressivecss-mcp-phase2-root-install.log`, `/tmp/expressivecss-mcp-phase2-install.log` |
| `npm test --prefix mcp/expressivecss` before implementation | Expected regression failure: missing App bar absence record | `/tmp/expressivecss-mcp-phase2-red.log` |
| `npm test --prefix mcp/expressivecss` after implementation | Passed, seven tools and catalogue-wide Options/rule checks | `/tmp/expressivecss-mcp-phase2-green.log` |
| `npm run verify` | Passed: build, typecheck, 1,448 tests, zero failures/skips, generated checks and docs verification | `/tmp/expressivecss-mcp-phase2-verify.log` |
| `npm run verify:packages` | Passed for both isolated consumers, including the installed MCP tarball's expanded smoke suite | `/tmp/expressivecss-mcp-phase2-packages.log` |

Contributor checks ran Chromium, Firefox and WebKit, including keyboard and arabic-touch-reflow critical-flow profiles. No separate visual regression comparison ran; this feature changes documentation retrieval. `git diff --check` passed. The user authorized implementation separately from specification. Local results do not establish external CI, acceptance of a public API discussion, or repository approval.

## Merge conditions

V1 through V5 and manual review must pass with recorded evidence. Every in-scope requirement and affected regression must pass. Meet `CONTRIBUTING.md` requirements for accepted public API scope, passing required CI, resolved conversations, an up-to-date branch and applicable review. BaezFJ's own PRs need CI but no independent approval during the single-maintainer stage. Required failures, missing required checks or unexplained regressions block merge readiness.

No decision is deferred. The roadmap completion state was preserved during specification. The separately authorized implementation milestone now has local evidence above; required external merge conditions remain pending.
