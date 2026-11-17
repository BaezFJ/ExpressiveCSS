# Phase 99: scroll area page

Source: [custom scrollbars milestone](../../../../roadmap.md#milestone-custom-scrollbars).

## Scope and decisions

Opt in with .scroll-area.custom. A fixed 16px hit strip at inline-end uses an 8px thumb, minimum 24px length. Insets and z-index are author CSS properties, so fixed controls can reserve their own space. ScrollTimeline (WAAPI) drives position when available; a passive listener handles other engines. ResizeObserver and content mutation observation update length. Forced colors and coarse primary pointers restore the native bar. AutoInit on html is explicit because its default root is body.

## Validation

Build and typecheck passed. The new page geometry, growth, teardown and fallback-position tests passed in Chromium, Firefox and WebKit. Forced-colors emulation ran in Chromium and Firefox; WebKit does not support that emulation. Browser dependencies were extracted outside the checkout.

The native scrollport keeps wheel, keyboard, touch, anchors and find-in-page.
Generated UI has no tab stops and is hidden from assistive technology. Destroy
removes generated DOM, observers, animations, listeners and pending frames.
