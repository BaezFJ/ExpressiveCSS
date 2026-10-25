# Validation: currency formatting in text fields

Roadmap phase: Phase 39, currency formatting in text fields. Requirements are in [requirements.md](requirements.md) and the work in [plan.md](plan.md).

Every result is pending, because the feature is not built yet. Browser checks run against built bundles after `npm run build`, one suite at a time. The commands `node --test tests/currency-input-browser.test.js` and `node --test tests/currency-input.test.js` follow the pattern of earlier test files and have not been run, since the files do not exist yet.

The browser fixture for V1 and V3 to V7 is a `<form lang="de">` holding `<input name="amount" type="text" inputmode="decimal" data-currency="EUR">` and a submit button, started by AutoInit, plus the extra fields each check names.

## Automated checks

| ID | Covers | Setup and action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V1 | R1, R2, R6 | In Chromium, Firefox and WebKit: type `1234.5` into the empty field and press Tab. Read `new FormData(form).get('amount')` and the entry in a `submit` handler's form data. | The field shows `1.234,50 €`. Both form data reads return `1234.5`. | Passed 2026-10-25 in Chromium, Firefox and WebKit. The display uses a no-break space before `€`, as Intl writes it. |
| V2 | R4, R5, R7, R9, R11 | In jsdom, set the text and read `value` for: `1234,5`, `1.234,5`, `1,234.50` and `1.234` with EUR under `de`; `1,234.5` under `en`; `1.234` and `1,5` with JPY; `-12,5`, `−12,5` and `12 €`; `abc`; an empty field. Start a field with `value="1.234"`, one with `value="1234,5"`, and one with `data-currency="EURO"`. | The EUR cases read 1234.5, 1234.5, 1234.5 and 1234. The `en` case reads 1234.5. JPY reads 1234 and 15. The negatives read −12.5 and `12 €` reads 12. `abc` and the empty field read `null`, and only `abc` fails `checkValidity()`. The starting values read 1.234 and 1234.5. The `EURO` field gets no listeners and keeps its text. | Passed 2026-10-25, with two extra cases: a Danish `kr.` symbol and Arabic-Indic digits under `ar-EG` both read back. Rounding goes through a starting value, because typed text with three digits after the mark reads them as a group. |
| V3 | R2, R3 | Type `1234.5`, press Tab, then click back into the field. Attach `change` and `blur` listeners on the field before AutoInit, and repeat. | On focus the field shows `1234,5` with the caret at 6. Both listeners read `1.234,50 €`. | Pending |
| V4 | R4, R6 | Paste `1.234,50 €` into the empty field with `keyboard.insertText`, then press Enter without leaving the field. Repeat in an `en` form with USD, pasting `$1,234.50`. | Both submits carry `1234.5`. After blur the `en` field shows `$1,234.50`. | Pending |
| V5 | R5 | Put `.validate` on the field's container, type `abc` and press Tab. Then focus, select all and type `12`, and press Tab. Repeat with `data-currency-input-options='{"i18n":{"invalid":"Betrag eingeben."}}'`. | After `abc` the field shows `abc`, fails `checkValidity()` and has `aria-invalid="true"`, with `Enter an amount.` as its message. After `12` it is valid and shows `12,00 €`. The options case shows `Betrag eingeben.`. | Pending |
| V6 | R7, R8 | Start a field with `value="1234.5"`, with `input` and `change` listeners attached first. Type a different amount, press Tab, then reset the form with the reset button and with `form.reset()`. | On start the field shows `1.234,50 €` and neither listener ran. After each reset it shows `1.234,50 €`. | Pending |
| V7 | R12 | Start the component, type `abc` and press Tab so the field is invalid, call `destroy()`, then focus the field, press End, type `5` and press Tab, and read `new FormData(form)`. | The field is valid again, shows `abc5` unformatted, and the form data holds `abc5`. | Pending |
| V8 | R10 | In `tests/semantics.test.js`, check markup with `data-currency="EUR"` on `type="number"`, on a `<textarea>`, with `data-currency=""` on a text input, and with `data-currency="EUR"` on a text input. | The rule flags the first three and passes the last. The check does not start components. | Passed 2026-10-25. |
| V9 | R14 | `node --test tests/selective-builds.test.js tests/autoinit.test.js` | Both pass with the reviewed JavaScript budget line and the new AutoInit fixture count. | Pending |
| V10 | R13 | After `npm run build:skill` as the last generation step, run `npm run check:generated` and `node --test tests/expressivecss-skill.test.js tests/expressivecss-version-resolution.test.js tests/expressivecss-component-decisions.test.js`. | Generated files are clean and the guide counts match. | Pending |
| V11 | R13, R14 | The repository's required CI checks on the pull request. | All pass. | Pending |

V1 and V3 to V7 run in `tests/currency-input-browser.test.js`, one test per check.

## Manual checks

These are not merge conditions.

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| M1 | R3, R4 | On iOS Safari and Android Chrome, focus the field under `lang="de"` and type an amount on the `inputmode="decimal"` keypad. | The keypad offers the decimal key the device uses, and either `,` or `.` reads as the decimal mark. | Pending |
| M2 | R2, R5, R13 | With VoiceOver and NVDA, type an amount, leave the field, and return to it. Then type `abc` and leave it. | The formatted amount and the label's currency are read. The invalid message is read with the field. | Pending |

## Merge conditions

- V1, the roadmap's completion check, passes in Chromium, Firefox and WebKit.
- V2, the parsing unit tests, passes.
- V3 to V7, the edge-case browser tests, pass in all three engines.
- V8 to V10 pass, so the semantics, budget, AutoInit and generated-file checks hold.
- V11, the repository's required CI checks and reviews, pass.

A local `npm run verify` run is not a merge condition. The manual checks are not merge conditions.
