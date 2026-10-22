# Validation: AutoInit for markup added later

Roadmap phase: Phase 21, AutoInit for markup added later. Requirements are in [requirements.md](requirements.md) and the work in [plan.md](plan.md).

The user chose four kinds of checks in the interview: the jsdom suite, a browser test in three engines, a sweep of components that insert their own markup, and the standard merge gates. Every result is pending until the check runs.

## Automated checks

### jsdom

These live in `tests/autoinit.test.js` and run with `npm run build:js && node --test tests/autoinit.test.js`. Each case waits for the observer callback with a resolved promise or `setTimeout(0)` before asserting.

| ID | Covers | Setup and action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V1 | R1, R3 | Call `AutoInit(document.body, { Menu: { inDuration: 0 } }, { watch: true })` on an empty body. Append a `.menu-trigger` with `data-target`, `data-menu-options='{"hover":true}'` and its menu. | After the callback, `Menu.getInstance(trigger)` exists, `inDuration` is `0` and `hover` is `true`. | Pending |
| V2 | R3 | With watch on, append one container holding a `.menubar` with two triggers, a `.tooltipped` link and a `select`. Separately append a bare `.tooltipped` element as the added node itself. | Every element has its instance. The menubar's trigger menus carry Menubar's `menuOptions`, which shows registry order held. The bare tooltip, which was the added node and not a descendant, has a Tooltip instance. | Pending |
| V3 | R3, R5 | With watch on, append a `.tooltipped.no-autoinit` element. Start a Tooltip on it with a direct `init`, then remove it. | The watcher starts nothing on it, and after removal the directly started instance still exists. | Pending |
| V4 | R4 | Start a Tooltip on a detached element with `Tooltip.init(el, { position: "left" })`, then append it to a watched body. | The instance is the same object and `position` is still `"left"`. | Pending |
| V5 | R5 | For each entry in `AUTO_INIT_FIXTURES`, with watch on, append the fixture markup, wait, then remove it and wait. Spy on `console.error`. | Each component's `getInstance(el)` returns `undefined` after removal, nothing throws, and `console.error` is not called. | Pending |
| V6 | R5 | With watch on, start a menu trigger, then move it to another container in the same body with one `appendChild`. | `Menu.getInstance(trigger)` is the same object after the callback. | Pending |
| V7 | R5 | With watch on, add an element and remove it before the callback runs. Separately, remove a started element in one task and add it back in a later task. | The first is never started. The second is destroyed, then started again with a new instance. | Pending |
| V8 | R6 | With watch on, add the class `tooltipped` to an element already in the body. Remove the class `tooltipped` from a started element. | No Tooltip starts on the first element, and the second keeps its instance. | Pending |
| V9 | R2 | Call `AutoInit(document.body, {}, { watch: true })` and store the stop function. Start a tooltip through it, call `stop()`, then append a new `.tooltipped` and remove the started one. | `stop` is a function. After `stop()`, the new element has no instance and the removed one still has its instance. | Pending |
| V10 | R1, R2 | Spy on `MutationObserver` construction. Call `AutoInit()` and `AutoInit(document.body, {})`, then append a `.tooltipped`. | No observer is created, the appended element has no instance, and both calls return a function that does nothing when called. | Pending |
| V11 | R7 | Attach an open shadow root to a host in a watched body. Append a `.tooltipped` inside it. Then call `AutoInit(shadowRoot, {}, { watch: true })` and append another, then add a `.tooltipped` to the document body. | The first is not started by the document watcher. The shadow-root watcher starts the second. The shadow-root watcher does not start the element added to the body, and the document watcher does. | Pending |

### Browser

These run in Chromium, Firefox and WebKit from a new file, proposed name `tests/autoinit-watch-browser.test.js`, with `npm run build:js && npm run build:css && node --test tests/autoinit-watch-browser.test.js`. The command is not yet run on this branch.

| ID | Covers | Setup and action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V12 | R1, R3, R5 | The roadmap completion check. Load the bundle, call `Expressive.AutoInit(document.body, {}, { watch: true })`, then insert a `.menu-trigger` and its menu with `insertAdjacentHTML`. Click the trigger without calling `init`. Remove the trigger and its menu. | The menu opens and the trigger reports `aria-expanded="true"`. After removal, `Expressive.Menu.getInstance(trigger)` is `undefined`. | Pending |
| V13 | R4, R8 | With watch on, open and use a Datepicker (change month and year), a Timepicker, a `select`, a Menu and a Tooltip. Record each Datepicker FormSelect instance before and after the month change, count instances per component before and after, and collect `console.error` and `pageerror` messages. | The Datepicker's selects have the FormSelects Datepicker built (each one equals the instance Datepicker holds), no component has extra instances, and no error is logged. | Pending |

### Regression and merge gates

| ID | Covers | Setup and action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V14 | R1, R4 | After a build, run `tests/autoinit.test.js` (the fixture loop for every registered component), `tests/components.test.js` and `tests/bundle.test.js`, one file at a time. | All pass. A second `AutoInit()` without `watch` still replaces instances as before. | Pending |
| V15 | R9 | Read the docs section, the Alpine section, the `llm.md` text and the changelog entry. Run `npm run build:skill` then `npm run check:generated`. Run `node --test tests/docs-astro.test.js`. | The docs cover every rule in R9. `check:generated` and the docs test pass. | Pending |
| V16 | R10 | Add the budget line and run `node --test tests/selective-builds.test.js`. Run `npx fallow audit --base origin/master` with `node_modules/.bin` on `PATH`. | The budget test passes with a reviewed line, and fallow reports no new function at cyclomatic complexity 5 or more. | Pending |
| V17 | All | `npm run verify` once near the end. Rerun a failing browser test in code this branch did not touch alone before debugging it. | Passes, or each failure is an unrelated flake shown by a passing solo rerun. | Pending |
| V18 | R9 | `npm test --prefix mcp/expressivecss`, then `npm run verify:packages`, after `npm run build:skill`. | Both pass. | Pending |

## Manual checks

None planned. V12 and V13 cover the interactive behavior in real engines, and `npm run verify` builds and checks the docs page.

## Merge conditions

- V1 to V18 pass.
- Required CI checks on the pull request pass in all three engines.
- Required repository reviews are done, and review findings are fixed or recorded as documented limits.
- The roadmap is not edited on this branch.
