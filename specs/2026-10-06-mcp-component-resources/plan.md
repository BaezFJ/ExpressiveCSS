# Phase 9 implementation plan

Date: 2026-10-06
Roadmap phase: Phase 9, versioned component resources
Branch: `feature/2026-10-06-mcp-component-resources`
Base: local `origin/master` at `8672d9fc1764f1f6a60ec74d37518708a5565d77`
Status: implemented and locally verified; required CI and review pending

Deliver [R1 through R10](requirements.md#requirements) for [roadmap Phase 9](../roadmap.md#phase-9-versioned-component-resources). Follow the [mission](../mission.md#core-workflow) and [technical constraints](../tech-stack.md#compatibility-and-trust-boundaries). The user chose this three-group order in the interview.

## Group 1: live component resource checks

Prerequisite: the base contains Phase 8 and the disposable stdio fixtures in `mcp/expressivecss/smoke.mjs`. MCP dependencies are installed from the lockfile with `npm ci --prefix mcp/expressivecss`.

Outcome: live protocol assertions define template discovery, whole-guide and section contents, identity failures and budget recovery. Covers R1 through R9 through V1 through V4 in [validation.md](validation.md#automated-checks). Estimated time: 45 to 60 minutes, excluding dependency installation.

- [x] Extend the smoke suite with `resources/templates/list` and `resources/list` assertions for both templates and all whole-guide URIs. Build expected URIs from `contract.json` and `component-guides.json`, not from server output.
- [x] Add content checks for every bundled guide and section. Compare with independent guide parsing, with `component_syntax_expert` (rules, options, methods, syntax) and with the catalogue resource's version and hash. Include Cards (16 rules) and Datepicker Options by name.
- [x] Add identity rejection reads from V2, consumer fixtures with CLI project-root defaults, and skip-flag launches.
- [x] Add final-wire byte measurements and small-budget recovery from V3: exact fit, one byte under, a whole-guide failure whose listed section URIs succeed at the same budget, an unrecoverable section, and budget 1.
- [x] Keep existing tool, catalogue resource, provenance and denied-command checks. Close clients, transports and fixtures in `finally` blocks. Record the first feature-specific failure on the unchanged server.

Completion check: `npm test --prefix mcp/expressivecss` fails on the base because component templates are missing. All acceptance results stay pending.

## Group 2: component resource templates and budget recovery

Prerequisite: Group 1 defines the live contract.

Outcome: clients can discover and read whole guides and single sections of the current bundle within the operator budget, with section recovery. Delivers R1 through R9 through V1 through V4. Estimated time: 45 to 75 minutes.

- [x] In `startServer()` in `server.js`, build a URI-to-reader map from `loadGuideCatalog(undefined)`: 41 whole-guide URIs and 205 section URIs. Register both `ResourceTemplate`s, with a list callback for whole guides only. Build resource JSON from the parsed guide fields and the same no-target evidence as the catalogue resource.
- [x] Route the custom `ReadResourceRequestSchema` handler through that map plus the existing catalogue URI. Any other URI returns `-32002`.
- [x] Generalize the send guard: record the requested URI per `resources/read` id. Have `resourceBudgetError()` name that URI and, for whole-guide URIs, compute fitting section recoveries and `unrecoverableSections`. Keep the catalogue error message and data unchanged.
- [x] Confirm SDK 1.31.0 template-list and list-callback behavior against the installed package.

Completion check: the live suite passes V1 through V4. Every listed recovery URI succeeds at the budget that produced it.

## Group 3: documentation and verification

Prerequisite: Group 2 passes the focused checks.

Outcome: documentation matches behavior, and recorded checks establish behavior inside and outside the checkout. Covers R9 and R10 through V5. Estimated time: 30 minutes plus 10 to 20 minutes of cached container runs. The Phase 7 contributor and package runs took about 334 and 107 seconds; this checkout may differ.

- [x] Update `mcp/expressivecss/README.md` and the unreleased section of `mcp/expressivecss/CHANGELOG.md` with live examples of template listing, whole-guide and section reads, `-32001` recovery and `-32002` cases.
- [x] Run the contributor, MCP and isolated-package commands in V5. Record actual passes, failures and skips.
- [x] Confirm `scripts/verify-packages.mjs` runs the expanded smoke suite from the installed tarball.
- [x] Review the diff against R1 through R10 and data ownership. Confirm no dependency, framework behavior, constitution, roadmap state, version or release change.
- [ ] Before merge, satisfy required CI, resolved conversations, an up-to-date branch and applicable review.

Completion check: V1 through V5 have execution evidence and the merge conditions in [validation.md](validation.md#merge-conditions) hold.

## Execution boundary

Javier authorized implementation on 2026-10-06. Groups 1 and 2 are complete, and Group 3's local documentation, contributor and installed-package checks passed. See [execution evidence](validation.md#execution-evidence-on-2026-10-06). Required CI and review remain pending. The roadmap completion state is unchanged. Commits, pushes, pull requests, merges and publication each need separate instructions.
