---
name: expressivecss-design
description: Design and review Material 3 Expressive web interfaces.
---

# ExpressiveCSS design and review

Use this guide to shape, implement, harden, or review a complete ExpressiveCSS surface. It adds a product-design workflow around the framework contract. It does not replace the target version's component documentation, Material 3 guidance, or accessibility rules.

## When to use

Read this guide for a new surface or flow, a redesign, a visual refinement, a responsive adaptation, or a pre-release interface review. For a narrow markup or API change, use the relevant component guide and support guide without expanding the task into a redesign.

## 1. Establish the brief

Inspect the existing product, nearby surfaces, manifest, installed ExpressiveCSS version, tokens, shared components, real content, and available assets before proposing a direction. Treat an established interface as evidence even when it has no formal design document.

Classify the task before acting. Choose one operating mode, or run Critique followed by Audit for a combined review:

- **Implement.** Build a new surface or extend an existing one inside the established product and theme. Change code, render the real interface, run the focused tests, and report the resulting evidence.
- **Refine.** Improve hierarchy, consistency, responsiveness, or finish while you preserve the existing product identity, content, information architecture, behavior, and scope.
- **Redesign.** Make structural changes when they are explicitly in scope, while preserving product requirements, factual content, functionality, accessibility, and stated constraints.
- **Critique.** Assess visual hierarchy, Material 3 Expressive quality, coherence, and usability without editing. Ground each finding in rendered evidence and an applicable rule.
- **Audit.** Check measurable implementation, semantics, runtime behavior, responsive behavior, and accessibility requirements without editing. Ground each finding in source, runtime, or test evidence.

Critique and audit are no-edit modes unless the user separately asks for fixes. For a combined review, record the visual critique before audit findings can bias it, then synthesize both evidence sets. Do not silently widen a refinement into a redesign or a review into implementation.

Ask only about missing decisions that would change the result. Resolve:

1. the user's primary task and the state that proves success;
2. the content, data, actions, and destinations the surface must contain;
3. the most important action in each region;
4. the window classes, input methods, and assistive technology paths that must work;
5. what must remain unchanged;
6. the app's brand seed, typography, icon style, and imagery when they cannot be inferred.

Do not ask the user to choose raw CSS values. Translate product and brand answers into ExpressiveCSS tokens and documented component variants.

## 2. Set a Material 3 Expressive direction

Material 3 Expressive governs design intent, component choice, adaptive behavior, and interaction. The ExpressiveCSS semantics contract governs authored semantics, while the accessibility guide supplies the WCAG checks. The consuming app's brand enters through semantic color roles, type tokens, icon style and axes, content voice, imagery, and assets. Do not replace familiar Material behavior merely to make the app look more branded.

Read [`../expressivecss-usage/SKILL.md`](../expressivecss-usage/SKILL.md), [`../expressivecss-theming/SKILL.md`](../expressivecss-theming/SKILL.md), and [`../expressivecss-accessibility/SKILL.md`](../expressivecss-accessibility/SKILL.md). Read every candidate component guide before choosing. Use [Material 3 guidance](https://www.expressivecss.com/m3-guidelines.md) for design intent and the target-version component documentation for the shipped contract.

Write a short working brief before code:

- **Task path:** what the user sees, decides, does, and receives as feedback.
- **Hierarchy:** primary content, supporting content, and the one high-emphasis action per region.
- **Adaptive plan:** Compact first, then Medium, Expanded, Large, and Extra-large where reachable. State what reflows, collapses, moves, or becomes a different documented component.
- **Component map:** one documented component per job, including navigation, containment, input, feedback, and progress.
- **Brand expression:** `--md-source`, role overrides when necessary, type tokens, Material Symbols style and axes, imagery, and content voice.
- **State plan:** loading, empty, error, success, disabled, selected, permission, offline, and destructive-action behavior that the feature can reach.

The brief is a decision aid, not a new public artifact. Save it only when the project already records design decisions or the user asks for one.

## 3. Compose with Material hierarchy

Build the task path before adding decoration.

- Use window size classes, panes, and documented navigation changes. Do not shrink a wide layout into Compact or leave phone navigation unchanged at wide sizes.
- Use proximity and spacing before wrapping every group in a card. Reserve containment for groups that need a boundary, state, interaction, or distinct surface role.
- Rank actions with Material containment. Use one filled or FAB-level action per region, then tonal, outlined, text, or icon actions as the hierarchy requires.
- Use surface roles for most of the interface. Reserve `primary` for important actions and use `vibrant` for one focal subtree, not the page.
- Use the shared 32, 40, 56, 96, and 136 dp control scale only where the documented component supports it. Large controls must communicate hierarchy, not compensate for weak layout.
- Keep every interactive target at least 48 by 48 dp, even when its visible control or glyph is smaller.
- Let selected items change shape as well as color when the component contract provides that treatment.
- Map text to the framework's Material type roles. Keep labels, body text, titles, headlines, and display text consistent across the surface. Use sentence case for controls. When the app has no brand type system, keep the default Roboto and Noto Sans stack; otherwise replace it through the framework type tokens rather than one-off font rules.
- Use Material Symbols consistently. Change the font family for outlined, rounded, or sharp; use the variation axes for fill, weight, grade, and optical size.
- Use framework state layers and motion. Motion must explain feedback, state, or spatial relationship and must keep a useful reduced-motion path.
- Use real product language and representative content. Do not invent commercial claims, customer names, capabilities, prices, or measurements.

A Google or Android product feel should come from Material structure and behavior, tonal surfaces, type roles, symbols, state layers, adaptive navigation, and disciplined emphasis. Do not draw mobile operating-system chrome or borrow another product's branding.

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

Use the real interface. Source inspection alone cannot prove hierarchy, overflow, focus, motion, or responsive behavior. Use the [review matrix](./references/review-matrix.md) for Critique, Audit, and combined finish reviews; record one evidence-backed status for every applicable row.

1. Run the consuming project's build and focused tests.
2. Exercise the primary task with keyboard and pointer input. Use touch input when the feature targets it.
3. In one batched browser pass, capture the relevant Compact, Medium, and Expanded or wider layouts. Test immediately below and above each reached boundary.
4. Include light and dark schemes, reduced motion, 200% text resizing, reflow at a 320 CSS px-equivalent viewport where WCAG reflow applies, long content, an error path, and right-to-left layout where relevant.
5. Inspect the accessibility tree, accessible names, focus order, focus visibility, announcements, dialog behavior, and contrast under [`../expressivecss-accessibility/SKILL.md`](../expressivecss-accessibility/SKILL.md).

When subagents are available, request one independent review after the implementation pass. Give the reviewer the original request, working brief, changed files, screenshots, and applicable ExpressiveCSS guides. The reviewer must not edit. It should return:

- what must be preserved;
- findings ordered by user impact;
- file or component location and visible evidence;
- the Material, accessibility, or framework rule involved;
- one concrete fix for each finding.

Use severity sparingly:

- **P0:** the task cannot be completed or data can be lost.
- **P1:** a major usability problem, accessibility failure, or wrong component behavior.
- **P2:** a responsive, state, consistency, or design-system defect with a workaround.
- **P3:** finish that does not block use.

In Implement, Refine, Redesign, or a review where the user separately requested fixes, fix the first evidence batch in one grouped edit, then run one confirmation batch. In Critique or Audit alone, stop after reporting evidence and findings. Two inspection rounds are the normal ceiling for self-directed polish, not permission to ship known P0 or P1 defects. Ask the user before widening scope or continuing subjective polish after the confirmation pass.

## Pitfalls

- Treating Material 3 as a color palette while keeping generic component structure.
- Replacing documented Material behavior with app-specific interaction patterns.
- Making every section a card, every action primary, or the whole page vibrant.
- Using raw colors, arbitrary shadows, or decorative motion where role tokens, tonal containment, or state layers carry the meaning.
- Styling only Compact or only Expanded and calling the result responsive.
- Reviewing a static screenshot while skipping interaction, state, content, and accessibility paths.
- Polishing one component while loading, empty, error, or recovery states remain unfinished.
- Changing factual copy or established brand decisions during a refinement without approval.

## Verification

Before delivery, confirm:

- the primary task is obvious and completes end to end;
- each job uses the correct documented component and native element;
- Compact through every reached wider window class have intentional structures;
- navigation, feedback, and high-emphasis actions are not duplicated;
- brand choices use semantic tokens and preserve Material behavior;
- every reachable state exists and gives the user a next step;
- keyboard, focus, names, announcements, contrast, zoom, reflow, reduced motion, and touch targets pass;
- light and dark schemes, long content, and relevant right-to-left layouts hold;
- no legacy Materialize names, duplicate initialization, console errors, or stale generated guides remain.

For changes to ExpressiveCSS itself, also follow the framework contribution path in the root skill and run the focused tests, `npm run typecheck`, the applicable full suite, `npm run build:skill`, docs verification, and visual checks.

## Workflow provenance

This workflow adapts the evidence-first review, refinement-versus-redesign boundary, state hardening, and bounded inspection ideas from [Impeccable](https://github.com/pbakaus/impeccable/tree/0330f61cef1c88291755beb373c81bef5f15be70/skill). Material 3 and the ExpressiveCSS contract replace Impeccable's open-ended visual-direction rules.
