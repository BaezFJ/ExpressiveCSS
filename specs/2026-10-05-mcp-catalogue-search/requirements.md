# MCP catalogue search

Date: 2026-10-05
Roadmap phase: Phase 5, catalogue search
Branch: `feature/2026-10-05-mcp-catalogue-search`
Base: local `origin/master` at `2400237e70b45fbf3e64fa49e87e8128b0eaa04d`
Status: implemented and locally verified; required CI and review pending

Follow the [mission's discovery workflow](../mission.md#core-workflow), [data ownership and technical constraints](../tech-stack.md#data-ownership), and [roadmap Phase 5](../roadmap.md#phase-5-catalogue-search). Phase 4 is implemented at the base. Phase 5 is the earliest unstarted phase, and its dependency is present in the shared server and live smoke suite. Saved Phase 4 records retain pending external review language; this specification does not independently verify GitHub review outcomes.

## Current behavior

`mcp/expressivecss/server.js` registers `component_catalog` with optional `projectRoot` and `workflowId`. `componentCatalogHandler()` projects all 41 bundled guides into compact entries sorted by canonical slug. Entries contain `slug`, `title`, `description`, `aliases`, `runtime` and `docs`. The description comes from existing decision `useWhen`, then `jobs`, with null fallbacks. `loadGuideCatalog()` supplies the cached guide inventory, bundled version and source hash.

The tool has no search selector or result limit. `creative_director` ranks goal-based suggestions, while `component_syntax_expert` uses `findGuideByName()` with fuzzy lookup disabled. Catalogue aliases describe components but do not expand exact syntax lookup. Discovery needs to return canonical slugs that callers can pass to that existing lookup.

## Confirmed decisions

The user confirmed Phase 5, the stated base and three ordered groups: live regressions, shared search with documentation, then contributor and package verification. Search uses existing names, aliases and compact descriptions. Exact name and alias matches precede labelled heuristic matches. Search defaults to 10 results, accepts at most 50, discloses omitted matches and returns explicit empty results. Requests without a query retain the full listing.

The input bounds, matching rules and metadata layout below are implementation choices specified within that confirmed scope. They reuse native string operations and existing normalization without a new dependency or inventory.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | Extend the existing `component_catalog` registration with optional `query` and `limit`. Accept a string query of at most 256 characters before trimming; reject an empty or whitespace-only query. Accept only integer limits from 1 through 50. With a query, default the effective limit to 10. Without a query, preserve the complete Phase 4 listing, entry fields, sorting and evidence; a valid supplied limit has no effect on listing. Preserve existing project-root and workflow bounds and all eight tool registrations. |
| R2 | Search only the existing entry `slug`, `title`, `aliases` and compact `description`. Compare names using existing `normalizeForMatch()` behavior. Assign one `matchType` per search entry: `exact-name` for normalized slug/title equality, otherwise `exact-alias` for normalized alias equality, otherwise `heuristic`. A heuristic entry must contain every normalized query token somewhere in those searchable fields. Retain one- and two-character tokens, so short names remain searchable. A query with no normalized tokens returns no matches, never the full catalogue. Do not interpret queries as regular expressions. Sort by match type in the stated order, then canonical slug using the listing's comparator. Deduplicate by slug and return only existing canonical entries. |
| R3 | Count all matches before applying the search limit. Search results retain the six compact entry fields and add only `matchType`. Return `query` as the trimmed input, effective `limit`, `count` as delivered entry count, `totalMatches`, `omittedCount` equal to total minus delivered, and `truncated` equal to whether omissions occurred. No matches yields `entries: []`, all three counts zero and `truncated: false`. Use `coverageStatus: "complete-search-results"` when every match is delivered and `"partial-search-results"` otherwise. These statuses describe delivery of matches, not the full inventory. Document increasing the limit or narrowing the query as recovery; do not claim pagination or a byte-budget guarantee. |
| R4 | Preserve bundled `contractVersion`, `sourceHash`, `guideSource` and the shared evidence fields in search responses. Omitting a target retains unknown consumer compatibility and leaves working-directory/CLI defaults unchecked. An explicit target reuses current version/provenance resolution and blocked outcomes while retaining reference matches. Search completion, empty results and truncation do not override compatibility status. Text and structured content agree. Keep read-only annotations, bounded metadata reads, command policy, full rules and Options/Methods behavior. Every returned slug resolves through existing exact syntax lookup; search must not initialize components, run project scripts, write project files or fetch documentation to construct matches. |
| R5 | Update the MCP README and unreleased changelog with input bounds, defaults, matching order, heuristic labels, counts, omissions, empty results, listing compatibility and snapshot/evidence limits. Extend catalogue-wide live protocol checks, existing regressions and installed-tarball checks. Contributor verification, MCP smoke tests and isolated packages must pass before submission; required CI, resolved conversations, an up-to-date branch, accepted API scope and applicable repository review must be satisfied before merge. |

## Examples and implementation boundaries

```json
{ "query": "app-bar" }
```

```json
{ "query": "navbar", "limit": 1 }
```

The current bundle maps `navbar` to `app-bar`. The canonical slug is the syntax request input; the alias itself gains no syntax-lookup contract. `matchType` records the strongest match for an entry even when it also matches other fields. Description and partial-name matches are heuristic advice, not normative component selection.

Use `mcp/expressivecss/server.js`, `mcp/expressivecss/smoke.mjs`, `mcp/expressivecss/README.md` and `mcp/expressivecss/CHANGELOG.md`. Keep filtering and limiting in the shared catalogue handler or a minimal local helper. Reuse cached guides, `COMPONENT_DECISIONS_BY_SLUG`, schemas, annotations and `toToolResult()`. Use disposable package fixtures for ambiguous aliases, ranking ties, short tokens, missing metadata and more matches than a configured limit. Cleanup belongs in `finally` blocks.

Follow the [trust boundaries](../../SECURITY.md#trust-boundaries). Search input does not authorize commands or filesystem access. Generated metadata remains owned by its existing sources. Regenerate with `npm run build:semantics` and `npm run build:skill` only if those source inputs change; never edit generated copies by hand.

New dependencies, another inventory, syntax alias expansion, framework behavior, transport changes, releases and historical bundles are excluded. Selectable response detail belongs to Phase 6; aggregate serialized-result budgets and recovery belong to Phase 7; resources belong to Phases 8 through 10. The result-count bound in this phase is not an aggregate byte limit.

## Open decisions and execution boundary

None. All three interview groups are confirmed. The user authorized implementation on 2026-10-05. Contributor, MCP and isolated package checks passed; see [execution evidence](validation.md#execution-evidence-on-2026-10-05). Required CI and repository review remain pending. Changes are uncommitted. Commit, push, pull request, merge and publication require separate instructions. The roadmap records this local milestone.
