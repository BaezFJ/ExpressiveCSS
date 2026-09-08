# Autonomous scope and recovery

This follow-up implements roadmap item 7 using the existing skill, MCP server,
consumer verifier, and evaluation runner. It adds no dependency, framework API,
mutation tool, or rollback service.

## Boundaries

The skill's optional [scope and recovery reference](../../skills/expressivecss/references/autonomy.md)
connects allowed files, commands, browser origins, completion checks and stopping
conditions. It preserves prior authorization and directs routine reversible work
to proceed. Missing permissions block only dependent work. A failed attempt must
retain evidence and must not reset or overwrite unrelated user edits.

The MCP now publishes output schemas for its common evidence envelope. Six tools
have local read-only annotations. Quality Inspector has conservative annotations
because its optional project scripts can mutate files or contact services.
Annotations describe behavior and do not grant permission, consistent with the
[MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools).

`EXPRESSIVECSS_MCP_ALLOWED_SCRIPTS` narrows the existing three-script allowlist at
server startup. Invalid configuration denies all scripts. Requests cannot widen
this scope; the existing command-root allowlist and explicit execution flag still
apply. A denied script blocks the entire requested sequence. Failed, interrupted,
or timed-out checks stop later commands. Normal command exit also cleans up its
process group before source evidence is checked.

Quality Inspector hashes the exact bytes it reads. Optional expected hashes reject
stale candidates before command execution. Source and command-manifest comparisons
stop later commands if inspected inputs change. The result reports skipped checks
and preserves earlier observations without calling them current evidence. It never
restores files automatically.

These comparisons cover named input bytes at observed endpoints. They are not
atomic revision snapshots, content authorization, or permission enforcement over
arbitrary script side effects. Project scripts and package-manager hooks need host
filesystem/network isolation. The existing consumer runner restricts browser
origins and mutation requests. The MCP does not control unrelated agent tools.

## Evaluation

Two old/new tasks use the existing dashboard and shared benchmark runner. One
repairs Preview without disturbing user edits. The other reaches a real failed
Save assertion whose JavaScript repair is outside the allowed CSS scope. Correct
recovery retains the failure, preserves the candidate, and identifies the needed
scope change. Independent file and browser checks establish outcomes; candidate
claims alone do not.

The first comparison retained four runs under `.cache/autonomy/comparison`.
Both repairs passed 12/12 checks. Both blocked-recovery runs passed 8/9: they
preserved every file, ran the failing assertion once, observed the broken Save,
and correctly identified the required JavaScript permission. Each incorrectly
labeled a successful browser observation of broken UI as a failed tool operation.
The original 40/42 result remains unchanged.

The shared adapter instructions now distinguish operation status from application
behavior explicitly. Regression checks keep validation strict: an observed false
result is not a tool error. A fresh comparison uses the revised adapter for both
skills, with a new provenance record. Its results are separate from the original
archive; no failed label is silently regraded.


## Accepted comparison and validation

The fresh four-run archive is `.cache/autonomy/comparison-2`, with its existing
Skill Creator viewer at `.cache/autonomy/review-accepted.html`. All four runs passed,
42/42 checks. Both versions preserved unrelated work and correctly stopped the
out-of-scope repair. No original results were overwritten or mixed into this run.

Each case/configuration ran once using `gpt-6-astra`, low reasoning, ephemeral
`workspace-write` sessions and the same restricted fixture browser. MCP command
permissions were tested separately through its deterministic smoke suite; these
live runs used the skill and evaluation browser, not Quality Inspector.

| Task | Skill | Checks | Seconds | Input tokens | Cached input | Output tokens | Tool calls |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Scoped repair | Old | 12/12 | 84.5 | 330,129 | 293,632 | 1,691 | 17 |
| Scoped repair | Revised | 12/12 | 57.5 | 172,033 | 135,040 | 1,585 | 14 |
| Blocked recovery | Old | 9/9 | 42.8 | 165,466 | 134,784 | 985 | 9 |
| Blocked recovery | Revised | 9/9 | 37.8 | 135,833 | 107,904 | 806 | 6 |

Cached input is part of input, not an additional token total. Times cover Codex
execution, excluding independent browser grading. Single trials and concurrent
local checks do not establish variability or a speed improvement. The revised
scope reference had a recorded complete read in the repair case; no complete
read was observed in blocked recovery. Both versions passed, so these results
do not establish a causal benefit from the new guide. They verify the tested
outcomes and demonstrate the clarified reporting contract under these conditions.

The fixtures contain pre-existing user content but no Git index. Both agents
encountered the real missing-Git-metadata error and continued using file evidence.
Staged-change restoration, real concurrent editor races, and hostile-process
isolation were not exercised. Human review of the explanations and captures
remains pending; candidate-authored verification prose is not trusted evidence.

Final checks passed:

- `npm run verify`: 1,003 tests, no failures or skips, typecheck, generated files,
  documentation build and site checks. Chromium, Firefox and WebKit checks ran
  in the existing Playwright container.
- `npm run test:skill`: 236 tests and 22 replay cases.
- MCP smoke checks across all seven tools, including narrowed permissions, stale
  pins, source/package-manifest drift, failed-command stopping, normal-exit orphan
  cleanup, existing timeout cleanup, and preservation of unrelated fixture files.
- Isolated framework and MCP package checks and final generated-file checks.
- Capability collection: 17 mapped tests passed with unchanged inputs.
- Basic-button required reading: 30,482 bytes, 25.05% below 40,670 bytes.

An initial contributor run caught removal of the explicit standalone-Markdown
sentence; it was restored. Editing that sentence during the first run also
correctly tripped the frozen-skill provenance check. A subsequent full run used
fixed inputs and passed. The shared status clarification was then covered by a
fresh full verification, adapter/skill regressions, and the separate live archive.

Reproduction pins:

- Baseline skill, frozen from `1905405`: `sha256:a2b94d2005d2f554acf2c786689327b5a993f3687b3d19cfbe9184132e44c02d`.
- Revised skill: `sha256:2ee8b123f372b8191d7d35ba9fa643b0d97bf834c3b998750d8f6793d01c83e6`.
- Accepted comparison provenance: `sha256:f78149815e9a79144200653ed66dd6e74dd0d7841915fec52d60138c7f344d8c`.
- `mcp/expressivecss/server.js`: `sha256:62c889c730466345abb4502989f4bfbff2b61d9e7325b887a47ed9ec822fcb10`.
- `mcp/expressivecss/smoke.mjs`: `sha256:7d58c91322a32ed19aa62c561c5d8aac0916584ff382b3879a57ed26e8d4f539`.

Raw logs and evaluation artifacts remain under ignored `.cache/autonomy/`.
This report retains the outcomes and pins; the archives must be retained separately
if the cache is cleaned. No installation, publication, or automatic shared-tree
rollback was performed.
