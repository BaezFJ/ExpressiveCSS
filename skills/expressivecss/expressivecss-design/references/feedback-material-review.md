# Content and feedback

Reviewed on 2026-09-13. Google evidence covers the linked rendered prose and textual measurements. Collapsed token tables, image-only measurements, full visual parity, native zoom and spoken assistive-technology output remain unverified. dp values are design references, not automatic CSS-pixel conformance.

Read the linked component guide for the ExpressiveCSS 0.10.0 markup and API contract. RoutePlate runtime assets may differ. The [capability roadmap](../../references/capability-roadmap.md) records source pins and scoped browser results.

## [Cards](../../components/cards.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/cards/overview), [specs](https://m3.material.io/components/cards/specs), [guidelines](https://m3.material.io/components/cards/guidelines), [accessibility](https://m3.material.io/components/cards/accessibility).

Reviewed sections: Guidelines/Usage, Behavior/Expanding, Gestures; Specs/Measurements; Accessibility/Interaction & style, Focus, Labeling elements.

Requirements: Group one related subject in an elevated, filled or outlined card. A whole-card primary action must not contain other actions. Avoid unnecessary containment and internal scrolling; provide alternatives to drag and swipe gestures.

Framework comparison: Native articles and real links/buttons are the web contract. A CSS dragged state does not supply a reorder engine.

Verification gap: Existing card lifecycle and geometry evidence does not cover every selected variant, contrast and reflow state. Next check: Measure and keyboard-test the chosen variant with long content and nested controls.

Mapped browser scope: Specific card state, disclosure fallback, or horizontal layout contract. Chromium: zero and 1.2s container timing, reopening, cancellation, native close, removal, destruction and focus return. Equivalent Firefox and WebKit cases run separately in the browser suite.

## [Lists](../../components/lists.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/lists/overview), [specs](https://m3.material.io/components/lists/specs), [guidelines](https://m3.material.io/components/lists/guidelines), [accessibility](https://m3.material.io/components/lists/accessibility).

Reviewed sections: Overview/M3 Expressive update; Specs/Anatomy/Flexibility & slots, Measurements/Shape morphing; Guidelines/Behavior/List selection modes; Accessibility/Indicate selection with more than color, Focus, Platform-specific labels.

Requirements: Choose ordinary content, actionable rows or selection explicitly. Use consistent slots and alignment, 48dp targets and a selection cue beyond color. Google describes composite arrow navigation for actionable lists and listbox/option semantics for web selection; these do not apply automatically to ordinary lists.

Framework comparison: Native lists, links and form controls retain their native Tab behavior. There is no general composite-list runtime or swipe engine; a selected class alone does not expose selection.

Integration gap: Ordinary native lists and child controls do not implement Google composite arrow navigation. Next check: Retain native semantics unless a complete composite is supplied; test row control names and selection meaning.

Mapped browser scope: Example-only compact/detail switching, focus return, read state, breakpoint resizing and themed treatments. Named navigation, document footer, unavailable pagination non-link, named badge count, list checkbox and scoped TOC aria-current. No spoken-output assertion.

## [Badges](../../components/badges.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/badges/overview), [specs](https://m3.material.io/components/badges/specs), [guidelines](https://m3.material.io/components/badges/guidelines), [accessibility](https://m3.material.io/components/badges/accessibility).

Reviewed sections: Specs/Measurements; Guidelines/Container, Placement; Accessibility/Visual indicators, Labeling elements.

Requirements: Use a 6dp small badge or a 16dp large badge, with short counts anchored at the trailing icon edge. Expose the badge meaning once alongside its destination. Google badge contrast guidance does not replace WCAG text-contrast requirements.

Framework comparison: The application owns count meaning, read state and accessible names outside decorative hidden icon subtrees.

Verification gap: A named count fixture is checked; changing counts, clipping and spoken updates remain unverified. Next check: Expose count meaning once, test large/localized counts and verify announcements only when the task needs them.

Mapped browser scope: Named navigation, document footer, unavailable pagination non-link, named badge count, list checkbox and scoped TOC aria-current. No spoken-output assertion.

## [Snackbar](../../components/snackbar.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/snackbar/overview), [specs](https://m3.material.io/components/snackbar/specs), [guidelines](https://m3.material.io/components/snackbar/guidelines), [accessibility](https://m3.material.io/components/snackbar/accessibility).

Reviewed sections: Guidelines/Accessibility requirements for web, Placement, Behavior; Accessibility/Interaction & style, Accessibility requirements on web, Focus, Keyboard navigation.

Requirements: Show one snackbar at a time without autofocus or a focus trap. Actionable snackbars persist until acted on or dismissed. Timed web feedback needs an equivalent persistent inline message. Document a keyboard route to actions, support Escape when focused and restore logical focus.

Framework comparison: Version 0.10.0 pauses finite timers during focus or hover and resumes after departure. Actionable snackbars default to `displayLength: Infinity` and `dismissible: true`; applications still own any global shortcut.

Feature gap: Focus/hover pause does not satisfy persistent actionable snackbar guidance; default action timeout is finite and Escape handling is absent. Next check: Use existing displayLength: Infinity and dismissible: true for persistent actions; provide a documented reach shortcut and test Escape and spoken delivery.

Mapped browser scope: Focused action survives its timeout and activates once; timer resumes after focus leaves a second snackbar.

## Persistent inline feedback

The banner component has been removed. Use native text and controls for persistent nonblocking messages. Update an existing status node when announcements are needed; keep controls outside it. The application owns dismissal and focus recovery. Static text needs no live region.

The reviewed current M3 inventory has no dedicated banner entry. [Legacy M2 guidance](https://m2.material.io/components/banners) is historical context, not a current framework contract or proof of explicit Google deprecation.

## [Progress indicators](../../components/progress.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/progress-indicators/overview), [specs](https://m3.material.io/components/progress-indicators/specs), [guidelines](https://m3.material.io/components/progress-indicators/guidelines), [accessibility](https://m3.material.io/components/progress-indicators/accessibility).

Reviewed sections: Overview/M3 Expressive update, Previous updates; Specs/Configurations; Guidelines/Usage, Progress indicators in buttons, Responsive layout; Accessibility/Interaction & style, Labeling elements.

Requirements: Report accurate determinate values and omit values for unknown progress. Keep the same process recognizable when its state changes. Mirror linear progress in RTL and provide an end stop when track contrast needs it. Loading indicators cover many short waits; circular progress remains useful in buttons and processes that become determinate.

Framework comparison: Native progress and custom CSS bars have different rendering paths. Custom linear fill uses physical left positioning; end-stop and wavy Expressive behavior are not verified.

Version 0.10.0 stops spatial animation in reduced-motion variants, preserves a visible static custom fill, and mirrors custom linear fill in RTL. End-stop and wavy Expressive variants are not verified.

Verification gap: Reduced-motion static custom fill is checked; forced colors and native indicator rendering remain unverified. Next check: Test native and custom determinate/indeterminate variants, visible static feedback and changing accessible values.

Feature gap: Custom linear progress uses physical left fill in RTL; end-stop and wavy Expressive variants are not verified. Next check: Test RTL native and custom bars; repair mirrored custom fill and assess an end stop for insufficient track contrast before claiming current variant parity.

Mapped browser scope: Named progress state, reduced-motion animation removal and visible custom static fill; no spoken-delivery assertion.

## [Loading indicator](../../components/loading-indicator.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/loading-indicator/overview), [specs](https://m3.material.io/components/loading-indicator/specs), [guidelines](https://m3.material.io/components/loading-indicator/guidelines), [accessibility](https://m3.material.io/components/loading-indicator/accessibility).

Reviewed sections: Overview/M3 Expressive update; Guidelines/Usage, Container (optional), Responsive layout, Behavior; Accessibility/Use cases, Interaction & style, Labeling elements.

Requirements: Use for an actual short wait with unknown progress, usually 200ms to five seconds. Do not use for a process that will become determinate. Google specifies a descriptive progressbar role and sufficient shape contrast; a refresh gesture still needs an alternative.

Framework comparison: The current contract still requires named role=status. An indeterminate progressbar is valid ARIA and omits aria-valuenow. Meaningful status text updates and actual spoken delivery need separate verification.

Integration gap: The framework requires a named status while Google recommends progressbar; an indeterminate progressbar validly omits aria-valuenow. Next check: Record this current contract difference; test meaningful waiting text and spoken delivery. Choose a progress indicator initially when a transition to determinate progress is expected.

Mapped browser scope: Named progress state, reduced-motion animation removal and visible custom static fill; no spoken-delivery assertion.

## [Carousel](../../components/carousel.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/carousel/overview), [specs](https://m3.material.io/components/carousel/specs), [guidelines](https://m3.material.io/components/carousel/guidelines), [accessibility](https://m3.material.io/components/carousel/accessibility).

Reviewed sections: Overview/Updates; Specs/layout Measurements; Guidelines/Usage, Full-screen, Item text; Accessibility/Requirements on scrolling pages, Keyboard navigation, Labeling elements, Reduced motion.

Requirements: Choose a supported layout for the content. On scrolling pages provide a route to all items. Name the container and item positions, provide keyboard and non-drag navigation, keep controls clear of content and provide pause controls for autoplay. Reduced motion removes parallax and equalizes item widths.

Framework comparison: The runtime uses a named region and carousel description. Reduced-motion styles already remove parallax and equalize item widths. The application owns all-items navigation and a visible autoplay pause control.

Verification gap: Existing DOM/timer checks do not prove rendered scrolling, RTL focus or visible pause-control usability. Next check: Run keyboard, non-drag previous/next, pause, hover/focus and reduced-motion checks on the selected carousel.

No browser check is directly mapped. Source and unit tests do not substitute for the concrete rendered check above.

## [Lightbox](../../components/lightbox.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Provide a named keyboard-operable enlargement trigger, Escape and an accessible close route, logical focus and reduced motion. Image enlargement is not automatically a modal gallery.

Framework comparison: This is a framework media extension. Do not add aria-modal or claim full dialog focus containment without implementing that behavior.

Version 0.10.0 supports Space and native-button activation, cancels pending animation timers on destroy and retains the original image. This is not a modal-gallery contract.

Verification gap: Enlargement and teardown are checked; modal containment, reduced motion and destruction during closing remain unverified. Next check: Treat this as image enlargement, not a verified modal gallery; test closing interruption and actual focus ownership.

Mapped browser scope: Space opens image enlargement; Escape closes; destroy preserves original image/style. Native button Space opens without duplicate image Tab stop; destroy cancels opening callbacks and retains image. Subsequent Tab order only.
