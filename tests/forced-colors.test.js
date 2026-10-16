// forced-colors: active (Windows High Contrast and similar). The browser
// repaints backgrounds as Canvas and drops box-shadow, so any state drawn only
// with a fill or a ring disappears. These are the states that did.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mediaRules, parseRules, sheet } from './css.js';

const css = sheet();
const forced = mediaRules(css, 'forced-colors: active');
const has = (pattern, body) =>
  forced.some((r) => r.selectors.some((s) => pattern.test(s)) && body.test(r.body));

const OUTLINE = /outline:\s*2px solid Highlight/;
const SYSTEM_FILL = /forced-color-adjust:\s*none;[\s\S]*background-color:\s*(Highlight|CanvasText|GrayText)/;

describe('Forced colors', () => {
  const selected = {
    'tab indicator bar': [/^\.tabs > \.indicator$/, SYSTEM_FILL],
    'tab indicator without JS': [/^\.tabs:not\(:has\(> \.indicator\)\) > a\.active::after$/, SYSTEM_FILL],
    'navigation bar destination': [/^\.navigation-bar > :is\(a, button\)\.active > /, OUTLINE],
    'navigation rail destination': [/^\.navigation-rail > a:not\(\.button, \.icon-button\)\.active > /, OUTLINE],
    'pagination page': [/^\.pagination :is\(a, button\)\[aria-current=page\]$/, OUTLINE],
    'toolbar action': [/^\.toolbar > :is\(a, button\):not\(\.extra, \.icon-button\)\.active$/, OUTLINE],
    'menu item': [/^menu\[id\] > li:is\(\.selected/, OUTLINE],
    'mega menu link': [/^\.mega-menu > :is\(a, button\)\[aria-current=page\]$/, OUTLINE],
    'list item': [/^\.list > li\.active$/, OUTLINE],
    'filter chip': [/^\.chip-input:checked \+ \.chip$/, OUTLINE],
    'checked checkbox': [/^label:has\(> \[type=checkbox\]\):not\(\.switch\) > \[type=checkbox\]:is\(:checked, :indeterminate\)$/, SYSTEM_FILL],
    'checked radio': [/^label:has\(> \[type=radio\]\) > \[type=radio\]:checked$/, /background-image:\s*radial-gradient\(circle at center, Highlight/],
    'switch handle': [/^\.switch > \[type=checkbox\]:checked$/, /HighlightText/],
    'small badge': [/^\.badge:empty$/, SYSTEM_FILL],
    'loading indicator': [/^\.loading-indicator::before$/, SYSTEM_FILL],
    'active carousel dot': [/^\.carousel \.indicators \.indicator-item:is\(\.active/, SYSTEM_FILL],
    'selected date': [/^\.is-selected \.datepicker-day-button$/, /background-color:\s*Highlight/],
  };
  for (const [name, [selector, body]] of Object.entries(selected)) {
    test(`keeps the ${name} visible`, () => assert.ok(has(selector, body), name));
  }

  // A box-shadow focus ring is dropped, so these controls need an outline.
  for (const [name, selector] of Object.entries({
    checkbox: /^label:has\(> \[type=checkbox\]\):not\(\.switch\) > \[type=checkbox\]:focus-visible$/,
    radio: /^label:has\(> \[type=radio\]\) > \[type=radio\]:focus-visible$/,
    switch: /^\.switch > \[type=checkbox\]:focus-visible$/,
  })) {
    test(`gives a focused ${name} an outline`, () => assert.ok(has(selector, /outline:\s*2px solid CanvasText/), name));
  }

  test('a keyboard-focused tab gets a focus ring, not only a tint', () => {
    const rule = parseRules(css).find((r) => r.selectors.includes('.tabs > a:focus-visible') && /outline:\s*3px solid/.test(r.body));
    assert.ok(rule, 'no focus ring on .tabs > a:focus-visible');
  });
});
