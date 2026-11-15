# Button loading state: requirements

- Feature: an opt-in loading state on buttons that keeps the label, shows progress beside it, reports busy and ignores a repeat press
- Date: 2026-11-15
- Roadmap phase: [Phase 83: ship a button loading state that keeps its label](../../../../roadmap.md#phase-83-ship-a-button-loading-state-that-keeps-its-label), in the milestone "apps that feel finished". It depends on [phase 79](../button-loading-guidance/). The [mission](../../../../mission.md#product-rules) requires a change to existing markup's behavior to be opt-in or carry a migration note.
- Branch: `feature/2026-11-15-milestone-apps-that-feel-finished`
- Base: the branch at `8b8c0be20`, after phase 82

## Current behavior and need

Phase 79's guidance has apps build the loading state by hand: a separate `.loading-indicator` beside the button, a pending flag in the handler and `aria-disabled="true"`, which paints the button disabled. `.button` and `<button>` have no loading state. `aria-busy` on a button does nothing visible today, and a button with `aria-busy="true"` still runs its handler on a second press.

## Scope

- `aria-busy="true"` on a `<button>` or `.button` shows a small progress indicator beside the label, drawn by CSS, and keeps the label and its colors.
- A new shared behavior, `BusyButtons`, started by the root bundle like `Copy`: a capture-phase `click` listener that cancels a click on a busy button and stops it from reaching other listeners, so a mouse press, Enter, Space and a form's implicit submission do nothing while the button is busy.
- The buttons guide's App behavior points at the shipped state; the delay and minimum time stay guidance.
- Docs in `llm.md` and `docs/src/pages/buttons.astro`, the `exports` entry in `docs/src/data/nav.ts`, the CHANGELOG with a migration note, gzip budget lines, and a browser test in all three engines.

## Exclusions

- A minimum spinner duration in the framework; the roadmap keeps it as guidance. The show delay ships as a CSS token, because the guard and the indicator key on the same attribute.
- An indicator on icon buttons, FABs, circle and extended buttons, and buttons in fixed slots (button groups, split buttons, toolbars, tabs, navigation, snackbars, dialog headers) and other components that draw their own `::after` on a button (data table sort buttons, menu and mega-menu triggers). The click guard still applies to any busy button.
- Setting `aria-busy` for the app; the app knows when its request starts and ends.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| The state is the `aria-busy="true"` attribute, not a class (the roadmap's open question) | Decided from evidence | It is the state assistive technology needs, so one attribute both reports busy and turns on the styling, the way `aria-pressed` drives toggle buttons and `aria-busy` drives `.loading-overlay`. A class would need the attribute too. |
| Runtime code is needed (the roadmap's open question) | Decided from evidence | CSS can stop pointer presses with `pointer-events`, but not Enter, Space or a form's implicit submission, which all fire a `click` on the button. A capture-phase `click` listener on the document cancels all of them. `requestSubmit()` dispatches no click, so the keypad, which calls it, skips a form whose default button is busy. Closed shadow roots and app code that calls `requestSubmit()` are documented limits. |
| The indicator fades in after a delay token (about 300ms) | Decided from evidence (spec review) | The guard must act the moment `aria-busy` is set, so the delay can't come from setting the attribute later. A `--md-comp-button-busy-delay` token on the indicator's fade keeps quick requests from flashing it. |
| Apps own setting `aria-busy` | Decided from evidence | The mission makes applications own server data operations; only the app knows when its request starts and ends. |
| The indicator is a `::after` pseudo-element with no content text | Decided from evidence | It adds nothing to the accessible name, needs no extra markup, and avoids the `loading-indicator-reports-itself` semantics rule that a nested `.loading-indicator` would trip. |
| The busy button keeps its normal colors | Decided from evidence | Busy is not disabled: the label stays readable at full contrast, and `cursor: progress` shows the wait. |
| Existing markup: only a button that already has `aria-busy="true"` changes | Decided from evidence | Buttons without the attribute are untouched. A page that sets `aria-busy="true"` on a button today gains the indicator and the click guard; the CHANGELOG says so. |

## Requirements

- **R1** A shaped common button (`#{$_shaped}` in `_buttons.scss`: not circle, extended, icon button, FAB or fixed slot) that is enabled and has `aria-busy="true"` shows a progress indicator after its label as a `::after` with its own keyframes, sized to the label's line height, in `currentColor`, fading in after `--md-comp-button-busy-delay` (300ms), spinning, still under reduced motion, and visible in forced colors. Its label and colors are unchanged and `cursor` is `progress`; the button grows by the indicator and its gap, which the docs say. A disabled button shows no indicator. Without the attribute, or with any other value, nothing changes.
- **R2** `BusyButtons.Init()` adds one capture-phase `click` listener on the document. A click whose composed path holds a `button` or `.button` with `aria-busy="true"` is cancelled (`preventDefault`) and stopped (`stopImmediatePropagation`). The root bundle calls `Init()`; the modular entry exports `BusyButtons` for an explicit `Init()`. A second `Init()` adds nothing. The keypad's Enter skips `requestSubmit()` when the form's default button is busy.
- **R3** The buttons guide's App behavior says to set `aria-busy="true"` on the button synchronously when the command starts, before any `await`, and remove it in `finally` once the indicator has shown for about 500ms; that keeps the label and focus, shows progress after the delay and ignores repeat presses; screen readers may not announce busy, so also change the label to "Saving…" or announce in a status region; the result is still announced once. `tests/expressivecss-skill.test.js` checks the new phrases and a 1,536-byte cap, and the reading budget test gets a reviewed line.
- **R4** `llm.md` documents the loading state and `BusyButtons` (with the guard's limits); `docs/src/pages/buttons.astro` shows a click-to-busy demo and names `BusyButtons`; `docs/src/data/nav.ts` maps the export to the buttons page; `docs/src/pages/javascript.astro` lists it among document behaviors; `BEHAVIOR_CONTRACTS` in `scripts/gen-expressivecss-skill.mjs` carries it, with its test; `src/ts/README.md` lists its side effect.
- **R5** A browser test, run once per engine with `EXPRESSIVECSS_TEST_BROWSER`: a busy button keeps its accessible name; Chromium's accessibility tree (CDP) reports it busy, and Firefox and WebKit record the attribute only; the indicator shows after the delay; a click, Enter, Space and Enter in a field of its form (the button being the single submit) reach neither its click handler nor the form's `submit`; after removing the attribute, a click reaches both; a page using the modular entry without `Init()` lets the busy click through; forced colors keep the indicator visible (Chromium); a disabled busy button shows no indicator; a circle button shows none. `tests/shadow-delegation.test.js` gains a busy button in an open shadow root.
- **R6** CHANGELOG lists the loading state and `BusyButtons` under Added and the guidance rewrite under Changed, with a migration note: any button that already carries `aria-busy="true"` ignores clicks, and shaped buttons gain the indicator. The JS and CSS gzip budget lines are raised with reviewed comments; new tokens are declared as `tests/buttons.test.js` requires; `npm run build:skill` runs last; verify and the MCP smoke test pass. A visual comparison of the buttons page runs if Docker is available, otherwise it is a human check.

## Risks considered

- Two at once: the guard runs in the capture phase, before any handler, so a fast second press can't slip through while the first handler runs.
- Bad input: not applicable.
- Who must be refused: not applicable.
- Readers: "click outside to close" listeners (menus, docked displays) never see a click on a busy button, so an open menu stays open; middle-click and `pointerdown` handlers still run. Every button style and size (the indicator must fit each), toggle buttons with `aria-pressed`, `a.button` (a cancelled click doesn't follow the link), the Copy behavior (a busy copy button won't copy), the `aria-busy` uses in loading overlay and pull-to-refresh (regions, not buttons, so the selector leaves them alone), shadow roots (composed path), the docs coverage test for exports, and gzip budgets.
- UI states: forced colors (the indicator uses `currentColor`), reduced motion, RTL (the indicator follows the label in inline order).
- `specs/checklist.md`: the project has none.
