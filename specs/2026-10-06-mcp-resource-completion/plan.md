# Phase 10 implementation plan

Date: 2026-10-06
Roadmap phase: Phase 10, resource argument completion
Branch: `feature/2026-10-06-mcp-resource-completion`
Base: local `origin/master` at `e849bde10c71832ac2d617c180dfb6e30e583307`
Status: implemented and locally verified; required CI and review pending

Deliver [R1 through R7](requirements.md#requirements) for [roadmap Phase 10](../roadmap.md#phase-10-resource-argument-completion). Follow the [mission](../mission.md#core-workflow) and [technical constraints](../tech-stack.md#compatibility-and-trust-boundaries). The user chose this three-group order in the interview.

## Group 1: live completion checks

Prerequisite: the base contains Phase 9 and the disposable stdio fixtures in `mcp/expressivecss/smoke.mjs`. MCP dependencies are installed from the lockfile with `npm ci --prefix mcp/expressivecss`.

Outcome: live protocol assertions define slug and section completion, bounds, edge cases and safety. Covers R1 through R6 through V1 through V3 in [validation.md](validation.md#automated-checks). Estimated time: 30 to 45 minutes, excluding dependency installation.

- [x] Replace the `completions === undefined` assertion at `smoke.mjs:586` with an assertion that the capability is advertised.
- [x] Add `complete()` calls for `slug` on both template strings and for `section` on the section template. Build expected values from `component-guides.json` and the five section names in the test, not from server output.
- [x] Add the V2 edge cases: no-match prefix, unknown argument names, another version or hash, a typo in the template string, the fixed catalogue URI and a `ref/prompt` reference. Use low-level requests where SDK client validation would hide the server error.
- [x] Add V3 checks: read every completed slug and section URI, complete at budget 1, complete from consumer fixtures and with skip flags, and confirm aliases and case variants still return `-32002` on read.
- [x] Close clients, transports and fixtures in `finally` blocks. Record the first feature-specific failure on the unchanged server.

Completion check: `npm test --prefix mcp/expressivecss` fails on the base because the completions capability is missing. All acceptance results stay pending.

## Group 2: completion callbacks

Prerequisite: Group 1 defines the live contract.

Outcome: clients can complete canonical slugs on both component templates and section names on the section template. Delivers R1 through R6 through V1 through V3. Estimated time: 15 to 30 minutes.

- [x] In `startServer()` in `server.js`, add `complete: { slug }` to the `component_guide` template and `complete: { slug, section }` to `component_guide_section`. Match case-insensitive prefixes over `resources.guides` slugs and `COMPONENT_SECTIONS`.
- [x] Leave the custom read handler, the send guard, `bundledResources()` and listing unchanged.
- [x] Confirm the SDK 1.31.0 capability, bound and edge-case behavior from R3 and R4 against the installed package.

Completion check: the live suite passes V1 through V3.

## Group 3: documentation and verification

Prerequisite: Group 2 passes the focused checks.

Outcome: documentation matches behavior, and recorded checks establish behavior inside and outside the checkout. Covers R6 and R7 through V4. Estimated time: 20 minutes plus 10 to 20 minutes of cached container runs. The Phase 9 contributor and package runs took about 335 and 130 seconds; this checkout may differ.

- [x] Update `mcp/expressivecss/README.md` and the unreleased section of `mcp/expressivecss/CHANGELOG.md` with live `completion/complete` examples for slug and section, the R4 edge cases and the note that tool arguments are not completed.
- [x] Run the contributor, MCP and isolated-package commands in V4. Record actual passes, failures and skips.
- [x] Confirm `scripts/verify-packages.mjs` runs the expanded smoke suite from the installed tarball.
- [x] Review the diff against R1 through R7 and data ownership. Confirm no dependency, framework behavior, constitution, roadmap state, version or release change.
- [ ] Before merge, satisfy required CI, resolved conversations, an up-to-date branch and applicable review.

Completion check: V1 through V4 have execution evidence and the merge conditions in [validation.md](validation.md#merge-conditions) hold.

## Execution boundary

Javier authorized implementation on 2026-10-06. Groups 1 and 2 are complete, and Group 3's local documentation, contributor and installed-package checks passed. See [execution evidence](validation.md#execution-evidence-on-2026-10-06). Required CI and review remain pending. The roadmap completion state is unchanged. Commits, pushes, pull requests, merges and publication each need separate instructions.
