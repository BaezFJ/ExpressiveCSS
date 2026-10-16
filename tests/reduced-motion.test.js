// prefers-reduced-motion. Each partial cancels its own transitions in a
// `@media (prefers-reduced-motion: reduce)` block; these are the ones that were
// missing or lost on specificity.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mediaRules, sheet } from './css.js';

const reduced = mediaRules(sheet(), 'prefers-reduced-motion: reduce');
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
});
