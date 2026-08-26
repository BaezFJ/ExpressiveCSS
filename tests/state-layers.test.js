// The state layer opacities are a foundation: M3 replaced the ripple with a
// translucent overlay, and no author writes markup for one - components paint
// it behind themselves. So the number belongs in exactly one place.
//
// It was in forty-five. Four partials named their own --md-comp-* tokens and
// the rest wrote `8%` inline, including abstracts/_mixins.scss under a comment
// restating the values. Two consequences, both real: checkboxes and radio
// buttons drew a focus ring while the percentage read like a pressed one, and
// a hover tint in _cards.scss sat outside both shapes and was found by hand.
//
// The source guard below is what would have found that last one. Checking the
// compiled sheet cannot: `8%` in a color-mix is indistinguishable from any
// other 8% once the selector context is gone.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const css = readFileSync(new URL('dist/css/expressive.css', root), 'utf8');

function sassFiles(dir = 'src/sass/') {
  const out = [];
  for (const e of readdirSync(new URL(dir, root), { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...sassFiles(`${dir}${e.name}/`));
    else if (e.name.endsWith('.scss')) out.push(`${dir}${e.name}`);
  }
  return out;
}

describe('Material 3 state layers', () => {
  const M3 = { hover: '0.08', focus: '0.1', pressed: '0.1', dragged: '0.16' };

  test('declares the md.sys.state opacities once, at the documented values', () => {
    for (const [state, value] of Object.entries(M3)) {
      const found = css.match(new RegExp(`--md-sys-state-${state}-state-layer-opacity:\\s*([^;]+);`, 'g'));
      assert.equal(found?.length, 1, `${state}: expected exactly one declaration`);
      assert.match(found[0], new RegExp(`:\\s*${value.replace('.', '\\.')}\\s*;`), state);
    }
  });

  test('no component restates a state layer opacity as a token literal', () => {
    // A component may still name its own token - that is the documented
    // override point - but its value comes from md.sys.state.
    const literals = [...css.matchAll(/--md-comp-[\w-]*state-layer-opacity:\s*([^;]+);/g)]
      .filter((m) => !m[1].includes('var(--md-sys-state-'))
      .map((m) => m[0]);
    assert.deepEqual(literals, [], literals.join('\n'));
  });

  test('no stylesheet writes a state layer percentage by hand', () => {
    // `.segmented` tints its container at rest rather than in response to
    // interaction, so its 8% is not a state layer and is not this rule's
    // business. Nor is a disabled container: M3 states those as their own
    // `disabled-container-opacity`, which is 0.1 on an icon button, and a
    // disabled control is not in a state layer state at all. Every other
    // 8%/10% mixed into an --md-sys-color is one.
    const REST_TINT = 'src/sass/components/_list.scss';
    const offenders = [];
    for (const file of sassFiles()) {
      // A stack, not the last selector seen: a nested `&:disabled { … }` would
      // otherwise exempt every declaration written after it in the parent
      // block, and the leak is invisible - it can only ever hide an offence.
      const open = [];
      readFileSync(new URL(file, root), 'utf8').split('\n').forEach((line, i) => {
        const text = line.trim();
        if (text.startsWith('}')) open.pop();
        if (/var\(--md-sys-color-[a-z-]+\)\s+(?:8|10)%/.test(line)) {
          if (file !== REST_TINT && !open.some((sel) => /disabled/.test(sel))) {
            offenders.push(`${file}:${i + 1} ${text}`);
          }
        }
        if (text.endsWith('{')) open.push(text);
      });
    }
    assert.deepEqual(
      offenders,
      [],
      `use state-opacity("hover"|"focus"|"pressed") instead:\n${offenders.join('\n')}`
    );
  });
});
