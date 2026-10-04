# Phase 3 validation

Feature: requested MCP runtime methods
Date: 2026-10-04
Roadmap phase: Phase 3, requested runtime methods
Branch: `feature/2026-10-04-mcp-runtime-methods`
Base: local `origin/master` at `e96338b934f69b8cd812231a3a51a968bbee06b2`
Status: V1 through V5 and local manual review passed; required CI and review pending

Validate [requirements R1 through R5](requirements.md#requirements) for [roadmap Phase 3](../roadmap.md#phase-3-requested-runtime-methods). Read-only source inspection established the baseline. No tests or builds ran during specification. The separately authorized implementation has execution evidence below.

## Automated acceptance checks

### V1: complete Methods across the catalogue

Requirements: R1, R2, R3, R5. Result: passed locally.

Setup: extend the existing live stdio suite and matching-version fixture. Derive expected Methods bodies independently from each shipped guide in `component-guides.json`; do not copy the server parser into the expectations. At the base, 15 of 41 guides document Methods and 26 report absence. Enumerate the actual bundle so catalogue changes remain covered.

Action: request every canonical slug with `sections: ["methods"]` in batches of at most 12. Compare documented Markdown exactly and absent records with `{ status: "absent", markdown: null }`. Autocomplete must include `.open()`, `.close()`, `.selectOption()`, `.setMenuItems()` and `.destroy()`. Cards must report absence.

Extend the disposable package-local bundle fixture to cover an empty Methods body, no heading, nested headings, literal headings inside backtick/tilde fences, same-or-higher-level section boundaries, end-of-file content and preserved interior CRLF. Include a body exceeding the configured per-component character setting to detect accidental clamping. Remove the fixture and close its client/transport in `finally`.

Expected: complete bodies in source order, with only surrounding whitespace trimmed. No Options or following section is absorbed into Methods, and headings inside fenced examples remain content. No invented methods appear. The regression fails on the base and passes after implementation.

### V2: selection isolation and legacy compatibility

Requirements: R1, R3, R4. Result: passed locally.

Setup: retain existing catalogue Options, complete-rule and tool-discovery assertions. Use identical workflow IDs for paired requests.

Action: compare omitted selectors with `[]`, then exercise Options-only, Methods-only and both combined orders across the catalogue. Remove only the requested optional component records and compare the remaining payload with the default result. Compare combined records with their respective single-section results. Repeat foundation-only requests with valid selectors and parse text content for equality with structured content.

Expected: default/empty requests omit both optional records. Options-only omits `methods`; Methods-only omits `options`; both combined orders return equivalent payloads. Existing Options bodies, all rule strings/IDs, generic advice and summary/evidence/capability fields remain unchanged. Cards retains its 16 baseline rules; Autocomplete retains `field-supporting-text-linked`. Foundation-only requests retain their existing result. All seven tool registrations and both page architect spellings remain callable.

### V3: selector validation and missing names

Requirements: R1, R3, R4. Result: passed locally.

Setup: extend existing live invalid-input and missing-component cases.

Action: submit a string or null selector, unsupported names, non-string entries, duplicate Options, duplicate Methods, and arrays longer than two. Confirm valid single and combined selectors succeed. Request a known component alongside an unknown name with Methods or both sections selected. Preserve empty component/foundation rejection and existing count/length-limit cases.

Expected: invalid forms return protocol validation errors without silently dropping entries. The unknown component remains in `missing`, receives no invented record and preserves existing partial/blocked coverage. Known components return their requested records even alongside the missing name.

### V4: evidence restrictions and bundled authority

Requirements: R4, R5. Result: passed locally.

Setup: reuse unresolved/mismatched version, missing/stale/invalid/divergent provenance, tampered consumer guide and disabled-stage fixtures. Retain command-denial regressions.

Action: compare default and Methods/combined requests for each fixture, accounting only for requested component records. Insert conflicting Methods prose in the existing consumer fixture and verify output still matches the package bundle. Exercise skipped-stage requests with both selected sections.

Expected: blocked results retain compatibility/provenance outcomes, blocked checks and restricted capability evidence. Bundled Methods remain reference data and establish no runtime or accessibility approval. Consumer prose cannot override them. Skipped stages retain the existing blocked envelope and perform no lookup. Lookup never executes scripts or initializes components, and command permissions remain unchanged.

### V5: contributor and isolated package checks

Requirements: R1 through R5. Result: passed locally.

Setup: use the supported contributor runtime and installed dependencies. Commands below are established in `CONTRIBUTING.md`; their recorded Phase 3 results are below.

Run sequentially from the repository root:

```sh
npm ci --prefix mcp/expressivecss
npm test --prefix mcp/expressivecss
npm run verify
npm run verify:packages
```

If generator inputs changed, first run `npm run build:semantics` and `npm run build:skill`. Contributor verification checks generated data; `npm run check:generated` is the focused diagnostic for stale outputs.

Expected: V1 through V4, existing MCP regressions, contributor checks and both isolated package checks pass. The installed MCP tarball runs the expanded smoke suite and returns Methods from packaged data outside the source checkout. Record actual browser coverage and skips accurately. A separate visual comparison is required only if implementation changes visuals, which is outside the confirmed feature scope.

## Requirement coverage

| Requirement | Acceptance checks | Planned work |
| --- | --- | --- |
| R1 | V1, V2, V3, V5 | Groups 1, 2 and 3 |
| R2 | V1, V5 | Groups 1, 2 and 3 |
| R3 | V1, V2, V3, V5 | Groups 1, 2 and 3 |
| R4 | V2, V3, V4, V5 | Groups 1, 2 and 3 |
| R5 | V1, V4, V5 | Groups 1, 2 and 3 |

## Manual review

Result: passed locally.

- [x] Review the final diff for shared extraction/summary reuse, preserved Options/default behavior, unchanged complete rules and evidence, and no added dependencies or command permissions.
- [x] Review Methods-only and combined README examples, absence meaning and changelog accuracy. Confirm self-contained packaging and source-owned generated data.
- [ ] Confirm the contributor acceptance process for public API scope and the repository's required CI/review conditions. Specification approval alone does not establish external acceptance or merge readiness.

## Execution evidence on 2026-10-04

The user authorized implementation after approving all three specification groups. `syntaxSchema` now accepts up to two distinct section names. `parseGuide()` reads bundled Methods with the existing `extractSection()`, and `summarizeGuide()` conditionally returns the specified `methods` record. Tool discovery and the README explain the selector. Shared section extraction, dependencies, generated data, framework behavior and command policy are unchanged.

The live regression failed on the base because `sections: ["methods"]` was rejected. The completed suite compares full Methods or documented absence for all 41 bundled guides, alongside all existing Options and rule expectations. Fifteen guides document Methods and 26 report absence. Autocomplete includes all five documented methods, including `.destroy()`. Cards reports absence. Default and single-section requests preserve selection isolation; both combined selector orders return equivalent payloads. Invalid selectors fail, unknown names preserve partial/blocked evidence, and foundation-only requests retain their existing result.

Six additional guides in the existing disposable package fixture cover missing/empty Methods, nested headings, literal headings inside fenced code, same/higher-level boundaries, end-of-file content, CRLF and a Methods body longer than 24,000 characters. Both text and structured results agree. Conflicting consumer Methods cannot replace bundled guidance. Unresolved/mismatched versions, missing/stale/invalid/divergent provenance and disabled-stage behavior retain existing restrictions. Command-denial regressions pass. Clients and disposable fixtures are cleaned up in `finally`.

| Command or check | Result | Log |
| --- | --- | --- |
| Dependency installation | Root and MCP `npm ci` passed on Node 24.21.0 and npm 11.19.0 | `/tmp/expressivecss-mcp-phase3-root-install.log`, `/tmp/expressivecss-mcp-phase3-install.log` |
| MCP test before implementation | Expected failure: supported Methods selector rejected | `/tmp/expressivecss-mcp-phase3-red.log` |
| MCP test after implementation | Passed, seven tools and expanded catalogue/compatibility regressions | `/tmp/expressivecss-mcp-phase3-green.log` |
| `npm run verify` | Passed: build, typecheck, 1,448 tests, zero failures/skips, generated-data and docs checks | `/tmp/expressivecss-mcp-phase3-verify.log` |
| `npm run verify:packages` | Both isolated consumers passed, including the installed MCP tarball's expanded live suite | `/tmp/expressivecss-mcp-phase3-packages.log` |

Contributor checks ran Chromium, Firefox and WebKit, including keyboard and arabic-touch-reflow critical-flow profiles. No separate visual regression comparison ran. Local diff review confirmed shared retrieval, selector validation, preserved legacy behavior, accurate README examples and source-owned package guidance. No regeneration was needed. Required external CI, public API acceptance process and repository review remain pending. No commit, push, pull request, merge or release occurred.

## Merge conditions

All in-scope requirements, V1 through V5, affected regressions and manual checks must pass with recorded evidence. Follow `CONTRIBUTING.md` for accepted public API scope, passing required CI, resolved conversations, an up-to-date branch and applicable review. During the single-maintainer stage, BaezFJ's own PRs need CI but no independent approval. Failures or missing required checks block merge readiness.

No decision is deferred. No migration or framework compatibility change is planned. The roadmap remains unchanged during specification. The local execution evidence above does not establish external merge readiness or publication authorization.
