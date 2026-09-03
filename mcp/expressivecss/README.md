# ExpressiveCSS MCP Server

This folder contains a self-hosted MCP server for the ExpressiveCSS design-to-QA workflow:

- **Setup Expert**
- **Rules Enforcer**
- **Creative Director**
- **Page Arcjitect** (`page_arcjitect`, with conventional `page_architect` compatibility)
- **Component Syntax Expert**
- **Quality Inspector**

The server bundles generated component guides, selection data, contract metadata, and the normative semantics data. All component guidance comes from this synchronized package data. A framework source checkout contributes only target-version and contract-provenance evidence, so local prose cannot replace the packaged guidance.

## Run it locally

The server supports Node `^20.19.0 || ^22.12.0 || >=24.0.0`, matching its `jsdom` runtime dependency.

```bash
cd mcp/expressivecss
npm install
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
| `component_syntax_expert` | Returns authoritative syntax/contract/rules for components |
| `quality_inspector` | Runs scoped static checks and optional commands (`npm run typecheck`, `npm run test`), then names every uninspected review area |

Static findings are heuristic and require source or runtime confirmation before remediation. A clean static check is reported as `staticStatus: "heuristic_pass"`; any overall MCP `pass` applies only to `checksPerformed`. Neither proves visual hierarchy, responsive rendering, focus behavior, motion, contrast, screen-reader announcements, or component-rule conformance unless separate evidence covers those areas. Read `uncheckedAreas`, `blockedChecks`, `coverageStatus`, `contractCompatibility`, and `contractProvenance` before using a result in a finish review.

`creative_director` and both page architect spellings resolve the target ExpressiveCSS version before reading current contract guidance. They return no recommendations or architecture when the version is mismatched or unresolved, when local contract provenance is missing or stale, or when an architecture request contains an inexact component name. Fuzzy creative matches remain labelled `confidence: "fallback"`; page architecture never accepts them silently.

For a framework source checkout, the server accepts only the generated contract's canonical source list. It resolves the real project and source paths, rejects symbolic links and non-regular files, and caps each source at 2 MiB and the set at 8 MiB. It recomputes provenance for every tool call in manifest order with the generator's SHA-256 input format, `source path + NUL + file content + NUL`. Contract-dependent output is blocked when the source set is invalid, missing, oversized, or stale. Invalid source paths never produce a computed hash. Generated data shipped in this package reports `contractProvenance: "bundled-verified"` because package consumers do not receive the framework source files.

## Environment variables

- `EXPRESSIVECSS_MCP_MAX_COMPONENT_RESPONSE_CHARS`
- `EXPRESSIVECSS_MCP_MAX_COMPONENT_SKIPS`
- `EXPRESSIVECSS_MCP_QA_MAX_FILES`
- `EXPRESSIVECSS_MCP_QA_MAX_MB`
- `EXPRESSIVECSS_MCP_COMMAND_TIMEOUT_MS`
- `EXPRESSIVECSS_MCP_ALLOWED_COMMAND_ROOTS`
- `SKIP_SETUP_EXPERT`
- `SKIP_RULES_ENFORCER`
- `SKIP_CREATIVE_DIRECTOR`
- `SKIP_PAGE_ARCHITECT`
- `SKIP_COMPONENT_SYNTAX_EXPERT`
- `SKIP_QUALITY_INSPECTOR`

Set any skip flag to `true` to disable that stage from doing work.

Command execution is denied by default. To let `quality_inspector` honor `runCommands: true`, the MCP operator must set `EXPRESSIVECSS_MCP_ALLOWED_COMMAND_ROOTS` when launching the server. Use platform path separators for multiple roots, or a JSON array of absolute roots:

```text
EXPRESSIVECSS_MCP_ALLOWED_COMMAND_ROOTS=/srv/projects/site-a:/srv/projects/site-b
EXPRESSIVECSS_MCP_ALLOWED_COMMAND_ROOTS=["/srv/projects/site-a","/srv/projects/site-b"]
```

The real `projectRoot` must equal or be contained by one of those roots. A tool caller cannot expand this policy. Allowed commands receive only the executable path, system/temp/locale variables, `CI=1`, `NO_COLOR=1`, and `HOME`/`USERPROFILE` reset to the project root. API keys, tokens, passwords, cloud credentials, SSH agent variables, and other MCP-process environment values are not forwarded.

## Sample client configuration

### `mcp/expressivecss/mcp.json`

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
        "EXPRESSIVECSS_MCP_QA_MAX_MB": "2",
        "EXPRESSIVECSS_MCP_ALLOWED_COMMAND_ROOTS": "/absolute/path/to/allowed/project"
      }
    }
  }
}
```

The packaged config targets the npm release, following the same `npx ...@latest` shape as daisyUI Blueprint. Before the first publish, configure local development with `node` and an absolute path to this folder's `server.js` instead.

### Hermes

Hermes uses the top-level `mcp_servers` setting shown in `sample-hermes-config.yaml`. Apply it with `hermes config set` rather than editing `~/.hermes/config.yaml` by hand, then restart Hermes so it discovers the seven tools. A local-path setup should point `args` at the absolute path to `server.js`.

## Notes

- Published package scripts are self-contained: `npm test` runs the live MCP protocol smoke test, and `npm pack --dry-run` runs that test through `prepack`.
- Repository maintainers can verify generated sources with `node ../../scripts/gen-expressivecss-skill.mjs --check` and `node scripts/sync-guides.mjs --check`, then run `npm test`. To refresh them, run those two generator commands without `--check` before packing.
- `setup_expert` resolves framework source, an installed package, or supported lockfiles in that order. A manifest range alone is reported as unresolved rather than treated as the installed version.
- Pass `projectRoot` in tool calls when the target project differs from the MCP process working directory.
