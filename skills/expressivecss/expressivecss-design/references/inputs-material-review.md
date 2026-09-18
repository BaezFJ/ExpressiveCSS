# Inputs and choices

Reviewed on 2026-09-13. Google evidence covers the linked rendered prose and textual measurements. Collapsed token tables, image-only measurements, full visual parity, native zoom and spoken assistive-technology output remain unverified. dp values are design references, not automatic CSS-pixel conformance.

Read the linked component guide for the ExpressiveCSS 0.10.0 markup and API contract. RoutePlate runtime assets may differ. The [capability roadmap](../../references/capability-roadmap.md) records source pins and scoped browser results.

## [Menu](../../components/menu.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/menus/overview), [specs](https://m3.material.io/components/menus/specs), [guidelines](https://m3.material.io/components/menus/guidelines), [accessibility](https://m3.material.io/components/menus/accessibility).

Reviewed sections: Overview; Specs; Guidelines; Accessibility.

Requirements: Choose the current standard, vibrant or grouped menu for a set of choices. Verify 48dp actionable targets, unclipped placement, first-item focus, arrows, typeahead, Escape and submenu navigation. A menu item should not contain multiple independent controls.

Framework comparison: The runtime owns menu roles and keys. A 44px visual item does not establish a 48dp effective target. Baseline measurements do not prove current Expressive geometry.

Verification gap: Closing animation focus exclusion, submenu RTL, item targets and typeahead need a rendered check. Next check: Exercise a normal-duration closing popup with immediate Tab and Shift+Tab; measure targets and test nested menus.

Mapped browser scope: Rail shell ownership; enhanced select interaction; generated Menu registry/resource cleanup; tooltip ownership across route replacement. Negative control proves resources remain without destroy; no visual parity assertion. Open/close reversal and destruction during opening/closing preserve visibility, focus and completion callback ownership. Equivalent Firefox and WebKit cases run in the same file.

## [Tabs](../../components/tabs.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/tabs/overview), [specs](https://m3.material.io/components/tabs/specs), [guidelines](https://m3.material.io/components/tabs/guidelines), [accessibility](https://m3.material.io/components/tabs/accessibility).

Reviewed sections: Specs/Primary tabs and Secondary tabs; Guidelines/Choosing the tab variant; Accessibility/Keyboard navigation.

Requirements: Use primary or secondary tabs for related content, with consistent labels and icons, selected state and reachable overflow. Google describes arrow navigation; native anchor navigation is a distinct web adaptation.

Framework comparison: The current contract uses native anchors and has no tablist or arrow-key runtime. Preserve those semantics until the full composite keyboard contract exists.

Integration gap: Native links use Tab and aria-current; runtime does not implement composite tab arrow keys. Next check: Retain native anchor semantics; test overflow and selected-panel focus before adding tab roles.

Mapped browser scope: Native section links, retained search query and single-select suggestions, Arrow/Enter/Escape/Tab; no spoken-result assertion.

## [Search](../../components/search.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/search/overview), [specs](https://m3.material.io/components/search/specs), [guidelines](https://m3.material.io/components/search/guidelines), [accessibility](https://m3.material.io/components/search/accessibility).

Reviewed sections: Overview; Specs; Guidelines; Accessibility.

Requirements: Prefer the contained Expressive style. Adapt compact full-screen and wider docked search to available space, preserve the submitted query and make suggestions reachable and announced.

Framework comparison: Contained styling exists. The application owns visibility, dialog focus, suggestions and result announcements.

Integration gap: CSS does not supply search results announcements or modal focus ownership. Next check: Verify submitted-query retention, full-screen return focus and spoken results in the application.

Mapped browser scope: Native section links, retained search query and single-select suggestions, Arrow/Enter/Escape/Tab; no spoken-result assertion.

## [Select](../../components/select.md)

Relationship: related. Sources: [overview](https://m3.material.io/components/menus/overview), [specs](https://m3.material.io/components/menus/specs), [guidelines](https://m3.material.io/components/menus/guidelines), [accessibility](https://m3.material.io/components/menus/accessibility), [guidelines](https://m3.material.io/components/text-fields/guidelines), [accessibility](https://m3.material.io/components/text-fields/accessibility).

Reviewed sections: Overview; Specs; Guidelines; Accessibility.

Requirements: Google menu guidance includes select and text-field dropdown menus. Single selection replaces the previous value; multiple selection remains open. Preserve field labels and associated errors.

Framework comparison: The framework enhances native select elements with combobox/listbox behavior. This is related to Google menu guidance, not a standalone Google select component.

Verification gap: Current browser evidence covers lifecycle and enlarged labels, not every disabled, grouped, or multiple-selection path. Next check: Exercise native form submission, optgroups, disabled options and multiple selection in each target browser.

Mapped browser scope: Rail shell ownership; enhanced select interaction; generated Menu registry/resource cleanup; tooltip ownership across route replacement. Negative control proves resources remain without destroy; no visual parity assertion. Filled enhanced select label/value separation with multiline LTR/RTL labels at 16px and 32px root text size. Native zoom, native and outlined selects are not covered. Equivalent Firefox and WebKit cases run in the same file.

## [Autocomplete](../../components/autocomplete.md)

Relationship: related. Sources: [overview](https://m3.material.io/components/menus/overview), [specs](https://m3.material.io/components/menus/specs), [guidelines](https://m3.material.io/components/menus/guidelines), [accessibility](https://m3.material.io/components/menus/accessibility), [guidelines](https://m3.material.io/components/text-fields/guidelines), [accessibility](https://m3.material.io/components/text-fields/accessibility), [accessibility](https://m3.material.io/components/search/accessibility).

Reviewed sections: Overview; Specs; Guidelines; Accessibility.

Requirements: Provide a labelled text field, reachable suggestions and clear selection state. Announce new results when suggestions update; filtering and selection must preserve the intended value.

Framework comparison: Runtime supplies combobox/listbox and selection state. status-info does not provide result announcements.

Version 0.10.0 preserves the search dataset, replacement queries and initial display labels; input Escape cancels pending opening, and listbox options stay outside sequential Tab order.

Feature gap: Generated status-info does not announce new suggestion counts or asynchronous results. Next check: Implement and verify an appropriate result-status update; test spoken delivery and multi-select keyboard behavior.

Mapped browser scope: Native section links, retained search query and single-select suggestions, Arrow/Enter/Escape/Tab; no spoken-result assertion. Initial selected record retains its display label and selection through first focus and Tab exit.

## [Date picker](../../components/date-picker.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/date-pickers/overview), [specs](https://m3.material.io/components/date-pickers/specs), [guidelines](https://m3.material.io/components/date-pickers/guidelines), [accessibility](https://m3.material.io/components/date-pickers/accessibility).

Reviewed sections: Accessibility/Date entry methods, Accessible date input, Affordance for keyboard shortcuts, Color contrast between dates, Keyboard navigation.

Requirements: Distinguish docked, modal, input and range variants. Provide manual entry and a date-format description. Calendar navigation includes arrows, Home/End, Page Up/Down and modified month/year movement.

Framework comparison: Inline and docked APIs do not establish modal parity. The calendar claims a grid role but lacks the corresponding navigation keys. Manual text parsing exists.

Feature gap: Modal picker parity is not provided by the documented inline API. Next check: Decide the modal picker contract, focus behavior and dismissal before adding it; preserve inline and docked APIs.

Feature gap: Calendar markup claims a grid but lacks calendar arrow, Home/End and month-navigation key handling; modal/range coverage remains incomplete. Next check: Implement and test the calendar keyboard contract or choose native date input; verify locale and constrained-date behavior.

No browser check is directly mapped. Source and unit tests do not substitute for the concrete rendered check above.

## [Time picker](../../components/time-picker.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/time-pickers/overview), [specs](https://m3.material.io/components/time-pickers/specs), [guidelines](https://m3.material.io/components/time-pickers/guidelines), [accessibility](https://m3.material.io/components/time-pickers/accessibility).

Reviewed sections: Overview; Specs; Guidelines; Accessibility.

Requirements: Provide named hour and minute inputs, manual entry, 12/24-hour handling and named AM/PM selection state. Keep an input alternative when the dial is unsuitable for available space.

Framework comparison: Hour/minute text entry exists but its fields are unnamed; AM/PM controls lack role/state. The documented dial options differ from Google measurements.

Feature gap: Modal picker parity is not provided by the documented inline API. Next check: Decide the modal picker contract, focus behavior and dismissal before adding it; preserve inline and docked APIs.

Feature gap: Hour/minute inputs are unnamed and AM/PM controls have no role or selected state; modal and complete keyboard behavior remain incomplete. Next check: Design localized input names and period controls, then test keyboard entry, 12/24-hour modes and dialog focus.

No browser check is directly mapped. Source and unit tests do not substitute for the concrete rendered check above.

## [Checkboxes](../../components/checkboxes.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/checkbox/overview), [specs](https://m3.material.io/components/checkbox/specs), [guidelines](https://m3.material.io/components/checkbox/guidelines), [accessibility](https://m3.material.io/components/checkbox/accessibility).

Reviewed sections: Overview; Specs; Guidelines; Accessibility.

Requirements: Use labelled independent multi-select options with a 48dp effective target. An indeterminate parent reflects partial child selection. The Google accessibility table contains chip-specific shortcuts; native checkbox behavior uses Space.

Framework comparison: Native inputs provide checked and indeterminate states. The application owns parent aggregation. Use native checkbox keys instead of the chip-removal shortcuts in the reviewed Google table.

Verification gap: Native state coverage does not verify parent aggregation or every target and forced-colors state. Next check: Test partial child selection, label activation, effective targets and forced-colors rendering.

Mapped browser scope: Example-only responsive layout, targets, keyboard settings and save behavior, themed treatments; no component-wide parity. Named native controls, form values and native keys; one compact text-spacing/RTL fixture and light/dark label contrast only.

## [Radio buttons](../../components/radio-buttons.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/radio-button/overview), [specs](https://m3.material.io/components/radio-button/specs), [guidelines](https://m3.material.io/components/radio-button/guidelines), [accessibility](https://m3.material.io/components/radio-button/accessibility).

Reviewed sections: Overview; Specs; Guidelines; Accessibility.

Requirements: Use a named group of exclusive options with 48dp targets and native arrow navigation. Guidelines favor a default; the accessibility page also discusses an initially empty group. Choose the initial state for the task.

Framework comparison: Native grouped inputs provide exclusive selection. Preserve the intended initial state instead of forcing a default for every task.

Verification gap: Native group selection is checked; initially-empty and disabled-option paths remain unmeasured. Next check: Check both Tab directions and arrow wrapping with the actual default and disabled choices.

Mapped browser scope: Named native controls, form values and native keys; one compact text-spacing/RTL fixture and light/dark label contrast only.

## [Switches](../../components/switches.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/switch/overview), [specs](https://m3.material.io/components/switch/specs), [guidelines](https://m3.material.io/components/switch/guidelines), [accessibility](https://m3.material.io/components/switch/accessibility).

Reviewed sections: Overview; Specs; Guidelines; Accessibility.

Requirements: Use a switch for an immediate binary setting with a stable label and a 48dp effective target. Preserve native checkbox keyboard behavior and verify that the setting actually changes.

Framework comparison: The label wraps a native checkbox. Preserve its keyboard behavior and verify an immediate setting change; the source does not implement persistence.

Integration gap: The styled native checkbox does not perform or announce a persisted setting change. Next check: Verify immediate application outcome and failure recovery with a stable label.

Mapped browser scope: Named native controls, form values and native keys; one compact text-spacing/RTL fixture and light/dark label contrast only.

## [Slider](../../components/slider.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/sliders/overview), [specs](https://m3.material.io/components/sliders/specs), [guidelines](https://m3.material.io/components/sliders/guidelines), [accessibility](https://m3.material.io/components/sliders/accessibility).

Reviewed sections: Overview; Specs; Guidelines; Accessibility.

Requirements: Choose standard, centered or range selection and an appropriate track size. Verify immediate values, arrows, Home/End, stops and orientation. Provide synchronized numeric entry when precise values matter.

Framework comparison: Native range and paired range clamping exist. Version 0.10.0 repairs zero-maximum and resized value-label defects.

Version 0.10.0 repairs zero maximum calculations and updates value-label geometry on resize, including RTL.

Verification gap: Zero maximum and resized RTL value-label placement are checked; vertical, dual-range and forced-colors geometry remain unverified. Next check: Measure noncentral vertical and paired handles; test a synchronized numeric input and non-drag pointer changes.

Mapped browser scope: Named native controls, form values and native keys; one compact text-spacing/RTL fixture and light/dark label contrast only. Correct zero maximum fraction/stop count, resized value label, noncentral RTL geometry and native End key.

## [Chips](../../components/chips.md)

Relationship: component. Sources: [overview](https://m3.material.io/components/chips/overview), [specs](https://m3.material.io/components/chips/specs), [guidelines](https://m3.material.io/components/chips/guidelines), [accessibility](https://m3.material.io/components/chips/accessibility).

Reviewed sections: Overview; Specs; Guidelines; Accessibility.

Requirements: Distinguish assist, filter, input and suggestion chips. Verify a 48dp effective target around the 32dp visual chip, separate named removal controls, overflow and focus after deletion.

Framework comparison: Native buttons, checkboxes and inert display chips serve different jobs. Google gridcell examples require a complete grid keyboard model. Verify separate targets and focus after deletion.

Verification gap: Filter selection is checked; input-chip deletion, dual targets and focus after removal remain unverified. Next check: Test keyboard and pointer removal, next-focus recovery, wrapping and nonoverlapping targets.

Mapped browser scope: Named native controls, form values and native keys; one compact text-spacing/RTL fixture and light/dark label contrast only.

## [Fieldsets](../../components/fieldsets.md)

Relationship: related. Sources: [overview](https://m3.material.io/components/text-fields/overview), [specs](https://m3.material.io/components/text-fields/specs), [guidelines](https://m3.material.io/components/text-fields/guidelines), [accessibility](https://m3.material.io/components/text-fields/accessibility).

Reviewed sections: Related Text fields/Labels and Accessibility/Labeling elements; native grouping is a web adaptation.

Requirements: Use native fieldset and legend to name related form controls. Text-field labels and errors remain relevant, but Google has no dedicated fieldset specification.

Framework comparison: Outlined grouping tokens are a framework design choice. Reuse field-label guidance while preserving native fieldset and legend semantics.

Verification gap: Named native groups and disabled descendants are checked; long legends and nested groups remain unverified. Next check: Enlarge translated legends and verify readable group names without clipping.

Mapped browser scope: Example-only responsive layout, targets, keyboard settings and save behavior, themed treatments; no component-wide parity. Named native controls, form values and native keys; one compact text-spacing/RTL fixture and light/dark label contrast only.
