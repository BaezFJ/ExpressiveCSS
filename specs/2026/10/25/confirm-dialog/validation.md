# Validation: promise-based confirm dialog

Roadmap phase: Phase 43, promise-based confirm dialog. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

The agent ran every check on 2026-10-25 on this branch. Tests run against built bundles, so build first. Run suites one at a time, since parallel browser runs flake. The test file names below are planned and do not exist yet.

## Automated checks

### jsdom unit tests

`node --test tests/dialogs.test.js`, with `showModal` stubbed since jsdom lacks it.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R3, R4 | Call `Dialogs.confirm({ headline: 'Delete file?', text: 'This cannot be undone.' })`, then call it again with only `text`. | Inspect each dialog in `document.body`. | A `<dialog role="alertdialog">` with the heading, a `<p>` and a last-child `<form method="dialog">` holding Cancel then OK. With a headline, `aria-labelledby` names the heading and `aria-describedby` the text; without one, `aria-labelledby` names the text. Ids differ between the two dialogs. | Passed 2026-10-25, and failed against the base build. |
| V2 | R6 | Call `confirm()` with `text: '<img src=x onerror=alert(1)>'` and the same string as a label. | Read the dialog's markup. | The string appears as text, and the dialog contains no `<img>`. | Passed 2026-10-25, and failed against the base build. |
| V3 | R7 | Call `confirm()` with no labels, then with `confirm: 'Delete'`, then after setting `Dialogs.i18n.cancel = 'Keep'`. Restore `Dialogs.i18n` in `finally`. | Read the button texts. | OK and Cancel, then Delete and Cancel, then OK and Keep. | Passed 2026-10-25, and failed against the base build. |
| V4 | R2 | Open a dialog, set `returnValue` to the confirm button's `value` and dispatch `close`. Repeat with `returnValue` left as `''`. | Await each promise. | `true`, then `false`. | Passed 2026-10-25, and failed against the base build. |
| V5 | R8 | Open two dialogs, then close the second as confirmed and the first as cancelled. | Await both promises and count dialogs in the document. | The second resolves `true`, the first `false`, and no confirm dialog remains. | Passed 2026-10-25, and failed against the base build. |

### Three-engine browser tests

`node --test tests/confirm-dialog-browser.test.js` in Chromium, Firefox and WebKit, with an opener button whose click handler calls `Expressive.Dialogs.confirm()`.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V6 | R2, R5, R8 | Focus the opener and press Enter to open the dialog. | Activate the confirm button. | The promise resolves `true`, focus is on the opener, and the dialog is not in the document. This is the roadmap's completion check. | Passed 2026-10-25 in all three engines, and failed in each against the base build. |
| V7 | R2, R5 | Open the dialog from the opener. | Activate Cancel. Open it again and press Escape. | Both resolve `false`, and focus is on the opener after each. | Passed 2026-10-25 in all three engines, and failed in each against the base build. |
| V8 | R3, R5 | Open the dialog from the opener. | Read `document.activeElement`, press Tab, then call `focus()` on a button behind the dialog. | Focus starts on Cancel, moves to the confirm button, and stays there, because the page behind is inert. | Passed 2026-10-25 in all three engines, and failed in each against the base build. |
| V9 | R2 | Open the dialog with the root bundle loaded. | Press and release the pointer on the scrim outside the dialog box. | The promise resolves `false` and the dialog is gone. | Passed 2026-10-25 in all three engines, and failed in each against the base build. |

### Mutation check

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V10 | R1 to R8 | A build from the base commit, and a build with `Dialogs.confirm()` removed. | Run V1 to V9 against each. | Every case fails against the base and confirm-less builds. | Passed 2026-10-25: all 17 new cases (5 jsdom, 12 browser) failed against the base `dialogs.ts`. Removing `autofocus` failed only V1, since every engine focuses the first button anyway. |

### Repository-required checks

The interview did not pick these as acceptance checks, but `tech-stack.md` and `CONTRIBUTING.md` require them for every bundle change.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V11 | R10 | A fresh build, with the gzip base taken from the merge-base build. | `node --test tests/selective-builds.test.js` | Passes with a new reviewed budget line that names this change and the JavaScript gzip bytes. The CSS size does not change. | Passed 2026-10-25: JavaScript 95,666 gzip bytes (+360 from 95,306 at the merge-base `a9bbf77ad`). CSS unchanged. |
| V12 | R9, R10 | Plan group 4 edits, with `npm run build:skill` run last. | `npm run check:generated` | Generation is clean, and the skill and MCP guides carry the new `llm.md` text. | Passed 2026-10-25: all 89 guides are current. |
| V13 | R1 to R10 | All changes in place. | `npm run verify`, then `npm test --prefix mcp/expressivecss` and `npm run verify:packages` | All pass. | Passed 2026-10-25 in parts. `npm run verify` ran 2,844 tests with 2,843 passing. The one failure, the codex adapter "oversized streams" test, hit its 3,000 ms limit at a load average over 100 and failed the same way on the base commit; the file passed 14 of 14 once load dropped. `check:generated`, `docs:build:astro` (120 pages) and `docs:verify` then passed. `verify:packages` passed. `npm test --prefix mcp/expressivecss` failed twice on the smoke test's static-inspection time limit at a load average of 218, then passed. |

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
