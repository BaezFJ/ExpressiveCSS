# Hover card validation

Roadmap phase: [Phase 45, hover card](../../../../roadmap.md#phase-45-hover-card). Requirements are in [requirements.md](requirements.md); the work is in [plan.md](plan.md).

Every result below is pending, because nothing is built yet. Build before any test run (`npm run build`), since tests read the built bundles. Run one suite at a time, because parallel browser runs flake. A single file runs with `node --test tests/<file>`; that form is not verified for the new files and may need the project's test runner flags.

## Automated checks

### Browser tests (Playwright, Chromium, Firefox and WebKit)

New file: `tests/hover-card-browser.test.js`, built on `engines` from `tests/browser.js` as `tests/popover-browser.test.js` is.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R3, R4 | A page with a `.hover-card-trigger` link, its `.popover[popover="hint"]` card holding a link, and the instance started with `enterDelay: 500`, `exitDelay: 300`. `reducedMotion: 'reduce'`. | Hover the link. Check the card before 500 ms, then wait past 500 ms. Move the pointer onto the card and wait past 300 ms. Move the pointer to empty space and wait past 300 ms. | The card is closed before the delay and matches `:popover-open` after it, with its top edge within 2 px of the link's bottom edge plus `--md-comp-popover-gap` (4px by default), the gap `.popover` already adds. It is still open after the pointer has been on the card longer than `exitDelay`. It is closed once the pointer has been off both for longer than `exitDelay`. This is the roadmap's completion check. | Pending |
| V2 | R5, R6 | The V1 page with a focusable button before the link. | Focus the button, then press Tab (Alt+Tab in WebKit) to reach the link. Wait past `enterDelay`. Press Tab again. Press Escape. Then repeat with the pointer pressing the link instead of Tab. | The card opens after the delay with focus still on the link. The next Tab puts focus on the card's link, and the card stays open. Escape closes the card and focus is on the trigger link. A pointer press that focuses the link opens the card only through hover, not through focus. | Pending |
| V3 | R5 | The V1 page with a second link after the card. | Tab to the trigger, wait for the card, Tab into the card, then Tab past its last link. Wait past `exitDelay`. | The card closes once focus has left the trigger and the card for longer than `exitDelay`. | Pending |

### jsdom tests (`node:test` with mocked timers)

New file: `tests/hover-card.test.js`. Stub `showPopover` and `hidePopover` on the prototype as `tests/dismissal-lifecycle.test.js` does, and restore them, the mocked timers and the instances in `finally`.

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V4 | R2 | Start an instance with no options, then one with `data-hover-card-options='{"enterDelay":100,"exitDelay":50}'`. | Defaults are `enterDelay` 500 and `exitDelay` 300. The data attribute's values override them. | Pending |
| V5 | R3 | Fire `mouseenter` on the link, then `mouseleave` to empty space after 200 ms; tick past 500 ms. | `showPopover` is never called. | Pending |
| V6 | R3, R4 | Fire `mouseenter`, tick 500 ms. Fire `mouseleave` toward empty space, tick 200 ms, fire `mouseenter` on the card, tick 300 ms. Then leave the card to empty space and tick 300 ms. | `showPopover` is called once with `{ source: link }`. The card stays open after the return within `exitDelay`, and `hidePopover` is called once after leaving both. | Pending |
| V7 | R7 | Dispatch a touch `pointerenter`, `pointerdown` and `pointerup` on the link, then the compatibility `mouseenter` and `click`; tick past 500 ms. Separately, dispatch a mouse `click`. | No timer opens the card. Neither click has `defaultPrevented` set. | Pending |
| V8 | R6 | Open the card. Focus a button inside an open dialog elsewhere and dispatch Escape on it. | The card closes, and the Escape event is not stopped or prevented, so the dialog still receives it. | Pending |
| V9 | R8 | Call `open()`, then `close()`, listening for `expressive:` open and close events. Then open the card through hover and call `destroy()`. | `open()` shows the card without waiting and `close()` hides it without waiting. Each event fires once per change. After `destroy()`, the card is hidden, no timer is pending, hover no longer opens it, and the link's and card's attributes match the original markup. | Pending |
| V10 | R2 | Start a trigger whose `aria-details` names a missing id. | One console error, no instance state that later throws, and no listener left on the link. | Pending |

### Markup and wiring

| ID | Covers | Command or action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V11 | R1 | Add cases to the semantics tests for the new `hover-card` row, then `npm run build:semantics` and the semantics test files. | Valid markup passes. A `<button class="hover-card-trigger">`, a trigger without `aria-details`, and an `aria-details` id with no `[popover]` element each fail with the row's message. | Pending |
| V12 | R2 | `tests/autoinit.test.js` with a new `tests/fixtures.js` entry and the updated `AUTO_INIT_FIXTURES.length`. | AutoInit starts `HoverCard` on `.hover-card-trigger` and the count matches. | Pending |

### Regression and repository checks

| ID | Covers | Command | Expected result | Result |
| --- | --- | --- | --- | --- |
| V13 | R9 | `npm run verify` | Passes, including the existing Tooltip, Popover and NavigationRail tests unchanged, typecheck, `check:generated` and the docs build. | Pending |
| V14 | R10 | `npm run build:skill` after the last edit, then `npm run check:generated`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`. | Generated files are current. MCP tests pass with the new guide counted. `tests/docs-astro.test.js` passes with the component in `llm.md`'s AutoInit and events tables and in `docs/src/pages/auto-init.astro`. | Pending |
| V15 | R11 | `tests/selective-builds.test.js` with the new reviewed budget line. A commit through the fallow pre-commit hook. | The gzip budget test passes with a line naming the hover card and its byte change. Fallow reports no new function at cyclomatic complexity 5 or above. | Pending |

## Manual checks

None are merge conditions. The user did not choose a manual screen reader pass. If someone runs VoiceOver or NVDA against the docs page, record what was heard here, and do not mark it passed unless it ran.

## Merge conditions

- V1 to V12 pass. The browser checks pass in all three engines.
- V13 to V15 pass after the final edit.
- Required CI checks pass on the pull request, and the pull request has its required reviews.
- No browser or visual check is reported as passed unless it ran.
