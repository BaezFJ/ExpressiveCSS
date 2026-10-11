# ExpressiveCSS MCP Server

This folder contains a self-hosted MCP server for the ExpressiveCSS design-to-QA workflow:

- **Setup Expert**
- **Rules Enforcer**
- **Creative Director**
- **Page Arcjitect** (`page_arcjitect`, with conventional `page_architect` compatibility)
- **Component Syntax Expert**
- **Quality Inspector**

The server bundles generated component guides, selection data, contract metadata, and the normative semantics data. All component guidance comes from this synchronized package data. A framework source checkout contributes only target-version and contract-provenance evidence, so local prose cannot replace the packaged guidance.

`component_syntax_expert` returns every rule from each found component's bundled Rules section, in source order. Guides without rule bullets retain generic authoring advice. Looking up rules does not establish component-rule conformance.

## Selectable syntax detail

`detail` accepts `"compact"` or `"detailed"` and defaults to `"detailed"`.
Existing request forms and defaults remain valid. Both modes retain complete
rules for delivered components, identity, sources, lookup results and shared
compatibility/provenance evidence. The aggregate budget below can omit whole
fields or components with explicit accounting.

| Component field | Compact | Detailed |
| --- | --- | --- |
| `file`, `slug`, `title`, `source`, `docs`, `rules` | Included | Included |
| `contract`, `syntax` | Omitted | Contract summary and whole syntax example, subject to budget |
| `options`, `methods` | Included only when requested through `sections` | Same |
| `capability` | Omitted by default | Included by default |

The optional boolean `includeCapabilities` overrides the component capability
default in either mode. Explicit `sections` requests work in both modes and
retain complete documented Markdown or explicit absence. Explicit `foundations`
requests remain effective even with `includeCapabilities: false`; that selector
controls only component capability records.

```json
{
  "components": ["date-picker", "autocomplete"],
  "detail": "compact",
  "sections": ["options", "methods"],
  "includeCapabilities": true
}
```

Ordinary results report effective `detail` and `includeCapabilities`. Each found
component adds `omittedFields`, with one record per intentionally omitted field:

```json
{
  "field": "syntax",
  "reason": "compact-detail"
}
```

Fields are reported in `contract`, `syntax`, `options`, `methods`, `capability`
order. Compact prose/example omissions use `compact-detail`. Unrequested API
sections and disabled component capability detail use `not-requested`. Requested
API records with `status: "absent"` and included null capability records are
delivered results, so they have no omission record. The syntax output schema
validates selector values and omission fields/reasons. Byte omissions use
`byte-budget`. A contract summary longer than 900 characters reports
`length-limit`, with its shortened prose still present. A disabled syntax tool
retains its shared blocked envelope and budget metadata without retrieval fields.

Recover omitted prose/examples with `detail: "detailed"`, API sections with
`sections`, and component capability records with `includeCapabilities: true`.
Version/provenance checks still block unsafe capability data. Detail selection
does not change compatibility or missing-name lookup. Budget omissions make
delivery partial or erroneous. Text and structured content describe the same result.

Detailed output retains the contract summary limit of 900 characters with
explicit disclosure. Read the linked component documentation for full contract
prose; increasing the byte budget does not remove this summary limit. Syntax
examples, rules and requested API sections are whole or explicitly omitted.
Generic fallback advice remains nonnormative, and retrieval does not verify
consumer interaction, visual or accessibility behavior.

## Aggregate response budget and recovery

`EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES` defaults to 65,536 bytes, or 64 KiB.
Set it in the server's environment to a positive safe integer in decimal digits.
Empty values, zero, signed numbers, fractions, whitespace, exponents and unsafe
integers fail startup. Clients cannot override this operator setting.

The budget applies to `setup_expert`, `creative_director`, `page_architect`,
`page_arcjitect`, `component_syntax_expert` and `component_catalog`, including
disabled-tool and SDK validation-error results. `rules_enforcer` and
`quality_inspector` retain their existing QA limits and evidence behavior.
The [catalogue resource](#versioned-catalogue-resource) and
[component resources](#versioned-component-resources) use the same setting to
bound successful resource-read results, with complete delivery or a protocol
error. Discovery lists are outside the content budget.

The exact measurement is `Buffer.byteLength(JSON.stringify(result), 'utf8')`.
It counts the entire wire tool-result object, including JSON escapes, text,
structured content, metadata and `isError`. These tools use compact JSON text
and duplicate the same payload in structured content. The outer JSON-RPC
envelope and stdio framing are excluded. A final transport check covers errors
the SDK creates before or after a handler runs.

Affected structured results add `responseBudget`:

| Field | Meaning |
| --- | --- |
| `maxBytes` | Effective operator budget. |
| `delivery` | `complete`, `partial` or `error` for the requested projection. |
| `omissions` | Every byte-omitted unit, with its identity, `reason: "byte-budget"` and recovery index. |
| `recoveries` | Typed retry requests or advice to increase the operator budget. |

Syntax omission identities include original request position and name, canonical
slug when known and field when applicable. Delivered components have
`requestIndex` for repeated or mixed known/unknown requests. Selector omissions
remain in `found[].omittedFields`; budget omissions also identify fields there.
Unknown components, absent API sections and blocked capabilities retain their
existing distinct meanings. `foundCount` and catalogue `count` count only
delivered records.

Reduction is deterministic. Syntax drops whole optional capability records,
contract summaries and examples before whole requested Options/Methods, then
whole components and foundations. It works backwards through each collection
so retained records preserve their original order. A delivered component always
retains all its rules in source order. Catalogue and creative reductions remove
whole trailing entries while preserving ranking. Page architecture and its
skeleton are indivisible. Setup checks can fail explicitly when they cannot fit.
Compatibility, provenance, performed checks and evidence limits remain truthful.
Budget omissions never imply complete coverage or browser approval.

For `delivery: "partial"`, execute a referenced recovery request:

```json
{
  "action": "retry",
  "request": {
    "name": "component_syntax_expert",
    "arguments": {
      "projectRoot": "/absolute/path/to/project",
      "workflowId": "example-workflow",
      "components": ["autocomplete"],
      "detail": "compact",
      "includeCapabilities": false,
      "sections": ["methods"]
    }
  }
}
```

Catalogue recovery uses an exact slug query with `limit: 1`, preserving any
explicit target. It omits the optional workflow correlation ID because
catalogue retrieval has no workflow state. Search-limit omissions and byte
omissions have separate accounting. Catalogue tool recovery adds no pagination
and does not require resource support in the client.

Creative recovery reranks a concise goal naming the omitted component with
`maxSuggestions: 1`, preserving target and workflow context. Ranking scores and
explanations can change with the narrower goal. The server offers this request
only when it returns the named suggestion whole within the same budget.

If an indivisible unit or the complete omission accounting cannot fit,
`delivery: "error"` and `isError: true` advise an operator budget increase.
Error results can retain whole reference records but make no successful-delivery
claim. If even a minimal truthful result with essential evidence cannot fit,
the server returns JSON-RPC error `-32001` with no tool-result object. The
protocol error envelope is outside the tool-result budget. Do not retry that
failure expecting same-budget success. Increase the server setting and restart,
then repeat the request. A budget of 1 is valid and exercises this failure path.

## Requested runtime API sections

To request documented runtime Options, add `sections: ["options"]`:

```json
{
  "components": ["date-picker", "cards"],
  "sections": ["options"]
}
```

Each found component adds an `options` record. A documented section returns
`{ "status": "documented", "markdown": "..." }` with its complete bundled Markdown
body, including tables and nested guidance. Datepicker includes its visibility
and docked-display options. A missing or empty section returns
`{ "status": "absent", "markdown": null }`; this means the bundled guide has no
documented Options section, not that the component has no configuration.
Cards is one such guide.

To request documented runtime Methods, use `sections: ["methods"]`. Select both
sections with `sections: ["options", "methods"]`:

```json
{
  "components": ["autocomplete", "cards"],
  "sections": ["options", "methods"]
}
```

Each found component adds a `methods` record when selected. Documented Methods
return their complete bundled Markdown in the same `{ "status": "documented",
"markdown": "..." }` shape. Autocomplete includes `.destroy()` and its cleanup
guidance. A missing or empty Methods section returns `{ "status": "absent",
"markdown": null }`. This describes the guide's documentation; it does not
establish that the runtime has no methods. Cards reports absence.

Existing requests such as `{ "components": ["date-picker"] }` retain their fields.
Omitting `sections` or using `sections: []` omits both optional records. Options-only
selection omits `methods`; Methods-only selection omits `options`. The selector
accepts either supported name once, or both in either order with the same result.
Unknown names, duplicate entries and arrays over two entries are rejected.
Component and foundation request limits remain unchanged. Unknown component names
keep their existing `missing` result.

Requested Options and Methods remain bundled reference data when target-version or
provenance checks block a result. They do not change compatibility, capability
evidence or availability, and do not verify runtime or accessibility behavior.

A resolved version matching the bundled contract reports `documentationMode: "bundled"` and `bundledContractSafe: true`. `documentationSources.bundled` identifies the contract version and source hash. This resolver does not verify the public website, so `currentDocsSafe` and `documentationSources.current.available` remain false even on a match. Use matching bundled guidance, installed sources, or a proven release tag for version-specific claims.

## Material capability evidence

`component_syntax_expert` adds a scoped `capability` record to each found component
when component capability detail is enabled. Detailed mode enables it by default;
compact mode omits it by default. `includeCapabilities` overrides either default.
For foundations, pass `foundations: ["typography", "shape", "motion"]`; component
names are optional for this request. Results distinguish documented scope,
pinned source review, feature/integration gaps, mapped checks and recorded results.
Version or contract-provenance failures block capability results.

`capabilityEvidence` identifies the bundled review snapshot and browser run.
This evidence concerns the reviewed checkout. It does not verify the installed
package's implementation, the consumer's browser, or full Google specification
parity. Changed inputs invalidate evidence during generation; serving the package
does not rerun tests or re-review sources. The optional Markdown
[roadmap](https://github.com/BaezFJ/ExpressiveCSS/blob/master/skills/expressivecss/references/capability-roadmap.md) and packaged
`capability-roadmap.json` come from the same catalogue.

## Component catalogue

Call `component_catalog` with `{}` to list every component in the server's
current bundle. No design goal or component name is required. To also check a
consumer project, supply an explicit target:

```json
{ "projectRoot": "/absolute/path/to/consumer" }
```

An optional `workflowId` associates the result with other tool calls. `entries`
are sorted by canonical `slug`, and `count` reports their total. Each entry has:

| Field | Source and meaning |
| --- | --- |
| `slug`, `title` | Canonical guide name and title. Pass the slug to `component_syntax_expert`. |
| `description` | First nonempty decision `useWhen` string, then `jobs`, or null. |
| `aliases` | Existing decision aliases, or an empty array. These describe the component; they do not extend exact syntax lookup. |
| `runtime` | Existing runtime ownership value, or null. |
| `docs` | Bundled guide's documentation link, or null. |

The result includes `contractVersion`, `sourceHash` and `guideSource: "bundled"`
to identify the shipped snapshot. It contains compact metadata, with no full
syntax, rules, runtime API sections or capability records. Retrieve guidance
through `component_syntax_expert`. Listing includes component guides only;
foundation guidance remains available through that tool's `foundations` selector.

Without `projectRoot`, listing reports `status: "available"` and
`contractCompatibility: "unknown"`. It does not inspect the working directory
or a CLI project-root default. `contractProvenance: "bundled-verified"` concerns
the packaged snapshot, and `uncheckedAreas` names target compatibility and
provenance as unperformed checks. With an explicit target, existing version and
provenance checks can return `status: "blocked"`. The complete reference entries
remain available with the same bundled version and hash.

`coverageStatus: "complete-bundled-catalogue"` describes delivery of all entries.
It does not establish consumer compatibility, browser behavior or accessibility
approval. Calls are read-only and execute no project scripts.

### Search the catalogue

Supply `query` to search canonical slugs, titles, aliases and compact descriptions:

```json
{ "query": "navbar", "limit": 1 }
```

This discovers `app-bar` with `matchType: "exact-alias"`. Pass the returned
canonical slug to `component_syntax_expert`; search does not expand that tool's
alias lookup. Search also accepts exact names such as `app-bar` and descriptive
queries such as `screen-level actions`.

`query` accepts at most 256 characters before trimming and rejects empty or
whitespace-only strings. `limit` must be an integer from 1 through 50 and defaults
to 10 for search. Without `query`, the tool still returns the entire catalogue;
a valid supplied limit has no effect on listing.

Names use the existing case-insensitive normalization: runs of characters other
than ASCII letters and digits become hyphens, with leading/trailing hyphens removed.
Search sorts exact slug/title matches first, exact aliases second, then heuristic
matches. Within each group, entries are sorted by canonical slug. A heuristic
match contains every normalized query token somewhere in the searchable fields,
including one- and two-character tokens. Tokens can match partial words or span
fields. These suggestions do not establish which component a design requires.
Queries that normalize to no tokens return no matches. Full guide bodies,
capability records and extra decision descriptions are not searched.

Search entries retain the listing metadata and add `matchType`, which is
`exact-name`, `exact-alias` or `heuristic`. Each component appears once with its
strongest match type. Search results also include:

| Field | Meaning |
| --- | --- |
| `query`, `limit` | Trimmed query and effective search limit. |
| `count`, `totalMatches` | Number delivered and total matches before limiting. |
| `omittedCount`, `truncated` | Matches omitted by the search result-count limit, separately from the byte budget. |
| `coverageStatus` | `complete-search-results` for all matches, or `partial-search-results` when the limit omitted matches. |

For example, `{"query":"no-catalogue-match-zzzz"}` returns `entries: []`,
zero counts, `truncated: false` and complete search coverage. If a query returns
more than its limit, increase `limit` up to 50 or narrow the query to retrieve
omitted entries. Search coverage concerns matching entries, not the whole
catalogue. Further byte omissions appear in `responseBudget`; `count` reflects
the records actually delivered and coverage becomes `partial-response-budget`
or `response-budget-error` when necessary.

Search retains the listing's bundled version/hash and optional-target evidence.
An omitted target leaves compatibility unknown; an incompatible explicit target
remains blocked while reference matches stay available. Empty results and
truncation do not change compatibility outcomes.

## Versioned catalogue resource

Clients with resource support can discover and read the current bundled snapshot
over the same stdio connection. The resource is named `component_catalog` and
has MIME type `application/json`. Use the advertised URI:

```js
const { resources } = await client.listResources();
const catalogue = resources.find((resource) => resource.name === 'component_catalog');
const result = await client.readResource({ uri: catalogue.uri });
const snapshot = JSON.parse(result.contents[0].text);
console.log(snapshot.contractVersion, snapshot.sourceHash, snapshot.entries);
```

The URI format is
`expressivecss://catalogue/<framework-version>/<source-hash>`. The framework
version is a URI-encoded path segment and the complete hash comes from the
shipped contract. It identifies those contract sources; it is not a digest of
the serialized resource text. Only the current shipped bundle is available.
The URI's version and hash agree with `contractVersion` and `sourceHash` in JSON.
There is no unversioned `latest` alias, historical lookup or search selector.
Resource reads require the exact advertised URI.
Unknown versions/hashes, query/fragment selectors and unrelated URIs return
resource-not-found error `-32002`. Invalid request parameters fail through the
SDK's request validation. The installed SDK 1.31.0 reports request-schema
failures with protocol error `-32603`.

Successful reads return one text item with that URI and JSON MIME type. The
JSON has `schemaVersion: 1`, `entries`, `count`, `contractVersion`, `sourceHash`
and `guideSource: "bundled"`. Entries contain the same compact fields and slug
ordering as a complete unfiltered catalogue tool result. They contain no full
component guide or capability dump. Tool-only stage/workflow and search fields
are absent. Resource operations do not depend on tool skip flags.

The JSON retains catalogue evidence fields: `status`, `checksPerformed`,
`evidenceSources`, `uncheckedAreas`, `contractCompatibility`,
`contractProvenance`, `contractProvenanceDetails`, `coverageStatus` and
`blockedChecks`. Compatibility is always `unknown`; `bundled-verified`
provenance concerns the packaged snapshot. Reads inspect no consumer files,
ignore the working directory and CLI project-root default, and execute no
project scripts or components. Complete catalogue coverage does not establish
consumer compatibility, browser behavior or accessibility approval.

### Resource-read budget and recovery

Successful resource reads share `EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES`, default
65,536 UTF-8 bytes. Measure the entire final `resources/read` result with
`Buffer.byteLength(JSON.stringify(result), 'utf8')`. This includes the contents
array, URI, MIME type, escaped JSON text, metadata and any SDK-added result
fields. The outer JSON-RPC envelope and stdio framing are excluded. Resource
JSON includes `responseBudget` with the effective `maxBytes`,
`delivery: "complete"` and empty `omissions`/`recoveries` arrays.

Every successful read delivers every entry whole. If that cannot fit, the
server returns JSON-RPC error `-32001` without a successful resource result.
Error data has `uri`, `maxBytes`, `requiredBytes` and
`setting: "EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES"`. The required size includes
the retry budget field's own bytes. Set the operator setting to at least
`requiredBytes`, restart the server and read the same advertised URI to
retrieve the complete catalogue. For example, in a contributor checkout:

```sh
# Replace 100000 with the requiredBytes from the error.
EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES=100000 node mcp/expressivecss/server.js
```

In an MCP client configuration, update that server's environment and reconnect
instead. A narrower catalogue tool query remains an option when only one entry
is needed, but it does not recover the whole resource at the same small budget.
Protocol errors are outside the successful-result budget, including budget 1.
`resources/list`, `resources/templates/list` and `tools/list` are discovery
operations outside this content budget; resource discovery remains available
when a read cannot fit. Subscription support is not advertised.

## Versioned component resources

Component guides are available as resources of the same bundled snapshot. Two
templates appear in `resources/templates/list`, both with MIME type
`application/json`:

| Template | URI |
| --- | --- |
| `component_guide` | `expressivecss://components/<framework-version>/<source-hash>/{slug}` |
| `component_guide_section` | `expressivecss://components/<framework-version>/<source-hash>/{slug}/{section}` |

The version and hash are fixed to the shipped contract, as in the catalogue
URI. `resources/list` lists one whole-guide URI per bundled component, sorted by
slug, after the catalogue. Section URIs are not listed. Build them from the
template with a canonical slug and one of `contract`, `syntax`, `rules`,
`options` or `methods`:

```js
const { resourceTemplates } = await client.listResourceTemplates();
const section = resourceTemplates.find((template) => template.name === 'component_guide_section');
const uri = section.uriTemplate.replace('{slug}', 'date-picker').replace('{section}', 'options');
const options = JSON.parse((await client.readResource({ uri })).contents[0].text).options;
```

Every read returns one text item with JSON containing `schemaVersion: 1`,
`slug`, `title`, `docs` (the documentation page, as in catalogue entries),
`repositorySource` (the page source in the repository), `contractVersion`,
`sourceHash` and `guideSource: "bundled"`. A whole-guide read adds all five
sections. A section read adds `section` and only that section's field:

- `contract` is the complete Contract text. The syntax tool shortens long
  contracts to 900 characters; resources do not.
- `syntax` is `{ language, example }`, the same as detailed syntax tool output.
- `rules` is the complete ordered rule list returned by the syntax tool.
- `options` and `methods` are `{ status, markdown }`. A guide without that
  section returns `status: "absent"` and `markdown: null`.

The JSON carries the same evidence fields as the catalogue resource.
Compatibility is always `unknown`, and `coverageStatus` is
`complete-bundled-guide` or `complete-bundled-guide-section`. Reads inspect no
consumer files, ignore the working directory, CLI project-root default and tool
skip flags, and execute no project scripts or components.

Reads accept only the exact URIs the templates describe. Catalogue aliases such
as `datepicker`, case variants, unknown slugs or sections, other versions or
hashes, extra or empty segments, trailing slashes, percent-encoded variants and
query or fragment selectors return `-32002`. Use `component_catalog` to resolve
an alias to its canonical slug, or [complete](#complete-resource-arguments) a
slug prefix.

### Component read budget and recovery

Component reads use the [resource-read budget](#resource-read-budget-and-recovery)
and its measurement. A successful read always delivers every requested section
whole. If a read does not fit, the server returns `-32001` with no contents.
The error data has `uri`, `maxBytes`, `requiredBytes`, `setting`,
`recoveries` and `unrecoverableSections`:

- For a whole-guide URI, `recoveries` lists the section URIs whose complete
  reads fit the current budget, in section order. Read those on the same
  connection. `unrecoverableSections` names the sections that do not fit.
- For a section URI, `recoveries` is empty and `unrecoverableSections` names
  that section. Its `requiredBytes` is the budget that section needs.

Restart with `EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES` of at least `requiredBytes`
to read a URI that cannot fit. The largest bundled guide fits the default
budget, so section recovery matters only under a smaller operator budget.

### Complete resource arguments

The server advertises the `completions` capability. `completion/complete`
completes `slug` on both component templates and `section` on
`component_guide_section`. Pass the exact `uriTemplate` string from
`resources/templates/list` as `ref.uri`:

```js
const { resourceTemplates } = await client.listResourceTemplates();
const guide = resourceTemplates.find((template) => template.name === 'component_guide');
await client.complete({ ref: { type: 'ref/resource', uri: guide.uriTemplate }, argument: { name: 'slug', value: 'ca' } });
// { completion: { values: ['cards', 'carousel'], total: 2, hasMore: false } }
```

A value matches names that start with it, ignoring case. Slugs come back in
`resources/list` order, and an empty value returns all of them. Sections come
back in the order `contract`, `syntax`, `rules`, `options`, `methods`, whatever
slug `context.arguments` holds. Only canonical slugs match, so `datepicker`
returns no values while `date` returns `date-picker`. The SDK returns at most
100 values, with `total` matches and `hasMore` set when more matched. Every
current result fits.

- A value with no matches returns `values: []`, `total: 0` and
  `hasMore: false`.
- Other argument names, such as `version`, and the fixed catalogue URI return
  `values: []` and `hasMore: false` without `total`.
- A `ref.uri` that is not one of the two current template strings, such as
  another version or hash, returns `-32602`. So does a `ref/prompt` reference,
  because the server has no prompts.

Completion uses the bundled catalogue loaded at startup. It reads no project
files and runs no commands, and it stays outside the
[content budget](#resource-read-budget-and-recovery) like resource listing.
Completion covers resource template arguments only. MCP does not complete tool
arguments, so `component_syntax_expert` and other tools still need canonical
names or aliases, which `component_catalog` lists.

## Run it locally

The server supports Node `^22.22.2 || ^24.15.0 || >=26.0.0`, matching its `jsdom` runtime dependency.
When upgrading, update the Node executable used by your MCP client before
reinstalling the server. Node 20 and earlier Node 22/24 patch releases are no
longer supported. For a contributor checkout, use the latest Node 24 release.

```bash
cd mcp/expressivecss
npm ci
node server.js
```

The MCP server uses stdio. Normally the MCP client launches it; running the command directly is useful only as a startup check.

Run the complete live protocol smoke test with:

```bash
npm test
```

## Tools

| Tool | Purpose |
| --- | --- |
| `setup_expert` | Resolves the installed ExpressiveCSS version, contract compatibility, setup, and repository artifacts |
| `rules_enforcer` | Checks authored semantics and legacy/forbidden patterns, and looks up component guidance without claiming component-rule validation |
| `creative_director` | Suggests components from the generated decision catalogue, with uncertain fuzzy matches labelled as fallback |
| `page_arcjitect` | Workflow stage returning page sections, landmarks, and a semantic skeleton |
| `page_architect` | Conventional spelling for the same page architecture tool; component names must resolve exactly |
| `component_syntax_expert` | Returns complete rules, selectable syntax/capability detail and requested documented Options and Methods for components |
| `component_catalog` | Lists or searches compact bundled component metadata with labelled matches, result limits, snapshot identity and optional target compatibility checks |
| `quality_inspector` | Runs scoped static checks and optional commands (`npm run typecheck`, `npm run test`), then names every uninspected review area |

Static findings are heuristic and require source or runtime confirmation before remediation. A clean static check is reported as `staticStatus: "heuristic_pass"`; any overall MCP `pass` applies only to `checksPerformed`. Neither proves visual hierarchy, responsive rendering, focus behavior, motion, contrast, screen-reader announcements, or component-rule conformance unless separate evidence covers those areas. Read `uncheckedAreas`, `blockedChecks`, `coverageStatus`, `contractCompatibility`, and `contractProvenance` before using a result in a finish review.

`creative_director` and both page architect spellings resolve the target ExpressiveCSS version before reading current contract guidance. They return no recommendations or architecture when the version is mismatched or unresolved, when local contract provenance is missing, stale, invalid, or divergent from the bundled package contract, or when an architecture request contains an inexact component name. Fuzzy creative matches remain labelled `confidence: "fallback"`; page architecture never accepts them silently.

When checking a framework source target, the server accepts only the generated contract's canonical source list. It resolves the real project and source paths, rejects symbolic links and non-regular files, and caps each source at 2 MiB and the set at 8 MiB. It recomputes provenance for each target-project check in manifest order with the generator's SHA-256 input format, `source path + NUL + file content + NUL`. The verified local manifest must also match the bundled package's framework version and source hash because the MCP serves bundled guidance. Contract-dependent output is blocked when the source set is invalid, missing, oversized, stale, or divergent. Invalid source paths never produce a computed hash. Generated data shipped in this package reports `contractProvenance: "bundled-verified"` because package consumers do not receive the framework source files.

Static inspection uses descriptor-level, no-follow bounded reads and rechecks file identity after each read. It caps files at 2 MiB each and 16 MiB per request by default, stops after 200 issues per file or 1,000 per request, and applies a five-second scan budget. Any unread, changed, over-budget, or partially scanned file appears under `filesUninspected`, which prevents a pass.

## Command-line lint and agent hook

`expressivecss-lint` runs the same static checks as `rules_enforcer` (bundled
semantics rules, retired markup patterns, initialization checks) without
an MCP client. It exits 1 when it finds anything, so it fits `pre-commit` and CI:

```bash
npx --package @expressivecss/mcp-server expressivecss-lint src/pages/*.astro src/components/*.jsx
```

`--hook` reads a Claude Code `PostToolUse` payload on stdin, lints
`tool_input.file_path` when it is a markup file (`.html`, `.astro`, `.jsx`,
`.tsx`, `.vue`, `.svelte`), and exits 2 with the findings on
stderr. Claude Code feeds that output back to the agent, so every edit is
checked without the agent choosing to call a tool. Add to the consuming
project's `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "npx --package @expressivecss/mcp-server expressivecss-lint --hook" }
        ]
      }
    ]
  }
}
```

Files must be regular files inside the working directory and at most 2 MiB;
symbolic links, anything else, and an inspection that stops early (over
4,000 tags, or the five-second budget) are reported as findings rather than
passed. Agents without hook support get the same enforcement from the
`pre-commit` or CI invocation above. The checks are heuristic: JSX, Astro, Vue, and Svelte
files are parsed as HTML after `className` is rewritten to `class`, so
markup built from expressions can escape a selector rule, and markup kept in
a string prop (this repository's docs pages pass examples through
`<Code code={...}>`) is parsed as if it were inline, which produces false
findings. Semantics findings report the line and column of the element's
start tag. Elements the parser creates itself, such as the `<p>` implied by a
stray `</p>`, have no start tag and report 1:1, as do all findings in very
large files with thousands of tags. After the `className` rewrite, later
columns on the same line read four lower per rewritten attribute.

## Consumer browser scenarios

`quality_inspector` accepts `runType: "consumer"` with `runCommands: true` to run
only the consuming project's `verify:expressivecss` package script. Bind that
script to the skill's portable `scripts/verify-consumer.mjs`, a reviewed scenario,
and an already-running local development server. The consumer supplies its
existing `@playwright/test` and Chromium. MCP adds no browser dependency.

The existing operator root allowlist, environment filtering, output redaction,
and command timeout apply. No arbitrary command text or script name is accepted.
A disabled `runCommands` flag never launches the script. A missing or failed
script cannot pass command verification. Project scripts and their printed claims
are untrusted evidence; inspect the independently collected report and captures.
`reviewComplete` remains false, and uninspected review areas remain explicit.
See the skill's `references/consumer-verification.md` for the scenario format,
network limits, evidence handling, and bounded repair workflow.

## Environment variables

- `EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES`, default `65536`.
- `EXPRESSIVECSS_MCP_MAX_COMPONENT_RESPONSE_CHARS`
- `EXPRESSIVECSS_MCP_MAX_COMPONENT_SKIPS`
- `EXPRESSIVECSS_MCP_QA_MAX_FILES`
- `EXPRESSIVECSS_MCP_QA_MAX_MB`
- `EXPRESSIVECSS_MCP_QA_MAX_TOTAL_MB`
- `EXPRESSIVECSS_MCP_COMMAND_TIMEOUT_MS`
- `EXPRESSIVECSS_MCP_ALLOWED_COMMAND_ROOTS`
- `EXPRESSIVECSS_MCP_ALLOWED_PROJECT_ROOTS`
- `SKIP_SETUP_EXPERT`
- `SKIP_RULES_ENFORCER`
- `SKIP_CREATIVE_DIRECTOR`
- `SKIP_PAGE_ARCHITECT`
- `SKIP_COMPONENT_SYNTAX_EXPERT`
- `SKIP_QUALITY_INSPECTOR`

Set any skip flag to `true` to disable that stage from doing work.

`EXPRESSIVECSS_MCP_MAX_COMPONENT_RESPONSE_CHARS` is retained for configuration
compatibility and the legacy `maxCharactersPerComponent` metadata. It no longer
clips syntax examples and does not bound tool results. Use the byte setting for
aggregate guidance limits. QA command-output limits remain separate.

Command execution is denied by default. To let `quality_inspector` honor `runCommands: true`, the MCP operator must set `EXPRESSIVECSS_MCP_ALLOWED_COMMAND_ROOTS` when launching the server. Use platform path separators for multiple roots, or a JSON array of absolute roots:

```text
EXPRESSIVECSS_MCP_ALLOWED_COMMAND_ROOTS=/srv/projects/site-a:/srv/projects/site-b
EXPRESSIVECSS_MCP_ALLOWED_COMMAND_ROOTS=["/srv/projects/site-a","/srv/projects/site-b"]
```

The real `projectRoot` must equal or be contained by one of those roots. A tool caller cannot expand this policy. Allowed commands receive only the executable path, system/temp/locale variables, `CI=1`, `NO_COLOR=1`, and `HOME`/`USERPROFILE` reset to the project root. API keys, tokens, passwords, cloud credentials, SSH agent variables, and other MCP-process environment values are not forwarded.

Any tool accepts a `projectRoot` by default, and `quality_inspector` reports the existence, size and SHA-256 of files under it. To limit which directories a caller can name, set `EXPRESSIVECSS_MCP_ALLOWED_PROJECT_ROOTS` in the same format. A `projectRoot` whose real path is outside every listed root fails with a tool error. An empty or invalid value denies every caller-supplied root. The default root, from `--project-root` or the working directory, is not checked.

## Sample client configuration

### `mcp/expressivecss/mcp.json`

```json
{
  "mcpServers": {
    "expressivecss-mcp": {
      "command": "npx",
      "args": ["-y", "@expressivecss/mcp-server@latest"],
      "env": {
        "EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES": "65536",
        "EXPRESSIVECSS_MCP_MAX_COMPONENT_RESPONSE_CHARS": "24000",
        "EXPRESSIVECSS_MCP_MAX_COMPONENT_SKIPS": "7",
        "EXPRESSIVECSS_MCP_QA_MAX_FILES": "300",
        "EXPRESSIVECSS_MCP_QA_MAX_MB": "2",
        "EXPRESSIVECSS_MCP_ALLOWED_COMMAND_ROOTS": "/absolute/path/to/allowed/project"
      }
    }
  }
}
```

The packaged config targets the npm release through `npx ...@latest`. Before the first publish, configure local development with `node` and an absolute path to this folder's `server.js` instead.

### Hermes

Hermes uses the top-level `mcp_servers` setting shown in `sample-hermes-config.yaml`. Apply it with `hermes config set` rather than editing `~/.hermes/config.yaml` by hand, then restart Hermes so it discovers the seven tools. A local-path setup should point `args` at the absolute path to `server.js`.

## Notes

- Published package scripts are self-contained: `npm test` runs the live MCP protocol smoke test, and `npm pack --dry-run` runs that test through `prepack`.
- Repository maintainers can verify generated sources with `node ../../scripts/gen-expressivecss-skill.mjs --check` and `node scripts/sync-guides.mjs --check`, then run `npm test`. To refresh them, run those two generator commands without `--check` before packing.
- `setup_expert` resolves framework source, an installed package, or supported lockfiles in that order. A manifest range alone is reported as unresolved rather than treated as the installed version. An installed version outside the direct manifest range also blocks contract-dependent guidance.
- Pass `projectRoot` in tool calls when the target project differs from the MCP process working directory.


### Task scope and recovery

All seven tools publish an output schema for their shared evidence fields. The
six lookup/review tools declare local read-only behavior. `quality_inspector`
declares possible destructive, non-idempotent, open-world behavior because
project-authored scripts can write files and contact services. These
[MCP annotations](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
describe behavior; they do not grant permissions or sandbox a command.

The server operator can narrow the existing script list at launch:

```sh
EXPRESSIVECSS_MCP_ALLOWED_SCRIPTS='["typecheck","verify:expressivecss"]'
```

Omitting this setting preserves the built-in `typecheck`, `test`, and
`verify:expressivecss` list. An empty array, malformed JSON, or an unknown entry
denies all scripts. Call arguments cannot widen it. The project root must still
be allowlisted and the call must request `runCommands: true`. A request needing
a disallowed script runs none of its commands. A sequence stops after the first
failure, timeout, unavailable command, or changed inspected input, and lists
remaining scripts in `commandExecutionPolicy.commandsNotRun`. There are no
implicit retries. Existing process-group cleanup also applies on normal exit.

`quality_inspector.inspectionEvidence` records SHA-256 hashes and byte counts
from the exact files read. `inputsUnchanged` compares these inputs after
verification; command runs also pin `package.json`. A changed or unreadable
input prevents a pass and stops subsequent commands. For a later check of the
same candidate, optionally supply `expectedSourceHashes`, mapping the exact
requested file names to hashes from an operator-owned previous result. Missing
or mismatched pins block command execution. Only requested files are read for
this comparison; the map grants no extra filesystem access.

Hashes describe observed endpoints, not an atomic snapshot of the application.
Undeclared files, script dependencies and transient changes are not covered.
The root allowlist controls the command's working directory; scripts and npm
hooks still execute project code. Use host filesystem/network isolation and
inspect scripts before authorizing them. For browser requests use the consumer
runner's explicit loopback origin and mutation policy.

Keep failed evidence and the candidate diff before cleanup. Repair in a disposable
checkout when practical. Never reset a shared tree to clear a failed check. The
MCP does not restore files or discard user edits; recovery belongs to the task's
owner and must preserve concurrent work.
