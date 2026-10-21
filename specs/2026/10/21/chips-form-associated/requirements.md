# Chips as a form-associated element

Date: 2026-10-21
Roadmap phase: Phase 24, Chips as a form-associated element
Branch: `feature/2026-10-21-chips-form-associated`
Base: `origin/master` at `8d45c2c4`, created by T3 for this work on 2026-10-21
Status: specified 2026-10-21; implementation and validation follow in the same run

Follow the [mission's product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 24](../../../../roadmap.md#phase-24-chips-as-a-form-associated-element). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## How this spec was decided

The user ran the delegated workflow (feature-spec-auto) and named Phase 24 as the target. Other roadmap phases are being built in parallel, so the earliest-unfinished-phase rule does not apply. Phase 24 lists no dependency. Plan, requirements and validation below are agent decisions drawn from the constitution, the code at the base commit and a browser probe. Nobody has reviewed them yet.

Phase 14 (an Autocomplete create option, which may add chips) is in progress in another worktree. This phase stays inside Chips form handling so the two merge cleanly.

## Current behavior

These facts come from `src/ts/components/chips.ts` and its tests at the base commit.

- A named text input in an `allowUserInput` field gives up its `name`. The chips add one `id` each to the form data in the `formdata` event. One shared capture listener per window, root and form hears it, and a `ResizeObserver` notices a field that joins a form later.
- `required` moves off the input. The chips set the input's custom validity to `i18n.required` while the field is empty, and keep `aria-required="true"` on the input. Because the chips' message and a page's own error share the input's one custom validity, the code tracks which message is whose (`_ownsError`, `_stillOwnsError`, `_forgetClearedError`, and an `input` listener).
- A form reset is applied at the next microtask, or in a later task while the event is still dispatching, because a listener can cancel the reset until dispatch ends. `getData()`, `addChip()`, `deleteChip()` and the `formdata` handler apply a finished reset first (`_flushReset()`), but `checkValidity()` called straight after `reset()` still reads the old validity.
- A disabled input reports no validation message. If the page sets its own error while the field is disabled and the chips then change, the tracking loses the page's error, and the page has to set it again after enabling.
- The values follow the input's form, `form` attribute and `disabled` state at the moment the form gathers its data.
- `llm.md` and `docs/src/pages/chips.astro` document both limits.

The roadmap's two documented limits come from the `formdata` design, and a form-associated custom element removes them: the browser calls `formResetCallback` only for a reset nobody canceled, in the same task, and `ElementInternals` keeps the chips' validity apart from the input's.

## Decisions

### From project evidence

- Custom elements are allowed. `tech-stack.md` prefers native platform features, has no runtime dependencies, and does not rule out custom elements. Form-associated custom elements (`static formAssociated`, `attachInternals()`, `setFormValue`, `setValidity`, `formResetCallback`) ship in the last five Chrome and Firefox versions, the `browserslist` range, and in current WebKit, which `tech-stack.md` covers through the tests.
- jsdom 30 has `attachInternals()` but no `setFormValue` or `setValidity` (checked 2026-10-21). jsdom cannot run the form tests, so they move to Playwright.
- A browser probe on 2026-10-21 confirmed in Chromium, Firefox and WebKit that `setFormValue(formData)` submits several entries under one name. It also confirmed that `setValidity` accepts the light-DOM input as anchor when the input is a child, that a disabled fieldset drops the value and the validity natively, that `formResetCallback` runs in the same task for an uncanceled reset and not for a canceled one, and that a detached form owns and resets the element.
- The project's own names use `expressive`: the `Expressive` global, `expressive:*` events and the `Expressive_Chips` instance property. Material Web registers `md-*` elements such as `md-chip-set`, so an `md-` name could collide on a page that loads both.

### Agent decisions under delegation

- The element is `expressive-chips-control`. `expressive-` follows the project's names above. `-control` says what it is: the form control the form sees. The `.chips` container stays the component root, and `expressive-chips` is left free for a future author-written element. This is the framework's first custom element; `tech-stack.md` does not name a prefix yet, so the post-merge docs PR should record `expressive-` there.
- Authors keep the markup they write today. On `init`, Chips wraps a named text input in the control, moves the name onto the control and drops `required` from the input. The constructor already moves the input to the end of `.chips`; it now moves the control, with the input inside, there instead, and chips are inserted before the control. Chips sets the control's `style.display` to `contents` through the CSSOM, which a CSP allows, so the layout does not depend on a stylesheet and the input still lays out as a flex item of `.chips`. The shipped Chips selectors are descendant selectors and still match. Autocomplete and its menu append their nodes to the input's parent, which is now the control; with `display: contents` they lay out as before. `destroy()` moves every child of the control back out in its place, so the input ends where `init` put it, and gives back its name, `required` and `aria-required`. The wrapper is required: `setValidity` only accepts an anchor inside the element, and without the anchor the browser cannot focus the input or show the message there.
- The control is registered once, the first time a named field is set up, and only if the name is not already defined, so two copies of the bundle on one page share it. Defining it lazily keeps `HTMLElement` out of module scope, so importing a bundle without a DOM still works.
- Where form-associated custom elements are missing (jsdom), a named input keeps its name and `required`, and submits its own text, as before Chips handled forms. No `formdata` fallback is kept.
- The input's `disabled`, `readonly` and `form` attributes are copied to the control by a `MutationObserver`, so script changes reach the form at the next microtask. A disabled `fieldset` works natively, at once. A read-only field is not required, as a read-only input is barred from validation. Until now the chips read the input's state as the form gathered its data, in the same task.
- The control exposes `form`, `labels` (the input's), `validity`, `validationMessage` and `willValidate`, and `focus()` passes focus to the input. Generic form code that walks `form.elements`, such as the error summary, reads it like a field.
- The changelog gets a migration note for every visible change: the input sits inside `expressive-chips-control`, so `.chips > input` selectors and `input.parentElement` change; the input's `validity`, `validationMessage`, `:invalid` and `invalid` event no longer carry the required state, which is on the control and the form; `form.elements[name]` is the control; and `disabled`, `readonly` and `form` changes on the input apply at the next microtask.
- Restoring the chips after back-forward navigation (`formStateRestoreCallback`) stays out of scope. Nothing restores them today.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | A named `allowUserInput` field submits one entry per chip `id` under the input's name, and nothing for half-typed text. `new FormData(form)` shows each chip change at once. Unnamed fields and static filter chips are unchanged. |
| R2 | `form.reset()` and a reset button put back the starting chips (including a chip the input's value became) and their validity within the reset, so `checkValidity()` and `getData()` in the same task see the reset state. A canceled reset changes nothing. |
| R3 | A required field is invalid with `valueMissing` and `i18n.required` while it has no chips, whatever is typed. A submit focuses the input and shows the message there. The input keeps `aria-required="true"`. |
| R4 | The chips' required validity is independent of the input's own custom validity. A page error on the input is never replaced or cleared by the chips. A page error set while the field is disabled still applies after enabling, without being set again. |
| R5 | A disabled ancestor `fieldset` drops the values and the validity at once. Setting the input's `disabled` or `form` attribute does the same, or moves the values to that form, by the next microtask. A `readonly` input keeps the values and drops the required validity by then. |
| R6 | Fields set up before joining a form, in a detached form or in a shadow-root form submit and reset with no extra listener. |
| R7 | Existing markup, options, methods, events and exports keep working, including a named field with autocomplete. `destroy()` leaves the input at the end of `.chips`, where `init` moves it, with its name, `required` and `aria-required`, any page error intact, and no control left. |
| R8 | In a `novalidate` form with `.error-summary`, an empty required chips field is listed with its label and message, and its link focuses the input. |
| R9 | Without form-associated custom element support, a named input keeps its name and `required` and nothing throws. |
| R10 | The Chips docs, `llm.md` and the changelog describe the new behavior and drop the two limits. Generated guidance is regenerated, and the gzip budgets are reviewed. |

## Known limits accepted under delegation

- A field named only by the input's `aria-label` shows the message without a label in the error summary, since the control has no name of its own.
- Questionnaire reads native controls only, so a required chips field inside a questionnaire step does not block Next.
- `.validate` on a chips input no longer marks an empty required field invalid, because the input itself is valid.
- When two bundle copies run on one page, the first registers the control and the second uses that class.

## Exclusions

- Restoring chips on back-forward navigation or autofill.
- Autocomplete behavior, including Phase 14's create option.
- A custom element that authors write themselves.
- Changes to `specs/roadmap.md`, `mission.md` or `tech-stack.md`; the post-merge docs PR handles those.

## Constraints

- New functions stay below cyclomatic complexity 5 for the fallow gate.
- Bundle changes record their gzip size in `tests/selective-builds.test.js`.
- The `capabilityReview` pin for `chips.ts` was already stale at the base (`ef36c69c…` pinned, `66fbd5c5…` at HEAD), so it is left alone.
