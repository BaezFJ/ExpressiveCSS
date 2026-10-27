# Responsive self-alignment: validation

Date: 2026-10-26
Roadmap phase: Phase 61, responsive self-alignment
Branch: `feature/2026-10-26-responsive-self-alignment`
Base: `origin/master` at `3b9703956823c9c445a0835067915a0e322152a5`
Status: pending; nothing is built yet

This checks [requirements.md](requirements.md) and the work in [plan.md](plan.md), under the [mission's success criteria](../../../../mission.md#success-criteria), [framework testing constraints](../../../../tech-stack.md#framework-testing), and [roadmap Phase 61](../../../../roadmap.md#phase-61-responsive-self-alignment).

## Setup

Run `npm ci` in the worktree, then `npm run build`, because the tests read built bundles. Run one test suite at a time. Close leased browsers in `finally` blocks.

## Requirement coverage

| Requirement | Planned work | Checks | Result |
| --- | --- | --- | --- |
| R1: `.self-auto` | Groups 1, 2 | V1, V2 | Pending |
| R2: window-size prefixes | Groups 1, 2 | V1, V2 | Pending |
| R3: existing classes and siblings unchanged | Groups 1, 2 | V2, V3 | Pending |
| R4: docs and delivery records | Group 3 | V4, V5 | Pending |

## Automated checks

### V1. Every self-alignment class has each prefix

Setup: a build from group 1.

Action: run the new static test in `tests/helpers-browser.test.js` (`node --test tests/helpers-browser.test.js`; command not yet verified for this file).

Expected: for each of `medium`, `expanded`, `large` and `extra-large`, the compiled CSS has `.<size>\:self-auto`, `self-start`, `self-center`, `self-end` and `self-stretch` inside that size's `@media (width >= …)` block, and an unprefixed `.self-auto { align-self: auto }`. Removing one map entry fails the test.

Result: pending.

### V2. One child changes alignment across a breakpoint

Setup: in Chromium, a fixed-height `.flex .align-center` row holds three children: `A` with `self-start expanded:self-end`, `B` with `self-end expanded:self-auto`, and `C` with no class.

Action: read each child's computed `alignSelf` and top offset at 839px and at 840px wide.

Expected: at 839px, `A` sits at the top, `B` at the bottom and `C` in the middle. At 840px, `A` sits at the bottom, `B` returns to the middle with `alignSelf` of `auto`, and `C` stays in the middle at both widths.

Result: pending.

### V3. Existing helpers keep their behavior

Action: run the existing tests in `tests/helpers-browser.test.js`, including "window-size prefixes switch layout from their size class up" and the check that position helpers have no prefixed forms.

Expected: they pass unchanged. The unprefixed `.self-start`, `.self-center`, `.self-end` and `.self-stretch` still compile to `flex-start`, `center`, `flex-end` and `stretch`.

Result: pending.

### V4. Generated guidance agrees with `llm.md`

Action: run `npm run build:skill` after the last edit, then `npm run check:generated`.

Expected: the check passes, and `skills/expressivecss/expressivecss-usage/references/helpers.md` lists `.self-auto` and the prefixed self-alignment classes.

Result: pending.

### V5. Contributor checks and gzip budget

Action: run `npm run verify`.

Expected: it passes, including `tests/selective-builds.test.js` with a new reviewed budget line that states the measured CSS gzip size and its delta from the merge base.

Result: pending.

## Manual checks

None required. The helpers docs page renders the updated table; a visual check is optional.

## Merge conditions

- V1 to V5 pass on the final commit.
- No other test in `npm run verify` regresses. Known flaky browser tests are rerun alone before they count as failures.
- Conflicts with Phases 59, 60 and 62 in `_helpers.scss`, the docs tables, `llm.md`, `CHANGELOG.md` and the gzip budget are resolved, and `npm run build:skill` and V5 are rerun after the merge.
- Required CI checks pass and review is complete.
