# Requested MCP runtime methods

Date: 2026-10-04
Roadmap phase: Phase 3, requested runtime methods
Branch: `feature/2026-10-04-mcp-runtime-methods`
Base: local `origin/master` at `e96338b934f69b8cd812231a3a51a968bbee06b2`
Status: implemented and locally verified; required CI and review pending

This feature covers [roadmap Phase 3](../roadmap.md#phase-3-requested-runtime-methods), within the [mission's agreed scope](../mission.md#agreed-scope). Follow the [existing stack](../tech-stack.md#current-stack-and-agreed-use), [data ownership](../tech-stack.md#data-ownership), and [compatibility and trust boundaries](../tech-stack.md#compatibility-and-trust-boundaries).

## Current behavior and need

Phase 2 is implemented at the selected base. In `mcp/expressivecss/server.js`, `syntaxSchema` accepts `sections: ["options"]` or an empty selector. `parseGuide()` uses `extractSection()` to read bundled Options. `componentSyntaxExpertHandler()` passes the selector to `summarizeGuide()`, which conditionally returns an `options` record. Methods remain unavailable through section selection, and the smoke suite currently rejects `sections: ["methods"]`.

The package bundle contains 41 guides. Fifteen have a nonempty Methods section; 26 have no documented Methods section. Autocomplete documents `.open()`, `.close()`, `.selectOption()`, `.setMenuItems()` and `.destroy()`. Cards has no Methods section. These are observations of this base, not a second catalogue to maintain. Existing Contract and Syntax text can mention runtime APIs independently of optional sections.

Phases 1 and 2 are implemented in the base's history and have saved local validation evidence. Their records still mark external CI and review pending. This specification relies on the implemented prerequisite without claiming new external verification.

## Confirmed decisions

The user confirmed Phase 3 from the stated base, with live regressions first, shared retrieval and documentation second, and contributor/package verification last. The selector allows Options, Methods, or both, once each. Return complete bundled Methods or explicit documented absence, preserving default responses and evidence. Response budgets and discovery remain later roadmap work.

The `methods` result record below mirrors Phase 2's `options` record. This concrete field choice follows the confirmed contract and reuses the existing parser and summary path.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | Extend optional `sections`, defaulting to `[]`, to accept `"options"` and `"methods"`, with at most two distinct entries. Either order of the combined selector yields the same selected records. Reject unknown values, duplicates of either value, wrong types and arrays over the limit. Keep existing component/foundation limits and the requirement to request at least one component or foundation. |
| R2 | For each found component selected with `"methods"`, add `methods: { status: "documented", markdown: string }` when its bundled Methods section has a nonempty body. Return the complete body in source order, trimming only surrounding whitespace. Preserve lists, tables, links, code, nested headings and interior line endings. Stop at the next heading of the same or higher level outside fenced code. Do not summarize, clamp or invent methods. |
| R3 | A missing or empty Methods section returns `methods: { status: "absent", markdown: null }` when requested. Absence describes the bundled documentation and does not establish that the runtime has no methods. Omitted or empty selectors omit both optional records. Options-only selection omits `methods`; Methods-only selection omits `options`; combined selection returns each independently. Unknown names retain the existing `missing` result without fabricated component records. |
| R4 | Preserve existing fields, complete ordered rules, generic advice, Options behavior, all seven tool registrations and aliases, foundation requests, capability restrictions, skipped stages, version/provenance outcomes and command policy. Requested Methods remain bundled reference data even when compatibility blocks the result; they never turn a blocked result into available evidence. Text and structured representations agree. |
| R5 | Read Methods exclusively from synchronized package guides through the shared JavaScript extraction and summary path. Consumer prose cannot override them. Add no dependency or second inventory. The packaged server works outside the checkout. Update the MCP README and changelog with selection forms, defaults, absence meaning and evidence limits. |

## Request and response example

```json
{
  "components": ["autocomplete", "cards"],
  "sections": ["options", "methods"]
}
```

Autocomplete adds documented `options` and `methods` records. Its Methods Markdown includes `.destroy()`. Cards returns absent records for both sections. Every found component retains its existing fields, and the result reports target compatibility and provenance separately.

## Scope and exclusions

Change `mcp/expressivecss/server.js`, extend the live suite in `mcp/expressivecss/smoke.mjs`, and update `mcp/expressivecss/README.md` and `mcp/expressivecss/CHANGELOG.md` during implementation. Reuse `extractSection()`, which already handles nested headings and fenced examples. Only change shared extraction if a Methods regression demonstrates a defect; preserve existing section bodies.

Catalogue discovery, response-detail modes, aggregate limits, omission/recovery metadata, resources and completion belong to subsequent phases. Detailed new output schemas remain Phase 6 work. No framework behavior, upstream retrieval, component initialization, transport migration or release is included.

## Dependencies and constraints

Phase 2's selector and shared section extraction are present at the base. Preserve `semantics.json` and generator ownership; do not hand-edit bundled or generated guides. Regenerate with `npm run build:semantics` and `npm run build:skill` only if their inputs change. Reading existing Methods should require no regeneration.

Follow `SECURITY.md` at the request boundary. Section retrieval remains read-only and cannot execute project commands. Close clients/transports and remove disposable fixtures in `finally` blocks. Preserve existing request, file and command restrictions.

## Open decisions and execution boundary

None. All three interview groups are confirmed. The user authorized implementation on 2026-10-04. The live MCP suite, contributor checks and isolated package verification passed. See [execution evidence](validation.md#execution-evidence-on-2026-10-04). Required external CI and repository review remain pending; changes are uncommitted. Commit, push, pull request creation, merge and release remain separate actions. The roadmap's completion state was preserved during specification.
