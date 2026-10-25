# Promise-based confirm dialog

Date: 2026-10-25
Roadmap phase: Phase 43, promise-based confirm dialog
Branch: `feature/2026-10-25-confirm-dialog`
Base: `origin/master` at `a9bbf77ad9edd0f44ce584e71f07a485fe6f2933` (#425)
Status: specified 2026-10-25; not implemented

Follow the [mission's agreed scope for components and behaviors](../../../../mission.md#agreed-scope), the [framework stack and constraints](../../../../tech-stack.md#framework-stack) and [roadmap Phase 43](../../../../roadmap.md#phase-43-promise-based-confirm-dialog). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The user picked Phase 43. Phases 42 to 51 are being specified in parallel threads, so this spec covers Phase 43 only and skips the earliest-unfinished-phase pick. The roadmap lists no dependencies for it. This spec leaves the roadmap's completion state unchanged.

## Current behavior

These facts come from the base commit.

- Dialogs are native `<dialog>` elements styled from markup. `llm.md` says there is no `Modal` export and nothing for `AutoInit()` to start. Authors open them with `showModal()` and close them with `close()` or a `<form method="dialog">`, which sets `returnValue` from the pressed button's `value`.
- `src/ts/behaviors/dialogs.ts` holds `Dialogs`, a document-level behavior whose `Init()` adds light dismiss: a press that starts and ends on the scrim calls `dialog.close()`. Authors opt out with `closedby="none"` or `closedby="closerequest"`. The root bundle calls `Dialogs.Init()` on import, and `modular.ts` exports `Dialogs`.
- A script that wants a yes-or-no answer today writes its own `<dialog>`, listens for `close`, reads `returnValue` and handles Escape itself, or calls `window.confirm()`, which is not styled and blocks the page.
- Behaviors keep their default strings in a static `i18n` object: `Copy.i18n = { copied, failed }` and `Tour.i18n = { progress }`. Authors replace them through `Expressive.Copy.i18n` and `Expressive.Tour.i18n`.
- `semantics.json` has a `dialog-is-named` rule: every `<dialog>` needs `aria-labelledby` or `aria-label`.
- jsdom has no `showModal()`, so `tests/dialogs.test.js` opens dialogs with the `open` attribute and stubs the box.

## Scope

### Requirements

- R1. `Dialogs.confirm(options)` opens an M3 basic dialog with `showModal()` and returns a `Promise<boolean>`. The options are `text` (the question, required), `headline` (optional), `confirm` and `cancel` (optional button labels). The bundle exposes it as `Expressive.Dialogs.confirm`, and the modular entry exposes it on the exported `Dialogs` without calling `Dialogs.Init()`.
- R2. The promise resolves `true` when the person activates the confirm button. It resolves `false` on the cancel button, on Escape, and on a scrim tap that the light-dismiss behavior turns into `close()`. It never rejects for a person's answer.
- R3. The dialog follows the existing dialog markup: a `<dialog role="alertdialog">` with an optional heading, a `<p>` holding the text, and a last-child `<form method="dialog">` with a text-style cancel button followed by the confirm button. It gets no new CSS.
- R4. The dialog is named and described. With a headline, `aria-labelledby` points at the heading and `aria-describedby` at the text. Without one, `aria-labelledby` points at the text. The generated markup passes the `dialog-is-named` rule.
- R5. Focus starts on the cancel button, the less destructive action, as the ARIA alertdialog pattern advises. When the dialog closes by any path, focus returns to the element that had focus before `confirm()` was called, if that element is still connected.
- R6. The headline, text and labels are set as text, never parsed as HTML.
- R7. `Dialogs.i18n = { confirm: 'OK', cancel: 'Cancel' }` holds the default button labels. Per-call `confirm` and `cancel` options override them for one dialog. Assigning to `Expressive.Dialogs.i18n` changes them for every later call.
- R8. The dialog element is removed from the document after it closes, and its listeners go with it. Two calls in a row open two independent dialogs, each resolving its own promise.
- R9. The dialogs docs page and the Dialogs section of `llm.md` document `Dialogs.confirm()`, its options, the resolve values, focus behavior and `Dialogs.i18n`. The docs advise a specific confirm verb such as "Delete" over the "OK" default. The changelog has an Added entry.
- R10. The JavaScript bundle's new gzip size is recorded in a reviewed budget line in `tests/selective-builds.test.js`, and the generated skill and MCP copies are current. These are framework constraints in `tech-stack.md`, so they hold even though the interview did not pick them as acceptance checks.

### Exclusions

- Opening an author's own `<dialog>` from markup through `confirm()`. The interview chose the generated dialog only. Authors who need custom content keep writing a `<dialog>` with `<form method="dialog">`.
- `alert()` and `prompt()` equivalents.
- An AutoInit entry, a new component class, a new export, or a custom element.
- A per-call option to turn light dismiss off. A scrim tap counts as cancel.
- Rejecting or aborting the promise from script, such as through an `AbortSignal`.

## Decisions

### Confirmed in the interview on 2026-10-25

- API shape: a static `Dialogs.confirm()` on the existing behavior builds a temporary `<dialog role="alertdialog">`, resolves `true` on confirm and `false` on cancel, Escape or scrim tap, then removes it. No new export and no AutoInit entry.
- Initial focus on the cancel button.
- The roadmap's open question, the `i18n` defaults for the button labels: `Dialogs.i18n = { confirm: 'OK', cancel: 'Cancel' }`, following `Copy.i18n`. "OK" and "Cancel" match `window.confirm()`. Per-call labels override them, and the docs point authors to specific verbs.
- Work order: a three-engine probe of native focus return and Escape first, then the method with jsdom tests, then browser tests, then docs and generated files.
- Merge requires the three-engine browser test, jsdom unit tests, and a mutation check showing each new case fails without the change.

### Proposals for implementation

These follow from the code and can change during implementation if the code or the probe disagrees.

- Resolve from the `close` event: `true` only when `dialog.returnValue` equals the confirm button's `value`. Set `returnValue` to an empty string before `showModal()`, so Escape and light dismiss, which leave it unchanged, resolve `false`.
- Append the dialog to `document.body`, and give the heading and text ids from a counter so two open dialogs never share one.
- No focus fallback. The probe on 2026-10-25 found that every engine returns focus to the opener on every close path, so R5 rests on the native dialog closing steps.
- Keep each new function below cyclomatic complexity 5 for the fallow gate, for example by building the markup in one helper and wiring the close handler in another.
- Update the `dialog` entry's note in `semantics.json` to mention the generated confirm dialog, if the semantics roster or guide tests need it. Then run `npm run build:semantics`.

### Open decisions

None.

## Technical constraints

- Native `<dialog>` and `showModal()` handle the top layer, the scrim, inert background and Escape, as `tech-stack.md` asks for native features first.
- `role="alertdialog"` on a `<dialog>` keeps the native modal behavior and tells assistive technology the dialog needs an answer.
- `Dialogs.Init()` registers light dismiss on the document. With the modular entry and no `Init()` call, a scrim tap does nothing and the dialog stays open until a button or Escape closes it. The docs say so.
- jsdom has no `showModal()` or `close()` focus behavior, so jsdom tests stub `showModal` and dispatch `close` themselves. Focus return and real Escape handling are browser-test territory.
- New functions stay below cyclomatic complexity 5, or the fallow pre-commit gate fails.

### Probe results on 2026-10-25

Plan group 1 ran in Playwright's Chromium, Firefox and WebKit against the base build. A button's click handler set `returnValue = ''`, called `showModal()` on a plain `<dialog>` and focused its Cancel button. The dialog was closed five ways, waiting for each `close` event before reopening. The run was repeated with `role="alertdialog"`.

- The confirm button (`value="confirm"`) left `returnValue` as `"confirm"`. The Cancel button (`value=""`), Escape and `dialog.close()` from script left it as `""`. Light dismiss calls `close()`, so it takes the script path.
- When the `close` event fired, focus was already back on the opener, in every engine and for every close path.
- When the opener was removed before closing, focus was still on the Cancel button inside the closed dialog during the `close` event, and moved to `<body>` afterwards. R5 only restores focus to a connected opener, so this needs no code.
- `role="alertdialog"` changed none of these results.
- Chromium fires `close` from a queued task, and it fired only one `close` event when the dialog reopened before that task ran. Each `confirm()` call makes its own dialog and never reopens it, so this does not affect the feature. It does mean tests must await the promise before reading focus.

## Dependencies

None. No later phase depends on this one.
