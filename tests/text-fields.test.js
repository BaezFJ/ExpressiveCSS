// Filled and outlined text fields. The global text-input rule sets
// `outline: none`, so the field's focus underline is the only focus indicator.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseRules, sheet } from './css.js';

const rules = parseRules(sheet());

describe('Text field focus', () => {
  // FormSelect makes its combobox input read-only (select.ts), so a focus
  // style that skips [readonly] leaves every enhanced select without one.
  test('read-only inputs still get the focus underline', () => {
    const focus = rules.filter(
      (r) =>
        r.selectors.some((s) => /^\.field[ .]/.test(s) && /:focus$/.test(s)) &&
        /border-(bottom-)?width:\s*2px/.test(r.body),
    );
    assert.ok(focus.length >= 2, 'expected filled and outlined focus rules');
    for (const r of focus) {
      assert.doesNotMatch(r.selector, /readonly/, `focus rule excludes read-only inputs: ${r.selector}`);
    }
  });
});
