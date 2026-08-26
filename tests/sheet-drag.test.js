// One drag-to-dismiss state machine, two sheets.
//
// behaviors/sheetDrag.ts is shared by the bottom sheet and the side sheet, and
// these drive it through the DOM rather than reaching into it: press, move,
// release, then ask whether the dialog closed. What differs between the two
// sheets is exactly what is configured - the axis, the dismissal direction, and
// what counts as a handle - so those are what is pinned here.
//
// jsdom has no showModal() and no layout, so the sheets open with the `open`
// attribute and their boxes are stubbed. Prior art: tests/dialogs.test.js.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { resetBody, window } from './setup.js';

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

function point(el, type, { x, y, pointerId = 1 } = {}) {
  el.dispatchEvent(
    new window.PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      button: 0,
      buttons: type === 'pointerdown' ? 1 : 0,
      pointerId,
      pointerType: 'mouse',
      isPrimary: true
    })
  );
}

/**
 * Press at `from`, drag to `to`, release there - so the release lands on the
 * last move, velocity is 0, and the dismissal distance alone decides.
 */
function drag(el, axis, from, to) {
  const at = (v) => (axis === 'x' ? { x: v, y: 200 } : { x: 200, y: v });
  point(el, 'pointerdown', at(from));
  point(el, 'pointermove', at(to));
  point(el, 'pointerup', at(to));
}

function open(markup, rect) {
  document.body.innerHTML = markup;
  const dialog = document.querySelector('dialog');
  dialog.setAttribute('open', '');
  box(dialog, rect);
  return dialog;
}

/** 400x300, docked at the bottom of the page: top edge at y=400. */
const BOTTOM = { left: 0, top: 400, width: 400, height: 300 };
/** End-docked at the right of a 1000px page: inner edge at x=600. */
const END = { left: 600, top: 0, width: 400, height: 800 };
/** Start-docked at the left: inner edge at x=400. */
const START = { left: 0, top: 0, width: 400, height: 800 };

describe('Bottom sheet drag', () => {
  beforeEach(resetBody);

  const sheet = (inner = '<p>body</p>') =>
    open(`<dialog class="bottom-sheet">${inner}</dialog>`, BOTTOM);

  test('a downward drag past 96dp from the handle band closes it', () => {
    const dialog = sheet();
    drag(dialog, 'y', 420, 420 + 97);
    assert.equal(dialog.open, false);
  });

  test('a shorter drag snaps back and clears the shift', () => {
    const dialog = sheet();
    drag(dialog, 'y', 420, 420 + 40);
    assert.equal(dialog.open, true);
    assert.equal(dialog.style.getPropertyValue('--md-comp-bottom-sheet-shift'), '0px');
  });

  test('dragging upward does not lift the sheet off its edge', () => {
    const dialog = sheet();
    point(dialog, 'pointerdown', { x: 200, y: 420 });
    point(dialog, 'pointermove', { x: 200, y: 300 });
    assert.equal(dialog.style.getPropertyValue('--md-comp-bottom-sheet-shift'), '0px');
    point(dialog, 'pointerup', { x: 200, y: 300 });
    assert.equal(dialog.open, true);
  });

  test('a press below the 48dp band is not a handle', () => {
    const dialog = sheet();
    drag(dialog, 'y', 460, 460 + 97);
    assert.equal(dialog.open, true);
  });

  test('an explicit .handle is a handle wherever it sits', () => {
    const dialog = sheet('<span class="handle">h</span><p>body</p>');
    drag(dialog.querySelector('.handle'), 'y', 690, 690 + 97);
    assert.equal(dialog.open, false);
  });

  test('a button handle closes on activation, so a keyboard can reach it', () => {
    const dialog = sheet('<button type="button" class="drag-handle">Dismiss</button>');
    // detail 0 is what Enter and Space produce.
    dialog
      .querySelector('.drag-handle')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 0 }));
    assert.equal(dialog.open, false);
  });
});

describe('Side sheet drag', () => {
  beforeEach(resetBody);

  const sheet = (edge, rect, inner = '<p>body</p>') =>
    open(`<dialog class="side-sheet ${edge}">${inner}</dialog>`, rect);

  test('an end-docked sheet closes on a rightward drag past 96dp', () => {
    const dialog = sheet('right', END);
    drag(dialog, 'x', 610, 610 + 97);
    assert.equal(dialog.open, false);
  });

  test('an end-docked sheet ignores a leftward drag', () => {
    const dialog = sheet('right', END);
    drag(dialog, 'x', 610, 610 - 200);
    assert.equal(dialog.open, true);
    assert.equal(dialog.style.getPropertyValue('--md-comp-side-sheet-shift'), '0px');
  });

  test('a start-docked sheet closes on a leftward drag past 96dp', () => {
    const dialog = sheet('left', START);
    drag(dialog, 'x', 390, 390 - 97);
    assert.equal(dialog.open, false);
  });

  test('a start-docked sheet ignores a rightward drag', () => {
    const dialog = sheet('left', START);
    drag(dialog, 'x', 390, 390 + 200);
    assert.equal(dialog.open, true);
  });

  test('the handle is the inner 24dp edge, not the outer one', () => {
    const dialog = sheet('right', END);
    drag(dialog, 'x', 990, 990 + 97);
    assert.equal(dialog.open, true);
  });

  test('a header is a handle wherever it sits', () => {
    const dialog = sheet('right', END, '<header><h2>t</h2></header><p>body</p>');
    drag(dialog.querySelector('header'), 'x', 800, 900);
    assert.equal(dialog.open, false);
  });
});
