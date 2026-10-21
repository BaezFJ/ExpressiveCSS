# Validation: tooltip shared delay

Roadmap phase: Phase 18, tooltip shared delay. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

The agent owns every check below. Tests run against built bundles, and the browser and budget tests read the built CSS too, so build first with `npm run build`. Run suites one at a time, since parallel runs flake.

## Specification verification

On 2026-10-21 the agent checked that all three documents name Phase 18, that the links resolve, and that every `R` ID has planned work and a `V` check. An independent `Plan` subagent then reviewed the spec against the mission, stack, roadmap and `tooltip.ts`, without the agent's reasoning. It raised fourteen findings. The agent checked them against the source and changed the spec:

- Module state carries over between jsdom cases, and a mocked `Date` restarts at the given `now`. The first design, a module `Set` of showing instances plus one last-hide time, would have skipped delays in later cases and kept a destroyed or detached instance alive. The design changed to two timestamps written by `close()`, and each case starts its mocked clock later than the last.
- The browser and budget tests read built CSS, so the plan builds with `npm run build`.
- A tooltip held open used to count as "showing" and would have turned off `enterDelay` page-wide. Now only a closing tooltip opens the window, as the roadmap says.
- Added: the tooltip's own close counts, the `enterDelay` rows and JSDoc change with the docs, two more Tooltip suites join V7, the MCP tests run, a fallow audit row (V10), and test notes on mocked tick timing and on asserting "not visible".
- The finding about updating state before `_notify` no longer applies, since `_reportShown` is unchanged.

## Automated checks

V1 to V5 are jsdom cases in `tests/tooltip.test.js`, run with `node --test tests/tooltip.test.js`. Each uses two triggers A and B with `enterDelay: 500`, `inDuration: 0` and `outDuration: 0`, and mocks `setTimeout` and `Date` with `t.mock.timers`. Each case starts its mocked clock later than real time and later than the previous case. A mocked timer reads the clock at the end of the tick that fires it, so each case ticks a hide on its own before advancing further. "Hidden" means `style.visibility` is not `visible`, since a tooltip that never showed has no value there.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1 | `exitDelay: 0`. | Hover A and advance 500 ms so it shows. Leave A and tick its hide. Advance 200 ms, hover B and fire its zero-delay timer. | B is visible without waiting 500 ms. | Passed 2026-10-21. Failed before the change: B stayed hidden. |
| V2 | R2 | `exitDelay: 200`. | Hover A until it shows. Leave A and hover B at once, then advance 1 ms. | B is visible while A is still in its exit delay. | Passed 2026-10-21. Failed before the change: B stayed hidden. |
| V3 | R3 | `exitDelay: 0`. | Show A, leave it and tick its hide. Advance 400 ms, hover B and advance 1 ms, then the rest of 500 ms. Then, in a second part, show A with `open()` and keep it open while B is hovered. | B is hidden after 1 ms and visible after 500 ms. With A open and not closing, B also waits its delay. | Passed 2026-10-21. |
| V4 | R4 | `exitDelay: 0`. | Hover A and leave it after 100 ms, before it shows. Hover B and advance 1 ms, then the rest of 500 ms. | B waits its full delay. | Passed 2026-10-21. |
| V5 | R5 | `exitDelay: 0`. | Show A, then destroy it without leaving. Hover B and advance 1 ms, then the rest of 500 ms. | B waits its full delay. | Passed 2026-10-21. |
| V6 | R1, R2, R3 | `tests/tooltip-shared-delay-browser.test.js` in Chromium, Firefox and WebKit: a toolbar with two buttons, `enterDelay: 1000`, default `exitDelay`. | With `page.mouse`, hover A until it shows, move to B and check after 400 ms. Move away, wait 1,500 ms, hover A again and check after 400 ms and after the delay. | B shows before its delay ends. After the window, A is hidden at 400 ms and shows after its delay. | Passed 2026-10-21 in Chromium, Firefox and WebKit (3 of 3). |
| V7 | R6 | Existing suites. | Run `tests/tooltip.test.js`, `tests/tooltip-touch-browser.test.js`, `tests/tooltip-shadow-browser.test.js`, `tests/shadow-delegation-browser.test.js`, `tests/remaining-events.test.js`, `tests/keyboard-focus.test.js`, `tests/anchor-positioning-browser.test.js` and `tests/expressivecss-lifecycle-browser.test.js`, one file at a time with `node --test`. | All pass. | Passed 2026-10-21, one file at a time: tooltip 12 (15 after the review fixes), touch 9, tooltip shadow 3, shadow delegation 3, remaining events 8, keyboard focus 10, anchor positioning 9, lifecycle 8. |
| V8 | R7 | Plan group 3 edits. | `npm run build:skill`, then `npm run check:generated` and `npm test --prefix mcp/expressivecss`. Read the Tooltips Initialization text and `enterDelay` rows in `llm.md` and the docs page, the JSDoc and the changelog. | Generation is clean, the MCP tests pass, the texts describe the window, and the changelog has the Changed entry. | Passed 2026-10-21. `check:generated` reported 84 guides current. The MCP smoke test passed after `npm ci --prefix mcp/expressivecss`. Every guide's contract hash changed with `llm.md`; only the Tooltips guide changed otherwise. |
| V9 | R8 | A fresh build. | `node --test tests/selective-builds.test.js`. | Passes with a reviewed budget line naming this change and its gzip bytes. | Passed 2026-10-21: JavaScript 89,556 gzip bytes (+86), after the review fixes. After rebasing onto `774b0d27`, 89,846 (+84 over master's 89,762). CSS did not change. |
| V11 | R1, R2 | `exitDelay: 200`. | Show A and leave it. Hover B at +450 ms. Show B, leave it, and hover A 560 ms later. | B shows at once inside `exitDelay` + 300 ms. A waits its delay past that. A window of only 300 ms, or one longer than 560 ms, fails the case. | Passed 2026-10-21. Added after the final review. |
| V12 | R2 | A has `exitDelay: 2000`, B has `0`. | Show A and leave it; hover B, then leave B; 500 ms later hover B again. | B shows at once while A is still closing. | Passed 2026-10-21. Added after the final review. |
| V10 | R8 | The changed source. | `npx fallow audit --base 8d45c2c4 --quiet`. | No new complexity finding in `tooltip.ts`. | Passed 2026-10-21, exit 0. The five complexity findings it lists in `tooltip.ts` (`destroy`, `_appendTooltipEl`, the `_animate` timer arrow, `_handleMouseLeave`, `_handleBlur`) are in functions this change did not touch. |

## Repository checks

`npm run verify` runs once near the end. The fallow pre-commit gate runs again on commit.

Result: `npm run verify` ran on 2026-10-21 after the final-review fixes: 2,340 tests, 2,339 passed and 1 failed. The failure was "oversized streams and guide sets stop within the operator limits" in `tests/expressivecss-codex-adapter.test.js` ("Codex exceeded 3000ms"), a known load flake in code this change does not touch. Run alone, that file passed 14 of 14.

## Manual checks

None are required for merge. Moving a mouse across a toolbar on the docs Tooltips page with `enterDelay` set is a useful extra check.

## Merge conditions

- V1 to V12 pass.
- `npm run verify` passes, with any unrelated browser flake rerun alone and recorded.
- CI passes on the pull request.

## Final review

After the checks ran, an independent `Plan` subagent reviewed `git diff 8d45c2c4` and the untracked files against this spec, without the agent's reasoning. It traced R1 to R8 to code and evidence, recomputed the V9 gzip size from the built bundle, and found no scope outside Phase 18 and no result recorded without a run. The agent checked its findings against the source and fixed these:

- The changelog had a second `### Changed` heading under Unreleased. The entry moved into the existing section.
- The docs said "within 300 ms after it hid", but the window ends 300 ms after the closing tooltip's `exitDelay`, when the fade starts. `llm.md`, the docs page, the JSDoc and the changelog now say that.
- A later close with a shorter `exitDelay` overwrote the window end while an earlier tooltip was still closing. The window now only grows while it is open (V12).
- No case pinned the `exitDelay` part of the window or its upper bound (V11).
- The browser test's delay went from 1,000 ms to 2,000 ms to leave more room under load.

Its note that a tooltip reopened during its own `exitDelay` keeps the window set is recorded as a known limit in [requirements.md](requirements.md#decisions). After the fixes, the build, `tests/tooltip.test.js` (14), the browser test (3), the touch test (9), `check:generated`, the budget test and the fallow audit passed again.

## Code review

On 2026-10-21 the agent reviewed the full diff against `8d45c2c4` for correctness, readability, architecture, security and performance, and tested the tests by mutation. Each mutation was built, run against `tests/tooltip.test.js` and reverted:

| Mutation in `tooltip.ts` | Case that failed |
| --- | --- |
| Drop the `_shown` guard in `close()` | a tooltip closed before it showed opens no window |
| Drop `now >= skipDelayFrom` | a clock set back before the window opened is outside it (added in this review) |
| Replace `Math.max` with the new end | a shorter exitDelay closing later does not cut the window short |
| Drop `exitDelay` from the window end | the window follows the closing tooltip's exitDelay, then 300 ms more |

The `Math.max` mutation first survived. The case re-hovered B before B's hide had run, because a mocked `tick()` does not fire timers scheduled during that same tick, so B still read as visible. The case now flushes B's hide and asserts B is hidden before the re-hover. No security or performance concerns: the change adds two numbers of module state and one comparison per open. After the fixes the build and `tests/tooltip.test.js` (15 of 15) passed.
