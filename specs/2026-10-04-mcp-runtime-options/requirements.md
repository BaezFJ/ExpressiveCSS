# Requested MCP runtime options

Date: 2026-10-04
Roadmap phase: Phase 2, requested runtime options
Branch: `feature/2026-10-04-mcp-runtime-options`
Base: local `origin/master` at `b46e9230a20115f6a03d2299ebdad4eb72775fd8`
Status: implemented and locally verified; required CI and review pending

This feature implements [roadmap Phase 2](../roadmap.md#phase-2-requested-runtime-options). It follows the [mission's runtime API scope](../mission.md#agreed-scope), [data ownership](../tech-stack.md#data-ownership), and [compatibility and trust boundaries](../tech-stack.md#compatibility-and-trust-boundaries).

## Current behavior and need

At the selected base, `mcp/expressivecss/server.js` parses Contract, Syntax and Rules from bundled guides in `parseGuide()`. `summarizeGuide()` returns those fields to `componentSyntaxExpertHandler()`. The syntax input schema has no section selector, so callers cannot retrieve a guide's Options section through this tool.

The bundle in `mcp/expressivecss/component-guides.json` contains 41 guides. Datepicker's Options table documents `openByDefault`, `container`, `displayPlugin` and `displayPluginOptions`, including the docked plugin's pairing with `openByDefault: true`. Autocomplete also has documented Options. Cards has no Options section. Existing Contract prose can mention runtime options or methods; it remains unchanged.

Phase 1's complete-rule implementation and catalogue regression are present at the selected base. Its saved validation records passing local contributor, MCP and isolated package checks. Phase 1's documents retain pending CI/review language; this specification relies on the implemented prerequisite and does not claim a new CI or browser result.

## Confirmed decisions

The interview confirmed Phase 2 from the stated local base and three ordered implementation groups: live regressions, shared Options retrieval with documentation, then contributor and package verification. The user confirmed optional `sections: ["options"]` with an empty default, complete bundled Markdown, explicit documented/absent status, preserved fields and evidence, and catalogue-wide validation.

The concrete result field below is a specification choice within that confirmed contract. It requires no Markdown table parser or new dependency.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | `component_syntax_expert` accepts optional `sections`, an array defaulting to `[]`. In Phase 2 its only accepted value is `"options"`, with at most one entry. Reject unknown names, `"methods"`, duplicate entries, wrong types and oversized arrays through input validation. Existing component/foundation limits and the requirement to request at least one component or foundation remain intact. |
| R2 | For each found component requested with `sections: ["options"]`, add `options: { status: "documented", markdown: string }` when its bundled guide has a nonempty Options section. Return the complete section body as Markdown in source order, preserving tables, code, links and nested headings, with only surrounding whitespace trimmed. End at the next heading of the same or higher level. Do not clamp, summarize or synthesize entries. |
| R3 | If a found guide has no Options heading or its section body is empty after trimming, return `options: { status: "absent", markdown: null }`. This means no documented Options section, not that the component has no runtime configuration. With omitted `sections` or `sections: []`, omit `options` entirely. Unknown component names retain the existing `missing` result and never receive fabricated component or Options records. |
| R4 | Preserve every existing summary field, complete rule array and generic fallback, tool name and alias, capability behavior, skip behavior, and version/provenance evidence. Requested Options add bundled reference data without changing compatibility, availability, coverage or command permissions. Blocked requests remain blocked, with capability evidence restricted as before. Text and structured content agree. Foundation-only requests remain valid and have no component Options records. |
| R5 | Options come exclusively from the synchronized package bundle. Consumer-authored prose cannot override them. Reuse the shared guide extraction and summary path in JavaScript with existing Node, MCP SDK and Zod. The package must work outside this checkout, and the MCP README and changelog must describe the selector, absence meaning and unchanged evidence limits. |

### Request and response example

```json
{
  "components": ["date-picker", "cards"],
  "sections": ["options"]
}
```

Each found record keeps its existing fields. Datepicker adds a documented `options` record containing its full Options body. Cards adds an absent `options` record with `markdown: null`. The shared result still reports target compatibility and provenance independently of bundled reference availability.

## Scope and exclusions

Implementation belongs in `mcp/expressivecss/server.js`, with live regressions in `mcp/expressivecss/smoke.mjs` and usage/release notes in the MCP README and changelog. Reuse `extractSection()` where it meets R2; narrowly correct section-boundary handling if needed. Avoid changing how existing Contract, Syntax and Rules fields behave.

Methods retrieval belongs to Phase 3. Catalogue tools, response-detail selection, aggregate budgets, omission/recovery metadata, resources and completion belong to later phases. This feature leaves existing response settings and evidence fields intact. It adds no framework behavior, upstream fetching, browser initialization, transport migration or dependency. Publishing detailed new output schemas remains Phase 6 work; the existing validated evidence envelope still applies.

## Dependencies and constraints

Phase 1 is implemented at the base, and the existing bundle supplies the required Options source. Preserve generated-data ownership: do not hand-edit `component-guides.json` or generated guides. Run `npm run build:semantics` and `npm run build:skill` only if affected generator inputs change. Ordinary extraction from the existing bundle should need no regeneration.

Retain request limits, bounded inspection, truthful read-only annotations and the command policy described in `SECURITY.md`. Options lookup never executes project scripts. Keep client, transport and temporary fixture cleanup in `finally` blocks. Preserve existing trust-boundary regressions.

## Open decisions

None. The user authorized implementation on 2026-10-04. Local verification passed; required CI and repository review remain pending. See [execution evidence](validation.md#execution-evidence-on-2026-10-04). The roadmap completion state remained unchanged during specification.
