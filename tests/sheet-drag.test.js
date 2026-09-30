import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resetBody, window } from './setup.js';

const variants = [
  { classes: 'bottom-sheet', axis: 'y', sign: 1 },
  { classes: 'side-sheet', axis: 'x', sign: 1 },
  { classes: 'side-sheet start', axis: 'x', sign: -1 },
  { classes: 'side-sheet', axis: 'x', sign: -1, direction: 'rtl' },
  { classes: 'side-sheet start', axis: 'x', sign: 1, direction: 'rtl' }
];

const gestures = [
  { name: 'flick followed by a stationary release', moves: [[10, 60]], release: [1, 60], dismiss: true },
  { name: 'flick followed by a duplicate move', moves: [[10, 60], [1, 60]], release: [1, 60], dismiss: true },
  { name: 'flick held still before release', moves: [[10, 60]], release: [200, 60], dismiss: false },
  { name: 'slow short drag', moves: [[150, 60]], release: [1, 60], dismiss: false },
  { name: 'reversed final move', moves: [[10, 60], [10, 40]], release: [1, 40], dismiss: false },
  { name: 'reversed release', moves: [[10, 60]], release: [1, 40], dismiss: false },
  { name: 'release reverses a distance dismissal', moves: [[200, 120]], release: [1, 60], dismiss: false },
  { name: 'cancelled flick', moves: [[10, 60]], release: [1, 60], cancel: true, dismiss: false },
  { name: 'hand jitter', moves: [[1, 3]], release: [1, 3], dismiss: false },
  { name: 'hand jitter at release', moves: [], release: [1, 3], dismiss: false },
  { name: 'movement away from dismissal', moves: [[10, -60]], release: [1, -60], dismiss: false },
  { name: 'release completes a flick', moves: [[100, 20]], release: [10, 70], dismiss: true }
];

for (const variant of variants) for (const gesture of gestures) {
  test(`${variant.classes} ${variant.direction ?? 'ltr'}: ${gesture.name}`, t => {
    resetBody();
    t.mock.timers.enable({ apis: ['Date'], now: 1000 });
    const dialog = document.createElement('dialog');
    dialog.className = variant.classes;
    dialog.style.direction = variant.direction ?? 'ltr';
    dialog.innerHTML = '<header>Drag handle</header>';
    document.body.append(dialog);
    dialog.show();
    dialog.getBoundingClientRect = () => ({ left: 80, top: 80, right: 380, bottom: 380 });
    const handle = dialog.querySelector('header');
    const pointer = (type, distance) => handle.dispatchEvent(new window.PointerEvent(type, {
      bubbles: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0,
      clientX: 100 + (variant.axis === 'x' ? variant.sign * distance : 0),
      clientY: 100 + (variant.axis === 'y' ? distance : 0)
    }));
    try {
      pointer('pointerdown', 0);
      for (const [delay, distance] of gesture.moves) {
        t.mock.timers.tick(delay);
        pointer('pointermove', distance);
      }
      t.mock.timers.tick(gesture.release[0]);
      pointer(gesture.cancel ? 'pointercancel' : 'pointerup', gesture.release[1]);
      assert.equal(dialog.open, !gesture.dismiss);
      const property = variant.axis === 'x' ? '--md-comp-side-sheet-shift' : '--md-comp-bottom-sheet-shift';
      assert.equal(dialog.style.getPropertyValue(property), '0px');
      assert.equal(dialog.style.transition, '');
    } finally {
      pointer('pointercancel', 0);
      dialog.close();
      dialog.remove();
      t.mock.timers.reset();
    }
  });
}
