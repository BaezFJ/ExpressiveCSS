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
