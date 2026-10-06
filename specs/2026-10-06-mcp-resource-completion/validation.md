# Phase 10 validation

Date: 2026-10-06
Roadmap phase: Phase 10, resource argument completion
Branch: `feature/2026-10-06-mcp-resource-completion`
Base: local `origin/master` at `e849bde10c71832ac2d617c180dfb6e30e583307`
Status: V1 through V4 locally verified; required CI and review pending

Validate [requirements](requirements.md#requirements) through the ordered [plan](plan.md). Follow the [mission](../mission.md#success-criteria), [technical constraints](../tech-stack.md#testing-and-release-checks) and [roadmap Phase 10](../roadmap.md#phase-10-resource-argument-completion). The user selected all four check groups in the interview: live completion (V1), edge behavior (V2), safety and regressions (V3), and contributor and packages (V4).

## Coverage map

| Requirement | Planned work | Observable validation |
| --- | --- | --- |
| R1 slug completion | Groups 1 and 2 | V1 |
| R2 section completion | Groups 1 and 2 | V1 |
| R3 result bound and disclosure | Groups 1 and 2 | V1 |
| R4 capability and edge behavior | Groups 1 and 2 | V1, V2 |
| R5 bundled-only, budget-free completion | Groups 1 and 2 | V3 |
| R6 existing behavior and packaged execution | Groups 1 through 3 | V3, V4 |
| R7 documentation and truthful records | Group 3 | V4 |

## Automated checks

All automated checks run in `mcp/expressivecss/smoke.mjs` through `npm test --prefix mcp/expressivecss`, using the existing `Client` and `StdioClientTransport`. Build expectations from the packaged `component-guides.json` and `contract.json` and the five section names written in the test, not from server output. Template strings are `expressivecss://components/<version>/<hash>/{slug}` and `.../{slug}/{section}` with the bundled version and hash.

### V1: live completion

Setup: launch with the default budget.

Action: check `getServerCapabilities()`. Call `complete()` with `ref: { type: "ref/resource", uri: <template> }` for:

- `slug` on both templates with `""`, `"ca"`, `"CA"`, `"s"`, `"date"` and every full slug
- `section` on the section template with `""`, `"o"`, `"M"` and every full section name, with and without `context.arguments.slug`

Expected:

- The server advertises `completions`.
- `""` returns all 41 slugs in `resources/list` order, or all five sections in the order `contract`, `syntax`, `rules`, `options`, `methods`.
- `"ca"` and `"CA"` both return `cards` and `carousel`. `"s"` returns the eight slugs starting with `s`. `"date"` returns `date-picker`. Each full slug returns itself.
- `"o"` returns `options`, and `"M"` returns `methods`. Context arguments do not change section results.
- Both templates return identical slug results.
- Every result has `total` equal to the number of values and `hasMore: false`.

Result: passed; see the [execution evidence](#execution-evidence-on-2026-10-06).

### V2: edge behavior

Setup: launch with the default budget. Use low-level requests where SDK client validation would hide the server error.

Action: send `completion/complete` for:

- a prefix with no matches, such as `"zz"`, for `slug` and `section`
- the alias `datepicker` for `slug`
- argument names `section` on the whole-guide template and `version`, `hash` and `unknown` on both templates
- template strings with another version, a wrong hash and a typo
- the fixed catalogue URI
- a `ref/prompt` reference

Expected: no-match prefixes and `datepicker` return `values: []`, `total: 0`, `hasMore: false`. Unknown argument names and the fixed catalogue URI return empty results. Other template strings and the prompt reference return `-32602`. Later valid requests on the same connection succeed.

Result: passed; see the [execution evidence](#execution-evidence-on-2026-10-06).

### V3: safety and regressions

Setup: keep the existing eight-tool assertions, Phase 8 and Phase 9 resource checks, tool byte-limit fixtures, disabled-tool launches, provenance fixtures, static semantics and denied-command checks. Reuse the consumer fixtures, including a consumer whose script would create a sentinel file if executed.

Action:

1. Read every slug and section URI built from completion results.
2. Launch with `EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES=1` and request slug completion with `""`.
3. Launch from consumer fixture directories, with the CLI project-root default and with every skip flag set, then request slug and section completion.
4. Read the alias `datepicker` and the case variant `Cards` after completion requests.
5. Run the full suite.

Expected: every completed URI reads successfully at the default budget. Completion returns all 41 slugs at budget 1. Results are identical in every launch context, consumer files and the sentinel stay unchanged, and skip flags do not enable skipped tools. Alias and case-variant reads still return `-32002`. All existing tool and resource assertions pass, with only the completions-capability assertion updated. Teardown happens in `finally` blocks.

Result: passed; see the [execution evidence](#execution-evidence-on-2026-10-06).

### V4: contributor, package and documentation acceptance

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

These commands come from the Phase 9 record and CONTRIBUTING. This specification run did not execute them. Then review the README and unreleased changelog against actual completion results and error codes. Run `git diff --check` and check local links and changed-file scope.

Expected: contributor checks, MCP behavior and both isolated packages pass. The installed tarball runs V1 through V3 outside the checkout. Documentation covers everything R7 lists. The diff contains no new dependency, hand-edited generated data, framework change or release step. Record actual test counts, skips and report locations. A browser check passes only if it ran.

Result: passed; see the [execution evidence](#execution-evidence-on-2026-10-06).

## Manual checks

No manual check is required. The change is stdio-only and has no visual output. The agent reviews protocol examples and trust boundaries as part of V4.

## Merge conditions

- V1 through V4 pass, with execution evidence recorded in this file.
- Affected regression checks pass, including the Phase 8 and Phase 9 resource checks.
- Required repository CI passes, review conversations are resolved and the branch is current with `master`.
- Applicable review under CONTRIBUTING and GOVERNANCE is complete, including public API scope for the new completions capability.
- Publication follows RELEASING and needs separate authorization.

## Execution evidence on 2026-10-06

The base server failed the expanded smoke suite at its first completion check: the server did not advertise `completions`. Log: `/tmp/expressivecss-mcp-phase10-red.log`.

After implementation, `npm test --prefix mcp/expressivecss` passed on the host with Node 24.21.0 and lockfile dependencies (SDK 1.31.0). This covers V1 through V3. Slug completion matched the independent slug list on both templates for empty, mixed-case and full-name prefixes, and `datepicker` returned no values. Section completion returned the five names in order regardless of slug context. Every result had `total` equal to its length and `hasMore: false`. Unknown argument names and the catalogue URI returned `values: []` and `hasMore: false` without `total`. Six other template references and a prompt reference returned `-32602`. All 41 completed slugs and their 205 section URIs read successfully, and alias and case-variant reads still returned `-32002`. Completion gave identical results at budget 1, from five consumer fixtures and the trap project, and with every skip flag set; the trap project's sentinel file was never created. Log: `/tmp/expressivecss-mcp-phase10-green.log`.

`npm run test:docker -- npm run verify` passed in 334 seconds: 1,448 tests, 1,445 passed, 0 failed, 3 skipped. The skipped checks are the optional evaluation-browser tests, which report that the optional evaluation SDK or Chromium is not installed. Reports: `.cache/container-tests/expressivecss-46b6492d-3c68-4f69-8abc-c65bd88eec5d/`. Log: `/tmp/expressivecss-mcp-phase10-verification.log`.

`npm run test:packages:docker` passed in 140 seconds. It ran the MCP smoke suite in the checkout, then from the installed `@expressivecss/mcp-server@0.2.2` tarball outside the checkout, and verified both isolated packages. `scripts/verify-packages.mjs` runs the installed package's `smoke.mjs`. Reports: `.cache/container-tests/expressivecss-e78c45c7-524c-4bbc-92a9-690612615947/`. Log: `/tmp/expressivecss-mcp-phase10-packages.log`.

A live probe matched the README examples: `ca` returned `cards` and `carousel` with `total: 2`, and a template reference with version `99.0.0` returned `-32602`.

`git diff --check` passed. The diff changes only `server.js`, `smoke.mjs`, `README.md` and `CHANGELOG.md` in `mcp/expressivecss/`, plus this specification. No generator input changed, so `npm run check:generated` ran only as part of `npm run verify`. No visual comparison ran; this change has no visual output.

Pending before merge: required CI, review conversations, an up-to-date branch and applicable review. No commit, push, pull request or publication has occurred.
