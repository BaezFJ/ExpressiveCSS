# ExpressiveCSS skill behavioral evaluations

The behavioral suite checks decisions, source changes, and scope boundaries. Reviewed replay data tests the evaluator; only a live run can test whether an agent follows the skill. The suite does not compare preferred prose or calculate an aggregate design score.

## Case contract

Cases live in `tests/fixtures/expressivecss-skill-evals/cases.json`. Each case declares:

- the user request and project fixture;
- the expected operating mode;
- fixture-owned route, state, viewport, theme, input, and capture coverage;
- guides that must and must not be read;
- required decision and report fields;
- forbidden edits and candidate content;
- critical invariants expressed as structured assertions with stable IDs.

A run starts with only the root skill in context. A guide counts as loaded only when trusted execution evidence records a successful read of its exact repository-relative path. Listing a guide in the candidate response does not count.

For Codex, complete guide text in a completed command's output establishes a read
even when a later step in that compound command fails. Partial output, command
paths and candidate claims do not count. The command retains its original exit
status; observing a read does not award successful verification.

Every critical invariant must be present exactly once and evaluated. Missing, duplicate, unknown, or unevaluated critical IDs fail the case. Mutation tests change guide routes, review statuses, criterion and component bindings, required evidence kinds, coverage records, capture roles, visible-difference classifications, event order, forbidden edits, and no-edit behavior. Refine preservation and Compact/Expanded navigation must match fixture-owned contracts rather than candidate-invented strings. They also reject broad passes synthesized from scoped MCP output and stop live adapters at a bounded timeout. Each mutation must fail for its named invariant.

The three basic implementation cases additionally require operator-owned `completionChecks`. In a live run the evaluator recomputes these from bounded reads of the actual project files, replacing any adapter-supplied values. Setup needs installed package files and a stylesheet import or link; button creation needs an additional enabled, labeled native button; token-only theming needs a valid changed seed with the other inspected sources unchanged. These are static completion checks, not browser or full accessibility passes. Candidate-authored checks do not count.

## Project fixtures

The shared materializer also exposes `example-settings`, `example-editor`, and
`example-list-detail`. These use the exact portable sources from
`skills/expressivecss/assets/examples`, plus the same built package and consumer
server. The example tree is included in `fixtureHash`, so changing its HTML,
styles, handlers, or annotations invalidates a frozen comparison.

The reviewed adaptation prompts in
`tests/fixtures/expressivecss-skill-evals/expression-examples.json` cover a new
checkbox, scoped preview typography, and resetting per-story reading state.
They are live comparison prompts, not additional replay cases or a replacement
for the existing case-contract suite. Use the exported
`materializeProjectFixture` and Codex adapter with these fixture IDs; collect
matched before/after captures and independent browser observations before
removing each temporary consumer. Never grade a candidate's completion claim as
proof that the task works. The sample's session-only state is an explicit task
fact; there is no backend to verify.

`tests/expressivecss-examples-browser.test.js` tests the source examples in both
treatments and themes, at 320/839/840/1280px, including doubled text and complete
keyboard/task paths. It also checks source reuse, no external resource loading,
editor-only framework JavaScript, safe text preview, and formatting teardown.
Run the normal browser suite, or set `EXPRESSIVECSS_EXAMPLE_SCREENSHOTS` to a local
output directory to retain the tested source scenes. Read the examples' README
for the contributor preview command and portable integration instructions.

`consumer-current` is a runnable local consumer, with `/dashboard`, `/home`, `/search`, and `/profile` routes, a labeled checkbox form, named drawer, adaptive navigation, and activity-state controls. The evaluator copies the already-built framework from `dist/`, including its fonts, into the temporary installed package. Build first with `npm run build`; no package download is needed to materialize it. Run `npm start` inside the temporary project to start its local server; it prints its URL. `PORT` can select a port, otherwise the OS chooses one.

The readable `fixture.json` describes route, data, state, viewport, locale, direction, theme, and input facts. Activity states are available through `#preview-state` or the `state` query parameter. Permission state is explicitly unavailable. The tooltip host starts without manual initialization, with a remount control for lifecycle tasks.

Setup uses `consumer-empty`, which has no ExpressiveCSS dependency or stylesheet import. The older-version fixture contains an installed 0.7.0 manifest and lockfile for version-resolution tasks. It does not contain a 0.7.0 runtime: browser claims for that version remain blocked until the matching package is available. The runner never substitutes today's bundle for the older package.

## Trust boundary

Candidate output and execution evidence are separate fields. Evidence artifacts belong to the operator-controlled `executionEvidence.artifacts` array; candidate-authored `evidenceArtifacts` are rejected. The operator grants trust by selecting the live adapter executable or supplying a reviewed replay file. The evaluator does not infer trust from candidate prose, candidate-authored metadata, `source: "adapter"`, or an `authenticated` boolean. Those values are schema assertions inside an operator-controlled channel, not cryptographic authentication.

Matched-capture pair references remain candidate-controlled, while the referenced artifact metadata is operator-controlled. A pair passes only when the trusted before artifact exactly matches the declared baseline sequence and timestamp, the declared first edit exactly matches the first trusted write, patch, create, or delete event, and the trusted after artifact follows that edit in both sequence and time.

A per-case envelope has this shape:

```json
{
  "candidateResponse": {},
  "executionEvidence": {
    "source": "adapter",
    "toolTrace": [
      {
        "sequence": 1,
        "timestamp": "2026-09-03T00:00:01.000Z",
        "operation": "read",
        "path": "skills/expressivecss/expressivecss-usage/SKILL.md",
        "status": "success"
      }
    ],
    "filesystem": {
      "source": "adapter",
      "independentlyComputed": true,
      "algorithm": "sha256",
      "before": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "after": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    },
    "artifacts": []
  }
}
```

Trusted trace operations are `read`, `write`, `patch`, `create`, and `delete`. Every event needs a non-empty path, `status: "success"`, a strictly increasing safe-integer sequence, and a strictly increasing valid timestamp. Filesystem digests must match `sha256:<64 lowercase hexadecimal characters>` exactly. Every trusted artifact needs a unique ID, category, criterion ID, component ID, non-empty operator observation, sequence, and timestamp. The evaluator fails the trust invariant if the candidate response contains `toolTrace`, `preRunFilesystemHash`, `postRunFilesystemHash`, `evidenceArtifacts`, `executionEvidence`, or `completionChecks`.

Required artifacts match structured criterion, component, category, capture-role, and dimension fields. Artifact IDs are assigned by the collector and referenced by the response; they do not have to reproduce replay IDs. Additional valid evidence is accepted. Observation prose need not reproduce an expected sentence, and legacy `expectedObservation` metadata is not proof of correctness. Requirement and accessibility evidence binds to its fixture inventory ID. Coverage artifacts use `observedValue` for the measured state or dimension; reviewed older schema-version-3 replays retain their observation-text fallback. Review of the actual files, captures, and observations is still necessary for conclusions beyond the structured checks.

Review-row status contracts are closed: `Pass` requires criterion- and component-owned trusted evidence; `Intentional adaptation` additionally requires a rationale and `accessibilityPreserved: true`; `Fail` requires trusted evidence, an observed deviation, and a correction; `Blocked` requires a blocker reason and no evidence; and `Not applicable` requires an applicability reason and no evidence.

## Offline replay

Reviewed replay responses live in `tests/fixtures/expressivecss-skill-evals/passing-responses.json`. The file uses this top-level envelope:

```json
{
  "schemaVersion": 3,
  "responses": {
    "case-id": {
      "candidateResponse": {},
      "executionEvidence": {}
    }
  }
}
```

Run it without network access:

```text
terminal(command="npm run test:skill-evals", timeout=180)
```

Replay proves the evaluator, schemas, redaction, mutation guards, and current case set. It does not prove that a live model follows the skill. A replay is trusted only because the operator selected and reviewed the file.

## Live adapter

Use an operator-controlled executable. For each case, it reads one JSON object from standard input and writes one per-case envelope to standard output:

```text
terminal(command="node scripts/eval-expressivecss-skill.mjs --adapter=/absolute/path/to/adapter --adapter-arg=value --adapter-timeout-ms=120000 --case=css-only-markup-routing --output=/tmp/expressivecss-eval.json --output-directory=/tmp/expressivecss-eval-artifacts", timeout=180)
```

The input contains `task`, `projectRoot`, and `rootSkill`, plus `skillRoot` and `artifactDirectory`. The candidate-safe `task` has only `id`, `request`, and `projectFixture`; `projectRoot` is a concrete temporary project materialized from the evaluator-owned fixture blueprint. `skillRoot` identifies the selected skill directory for actual guide reads. `artifactDirectory` is an operator output directory outside the disposable project, or null when no output directory was requested. Scoring expectations remain private to the evaluator. The runner invokes the executable directly with an argument array and `shell: false`, places it in a dedicated process group, closes its pipes at the deadline, and escalates from termination to a process-tree kill. The hard adapter timeout defaults to 120000 milliseconds and can be changed with `--adapter-timeout-ms=<milliseconds>`. Provider credentials and configuration stay outside committed fixtures.

Run one case with `--case=<id>`. Use `--responses=<path>` to replay a different saved response set, or `--skill-root=<directory>` to select an immutable baseline or candidate skill. The root text is read once per run. A full suite runs cases sequentially, each with its own adapter timeout; the outer process deadline must allow for the number of selected cases.

The adapter may return bounded `runMetadata`, such as its model identifier and usage telemetry. The runner records `runMetadata.wallTimeMs` independently. Missing provider metrics must remain unavailable, not become zero usage. One measured run is not a performance comparison: use matched baseline/candidate tasks and repeated runs to assess timing, token use, and variance. Since this suite injects the root skill, skill discovery needs a separate trigger evaluation.

## Resource limits

The evaluator fails closed at these limits:

| Input | Limit |
| --- | ---: |
| Case definition file | 1,048,576 bytes |
| Replay file | 1,048,576 bytes |
| Root skill file | 1,048,576 bytes |
| Cases | 22 |
| Replay responses | 22 |
| Trusted trace events | 256 |
| Evidence artifacts | 256 |
| Review and coverage rows | 256 |
| Strings in a per-case envelope | 4,096 |
| Object property names in a per-case envelope | 20,000 |
| One string or property name | 65,536 UTF-8 bytes |
| Object depth | 32 |
| Traversed values | 20,000 |

Case, replay, and root-skill files use bounded file-handle reads. The evaluator rejects symbolic links, non-regular root-skill files, overflow, path escape, and identity or metadata changes during a read. Nonblocking opens prevent a replacement FIFO from hanging the reader. Live adapter output is also bounded by the child-process buffer and then checked against the per-case structural limits.

## Report handling

Reports retain the prompt, selected guides, candidate response, trusted execution evidence, and every invariant result. Before writing a report, the runner redacts secrets in property names and values, credential-shaped keys, common provider tokens, bearer tokens, JWTs, cookies, credential assignments, credentials embedded in URLs, Linux and macOS local paths, and Windows user paths. Redaction is iterative and stops at the same depth, string-count, and traversal limits. Cycles and work beyond the limits become `[TRUNCATED]`.

Adapter exit failures, invalid output, and timeouts become per-case infrastructure failures with elapsed time. The runner retains earlier results and continues with the remaining cases. With `--output-directory`, it keeps redacted snapshots of the inspected source files in each case directory; adapters save their captures and other artifacts there before returning. The report links these directories through relative `artifactsPath` values. Temporary project directories are removed in `finally` blocks, including on failure. Source snapshots and controlled adapter tests do not establish live model or browser success.

Live model evaluations are release evidence, not a normal merge gate, until repeated runs establish acceptable variance. A failed critical invariant blocks a skill release until reviewed. Do not approve a case because the prose sounds plausible.

## Focused browser and evidence checks

The Codex comparison runner uses an operator-owned browser for runnable fixtures.
Its loopback MCP connection serves only the temporary consumer's public assets.
Preflight loads the page before starting the candidate. Both candidate access and
independent post-run verification block external requests, WebSockets, workers,
popups, downloads, private metadata, path traversal, and symbolic links.

The connection uses the installed Playwright and MCP SDK dependencies; no new
package is required. The SDK is optional for ordinary skill use. Browser bridge
checks explicitly skip when the optional SDK or Chromium is absent; a live
browser-required benchmark fails its capability check instead of claiming success.
Run `npm ci --prefix mcp/expressivecss` and install Chromium for that comparison.

Only `expressivecss_eval_browser.browser` receives per-run approval. The adapter
keeps the candidate shell sandbox and other tools' policies intact, and does not
change saved user configuration. This uses Codex's documented
[per-tool MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).
The first integration trial demonstrated why the distinction matters: a working
browser alone did not make a tool callable under a non-interactive approval policy.

Candidates begin with `inspect`, reload after source edits, and reuse the route.
Permission, connection, or launch failures stop retries until capability changes;
an invalid selector may be corrected. Source work can continue with browser checks
unavailable. Probe results and final capability are recorded separately.

The browser returns an operator proof ID, DOM/accessibility observations, and a
screenshot hash. Capture paths are absolute so the candidate can open them from
its temporary project. `fullPage: true` captures the whole page up to 12,000px high
and the existing 4MB image limit; each response reports `remainingCalls` against
the existing 100-call limit. Reuse captures across criteria instead of repeatedly
scrolling and inspecting the same scene. Candidate `verificationChecks` reference that ID with `observed`
or `failed`; they do not certify broad accessibility or performance claims.
`verificationErrors` must quote recorded failure output. Browser-operation errors
use a proof ID; page-console errors may be recorded during a successful inspection.
Connector failures before a browser response use the connector and
tool names, and command errors must match nonzero command output. Missing events
and guessed error codes fail validation. A compound command does not establish
individual subcommand results. Free-form interpretation still needs review.

Large adapter reports are redacted per bounded section, event, manifest entry and
browser record. This preserves earlier evidence when the complete report would
exhaust one redactor traversal budget. Individual redaction limits and overall
process, browser and filesystem limits remain unchanged. Native image, patch and
collaboration calls may be absent from Codex JSON events; do not infer their
success or error output from candidate prose. The benchmark operator performs the
independent review after each complete-interface run.

Audit results supply structured conclusions, source selectors and element-start
lines, actual name/landmark observations, and proposed replacement markup. The
grader checks these against the fixture and rejects contradictory assessments,
ineffective fixes, hidden or disabled commands, and incompatible command roles.
Version results cite installed-package and bundled-contract metadata and separate
version agreement, bundled availability, public-site assurance, and unavailable
matching implementation evidence. Correct keywords alone cannot satisfy either
case.

Operator manifests cover every project path, including `.git`, lockfiles, installed
packages, binary assets, new directories, and files outside the main application
sources. Task-specific write boundaries are stated in the candidate request. The
older-version case permits only a standard viewport metadata repair; dependencies,
application behavior, styles, and asset references must remain unchanged.
Declarative HTML/CSS asset checks also reject invented URLs without requiring a
new file. Constructed JavaScript URLs remain a browser/operator review concern.

These are fixture-scoped checks, not a general HTML accessibility engine or a
semantic judge of arbitrary prose. Valid additional findings are allowed, but
conflicting claims about the same target fail. Browser observations and bounded,
redacted source snapshots are preserved even when grading fails, before temporary
projects are removed.

Run a focused comparison against an immutable original skill:

```sh
node scripts/benchmark-expressivecss-skill.mjs --baseline=/absolute/path/to/original-skill --candidate=/absolute/path/to/revised-skill --output=/tmp/expressivecss-evidence --case=tooltip-remount,no-edit-audit,version-mismatch --repetitions=1
```

## Complete-interface evaluations

`interface-refine` and `interface-review` assess the existing Northstar account
dashboard as a whole. The primary task is choosing Email alerts, saving, and
reading confirmation. The first permits HTML/CSS refinement; the second permits
no file changes. Both state the identity, content, destinations, controls and
runtime behavior that must remain. The fixture's missing retry action is a review
finding, not an undisclosed requirement to implement new behavior.

The operator captures matching before/after scenes at 320, 599, 600, 839, 840 and
1280 CSS pixels, plus dark mode, long content, loading, empty, error, offline and
doubled text sizes. Each scene uses a fresh restricted browser context and records
its exact settings, accessibility snapshot, geometry, errors and screenshot hash.
Independent keyboard and pointer traces exercise the checkbox and Save action;
the drawer trace checks opening, Escape dismissal and focus return. Failed scenes
retain their error and do not erase completed captures.

Automated checks establish named facts: required regions, one peer navigation,
overflow, primary-action visibility, preserved content and working interactions.
The default-state brief explicitly requires Save in the first 900px-high viewport.
For a no-edit review, the faulty interface itself need not pass these requirements;
the evaluator checks collected evidence and preserved files, while independent
review judges the candidate's findings against the real interface.

Visual quality remains separate. `interface-review.json` starts with
`pending-independent-review`, the candidate's untrusted observations, and the
existing Design matrix criteria for task hierarchy, emphasis, containment, type,
identity, adaptive composition, themes, content fit, state clarity and visible
focus. Reference validation checks coverage and actual browser proof IDs, not the
truth of interpretations. An independent reviewer reads captures and source,
records each applicable verdict with evidence and impact, and names unavailable
checks. Do not convert automated pass rates or reference completeness into an
overall design score. Human review remains separate from an agent's review.

This case declares English/LTR only. Doubled computed font sizes are text-size
stress, not browser zoom or proof of WCAG conformance. Screen-reader speech,
localized content, touch interaction, contrast certification and field performance
remain unmeasured. The browser tool's bounded `emulate` action supports light/dark
and reduced-motion preferences so candidates can inspect these scenes themselves.

Run the two tasks against immutable old/new skill snapshots:

```sh
node scripts/benchmark-expressivecss-skill.mjs --baseline=/absolute/path/to/original-skill --candidate=/absolute/path/to/revised-skill --output=/tmp/expressivecss-interface --case=interface-refine,interface-review --repetitions=1
```

Use Skill Creator's existing review viewer for the resulting screenshots, retained
source, candidate reports and named checks. The catalogue now has eight execution
cases; an unfiltered three-repetition comparison runs 48 executions. The original
36-run study remains historical evidence for its six scoped cases.

Use a new output directory for each protocol change. These focused runs check
correctness and browser access; one repetition does not establish a speed change.
The existing Skill Creator viewer and its HTML-escaping recipe are documented in
[the improvement plan](./expressivecss-skill-improvement-plan.md).

## Natural discovery and frozen comparisons

`scripts/eval-expressivecss-natural-discovery.mjs` tests ordinary work requests.
The adapter supplies exactly the request. It does not ask the agent to classify
applicability, preload the root skill, prescribe a JSON answer, or reveal expected
labels. Each temporary consumer contains the selected skill in `.agents/skills`,
its actual project files and any task-specific content. The agent can perform the
requested task with its usual CLI tools. The older explicit applicability probes
remain available as constrained diagnostics; do not combine their scores with
natural discovery results.

The reviewed catalogue has six development requests and six independently authored
held-out requests, balanced within each split. Freeze both skill snapshots,
the complete catalogue, fixtures, grader and settings before running development
cases. Held-out prompts remain unused during development; run them only against
the frozen protocol. Once their results inform a revision, they are no longer
unseen and a future iteration needs a new held-out set. Keeping the labels out of
candidate projects prevents leakage; simply naming a file "heldout" does not.

```sh
node scripts/eval-expressivecss-natural-discovery.mjs --baseline=/absolute/old-skill --candidate=/absolute/new-skill --output=/tmp/natural-freeze --freeze=true
node scripts/eval-expressivecss-natural-discovery.mjs --baseline=/absolute/old-skill --candidate=/absolute/new-skill --output=/tmp/natural-development --manifest=/tmp/natural-freeze/frozen-protocol.json --split=development
node scripts/eval-expressivecss-natural-discovery.mjs --baseline=/absolute/old-skill --candidate=/absolute/new-skill --output=/tmp/natural-heldout --manifest=/tmp/natural-freeze/frozen-protocol.json --split=heldout
```

Each split runs one old/new pair per request with alternating dispatch order.
The default task deadline is 180 seconds, recorded in the frozen protocol. Report
positive and negative root-exposure matches and infrastructure failures separately.
A complete root guide observed in command output establishes a read. Candidate
claims, partial reads and unobservable tools do not establish a complete read.
The absence of a recorded read is therefore an observation under this adapter,
not proof of every possible skill invocation mechanism. `rootExposureMatch` is a
complete-root-output proxy, not actual invocation accuracy. Missing read telemetry
produces null and receives no credit. With an available event stream but no complete
root text, the proxy records false while `invocationStatus` remains `unverified`.

Invocation success does not grade the resulting task. Review retained source and
responses independently before judging whether the work was useful. An agent that
loads the right skill but leaves an implementation unfinished can pass the read
assertion; the report must keep that distinction. No-edit cases additionally
require unchanged independent project hashes. Original transcripts, settings,
usage and sources are retained before temporary projects are removed. Use the
existing Skill Creator viewer for both split outputs and their benchmark data.

Both implementation comparisons and natural discovery record a `provenance.json`
before execution and attach its contents to case metadata, each result and the
aggregate. `fixtureHash` covers fixture sources and the built distribution.
`graderHash` covers the evaluator, adapter, browser collectors, relevant manifests
and lockfiles. The combined hash also covers the plan, observed model settings and
runtime. Skill hashes remain separate. Credentials are not copied. The record
explicitly identifies limits, including external service state and untracked
Codex/browser executable contents.

Resume validates the entire archive before writing metadata or executing work.
Missing historical provenance, changed inputs/settings, duplicate or unexpected
rows, mismatched skill hashes/prompts, missing grading/operator evidence and orphan
attempt directories are rejected.
Use a fresh output directory when the protocol changes. Completed results remain
available even when a later run fails; a rejected resume leaves the archive intact.
