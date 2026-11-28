# Component lookup

Two tools return component guidance. `component_catalog` tells you which
components exist. `component_syntax_expert` returns the details for the ones
you name.

## `component_syntax_expert`

Pass component slugs or aliases. Each component found returns every rule from
its bundled Rules section, in source order. Guides without rule bullets fall
back to generic authoring advice. Looking up rules does not prove that your
markup follows them.

Unknown names come back in `missing`.

### Compact or detailed

`detail` is `"compact"` or `"detailed"`. The default is `"detailed"`.

| Field | Compact | Detailed |
| --- | --- | --- |
| `file`, `slug`, `title`, `source`, `docs`, `rules` | Included | Included |
| `contract`, `syntax` | Left out | Contract summary and the whole markup example |
| `options`, `methods` | Only when requested in `sections` | Same |
| `capability` | Left out | Included |

`includeCapabilities: true` or `false` overrides the capability default in
either mode. It controls component capability records only; a `foundations`
request still works with `includeCapabilities: false`.

```json
{
  "components": ["date-picker", "autocomplete"],
  "detail": "compact",
  "sections": ["options", "methods"],
  "includeCapabilities": true
}
```

The contract summary stops at 900 characters, even in detailed mode, and
raising the byte budget does not change that. A shortened summary reports
`length-limit`. Read the component's documentation page, or its
[resource](resources.md), for the full text. Markup examples, rules and
requested sections are always whole or explicitly left out.

### What was left out

Results report the effective `detail` and `includeCapabilities`. Each
component lists the fields it left out in `omittedFields`, in the order
`contract`, `syntax`, `options`, `methods`, `capability`:

```json
{ "field": "syntax", "reason": "compact-detail" }
```

| Reason | Meaning | How to get it |
| --- | --- | --- |
| `compact-detail` | Compact mode skipped the prose or example. | `detail: "detailed"` |
| `not-requested` | You did not ask for that section or capability record. | `sections` or `includeCapabilities: true` |
| `byte-budget` | The response was too large. | See [response size limits](response-budget.md). |
| `length-limit` | The contract summary was cut at 900 characters. | Read the full contract. |

A requested section that comes back `status: "absent"` and a capability record
that is `null` count as delivered, so they have no omission record.

The detail level does not change version checks, missing-name lookup or
capability blocking. Retrieved guidance does not verify how your page behaves,
looks or reads to assistive technology.

### Options and methods

Add `sections` to get a component's documented runtime Options, Methods or
both:

```json
{
  "components": ["autocomplete", "cards"],
  "sections": ["options", "methods"]
}
```

Each component then has an `options` and a `methods` record:

- A documented section returns `{ "status": "documented", "markdown": "..." }`
  with the complete bundled Markdown, tables and nested notes included.
  Datepicker's options include its visibility and docked display settings, and
  Autocomplete's methods include `.destroy()` and its cleanup notes.
- A missing or empty section returns `{ "status": "absent", "markdown": null }`.
  That means the guide documents no such section, not that the component has
  no options or methods. Cards reports both as absent.

Leaving out `sections`, or passing `[]`, skips both records. Each name may
appear once, in either order. Unknown names, duplicates and more than two
entries are rejected.

Options and methods are reference data. They stay available when version or
provenance checks block a result, and they do not change compatibility or
capability evidence.

### Capability evidence

When capability detail is on, each component gets a `capability` record. For
foundations, pass `foundations: ["typography", "shape", "motion"]`; you can
omit `components` for that request. Records separate documented scope,
pinned source review, feature and integration gaps, mapped checks and recorded
results. A version or provenance failure blocks capability results.

`capabilityEvidence` names the bundled review snapshot and browser run. That
evidence describes the reviewed checkout. It does not verify the installed
package, the consumer's browser or full parity with the Google specification.
Serving the package does not rerun tests. The Markdown
[capability roadmap](https://github.com/BaezFJ/ExpressiveCSS/blob/master/skills/expressivecss/references/capability-roadmap.md)
and the packaged `capability-roadmap.json` come from the same catalogue.

### Documentation version

When the project's version matches the bundled contract, results report
`documentationMode: "bundled"` and `bundledContractSafe: true`, and
`documentationSources.bundled` names the contract version and source hash.
The server never checks the public website, so `currentDocsSafe` and
`documentationSources.current.available` stay false even on a match. For
version-specific claims, use matching bundled guidance, installed sources or
a proven release tag.

## `component_catalog`

### List everything

Call it with `{}` to list every bundled component. To also check a project's
compatibility, pass a target:

```json
{ "projectRoot": "/absolute/path/to/consumer" }
```

An optional `workflowId` links the result to other tool calls. `entries` are
sorted by slug, and `count` is their total.

| Field | Meaning |
| --- | --- |
| `slug`, `title` | Canonical name and title. Pass the slug to `component_syntax_expert`. |
| `description` | The first nonempty `useWhen` from the decision data, then `jobs`, or null. |
| `aliases` | Other names for the component, or `[]`. Search matches them; `component_syntax_expert` does not gain them. |
| `runtime` | Runtime ownership, or null. |
| `docs` | Documentation link, or null. |
| `package` | The npm package that ships the component: `@expressivecss/expressive` or `@expressivecss/extras`. |

The result also has `contractVersion`, `sourceHash` and
`guideSource: "bundled"`. It holds no markup, rules, sections or capability
records; get those from `component_syntax_expert`. Foundations are not listed,
but that tool's `foundations` selector returns them.

Without `projectRoot`, the result reports `status: "available"` and
`contractCompatibility: "unknown"`, and lists target compatibility and
provenance in `uncheckedAreas`. It never inspects the working directory.
`contractProvenance: "bundled-verified"` describes the packaged snapshot. With
a target, version and provenance checks can return `status: "blocked"`, but
the entries stay available.

`coverageStatus: "complete-bundled-catalogue"` means every entry was
delivered. It says nothing about compatibility, browser behavior or
accessibility. Calls are read-only and run no project scripts.

### Search

Pass `query` to search slugs, titles, aliases and descriptions:

```json
{ "query": "navbar", "limit": 1 }
```

That finds `app-bar` with `matchType: "exact-alias"`. Pass the returned slug
to `component_syntax_expert`. Exact names such as `app-bar` and phrases such
as `screen-level actions` work too.

- `query` is at most 256 characters and cannot be empty or only whitespace.
- `limit` is an integer from 1 to 50, default 10. It has no effect without
  `query`.

Names are compared case-insensitively. Every run of characters other than
ASCII letters and digits becomes a hyphen, and leading and trailing hyphens
are dropped.

Results come in three groups, each sorted by slug: exact slug or title matches
(`exact-name`), exact aliases (`exact-alias`), then `heuristic` matches. A
heuristic match contains every query token somewhere in the searchable
fields; tokens can match part of a word or span fields. A query with no
tokens matches nothing. Full guide bodies, capability records and extra
decision descriptions are not searched. Each component appears once, under
its strongest match. Matches are suggestions, not a verdict on which
component a design needs.

Search results add:

| Field | Meaning |
| --- | --- |
| `query`, `limit` | The trimmed query and the limit used. |
| `count`, `totalMatches` | How many were delivered, and how many matched. |
| `omittedCount`, `truncated` | Matches cut by `limit`. Byte-budget cuts are counted separately. |
| `coverageStatus` | `complete-search-results`, or `partial-search-results` when `limit` cut matches. |

A query with no matches, such as `{"query":"no-catalogue-match-zzzz"}`,
returns `entries: []`, zero counts and complete search coverage. When matches
were cut, raise `limit` or narrow the query. If the byte budget cut entries,
`count` reflects what was delivered and coverage becomes
`partial-response-budget` or `response-budget-error`.

Search keeps the listing's version, hash and target checks. Empty or
truncated results do not change compatibility.
