# Plan: back-to-top button

Roadmap phase: Phase 44, back-to-top button. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

Work on `feature/2026-10-25-back-to-top`. Tests run against built bundles, so build before a test. Run browser test files one at a time, since parallel browser runs flake.

## Group 1: engine probe

Prerequisites: none.

- [x] In Chromium, Firefox and WebKit through Playwright, scroll a tall page and run `window.scrollTo({ top: 0, behavior: 'smooth' })` with `target.focus({ preventScroll: true })` before it, and again after it. Record whether the page reaches `scrollY === 0` and where focus ends in each order.
- [x] Record when a smooth scroll finishes in each engine (`scrollend` event or polling), since WebKit scrolls asynchronously.
- [x] Put an absolutely positioned, zero-height sentinel with `top: 100vh` at the start of `<body>`, observe it, and record that it stops intersecting once the page scrolls past one viewport height. Repeat with `top: 400px` and with `position: relative` on `<body>`.
- [x] Check that `inert` on a fixed link removes it from Tab order and from Playwright's ARIA snapshot in all three engines.
- [x] Write the findings into the Technical constraints section of requirements.md, and update the activation proposal if an order fails in any engine.

Completion check: requirements.md records each engine's result for the four probes, and the probe script is not committed.

Covers R2, R3, R5 (evidence only).

## Group 2: the component

Prerequisites: group 1.

- [x] Add `src/ts/components/backToTop.ts` with `BackToTop` (key `Expressive_BackToTop`) and a `threshold` option, default `'100vh'`.
- [x] Insert the sentinel, observe it, and toggle `inert` on the link from the observer callback. Start hidden.
- [x] Handle activation: prevent the default jump, scroll to the top with the behavior `prefers-reduced-motion` selects, and focus the `href` target in the order group 1 settled. Add a temporary `tabindex="-1"` to a target that is not focusable and remove it on `blur`. Fall back to `document.body` for `#`, `#top` or a missing id.
- [x] `destroy()` disconnects the observer, removes the sentinel and any temporary `tabindex`, and removes `inert`.
- [x] Export it from `src/ts/components/index.ts`, add `BackToTop: { component: Components.BackToTop, selector: '.back-to-top' }` to `registry.ts`, and add a fixture to `tests/fixtures.js`.
- [x] Keep every new function below cyclomatic complexity 5.

Completion check: `npm run build` and the typecheck pass, and `AutoInit()` on the fixture creates an instance.

Covers R1 to R5, R8.

## Group 3: styles

Prerequisites: group 2.

- [x] Add `src/sass/components/_back-to-top.scss` and forward it from `src/sass/components/_index.scss`.
- [x] Place the link with `position: fixed` at `inset-inline-end` and `bottom` of `--md-comp-back-to-top-offset` (16px), with `z-index: var(--md-comp-back-to-top-z)` (997). Reuse the FAB look: the markup adds `button circle extra`, which already sizes the box in `rem()`, so the partial only places and hides the link.
- [x] Style `.back-to-top[inert]` as `visibility: hidden` and `opacity: 0`, with a fade on the effects spring that is `none` under `prefers-reduced-motion: reduce`.
- [x] Hide the link in print, as the print stylesheet does for the FAB menu.

- [x] Add the `back-to-top` row to `semantics.json` and run `npm run build:semantics`. Moved here from group 5, because the semantics roster test fails for a Sass component without a row.

Completion check: `npm run build:css` passes, the built CSS holds the rules, and a page without the script shows the link.

Covers R6, R7.

## Group 4: tests

Prerequisites: groups 2 and 3.

- [x] Add `tests/back-to-top-browser.test.js`, looping over Chromium, Firefox and WebKit, with a tall page whose `<main id="main">` holds a heading and a button.
- [x] Case for V1: scroll past the threshold, click the link, and check `scrollY === 0`, focus on `#main` and the next Tab on the button. Repeat with Enter.
- [x] Case for V2: before the threshold and after scrolling back above it, the link is not visible, Tab skips it, `elementFromPoint` at its box misses it, and the ARIA snapshot omits it.
- [x] Case for V3: under emulated `reducedMotion: 'reduce'`, `scrollY` is 0 on the next frame after activation; without it, an intermediate frame shows a nonzero `scrollY`.
- [x] Case for V4: a `threshold` of `'400px'` from `data-back-to-top-options` shows the link after 400px.
- [x] Case for V10: the link's box sits at the bottom inline-end offset, flips under `dir="rtl"`, follows `--md-comp-back-to-top-offset`, and stays visible and working on a page that loads only the CSS.
- [x] Add `tests/back-to-top.test.js` (jsdom), written with group 2 so the component landed with a test, for V5: AutoInit fixture, options from markup, the temporary `tabindex` added and removed, and `destroy()` leaving the markup as authored.
- [x] Run each file against a build without group 2 and confirm it fails, then against the new build and confirm it passes. The browser file also ran against three mutations: no focus call, no `visibility: hidden` rule, and smooth scrolling under reduced motion. Each failed only its own case, in all three engines. Tear down pages, components and timers in `finally` blocks.

Completion check: both files pass in all three engines and fail against the base build.

Covers R1 to R8.

## Group 5: docs, semantics, budget and generated files

Prerequisites: group 4.

- [x] Add a docs page under `docs/src/pages/` with a live example, the `threshold` option, the custom properties, the `.fab-menu` corner, and the window-only limit. Add it to the docs catalogue (`docs/src/data/nav.ts`) and, if it lists every component, `docs/src/data/component-decisions.json`.
- [x] Add the same reference to `llm.md` and an Added entry to `CHANGELOG.md` under Unreleased.
- [x] Rebuild, measure the CSS and JavaScript gzip sizes against the merge-base build, and add a reviewed budget line to `tests/selective-builds.test.js`.
- [x] Run `npm run build:skill` after the last edit, since the contract hash covers the changelog and tests, then `npm run check:generated` and `npm run verify`.
- [x] Run `npm test --prefix mcp/expressivecss` and `npm run verify:packages`.

- [x] Also, from the earlier component checklist: the `src/ts/modular.ts` type export, both AutoInit tables in `llm.md` and the one in `docs/src/pages/auto-init.astro`, the hand-written `web-extensions-review.md` entry, the guide counts in the skill, version and decisions tests, and the basic-button reading budget (46,596 bytes, +315).

Completion check: V6 to V9 pass.

Covers R9, R10.
