# Hover card plan

Roadmap phase: [Phase 45, hover card](../../../../roadmap.md#phase-45-hover-card). Requirements are in [requirements.md](requirements.md); checks are in [validation.md](validation.md).

Branch: `feature/2026-10-25-hover-card`, from `origin/master` at `a9bbf77ad`.

## 1. Markup contract and semantics row

Outcome: `semantics.json` describes valid hover card markup and flags the three broken forms.

- [x] Add a `hover-card` row to `semantics.json` with rules for a non-link trigger, a missing `aria-details`, and an `aria-details` id that names no `[popover]` element. Model the idref rule on Popover's `popover-target-exists`.
- [x] Run `npm run build:semantics`.
- [x] Add passing and failing cases to the semantics tests.

Prerequisites: none.
Completion check: V11 passes.
Covers: R1; V11.

## 2. Component and AutoInit wiring

Outcome: `HoverCard` exists, starts from AutoInit, reads its options and cleans up after itself, with no hover behavior yet.

- [x] Write `src/ts/components/hoverCard.ts` with `HoverCardOptions` (`enterDelay` 500, `exitDelay` 300), card lookup from `aria-details`, the console error for a missing card, `open()`, `close()`, the `open` and `close` events and `destroy()`.
- [x] Export it from `src/ts/components/index.ts` and register `.hover-card-trigger` in `src/ts/components/registry.ts`.
- [x] Add the `tests/fixtures.js` entry and update `AUTO_INIT_FIXTURES.length` in `tests/autoinit.test.js`.
- [x] Write the jsdom tests for options, methods, events, destroy and the missing card.

Prerequisites: group 1, since the semantics roster test fails for a registered component without a row.
Completion check: V4, V9, V10 and V12 pass.
Covers: R2, R8; V4, V9, V10, V12.

## 3. Pointer hover

Outcome: hovering the link opens the card after the delay, and the card stays while the pointer is on the link or the card.

- [x] Add `mouseenter` and `mouseleave` on the link and the card, with the enter and exit timers, `showPopover({ source: link })` and `hidePopover()`.
- [x] Ignore touch pointers and the mouse events that echo a tap, without touching the click.
- [x] Write the jsdom tests for the pass-over, the return within `exitDelay` and touch.
- [x] Write the browser test for the roadmap's check in three engines.

Prerequisites: group 2.
Completion check: V1, V5, V6 and V7 pass.
Covers: R3, R4, R7; V1, V5, V6, V7.

## 4. Keyboard focus and Escape

Outcome: keyboard focus opens the card, Tab reaches its content, and Escape closes it.

- [x] Open on `focus` that matches `:focus-visible` and keep the card while focus is on the link or inside the card. Close after `exitDelay` once focus and pointer have left both.
- [x] Close at once on Escape, return focus to the link when it was inside the card, and stop the key only when focus is on the link or in the card.
- [x] Write the jsdom test for Escape with focus in a dialog.
- [x] Write the keyboard browser tests, using Alt+Tab in WebKit.

Prerequisites: group 3, which adds the timers this group reuses.
Completion check: V2, V3 and V8 pass.
Covers: R5, R6; V2, V3, V8.

## 5. Docs and generated guidance

Outcome: authors and agents can find and use the component.

- [x] Add the Hover card section to `llm.md` with markup, accessibility notes, options, methods and events, a note not to combine it with `interestfor`, and the entries in its AutoInit registry and events tables.
- [x] Add the docs page, its catalogue entry in `docs/src/data/nav.ts` and `docs/src/data/component-decisions.json`, and the rows in `docs/src/pages/auto-init.astro`.
- [x] Add the hand-written entry in `skills/expressivecss/expressivecss-design/references/web-extensions-review.md`.
- [x] Add the changelog entry under Added, then update the hardcoded guide counts and the reading budget in the skill and MCP tests.
- [x] Run `npm run build:skill` last.

Prerequisites: groups 2 to 4, so the docs describe the finished behavior.
Completion check: V14 passes.
Covers: R10; V14.

## 6. Budget and full verification

Outcome: the change is ready for a pull request.

- [x] Add the reviewed gzip budget line to `tests/selective-builds.test.js`, measured against the merge-base.
- [x] Run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one at a time.
- [x] Commit through the fallow pre-commit hook and confirm no complexity finding.

Prerequisites: group 5.
Completion check: V13 and V15 pass, and V1 to V12 still pass on the final build.
Covers: R9, R11; V13, V15.
