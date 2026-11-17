# Phase 103: scroll area spring

Source: [custom scrollbars milestone](../../../../roadmap.md#milestone-custom-scrollbars).

## Scope and decisions

Thumb thickness grows from 4px to 8px on hover or drag and returns with the existing fast-spatial spring tokens. The component inherits standard/expressive motion configuration and copies the scrollport spring tokens to sibling rails. Only thickness transitions; thumb length and scroll-linked position never animate behind layout. Reduced motion removes the transition.

## Validation

All 27 custom scrollbar browser tests passed across Chromium, Firefox and WebKit, including rest/hover/leave widths and immediate reduced-motion changes. Build and typecheck passed.

The native scrollport keeps wheel, keyboard, touch, anchors and find-in-page.
Generated UI has no tab stops and is hidden from assistive technology. Destroy
removes generated DOM, observers, animations, listeners and pending frames.
