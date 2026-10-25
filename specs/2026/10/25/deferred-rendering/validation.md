# Validation: deferred rendering for long lists

Roadmap phase: Phase 40, deferred rendering for long lists. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

Nothing has run yet; every result is pending. Tests run against built bundles, so build first with `npm run build:css`. Run suites one at a time, since parallel browser runs flake. The test file `tests/defer-render-browser.test.js` does not exist yet; plan group 3 adds it.

## Automated checks

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1 | A 5,000-row `.list.defer-render` in a fixed-height scroll container, in Chromium, Firefox and WebKit. | Call `checkVisibility({ contentVisibilityAuto: true })` on the link inside row 4,999 (the row itself always returns true), scroll the row into view, wait a frame, and call it again. Run `node --test tests/defer-render-browser.test.js`. | False before the scroll, true after it, in all three engines. Fails against a build without the class. | Pending |
| V2 | R2 | The V1 fixture, once with no custom property and once with `--expressive-row-size: 6rem` on the list. | Read the block size of an off-screen row that has never rendered. | 56px by default (the list item height token), and 96px with the custom value at a 16px root font size. | Pending |
| V3 | R3 | A deferred row whose only child is a link, with the row scrolled into view. | Tab to the link, then compare the outline's outer edge, from the computed `outline-offset` and `outline-width`, with the row's bounding box. | The outline lies inside the row box in all three engines. Fails against a build without the inset rule. | Pending |
| V4 | R4 | The V1 fixture, with a unique word in row 4,999's text. | Take the list's ARIA snapshot with Playwright and search for the word. Where the engine supports `window.find()`, call it with the word from the top of the page. | The snapshot contains the word while the row is off screen. `window.find()` returns true. If an engine lacks `window.find()`, the case skips that step and says so. | Pending |
| V5 | R6 | A fresh build, with the gzip base taken from the merge-base build. | `node --test tests/selective-builds.test.js` | Passes with a new reviewed budget line that names this change and the CSS gzip bytes. The JavaScript size does not change. | Pending |
| V6 | R5, R6 | Plan group 4 edits, with `npm run build:skill` run last. | `npm run check:generated` | Generation is clean, and the skill and MCP guides carry the new `llm.md` text. | Pending |
| V7 | R1 to R6 | All changes in place. | `npm run verify` | Passes. That covers the build, typecheck, the full test run, `check:generated` and the docs build and verification. | Pending |

## Regression checks

- `tests/lists.test.js` and the list browser suites in `npm run verify` pass unchanged, since lists without `.defer-render` must not change.
- The focus-ring rule must not reach lists without the class. V7 covers this through the existing list and focus tests.
- The MCP package bundles the generated guides, so run `npm test --prefix mcp/expressivecss` and `npm run verify:packages` before submitting, as `tech-stack.md` asks.

## Manual checks

None required. The interview did not ask for a manual docs or screen reader check. V4 relies on Playwright's ARIA snapshot, which Playwright computes itself; it does not prove what VoiceOver or NVDA announce.

## Merge conditions

- V1 to V7 pass.
- The regression checks pass. A failure in a file this change does not touch gets rerun alone before anyone debugs it.
- The repository's required CI checks and reviews are done.
