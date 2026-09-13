# Navigation, actions and sheets

Reviewed on 2026-09-13. Google evidence covers the linked rendered prose and textual measurements. Collapsed token tables, image-only measurements, full visual parity, native zoom and spoken assistive-technology output remain unverified. dp values are design references, not automatic CSS-pixel conformance.

Read the linked component guide for the existing markup and API contract. Repairs described as unreleased apply to this upstream source checkout, not published 0.9.1 or RoutePlate runtime assets. The [capability roadmap](../../references/capability-roadmap.md) records source pins and scoped browser results.

## [App bar](../../components/app-bar.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/app-bars/overview), [specs](https://m3.material.io/components/app-bars/specs), [guidelines](https://m3.material.io/components/app-bars/guidelines), [accessibility](https://m3.material.io/components/app-bars/accessibility).

Reviewed sections: Overview; Specs; Guidelines; Accessibility.

Requirements: Choose small, flexible medium/large or search app bars for the title and screen actions. Preserve meaningful headings, named actions and reachable controls through scrolling and collapse.

Framework comparison: Native header/nav markup and the AppBar runtime implement collapse and search. Single-line advice for small bars does not apply to flexible multiline headings.

Verification gap: Real modal search close/focus ordering and collapsed-header focus clearance are not mapped. Next check: Open and dismiss the actual search dialog; Tab through scroll collapse and enlarged headings.

No browser check is directly mapped. Source and unit tests do not substitute for the concrete rendered check above.

## [Bottom app bar](../../components/bottom-app-bar.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/toolbars/overview), [specs](https://m3.material.io/components/toolbars/specs), [guidelines](https://m3.material.io/components/toolbars/guidelines), [accessibility](https://m3.material.io/components/toolbars/accessibility).

Reviewed sections: Toolbars/Overview and Specs: docked toolbar replaces the baseline bottom app bar.

Requirements: The docked toolbar replaces the baseline bottom app bar in Expressive guidance. Retain the older bar only for compatibility or a specific capability need.

Framework comparison: The retained bar uses CSS styling and the native Tab sequence. It is not the recommended starting point for new Expressive designs.

Verification gap: Retained baseline bar has no directly mapped target, Tab-order or content-clearance check. Next check: Verify fixed-bar clearance at enlarged text; prefer a docked toolbar for new Expressive designs.

No browser check is directly mapped. Source and unit tests do not substitute for the concrete rendered check above.

## [Navigation drawer](../../components/navigation-drawer.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/navigation-drawer/overview), [specs](https://m3.material.io/components/navigation-drawer/specs), [guidelines](https://m3.material.io/components/navigation-drawer/guidelines), [accessibility](https://m3.material.io/components/navigation-drawer/accessibility).

Reviewed sections: Overview; Specs; Guidelines; Accessibility.

Requirements: Current Expressive guidance replaces the drawer with an expanded navigation rail. Retained drawers still need named destinations, independent scrolling and correct modal focus and dismissal.

Framework comparison: The runtime retains nested details and a native modal wrapper. Older advice to replace a rail with a drawer is historical, not the current default.

Unreleased source repair releases modal state when an open fixed drawer crosses the expanded breakpoint.

Verification gap: Breakpoint modal release is checked; nested details and Escape return focus remain distinct checks. Next check: Test nested destinations, long scrolling and Escape with the actual trigger.

Mapped browser scope: Compact open to expanded fixed drawer releases native modality and can reopen after returning compact.

## [Icon buttons](../../components/icon-buttons.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/icon-buttons/overview), [specs](https://m3.material.io/components/icon-buttons/specs), [guidelines](https://m3.material.io/components/icon-buttons/guidelines), [accessibility](https://m3.material.io/components/icon-buttons/accessibility).

Reviewed sections: Overview; Specs; Guidelines; Accessibility.

Requirements: Distinguish default and toggle controls, sizes, shapes and widths. Name each action and expose toggle state. Verify 48dp effective targets even for visually smaller sizes, and sufficient icon contrast.

Framework comparison: Sizes, shapes and toggle mappings exist. Measure effective targets around the 32px and 40px visual variants. Common buttons do not inherit icon-button modifiers.

Verification gap: Existing group checks cover selected icon colors and press shapes, not all standalone target sizes and disabled states. Next check: Measure XS/S effective targets and test named default/toggle controls outside groups.

Mapped browser scope: Filled icon button selected color and glyph fill inside a button group only. Icon children inside button group only.

## [Segmented buttons](../../components/segmented-buttons.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/segmented-buttons/overview), [specs](https://m3.material.io/components/segmented-buttons/specs), [guidelines](https://m3.material.io/components/segmented-buttons/guidelines), [accessibility](https://m3.material.io/components/segmented-buttons/accessibility).

Reviewed sections: Overview; Specs; Guidelines; Accessibility.

Requirements: Use the retained component for two to five single- or multiple-select choices. Current Expressive guidance recommends connected button groups. Preserve form semantics and effective targets when choosing a replacement.

Framework comparison: The existing contract uses native radio and checkbox groups. Preserve form values and native keys when migrating to connected button groups.

Verification gap: Legacy native radio/checkbox contracts lack a directly mapped rendered group check. Next check: Test single/multiple form values and native keys; preserve semantics when choosing connected button groups.

No browser check is directly mapped. Source and unit tests do not substitute for the concrete rendered check above.

## [Button groups](../../components/button-groups.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/button-groups/overview), [specs](https://m3.material.io/components/button-groups/specs), [guidelines](https://m3.material.io/components/button-groups/guidelines), [accessibility](https://m3.material.io/components/button-groups/accessibility).

Reviewed sections: Overview; Specs; Guidelines; Accessibility.

Requirements: Choose standard or connected groups and optional, required, single or multiple selection deliberately. Verify press growth, shapes, 48dp targets and reachable unwrapped content. Google describes Tab between buttons, with no focus on the group itself.

Framework comparison: The runtime supports aria-pressed selection and adjacent-button press growth. The reviewed Google glossary contains an unrelated navigation-rail recommendation; the main guidance recommends connected button groups.

Verification gap: Existing geometry and keyboard checks do not cover every required-selection and overflow configuration. Next check: Exercise empty optional and required selection, disabled neighbors and constrained translated labels.

Mapped browser scope: Rendered group behavior; does not establish standalone common/icon-button parity. Example-only input, group toggle, preview/focus, save and bfcache-style remount behavior, themed treatments.

## [Split button](../../components/split-button.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/split-button/overview), [specs](https://m3.material.io/components/split-button/specs), [guidelines](https://m3.material.io/components/split-button/guidelines), [accessibility](https://m3.material.io/components/split-button/accessibility).

Reviewed sections: Overview; Specs; Guidelines; Accessibility.

Requirements: Keep the leading default action distinct from the trailing additional-choices menu. Name both controls, expose the trailing expanded state, return focus after dismissal and verify separate 48dp effective targets.

Framework comparison: The Menu runtime owns the trailing trigger. Use the existing split markup and verify expanded state and focus; no additional split-button runtime is implied.

Verification gap: Full leading-action versus trailing-menu activation and Escape return are not directly mapped. Next check: Activate both halves with keyboard and pointer; verify expanded state and separate effective targets.

No browser check is directly mapped. Source and unit tests do not substitute for the concrete rendered check above.

## [Floating action button](../../components/fab.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/floating-action-button/overview), [specs](https://m3.material.io/components/floating-action-button/specs), [guidelines](https://m3.material.io/components/floating-action-button/guidelines), [accessibility](https://m3.material.io/components/floating-action-button/accessibility), [overview](https://m3.material.io/components/extended-fab/overview), [specs](https://m3.material.io/components/extended-fab/specs), [guidelines](https://m3.material.io/components/extended-fab/guidelines), [accessibility](https://m3.material.io/components/extended-fab/accessibility), [overview](https://m3.material.io/components/fab-menu/overview), [specs](https://m3.material.io/components/fab-menu/specs), [guidelines](https://m3.material.io/components/fab-menu/guidelines), [accessibility](https://m3.material.io/components/fab-menu/accessibility).

Reviewed sections: Overview; Specs; Guidelines; Accessibility.

Requirements: Use one primary, non-destructive action. Current guidance discourages the small FAB. Extended FABs have visible labels; FAB menus contain two to six labelled actions and must not hide focused controls.

Framework comparison: The source includes sizes, extended FABs, .fab-menu and a legacy speed dial. Hover can reveal actions while runtime expanded state remains false. Keyboard closing does not restore focus from a hidden action.

Feature gap: Hover can reveal actions without runtime expanded state; Escape closing can leave focus on a hidden child. Next check: Reproduce hover and keyboard paths in a browser, unify expanded-state ownership and restore focus when hiding an active child.

No browser check is directly mapped. Source and unit tests do not substitute for the concrete rendered check above.

## [Panes](../../components/panes.md)

Relationship: pattern. Sources: [overview](https://m3.material.io/foundations/layout/canonical-examples/overview), [list-detail](https://m3.material.io/foundations/layout/canonical-examples/list-detail), [supporting-pane](https://m3.material.io/foundations/layout/canonical-examples/supporting-pane).

Reviewed sections: Canonical examples/List-detail and Supporting pane/Across breakpoints.

Requirements: List-detail uses one pane on compact windows, usually one on medium and two on expanded windows. Supporting content stacks below primary content on compact and medium windows, then sits alongside it on expanded windows. Preserve selection and scroll state.

Framework comparison: Below 840px the generic layout hides inactive panes, including supporting panes. This differs from stacked supporting content. The breakpoint, equal panes and three-pane layouts are framework choices.

Integration gap: Viewport rules at 840px override narrow-container collapse; compact supporting layouts hide rather than stack supporting content. Next check: Use an explicit application layout when both panes must remain visible; test actual container width, reading order, selection and scrolling.

Mapped browser scope: Example-only compact/detail switching, focus return, read state, breakpoint resizing and themed treatments.

## [Drag handle](../../components/drag-handle.md)

Relationship: related. Sources: [overview](https://m3.material.io/components/bottom-sheets/overview), [specs](https://m3.material.io/components/bottom-sheets/specs), [guidelines](https://m3.material.io/components/bottom-sheets/guidelines), [accessibility](https://m3.material.io/components/bottom-sheets/accessibility).

Reviewed sections: Bottom sheets/Accessibility: dragging alternatives and handle behavior.

Requirements: A decorative grip is not an operable control. Bottom-sheet guidance describes activation to cycle available heights; provide keyboard and non-drag pointer alternatives for any real drag operation.

Framework comparison: The generic grip supplies styling. The sheet button dismisses instead of cycling heights. Real resizing or reordering needs an operation with keyboard and non-drag pointer alternatives.

Integration gap: Standalone grip styling supplies no drag, resize or reorder operation. Next check: Provide a named operable control plus keyboard and non-drag pointer alternatives for the real operation.

No browser check is directly mapped. Source and unit tests do not substitute for the concrete rendered check above.

## [Bottom sheet](../../components/bottom-sheet.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/bottom-sheets/overview), [specs](https://m3.material.io/components/bottom-sheets/specs), [guidelines](https://m3.material.io/components/bottom-sheets/guidelines), [accessibility](https://m3.material.io/components/bottom-sheets/accessibility).

Reviewed sections: Overview; Specs; Guidelines; Accessibility.

Requirements: Distinguish standard and modal sheets. Keep overflowing content scrollable, close actions reachable and height changes available without dragging. Verify the selected width and margin configuration against Google measurements.

Framework comparison: Native dialog and the shared drag handler provide dismissal, not height stops. The source uses its 600px medium breakpoint where Google describes a 640dp threshold; do not claim matching geometry.

Integration gap: The shared handle dismisses rather than cycling sheet heights; long-content and drag behavior are outside the new modal check. Next check: Use explicit close controls; separately verify reachable scrolling and any application-owned height changes.

Mapped browser scope: Each native dialog variant: modal containment, Escape, explicit close/return focus and nonmodal outside focus. No drag or long-content assertion.

## [Side sheet](../../components/side-sheet.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/side-sheets/overview), [specs](https://m3.material.io/components/side-sheets/specs), [guidelines](https://m3.material.io/components/side-sheets/guidelines), [accessibility](https://m3.material.io/components/side-sheets/accessibility).

Reviewed sections: Overview; Specs; Guidelines; Accessibility.

Requirements: Use standard or modal sheets for optional supporting content. Mirror the trailing edge in RTL, avoid horizontal scrolling and provide an accessible close action separate from dragging.

Framework comparison: The contract supports native show/showModal and shared dragging. Supply a named close action that works without dragging.

Verification gap: Native modal/nonmodal focus is checked; start-docked RTL drag direction and long-content fit remain unverified. Next check: Test the actual RTL edge, drag alternative, enlarged labels and reachable close action.

Mapped browser scope: Each native dialog variant: modal containment, Escape, explicit close/return focus and nonmodal outside focus. No drag or long-content assertion.

## [Floating sheet](../../components/floating-sheet.md)

Relationship: related. Sources: [overview](https://m3.material.io/components/dialogs/overview), [specs](https://m3.material.io/components/dialogs/specs), [guidelines](https://m3.material.io/components/dialogs/guidelines), [accessibility](https://m3.material.io/components/dialogs/accessibility).

Reviewed sections: Related Dialogs/Usage and Accessibility/Keyboard; no standalone floating-sheet specification.

Requirements: Apply the relevant dialog naming, keyboard, focus and dismissal guidance. Google has no standalone floating-sheet specification; its inset geometry is a framework choice.

Framework comparison: This is an inset native-dialog extension. Its width, corners and elevation are framework choices, not a separate Google specification.

Verification gap: Native dialog focus and close are checked; long-content zoom and inset geometry remain unverified. Next check: Verify content scrolling and action reachability in the chosen inset dialog.

Mapped browser scope: Each native dialog variant: modal containment, Escape, explicit close/return focus and nonmodal outside focus. No drag or long-content assertion.
