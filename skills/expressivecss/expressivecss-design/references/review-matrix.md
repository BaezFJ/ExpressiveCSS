# Material 3 Expressive review matrix

Use this matrix for Critique, Audit, and combined finish reviews. Review only the surface, task paths, window classes, and states that are in scope or reachable. Preserve separate visual and technical evidence when both modes are requested.

## Status

- **Pass:** verified against rendered, runtime, source, or test evidence as appropriate.
- **Intentional adaptation:** differs from the default Material treatment, has a documented rationale, and preserves the user task, Material behavior, semantics, and accessibility requirements.
- **Fail:** contradicts an applicable Material, ExpressiveCSS, semantic, runtime, responsive, or accessibility requirement.
- **Not applicable:** the criterion is not relevant or reachable; state the reason instead of leaving the evidence blank.

Do not calculate a numeric or aggregate score. One blocked task or accessibility failure matters more than a high count of passing rows. Intentional adaptation cannot waive the semantics contract, required component behavior, or accessibility requirements.

## Evidence rules

- Use rendered evidence for hierarchy, containment, shape, type, icons, motion, themes, overflow, and responsive composition.
- Use interaction and accessibility-tree evidence for keyboard behavior, focus, names, announcements, modal behavior, and state changes.
- Use source, computed styles, runtime inspection, and tests for component contracts, tokens, initialization, teardown, and generated state.
- Record a concrete location. Prefer a file and component or route plus viewport, theme, and state over a vague page name.
- Every **Fail** needs user impact and one concrete fix. Every **Pass** needs positive evidence. Every **Intentional adaptation** needs its rationale. Every **Not applicable** needs its reason.

## Review matrix

Copy the table into the review report and replace each placeholder. Split a row when different parts of the surface have different results.

| Area | Criterion | Status | Evidence | Impact | Location | Concrete fix |
| --- | --- | --- | --- | --- | --- | --- |
| Component choice and anatomy | Each job uses the documented ExpressiveCSS component, native element, anatomy, class, and option for the target version. | — | — | — | — | — |
| Emphasis, containment, shape, type, icons, motion, and state layers | Hierarchy is deliberate; emphasis is scarce; containment has a purpose; supported shape, type roles, Material Symbols, motion, and state layers follow Material behavior. | — | — | — | — | — |
| Window-class adaptation and navigation | Every reached Compact, Medium, Expanded, Large, and Extra-large class has an intentional structure and appropriate navigation without duplicate destinations or actions. | — | — | — | — | — |
| Semantic color roles and themes | Brand expression uses semantic color and type tokens; light and dark schemes preserve hierarchy, contrast, and state meaning without raw-color drift. | — | — | — | — | — |
| Authored semantics and runtime-owned ARIA | Authored elements and initial semantics follow `semantics.json`; changing ARIA values and generated IDs remain owned by the component runtime. | — | — | — | — | — |
| Loading, empty, error, permission, and recovery | Every reachable state preserves context, explains what happened, prevents duplicate work, and offers the next useful action. | — | — | — | — | — |
| Keyboard, focus, contrast, reflow, RTL, and reduced motion | The complete task works with keyboard and assistive technology; focus, contrast, zoom, reflow, RTL, touch targets, and reduced motion meet the applicable requirements. | — | — | — | — | — |
| Initialization and teardown | Each component initializes once, dynamic content uses the documented path, listeners and generated nodes are removed, and no stale runtime state or console errors remain. | — | — | — | — | — |

## Report order

1. State the operating mode, scope, target ExpressiveCSS version, tested environments, and evidence collected.
2. List what must be preserved.
3. Present P0 and P1 failures first, followed by P2 and P3 findings; do not bury them inside passing rows.
4. Include the completed matrix.
5. Name untested or blocked evidence explicitly. Do not convert missing evidence into **Pass** or **Not applicable**.
