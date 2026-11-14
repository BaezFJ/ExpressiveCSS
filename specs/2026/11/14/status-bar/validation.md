# Status bar: validation

Ad hoc component, no roadmap phase. Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

Commands: `npm run build`, then `node --test tests/status-bar.test.js tests/status-bar-browser.test.js`, then `npm run verify`. The script names are verified in `package.json`; the two test files are created in plan groups 1 and 2.

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1 | A page with a `<footer class="status-bar">` holding three items after 3000px of content, viewport 1024 × 768, root font size 16px. | Measure the bar, read computed styles, scroll to the middle of the page. | Bar height 24px, width equals the viewport, background resolves to `--md-sys-color-surface-container`, font matches body-small including letter-spacing, and the bar's bottom edge sits at the viewport bottom mid-scroll. | The bar wraps, is taller or shorter than 24px, uses another color role or type role, or scrolls away. | Pass (2026-11-14) |
| V2 | R2 | Bar with an icon-only button, an icon-and-text button, a link and a text `span`. | Measure each item and its icon. | Every item is at least 24 × 24px, icons are 16px, and the icon-to-text gap is 4px. | Any item is under 24px on either axis or an icon renders at another size. | Pass (2026-11-14) |
| V3 | R3 | Same bar plus a disabled button and a `.primary` item, reduced motion emulated. | Tab to the first two items, then hover and press a button, hover the filled item, the `span` and the disabled button. | Rest: transparent background, no border, inherited color, no underline on the link. Focus shows a solid outline with a negative offset. Hover draws a state-layer image, also over the filled item. Background color stays transparent on hover, press and focus. The `span` and the disabled button show no state layer, and disabled text is dimmed. | Native button chrome shows, the filled-button fill shows on a state, hover paints nothing, or the disabled item reacts to hover. | Pass (2026-11-14) |
| V4 | R4 | Five items with `.end` on the fourth, in an LTR and an RTL page. | Measure the fourth and fifth items. | LTR: the fifth item's right edge meets the bar's inline-end padding and the fourth sits right before it. RTL: the same at the left edge. | The end group stays next to the start group, or RTL does not mirror. | Pass (2026-11-14) |
| V5 | R5 | A `.status-bar.vibrant`, a plain bar inside a `[vibrant]` ancestor, and a `.toolbar` inside the same `[vibrant]` ancestor. | Read background and text colors. | `.vibrant` paints primary-container with on-primary-container text. Under `[vibrant]`, the bar's colors differ from the default bar and resolve through `--md-comp-status-bar-*` tokens. | `.vibrant` uses another role, or the foundation leaves the bar unchanged because colors are hard-coded. | Pass (2026-11-14) |
| V6 | R6 | A `primary on-primary-text` button and an `error-container on-error-container-text` span in a plain bar and in a `.vibrant` bar. | Read background and text colors. | Each item shows its helper fill and text color in both bars. | The item reset or the vibrant bar overrides a helper. | Pass (2026-11-14) |
| V7 | R7 | Bar with a `data-priority="low"` item, at viewport widths 400, 599, 600 and 800. Also 14 extra items at 320px. | Read the low item's `display`, then compare page and bar scroll widths and the bar height. | The low item is `none` at 400 and 599 and visible at 600 and 800. At 320px neither the page nor the bar overflows sideways, and the bar is taller than 24px because items wrapped. | A low item shows below 600px or hides at 600px and up, the page scrolls horizontally, or items overflow the bar. | Pass (2026-11-14) |
| V8 | R8 | Root font size 32px, viewport 1024px. | Measure the bar and every visible item's top. | The bar is at least 48px tall, all items share one top, and no item's text overflows its item vertically. | The bar keeps a 24px height, items that fit wrap, or text is clipped. | Pass (2026-11-14) |
| V9 | R9 | Chromium with forced colors emulated active. | Read the bar's top border, then focus an item. | The bar has a 1px solid top border and the focused item has a non-`none` outline. | Either edge is `none` or 0px under forced colors. | Pass (2026-11-14) |
| V10 | R10 | Chromium with reduced motion emulated. | Read a button item's `transition-duration`. | Every duration is 0s. | Any transition runs under reduce. | Pass (2026-11-14) |
| V11 | R11 | Fixture markup run through the semantics rule runner (`violations()` with `enforcedRules()` from `scripts/semantics-rules.mjs`). | Check a valid bar, then bars with `role="status"`, `role="toolbar"`, `nav.status-bar`, and an unnamed icon-only button. | The valid bar passes. Each of the four bad fixtures is flagged by its own rule ID. `tests/semantics.test.js` passes with the row enforced. | A bad fixture passes, the valid one is flagged, or the roster test rejects the partial. | Pass (2026-11-14) |
| V12 | R12 | The compiled `dist/css/expressive.css`. | List every selector that names `.status-bar` outside a `:not()`, and run `tests/page-footer-browser.test.js`. | Every such selector starts at `.status-bar`, and the page footer tests pass. | A partial selector matches outside the bar, or the page footer loses its styles. | Pass (2026-11-14) |
| V13 | R13 | Docs built with `npm run docs:build`. | Open `_site/status-bar.html` and run `tests/docs-astro.test.js`. | The page exists, it is linked after Toolbars in the navigation, it holds every R13 example, and the docs tests pass. | The page or nav entry is missing, an R13 example is absent, or a docs test fails. | Pass (2026-11-14) |
| V14 | R14 | After `npm run build:skill`. | Run `npm run check:generated`, the skill, version-resolution and component-decisions tests, and `tests/selective-builds.test.js`. | Generated files match their sources, guide counts match, the capability roadmap test passes with the branch-commit pin, and the gzip budget line holds. | A generated file is stale, a count is off, the pin fails the ancestor check, or the CSS exceeds its budget. | Pass (2026-11-14) |
| V15 | R13 | The built docs site. | Run `scripts/verify-site.mjs`. | No duplicate landmark or landmark-name failure on `status-bar.html`. | A demo adds a second contentinfo landmark or a duplicated landmark name. | Pass (2026-11-14) |
| V16 | R1 to R14 | Clean build. | Run `npm run verify`, `npm test --prefix mcp/expressivecss`, the MCP smoke test and `npm run verify:packages`. | All pass. Known flakes pass on a lone rerun. | Any check fails on rerun. | Pass (2026-11-14): verify 3,895 of 3,896, the one failure a WebKit swipe-actions flake that passed alone; skipped verify steps, MCP smoke and verify:packages then passed |

## Human checks

| ID | Covers | Needs | Action | Expected result | Required for merge | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V17 | R11, R13 | A screen reader (NVDA or VoiceOver) | Tab through the docs demo bar, then trigger the demo's `role="status"` text update. | Each item announces its name. The update is read once, and the buttons' labels are not read with it. | No | Pending |
| V18 | R1 | An iPhone with a home indicator | Open the docs demo in Safari and scroll. | The bar's items sit above the home indicator. | No | Pending |
| V19 | R9 | Windows with a contrast theme | Open the docs demo in Edge. | The bar edge, the emphasis and error items and the focus ring stay visible. | No | Pending |

## Merge conditions

- All agent-run checks pass.
- Human checks are not required for merge. Copy them into the pull request body as a checklist.
- Regression checks V12 and V15 pass.
- The repository's required CI checks and reviews are done.

## Review record

- 2026-11-14, local Codex review of the uncommitted pin: flagged that the branch-commit `sourceRevision` fails the ancestry check on master after a squash merge. Kept on purpose. Only squash merges are allowed, every record must cite a source present at the pin, and a new file exists on no master commit, so a follow-up re-pin to the squash commit lands right after merge, as #431 and #438 did.
