# Phase 100: scroll area drag

Source: [custom scrollbars milestone](../../../../roadmap.md#milestone-custom-scrollbars).

## Scope and decisions

Pointer capture retains thumb dragging beyond the rail. Primary-button presses on the track page once by the viewport height; holding does not repeat. Blur, pointer cancellation, capture loss, media fallback and destroy end the drag. Scroll operations explicitly use instant behavior so authored smooth scrolling cannot lag behind the pointer.

## Validation

All 9 custom scrollbar browser checks passed across Chromium, Firefox and WebKit. Build and typecheck passed. Tests cover half-travel dragging, leaving the rail, one-viewport track paging and blur cancellation.

The native scrollport keeps wheel, keyboard, touch, anchors and find-in-page.
Generated UI has no tab stops and is hidden from assistive technology. Destroy
removes generated DOM, observers, animations, listeners and pending frames.
