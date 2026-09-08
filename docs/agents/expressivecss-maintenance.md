# Maintaining interfaces across requests

The maintenance evaluation carries an implementation through three requests
using fresh Codex processes. Each process receives the earlier requests and
actual resulting files. The final request changes one earlier requirement;
the remaining behavior must survive. This evaluates handoff through explicit
history and files, not persistent model memory.

The two sequences reuse the existing Common Ground examples:

| Sequence | First change | Follow-up | Revised requirement |
| --- | --- | --- | --- |
| Settings | Add Event cancellations to Email updates | Add unsaved reset-to-defaults | Reset only email options, preserving Quiet hours |
| Editor | Add an accessible live message count | Include count in Save feedback | Include Save count only in the expressive treatment |

The runner extends the existing evaluator with its materializer, Codex adapter,
bounded source retention, browser boundary, telemetry and provenance. It adds
no dependencies or alternate test framework. See the
[commands and grading boundaries](expressivecss-skill-evals.md#maintenance-across-requests).

The operator checks each parent hash before running a stage, verifies the
previous contracts in a browser, then checks completion and cumulative behavior
after the edit. Only the HTML and application JavaScript may change. A failed
stage blocks its successors without erasing completed results or silently
repairing the candidate's files. Another independent sequence can still run.

Browser observations cover the requested controls, save/reset feedback, focus,
safe subject preview, retained formatting across simulated bfcache cycles,
live counts, treatment changes, selected themes and viewport widths. Assertions
use actual DOM state and interactions. Candidate claims do not establish a pass.
Screenshots remain available for separate human review; the automated result
does not establish overall design quality or full accessibility conformance.

Regression tests exercise working implementations of all six stages, then
deliberately restore the obsolete whole-form reset and remove live-count updates.
Both regressions must fail. A synthetic interrupted adapter additionally checks
artifact retention, blocked successors and unavailable cumulative cost. An
existing output directory is rejected to prevent mixing unrelated chains.

The current skill is being measured as a maintenance baseline. No instructional
change is presumed necessary, and this is not an old/new skill comparison.
One run per stage cannot establish reliability across repeated runs, projects,
models, or longer maintenance histories. Chain token and duration totals include
only measured Codex work; browser grading time is separate.

## First recorded run

The run used `gpt-6-astra`, low reasoning effort, workspace-write, and a fresh
ephemeral process at every stage. The skill's instruction content was unchanged
from `d9d1e2f`; regenerated capability provenance accompanied the new evaluator.
Its frozen skill hash was
`sha256:a4334d69584e2388a89c67fdbb5d5e930a0b2b0954c5762367173c11c14b3fd8`.

| Stage | Seconds | Input tokens | Cached input | Output tokens | Tool calls |
| --- | ---: | ---: | ---: | ---: | ---: |
| Settings: cancellations | 47.1 | 221,098 | 187,520 | 1,272 | 14 |
| Settings: whole-form reset | 60.3 | 242,556 | 205,184 | 1,856 | 14 |
| Settings: email-only reset | 59.5 | 234,039 | 188,416 | 2,069 | 15 |
| Editor: live count | 63.4 | 247,592 | 209,920 | 2,369 | 21 |
| Editor: count in Save | 58.8 | 239,315 | 204,416 | 1,832 | 16 |
| Editor: expressive-only feedback | 58.8 | 238,375 | 203,776 | 1,648 | 14 |

Cached input is a subset of input tokens. Settings used 167.0 seconds and
702,890 input-plus-output tokens across its three stages. Editor used 181.0
seconds and 731,131 tokens. These are observed totals, not estimates of future
cost or measurements of end-to-end elapsed time.

All six stages passed their operator browser contracts and scoped-change checks.
The final editor stage initially failed one reporting check, giving 87/88
checks overall. Its exact Git error appeared in the recorded output of a
compound command that ultimately exited zero. The adapter previously kept only
nonzero-exit commands as evidence, so it rejected a truthful diagnostic quote.

The shared adapter now retains bounded quoted diagnostics from completed
zero-exit commands separately from failed commands, with their event ID and
actual exit code. It matches the quote against observed output; it does not
infer a subcommand exit status or establish that every interpretation of the
text is correct. Tests cover the real adapter path, missing and invented text,
unfinished events, resource limits and redaction.

An operator regrade of the retained transcript corrected this one check to
88/88. No candidate source, response, browser observation or original result
was changed. `.cache/maintenance/run-1` preserves the original failure;
`evidence-regrade.json` pins the original grading, response and transcript,
plus the revised adapter and regrade script. The `review` copy and generated
`review.html` show the correction explicitly. Human design review remains
pending. Sample captures show the final interaction state, which can include
feedback from the previous treatment after a treatment switch.

This run found an evaluator defect, not an instruction gap requiring more
mandatory skill reading. The normal framework source, public API, styles,
package exports and example sources were unchanged. Concurrent `fallow`
dependency edits were excluded from verification and left untouched.

Final verification passed `npm run verify` with 1,002 tests and no skips,
`npm run test:skill` with 235 tests and 22 replay cases, the seven-tool MCP
smoke test, and both isolated package checks. Contributor verification ran
in the official Playwright container with Chromium, Firefox and WebKit.
The maintenance sequences themselves used Chromium. The capability collector
passed 17 mapped checks and the existing commands regenerated skill/MCP data.
