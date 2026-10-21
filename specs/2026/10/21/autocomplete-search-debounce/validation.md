# Validation: autocomplete search debounce

Roadmap phase: Phase 13, autocomplete search debounce. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

Every result is pending, since the feature is not built yet. Tests run against built bundles, so build first with `npm run build:js`. Run suites one at a time, since parallel runs flake.

## Automated checks

V1 to V7 are new jsdom cases in `tests/regressions.test.js`, run with `node --test tests/regressions.test.js`. They mock `setTimeout` with `t.mock.timers`. That this mock reaches the timers the bundle uses under jsdom is unverified until group 1 runs; `tests/carousel.test.js` uses the same pattern.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R3 | Autocomplete with `searchDelay: 300` and an `onSearch` that records each text and signal. The field is focused. | Fire five input events with values `a` to `apple`, 50 ms apart. Advance the clock by 299 ms, then by 1 ms. | No call before the delay passes, then exactly one call, with `apple` and a live signal. | Pending |
| V2 | R3, R4 | The V1 instance after its first search. | Fire inputs `apple p` and `apple pi`, then advance 300 ms. | The first signal is aborted when `apple p` arrives, before the clock moves. After the pause there is one more call, with `apple pi` and a live signal. Two calls in total. | Pending |
| V3 | R5 | A V1-style instance. | Fire one changed input and do not advance the clock. | The status element holds the loading indicator, and the live region reads `i18n.loading`, before `onSearch` runs. | Pending |
| V4 | R6 | A V1-style instance with a pending delayed search. | Blur, change the value, then focus the field. | `onSearch` runs at once on focus with the new text, and the pending search never runs. | Pending |
| V5 | R7, R8 | Two V1-style instances, each with a pending delayed search, and a third with one running search and a pending one. | Blur the first and advance 300 ms. Destroy the second and advance 300 ms. Destroy the third. | No delayed call runs for the first two. For the third, the running signal is aborted and no call happens after `destroy()`. | Pending |
| V6 | R9 | A V1-style instance whose `onSearch` calls `setMenuItems` with one item, and a pending delayed search. | Press Escape, then advance 300 ms. | `onSearch` runs once, the list holds the item, and the menu stays closed. | Pending |
| V7 | R2, R10 | Instances with `searchDelay` of `0`, `-1` and `NaN`, and one with no option. | Fire two changed inputs without advancing the clock. | Each instance calls `onSearch` twice, synchronously, and the first signal is aborted, as the existing "aborts the running search" case expects. | Pending |
| V8 | R10 | Existing suites. | Run `tests/regressions.test.js`, `tests/dismissal-lifecycle.test.js`, `tests/ime-enter.test.js`, `tests/injection.test.js`, `tests/forms-generated.test.js` and `tests/chips.test.js`, one file at a time with `node --test`. | All pass, including "Autocomplete search cancellation" and "Autocomplete with delayed results". | Pending |
| V9 | R11 | Plan group 3 edits. | `npm run build:skill`, then `npm run check:generated`. Read the Autocomplete options tables in `llm.md` and the docs page, the remote example and the changelog. | Generation is clean. Both tables list `searchDelay` as a Number with default `0`. The example passes `searchDelay`. The changelog has the Added entry. | Pending |
| V10 | R12 | A fresh build. | `node --test tests/selective-builds.test.js`. | The test passes with a reviewed budget line naming this change and its gzip bytes for JavaScript. | Pending |

## Recommended, not required for merge

`tech-stack.md` asks for `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages` before submitting. The user did not choose them as merge conditions on 2026-10-21.

## Manual checks

None are required for merge. These are useful but optional:

- Typing into the docs Autocomplete with `searchDelay` set and watching the network panel show one request per pause.
- A screen reader pass that hears "Loading results." while typing and the result count after the pause.
- Chips with `autocompleteOptions: { searchDelay: 300 }`, which the user chose not to test automatically.

## Merge conditions

- V1 to V10 pass.
- The existing Autocomplete and Chips tests pass (V8).
- The fallow pre-commit gate passes on the new and changed functions.
- The repository's required CI checks pass and the pull request is reviewed.
- The changelog lists `searchDelay` under Added.
