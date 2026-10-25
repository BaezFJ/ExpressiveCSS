# Hover card

Date: 2026-10-25
Roadmap phase: Phase 45, hover card
Branch: `feature/2026-10-25-hover-card`
Base: `origin/master` at `a9bbf77ad` (#425)
Status: implemented and locally verified 2026-10-25 in local commits; not pushed, required CI and review pending

Follow the [mission's product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 45](../../../../roadmap.md#phase-45-hover-card). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The user picked Phase 45 directly. Phases 42 to 51 are being specified in parallel threads, so this spec skips the earliest-unfinished-phase rule. Phase 45 has no dependencies. The user answered the plan, requirements and validation questions on 2026-10-25, and the confirmed decisions below come from those answers.

## Current behavior

These facts come from the code at the base commit.

- No component shows a card of preview content when a link is hovered or focused.
- The runtime Tooltip in `src/ts/components/tooltip.ts` comes closest. With `data-tooltip-id` it moves an element into a `.tooltip.rich` bubble, opens after `enterDelay` (default 0) on hover or `:focus-visible` focus, and stays open while the pointer is over the bubble, because `mouseleave` ignores a `relatedTarget` inside it. The bubble has `role="tooltip"` and the trigger gets `aria-describedby`, so a screen reader reads the whole bubble as the link's description. A tooltip role is meant for text, which makes it the wrong contract for a card holding links.
- Tooltip also carries a skip-delay window shared by all tooltips, a touch long press and click mode. A hover card needs none of these.
- `.popover` in `src/sass/components/_popover.scss` is a CSS-only `[popover]` panel opened by `popovertarget`. It looks like an M3 rich tooltip, anchors below its button with start edges aligned, flips at the edge, and turns its transition off under `prefers-reduced-motion: reduce`.
- `NavigationRail` already opens a panel on hover with `showPopover({ source })` (`_hoverOpen` in `src/ts/components/navigationRail.ts`), which makes the source element the popover's anchor and invoker.
- Phase 20 lets AutoInit read `data-<name>-options` JSON for every registered component, so a `HoverCard` would read `data-hover-card-options` without extra code.
- jsdom has no `showPopover`. Unit tests stub it on the prototype, as `tests/dismissal-lifecycle.test.js` does.

### Engine probe

On 2026-10-25 a throwaway Playwright script ran in Chromium 156, Firefox 157 and WebKit 27.2. It found:

- `interestfor` (`interestForElement`) exists only in Chromium. Firefox and WebKit lack it.
- All three accept `popover="hint"` and CSS anchor positioning.
- In all three, `card.showPopover({ source: link })` on a `popover="hint"` card anchors the card to the link, Tab from the link moves focus into the card's first link, and Escape closes the card. WebKit needs Alt+Tab to reach links from the keyboard.

This settles the roadmap's open question. Interest invokers do not work in all three engines, so the card uses script. It keeps its own small timers instead of reusing Tooltip's delay code, because that code is bound up with the tooltip's shared window and touch handling.

## Confirmed decisions

From the interview on 2026-10-25:

- Build a new `HoverCard` component in its own file with its own enter and exit timers. The card is a `popover` panel anchored in CSS and styled like `.popover`. Tooltip stays untouched. The user accepted copying a few lines of timer logic over sharing Tooltip's.
- Mouse and keyboard only. Hover or keyboard focus opens the card after `enterDelay`, 500 ms by default. It stays open while the pointer or focus is on the link or the card, and Escape closes it.
- On touch, a tap follows the link and shows nothing. A click always follows the link and is never consumed.
- Focus stays on the link when the card opens. Tab moves into the card.
- The link has `aria-details` naming the card, and the card has no `role="tooltip"`.
- Before merge, the roadmap browser test, a keyboard browser test and jsdom unit tests must pass, along with the repository's required checks. The user did not pick a manual screen reader pass, so it is not a merge condition.

## Proposals

These follow from the confirmed decisions and the code. They stand unless review changes them.

- Markup: the trigger is `<a href="…" class="hover-card-trigger" aria-details="card-id">`, and the card is `<div id="card-id" class="popover" popover="hint">`. Reading the card from `aria-details` means the accessibility relationship and the behavior cannot point at different elements. The `.hover-card-trigger` class follows Menu's `.menu-trigger`, and AutoInit claims it.
- The card reuses `.popover` with no new class or Sass, since `.popover` already supplies the look, the placement below the link, the edge flip and the reduced-motion rule. If implementation shows the card needs styling `.popover` lacks, add a `.hover-card` modifier then and record why.
- `popover="hint"` keeps a hover card from closing an open menu or popover, which an auto popover would do. Showing one hint closes any other, so one card shows at a time.
- `exitDelay` defaults to 300 ms, long enough to cross the gap from the link to the card.
- `open()` shows the card at once and `close()` hides it at once, without the delays. The component reports `open` and `close` through `expressive:*` events, as Tooltip does with `_notify`.
- The runtime handles Escape itself as well as relying on the native hint behavior. An engine in the `browserslist` range that does not know `hint` treats the value as `manual`, which has no Escape handling of its own.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | A `.hover-card-trigger` link names its card with `aria-details`. The card is a `.popover` element with `popover="hint"`. `semantics.json` gains a `hover-card` row whose rules flag a trigger that is not `a[href]`, a trigger without `aria-details`, and an `aria-details` id that does not resolve to a `[popover]` element. |
| R2 | `HoverCard` is exported from `src/ts/components/index.ts`, registered in `src/ts/components/registry.ts` with selector `.hover-card-trigger`, and started by `AutoInit()`. It takes `enterDelay` (default 500) and `exitDelay` (default 300) as constructor options and through `data-hover-card-options`. A trigger whose `aria-details` names no element logs one console error and starts nothing. |
| R3 | A mouse pointer entering the link opens the card after `enterDelay`, with `showPopover({ source: link })`, so the card anchors to the link. A pointer that leaves before `enterDelay` ends opens nothing. |
| R4 | While the pointer is over the link or the card, the card stays open. When the pointer leaves both, the card closes after `exitDelay`. A pointer that returns to the link or the card within `exitDelay` keeps it open. |
| R5 | Keyboard focus on the link that matches `:focus-visible` opens the card after `enterDelay`. Focus stays on the link, and Tab moves into the card's focusable content. The card stays open while focus is on the link or inside the card. Once focus leaves both, it closes after `exitDelay` unless the pointer still holds it. A pointer press that focuses the link does not count as keyboard focus. |
| R6 | Escape closes an open card at once. If focus was inside the card, it returns to the link. Escape with focus elsewhere still closes the card, and it does not swallow an Escape meant for a dialog or menu that has focus. |
| R7 | A click or tap on the link follows it. The component never calls `preventDefault` on it. A touch pointer neither opens the card nor starts a timer, and the compatibility mouse events a tap sends do not count as a hover. |
| R8 | `open()` shows the card at once and `close()` hides it at once. `open` and `close` events fire once per change. `destroy()` clears both timers, removes every listener and hides a card the instance showed, leaving the link's and card's attributes as the author wrote them. |
| R9 | Existing markup behaves as before. Tooltip, Popover and NavigationRail code and tests are unchanged, and a `.popover` without a hover card trigger keeps its CSS-only behavior. |
| R10 | Docs and generated guidance describe the component. `llm.md` gains a Hover card section with markup, accessibility notes, options, methods and events, and lists the component in its AutoInit registry and events tables. The docs site gains a page and catalogue entry, and `docs/src/pages/auto-init.astro` lists the component and its events. `skills/expressivecss/expressivecss-design/references/web-extensions-review.md` gains a hand-written entry. The unreleased changelog lists it under Added. `npm run build:skill` regenerates the derived files and `npm run check:generated` passes. |
| R11 | The bundle size change is recorded in a reviewed gzip budget line in `tests/selective-builds.test.js`. Every new function stays below cyclomatic complexity 5 for the fallow pre-commit gate. |

## Constraints and dependencies

- Keep the component in `src/ts/components/hoverCard.ts`, importing only from `core/`. Use `this._events.signal` for listeners that last the instance's lifetime.
- Use native features first. The browser owns the top layer, anchoring through `source`, the focus order into the card, light dismiss and, where `hint` is known, Escape.
- Do not edit `tooltip.ts` or `_popover.scss`. Parallel phases may touch shared generated files, and keeping this change to new files limits merge conflicts to the contract hash and guide counts.
- Text- and icon-holding boxes use `rem()` if any Sass is added.
- Tests run against built bundles. Build before testing, and tear instances and mocked timers down in `finally` blocks.

## Known limits

- Touch users see no card. The linked page is expected to hold the same content.
- The card's content is the author's static markup. Nothing is fetched on hover.
- A screen reader user reaches the card through `aria-details` or Tab. Support for `aria-details` varies by screen reader, and no manual screen reader pass is planned.
- In Chromium, an author who also writes `interestfor` on the trigger gets both the native and the runtime behavior. The docs tell authors not to combine them.

## Out of scope

- Native `interestfor` markup or a fallback for it.
- A touch long press.
- Loading card content on demand.
- Sharing Tooltip's skip-delay window between hover cards.
- Changes to Tooltip or Popover.
- Roadmap edits, release and publication.

## Open decisions

None. The proposals above stand unless the user changes them in review.
