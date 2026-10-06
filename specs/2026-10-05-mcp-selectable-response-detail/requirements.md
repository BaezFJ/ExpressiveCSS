# MCP selectable response detail

Date: 2026-10-05
Roadmap phase: Phase 6, selectable response detail
Branch: `feature/2026-10-05-mcp-selectable-response-detail`
Base: local `origin/master` at `cecd86d33cf0c9f078fe56e96dc213d0f5b7d251`
Status: implemented and locally verified; required CI and review pending

Follow the [mission's core workflow](../mission.md#core-workflow), [compatibility and trust boundaries](../tech-stack.md#compatibility-and-trust-boundaries), and [roadmap Phase 6](../roadmap.md#phase-6-selectable-response-detail). Phases 1 through 5 are implemented at the base. Phase 6 is the earliest unstarted phase. Earlier validation records retain pending external-review language; this specification does not independently verify GitHub review outcomes.

## Behavior at the specification base

`mcp/expressivecss/server.js` registers eight tools. `componentSyntaxExpertHandler()` resolves exact component names against the cached bundled catalogue, evaluates target version and provenance, and calls `summarizeGuide()` for each found guide. Every component includes identity and source fields, contract prose limited to 900 characters, a syntax example limited to 3,000 characters, complete rule records, and a capability record or null. The optional `sections` selector returns complete documented Options and Methods or explicit absence. Explicit foundation requests use the same capability safety checks.

The syntax registration currently uses `stageOutputSchema`, which validates shared evidence fields and permits additional fields. There is no response-detail selector or component-capability selector. `component_catalog` already provides compact listing and search; its behavior is outside this change. `toToolResult()` produces both JSON text and structured content from one payload.

## Confirmed decisions

The user confirmed Phase 6 from the stated base and three ordered task groups: live regressions, shared retrieval and schema changes with documentation, then contributor and isolated-package verification.

Detailed output remains the default to preserve existing clients. Compact output retains complete rules, component identity and shared evidence while omitting contract prose and syntax examples. Explicit Options and Methods requests work in either mode. Component capability detail defaults off in compact and on in detailed, with an explicit selector to override either default. Explicit foundation requests remain effective. Schema-validated metadata discloses intentional omissions.

Argument names and the metadata shape below are implementation choices within that confirmed scope. They reuse existing parsing, catalogue loading, evidence construction and serialization. No dependency or new documentation inventory is needed.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | Add optional `detail` with values `compact` and `detailed` to `component_syntax_expert`, defaulting to `detailed`. Add optional boolean `includeCapabilities`; when omitted, resolve it to false for compact and true for detailed. Reject unsupported detail values and nonboolean capability selectors through the existing validated input path. Preserve all existing selectors, limits, exact lookup, tool names and aliases. |
| R2 | Both modes return every applicable rule in source order, with identical text and normative rule IDs. Preserve generic fallback advice for guides without rule bullets and identify it as existing nonnormative advice. Each found entry keeps `file`, `slug`, `title`, `source`, `docs` and `rules`. Compact omits `contract` and `syntax` properties. Detailed preserves their current values and character limits. Requests that omit the new selectors retain every existing field and value; new detail and omission metadata may be additive. |
| R3 | Honor `sections` independently of detail. Requested Options and Methods retain complete bundled Markdown and the existing documented/absent record shape in both modes. Unrequested API properties remain absent. With effective `includeCapabilities: true`, preserve each component's existing capability record or null, including version/provenance blocking. With false, omit that property. This selector affects only component capability detail; explicitly requested `foundations` retain existing results and blocking behavior in either mode. |
| R4 | Ordinary syntax results include effective top-level `detail` and `includeCapabilities`. Each found component adds `omittedFields`, an array of records with `field` from `contract`, `syntax`, `options`, `methods`, `capability` and `reason` from `compact-detail`, `not-requested`. Compact contract/syntax omissions use `compact-detail`; unselected API sections and disabled capability detail use `not-requested`. Return each intentionally omitted field once in the listed field order. A requested API section reported absent, or an included capability reported null, is not an omission. Publish and apply a syntax-specific output schema validating these new fields without tightening unrelated tools. Preserve the disabled-tool blocked envelope without inventing successful retrieval metadata. Document recovery through `detail: "detailed"`, `sections`, and `includeCapabilities: true`. These records describe selector omissions only; they do not claim an aggregate response budget or complete contract/syntax prose. |
| R5 | Detail selection cannot change component lookup, missing-name suggestions, found counts, compatibility, provenance, availability or rule-coverage outcomes. Preserve the shared evidence envelope, snapshot identifiers, top-level `capabilityEvidence`, read-only annotations and evidence limitations. Evidence must describe checks actually performed. Omission of optional component capability data cannot imply failed compatibility, and selecting it cannot bypass blocked capability evidence. Text and structured representations agree. Keep foundation-only, empty, unknown-name, mixed found/missing and disabled-tool behavior valid. No request initializes components, executes scripts, writes consumer files or fetches guidance. |
| R6 | Document defaults, selector precedence, compact/detailed field differences, intentional omission reasons, recovery examples and existing evidence limits in the MCP README and unreleased changelog. Extend the live smoke suite and its installed-tarball execution. Contributor verification, MCP tests and isolated packages must pass before submission; required CI, resolved conversations, an up-to-date branch, accepted API scope and applicable repository review must be satisfied before merge. |

## Examples and implementation boundaries

```json
{ "components": ["cards"], "detail": "compact" }
```

This returns complete Cards rules and identity, shared evidence, and omission records for contract, syntax, unrequested API sections and component capability detail.

```json
{
  "components": ["date-picker", "autocomplete"],
  "detail": "compact",
  "sections": ["options", "methods"],
  "includeCapabilities": true
}
```

Explicit API sections and component capability records remain requested even in compact mode. Capabilities still require compatible version/provenance evidence. A foundation-only request with `includeCapabilities: false` continues to retrieve the explicitly named foundations.

Use the shared implementation in `mcp/expressivecss/server.js`, live checks in `mcp/expressivecss/smoke.mjs`, and documentation in `mcp/expressivecss/README.md` and `mcp/expressivecss/CHANGELOG.md`. Keep projection in the existing guide summary/handler and use installed Zod for schema validation. Avoid a second formatter or a new mode for catalogue discovery.

Follow [data ownership](../tech-stack.md#data-ownership) and [SECURITY.md](../../SECURITY.md). Change source/generator inputs only when necessary, regenerate with `npm run build:semantics` and `npm run build:skill` if they change, and never hand-edit generated copies. Preserve framework behavior, markup compatibility, accessibility contracts and command restrictions.

Aggregate serialized-result limits, removal of the existing prose/example clamps, budget truncation/recovery, resources and resource completion remain in later work. New dependencies, transport changes, syntax alias expansion, historical bundles and publication are excluded. Detailed means the existing richer response with selected API detail, not the full unbounded guide.

## Open decisions and execution boundary

None. All three interview groups are confirmed. The user authorized implementation on 2026-10-05. Shared retrieval, schema changes, documentation and live MCP checks are complete. Contributor verification, MCP smoke tests and isolated-package checks passed. See [execution evidence](validation.md#execution-evidence-on-2026-10-05). Required CI and repository review remain pending. Commit, push, pull request, merge and release require separate instructions. Constitution and roadmap completion state remain unchanged.
