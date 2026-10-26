# Size the remaining px font sizes in rem

Date: 2026-10-26
Roadmap phase: Phase 52, size the remaining px font sizes in rem
Branch: `fix/rem-icon-font-sizes`
Base: `origin/master` at `2c6ff3711` (#439)
Status: implemented on the branch; not merged

Follow the [mission's success criteria](../../../../mission.md#success-criteria), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 52](../../../../roadmap.md#phase-52-size-the-remaining-px-font-sizes-in-rem). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

Phases 1 to 51 are marked complete in the roadmap. Phase 52 is the first phase of the stylesheet review fixes milestone and has no dependencies. No spec directory or branch for it existed at the base commit. The review findings behind it are tasks H1 and H3 in `TASKS.md`.

## Current behavior

These facts come from the base commit.

- The `rem()` function in `src/sass/abstracts/_mixins.scss` returns `$px / 16px * 1rem`. The base icon rule in `components/_icons-material-design.scss` sets `font-size: rem(24px)`, so a bare icon grows with the browser's font size.
- Fifteen declarations under `src/sass/components` and `src/sass/abstracts` still set `font-size` in px. Thirteen size an icon, one sizes the hidden file input, and one sizes the Timepicker's tick text:

  | File | Rule | Declarations in the same rule |
  | --- | --- | --- |
  | `abstracts/_mixins.scss` | `header-icon-action` mixin, `> icon` | font-size, width, height, line-height 24px |
  | `components/_dialog.scss` | `dialog > icon:first-child` | font-size, width, height, line-height 24px |
  | `components/_snackbar.scss` | leading `> icon:first-child` | font-size, width, height, line-height 24px |
  | `components/_snackbar.scss` | close button `> icon` | font-size, width, height, line-height 24px |
  | `components/_alert.scss` | `> icon:first-child` | font-size 24px, line-height 20px |
  | `components/_command-palette.scss` | row `> icon:first-child` | font-size 20px |
  | `components/_list.scss` | `> icon.circle` | font-size 20px |
  | `components/_map.scss` | `.maplibregl-popup-close-button` | font-size 20px, inline-size and block-size 32px |
  | `components/_message.scss` | `.message-avatar > icon` | font-size 20px |
  | `components/_timeline.scss` | event badge icon | font-size 18px, width and height 32px |
  | `components/_tree.scss` | row `> icon` | font-size 20px |
  | `components/forms/_drop-zone.scss` | `> icon` | font-size 32px |
  | `components/forms/_fieldset.scss` | legend `> icon` | font-size, width, height, line-height 18px |
  | `components/forms/_file-input.scss` | `label.button input[type=file]` | font-size 20px |
  | `components/_timepicker.scss` | `.timepicker-tick` | font-size 15px, with a 40px box and line height |

- `components/_chips.scss` also sets `--font-size: 14px` and `font-size: 16px`. Phase 53 owns the chip sizes.
- `abstracts/_variables.scss` declares `$root-font-size: 16px !default`. It is a variable used for fluid type math, not a rule.
- The Timepicker script positions ticks from `dialRadius` in px, so the 270px plate and the 40px tick box must stay in px.
- `tests/css.js` exports a `rem(dp)` helper that returns the string the Sass `rem()` function produces. `tests/expressivecss-cross-browser.test.js` already doubles the root font size by setting `document.documentElement.style.fontSize`.
- One test asserted a px value. `tests/regressions.test.js` expected `font-size: 24px` on the side sheet header icon, which `header-icon-action` sizes. The survey missed it; group 2 found it. The same file matches the snackbar icon rule with a regex that accepts any `font-size` value.

A reader who raises the browser's font size gets larger text in these components but icons and tick digits at their 16px size.

## Scope

In scope: the fifteen declarations in the table, the width, height, line-height, inline-size and block-size written in the same rules, one static guard test, one browser test at a 32px root size, a CHANGELOG entry and a gzip budget line.

Out of scope:

- Chip sizes and the `--font-size` property on `.chip`. Phases 53 and 56 cover them.
- Containers sized by a custom property or by a separate rule. These stay px and are recorded under follow-ups.
- Margins, gaps, insets and borders, which stay px under the [framework constraints](../../../../tech-stack.md#framework-constraints).
- The Timepicker plate, tick box and tick line height.
- TypeScript changes.

Two clearances outside the icon rules came into scope during group 3; see R8.

## Confirmed decisions

These came from the interview on 2026-10-26.

- An icon's `font-size` moves to `rem()`, and so does every width, height, line-height, inline-size or block-size written in the same rule. The user chose this over converting `font-size` alone, which would leave rem icons overflowing px boxes such as the 24px dialog icon box, and over converting every container, which would also resize image avatars and buttons the roadmap doesn't name.
- The work runs in four groups: a failing guard test first, then shared and overlay rules, then content components, then forms and the Timepicker, followed by verification.
- The branch is `fix/rem-icon-font-sizes` from a freshly fetched `origin/master`, following the short-lived branch rule in `CONTRIBUTING.md`.
- Validation covers the static guard test, a 32px browser test in Chromium, Firefox and WebKit, updated tests and the gzip budget, and `npm run verify` with the MCP tests. The user didn't pick a manual docs check at 200%, so this spec claims no visual check.

## Requirements

- R1. Each icon in the table renders at twice its 16px font size when the root font size is 32px: 48px for the 24px icons, 40px for the 20px icons, 36px for the 18px icons and 64px for the drop zone icon. At a 16px root each renders at its current px size.
- R2. The width, height and line-height written in the same rule as an icon's font size scale with it. At a 32px root the dialog, snackbar and `header-icon-action` icon boxes are 48px square, the fieldset legend icon box is 36px, the alert icon's line height is 40px, the timeline badge is 64px square, and the map popup close button is 64px square.
- R3. The Timepicker tick text renders at 30px with a 32px root and at 15px with a 16px root. The tick box stays 40px and the plate stays 270px at both sizes.
- R4. The hidden file input's font size is `rem(20px)`. It stays transparent and covers its label, so a click still opens the file chooser.
- R5. No rule under `src/sass/components` or `src/sass/abstracts` sets `font-size` to a px value, except in `components/_chips.scss` until Phase 53. `$root-font-size` is a variable and doesn't count.
- R6. At a 16px root the compiled values equal the old px sizes, so the default rendering doesn't change. The compiled CSS writes each converted value as the string `rem(<px>)` produces, for example `1.5rem` for 24px.
- R8. Text keeps clear of the two boxes that grow beside it. The timeline row's start padding is `calc(rem(32px) + 16px)`, and its connector line starts at `calc(rem(32px) + 4px)` and sits at `calc(rem(16px) - 0.5px)`, the badge's center. The map popup content's end padding is `calc(12px + rem(32px))`. At a 16px root these are the old 48px, 36px, 15.5px and 44px.
- R7. `CHANGELOG.md` records the change under Unreleased, and `tests/selective-builds.test.js` records the CSS gzip change in a reviewed budget line. Generated guidance is current after `npm run build:skill`.

## Decisions made during implementation

- R8 was added in group 3. With only the badge in rem, a 64px timeline badge overlapped its text behind the 48px padding, and the connector line started inside it. The map popup's 44px end padding would have let text run under the 64px close button. The rem sizing rule already writes a clearance that sums px and rem as a `calc()`, so the fix follows it.
- `components/forms/_file-input.scss` had no `@use` of abstracts, so Sass read `rem(20px)` as the CSS remainder function and the build failed. Group 4 added `@use "../../abstracts" as *;`, which emits no CSS.

## Technical constraints

- Write `rem(24px)` for a plain property and `#{rem(24px)}` inside a custom property, as the rem sizing rule requires.
- `abstracts` is forwarded consumer API. Change only declaration values in `header-icon-action`; keep its name and parameters.
- Build before testing, because the tests read `dist/css/expressive.css`.
- Run `npm run build:skill` after the last edit to tests or the CHANGELOG, because the contract hash covers them.
- No TypeScript changes, so the fallow complexity gate doesn't apply. The new test files still pass through fallow's test checks.
- Never run two test suites at once.

## Dependencies

None. Phase 53 later removes the `_chips.scss` exemption from the guard test.

## Follow-ups

These boxes hold a converted icon but are sized outside its rule, so they stay px in this phase. At a 32px root the icon fills or outgrows each one.

- `--md-comp-message-avatar-size` (32px). The avatar clips its 40px icon because it sets `overflow: hidden`.
- `--md-comp-list-avatar-size` (40px), which also sizes image avatars. The 40px icon fills it exactly.
- The 40px snackbar close button and the 48px `header-icon-action` button. The 48px icon fills or overflows them.

Converting them is a separate roadmap decision. This spec doesn't add a phase.

## Open decisions

None.
