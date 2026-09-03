# Evidence ledger

Use this ledger with the review matrix. The fixture or working brief owns coverage. The reviewer may add reached items but may not remove a required item because it is difficult to exercise.

## Fixture-owned coverage inventory

Create this inventory before evidence collection. States and responsive boundaries are explicit keys. Long content, theme, input path, locale, and direction are dimensions, not states.

| Inventory ID | Kind | Required value | Applies at |
| --- | --- | --- | --- |
| — | state, boundary, theme, input-path, assistive-path, data, locale, or direction | — | route + task point + component |

For every responsive boundary, declare two inventory entries with exact widths: one immediately below and one immediately above. Declare every required state, including blocked or hard-to-reach states. Before reporting completion, compare the completed ledger keys to this inventory. A missing key fails coverage. Do not infer completeness from the records the reviewer happened to collect, and do not require an undeclared full Cartesian product.

## Evidence records

Use one row per criterion instance and scoped observation. `Component ID` may be `none` only for a surface-level claim.

| Criterion instance ID | Criterion ID | Component ID | Inventory ID | Expected observation | Evidence kind | Artifact | Sequence | Timestamp | Result | Blocker reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — | — | — | ISO 8601 with offset | — | — |

Rules:

- The criterion ID must exist exactly once in the review matrix. The evidence kind must be allowed by that criterion, and every required evidence kind needs its own artifact.
- Record the expected observation before judging the artifact. `Pass` requires the artifact to contain that observation.
- Use a strictly increasing integer sequence and an ISO 8601 timestamp for each collection or edit event. Preserve the event trace.
- In a combined review, every Critique evidence record must have a smaller sequence number and earlier timestamp than the first Audit evidence record. Heading or report order is not proof of collection order.
- A missing required artifact is `Blocked`, with a concrete blocker reason. `Not applicable` is valid only when the fixture proves the criterion cannot occur.
- A missing rendered capture blocks only criteria that require `rendered-capture`. Source evidence may still prove a source-only host-element criterion.
- Record screenshots, accessibility-tree captures, source locations, runtime traces, commands, and test output by artifact ID or link. Never record only "verified."
- Split records whenever component, route, task point, state, width, theme, data, input path, locale, or direction produces a different result.

## Coverage reconciliation

| Inventory ID | Required ledger keys | Observed ledger keys | Status | Blocker reason |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

Every inventory ID must appear exactly once in this reconciliation. Every state must have at least one evidence record. Every reached boundary must have records at the declared widths immediately below and above it. Required dimensions need representative combinations named by the fixture or brief. Extra observations do not compensate for a missing required key.

## Matched capture pairs

Refine and Redesign require baseline and after artifacts. Keep each dimension in a separate field so exact comparison cannot hide a mismatch inside a combined label.

| Pair ID | First edit sequence and timestamp | Baseline sequence and timestamp | Route | Task point | Data fixture ID | State | Viewport width and height | Device scale factor | Color scheme | Motion preference | Locale | Direction | Before artifact | After artifact | Blocker reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |

Acceptance requires exact string or numeric equality across every declared dimension in the before and after artifact metadata: route, task point, data fixture ID, state, viewport width, viewport height, device scale factor, color scheme, motion preference, locale, and direction. The baseline sequence and timestamp must predate the first edit sequence and timestamp. A true-looking `matched` flag is not evidence.

Add one difference row for every visible difference. Refine and Redesign require at least one classified visible change; an empty difference table is incomplete because it does not demonstrate that the requested change reached the rendered result.

| Pair ID | Difference ID | Region | Before observation | After observation | Classification | Requirement or rationale |
| --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | intended, framework-required, or regression | — |

An unavailable baseline must block all before-and-after comparison claims. Create the pair record and blocker event before editing, leave both artifact fields unresolved, and never substitute a post-edit reconstruction or classify the missing baseline as `Not applicable`.
