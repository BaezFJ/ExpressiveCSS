# Rail outside toggle: validation

Roadmap [phase 90](../../../../roadmap.md#phase-90-toggle-the-rail-from-outside-it). Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

Commands: `npm run build`, then `node --test tests/navigation-rail.test.js tests/navigation-rail-toggle-browser.test.js`, then `npm run verify`.

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1 | jsdom: `nav#rail.navigation-rail` with an inside toggle that also has `aria-controls="rail"`, plus an outside `button[aria-controls="other rail"]` (type submit, inside a `<form>`) holding an icon span, a disabled one, a `button[aria-controls="other"]`, and an `onOpenStart` spy. Also a rail without an `id`. | Click the outside button's icon twice, click the inside toggle once, click the others. | The icon clicks expand, then collapse, the rail, the spy runs, and the click's `defaultPrevented` is true. The inside toggle expands the rail once. The disabled and other-id buttons change nothing, and nothing changes in the id-less rail. | The outside button is ignored or submits the form, the inside toggle double-toggles, or a disabled or unrelated button toggles the rail. | Pending |
| V2 | R2 | jsdom: the rail with the inside toggle and one outside toggle that starts with the wrong `aria-expanded="true"`. | Read `aria-expanded` on both; expand; append a second outside toggle; collapse; click the new toggle. | Both read `false` after start. After expand both read `true`. After collapse all three read `false`, and clicking the new toggle expands the rail. | An outside toggle's `aria-expanded` lags the rail, or a toggle added later doesn't work. | Pending |
| V3 | R3 | jsdom: a `.modal` rail with an inside toggle and two outside toggles; a second rail with no inside toggle and two outside toggles; an `onOpenStart` that cancels once. | Open with the second outside toggle, focus a destination, press Escape. Open with `expand()`, focus a destination, press Escape. On the second rail: open with its second toggle, then disable that toggle, press Escape; then click its first toggle while the cancelling callback is armed, open with `expand()`, press Escape. | Focus goes to the second outside toggle, then the inside toggle. On the second rail focus skips the disabled opener to the first toggle, and the cancelled open leaves no opener, so focus goes to the first toggle. The existing Escape tests (nested menu, outside focus, callback focus) still pass. | Focus goes to the wrong button or stays in the collapsed rail. | Pending |
| V4 | R4 | jsdom: a shadow root holding the rail and an outside toggle that starts with `aria-expanded="true"`. | Read the toggle's attribute after start, then click it. | It reads `false` after start; the click expands the rail and it reads `true`. | A rail in a shadow root ignores its toggles. | Pending |
| V5 | R5 | jsdom: a rail whose first child is a link and whose third child is a `<button>` destination; a rail whose first child is an `.icon-button`. | Click the `<button>` destination; click the icon button. | The destination doesn't toggle the rail and gets no `aria-expanded`; watch this fail before `_findToggle()` changes. The first-child icon button still toggles its rail. | A later button is taken for the toggle, or the icon-button toggle stops working. | Pending |
| V6 | R6 | The existing tests in `tests/navigation-rail.test.js` and `tests/navigation-rail-panel-browser.test.js`. | Run them. | All pass. | Existing rail behavior changed. | Pending |
| V7 | R7 | Browser at 390 × 800: a `.scaffold` whose app bar has `button[aria-controls="rail"]` and a `nav#rail.navigation-rail` with destinations, started with `NavigationRail.init`. | Focus the app bar button and press Enter, then focus a destination and press Escape. | After Enter the rail has `.expanded`, its position is `fixed`, and the button reads `aria-expanded="true"`. After Escape the rail is collapsed, the button reads `false`, and it has focus. In all three engines. | The click does nothing, the attribute lags, or focus isn't returned. | Pending |
| V8 | R8 | After `npm run build:skill`. | Run `npm run check:generated` and the selective-builds test; grep `aria-controls` in `docs/src/pages/navigation-rail.astro`, `docs/src/pages/scaffold.astro` and both `llm.md` sections, and "first child" in the changelog's migration note. | Generated files are current, the budget holds, each file holds an outside-toggle example with `aria-controls`, and the changelog names the first-child migration. | A record is missing or stale, or the JS exceeds its budget. | Pending |
| V9 | R1 to R8 | Clean build. | Run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`. | All pass; a known flake passes on a lone rerun. | Any check fails on rerun. | Pending |

## Human checks

| ID | Covers | Needs | Action | Expected result | Required for merge | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V10 | R2, R3 | A screen reader | Press the scaffold demo's app bar menu button, then Escape inside the rail. | The button announces collapsed, then expanded; after Escape, focus lands on it and it announces collapsed. | No | Pending |

## Merge conditions

- All agent-run checks pass, with V6 as the regression check.
- The milestone pull request's required CI checks and reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent). Findings, each checked against the source and fixed:
  - Requiring `:first-child` and excluding `.icon-button` would break existing toggles. `.icon-button` toggles stay valid, and the changelog gets a migration note for a toggle that isn't the first child.
  - A cancelled open recorded its opener. Openers are now recorded by the click handlers only after a successful expand.
  - Escape could focus a removed or disabled opener. It now skips toggles that aren't usable.
  - Unstated click cases now have requirements and checks:
    - an inside toggle carrying `aria-controls`;
    - preventing a submit;
    - a click on the button's icon;
    - one button naming two rails, and a toggle in another shadow root (both excluded).
  - The claim that phase 92 owns focus on open is dropped.
  - V2 and V4 now start from a wrong `aria-expanded`, V8 names the strings it looks for, and V7 uses Enter.
  - The root listener now reads the rail's root at click time, so a rail started before it was attached still connects.
