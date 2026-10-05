# Compact MCP catalogue listing

Date: 2026-10-05
Roadmap phase: Phase 4, compact catalogue listing
Branch: `feature/2026-10-05-mcp-compact-catalogue`
Base: local `origin/master` at `59d26fcfcae86b5d175788056daa0c3a2f9df7ce`
Status: implemented and locally verified; required CI and review pending

This feature delivers [roadmap Phase 4](../roadmap.md#phase-4-compact-catalogue-listing) within the [mission's agreed scope](../mission.md#agreed-scope). Follow the [existing stack](../tech-stack.md#current-stack-and-agreed-use), [data ownership](../tech-stack.md#data-ownership) and [compatibility and trust boundaries](../tech-stack.md#compatibility-and-trust-boundaries).

## Current behavior and need

The base contains the Phase 1 rule fix and Phase 2 and 3 section-selection implementations. Git history includes their merged changes. Their saved specification records still describe external checks as pending; this discovery did not recheck GitHub outcomes.

`mcp/expressivecss/server.js` registers seven tools. `creative_director` requires a design goal and ranks suggestions. `component_syntax_expert` retrieves named guides with optional Options and Methods. Neither tool returns a compact, complete inventory directly.

`loadGuideCatalog()` caches 41 bundled guides, their framework version and the source hash from packaged `contract.json`. `parseGuide()` supplies canonical slugs, titles and documentation links. `COMPONENT_DECISIONS_BY_SLUG` supplies aliases, use cases and runtime ownership for the same 41 components. Catalogue loading also performs target-version and local-provenance reads. Default project resolution in existing tools uses the working directory, so the new tool must explicitly distinguish an omitted target from a checked project.

## Confirmed decisions

The user confirmed Phase 4 from the stated base, with live regressions first, shared tool and documentation second, and contributor/package verification last. The tool is `component_catalog`. It returns every shipped canonical slug with compact metadata, bundled version/source hash and truthful compatibility evidence for an optional target project. Search, response limits and resources remain later phases.

The field layout and deterministic metadata derivation below specify that confirmed contract. They reuse existing source records without adding an inventory or dependency.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | Register one read-only stdio tool named `component_catalog`. Accept an empty request and optional `projectRoot` and `workflowId` using the existing string bounds. Return one entry per bundled guide, sorted by canonical slug, with no duplicates or omissions. Return `count` equal to the entry count. Listing requires no goal, component selector or search query. |
| R2 | Each `entries` record contains only `slug`, `title`, `description`, `aliases`, `runtime` and `docs`. Use guide slug/title and `sourceUrl` for `docs`; preserve decision aliases and runtime values. Derive `description` from the first nonempty string in decision `useWhen`, then `jobs`, or null if neither exists. Missing decision metadata yields an empty alias array and null runtime/description. Missing links yield null. Do not invent metadata, copy full Contract/Syntax/Rules/Options/Methods, or return capability/decision dumps. Aliases are descriptive metadata; exact syntax lookup behavior stays unchanged. |
| R3 | Return `contractVersion` and `sourceHash` identifying the package's bundled snapshot, plus `guideSource: "bundled"` and the existing shared evidence fields. With no `projectRoot`, report `contractCompatibility: "unknown"`, identify target compatibility as unchecked, and permit `status: "available"` for successful snapshot listing. Bundled provenance evidence describes the packaged snapshot only. Do not resolve the working directory as an implicit target. With an explicit target, reuse existing version/provenance checks and their blocked outcomes; retain the reference entries and snapshot identity even when status is blocked. Catalogue completeness and target compatibility remain distinct. Text and structured representations agree. |
| R4 | Derive entries from synchronized bundled guides and existing component decisions through the shared server implementation. Preserve all seven existing registrations, including both page architect names, request forms, rules, Options/Methods selection, compatibility/provenance outcomes, skipped stages and command policy. Return truthful read-only annotations. No catalogue call initializes a component, executes project scripts, writes project files or fetches documentation to construct its entries. Existing target-version resolution may retain its current guarded resolution behavior. |
| R5 | Document empty and explicit-target requests, entry fields, metadata fallbacks, snapshot identity and compatibility limits in the MCP README; add an unreleased changelog entry. The isolated npm package exposes the tool using its own bundled files. Complete catalogue-wide live checks, existing compatibility regressions, contributor checks and isolated package verification before submission, with required CI and applicable repository review before merge. |

## Request and response contract

```json
{}
```

This lists the current bundle without assessing a consumer project. An explicit target request is:

```json
{ "projectRoot": "/absolute/path/to/consumer" }
```

Both results contain `entries`, `count`, `contractVersion`, `sourceHash`, `guideSource`, `status` and the shared evidence fields validated by `stageOutputSchema`. Use the existing workflow identifier and `stage: "component_catalog"`. `coverageStatus` must describe complete bundled catalogue delivery, while `blockedChecks` and `uncheckedAreas` describe the checks that were blocked or not performed. No target request can claim browser, visual or accessibility approval.

The current App bar entry uses slug `app-bar`, title `App bar`, description `Page title and screen-level actions.`, aliases `navbar` and `top app bar`, runtime `auto-init`, and its bundled documentation link. These values are an example from the inspected base, not another maintained inventory.

## Scope and constraints

Implementation changes belong in `mcp/expressivecss/server.js`, `mcp/expressivecss/smoke.mjs`, `mcp/expressivecss/README.md` and `mcp/expressivecss/CHANGELOG.md`. Reuse registration, `readAnnotations`, the shared evidence schema and `toToolResult()`. Reuse bundled cache loading; separate target-dependent reads only as needed to support an omitted target without changing existing tool behavior.

Phase 3 is implemented at the base. Preserve `SECURITY.md` request and path restrictions, bounded metadata reads and existing version-resolution safeguards. Close clients, transports and disposable fixtures in `finally` blocks. Hand-edited generated data, new dependencies, framework behavior, a repository split, transport changes, historical versions and release work are excluded. Foundations are not part of this component-guide listing.

Search and alias resolution belong to Phase 5. Selectable detail and expanded output schemas belong to Phase 6. Aggregate budgets and recovery belong to Phase 7; resources and completion belong to Phases 8 through 10. This phase must return its complete compact inventory without asserting an aggregate response-budget guarantee.

Regenerate with `npm run build:semantics` and `npm run build:skill` only if their source inputs change. Reading existing bundled metadata should require no regeneration.

## Open decisions and execution boundary

None. All three interview groups are confirmed. The user authorized implementation on 2026-10-05. Contributor, MCP and isolated package checks passed; see [execution evidence](validation.md#execution-evidence-on-2026-10-05). Required CI and repository review remain pending. Changes are uncommitted. Commit, push, pull request creation, merge and release remain separate actions. The roadmap now records this local milestone.
