# Motion foundation

Use motion to explain a state change, feedback, or a spatial relationship. Prefer the selected component's existing behavior. Reuse the root version check and read the [transition reference](../../expressivecss-usage/references/transitions.md) only for the CSS scale utilities.

## Material intent

Google's [motion guidance](https://m3.material.io/styles/motion/overview) and [Android motion implementation](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md) distinguish spatial changes from effects such as color and opacity. Effects should settle without overshooting their valid range. Spring speed depends on the element's size and travel distance; fast, default, and slow are contextual choices. Reviewed 2026-09-07. Android spring attributes and animation APIs are not ExpressiveCSS APIs.

## Existing implementation and limits

| Capability | ExpressiveCSS support |
| --- | --- |
| Component motion | Component CSS transitions/animations and, where required, component runtime. Keep that ownership. |
| Sampled spatial spring | Button groups expose `--md-comp-button-group-motion`, a CSS `linear()` curve sampled from Google's fast spatial spring. Width and radius use it at `200ms`; this is not a general spring solver. |
| Expanding-card timing | CSS exposes `--md-comp-expanding-card-motion-duration` and `--md-comp-expanding-card-motion-easing`; runtime close cleanup independently uses `500ms`. A CSS duration override does not synchronize that timer. |
| Generic scale entrance/exit | `.scale-transition` and its state classes; these only change visual transforms and do not provide disclosure semantics. |
| Global motion theme | No `--md-sys-motion-*` token family is emitted. There is no general public spring runtime or theme switch selecting Google's motion systems. |

The inspected implementation is `src/sass/components/_button-groups.scss`, `_expanding-card.scss`, `_transitions.scss`, and `src/ts/components/buttonGroup.ts` and `expandingCard.ts`. Reduced-motion behavior is component-specific; the scale utility has no built-in preference rule. Do not infer complete motion coverage from one component's media query.

## Apply motion safely

- Choose the component before choosing an animation. Do not wrap its own opening or closing sequence in a second transition.
- Keep CSS timings aligned with runtime cleanup and callbacks. A longer expanding-card CSS duration can be cut off by its fixed close timer; leave the duration unchanged unless a framework repair is in scope.
- For application-owned transitions, preserve the final DOM state and focus when motion is disabled or interrupted. Do not rely exclusively on `transitionend`, which may never fire after cancellation or removal of the transition.
- Honor `prefers-reduced-motion: reduce` for added motion. Reduce travel and repetition, retain useful feedback, and run completion/cleanup through the no-motion path too. Follow the scale reference's important override when using that utility.
- Avoid perpetual decorative motion and avoid JavaScript solely to reproduce an available CSS state change. Measure costly layout or paint only when the task calls for performance work.

## Verification

Exercise entry, exit, rapid reversal, removal during motion, and remounts with both motion preferences. Confirm focus, final visibility, announcements, and resource cleanup. Use browser evidence for timing and interruptions; source presence alone does not prove them. Treat a reusable spring system and unified reduced-motion coverage as framework gaps, not features to simulate with invented tokens.
