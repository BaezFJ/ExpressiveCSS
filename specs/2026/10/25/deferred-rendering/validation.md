# Validation: deferred rendering for long lists

Roadmap phase: Phase 40, deferred rendering for long lists. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

The agent ran every check on 2026-10-25 on this branch. Tests run against built bundles, so build first with `npm run build:css`. Run suites one at a time, since parallel browser runs flake.

## Automated checks

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1 | A 5,000-row `.list.defer-render` in a fixed-height scroll container, in Chromium, Firefox and WebKit. | Call `checkVisibility({ contentVisibilityAuto: true })` on the link inside row 4,999 (the row itself always returns true), scroll the row into view, wait a frame, and call it again. Run `node --test tests/defer-render-browser.test.js`. | False before the scroll, true after it, in all three engines. Fails against a build without the class. | Passed 2026-10-25 in all three engines, and failed in each against a build without the partial. |
| V2 | R2 | The V1 fixture, with no custom property, then `--md-comp-list-item-height: 40px`, then `--defer-render-row-size: 6rem` on the list. A plain `div.defer-render` whose last `<p>` holds a 120px block. | Read the block size of an off-screen row that has never rendered after each change. Scroll the tall `<p>` into view, then back to the top. | 56px by default, 40px with the smaller token, and 96px with the custom value at a 16px root font size. A skipped `<p>` reserves 56px, the 3.5rem fallback. The tall `<p>` reserves 56px before it renders, then keeps its rendered height (over 120px) once skipped again. | Passed 2026-10-25 in all three engines, and failed against the base build. After the code review, dropping the list token fallback failed this case in all three engines. |
| V3 | R3 | A deferred row whose only child is a link, with the row scrolled into view. | Tab to the link, then compare the outline's outer edge, from the computed `outline-offset` and `outline-width`, with the row's bounding box. | The outline lies inside the row box in all three engines. Fails against a build without the inset rule. | Passed 2026-10-25 in all three engines, and failed against the base build. |
| V4 | R4 | The V1 fixture, with a unique word in row 4,999's text. | Take the list's ARIA snapshot with Playwright and search for the word. Where the engine supports `window.find()`, call it with the word from the top of the page. | The snapshot contains the word while the row is off screen. `window.find()` returns true. If an engine lacks `window.find()`, the case skips that step and says so. | Passed 2026-10-25 in all three engines, which all have `window.find()`. The snapshot is taken from row 4,999 alone: a snapshot of the whole list hit Playwright's 30-second timeout in Chromium during `npm run verify`. Against the base build the case fails at its "row is skipped" precondition. |
| V8 | R7 | A `.list.swipeable.defer-render` with an open row (`--swipe-offset: -120px`) whose actions hold a button, and a plain row. | Call `elementFromPoint` at the button's centre, and read each row's computed `content-visibility`. | The button takes the point, and the rows compute `visible` and `auto`. | Passed 2026-10-25 in all three engines. Changing the selector back to `.defer-render > *` failed it in all three. |
| V5 | R6 | A fresh build, with the gzip base taken from the merge-base build. | `node --test tests/selective-builds.test.js` | Passes with a new reviewed budget line that names this change and the CSS gzip bytes. The JavaScript size does not change. | Passed 2026-10-25: CSS 86,825 gzip bytes (+89 from 86,736 at the merge-base `1ab798978`). After the review fix: 86,844 (+108). |
| V6 | R5, R6 | Plan group 4 edits, with `npm run build:skill` run last. | `npm run check:generated` | Generation is clean, and the skill and MCP guides carry the new `llm.md` text. | Passed 2026-10-25: all 89 guides are current. |
| V7 | R1 to R6 | All changes in place. | `npm run verify` | Passes. That covers the build, typecheck, the full test run, `check:generated` and the docs build and verification. | Passed 2026-10-25 in two parts. The first run had 2,824 tests, 2,823 passing; the one failure was V4's whole-list snapshot timing out in Chromium, which stopped the run before `check:generated` and the docs steps. After the fix, the new file passed 12 of 12, and `check:generated`, `docs:build:astro` (120 pages) and `docs:verify` passed. After the review fixes, a full run passed 2,827 of 2,827 tests, with `check:generated`, the docs build and `docs:verify`. |

## Regression checks

- `tests/lists.test.js` and the list browser suites in `npm run verify` pass unchanged, since lists without `.defer-render` must not change.
- The focus-ring rule must not reach lists without the class. V7 covers this through the existing list and focus tests.
- The MCP package bundles the generated guides, so run `npm test --prefix mcp/expressivecss` and `npm run verify:packages` before submitting, as `tech-stack.md` asks. Both passed on 2026-10-25, before and after the review fixes.

## Manual checks

None required. The interview did not ask for a manual docs or screen reader check. V4 relies on Playwright's ARIA snapshot, which Playwright computes itself; it does not prove what VoiceOver or NVDA announce.

## Merge conditions

- V1 to V8 pass.
- The regression checks pass. A failure in a file this change does not touch gets rerun alone before anyone debugs it.
- The repository's required CI checks and reviews are done.
