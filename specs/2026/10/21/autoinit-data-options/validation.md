# Validation: AutoInit options from data attributes

Roadmap phase: Phase 20, AutoInit options from data attributes. Requirements are in [requirements.md](requirements.md) and the work in [plan.md](plan.md).

The agent owns V1 to V14 under the user's delegation. CI and repository review in the merge conditions are external. Results stay pending until the check runs.

## Automated checks

All jsdom checks live in `tests/autoinit.test.js` and run with `npm run build:js && node --test tests/autoinit.test.js`.

| ID | Covers | Setup and action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V1 | R1, R2 | A `.menu-trigger` with `data-menu-options='{"closeOnClick":false,"inDuration":0}'` and a `.tooltipped` with `data-tooltip-options='{"position":"top","enterDelay":50}'`. Call `AutoInit()`. | `Menu.getInstance(trigger).options.closeOnClick` is `false` and `inDuration` is `0`; the tooltip's `position` is `"top"` and `enterDelay` is `50`. Untouched options equal the defaults. | Pass. `node --test tests/autoinit.test.js`, 56 of 56, after `npm run build:js`. |
| V2 | R3, R4 | Menus whose attributes hold invalid JSON, a JSON array, an unknown key, `"inDuration":"fast"` and `"onOpenStart":"alert(1)"`, each next to a valid `"hover":true` where the JSON parses. An `.autocomplete` with `'{"onSearch":"x"}'` (function default) and a `.date-picker` with `'{"minMonth":1}'` (`undefined` default). A tooltip later in the registry has a valid attribute. | Each rejected option equals its default, `hover` is `true` where it was valid, one warning per rejection names the component, attribute and key, and the tooltip still starts with its markup options. | Pass, same run. Seven warnings, five naming `data-menu-options`. |
| V3 | R2 | A tooltip with `data-tooltip-options='{"position":"top","margin":8}'`. Call `AutoInit(document.body, { Tooltip: { position: "left" } })`. Then a second tooltip with `data-tooltip-options='{"position":"top"}'` and `data-position="right"`; open it. | The first has `position` `"left"` and `margin` `8`. The second has `position` `"right"` after opening, since Tooltip's own attribute keeps its precedence. | Pass, same run. The second tooltip reads `right` after `open(true)`. |
| V4 | R5 | An `.autocomplete` with `data-autocomplete-options='{"allowUnsafeHTML":true,"minLength":2}'`, a `.date-picker` with `'{"maxYear":1,"yearRange":3}'`, and a menu with `'{"__proto__":{"polluted":true},"constructor":{"x":1}}'`. | `allowUnsafeHTML` stays `false` and `maxYear` keeps its default, each with a warning; `minLength` is `2` and `yearRange` is `3`. `({}).polluted` is `undefined`, the menu's options have no own `polluted` or `constructor` key, and `Object.prototype` is unchanged. | Pass, same run. |
| V5 | R3 | A `.time-picker` with `data-timepicker-options='{"i18n":{"done":"Fertig","nope":"x","cancel":5},"twelveHour":false}'`, a second one with `'{"i18n":{"done":"Fertig"}}'`, a `.menubar` with `'{"menuOptions":{"constrainWidth":"bad","coverTrigger":true}}'`, a `lang="de-DE"` date picker with `'{"i18n":{"done":"Fertig"}}'` next to a plain one, and a `.confetti` with `'{"colors":["#f00",1],"shapes":["circle",1]}'`. | The first time picker's `i18n` equals the default, with warnings naming `i18n.nope` and `i18n.cancel`, and `twelveHour` is `false`. The second has `done` `"Fertig"` and the default `cancel`. The menubar's `menuOptions` equals its default and its menu keeps `constrainWidth: false`. The German date picker has `done` `"Fertig"` and the same month names as the plain one (`März`). Confetti `shapes`, whose default is a non-empty array of strings, keeps its default with a warning. `colors`, whose default is empty, is `["#f00",1]`. | Pass, same run, in three tests (nested objects and arrays, the menubar, and the `de-DE` date picker). |
| V6 | R7 | One `<a class="tooltipped menu-trigger">` with both `data-tooltip-options` and `data-menu-options`, plus a target menu. | The Tooltip instance has only its markup values, the Menu instance has only its own, and neither warns about the other's keys. | Pass, same run. |
| V7 | R1 | A `<select>` with `data-form-select-options='{"classes":"wide"}'`. | `FormSelect.getInstance(select).options.classes` is `"wide"`. | Pass, same run. |
| V8 | R6 | A menu and a tooltip without attributes; a tooltip with the attribute and `.no-autoinit`; a direct `Tooltip.init(el)` on an element with the attribute. | The first two have options equal to their defaults, the opted-out element has no instance after `AutoInit()`, and the direct `init` ignores the attribute. No warning is logged. | Pass, same run. |
| V9 | R6, R8 | Run `tests/autoinit.test.js` (the fixture loop for all 33 components), `tests/components.test.js` and `tests/bundle.test.js`, one file at a time after a build. Read the diff of `registry.ts`. | All pass. Both `AutoInit` paths call the one per-element function. | Pass. `tests/autoinit.test.js` 56, `tests/components.test.js` 66, `tests/bundle.test.js` 4, run one at a time. `AutoInit` has one call site, `initElement`, for every entry. |
| V10 | R9 | Read the new docs section, the `llm.md` text and the changelog entry. Run `npm run build:skill` and `npm run check:generated`. | The docs give the naming rule, an example, precedence, settable kinds and fallback. `check:generated` passes. | Pass. `npm run build:skill`, then `npm run check:generated` reports 84 guides current. `tests/docs-astro.test.js` 25 of 25. `npm run docs:build:astro` exits 0 and `npm run docs:verify` reports 121 pages present. |
| V11 | R10 | Build and run `node --test tests/selective-builds.test.js` after adding the budget line. Run `npx fallow audit --base origin/master` with `node_modules/.bin` on `PATH`. | The budget test passes with a reviewed line, and fallow reports no new function at cyclomatic complexity 5 or more. | Pass. JavaScript gzip is 90,067 bytes (+597) on the original base 90,356 bytes (+594) after rebasing onto #380, and 90,456 bytes (+610) after merging #381, recorded in `tests/selective-builds.test.js`; the file passes 4 of 4. `npx fallow audit --base origin/master` with `node_modules/.bin` on `PATH`: complexity 0, no issues in 96 changed files. |
| V13 | R4, R5 | A `.chips` in a form with `data-chips-options='{"allowUserInput":true,"data":[null]}'` and an input with `name` and `required`, an `.autocomplete` with `'{"data":[null],"selected":[1]}'`, then a tooltip with a valid attribute. | Both `data` keys are rejected with warnings, `allowUserInput` is `true`, `selected` is `[1]`, nothing throws, and the tooltip starts with its markup options. | Pass, same run as V1. |
| V14 | R4 | Replaces an earlier mocked-throw check. Probe in the built bundle which `data`, `events`, `colors`, `selected`, `format` and `origin` values make Chips, Autocomplete, Datepicker or Confetti constructors throw. | Only Chips and Autocomplete `data` entries throw, and those keys are blocked. | Pass. A throwaway `node:test` probe against the built bundle showed throws only for Chips and Autocomplete `data` entries (`[null]`, `[1]`, `["a"]`, `[{}]`). `events`, `colors`, `selected`, `format`, `i18n.months` and `origin` values did not throw. |
| V12 | All | `npm run verify` once near the end. Rerun any failing browser test in code this branch did not touch alone before debugging. | Passes, or each failure is shown to be an unrelated flake by a passing solo rerun. | Pass with known flakes. See the implementation results. |

## Manual and agent-run checks

None planned. The change has no visual or interactive surface beyond options the components already test. The docs page renders through `docs:build:astro` and `docs:verify` inside `npm run verify`.

## Merge conditions

- V1 to V14 pass.
- Required CI checks on the pull request pass.
- Required repository reviews are done. This workflow does not merge.

## Specification verification

Done 2026-10-21, before implementation.

- The agent checked that the three documents name Phase 20, that every R ID has a plan group and a V check, that the links resolve from `specs/2026/10/21/autoinit-data-options/`, and that `git status --short` shows only this directory as new.
- An independent `Plan` subagent reviewed the spec files against the constitution and the base source. Confirmed findings, each checked against the source and fixed in the spec:
  - Tooltip merges `data-tooltip`, `data-tooltip-id` and `data-position` itself and re-applies them on `open()`, and Menu reads `data-context-menu`. The current-behavior text was wrong; precedence against those attributes is now a decision, and V3 opens a tooltip.
  - Menubar re-initializes its triggers' menus with its own `menuOptions`. Recorded as a documented limit.
  - A constructor that throws aborts the rest of `AutoInit()`, and unchecked array contents could trigger that (Datepicker `i18n.monthsShort`). Added array element kinds and checks for function and `undefined` defaults (V2). A retry without markup options was added here and later removed; see the Codex rounds below.
  - Datepicker's internal `minYear` and `maxYear` passed the kind rule. They are now blocked (R5, V4). Unbounded public numbers are recorded as an accepted limit.
  - V11 relied on a commit, which this workflow does not make, so it now runs `fallow audit`. The merge conditions now say CI and review are external.
- Unresolved blockers: none.

## Implementation results

Recorded 2026-10-21 in the worktree, before any commit.

- `npm run verify` ran once, before the last two Codex rounds. `build` and `typecheck` passed. `test:run` had 2,330 passes, 3 skips and 5 failures, all in code this branch does not touch: Firefox disabled controls, the docker runner SIGINT test, the Codex adapter "oversized streams" test, Firefox critical keyboard flows and the Firefox keypad. Each passed when rerun alone (`tests/disabled-states-browser.test.js` 3/3, `tests/docker-runner.test.js` 3/3, `tests/expressivecss-codex-adapter.test.js` 14/14 on its second solo run, `tests/expressivecss-cross-browser.test.js` 6/6, `tests/keypad-browser.test.js` 6/6). `run-s` stopped at `test:run`, so `check:generated`, `docs:build:astro` and `docs:verify` ran separately afterwards and passed.
- After the Codex fixes, `npm run build` and then `npm run test:run` ran again: 2,339 of 2,340 passed. The only failure was the Codex adapter "oversized streams" test, which had passed alone.
- After rebasing onto `774b0d27` (#380): `npm run build`, `check:generated`, and `tests/selective-builds.test.js` 4/4, `tests/autoinit.test.js` 56/56, `tests/components.test.js` 66/66 and `tests/docs-astro.test.js` 25/25 passed, and `npm run typecheck` passed. `npm run test:visual -- --grep auto-init` matched the local baselines in 4 tests and differed in the other 4 only because the AutoInit page is taller (for example 7,475 to 8,591 px at 900 px wide) from the new section. The agent viewed the expanded screenshot: the section renders as a code block and a list, styled like the rest of the page. The local baselines were not updated, and the visual diffs need maintainer review.
- `npm test --prefix mcp/expressivecss` passed the MCP smoke test, since the generated contract changed.
- `npm run typecheck` passed after each change to `registry.ts`.

### Reviews

- Stop-hook Codex review, round 1. Confirmed both findings. A constructor retry could throw again while destroying a half-built Autocomplete. A rejected nested key in Menubar `menuOptions` dropped its sibling default. The first fix destroyed the half-built instance before retrying and laid filtered objects over their defaults.
- Stop-hook Codex review, round 2. Confirmed both findings. A half-run Chips constructor removes its input's `name` and `required` before it throws, so no retry from the registry can restore the element. Laying nested markup over static defaults overrode Datepicker's locale month names. Final fix: block `data`, which the probe (V14) showed is the only constructor-throwing input, remove the retry, and drop a whole nested object when one of its keys is rejected. Added regressions for the Menubar, `de-DE` Datepicker and Chips/Autocomplete `data` cases.
- Independent final review by a `Plan` subagent over `git diff 8d45c2c4` and the spec directory. It found no defects in `registry.ts` and nothing outside Phase 20. Doc gaps it found were fixed: the constructor-error limit, `data-context-menu`, empty default objects, the `data-datepicker-options` name, Tooltip's re-read on open, and stale spec text.
- code-review-and-quality pass by the main agent over `git diff origin/master`: no correctness, security or performance defects. Seven mutations of `registry.ts` were run against `tests/autoinit.test.js`. Five failed the suite. "Non-plain objects settable" survived until a test with an element and a class-instance default was added; it now fails one test. Dropping `Object.hasOwn` survives because every key a defaults literal inherits is a function or `Object.prototype`, which the kind check rejects. The guard stays, and no test can reach it. Final run: 56 of 56.

### Open

- CI and repository review on the pull request.
