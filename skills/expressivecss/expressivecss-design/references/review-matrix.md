# Material 3 Expressive review matrix

Use this matrix for Critique, Audit, and combined reviews. A criterion is a testable claim, not a topic label. Copy applicable rows into the report and bind each copy to an evidence-ledger criterion instance.

## Status contracts

- **Pass:** every required evidence kind contains the expected observation and no allowed evidence contradicts it.
- **Intentional adaptation:** a soft design default differs for a recorded reason, and rendered evidence shows that the task, Material behavior, semantics, and accessibility remain intact.
- **Fail:** evidence contradicts an applicable claim.
- **Not applicable:** the fixture or brief proves that the criterion cannot occur in scope. Missing evidence is not a reason.
- **Blocked:** the criterion applies, but a required evidence kind or path could not be collected. Record the blocker.

Do not calculate a numeric or aggregate score. `Intentional adaptation` is available only on the Critique rows that list it. It is forbidden for every Audit contract, including host elements, authored semantics, runtime-owned ARIA, keyboard behavior, accessibility requirements, lifecycle behavior, and target-version conformance.

## Evidence and scope rules

The evidence vocabulary is `rendered-capture`, `interaction-trace`, `accessibility-tree`, `source`, `computed-style`, `runtime-inspection`, `test-output`, `contrast-measurement`, and `version-resolution`. A row may use only its allowed evidence kinds and cannot pass without every required kind. A missing screenshot blocks a row that requires `rendered-capture`; it does not block a source-proven host-element row. The word "verified" is not evidence.

Create one criterion instance per distinct component, route, task point, state, width, scheme, locale, direction, or input path when results can differ. Never combine light and dark, below and above a boundary, or keyboard and pointer into one status if their observations differ. Record each instance ID, expected observation, artifact, sequence, and timestamp in the evidence ledger.

## Critique matrix

Complete and timestamp Critique evidence before collecting Audit evidence in a combined review.

| Criterion ID | Area | Scope dimension | Falsifiable claim and pass threshold | Allowed evidence | Required evidence | Allowed statuses |
| --- | --- | --- | --- | --- | --- | --- |
| C-TASK-PRIMARY | Task hierarchy | route + task point | The brief-named primary action is present and is the sole highest-emphasis action at this task point. | `rendered-capture` | `rendered-capture` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-EMPHASIS-ONE | Emphasis | region + state | The region contains no more than one filled, FAB-level, or otherwise highest-emphasis action. | `rendered-capture`, `computed-style` | `rendered-capture` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-CONTAINER-PURPOSE | Containment | container | The working brief assigns this container a task, state, interaction, or distinct-surface purpose. | `rendered-capture`, `source` | `rendered-capture`, `source` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-SHAPE-CONTRACT | Shape | component + state | The rendered component shape equals a documented target-version shape or a recorded token override. | `rendered-capture`, `computed-style`, `source` | `rendered-capture`, `source` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-TYPE-ROLE | Type | text element + task point | The element uses the declared Material type role. | `rendered-capture`, `computed-style`, `source` | `computed-style`, `source` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-TYPE-TOKEN-CONSISTENCY | Type | type role + color scheme | Every peer with the same role resolves to the same type token values. | `computed-style`, `source` | `computed-style` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-ICON-SYSTEM | Icon treatment | icon | The icon uses the configured Material Symbols family and declared fill, weight, grade, and optical-size axes. | `rendered-capture`, `computed-style` | `computed-style` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-MOTION-PURPOSE | Motion | transition | The motion record names feedback, state, or spatial continuity as its purpose. | `interaction-trace`, `source` | `source` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-MOTION-REDUCED-OUTCOME | Motion | transition + reduced motion preference | With reduced motion enabled, the transition reaches the same task outcome. | `interaction-trace`, `rendered-capture` | `interaction-trace` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-STATE-LAYER-HOVER | State layers | component + hover state | The hover state uses the framework hover state-layer token. | `rendered-capture`, `computed-style`, `source` | `computed-style` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-STATE-LAYER-FOCUS-VISIBLE | State layers | component + focus-visible state | The focus-visible state uses the framework focus state-layer token. | `rendered-capture`, `computed-style`, `source` | `computed-style` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-STATE-LAYER-PRESSED | State layers | component + pressed state | The pressed state uses the framework pressed state-layer token. | `rendered-capture`, `computed-style`, `source` | `computed-style` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-STATE-LAYER-SELECTED | State layers | component + selected state | The selected state uses the framework selected state-layer token. | `rendered-capture`, `computed-style`, `source` | `computed-style` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-STATE-LAYER-DISABLED | State layers | component + disabled state | The disabled state uses the framework disabled state-layer token. | `rendered-capture`, `computed-style`, `source` | `computed-style` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-IDENTITY-CHANNELS | Visual coherence | route + scheme | Every identity change is traceable to a declared semantic token, type token, icon setting, image, asset, or content decision. | `rendered-capture`, `source` | `rendered-capture`, `source` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-ADAPTIVE-COMPOSITION | Adaptive composition | width | At this tested width, every brief-required region is present once and follows the composition declared for its window class. | `rendered-capture`, `accessibility-tree` | `rendered-capture` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-THEME-HIERARCHY | Themes | color scheme | In this required scheme, the same action and content ranks remain highest, supporting, and lowest emphasis as declared in the brief. | `rendered-capture`, `computed-style`, `contrast-measurement` | `rendered-capture` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-LONG-CONTENT-FIT | Content fit | long-content data fixture ID | Every required text node in the declared long-content fixture is fully visible without clipping. | `rendered-capture`, `runtime-inspection` | `rendered-capture` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-LOCALIZED-CONTENT-FIT | Content fit | localized data fixture ID + locale + direction | Every required text node in the declared localized fixture is fully visible without clipping. | `rendered-capture`, `runtime-inspection` | `rendered-capture` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-CONTENT-ACTIONS-VISIBLE | Action visibility | data fixture ID + width + locale + direction | Every required action is fully visible in the capture. | `rendered-capture`, `interaction-trace` | `rendered-capture` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-CONTENT-NO-OVERLAP | Layout overlap | data fixture ID + width + locale + direction | The capture contains zero unintended overlap between scoped elements. | `rendered-capture`, `runtime-inspection` | `rendered-capture` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-CONTENT-VIEWPORT-OVERFLOW | Viewport overflow or reflow | data fixture ID + width + locale + direction | The rendered document `scrollWidth` does not exceed its `clientWidth`. | `runtime-inspection`, `rendered-capture` | `runtime-inspection` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-LOCALIZED-READING-ORDER | Localized reading order | localized data fixture ID + locale + direction | The visual and accessibility-tree reading order equals the fixture-declared reading order. | `rendered-capture`, `accessibility-tree` | `rendered-capture`, `accessibility-tree` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |
| C-STATE-NONCOLOR | Visible state communication | state | The state differs from its peer by text, icon, shape, or another non-color cue visible in the capture. | `rendered-capture` | `rendered-capture` | Pass, Intentional adaptation, Fail, Not applicable, Blocked |

## Audit matrix

Audit rows are hard contracts. `Intentional adaptation` is never an allowed status.

| Criterion ID | Area | Scope dimension | Falsifiable claim and pass threshold | Allowed evidence | Required evidence | Allowed statuses |
| --- | --- | --- | --- | --- | --- | --- |
| A-HOST-ELEMENT | Host elements | component | The source host tag exactly equals the host required by the target-version component contract. | `source` | `source` | Pass, Fail, Not applicable, Blocked |
| A-ANATOMY | Anatomy | component + one anatomy fact | The one fixture-declared child-existence, cardinality, order, or nesting fact exactly matches the target-version contract. Create a separate row for every fact. | `source`, `runtime-inspection` | `source` | Pass, Fail, Not applicable, Blocked |
| A-LABEL | Labels | control or region + one naming fact | The one fixture-declared accessible-name value and its named target exactly match. Create a separate row for each named target. | `source`, `accessibility-tree` | `accessibility-tree` | Pass, Fail, Not applicable, Blocked |
| A-ID-UNIQUE | IDs | authored ID | The authored ID occurs exactly once in the rendered document. | `runtime-inspection`, `test-output` | `runtime-inspection` | Pass, Fail, Not applicable, Blocked |
| A-TARGET | Targets | target reference | The reference resolves to exactly the fixture-declared element. | `source`, `runtime-inspection` | `runtime-inspection` | Pass, Fail, Not applicable, Blocked |
| A-RELATIONSHIP | Relationships | relationship | The authored or runtime relationship resolves to every and only documented target. | `source`, `runtime-inspection`, `accessibility-tree` | `runtime-inspection` | Pass, Fail, Not applicable, Blocked |
| A-AUTHORED-SEMANTICS | Authored semantics | component + semantic field | The authored element, role, property, and state equal the applicable `semantics.json` requirement. | `source`, `accessibility-tree` | `source` | Pass, Fail, Not applicable, Blocked |
| A-RUNTIME-ARIA-SOURCE | Runtime-owned ARIA | component + owned field | Source omits each changing ARIA field and generated ID assigned to the runtime. | `source` | `source` | Pass, Fail, Not applicable, Blocked |
| A-RUNTIME-ARIA-INIT | Runtime-owned ARIA | component + owned field | Initialization creates the documented runtime-owned value on the initialized element. | `runtime-inspection`, `accessibility-tree` | `runtime-inspection` | Pass, Fail, Not applicable, Blocked |
| A-RUNTIME-ARIA-UPDATE | Runtime-owned ARIA | component + owned field + state | The declared interaction changes the runtime-owned value to the contract value for the reached state. | `interaction-trace`, `runtime-inspection`, `accessibility-tree` | `interaction-trace`, `runtime-inspection` | Pass, Fail, Not applicable, Blocked |
| A-KEYBOARD-ACTION | Keyboard behavior | action + one outcome fact | The one fixture-declared invocation-count or pointer-parity fact exactly matches the interaction trace. Create separate rows for count and parity. | `interaction-trace`, `test-output` | `interaction-trace` | Pass, Fail, Not applicable, Blocked |
| A-FOCUS-ORDER | Focus | task path + input path | Sequential focus visits each scoped control once in the fixture-declared task order. | `interaction-trace`, `accessibility-tree` | `interaction-trace` | Pass, Fail, Not applicable, Blocked |
| A-FOCUS-VISIBLE | Focus | control + state | Keyboard focus produces a visible indicator on the focused control. | `rendered-capture`, `computed-style` | `rendered-capture` | Pass, Fail, Not applicable, Blocked |
| A-ANNOUNCEMENT | Announcements | dynamic event | The accessibility tree or assistive trace exposes the fixture-required message after the triggering event. | `accessibility-tree`, `interaction-trace` | `accessibility-tree` | Pass, Fail, Not applicable, Blocked |
| A-CONTRAST-NORMAL | Contrast | normal-text sample | The measured foreground/background pair is at least 4.5:1. | `contrast-measurement`, `computed-style` | `contrast-measurement` | Pass, Fail, Not applicable, Blocked |
| A-CONTRAST-LARGE | Contrast | large-text sample | The measured foreground/background pair is at least 3:1. | `contrast-measurement`, `computed-style` | `contrast-measurement` | Pass, Fail, Not applicable, Blocked |
| A-CONTRAST-NONTEXT | Contrast | non-text sample | The measured UI or focus-indicator pair is at least 3:1. | `contrast-measurement`, `computed-style` | `contrast-measurement` | Pass, Fail, Not applicable, Blocked |
| A-ZOOM-200 | Zoom | route + task point + one zoom fact | At 200 percent text resizing, the one fixture-declared content-presence or action-operability fact passes. Create a separate row for each fact. | `rendered-capture`, `interaction-trace` | `rendered-capture`, `interaction-trace` | Pass, Fail, Not applicable, Blocked |
| A-REFLOW-320 | Reflow | route + task point + one reflow fact | At a 320 CSS px-equivalent viewport, the one fixture-declared scrolling or task-operability fact passes. Create separate rows for scrolling and operability. | `rendered-capture`, `interaction-trace` | `rendered-capture`, `interaction-trace` | Pass, Fail, Not applicable, Blocked |
| A-TOUCH-TARGET | Touch targets | control | Runtime geometry is at least 48 by 48 CSS pixels at device scale 1, or spacing satisfies the documented exception. | `runtime-inspection`, `test-output` | `runtime-inspection` | Pass, Fail, Not applicable, Blocked |
| A-RTL-READING | RTL | locale + direction + task point | Accessibility-tree reading order equals the fixture-declared RTL reading order. | `accessibility-tree` | `accessibility-tree` | Pass, Fail, Not applicable, Blocked |
| A-RTL-INTERACTION | RTL | locale + direction + action | Interaction order and directional keys equal the component contract for RTL. | `interaction-trace`, `test-output` | `interaction-trace` | Pass, Fail, Not applicable, Blocked |
| A-REDUCED-MOTION | Reduced motion | motion preference + task path + one motion fact | With reduced motion enabled, the one fixture-declared task-completion or state-visibility fact passes. Create separate rows for completion and each required state change. | `interaction-trace`, `rendered-capture` | `interaction-trace`, `rendered-capture` | Pass, Fail, Not applicable, Blocked |
| A-INIT-OWNER | Initialization | component | Exactly one declared owner is responsible for initialization: native, CSS-only, Auto Init, shared runtime, or manual. | `source`, `runtime-inspection` | `source` | Pass, Fail, Not applicable, Blocked |
| A-INIT-ONCE | Initialization | registry element | The initialization trace contains exactly one successful initialization for the registry element. | `runtime-inspection`, `test-output` | `runtime-inspection` | Pass, Fail, Not applicable, Blocked |
| A-DESTROY-BEFORE-REMOVE | Teardown | registry element | A manually owned instance calls `destroy()` before its registry element leaves the document. | `runtime-inspection`, `test-output` | `runtime-inspection` | Pass, Fail, Not applicable, Blocked |
| A-CLEAN-LISTENER | Teardown | registry element | Post-teardown inspection finds zero runtime-created listeners owned by the instance. | `runtime-inspection`, `test-output` | `runtime-inspection` | Pass, Fail, Not applicable, Blocked |
| A-CLEAN-TIMER | Teardown | registry element | Post-teardown inspection finds zero timers owned by the instance. | `runtime-inspection`, `test-output` | `runtime-inspection` | Pass, Fail, Not applicable, Blocked |
| A-CLEAN-OVERLAY | Teardown | registry element | Post-teardown inspection finds zero overlays owned by the instance. | `runtime-inspection`, `test-output` | `runtime-inspection` | Pass, Fail, Not applicable, Blocked |
| A-CLEAN-GENERATED-NODE | Teardown | registry element | Post-teardown inspection finds zero other generated nodes owned by the instance. | `runtime-inspection`, `test-output` | `runtime-inspection` | Pass, Fail, Not applicable, Blocked |
| A-CONSOLE-ERRORS | Console state | task path | The console trace contains zero ExpressiveCSS errors during the scoped task. | `runtime-inspection`, `test-output` | `runtime-inspection` | Pass, Fail, Not applicable, Blocked |
| A-TARGET-VERSION | Target-version conformance | API or syntax item | The version resolver and matching installed or tagged source both contain the exact API or syntax used. | `source`, `version-resolution` | `source`, `version-resolution` | Pass, Fail, Not applicable, Blocked |

## Component review groups

Create one group per selected component. A family group is allowed only when every member shares the exact contract fact under review. If one member has a different host, anatomy, semantic owner, adaptive substitution, initialization path, or teardown obligation, split the family into separate groups.

Use the generated guide's `Component ID` value and an exact rule ID printed under its `Rules` heading. The final row below demonstrates the join as `buttons@icon-only-control-is-named`, using the real `buttons` component and its real `icon-only-control-is-named` semantics rule. Copy or link each applicable generated-guide rule as one row.

| Criterion instance ID | Component ID | Generated guide rule ID | Criterion ID | Exact target-version contract fact | Status | Evidence record ID |
| --- | --- | --- | --- | --- | --- | --- |
| `<component-id>@A-HOST-ELEMENT` | `<component-id>` | — | `A-HOST-ELEMENT` | Exact documented host tag. | — | — |
| `<component-id>@A-ANATOMY` | `<component-id>` | — | `A-ANATOMY` | The first required-child existence, cardinality, order, or nesting fact. | — | — |
| `<component-id>@A-LABEL` | `<component-id>` | — | `A-LABEL` | The first accessible-name value and named-target fact. | — | — |
| `<component-id>@A-ID-UNIQUE` | `<component-id>` | — | `A-ID-UNIQUE` | One authored ID per row. | — | — |
| `<component-id>@A-TARGET` | `<component-id>` | — | `A-TARGET` | One target reference per row. | — | — |
| `<component-id>@A-RELATIONSHIP` | `<component-id>` | — | `A-RELATIONSHIP` | One other relationship per row. | — | — |
| `<component-id>@A-AUTHORED-SEMANTICS` | `<component-id>` | — | `A-AUTHORED-SEMANTICS` | One static authored semantic fact per row. | — | — |
| `<component-id>@A-RUNTIME-ARIA-SOURCE` | `<component-id>` | — | `A-RUNTIME-ARIA-SOURCE` | One runtime-owned field per row. | — | — |
| `<component-id>@A-RUNTIME-ARIA-INIT` | `<component-id>` | — | `A-RUNTIME-ARIA-INIT` | The initial runtime-owned value for one field. | — | — |
| `<component-id>@A-RUNTIME-ARIA-UPDATE:<state>` | `<component-id>` | — | `A-RUNTIME-ARIA-UPDATE` | One runtime-owned value after one declared state transition. | — | — |
| `<component-id>@C-ADAPTIVE-COMPOSITION:<substitution-id>` | `<component-id>` | `<adaptive rule ID>` | `C-ADAPTIVE-COMPOSITION` | One structured adaptive substitution at one width. | — | — |
| `<component-id>@A-INIT-OWNER` | `<component-id>` | — | `A-INIT-OWNER` | Exact initialization owner. | — | — |
| `<component-id>@A-DESTROY-BEFORE-REMOVE` | `<component-id>` | — | `A-DESTROY-BEFORE-REMOVE` | Exact destruction obligation. | — | — |
| `<component-id>@A-CLEAN-LISTENER` | `<component-id>` | — | `A-CLEAN-LISTENER` | Listener cleanup obligation. | — | — |
| `<component-id>@A-CLEAN-TIMER` | `<component-id>` | — | `A-CLEAN-TIMER` | Timer cleanup obligation. | — | — |
| `<component-id>@A-CLEAN-OVERLAY` | `<component-id>` | — | `A-CLEAN-OVERLAY` | Overlay cleanup obligation. | — | — |
| `<component-id>@A-CLEAN-GENERATED-NODE` | `<component-id>` | — | `A-CLEAN-GENERATED-NODE` | Generated-node cleanup obligation. | — | — |
| `buttons@icon-only-control-is-named` | `buttons` | `icon-only-control-is-named` | `A-AUTHORED-SEMANTICS` | An icon-only control has an accessible name after its decorative icon is hidden. | — | — |

When a component has more than one anatomy or label fact, keep the first instance ID above and append `:<fact-id>` or `:<target-id>` to each additional instance ID. Every resulting row still owns one fact.

Criterion IDs come only from the Critique or Audit matrix. Generated guide rule IDs use their own column and namespace. Bind matched captures to the existing criterion instance they demonstrate; do not invent a capture-only criterion ID.

## Report order

1. State the mode, scope, target version, fixture-owned coverage inventory, and tested environments.
2. List preservation requirements.
3. For a combined review, present Critique evidence collected before Audit evidence.
4. Present P0 and P1 failures before P2 and P3 within each mode.
5. Include every applicable matrix instance, component group, evidence record, matched pair, and blocker.
6. Fail the review as incomplete when required inventory or evidence is absent. Do not turn absence into `Not applicable`.
