# Lint paste blocking: requirements

- Feature: `expressivecss-lint` reports an inline paste handler that always blocks paste; the lint stage and the milestone close with a rerun of all three prompts
- Date: 2026-11-15
- Roadmap phase: [Phase 87: lint flags paste blocking](../../../../roadmap.md#phase-87-lint-flags-paste-blocking), in the milestone "apps that feel finished". No dependencies; it reuses the non-legacy case table from [phase 85](../lint-transition-all/), follows [phase 86](../lint-disabled-zoom/), and closes the lint stage and the milestone, so it reruns every prompt like [phase 84](../anchored-heading-offset/) and [phase 82](../submit-flow-guidance/). The procedure is in [finished-app evaluations](../../../../../docs/agents/finished-app-evals.md).
- Branch: `feature/2026-11-15-milestone-apps-that-feel-finished`
- Base: the branch after phase 86

## Current behavior and need

`inspectAuthoringRules` in `mcp/expressivecss/server.js` runs the regex rules over the whole file text, then the `semantics.json` rules; `expressivecss-lint`, `rules_enforcer` and `quality_inspector` share it. Nothing checks paste handlers, so `<input type="password" onpaste="return false">` passes. Blocking paste stops people pasting a password from a password manager or pasting a code, and in a sign-in or verification field without another permitted mechanism it fails WCAG 3.3.8. Phase 82's text field guide already says "allow paste", and the quality inspector's rubric flags blocked paste under `finished-app:submit-flow`.

The milestone intro says the last phase of each stage reruns the phase 78 prompts. The guidance stage (phase 82) and the framework stage (phase 84) did; this phase closes the lint stage and makes the milestone's final comparison. The reviewer's lint stays pinned to the baseline commit (decided in [phase 78](../finished-app-baseline/requirements.md)), and builders run the published `@expressivecss/mcp-server`. Phases 85 to 87 change only files under `mcp/`, so the build skill tree and `dist/` should match the framework stage's, and the rerun measures run-to-run variation on the skill as the milestone leaves it.

## Scope

- One new regex rule, `paste-blocked`, appended to the regex list after phase 86's rule.
- Flag and pass cases in the non-legacy table in `mcp/expressivecss/smoke.mjs`, backtracking inputs, and a CLI case.
- The MCP README lint paragraph and the MCP CHANGELOG entry.
- The lint-stage rerun of all three prompts, recorded in `docs/agents/evidence/finished-app/2026-11-15-lint-stage/` and as six rows labelled `lint-stage`, compared with the baseline, guidance-stage and framework-stage rows, and closed with a milestone summary.
- The branch's lint run over the six rebuilds and the six baseline apps, with its hits for the three new rules recorded apart from the counts.

## Exclusions

- Paste handlers added from script (`addEventListener('paste', ...)`), handlers that call a named function, and framework forms: JSX `onPaste={...}`, Vue `@paste.prevent` and Svelte `on:paste|preventDefault`.
- Other ways to cancel: `event.returnValue = false`, `return !1`, `return (false)`, and a chain of more than eight statements before `return false`.
- Copy, cut, drop and key handlers that block Ctrl+V.
- Skill guidance, `llm.md`, the docs site and the review skill.
- Revising guidance or framework code from the rerun's results.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| A regex rule over the `onpaste` attribute, in the same list as phases 85 and 86 | Decided from evidence | The roadmap names an inline handler. A `semantics.json` selector can't read the handler's statements, and the tech stack keeps static inspection on its existing rule engine. |
| Flag a handler only when it always cancels | Decided from evidence | A paste handler may cancel the default to insert cleaned text itself, as code fields that spread digits across inputs do, so `event.preventDefault()` followed by other code is not flagged. `return false` ends the handler, so a top-level `return false` cancels whatever simple statements run before it. A conditional cancel can't be judged statically. |
| `e.preventDefault()` and `Event.preventDefault()` are not flagged; the value is case-sensitive | Decided from evidence | An inline handler's argument is named `event`; `e` is undefined there and `Event.preventDefault` isn't a function, so both throw and the paste goes through. `RETURN FALSE` is a syntax error, so the handler never runs. Only the attribute name ignores case. |
| Any element, not only text fields | Decided from evidence | Paste bubbles, so a cancelling `onpaste` on a `<form>` or `<body>` blocks paste in every field inside it. |
| Severity `high` | Decided from evidence | It can fail WCAG 3.3.8 on sign-in and code fields. `rules_enforcer` blocks on it and `quality_inspector` reports `needs_fix`. |
| No skill guidance change | Decided from evidence | Phase 82's text field guide already says to allow paste, and the mission's non-goals exclude general web-quality guidance. |
| The rerun keeps the evaluation procedure, with the reviewer's lint at the baseline commit | Decided from evidence | Phase 78 pinned the reviewer's lint so a lint change can't move counts on unchanged apps, which keeps every stage's rows comparable. |
| The branch lint runs over the rebuilds and the baseline apps as a separate record | Decided from evidence | It is the one place the lint stage meets real agent output, and it shows whether the three new rules fire there without touching the counts. The committed finished-app apps hold no `transition: all`, zoom-blocking viewport or `onpaste`, so zero hits are expected on the baseline apps. |
| The milestone report is the lint stage notes in the evals doc, copied into the milestone PR body | Decided from evidence | Phases 82 and 84 hand their regressions on to "the phase 87 stage", and this is the last stage, so its notes are where those hand-offs end. |

## Requirements

- **R1** The regex list in `server.js` gains a rule `paste-blocked`, severity `high`. Its message says the handler blocks paste, which stops people pasting from a password manager or pasting a code and can fail WCAG 3.3.8, and to remove the handler.
- **R2** The rule matches an `onpaste` attribute, its name in any case, not preceded by a word character, `$`, `.` or `-`. It flags a quoted value whose statements are only `event.preventDefault()` calls, or one that reaches a top-level `return false` after at most eight simple statements, a simple statement being one that doesn't start with a control keyword (`if`, `else`, `for`, `while`, `do`, `switch`, `try`, `with`, `return`, `throw`, `break`, `continue`) and holds no brace. Statements are separated by `;` or a newline, whitespace includes newlines, and `return false` is followed by optional spaces and then `;`, a newline or the end of the value. It also flags the unquoted value `event.preventDefault()` or `event.preventDefault();` ending at whitespace or `>` (HTML keeps a `/` in an unquoted value, so `event.preventDefault()/` is a syntax error that blocks nothing). Earlier attributes are stepped over whole, with quoted values that may hold `>` and run to 2,000 characters. The value is case-sensitive. It reports at the attribute's line and column.
- **R3** It flags `onpaste="return false"`, `onpaste="return false;"`, `onpaste='event.preventDefault()'`, `ONPASTE="event.preventDefault(); return false;"`, `onpaste=event.preventDefault()`, `onpaste=event.preventDefault();`, `onpaste = " return  false "`, `onpaste="return false; log()"`, `onpaste="alert('No pasting'); return false"`, a value with `event.preventDefault()` and `return false` on separate lines, and `<form onpaste="return false">`. It doesn't flag `onpaste="handlePaste(event)"`, `onpaste="event.preventDefault(); insertPlain(event)"`, `onpaste="if (busy) return false"`, `onpaste="if (x) { return false }"`, `onpaste="return confirm('Paste?')"`, `onpaste="return false || ok()"`, `onpaste="return falsey()"`, `onpaste="e.preventDefault()"`, `onpaste="Event.preventDefault()"`, `onpaste="RETURN FALSE"`, `onpaste="event.preventDefault() return false"`, `onpaste="this.dataset.pasted = 'yes'"`, `el.onpaste = "return false"`, `data-onpaste="return false"` or `oncopy="return false"`.
- **R4** The R3 cases join the non-legacy table in `smoke.mjs`, and the new ID joins the backtracking loop, timed against a long run of `onpaste=`, an unclosed quoted value of spaces, an unclosed value of spaces and newlines, repeated `event.preventDefault();`, repeated `event.preventDefault()` followed by two spaces with no `;`, repeated `a;`, and a long unquoted run of spaces, each under 250ms. The table fails before the rule exists.
- **R5** A smoke case runs the CLI on a file whose line 2 holds `<input onpaste="return false">` and gets exactly one finding, printed as `file:2:<col> paste-blocked [high]`, and exit 1; the same file with `onpaste="this.dataset.pasted = 'yes'"` gets none and exit 0. This is the roadmap's completion check.
- **R6** The MCP README's lint paragraph names the check, worded so it doesn't match the rule; the MCP CHANGELOG's Unreleased entry from phase 85 lists it.
- **R7** The lint-stage rerun: each prompt rebuilt twice under the procedure, reviewed with the baseline skill trees and the baseline lint, each checked by its script (Undo, URL state, submit), and recorded in `docs/agents/evidence/finished-app/2026-11-15-lint-stage/` and as six rows with Date `2026-11-15` (or the day it runs) and Label `lint-stage` in `docs/agents/finished-app-evals.md`. A failed run follows the procedure: one rerun, both attempts kept, and `failed` in every column, never zero. `findings.json` holds the procedure's provenance fields; its `lint` field names the baseline commit and the sha256 of that commit's `server.js`, and it records whether the build skill tree and the `dist/` hashes match the framework stage's. Lint stage notes compare each area's counts with the baseline, guidance-stage and framework-stage rows, say whether each regression the guidance and framework stage notes handed on came back, and end with a milestone summary: each area's countable findings from the baseline to the lint stage, with failed runs named, and totals equal to the row sums. When the skill tree and `dist/` match the framework stage's, the notes treat differences from its rows as run-to-run variation. The summary is copied into the milestone PR body. A regression is recorded and reported there, not used to revise this phase.
- **R8** The branch's lint runs from the repository root as `node mcp/expressivecss/lint.mjs` over the committed copies of the six rebuilds and the six baseline apps, after the rule groups are committed. Its raw output is committed as `branch-lint.txt` in the run set. Each hit for `transition-all`, `viewport-zoom-disabled` or `paste-blocked` is checked against the source and recorded in `findings.json` as confirmed or a false positive, under a field that names the branch commit and the sha256 of its `server.js`, apart from the counts. A `file-not-inspected` or `inspection-truncated` result means the record is incomplete. The evals doc's Records list names the field, and "Comparing with the baseline" says why the reviewer's lint stays at the baseline commit.
- **R9** `npm test --prefix mcp/expressivecss`, `npm run verify` and `npm run verify:packages` pass on the final commit.

## Risks considered

- Two at once: no more than three build or review processes run at once, each under `timeout 1800`, and no rerun script runs during a verify run, since parallel browser runs flake.
- Bad input: an unclosed value of spaces made a prototype regex take 26 seconds when the statement pattern could start with whitespace; R2's statement shape and R4's inputs cover it.
- Readers: `rules_enforcer` and `quality_inspector` report the finding too; no smoke fixture has `onpaste`. Consuming projects that run the lint in CI or `--hook` start failing on such a handler, which phase 85's CHANGELOG line covers. The evals doc's results table and notes are read by later work; the new rows follow its columns.
- False positives: `onpaste="return false"` on an element that isn't editable, a lowercase `onpaste` string in a `.jsx` file (React ignores it), and `return false` paired with a script listener that inserts the text itself are flagged; all are harmless or still block the default paste.
- UI states: not applicable to the rule. The rerun's apps are judged by the rubric and the scripts.
- `specs/checklist.md`: the project has none.
