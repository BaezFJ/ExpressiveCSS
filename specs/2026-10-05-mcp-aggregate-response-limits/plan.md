# Phase 7 implementation plan

Feature: MCP aggregate response limits and recovery
Date: 2026-10-05
Roadmap phase: Phase 7, aggregate response limits and recovery
Branch: `feature/2026-10-05-mcp-aggregate-response-limits`
Base: local `origin/master` at `57171f738c5967841af48bd73f6fed6dcf74c462`
Status: Groups 1 and 2 complete; Group 3 locally verified, required CI and review pending

Deliver [R1 through R8](requirements.md#requirements) for [roadmap Phase 7](../roadmap.md#phase-7-aggregate-response-limits-and-recovery). Follow the [mission](../mission.md#core-workflow) and [technical constraints](../tech-stack.md#compatibility-and-trust-boundaries). Checks are in [validation](validation.md#automated-checks).

## Group 1: live regressions

Prerequisite: the confirmed base includes Phases 1 through 6 and the stdio/disposable-fixture patterns in `mcp/expressivecss/smoke.mjs`.

Outcome: live tests define aggregate byte limits and truthful recovery. Covers R1 through R7 through V1 through V5.

- [x] Add an independent final-result UTF-8 measurement assertion. Exercise the default budget, exact-fit and one-byte-over boundaries, Unicode, JSON escaping, text/structured duplication and a 12-component request with requested API sections and capabilities.
- [x] Add server configurations for small, impossible and invalid budgets. Use disposable long-code, whole-rule and giant-section fixtures. Test deterministic reduction, omission identity/counts, schema rejection and execution of advertised recovery requests.
- [x] Cover setup, creative, both page aliases, syntax and catalogue, including foundations, search/listing, missing/repeated names, blocked provenance/version, no-target catalogue, disabled tools and oversized essential evidence. Preserve QA and command-denial checks.
- [x] Close every client, transport, temporary fixture and timer in `finally` blocks. Keep assertions meaningful against independent bundled or fixture content rather than reproducing reduction logic.

Completion check: `npm test --prefix mcp/expressivecss` fails at a Phase 7 assertion on the base. Record the actual failure and separate any unrelated failure. V1 through V5 remain pending until implementation passes.

## Group 2: shared budget and recovery logic with documentation

Prerequisite: Group 1 establishes the missing behavior and expected result schemas.

Outcome: all scoped guidance tools respect the operator budget and return accounted whole material or explicit failure. Delivers R1 through R8 through V1 through V5 and V7.

- [x] Validate `EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES` in `mcp/expressivecss/server.js`. Extend `toToolResult()` or its existing call path for scoped final-result measurement, schema-valid omission/recovery records and bounded error/protocol failure behavior. Keep QA callers on their existing path.
- [x] Update `parseGuide()`, `summarizeGuide()` and `componentSyntaxExpertHandler()` for whole syntax code, explicit retained prose limits and deterministic optional-field, section and component/foundation reductions. Preserve rules, explicit absent sections, selectors, lookup and shared evidence.
- [x] Apply whole-unit handling to `componentCatalogHandler()`, `creativeDirectorHandler()`, `pageArchitectHandler()` and `setupExpertHandler()`. Preserve catalogue/search counts and ranking, alias behavior and whole architecture. Add typed output schemas to the affected registrations, including partial and error envelopes.
- [x] Update `mcp/expressivecss/README.md`, relevant tool descriptions and `mcp/expressivecss/CHANGELOG.md` with the exact measurement contract, defaults, affected tools, configuration failures, whole-unit policy, legacy setting, recovery and impossible-budget behavior. Regenerate derived data only if owner inputs changed.

Completion check: V1 through V5 pass through `npm test --prefix mcp/expressivecss`. V7 confirms documentation/examples agree with live behavior. Every returned scoped tool result fits the configured budget; an impossible error fails explicitly through the protocol.

## Group 3: contributor and package verification

Prerequisite: Group 2 passes focused checks and documentation review.

Outcome: recorded results establish checkout and installed-package behavior and identify any external merge blocker. Covers R1 through R8 through V6 and V7.

- [x] Run the contributor, MCP and isolated-package commands in V6. Record actual results, unavailable setup and skipped checks accurately.
- [x] Confirm `scripts/verify-packages.mjs` exercises the expanded smoke suite against the installed MCP tarball outside the checkout. Budget handling and guidance must work without repository source/build scripts at runtime.
- [x] Review the final diff and examples against R1 through R8. Confirm only scoped MCP behavior changed, with no new dependency, second inventory, generated-data hand edit, QA policy change or framework behavior change.
- [ ] Before merge, satisfy required CI, resolved conversations, an up-to-date branch, accepted API scope and applicable repository review.

Completion check: V1 through V7 have passing recorded evidence and external merge conditions are satisfied. Local verification alone does not establish merge readiness.

## Execution boundary

The user authorized implementation on 2026-10-05. Groups 1 and 2 are complete. Group 3 contributor, MCP and isolated-package checks passed. See [execution evidence](validation.md#execution-evidence-on-2026-10-05). Required CI, accepted API scope process and applicable repository review remain pending. Constitution and roadmap completion state remain unchanged. Commit, push, pull request, merge and release are separate actions.
