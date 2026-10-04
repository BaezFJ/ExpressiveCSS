# Phase 1 validation

Feature: complete MCP component rules
Date: 2026-10-04
Branch: `fix/mcp-complete-component-rules`
Base: `origin/master` at `7d3d238b02cffdd4bb50bbfe517f44054451aef6`
Status: V1 through V5 and local manual review passed; required CI and review pending

Validate [requirements R1 through R5](requirements.md#requirements) for [roadmap Phase 1](../roadmap.md#phase-1-complete-component-rules). Existing passing smoke results from the earlier review are baseline evidence only; they do not prove the correction works.

## Automated acceptance checks

### V1: complete rules across the bundled catalogue

Requirements: R1, R3, R5. Result: passed locally.

Setup: extend the existing `smoke.mjs` test using its bundled `component-guides.json` data, live stdio client and matching-version project fixture. Derive expected bullets and normative rule IDs from each guide's Rules section without calling the production summary. Do not read framework source to obtain the test's expected guidance.

Action: call `component_syntax_expert` for every canonical guide slug, in requests within the existing 12-component limit. For guides with Rules bullets, compare the returned complete rule-string array and ordered normative rule-ID sequence to the bundled source. Check guides without Rules bullets through V2. Verify both returned representations agree.

Expected: every normative rule is present, with unchanged text and order. At the baseline catalogue, Cards has all 16 rules, and autocomplete includes `field-supporting-text-linked`. Assert all-guide equality rather than using those two counts as the only proof. This check must fail against the reviewed eight-rule implementation and pass after the fix.

### V2: generic fallback advice remains unchanged

Requirements: R2, R3. Result: passed locally.

Setup: identify shipped guides with no Rules-section bullets from bundled data. Use the same matching-version fixture and live client.

Action: request those guides and compare their `rules` arrays to the existing two fallback advice strings. Keep the test's normative rule-ID comparison separate from that fallback comparison.

Expected: fallback strings and order are unchanged and neither string is counted as a normative rule ID. No new public metadata field is necessary to distinguish them in the test. If the implementation checkout no longer ships such a guide, record the changed setup and specify a package-local fixture before claiming this check passed.

### V3: existing protocol inputs and outputs remain compatible

Requirement: R3. Result: passed locally.

Setup: use the existing smoke-suite tool-discovery assertions, matching-version fixture and an input using only currently supported arguments.

Action: run the original requests and compare the corrected rule arrays in text and structured content. Check the existing seven tool names and both page-architect spellings, shared evidence fields, contract/syntax summary shape and capability behavior.

Expected: valid existing requests still work and no tool or alias disappears. No new required argument or output field appears. Components with eight or fewer parsed rules retain the same rule arrays. Other summary fields and capability evidence remain compatible.

### V4: blocked results and guidance authority are preserved

Requirements: R4, R5. Result: passed locally.

Setup: reuse existing fixtures for mismatched or unresolved versions, stale or invalid provenance, tampered local guides, unknown component names and skip flags in `smoke.mjs`.

Action: run the existing negative cases and any focused syntax assertions needed to verify their behavior after the summary change. Preserve the command-denial cases in the full suite.

Expected: existing blocked or skipped statuses, compatibility fields and capability restrictions remain unchanged. Unknown names remain explicit. Tampered consumer guidance does not replace bundled rules, and command restrictions remain effective. A blocked syntax result may continue returning bundled reference data as before; this test must not impose a new zero-data policy.

### V5: contributor and isolated package verification

Requirements: R1 through R5. Result: passed locally.

Setup: use the supported contributor runtime and installed dependencies. The following commands are established repository commands, but no run in this specification task proves the future feature passes them.

Run from the repository root, sequentially:

```sh
npm ci --prefix mcp/expressivecss
npm test --prefix mcp/expressivecss
npm run verify
npm run verify:packages
```

If generator inputs changed, regenerate with `npm run build:semantics` and `npm run build:skill` before final checks. `npm run verify` includes generated-data checks; an isolated stale-data diagnosis can use `npm run check:generated`.

Expected: the complete MCP suite passes V1 through V4, contributor verification passes, and isolated package verification succeeds for the repository's packages. The MCP tarball runs its self-contained smoke test with complete rule delivery outside the checkout. No test or consumer needs unpublished framework source to obtain the bundled rules.

Always close clients, transports and temporary fixtures in `finally` blocks. Report actual browser execution and skips from contributor checks accurately. A separate visual comparison is required only if implementation introduces visual changes, which are outside this feature's intended scope.

## Requirement coverage

| Requirement | Acceptance checks | Planned work |
| --- | --- | --- |
| R1 | V1, V5 | Groups 1, 2 and 3 |
| R2 | V2, V5 | Groups 1, 2 and 3 |
| R3 | V1, V2, V3, V5 | Groups 1, 2 and 3 |
| R4 | V4, V5 | Groups 1, 2 and 3 |
| R5 | V1, V4, V5 | Groups 1, 2 and 3 |

## Manual review

Result: passed locally; repository CI and review remain pending.

- [x] Inspect the final diff to confirm the correction stays in the shared summary, keeps the current stack, and leaves static enforcement, permissions and later roadmap features unchanged.
- [x] Verify MCP documentation and changelog describe complete guidance without claiming browser behavior or accessibility approval. Preserve generated-data ownership and license notices.
- [x] Confirm the existing constitution files and roadmap completion state were preserved during specification. Record implementation evidence separately before any later completion update.

## Execution evidence on 2026-10-04

The implementation removes one slice in the shared summary. No generated data, public schema, tool registration or dependency changed. The mission and tech-stack files match specification commit `9420d0c7`.

The catalogue regression failed before the fix because Autocomplete returned eight rules and omitted `field-supporting-text-linked`. After the fix, live requests compare all 136 rule bullets across 41 guides in batches of at most 12. Cards returns all 16 rules. App bar, date picker, snackbar and time picker retain the exact two generic fallback strings, with no normative IDs.

Blocked syntax requests cover unresolved and mismatched versions plus stale, missing and invalid provenance. They retain complete bundled Cards rules and blocked capability evidence. Unknown component names remain explicit; tampered consumer prose does not replace bundled Buttons rules. The existing tool discovery, skip, command-denial and cleanup checks pass. Text and structured content agree.

| Command | Result | Log |
| --- | --- | --- |
| `npm ci --prefix mcp/expressivecss` | Passed on Node 24.21.0 / npm 11.19.0 | `/tmp/expressivecss-mcp-phase1-install.log` |
| `npm test --prefix mcp/expressivecss` before the fix | Expected regression failure: omitted Autocomplete rule | `/tmp/expressivecss-mcp-phase1-red.log` |
| `npm test --prefix mcp/expressivecss` after the fix | Passed, seven tools and all-guide regression | `/tmp/expressivecss-mcp-phase1-green.log` |
| `npm ci` | Passed, root contributor dependencies installed | `/tmp/expressivecss-mcp-phase1-root-install.log` |
| `npm run verify` | Passed: build, typecheck, 1,448 tests, zero failures/skips, generated checks and docs verification | `/tmp/expressivecss-mcp-phase1-verify.log` |
| `npm run verify:packages` | Passed: both isolated consumers, including the installed MCP tarball's expanded smoke suite | `/tmp/expressivecss-mcp-phase1-packages.log` |

Contributor verification ran browser checks in Chromium, Firefox and WebKit, including both critical-flow profiles. No separate visual regression comparison ran; this change introduces no visual behavior. Generated checks confirmed the committed data is current, so no regeneration was needed. `git diff --check` passed. These local results do not establish a required CI pass or repository approval.

## Merge conditions

V1 through V5 and the manual review must pass. All in-scope requirements must have recorded evidence, affected regressions must pass, and the repository's required CI and reviews must be satisfied. Required failures, unexplained regressions or unavailable required checks block merge readiness.

No feature decision was deferred. No validation result is marked passed merely because these documents exist. Commit, push, pull request creation, merge and release remain separate actions.
