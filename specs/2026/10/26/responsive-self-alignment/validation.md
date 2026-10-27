# Responsive self-alignment: validation

Date: 2026-10-26
Roadmap phase: Phase 61, responsive self-alignment
Branch: `feature/2026-10-26-responsive-self-alignment`
Base: `origin/master` at `ec8acb904f0be18df113078fcadf58ea66431b5a` (rebased from `3b9703956` after Phases 59 and 60 merged)
Status: automated checks passed on 2026-10-26; CI and review pending

This checks [requirements.md](requirements.md) and the work in [plan.md](plan.md), under the [mission's success criteria](../../../../mission.md#success-criteria), [framework testing constraints](../../../../tech-stack.md#framework-testing), and [roadmap Phase 61](../../../../roadmap.md#phase-61-responsive-self-alignment).

## Setup

Run `npm ci` in the worktree, then `npm run build`, because the tests read built bundles. Run one test suite at a time. Close leased browsers in `finally` blocks.

## Requirement coverage

| Requirement | Planned work | Checks | Result |
| --- | --- | --- | --- |
| R1: `.self-auto` | Groups 1, 2 | V1, V2 | Passed |
| R2: window-size prefixes | Groups 1, 2 | V1, V2 | Passed |
| R3: existing classes and siblings unchanged | Groups 1, 2 | V2, V3 | Passed |
| R4: docs and delivery records | Group 3 | V4, V5 | Passed |

## Automated checks

### V1. Every self-alignment class has each prefix

Setup: a build from group 1.

Action: run the new static test in `tests/helpers-browser.test.js` (`node --test tests/helpers-browser.test.js`).

Expected: for each of `medium`, `expanded`, `large` and `extra-large`, the compiled CSS has `.<size>\:self-auto`, `self-start`, `self-center`, `self-end` and `self-stretch` inside that size's `@media (width >= …)` block, and an unprefixed `.self-auto { align-self: auto }`. Removing one map entry fails the test.

Result: passed. Both new tests failed against the base Sass and pass on the branch.

### V2. One child changes alignment across a breakpoint

Setup: in Chromium, a fixed-height `.flex .align-center` row holds three children: `A` with `self-start expanded:self-end`, `B` with `self-end expanded:self-auto`, and `C` with no class.

Action: read each child's computed `alignSelf` and top offset at 839px and at 840px wide.

Expected: at 839px, `A` sits at the top, `B` at the bottom and `C` in the middle. At 840px, `A` sits at the bottom, `B` returns to the middle with `alignSelf` of `auto`, and `C` stays in the middle at both widths.

Result: passed in Chromium.

### V3. Existing helpers keep their behavior

Action: run the existing tests in `tests/helpers-browser.test.js`, including "window-size prefixes switch layout from their size class up" and the check that position helpers have no prefixed forms.

Expected: they pass unchanged. The unprefixed `.self-start`, `.self-center`, `.self-end` and `.self-stretch` still compile to `flex-start`, `center`, `flex-end` and `stretch`.

Result: passed. All 47 tests in `tests/helpers-browser.test.js` pass.

### V4. Generated guidance agrees with `llm.md`

Action: run `npm run build:skill` after the last edit, then `npm run check:generated`.

Expected: the check passes, and the regenerated skill and MCP copies carry the new contract hash. The hand-written `references/helpers.md` lists `.self-auto` and the prefixed self-alignment classes.

Result: passed. `npm run check:generated` reports SEMANTICS.md and the 99 component guides current.

### V5. Contributor checks and gzip budget

Action: run `npm run verify`.

Expected: it passes, including `tests/selective-builds.test.js` with a new reviewed budget line that states the measured CSS gzip size and its delta from the merge base.

Result: passed after reruns. Before the rebase, CSS was 90,165 gzip bytes, 93 more than `3b9703956`'s 90,072. On the rebased branch it is 90,559, 88 more than the Phase 60 base's 90,471. The first `npm run verify` run had 8 failures out of 3,236 tests, all in unrelated files: Firefox chart update, keypad, rail panel and popover, Chromium sheet spring, the Codex adapter oversized-streams test and two skill benchmark maintenance tests. Each of those 7 files passed when rerun alone. The steps verify skipped then passed: `check:generated`, `docs:build:astro` (130 pages) and `docs:verify`. `npm test --prefix mcp/expressivecss` passed too. After the rebase onto `ec8acb904`, `npm run verify` passed 3,286 of 3,286 tests with no reruns, and the MCP smoke test passed again.

## Manual checks

None required. The helpers docs page renders the updated table; a visual check is optional.

## Merge conditions

- V1 to V5 pass on the final commit.
- No other test in `npm run verify` regresses. Known flaky browser tests are rerun alone before they count as failures.
- Conflicts with Phases 59, 60 and 62 in `_helpers.scss`, the docs tables, `llm.md`, `CHANGELOG.md` and the gzip budget are resolved, and `npm run build:skill` and V5 are rerun after the merge.
- Required CI checks pass and review is complete.
