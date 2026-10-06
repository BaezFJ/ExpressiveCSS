# MCP resource argument completion

Date: 2026-10-06
Roadmap phase: Phase 10, resource argument completion
Branch: `feature/2026-10-06-mcp-resource-completion`
Base: local `origin/master` at `e849bde10c71832ac2d617c180dfb6e30e583307`
Status: implemented and locally verified; required CI and review pending

Follow the [mission's core workflow](../mission.md#core-workflow), [technical constraints](../tech-stack.md#compatibility-and-trust-boundaries) and [roadmap Phase 10](../roadmap.md#phase-10-resource-argument-completion). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Project facts and phase eligibility

Phase 9 merged as #224 (`e849bde1`), and Phases 1 through 8 merged before it. The roadmap's baseline paragraph still calls Phases 6 through 10 unstarted, but Git history and the current source show Phases 1 through 9 implemented. Phase 10 is the last unfinished phase, and its prerequisite, the Phase 9 resource templates, is in the base. This specification leaves the roadmap unchanged and makes no claim about external CI or review for earlier phases.

At the base, `startServer()` in `mcp/expressivecss/server.js` registers eight tools, the `component_catalog` resource and two `ResourceTemplate`s: `component_guide` at `expressivecss://components/0.12.0/<hash>/{slug}` and `component_guide_section` at `.../{slug}/{section}`. `bundledResources()` sorts the 41 guides by slug into `resources.guides`. `COMPONENT_SECTIONS` holds the five section names in the order `contract`, `syntax`, `rules`, `options`, `methods`. Neither template has completion callbacks, so the server does not advertise `completions`. The smoke suite asserts that absence at `smoke.mjs:586`, and the README says "Argument completion is not offered."

The lockfile selects SDK 1.31.0. Its `McpServer` registers a `completion/complete` handler and advertises `completions: {}` as soon as any registered template has a `complete` callback. `handleResourceCompletion()` finds the template whose URI template string equals `ref.uri`. A fixed resource URI gets an empty result, and any other URI throws `-32602`. A variable without a callback also gets an empty result. `createCompletionResult()` returns at most 100 `values`, with `total` set to the match count and `hasMore` set when more than 100 matched. This was read from an installed SDK 1.31.0 copy in a sibling worktree; this checkout has no `node_modules`.

Completion responses are not `tools/call` or `resources/read` results, so the stdio send guard does not measure them against `EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES`.

## Decisions from the interview

The user answered all three interview questions on 2026-10-06.

Plan: follow the Phase 9 shape. Write failing live smoke checks first, then the server change, then documentation and package verification. Branch from `origin/master`.

Requirements: complete `slug` on both templates by case-insensitive prefix over the canonical slugs, ignoring aliases. Also complete `section` on the section template over its five names. Keep the SDK's bound of 100 values with `total` and `hasMore`; add no project cap. The user chose section completion over alias matching and a smaller cap.

Validation: all four offered check groups must pass before merge. These are live completion, edge behavior, safety and regressions, and contributor and package checks.

### Agent decisions within the confirmed design

Slug suggestions follow the `resources/list` order (sorted by slug). Section suggestions follow `COMPONENT_SECTIONS` order, which is also the order of whole-guide recovery URIs, so clients see one section order everywhere.

Completion ignores `context.arguments`. Every guide has all five section URIs, and an absent Options or Methods section still reads successfully with `status: "absent"`. A slug therefore never narrows the valid section names.

Completion stays outside the content byte budget, the same as `resources/list` and `resources/templates/list`. The largest possible result is 41 short slugs, well under any useful budget, and clients need completion to work under a small budget to find narrower reads.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | Add a `complete.slug` callback to both `component_guide` and `component_guide_section`. It returns the canonical slugs from `resources.guides` whose lowercase form starts with the lowercased argument value, in `resources/list` order. An empty value returns all 41. Catalogue aliases, titles and descriptions are not matched, so `datepicker` returns no values and `date` returns `date-picker`. Build from the same in-memory guide list as reads and listing; create no second inventory. |
| R2 | Add a `complete.section` callback to `component_guide_section`. It returns the names in `COMPONENT_SECTIONS` whose lowercase form starts with the lowercased argument value, in that order. An empty value returns all five. The callback ignores `context.arguments`, including an unknown or missing slug. |
| R3 | Results use the SDK's `createCompletionResult()` bound: at most 100 `values`, `total` equal to the number of matches and `hasMore: true` only when more than 100 matched. Add no project cap or custom result shape. With 41 guides and five sections, every current result is complete with `hasMore: false`, and `total` equals the length of `values`. |
| R4 | The server advertises the `completions` capability. Behavior outside the matching cases is defined: a prefix with no matches returns `values: []`, `total: 0`, `hasMore: false`. Any other argument name on either template returns the SDK's empty result, `values: []` and `hasMore: false` without `total`. A `ref/resource` URI that is not one of the two exact template strings, including another version or hash, returns `-32602`. The fixed catalogue URI returns the same empty result. A `ref/prompt` reference returns `-32602` because the server registers no prompts. These outcomes come from SDK 1.31.0 and must be confirmed against the installed package. |
| R5 | Completion uses only the bundled catalogue loaded at startup. It reads no consumer files, ignores the working directory, the CLI project-root default and tool skip flags, executes no project scripts, initializes no components and makes no network requests. Every completed slug and section forms a URI that `resources/read` accepts. Completion does not count against `EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES` and works at budget 1. |
| R6 | Preserve all eight tools, their request forms, aliases, selectors, tool response budgets, compatibility and provenance behavior, static QA and command restrictions. Preserve the Phase 8 catalogue resource and the Phase 9 template list, resource list, read contents, identity validation and budget recovery. Completion never makes an alias, case variant or other unavailable identity readable. Keep JavaScript, installed dependencies, the runtime range, stdio, generated-data ownership and independent package versions. The installed MCP tarball must answer completion requests without repository sources or build scripts. |
| R7 | Update the MCP README and the unreleased changelog. Replace "Argument completion is not offered." with a description of slug and section completion: the exact template strings to pass as `ref.uri`, case-insensitive prefix matching over canonical slugs only, result order, the 100-value SDK bound with `total` and `hasMore`, the edge cases in R4 and the exclusion from the byte budget. State that completion applies only to resource template arguments and does not complete tool arguments such as `component_syntax_expert`'s `components`. Record results, failures and skips truthfully. |

## Implementation boundaries and references

Inspected files: `mcp/expressivecss/server.js` (`COMPONENT_SECTIONS`, `bundledResources`, `resourceBudgetError`, `startServer` and its send guard), `mcp/expressivecss/smoke.mjs` (Phase 9 resource checks and the completions-capability assertion), `mcp/expressivecss/README.md`, `mcp/expressivecss/CHANGELOG.md` and `mcp/expressivecss/component-guides.json`. SDK 1.31.0 `dist/esm/server/mcp.js` (`setCompletionRequestHandler`, `handleResourceCompletion`, `createCompletionResult`) was read from a sibling worktree's installed copy.

The SDK v1 [resource guide](https://ts.sdk.modelcontextprotocol.io/server#resources) documents `ResourceTemplate` `complete` callbacks. The [MCP completion specification](https://modelcontextprotocol.io/specification/2025-11-25/server/utilities/completion) defines `completion/complete`, `ref/resource` and the 100-value limit. No SDK migration is authorized.

Follow [data ownership](../tech-stack.md#data-ownership), [CONTRIBUTING.md](../../CONTRIBUTING.md) and [SECURITY.md](../../SECURITY.md).

Out of scope: alias matching, a project result cap, substring or fuzzy matching, slug-dependent section completion, tool argument completion, prompts, completion for the fixed catalogue URI, framework behavior, new dependencies, HTTP transport, release or version changes and publication.

## Open decisions

None. All three interview answers arrived, and the agent decisions above stay within them.

## Implemented choices on 2026-10-06

`startServer()` in `server.js` builds one case-insensitive prefix matcher, `startingWith()`, and passes it as the `complete` callbacks: `slug` on both templates from `resources.guides`, and `section` on the section template from `COMPONENT_SECTIONS`. The read handler, send guard, `bundledResources()` and listing are unchanged. Installed SDK 1.31.0 advertises `completions`, caps values at 100 and returns the R4 edge results, as the live suite confirms. No dependency, generated data, framework behavior or package version changed. Changes remain uncommitted.
