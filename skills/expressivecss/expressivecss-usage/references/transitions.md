# Transitions foundation

Read this after the Usage guide when a task uses ExpressiveCSS CSS-only entrance or exit motion. Reuse the root guide's installed-version resolution. The [target-version Transitions documentation](https://www.expressivecss.com/css-transitions.html.md) and [transition Sass](https://github.com/BaezFJ/ExpressiveCSS/blob/master/src/sass/components/_transitions.scss) override this summary if they differ.

## Scale class contract

| Class | Effect |
| --- | --- |
| `.scale-transition` | Sets a 300ms transform transition with `cubic-bezier(0.53, 0.01, 0.36, 1.63)`. |
| `.scale-out` | Sets `transform: scale(0)` and changes the transform transition to 200ms. |
| `.scale-in` | Sets `transform: scale(1)`. |

Always pair the state class with `.scale-transition`:

```html
<button class="button scale-transition" type="button">Create</button>
<button class="button scale-transition scale-out" type="button">Hidden visually</button>
```

Both transition declarations use `!important`. A normal application transition declaration will not override them.

## Trigger an entrance or exit

For an exit, add `.scale-out` to an element that has already rendered with `.scale-transition`.

For an entrance, establish `.scale-out` first, wait at least one rendered frame so the browser computes `scale(0)`, then replace it with `.scale-in` or add `.scale-in`. If both state classes remain, `.scale-in` wins the transform by stylesheet order, while `.scale-out` still supplies the 200ms transition declaration. Prefer replacing the old state so the class list records one current state.

```js
const panel = document.querySelector('#panel');
panel.classList.add('scale-transition', 'scale-out');

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    panel.classList.replace('scale-out', 'scale-in');
  });
});
```

Adding the start and end classes before the browser renders the start state may snap directly to the end. Use `transitionend` when later work depends on the animation finishing, and filter for `event.propertyName === 'transform'`.

## Visibility and interaction

`.scale-out` changes only `transform`. It does not remove the element from layout, the accessibility tree, or the tab order. It also does not set `visibility`, `display`, `opacity`, `aria-hidden`, `inert`, or `hidden`.

When the transition represents true disclosure, synchronize the visual state with the component's documented accessibility and interaction contract. Do not put `aria-hidden="true"` on a container while focus remains inside it. Move focus when required, prevent hidden controls from receiving focus, and apply `hidden` only after an exit finishes if removing the content is the intended final state.

Do not use this utility to replace a component's own motion. Component classes and JavaScript own their transition timing, teardown, and accessibility state.

## Reduced motion

The transition foundation has no built-in `prefers-reduced-motion` rule. Add one in application CSS after ExpressiveCSS. Because the framework declaration is important, the override must also be important:

```css
@media (prefers-reduced-motion: reduce) {
  .scale-transition {
    transition: none !important;
  }
}
```

Removing the transition must not change the final task outcome. State changes, focus movement, live-region announcements, and cleanup still need to run.

## Verification

Test the initial render, entrance, exit, rapid reversal, repeated toggles, keyboard focus, reduced motion, and removal during a running transition. Confirm only one state class remains after the transition, `transitionend` cleanup cannot strand the element when motion is disabled, and the hidden visual state matches the DOM, accessibility, and focus state required by the component.
