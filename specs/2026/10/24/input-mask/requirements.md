# Pattern input mask

Date: 2026-10-24
Roadmap phase: Phase 38, pattern input mask
Branch: `feature/2026-10-24-input-mask`
Base: `origin/master` at `953343153`, fetched 2026-10-24
Status: implemented 2026-10-25; merged as #422

Follow the [mission's agreed scope for components](../../../../mission.md#agreed-scope) and its [product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 38](../../../../roadmap.md#phase-38-pattern-input-mask). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The roadmap marks phases 1 to 37 complete, the last three in #421 (`953343153`). Phase 38 is the next phase in the touch and input milestone and has no dependencies. No branch, worktree or spec directory holds mask work. Phase 39, currency formatting, may share code with this phase, so it waits for this one.

## Current behavior

These facts come from the base commit.

- A text field is a native `<input>` in a `.field` container (`llm.md`, "Text Inputs"). Nothing formats what a person types. The `pattern` attribute only validates, and `Forms.Init()` in `src/ts/behaviors/forms.ts` validates `.validate` fields on `change`.
- `Utils.isComposing()` and `Utils.ignoringComposition()` in `src/ts/core/utils.ts` keep keydown handlers in Autocomplete, Datepicker, Timepicker, Chips and the app bar from acting on IME keys. Nothing guards an `input` handler against composition yet.
- Keypad edits a field by script and then dispatches a bubbling `InputEvent('input')` with an `inputType` (`src/ts/components/keypad.ts:302`), so an `input` listener on the field sees keypad keys as typing.
- CharacterCounter is the nearest precedent for a component that attaches to a field the author already wrote: it reads an attribute on the input and listens to its `input` event. It stays out of AutoInit.
- `src/ts/components/registry.ts` lists what AutoInit starts, and reads markup options from `data-<name>-options`, so a component named `InputMask` reads `data-input-mask-options`.

## Scope

A text input with a `data-mask` attribute formats typed, pasted and composed characters to that pattern as people enter them, and the form submits the formatted text.

### Expected behavior

- **R1.** AutoInit starts an `InputMask` component on every `input[data-mask]`. As a person types, each accepted character fills the next slot of the mask, and the mask inserts its literals between filled slots. The value holds the leading literals once the first slot fills, then each literal that sits before a filled slot, and no trailing literals: typing `555` into `(000) 000-0000` shows `(555`, and typing `5551` shows `(555) 1`.
- **R2.** In the mask, `0` is a slot for a digit, `a` a slot for a letter, and `*` a slot for a letter or a digit. A backslash makes the next character a literal, so `\0` is a literal zero. Every other character is a literal. Letters are Unicode letters (`\p{L}`) and digits are 0 to 9.
- **R3.** A character that does not fit the next slot is dropped, and so is any character past the last slot. A typed character that equals the next literal is dropped too, because the mask inserts that literal itself once the next slot fills.
- **R4.** Pasted, dropped and autofilled text runs through the mask from the caret: characters that fit fill slots in order, and literals and rejected characters are skipped. Pasting `555.123.4567` or `(555) 123 4567` into an empty phone field shows `(555) 123-4567`.
- **R5.** After every edit the caret sits right after the last character that edit inserted, also when the edit happened in the middle of the value. After a delete, the caret sits right after the slot character that came before the deleted text.
- **R6.** Backspace with the caret right after a literal deletes the slot character before that literal. Delete with the caret right before a literal deletes the slot character after it. Deleting a selection removes the slot characters in it, and the characters after it move back into the freed slots.
- **R7.** While an IME composes, the field is left as the IME writes it. Once the composition ends, the field formats once, with the caret after the composed text, whichever order the engine fires `compositionend` and the last `input` event in.
- **R8.** The form submits the formatted value, exactly as the field shows it, and `new FormData(form)` reads the same text. Native `pattern`, `required`, `minlength` and `maxlength` checks run against the formatted value.
- **R9.** A field that holds a value when the component starts shows it formatted, without firing `input` or `change`. A form reset shows the field's default value formatted.
- **R10.** The component formats in a capture-phase `input` listener on the field, so a page's `input` listener on the field, its form or the document reads the formatted value.
- **R11.** Keys typed through a Keypad into a masked field format the same way as typing.
- **R12.** The mask runs on inputs of type `text`, `tel`, `search`, `url` and `password`, which support caret placement. `semantics.json` gains an `input-mask` row with a rule that flags `data-mask` on any other input type or on a `<textarea>`.
- **R13.** `destroy()` removes every listener and leaves the current value as it is. Typing afterward is not formatted.
- **R14.** `llm.md` gains an "Input mask" section after Text Inputs as its own component guide, and a docs page documents the attribute, the mask syntax, the submitted value and the IME behavior with a live example. The docs recommend `inputmode="numeric"` for digit-only masks and supporting text that shows the expected format. The component decisions data, the changelog's Unreleased section and the hand-written web extensions review get entries, and `npm run build:skill` regenerates the derived files.
- **R15.** `tests/selective-builds.test.js` has a reviewed JavaScript gzip budget line for this change, and the capability `sourceRevision` pin names a commit on `master`.

### Exclusions

- Submitting the raw, unformatted characters, through a `formdata` rewrite or an opt-in attribute. The user chose the formatted value.
- Formatting a value a script assigns through `el.value` with no `input` event. The script can dispatch one, as Keypad does.
- Keypad's Backspace key next to a literal. Keypad edits by script and fires no `beforeinput`, so R6 does not reach it; implementation records what happens.
- A placeholder that draws the unfilled mask, such as `(___) ___-____`.
- A completion event or option callback. A page can check the field's `pattern` validity on `input`.
- Masks that change with the value, such as card numbers whose grouping depends on the card type, and numeric or currency masks, which belong to Phase 39.
- Keeping native undo history across a formatted edit. Assigning `value` from script clears it in some engines; implementation records what each engine does.
- Manual checks with real IMEs, Android keyboards and screen readers. They are listed in validation.md and are not merge conditions.

## Decisions

### Confirmed with the user on 2026-10-24

- The phase is Phase 38, on a branch from a freshly fetched `origin/master`.
- The form receives the formatted value, as the field shows it.
- The component is `InputMask`, started by AutoInit on a text input with `data-mask`. The mask syntax is `0` for a digit, `a` for a letter, `*` for either, and every other character a literal the mask inserts.
- While an IME composes, `input` events leave the field alone, and the field formats once on `compositionend`.
- The work splits into three groups: typing and paste with the acceptance test; then IME and edge cases; then docs and checks.
- Merge conditions: the composition test and the edge-case checks are merge gates, along with the roadmap's completion check and the repository's required CI checks. The user did not pick the acceptance-test option in the interview, but V1 is the roadmap's completion check for this phase, so it stays a merge condition. A local `npm run verify` run is not a merge condition.

### Proposed in this spec, built as written on 2026-10-25, open to review

- The backslash escape in R2. A mask such as `\07000 000000` needs a literal zero, and the escape costs one branch.
- Typed and pasted text is normalized with `String.prototype.normalize('NFKC')` before matching, so full-width digits from a Japanese or Chinese IME fill digit slots.
- Deletion across a literal (R6) runs in a `beforeinput` listener, which all three engines support, because an `input` handler cannot tell a deleted literal from an unchanged value.
- The docs suggest `dir="ltr"` on phone and card fields in right-to-left pages, since those numbers read left to right.

### Deferred

None.

### Risk to record

Android keyboards such as Gboard can report ordinary typing as composition. With R7, a letter mask on Android may format only when a word ends. A digit mask with `inputmode="numeric"` opens a keypad that does not compose. The manual check M2 in validation.md covers this.

### Implementation notes

- The `sourceRevision` pin in `docs/src/data/component-decisions.json` names this branch's group 2 commit `35196509a`, because no commit on `master` holds `inputMask.ts`. A squash merge drops that commit, so a follow-up must re-pin to the merge commit.
- AutoInit's selector lists the caret-bearing input types itself, because `setSelectionRange()` throws on the others. The semantics rule flags the same markup.
- A literal is matched only when it is the next token. Otherwise the `1` typed first into `+1 (000)` would be taken for the literal instead of a digit.
- Undo, as recorded for the docs: after a formatted edit, Control+Z changes nothing in Chromium, Firefox or WebKit.

## Technical constraints

- TypeScript follows `src/ts/README.md`. `components/` imports from `core/`, never the reverse. Reuse `Utils.isComposing()` for the composition check.
- Listeners that last as long as the instance take `this._events.signal`.
- Every new function stays below cyclomatic complexity 5 for the fallow pre-commit gate; table-driven slot matching keeps the branches down.
- The mask needs no stylesheet. If implementation adds Sass, it also needs a CSS budget line.
- Tests run against built bundles: `npm run build` before browser tests, one browser suite at a time.
- Run `npm run build:skill` after the last edit to `llm.md`, `CHANGELOG.md` or tests, because the contract hash covers them.
- No runtime dependency.

## Dependencies

- None from the roadmap. The component reuses `Utils.isComposing()`, the AutoInit registry and its markup options, and the browser test helpers from earlier input phases.
- Phase 39 may reuse the slot logic. That choice belongs to its own spec.
