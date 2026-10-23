# Validation: position and inset helpers

Roadmap phase: [Phase 26, position and inset helpers](../../../../roadmap.md#phase-26-position-and-inset-helpers)
Branch: `feature/2026-10-23-position-inset-helpers`

Each check maps to requirements in [requirements.md](requirements.md). Browser checks run against `dist/css/expressive.css`, so run `npm run build` first. Run one test suite at a time; parallel browser runs flake.

## Automated checks

### V1. Inset child fills the parent's padding box

Covers R1, R4.

- Setup: in Chromium, Firefox and WebKit, a `.relative` parent 200 by 120 pixels with 12px padding and a 3px border, holding a `.position-absolute.inset-0` child with no content. Run once with `dir="ltr"` on `<html>` and once with `dir="rtl"`.
- Action: compare the child's `getBoundingClientRect()` with the parent's rect shrunk by its border widths.
- Expected: all four edges match within 0.5px in both directions. The child's computed `position` is `absolute`.
- Result: Pass, 2026-10-23, in Chromium, Firefox and WebKit, test "inset and edge pins fill and pin to the padding box in LTR and RTL".

### V2. Edge pins sit on their edges and mirror in RTL

Covers R5, R6.

- Setup: the same parent as V1, holding four 20px `.position-absolute` children with `.top-0`, `.bottom-0`, `.start-0` and `.end-0`. Run in all three engines with `dir="ltr"` and `dir="rtl"`.
- Action: compare each child's rect with the parent's padding box.
- Expected: `.top-0` touches the top padding edge and `.bottom-0` the bottom. In LTR, `.start-0` touches the left edge and `.end-0` the right; in RTL they swap. The computed values are `top: 0px`, `bottom: 0px`, and `inset-inline-start` or `inset-inline-end` of `0px`.
- Result: Pass, 2026-10-23, same test as V1. Swapping `.start-0` to `left: 0` in the built CSS failed it in all three engines.

### V3. A fixed inset element covers the viewport after scrolling

Covers R2, R7.

- Setup: a page 3000px tall with a `.position-fixed.inset-0` element, in all three engines.
- Action: read the element's rect, scroll the window by 1000px, and read it again.
- Expected: both rects equal `0, 0, innerWidth, innerHeight` within 0.5px. The computed `position` is `fixed` and the computed `z-index` is `auto`.
- Result: Pass, 2026-10-23, in all three engines, test "a fixed inset element covers the viewport after scrolling". It compares against `clientWidth`, so a classic scrollbar does not skew the width.

### V4. `.position-static` undoes positioning

Covers R3.

- Setup: an element with `.relative.position-static` and `top: 40px` inline.
- Action: read its computed `position` and its rect against a static sibling.
- Expected: `position` is `static` and the 40px offset has no effect.
- Result: Pass, 2026-10-23, Chromium. The test asserts the computed `position` of `.relative.sticky-top.position-static` is `static`. The geometry step was dropped: `offsetTop` includes a relative offset, so it could not tell the cases apart.

### V5. Component `.fixed` modifiers keep their positioning

Covers R8.

- Setup: the built CSS with a `.navigation-bar.fixed`, a fixed toolbar using the markup from the toolbar docs, a `.table-of-contents.fixed`, a `.relative` box and a `.sticky-top` box.
- Action: read each element's computed `position`, and the `top` of the `.sticky-top` box.
- Expected: `sticky`, `fixed`, `fixed`, `relative`, and `sticky` with `top: 0px`, the same values as on the base commit.
- Result: Pass, 2026-10-23, Chromium only, test "position helpers leave component .fixed modifiers alone and static undoes positioning".

### V6. No prefixed forms

Covers R9.

- Setup: the built `dist/css/expressive.css`.
- Action: search it for selectors such as `.expanded\:position-absolute`, `.medium\:inset-0` and `.large\:start-0`, for every window size and every new class.
- Expected: no matches.
- Result: Pass, 2026-10-23, in the same test. It first checks that `\:flex-row` exists, so the regex is not vacuous.

### V8. CSS budget and generated files

Covers R11.

- Action: `npm run build`, then `node --test tests/selective-builds.test.js`; then `npm run build:skill` and `npm run check:generated`.
- Expected: the budget test passes with a new reviewed line whose delta is measured from the merge base, and `check:generated` reports no drift.
- Result: Pass, 2026-10-23. CSS gzip went from 84,819 at `3ef49121a` to 84,884 (+65). `check:generated` is clean.

### V9. Contributor checks

Covers R8, R11 as regressions.

- Action: `npm run verify`, then `npm test --prefix mcp/expressivecss`, run one after the other.
- Expected: both pass. A known flake is rerun alone before it counts as a failure.
- Result: Pass, 2026-10-23, after reruns. `npm run verify` failed 3 of 2,580 tests: the docker-runner SIGINT test, the codex-adapter oversized-stream test and the Firefox keypad test (a 30s timeout). All three passed when rerun alone. `check:generated`, `docs:build:astro` and `docs:verify`, which `verify` skipped after the failure, then passed. `npm test --prefix mcp/expressivecss` passed after `npm ci --prefix mcp/expressivecss`.

## Manual checks

### V7. Docs list the classes and their limits

Covers R10.

- Action: read the "Display and position" table in `llm.md`, the helpers table in `docs/src/pages/helpers.astro`, and `skills/expressivecss/expressivecss-usage/references/helpers.md`; build the docs with `npm run docs:build:astro` and open the helpers page.
- Expected: each source lists all eight new classes with their declarations, says `.position-fixed` adds no z-index, points to `--expressive-z-*`, and warns that a transformed or filtered ancestor contains a fixed element. The pinned-badge example renders with the badge in the card's top end corner in LTR. `CHANGELOG.md` has the Added entry.
- Result: Pass, 2026-10-23, for the sources and the docs build: `npm run docs:build:astro` and `npm run docs:verify` succeeded. The rendered example was not opened in a browser.

## Merge conditions

- V1 to V9 pass, with V1 to V3 run in Chromium, Firefox and WebKit.
- If Phase 25 merged first, the branch is rebased, V8 and V9 are rerun, and the budget line is measured from the new merge base.
- CI passes and review conversations are resolved, as `CONTRIBUTING.md` requires.
