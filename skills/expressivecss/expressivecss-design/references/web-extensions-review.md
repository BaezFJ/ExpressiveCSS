# Web navigation extensions

Reviewed on 2026-09-13. Google evidence covers the linked rendered prose and textual measurements. Collapsed token tables, image-only measurements, full visual parity, native zoom and spoken assistive-technology output remain unverified. dp values are design references, not automatic CSS-pixel conformance.

Read the linked component guide for the ExpressiveCSS 0.12.0 markup and API contract. RoutePlate runtime assets may differ. The [capability roadmap](../../references/capability-roadmap.md) records source pins and scoped browser results.

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

## [Message](../../components/message.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Identify each sender, keep reading order equal to conversation order, name icon-only message actions and announce appended messages through a log region.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework lays out the parts; the page owns the log region, sender names and message actions.

Verification gap: Avatar anchoring, start and end sides in LTR and RTL, and grouped corners are checked in a browser; announcements for appended messages and spoken output remain unverified. Next check: Append messages to a role="log" conversation and inspect assistive-technology output; test enlarged text and RTL.

Mapped browser scope: Avatar level with the bubble bottom and above the footer, start/end edges in LTR and RTL, no gap without an avatar, grouped corner radii and no message landmarks. No spoken-output assertion.

## [Accordion](../../components/accordion.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Expose each header as a button with its expanded state, keep controls out of the header, keep the reading order equal to the visual order and respect reduced motion.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The browser owns the disclosure behavior; the framework draws the tiles and the chevron.

Verification gap: Tile corners, the chevron turn, exclusive groups and the expanded state Chromium reports are checked in a browser; the open animation, enlarged text and spoken output remain unverified. Next check: Toggle items with a screen reader in each engine and confirm the expanded state is announced; test enlarged text and reduced motion.

Mapped browser scope: Outer, inner and open corner radii, chevron rotation, hidden native marker, exclusive name groups, Enter on a focused summary and the expanded state Chromium reports for each summary. No spoken-output assertion.

## [Data table](../../components/data-table.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep native table semantics with column and row headers, expose sort state on the header cell, name selection checkboxes after their rows and make a scrolling region reachable and named.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework styles a native table; the page owns sorting, select-all and the scroll region name.

Verification gap: Table semantics, the sticky header, numeric alignment, the sort arrow and selected rows are checked in a browser; sort announcements, enlarged text and spoken output remain unverified. Next check: Sort and select rows with a screen reader in each engine and confirm the sort state and selection are announced; test enlarged text and RTL.

Mapped browser scope: Table, column header and row counts through the wrapper, sticky header offset after scrolling, end-aligned numeric cells in LTR and RTL, sort arrow opacity and rotation, selected row fill and the named scroll region. No spoken-output assertion.

## [Avatar](../../components/avatar.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Name each person once through alt text or role="img" with a label, hide avatars beside a visible name and keep group counts understandable without the picture.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework draws the circle and group; the page names each person.

Verification gap: Sizes, the circle, the group overlap and named initials are checked in a browser; image loading failures, enlarged text and spoken output remain unverified. Next check: Read a group of avatars with a screen reader and confirm each name and the count are announced once; test enlarged text and RTL.

Mapped browser scope: Default, small and large sizes, circle radius, image and initials names in the accessibility tree, and the group overlap in LTR and RTL. No spoken-output assertion.

## [Skeleton](../../components/skeleton.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep placeholders out of the accessibility tree, report the wait through a status, clear aria-busy when content arrives and stop motion when reduced motion is requested.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework draws the placeholder shapes; the page owns aria-busy and the status message.

Verification gap: The shimmer, its reduced-motion stop and the absence of skeletons from the accessibility tree are checked in a browser; status announcements and spoken output remain unverified. Next check: Load content into an aria-busy region with a screen reader and confirm the status is announced once and the skeletons are not; test forced colors.

Mapped browser scope: Running shimmer animation, its removal under reduced motion, reversed direction in RTL, text and circle geometry and no skeleton nodes in the accessibility tree. No spoken-output assertion.

## [Empty state](../../components/empty-state.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: State what is empty and what to do next in text, keep the heading in the page outline, hide decorative icons and images and announce results that change after a search.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework lays out the parts; the page owns the heading level, wording and actions.

Verification gap: Centering, the icon circle and the actions row are checked in a browser; announcements when a search empties a list and spoken output remain unverified. Next check: Empty a filtered list with a screen reader and confirm the change is announced; test enlarged text and narrow widths.

Mapped browser scope: Centered column, icon circle size and fill, text width cap, centered wrapping actions and an empty alt image left out of the accessibility tree. No spoken-output assertion.
