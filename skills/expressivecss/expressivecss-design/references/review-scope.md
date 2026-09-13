# Choose review depth

Use a full review for explicit Material conformance or comprehensive accessibility audits, or when the user requests a complete interface review. Use the existing matrix, ledger, source requirements, and component groups within the declared scope. An explicit audit of one component does not imply auditing the entire product.

Use a focused review for a bounded implementation or fix. Keep one compact record in the task: affected component and behavior, selected criteria, observed result and evidence, tests, and unavailable checks. Refer to matrix IDs when useful; do not reproduce the full ledger, empty rows, or unrelated component groups.

Select criteria by the changed behavior and its dependencies. Keyboard operation, names, focus, contrast, target size, and relevant state changes still apply where affected. Reuse a capture for every observation it supports. Do not multiply viewport, theme, state, and locale combinations unless their results can differ for this change. Include the narrower layout and reached boundaries for adaptive work.

| Change | Focused verification |
| --- | --- |
| Label edit | Meaning and accessible name, truncation/wrapping, long/localized copy, and control operation if naming or interaction changed. |
| Tooltip repair | Hover/focus activation, trigger-to-bubble crossing, persistence, dismissal and focus, names/descriptions, reduced motion, teardown, and affected placements. |
| Adaptive pane change | Both sides of the affected boundary, narrow containers, selection and unsaved input, reading/focus order, open/back path, and obscured controls. |
| Explicit Material audit | Full requirement records for the selected Google sections, declared states and variants, applicable matrix rows, evidence and unresolved gaps. |

Report missing required evidence as Blocked. Do not classify an affected check as irrelevant to avoid collecting it. A focused pass describes only the change and tested dependencies, never full Material or WCAG conformance. Increase scope if a failure reveals a shared dependency, and state why.
