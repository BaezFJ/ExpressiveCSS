# Lint disabled zoom: requirements

- Feature: `expressivecss-lint` reports a viewport meta tag that stops people from zooming
- Date: 2026-11-15
- Roadmap phase: [Phase 86: lint flags disabled zoom](../../../../roadmap.md#phase-86-lint-flags-disabled-zoom), in the milestone "apps that feel finished". No dependencies; it reuses the non-legacy case table from [phase 85](../lint-transition-all/), and [phase 87](../lint-paste-blocking/) closes the lint stage. The [tech stack](../../../../tech-stack.md#mcp-server) keeps static inspection on its existing parser and rule engine.
- Branch: `feature/2026-11-15-milestone-apps-that-feel-finished`
- Base: the branch after phase 85

## Current behavior and need

`inspectAuthoringRules` in `mcp/expressivecss/server.js` runs the regex rules over the whole file text, then the `semantics.json` rules over a jsdom parse. `expressivecss-lint`, `rules_enforcer` and `quality_inspector` share it. Nothing checks the viewport meta tag, so `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">` passes. Browsers that honor it stop pinch zoom, so people who need larger text on a phone can't get it, against WCAG 1.4.4 Resize Text. Every committed finished-app build and every docs page uses `width=device-width, initial-scale=1` or `initial-scale=1.0`; only `tests/expressivecss-skill-benchmark.test.js` writes `user-scalable=no`, and it doesn't go through the lint.

## Scope

- One new regex rule, `viewport-zoom-disabled`, appended to the regex list after phase 85's rule.
- Flag and pass cases in phase 85's non-legacy table in `mcp/expressivecss/smoke.mjs`, backtracking inputs, and a CLI case.
- The MCP README lint paragraph and the MCP CHANGELOG entry.

## Exclusions

- A zoom cap above 1, such as `maximum-scale=1.5`.
- Viewports set from script (`meta.setAttribute('content', ...)`), from a framework API such as a Next.js `viewport` export with `userScalable: false`, or from a JSX expression (`content={"..."}`).
- An unquoted `content` value, which HTML doesn't allow when the value holds `=`.
- CSS `touch-action` and `user-select`.
- Skill guidance, `llm.md`, the docs site and the review skill.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| A regex rule over the `<meta>` tag, not a `semantics.json` rule | Decided from evidence | A selector such as `[content*="maximum-scale=1"]` also matches `maximum-scale=1.5` and `maximum-scale=10`, and can't allow spaces around `=`. `semantics.json` scope is element choice, landmarks and ARIA, and its rules also run over the docs and built pages. Phase 85 put its declaration check in the same regex list for the same reasons. |
| `maximum-scale` is flagged at 1 or below, not below 2 | Decided from evidence | The roadmap names `maximum-scale=1` and "stops people from zooming", and a value at or below 1 allows no zoom at all. axe's `meta-viewport` rule flags values below 2, closer to WCAG 1.4.4's 200%, but that would also flag pages that do zoom. A cap between 1 and 2 goes unreported: neither the MCP server nor the review skill checks it. Moving the threshold later changes one alternative in the regex. |
| `user-scalable` is flagged for any value other than `yes`, `device-width`, `device-height` or a number of 1 or more (or -1 or less) | Decided from evidence | Chromium's `HTMLMetaElement::ParseViewportValueAsUserZoom` (`third_party/blink/renderer/core/html/html_meta_element.cc`, read on main at `b5548ca`, 2026-10-29) maps `yes`, `device-width`, `device-height` and numbers of 1 or more or -1 or less to on, and `no`, unknown values such as `false`, and numbers between -1 and 1 to off. If another browser reads `false` as on, the finding still marks an author who meant to stop zoom. |
| One finding per tag | Decided from evidence | A tag with both `maximum-scale=1` and `user-scalable=no` has one fix. |
| Severity `high` | Decided from evidence | It blocks zoom in every browser that honors the tag. `rules_enforcer` blocks on it and `quality_inspector` reports `needs_fix`. |
| No skill guidance change | Decided from evidence | The guides' page examples already use the standard viewport, the mission's non-goals exclude general web-quality guidance, and the finding message names the fix. |

## Requirements

- **R1** The regex list in `server.js` gains a rule `viewport-zoom-disabled`, severity `high`. Its message says the viewport stops people from zooming, against WCAG 1.4.4, and to use `width=device-width, initial-scale=1`.
- **R2** The rule matches one `<meta>` tag, attributes in any order and case and across lines, whose `name` attribute (not `data-name`) is `viewport` and whose quoted `content` attribute (not `data-content`) holds `user-scalable` set to anything but `yes`, `device-width`, `device-height` or a number of 1 or more (or -1 or less), or `maximum-scale` set to `no`, `yes` or a number at or below 1 (Chromium reads `no` as 0 and `yes` as 1). A `yes` or `device-width` followed by `;` counts as off, because Chromium doesn't split values on `;`. Spaces around `=` and `,` or `;` between keys are allowed. Every gap stays inside the tag (`[^<>]`) and has a fixed length. It reports at the tag's line and column, once per tag.
- **R3** It flags `user-scalable=no`, `user-scalable = 0`, `user-scalable=false`, `user-scalable=0.5`, `<META NAME=VIEWPORT CONTENT="USER-SCALABLE=NO">`, `maximum-scale=1`, `maximum-scale=1.0`, `maximum-scale=1.00`, `maximum-scale=0.5`, `maximum-scale=.5`, `maximum-scale=0`, `maximum-scale=no`, `maximum-scale=yes`, `user-scalable=yes; initial-scale=1`, `user-scalable=device-width;`, `content` before `name`, `;` separators, a self-closing tag, and a tag split over three lines as Prettier writes it. It doesn't flag `width=device-width, initial-scale=1`, `initial-scale=1.0`, `minimum-scale=1`, `maximum-scale=1.5`, `maximum-scale=1.01`, `maximum-scale=10`, `user-scalable=yes`, `user-scalable=yes, initial-scale=1`, `user-scalable=1`, `user-scalable=device-width`, a `<meta name="description">` or `data-name="viewport"` tag whose content holds `user-scalable=no`, a `data-content` attribute, or a viewport tag after another `<meta>` whose content mentions `user-scalable=no`.
- **R4** The R3 cases join phase 85's non-legacy table in `smoke.mjs`, and the new ID joins the backtracking loop, timed against a long run of `<meta `, an unclosed `<meta name=viewport ` followed by repeated `content=`, and a content value of repeated `maximum-scale=1.5,`, each under 250ms. The table fails before the rule exists.
- **R5** A smoke case runs the CLI on a file whose line 2 holds `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">` and gets exactly one finding, printed as `file:2:<col> viewport-zoom-disabled [high]`, and exit 1; a file with `user-scalable=no` alone and one with `maximum-scale=1` alone get one finding each; a file with `width=device-width, initial-scale=1` gets none and exit 0. This is the roadmap's completion check.
- **R6** The MCP README's lint paragraph names the check; the MCP CHANGELOG's Unreleased entry from phase 85 lists it.
- **R7** `npm test --prefix mcp/expressivecss`, `npm run verify` and `npm run verify:packages` pass.

## Risks considered

- Two at once, refusal: not applicable.
- Bad input: an unclosed tag that repeats `content=` makes two unbounded gaps quadratic (1,410ms in the reviewer's prototype, 34ms with the gaps capped); R2 bounds them and R4 times it.
- Readers: `rules_enforcer` and `quality_inspector` report the finding too; no smoke fixture has a viewport tag. The finished-app reviewer's lint stays at the baseline commit, and builders run the published lint. Consuming projects that run the lint in CI or `--hook` start failing on such a tag, which phase 85's CHANGELOG line covers.
- False positives: a viewport tag inside an HTML comment, an earlier tag that a later one overrides, and a tag written inside a script string are flagged. The last is correct when the script writes it to the page.
- UI states: not applicable.
- `specs/checklist.md`: the project has none.
