# Phase 104: scroll area idle

Source: [custom scrollbars milestone](../../../../roadmap.md#milestone-custom-scrollbars).

## Scope and decisions

idleDelay defaults to 1000ms and is configurable at initialization; invalid delays use that default. Bars fade using the effects spring. Entering the rail is proximity (16px from the edge); its transparent hit strip stays reachable while visually idle. Hover and capture hold visibility. Reduced motion removes the fade. Destroy clears the timer.

## Validation

All 30 custom scrollbar browser tests passed in Chromium, Firefox and WebKit. Tests wait for default idle hiding, edge wakeup, a sustained hover, scroll wakeup, reduced-motion transition removal and teardown. Build and typecheck passed.

The native scrollport keeps wheel, keyboard, touch, anchors and find-in-page.
Generated UI has no tab stops and is hidden from assistive technology. Destroy
removes generated DOM, observers, animations, listeners and pending frames.
