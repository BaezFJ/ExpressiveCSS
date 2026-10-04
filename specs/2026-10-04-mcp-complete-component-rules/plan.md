# Phase 1 implementation plan

Feature: complete MCP component rules
Date: 2026-10-04
Branch: `fix/mcp-complete-component-rules`
Base: `origin/master` at `7d3d238b02cffdd4bb50bbfe517f44054451aef6`
Status: Groups 1 and 2 complete; Group 3 locally verified, required CI and review pending

Follow [requirements R1 through R5](requirements.md#requirements), [validation](validation.md), and [roadmap Phase 1](../roadmap.md#phase-1-complete-component-rules). Mission and technical constraints remain unchanged. The roadmap records the locally verified milestone separately from merge readiness.

## Group 1: regression checks demonstrate the omission

Prerequisites: the bundled catalogue, live stdio smoke-test client and existing matching-version fixture in `mcp/expressivecss/smoke.mjs`.

Outcome: one catalogue-wide regression detects incomplete guidance, with fallback and compatibility cases kept explicit. Delivers R1 through R5 through V1 through V4.

- [x] Extend `smoke.mjs` to obtain expected rule bullets and normative IDs from each bundled guide's Rules section independently of the production summary. Use live requests against the existing matching-version fixture and respect the request's component-count limit.
- [x] Compare complete rule strings and the ordered normative ID sequence for every guide. Include diagnostic assertions for all Cards rules and autocomplete's supporting-text linkage rule. Check guides with no normative Rules bullets against the existing generic fallback strings.
- [x] Retain and extend existing assertions as needed for text/structured agreement, tool compatibility, blocked results, skipped stages and rejection of tampered local guidance. Keep clients and fixtures inside the existing cleanup structure.

Completion check: `npm test --prefix mcp/expressivecss` fails on the reviewed implementation because a guide with more than eight rules returns an incomplete sequence. Record that failure as the expected regression result; unrelated failures remain unresolved until explained.

## Group 2: the shared summary returns complete rules

Prerequisite: Group 1's regression reproduces the defect.

Outcome: existing syntax calls deliver complete rules without changes to request or response schemas. Delivers R1 through R5, checked by V1 through V4.

- [x] Remove the fixed eight-rule cap in `summarizeGuide()` in `mcp/expressivecss/server.js`. Preserve rule contents, order, fallback behavior and other summary fields.
- [x] Confirm that `componentSyntaxExpertHandler()` still uses the shared summary and retains its existing version/provenance, capability and unknown-name behavior. Leave static semantics enforcement and command execution unchanged.
- [x] Add a focused correction note to `mcp/expressivecss/README.md` and its changelog. Regenerate derived files through existing commands only if changed inputs require it.

Completion check: the catalogue-wide regression and existing MCP smoke suite pass. Cards returns all 16 normative rules at the baseline catalogue, and autocomplete includes `field-supporting-text-linked`. No new public field, tool or dependency is introduced.

## Group 3: verify the contributor and package contracts

Prerequisite: Group 2 passes its live protocol checks.

Outcome: the fix meets all acceptance criteria and the package works outside the checkout. Covers R1 through R5 through V5 and the manual review.

- [x] Run the checks in `validation.md` in the prescribed sequence. Record actual results and any skipped or unavailable checks; a missing required check prevents merge readiness.
- [x] Verify the isolated package consumer sees complete component rules while retaining the original tools and fallback behavior. Inspect regenerated-file changes, if any, and confirm source ownership remains intact.
- [x] Review the final diff against the confirmed base for scope, documentation accuracy and preservation of the mission and technical constraints.
- [ ] Meet the repository's required CI and review policy before merge.

Completion check: V1 through V5 pass, manual review is complete, and required repository checks and reviews are satisfied. Record the resulting evidence before marking implementation complete in a later task.

## Execution boundary

The user authorized implementation on 2026-10-04. Local evidence is recorded in [validation](validation.md#execution-evidence-on-2026-10-04). Implementation changes remain uncommitted. Commit, push, pull request creation, merge and release remain separate actions.
