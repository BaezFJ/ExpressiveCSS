# Phase 8 validation

Date: 2026-10-06
Roadmap phase: Phase 8, versioned catalogue resource
Branch: `feature/2026-10-06-mcp-versioned-catalogue-resource`
Base: local `origin/master` at `3eee32b1a22b2a31f09066b253cc20c5539abfae`
Status: V1 through V5 locally verified; required CI and review pending

Validate [requirements](requirements.md#requirements) through the ordered [plan](plan.md). Follow the [mission](../mission.md#success-criteria), [technical constraints](../tech-stack.md#testing-and-release-checks) and [roadmap Phase 8](../roadmap.md#phase-8-versioned-catalogue-resource).

The user delegated specification review and validation decisions through `feature-spec-next`. The agent owns every executable check below, including dependency setup, fixtures, commands, report inspection and evidence recording. No acceptance result is established by writing this document.

## Coverage map

| Requirement | Planned work | Observable validation |
| --- | --- | --- |
| R1 discovery and registration | Groups 1 and 2 | V1, V5 |
| R2 complete compact contents | Groups 1 and 2 | V1, V3, V5 |
| R3 truthful snapshot evidence | Groups 1 and 2 | V2, V4, V5 |
| R4 URI validation and unavailable identities | Groups 1 and 2 | V2, V5 |
| R5 aggregate read budget and recovery | Groups 1 and 2 | V3, V4, V5 |
| R6 existing behavior and packaged execution | Groups 1 through 3 | V4, V5 |
| R7 documentation and merge checks | Groups 2 and 3 | V5 |

## Automated checks

### V1: live discovery and complete catalogue agreement

Owner: agent. Setup: extend `mcp/expressivecss/smoke.mjs` using the existing `Client` and `StdioClientTransport`. Read independent expectations from packaged guides, decisions and contract data. Use an adequate explicit budget for a complete tool result; also exercise a resource read at the default budget.

Action: run `npm test --prefix mcp/expressivecss`. Inspect `client.getServerCapabilities()`, `client.listResources()` and `client.readResource({ uri })`. Assert exactly one advertised catalogue resource and no new component templates. Parse the resource text, validate required JSON fields and compare every entry/value/order with independent expectations and the complete unfiltered catalogue tool result. Read twice to check stable snapshot contents and identity.

Expected: resource support is advertised without unsupported subscription claims. Listing gives name `component_catalog`, version/hash URI and JSON MIME type. Reading gives one matching URI/MIME text item, complete compact entries and accurate counts. Version/hash agree with bundled contract data. JSON has the required evidence and complete budget record; no tool-only fields or full guide dump appears. The current 41-guide bundle fits the default read budget. Result: passed; see the execution evidence below.

### V2: identity failures and consumer independence

Owner: agent. Setup: reuse matching, mismatched, stale, divergent and missing-contract consumer fixtures. Launch resource clients in their directories and with the existing CLI project-root default. Use a temporary consumer with a script that would create a sentinel file if executed.

Action: read the listed URI in every context. Request a different version, changed hash, extra path, query/fragment selector, traversal-like URI, file/HTTP URI and malformed request parameters. Run through live SDK requests; use low-level client requests where local parameter validation would hide the server error.

Expected: the valid resource always returns the shipped snapshot with consumer compatibility unknown and consumer provenance/browser behavior unchecked. Unknown identities/selectors return `-32002`, invalid request parameters fail explicitly, and no request selects arbitrary files or remote docs. Consumer files and sentinel remain unchanged. Existing target-aware tool requests still block mismatched/stale fixtures appropriately. Result: passed; see the execution evidence below.

### V3: final result bytes, boundaries and operator recovery

Owner: agent. Setup: launch with the default budget and disposable copies of bundled data containing multibyte and JSON-escaped compact metadata. Preserve valid snapshot identity within each fixture. Resource JSON must remain deterministic for a fixed bundle and budget. Measure the actual wire `result` independently, including URI, text escaping and any SDK-added fields; do not measure only parsed resource text.

Action: request the resource with valid explicit budgets. Establish an exact-fit result and a budget one byte smaller, accounting for the serialized `maxBytes` field when deriving the boundary. Try a constrained budget and budget 1. Inspect raw JSON-RPC errors where necessary. For a budget failure, verify error data and restart with the advertised sufficient byte budget, then read the same URI. Run the expanded suite through `npm test --prefix mcp/expressivecss`.

Expected: all returned successful read results satisfy `Buffer.byteLength(JSON.stringify(result), 'utf8') <= budget`. Exact fit succeeds; insufficient budgets give `-32001` with no successful contents. Error data contains the URI, effective budget, required bytes and `EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES` recovery. The advertised increase must account for the budget field's own size and actually allow complete delivery. Multibyte and escaped metadata remain whole. Budget 1 returns a protocol error; the error envelope is outside the content budget. Resource listing stays available for discovery even when reading cannot fit. Existing invalid operator configuration still fails at startup. Result: passed; see the execution evidence below.

### V4: tool, safety and transport regressions

Owner: agent. Setup: retain the existing eight-tool assertions, selector/API and catalogue-search checks, byte-limit boundary fixtures, disabled-tool launches, provenance fixtures, static semantics and denied-command checks. Include mixed tool/resource requests in one client session.

Action: run the full live smoke suite. Exercise resource reads with guidance skip flags, alongside small-budget tool calls and failed resource reads. Check that subsequent valid requests still work, scoped request IDs do not interfere, and transport shutdown clears state. Confirm no-target calls remain independent of the CLI default while explicit target tools keep their original behavior.

Expected: all eight tool names and original requests/aliases work as before. Tool text/structured agreement and budget recovery remain effective. Resource reads ignore tool skip flags without enabling skipped tools. No read executes project scripts, initializes components, changes command permissions or bypasses target checks. Clients, transports, fixtures and timers close in `finally` blocks. Result: passed; see the execution evidence below.

### V5: contributor, package and documentation acceptance

Owner: agent. Setup: follow [CONTRIBUTING.md](../../CONTRIBUTING.md#verify). At specification time, this checkout had neither root nor MCP `node_modules`. Implementation installed MCP lockfile dependencies for focused checks and used the established containers for contributor and package verification.

Action: use the established container sequence when Docker is available:

```sh
npm run test:docker -- npm run verify
npm run test:packages:docker
```

The package container installs MCP dependencies, runs `npm test --prefix mcp/expressivecss` and runs `npm run verify:packages`. Its installed MCP tarball executes the expanded smoke suite outside the checkout. The host alternative requires Node 24, lockfile dependencies and the browser setup documented by CONTRIBUTING:

```sh
npm ci
npm ci --prefix mcp/expressivecss
npm run verify
npm test --prefix mcp/expressivecss
npm run verify:packages
```

Review README examples and the unreleased changelog against the actual list/read results, budget errors and scope. Verify local links, `git diff --check`, changed-file scope and generated-data checks. If generator inputs change, run their owning generation commands before the final checks. The inspected package verifier already runs installed MCP smoke checks; confirm that it exercises V1 through V4 in the tarball.

Expected: contributor checks, MCP behavior and both isolated packages pass. Documentation covers fixed identity, current bundle only, JSON/evidence fields, complete-or-error reads, recovery and discovery-list budget exclusions. No new dependency, manual generated-data edit, framework behavior change or release step appears. Record actual test counts, skipped checks and report locations. Browser checks only pass if executed; no feature-specific visual comparison is needed for this resource-only change. If implementation adds a visual change, preserve the separate visual checks and owner review required by CONTRIBUTING. Result: passed; see the execution evidence below.

## Agent-run review and merge conditions

The agent reviews protocol examples, trust boundaries, scope and evidence claims. A separate human UI check is unnecessary for this phase's stdio-only resource behavior. Available browser checks remain part of repository contributor verification. Static resource results establish no browser, native-device or assistive-technology approval.

Before merge, V1 through V5 must pass, affected regression checks must pass, required CI and conversations must be satisfied, and the branch must be current. Preserve the accepted public API scope process and applicable repository review in CONTRIBUTING and GOVERNANCE. Agent-owned specification verification does not replace external review where the repository requires it. Publication follows RELEASING and requires separate authorization.

No unavailable credential, hardware or human judgment blocks specification completion. MCP dependency installation and Docker verification succeeded during implementation. Chromium, Firefox and WebKit ran framework checks. External CI/review remains pending until submitted work has that evidence.

## Specification verification on 2026-10-06

Owner: agent. Result: passed. This section records the specification-only check before implementation authorization. No unresolved specification blocker remained.

Current source, Git history and the Phase 6/7 local validation records establish Phase 8 eligibility despite the stale roadmap status paragraph. Reviewed scope against the mission and technical constraints, including generated-data ownership, consumer evidence limits, read budgets and the separation from Phases 9/10. The chosen local base equals HEAD, `master` and `origin/master`; the branch is the specified feature branch.

Read-only checks verified all three documents, consistent date/phase/branch/base metadata, 22 relative links and anchors, and coverage for all seven requirements across planned groups and five validation checks. All 12 implementation tasks remain unchecked and all five implementation acceptance results remain pending. Whitespace and typography checks passed. The initially clean repository now has only the three new untracked specification files; tracked implementation, constitution and roadmap files are unchanged. `git diff --check` passed, with separate whitespace inspection for the untracked specification files.

At specification verification time, implementation tests, builds, browser/visual checks, package execution and external CI/review had not run for Phase 8. The execution evidence below supersedes that pending local acceptance status after the user authorized implementation. No commit, push, pull request, merge or deployment was authorized by the specification workflow.

## Execution evidence on 2026-10-06

The user authorized implementing the plan on 2026-10-06. Implementation and local verification are complete on the specified feature branch. Changes remain uncommitted. Required CI and applicable repository review remain pending. Mission, technical constraints and roadmap completion state are unchanged; no push, pull request, merge or publication ran.

| Check | Command or inspection | Result |
| --- | --- | --- |
| Initial feature regression | `npm test --prefix mcp/expressivecss` against the unchanged server after adding the capability assertion | Failed at `server must advertise catalogue resources`, confirming missing resource support. |
| V1 through V4 live protocol | `npm test --prefix mcp/expressivecss` | Passed all eight tools and the expanded resource suite. Resource discovery/read/template assertions, independent 41-entry catalogue expectations, exact snapshot identity, repeated-read stability, target/default-root independence, skip flags, URI failures, actual wire byte measurement, exact fit, one-byte-under, budget 1, Unicode/escaping and working operator-increase recovery passed. Existing tool budgets, provenance, disabled tools, static QA and denied commands passed. |
| V5 contributor checks | `npm run test:docker -- npm run verify` | Passed build, typecheck, 1,445 tests with zero failures and three optional evaluation checks skipped, generated-data checks, docs build and site verification. The container command took 335.33 seconds. |
| V5 installed packages | `npm run test:packages:docker` | Passed MCP installation/smoke checks and isolated framework 0.12.0 and MCP 0.2.2 tarballs. The installed MCP tarball ran the expanded resource suite outside the checkout. The container command took 127.90 seconds. |
| V5 documentation and scope | README, unreleased changelog, specification updates, source diff and `git diff --check` | Passed. Resource examples, identity/evidence limits, final-result byte accounting, recovery and discovery-list exclusions agree with the implementation. Only four MCP source/test/documentation files and the three feature documents changed. No dependency, generated data, framework behavior or package version changed. |

Installed SDK inspection established that its default resource read handler normalizes URIs and uses `-32602` for unknown resources. The focused handler preserves the specified exact identity and `-32002` contract. The first implementation test run exposed a test assumption that malformed request parameters would use `-32602`; SDK 1.31.0 actually wraps request-schema failures as `-32603`. The final assertion and documentation record that observed SDK behavior. Invalid parameters still fail through SDK validation.

All six exported keyboard and arabic-touch-reflow `result.json` reports have `status: "passed"` in Chromium, Firefox and WebKit. The three skips are optional evaluation-SDK/browser checks, not absent framework browser engines. Touch, text enlargement and responsive conditions are emulated; native zoom, real devices and assistive technology remain untested. No separate visual comparison ran for this resource-only change.

Contributor reports are in `.cache/container-tests/expressivecss-b22ad01a-1acc-4a68-aeda-8afb7bf0ef9b/`. The package runner exported `.cache/container-tests/expressivecss-c952562b-3aaf-4027-8547-466f7d388718/`; that package command creates no browser captures. Logs are `/tmp/expressivecss-mcp-phase8-install.log`, `/tmp/expressivecss-mcp-phase8-red.log`, `/tmp/expressivecss-mcp-phase8-green.log`, `/tmp/expressivecss-mcp-phase8-verification.log` and `/tmp/expressivecss-mcp-phase8-packages.log`.

`npm ci` reported one high and one critical advisory in the existing dependency tree. The lockfile and dependencies are unchanged; this phase introduced no dependency. No acceptance command failed on those advisories.
