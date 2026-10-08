---
name: expressivecss-design
description: Designs, refines, redesigns, critiques, and audits ExpressiveCSS interfaces and responsive flows. Use for a new surface or flow, a redesign, visual refinement, responsive adaptation, Material 3 Expressive conformance, or a pre-release review. Not for setup-only, token-only, or narrow lifecycle repairs, or a narrow markup or API change that needs no surface decision.
---

# ExpressiveCSS design and review

This guide adds a product-design workflow around the framework contract. It does not replace the target version's component guides, Material 3 guidance, or accessibility rules.

## Routing dependency

Follow the root staged routing truth table. Do not recreate it here. This guide starts after the root has classified the mode, shortlisted candidates, inspected candidate runtime ownership in the decision index, and recorded this guide's actual read. Use selected component guides for the matching bundled contract and adaptive decisions. Consult Material 3 guidance or target-version documentation for missing details or conflicts.

## References

Read each reference only when its condition applies.

| Reference | Read when |
| --- | --- |
| [design rules](../references/design-rules.md) | Always, before opening a component guide: hard rules, window sizes, component chooser, and screen recipes. |
| [product context](./references/product-context.md) | The work spans pages, continues an established product, or changes a recorded design decision. |
| [scaffold](./references/scaffold.md) | A complete page, app shell, or adaptive pane layout. |
| Theming [typography and emphasis](../expressivecss-theming/references/typography.md), [shape](../expressivecss-theming/references/shape.md), or [motion](../expressivecss-theming/references/motion.md) | A decision depends on one expressive foundation; read only that one. |
| [dashboard guide](../expressivecss-dashboard/SKILL.md) | A dashboard, analytics overview, admin console, or reporting page. Start from its reference implementation, not the dashboard template. |
| [runnable examples](../assets/examples/README.md) | A complete settings, editor, or list-detail flow, after selecting components. |
| [review scope](./references/review-scope.md) | Any review, to choose focused or full depth. |
| [performance](./references/performance.md) | The user reports a slowdown or asks for a performance review. |
| [review matrix](./references/review-matrix.md) and [evidence ledger](./references/evidence-ledger.md) | The review scope reference selects a full review. |
| [Material review](./references/material-conformance.md) | The task asks whether an interface follows Google's Material 3 Expressive specs, guidelines, or accessibility guidance. |
| Dated component review records: [priority components](./references/priority-material-review.md), [inputs and choices](./references/inputs-material-review.md), [navigation, actions and sheets](./references/layout-material-review.md), [content and feedback](./references/feedback-material-review.md), [web extensions](./references/web-extensions-review.md) | A Material conformance claim names a selected component. The component guide names its record; read only that component's section. |

## 1. Establish the brief

Inspect the existing product, nearby surfaces, manifest, installed ExpressiveCSS version, tokens, shared components, real content, and available assets before proposing a direction. Treat an established interface as evidence even when it has no formal design document. When product context applies, load only the decisions relevant to this task and keep accepted decisions apart from observations and proposals.

Classify the task before acting. Choose one operating mode, or run Critique followed by Audit for a combined review:

- **Implement.** Build a new surface or extend an existing one inside the established product and theme. Change code, render the real interface, run the focused tests, and report the resulting evidence.
- **Refine.** Improve hierarchy, consistency, responsiveness, or finish while you preserve the existing product identity, content, information architecture, behavior, and scope.
- **Redesign.** Make structural changes when they are explicitly in scope, while preserving product requirements, factual content, functionality, accessibility, and stated constraints.
- **Critique.** Assess visual hierarchy, Material 3 Expressive quality, coherence, and usability without editing. Ground each finding in rendered evidence and an applicable rule.
- **Audit.** Check measurable implementation, semantics, runtime behavior, responsive behavior, and accessibility requirements without editing. Ground each finding in source, runtime, or test evidence.

Critique and audit are no-edit modes unless the user separately asks for fixes. For a combined review, record the visual critique before audit findings can bias it, then synthesize both evidence sets. Do not silently widen a refinement into a redesign or a review into implementation.

Refine and Redesign require matched before-and-after evidence. Capture the baseline before editing with the same route, task point, data, state, viewport, device scale, color scheme, motion preference, and relevant locale and direction. If a baseline is unavailable, record that limitation before editing.

Ask only about missing decisions that would change the result. Resolve:

1. the user's primary task and the state that proves success;
2. the content, data, actions, and destinations the surface must contain;
3. the most important action in each region;
4. the window classes, input methods, and assistive technology paths that must work;
5. what must remain unchanged;
6. the app's brand seed, typography, icon style, and imagery when they cannot be inferred.

Do not ask the user to choose raw CSS values. Translate product and brand answers into ExpressiveCSS tokens and documented component variants.

## 2. Set a Material 3 Expressive direction

Material 3 Expressive governs design intent, component choice, adaptive behavior, and interaction; start from the design rules. The ExpressiveCSS semantics contract governs authored semantics, while the accessibility guide supplies the WCAG checks. The consuming app's brand enters through semantic color roles, type tokens, icon style and axes, content voice, imagery, and assets. Do not replace familiar Material behavior merely to make the app look more branded, and do not claim an Android capability exists in ExpressiveCSS without matching implementation evidence.

Write a short working brief before code:

- Task path: what the user sees, decides, does, and receives as feedback.
- Hierarchy: primary content, supporting content, and the one high-emphasis action per region.
- Adaptive plan: Compact first, then Medium, Expanded, Large, and Extra-large where reachable. State what reflows, collapses, moves, or becomes a different documented component.
- Scaffold map: bars, rails, content panes, and relevant safety regions; distinguish navigation from contextual actions. Name pane relationships, the narrower adaptation, and whether the document or individual panes own scrolling.
- Component map: one documented component per job, including navigation, containment, input, feedback, and progress.
- Brand expression: `--md-source`, role overrides when necessary, type tokens, Material Symbols style and axes, imagery, and content voice.
- State plan: loading, empty, error, success, disabled, selected, permission, offline, and destructive-action behavior that the feature can reach.

Keep the brief in the task unless an existing project record needs an in-scope update or the user asks to save it. Planning, Critique, and Audit alone do not authorize documentation edits.

## 3. Compose with Material hierarchy

For a complete page or shell, assign scaffold regions first, then map each region to the selected components. For a new static page that loads the compiled browser build, copy the closest bundled template beside the framework's `dist/` directory: [starter](../assets/templates/starter.html), [compact](../assets/templates/layout-compact.html), [navigation rail](../assets/templates/layout-rail.html), [expanded rail](../assets/templates/layout-expanded.html), [list-detail](../assets/templates/layout-list-detail.html), or [dashboard](../assets/templates/layout-dashboard.html). Replace its placeholder content. In a bundler or an existing app shell, keep the project's asset loading and initialization owner and borrow only the template's `<body>` regions. When you consult a runnable example, borrow the relationships between action size, containment, type, color, and shape, and keep the consuming product's identity.

Build the task path before adding decoration. These points add to the design rules' hard rules:

- Use window size classes, panes, and documented navigation changes. Do not shrink a wide layout into Compact or leave phone navigation unchanged at wide sizes.
- Use proximity and spacing before wrapping every group in a card. Reserve containment for groups that need a boundary, state, interaction, or distinct surface role.
- Keep spacing on the framework's scale. Window-edge margins are 16px on Compact and 24px from Medium, and panes sit 24px apart; the pane layout applies them through `--md-comp-pane-margin` and `--md-comp-pane-gap`, and `.container` bounds ordinary content with its own responsive widths, so do not add page margins on top of either. Inside a region, use `.p-4` (16px) or `.p-6` (48px) for section padding, the default `.row` gap (24px) between grid items, and `.mb-2` (8px) to `.mb-4` (16px) between related controls. Increase space between groups before adding dividers or cards.
- Write control text as the action it performs. Button labels are verbs ("Delete", "Save draft"), never "OK", "Yes", or "Submit". A dialog headline states the decision ("Delete 3 photos?") and its confirming button repeats the verb. An error message says what happened and how to recover, next to the control it concerns. Snackbar text is one short sentence with at most one action.
- Below the one high-emphasis action per region, rank the rest as tonal, outlined, text, or icon actions.
- Use surface roles and tonal containment for most of the interface instead of raw colors or arbitrary shadows. Reserve `primary` for important actions and use `vibrant` for one focal subtree, not the page.
- Use the shared 32, 40, 56, 96, and 136 dp control scale only where the documented component supports it. Large controls must communicate hierarchy, not compensate for weak layout.
- Keep every interactive target at least 48 by 48 dp, even when its visible control or glyph is smaller.
- Let selected items change shape as well as color when the component contract provides that treatment.
- Map text to the framework's Material type roles and keep each role consistent across the surface. When the app has no brand type system, keep the default Roboto and Noto Sans stack; otherwise replace it through the framework type tokens rather than one-off font rules.
- Use Material Symbols consistently. Change the font family for outlined, rounded, or sharp; use the variation axes for fill, weight, grade, and optical size.
- Use framework state layers and motion. Motion must explain feedback, state, or spatial relationship and must keep a useful reduced-motion path.
- Use real product language and representative content. Do not invent commercial claims, customer names, capabilities, prices, or measurements.

A Google or Android product feel comes from Material structure and behavior, tonal surfaces, type roles, symbols, state layers, adaptive navigation, and disciplined emphasis. Do not draw mobile operating-system chrome or borrow another product's branding.

## 4. Build the whole state path

A surface is incomplete if it works only with ideal data. Implement every reachable state using the appropriate ExpressiveCSS component:

| State | Required decision |
| --- | --- |
| Loading | Name the operation; use determinate progress when real progress exists. |
| Empty | Distinguish first use, no results, filtered results, and missing permission; provide the next useful action. |
| Error | Place the problem near its source, preserve user input, and offer a specific recovery. |
| Success | Confirm completion without blocking the next task. |
| Disabled | Keep the reason discoverable; do not use disabled styling as the only explanation. |
| Destructive | Prevent accidental activation and use a blocking decision only when interruption is justified. |
| Long or localized content | Allow wrapping and expansion; test long translations, CJK, emoji, numbers, and right-to-left text. |
| Slow or offline | Preserve context, prevent duplicate actions, and provide retry or honest unavailable states. |

Keep default, hover, focus-visible, pressed, selected, and disabled states coherent in light and dark schemes. Use color, shape, text, or icon changes so state never depends on color alone.

## 5. Review with evidence

Use the real interface; source inspection alone cannot prove hierarchy, overflow, focus, motion, or responsive behavior. For a complete interface, review the primary task in the whole-page composition first, because a valid component can still sit below oversized navigation or compete with secondary actions. Name the primary task and preservation requirements, inspect the initial viewport and the full page, then follow the action through its reachable states. Keep measured behavior separate from judgments about hierarchy, typography, containment, and recovery clarity, and back those judgments with captures and concrete observations. Passing DOM checks are not a design verdict.

Choose depth with the review scope reference. A full review records one evidence-backed status for every applicable matrix row in its declared scope, with one component group per distinct contract. A focused change uses the compact record from review scope. Neither path can waive a relevant failure or claim untested behavior passed. A Material conformance review verifies Google requirements separately from target-version framework contracts, using only the selected components and relevant specification sections.

Budget verification by scene, not by criterion. Batch related DOM observations, reuse each capture for every criterion it demonstrates, and prefer a full-page capture to repeated scrolling screenshots. Reserve capacity for the confirmation pass, and stop when a tool reports its resource limit. Open each capture before making a visual judgment from it; a screenshot path or DOM summary does not show that you saw the interface.

When ExpressiveCSS MCP tools such as `rules_enforcer` or `quality_inspector` contribute evidence, copy `checksPerformed`, `evidenceSources`, `uncheckedAreas`, `coverageStatus`, and `blockedChecks` into the compact record or full ledger. Mark a required unperformed check `Blocked`. MCP evidence does not replace browser interaction, rendered responsive, visual, or accessibility review.

Apply these checks to affected criteria and their dependencies in the selected scope. Unrelated states or components do not expand a focused review.

1. Run the consuming project's build and focused tests.
2. Exercise the primary task with keyboard and pointer input. Use touch input when the feature targets it.
3. In one batched browser pass, capture the relevant Compact, Medium, and Expanded or wider layouts. Test immediately below and above each reached boundary.
4. Include light and dark schemes, reduced motion, 200% text resizing, reflow at a 320 CSS px-equivalent viewport where WCAG reflow applies, long content, an error path, and right-to-left layout where relevant.
5. Inspect the accessibility tree, accessible names, focus order, focus visibility, announcements, dialog behavior, and contrast under [`../expressivecss-accessibility/SKILL.md`](../expressivecss-accessibility/SKILL.md).

Rank findings by severity, and use the higher levels sparingly:

- P0: the task cannot be completed or data can be lost.
- P1: a major usability problem, accessibility failure, or wrong component behavior.
- P2: a responsive, state, consistency, or design-system defect with a workaround.
- P3: finish that does not block use.

In Implement, Refine, Redesign, or a review where the user separately requested fixes, fix the first evidence batch in one grouped edit, then run one confirmation batch with the same checks. In Critique or Audit alone, stop after reporting evidence and findings. Two inspection rounds are the normal ceiling for self-directed polish, not permission to ship known P0 or P1 defects. Ask the user before widening scope or continuing subjective polish after the confirmation pass.

### Independent review and delegation

For a comprehensive review or a change spanning interaction and accessibility, request one independent review after implementation when subagents are available. A small label or token edit does not require another agent. Give the reviewer the original request, working brief, changed files, screenshots, and applicable ExpressiveCSS guides. The reviewer must not edit. It returns what must be preserved, then findings ordered by user impact, each with file or component location, visible evidence, the Material, accessibility, or framework rule involved, and one concrete fix.

A full review that spans many routes or component groups can be split under the shared [delegation rules](../references/delegation.md). In a combined review, collect Critique evidence yourself first, then split Audit work. Component review groups and routes split cleanly; a matched capture pair stays with whoever made the edit. Give each subagent its inventory IDs and criterion IDs, and replace the template's return row with evidence ledger rows that carry artifacts and timestamps. Merge the rows into one ledger, assign sequence numbers in timestamp order after the Critique records, then run the coverage reconciliation against the inventory. A returned row without an artifact you can open stays `Blocked`.

## Verification

Before delivery, confirm each item and return to section 5 for any that fails:

- [ ] The primary task is obvious and completes end to end.
- [ ] Each job uses the correct documented component and native element.
- [ ] Compact and every reached wider window class have intentional structures.
- [ ] Navigation, feedback, and high-emphasis actions are not duplicated.
- [ ] Brand choices use semantic tokens and preserve Material behavior.
- [ ] Every reachable state exists and gives the user a next step.
- [ ] Keyboard, focus, names, announcements, contrast, zoom, reflow, reduced motion, and touch targets pass. Report any you could not check as `Blocked` instead of passing it.
- [ ] Light and dark schemes, long content, and relevant right-to-left layouts hold.
- [ ] No retired names, duplicate initialization, console errors, or stale generated guides remain.

For changes to ExpressiveCSS itself, also follow the framework contribution path in the root skill and run the focused tests, `npm run typecheck`, the applicable full suite, `npm run build:skill`, docs verification, and visual checks.
