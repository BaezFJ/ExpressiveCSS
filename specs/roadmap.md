# MCP implementation roadmap

Implement the five improvements in the interview's confirmed order: complete rules, runtime API guidance, catalogue discovery, bounded responses and versioned resources. Follow the [mission](mission.md) and [technical constraints](tech-stack.md). Each numbered phase has one observable outcome and is intended for one focused work session.

## Baseline and status

The reviewed checkout is `7d3d238`. The MCP package is 0.2.2 and serves framework contract 0.12.0. Seven tools, bundled catalogue loading, version/provenance checks, heuristic semantics inspection, command restrictions and an independent package release process are implemented. Live protocol smoke tests passed during the review.

Phase 1 is implemented and locally verified on 2026-10-04; required CI and review remain pending. Its [validation record](2026-10-04-mcp-complete-component-rules/validation.md#execution-evidence-on-2026-10-04) covers all 41 guides, contributor checks and isolated packages. Phase 2 is implemented and locally verified on 2026-10-04; required CI and review remain pending. Its [validation record](2026-10-04-mcp-runtime-options/validation.md#execution-evidence-on-2026-10-04) covers requested Options or explicit absence across all 41 guides, compatibility regressions, contributor checks and isolated packages. Phase 3 is implemented and locally verified on 2026-10-04; required CI and review remain pending. Its [validation record](2026-10-04-mcp-runtime-methods/validation.md#execution-evidence-on-2026-10-04) covers requested Methods or explicit absence across all 41 guides, selector isolation, compatibility regressions, contributor checks and isolated packages. Phases 4 through 10 remain planned and unstarted. The first usable milestone is complete rule delivery in Phase 1.

| Improvement | Phases |
| --- | --- |
| Complete component rules | 1 |
| Runtime API guidance | 2 and 3 |
| Catalogue discovery | 4 and 5 |
| Bounded responses | 6 and 7 |
| Versioned resources | 8 through 10 |

## Phase 1: complete component rules

Dependency: existing bundled guides and syntax tool.

- Remove the fixed eight-rule omission in the shared guide summary.
- Check returned normative rule IDs against the complete bundled guide rule IDs, including guides with more than eight rules.
- Preserve existing version/provenance status and distinguish generic fallback advice from normative rules in the checks.

Completion check: live syntax requests return all 16 Cards rules and the autocomplete supporting-text linkage rule. The existing MCP smoke suite passes. This is the first usable milestone.

## Phase 2: requested runtime options

Dependency: Phase 1.

- Add an optional way to request documented Options through `component_syntax_expert`.
- Read those sections from the existing bundled guidance and identify components with no documented Options section without inventing entries.
- Preserve existing request forms and contract/provenance evidence.

Completion check: a live Datepicker request returns its documented visibility and docked-display options; a component without Options reports their absence. A request using the previous input shape still succeeds.

## Phase 3: requested runtime methods

Dependency: Phase 2's section-selection behavior.

- Extend the same section-selection behavior to documented Methods.
- Return the bundled method guidance and identify absent sections explicitly.
- Document the supported section-selection behavior in the MCP README.

Completion check: a live Autocomplete request returns its documented Methods, including `destroy()`. Selecting Options alone does not include unrequested Methods. Missing or mismatched target versions retain their existing blocked compatibility evidence.

## Phase 4: compact catalogue listing

Dependency: Phase 3; reuse the existing guide and component decision catalogue.

- Add one read-only catalogue discovery tool that lists canonical slugs and compact descriptive metadata, including available aliases and runtime ownership.
- Include the bundled framework version and snapshot source hash, with truthful project-compatibility evidence where a target project is supplied.
- Document and test the new tool without changing existing names or aliases.

Completion check: a live catalogue request accounts for every shipped guide and includes no full syntax or capability dump. All existing tool registrations remain callable.

## Phase 5: catalogue search

Dependency: Phase 4.

- Add optional search to the same discovery tool using existing names, aliases and descriptions.
- Bound results and disclose whether matching entries were omitted.
- Return an explicit empty result for no matches; keep heuristic matches distinguishable from exact names or aliases.

Completion check: live requests cover an exact canonical name, a catalogue alias and a query with no matches. Search results resolve through the existing exact syntax lookup and do not create a second inventory.

## Phase 6: selectable response detail

Dependency: Phases 1 through 5.

- Add compact and detailed retrieval behavior while preserving existing input forms.
- Keep applicable rules and shared compatibility/evidence fields available; make optional API and capability detail selectable.
- Publish output schemas for new detail and omission fields and document defaults.

Completion check: requests for the same component at different detail levels contain the same applicable rule IDs and compatibility outcome. Compact output excludes unrequested optional detail; detailed output returns the requested documented sections.

## Phase 7: aggregate response limits and recovery

Dependency: Phase 6.

- Specify and enforce aggregate limits on documentation/discovery responses, accounting for the complete serialized tool result. Retain existing QA limits and evidence behavior.
- Disclose every omitted component or requested section through validated metadata, without cutting essential rules or code into misleading fragments.
- Provide recovery through supported narrower requests. If even a minimal evidence/error result cannot fit the configured budget, fail explicitly rather than implying successful coverage.

Completion check: boundary cases, multibyte content and a 12-component request respect the chosen aggregate budget. A deliberately small budget produces explicit partial/error evidence and a working recovery request. Tests verify both text and structured representations.

## Phase 8: versioned catalogue resource

Dependency: Phase 7.

- Expose the bundled catalogue as a read-only MCP resource using the existing compact catalogue data.
- Give its identity an unambiguous framework-version and source-hash relationship; document that the server offers its current bundle only.
- Advertise resources without changing stdio deployment or existing tools.

Completion check: `resources/list` and `resources/read` work over the live protocol. The catalogue agrees with the discovery tool and identifies the shipped snapshot without claiming compatibility with an unchecked consumer project.

## Phase 9: versioned component resources

Dependency: Phase 8; reuse Phase 7's response-limit and recovery rules.

- Expose component guidance through a versioned resource template backed by the same bundled guides as the syntax tool.
- Support bounded selection of documented sections so large guides remain retrievable without silent omission.
- Validate resource names and requested snapshot identity; reject unknown components and unavailable versions without fetching upstream or reading arbitrary project files.

Completion check: live resource reads retrieve complete Cards rules and requested Datepicker Options with matching snapshot metadata. Small-budget recovery works, and unknown names or unavailable versions return explicit errors.

## Phase 10: resource argument completion

Dependency: Phase 9.

- Add canonical component-name completion for the resource template using the existing catalogue.
- Bound completion results and disclose additional matches.
- Document resource selection and completion, including that completion does not automatically apply to tool arguments.

Completion check: a live `completion/complete` request returns appropriate canonical names for a prefix. An unknown reference or a prefix without matches has defined behavior, and completion never executes project commands.

## Submission and release readiness

After the relevant phases, regenerate changed derived data and run their focused checks. Before submitting the completed work, run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages` as required by the contributor policy. Verify that the packaged server exposes the new behavior outside the checkout and that existing clients can still call the original tools.

Keep changes focused and update the MCP README and changelog alongside behavior. Follow `CONTRIBUTING.md` for public API review and `RELEASING.md` for independent MCP releases. Planning approval does not mean implementation, external publication or release approval has occurred.

Exact new argument names, budget values and resource URI syntax will be resolved during phase specification. Additional prompts, page recipes, HTTP hosting, an SDK migration and repository separation are outside this roadmap.
