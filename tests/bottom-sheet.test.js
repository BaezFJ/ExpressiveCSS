// M3 Expressive bottom sheet: docked surface, handle, modal vs standard.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { resetBody, window } from './setup.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('Bottom sheet CSS', () => {
  test('uses surface-container-low and 28dp top corners', () => {
    assert.match(
      css,
      /--md-comp-bottom-sheet-container-color:\s*var\(--md-sys-color-surface-container-low\)/
    );
    assert.match(css, /--md-comp-bottom-sheet-container-shape:\s*28px/);
  });

  test('caps width at 640dp and leaves 72dp at the top', () => {
    assert.match(css, /--md-comp-bottom-sheet-container-max-width:\s*640px/);
    assert.match(css, /--md-comp-bottom-sheet-top-inset:\s*72px/);
    assert.match(css, /--md-comp-bottom-sheet-margin-inline:\s*56px/);
  });

  test('only the modal variant paints a scrim', () => {
    assert.match(css, /dialog\.bottom-sheet:not\(:modal\)::backdrop/);
    assert.match(css, /dialog\.bottom:not\(:modal\)::backdrop/);
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

describe('Bottom sheet drag', () => {
  beforeEach(resetBody);

  function openSheet() {
    document.body.innerHTML = `
      <dialog class="bottom-sheet">
        <h2>Title</h2>
        <p>Secondary</p>
      </dialog>`;
    const dialog = document.querySelector('dialog');
    dialog.setAttribute('open', '');
    box(dialog, { left: 0, top: 400, width: 360, height: 240 });
    return dialog;
  }

  test('dragging the handle past the threshold dismisses', () => {
    const dialog = openSheet();
    tap(dialog, 'pointerdown', { x: 180, y: 420 });
    tap(dialog, 'pointermove', { x: 180, y: 540 });
    tap(dialog, 'pointerup', { x: 180, y: 540 });
    assert.equal(dialog.open, false);
  });

  test('a short drag on the handle snaps back', () => {
    const dialog = openSheet();
    tap(dialog, 'pointerdown', { x: 180, y: 420 });
    tap(dialog, 'pointermove', { x: 180, y: 450 });
    tap(dialog, 'pointerup', { x: 180, y: 450 });
    assert.equal(dialog.open, true);
    assert.equal(dialog.style.getPropertyValue('--md-comp-bottom-sheet-shift'), '0px');
  });

  test('a drag that starts in the body does not dismiss', () => {
    const dialog = openSheet();
    tap(dialog, 'pointerdown', { x: 180, y: 500 });
    tap(dialog, 'pointermove', { x: 180, y: 640 });
    tap(dialog, 'pointerup', { x: 180, y: 640 });
    assert.equal(dialog.open, true);
  });
});

// Dragging is a pointer gesture, so a handle that only answers a drag puts
// dismissal out of reach of anyone without a pointer. A handle written as a
// <button> is a control and is activated like one; a handle written as anything
// else is decoration and stays inert. Escape closes the sheet either way, and
// that is the browser's, not this file's.
describe('Bottom sheet handle button', () => {
  beforeEach(resetBody);

  // `detail` is what tells the two apart in the wild: 0 from Enter or Space,
  // >= 1 from a pointer. The tests spell it out for the same reason the
  // behaviour reads it.
  function activate(el, { detail = 0 } = {}) {
    el.dispatchEvent(
      new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window, detail })
    );
  }

  function openSheet(handle = '<button type="button" class="drag-handle" aria-label="Dismiss"></button>') {
    document.body.innerHTML = `
      <dialog class="bottom-sheet">
        ${handle}
        <h2>Title</h2>
        <p>Secondary</p>
      </dialog>`;
    const dialog = document.querySelector('dialog');
    dialog.setAttribute('open', '');
    box(dialog, { left: 0, top: 400, width: 360, height: 240 });
    return dialog;
  }

  test('a keyboard activation dismisses', () => {
    const dialog = openSheet();
    activate(dialog.querySelector('.drag-handle'));
    assert.equal(dialog.open, false);
  });

  test('the pre-1.0 .handle spelling is the same control', () => {
    const dialog = openSheet('<button type="button" class="handle" aria-label="Dismiss"></button>');
    activate(dialog.querySelector('.handle'));
    assert.equal(dialog.open, false);
  });

  test('a pointer tap dismisses', () => {
    const dialog = openSheet();
    const handle = dialog.querySelector('.drag-handle');
    tap(handle, 'pointerdown', { x: 180, y: 420 });
    tap(handle, 'pointerup', { x: 180, y: 420 });
    activate(handle, { detail: 1 });
    assert.equal(dialog.open, false);
  });

  // The regression this pairs with: a drag ends in a click on the element it
  // started on, so without the slop check the click would dismiss the sheet the
  // drag had just decided not to dismiss.
  test('the click ending a snapped-back drag does not dismiss', () => {
    const dialog = openSheet();
    const handle = dialog.querySelector('.drag-handle');
    tap(handle, 'pointerdown', { x: 180, y: 420 });
    tap(handle, 'pointermove', { x: 180, y: 450 });
    tap(handle, 'pointerup', { x: 180, y: 450 });
    assert.equal(dialog.open, true, 'the drag itself should have snapped back');
    activate(handle, { detail: 1 });
    assert.equal(dialog.open, true);
  });

  test('a keyboard activation still works after a snapped-back drag', () => {
    const dialog = openSheet();
    const handle = dialog.querySelector('.drag-handle');
    tap(handle, 'pointerdown', { x: 180, y: 420 });
    tap(handle, 'pointermove', { x: 180, y: 450 });
    tap(handle, 'pointerup', { x: 180, y: 450 });
    activate(handle);
    assert.equal(dialog.open, false);
  });

  test('a decorative handle is not a control', () => {
    const dialog = openSheet('<span class="drag-handle" aria-hidden="true"></span>');
    activate(dialog.querySelector('.drag-handle'));
    assert.equal(dialog.open, true);
  });

  test('activating anything else in the sheet leaves it open', () => {
    const dialog = openSheet();
    activate(dialog.querySelector('h2'));
    assert.equal(dialog.open, true);
  });

  test('a handle outside a sheet dismisses nothing', () => {
    document.body.innerHTML =
      '<button type="button" class="drag-handle" aria-label="Resize"></button>';
    activate(document.querySelector('.drag-handle'));
    assert.ok(true, 'no throw');
  });
});
