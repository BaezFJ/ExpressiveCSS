// M3 Expressive floating sheet: a sheet-family surface detached from every edge.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { resetBody, window } from './setup.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('Floating sheet CSS', () => {
  test('takes the sheet container tokens, not the basic dialog ones', () => {
    assert.match(
      css,
      /--md-comp-floating-sheet-container-color:\s*var\(--md-sys-color-surface-container-low\)/
    );
    assert.match(css, /--md-comp-floating-sheet-container-shape:\s*28px/);
    assert.match(
      css,
      /--md-comp-basic-dialog-container-color:\s*var\(--md-comp-floating-sheet-container-color\)/
    );
  });

  test('floats free of every edge', () => {
    assert.match(css, /dialog\.floating-sheet\b/);
    assert.match(css, /--md-comp-floating-sheet-inset:\s*24px/);
  });

  // `inset` pins both block edges, and an auto height between two fixed edges
  // is solved rather than shrink-wrapped - the sheet filled the window.
  test('shrink-wraps its content instead of filling the window', () => {
    const rule = css.match(/dialog\.floating-sheet\s*\{[^}]*\}/);
    assert.ok(rule, 'the floating sheet rule should exist');
    assert.match(rule[0], /height:\s*fit-content/);
  });

  test('standard drops the scrim; modal keeps the dialog backdrop', () => {
    assert.match(css, /dialog\.floating-sheet:not\(:modal\)::backdrop/);
  });

  test('action-row buttons stay sheet buttons, not dialog text buttons', () => {
    const flat = css.match(/dialog:not\(([^)]|\([^)]*\))*\)\s*>\s*:is\(form,\s*nav\):last-child/);
    assert.ok(flat, 'the dialog flat-action rule should still exist');
    assert.match(flat[0], /\.floating-sheet/);
  });
});

describe('Floating sheet behavior', () => {
  beforeEach(resetBody);

  test('light dismiss comes from Dialogs, with no sheet-specific module', () => {
    document.body.innerHTML = `
      <dialog class="floating-sheet" aria-label="Sheet">
        <h2>Headline</h2>
        <p>Body</p>
      </dialog>`;
    const dialog = document.querySelector('dialog');
    dialog.setAttribute('open', '');
    dialog.getBoundingClientRect = () => ({
      x: 100, y: 100, left: 100, top: 100, width: 400, height: 300,
      right: 500, bottom: 400
    });

    const press = (type, x, y) =>
      dialog.dispatchEvent(
        new window.PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y,
          button: 0,
          buttons: type === 'pointerdown' ? 1 : 0,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true
        })
      );

    press('pointerdown', 20, 20);
    press('pointerup', 20, 20);
    assert.equal(dialog.open, false);
  });
});
