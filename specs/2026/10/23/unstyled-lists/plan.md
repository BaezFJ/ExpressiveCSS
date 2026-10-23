# Plan: unstyled lists

Roadmap phase: Phase 30, unstyled lists. Branch `feature/2026-10-23-unstyled-lists` from `origin/master` at `3ef49121a`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order. Each one ends in a state that can be committed.

All three groups were implemented on 2026-10-23. The CSS budget line moved into group 1, because without it `tests/selective-builds.test.js` fails and the commit would not pass `npm test`.

## 1. Utility class and browser test

Outcome: `.list-unstyled` removes markers and inline-start padding in all three engines, and a browser test proves it.

Prerequisites: none.

- [x] Add the V1 to V3 cases to `tests/helpers-browser.test.js` inside the existing `for (const [engine, browserType, utilityTest] of engines)` loop.
- [x] Run `npm run build:css` and `node --test tests/helpers-browser.test.js`. Confirm the new cases fail and the existing ones pass.
- [x] Add the "Lists" comment and `.list-unstyled { list-style: none; padding-inline-start: 0; }` to `src/sass/utilities/_helpers.scss`.
- [x] Rebuild and rerun the file until it passes.

Completion check: `node --test tests/helpers-browser.test.js` passes in Chromium, Firefox and WebKit.

Covers: R1, R2, R3; V1, V2, V3.

## 2. Semantics rule and docs

Outcome: the semantics checks require `role="list"` on unstyled lists, and the docs and agent guidance teach the class.

Prerequisites: group 1.

- [x] Add the `list-unstyled-has-list-role` rule to `semantics.json` as proposed in requirements.md, then run `npm run build:semantics`.
- [x] Add the "Unstyled lists" subsection to `llm.md` under "Helpers" > "Formatting", with an example on `<ul class="list-unstyled" role="list">` and the reason for the role.
- [x] Add the same subsection to `docs/src/pages/helpers.astro`.
- [x] Add an Added entry to the Unreleased section of `CHANGELOG.md`.
- [x] Run `node --test tests/semantics.test.js` and the V4 negative check.

Completion check: `node --test tests/semantics.test.js` passes, and the V4 negative check fails on markup without the role.

Covers: R4, R5; V4, V5.

## 3. Budget and repository checks

Outcome: the change has a reviewed size, fresh generated files and passing contributor checks.

Prerequisites: group 2.

- [x] Run `npm run build`, then `node --test tests/selective-builds.test.js`. Add a reviewed CSS budget line and raise the CSS gzip bound to the measured size. Done in group 1.
- [x] Run `npm run build:skill` as the last generation step, then `npm run check:generated`.
- [x] Run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one at a time. Rerun a failure alone before debugging it.
- [x] Record each result in validation.md.

Completion check: every check in validation.md shows a result, and none failed for a reason this change causes.

Covers: R6; V6, V7.
