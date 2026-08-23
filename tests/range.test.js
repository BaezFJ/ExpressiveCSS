// M3 Expressive Slider: sizes, centered, dual-handle.
//
// Named Range until 0.8.0, when the component took M3's name for it. The
// old export is still here as an alias and is exercised below.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Expressive, resetBody } from './setup.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('Slider CSS', () => {
  test('XS (default) is a 16dp track and 44dp handle', () => {
    assert.match(css, /--md-comp-slider-track-height:\s*16px/);
    assert.match(css, /--md-comp-slider-handle-height:\s*44px/);
    assert.match(css, /--md-comp-slider-handle-width:\s*4px/);
    assert.match(css, /--md-comp-slider-gap:\s*6px/);
  });

  test('S M L XL scale the track and handle', () => {
    // The host list gained `.slider` - M3's name for this component - so this
    // asserts which hosts it must reach rather than how the list is spelled.
    // A literal-selector regex has now broken on four separate renames.
    // Not a `:is\(([^)]*)\)` capture: the list now holds `.slider:has(...)`,
    // whose own parenthesis ends the character class. Take the selector text.
    const hosts = css.match(/([^{}]*\.range-field[^{}]*)\{/)[1];
    for (const h of ['.range', '.range-field', '.slider:has([type=range])']) {
      assert.ok(hosts.includes(h), `host list is missing ${h}: ${hosts}`);
    }
    assert.match(css, /--md-comp-slider-track-height:\s*24px/);
    assert.match(css, /--md-comp-slider-track-height:\s*40px/);
    assert.match(css, /--md-comp-slider-track-height:\s*56px/);
    assert.match(css, /--md-comp-slider-track-height:\s*96px/);
    assert.match(css, /--md-comp-slider-handle-height:\s*108px/);
  });

  test('centered and dual-handle fills are in the sheet', () => {
    assert.match(css, /\.centered/);
    assert.match(css, /--md-comp-slider-start-fraction/);
    assert.match(css, /--md-comp-slider-end-fraction/);
  });

  test('the value label is a 40dp bubble', () => {
    assert.match(css, /input\[type=range\]\s*\+\s*\.thumb[\s\S]*?min-width:\s*40px/s);
    assert.match(css, /input\[type=range\]\s*\+\s*\.thumb[\s\S]*?height:\s*40px/s);
  });
});

describe('Range plugin', () => {
  beforeEach(resetBody);

  test('sets the active fraction from the value', () => {
    document.body.innerHTML = `<div class="range"><input type="range" min="0" max="100" value="40"></div>`;
    const input = document.querySelector('input');
    const instance = Expressive.Range.init(input);
    try {
      assert.equal(input.style.getPropertyValue('--md-comp-slider-active-fraction'), '40%');
    } finally {
      instance.destroy();
    }
  });

  test('a dual-handle host gets start and end fractions', () => {
    document.body.innerHTML = `
      <div class="range">
        <input type="range" min="0" max="100" value="25" aria-label="start">
        <input type="range" min="0" max="100" value="75" aria-label="end">
      </div>`;
    const [start, end] = document.querySelectorAll('input');
    const a = Expressive.Range.init(start);
    const b = Expressive.Range.init(end);
    try {
      const host = document.querySelector('.range');
      assert.equal(host.style.getPropertyValue('--md-comp-slider-start-fraction'), '25%');
      assert.equal(host.style.getPropertyValue('--md-comp-slider-end-fraction'), '75%');
    } finally {
      a.destroy();
      b.destroy();
    }
  });

  test('stops writes the tick count from step', () => {
    document.body.innerHTML = `<div class="range stops"><input type="range" min="0" max="100" step="20" value="40"></div>`;
    const input = document.querySelector('input');
    const instance = Expressive.Range.init(input);
    try {
      assert.equal(
        document.querySelector('.range').style.getPropertyValue('--md-comp-slider-stop-count'),
        '6'
      );
    } finally {
      instance.destroy();
    }
  });
});
