# MCP versioned catalogue resource

Date: 2026-10-06
Roadmap phase: Phase 8, versioned catalogue resource
Branch: `feature/2026-10-06-mcp-versioned-catalogue-resource`
Base: local `origin/master` at `3eee32b1a22b2a31f09066b253cc20c5539abfae`
Status: implemented and locally verified; required CI and review pending

Follow the [mission's core workflow](../mission.md#core-workflow), [technical constraints](../tech-stack.md#compatibility-and-trust-boundaries) and [roadmap Phase 8](../roadmap.md#phase-8-versioned-catalogue-resource). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Project facts and phase eligibility

The base commit includes Phase 7's aggregate response limits. Phases 1 through 7 have implementation and local validation records in this checkout. The [Phase 6 evidence](../2026-10-05-mcp-selectable-response-detail/validation.md#execution-evidence-on-2026-10-05) and [Phase 7 evidence](../2026-10-05-mcp-aggregate-response-limits/validation.md#execution-evidence-on-2026-10-05) cover selectors, byte boundaries, contributor checks and installed packages. The roadmap's baseline paragraph still calls Phases 6 through 10 unstarted. Current source and Git history establish that Phase 8 is the earliest unfinished phase whose implementation prerequisites are complete. This specification preserves the roadmap and does not independently establish prior external CI or review outcomes.

At the specification base, `mcp/expressivecss/server.js` registers eight tools and no resources. `loadGuideCatalog(undefined)` reads the shipped bundle without selecting a consumer project. `buildCatalogPayload()` derives compact entries from those guides and existing component decisions, sorted by canonical slug. The 41 current entries contain `slug`, `title`, `description`, `aliases`, `runtime` and `docs`. Without a target, the catalogue tool reports unknown consumer compatibility and bundled provenance.

`toToolResult()` applies the operator's `EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES` setting to guidance tool results. The default is 65,536 UTF-8 bytes. The stdio send guard also covers SDK-generated oversized tool results. Resources need their own result-shape measurement; a tool-result budget cannot establish a resource-read bound.

The packaged framework contract is 0.12.0. `mcp/expressivecss/contract.json` supplies the existing source hash, currently `270b7d8fd0ec2f1174cba3f2793c061d3b4f494903520e2eaaa7fa640a680859`. That hash identifies the bundled contract sources. It is not a new digest of the serialized resource text. The MCP package is 0.2.2 and the lockfile selects SDK 1.31.0 within its declared v1 range.

## Decisions under delegation

The user invoked `feature-spec-next` and delegated Plan, Requirements and Validation decisions to the agent, including specification verification. The decisions below derive from the constitution and inspected implementation. They are agent choices within that delegation, not interview answers or evidence of user review.

Use local `origin/master` as the contributor base. It equals current HEAD and local `master`, with no unrelated commits or uncommitted files. No `upstream` remote is configured; `origin` points to the project's upstream repository. This run did not fetch, so the base statement concerns inspected local refs.

Expose one static JSON resource at `expressivecss://catalogue/<framework-version>/<source-hash>`. Build its identity from the shipped contract, URI-encoding the version path segment and retaining the complete source hash. The current version segment is `0.12.0`. Advertise the URI through resource discovery so clients do not construct it from assumptions. Only the current bundle is available.

Return the whole compact catalogue or an explicit protocol error. Reuse the existing operator budget for successful resource reads and use operator-increase recovery when the complete resource cannot fit. This keeps Phase 8 focused on discovery of one snapshot. Catalogue pagination, search resources, component resource templates and completion remain outside this phase.

The agent owns the live protocol, regression, documentation and package checks in [validation.md](validation.md#automated-checks). No manual specification approval is required. Repository CI and applicable external review remain merge conditions.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | Declare resource support and register one static resource named `component_catalog`, with a readable title, description and `mimeType: "application/json"`. `resources/list` returns its exact version/hash URI. State that it contains the current bundled snapshot only. Use the installed v1 SDK's resource registration with the existing stdio deployment. Advertise no unsupported subscription behavior. No template or argument completion is required. |
| R2 | A successful `resources/read` returns one text item with the requested canonical URI and JSON MIME type. Its parsed JSON has `schemaVersion: 1`, all compact `entries`, accurate `count`, `contractVersion`, `sourceHash` and `guideSource: "bundled"`. Entries and their ordering equal the unfiltered, fully delivered `component_catalog` tool result for the same bundle. Reuse the existing catalogue projection, extracting a small shared helper only if necessary. Return no full guides, rules, API tables or capability dump, and create no second inventory. Exclude tool-only `stage`, `workflowId` and search fields. The acceptance expectation derives the entry count from the bundled guides rather than hard-coding 41. |
| R3 | Preserve the no-target catalogue evidence in resource JSON: `status: "available"`, `contractCompatibility: "unknown"`, `contractProvenance: "bundled-verified"`, its existing provenance details, accurate `checksPerformed` and `evidenceSources`, `uncheckedAreas`, `coverageStatus: "complete-bundled-catalogue"` and `blockedChecks`. Explicitly identify consumer compatibility/provenance and browser/accessibility behavior as unchecked. Resource discovery and reads ignore the process working directory and the existing CLI project-root default, inspect no consumer files, and execute no project scripts or component initialization. A read does not verify an installed consumer version. |
| R4 | Accept only the registered current-snapshot URI. Unavailable versions, wrong hashes, extra paths, query/fragment selectors and unrelated schemes return an explicit resource-not-found error with code `-32002`; invalid request parameters use the SDK's request validation. Never normalize an unavailable identity to the current snapshot, fetch upstream documentation, translate URI content into a filesystem path, or expose arbitrary local files. Resource identity and JSON version/hash agree. URI examples use the advertised identity; no historical aliases or unversioned `latest` resource are added. |
| R5 | Apply `EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES`, default 65,536, to the entire final serialized successful `resources/read` result: `Buffer.byteLength(JSON.stringify(result), 'utf8') <= budget`. Include `contents`, URI, MIME type, escaped JSON text, metadata and any SDK-added result fields. Exclude the outer JSON-RPC envelope and transport framing. Successful JSON includes the existing `responseBudget` shape with effective `maxBytes`, `delivery: "complete"` and empty `omissions`/`recoveries`. Deliver every entry whole. If it cannot fit, return JSON-RPC error `-32001` with no successful resource result. Error data identifies the canonical resource URI, effective budget, required result bytes and the operator setting to increase. Restarting with that sufficient budget allows the same URI to return the complete resource. Protocol errors are outside the successful-result byte bound, including budget 1. Do not silently truncate entries or promise same-budget whole-catalogue recovery. Discovery lists, tool lists and templates lists are outside this content budget; document that distinction. |
| R6 | Preserve all eight tools, original request forms, aliases, selectors, search ordering, tool response budgets, compatibility/provenance behavior, disabled tools, static QA and command restrictions. Resource operations remain independent of tool skip flags. Keep JavaScript, installed dependencies, runtime support, generated-data ownership and independent package versions. The installed MCP tarball must advertise and read the resource without repository source files or build scripts. Use existing bundled JSON; regenerate owned derived files only if their source inputs change. |
| R7 | Update the MCP README and unreleased changelog alongside implementation. Document resource listing/reading, URI identity, current-bundle scope, JSON fields, evidence limits, byte measurement and operator recovery. Preserve contributor checks, focused MCP checks, isolated packages and applicable repository CI/review before merge. Record results, failures and skips truthfully; no browser or visual pass follows from a resource read or specification review. |

## Implementation boundaries and references

Relevant inspected files are `mcp/expressivecss/server.js`, `mcp/expressivecss/smoke.mjs`, `mcp/expressivecss/README.md`, `mcp/expressivecss/CHANGELOG.md` and `scripts/verify-packages.mjs`. The package verifier already executes the installed MCP smoke suite outside the checkout. Its existing path can cover this addition without another test runner.

The [SDK v1 resource guide](https://ts.sdk.modelcontextprotocol.io/server#resources) documents fixed-URI registration and resource contents. The [MCP resource specification](https://modelcontextprotocol.io/specification/2025-11-25/server/resources) defines discovery, reads and resource-not-found errors. These sources informed the protocol design. Confirm exact SDK 1.31.0 behavior from the installed lockfile version during implementation; no SDK migration is authorized.

Follow [data ownership](../tech-stack.md#data-ownership), [CONTRIBUTING.md](../../CONTRIBUTING.md) and [SECURITY.md](../../SECURITY.md). The code graph reported stale MCP source metadata, so current file inspection supplied the implementation evidence. No graph rebuild is part of this specification.

Excluded work includes framework behavior, new dependencies, HTTP transport, historical bundle storage, release/version changes, resource search/pagination, component guides as resources, completion and publication. Phases 9 and 10 retain their roadmap scope. No specification decision remains open. The user authorized implementation on 2026-10-06. Live checks, contributor verification and isolated packages passed. See [execution evidence](validation.md#execution-evidence-on-2026-10-06).

## Implemented choices on 2026-10-06

The static resource projects `buildCatalogPayload()` without a target and removes tool-only fields. Its URI and JSON use the bundled contract version/hash. SDK v1 registration advertises resource listing and supplies the normal list/template handlers. A focused `resources/read` handler requires the exact advertised identity and returns `-32002` for unknown resources. Installed SDK 1.31.0 otherwise normalizes URLs and returns `-32602` for missing resources. Its request-schema failures return `-32603`; R4's wording now names SDK request validation to match the inspected behavior.

The existing stdio send guard tracks guidance tools and resource reads separately. It measures successful resource results after SDK handling and replaces oversized results with `-32001`. Recovery sizing includes all result fields and adjusts the serialized budget field until the advertised increase is sufficient. No partial resource contents are returned. The expanded smoke suite measures actual wire results and executes operator-increase recovery, including a multibyte/escaped metadata fixture.

No dependency, generated data, framework behavior, package version or roadmap state changed. Changes remain uncommitted. External CI and applicable review remain pending; no push, pull request, merge or publication ran.
