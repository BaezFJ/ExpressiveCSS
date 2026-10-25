# Validation: back-to-top button

Roadmap phase: Phase 44, back-to-top button. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

Every result is pending, since the feature is not built. Tests run against built bundles, so build first. Run suites one at a time, since parallel browser runs flake. The test file names come from plan.md and do not exist yet.

## Automated checks

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R2, R5 | A page three viewports tall with `<main id="main">` holding a heading and a button, and `<a class="back-to-top" href="#main" aria-label="Back to top">`, in Chromium, Firefox and WebKit. | Scroll past one viewport height, wait for the link to show, and click it. Wait for the scroll to end. Press Tab. Repeat, activating with focus on the link and Enter. Run `node --test tests/back-to-top-browser.test.js`. | `scrollY` is 0, `document.activeElement` is `#main`, and Tab then focuses the button. `#main` has no `tabindex` once it loses focus. Fails against the base build. | Pending |
| V2 | R2, R3 | The V1 page. | At the top, then after scrolling back above the threshold: read the link's computed visibility, focus the button before the link with `preventScroll` and press Tab, call `elementFromPoint` at the link's box, and take the page's ARIA snapshot. Without `preventScroll`, focusing the button scrolls to the top and hides the link before Tab reaches it. | The link is hidden, Tab skips it, `elementFromPoint` returns another element, and the snapshot has no "Back to top" link. After scrolling past the threshold, all four show it. | Pending |
| V3 | R6 | The V1 page, with and without Playwright's `reducedMotion: 'reduce'`. | Activate the link from the bottom of the page and read `scrollY` in the same task as the click. Two frames later proved too late: under load, WebKit's 380ms smooth scroll had already finished. | With reduced motion, `scrollY` is already 0 and the link's `transition-duration` is `0s`. Without it, `scrollY` is still above 0 and the link has a fade. Both end at 0. | Pending |
| V4 | R4 | The V1 page with `data-back-to-top-options='{"threshold": "400px"}'`. | Scroll to 300px, then to 500px. | Hidden at 300px, shown at 500px, in all three engines. | Pending |
| V10 | R1, R7 | The V1 page shown past the threshold, then under `dir="rtl"`, then with `--md-comp-back-to-top-offset: 96px` on the link. A second page loads only the CSS bundle. | Read the link's bounding box against the viewport. On the CSS-only page, click the link. | The link sits 16px from the bottom and inline-end edges, flips to the left edge under `rtl`, and moves to 96px with the custom value. On the CSS-only page it is visible and the click jumps to `#main`. | Pending |
| V5 | R4, R5, R8 | The AutoInit fixture in `tests/fixtures.js` and a jsdom page. | Run `node --test tests/back-to-top.test.js`: start the component, read `threshold` from `data-back-to-top-options`, activate the link with a target that has no `tabindex`, blur the target, then call `destroy()`. | The instance exists with the markup option. The target gets `tabindex="-1"` on activation and loses it on blur. After `destroy()` the sentinel is gone, the link has no `inert`, and the markup equals the authored markup. | Pending |
| V6 | R9 | The `semantics.json` entry and fixtures for a named and an unnamed link, and one with authored `inert`. | Run the semantics tests in `npm test`. | The unnamed link and the authored `inert` fail with their rule ids; the named link passes. | Pending |
| V7 | R10 | A fresh build, with the gzip base taken from the merge-base build. | `node --test tests/selective-builds.test.js` | Passes with a new reviewed budget line that names this change and the CSS and JavaScript gzip bytes. | Pending |
| V8 | R9, R10 | Group 5 edits, with `npm run build:skill` run last. | `npm run check:generated` | Generation is clean, and the skill and MCP guides carry the new `llm.md` text and semantics rules. | Pending |
| V9 | R1 to R10 | All changes in place. | `npm run verify` | Passes: build, typecheck, the full test run, `check:generated`, and the docs build and verification. | Pending |

## Regression checks

- `tests/app-bar.test.js` and `tests/app-bar-js.test.js` pass unchanged, since the component copies AppBar's sentinel pattern without changing it.
- The AutoInit fixture test and the registry checks in `npm run verify` pass with the new registry line.
- The FAB and FAB menu browser tests pass unchanged; the new styles must not match `.fab-menu` or `circle extra` buttons.
- The MCP package bundles the generated guides, so run `npm test --prefix mcp/expressivecss` and `npm run verify:packages` before submitting, as `tech-stack.md` asks.

## Manual checks

None required. The interview did not ask for a manual screen reader check. V2 relies on Playwright's ARIA snapshot, which Playwright computes itself; it does not prove what VoiceOver or NVDA announce.

## Merge conditions

- V1 to V10 pass.
- The regression checks pass. A failure in a file this change does not touch gets rerun alone before anyone debugs it.
- The repository's required CI checks and reviews are done.
