# Phase 3 implementation plan

Feature: requested MCP runtime methods
Date: 2026-10-04
Roadmap phase: Phase 3, requested runtime methods
Branch: `feature/2026-10-04-mcp-runtime-methods`
Base: local `origin/master` at `e96338b934f69b8cd812231a3a51a968bbee06b2`
Status: Groups 1 and 2 complete; Group 3 locally verified, required CI and review pending

Deliver [requirements R1 through R5](requirements.md#requirements), checked by [validation](validation.md), for [roadmap Phase 3](../roadmap.md#phase-3-requested-runtime-methods). The user confirmed this dependency order.

## Group 1: live regressions define requested Methods

Prerequisites: Phase 2 implementation, bundled guides, and existing matching-version, negative and disposable bundle fixtures in `mcp/expressivecss/smoke.mjs`.

Outcome: the suite defines complete selected Methods and rejects incompatible selector forms. Covers R1 through R5 through V1 through V4.

- [x] Extend the catalogue loop with independent Methods expectations for every shipped guide, using batches within the existing 12-component limit. Compare complete bodies and explicit absence; assert Autocomplete includes `.destroy()`.
- [x] Cover empty/default, Options-only, Methods-only and combined selectors in both orders. Preserve the all-guide Options and complete-rule regressions. Replace the existing rejection of valid `"methods"` with invalid-value, duplicate and size-limit checks.
- [x] Extend the existing disposable bundle fixture for empty/missing Methods, nested headings, code fences, same/higher-level boundaries, end-of-file bodies, CRLF and a complete body longer than the existing per-component character setting. Retain fixture cleanup in `finally`.
- [x] Exercise selected Methods with unknown names, foundation-only requests, disabled stages, version/provenance failures and conflicting consumer prose. Keep text/structured equality and command-denial checks.

Completion check: `npm test --prefix mcp/expressivecss` fails on the base for unsupported Methods selection or missing Methods records. Record the expected failure separately from unrelated errors.

## Group 2: shared retrieval and documentation

Prerequisite: Group 1 demonstrates the missing behavior.

Outcome: section selection returns complete bundled Methods or explicit absence without changing existing responses. Delivers R1 through R5 through V1 through V4.

- [x] Extend `syntaxSchema` and its parsed validation to accept up to two distinct supported section names. Preserve the component/foundation refinement and use the same schema at tool registration.
- [x] Read Methods with `extractSection()` in `parseGuide()`. Store the complete body or null, and conditionally add the specified `methods` record in `summarizeGuide()`. Reuse the selector already passed by `componentSyntaxExpertHandler()`.
- [x] Keep the Options path, evidence and capability logic intact. Avoid new parsing helpers or abstractions unless the regressions establish a need.
- [x] Update the MCP README with Methods-only and combined examples, supported selector orders, defaults, documented absence and unchanged evidence limits. Add an unreleased changelog entry. Regenerate owned outputs only if generator inputs changed.

Completion check: the full MCP suite passes V1 through V4. Autocomplete returns its full Methods body including `.destroy()`; Cards reports absence. Options-only requests add no `methods` record, and old requests retain their fields.

## Group 3: contributor and package verification

Prerequisite: Group 2 passes focused acceptance checks.

Outcome: local checks establish the specified behavior in the checkout and isolated package. Covers R1 through R5 through V5 and manual review.

- [x] Run validation V5's established commands sequentially and record actual results, including failures, unavailable checks or skips.
- [x] Confirm the installed MCP tarball runs the expanded live suite using its own bundled Methods without source-checkout access.
- [x] Review the final diff and README examples for the confirmed scope, compatibility, source ownership and unchanged command permissions. Record manual review in `validation.md`.
- [ ] Satisfy required CI, resolved conversations, accepted API scope, an up-to-date branch and applicable repository review before merge.

Completion check: V1 through V5 and manual review have recorded passes, with required external merge conditions satisfied. Local passing tests alone do not prove merge readiness.

## Execution boundary

The user authorized implementation on 2026-10-04. Groups 1 and 2 are complete and the live MCP suite passes. Contributor and isolated package verification passed. See [execution evidence](validation.md#execution-evidence-on-2026-10-04). Changes remain uncommitted. Commit, push, pull request creation, merge and release remain separate actions. Required external CI and repository review remain pending.
