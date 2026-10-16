// Right-to-left layout. These rules pinned content to a physical side, so in a
// dir="rtl" page the label, icons, check mark, range band, modal rail, snackbar
// and map close button landed on the wrong edge.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseRules, sheet } from './css.js';

const rules = parseRules(sheet());
/** Bodies of every rule with a selector matching `pattern` exactly. */
const bodies = (pattern) => rules.filter((r) => r.selectors.some((s) => pattern.test(s))).map((r) => r.body);
const PHYSICAL = /(^|[\s;{])(left|right|padding-left|padding-right|margin-left|margin-right):/;

describe('Right-to-left layout', () => {
  const logical = {
    'floating label': /^\.field > label:not\(\.button, \.icon-button\)$/,
    'check mark': /^label:has\(> \[type=checkbox\]\):not\(\.switch\):not\(:has\(> \[type=checkbox\] \+ span\)\)::before$/,
    'legacy checkbox span': /^\*:not\(\.switch\) > \[type=checkbox\] \+ span:not\(\.supporting-text, \.character-counter, \.file-path\)$/,
    'modal navigation rail': /^\.navigation-rail\.expanded\.modal$/,
    'snackbar container': /^#snackbar-container$/,
    'map popup close button': /^\.map \.maplibregl-popup-close-button$/,
  };
  for (const [name, pattern] of Object.entries(logical)) {
    test(`places the ${name} with logical properties`, () => {
      // Symmetric rules read the same in both directions: centring with
      // left: 50% and translateX(-50%), or the same margin on both sides.
      const symmetric = (b) => /translateX\(-50%\)/.test(b) || /left:\s*8px;[\s\S]*right:\s*8px/.test(b);
      const found = bodies(pattern).filter((b) => !symmetric(b));
      assert.ok(found.length, `no rule for ${name}`);
      for (const body of found) assert.doesNotMatch(body, PHYSICAL, name);
      assert.ok(found.some((b) => /inset-inline|padding-inline|inset-block/.test(b)), `${name} sets no logical inset`);
    });
  }

  // The icon font sets direction: ltr on the icon, and an icon's own logical
  // inset follows it, so these swap physical sides with :dir(rtl) instead.
  test('swaps the field prefix and suffix icons with :dir(rtl)', () => {
    assert.ok(bodies(/^\.field > \.prefix:dir\(rtl\)$/).some((b) => /right:\s*12px/.test(b)), 'prefix');
    assert.ok(bodies(/^\.field > \.suffix:not\(\.icon-button\):dir\(rtl\)$/).some((b) => /left:\s*12px/.test(b)), 'suffix');
  });

  test('mirrors the label transform origin and the flyout entry', () => {
    assert.ok(bodies(/^\.field > label:not\(\.button, \.icon-button\):dir\(rtl\)$/).some((b) => /transform-origin:\s*top right/.test(b)), 'label');
    assert.ok(bodies(/:dir\(rtl\)$/).some((b) => /translateX\(4px\) scale\(0\.96\)/.test(b)), 'flyout');
  });
});
