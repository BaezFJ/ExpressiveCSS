# Phase 5 validation

Feature: MCP catalogue search
Date: 2026-10-05
Roadmap phase: Phase 5, catalogue search
Branch: `feature/2026-10-05-mcp-catalogue-search`
Base: local `origin/master` at `2400237e70b45fbf3e64fa49e87e8128b0eaa04d`
Status: V1 through V6 passed locally; required CI and repository review pending

Validate [requirements R1 through R5](requirements.md#requirements) through the [ordered plan](plan.md). Follow [roadmap Phase 5](../roadmap.md#phase-5-catalogue-search), the [mission's success criteria](../mission.md#success-criteria) and [technical testing constraints](../tech-stack.md#testing-and-release-checks).

## Automated checks

### V1: inputs and listing compatibility

Requirements: R1, R4. Result: passed locally on 2026-10-05. See the execution evidence below.

Setup: extend the existing live stdio client and independent Phase 4 catalogue expectations in `mcp/expressivecss/smoke.mjs`. Run `npm test --prefix mcp/expressivecss` after implementation.

Request `{}`, workflow-only and explicit-target listings, plus a listing with a valid `limit` and no query. Expect the same complete, unique, slug-sorted inventory and original entry field set, counts and evidence. Verify all eight tool registrations and unchanged annotations. Validate query length at 256 and 257 characters, wrong types, empty and whitespace-only queries, limits 1 and 50, and rejection of 0, 51, fractions, strings and null. With a query and no limit, expect effective limit 10. Retain existing project-root/workflow bounds and syntax section-selection regressions.

### V2: matches, ordering and canonical lookup

Requirements: R2, R4. Result: passed locally on 2026-10-05. See the execution evidence below.

Setup: derive expectations independently from packaged guide and decision files. Add temporary package fixtures where aliases collide and exact matches compete with heuristic matches; retain existing fixture cleanup in `finally`.

Call search with every canonical slug and available catalogue alias. Use `app-bar`, its title with case/spacing variants, and `navbar` as named real-bundle examples. Verify strongest-match precedence, unique entries and order: exact names, exact aliases, then heuristics, with slug ordering within each group. Exercise compact descriptions, partial names, multiword queries whose tokens span fields, one- and two-character tokens, null descriptions and missing decision metadata. Every delivered slug must resolve through `component_syntax_expert` in batches respecting its existing 12-component bound. Confirm alias syntax lookup itself retains baseline behavior. Search must not match text found only in full guide bodies or capability records.

### V3: bounded results, omissions and empty search

Requirements: R1, R2, R3. Result: passed locally on 2026-10-05. See the execution evidence below.

Setup: select a verified broad real-bundle query or use a temporary catalogue with more than 10 matching entries. Use fixtures for limit boundaries independently of the shipped catalogue size.

Compare complete matching expectations with default-limit and explicit-limit responses. Expect `count === entries.length`, accurate `totalMatches`, `omittedCount === totalMatches - count` and `truncated === (omittedCount > 0)`. Entries never exceed the effective limit. Check both sides of a boundary, including exactly the limit and one more match. A narrower query or higher supported limit retrieves the expected omitted entries. Empty results and punctuation-only queries deliver an empty array, zero counts, false truncation and complete search coverage. Check the documented coverage statuses and the six original entry fields plus `matchType`. Repeated requests have the same matching order and totals. No output may imply complete catalogue coverage or a serialized byte-budget guarantee.

### V4: evidence and read-only regressions

Requirements: R3, R4. Result: passed locally on 2026-10-05. See the execution evidence below.

Setup: reuse omitted-target working-directory/CLI isolation and explicit matching, mismatch, unresolved, stale, missing, invalid and divergent provenance fixtures from the existing smoke suite. Retain before/after file snapshots and script marker checks.

Run searches, including no-match and truncated queries, under these fixtures. Expect unchanged bundled version/hash and original compatibility/provenance outcomes. Blocked targets retain reference search entries; empty results and truncation never erase blocked checks. Without a target, compatibility remains unknown and target checks remain unperformed. Parsed text must equal structured content, including match and omission metadata. Project files remain unchanged and script markers absent. All previous tools, command-denial cases, full normative rules and Options/Methods regressions pass. Close clients, transports and fixtures in `finally`.

### V5: contributor and installed-package verification

Requirements: R1 through R5. Result: passed locally on 2026-10-05. See the execution evidence below.

Setup: use the contributor runtime and dependency installation documented in [CONTRIBUTING.md](../../CONTRIBUTING.md#verify). These commands are established repository commands, inspected but not executed during specification.

```sh
npm run verify
npm ci --prefix mcp/expressivecss
npm test --prefix mcp/expressivecss
npm run verify:packages
```

The documented container equivalents are available when host dependencies or browsers are absent:

```sh
npm run test:docker -- npm run verify
npm run test:packages:docker
```

Expect contributor verification and the full expanded MCP suite to pass. `scripts/verify-packages.mjs` must run the expanded smoke suite against an installed MCP tarball outside the checkout, with bundled search metadata available and no repository dependency. Generated-data checks pass; regenerate through established generators only when relevant inputs changed. Record optional skips and actual browser execution separately. This metadata-only phase requires no visual comparison; any later visual change must follow the contributor visual-review policy.

## Manual checks

### V6: documentation and final diff

Requirements: R1 through R5. Result: passed locally on 2026-10-05. See the execution evidence below.

Review the README and unreleased changelog against the request/response contract. Confirm exact-name, alias, description, empty-result and truncated-result examples describe tested behavior. A returned canonical slug is the documented syntax input. Search-only labels and coverage states distinguish heuristic discovery, omitted matches and consumer compatibility. Limits, input bounds and recovery are explicit. Confirm the diff preserves source ownership, annotations, public tool registrations and command policy, and adds no dependency or second catalogue. Update generated files only through their generators when their inputs changed.

## Requirement coverage

| Requirement | Planned work | Checks |
| --- | --- | --- |
| R1 | Groups 1 and 2; verification in Group 3 | V1, V3, V5, V6 |
| R2 | Groups 1 and 2; verification in Group 3 | V2, V3, V5, V6 |
| R3 | Groups 1 and 2; verification in Group 3 | V3, V4, V5, V6 |
| R4 | Groups 1 and 2; verification in Group 3 | V1, V2, V4, V5, V6 |
| R5 | Documentation in Group 2; verification in Group 3 | V5, V6 |

## Before merge

All in-scope acceptance checks V1 through V6 and affected regressions must pass with recorded evidence. Required CI must pass, conversations must be resolved, the branch must be up to date, and public API scope must follow the accepted discussion/issue process in CONTRIBUTING.md. Applicable repository review must be satisfied; BaezFJ's own PRs require CI but not independent approval under the current single-maintainer policy. No migration is required by this metadata feature.

Local results are recorded below. Required external CI, accepted API scope process and applicable repository review remain pending. No commit, push, pull request, merge or release occurred.


## Execution evidence on 2026-10-05

The user authorized implementing the confirmed plan on `feature/2026-10-05-mcp-catalogue-search`. The first live regression failed before the handler changed because a search request returned the complete listing without match labels. The completed suite passes with all eight tool registrations.

| Check | Result |
| --- | --- |
| `npm ci --prefix mcp/expressivecss` on the host | Passed; existing lockfile and tracked dependencies unchanged. |
| `npm test --prefix mcp/expressivecss` on the host | Passed V1 through V4 and all existing live regressions. |
| `npm run test:docker -- npm run verify` | Passed; 1,445 tests passed, zero failed, three optional evaluation-browser tests skipped. Build, typecheck, generated data, docs build and docs verification passed. |
| `npm run test:packages:docker` | Passed MCP installation, smoke tests and `npm run verify:packages`. Both isolated tarballs passed; the installed MCP package passed the expanded suite outside the checkout. |
| V6 documentation and final diff review | Passed input/output examples, source ownership, no added dependency/inventory, preserved aliases and evidence limits. |

V1 through V4 cover all 41 shipped slugs, titles and catalogue aliases, named description searches, invalid inputs, default/full listing compatibility, unknown targets, blocked versions/provenance, read-only file and script checks, text/structured agreement and canonical syntax lookup. Disposable package fixtures add 55 search entries for exact-name/alias precedence, ties, strongest labels, one- and two-character tokens across fields, default/minimum/maximum limits, repeated ordering, complete/partial coverage and narrower-query recovery. Full guide bodies and unused decision descriptions remain excluded. Clients and temporary fixtures use the existing `finally` cleanup.

Framework browser tests ran in Chromium, Firefox and WebKit. Each engine passed keyboard and arabic-touch-reflow critical-flow profiles; all six exported `result.json` records report passed. The three skips concern the optional evaluation SDK/browser setup, not the framework engine checks. No separate visual comparison ran. Emulated touch/reflow checks do not establish real-device, native zoom or assistive-technology results.

Logs are `/tmp/expressivecss-mcp-phase5-install.log`, `/tmp/expressivecss-mcp-phase5-red.log`, `/tmp/expressivecss-mcp-phase5-green.log`, `/tmp/expressivecss-mcp-phase5-verification.log` and `/tmp/expressivecss-mcp-phase5-packages.log`. Contributor reports are in `.cache/container-tests/expressivecss-a203c023-8af6-450d-9340-ed1993076e32/`; package reports are in `.cache/container-tests/expressivecss-95b47cde-32d5-4202-8096-6e3a01b5c3d6/`. These logs and reports are local artifacts outside the committed evidence documents.

The final changes remain uncommitted. Required CI, resolved conversations, an up-to-date submission branch, accepted API scope and applicable repository review remain conditions before merge. This local record does not establish those external outcomes or authorize publication.
