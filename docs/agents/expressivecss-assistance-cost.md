# Cost of an accepted result

Compare the same consumer tasks with the ExpressiveCSS skill, the MCP server,
and both together. Automated completion, human acceptance, requested corrections,
and execution cost are separate results. Passing checks never fills in a human
review, and missing effort or telemetry never becomes zero.

## Current scope

The first comparison uses the existing `form-action` and `navigation-media`
fixtures and graders, with three attempts per mode, eighteen attempts total.
The requests are in `tests/fixtures/expressivecss-skill-evals/benchmark.json`.

| Mode | Supplied ExpressiveCSS guidance | Editing and verification |
| --- | --- | --- |
| `skill_only` | Root skill and its local resources | Shell/file tools and the restricted fixture browser |
| `mcp_only` | Local ExpressiveCSS MCP tools; no skill copy | Same shell/file tools and browser |
| `combined` | Both | Same shell/file tools and browser |

The browser itself uses an operator-owned MCP transport in every mode.
“Skill-only” means no **ExpressiveCSS** MCP assistance. “MCP-only” still permits
ordinary project inspection and editing. The installed framework and consumer
files are identical before adding the mode-specific skill directory.

MCP assistance covers setup, component syntax, design guidance and static quality
inspection. The duplicate `page_arcjitect` alias is omitted. MCP project-command
execution is denied by explicit empty root and script allowlists. This experiment
does not measure the cost or benefit of MCP command execution.

## Run the comparison

Build the framework and regenerate guidance before freezing a comparison. Do not
edit the fixtures, evaluator, skill, MCP implementation or distribution during it.
Use the installed Codex CLI and existing MCP/browser dependencies.

```sh
node scripts/benchmark-expressivecss-skill.mjs \
  --assistance=true --case=form-action,navigation-media \
  --repetitions=3 --output=.cache/assistance-cost/comparison
```

Attempts run sequentially. Each task rotates its three mode positions across the
three repetitions. Every completed attempt is written immediately; an
infrastructure failure remains a failed attempt. `--resume=true` validates the
entire retained comparison before continuing. It rejects changed provenance,
missing evidence, and incomplete attempt directories; these require a new output
directory. It never overwrites an interrupted attempt with a successful rerun.

The adapter uses the installed CLI's `--ignore-user-config` and pins only the
observed model, reasoning effort and provider defaults. Explicit overrides disable
plugin/app discovery, host skill discovery, automatic skill instructions, bundled
skills, memory tools, delegation, web search and automatic AGENTS.md loading.
The root skill is supplied explicitly in the two skill modes. The fixture browser
and optional local ExpressiveCSS server are configured directly. Settings are
retained with every attempt and in the comparison provenance. See the
[official Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
and inspect `codex exec --help` for the installed CLI's switches.

This is controlled assistance, not a natural skill-discovery evaluation. Normal
sandbox restrictions remain. Configuration controls supplied tools and context;
it is not an OS read-isolation boundary. Candidate instructions prohibit reading
other skills, host configuration, evaluator sources and other attempts. Review
transcripts for protocol violations. The grader flags observed MCP calls to other
servers, while allowing Codex's native `list_mcp_resources` and
`list_mcp_resource_templates` inventory helpers. CLI events label those helpers
with `server: "codex"`; they are not an additional external server. Complete guide outputs and recorded MCP calls establish observed use;
absent or partial telemetry cannot prove that an unseen read never occurred.
MCP tools are offered, not forced. A run with no ExpressiveCSS MCP calls does not
establish a benefit from those tools.

## Review and retain

Generate Skill Creator's existing viewer, with all three configurations. Its
summary table supports two modes, so the runner saves two paired summaries:

```sh
python3 /path/to/skill-creator/eval-viewer/generate_review.py \
  .cache/assistance-cost/comparison --skill-name expressivecss \
  --benchmark .cache/assistance-cost/comparison/benchmark-skill-vs-mcp_only.json \
  --static .cache/assistance-cost/review-mcp.html
```

Repeat with `benchmark-skill-vs-combined.json` and `review-combined.html` for the
combined summary. Both viewers retain every output, explicitly labeled by mode
and attempt in their displayed prompt. Those labels are added for review only.

The current Skill Creator template embeds JSON directly in a script element.
Retained HTML source can contain closing script tags, which break that element.
After generating both pages, escape the embedded JSON for HTML. This preserves
all decoded review data and uses the existing viewer:

```sh
python3 - <<'PYTHON'
import json
from pathlib import Path
for name in ['review-mcp.html', 'review-combined.html']:
    file = Path('.cache/assistance-cost') / name
    html = file.read_text()
    marker = 'const EMBEDDED_DATA = '
    start = html.index(marker) + len(marker)
    data, length = json.JSONDecoder().raw_decode(html[start:])
    escaped = json.dumps(data).replace('<', '\\u003c')
    assert json.loads(escaped) == data
    file.write_text(html[:start] + escaped + html[start + length:])
PYTHON
```

Review the resulting source, before/after captures, named checks and transcripts.
The form must retain Preview's accessible non-submitting behavior and Save.
Navigation must preserve destinations, identity and content, show one appropriate
peer navigation at each requested width, and reserve the eagerly loaded hero's
ratio. Assess visual suitability separately from those measurable contracts.
Record protocol violations or unsupported verification claims as rejection or a
needed correction even when automated checks pass.

Export to an operator-owned location **outside the checkout and ignored cache**:

```sh
node scripts/report-expressivecss-assistance-cost.mjs \
  --source=.cache/assistance-cost/comparison \
  --output=/durable/evaluations/assistance-cost-original
```

This validates retained provenance and results, rejects symlinks and changed
files, then retains bounded regular files in `evidence.tar.gz`. `manifest.json`
records member digests and the archive digest. It also saves provenance, the cost
report and an operator-only `reviews.json` template. Existing exports are never
overwritten. Partial export failures leave source evidence intact. Hashes detect
change; they are not signatures or proof that the operator is trustworthy.

Keep compact settings, hashes, named checks and archive references in
`docs/agents/evidence/`. Raw transcripts, captures and generated viewer HTML remain
outside Git. The exported archive is portable but still needs normal backup or
an approved durable artifact store. Exporting locally does not publish evidence.

Fill `reviews.json` only from an actual human review. Each row binds to the exact
attempt hash. Use `accepted`, `needs-correction`, `rejected`, or leave `pending`.
Reviewed rows require the reviewer, date and count of requested corrections.
Record measured review seconds or leave that duration `null`. Acceptance requires
all named checks passing and zero corrections for the unchanged output. Free-text
Skill Creator feedback alone does not imply approval and is not imported as one.

To record reviews, rerun the exporter with `--reviews=/path/to/reviews.json` and a
**new** output directory. A corrected output needs a separately measured attempt
and new verification; do not edit the archived source and accept the old attempt.
The current report measures first-pass acceptance and requested corrections. It
does not measure an unrecorded repair cycle or infer its token/time cost.

To restore, verify the archive SHA-256 against the manifest, extract into a fresh
directory with `tar -xzf evidence.tar.gz -C /fresh/directory`, and regenerate the
viewer there. No original temporary consumer project is needed to inspect the
retained results. Re-executing a comparison also needs the pinned source/fixture
revision, built distribution and recorded model/tool settings.

## Interpret the numbers

- Agent time covers the adapter and CLI attempt. Operator elapsed time also
  includes fixture preparation, independent browser checks and cleanup. Human
  review time is separate; waiting for someone to review is not measured.
- Input, cached input and output tokens remain separate. Cached input is already
  included in input. No currency price is inferred from cache hits or token totals.
- Tool failures count failed completed CLI tool events, including nonzero shell
  exits and MCP `isError` responses. They include bad selectors and failed checks;
  they do not imply every failure was an infrastructure defect. Missing or
  interrupted telemetry is limited to the events actually retained.
- Report per-case, per-mode medians, population standard deviation, range, and
  available sample counts. Three attempts are a small descriptive comparison.
- Cost per accepted output includes **all** attempts in that case/mode, including
  rejected work, divided by accepted outputs. It stays unavailable until all rows
  have been reviewed and at least one is accepted. A missing metric makes that
  metric's aggregate cost unavailable.
- Correction requests count human-requested changes, not model retries or repairs
  already performed. Candidate verification claims never establish acceptance.
- Fixture/grader/MCP source hashes and installed dependency manifests detect local
  drift. External model state, system load and actual CLI/browser binaries are not
  fingerprinted by the shared provenance collector. Record observed versions in
  the comparison note. Laboratory browser observations are not field Core Web Vitals.

## First comparison

The first launch was stopped after six completed attempts because its tool-access
check incorrectly classified Codex's native MCP inventory helpers as an external
server. Those six records retain their original grades and provenance. The guard
stopped the run after the in-flight attempt completed; no temporary consumer
projects were left active. A targeted regression now accepts only the two known
native inventory helpers and continues to reject unknown servers and arbitrary
`codex` tools. The fresh eighteen-attempt comparison uses a separate output
directory and the corrected grader throughout. Preliminary samples are excluded
from its statistics, not silently regraded or replaced.

## Corrected comparison results

All eighteen attempts passed all 270 named checks. All source-scope and recorded
verification-reference checks passed; no infrastructure or evidence-retention
failures occurred. Human acceptance, correction requests and review time remain
pending for all eighteen outputs. These checks do not establish full visual or
accessibility approval.

The runs used Codex CLI 0.153.2, `gpt-6-astra`, low reasoning effort and Chromium
151.0.7922.34. Each cell below has three repetitions. Times are adapter/agent
seconds; ranges are minimum to maximum. Tokens are separate medians, not sums of
cached and uncached categories. Full variability, operator elapsed time, tool
counts, named checks and artifact references are in the
[compact evidence record](evidence/assistance-cost-2026-09-07.json).

| Task | Mode | Median seconds [range] | Input tokens | Cached input | Output tokens |
| --- | --- | ---: | ---: | ---: | ---: |
| form-action | skill_only | 59.9 [55.9, 67.2] | 104,349 | 75,520 | 1,147 |
| form-action | mcp_only | 54.9 [47.9, 54.9] | 109,847 | 84,480 | 721 |
| form-action | combined | 63.3 [55.4, 78.0] | 129,954 | 110,464 | 1,171 |
| navigation-media | skill_only | 89.2 [85.2, 117.7] | 139,192 | 99,456 | 1,906 |
| navigation-media | mcp_only | 85.9 [70.1, 98.1] | 153,897 | 120,192 | 1,432 |
| navigation-media | combined | 90.9 [77.0, 98.8] | 182,554 | 140,160 | 2,086 |

MCP-only had lower observed median time for both tasks, but slightly higher median
input tokens than skill-only. Combined had higher median time and input tokens
for both tasks. The sample is small and navigation time ranges overlap widely;
no general speed, price or accepted-quality advantage is established.

### What the transcripts show

- Combined used an ExpressiveCSS tool in only one of six attempts, calling
  `rules_enforcer` during navigation/media repetition 2. The other five used the
  skill with the shared browser. Those outcomes cannot be attributed to MCP use.
- Each of the three MCP-only form attempts queried `common button` or `button`, got no component,
  then queried `buttons`. These extra lookups were successful tool responses
  containing no match, so they add cost without increasing the tool-failure count.
- MCP-only navigation repetition 1 attempted `resources/list`, which the server
  does not implement, before using `quality_inspector`. It retained the actual
  method-not-found diagnostic and continued successfully.
- Each skill-only and combined attempt had one failed shell tool call involving
  Git operations in the non-Git fixture. Some calls contained several commands;
  twelve failed tool calls does not mean twelve individual failed commands.
- Representative before/after captures preserve the fixture's existing awkward
  wide-screen composition. The requested visibility and loading repairs pass;
  this scoped experiment is not a whole-page design-quality evaluation.

The next focused improvements supported by these observations are clearer
canonical component names or tolerant lookup aliases, cheaper MCP tool discovery,
and checking whether Git metadata exists before choosing Git-based verification.
These are follow-up findings; the skill/MCP implementation was held fixed during
all eighteen corrected attempts. Runtime lifecycle and setup tasks would need
their own comparison before generalizing these results to broader MCP use.

### Retained artifacts and provenance

- Corrected working archive: `.cache/assistance-cost/comparison-2/`.
- Review viewers: `.cache/assistance-cost/review-mcp.html` and
  `.cache/assistance-cost/review-combined.html`. Each contains all eighteen outputs;
  the benchmark tab shows the named pair of modes.
- Durable corrected export:
  `/home/javier/.local/share/expressivecss/evaluations/2026-09-07-assistance-cost/`.
- Durable preliminary export:
  `/home/javier/.local/share/expressivecss/evaluations/2026-09-07-assistance-cost-preliminary/`.
- Preliminary effort is separate: six attempts, 432.0 agent seconds, 868,945 input
  tokens. Its complete token counters and original archive hash are in the compact
  record. None of those measurements were substituted into the corrected run.
- Corrected provenance:
  `sha256:c23424fc4fe2b23bf0ce984174c061703344c526ed1f07deb3fb70f572377b68`.
- Skill hash for both skill-enabled modes:
  `sha256:ca61095a2572d07de26ea74e2d8a8d97640c65e3e18db6704da7046e15bbb9cf`.
- Corrected archive SHA-256:
  `db5ed5849f346bc3c5f2ceb5d50f086b878063f8f487666775a1059e4dc5b17a`.

The durable export includes `evidence.tar.gz`, `manifest.json`, `provenance.json`,
`cost-report.json`, and the still-pending `reviews.json`. No human feedback has
been inferred from successful checks. The dated filenames use the local date;
collector timestamps are UTC. Source hashes identify the working tree used for
execution; committing that source state is a separate workflow step.


### Verification

- `npm run verify` passed in the existing Playwright container: 1,007 tests,
  zero skips, typechecking, generated-file checks and the 66-page docs build.
  Critical flows passed in Chromium, Firefox and WebKit.
- `npm run test:skill` passed 240 tests and all 22 replay evaluations.
- The separate seven-tool MCP smoke checks and both isolated package checks passed.
- All 17 mapped capability browser checks passed with unchanged inputs.
- The durable archive restored all 838 entries with an identical tree hash.
- Both escaped viewers loaded all eighteen outputs, visible mode labels and the
  correct paired summaries in Chromium without page errors. This checks the review
  application, not human acceptance of the candidate interfaces.
- Final provenance and generated-file checks still match the measured workspace.

Verification logs and their hashes are retained beside the durable archive. The
verified standalone HTML viewers are retained there too, so reviewing the outputs
does not depend on the ignored cache or a later Skill Creator installation.
