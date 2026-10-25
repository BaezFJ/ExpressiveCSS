# Validation: promise-based confirm dialog

Roadmap phase: Phase 43, promise-based confirm dialog. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

Every result is pending, since the feature is not built. Tests run against built bundles, so build first. Run suites one at a time, since parallel browser runs flake. The test file names below are planned and do not exist yet.

## Automated checks

### jsdom unit tests

`node --test tests/dialogs.test.js`, with `showModal` stubbed since jsdom lacks it.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R3, R4 | Call `Dialogs.confirm({ headline: 'Delete file?', text: 'This cannot be undone.' })`, then call it again with only `text`. | Inspect each dialog in `document.body`. | A `<dialog role="alertdialog">` with the heading, a `<p>` and a last-child `<form method="dialog">` holding Cancel then OK. With a headline, `aria-labelledby` names the heading and `aria-describedby` the text; without one, `aria-labelledby` names the text. Ids differ between the two dialogs. | Pending |
| V2 | R6 | Call `confirm()` with `text: '<img src=x onerror=alert(1)>'` and the same string as a label. | Read the dialog's markup. | The string appears as text, and the dialog contains no `<img>`. | Pending |
| V3 | R7 | Call `confirm()` with no labels, then with `confirm: 'Delete'`, then after setting `Dialogs.i18n.cancel = 'Keep'`. Restore `Dialogs.i18n` in `finally`. | Read the button texts. | OK and Cancel, then Delete and Cancel, then OK and Keep. | Pending |
| V4 | R2 | Open a dialog, set `returnValue` to the confirm button's `value` and dispatch `close`. Repeat with `returnValue` left as `''`. | Await each promise. | `true`, then `false`. | Pending |
| V5 | R8 | Open two dialogs, then close the second as confirmed and the first as cancelled. | Await both promises and count dialogs in the document. | The second resolves `true`, the first `false`, and no confirm dialog remains. | Pending |

### Three-engine browser tests

`node --test tests/confirm-dialog-browser.test.js` in Chromium, Firefox and WebKit, with an opener button whose click handler calls `Expressive.Dialogs.confirm()`.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V6 | R2, R5, R8 | Focus the opener and press Enter to open the dialog. | Activate the confirm button. | The promise resolves `true`, focus is on the opener, and the dialog is not in the document. This is the roadmap's completion check. | Pending |
| V7 | R2, R5 | Open the dialog from the opener. | Activate Cancel. Open it again and press Escape. | Both resolve `false`, and focus is on the opener after each. | Pending |
| V8 | R3, R5 | Open the dialog from the opener. | Read `document.activeElement`, then press Tab past the last button. | Focus starts on Cancel and stays inside the dialog. | Pending |
| V9 | R2 | Open the dialog with the root bundle loaded. | Press and release the pointer on the scrim outside the dialog box. | The promise resolves `false` and the dialog is gone. | Pending |

### Mutation check

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V10 | R1 to R8 | A build from the base commit, and a build with `Dialogs.confirm()` removed. If group 1 adds a focus fallback, also a build without it. | Run V1 to V9 against each. | Every case fails against the base and confirm-less builds. V6 and V7 fail against the build without the focus fallback in each engine that needed it. | Pending |

### Repository-required checks

The interview did not pick these as acceptance checks, but `tech-stack.md` and `CONTRIBUTING.md` require them for every bundle change.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V11 | R10 | A fresh build, with the gzip base taken from the merge-base build. | `node --test tests/selective-builds.test.js` | Passes with a new reviewed budget line that names this change and the JavaScript gzip bytes. The CSS size does not change. | Pending |
| V12 | R9, R10 | Plan group 4 edits, with `npm run build:skill` run last. | `npm run check:generated` | Generation is clean, and the skill and MCP guides carry the new `llm.md` text. | Pending |
| V13 | R1 to R10 | All changes in place. | `npm run verify`, then `npm test --prefix mcp/expressivecss` and `npm run verify:packages` | All pass. | Pending |

## Regression checks

- The existing cases in `tests/dialogs.test.js` pass unchanged, since light dismiss and dialog CSS must not change.
- The bottom sheet, side sheet and sheet drag suites in `npm run verify` pass, since they share the `Dialogs` light-dismiss listeners.
- The semantics tests pass with the generated dialog, since it must satisfy `dialog-is-named`.

## Manual checks

None required. The interview did not ask for a screen reader check, so no check proves what VoiceOver or NVDA announce for the alertdialog.

## Merge conditions

- V1 to V13 pass.
- The regression checks pass. A failure in a file this change does not touch gets rerun alone before anyone debugs it.
- The repository's required CI checks and reviews are done.
