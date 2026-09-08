# ExpressiveCSS MCP Server

This folder contains a self-hosted MCP server for the ExpressiveCSS design-to-QA workflow:

- **Setup Expert**
- **Rules Enforcer**
- **Creative Director**
- **Page Arcjitect** (`page_arcjitect`, with conventional `page_architect` compatibility)
- **Component Syntax Expert**
- **Quality Inspector**

The server bundles generated component guides, selection data, contract metadata, and the normative semantics data. All component guidance comes from this synchronized package data. A framework source checkout contributes only target-version and contract-provenance evidence, so local prose cannot replace the packaged guidance.

A resolved version matching the bundled contract reports `documentationMode: "bundled"` and `bundledContractSafe: true`. `documentationSources.bundled` identifies the contract version and source hash. This resolver does not verify the public website, so `currentDocsSafe` and `documentationSources.current.available` remain false even on a match. Use matching bundled guidance, installed sources, or a proven release tag for version-specific claims.

## Material capability evidence

`component_syntax_expert` adds a scoped `capability` record to each found component.
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
| `component_syntax_expert` | Returns authoritative syntax/contract/rules for components |
| `quality_inspector` | Runs scoped static checks and optional commands (`npm run typecheck`, `npm run test`), then names every uninspected review area |

Static findings are heuristic and require source or runtime confirmation before remediation. A clean static check is reported as `staticStatus: "heuristic_pass"`; any overall MCP `pass` applies only to `checksPerformed`. Neither proves visual hierarchy, responsive rendering, focus behavior, motion, contrast, screen-reader announcements, or component-rule conformance unless separate evidence covers those areas. Read `uncheckedAreas`, `blockedChecks`, `coverageStatus`, `contractCompatibility`, and `contractProvenance` before using a result in a finish review.

`creative_director` and both page architect spellings resolve the target ExpressiveCSS version before reading current contract guidance. They return no recommendations or architecture when the version is mismatched or unresolved, when local contract provenance is missing, stale, invalid, or divergent from the bundled package contract, or when an architecture request contains an inexact component name. Fuzzy creative matches remain labelled `confidence: "fallback"`; page architecture never accepts them silently.

For a framework source checkout, the server accepts only the generated contract's canonical source list. It resolves the real project and source paths, rejects symbolic links and non-regular files, and caps each source at 2 MiB and the set at 8 MiB. It recomputes provenance for every tool call in manifest order with the generator's SHA-256 input format, `source path + NUL + file content + NUL`. The verified local manifest must also match the bundled package's framework version and source hash because the MCP serves bundled guidance. Contract-dependent output is blocked when the source set is invalid, missing, oversized, stale, or divergent. Invalid source paths never produce a computed hash. Generated data shipped in this package reports `contractProvenance: "bundled-verified"` because package consumers do not receive the framework source files.

Static inspection uses descriptor-level, no-follow bounded reads and rechecks file identity after each read. It caps files at 2 MiB each and 16 MiB per request by default, stops after 200 issues per file or 1,000 per request, and applies a five-second scan budget. Any unread, changed, over-budget, or partially scanned file appears under `filesUninspected`, which prevents a pass.

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

- `EXPRESSIVECSS_MCP_MAX_COMPONENT_RESPONSE_CHARS`
- `EXPRESSIVECSS_MCP_MAX_COMPONENT_SKIPS`
- `EXPRESSIVECSS_MCP_QA_MAX_FILES`
- `EXPRESSIVECSS_MCP_QA_MAX_MB`
- `EXPRESSIVECSS_MCP_QA_MAX_TOTAL_MB`
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
