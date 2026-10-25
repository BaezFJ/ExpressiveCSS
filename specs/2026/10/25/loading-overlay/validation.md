# Validation: loading overlay

Roadmap phase: Phase 41, loading overlay. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

The agent ran V1 to V7 on 2026-10-25 on this branch; mutation runs used Chromium. V8 to V10 are pending until plan group 5. Tests run against built bundles, so build first. Run suites one at a time, since parallel browser runs flake. The new test file names are proposals from plan group 4.

## Automated checks

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R2 | A started `.loading-overlay` holding a button with a click counter and a text field, with a focusable control before and after the region, in Chromium, Firefox and WebKit. | Set `aria-busy="true"`, click the button, and press Tab from the control before the region. Then set `aria-busy="false"`, and repeat. Run `node --test tests/loading-overlay-browser.test.js`. | While busy, the counter stays at 0 and Tab lands on the control after the region. After clearing, the click counts and Tab reaches the button. Fails against a build without the component. | Passed 2026-10-25 in all three engines. Removing the line that sets `inert` failed it. |
| V2 | R1, R2 | Chromium, Firefox and WebKit, with regions that start with no `aria-busy`, with `aria-busy="true"`, and with `inert` already set. | Start each with `AutoInit()`, toggle `aria-busy` between `"true"`, `"false"` and removed, and read `inert` after each change. Runs in `tests/loading-overlay-browser.test.js`, since jsdom has no `inert`. | The region is inert exactly while `aria-busy` is `"true"`, including from the start. A region that was inert before stays inert after clearing. | Passed 2026-10-25 in all three engines. Skipping the start-up sync, or clearing to `inert = false`, failed it. |
| V3 | R4 | The V1 fixture, then one started with `i18n: { loading: 'Cargando', loaded: 'Listo' }` through `data-loading-overlay-options`. | Set and clear `aria-busy`, reading the status element after each change. | The status element is the region's next sibling, has `role="status"`, is not inert and not inside the region. It reads "Loading" while busy and "Loaded" after clearing, or the custom words. | Passed 2026-10-25 in all three engines. Appending the status inside the region failed it. |
| V4 | R5 | The V1 fixture in all three engines. | Focus the text field and set `aria-busy="true"`, then clear it. Repeat, moving focus to the control outside the region before clearing. Repeat, removing the text field before clearing. | Focus is back on the text field after a plain clear. It stays on the outside control in the second case, and nothing throws in the third. | Passed 2026-10-25 in all three engines. Dropping the refocus failed it. |
| V5 | R3 | The V1 fixture in all three engines, plus a region that scrolls itself, scrolled to the bottom. | Read the computed opacity and box of the scrim and the indicator while busy and after clearing. | While busy, the scrim covers the region's visible box and the indicator is centred in it with opacity 1. After clearing, both have opacity 0 or are hidden. | Passed 2026-10-25 in all three engines. `margin: 0` on the indicator failed it. |
| V6 | R6 | The built CSS. | Static checks in `tests/forced-colors.test.js` and the reduced-motion check. | A forced-colors rule keeps the indicator visible over the scrim, and the reduced-motion block sets `transition: none` on the scrim and indicator. Each fails if its rule is removed. | Passed 2026-10-25. Both checks are regex matches on the built CSS, so removing either rule fails them. |
| V7 | R7 | Chromium, Firefox and WebKit, with a region started while busy and one started while not busy, each with and without `inert` set first. | Call `destroy()`, then toggle `aria-busy`. | The status element is gone, the region's `inert` matches its state before start, and toggling the attribute afterwards changes nothing. | Passed 2026-10-25 in all three engines. Not restoring `inert` in `destroy()` failed it. |
| V8 | R9 | A fresh build, with the gzip base taken from the merge-base build. | `node --test tests/selective-builds.test.js` | Passes with reviewed budget lines naming this change and the new CSS and JavaScript gzip bytes. | Pending |
| V9 | R8, R9 | Plan group 5 edits, with `npm run build:skill` run last. | `npm run check:generated` | Generation is clean, and the skill and MCP guides include the loading overlay guide. | Pending |
| V10 | R1 to R9 | All changes in place. | `npm run verify` | Passes, including the semantics roster, AutoInit, docs and skill-count tests. | Pending |

## Regression checks

- `tests/pull-to-refresh-browser.test.js` and the loading indicator tests pass unchanged, since a `.loading-indicator` outside a `.loading-overlay` must not change.
- `tests/autoinit.test.js` passes with the new fixture count, and `{ watch: true }` starts and destroys a `.loading-overlay` added and removed later.
- The MCP package bundles the generated guides, so `npm test --prefix mcp/expressivecss` and `npm run verify:packages` pass before submitting, as `tech-stack.md` asks.

## Manual checks

None required. The interview did not ask for a screen reader pass. V3 checks the status element's role, place and text; it does not prove what VoiceOver or NVDA announce.

## Merge conditions

- V1 to V10 pass.
- The regression checks pass. A failure in a file this change does not touch gets rerun alone before anyone debugs it.
- The repository's required CI checks and reviews are done.
