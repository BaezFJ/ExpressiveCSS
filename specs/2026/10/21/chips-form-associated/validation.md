# Validation: Chips as a form-associated element

Roadmap phase: Phase 24. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

The agent owns every check below and runs it during implementation. Tests run against built bundles, so build first with `npm run build:js` and `npm run build:css`. Browser tests skip an engine whose executable is missing, and a skipped engine does not count as a pass. Run suites one at a time.

## Specification review

Passed on 2026-10-21 after fixes. A read-only Plan subagent reviewed the three files against the constitution, `chips.ts`, `forms.ts`, `autocomplete.ts`, the Chips Sass, the Chips tests, `llm.md` and the docs page. Its confirmed findings were fixed in the spec:

- The constructor moves the input to the end of `.chips` after `_takeName()`, which would undo a wrap made there. The plan now appends the control in that step.
- The migration note covered only the attribute timing. It now names every visible change, and Known limits in requirements.md lists the error summary label, Questionnaire, `.validate` and two-bundle cases.
- V2 and V3 as first written passed on the base bundle. V2 now reads `checkValidity()` first, and V3 asserts the page's own message.
- The error summary needs the control's `labels`, and `readonly` needs copying. Both are now in R5, R8 and the plan.
- Missing checks were added: an unnamed field, an autocomplete field, `aria-required`, the input's place after `destroy()`, `verify:packages` and the fallow audit.

The Sass rule was replaced by an inline `display: contents` set through the CSSOM, following the reviewer's point that layout should not depend on the stylesheet. Two reviewer points were not adopted. A two-bundle version skew is listed as a known limit. jsdom keeps the no-takeover path, since jsdom is not a supported engine.

## Automated checks

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R5, R7 | The existing browser test "chips submit one value each…" in Chromium, Firefox and WebKit, plus an unnamed field. | Run `node --test tests/chips-form-browser.test.js`. | Values per chip; none for typed text; none with a disabled fieldset at once; none with a disabled input and moved to form `b` after a microtask; after `destroy()`, the input is the last child of `.chips`, no control is left and it submits its own text. The unnamed field has no control. | Passed 2026-10-21 in Chromium, Firefox and WebKit, none skipped (`node --test tests/chips-form-browser.test.js`, 21 cases). |
| V2 | R2 | A required field with one starting chip, emptied, in all three engines, including an emptied field whose reset is canceled; a named autocomplete field whose input value became a chip. | Call `form.reset()` and read `checkValidity()` first, then `getData()`, in the same task; cancel a second reset; click a reset button; reset the autocomplete field after deleting its chip. | Valid with the starting chip in the same task; the canceled reset leaves the chips; the button reset restores them; the autocomplete field gets its starting chip back. | Passed 2026-10-21 in all three engines. Against the base bundle, Chromium read `checkValidity()` as `false` straight after `reset()`. |
| V3 | R3, R4, R5, R7 | A required field in all three engines. | Check `aria-required`; type text with no chips and call `requestSubmit()`; set a page error on the disabled input, add and delete a chip, enable it; make the input `readonly`; destroy. | `aria-required="true"`; the submit is blocked, focus is on the input and `validity.valueMissing` is true on the control; after enabling, `input.validationMessage` is the page's own message; read-only is valid after a microtask; after `destroy()` the input has `required`, its name and its page error back, and no `aria-required` it did not have. | Passed 2026-10-21 in all three engines. Against the base Chips code, a Chromium probe of the same sequence (empty required field, disable, page error, add a chip, enable) read `input.validationMessage` as `""` and the form as valid, so the page error was lost. |
| V4 | R8 | A `novalidate` form with `.error-summary` and an empty required chips field with a `<label>`. | Submit, then click the summary link. | One summary item reads "label: `i18n.required`"; the click focuses the input. | Passed 2026-10-21 in all three engines with no change to `forms.ts`. |
| V5 | R6, R7 | Fields set up before joining a form, in a detached form, in a shadow-root form, and a named field with autocomplete. | Read the form data and reset; open the autocomplete and pick an option. | Each submits its chips and resets them; the picked option becomes a chip and submits. | Passed 2026-10-21 in all three engines. The field set up before joining a form, the detached form and the shadow-root form each reset to their starting chip. Against the base bundle, the shadow-root form submitted nothing until the field had been laid out. |
| V6 | R7, R9 | jsdom, where `ElementInternals.setFormValue` is missing. | Run `node --test tests/chips-form.test.js tests/chips.test.js`. | Paste and filter-chip cases pass; a named input keeps its name and `required` and nothing throws. | Passed 2026-10-21: chips-form 5, chips 22. |
| V7 | R7 | Existing suites that use Chips. | Run `node --test tests/menu-field-browser.test.js` and `node --test tests/forms-generated.test.js`. | All pass. | Passed 2026-10-21: menu-field-browser 135, forms-generated 24. Also run: error-summary-browser 3, questionnaire-browser 12. |
| V8 | R10 | Group 4 edits. | `npm run build:semantics`, `npm run build:skill`, `npm run check:generated`; read the docs, `llm.md` and changelog. | Generation is clean; no text still describes the two limits, reading values "at the moment the form gathers its data", or the "laid out … call `init` again" advice; the changelog has the migration note. | Passed 2026-10-21. `check:generated` is clean. The regenerated skill and MCP files change only the contract hash; the generated guides hold no Chips form text. The earlier unreleased "Chips submit a form value" changelog entry was rewritten to the new behavior after the final review found it stale. |
| V9 | R10 | A fresh build. | `node --test tests/selective-builds.test.js`. | Passes with a reviewed JavaScript budget line naming this change. | Passed 2026-10-21: JavaScript 89,508 gzip bytes (+38 over the base) after the review fixes; CSS unchanged at 84,516. |
| V10 | all | Whole repository. | The fallow audit from the pre-commit hook, `npm run verify`, `npm run verify:packages`, and `npm test --prefix mcp/expressivecss` after `npm ci --prefix mcp/expressivecss`. | The audit verdict is not `fail`; the rest pass, or failures are shown to be known flakes by a solo rerun. | Passed 2026-10-21. The fallow audit verdict is `pass`, with no complexity introduced. `npm run verify` ran 2,329 tests: 2,324 passed, 3 optional evaluation-SDK tests were skipped, and 2 failed under load ("oversized streams and guide sets…" in `expressivecss-codex-adapter`, and "natural runs receive ordinary requests…" in `expressivecss-natural-discovery`). Both files passed alone, 14 and 3 tests. The verify steps after the failure (`check:generated`, `docs:build:astro`, `docs:verify`) were then run separately and passed. `verify:packages` passed. `npm test --prefix mcp/expressivecss` failed once in a `nav-needs-label` truncation assertion while verify was running, and passed when run alone. |

The `checkValidity()`-after-`reset()` case in V2 and the page-message case in V3 should fail against the base bundle. Playwright cannot see the native validation bubble, so V3 checks focus and `validationMessage` instead.

## Manual checks

Not required for merge: a screen reader pass on an empty required field, to hear "required" on the input and the message after a blocked submit, and to learn whether the input is still announced as invalid. The input itself never fails validation now, and nothing sets `aria-invalid` on it.

## Merge conditions

- V1 to V10 pass, with no engine skipped in the browser checks.
- CI on the pull request passes. The PR is opened in the separate babysit-pr step.
- The code review step finds no unresolved confirmed defect.

## Final review

On 2026-10-21, after every check had run, a read-only Plan subagent traced R1 to R10 to the code and the evidence, and looked for scope creep and bugs in the new Chips code. It found nothing outside Phase 24 and no blocking defect. Its confirmed findings were fixed:

- The older unreleased changelog entry still described the `formdata` timing. It was rewritten, and the migration notes moved into the existing Changed entry.
- The V3 sequence did not reach the base limit. The test now starts from the chips' own message, and a probe of the base code shows the page error lost.
- V5 did not reset the field set up before joining a form, and V2 did not check validity after a canceled reset. Both were added.
- An empty `i18n.required` made `setValidity` throw. It now falls back to the default message, and V3 checks it.
- A field comment named `readonly` as copied. The comment was corrected.
- V8 misdescribed the regenerated files. It was corrected.

The finding that the input may no longer be announced as invalid is recorded under manual checks, since it needs a screen reader to confirm.

## Code review

On 2026-10-21 the code-review-and-quality pass reviewed the full diff against `origin/master`.

- Mutation experiments in Chromium: ignoring `readOnly`, not copying `disabled`, not wiring the reset, dropping the anchor, dropping the `focus()` override, dropping the `labels` getter, and unwrapping only the input. The first five each failed a test. The last two survived at first, so the error summary test now puts its label outside the field, and the autocomplete test checks that a listbox from a page-owned Autocomplete stays in the field after `destroy()`. After that every mutation failed a test.
- An ecc:typescript-reviewer subagent found no Critical or Required issue. Adopted from its optional findings: `setValidity` threw once page script moved the input out of the control, so the anchor is now passed only while the input is inside it. The control now has a `name` getter. Tests now cover a custom `i18n.required`, the moved input, and attribute changes after `destroy()`. A comment explains the double `init`. The docs say the input itself stays valid. Not adopted: a compile-time check tying `ChipsControl` to the class, and dropping the duplicate `setValidity` call at startup, which is harmless.
