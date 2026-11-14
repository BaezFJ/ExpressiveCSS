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

describe('Label-above field semantics', async () => {
  const { readFileSync } = await import('node:fs');
  const { violations } = await import('../scripts/semantics-rules.mjs');
  const semantics = JSON.parse(readFileSync(new URL('../semantics.json', import.meta.url), 'utf8'));
  const rule = semantics.rows['forms/input-fields'].rules.find((r) => r.id === 'field-label-above-order');
  const hits = (markup) => violations(markup, [rule], semantics.compositeRoles, { fragmentSafe: true }).length;

  // The state colors reach the label from the control with + and ~, so a
  // label written first would lose them.
  test('flags a label written before its control and passes the documented order', () => {
    assert.ok(rule, 'the rule exists');
    assert.equal(hits('<div class="field label-above"><label for="a">A</label><input id="a"></div>'), 1);
    assert.equal(hits('<div class="field label-above"><input id="a"><label for="a">A</label></div>'), 0);
    assert.equal(hits('<div class="field"><label for="a">A</label><input id="a"></div>'), 0, 'only the label-above variant');
  });
});
