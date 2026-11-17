# Phase 101: scroll area container

Source: [custom scrollbars milestone](../../../../roadmap.md#milestone-custom-scrollbars).

## Scope and decisions

A neutral grid frame holds the original scrollport and an absolutely positioned bar. It receives initial computed flex/grid placement, order, minimum sizes and margins. Inline percentage sizes transfer to the frame. The container keeps its bounded dimensions; bar geometry uses its own box even when the frame stretches. Dynamic responsive/positioning constraints belong on an authored outer element; direct-child selectors must account for the wrapper. Destroy unwraps at the current position and restores only properties changed by the component. Refresh handles layout shifts without a resize; child resize, mutations and load events remeasure automatically.

## Validation

Build and typecheck passed. All 12 custom scrollbar browser tests passed across Chromium, Firefox and WebKit, including container geometry, isolated dragging, native keyboard End and parent/sibling/style restoration.

The native scrollport keeps wheel, keyboard, touch, anchors and find-in-page.
Generated UI has no tab stops and is hidden from assistive technology. Destroy
removes generated DOM, observers, animations, listeners and pending frames.
