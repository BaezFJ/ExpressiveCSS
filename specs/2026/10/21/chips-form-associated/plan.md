# Plan: Chips as a form-associated element

Roadmap phase: Phase 24. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md). Implementation and validation follow in the same delegated run.

## 1. Browser tests for the new contract

Prerequisites: none.

- [ ] Move the reset, required and validity cases from `tests/chips-form.test.js` to `tests/chips-form-browser.test.js`, and keep the paste and filter-chip cases in jsdom.
- [ ] Add a `checkValidity()` read straight after `reset()`, the disabled-field page error case (asserting the page's own message), the submit-focus case, the error summary case, a named autocomplete field, a read-only field and an unnamed field.
- [ ] Change the `disabled` and `form` attribute steps of the existing browser test to wait a microtask, and keep the fieldset step synchronous.

Completion check: the new same-task and disabled-error cases fail against the base bundle. Covers R2 to R5, R8; V1 to V5.

## 2. The control element and the takeover

Prerequisites: group 1.

- [ ] In `src/ts/components/chips.ts`, define `expressive-chips-control` lazily, with `formAssociated`, the `form`, `labels`, `validity`, `validationMessage` and `willValidate` getters, `focus()` and `formResetCallback()`.
- [ ] On setup, wrap the named input in the control with `style.display = 'contents'`, append the control where the input used to be appended, insert chips before the control, move the name, set the form value and validity through `ElementInternals`, and copy `disabled`, `readonly` and `form` with a `MutationObserver`.
- [ ] Remove the `formdata` listeners, the reset deferral, the mount observer and the error-ownership tracking.
- [ ] On `destroy()`, move every child of the control out in its place and restore the input. Skip the takeover where `setFormValue` is missing.

Completion check: V1 to V7 pass. Covers R1 to R7, R9.

## 3. Error summary

Prerequisites: group 2.

- [ ] Confirm the summary lists the control and that its link focuses the input. Change `src/ts/behaviors/forms.ts` only if the check fails.

Completion check: V4 passes. Covers R8.

## 4. Docs, generated files and budgets

Prerequisites: groups 2 and 3.

- [ ] Update the form paragraph in `docs/src/pages/chips.astro` and `llm.md`, and add a changelog entry.
- [ ] Run `npm run build:semantics` and `npm run build:skill`.
- [ ] Record the JavaScript gzip size in `tests/selective-builds.test.js`. No CSS changes are planned.

Completion check: V8 and V9 pass. Covers R10.

## 5. Regression and contributor checks

Prerequisites: group 4.

- [ ] Run the Chips suites one file at a time, the fallow audit, then `npm run verify` and `npm run verify:packages` once.

Completion check: V10 passes. Covers R1 and R7.
