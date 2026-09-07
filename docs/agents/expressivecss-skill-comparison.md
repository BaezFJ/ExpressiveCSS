# ExpressiveCSS skill reliability and performance comparison

The original 36-run study below describes the first reliability revision. The
[browser and grading follow-up](#browser-and-grading-follow-up) records subsequent
changes and six focused executions separately.

## Changes and verification

The skill now has one routing policy, task-specific discovery descriptions,
component-local adaptive guidance, and focused browser-performance guidance.
The complete basic-button reading path is **30,368 bytes**, down from **40,670**,
a **25.3% reduction**. This counts entire files, including the decision index.
It is not an estimate of model tokens.

Version resolution separates a comparison match from bundle availability and
public-site provenance. Explicit version overrides cannot relabel a different
bundled manifest or claim a missing bundle. Current website safety is not inferred
from local version agreement.

The evaluator now materializes runnable consumer projects, independently checks
basic output changes, accepts equivalent structured evidence without canned
artifact names or prose, and retains partial results and infrastructure failures.
The Codex adapter records observed settings, usage, timing, and tool events while
keeping candidate claims separate from execution evidence.

Contributor verification passes **903 tests with no skips**, generated-file
checks, and documentation verification. The dedicated browser suite passes
**7 tests**; MCP smoke passes **7 tools** following a clean MCP dependency
installation. Isolated framework and MCP package verification also passes.

The earlier empty subprocess output was a sandbox restriction, reproduced as
`spawnSync ... EPERM`. Running authorized checks outside that sandbox restored
normal process I/O; test assertions were not weakened.

## Comparison protocol

Six tasks cover a CSS-only form action, token-only branding, tooltip remounting,
a no-edit audit, responsive navigation/media, and unavailable older-version
guidance. Each version runs three times per task on independent copies of the
same case fixture. Old/new pairs run concurrently with alternating dispatch order.
The model is the observed configured Codex default, GPT-6 Astra with high reasoning.

The old skill and initial revised skill are immutable snapshots. An additional
guard for explicit contract-version overrides was added after the revised snapshot
was frozen. Its 40 resolver regression tests and MCP smoke pass; the six live
scenarios use default manifests and their behavior is unchanged by this guard.

One in-progress audit pair was interrupted before the responsive case to correct
an unrelated 5px baseline header overflow in that case's preparation. Completed
pairs were retained only after their skill hashes and prompts matched. Interrupted
attempts are not counted among completed comparisons. The corrected responsive
fixture is identical for both versions and all its repetitions.

## Repeated implementation results

**36/36 completed runs pass all named automated checks**, including **18/18 revised runs**. There are no completed-run infrastructure failures. These grades establish the task-specific assertions below; they do not certify every candidate-reported diagnostic or full accessibility conformance.

Independent review of all 36 outputs, 332 recorded commands, and 41 file-change
records found no unexpected application-source edits or unsupported browser or
target-version pass claims. Unretained candidate test files and redacted paths
limit inspection outside the saved application sources; specific uncorroborated
diagnostics are listed below.

Values are medians with minimum–maximum ranges across three runs per cell. Population standard deviations and individual observations remain in the machine-readable benchmark.

| Task | Old time, seconds | Revised time, seconds |
| --- | ---: | ---: |
| CSS-only form action | 100.8 [82.2–129.9] | 64.7 [60.1–82.9] |
| Brand tokens | 66.2 [65.3–69.3] | 75.5 [65.9–82.9] |
| Tooltip remount | 150.8 [122.8–161.3] | 136.0 [119.7–142.4] |
| No-edit audit | 146.5 [126.7–156.8] | 139.9 [139.6–151.5] |
| Navigation and media | 150.4 [148.6–181.6] | 143.2 [138.9–166.9] |
| Version mismatch | 77.7 [65.5–78.9] | 64.3 [60.4–66.3] |

| Task | Old tokens, thousands | Revised tokens, thousands |
| --- | ---: | ---: |
| CSS-only form action | 302.2 [261.5–390.7] | 173.0 [170.6–215.4] |
| Brand tokens | 201.6 [200.6–234.0] | 206.5 [206.0–239.1] |
| Tooltip remount | 334.1 [333.6–356.6] | 331.0 [292.0–337.6] |
| No-edit audit | 393.1 [392.8–427.9] | 331.3 [270.5–447.6] |
| Navigation and media | 467.5 [463.6–578.7] | 543.5 [438.9–625.6] |
| Version mismatch | 196.0 [149.6–211.9] | 117.4 [117.1–146.9] |

Tokens are total input plus output across the run; input includes cached tokens. Raw records preserve input, cached input, output, tool counts, observed guide reads, settings, duration, and skill hash separately.

The button task has a **35.8% lower time median** and **42.7% lower token median** in this sample. Version-mismatch work also improves in this sample. Theming has a higher time median, and navigation uses a higher token median. With only three repetitions, overlapping ranges, shared-machine concurrency, and model-service/cache variation, these results do **not** establish a general speed improvement.

## Generated-interface observations

The operator repeats the same local browser scenario before and after navigation/media changes. Both versions preserve one appropriate navigation, all three destinations, branding, content, and the Save action at 375, 839, 840, and 1024 pixels. All six tooltip outputs pass independent lifecycle checks, and all six no-edit audits retain unchanged project hashes.

| Viewport | Old CLS, before → after | Revised CLS, before → after |
| --- | ---: | ---: |
| 375px | 0.125 → 0.000 | 0.125 → 0.000 |
| 839px | 0.320 → 0.000 | 0.320 → 0.000 |

CLS values are laboratory medians from three runs. All navigation captures load seven resources; full per-resource timings, LCP observations, and before/after screenshots are retained. This tiny unthrottled fixture supports the dimension-reservation fix, not a production loading-speed claim.

## Review artifacts

The local artifact archive is `.cache/expressivecss-skill-comparison/` (ignored by Git). It preserves both skill snapshots, all implementation and discovery transcripts, per-run grades, screenshots, timing, and verification logs.

- [Skill Creator review viewer](../../.cache/expressivecss-skill-comparison/iteration-1/review.html)
- [Benchmark statistics and all run records](../../.cache/expressivecss-skill-comparison/iteration-1/benchmark.json)
- [Discovery results](../../.cache/expressivecss-skill-comparison/discovery/trigger-results.json)

Baseline snapshot: `sha256:e7eaca550b9bda07b49223a48f59364c8e7928451f0cb114edfb50d1b8007f22`.
Revised benchmark snapshot: `sha256:eeb8307a8bdb1f25ded84e5c44d24f288f42d5e0be77f3c0ca767f5ac6e008a7`.

## Discovery probes

The revised skill correctly loads or stays unloaded on **20/20** constrained
discovery probes. The old skill does so on **19/20**: it unnecessarily reads its
root guide for a framework-independent Material 3 design question, then correctly
decides the skill does not apply. Both versions ultimately classify all twenty
requests correctly.

These are one-pass, controlled discovery probes, not estimates of natural-task
invocation rates. They are separate from implementation outcomes and repeated
performance measurements. The fixture records the twenty prompts so future
comparisons can extend coverage rather than optimize only this set.

## Interpretation limits

- Automated grades cover named task requirements, not every design or WCAG
  criterion. Source completion and successful JavaScript calls do not establish
  a complete accessibility review.
- An independent review of the first responsive refinement confirms preservation
  of content, branding, destinations, and visible actions. Its fixture inherits a
  full-height rail placed above the main content; that existing composition is
  not evidence of a polished production design.
- Browser metrics are local laboratory observations. They are not field Core Web
  Vitals, and the fixture is too small to predict production performance.
- Complete guide contents observed in successful command output count as reads.
  Partial reads and unobservable tools remain unavailable. Paths mentioned in a
  response or command alone do not prove a read.
- The old-skill audit in repetition 2 and revised-skill audits in repetitions 1 and 3
  report a local-server `listen EPERM` failure without a corresponding execution
  event in the retained transcript. Their separate browser-tool blockers are
  corroborated, and neither claims a browser pass. The specific server failure
  remains uncorroborated; it is not counted as observed execution evidence.
- Both navigation responses in repetition 3 also include server, Chrome, or
  collaboration blocker details without matching retained output. Connector
  denials and Chrome failure are recorded; the extra diagnostic details remain
  unverified and receive no evidence credit.
- The revised tooltip run in repetition 3 reports a successful mock test inside
  a compound command whose recorded failure output comes from Chrome. Individual
  subcommand statuses are unavailable. The evaluator awards lifecycle credit
  only for its independently collected browser checks.
- Input-token totals include cached input; the raw report retains cached and
  output counts separately. Per-case timing medians and ranges are more useful
  than aggregate variance across tasks of different complexity.

The generated Skill Creator review viewer contains screenshots, source outputs,
formal grades, and benchmark data. Human review of the full output set is still
required before making a release-quality claim. No release or installation was
performed by this change.

## Browser and grading follow-up

Candidate execution now has a preflighted, operator-owned browser connection.
Four runnable candidates used it during their tasks; the two older-version
fixtures explicitly lacked matching runnable code and reported browser checks
unavailable. Independent post-run checks still determine lifecycle completion.
Error claims must match retained browser, console, command, or connector output.
Audit and version assertions now check source facts and effective proposed fixes,
with full-project manifests detecting unauthorized changes beyond the main file.

This follow-up uses the committed first revision (`bb95b39`) as its baseline,
not the pre-improvement baseline from the original study. Both versions used
`gpt-6-astra`, high reasoning, the same fixtures and ephemeral tool configuration;
audit shells were read-only and implementation shells permitted workspace writes.
Each pair ran concurrently with alternating dispatch order. One execution per
case and version is a correctness check, insufficient for a speed or variability
claim. Input totals below include cached input; cached and output usage remain
separate in the raw artifacts.

| Case | Baseline seconds | Revised seconds | Baseline input + output tokens | Revised input + output tokens | Reviewed checks, each version |
| --- | ---: | ---: | ---: | ---: | --- |
| Tooltip remount | 116.8 | 135.3 | 354,136 | 430,116 | 11/11 |
| No-edit audit | 107.5 | 99.3 | 257,679 | 235,971 | 9/9 |
| Unavailable version documentation | 76.4 | 79.5 | 255,368 | 181,999 | 9/9 |

All six completed their scoped tasks without unauthorized edits. Both lifecycle
repairs passed five independently observed ownership/cleanup checks; audits
preserved every project path and identified the fixture defects; version repairs
changed only viewport metadata and preserved dependency pins and lockfiles.

Three initial grades failed only because the validator rejected real page-console
errors recorded during successful inspection calls. Independent review confirmed
each exact error excerpt in the operator records. The corrected validator was
applied to retained evidence in a separate reviewed copy; these are corrected
grades, not additional model runs. Original grades, responses, and their hashes
are preserved. The warnings also exposed a fixture CSP issue with embedded
checkbox images. The fixture now permits data images, verified by a browser
regression test; that policy correction was not active in the six historical runs.
An earlier two-run integration trial is retained separately: its browser worked,
but Codex rejected tool calls until the ephemeral configuration explicitly
approved this fixture-only tool.

Artifacts live in `.cache/expressivecss-evidence-workspace/`: `iteration-2` holds
the original six results and independent operator review; `iteration-2-reviewed`
contains the corrected grades, `verification-review.json`, and the existing
Skill Creator `review.html` viewer. Screenshots from candidate browser calls are
included alongside independent captures and source outputs. Human visual review
remains outstanding. These checks do not establish broad accessibility compliance,
production performance, or the truth of arbitrary free-form claims.

The current complete basic-button read path is **30,501 bytes**, retaining a
**25.0% reduction** from the original 40,670-byte baseline. Contributor verification
passes **919 tests with no skips**, generated-file and documentation checks.
The skill suite passes **170 tests** plus its 22 replay cases; the dedicated browser
suite passes **13 tests**. MCP smoke verifies **7 tools**, and both isolated package
checks pass. No framework API, stylesheet, package export, dependency, or saved
Codex configuration changes were introduced.

## Complete-interface evaluation follow-up

The next comparison uses committed `dd3bd6d` as its baseline. It adds the two
reviewed tasks on the same Northstar account dashboard: refine the complete page
while preserving identity and behavior, and review it without editing files.
Thirteen matched scenes cover six responsive widths, dark mode, long content,
loading, empty, error, offline and doubled computed text sizes. Separate browser
traces exercise pointer and keyboard Save, confirmation, and drawer focus return.
The existing Design matrix guides independent interpretation of hierarchy,
typography, containment, identity, states and focus; automated assertions do not
award an overall design score.

Two diagnostic rounds each ran both tasks against both skill snapshots using
`gpt-6-astra`, high reasoning, the same fixture and tool access, a 100-call browser
budget and a ten-minute execution deadline. Dispatch order alternated and each
old/new pair ran concurrently. These eight runs are correctness investigations,
not repetitions of an unchanged performance protocol. No timing median,
variability estimate or speed improvement is claimed.

| Round | Task | Baseline seconds / named checks | Revised seconds / named checks |
| --- | --- | --- | --- |
| 1 | Complete-page refinement | 517.1 / 144 of 145 | 547.0 / 143 of 145 |
| 1 | No-edit review | 457.0 / 35 of 36 | 505.3 / 36 of 36 |
| 2 | Complete-page refinement | 601.0 / 141 of 145, incomplete | 601.0 / 141 of 145, incomplete |
| 2 | No-edit review | 600.8 / 33 of 36, incomplete | 519.9 / 36 of 36 |

The table preserves original grades. Round 1 exposed relative screenshot paths
and aggregate redaction that dropped early records in large archives. The shared
browser tool now returns absolute capture paths, supports bounded full-page
captures and reports remaining calls. Adapter retention applies the existing
redaction limits separately to records and manifest entries. Round 2 retains all
100 candidate browser calls plus preflight, including early evidence. Regression
checks cover these failures without increasing resource limits. Uncorroborated
tool-error claims in round 1 remain unverified; the incomplete archives limit
further diagnosis.

Round 2's two refinements retained their edited pages and passed the independent
scene and interaction checks, but both timed out before delivering the required
report. Their grades also contain one source-label false positive: a documented
tooltip description nested in the help button was counted as a changed control
name. The corrected shared assertion accepts that description while preserving
the accessible name. `grading-corrections.json` verifies both retained source
hashes against the operator manifests and records 142 of 145 named checks for
each refinement. It leaves original grades unchanged and preserves all three
completion/report failures. This correction is not another model run.

The revised round-2 no-edit review completed with unchanged project hashes and
36 of 36 named checks. Its input usage was 1,759,457 tokens, including 1,620,864
cached tokens, with 14,485 output tokens and 113 recorded tool calls. Usage for
the three timed-out runs is unavailable, not zero. Budget exhaustion remains a
practical limitation of complete-page work; passing browser checks does not make
an unfinished candidate successful.

Independent inspection found the revised no-edit report substantially supported
by captures, source and recorded behavior; the baseline's interim observations
were accurate but incomplete. A blind refinement comparison marginally preferred
the revised result for compact task prominence and clearer error feedback. Both
corrected the wide rail displacing the primary task. Apparent fixed-navigation
overlap in full-page screenshots was withdrawn as a defect after supplemental
scrolling, hit-testing, native activation and doubled-text keyboard checks showed
that content cleared the bar. This is a limited qualitative preference, not proof
of general improvement or acceptance of the unfinished deliveries.

Artifacts are retained under `.cache/expressivecss-interface-workspace/`:
`iteration-1` preserves the first protocol, `iteration-2` the repaired protocol,
and `blind-refine` the independent screenshot comparison and supplemental browser
checks. Each iteration has the existing Skill Creator `review.html`, source,
operator captures, transcripts and original benchmark data. The round-2 viewer
shows original grades; read its adjacent `grading-corrections.json` with them.
Retained source is redacted review material, not necessarily executable: any
supplemental reconstruction must use the original fixture runtime and identify
the candidate HTML/CSS overlay and its hashes.

Human visual review remains pending. English/LTR and doubled text-size stress do
not establish localization, screen-reader behavior, browser zoom conformance or
field performance. The full basic-button read path remains 30,501 bytes. Final
contributor verification passes 926 tests with no skips, and the skill suite
passes 177 tests plus 22 replay cases. Generated guidance is regenerated through
the existing build command; the dedicated browser suite passes 13 tests. MCP
smoke verifies seven tools and both isolated package checks pass. No framework
implementation or dependencies change.

## Investigation of the theming and navigation regressions

This investigation reopens the twelve original `brand-token` and
`navigation-media` transcripts, three runs per version and task. It does not mix
the later browser-enabled protocol into the original timing sample. The archived
skill hashes above identify the guidance actually used. Complete Markdown text
was matched against those immutable snapshots, including output preceding a
compound-command failure. The resulting event IDs, source hashes, guide exposures
and raw usage are in
`../../.cache/expressivecss-performance-investigation/transcript-summary.json`.
This is retained-evidence analysis, not a new model benchmark.

| Observation, median unless stated | Theming old | Theming revised | Navigation old | Navigation revised |
| --- | ---: | ---: | ---: | ---: |
| Seconds | 66.2 | 75.5 | 150.4 | 143.2 |
| Input plus output tokens | 201,601 | 206,506 | 467,548 | 543,508 |
| Uncached input tokens | 31,730 | 28,090 | 45,351 | 43,575 |
| Cached input tokens | 173,568 | 177,408 | 424,960 | 496,640 |
| Output tokens | 1,275 | 1,437 | 3,432 | 3,293 |
| Tool calls | 10 | 9 | 18 | 16 |
| Complete guide exposures by run | 3 / 3 / 3 | 3 / 3 / 3 | 8 / 8 / 7 | 11 / 16 / 11 |
| Duplicate guide exposures by run | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 2 / 5 / 2 |

Each metric has its own median; column medians are not additive. Input totals
include cache hits and are neither unique context size nor a monetary cost
estimate. There are no per-event timestamps or token totals to assign an exact
latency or token penalty to an individual read or retry.

Theming does not support a guide-bloat explanation. All six runs exposed Theming,
color and themes exactly once, with 16,070 bytes of complete guide content in each
old run and 15,991 in each revised run. These counts exclude the operator-supplied
root, unrelated skills and partial reads. Each run produced one version-resolution
result and one final source-preservation check. All six also encountered the
fixture's missing Git repository once. That shared setup mistake does not explain
the old/new difference, and it did not become a Git retry loop.

Revised theming run 1, the slowest at 82.9 seconds, attempted `node server.mjs`
in `item_9`, received `listen EPERM`, then tried the Playwright connector in
`item_12`, which required unavailable approval. This is observable extra work.
The 75.5-second median run made only seven tool calls, however, so the failed
browser route cannot by itself explain the median increase. Revised runs 2 and 3
claim a blocked server without a corresponding server-launch event; those claims
are not evidence of additional measured retries. Old runs each issued one public
documentation search, whereas revised runs used matching bundled guidance.
No further shortening of the theming references is justified by this sample.

Navigation has specific avoidable reading. Revised run 1 rereads Design and Usage
in `item_5` after complete output in `item_3`. Run 2 rereads Design in `item_5`,
then navigation rail, Runtime, media and the evidence ledger in `item_8`. Run 3
rereads Usage and Theming in `item_5`. Duplicate complete output totals 18,926,
31,550 and 8,069 bytes respectively. The transcripts do not establish whether
the model's display truncated earlier output, so these are repeated exposures,
not proof that every reread was unnecessary to that model.

Revised navigation also follows the stricter Refine route, loading Design and
Theming that the old runs omitted. Removing required design or accessibility
coverage to match the old read volume would trade away correctness. Run 2 alone
loads the 22,057-byte review matrix and 5,239-byte evidence ledger, and has the
highest token total. The matrix belongs to Critique, Audit and combined finish
reviews; a narrow repair should establish whether that scope is actually needed
before loading it. Each of the six navigation runs resolves the version once.

All revised navigation runs repeat a denied Playwright call with another tool
from the same connector. Old runs 1 and 3 do so too. Revised run 2 additionally
tries Chrome DevTools. This is real retry overhead across both versions, not a
new revised-only behavior. Current guidance already stops permission/connection
retries until capability changes, and the current adapter supplies a preflighted,
fixture-only browser. Those changes postdate the sample and must be evaluated
under their own protocol, not credited retroactively with faster historical runs.

Old navigation run 1 repeats its static checker in `item_20` after `item_18`
already prints passing checks; the earlier compound command also contains a diff
and returns 1. Other navigation runs execute one final static validation script.
A nonzero compound-command status does not identify which subcommand failed.
Local browser exits with empty output likewise do not establish the specific
socket errors claimed in some candidate reports.

The investigation uncovered a measurement defect worth fixing now: the adapter
discarded complete guide output whenever the compound command exited nonzero.
That undercounted two theming references in revised runs 2 and 3, and six guides
in old navigation run 3. Read detection now accepts complete observed text while
retaining the failed command status. A regression test rejects partial output and
claimed reads and verifies that the original failure remains archived. Historical
grades and telemetry remain unchanged; the table uses the explicitly corrected
exposure analysis.

The next performance experiment should isolate reuse of already available guide
content, requesting only missing or truncated sections when needed. Keep the
current browser route, model settings, fixture and correctness requirements fixed.
The present investigation changes measurement and documents supported causes;
it does not claim to have eliminated either regression, weaken verification,
or change the skill's required reading path.

Validation passes 927 contributor tests with no skips, generated/documentation
checks, and 178 skill tests plus 22 replay cases. No new model executions were
needed to reproduce the read-accounting bug; the fake CLI regression exposes
complete text before a failure and verifies the retained status directly.

## Natural discovery and reproducibility follow-up

The natural discovery protocol uses ordinary work requests in disposable consumer
projects. The candidate receives the request verbatim and discovers the local
skill through its normal CLI environment. No applicability question, root guide,
expected label or response schema is supplied in the prompt. Development and
held-out requests are balanced separately, with three ExpressiveCSS tasks and
three adjacent tasks per split. An independent author prepared the held-out set;
neither skill description is changed during this comparison.

The protocol was frozen before either split ran. Its complete identity is
`sha256:4885aad16c58fbd39926fb682d2da8dfc2c9b559460725ecac1ac71cf7010f4b`.
The fixture hash is
`sha256:ecdf42b44db118945125722232d27c8cd1959eee91582ec092a6073b33ca543f`,
and the grader hash is
`sha256:d3b8ea1b392a6443ddccf93fb98086939c9fb89f328d63e5c9ca7c158ed97435`.
The old skill is the original study's `e7eaca55…` snapshot; the current snapshot is
`sha256:6980d9991357035e645dbd9686096186f856addd2c8e88c50033c0c9a38ef5c2`.
Both use `gpt-6-astra`, high reasoning, Node 24.20.0 and a 180-second task deadline.
Old/new dispatch order alternates, with each pair running concurrently.

Results use a complete-root-output proxy. A complete root guide observed in
command output confirms exposure. Missing telemetry receives null and no credit.
An available event stream without complete root text records false for that
proxy, while actual invocation remains unverified. Proxy matches are not actual
activation accuracy, task correctness or evidence of visual quality. Independent
output review must distinguish those outcomes. Each prompt is used once per
version; this is not a repeated performance experiment.

Implementation and natural-discovery resumptions now verify fixture and grader
hashes alongside the skill, plan and recorded settings. Validation checks every
retained row before writing, and requires matching grades and operator artifacts.
Empty run directories, missing or contradictory evidence, changed inputs and
legacy archives without provenance are rejected. The original archives remain
readable. Regression tests cover both changed-input rejection and unchanged
resumption without overwriting retained results.

Artifacts live in `.cache/expressivecss-natural-discovery/`. The `frozen` directory
records the shared protocol; `development` and `heldout` keep results separate.
The actual CLI/browser executable contents and external service state are outside
the fingerprint guarantee. Credentials and unrelated configuration are excluded.

All twelve development executions completed. Each version matched the expected
complete-root-output pattern on three positive and three negative requests, with
no unavailable proxy observations. The negative matches mean no complete root
text was observed; actual invocation remains unverified. Independent review of
retained source and project manifests supports completion of all twelve requested
tasks and found no unauthorized project edits. Both Preview-button responses
claim a browser permission blocker without a corresponding retained server launch
or error. Those causes remain unverified; successful discovery does not validate
candidate-authored diagnostics.

A live resume of the completed development archive launched no new candidates
and preserved `results.json` byte for byte. The existing Skill Creator development
viewer renders all twelve outputs and the benchmark without page errors. Human
review remains pending.

All twelve held-out executions also completed under the same frozen protocol.
Neither version had unavailable observations or proxy mismatches:

| Split | Version | Positive proxy matches | Negative proxy matches | Completed executions |
| --- | --- | --- | --- | --- |
| Development | Old | 3/3 | 3/3 | 6/6 |
| Development | Current | 3/3 | 3/3 | 6/6 |
| Held out | Old | 3/3 | 3/3 | 6/6 |
| Held out | Current | 3/3 | 3/3 | 6/6 |

Independent review supports completion of all twelve held-out tasks and found no
unauthorized edits or fabricated verification claims. Both theme explanations
match the installed contract and preserve files; the copy and confirmation edits
stay within scope; both native reading pages preserve the supplied copy without
dependencies. Source reconstructed from redacted exports was executed only after
its SHA-256 matched the operator's after-manifest.

Focused browser checks independently verified both versions' tooltip behavior
through ten remounts, old-instance cleanup, pagehide teardown and preserved
dashboard interactions. Both navigation outputs passed layout checks at 839,
840 and 1280 pixels without horizontal overflow. The candidates' reported browser
blockers are supported by retained failures; these independent checks supply
separate evidence. Candidate-added regression test files were not preserved in
the source exports, so their contents remain unverified. This review does not
establish complete visual or accessibility quality.

The existing Skill Creator [development viewer](../../.cache/expressivecss-natural-discovery/development/review.html)
and [held-out viewer](../../.cache/expressivecss-natural-discovery/heldout/review.html)
each render twelve outputs and their benchmark without page errors. Independent
reviews are retained in `development-output-review.json`,
`heldout-output-review.json` and `heldout-browser-review.json` under the artifact
root. Human comparison remains pending. These local ignored artifacts must be
preserved separately when sharing the report. The one-run-per-prompt results
support neither a general speed improvement nor an actual invocation-accuracy
improvement; both versions have the same observed exposure outcomes.

Validation passes 967 contributor tests with no skips, generated/documentation
checks, 218 skill tests and 22 replay cases, the seven-tool MCP smoke check, and
isolated framework and MCP package checks. No framework API, stylesheet behavior,
package exports or dependencies changed. Regenerated contract and component-guide
source hashes reflect the updated test command in `package.json`.

## Material mapping and foundations

The September 7 follow-up improves design-system knowledge while preserving the
framework contract. Google component inventory was rendered and inspected in
Chrome. The review captured 36 upstream entries, including FAB families that
share an ExpressiveCSS guide and a divider that has no standalone guide. The
existing 46-entry framework catalogue remains the inventory owner; it now records
the relationship, exact upstream link, review date/scope, documented support,
web adaptation, and known limitations for each selected guide.

Google's [component inventory](https://m3.material.io/components) supports the
component mappings. [Canonical layouts](https://m3.material.io/foundations/layout/canonical-examples/overview)
are patterns. Google's [bottom app bar documentation](https://github.com/material-components/material-components-android/blob/master/docs/components/BottomAppBar.md)
marks that baseline component deprecated for Expressive and points to docked
toolbars. The [rail overview](https://m3.material.io/components/navigation-rail/overview)
identifies expanded rail as the drawer replacement. These are design directions,
not grounds to remove a consuming application's existing behavior.

Fieldsets, floating sheets, generic drag handles, select/autocomplete, and banners
have related guidance rather than verified dedicated current component specs.
Footer, breadcrumbs, pagination, scrollspy, and lightbox remain web extensions.
Absence from the reviewed current inventory does not prove historical absence.
The mapping records partial review honestly: representative specification links
were observed, but complete specifications and pixel parity were not audited.
Known support summaries come from the identified `llm.md` sections; missing
limitations are unknown rather than a promise of completeness.

The new [shape reference](../../skills/expressivecss/expressivecss-theming/references/shape.md),
[motion reference](../../skills/expressivecss/expressivecss-theming/references/motion.md),
and expanded [typography reference](../../skills/expressivecss/expressivecss-theming/references/typography.md)
compare Google's Android design evidence with emitted CSS and component source.
Android attributes are not CSS APIs. Tests verify example token declarations and
consumers, bundled font weights, the sampled button-group spring, and absent
global token families. Expanding-card CSS duration is independent of runtime's
500ms close cleanup; this is a documented framework finding, not fixed here.

Two user-reviewed requests compare committed `f7de257` with the revised skill:

1. Review direct Material support versus framework adaptations for fieldsets,
   floating sheets, bottom app bars, and standalone common-button shape changes,
   without edits.
2. Apply headline-small at weight 500 to `#account-title` and 16px corners only to
   the Save preferences button through existing tokens. Preserve copy, other
   controls, JavaScript, dependencies, and colors; explain the available
   emphasized type, shape, and motion systems without adding animation.

The ordinary requests use the same runnable consumer and configured model, once
per version. Each old/new pair runs concurrently, with launch order alternating.
The existing Codex adapter retains filesystem manifests, transcripts, timing,
usage and redacted before/after sources. The shared provenance collector records
the fixture, skill and evaluator inputs, including the temporary operator script.
Neither prompt labels nor scoring expectations are supplied to candidates.
This is a focused task comparison, not a discovery or speed benchmark.

Local ignored artifacts live under `.cache/expressivecss-material-foundations/`.
The reviewed upstream inventory is `material-inventory.json`; the operator script
and frozen comparison are retained there for inspection. Preserve that directory
separately when sharing this report.

The frozen protocol is
`sha256:f8cbfacc12c98d270e76d930333d90952eef32680bd88c21c74a0daee70bdcc1`.
It records fixture hash
`sha256:ecdf42b44db118945125722232d27c8cd1959eee91582ec092a6073b33ca543f`
and evaluator hash
`sha256:2d69262770ad57f2461b7a6673aafa81ac1189b7c8836501c079016283b4f5fc`.
Both versions used `gpt-6-astra`, high reasoning, Node 24.20.0 and a 300-second
deadline. The revised skill hash is
`sha256:e0f62843ae5217e993bc5e578a2792429afca593c0b8239f2f84df74c62cee50`;
the committed baseline is `6980d999…`. Candidate inputs remained fixed throughout.
The later independent review and browser-check artifacts supplement this frozen
execution protocol; they were not part of its evaluator hash.

| Request | Old skill | Revised skill | Independent result |
| --- | --- | --- | --- |
| Support review | 5/5 checks | 5/5 checks | Accurate support distinctions; no edits. |
| Scoped foundation tokens | 6/7 checks | 6/7 checks | Correct source edits; unsupported browser-error claim in both responses. |

Both token responses claimed that a preview server failed with `listen EPERM`.
Neither retained transcript contains that server launch or error. These claims
fail evidence integrity even though the edits themselves are correct. The support
review's approval-policy browser blockers do have retained tool evidence. Web
search events record requests without complete returned pages, so a requested URL
alone does not prove that a candidate read its contents.

Separate operator browser checks matched retained HTML/CSS against filesystem
digests before executing them. At 375px/light and 1280px/dark, both outputs render
the headline at 24px/32px and weight 500 with loaded bundled Roboto, and only Save
has 16px corners. Peer controls and brand colors match the baseline, and Save
still submits successfully. The first operator attempt targeted the visually
hidden native checkbox; the completed check clicks its visible label and verifies
the checked state. This selector correction changes no candidate source. Browser
results are in `browser-review.json` and do not repair the candidates' unsupported
claims. This focused check is not a complete accessibility or visual audit.

The existing Skill Creator [review viewer](../../.cache/expressivecss-material-foundations/comparison/review.html)
renders all four outputs, grades, and the benchmark without page errors.
`comparison/independent-output-review.json` retains the review findings; human
comparison is pending. Both versions completed the source tasks with equal grades.
This small comparison demonstrates the new guidance can be used successfully,
but establishes no accuracy or speed improvement. Reliable reporting of browser
blocker causes remains an evaluation finding for a separate follow-up.

Validation passes `npm run verify` with 969 tests and no skips, `npm run test:skill`
with 220 tests plus 22 replay cases, all 13 browser tests, seven MCP smoke tools,
and isolated framework/MCP package checks. Generated skill and MCP copies are
current. The basic-button read path is 30,444 bytes, preserving the 25% reduction
requirement against the original 40,670-byte baseline.

## Component selection follow-up

September 7, 2026. The source catalogue replaces all 21 generic avoidance
warnings and adds wrong-choice examples to 30 selected component guides. The
index distinguishes jobs; the selected guides explain scenarios. Generated skill
and optional MCP bundles share the same catalogue. No framework behavior or
public API changed.

The basic-button path is **30,159 bytes**, down from 30,444 in the preceding
revision and **25.84% below the original 40,670-byte baseline**. This counts whole
required local files, not tokens or latency. The index stays below 100 lines.

### Approved tasks and method

The user approved two review tasks. Both use independent copies of the existing
runnable account-dashboard consumer fixture, ordinary requests, and the same
configured Codex model, `gpt-6-astra` with high reasoning. Each version runs once
per task. Old/new pairs run concurrently, alternating dispatch order. Both tasks
prohibit edits, installation, and browser-verification claims.

1. Review a mockup with Home/Search/Profile as tabs, Overview/Activity as app
   navigation, submitted Economy/Express delivery values and Cut/Copy/Paste as
   connected button groups, and Bold/Italic command states as segmented inputs.
   Recommend components, state ownership, and keyboard behavior.
2. Review modal Save feedback, timed offline feedback despite continued local
   editing, banner confirmation before irreversible deletion, a short circular
   spinner, a byte-reporting upload with a loading shape, and a minute-long
   unmeasured export with that shape. Explain suitable components, timing,
   accessible state, ownership, snackbar Undo, and indeterminate linear progress.

Exact requests, settings, fixture/grader hashes, operator script, skill snapshots,
redacted commands, source comparisons, filesystem manifests, and telemetry remain
in `.cache/expressivecss-component-selection/`. The operator's separately recorded
rubric and its hash accompany the review grades; they are not candidate claims
or browser measurements. Source retention redacts part of the fixture JavaScript.
Its original fixture digest matches the operator manifest, and its redacted text
matches the retained copy. All before/after filesystem hashes match.

An earlier draft pair is retained under `draft-comparison/` and excluded from
these results. The provenance guard stopped that comparison after the banner
wording changed to restore an existing MCP selection check. No draft results
were resumed into the final comparison.

Baseline is commit `b4c8033`, skill hash
`sha256:e0f62843ae5217e993bc5e578a2792429afca593c0b8239f2f84df74c62cee50`.
The final revised snapshot hash is
`sha256:c5db3e229bb841dc2859436850e9306c2e1aca69f5241507f3309d03e938fcd9`.

### Observed results

| Task | Old checks | Revised checks | Old seconds | Revised seconds | Old tokens | Revised tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Navigation and controls | 7/7 | 7/7 | 50.2 | 49.2 | 233,484 | 176,657 |
| Feedback and loading | 9/9 | 9/9 | 56.0 | 54.8 | 290,020 | 221,950 |

All four reviews completed with unchanged project files, no installations, and
no fabricated browser pass or blocker in the retained responses. Both versions
correctly distinguished app destinations from panels, submitted native values
from toggle commands, and standard command groups from connected toggle groups.
Both preserved the package's native-link Tabs keyboard behavior rather than
inventing an ARIA tablist implementation.

Both versions chose the intended feedback/loading components. They also caught
that transferred bytes need a known total to establish a fraction and that Undo
requires real reversibility. Both retained indeterminate linear progress and
distinguished CSS-only indicators/banner, manual Snackbar, and native/shared
dialog behavior.

Tokens are input plus output, including cached input. Raw records retain those
fields separately. Revised tool counts were 9 and 11; old counts were 10 and 9.
The revised navigation run read four full component guides versus five in the
old run. Partial guide reads are not counted as complete reads. These are single
observations, so per-case variability is unavailable. The results show successful
component selection with the clearer guidance, **not an established accuracy or
speed improvement**. No interface was implemented or visually assessed by these
review tasks.

### Verification and review

- `npm run test:skill`: 221 tests passed, plus the replay checks.
- `npm run verify`: 970 tests passed without skips; generated-file checks,
  typechecking, builds, and documentation verification passed.
- `npm run test:browser`: 13 tests passed without skips.
- MCP smoke: all 7 tools passed; isolated framework and MCP package checks passed.
- Existing Skill Creator viewer: all four outputs navigable, benchmark visible,
  and no browser page errors. Human comparison remains available.

The first skill-suite attempt overlapped the contributor build and correctly
failed its frozen-provenance check. Repeating after the build passed. MCP smoke
also caught the loss of “transient confirmation” from the banner avoidance
wording; restoring that concrete distinction fixed the failure without changing
the matcher or weakening its regression assertion.

[Open the Skill Creator review viewer](../../.cache/expressivecss-component-selection/comparison/review.html)
and [machine-readable results](../../.cache/expressivecss-component-selection/comparison/benchmark.json).
