# Plan: pointer utilities

Roadmap phase: Phase 28, pointer utilities. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md). See [roadmap Phase 28](../../../../roadmap.md#phase-28-pointer-utilities).

Run test suites one at a time; parallel browser runs flake.

## 1. Sass classes and gzip budget

Prerequisites: the branch at `3ef49121a` with `npm ci` run in the worktree.

- [x] Add `.pointer-events-none`, `.pointer-events-auto` and `.cursor-pointer` to `src/sass/utilities/_helpers.scss`, with a short comment on when to use each. Keep them out of `$_layout`.
- [x] Run `npm run build:css` and confirm the three rules sit inside `@layer utilities` in `dist/css/expressive.css` and in the output of a selective build with `$utilities: ("helpers")`.
- [x] Measure the CSS gzip size from the merge base and from the branch. Add a `// Reviewed pointer utilities: N gzip bytes (+D).` line to `tests/selective-builds.test.js` and update the CSS assertion to N.

Completion check: V2 passes, and `node --test tests/selective-builds.test.js` passes (V3).

Covers: R1, R2, R3, R4, R9.

## 2. Click-through browser test

Prerequisites: group 1.

- [x] Add a test to the `engines` loop in `tests/helpers-browser.test.js`. A `.relative` box holds a target button, and a `.pointer-events-none` overlay with `inset: 0` covers it. The overlay holds a `.pointer-events-auto` button placed away from the target.
- [x] Click the target's center and the child's center with `page.mouse.click`. `locator.click()` would refuse the covered target, so it can't be used here.
- [x] Record click counts on the target, the overlay and the child, then assert them. Tear the browser down in `finally`.
- [x] Remove the class from the overlay and confirm the test fails, then restore it.

Completion check: V1 passes in Chromium, Firefox and WebKit, and fails without the class.

Covers: R1, R2.

## 3. Docs, changelog and generated data

Prerequisites: groups 1 and 2, since `build:skill` hashes the tests.

- [x] Add a "Pointer" subsection to Helpers in `llm.md`, between "Formatting" and "Browser defaults". It has a class table, an overlay example with a clickable child, and the keyboard and cursor notes from R6 and R7.
- [x] Add the matching section to `docs/src/pages/helpers.astro`, with a `{ id: "pointer", label: "Pointer" }` entry in its section list.
- [x] Add an Unreleased, Added entry to `CHANGELOG.md`.
- [x] Run `npm run build:skill` after the last edit, then `npm run check:generated`.
- [x] Run `npm run verify`, then `npm test --prefix mcp/expressivecss`.

Completion check: V4, V5 and V6 pass.

Covers: R5, R6, R7, R8, R10.
