// Light-dismiss must not treat a gesture that started on the dialog as a
// scrim tap. jsdom has no showModal() and no layout, so we open with the
// `open` attribute and stub the box.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { resetBody, window } from './setup.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('Dialog CSS', () => {
  test('the retired top sheet is not in the sheet', () => {
    assert.doesNotMatch(css, /dialog\.top(?:-sheet)?[\s,{]/);
    assert.doesNotMatch(css, /--md-comp-basic-dialog-sheet-width/);
  });

  test('basic uses surface-container-high, 28dp corners, 280–560dp', () => {
    assert.match(
      css,
      /--md-comp-basic-dialog-container-color:\s*var\(--md-sys-color-surface-container-high\)/
    );
    assert.match(css, /--md-comp-basic-dialog-container-shape:\s*28px/);
    assert.match(css, /--md-comp-basic-dialog-container-min-width:\s*280px/);
    assert.match(css, /--md-comp-basic-dialog-container-max-width:\s*560px/);
  });

  test('supporting text is on-surface-variant, not a currentColor mix', () => {
    assert.match(css, /dialog\s*>\s*p\s*\{[^}]*--md-sys-color-on-surface-variant/s);
    assert.doesNotMatch(
      css,
      /dialog\s*>\s*p[\s\S]{0,400}color-mix\(in oklab,\s*currentColor 72%/
    );
  });

  test('full-screen drops the scrim and uses a 64dp header', () => {
    assert.match(css, /dialog\.max\s*\{[^}]*--md-sys-color-surface/s);
    assert.match(css, /dialog\.max\s*>\s*header\s*\{[^}]*min-height:\s*64px/s);
    assert.match(css, /dialog\.max::backdrop\s*\{[^}]*background:\s*none/s);
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

function openDialog(attrs = '') {
  document.body.innerHTML = `<dialog ${attrs}><p>body</p><button type="button">ok</button></dialog>`;
  const dialog = document.querySelector('dialog');
  dialog.setAttribute('open', '');
  box(dialog, { left: 100, top: 100, width: 200, height: 200 });
  return dialog;
}

describe('dialog light dismiss', () => {
  beforeEach(resetBody);

  test('closes when press and release both land on the scrim', () => {
    const dialog = openDialog();
    tap(dialog, 'pointerdown', { x: 10, y: 10 });
    tap(dialog, 'pointerup', { x: 12, y: 12 });
    assert.equal(dialog.open, false);
  });

  test('stays open when the press starts on the dialog and releases on the scrim', () => {
    const dialog = openDialog();
    tap(dialog, 'pointerdown', { x: 150, y: 150 });
    tap(dialog, 'pointerup', { x: 10, y: 10 });
    assert.equal(dialog.open, true);
  });

  test('stays open when the press starts on the scrim and releases on the dialog', () => {
    const dialog = openDialog();
    tap(dialog, 'pointerdown', { x: 10, y: 10 });
    tap(dialog, 'pointerup', { x: 150, y: 150 });
    assert.equal(dialog.open, true);
  });

  test('stays open when both ends land on the dialog', () => {
    const dialog = openDialog();
    tap(dialog, 'pointerdown', { x: 150, y: 150 });
    tap(dialog, 'pointerup', { x: 160, y: 160 });
    assert.equal(dialog.open, true);
  });

  test('a child hit is never a scrim tap, even if the point is outside the box', () => {
    const dialog = openDialog();
    const child = dialog.querySelector('p');
    tap(child, 'pointerdown', { x: 10, y: 10 });
    tap(dialog, 'pointerup', { x: 10, y: 10 });
    assert.equal(dialog.open, true);
  });

  test('a UA default closedBy of closerequest is not an opt-out', () => {
    const dialog = openDialog();
    Object.defineProperty(dialog, 'closedBy', { configurable: true, get: () => 'closerequest' });
    tap(dialog, 'pointerdown', { x: 10, y: 10 });
    tap(dialog, 'pointerup', { x: 10, y: 10 });
    assert.equal(dialog.open, false);
  });

  test('closedby="none" opts out', () => {
    const dialog = openDialog('closedby="none"');
    tap(dialog, 'pointerdown', { x: 10, y: 10 });
    tap(dialog, 'pointerup', { x: 10, y: 10 });
    assert.equal(dialog.open, true);
  });

  test('closedby="closerequest" opts out', () => {
    const dialog = openDialog('closedby="closerequest"');
    tap(dialog, 'pointerdown', { x: 10, y: 10 });
    tap(dialog, 'pointerup', { x: 10, y: 10 });
    assert.equal(dialog.open, true);
  });

  test('a cancelled gesture does not close on a later release', () => {
    const dialog = openDialog();
    tap(dialog, 'pointerdown', { x: 10, y: 10 });
    dialog.dispatchEvent(new window.PointerEvent('pointercancel', { bubbles: true, pointerId: 1 }));
    tap(dialog, 'pointerup', { x: 10, y: 10 });
    assert.equal(dialog.open, true);
  });
});
