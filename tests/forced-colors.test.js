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

  // Forced colors drop the error color, so an invalid box needs a shape of
  // its own, and a checked one must not pass the author's red through. A
  // disabled one keeps the GrayText it has without the error.
  test('an invalid checkbox has a dashed edge and keeps system colors when checked', () => {
    const box = String.raw`label:has\(> \[type=checkbox\]\):not\(\.switch\) > \[type=checkbox\]:is\(\.invalid, \[aria-invalid=true\]\)`;
    const checked = String.raw`:is\(:checked, :indeterminate\):not\(:disabled\)`;
    assert.ok(has(new RegExp(`^${box}$`), /border-style:\s*dashed/), 'unchecked edge');
    assert.ok(has(new RegExp(`^${box}${checked}$`), /border-color:\s*CanvasText;\s*background-color:\s*Highlight/), 'checked fill');
    assert.ok(has(new RegExp(String.raw`:has\(> \[type=checkbox\]:is\(\.invalid, \[aria-invalid=true\]\)${checked}\)::before$`), /background-color:\s*HighlightText/), 'checked mark');
    assert.ok(has(/\[type=checkbox\]:is\(\.invalid, \[aria-invalid=true\]\) \+ span:not\(.*\)::before$/, /border-style:\s*dashed/), 'legacy span edge');

    // Every rule that gives an invalid checked box the enabled colors leaves disabled ones out.
    const enabledColors = forced.filter((r) => /Highlight|CanvasText/.test(r.body) && r.selectors.some((sel) =>
      /\[type=checkbox\]:is\(\.invalid, \[aria-invalid=true\]\):is\(:checked, :indeterminate\)/.test(sel)));
    assert.ok(enabledColors.length >= 3, 'the checked invalid rules are found');
    for (const rule of enabledColors) {
      for (const sel of rule.selectors) assert.match(sel, /:is\(:checked, :indeterminate\):not\(:disabled\)/, `disabled boxes stay GrayText: ${sel}`);
    }
  });

  test('a keyboard-focused tab gets a focus ring, not only a tint', () => {
    const rule = parseRules(css).find((r) => r.selectors.includes('.tabs > a:focus-visible') && /outline:\s*3px solid/.test(r.body));
    assert.ok(rule, 'no focus ring on .tabs > a:focus-visible');
  });
});

// Shapes drawn only by a fill: forced colors paint them as Canvas on Canvas.
describe('Forced colors edges and glyphs', () => {
  const EDGE = /outline:\s*1px solid (ButtonText|CanvasText);\s*outline-offset:\s*-1px/;
  const GLYPH = /forced-color-adjust:\s*none;\s*background-color:\s*CanvasText/;
  const cases = {
    'filled, tonal and elevated button and FAB': [/^:where\(button:not\(.*\), a\.button, label\.button\):is\(\.filled, \.tonal, \.elevated, \.button, \.extra, \.extend, :where\(\.large\.circle\)\):where\(:not\(\.outlined, \.text\)\)$/, EDGE],
    'column chart track': [/^\.column-chart\.track \.column-chart-columns > div$/, EDGE],
    'color picker area': [/^\.color-picker-area$/, /outline:\s*1px solid CanvasText/],
    'aura ring on every variant': [/^\.aura\.aura::before$/, /background:\s*Highlight;[\s\S]*filter:\s*none/],
    'filled and tonal icon button': [/^\.icon-button:is\(\.filled, \.tonal\)$/, EDGE],
    'pressed toggle': [/^:where\(.*\.icon-button\)\[aria-pressed=true\]:not\(:disabled/, /background-color:\s*Highlight !important;\s*color:\s*HighlightText !important/],
    'keypad key': [/^:is\(\.keypad, \.keyboard\) button$/, EDGE],
    'keyboard container': [/^\.keyboard$/, EDGE],
    'questionnaire footer button': [/^:where\(\.questionnaire > footer\) > button:not\(\.outlined, \.text\)$/, EDGE],
    'bar chart track': [/^\.bar-chart\.track \.bar-chart-bars > div$/, EDGE],
    'search bar': [/^:is\(\.search-bar\):not\(\.search-view \*\)$/, /outline:\s*1px solid CanvasText/],
    'select caret': [/\.caret$/, GLYPH],
    'select check': [/^menu\[role=listbox\]:not\(\.multiple-select-menu\) > li\.selected:not\(\.disabled, \.optgroup\)::after$/, GLYPH],
    'submenu chevron': [/li:has\(> menu\) > :is\(a, button, .*\)::after$/, GLYPH],
    'bottom sheet handle': [/^dialog\.bottom-sheet::before$/, GLYPH],
    'slider stops': [/\.stops::after$/, /--_stop:\s*HighlightText;\s*forced-color-adjust:\s*none/],
  };
  for (const [name, [selector, body]] of Object.entries(cases)) {
    test(`draws the ${name}`, () => assert.ok(has(selector, body), name));
  }

  // GrayText is the disabled color, so nothing enabled may be painted with it.
  test('an enabled slider track is not GrayText', () => {
    assert.ok(has(/^input\[type=range\]$/, /--md-comp-slider-inactive-track-color:\s*CanvasText/));
    assert.ok(has(/^input\[type=range\]:disabled$/, /--md-comp-slider-active-track-color:\s*GrayText/));
  });

  for (const [name, selector] of Object.entries({
    checkbox: /^label:has\(> \[type=checkbox\]:disabled\):not\(\.switch\)$/,
    radio: /^label:has\(> \[type=radio\]:disabled\)$/,
  })) {
    test(`grays a disabled ${name} and its label`, () => {
      assert.ok(has(selector, /color:\s*GrayText/), `${name} label`);
      assert.ok(has(new RegExp(`> \\[type=${name}\\]:disabled$`), /border-color:\s*GrayText/), `${name} box`);
    });
  }
});
