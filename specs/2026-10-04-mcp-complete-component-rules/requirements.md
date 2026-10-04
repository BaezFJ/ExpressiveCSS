# Complete MCP component rules

Date: 2026-10-04
Roadmap phase: Phase 1, complete component rules
Branch: `fix/mcp-complete-component-rules`
Base: `origin/master` at `7d3d238b02cffdd4bb50bbfe517f44054451aef6`
Status: implemented and locally verified; required CI and review pending

This feature delivers the first usable milestone in [roadmap Phase 1](../roadmap.md#phase-1-complete-component-rules). It follows the [mission's agreed scope](../mission.md#agreed-scope) and [technical compatibility and trust boundaries](../tech-stack.md#compatibility-and-trust-boundaries).

## Current behavior and need

At the reviewed base, `mcp/expressivecss/server.js` loads generated bundled guides and parses the bullets in each guide's Rules section. `summarizeGuide()` then returns `guide.rules.slice(0, 8)`. Source inspection and caller tracing identify `componentSyntaxExpertHandler()` as the consumer of that summary. The implemented correction returns `guide.rules` in full.

At the reviewed base, Cards has 16 normative rules, button groups 13, split button and text fields 11 each, and autocomplete and select nine each. A matching-version syntax request returns at most eight rules without omission metadata. Autocomplete loses `field-supporting-text-linked`, which requires supporting text to be connected through `aria-describedby`.

If a guide has no Rules bullets, `parseGuide()` supplies two generic advice strings. Those strings have no normative rule IDs. Static enforcement separately uses the bundled semantics data; this feature corrects the guidance returned to agents and does not change enforcement.

## Confirmed decisions

The interview confirmed Phase 1 and three ordered task groups: regression checks, the shared fix, then package verification. Preserve the existing string-array response shape and fix rule completeness only. Compare normative rule IDs for every bundled guide, retain compatibility and blocked-result checks, and require contributor verification, MCP smoke tests and isolated package verification before merge.

The feature branch starts from the confirmed base. The existing constitution files were preserved during specification and committed in `9420d0c7`. The user separately authorized implementation on 2026-10-04. Commit, push, pull request creation, merge and release remain separate actions.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | For every found component, the syntax result's `rules` array contains every Rules-section bullet parsed from its authoritative bundled guide, in the existing order and with the existing string contents. No fixed-count omission remains. Catalogue-wide live checks compare the complete expected normative rule-ID sequence with the returned sequence. |
| R2 | A guide with no Rules bullets retains the same two generic fallback advice strings in their existing order. Tests distinguish those strings from normative records by their source and absence of rule IDs; no new public fields are added. |
| R3 | Existing tool names, aliases, valid input forms, evidence fields, syntax/contract summaries and capability records remain compatible. The only intended change to syntax-tool payloads is a complete `rules` array for guides previously limited to eight entries. Text and structured representations agree. |
| R4 | Version mismatch, unresolved versions, invalid or stale provenance, missing component names and disabled-stage behavior retain their existing statuses and evidence. Complete rule delivery never converts a blocked result into an available result or expands command permissions. Existing blocked syntax results may retain bundled reference data exactly as before. |
| R5 | Bundled generated guidance remains authoritative. Do not replace it with consumer-authored guide text, hand-edit generated rule copies, duplicate a rule inventory or change static enforcement. The packaged fix and regression checks remain self-contained outside the framework checkout. |

R1's completeness is measured against the guide's Rules section, not unrelated Guide checks or API prose. Guides may share normative rule IDs with other guides; each guide's full sequence must be preserved independently.

## Scope and exclusions

Change the shared summary in `mcp/expressivecss/server.js`, extend the existing live tests in `mcp/expressivecss/smoke.mjs`, and update the MCP README and changelog to describe the correction. Generated files are refreshed only through their existing generators if affected inputs require it.

Runtime Options or Methods, catalogue tools, new output schemas, response budgets, omission metadata, resources and completion belong to later roadmap phases. This feature does not add dependencies, change the stack, move repositories, add HTTP, modify framework markup or change static rule enforcement.

## Constraints and dependencies

Reuse JavaScript, Node, the installed MCP SDK, Zod and existing fixtures. Keep the correction in the shared implementation and retain the operator command policy, bounded inspection, truthful annotations and evidence limitations.

The existing bundled catalogue and syntax tool satisfy Phase 1's prerequisites. Test expectations come from `component-guides.json` and existing fixture data. No runtime access to the source repository is introduced. Preserve `finally` cleanup of clients, transports and temporary fixtures.

The existing response-size behavior remains unchanged in this phase; aggregate limits are planned separately. Rule completeness must remain an invariant when those limits are implemented later.

## Open decisions

None. The interview resolved the feature scope, branch/base, task order and validation level. All implementation and validation results remain pending.
