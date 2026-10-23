# Validation: unstyled lists

Roadmap phase: Phase 30, unstyled lists. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

The agent ran every check below on 2026-10-23 on branch `feature/2026-10-23-unstyled-lists`. Tests run against built bundles, so build first. Run suites one at a time, since parallel browser runs flake.

## Automated checks

V1 to V3 are Playwright cases in `tests/helpers-browser.test.js`, run in Chromium, Firefox and WebKit with `node --test tests/helpers-browser.test.js` after `npm run build:css`. Against the bundle built before the change, the case failed in all three engines on the first list it read: 40px padding, `disc` markers and a 40px start offset.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R2 | A page with `<ul class="list-unstyled" role="list">` and `<ol class="list-unstyled" role="list">`, three items each, and a plain `<ul>` for comparison. Load it once with `dir="ltr"` and once with `dir="rtl"` on `<html>`, in each engine. | Read each list's computed `padding-inline-start`, `margin-block-start` and `margin-block-end`, each item's computed `list-style-type` and `display`, and the bounding rects of each list and its first item. | Unstyled lists: padding `0px`; block margins equal the plain list's; every item has `list-style-type: none` and `display: list-item`. The first item's left edge equals the list's left edge in LTR, and its right edge equals the list's right edge in RTL. The plain list still has a nonzero padding and `disc` markers. | Passed 2026-10-23 in Chromium, Firefox and WebKit. The lists sit in their own `div`, because a list that is the body's first child had a 0px top margin in one engine, which made the margin comparison depend on position. |
| V2 | R3 | A `ul.list-unstyled[role="list"]` whose second item holds a plain nested `<ul>` with two items, in each engine. | Read the nested list's computed `padding-inline-start` and its items' `list-style-type`. | The nested list keeps a nonzero padding, and its items' `list-style-type` is not `none`. | Passed 2026-10-23 in all three engines. |
| V3 | R2 | The V1 lists in each engine, plus a `ul.list-unstyled` without `role`. | Call `ariaSnapshot()` on each list. | Each snapshot shows a `list` with three `listitem` children. Playwright computes these roles itself, so this guards the markup and does not show WebKit's native tree (see requirements.md, "Known limits"). | Passed 2026-10-23 in all three engines, including the list without `role`. |
| V4 | R4 | The rule in `semantics.json`. | Run `node --test tests/semantics.test.js`. Then run the rule against `<ul class="list-unstyled"><li>A</li></ul>` and against the same list with `role="list"`, through the helper the semantics test uses to check one example. If no such helper exists, add a test case that does this. | The test file passes. The list without the role breaks the rule with its message, and the list with the role passes. | Passed 2026-10-23: semantics 30 of 30. No single-example helper existed, so `tests/semantics.test.js` gained the case "an unstyled list must state its role". It calls `violations()` and finds one violation on a `ul` or `ol` with no role, and none with `role="list"`, with `role="none"` or on a plain list. Mutations caught: limiting the selector to `ul`, and dropping `:not([role])`. |
| V5 | R5, R4 | Plan group 2 edits. | `npm run build:semantics`, `npm run build:skill`, then `npm run check:generated`. Read the new subsection in `llm.md` and the helpers docs page, and the changelog entry. | Generation is clean, and `SEMANTICS.md` lists the rule. Both docs name `.list-unstyled`, its two declarations and the reason for `role="list"`, and their examples carry the role. The changelog has the Added entry. | Passed 2026-10-23. `SEMANTICS.md` gained the rule, the generated `lists` guide and the MCP semantics data carry it, and `npm run test:skill` passed 248 of 248. |
| V6 | R6 | A fresh `npm run build`. | `node --test tests/selective-builds.test.js`. | The test passes with a reviewed CSS budget line naming this change and its gzip bytes. JavaScript size is unchanged. | Passed 2026-10-23: CSS 84,840 gzip bytes (+21 from 84,819). The budget line landed with the class in plan group 1. After the rebase onto #406 (line clamp utilities, 85,005), the bound was 85,026, still +21. After merging #408 (opacity helpers, 85,049), it is 85,068, +19. |

## Regression checks

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V7 | R1 to R6 | Run `npm run verify`, then `npm test --prefix mcp/expressivecss`, then `npm run verify:packages`, one at a time. | All pass. That includes the existing helpers, list, prose and semantics tests, and the MCP smoke test, which `verify` skips. A failure in a file this change does not touch is rerun alone before anyone debugs it. | Passed 2026-10-23 after reruns. `npm run verify` ran 2,577 tests: 2,572 passed, 3 skipped, and 2 failed in files this change does not touch (`expressivecss-codex-adapter` oversized streams, `docker-runner` SIGINT and SIGTERM). Both files then passed alone (14 and 3), and the steps the failure skipped (`check:generated`, `docs:build:astro`, `docs:verify`) passed. The first MCP and package runs failed because `mcp/expressivecss` had no installed dependencies in this worktree; after `npm ci --prefix mcp/expressivecss`, the MCP smoke test and `npm run verify:packages` passed. After the rule was narrowed, the semantics, skill (251) and docs checks, `check:generated`, the MCP smoke test and `verify:packages` passed again. The smoke test first hit its static-inspection time limit at a load average of 135; once the load fell, it passed with both the old and the new semantics data, alternating between them. |

## Manual checks

None. The user left a Safari and VoiceOver check out of the merge conditions, so WebKit's native list role stays unverified.

## Merge conditions

- V1 to V7 pass, and V1 and V2 were seen failing before the change. Met locally on 2026-10-23.
- `npm run build:skill` ran after the last edit, and `npm run check:generated` is clean.
- The repository's required CI checks and review pass on the pull request. Pending: no pull request is open.
