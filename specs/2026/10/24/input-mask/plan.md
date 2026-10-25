# Plan: pattern input mask

Roadmap phase: Phase 38, pattern input mask. Branch `feature/2026-10-24-input-mask` from `origin/master` at `953343153`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order, and each ends in a state that can be committed. Budget lines go into whichever group first changes a bundle's size, because `tests/selective-builds.test.js` fails without them. A registered component also needs its `semantics.json` coverage and AutoInit fixture in the first group, because the semantics roster and AutoInit tests fail without them.

## 1. Typing and paste format the field

Outcome: typing or pasting digits into an `input[data-mask]` shows the pattern, puts the caret after the last digit, and the form data holds the formatted value.

Prerequisites: none.

- [x] Write V1 in a new `tests/input-mask-browser.test.js`, with real keyboard typing and a clipboard paste in Chromium, Firefox and WebKit. Run `npm run build` and the file, and confirm V1 fails.
- [x] Add `src/ts/components/inputMask.ts`: parse the mask into slots and literals, format on a capture-phase `input` listener, place the caret, and format a prefilled value on start. Export it from `components/index.ts` and register it in `components/registry.ts` with the `input[data-mask]` selector.
- [x] Add the `input-mask` row and its type rule to `semantics.json`, the `tests/fixtures.js` entry and the `AUTO_INIT_FIXTURES.length` count in `tests/autoinit.test.js`, and write V9 in `tests/semantics.test.js`. The semantics roster takes a row with no Sass partial through the `additional` list, where `character-counter` also sits. Run `npm run build:semantics`.
- [x] Add `InputMask` to both registry tables in `llm.md` and to `docs/src/pages/auto-init.astro`, and run `npm run build:skill`.
- [x] Rebuild and rerun until V1 passes in all three engines. Add the reviewed JavaScript budget line.

Completion check: V1 passes in Chromium, Firefox and WebKit, and `node --test tests/selective-builds.test.js tests/autoinit.test.js` passes.

Covers: R1, R2, R3, R4, R5, R8, R10, R12, R15; V1, V9, V10.

## 2. IME and edge cases

Outcome: composition, deletion across literals, mid-value edits, reset, Keypad input and `destroy()` behave as the requirements say.

Prerequisites: group 1.

- [ ] Add V2 to V8 and record which fail.
- [ ] Skip `input` events while composing, using `Utils.isComposing()` or a flag set between `compositionstart` and `compositionend`, and format once when the composition ends, in either event order. Normalize text with NFKC before matching.
- [ ] Handle Backspace and Delete next to a literal, and selection deletes, in a `beforeinput` listener.
- [ ] Format the default value after a form reset, and make `destroy()` remove every listener.
- [ ] Record what each engine does to undo history after a formatted edit, for the docs.
- [ ] Rebuild and rerun until V1 to V9 pass in all three engines. Update the budget line.

Completion check: V1 to V9 pass in Chromium, Firefox and WebKit.

Covers: R3, R5, R6, R7, R9, R11, R13, R15; V2 to V8.

## 3. Docs, generated files and checks

Outcome: the component is documented, the pin and generated files are current, and CI can pass.

Prerequisites: group 2.

- [ ] Add an "Input mask" section after Text Inputs in `llm.md`, the types export in `modular.ts`, and a docs page with a live example, added to the docs catalogue. Cover the syntax, the submitted value, `inputmode="numeric"`, format hints in supporting text, `dir="ltr"` in right-to-left pages, IME timing and the undo findings.
- [ ] Add the component to `docs/src/data/component-decisions.json` with its capability entry, and re-pin `sourceRevision` to a commit on `master`.
- [ ] Add an entry to `skills/expressivecss/expressivecss-design/references/web-extensions-review.md`, and an Added entry to the Unreleased section of `CHANGELOG.md`.
- [ ] Update the hardcoded guide counts in `tests/expressivecss-skill.test.js`, `tests/expressivecss-version-resolution.test.js` and `tests/expressivecss-component-decisions.test.js`, and the reading budget if it grows.
- [ ] Run `npm run build`, confirm the budget line, then run `npm run build:skill` as the last generation step and `npm run check:generated`.
- [ ] Record each result in validation.md.

Completion check: `npm run check:generated` is clean, V10 and V11 pass, V12 runs on the pull request, and every check in validation.md shows a result.

Covers: R14, R15; V10, V11, V12.
