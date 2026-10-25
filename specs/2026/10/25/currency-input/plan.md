# Plan: currency formatting in text fields

Roadmap phase: Phase 39, currency formatting in text fields. Branch `feature/2026-10-25-currency-input` from `origin/master` at `c9ccd0808`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order, and each ends in a state that can be committed. Budget lines go into whichever group first changes a bundle's size, because `tests/selective-builds.test.js` fails without them. A registered component also needs its `semantics.json` row and AutoInit fixture in the first group, because the semantics roster and AutoInit tests fail without them.

## 1. Blur formatting and the form value

Outcome: under `lang="de"` with euros, typing `1234.5` and leaving the field shows `1.234,50 €`, and the form data holds `1234.5`.

Prerequisites: none.

- [x] Write V1 in a new `tests/currency-input-browser.test.js`, with real keyboard typing in Chromium, Firefox and WebKit, reusing the helpers in `tests/input-mask-browser.test.js`. Run `npm run build` and the file, and confirm V1 fails.
- [x] Add `src/ts/components/currencyInput.ts`: read the currency and `Utils.locale()`, parse text as R4 describes, format on blur, format a starting value on start, and replace the entry in a `formdata` listener on the form. Leave the field alone when `Intl.NumberFormat` rejects the code. Export it from `components/index.ts` and register it in `components/registry.ts` with a selector for text inputs with `data-currency`.
- [x] Write the parsing checks V2 in a new `tests/currency-input.test.js` (jsdom), driving the component through its `value` getter.
- [x] Add the `currency-input` row and its rule to `semantics.json`, through the roster's `additional` list as `input-mask` does, the `tests/fixtures.js` entry and the `AUTO_INIT_FIXTURES.length` count in `tests/autoinit.test.js`, and write V8 in `tests/semantics.test.js`. Run `npm run build:semantics`.
- [x] Add `CurrencyInput` to both registry tables in `llm.md` and to `docs/src/pages/auto-init.astro`, and run `npm run build:skill`.
- [x] Rebuild and rerun until V1 and V2 pass. Add the reviewed JavaScript budget line.

Completion check: V1 passes in Chromium, Firefox and WebKit, V2 passes, and `node --test tests/selective-builds.test.js tests/autoinit.test.js` passes.

Covers: R1, R2, R4, R6, R7, R9, R10, R11, R14; V1, V2, V8, V9.

## 2. Focus editing and edge cases

Outcome: focus, paste, invalid text, Enter submit, reset and `destroy()` behave as the requirements say.

Prerequisites: group 1.

- [x] Add V3 to V7 and record which fail.
- [x] Show the plain number on focus with the caret at the end, and make sure page `change` and `blur` listeners read the formatted text.
- [x] Set and clear the custom validity message, with the `i18n.invalid` option.
- [x] Format the default value after a form reset, following InputMask's reset handling, and make `destroy()` remove every listener, including the one on the form, and clear the validity message.
- [x] Rebuild and rerun until V1 to V8 pass in all three engines. Update the budget line.

Completion check: V1 to V8 pass in Chromium, Firefox and WebKit.

Covers: R3, R5, R6, R8, R12, R14; V3 to V7.

## 3. Docs, generated files and checks

Outcome: the component is documented, the pin and generated files are current, and CI can pass.

Prerequisites: group 2.

- [ ] Add a "Currency input" section after "Input mask" in `llm.md`, the types export in `modular.ts`, and a docs page with a live example, added to the docs catalogue and `docs/src/data/nav.ts`. Cover the attribute, the parsing rules, the submitted value, the `value` getter, `i18n.invalid`, `inputmode="decimal"`, a label that names the currency, and that `data-mask` and `data-currency` do not combine.
- [ ] Add the component to `docs/src/data/component-decisions.json` with its capability entry, and pin `sourceRevision` to a commit on `master`.
- [ ] Add an entry to `skills/expressivecss/expressivecss-design/references/web-extensions-review.md`, and an Added entry to the Unreleased section of `CHANGELOG.md`.
- [ ] Update the hardcoded guide counts in `tests/expressivecss-skill.test.js`, `tests/expressivecss-version-resolution.test.js` and `tests/expressivecss-component-decisions.test.js`, and the reading budget if it grows.
- [ ] Run `npm run build`, confirm the budget line, then run `npm run build:skill` as the last generation step and `npm run check:generated`.
- [ ] Record each result in validation.md.

Completion check: `npm run check:generated` is clean, V9 and V10 pass, V11 runs on the pull request, and every check in validation.md shows a result.

Covers: R13, R14; V9, V10, V11.
