# Plan: position and inset helpers

Roadmap phase: [Phase 26, position and inset helpers](../../../../roadmap.md#phase-26-position-and-inset-helpers)
Branch: `feature/2026-10-23-position-inset-helpers` from `origin/master` at `3ef49121a`

Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md). The groups run in order.

## 1. Classes and browser tests

Outcome: the eight classes exist in the built CSS, and browser tests prove their geometry and that the component `.fixed` modifiers still work.

Prerequisites: none.

- [ ] Add `.position-absolute`, `.position-fixed`, `.position-static`, `.inset-0`, `.top-0`, `.bottom-0`, `.start-0` and `.end-0` under the Positioning comment in `src/sass/utilities/_helpers.scss`, after `.sticky-top`, outside `$_layout`. `.position-static` must come after `.relative` and `.sticky-top`, since all three share one layer and one specificity.
- [ ] Add a browser test to `tests/helpers-browser.test.js`, looped over `engines`, that measures an `.inset-0` child and each edge pin inside a `.relative` parent with padding and a border, in `dir="ltr"` and `dir="rtl"`.
- [ ] Add a browser test for a `.position-fixed.inset-0` element before and after scrolling a tall page.
- [ ] Add a browser test that loads the built CSS and reads the computed `position` of `.navigation-bar.fixed`, a toolbar `.fixed` and `.table-of-contents.fixed`.
- [ ] Add a check that `.position-static` resets a positioned element, and that the CSS has no `\:position-` or prefixed pin selectors.

Completion check: `npm run build`, then `node --test tests/helpers-browser.test.js` passes in Chromium, Firefox and WebKit.

Covers R1 to R9; V1 to V6.

## 2. Docs

Outcome: authors and agents can find every new class and its limits.

Prerequisites: group 1.

- [ ] Add rows for the new classes to the "Display and position" table in `llm.md`, and a note that `.position-fixed` adds no z-index, that `--expressive-z-*` values order fixed surfaces, and that a transformed or filtered ancestor captures a fixed element.
- [ ] Add the same rows and note to the table in `docs/src/pages/helpers.astro`, with a short example: a badge pinned with `.position-absolute.top-0.end-0` inside a `.relative` card.
- [ ] Update the `.relative`, `.sticky-top` row in `skills/expressivecss/expressivecss-usage/references/helpers.md`.
- [ ] Add an Added entry to `CHANGELOG.md` under Unreleased.

Completion check: the three docs list the same eight new class names, and `npm run docs:build:astro` succeeds (command from `package.json`, not yet run on this branch).

Covers R10; V7.

## 3. Budget, generated files and verify

Outcome: the branch passes the contributor checks with a reviewed CSS budget.

Prerequisites: groups 1 and 2.

- [ ] Build, read the new CSS gzip size, and add a "Reviewed position and inset helpers" line with the delta to the CSS budget in `tests/selective-builds.test.js`. Take the base size from the merge base, not from a moved `origin/master`.
- [ ] Run `npm run build:skill` after the last edit, then `npm run check:generated`.
- [ ] Run `npm run verify`, then `npm test --prefix mcp/expressivecss`, one suite at a time.
- [ ] If Phase 25 has merged first, rebase, rebuild, and recompute the budget line from the new base.

Completion check: `npm run verify` and the MCP tests pass with no unexpected generated changes.

Covers R11; V8, V9.
