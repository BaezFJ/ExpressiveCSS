# Phase 106: scroll area labels

Source: [custom scrollbars milestone](../../../../roadmap.md#milestone-custom-scrollbars).

## Scope and decisions

During vertical thumb drags, the current marked section supplies a label. data-scroll-area-label overrides its heading text, falling back to target text. Labels use textContent (never HTML), trim to 160 characters, inherit aria-hidden from the decorative rail and are not announced as a live region. Horizontal drags and unmarked content show no label. Release, capture loss, cancellation, blur and destroy hide it. Final lifecycle review also covers reinitialization, stale destroy, detached frames and author moves; AutoInit fixture checks now clean up every constructed component in finally.

## Validation

The focused suite passed 50 browser checks in Chromium, Firefox and WebKit, including shadow-only CSS, local theme colors and coarse-pointer fallback in the two engines that support mobile emulation, live theme/motion changes, and spacing utility/grid placement preservation. Bars inherit shared values and copy only local overrides; ancestor attribute observation re-resolves local color aliases when a palette changes, including across a shadow host. The alias regression waits for initial resize and font callbacks to settle before changing the seed. 141 AutoInit and lifecycle checks passed. The shared anchor-offset browser fixture resets its retained URL fragment and waits for native scrolling before measuring, so concurrent Firefox runs do not measure the previous scroll state; its three-engine rerun passed with unchanged geometry assertions. Runtime bar and frame styles live in components/_scroll-area.scss; native styling and its runtime hide modifier stay in utilities/_scroll-area.scss. Selective custom-bar builds load both entries. The generated-bar aria-hidden rule is owned by semantics.json. Token audit, semantics, selective builds, docs coverage and the focused browser/lifecycle suite passed together (113 checks). Full contributor, MCP/package and visual checks are recorded in validation.md once complete.

The native scrollport keeps wheel, keyboard, touch, anchors and find-in-page.
Generated UI has no tab stops and is hidden from assistive technology. Destroy
removes generated DOM, observers, animations, listeners and pending frames.
