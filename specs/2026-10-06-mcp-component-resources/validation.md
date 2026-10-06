# Phase 9 validation

Date: 2026-10-06
Roadmap phase: Phase 9, versioned component resources
Branch: `feature/2026-10-06-mcp-component-resources`
Base: local `origin/master` at `8672d9fc1764f1f6a60ec74d37518708a5565d77`
Status: V1 through V5 locally verified; required CI and review pending

Validate [requirements](requirements.md#requirements) through the ordered [plan](plan.md). Follow the [mission](../mission.md#success-criteria), [technical constraints](../tech-stack.md#testing-and-release-checks) and [roadmap Phase 9](../roadmap.md#phase-9-versioned-component-resources). The user selected all four check groups in the interview: live content agreement (V1), identity rejection (V2), small-budget recovery (V3), and contributor and packages (V5). V4 covers the regressions those groups depend on.

## Coverage map

| Requirement | Planned work | Observable validation |
| --- | --- | --- |
| R1 templates and listing | Groups 1 and 2 | V1, V5 |
| R2 whole-guide contents | Groups 1 and 2 | V1, V3 |
| R3 section contents and absence | Groups 1 and 2 | V1 |
| R4 agreement with tools and catalogue | Groups 1 and 2 | V1 |
| R5 snapshot evidence and consumer independence | Groups 1 and 2 | V1, V2, V4 |
| R6 identity validation | Groups 1 and 2 | V2 |
| R7 successful-read byte bound | Groups 1 and 2 | V3 |
| R8 budget errors and section recovery | Groups 1 and 2 | V3 |
| R9 existing behavior and packaged execution | Groups 1 through 3 | V4, V5 |
| R10 documentation and truthful records | Group 3 | V5 |

## Automated checks

All automated checks run in `mcp/expressivecss/smoke.mjs` through `npm test --prefix mcp/expressivecss`, using the existing `Client` and `StdioClientTransport`. Build expectations from the packaged `component-guides.json` and `contract.json` with parsing written in the test, not from server output.

### V1: live discovery and content agreement

Setup: launch with the default budget. Use an explicit adequate budget for complete tool results.

Action: call `listResourceTemplates()`, `listResources()` and `readResource()` for every whole-guide URI and every section URI. Call `component_syntax_expert` with `sections: ["options", "methods"]` and `detail: "detailed"` for each guide, at the server's own bundled version. Read the catalogue resource.

Expected:

- Templates list shows exactly `component_guide` and `component_guide_section` with version and hash literals and JSON MIME type.
- `resources/list` shows `component_catalog` plus one whole-guide URI per bundled guide, sorted by slug.
- Each whole-guide read returns the R2 fields. Each section read returns the R3 fields and equals the matching whole-guide field.
- Rules match the tool's `found[0].rules` exactly, including normative rule ID order. Cards returns all 16 rules.
- Datepicker `options` is `documented` and equals the tool's Options markdown. A guide without Options or Methods returns `absent` with `markdown: null`.
- Every `contract` equals the independently extracted Contract section, including the 9 guides longer than 900 characters.
- Version and hash in each URI and JSON body equal the catalogue resource's values.
- Evidence fields match R5, with `contractCompatibility: "unknown"` and the unchecked areas listed. Reading the same URI twice gives identical text.

Result: passed; see the [execution evidence](#execution-evidence-on-2026-10-06).

### V2: identity rejection and consumer independence

Setup: reuse the matching, mismatched, stale and missing-contract consumer fixtures, and launch clients from their directories and with the CLI project-root default. Use a consumer whose script would create a sentinel file if executed.

Action: read each of these URIs:

- the catalogue alias `datepicker` and a case variant `Cards`
- an unknown slug, an unavailable version, a wrong hash and a shortened hash
- an unknown section, an extra segment, an empty segment and a trailing slash
- a percent-encoded slug, a query string, a fragment, a traversal-like slug, and `file:` and `https:` URIs

Use low-level requests where SDK client validation would hide the server error. Send one malformed request without `uri`.

Expected: every listed URI returns `-32002` and the malformed request fails through SDK validation. Valid reads in every consumer context return the bundled snapshot with consumer compatibility unknown. Consumer files and the sentinel stay unchanged, and no request reaches the network or the local filesystem.

Result: passed; see the [execution evidence](#execution-evidence-on-2026-10-06).

### V3: byte bound and small-budget recovery

Setup: launch servers with explicit budgets. Measure the actual wire `result` with `Buffer.byteLength(JSON.stringify(result), 'utf8')`, including URI, escaped text and any SDK-added fields.

Action:

1. Read every component URI at the default budget and measure it.
2. For one whole guide, find the exact-fit budget, accounting for the digits of `maxBytes`. Read at that budget and at one byte less.
3. At a budget where the whole Cards guide fails but its `rules` section fits, read the whole guide. Read every URI in `error.data.recoveries` on the same server.
4. Choose a budget at which at least one section of a guide cannot fit. Check `unrecoverableSections`, then restart with `requiredBytes` for that section and read it.
5. Read a whole guide and a section at budget 1.
6. Read the catalogue resource at a small budget.

Expected:

- Every successful read satisfies the R7 bound, and exact fit succeeds.
- A read one byte under the budget, and any read that does not fit, returns `-32001` with no contents. The error data has the requested URI, `maxBytes`, `requiredBytes`, the setting name and `recoveries`.
- Every listed recovery URI returns its complete section at the same budget. Sections that do not fit appear in `unrecoverableSections`, and section URIs have empty `recoveries`.
- The advertised `requiredBytes` actually allows complete delivery.
- At budget 1, both reads return protocol errors.
- The catalogue error keeps its Phase 8 message and data.
- Listing and template listing work at every budget.

Result: passed; see the [execution evidence](#execution-evidence-on-2026-10-06).

### V4: tool, catalogue and transport regressions

Setup: keep the existing eight-tool assertions, selector and search checks, tool byte-limit fixtures, disabled-tool launches, provenance fixtures, static semantics and denied-command checks.

Action: run the full suite. In one session, interleave component reads, failed component reads, catalogue reads and small-budget tool calls. Launch with every skip flag set and read component resources.

Expected: all eight tools and their original requests behave as before. The Phase 8 catalogue resource assertions pass unchanged. Request ids do not leak between tool and resource tracking, and later valid requests succeed. Skip flags leave resource reads working and do not enable skipped tools. No read runs scripts, initializes components or changes command permissions. Teardown happens in `finally` blocks.

Result: passed; see the [execution evidence](#execution-evidence-on-2026-10-06).

### V5: contributor, package and documentation acceptance

Setup: follow [CONTRIBUTING.md](../../CONTRIBUTING.md). This checkout has no root or MCP `node_modules` at specification time.

Action: when Docker is available, run the established container sequence:

```sh
npm run test:docker -- npm run verify
npm run test:packages:docker
```

The host alternative, which needs Node 24, lockfile dependencies and the browser setup in CONTRIBUTING:

```sh
npm ci
npm ci --prefix mcp/expressivecss
npm run verify
npm test --prefix mcp/expressivecss
npm run verify:packages
```

These commands come from the Phase 8 record and CONTRIBUTING. This specification run did not execute them. Then review the README and unreleased changelog against actual list, template-list and read results, error codes and recovery data. Run `git diff --check` and check local links and changed-file scope. Run `npm run check:generated` if any generator input changed.

Expected: contributor checks, MCP behavior and both isolated packages pass. The installed tarball runs V1 through V4 outside the checkout. Documentation covers everything R10 lists. The diff contains no new dependency, hand-edited generated data, framework change or release step. Record actual test counts, skips and report locations. A browser check passes only if it ran.

Result: passed; see the [execution evidence](#execution-evidence-on-2026-10-06).

## Manual checks

No manual check is required. The change is stdio-only and has no visual output. The agent reviews protocol examples and trust boundaries as part of V5.

## Merge conditions

- V1 through V5 pass, with execution evidence recorded in this file.
- Affected regression checks pass, including the Phase 8 catalogue resource checks.
- Required repository CI passes, review conversations are resolved and the branch is current with `master`.
- Applicable review under CONTRIBUTING and GOVERNANCE is complete, including public API scope for the new resource templates.
- Publication follows RELEASING and needs separate authorization.

## Execution evidence on 2026-10-06

The base server failed the expanded smoke suite at its first component check: `resources/templates/list` returned no templates where `component_guide` and `component_guide_section` were expected. Log: `/tmp/expressivecss-mcp-phase9-red.log`.

After implementation, `npm test --prefix mcp/expressivecss` passed on the host with Node 24.21.0 and lockfile dependencies (SDK 1.31.0). This covers V1 through V4. Every whole-guide and section read for all 41 guides was compared with independent Markdown parsing and with `component_syntax_expert`. Cards returned 16 rules, Datepicker Options were documented, and every guide contract over 900 characters was delivered complete. All 22 malformed or unavailable URIs returned `-32002`. Exact-fit, one-byte-under, mixed-section, unrecoverable-section and budget-1 reads behaved as specified, and every listed recovery URI succeeded at the same budget. Log: `/tmp/expressivecss-mcp-phase9-green.log`.

A live probe at a 3,000-byte budget showed the whole Cards guide failing with `requiredBytes: 6425`. The error listed the `syntax`, `options` and `methods` URIs as recoveries and named `contract` and `rules` as unrecoverable.

`npm run test:docker -- npm run verify` passed in 335 seconds: 1,448 tests, 1,445 passed, 0 failed, 3 skipped. The skipped checks are the optional evaluation-browser tests, which report that the optional evaluation SDK or Chromium is not installed. Reports: `.cache/container-tests/expressivecss-532a9521-9cff-41ab-9932-9154eae47d10/`. Log: `/tmp/expressivecss-mcp-phase9-verification.log`.

`npm run test:packages:docker` passed in 130 seconds. It ran the MCP smoke suite in the checkout, then from the installed `@expressivecss/mcp-server@0.2.2` tarball outside the checkout, and verified both isolated packages. Reports: `.cache/container-tests/expressivecss-fea5fd21-2846-4ee9-bfaf-3e046c32a3de/`. Log: `/tmp/expressivecss-mcp-phase9-packages.log`.

`git diff --check` passed. The diff changes only `server.js`, `smoke.mjs`, `README.md` and `CHANGELOG.md` in `mcp/expressivecss/`, plus this specification. No generator input changed, so `npm run check:generated` ran only as part of `npm run verify`. No visual comparison ran; this change has no visual output.

Pending before merge: required CI, review conversations, an up-to-date branch and applicable review. No commit, push, pull request or publication has occurred.
