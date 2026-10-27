# Responsive self-alignment: implementation plan

Date: 2026-10-26
Roadmap phase: Phase 61, responsive self-alignment
Branch: `feature/2026-10-26-responsive-self-alignment`
Base: `origin/master` at `3b9703956823c9c445a0835067915a0e322152a5`
Status: not started

Scope is defined in [requirements.md](requirements.md), under the [mission](../../../../mission.md#agreed-scope), [framework constraints](../../../../tech-stack.md#framework-constraints), and [roadmap Phase 61](../../../../roadmap.md#phase-61-responsive-self-alignment). Checks are defined in [validation.md](validation.md).

## 1. Add the self-alignment classes to the layout map

Outcome: the compiled CSS has `.self-auto` and a prefixed copy of every `.self-*` class.

Prerequisite: the branch is at the recorded base and `npm ci` has run in this worktree. Covers R1 to R3 through V1.

- [ ] In `src/sass/utilities/_helpers.scss`, add `"self-auto": (align-self: auto)` and the four existing `.self-*` declarations to `$_layout`, after the `align-*` entries.
- [ ] Delete the four standalone `.self-*` rules under the "On a flex or grid child" comment. Leave `.flex-1`, `.flex-none`, `.shrink-0` and `.order-*` where they are; Phases 60 and 62 own them.
- [ ] Run `npm run build` and confirm `dist` CSS contains `.self-auto` and `.expanded\:self-end` inside the 840px media block.

Completion check: the build succeeds, and the unprefixed `.self-start`, `.self-center`, `.self-end` and `.self-stretch` declarations match the base commit.

## 2. Cover the classes with tests

Outcome: a static check and a Chromium test fail if a prefix or `.self-auto` goes missing.

Prerequisite: group 1. Covers R1 to R3 through V1 to V3.

- [ ] In `tests/helpers-browser.test.js`, add a static test beside the line-clamp one that loops over the four prefixes and the five `.self-*` names and matches each selector inside its `@media (width >= …)` block.
- [ ] Add a Chromium `browserTest` using `leaseBrowser(chromium)`: a `.flex .align-center` row of fixed height with three children. Give one child `self-start expanded:self-end`, another `self-end expanded:self-auto`, and leave the third without a class. Read `alignSelf` and each child's top offset at 839px and 840px, and close the browser in `finally`.
- [ ] Build, then run the helpers tests alone. Run the existing helpers and layout tests to confirm nothing else moved.

Completion check: V1 and V2 pass on the group 1 build and fail when the map entries are reverted. V3 passes.

## 3. Document the classes and finish delivery

Outcome: docs and generated guidance list the new class and prefixes, and the branch passes the contributor checks.

Prerequisite: group 2. Covers R4 through V4 and V5.

- [ ] Add `.self-auto` to the `.self-*` row in `docs/src/pages/helpers.astro` and `llm.md`, saying it returns the child to the parent's `align-items`.
- [ ] Add the `.self-*` classes to the class list in the `llm.md` "Window-size prefixes" paragraph, with one short example such as `self-center expanded:self-auto`.
- [ ] Add an Unreleased entry to `CHANGELOG.md`.
- [ ] Measure the CSS gzip size against the merge-base build and add a reviewed budget line to `tests/selective-builds.test.js`.
- [ ] Run `npm run build:skill` after the last edit, then `npm run check:generated` and `npm run verify`.

Completion check: V4 and V5 pass, and `git status` shows no stale generated files.
