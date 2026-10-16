// prefers-reduced-motion. Each partial cancels its own transitions in a
// `@media (prefers-reduced-motion: reduce)` block; these are the ones that were
// missing or lost on specificity.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseRules, sheet } from './css.js';

const css = sheet();

/** Every rule nested in a reduced-motion media block, as parsed rules. */
function reducedMotionRules() {
  const out = [];
  for (const match of css.matchAll(/@media \(prefers-reduced-motion: reduce\)\s*\{/g)) {
    let depth = 1;
    let i = match.index + match[0].length;
    const start = i;
    while (depth && i < css.length) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    out.push(...parseRules(css.slice(start, i - 1)));
  }
  return out;
}

const reduced = reducedMotionRules();
const cancels = (pattern) =>
  reduced.some((r) => r.selectors.some((s) => pattern.test(s)) && /transition:\s*none/.test(r.body));

describe('Reduced motion', () => {
  const targets = {
    'floating label': /^\.field > label:not\(/,
    'switch handle': /^\.switch > \[type=checkbox\]$/,
    'icon button shape morph': /^\.icon-button$/,
    'slider value label': /^input\[type=range\] \+ \.thumb$/,
    'chips': /^\.chips$/,
    'time picker dial': /^\.timepicker-dial$/,
    'time picker canvas': /^\.timepicker-canvas$/,
    // aside.open is (0,2,2); the closed-panel reset alone is (0,1,2) and loses.
    'open card reveal panel': /^article\.card-reveal-initialized > aside\.open$/,
  };
  for (const [name, pattern] of Object.entries(targets)) {
    test(`cancels the ${name} transition`, () => assert.ok(cancels(pattern), name));
  }

  // The [data-carousel-size] layout rules out-specify any size override here,
  // so forcing a width left hero carousels half resized with no edge padding.
  test('keeps the carousel layout and drops only its motion', () => {
    const carousel = reduced.filter((r) => r.selector.includes('carousel'));
    assert.ok(carousel.length, 'no carousel reduced-motion rules');
    for (const { selector, body } of carousel) {
      assert.doesNotMatch(body, /flex-basis|width|--md-comp-carousel-inline-padding/, selector);
    }
  });
});
