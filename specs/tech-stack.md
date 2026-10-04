# MCP technical constraints

The [mission](mission.md) uses the existing MCP implementation and its generated documentation. The interview confirmed retaining the current stack and boundaries; no migration is planned.

## Current stack and agreed use

| Technology or boundary | Current implementation | Use in the planned work |
| --- | --- | --- |
| JavaScript and Node.js | ES modules in `mcp/expressivecss/server.js`; Node 24 for contribution, with package support `^22.22.2 || ^24.15.0 || >=26.0.0` | Retain the language and runtime range. Use native Node facilities before adding dependencies. |
| MCP SDK and Zod | `@modelcontextprotocol/sdk` declared as `^1.30.0`, Zod as `^4.6.5`; high-level tool registration and validated requests | Reuse registration, output schemas, resource templates and completion support in the installed SDK. |
| jsdom | Declared as `^30.1.1`; supports existing heuristic static semantics checks | Preserve static inspection behavior and its limits. The documentation improvements do not require another parser or rule engine. |
| Generated JSON and Markdown | Bundled guides, semantics, component decisions, capabilities and contract metadata | Derive every new view from the existing sources. Reuse the in-memory catalogue; add no data service. |
| stdio and npm packaging | A client launches the self-contained MCP package; framework and MCP have independent versions | Retain local execution, package identity and independent releases within this repository. |

Dependency ranges above record the reviewed manifest, not a request to upgrade dependencies. The lockfile remains authoritative for installed versions.

## Data ownership

`semantics.json` owns markup rules. `llm.md` owns the framework API and markup reference. The docs catalogue and component decision data own their existing inventories and selection metadata. The skill generator creates component guides; `mcp/expressivecss/scripts/sync-guides.mjs` packages them with semantics, decisions, capabilities and contract metadata.

Change source or generator logic when needed, then run `npm run build:semantics` and `npm run build:skill`. Do not hand-edit committed generated copies or introduce another component inventory. Catalogue discovery, tool results and resource reads must agree on canonical names and snapshot identity.

The reviewed checkout uses `skills/expressivecss/` as the generator input. Separate work on a skill-directory migration is recorded in the shared vault but is outside this plan. Resolve paths from the actual implementation checkout before making a change.

## Compatibility and trust boundaries

Preserve all seven existing tool registrations, including `page_architect` and `page_arcjitect`, existing request forms, and the shared evidence fields. New optional arguments must not make previously valid requests invalid. If a response budget requires partial delivery, expose that condition and recovery information explicitly rather than reporting complete coverage.

Existing tools continue resolving the target package version and local contract provenance. Resources describe the server's shipped snapshot and expose its framework version and source hash. A successful resource read must not claim that an arbitrary project's installation is compatible. Only the currently bundled snapshot is required; historical documentation retrieval is outside scope.

Keep request-size limits, bounded file reads, URI validation, truthful annotations and evidence limitations. Preserve the operator-defined command-root policy, permitted scripts, environment filtering, redaction and timeout behavior. Catalogue and resource operations are read-only and must never initialize components or execute project scripts.

Response limits must account for the actual serialized result, including compatibility text and structured content. Keep essential rule records whole. When a requested result cannot fit, return explicit omissions and a supported narrower request or resource-read path. Resource reads also need a documented bound and recovery behavior.

## Testing and release checks

Extend the existing live stdio smoke test with focused checks for complete rule IDs, requested API sections, catalogue discovery, response boundaries and resource operations. Close clients, transports and temporary fixtures in `finally` blocks. Preserve negative checks for mismatched versions, invalid provenance, unknown names and denied commands.

Use `npm test --prefix mcp/expressivecss` for MCP behavior. Verify generated data with `npm run check:generated` after relevant source or generator changes. Before submitting implementation, run the contributor checks required by `CONTRIBUTING.md`, including `npm run verify`, MCP tests and `npm run verify:packages`. Do not claim browser or visual checks unless they ran.

Keep packaging self-contained: consumer execution must not require the repository's source files or build scripts. Follow `RELEASING.md` for separate MCP versioning, bundled framework-version disclosure and publication approval. Completing the roadmap prepares a releasable change; it does not authorize publication.

## Decisions for phase specification

Choose optional argument names and defaults, response-budget values and measurement details, and the versioned URI format when specifying their respective phases. These are implementation choices within the confirmed scope. No new dependency, repository split or transport migration is assumed.
