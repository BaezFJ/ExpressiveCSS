# Validation: show-more text collapse

Roadmap phase: Phase 42, show-more text collapse. Requirements are in [requirements.md](requirements.md) and the work in [plan.md](plan.md).

Browser checks run against built bundles after `npm run build`, one suite at a time. V1, V2 and V10 run with `node --test tests/show-more-browser.test.js`, and V3 to V5 with `node --test tests/show-more.test.js`.

The browser fixture for V1 and V2 is a `.show-more` started by AutoInit, holding `<p class="line-clamp-2">` with text that needs about five lines at 320px wide, and `<button type="button">Show more</button>`. Its container starts 320px wide.

## Automated checks

| ID | Covers | Setup and action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V1 | R1, R2 | In Chromium, Firefox and WebKit: read the paragraph's height, then click the button. Read the height again, then press Enter on the focused button. | Before the click the button has `aria-expanded="false"` and an `aria-controls` that names the paragraph. After the click the paragraph is taller than two lines and the button has `aria-expanded="true"`. After Enter the paragraph is back at its first height and `aria-expanded="false"`. This is the roadmap's completion check. | Passed 2026-10-25 in Chromium, Firefox and WebKit. Failed before the component existed. |
| V2 | R4 | In all three engines: start a second fixture whose text fits in two lines, and read the button's `hidden`. Then, in the first fixture, widen the container until the text fits in two lines, wait for the observer, and read `hidden`. Open the text at 320px, widen the container, press Enter on the focused button, then Tab. Narrow it back to 320px and read `hidden` again. Then focus the collapsed button, widen the container until the text fits, and press Tab. Press Tab from a button before the fixtures each time. | The short and fractional fixtures' buttons are hidden and Tab skips them. The first fixture's button is hidden while the text fits and shown again after narrowing. After the collapse at the wide width, focus stays on the button and it stays shown until Tab moves focus on, then it hides. A fixture with `line-clamp-2 expanded:line-clamp-none` at an Expanded window width has a hidden button. | Passed 2026-10-25 in all three engines. Failed first because the button mixin's `display: inline-flex` beat the browser's `[hidden]` rule; `_show-more.scss` restores it. The code review added the fractional fixture and the focused resize; without the 1px allowance Firefox fails, and without the focus check all three engines fail. Passed again 2026-10-25. |
| V3 | R1, R3 | In jsdom: start a fixture with no id on the text, click the button, then click again. Repeat with `data-show-less="Fewer lines"` on the button, with `i18n: { showLess: 'Less' }`, and with an icon element before the button text. | The text gets an id that `aria-controls` names. Expanded, the button reads `Show less`, `Fewer lines` and `Less` in the three cases, and the icon element is still there. Collapsed, the button reads `Show more` again. | Passed 2026-10-25. |
| V4 | R5 | In jsdom: add `expressive:open` and `expressive:close` listeners on the document and pass `onOpen` and `onClose`. Click the button twice. | One open event and one `onOpen` call after the first click, one close event and one `onClose` call after the second, all from the `.show-more` element. | Passed 2026-10-25. |
| V5 | R6 | In jsdom: start a fixture whose button already has `aria-controls="x"` and whose text has no id. Expand it, call `destroy()`, then click the button. | After `destroy()` the button's `aria-controls` is `x`, it has no `aria-expanded` and no `hidden`, it reads `Show more`, the text has no id and no inline clamp style, and the click changes nothing. | Passed 2026-10-25. |
| V6 | R7 | In `tests/semantics.test.js`, check a `.show-more` whose control is a `<span role="button">`, one whose `<button>` has no `type="button"`, one whose text has no `line-clamp-*` class, and one with a `<button>` and `line-clamp-2`. | The rules flag the first three and pass the fourth. The check does not start components. | Passed 2026-10-25. |
| V7 | R9 | `node --test tests/selective-builds.test.js tests/autoinit.test.js` | Both pass with the reviewed budget lines and the new AutoInit fixture count. | Passed 2026-10-25: JavaScript 95,993 gzip bytes (+687 over the merge base, +41 from the code review fixes), CSS 86,857 (+13), 39 AutoInit fixtures. |
| V8 | R8, R9 | After `npm run build:skill` as the last generation step, run `npm run check:generated`, `node --test tests/expressivecss-skill.test.js tests/expressivecss-version-resolution.test.js tests/expressivecss-component-decisions.test.js tests/docs-astro.test.js`, `npm run docs:build:astro` and `npm run docs:verify`. | Generated files are clean, the guide counts match, the AutoInit and events tables list ShowMore, and the docs build. | Passed 2026-10-25 with 90 guides, the basic-button reading budget at 46,701 bytes (+420), a clean `check:generated`, 121 docs pages built and `docs:verify` passing. |
| V9 | R8, R9 | The repository's required CI checks on the pull request. | All pass. | Pending |
| V10 | R4, R6 | In all three engines: serve a page whose `.show-more` text uses a web font that `page.route` holds back, so the monospace fallback cuts it and the font fits it in two lines. Run AutoInit while the font loads, destroy a second instance, then release the font. | The first button shows while the fallback cuts the text and hides once the font loads. The destroyed instance's button gets no `hidden`. Without the `fonts.ready` recheck or the destroyed-instance check, all three engines fail. | Passed 2026-10-25 in Chromium, Firefox and WebKit. |

V1, V2 and V10 run in `tests/show-more-browser.test.js`, one test per check. V3 to V5 run in `tests/show-more.test.js`.

## Manual checks

These are not merge conditions.

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| M1 | R2, R3 | With VoiceOver and NVDA, move to the button, activate it, then activate it again. | The button is announced as collapsed with its label, then as expanded with "Show less", then as collapsed. | Pending |
| M2 | R4 | On the docs page, load the example with a slow web font (DevTools network throttling). | The button's visibility matches the text once the font has loaded. | Replaced by V10 on 2026-10-25. |

## Merge conditions

- V1, V2 and V10 pass in Chromium, Firefox and WebKit. V1 is the roadmap's completion check, folded into the fits and resize browser test as the user chose.
- V3 to V6 pass. The user made the jsdom and semantics tests merge gates.
- V7 and V8 pass. The user did not pick them as a separate gate, but CI runs them, so V9 needs them.
- The repository's required CI checks pass (V9), and the pull request is reviewed.

## Local regression run on 2026-10-25

`npm run verify` ran 2,842 tests with 5 failures, under a load average above 100 from parallel threads. Each failing file passed when run alone: `defer-render-browser` (Chromium focus ring), `keypad-browser`, `questionnaire-browser` and `stepper-browser` (Firefox 30-second timeouts), `sheet-spring-browser` and `spring-motion-browser` (WebKit springs) and `expressivecss-codex-adapter` (oversized streams). The `docker-runner` SIGINT test also failed alone; this branch does not touch `scripts/run-docker.mjs`, and memory records it as a load flake, so CI decides it. The verify steps after `test:run` then passed: `check:generated`, `docs:build:astro` and `docs:verify`. `npm test --prefix mcp/expressivecss` hit its inspection time limit once under load and passed on two reruns, and `npm run verify:packages` passed.
