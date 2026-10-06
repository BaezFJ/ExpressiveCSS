# Phase 8 implementation plan

Date: 2026-10-06
Roadmap phase: Phase 8, versioned catalogue resource
Branch: `feature/2026-10-06-mcp-versioned-catalogue-resource`
Base: local `origin/master` at `3eee32b1a22b2a31f09066b253cc20c5539abfae`
Status: implemented and locally verified; required CI and review pending

Deliver [R1 through R7](requirements.md#requirements) for [roadmap Phase 8](../roadmap.md#phase-8-versioned-catalogue-resource). Follow the [mission](../mission.md#core-workflow) and [technical constraints](../tech-stack.md#compatibility-and-trust-boundaries). The user delegated these ordered groups and their agent-run verification through `feature-spec-next`.

## Group 1: live resource contract checks

Prerequisite: the base contains Phases 1 through 7 and the existing disposable stdio fixtures in `mcp/expressivecss/smoke.mjs`.

Outcome: live protocol assertions define the new resource's identity, contents and failure behavior. Covers R1 through R6 through V1 through V4 in [validation.md](validation.md#automated-checks). Estimated agent work: 30 to 45 minutes, excluding dependency installation.

- [x] Extend the existing smoke suite with capability discovery, static resource listing and reading. Build independent compact-entry expectations from the bundled guides and decisions. Compare the resource with a complete unfiltered catalogue tool result using an adequate test budget.
- [x] Add wrong-version/hash, unrelated-scheme and invalid-selector reads. Exercise consumers with matching, mismatched, stale and missing contracts plus CLI project-root defaults; none may change resource snapshot/evidence.
- [x] Add independent final-wire byte measurements for default, exact-fit, one-byte-under, multibyte/escaped fixtures and budget 1. Exercise operator-increase recovery on the same URI and retain the existing tool budget cases.
- [x] Preserve existing tool, provenance and denied-command checks. Close clients, transports and temporary fixtures in `finally` blocks. Record the first actual feature-specific failure on the unchanged server.

Completion check: `npm test --prefix mcp/expressivecss` demonstrates that the base lacks resource support. Keep all acceptance results pending until the implementation passes; unrelated setup failures do not establish a feature regression.

## Group 2: shared catalogue resource and documentation

Prerequisite: Group 1 defines the live contract and dependencies are installed from the lockfile.

Outcome: clients can discover and read one versioned compact catalogue within the operator budget. Delivers R1 through R7 through V1 through V5. Estimated agent work: 30 to 60 minutes.

- [x] In `server.js`, reuse `loadGuideCatalog(undefined)` and the existing compact catalogue projection. Build the version/hash URI from the bundled contract, register it through the v1 SDK and preserve the no-target evidence. Remove tool-only fields from resource JSON and keep the representation deterministic for a fixed bundle/budget.
- [x] Measure the final `resources/read` shape independently of tool serialization. Return complete contents with `responseBudget` or the specified budget error/recovery data. Extend the existing final send check only as needed to cover SDK-added successful result fields; preserve tool request tracking and teardown.
- [x] Restrict reads to the registered identity. Keep discovery/read paths independent of target roots and tool skip flags; advertise only supported resource capabilities. Add no template, subscription implementation or new inventory.
- [x] Update `README.md` and the unreleased `CHANGELOG.md` with live client examples, current-snapshot/evidence limits and the precise read budget. Confirm behavior against installed SDK 1.31.0. Regenerate derived data only if its owner inputs changed.

Completion check: the live MCP suite passes V1 through V4 and the documentation review in V5 agrees with actual behavior. Every successful resource read contains the complete independently expected catalogue. Tool regressions retain their previous behavior.

## Group 3: contributor and installed-package verification

Prerequisite: Group 2 passes focused checks and documentation review.

Outcome: recorded checks establish behavior inside and outside the checkout. Covers R1 through R7 through V5. Allow 10 to 20 minutes for cached container verification, longer if image or dependency downloads are required. The Phase 7 recorded contributor/package commands took about 334 and 107 seconds respectively; these are prior measurements, not guarantees for this checkout.

- [x] Run the contributor, MCP and isolated-package commands in V5. Inspect exported reports and record actual failures, passes and skips.
- [x] Confirm `scripts/verify-packages.mjs` runs the expanded resource smoke checks from an installed tarball outside the repository. Use the current package verifier unless a concrete gap requires a focused change.
- [x] Review the final diff against R1 through R7, generated-data ownership and trust boundaries. Confirm no dependency, framework behavior, constitution, roadmap state or release/version change.
- [ ] Satisfy required CI, resolved conversations, an up-to-date branch, accepted API scope and applicable repository review before merge. Keep these conditions pending until external evidence exists.

Completion check: V1 through V5 have execution evidence and repository merge conditions are satisfied. Local verification does not establish external review or publication approval.

## Execution boundary

The user authorized implementation on 2026-10-06. Groups 1 and 2 are complete. Group 3 local contributor and installed-package verification passed. See [execution evidence](validation.md#execution-evidence-on-2026-10-06). Required CI and applicable external review remain pending. The roadmap completion state remains unchanged. Commits, pushes, pull requests, merges and deployment still require separate instructions. The agent owns verification; applicable external merge conditions remain effective.
