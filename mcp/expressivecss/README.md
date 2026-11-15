# ExpressiveCSS MCP server

An MCP server that helps AI agents build pages with ExpressiveCSS. It checks
which version a project uses, suggests components, returns their exact markup
and rules, and runs quality checks on the result.

All component guidance comes from data bundled with this package, so answers
match the framework version the package was built from.

## Tools

| Tool | What it does |
| --- | --- |
| `setup_expert` | Finds the installed ExpressiveCSS version and checks the project setup. |
| `creative_director` | Suggests components for a design goal. |
| `page_arcjitect` | Returns page sections, landmarks and a semantic HTML skeleton. `page_architect` is the same tool under the usual spelling. |
| `component_catalog` | Lists or searches every bundled component. |
| `component_syntax_expert` | Returns a component's rules, markup example and, on request, its documented options and methods. |
| `rules_enforcer` | Flags retired markup and semantics mistakes in authored files. |
| `quality_inspector` | Runs static checks and, if allowed, project scripts such as `npm run test`. |

The checks are heuristic. A clean result does not prove visual layout, focus
behavior, contrast or screen-reader output. Each result lists what it did not
check in `uncheckedAreas`.

## Set it up

Add the server to your MCP client. This is the packaged
[`mcp.json`](mcp.json):

```json
{
  "mcpServers": {
    "expressivecss-mcp": {
      "command": "npx",
      "args": ["-y", "@expressivecss/mcp-server@latest"],
      "env": {
        "EXPRESSIVECSS_MCP_MAX_COMPONENT_RESPONSE_CHARS": "24000",
        "EXPRESSIVECSS_MCP_MAX_COMPONENT_SKIPS": "7",
        "EXPRESSIVECSS_MCP_QA_MAX_FILES": "300",
        "EXPRESSIVECSS_MCP_QA_MAX_MB": "2"
      }
    }
  }
}
```

To run a local checkout instead, use `node` with the absolute path to this
folder's `server.js`.

For Hermes, apply the `mcp_servers` block from
[`sample-hermes-config.yaml`](sample-hermes-config.yaml) with
`hermes config set` instead of editing `~/.hermes/config.yaml` by hand, then
restart Hermes.

Pass `projectRoot` in tool calls when the project is not the server's working
directory.

## Run it locally

The server needs Node `^22.22.2 || ^24.15.0 || >=26.0.0`. Contributors should
use the latest Node 24.

```bash
cd mcp/expressivecss
npm ci
node server.js   # starts on stdio; normally your MCP client does this
npm test         # live protocol smoke test
```

## More detail

- [Component lookup](docs/components.md): `component_syntax_expert` detail
  levels, options and methods, capability evidence, and `component_catalog`
  search.
- [Resources](docs/resources.md): read the catalogue and component guides as
  MCP resources, with URI completion.
- [Response size limits](docs/response-budget.md): the byte budget and how to
  recover omitted results.
- [Quality checks](docs/quality-checks.md): what `quality_inspector` and
  `rules_enforcer` check, running project scripts, and browser scenarios.
- [Lint command and agent hook](docs/lint.md): run the same checks from the
  command line, in CI, or after every agent edit.
- [Configuration](docs/configuration.md): every environment variable and
  allowlist.
- [Maintainers](docs/maintainers.md): regenerating data and packing a
  release.

Changes are listed in the [changelog](CHANGELOG.md).
