# Phase 5 implementation plan

Feature: MCP catalogue search
Date: 2026-10-05
Roadmap phase: Phase 5, catalogue search
Branch: `feature/2026-10-05-mcp-catalogue-search`
Base: local `origin/master` at `2400237e70b45fbf3e64fa49e87e8128b0eaa04d`
Status: Groups 1 and 2 complete; Group 3 locally verified, required CI and review pending

Deliver [R1 through R5](requirements.md#requirements) for [roadmap Phase 5](../roadmap.md#phase-5-catalogue-search). Follow the [mission](../mission.md#core-workflow) and [technical constraints](../tech-stack.md#compatibility-and-trust-boundaries). Checks are defined in [validation](validation.md#automated-checks).

## Group 1: live regressions define search

Prerequisite: Phase 4 implementation at the stated base, including the stdio client and independent catalogue expectations in `mcp/expressivecss/smoke.mjs`.

Outcome: protocol checks define search inputs, ordering, limits and truthful evidence. Covers R1 through R4 through V1 through V4.

- [x] Add exact slug/title, alias, description, partial-name and no-match calls. Compare search records with independently derived catalogue data and resolve returned slugs through exact syntax lookup.
- [x] Extend disposable package fixtures for duplicate aliases, strongest-match precedence, ties, short tokens, punctuation-only queries, null metadata and truncated results. Assert deterministic ordering, counts and labels.
- [x] Check default, minimum and maximum limits, invalid limits and query bounds. Retain full-listing assertions for omitted query, including a valid ignored limit.
- [x] Exercise search under omitted, matching and blocked target fixtures. Compare text with structured content and retain read-only script/file checks. Close clients and remove fixtures in `finally`.

Completion check: `npm test --prefix mcp/expressivecss` fails on a search-specific expectation at the base. Record the expected failure and distinguish unrelated failures. All new acceptance checks remain pending until the implementation passes.

## Group 2: shared search and documentation

Prerequisite: Group 1 demonstrates the missing behavior.

Outcome: the existing catalogue tool delivers bounded, labelled search results and preserves listing and compatibility behavior. Delivers R1 through R5 through V1 through V4 and V6.

- [x] Extend catalogue inputs with the specified query and limit validation. Preserve all existing request forms and tool registrations.
- [x] Search projected catalogue metadata with the specified exact precedence and token matching. Sort and deduplicate before applying the effective limit; retain compact metadata and canonical slugs.
- [x] Add search-only match labels, totals, omission fields and coverage statuses. Preserve existing snapshot/compatibility evidence and the unchanged no-query listing.
- [x] Update `mcp/expressivecss/README.md` and `mcp/expressivecss/CHANGELOG.md`. Explain lookup through returned slugs, empty results, narrowing/increasing limits and evidence boundaries. Regenerate derived files only if source inputs changed.

Completion check: the full live MCP suite passes V1 through V4. Search examples return exact or labelled heuristic results with accurate counts; old listing and syntax requests still pass. Documentation passes V6 review.

## Group 3: contributor and isolated package verification

Prerequisite: Group 2 passes focused acceptance checks.

Outcome: recorded checks establish behavior in both the checkout and installed npm tarball. Covers R1 through R5 through V5 and V6.

- [x] Run the established contributor, MCP and isolated-package commands in V5. Record actual commands, passes, failures and skips without treating static checks as browser evidence.
- [x] Confirm `scripts/verify-packages.mjs` runs the expanded smoke suite from an installed tarball outside the checkout. Search must use only its bundled guide and decision files.
- [x] Review the diff and README examples against R1 through R5 and V6. Confirm no additional inventory, dependency, syntax alias behavior or generated-data hand edit.
- [ ] Satisfy required CI, resolved conversations, an up-to-date branch, accepted API scope and applicable repository review before merge.

Completion check: V1 through V6 have recorded passes, and all external merge conditions are satisfied. Local verification alone does not establish merge readiness.

## Execution boundary

The user authorized implementation on 2026-10-05. Groups 1 and 2 are complete; contributor, MCP and isolated package checks passed. See [execution evidence](validation.md#execution-evidence-on-2026-10-05). Required CI and repository review remain pending. Changes are uncommitted. Commit, push, pull request, merge and release remain separate actions.
