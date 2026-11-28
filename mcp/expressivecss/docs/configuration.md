# Configuration

Set these in the `env` block of your MCP client's server entry. Tool callers
cannot change them.

## Environment variables

| Variable | What it controls |
| --- | --- |
| `EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES` | Response size cap, default `98304`. See [response size limits](response-budget.md). |
| `EXPRESSIVECSS_MCP_MAX_COMPONENT_RESPONSE_CHARS` | Kept for old configs and the legacy `maxCharactersPerComponent` metadata. It no longer trims anything. |
| `EXPRESSIVECSS_MCP_MAX_COMPONENT_SKIPS` | How many nearest matches `component_syntax_expert` suggests for an unknown name, from 1 to 20. Default `7`. |
| `EXPRESSIVECSS_MCP_QA_MAX_FILES` | Most files `quality_inspector` reads. Default `300`. |
| `EXPRESSIVECSS_MCP_QA_MAX_MB` | Largest file `quality_inspector` reads, in MiB. Default `2`. |
| `EXPRESSIVECSS_MCP_QA_MAX_TOTAL_MB` | Most data `quality_inspector` reads per request, in MiB. Default `16`. |
| `EXPRESSIVECSS_MCP_COMMAND_TIMEOUT_MS` | Timeout for project scripts. Default `120000`. |
| `EXPRESSIVECSS_MCP_ALLOWED_COMMAND_ROOTS` | Where project scripts may run. Off by default. |
| `EXPRESSIVECSS_MCP_ALLOWED_PROJECT_ROOTS` | Which directories a caller may pass as `projectRoot`. |
| `EXPRESSIVECSS_MCP_ALLOWED_SCRIPTS` | Which project scripts may run. |

Command output limits for `quality_inspector` are separate from the response
size cap.

## Turning tools off

Set any of these to `true` to stop that tool from doing work:

- `SKIP_SETUP_EXPERT`
- `SKIP_RULES_ENFORCER`
- `SKIP_CREATIVE_DIRECTOR`
- `SKIP_PAGE_ARCHITECT`
- `SKIP_COMPONENT_SYNTAX_EXPERT`
- `SKIP_QUALITY_INSPECTOR`

## Project roots

`quality_inspector` reports whether files exist under `projectRoot`, along
with their size and SHA-256. So a caller's `projectRoot` must sit inside the
default root: `--project-root`, or the server's working directory.

To allow other directories, set `EXPRESSIVECSS_MCP_ALLOWED_PROJECT_ROOTS`.
The listed roots then replace the default root. Use the platform path
separator, or a JSON array of absolute paths, as shown for command roots
below.

- A `projectRoot` that is missing, or whose real path is outside every
  allowed root, fails with a tool error.
- An empty or invalid value denies every caller-supplied root.
- Calls without `projectRoot` use the default root, which is not checked.

## Running project scripts

Script execution is denied by default. For `quality_inspector` to honor
`runCommands: true`, set `EXPRESSIVECSS_MCP_ALLOWED_COMMAND_ROOTS` when
starting the server:

```text
EXPRESSIVECSS_MCP_ALLOWED_COMMAND_ROOTS=/srv/projects/site-a:/srv/projects/site-b
EXPRESSIVECSS_MCP_ALLOWED_COMMAND_ROOTS=["/srv/projects/site-a","/srv/projects/site-b"]
```

The real `projectRoot` must equal or sit inside one of those roots. A caller
cannot widen this.

Scripts receive only the executable path, system, temp and locale variables,
`CI=1`, `NO_COLOR=1`, and `HOME`/`USERPROFILE` set to the project root. API
keys, tokens, passwords, cloud credentials, SSH agent variables and every
other server environment value stay behind.

To narrow which scripts may run:

```sh
EXPRESSIVECSS_MCP_ALLOWED_SCRIPTS='["typecheck","verify:expressivecss"]'
```

Without this setting, the built-in list is `typecheck`, `test` and
`verify:expressivecss`. An empty array, malformed JSON or an unknown name
denies every script, and a call cannot widen the list. A request that needs a
disallowed script runs none of its commands.

[Quality checks](quality-checks.md#running-project-scripts) covers what
happens during a run.
