# Currency formatting in text fields

Date: 2026-10-25
Roadmap phase: Phase 39, currency formatting in text fields
Branch: `feature/2026-10-25-currency-input`
Base: `origin/master` at `c9ccd0808`, fetched 2026-10-25
Status: specified; not implemented

Follow the [mission's agreed scope for components](../../../../mission.md#agreed-scope) and its [product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 39](../../../../roadmap.md#phase-39-currency-formatting-in-text-fields). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The roadmap marks phases 1 to 37 complete. Phase 38, the pattern input mask, merged in #422 (`c9ccd0808`) but is not yet marked complete; a separate `docs(roadmap)` pull request will mark it and re-pin its `sourceRevision`, as #421 did for phases 35 to 37. Phase 39 is the next phase in the touch and input milestone and has no dependencies. No branch or spec directory holds currency work.

## Current behavior

These facts come from the base commit.

- A text field is a native `<input>` in a `.field` container (`llm.md`, "Text Inputs"). Nothing formats an amount. A `type="number"` field cannot show a currency sign or locale grouping.
- `InputMask` (`src/ts/components/inputMask.ts`) formats a field to a fixed slot pattern as people type, and the form submits the formatted text. Its slots cannot express a variable-length number with locale grouping, so this phase does not reuse its slot code. Its reset handling, a capture-phase `reset` listener on the document that formats a task later, is the precedent for R8.
- `Utils.locale(el)` in `src/ts/core/utils.ts` returns the nearest `lang` as a canonical locale, or undefined. The charts pass it to `Intl.NumberFormat` through `numberFormat()` in `src/ts/components/lineChart.ts`.
- `Forms.Init()` in `src/ts/behaviors/forms.ts` validates `.validate` fields from a bubbling `change` listener on the document, and its error summary reads `field.validationMessage`.
- `src/ts/components/registry.ts` lists what AutoInit starts and reads markup options from `data-<name>-options`, so a component named `CurrencyInput` reads `data-currency-input-options`.
- No source file listens for the `formdata` event. The [tech stack](../../../../tech-stack.md#framework-stack) lists it among the native features to use before script.

## Scope

A text input with a `data-currency` attribute shows its amount in the page's locale and that currency once it loses focus, shows a plain editable number while focused, and the form submits the plain number.

### Expected behavior

- **R1.** AutoInit starts a `CurrencyInput` component on every `input[data-currency]` of type `text` or with no type. The attribute holds an ISO 4217 code such as `EUR`. The locale comes from `Utils.locale(el)`, and without one the browser's default applies.
- **R2.** When the field loses focus, it shows its amount through `Intl.NumberFormat(locale, { style: 'currency', currency })`, rounded to the currency's fraction digits. Under `lang="de"` with `EUR`, typing `1234.5` shows `1.234,50 €`. By the time a page's `change` or `blur` listener runs, the field shows the formatted text.
- **R3.** When the field gains focus, it shows the amount as a plain number in the locale's decimal mark, without grouping or currency sign, and without trailing zeros: `1.234,50 €` becomes `1234,5`. The caret goes to the end.
- **R4.** Typed and pasted text reads as a number this way. Spaces, currency signs, letters and other characters besides digits, `.`, `,` and a leading `-` or `−` are ignored. The last `.` or `,` is the decimal mark when one to `maximumFractionDigits` digits follow it, for the field's currency; every other `.` or `,` groups digits. So `1234.5`, `1234,5`, `1.234,5` and `1,234.50` all read 1234.5. `1.234` reads 1234 for euros, because three digits follow. With yen, which has no fraction digits, every separator groups.
- **R5.** Text with no digit, other than an empty field, does not read as a number. The field keeps the text as typed, and the component sets a custom validity message, so the field fails `checkValidity()` and `.validate` shows the message. The default message is `Enter an amount.`, and `i18n.invalid` in the options replaces it. The next edit that reads as a number, or empties the field, clears it.
- **R6.** In the form data, the field's entry is the plain number as JavaScript writes it, rounded as the field shows it: `1234.5` for `1.234,50 €`, and an empty string for an empty field. A `formdata` listener on the field's form replaces the entry, so a submit and `new FormData(form)` read the same value, also when the form is submitted with Enter while the field still has focus. The field keeps its `name`. An entry for text that does not read as a number stays as typed.
- **R7.** A field with a value when the component starts shows it formatted, without firing `input` or `change`. That value reads with `Number()` first, the same format the form submits, so `value="1.234"` is 1.234 and not 1234. Text `Number()` rejects falls back to R4.
- **R8.** A form reset shows the field's default value formatted, read as in R7.
- **R9.** The instance's `value` getter returns the amount as a number, or `null` for an empty field or text that does not read as a number.
- **R10.** `semantics.json` gains a `currency-input` row whose rule flags `data-currency` on an input of any type other than `text`, on a `<textarea>`, and with an empty value. Semantics rules are CSS selectors, which cannot test for three ASCII letters, so R11 catches any other malformed code at runtime.
- **R11.** A currency code that `Intl.NumberFormat` rejects leaves the field alone: the component starts, adds no listeners, and the field behaves as a plain text input.
- **R12.** `destroy()` removes every listener, clears the custom validity message, and leaves the text as it is.
- **R13.** `llm.md` gains a "Currency input" section after "Input mask", with its own component guide, and a docs page documents the attribute, the parsing rules, the submitted value, the `value` getter and `i18n.invalid`, with a live example. The docs recommend `inputmode="decimal"` and a label that names the currency. The component decisions data, the changelog's Unreleased section and the hand-written web extensions review get entries, and `npm run build:skill` regenerates the derived files.
- **R14.** `tests/selective-builds.test.js` has a reviewed JavaScript gzip budget line for this change, and the capability `sourceRevision` pin names a commit on `master`.

### Exclusions

- Formatting while typing, such as live digit grouping. The roadmap asks for formatting on blur, and the user chose it.
- Moving the field's `name` onto a hidden input. The user chose the `formdata` rewrite, which leaves the author's markup alone.
- A currency picker, or several currencies in one field. The currency is fixed per field by `data-currency`.
- `currencyDisplay`, `notation` or other `Intl.NumberFormat` options beyond `style` and `currency`.
- `min`, `max` or `step` checks on the amount. Native range checks do not apply to text inputs; a page can check `value` itself.
- An `expressive:*` event or option callback. Native `input` and `change` already fire, and R9 gives the number.
- Formatting a value a script assigns through `el.value` while the field is not focused. The script can call `focus()` and `blur()`, or reset the form.
- Reusing InputMask's slot code, for the reason under current behavior. Combining `data-mask` and `data-currency` on one field is unsupported, and the docs say so.
- Manual checks with screen readers and mobile keypads. They are listed in validation.md and are not merge conditions.

## Decisions

### Confirmed with the user on 2026-10-25

- The phase is Phase 39, on `feature/2026-10-25-currency-input` from a freshly fetched `origin/master`.
- Marking Phase 38 complete and re-pinning its `sourceRevision` belong to a separate `docs(roadmap)` pull request, not this branch.
- The component is `CurrencyInput`, started by AutoInit on `input[data-currency]`, with the locale from `Utils.locale()`.
- The field formats on blur and shows the plain number on focus.
- The form gets the plain number through a `formdata` listener, and the field keeps its name.
- The last `.` or `,` is the decimal mark when no more than the currency's fraction digits follow it.
- Text that does not read as a number stays as typed, and the field reports itself invalid.
- The work splits into three groups: blur formatting and the form value with the roadmap's completion check; then focus editing and edge cases; then docs and checks.
- Merge conditions: the roadmap's completion check in Chromium, Firefox and WebKit, the parsing unit tests, the edge-case browser tests, and the repository's required CI checks. A local `npm run verify` run is not a merge condition.

### Proposed in this spec, open to review

- R7 reads a starting value with `Number()` before R4, because servers write amounts in that machine format and R4 alone would read `1.234` as 1234.
- R5's default message `Enter an amount.` and its `i18n.invalid` option, following the `i18n` option shape in Autocomplete and Datepicker.
- R9's `value` getter, so a page's `change` listener can read the number without parsing the formatted text.
- The submitted number comes from formatting the amount with `Intl.NumberFormat('en', { useGrouping: false, maximumFractionDigits })` and reading the result back. That rounds the same way as the displayed text, where `Number.prototype.toFixed` would round `1.005` down.
- R3 puts the caret at the end on focus. A click in the middle of `1.234,50 €` loses its position, because the text changes under it.

### Deferred

None.

### Implementation notes

- R10 originally also flagged a code that is not three ASCII letters. The semantics engine only takes selectors, so the rule flags an empty code and leaves the rest to R11; changed during group 1 on 2026-10-25.
- A separator after the last digit is dropped before R4 applies, because some currency symbols carry dots (`1.234,50 kr.` in Danish, `ج.م.` in Egyptian Arabic) and would otherwise read as the decimal mark.
- The parser maps the locale's own digits and decimal mark to Latin ones first, so a field under `lang="ar-EG"` reads back the Arabic-Indic digits Intl writes.
- On master, `tests/expressivecss-component-decisions.test.js` fails because `sourceRevision` names `35196509a`, which the #422 squash dropped. Group 3's re-pin (R14) fixes it on this branch.

## Technical constraints

- TypeScript follows `src/ts/README.md`. `components/` imports from `core/`, never the reverse. Reuse `Utils.locale()`.
- Listeners that last as long as the instance take `this._events.signal`. The `formdata` listener sits on the field's form, so it must also be removed by `destroy()`.
- Every new function stays below cyclomatic complexity 5 for the fallow pre-commit gate. A table of separator handling or small helpers keeps the parser under it.
- The component needs no stylesheet. If implementation adds Sass, it also needs a CSS budget line.
- Tests run against built bundles: `npm run build` before browser tests, one browser suite at a time.
- Run `npm run build:skill` after the last edit to `llm.md`, `CHANGELOG.md` or tests, because the contract hash covers them.
- No runtime dependency.

## Dependencies

- None from the roadmap. The component reuses `Utils.locale()`, the AutoInit registry and its markup options, InputMask's reset pattern, and the browser test helpers from `tests/input-mask-browser.test.js`.
