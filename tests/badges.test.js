// M3 Expressive Badge. Small is an empty 6dp dot; large is a 16dp
// stadium with error / on-error as the default mapping.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseRules, sheet } from './css.js';

const css = sheet();
const rules = parseRules(css);

function siblingBadge(host) {
  return rules.filter(
    (r) =>
      r.selector.includes(host) &&
      />\s*\.badge/.test(r.selector) &&
      /position:\s*absolute/.test(r.body),
  );
}

describe('Badge', () => {
  test('default mapping is error / on-error', () => {
    assert.match(css, /--md-comp-badge-color:\s*var\(--md-sys-color-error\)/);
    assert.match(css, /--md-comp-badge-label-text-color:\s*var\(--md-sys-color-on-error\)/);
  });

  test('large is 16dp; small empty is 6dp', () => {
    assert.match(css, /--md-comp-badge-large-size:\s*16px/);
    assert.match(css, /--md-comp-badge-small-size:\s*6px/);
    assert.match(css, /badge:empty\s*\{/);
  });

  test('mirrors anchored icon badge transform in RTL', () => {
    assert.match(css, /transform:\s*translate\(-50%,\s*-50%\)/);
  });

  test('does not emit the Materialize caption suffix', () => {
    assert.doesNotMatch(css, /content:\s*" new"/);
    assert.doesNotMatch(css, /data-badge-caption/);
  });

  test('stacked bar and collapsed rail sibling badges use logical inset', () => {
    const stacked = siblingBadge('navigation-bar').filter(
      (r) => !r.selector.includes('horizontal'),
    );
    const rail = siblingBadge('navigation-rail').filter(
      (r) => !r.selector.includes('expanded'),
    );
    assert.ok(stacked.length >= 1, 'no stacked bar sibling badge rule');
    assert.ok(rail.length >= 1, 'no collapsed rail sibling badge rule');
    for (const rule of [...stacked, ...rail]) {
      assert.doesNotMatch(rule.body, /(?:^|;)\s*left:\s*calc\(50% \+ 12px\)/);
      assert.match(rule.body, /inset-inline-start:\s*calc\(50% \+ 12px\)/);
    }
  });

  test('bar and rail sibling badges flip translate in RTL', () => {
    const rtl = rules.filter(
      (r) =>
        /navigation-(?:bar|rail)/.test(r.selector) &&
        /\.badge/.test(r.selector) &&
        /:dir\(rtl\)|\[dir=["']rtl["']\]/.test(r.selector),
    );
    assert.ok(rtl.length >= 1, 'no RTL sibling badge rule on bar or rail');
    for (const rule of rtl) {
      assert.match(rule.body, /transform:\s*translate\(50%,\s*-50%\)/);
    }
  });

});
