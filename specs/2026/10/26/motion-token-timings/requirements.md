# Motion tokens for transition timings

Date: 2026-10-26
Roadmap phase: Phase 57, read motion tokens for hardcoded transition timings
Branch: `fix/motion-token-timings`
Base: local `origin/master` at `a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20`
Status: specification only; implementation and acceptance checks are pending

Follow the [mission's product rules](../../../../mission.md#product-rules) and [success criteria](../../../../mission.md#success-criteria), the [framework constraints](../../../../tech-stack.md#framework-constraints), and [roadmap Phase 57](../../../../roadmap.md#phase-57-read-motion-tokens-for-hardcoded-transition-timings). Work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The user explicitly selected Phase 57. It has no dependencies and can proceed independently of phases 55 and 56. Phases 52, 53 and 54 have implementation evidence in the base history, including their Sass changes and regression tests in PRs #440, #441 and #442, although the roadmap still lacks their completion lines. This specification does not change the roadmap's completion state. The review finding behind Phase 57 is L2 in `TASKS.md`.

## Current behavior

These facts come from the base commit's source.

- `src/sass/components/_timepicker.scss` gives `.timepicker-canvas` an opacity transition of 175ms. The dial already reads `--md-sys-motion-duration-medium3`. Both selectors have local reduced-motion resets.
- `src/sass/components/_expanding-card.scss` gives expanded detail content a literal 180ms transition delay. Its opacity and transform durations already read the card's effects and spatial spring tokens. The close button's separate delay already reads `--md-sys-motion-duration-short3`.
- `src/sass/tokens/_motion.scss` defines `short3` as 150ms and `short4` as 200ms. Its reduced-motion rules zero system durations, and the expanding-card partial also cancels transitions locally.
- `Timepicker` in `src/ts/components/timepicker.ts` has a public `duration` option and timers for changing views and resetting the clock hand. CSS token overrides do not configure those timers. `ExpandingCard` in `src/ts/components/expandingCard.ts` follows the actual container clip transition for close cleanup.
- Existing checks include `tests/expanding-card.test.js`, `tests/expanding-card-browser.test.js`, `tests/reduced-motion.test.js`, and the Timepicker seconds and time-range suites. Browser checks use built bundles and `tests/browser.js` for Chromium, Firefox and WebKit.

The literal timings prevent authors from adjusting these two effects through motion tokens. This phase connects them to existing system durations and exposes a separate card content-delay setting.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | `.timepicker-canvas` reads `--md-sys-motion-duration-short3` for its opacity transition duration. The default changes from 175ms to 150ms. Changing the system token on the page changes the computed duration without rebuilding or reinitializing the component. Its opacity states and easing remain unchanged. |
| R2 | `article.expanding-card` declares `--md-comp-expanding-card-content-delay: var(--md-sys-motion-duration-short4)`. Expanded direct-child `.expanding-card-content` reads that property for its transition delay, covering both opacity and transform. The default changes from 180ms to 200ms. A page-level system-token override and an override of the component property on the article both change the computed delay without rebuilding or reinitializing. A zero component delay is valid. |
| R3 | With `prefers-reduced-motion: reduce`, neither target animates. Preserve the local transition resets so this also holds when authors set nonzero system durations or a nonzero card content delay. The effects must reach their final states without an animation. |
| R4 | Keep the changes in the two shared Sass partials. Preserve selectors, markup, exports, accessibility behavior, card spring duration/easing pairs, the card close-button delay, and the Timepicker dial timing. Keep TypeScript, the public Timepicker `duration` option, its timers, and expanding-card cleanup behavior unchanged. |
| R5 | Document the CSS timing controls and their new defaults in the relevant component docs and `llm.md`, including the separation from Timepicker's JavaScript timers. Record the timing changes under Unreleased in `CHANGELOG.md`, review the CSS gzip change in `tests/selective-builds.test.js`, and regenerate affected guidance from its sources. |

## Confirmed decisions and reasons

The user confirmed these choices in the feature-spec interview on 2026-10-26.

- Use `fix/motion-token-timings` from the local `origin/master` revision above. Divide implementation into regression checks, shared Sass changes, then docs and verification.
- Use `short3` for the canvas, as `TASKS.md` recommends. Add the card's dedicated delay property backed by `short4`, so authors can change the delay independently of its spring duration. The default remains close to the previous 180ms delay.
- Preserve reduced-motion resets and leave JavaScript timers and other effects unchanged. Token overrides control these CSS effects only.
- Require failing-before and passing-after browser checks in all three engines, reduced motion with overrides, existing regressions, gzip review, generated-data and contributor/package checks, and the repository's visual review before merge.

## Scope and constraints

The implementation includes the two timing declarations, the new property beside the card's existing motion properties, focused tests, and the documentation and generated files required by R5. Use the existing Sass module structure and motion tokens. Add no dependencies, runtime API, helper abstraction, or system token.

Excluded are other literal timings, a motion audit, changes to spring curves, synchronization of Timepicker timers with CSS, other stylesheet roadmap phases, and publication. The default timing changes are intentional and must be documented. Large CSS-duration overrides can outlast Timepicker's existing timers; synchronizing them is outside this phase.

Tests read built bundles. Follow `CONTRIBUTING.md`, `src/sass/README.md`, and `docs/development-notes.md`; keep suites sequential and clean up components, pages, browser leases and timers in `finally` blocks. Generated guidance must come from its canonical source files. Review affected source pins and evidence when generation reports stale data; generation alone does not renew browser evidence.

## Open decisions

None. All three interview categories have answers. Test commands are planned checks, not evidence of a pass.
