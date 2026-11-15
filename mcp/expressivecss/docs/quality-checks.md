# Quality checks

`rules_enforcer` and `quality_inspector` review authored files. Both are
heuristic: confirm a finding against the source or the running page before
fixing it.

## Reading a result

A clean static check reports `staticStatus: "heuristic_pass"`. An overall
`pass` covers only the checks listed in `checksPerformed`. Neither proves
visual hierarchy, responsive layout, focus behavior, motion, contrast,
screen-reader announcements or component-rule conformance unless other
evidence covers them.

Before using a result in a final review, read `uncheckedAreas`,
`blockedChecks`, `coverageStatus`, `contractCompatibility` and
`contractProvenance`.

## Version and provenance checks

`creative_director` and both page architect spellings resolve the project's
ExpressiveCSS version before answering. They return nothing when:

- the version is mismatched or unresolved
- the local contract provenance is missing, stale, invalid or different from
  the bundled contract
- a page architecture request names a component that does not match exactly

Fuzzy creative matches are labelled `confidence: "fallback"`. Page
architecture never accepts them.

`setup_expert` looks for the version in the framework source, then an
installed package, then supported lockfiles. A version range in
`package.json` alone counts as unresolved. An installed version outside the
direct manifest range also blocks contract-dependent guidance.

When the target is a framework source checkout, the server accepts only the
generated contract's source list. It resolves real paths, rejects symbolic
links and non-regular files, and caps each source at 2 MiB and the set at
8 MiB. For each check it recomputes the SHA-256 provenance in manifest order,
hashing `source path + NUL + file content + NUL` for each file like the
generator does. The local manifest must also match the bundled framework
version and source hash, because the server serves bundled guidance. Invalid
paths never produce a hash. Package consumers do not receive the framework
sources, so bundled data reports `contractProvenance: "bundled-verified"`.

## Static inspection limits

Static inspection uses bounded reads that do not follow links and rechecks
each file's identity after reading it. By default it stops at:

- 2 MiB per file and 16 MiB per request
- 200 issues per file and 1,000 per request
- a five-second scan

Any file it could not read fully, that changed, or that went over a limit
appears in `filesUninspected`, and the result cannot pass.

## Running project scripts

`quality_inspector` can run `npm run typecheck`, `npm run test` and
`npm run verify:expressivecss` when the call sets `runCommands: true`. This is
off unless the operator allows it. See
[configuration](configuration.md#running-project-scripts) for the allowlists
and the environment the scripts receive.

All tools publish an output schema for their shared evidence fields. Six of
them declare local read-only behavior. `quality_inspector` declares that it
may be destructive, non-idempotent and open-world, because project scripts can
write files and contact services. These
[MCP annotations](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
describe behavior; they grant no permissions and sandbox nothing.

A sequence of scripts stops at the first failure, timeout, unavailable
command or changed input, and lists the rest in
`commandExecutionPolicy.commandsNotRun`. Nothing is retried. Process groups
are cleaned up on normal exit too.

### Input hashes

`quality_inspector.inspectionEvidence` records the SHA-256 and byte count of
every file it read. `inputsUnchanged` compares them again after verification;
command runs also pin `package.json`. A changed or unreadable input blocks a
pass and stops later commands.

To check the same candidate later, pass `expectedSourceHashes`, mapping the
requested file names to hashes from an earlier result you own. Missing or
mismatched hashes block command execution. Only the requested files are read
for this; the map grants no extra file access.

The hashes describe the files read, not an atomic snapshot of the app.
Undeclared files, script dependencies and changes in between are not covered.
The root allowlist controls where a command runs, but scripts and npm hooks
still run project code. Isolate the host's filesystem and network, and read
scripts before allowing them.

## Browser scenarios

With `runType: "consumer"` and `runCommands: true`, `quality_inspector` runs
only the project's `verify:expressivecss` script. Point that script at the
skill's portable `scripts/verify-consumer.mjs`, a reviewed scenario and a dev
server that is already running. The project supplies its own
`@playwright/test` and Chromium; the server adds no browser dependency.

The usual allowlist, environment filtering, output redaction and timeout
apply. No arbitrary command text or script name is accepted. Without
`runCommands`, the script never starts. A missing or failing script cannot
pass. Treat the script and its printed claims as untrusted, and inspect the
report and captures it collected. `reviewComplete` stays false, and unchecked
areas stay listed. For browser requests, use the runner's explicit loopback
origin and mutation policy.

The skill's `references/consumer-verification.md` covers the scenario format,
network limits, evidence handling and the repair loop.

## When a check fails

Keep the failed evidence and the candidate diff before cleaning up. Repair in
a disposable checkout when you can. Never reset a shared tree to clear a
failed check. The server does not restore files or discard edits; recovery
belongs to whoever owns the task, and must keep other people's work.
