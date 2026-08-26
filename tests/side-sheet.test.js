// M3 Expressive side sheet: docked pane, standard divider vs modal scrim.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { resetBody, window } from './setup.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('Side sheet CSS', () => {
  test('uses surface-container-low and a 400dp pane', () => {
    assert.match(
      css,
      /--md-comp-side-sheet-container-color:\s*var\(--md-sys-color-surface-container-low\)/
    );
    assert.match(css, /--md-comp-side-sheet-container-width:\s*400px/);
    assert.match(css, /--md-comp-side-sheet-container-shape:\s*28px/);
  });

  test('standard has an inner divider and no scrim', () => {
    assert.match(css, /dialog\.side-sheet:not\(:modal\)/);
    assert.match(css, /border-inline-start:\s*1px solid var\(--md-sys-color-outline-variant\)/);
    assert.match(css, /dialog\.side-sheet:not\(:modal\)::backdrop/);
  });

  test('modal rounds the inner corners', () => {
    assert.match(css, /dialog\.side-sheet:modal/);
  });

  test('display:flex is gated on [open] for every sheet selector', () => {
    assert.match(css, /:is\(dialog\.side-sheet[^)]*\)\[open\]/);
    assert.match(css, /:is\(dialog\.side-sheet[^)]*\):not\(\[open\]\)/);
  });
});

function box(el, { left, top, width, height }) {
  el.getBoundingClientRect = () => ({
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height
  });
}

function tap(el, type, { x, y, button = 0, pointerId = 1 } = {}) {
  el.dispatchEvent(
    new window.PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      button,
      buttons: type === 'pointerdown' ? 1 : 0,
      pointerId,
      pointerType: 'mouse',
      isPrimary: true
    })
  );
}

describe('Side sheet drag', () => {
  beforeEach(resetBody);

  function openSheet(extraClass = '') {
    document.body.innerHTML = `
      <dialog class="side-sheet ${extraClass}">
        <header><h2>Headline</h2></header>
        <div>Secondary</div>
      </dialog>`;
    const dialog = document.querySelector('dialog');
    dialog.setAttribute('open', '');
    box(dialog, { left: 400, top: 0, width: 400, height: 600 });
    return dialog;
  }

  test('dragging the inner edge past the threshold dismisses', () => {
    const dialog = openSheet();
    tap(dialog, 'pointerdown', { x: 410, y: 200 });
    tap(dialog, 'pointermove', { x: 540, y: 200 });
    tap(dialog, 'pointerup', { x: 540, y: 200 });
    assert.equal(dialog.open, false);
  });

  test('a short drag snaps back', () => {
    const dialog = openSheet();
    tap(dialog, 'pointerdown', { x: 410, y: 200 });
    tap(dialog, 'pointermove', { x: 440, y: 200 });
    tap(dialog, 'pointerup', { x: 440, y: 200 });
    assert.equal(dialog.open, true);
    assert.equal(dialog.style.getPropertyValue('--md-comp-side-sheet-shift'), '0px');
  });

  test('a drag that starts in the body does not dismiss', () => {
    const dialog = openSheet();
    tap(dialog, 'pointerdown', { x: 500, y: 200 });
    tap(dialog, 'pointermove', { x: 700, y: 200 });
    tap(dialog, 'pointerup', { x: 700, y: 200 });
    assert.equal(dialog.open, true);
  });

  // A start-docked sheet leaves toward the start edge, so its dismissal
  // direction is the negative one and its handle is the *right* 24dp. That
  // flip is the one thing behaviors/sheetDrag.ts parameterises which the
  // end-docked cases above cannot reach.
  test('a start-docked sheet dismisses toward the start edge', () => {
    const dialog = openSheet('left');
    tap(dialog, 'pointerdown', { x: 790, y: 200 });
    tap(dialog, 'pointermove', { x: 690, y: 200 });
    tap(dialog, 'pointerup', { x: 690, y: 200 });
    assert.equal(dialog.open, false);
  });

  test('a start-docked sheet ignores a drag the other way', () => {
    const dialog = openSheet('left');
    tap(dialog, 'pointerdown', { x: 790, y: 200 });
    tap(dialog, 'pointermove', { x: 890, y: 200 });
    tap(dialog, 'pointerup', { x: 890, y: 200 });
    assert.equal(dialog.open, true);
    assert.equal(dialog.style.getPropertyValue('--md-comp-side-sheet-shift'), '0px');
  });
});
