# Resources

Clients that support MCP resources can read the component catalogue and every
component guide over the same stdio connection, without calling a tool.
Resources always describe the bundled snapshot. They read no project files,
ignore the working directory, the `--project-root` default and the tool skip
flags, and run no project scripts or components.

Every resource has MIME type `application/json`. The server does not offer
subscriptions.

## The catalogue

The catalogue resource is named `component_catalog`. Find its URI by listing
resources:

```js
const { resources } = await client.listResources();
const catalogue = resources.find((resource) => resource.name === 'component_catalog');
const result = await client.readResource({ uri: catalogue.uri });
const snapshot = JSON.parse(result.contents[0].text);
console.log(snapshot.contractVersion, snapshot.sourceHash, snapshot.entries);
```

The URI looks like
`expressivecss://catalogue/<framework-version>/<source-hash>`. The version is
URI-encoded, and the hash is the shipped contract's source hash, not a digest
of the resource text. Both match `contractVersion` and `sourceHash` in the
JSON. Only the current bundle exists: there is no `latest` alias, no older
versions and no search.

A read returns one text item. Its JSON has `schemaVersion: 1`, `entries`,
`count`, `contractVersion`, `sourceHash` and `guideSource: "bundled"`.
Entries have the same fields and slug order as an unfiltered
[`component_catalog`](components.md#component_catalog) call, without the
tool's workflow and search fields.

It also carries the catalogue's evidence fields: `status`, `checksPerformed`,
`evidenceSources`, `uncheckedAreas`, `contractCompatibility`,
`contractProvenance`, `contractProvenanceDetails`, `coverageStatus` and
`blockedChecks`. Compatibility is always `unknown`, because no project was
checked.

## Component guides

Two resource templates cover the guides. `resources/templates/list` returns
them:

| Template | URI |
| --- | --- |
| `component_guide` | `expressivecss://components/<framework-version>/<source-hash>/{slug}` |
| `component_guide_section` | `expressivecss://components/<framework-version>/<source-hash>/{slug}/{section}` |

`resources/list` lists one whole-guide URI per component, sorted by slug,
after the catalogue. Section URIs are not listed. Build one from the template
with a slug and one of `contract`, `syntax`, `rules`, `options` or `methods`:

```js
const { resourceTemplates } = await client.listResourceTemplates();
const section = resourceTemplates.find((template) => template.name === 'component_guide_section');
const uri = section.uriTemplate.replace('{slug}', 'date-picker').replace('{section}', 'options');
const options = JSON.parse((await client.readResource({ uri })).contents[0].text).options;
```

Every read has `schemaVersion: 1`, `slug`, `title`, `docs` (the
documentation page), `repositorySource` (the page's source file),
`contractVersion`, `sourceHash` and `guideSource: "bundled"`. A guide for an
`@expressivecss/extras` component also has `package` and `install`, because
core does not ship it. A whole-guide read adds all five sections. A section read adds `section` and that one
section:

- `contract` is the full Contract text. Resources do not apply the tool's
  900-character limit.
- `syntax` is `{ language, example }`, as in detailed tool output.
- `rules` is the full ordered rule list.
- `options` and `methods` are `{ status, markdown }`. A guide without that
  section returns `status: "absent"` and `markdown: null`.

Guide reads carry the same evidence fields as the catalogue. `coverageStatus`
is `complete-bundled-guide` or `complete-bundled-guide-section`.

## Exact URIs only

Reads accept only the exact advertised or templated URIs. These return
resource-not-found error `-32002`:

- aliases such as `datepicker`, case variants, and unknown slugs or sections
- other versions or hashes
- extra or empty segments, trailing slashes and percent-encoded variants
- query strings, fragments and unrelated URIs

Use `component_catalog` to turn an alias into a slug, or complete a slug
prefix as shown below.

Malformed request parameters fail SDK validation instead. SDK 1.31.0 reports
those with protocol error `-32603`.

## Completing URI arguments

The server advertises the `completions` capability. `completion/complete`
fills in `slug` on both component templates and `section` on
`component_guide_section`. Pass the exact `uriTemplate` string from
`resources/templates/list` as `ref.uri`:

```js
const { resourceTemplates } = await client.listResourceTemplates();
const guide = resourceTemplates.find((template) => template.name === 'component_guide');
await client.complete({ ref: { type: 'ref/resource', uri: guide.uriTemplate }, argument: { name: 'slug', value: 'ca' } });
// { completion: { values: ['cards', 'carousel'], total: 2, hasMore: false } }
```

- Matching is a case-insensitive prefix match. An empty value returns every
  slug.
- Slugs come back in `resources/list` order. Sections always come back as
  `contract`, `syntax`, `rules`, `options`, `methods`, whatever slug
  `context.arguments` holds.
- Only canonical slugs match: `datepicker` returns nothing, `date` returns
  `date-picker`.
- The SDK returns at most 100 values, with `total` and `hasMore`. Every
  current result fits.
- No match returns `values: []`, `total: 0` and `hasMore: false`.
- Other argument names, such as `version`, and the fixed catalogue URI return
  `values: []` and `hasMore: false` without `total`.
- A `ref.uri` that is not one of the two current templates returns `-32602`,
  and so does a `ref/prompt` reference, because the server has no prompts.

Completion uses the catalogue loaded at startup and reads no files. MCP does
not complete tool arguments, so tools still need slugs or aliases, which
`component_catalog` lists.

## Size limit

Resource reads share the server's byte budget. A read either delivers
everything or fails with `-32001`. See
[response size limits](response-budget.md#resource-reads). Listing resources
and templates, and completion, are not counted against the budget.
