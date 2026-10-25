# Plan: promise-based confirm dialog

Roadmap phase: Phase 43, promise-based confirm dialog. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

Work on `feature/2026-10-25-confirm-dialog`. Tests run against built bundles, so build before testing. Run test files one at a time, since parallel browser runs flake.

## Group 1: engine probe

Prerequisites: none.

- [x] In Chromium, Firefox and WebKit through Playwright, focus a button, open a `<dialog>` with `showModal()` from its click handler, close it with a `<form method="dialog">` button, and record where focus lands.
- [x] Repeat with Escape and with `dialog.close()` called from script, and record `returnValue` after each when it was set to `''` before opening.
- [x] Record whether a `role="alertdialog"` dialog behaves the same as a plain one for Escape and focus.
- [x] Write the findings into the Technical constraints section of requirements.md, and settle whether R5 needs a focus fallback.

Completion check: requirements.md records each engine's focus target and `returnValue` for the three close paths, and the probe script is not committed.

Covers R2, R5 (evidence only). Feeds V6, V7 and V10.

## Group 2: `Dialogs.confirm()` and jsdom tests

Prerequisites: group 1.

- [x] In `src/ts/behaviors/dialogs.ts`, add `static i18n = { confirm: 'OK', cancel: 'Cancel' }` and `static confirm(options): Promise<boolean>`.
- [x] Build the `<dialog role="alertdialog">`, heading, `<p>` and `<form method="dialog">` with `textContent`, ids from a counter, and the naming attributes from R4.
- [x] Append it to `document.body` and call `showModal()`. The cancel button's `autofocus` takes the first focus. A new dialog's `returnValue` is already `''`, so it needs no reset.
- [x] On `close`, resolve from `returnValue` and remove the dialog. Group 1 found no engine that needs a focus fallback.
- [x] Add jsdom cases to `tests/dialogs.test.js`, with `showModal` stubbed: markup and naming with and without a headline, text set without HTML parsing, default and per-call labels, a changed `Dialogs.i18n`, resolve values from `returnValue`, removal after close, and two calls resolving independently.
- [x] Run each jsdom case against the base build and confirm it fails.

Completion check: `node --test tests/dialogs.test.js` passes, and the new cases fail against the base build. The fallow pre-commit gate accepts the new functions.

Covers R1, R2, R3, R4, R6, R7, R8, and V1 to V5.

## Group 3: browser tests

Prerequisites: group 2.

- [x] Add `tests/confirm-dialog-browser.test.js`, looping over Chromium, Firefox and WebKit, with a page that has an opener button whose click handler calls `Expressive.Dialogs.confirm()`.
- [x] Case for V6: the confirm button resolves `true`, focus returns to the opener, and the dialog is gone.
- [x] Case for V7: the cancel button and Escape each resolve `false` with focus back on the opener.
- [x] Case for V8: focus is on the cancel button when the dialog opens, and the background is inert.
- [x] Case for V9: a scrim tap resolves `false` through the light-dismiss behavior.
- [x] Tear down pages in `finally` blocks. Run the file against the base build and confirm every case fails.

Completion check: `node --test tests/confirm-dialog-browser.test.js` passes in all three engines, and V10 shows every jsdom and browser case failing against the base build.

Covers R2, R3, R5, R8, and V6 to V10.

## Group 4: docs, budget and generated files

Prerequisites: group 3.

- [x] Document `Dialogs.confirm()` and `Dialogs.i18n` on `docs/src/pages/dialogs.astro` with a live example, and add the same text to the Dialogs section of `llm.md`.
- [x] Add an Added entry to `CHANGELOG.md` under Unreleased.
- [x] Update the `dialog` note in `semantics.json` if the roster or guide tests ask for it, then run `npm run build:semantics`. Not needed: the semantics and guide tests passed without it.
- [x] Rebuild, measure the JavaScript gzip size against the merge-base build, and add a reviewed budget line to `tests/selective-builds.test.js`.
- [x] Run `npm run build:skill` after the last edit, then `npm run check:generated`, `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`.

Completion check: V11 to V13 pass.

Covers R9, R10, and V11 to V13.
