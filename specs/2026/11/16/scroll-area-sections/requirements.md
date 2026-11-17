# Phase 105: scroll area sections

Source: [custom scrollbars milestone](../../../../roadmap.md#milestone-custom-scrollbars).

## Scope and decisions

The sections option is a CSS selector, defaulting to .scrollspy, [data-scroll-area-section], so existing ScrollSpy target markup is reused without initializing another component. Invalid selectors produce no marks. Marks are decorative, with no click action; track presses still page. Nested independent scrollports are excluded. Resize, content/style changes, image load and font readiness update offsets. refresh() handles remaining external layout shifts.

## Validation

All 33 custom scrollbar browser tests passed across Chromium, Firefox and WebKit, including four proportional marks, movement after a section grows and invalid selectors. Build and typecheck passed.

The native scrollport keeps wheel, keyboard, touch, anchors and find-in-page.
Generated UI has no tab stops and is hidden from assistive technology. Destroy
removes generated DOM, observers, animations, listeners and pending frames.
