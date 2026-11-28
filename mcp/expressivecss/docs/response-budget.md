# Response size limits

The server caps the size of its answers so a large lookup cannot flood the
agent's context. When something does not fit, it leaves out whole records,
says exactly what it left out, and tells you how to get it.

## The setting

`EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES` sets the cap. The default is 98,304
bytes (96 KiB). It must be a positive safe integer written as decimal digits.
Empty values, zero, signs, fractions, whitespace, exponents and unsafe
integers stop the server at startup. Only the operator can change it; tool
callers cannot.

The size is measured as:

```js
Buffer.byteLength(JSON.stringify(result), 'utf8')
```

That counts the whole tool result: text, structured content, metadata,
`isError` and JSON escapes. These tools send compact JSON text and repeat the
same payload as structured content. The JSON-RPC envelope and stdio framing
are not counted. A final check also covers errors the SDK creates before or
after a handler runs.

## Which tools it covers

The cap applies to `setup_expert`, `creative_director`, `page_architect`,
`page_arcjitect`, `component_syntax_expert` and `component_catalog`,
including their disabled-tool and validation-error results.

`rules_enforcer` and `quality_inspector` keep their own limits, described in
[quality checks](quality-checks.md).

[Resource reads](resources.md) use the same setting; see
[resource reads](#resource-reads) below. Listing tools, resources and
templates is not counted.

## The `responseBudget` field

Results from the covered tools add `responseBudget`:

| Field | Meaning |
| --- | --- |
| `maxBytes` | The cap in effect. |
| `delivery` | `complete`, `partial` or `error`. |
| `omissions` | Every record left out for size, with its identity, `reason: "byte-budget"` and the index of its recovery. |
| `recoveries` | Retry requests, or advice to raise the cap. |

For `component_syntax_expert`, an omission names the request position, the
requested name, the slug when known and the field when there is one.
Delivered components carry `requestIndex`, which helps when a request repeats
names or mixes known and unknown ones. Size omissions also appear in that
component's `omittedFields`.

`foundCount` and the catalogue's `count` count only delivered records. Unknown
components, absent sections and blocked capabilities keep their usual meaning.

## What gets cut first

Cuts follow a fixed order, working backwards through each list so the records
that remain keep their original order.

- `component_syntax_expert` drops capability records, contract summaries and
  markup examples first, then requested options and methods, then whole
  components and foundations. A delivered component always keeps all its
  rules.
- `component_catalog` and `creative_director` drop whole entries from the end,
  so the ranking stays intact.
- `page_architect` returns the architecture and skeleton whole or not at all.
- `setup_expert` fails explicitly when its checks cannot fit.

Version, provenance and evidence fields stay accurate. A partial result never
claims complete coverage or browser approval.

## Recovering a partial result

When `delivery` is `partial`, run one of the requests in `recoveries`:

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

- Catalogue recoveries ask for the exact slug with `limit: 1` and keep any
  target. They drop `workflowId`, because the catalogue keeps no workflow
  state. Search-limit cuts and size cuts are counted separately. There is no
  pagination, and the client needs no resource support.
- Creative recoveries rerun with a short goal that names the omitted
  component and `maxSuggestions: 1`, keeping the target and workflow. Scores
  and explanations can change with the narrower goal. The server offers this
  only when the suggestion will fit whole.

## When nothing fits

If a record that cannot be split, or the list of omissions itself, does not
fit, the result has `delivery: "error"` and `isError: true` and advises
raising the cap. It can still include whole reference records but claims no
successful delivery.

If even a minimal honest result does not fit, the server returns JSON-RPC
error `-32001` with no tool result. Retrying at the same cap will fail again.
Raise the setting, restart the server and repeat the request. A cap of 1 is
valid and always takes this path.

## Resource reads

A successful [resource read](resources.md) always delivers everything, measured
the same way over the whole `resources/read` result: contents, URI, MIME type,
escaped JSON text and any fields the SDK adds. Its JSON includes
`responseBudget` with `maxBytes`, `delivery: "complete"` and empty
`omissions` and `recoveries`.

When a read does not fit, the server returns `-32001` with no contents. The
error data has `uri`, `maxBytes`, `requiredBytes` and
`setting: "EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES"`. `requiredBytes` already
includes the bytes of the budget field. Set the cap to at least that number,
restart, and read the same URI. In a contributor checkout:

```sh
# Replace 100000 with the requiredBytes from the error.
EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES=100000 node mcp/expressivecss/server.js
```

In an MCP client, change the server's `env` and reconnect.

Component guide errors add `recoveries` and `unrecoverableSections`:

- For a whole-guide URI, `recoveries` lists the section URIs that fit, in
  section order, and `unrecoverableSections` names the ones that do not. Read
  the listed sections on the same connection.
- For a section URI, `recoveries` is empty, `unrecoverableSections` names
  that section, and `requiredBytes` is what it needs.

The largest bundled guide fits the default cap, so section recovery only
matters with a smaller cap. For the catalogue, a narrow `component_catalog`
query can fetch a single entry, but nothing recovers the whole catalogue at a
cap that is too small.

Protocol errors are not counted against the cap. Resource listing still works
when a read cannot fit.
