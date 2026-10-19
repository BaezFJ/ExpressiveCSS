# Motion foundation

Use motion to explain a state change, feedback, or a spatial relationship. Prefer the selected component's existing behavior. Reuse the root version check and read the [transition reference](../../expressivecss-usage/references/transitions.md) only for the CSS scale utilities.

## Material intent

Google's [motion guidance](https://m3.material.io/styles/motion/overview) and [Android motion implementation](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md) distinguish spatial changes from effects such as color and opacity. Effects should settle without overshooting their valid range. Spring speed depends on the element's size and travel distance; fast, default, and slow are contextual choices. Reviewed 2026-09-07. Android spring attributes and animation APIs are not ExpressiveCSS APIs.

## Existing implementation and limits

| Capability | ExpressiveCSS support |
| --- | --- |
| Component motion | Component CSS transitions/animations and, where required, component runtime. Keep that ownership. |
| Sampled spatial spring | Button groups expose `--md-comp-button-group-motion`, a CSS `linear()` curve sampled from Google's fast spatial spring. Width and radius use it at `200ms`; this is not a general spring solver. |
| Expanding-card timing | CSS exposes `--md-comp-expanding-card-motion-duration` and `--md-comp-expanding-card-motion-easing`; runtime close cleanup follows the actual CSS clip transition, including cancellation. Zero duration and reduced motion close immediately. |
| Generic scale entrance/exit | `.scale-transition` and its state classes; these only change visual transforms and do not provide disclosure semantics. |
| Motion tokens | `--md-sys-motion-easing-*` and `--md-sys-motion-duration-*` (short1 to extra-long4) on `:root` and `:host`. Components read them for on-scale curves and times, so one override changes every component using that step. Off-scale times stay literal. |
| Springs | `--md-sys-motion-spring-{fast,default,slow}-{spatial,effects}` and a `-duration` token each, solved at compile time into `linear()` easings. `motion="expressive"` on the root or a subtree selects the expressive spatial springs; `motion="standard"` switches back. Sass `spring($damping, $stiffness)` and `spring-duration()` build custom ones. There is no runtime spring solver: a spring interrupted mid-flight restarts from its current value with a fresh curve, without carrying velocity. |

The inspected implementation is `src/sass/components/_button-groups.scss`, `_expanding-card.scss`, `_transitions.scss`, and `src/ts/components/buttonGroup.ts` and `expandingCard.ts`. Reduced-motion behavior is component-specific; the scale utility suppresses transitions under reduced motion while retaining its final transform. Do not infer complete motion coverage from one component's media query.

## Apply motion safely

- Choose the component before choosing an animation. Do not wrap its own opening or closing sequence in a second transition.
- Keep CSS timings aligned with runtime cleanup and callbacks. Expanding-card duration overrides are supported; `onClose` still runs when closing starts, and reopening or teardown invalidates pending cleanup.
- For application-owned transitions, preserve the final DOM state and focus when motion is disabled or interrupted. Do not rely exclusively on `transitionend`, which may never fire after cancellation or removal of the transition.
- Honor `prefers-reduced-motion: reduce` for added motion. Reduce travel and repetition, retain useful feedback, and run completion/cleanup through the no-motion path too. The scale utility already suppresses its transitions for that preference.
- Avoid perpetual decorative motion and avoid JavaScript solely to reproduce an available CSS state change. Measure costly layout or paint only when the task calls for performance work.

## Verification

Exercise entry, exit, rapid reversal, removal during motion, and remounts with both motion preferences. Confirm focus, final visibility, announcements, and resource cleanup. Use browser evidence for timing and interruptions; source presence alone does not prove them. Pair each spring easing token with its own `-duration` token; a spring curve played over another duration is no longer that spring. Unified reduced-motion coverage remains a framework gap.
