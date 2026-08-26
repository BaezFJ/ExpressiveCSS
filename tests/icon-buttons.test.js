// M3 icon buttons: the size ladder, and the rules that hold its shape.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const css = readFileSync(new URL('dist/css/expressive.css', root), 'utf8');

/** Every Sass partial, as a path relative to the repo root. */
function sassFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(new URL(dir, root), { withFileTypes: true })) {
      if (e.isDirectory()) walk(`${dir}${e.name}/`);
      else if (e.name.endsWith('.scss')) out.push(`${dir}${e.name}`);
    }
  };
  walk('src/sass/');
  return out;
}

/** The declarations of the first rule whose selector matches `pred`. */
const ruleFor = (pred) =>
  [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)].find((m) => pred(m[1].trim()))?.[2];

describe('Icon button CSS', () => {
  // md.comp.icon-button.{size}, DSP 34.0.21. Small is the default and carries
  // no class, so it is asserted on the bare `.icon-button` rule.
  const SIZES = {
    xsmall: { height: 32, icon: 20, space: 6 },
    small: { height: 40, icon: 24, space: 8 },
    medium: { height: 56, icon: 24, space: 16 },
    large: { height: 96, icon: 32, space: 32 },
    xlarge: { height: 136, icon: 40, space: 48 }
  };

  for (const [size, spec] of Object.entries(SIZES)) {
    const selector = size === 'small' ? '.icon-button' : `.icon-button.${size}`;

    test(`${size} is ${spec.height}dp with a ${spec.icon}dp icon`, () => {
      const rule = ruleFor((s) => s === selector);
      assert.ok(rule, `no ${selector} rule`);
      assert.match(rule, new RegExp(`--md-comp-icon-button-container-height:\\s*${spec.height}px`));
      assert.match(rule, new RegExp(`--md-comp-icon-button-icon-size:\\s*${spec.icon}px`));
      assert.match(rule, new RegExp(`--md-comp-icon-button-leading-space:\\s*${spec.space}px`));
      assert.match(rule, new RegExp(`--md-comp-icon-button-trailing-space:\\s*${spec.space}px`));
    });

    // Width is leading + icon + trailing, never declared. That is the whole
    // reason a round icon button comes out circular without being told to,
    // and a stray `width` on any size would break every one of them at once.
    test(`${size} states no width of its own`, () => {
      assert.doesNotMatch(ruleFor((s) => s === selector), /(?:^|;)\s*width:/);
    });
  }

  test('the outline gives its width back to the inset', () => {
    // Otherwise a 3dp xlarge outline makes a round button 6px wider than tall.
    const rule = ruleFor((s) => s === '.icon-button.outlined');
    assert.ok(rule, 'no .icon-button.outlined rule');
    assert.match(rule, /border:\s*var\(--md-comp-icon-button-outline-width\)/);
    assert.match(rule, /padding-inline:\s*calc\(.*--md-comp-icon-button-outline-width/);
  });

  // Both are one class on the same root, so the tie is decided by source
  // order: written the other way round, a squared button keeps its resting
  // corner while pressed and the shape morph is silently dead.
  test('the pressed shape morph outranks the squared container', () => {
    // The base block already has a `.icon-button:active` for the pressed state
    // layer, so it is the rule carrying the corner that has to be found.
    const morph = css.indexOf('border-radius: var(--md-comp-icon-button-pressed-container-shape)');
    assert.ok(morph > -1, 'no pressed shape rule');
    assert.ok(
      morph > css.indexOf('.icon-button.square'),
      'the pressed shape must be written after .icon-button.square'
    );
  });

  // The common button would otherwise reach it first with 40dp geometry and a
  // filled primary container.
  test('the common button does not claim it', () => {
    assert.match(css, /button:not\([^)]*\.icon-button/);
  });

  // Nor does any other host. A host that styles its own child controls always
  // lets a control that styles itself opt out - that is what `.button` is
  // doing in these lists - and an icon button is such a control. There is no
  // shared variable behind them, so this walks the partials instead: the
  // `$_not-label` lists in forms/ were five hand-copied lists that had already
  // drifted, and these are twelve.
  //
  // The member goes INSIDE the existing `:not()` argument list, never chained
  // after it. `:not(a, b)` takes the specificity of its heaviest argument, so
  // joining the list leaves the host rule exactly as specific as it was, while
  // `:not(.button):not(.icon-button)` would add a class and could flip a tie
  // on markup that has nothing to do with icon buttons.
  test('every host that lets .button opt out lets .icon-button opt out', () => {
    const drifted = [];
    for (const file of sassFiles()) {
      readFileSync(new URL(file, root), 'utf8').split('\n').forEach((line, i) => {
        if (line.trimStart().startsWith('//')) return;
        for (const [, args] of line.matchAll(/:not\(([^()]*)\)/g)) {
          const members = args.split(',').map((a) => a.trim());
          if (!members.includes('.button') || members.includes('.icon-button')) continue;
          drifted.push(`${file}:${i + 1} ${line.trim()}`);
        }
      });
    }
    assert.deepEqual(
      drifted,
      [],
      `these lists let .button style itself but not .icon-button:\n${drifted.join('\n')}`
    );
  });
});
