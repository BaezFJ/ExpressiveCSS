# Validation: tooltip click trigger

Roadmap phase: Phase 19, tooltip click trigger. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

The agent owns every check below and ran it during implementation on 2026-10-21, on branch `feature/2026-10-21-tooltip-click-trigger`. Tests run against built bundles, so build first with `npm run build:js`. Run suites one at a time, since parallel runs flake.

## Automated checks

V1 to V7 are jsdom cases in `tests/tooltip.test.js`, run with `node --test tests/tooltip.test.js`. They mock `setTimeout` with `t.mock.timers` and set `enterDelay` and `exitDelay` to 1000 so that a tooltip shown or hidden at once is told apart from one that waited. V8 and V9 are Playwright cases in `tests/tooltip-click-browser.test.js`, run in Chromium, Firefox and WebKit with `node --test tests/tooltip-click-browser.test.js`. Against the bundle built before the change, all eight jsdom cases and all six browser cases failed, while the existing cases passed.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R2 | A tooltip with no options. | Read `options.openOnClick` and `Tooltip.defaults.openOnClick`. Click the trigger. | Both are `false`. The click shows nothing. | Passed 2026-10-21. |
| V2 | R3 | A click tooltip with both delays at 1000 ms and a click listener on the trigger. | Click, advance 1 ms. Click again, advance 1 ms, then run the hide timer. | The first click fires `expressive:open` without waiting 1000 ms, and the opacity is `1` after 1 ms. The second fires `expressive:close` without waiting, and the tooltip is hidden after the 0 ms out transition. The page listener ran twice. | Passed 2026-10-21. |
| V3 | R4 | A click tooltip. | Dispatch `mouseenter` on the trigger and advance 2000 ms. Focus the trigger with `:focus-visible` mocked to match and advance 2000 ms. Click to open, dispatch `mouseleave` from the trigger and the tooltip, and advance 2000 ms. | Hover and focus never open it, and `mouseleave` leaves the open tooltip open. | Passed 2026-10-21. jsdom does not match `:focus-visible` after `focus()`, so the case mocks `matches` on the trigger. With the click-mode guard removed from `_handleFocus`, the case fails. |
| V4 | R5, R9 | One click tooltip and a page button whose click handler calls `open()`. A second click tooltip for `destroy()`. | Open by click and advance 0 ms. Click inside the tooltip element, then click `document.body`. Open with `open()`, wait out its delay and click `document.body`. Click the page button and advance 1000 ms, then call `close()` and click `document.body` before the exit delay ends. Open the second tooltip by click, destroy it and click `document.body`. | The inside click leaves it open, the outside click closes it at once. The `open()` tooltip also closes on the outside click. The tooltip opened from the page button's click survives that click. After `close()`, the outside click does not hide it at once, so the listener is gone; it hides when `exitDelay` ends. After `destroy()`, the outside click fires no `expressive:close`. | Passed 2026-10-21. Two more cases destroy an open click tooltip, before and after the listener's task runs, and check that a later document click fires no `expressive:close`. |
| V5 | R6, R5 | A click tooltip opened by click. `document.addEventListener` is spied. | Dispatch Escape on the document before any timer runs, then advance 0 ms. | It closes at once, and no document `click` listener is ever added, since `close()` cleared the pending task. | Passed 2026-10-21. |
| V6 | R7 | A click tooltip opened by click. | Dispatch `blur` on the trigger with no `relatedTarget`, advance 2000 ms. Then dispatch `blur` with `relatedTarget` set to another button, and advance 1 ms. | The first blur leaves it open. The second closes it at once. | Passed 2026-10-21. |
| V7 | R5 | A click tooltip whose trigger is inside an open shadow root, and one inside a closed shadow root. | For each: click the trigger and advance 0 ms, click inside the tooltip, click the trigger again, then click it a third time and click `document.body`. | Open, still open after the inside click, closed by the second trigger click without reopening, then closed by the outside click. | Passed 2026-10-21 for both modes. With the inside-click mark replaced by a `composedPath()` check, the closed-root case fails. |
| V8 | R3, R4, R5, R6, R7 | A click tooltip on a button next to a second button, in each engine. | Hover with `page.hover`, click with `page.click`, click again. Focus the trigger with `locator.focus()`, since WebKit does not focus a clicked button, and press Enter, then Space. Open and press Escape. Open and click the page background. Open and click the second button. Focus the trigger, open it with Enter and press Tab. | Hover shows nothing. Each click, Enter and Space toggles. Escape, the background click, the click on the second button and Tab close it. | Passed 2026-10-21 in Chromium, Firefox and WebKit. |
| V9 | R8, R2 | A click tooltip and a hover tooltip, in each engine. A held press is the case that differs; a short tap sends the same click as V8's mouse clicks. | On the click tooltip, dispatch a touch `pointerdown`, wait 700 ms, `pointerup`, then dispatch a cancelable click. Repeat the hold on the hover tooltip. | The click tooltip does not open from the hold, the click is not cancelled, and it opens. The hover tooltip still opens on the hold and consumes its release click. | Passed 2026-10-21 in Chromium, Firefox and WebKit. |
| V10 | R2 | Existing suites. | Run `tests/tooltip.test.js`, `tests/keyboard-focus.test.js` (Tooltip Escape cases), `tests/tooltip-touch-browser.test.js` and `tests/tooltip-shadow-browser.test.js`, one file at a time. | All pass unchanged. | Passed 2026-10-21, one file at a time: tooltip 17, keyboard-focus 10, tooltip-touch-browser 9, tooltip-shadow-browser 3. |
| V11 | R10 | Plan group 3 edits. | `npm run build:skill`, then `npm run check:generated`. Read the Tooltip options tables in `llm.md` and the docs page, the touch paragraph and the changelog. | Generation is clean. Both tables list `openOnClick` as a Boolean with default `false`. The touch paragraph names click mode. The changelog has the Added entry. | Passed 2026-10-21. `check:generated` reported every guide current. Every guide's contract hash changed with `llm.md`; only the Tooltips guide changed otherwise. |
| V12 | R11 | A fresh build. | `node --test tests/selective-builds.test.js`, and `fallow audit --base origin/master` with `node_modules/.bin` first on `PATH`. | The test passes with a reviewed budget line naming this change and its gzip bytes. The audit reports no new complexity finding in `tooltip.ts`. | Passed 2026-10-21: JavaScript 90,097 gzip bytes (+251) after merging `76781860`, whose budget was 89,846 (89,720 and +250 before the rebase and merge); CSS did not change. `fallow audit --base origin/master` reported no issues in the changed files and excluded three inherited findings in `tooltip.ts` (`destroy`, `_appendTooltipEl` and the timer in `_animate`), which were already over the threshold at the base commit. |

## Repository checks

`tech-stack.md` asks for `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages` before submitting. The agent ran each one on 2026-10-21.

- `npm run verify`: 2,343 tests, 2,334 passed, 3 skipped (the optional evaluation browser tests), 4 failed in files this change does not touch: `expressivecss-codex-adapter` (oversized streams, and the SIGTERM timeout), `expressivecss-skill-evals` (behavioral evaluation runner), `marquee-browser` (WebKit), `navigation-rail-panel-browser` (Firefox), `questionnaire-browser` (Firefox) and `sheet-spring-browser` (WebKit). Other suites ran on the machine at the same time. Each file then passed alone: codex adapter 14, skill evals 67, marquee 4, navigation rail panel 9, questionnaire 12, sheet spring 9.
- `npm test --prefix mcp/expressivecss`, after `npm ci --prefix mcp/expressivecss`: the smoke test passed.
- `npm run verify:packages`: the first run failed in the MCP smoke test that `npm pack` runs, on an `inspection-truncated` assertion; the smoke test had passed on its own just before. The rerun passed.

## Manual checks

None are required for merge. A screen reader pass that hears the description on focus of a click tooltip's trigger would be useful but needs a person.

## Final review

An independent `Plan` subagent reviewed the diff against `8d45c2c4`, the untracked files and these documents on 2026-10-21. It traced R1 to R11 to code, tests and evidence and found no correctness defect in `tooltip.ts`, and no change outside Phase 19. Its findings, all checked against the source:

- Defect: the repository checks were ticked in the plan but not recorded here. They are recorded above.
- V2, V3 and V4 described steps their tests do not take. V2's test now also checks the hidden state, and the V3 and V4 rows now describe what the tests do.
- The `clearTimeout` in `close()` for the pending outside listener was untested. V5's test now checks that no document listener is added when Escape closes the tooltip before the task runs.
- `_blurClickTooltip` ran the hide animation on every blur, even for a closed tooltip. It now hides only an open or showing one.
- Not changed: a page button that calls `open()` on a click tooltip that is already open closes it with that same click, since `open()` does nothing then and the click is outside. `open(false)` never shows a click tooltip, since hover and focus never hold it. Both are recorded as known limits. Focus left on a hidden rich-tooltip action after Escape predates this change.

V1 to V12 were rerun after these fixes against a fresh build.

## After merging Phase 18

On 2026-10-21 the branch was rebased onto `774b0d27` (#380) and then merged with `origin/master` at `76781860` (#381, Phase 18 tooltip shared delay). Generated skill and MCP files took master's side and were rebuilt with `npm run build:semantics` and `npm run build:skill`. The click cases now start their own mocked clock, as the shared delay cases do, so no case falls inside a window another case opened. One case was added: a click tooltip shows at once with no window open, and closing it lets a hover tooltip skip its `enterDelay`.

Rerun one file at a time after the merge: tooltip 26 (including the shared delay cases), keyboard-focus 10, selective-builds 4, tooltip-click-browser 6, tooltip-touch-browser 9, tooltip-shadow-browser 3, tooltip-shared-delay-browser 3. `npm run check:generated` reported every guide current, `tsc --noEmit` passed, and `fallow audit --base origin/master` reported no new findings.

## Code review

The agent ran the code-review-and-quality pass on the full diff against `origin/master` on 2026-10-21, after the final review. It mutated each condition the change adds, rebuilt, and ran the jsdom suites, plus the Chromium click browser test for the long-press guard.

- Caught by the existing tests: the click-mode guards in `_handleMouseEnter`, `_handleMouseLeave` and `_handleBlur`, the blur-to-nothing check, the deferred document listener, the clears in `close()`, and the long-press guard (V9 in Chromium).
- Two mutations survived and now have cases in `tests/tooltip.test.js`: toggling on `isOpen` instead of what shows, covered by a click during `open()`'s `enterDelay` that shows the tooltip at once (R3), and dropping the `clearTimeout` in `destroy()`, covered by destroying before the listener's task runs (R5).
- No security, performance or architecture findings. The document listener exists only while a click tooltip is open, and the change adds no dependency.

## Specification verification

Checked 2026-10-21 by the agent and by an independent `Plan` subagent that read the three documents, the constitution files, the base commit and the Tooltip and Menu sources.

- Phase, branch and base: Phase 19 as assigned by the user, on `feature/2026-10-21-tooltip-click-trigger` from `origin/master` at `8d45c2c4`. All three documents name Phase 19, and the links to `mission.md`, `tech-stack.md` and the roadmap anchor resolve.
- The reviewer reported four defects, all fixed: opening from a page button's click would close at once (fixed by adding the document listener one task later, as Menu does, with a V4 case); the listener phase and its rationale were unstated; R5 and R7 disagreed when the outside click lands on a focusable control (blur now closes at once); and reusing the whole long-press body would leave `isHovered` set. It also found that V8's Tab step cannot pass in WebKit without focusing the trigger first, and that the current-behavior text overstated which echoed mouse events are ignored. Both are fixed.
- Suggestions taken: toggle on what is showing, known limits for `stopPropagation`, iOS Safari and focus leaving the page, a button-trigger note in the docs, an open shadow root case, the `keyboard-focus.test.js` Tooltip cases in V10, the `open()` methods text, and a `fallow audit` command for V12. Not taken: a `page.tap()` case with `hasTouch`, since the existing touch tests use synthetic pointer events and V9 follows them.
- Every requirement maps to planned work and at least one V check. No open decisions remain.

## Merge conditions

- V1 to V12 pass.
- The existing Tooltip tests pass (V10).
- The fallow pre-commit gate passes on the new and changed functions.
- The repository's required CI checks pass and the pull request is reviewed.
