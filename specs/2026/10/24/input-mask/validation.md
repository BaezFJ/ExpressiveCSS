# Validation: pattern input mask

Roadmap phase: Phase 38, pattern input mask. Requirements are in [requirements.md](requirements.md) and the work in [plan.md](plan.md).

Every result is pending, because the feature is not built yet. Browser checks run against built bundles after `npm run build`, one suite at a time. The command `node --test tests/input-mask-browser.test.js` follows the pattern of earlier browser test files and has not been run, since the file does not exist yet.

The browser fixture for V1 to V9 is a form holding `<input name="phone" type="tel" inputmode="numeric" data-mask="(000) 000-0000">`, started by AutoInit, plus the extra fields each check names.

## Automated checks

| ID | Covers | Setup and action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V1 | R1, R4, R5, R8 | In Chromium, Firefox and WebKit: type `5551234567` into the empty field. Clear it, then paste `555.123.4567`. Read `new FormData(form).get('phone')` and the entry in a `submit` handler's form data. | After typing and after pasting, the field shows `(555) 123-4567` with the caret at 14. Both form data reads return `(555) 123-4567`. After typing `5551` alone, the field shows `(555) 1` with the caret at 7. | Pending |
| V2 | R2, R3 | Type `55a5)` into the phone field. In a field with `data-mask="aa-0000"`, type `ÉB1234`. In a field with `data-mask="\0*0"`, type `x5`. Type 11 digits into the phone field. | The phone field shows `(555`, with the letter and the typed `)` dropped. The second field shows `ÉB-1234`. The third shows `0x5`. The 11th digit is dropped. | Pending |
| V3 | R5, R6 | Each step starts from `(555) 123-4567`. Put the caret at 6, after `) `, and press Backspace. Put the caret at 4, before `)`, and press Delete. Select `123` and press Backspace. Then, from `(555`, put the caret at 1 and type `9`. | Backspace removes the third `5`, the digits after it move back a slot, and the field shows `(551) 234-567` with the caret at 3. Delete removes the `1` and shows `(555) 234-567`, caret at 4. The selection delete shows `(555) 456-7`, caret at 4. The insert shows `(955) 5`, caret at 2. | Pending |
| V4 | R7 | In all three engines, dispatch `compositionstart`, an `input` event with `isComposing: true` writing `55a`, then `compositionend` and a final `input`, in each engine's order. In Chromium, repeat with CDP `Input.imeSetComposition` and `Input.insertText` writing full-width `５５５１`. | Mid-composition the field holds the IME text unchanged. After the composition ends, it shows `(55` in the first case and `(555) 1` in the second, with the caret after the composed text. | Pending |
| V5 | R9 | Start a field with `value="5551234567"`, with `input` and `change` listeners attached first. Change its value by typing, then reset the form. | On start the field shows `(555) 123-4567` and neither listener ran. After reset it shows `(555) 123-4567`. | Pending |
| V6 | R10 | Add `input` listeners on the field, the form and the document, attached before AutoInit runs. Type `5551`. | Each listener reads `(555) 1`. | Pending |
| V7 | R11 | Put a `.keypad` with `aria-controls` naming the masked field, as the Keypad section of `llm.md` shows. Press its keys 5, 5, 5, 1. | The field shows `(555) 1`. | Pending |
| V8 | R13 | Start the component, call `destroy()`, then type `5551` into an empty field. | The field shows `5551`, and no listener from the component remains. | Pending |
| V9 | R12 | In `tests/semantics.test.js`, check markup with `data-mask` on `type="number"`, `type="email"` and a `<textarea>`, and on `type="tel"`. | The rule flags the first three and passes the `tel` input. The check does not start components. | Pending |
| V10 | R15 | `node --test tests/selective-builds.test.js tests/autoinit.test.js` | Both pass with the reviewed JavaScript budget line and the new AutoInit fixture count. | Pending |
| V11 | R14 | After `npm run build:skill` as the last generation step, run `npm run check:generated` and `node --test tests/expressivecss-skill.test.js tests/expressivecss-version-resolution.test.js tests/expressivecss-component-decisions.test.js`. | Generated files are clean and the guide counts match. | Pending |
| V12 | R14, R15 | The repository's required CI checks on the pull request. | All pass. | Pending |

V2, V3, V5, V6 and V8 may run in jsdom with dispatched `beforeinput` and `input` events if that proves faster to write; V1, V4 and V7 need real browsers.

## Manual checks

These are not merge conditions.

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| M1 | R7 | On a desktop, type into an `aa-0000` field with a Japanese IME and with Chinese pinyin. | The field formats after each composition ends and never splits a composition. | Pending |
| M2 | R7 | On Android Chrome with Gboard, type into the phone field and into an `aa-0000` field. | The phone field formats as each digit is typed. Record when the letter field formats. | Pending |
| M3 | R8, R14 | With VoiceOver and NVDA, type into the phone field with a format hint in its supporting text. | The format hint is read with the field, and the formatted value is read back. | Pending |

## Merge conditions

- V1 passes in Chromium, Firefox and WebKit. It is the roadmap's completion check.
- V2 to V8 pass in all three engines, and V9 passes. The user made the composition test (V4) and the edge cases (V2, V3, V5 to V8) merge gates.
- V10 and V11 pass.
- The repository's required CI checks pass (V12), and the pull request is reviewed.
- A local `npm run verify` run is not required; CI stands in for it.
