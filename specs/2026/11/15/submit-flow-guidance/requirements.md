# Submit flow guidance: requirements

- Feature: the form (fieldsets) and text field guides tell agents how a form submits and how its fields are set up; the guidance stage closes with a rerun of all three prompts
- Date: 2026-11-15
- Roadmap phase: [Phase 82: guide the form submit flow](../../../../roadmap.md#phase-82-guide-the-form-submit-flow), in the milestone "apps that feel finished". It depends on [phase 78](../finished-app-baseline/), reuses the App behavior channel from [phase 79](../button-loading-guidance/), and closes the guidance stage, so it reruns every prompt. The [mission](../../../../mission.md#agreed-scope) puts app behavior in the component's guide.
- Branch: `feature/2026-11-15-milestone-apps-that-feel-finished`
- Base: the branch at `6334b1811`, after phase 81

## Current behavior and need

The text field guide (`## Text Inputs` in `llm.md`) covers markup, `.validate`, `data-error` and the label-above layout, where the placeholder can hold an example, but not how a form should submit. The `.error-summary` behavior (in `## Alert`) gathers errors on a `novalidate` submit. Phase 77's rubric flags a submit disabled before submission, Enter that can't submit, errors away from their field or focus left behind, blocked paste, a missing `name` or `autocomplete`, and a wrong `type` or `inputmode`. In the phase 78 baseline, `settings-form` run 2 showed a server error away from its field; phase 79's run 1 had an invalid `pattern`; phase 80's run 2 used `address-level2` on a city, state and ZIP field. Phase 77's review also found the guide's own text field examples have no `name` or `autocomplete`, so an app copied from them fails the rubric.

## Scope

- `### App behavior` in `## Text Inputs`, which every form with a text field reads: the submit flow (submit enabled until submission starts, a `<form>` with a submit button so Enter submits, `novalidate` plus `Forms.validateField` on submit so every error shows beside its field, then focus on the first invalid field, and server errors on their field) and the field setup (`name`, one `autocomplete` token per purpose, `type` and `inputmode`, spellcheck off for codes, emails and usernames, paste allowed, `pattern` valid under the `v` flag, placeholders).
- A one-line `### App behavior` in `## Fieldsets` that points to it.
- The Text Inputs examples gain `name`, `autocomplete` and, for the email field, `spellcheck="false"`; the label-above placeholder becomes an example ending in `…`; `docs/src/pages/text-inputs.astro` matches.
- A committed browser script, `scripts/finished-app-submit-empty.mjs`, that submits the settings form empty and checks the submit stays enabled and focus lands on the first invalid field, with a browser test.
- The stage rerun: all three prompts twice, reviewed with the baseline trees, each checked by its script.

## Exclusions

- Framework changes to forms or validation.
- Rubric changes, including the check 3 note about `aria-disabled` (phase 79's record); phase 83 ships a loading state that settles it.
- The buttons guide: its App behavior already covers the pending submit, and it sits on the basic-button reading path.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| The form-level text goes in the Text Inputs guide, with a pointer in Fieldsets | Decided from evidence (revised after spec review) | There is no forms guide. All four `destructive-list` add forms are `<form>`s with no fieldset, so their builders may never open `fieldsets.md`; every form with a text field reads `text-fields.md`. Neither guide is on the budgeted reading path. |
| The recommended pattern is `novalidate` plus `Forms.validateField` on submit, not native validation alone or the error summary | Decided from evidence (spec review) | Native validation shows one bubble on the first field only, and `.validate` marks fields on `change`, so an untouched required field never shows its `data-error` text on submit (`forms.ts`, `_input-fields.scss`). The error summary focuses itself and marks no field, so an app following it fails the rubric's focus rule and the completion check. That framework gap is recorded below as a follow-up. |
| Placeholders: `placeholder=" "` for a floating label, examples ending in `…` only in a label-above field or supporting text | Decided from evidence | `llm.md` says a floating label needs `placeholder=" "` and that a label-above field "can hold a real example". The rubric already passes the floating label's placeholder. |
| The completion check is a browser script | Decided from evidence | "Submitting the rebuilt settings form empty leaves the submit button enabled and moves focus to the first invalid field" is behavior a browser can observe directly. |
| The stage rerun uses each prompt's script | Decided from evidence | `destructive-list` and `filtered-dashboard` already have committed scripts (phases 80 and 81); the new one covers `settings-form`. |

## Requirements

- **R1** The Text Inputs section's `### App behavior` says: leave submit enabled until submission starts; put fields in a `<form>` with a submit button so Enter submits; mark required fields `required`; use `novalidate` and, on submit, call `Expressive.Forms.validateField` on each `.validate` field, which sets `aria-invalid` and shows its `data-error` text, then focus the first field with `aria-invalid="true"`; put a server error about one field into that field's `data-error` text with `aria-invalid="true"` and focus it; give every field a `name`; give a field for the user's own data the one `autocomplete` token for its purpose, splitting a field that asks for several; set `type` for the keyboard (never `type="number"` for phones, codes or card numbers) and `inputmode` where `type` doesn't bring it; turn spellcheck off for codes, emails and usernames; allow paste; check a `pattern` compiles with the `v` flag; keep `placeholder=" "` for a floating label and put examples ending in `…` in a label-above placeholder or supporting text. It stays under 2 KB.
- **R2** The Fieldsets section's `### App behavior` is one sentence pointing to the Text Inputs App behavior for the submit flow.
- **R3** The first Text Inputs example and the label-above example set `name` and `autocomplete`; the Input types email example adds `name`, `autocomplete` and `spellcheck="false"`; the label-above placeholder ends in `…`; `docs/src/pages/text-inputs.astro` shows the same; the text field guide's Syntax shows `name` and `autocomplete`.
- **R4** `tests/expressivecss-skill.test.js` checks the Text Inputs App behavior for `novalidate`, `validateField`, `aria-invalid`, `focus`, `required`, `autocomplete`, `spellcheck`, `inputmode`, `type="number"`, `…`, `placeholder=" "` and the `v` flag, its 2 KB cap, the Fieldsets pointer, and that the text field Syntax has `name=` and `autocomplete=`.
- **R5** `scripts/finished-app-submit-empty.mjs` runs in Chromium against an app. It takes the first visible form whose `form.elements` holds a submit button, runs `fill('')` on that form's visible, enabled, writable text-like inputs and textareas (selects, checks, radios, file, range and color inputs are left alone, as a person submitting empty would), fails with a reason if the submit is now `disabled` or `aria-disabled="true"`, clicks it, waits 300ms, and passes when the page didn't navigate, the submit is still enabled, and focus is on, or inside the `.field` of, the first field in `form.elements` order matching `:invalid` or `[aria-invalid="true"]`, with no page error. It fails with a reason when there is no such form, no field becomes invalid, or the page navigates. An npm script runs it, and a browser test runs it on four fixtures: native validation (pass), `novalidate` with a handler that sets `aria-invalid` and focuses (pass), a disabled submit (fail), and a handler that leaves focus on the button (fail).
- **R6** The stage rerun: each prompt is rebuilt twice under the procedure, recorded as `2026-11-15-guidance-stage` with apps, lens blocks, lint, `findings.json`, each app's script output and six rows, counting all four areas for all six apps against the baseline and phase 79 to 81 rows. `docs/agents/finished-app-evals.md` gains a Submit check section. The script also runs on the two baseline and two phase 79 `settings-form` apps, committed as `submit-check-baseline.jsonl`; they are expected to pass, so the check alone can't show a change. Both `settings-form` rebuilds pass the submit check; a failure inside this guidance's scope leads to a revision and a rebuild of both, up to two revisions, every attempt kept. The `destructive-list` and `filtered-dashboard` results are recorded, and a regression there becomes a note for the phase 84 stage, not a revision of this phase's text.
- **R7** CHANGELOG has an Unreleased entry; `npm run build:skill` runs last; verify and the MCP smoke test pass.

## Risks considered

- Two at once: a second Enter during a pending submit is the phase 79 guard.
- Bad input: the guidance covers paste, `pattern` and keyboards; the script empties fields as its bad input.
- Who must be refused: not applicable.
- Readers: the generated guides, `tests/semantics.test.js` and `docs-api.test.js` on `llm.md` examples, the published `llm.md`, the MCP Syntax for text fields (the example change shows there).
- Comparison fairness: reviews keep the baseline trees; every script is the committed version.
- UI states: the error state after an empty submit; a server error on one field, cleared on the next change by `validateField`.
- The error summary focuses itself and leaves fields unmarked, so its "keep each field's own error text" never shows; R1 leaves it out, and it is recorded below for a later framework phase.
- `.validate` runs on `change`, never on submit; R1's `validateField` call covers that.
- The prompt marks no field required; R1 tells agents to mark required fields, and the script fails with a reason if none becomes invalid.
- Drift between `llm.md` and `docs/src/pages/text-inputs.astro`: R3 updates both.

## Open follow-ups

- Framework: `.error-summary` could set `aria-invalid` and show each field's error text and focus the first invalid field, so an app using it meets the submit-flow rule. Not this milestone's scope; for the post-milestone roadmap.
- `specs/checklist.md`: the project has none.
