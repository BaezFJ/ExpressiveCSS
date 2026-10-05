# Phase 4 implementation plan

Feature: compact MCP catalogue listing
Date: 2026-10-05
Roadmap phase: Phase 4, compact catalogue listing
Branch: `feature/2026-10-05-mcp-compact-catalogue`
Base: local `origin/master` at `59d26fcfcae86b5d175788056daa0c3a2f9df7ce`
Status: Groups 1 and 2 complete; Group 3 locally verified, required CI and review pending

Deliver [requirements R1 through R5](requirements.md#requirements) for [roadmap Phase 4](../roadmap.md#phase-4-compact-catalogue-listing), checked by [validation V1 through V5](validation.md#automated-checks). Follow the [mission](../mission.md#agreed-scope) and [technical constraints](../tech-stack.md#compatibility-and-trust-boundaries).

## Group 1: live regressions define the compact listing

Prerequisites: Phase 3 implementation and the existing stdio client, bundle data and consumer/provenance fixtures in `mcp/expressivecss/smoke.mjs`.

Outcome: live checks define complete metadata delivery and target evidence. Covers R1 through R4 through V1 through V4.

- [x] Add `component_catalog` to expected tool registrations while retaining assertions and calls for every existing tool and alias. Check input bounds and read-only annotations.
- [x] Compare all returned entries with independent expectations from packaged guide and decision files. Check sorted, unique, complete slugs, exact field set, count, metadata and snapshot identity. Exercise missing metadata through the existing disposable package-fixture pattern.
- [x] Call the tool with no target from different working directories and with explicit matching, mismatched, missing, invalid, stale and divergent target fixtures. Assert truthful evidence and unchanged reference entries, including text/structured agreement.
- [x] Add read-only checks using disposable project fixtures with script markers and before/after file contents. Keep cleanup in `finally` and retain existing command-denial regressions.

Completion check: `npm test --prefix mcp/expressivecss` fails on the base because the new registration or listing is missing. Record the expected failure without treating unrelated failures as feature evidence.

## Group 2: shared catalogue tool and documentation

Prerequisite: Group 1 demonstrates the missing behavior.

Outcome: `component_catalog` returns the specified compact snapshot and optional target evidence. Delivers R1 through R5 through V1 through V4 and manual review.

- [x] Reuse bundled cache construction in `loadGuideCatalog()` and `COMPONENT_DECISIONS_BY_SLUG`. Make only the shared adjustment needed to load snapshot data without implicit target checks; preserve current callers' behavior.
- [x] Add the bounded optional inputs, description, handler and registration. Project only the specified entry fields, sort by slug, return count and snapshot identity, and use the existing result/evidence helpers.
- [x] When a target is explicit, reuse version/provenance resolution and blocked reasons. When omitted, label compatibility unknown and target checks unperformed. Preserve all old tools, skipped stages and execution restrictions.
- [x] Update the README and unreleased changelog. Explain metadata fallbacks, descriptive aliases, omitted-target behavior and evidence limits. Regenerate derived outputs only if their inputs changed.

Completion check: the expanded full MCP smoke suite passes V1 through V4. Empty requests list the full bundle; explicit incompatible targets retain that listing with blocked compatibility evidence. Old requests still work.

## Group 3: contributor and isolated package verification

Prerequisite: Group 2 passes focused acceptance checks.

Outcome: recorded local checks establish the new behavior in the checkout and installed tarball. Covers R1 through R5 through V5 and manual review.

- [x] Run the established commands in V5 and record actual results, failures and skips. Check generated data without hand-editing copies.
- [x] Confirm `scripts/verify-packages.mjs` runs the expanded smoke suite from the installed MCP tarball outside the checkout, including no-target listing and explicit-target evidence.
- [x] Review the final diff and README examples against R1 through R5. Confirm complete compact metadata, unchanged old tool behavior and preserved trust boundaries.
- [ ] Satisfy required CI, resolved conversations, an up-to-date branch, accepted public API scope and applicable repository review before merge.

Completion check: V1 through V5 and manual review have recorded passes, and external merge conditions are satisfied. Local checks alone do not establish merge readiness.

## Execution boundary

The user authorized implementation on 2026-10-05. Groups 1 and 2 are complete; contributor, MCP and isolated package checks passed. See [execution evidence](validation.md#execution-evidence-on-2026-10-05). Required CI and repository review remain pending. Changes are uncommitted. Commit, push, pull request creation, merge and release remain separate actions.
