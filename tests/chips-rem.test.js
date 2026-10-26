import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileString } from 'sass';
import { sheet, parseRules, rem } from './css.js';

const input = '.chips input:not([type]):not(.browser-default).input';
const dimensions = [
  ['.chip', 'min-height', 32],
  ['.chip > img', 'width', 24],
  ['.chip > img', 'height', 24],
  ['.chip .close', 'width', 24],
  ['.chip .close', 'height', 24],
  [input, 'font-size', 16],
  [input, 'height', 32],
  [input, 'min-width', 100],
  [input, 'max-width', 200],
];

const body = (rules, selector) => {
  const rule = rules.find(rule => rule.selectors.includes(selector));
  assert.ok(rule, selector);
  return rule.body;
};

const selective = () => compileString('@use "custom" with ($components: ("icons-material-design", "chips"), $utilities: (), $expressive-include-fonts: false);', {
  loadPaths: ['src/sass'],
}).css;

for (const [name, css] of [['full', sheet], ['selective', selective]]) {
  test(`${name}: chips use rem content dimensions and retain px spacing`, () => {
    const rules = parseRules(css());
    for (const [selector, property, size] of dimensions) {
      assert.ok(body(rules, selector).includes(`${property}: ${rem(size)};`), `${selector} ${property}`);
    }
    const chip = body(rules, '.chip');
    assert.match(chip, /--font-size: var\(--md-sys-typescale-label-large-font-size\);/);
    assert.match(chip, /--font-size-icon: 1\.125rem;/);
    for (const declaration of ['--padding: 8px;', 'gap: 8px;', 'padding-block: 4px;', 'line-height: 1.5;']) {
      assert.ok(chip.includes(declaration), declaration);
    }
    for (const side of ['left', 'right']) {
      assert.ok(chip.includes(`padding-${side}: var(--md-comp-chip-padding, var(--padding));`));
    }
    assert.ok(chip.includes('font-size: var(--md-comp-chip-label-size, var(--font-size));'));
    const icon = rules.find(rule => rule.selector.startsWith('.chip > :is('));
    assert.ok(icon.body.includes('font-size: var(--md-comp-chip-icon-size, var(--font-size-icon));'));
  });
}
