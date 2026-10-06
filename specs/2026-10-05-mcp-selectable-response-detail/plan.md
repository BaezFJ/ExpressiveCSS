# Phase 6 implementation plan

Feature: MCP selectable response detail
Date: 2026-10-05
Roadmap phase: Phase 6, selectable response detail
Branch: `feature/2026-10-05-mcp-selectable-response-detail`
Base: local `origin/master` at `cecd86d33cf0c9f078fe56e96dc213d0f5b7d251`
Status: Groups 1 and 2 complete; Group 3 locally verified, required CI and review pending

Deliver [R1 through R6](requirements.md#requirements) for [roadmap Phase 6](../roadmap.md#phase-6-selectable-response-detail). Follow the [mission](../mission.md#core-workflow) and [technical constraints](../tech-stack.md#compatibility-and-trust-boundaries). Acceptance checks are in [validation](validation.md#automated-checks).

## Group 1: live regression checks

Prerequisite: the stated base includes complete rules, API selection, catalogue listing/search and the disposable stdio fixtures in `mcp/expressivecss/smoke.mjs`.

Outcome: live checks define detail selection and its compatibility contract. Covers R1 through R5 through V1 through V5.

- [x] Extend the independent catalogue-wide expectations across all 41 guides for both modes. Check full rule text/IDs, identity, detailed legacy values, compact property absence and optional-section combinations.
- [x] Exercise explicit capability overrides, foundation-only requests, blocked target fixtures, unknown/mixed names, empty requests and disabled syntax tools. Assert compatible evidence and requested reference data remain truthful.
- [x] Inspect advertised input/output schemas and validate intentional omission records. Cover bad selectors, deterministic field ordering, recovery requests and JSON-text/structured agreement. Update existing API-selection equality assertions only for the specified additive metadata.
- [x] Preserve all existing tool, catalogue-search, provenance and denied-command regressions. Clean up clients, transports and fixtures in `finally` blocks.

Completion check: `npm test --prefix mcp/expressivecss` demonstrates a feature-specific failure at the base. Record the actual failing assertion and separate unrelated failures. V1 through V5 remain pending until implementation passes.

## Group 2: shared retrieval, schemas and documentation

Prerequisite: Group 1 defines the missing behavior through live checks.

Outcome: the existing syntax tool returns selectable detail with explicit omission metadata. Delivers R1 through R6 through V1 through V5 and V7.

- [x] Extend syntax inputs with `detail` and `includeCapabilities`. Resolve defaults once and reuse existing validation and request limits.
- [x] Update `summarizeGuide()` and `componentSyntaxExpertHandler()` to project the selected fields, preserve complete rules/API records and explicit foundations, and report intentional omissions. Keep version/provenance safety checks and shared evidence intact.
- [x] Add a syntax-specific output schema for effective selectors and omission records. Use it in the syntax registration while preserving the disabled-tool envelope and all unrelated registrations.
- [x] Update the MCP README, tool description and unreleased changelog with selector examples, defaults, override precedence, recovery and evidence limits. Regenerate derived files only if their source inputs changed.

Completion check: `npm test --prefix mcp/expressivecss` passes V1 through V5 with old requests still returning existing fields and values. V7 documentation review confirms that compact output retains all rules and makes no byte-budget claim.

## Group 3: contributor and package verification

Prerequisite: Group 2 passes focused checks and documentation review.

Outcome: recorded results establish checkout and installed-package behavior. Covers R1 through R6 through V6 and V7.

- [x] Run the established contributor, MCP and isolated-package commands in V6. Record real passes, failures and skips.
- [x] Confirm `scripts/verify-packages.mjs` executes the expanded smoke suite against an installed tarball outside the checkout, with all guidance supplied by bundled files.
- [x] Review the final diff and examples against R1 through R6. Confirm no extra dependency, inventory, catalogue behavior change, generated-data hand edit or framework behavior change.
- [ ] Satisfy required CI, resolved conversations, an up-to-date branch, accepted API scope and applicable repository review before merge.

Completion check: V1 through V7 have passing execution records and the external merge conditions are satisfied. Local checks alone do not establish merge readiness.

## Execution boundary

The user authorized implementation on 2026-10-05. Groups 1 and 2 are complete. Group 3 contributor, MCP and isolated-package checks passed. See [execution evidence](validation.md#execution-evidence-on-2026-10-05). Required CI and repository review remain pending. Constitution and roadmap completion state remain unchanged. Commit, push, pull request, merge and release are separate actions.
