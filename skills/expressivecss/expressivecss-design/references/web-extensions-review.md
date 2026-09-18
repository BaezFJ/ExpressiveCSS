# Web navigation extensions

Reviewed on 2026-09-13. Google evidence covers the linked rendered prose and textual measurements. Collapsed token tables, image-only measurements, full visual parity, native zoom and spoken assistive-technology output remain unverified. dp values are design references, not automatic CSS-pixel conformance.

Read the linked component guide for the ExpressiveCSS 0.10.0 markup and API contract. RoutePlate runtime assets may differ. The [capability roadmap](../../references/capability-roadmap.md) records source pins and scoped browser results.

## [Footer](../../components/footer.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Use a document footer landmark where appropriate, name distinct navigation groups and preserve meaningful links, reading order and reflow.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The application owns site-level grouping and accessible content.

Verification gap: A document-level contentinfo landmark is checked; section-scoped footers and responsive legal links remain unverified. Next check: Place a document footer outside main and sectioning elements; verify named legal navigation at enlarged text.

Mapped browser scope: Named navigation, document footer, unavailable pagination non-link, named badge count, list checkbox and scoped TOC aria-current. No spoken-output assertion.

## [Breadcrumbs](../../components/breadcrumbs.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Use named hierarchy navigation with real ancestor links and a current-page state. It communicates location, not peer categories.

Framework comparison: No dedicated Google component exists in the reviewed inventory. Native links and current-location semantics remain the web contract.

Verification gap: Named navigation and current-page markup are checked; CSS separator speech and long-path reflow remain unverified. Next check: Inspect assistive-technology output for separators and test translated paths without truncating essential context.

Mapped browser scope: Named navigation, document footer, unavailable pagination non-link, named badge count, list checkbox and scoped TOC aria-current. No spoken-output assertion.

## [Pagination](../../components/pagination.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Name result-page navigation and previous/next actions. Expose the current page and make unavailable actions genuinely unavailable to keyboard users.

Framework comparison: No dedicated Google component exists in the reviewed inventory. Styling does not supply result loading, data ownership or keyboard disabling.

Integration gap: aria-disabled and pointer-events alone cannot disable a link for keyboard users. Next check: Use a non-link unavailable control, verify actual page destinations and preserve current-page state after updates.

Mapped browser scope: Named navigation, document footer, unavailable pagination non-link, named badge count, list checkbox and scoped TOC aria-current. No spoken-output assertion.

## [Scrollspy](../../components/scrollspy.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Use named in-page navigation, real fragment links, stable heading IDs and current-section state. Account for sticky offsets and reduced-motion preferences.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The runtime updates aria-current; native links and application headings own navigation.

Verification gap: A scoped TOC current link is checked; shared observer behavior with different offsets and multiple independent TOCs remains unverified. Next check: Use getActiveElement to select the correct TOC; test independent offsets and teardown before claiming multi-TOC support.

Mapped browser scope: Named navigation, document footer, unavailable pagination non-link, named badge count, list checkbox and scoped TOC aria-current. No spoken-output assertion.
