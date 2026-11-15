# Lint transition all: requirements

- Feature: `expressivecss-lint` reports a transition that animates `all` properties
- Date: 2026-11-15
- Roadmap phase: [Phase 85: lint flags `transition: all`](../../../../roadmap.md#phase-85-lint-flags-transition-all), in the milestone "apps that feel finished". No dependencies; it opens the lint stage, and [phase 87](../lint-paste-blocking/) closes it with the stage rerun. The [mission](../../../../mission.md#agreed-scope) gives agents the same authoring rules through the MCP server and skill, and the [tech stack](../../../../tech-stack.md#mcp-server) keeps static inspection on its existing parser and rule engine.
- Branch: `feature/2026-11-15-milestone-apps-that-feel-finished`
- Base: the branch after phase 84

## Current behavior and need

`mcp/expressivecss/lint.mjs` reads each file it is given and calls `inspectAuthoringRules` in `mcp/expressivecss/server.js`. That runs the regex rules in `LegacyPatternList` over the whole file text, the duplicate-initialization and teardown checks, and the `semantics.json` rules over a jsdom parse. `rules_enforcer` (snippets) and `quality_inspector` (files, through `findFileViolations`) run the same function. One rule in the list already reads CSS declarations: `raw-color-in-component-style` flags a hex color in `color`, `background` and similar declarations, in `style` attributes, `<style>` blocks and `.css` files alike. No rule looks at transitions, so `transition: all 200ms` passes. A transition on `all` animates any property that changes, including layout and color properties the design never meant to animate.

## Scope

- One new regex rule, `transition-all`, appended to the regex list in `server.js`. It reads the whole file text, so it covers `style` attributes, `<style>` blocks, and a stylesheet passed to the command.
- A flag-and-pass case table in `mcp/expressivecss/smoke.mjs` for the regex rules without a `legacy-` prefix, holding `raw-color-in-component-style` and the new rule, and backtracking inputs for the new rule. Phases 86 and 87 add to the table.
- The MCP README lint paragraph, the header comment in `lint.mjs` and an MCP CHANGELOG entry.

## Exclusions

- Linked stylesheets (`<link rel="stylesheet">`): the lint doesn't follow them.
- A shorthand that names no property, such as `transition: 200ms`, which also defaults to `all`.
- An `all` more than 500 characters into a declaration's value.
- Vendor-prefixed declarations (`-webkit-transition`), custom properties (`--fade: all 200ms`), JSX camelCase keys (`transitionProperty`), script assignments (`el.style.transition = 'all 1s'`), and class names such as Tailwind's `transition-all`, which ExpressiveCSS doesn't ship.
- Skill guidance, `llm.md`, the docs site and the review skill.
- The `--hook` file extensions: hook mode still lints markup files only.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| The check reads `style` attributes and `<style>` blocks, not linked stylesheets (the roadmap's open question) | Decided from evidence | The regex rules already run over the whole file text, as `raw-color-in-component-style` does, so `<style>` blocks cost nothing extra. Following `<link href>` would read files the caller never named, which `readInspectionFile` refuses outside the working directory, and can't reach remote URLs. CLI mode already lints any file, so `expressivecss-lint styles.css` checks a stylesheet, and the README says so. The skill tells agents to lint the markup files they touched and the hook skips `.css`, so an app's external stylesheet is checked only when someone passes it. |
| A regex rule in `server.js`, not a `semantics.json` rule | Decided from evidence | `semantics.json` scope is element choice, landmarks and ARIA, its rules also run over `llm.md`, the docs and built pages, and its rule kinds match elements by selector, which can't read CSS text in a `<style>` block or tell `all` from `allow-discrete`. The tech stack says static inspection needs no new parser or rule engine. |
| Append to the existing list instead of adding a second list | Decided from evidence | One list keeps `inspectAuthoringRules` and the exported `authoringRules` unchanged, and `raw-color-in-component-style` already sits there without a `legacy-` prefix. The comment on `authoringRules` changes from "legacy and retired-markup rules" to the regex rules. |
| The new case table covers every non-legacy regex rule, including `raw-color-in-component-style` | Decided from evidence | A coverage check that skipped the existing rule would fail at once, and a check limited to the new IDs would let a later rule land without cases. The existing rule needs only a few cases. |
| `transition-property: all` is flagged too | Decided from evidence | It has the same effect as the shorthand with `all`, and the same regex covers it. |
| A shorthand with no property name is not flagged | Decided from evidence | Telling a property name from durations, timing functions and `var()` needs a tokenizer, and `var()` can't be resolved statically. The roadmap names `transition: all`. |
| Severity `medium` | Decided from evidence | It is a motion and performance defect, not an accessibility failure, and `raw-color-in-component-style` uses the same level. The CLI exits 1 on any finding; `rules_enforcer` blocks only on `high`, and `quality_inspector` reports `warn` for a `medium` finding. |
| No skill guidance change | Decided from evidence | The mission's non-goals exclude general web-quality guidance that no component owns, and every guide line costs every agent reading budget. Builders run the published lint, so the rule reaches them after an MCP release; the finding message names the fix. |
| Not a conflict with the mission's non-goal | Decided from evidence | The non-goal covers guidance text. The roadmap milestone, added with the user, schedules these lint checks, and the mission's core workflow ends with an agent checking its markup. |

## Requirements

- **R1** The regex list in `server.js` gains a rule `transition-all`, severity `medium`. Its message says a transition on `all` animates any property that changes, including layout and color properties, and to list the properties instead, for example `transition: opacity 200ms, transform 200ms`.
- **R2** The rule matches a `transition` or `transition-property` declaration that isn't preceded by a word character, `-` or `.`; the name may end in a quote, for a quoted object key. The value runs from the colon up to 500 characters, stopping at `;`, `{`, `}`, `<`, `>`, `/` (so a comment is never read) or a quote, and may open with one `'`, `"` or backtick for a JSX style object. The rule matches when the value holds the keyword `all`, not next to a word character, `-`, `.` or `$`, not preceded by `@`, and not followed by a colon, with or without whitespace before it. Case doesn't matter. No whitespace run may overlap the value gap, so a long run of spaces can't backtrack.
- **R3** It flags `transition: all 200ms`, `transition:all .2s`, `TRANSITION: ALL 1s`, `transition: opacity .2s, all .3s`, `transition-property: all`, `style={{ transition: 'all 0.2s' }}` and a declaration inside a `<style>` block. It doesn't flag `transition: opacity 200ms, transform 200ms`, `transition-property: opacity`, `transition: opacity .2s allow-discrete`, `transition: none`, `transition: var(--all)`, `transition: theme.all`, `--transition: all 1s`, `-webkit-transition: all 1s`, `transition-duration: 200ms; all: unset`, `style="transition: opacity 1s" data-x="all"` or `{ transition: x, all: y }`.
- **R4** `smoke.mjs` holds a table of flag and pass cases for each regex rule without a `legacy-` prefix, checked the way `legacyCases` is, with every R3 case and a few for `raw-color-in-component-style`, and a check that every such rule ID has cases. The new rule joins the backtracking loop, timed against `transition:` followed by a long run of whitespace, a long run of `transition:` and a long unterminated value, each under the existing 250ms limit. The table fails before the rule exists.
- **R5** A smoke case runs the CLI on a file with `transition: all` in a `style` attribute on line 1 and in a `<style>` block on line 2, and gets exactly two `transition-all` findings at `file:1:<col>` and `file:2:<col>` and exit 1; the same file with the properties listed gets none and exit 0. This is the roadmap's completion check.
- **R6** The MCP README's lint paragraph names the check and says a stylesheet can be passed to the command, worded so the paragraph itself doesn't match the rule; the header comment in `lint.mjs` lists the checks the command runs; the MCP CHANGELOG's Unreleased section lists the rule and says a file that passed before may now report a finding, so CI that runs the lint fails on it.
- **R7** `npm test --prefix mcp/expressivecss`, `npm run verify` and `npm run verify:packages` pass.

## Risks considered

- Two at once: `inspectAuthoringRules` builds a fresh RegExp per call, so concurrent MCP requests share no `lastIndex`.
- Refusal: not applicable; the lint reads files and reports.
- Bad input: whitespace after the colon, an unterminated value or a long run of `transition:` could make the regex backtrack; R2 and R4 cover them. A 2 MiB file stays within the existing scan budget, and the snippet is cut to 120 characters as before.
- Readers: `rules_enforcer` lists the finding without blocking, and `quality_inspector` reports `warn`; no smoke fixture holds a transition, and the smoke check that inspects the MCP README accepts any status. The finished-app evals pin the reviewer's lint to the baseline commit (phase 78), so counted results don't move. Builders run the published `@expressivecss/mcp-server`, which doesn't have the rule until an MCP release. The `--hook` mode returns exit 2 on the new finding in consuming projects that wire it, which R6's CHANGELOG line covers. The review skill's rules-enforcer agent already reports `raw-color-in-component-style`, which has no retired-name entry either. `scripts/expressivecss-eval-provenance.mjs` hashes `server.js` at run time, and verify covers its tests.
- False positives: prose or a CSS comment that quotes the declaration is flagged when the file is linted from the CLI or an MCP tool; the hook skips Markdown. A reset such as `transition: all 0s` is flagged, which is harmless.
- UI states: not applicable.
- `specs/checklist.md`: the project has none.
