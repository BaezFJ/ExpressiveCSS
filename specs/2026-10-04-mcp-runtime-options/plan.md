# Phase 2 implementation plan

Feature: requested MCP runtime options
Date: 2026-10-04
Roadmap phase: Phase 2, requested runtime options
Branch: `feature/2026-10-04-mcp-runtime-options`
Base: local `origin/master` at `b46e9230a20115f6a03d2299ebdad4eb72775fd8`
Status: Groups 1 and 2 complete; Group 3 locally verified, required CI and review pending

Follow [requirements R1 through R5](requirements.md#requirements), [validation](validation.md), and [roadmap Phase 2](../roadmap.md#phase-2-requested-runtime-options). The interview confirmed the following dependency order.

## Group 1: live regressions define requested Options

Prerequisites: Phase 1's complete-rule implementation, the bundled guides, and existing matching-version and negative fixtures in `mcp/expressivecss/smoke.mjs`.

Outcome: the live suite detects missing requested Options and defines compatible default behavior. Covers R1 through R5 through V1 through V4.

- [x] Extend the catalogue loop to derive each expected Options body independently from bundled Markdown. Cover all shipped guides in requests of at most 12 components, including Datepicker and Autocomplete; retain the all-guide rule comparison.
- [x] Assert documented and absent records, full Markdown equality, visibility/docked guidance, text/structured agreement, and default/empty-selector omission. Cover an empty Options body with a package-local fixture if the shipped catalogue has none, without adding a public test hook.
- [x] Add invalid-selector checks and exercise requested Options with unknown names, foundation-only requests, skipped stages, version/provenance failures and tampered consumer guides. Preserve existing cleanup and command-denial checks.

Completion check: `npm test --prefix mcp/expressivecss` fails on the base because requested Options are absent. Record the expected failure separately from unrelated failures. Do not weaken the Phase 1 regression to accommodate the new output.

## Group 2: shared retrieval returns bundled Options

Prerequisite: Group 1 demonstrates the missing behavior.

Outcome: an explicit selector adds complete Options or an absence record, while existing inputs retain their fields. Delivers R1 through R5, checked by V1 through V4.

- [x] Add the bounded optional `sections` selector to `syntaxSchema`; the existing parsed schema and tool registration must use the same definition. Retain existing component/foundation refinement.
- [x] Extract the Options body in the shared guide parser. Reuse `extractSection()` and make only the boundary correction needed for same-or-higher-level headings, if required. Preserve existing summary behavior and test nested headings and code boundaries when changing extraction.
- [x] Pass requested sections through the shared summary path and conditionally add the `options` record defined in requirements. Keep matching, provenance, capability and stage-status logic intact.
- [x] Document old and Options-request forms in `mcp/expressivecss/README.md`, plus absence meaning, complete bundled Markdown and evidence limits. Add an unreleased entry to `mcp/expressivecss/CHANGELOG.md`. Regenerate through established commands only if source inputs changed.

Completion check: the full MCP smoke suite passes V1 through V4. Datepicker returns its full Options table; Cards reports documented absence. Omitted and empty selectors add no `options` field, and no Methods section is returned.

## Group 3: contributor and package verification

Prerequisite: Group 2 passes the live acceptance cases.

Outcome: the feature passes required local checks and works from the isolated MCP tarball. Covers R1 through R5 through V5 and manual review.

- [x] Run the established commands in validation V5 sequentially and record actual outcomes, including skipped or unavailable checks.
- [x] Confirm isolated package verification exercises the expanded smoke suite and obtains Options from packaged data without framework source files.
- [x] Review the final diff for the confirmed scope, request compatibility, complete rules, documentation accuracy and generated-data ownership. Record manual review evidence in `validation.md`.
- [ ] Satisfy required CI, resolved conversations and the repository's applicable review policy before merge. Failures or missing required checks prevent merge readiness.

Completion check: V1 through V5 and manual review have recorded passes, and the repository's merge conditions are met. Local passing tests alone do not establish CI or repository approval.

## Execution boundary

The user authorized implementation on 2026-10-04. The implementation and local verification passed; required CI and repository review remain pending. Evidence is in [validation](validation.md#execution-evidence-on-2026-10-04). Changes remain uncommitted. Commit, push, pull request creation, merge and release remain separate actions. Mark tasks complete only when their work actually finishes.
