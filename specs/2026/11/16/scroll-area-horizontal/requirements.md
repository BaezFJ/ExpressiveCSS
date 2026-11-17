# Phase 102: scroll area horizontal

Source: [custom scrollbars milestone](../../../../roadmap.md#milestone-custom-scrollbars).

## Scope and decisions

Both axes share geometry and pointer handling. Horizontal overflow gets a bottom bar. The 16px corner is removed from both tracks. RTL uses negative native scrollLeft, reverses horizontal progress and puts the vertical bar at inline-end (the left). Horizontal writing modes are supported. Generated sibling bars copy the scrollport color-scheme and scrollbar custom properties.

## Validation

All 24 custom scrollbar browser tests passed across Chromium, Firefox and WebKit, covering both axes on page and containers in LTR/RTL. Pointer assertions account for integer input-coordinate rounding. Build and typecheck passed.

The native scrollport keeps wheel, keyboard, touch, anchors and find-in-page.
Generated UI has no tab stops and is hidden from assistive technology. Destroy
removes generated DOM, observers, animations, listeners and pending frames.
