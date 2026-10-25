# Validation: transfer list

Roadmap phase: Phase 46, transfer list. Requirements are in [requirements.md](requirements.md) and the work in [plan.md](plan.md).

Every result is pending, because the feature is not built yet. Browser checks run against built bundles after `npm run build`, one suite at a time. The command `node --test tests/transfer-list-browser.test.js` follows the pattern of earlier test files and has not been run, since the file does not exist yet.

The browser fixture is a `<form>` holding the markup from the requirements' proposals, with `data-name="toppings"`, four available rows (`olives`, `peppers`, `onions`, `basil`), an empty chosen list and a submit button, unless a check names other rows.

## Automated checks

| ID | Covers | Setup and action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V1 | R1, R2, R5 | In Chromium, Firefox and WebKit: check `onions` and press `add`, then check `olives` and press `add`. Read `new FormData(form).getAll('toppings')` and the same entry in a `submit` handler's form data. | The chosen list holds `onions`, then `olives`, both unchecked. Both reads return `['onions', 'olives']`. | Pending |
| V2 | R2, R5 | Start with `mushrooms` in the chosen list. Check `basil` and `peppers` together and press `add`. Read the form data. Repeat with `data-name` removed, and with a second form on the page. | The chosen list reads `mushrooms`, `peppers`, `basil`, and the form data holds those three in that order. Without `data-name` the form data has no `toppings` entry. The second form's data is unchanged. | Pending |
| V3 | R3, R4, R13 | Press `add-all`, then check `peppers` and `olives` in the chosen list and press `remove`. Then disable `basil`'s checkbox in the chosen list and press `remove-all`. Call `TransferList.Init()` twice before the first press and count `expressive:transfer` events per press. | After `remove` the available list reads `olives`, `peppers` in their original slots. After `remove-all` the available list reads `olives`, `peppers`, `onions`, and `basil` stays in the chosen list. Each press fires one event. | Pending |
| V4 | R6, R7 | Press `add` with nothing checked, `remove` with the chosen list empty, then check `olives` and press `add` by focusing the button and pressing Enter, and again with Space. | The empty presses move nothing, fire no event and leave the live region empty. After each keyboard press focus is on the pressed button. | Pending |
| V5 | R8 | Check two rows and press `add`. Set `TransferList.i18n.moved = '{count} → {list}'` and repeat with one row. Repeat with the chosen list named by `aria-labelledby`. | The live region beside the container has `aria-live="polite"` and reads `Moved 2 to Chosen toppings`, then `1 → Chosen toppings`, then the labelling element's text. | Pending |
| V6 | R9 | Listen for `expressive:transfer` on `document`, check `peppers` and `olives`, and press `add`. | One event bubbles from the container with `detail.rows` holding the `olives` and `peppers` rows in their new order, `detail.from` the available list and `detail.to` the chosen list. | Pending |
| V7 | R10 | Start with `mushrooms` checked by default (`checked` attribute) in the chosen list. Move rows both ways, then reset with the reset button. Repeat with `form.reset()`. Reset once before any move. | After each reset both lists match their starting rows and order, and `mushrooms` is checked again. A reset before any move changes nothing. | Pending |
| V8 | R11 | Measure the lists' boxes in a page with `dir="ltr"` and with `dir="rtl"`, at a wide viewport and below the `medium` window size. Fill the available list with 50 rows. | In `ltr` the available list is left of the chosen list, in `rtl` right of it, and each `add` icon's computed transform points toward the chosen list. Below `medium` the lists stack. The 50-row list scrolls inside its box and the buttons stay in the viewport. | Pending |
| V9 | R13 | Append a new `.transfer-list` to a form after load, check a row and press `add`, then read the form data. | The row moves and the form data holds its value, with no `Init()` call. | Pending |
| V10 | R12 | In `tests/semantics.test.js`, check markup with a `.transfer-list` lacking `data-name`, a named checkbox inside one, an unnamed `.transfer-chosen` list, and the full proposal markup. | The rule flags the first three and passes the last. The check does not start components. | Pending |
| V11 | R15 | `node --test tests/selective-builds.test.js tests/expressivecss-component-decisions.test.js` | Both pass with the reviewed JavaScript and CSS budget lines and a `sourceRevision` pin the test accepts. | Pending |
| V12 | R14 | After `npm run build:skill` as the last generation step, run `npm run check:generated` and `node --test tests/expressivecss-skill.test.js tests/expressivecss-version-resolution.test.js tests/docs-astro.test.js`. | Generated files are clean, the guide counts match and the docs page builds. | Pending |
| V13 | R14, R15 | The repository's required CI checks on the pull request. | All pass. | Pending |

V1 to V9 run in `tests/transfer-list-browser.test.js`, one test per check, in Chromium, Firefox and WebKit. Each test removes its fixture in a `finally` block.

## Manual checks

These are not merge conditions.

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| M1 | R7, R8 | With NVDA in Firefox and VoiceOver in Safari, check two rows and press `add`. | Each row reads as a checkbox with its label, the button keeps focus, and the move is announced once. | Pending |
| M2 | R11 | Open the docs example in forced colors mode. | Checked rows, the list boundaries and the button icons stay visible. | Pending |
| M3 | R11 | Open the docs example on a phone. | The lists stack and every button meets the touch target size. | Pending |

## Merge conditions

- V1 passes in Chromium, Firefox and WebKit.
- V2 to V12 pass, as the user made the regression checks merge conditions.
- V13, the repository's required CI checks, passes on the pull request, and the pull request has a review.
- Running `npm run verify`, the MCP tests and `verify:packages` locally is not required; V13 stands in for them.
