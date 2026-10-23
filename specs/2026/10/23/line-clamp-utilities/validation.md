# Validation: line clamp utilities

Roadmap phase: Phase 25, line clamp utilities. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

The agent ran every check on 2026-10-23 on this branch. Tests run against built bundles, so build first with `npm run build:css`. Run suites one at a time, since parallel browser runs flake.

## Automated checks

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R2, R3 | A Playwright case in the engine loop of `tests/helpers-browser.test.js`. A paragraph of at least six lines at 240px wide, with `line-height: 20px` and no block padding or border, rendered once per class: `line-clamp-1`, `line-clamp-2`, `line-clamp-3`, `line-clamp-none`, and no class. | Read each paragraph's `getBoundingClientRect().height` and its computed `-webkit-line-clamp`. Run `node --test tests/helpers-browser.test.js`. | Heights are 20, 40 and 60px for the three clamps, within 1px. `line-clamp-none` has the same height as the unclassed paragraph, which is more than 60px. Computed `-webkit-line-clamp` is the class's count, and `none` for `line-clamp-none`. Passes in Chromium, Firefox and WebKit, and fails against a build without the classes. | Passed 2026-10-23 in all three engines. Against the base build it failed in each engine, with `line-clamp-1` heights of 420px (Chromium) and 480px (Firefox, WebKit). The `line-clamp-none` case puts `line-clamp-2 line-clamp-none` on one element, so it also checks that `none` comes later in the source. |
| V2 | R6 | A fresh build. | `node --test tests/selective-builds.test.js` | Passes with a new reviewed budget line that names this change and the CSS gzip bytes. The JavaScript size does not change. | Passed 2026-10-23: CSS 85,005 gzip bytes (+186 from 84,819 at the base). |
| V3 | R4 | The built `dist/css/expressive.css`, read by `tests/helpers-browser.test.js`. | Assert that each of the four classes appears with each of the four prefixes, and that `.expanded\:line-clamp-none` sits inside the Expanded `@media` rule. | All 16 prefixed selectors are present, inside their media queries. | Passed 2026-10-23, and failed against the base build. This is a static check. The user chose not to add a two-width browser test, so nothing measures a prefixed clamp in a browser. |
| V4 | R5, R6 | Plan group 3 edits, with `npm run build:skill` run last. | `npm run check:generated` | Generation is clean, and the skill and MCP guides carry the new `llm.md` text. | Passed 2026-10-23. All 84 guides are current; each changed only in its contract hash. |
| V5 | R1 to R6 | All changes in place. | `npm run verify` | Passes. That covers the build, typecheck, the full test run, `check:generated` and the docs build and verification. | Passed 2026-10-23: 2,577 tests, 2,574 passed, 3 skipped, none failed. |

## Regression checks

- V1 runs in the same file as the other helper browser cases. They must pass unchanged.
- Carousel, navbar and snackbar do not change. The existing suites in `npm run verify` cover them.
- The MCP package bundles the generated guides, so run `npm test --prefix mcp/expressivecss` and `npm run verify:packages` before submitting, as `tech-stack.md` asks. Both passed on 2026-10-23.

## Manual checks

None required. The user chose not to require a manual docs check before merge.

## Merge conditions

- V1 to V5 pass.
- The regression checks pass. A failure in a file this change does not touch gets rerun alone before anyone debugs it.
- The repository's required CI checks and reviews are done.
