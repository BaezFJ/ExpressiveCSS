// Light-dismiss must not treat a gesture that started on the dialog as a
// scrim tap. jsdom has no showModal() and no layout, so we open with the
// `open` attribute and stub the box.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { resetBody, window, Expressive } from './setup.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('Dialog CSS', () => {
  test('retired sheet variants are not in the sheet', () => {
    assert.doesNotMatch(css, /dialog\.top(?:-sheet)?[\s,{]/);
    assert.doesNotMatch(css, /--md-comp-basic-dialog-sheet-width/);
    assert.doesNotMatch(css, /floating-sheet/);
  });

  test('basic uses surface-container-high, 28dp corners, 280–560dp', () => {
    assert.match(
      css,
      /--md-comp-basic-dialog-container-color:\s*var\(--md-sys-color-surface-container-high\)/
    );
    assert.match(css, /--md-comp-basic-dialog-container-shape:\s*var\(--md-sys-shape-corner-extra-large\)/);
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

describe('Dialogs.confirm', () => {
  beforeEach(resetBody);
  const { Dialogs } = Expressive;
  const dialogs = () => [...document.querySelectorAll('dialog[role="alertdialog"]')];
  // The jsdom close() stub ignores its argument, so set the return value first.
  const answer = (dialog, value) => {
    dialog.returnValue = value;
    dialog.close();
  };

  test('builds a named alert dialog, with and without a headline', () => {
    Dialogs.confirm({ headline: 'Delete file?', text: 'This cannot be undone.' });
    Dialogs.confirm({ text: 'Leave the page?' });
    const [withHeadline, plain] = dialogs();

    assert.equal(withHeadline.open, true);
    const [heading, text, form] = withHeadline.children;
    assert.equal(heading.tagName, 'H2');
    assert.equal(heading.textContent, 'Delete file?');
    assert.equal(text.tagName, 'P');
    assert.equal(text.textContent, 'This cannot be undone.');
    assert.equal(form.getAttribute('method'), 'dialog');
    assert.equal(withHeadline.lastElementChild, form);
    assert.equal(withHeadline.getAttribute('aria-labelledby'), heading.id);
    assert.equal(withHeadline.getAttribute('aria-describedby'), text.id);

    const [cancel, confirm] = form.querySelectorAll('button');
    assert.deepEqual([cancel.type, cancel.value, cancel.className, cancel.autofocus], ['submit', '', 'text', true]);
    assert.deepEqual([confirm.type, confirm.value, confirm.autofocus], ['submit', 'confirm', false]);

    assert.equal(plain.querySelector('h2'), null);
    assert.equal(plain.getAttribute('aria-labelledby'), plain.querySelector('p').id);
    assert.equal(plain.hasAttribute('aria-describedby'), false);
    assert.notEqual(plain.querySelector('p').id, text.id);
  });

  test('sets the text and labels as text, not markup', () => {
    const markup = '<img src=x onerror=alert(1)>';
    Dialogs.confirm({ headline: markup, text: markup, confirm: markup, cancel: markup });
    const [dialog] = dialogs();
    assert.equal(dialog.querySelector('img'), null);
    assert.equal(dialog.querySelector('p').textContent, markup);
    assert.equal(dialog.querySelector('h2').textContent, markup);
    assert.deepEqual([...dialog.querySelectorAll('button')].map((b) => b.textContent), [markup, markup]);
  });

  test('labels default to Dialogs.i18n, and per-call labels win', () => {
    const saved = { ...Dialogs.i18n };
    try {
      Dialogs.confirm({ text: 'a' });
      Dialogs.confirm({ text: 'b', confirm: 'Delete' });
      Dialogs.i18n.cancel = 'Keep';
      Dialogs.confirm({ text: 'c' });
      const labels = dialogs().map((d) => [...d.querySelectorAll('button')].map((b) => b.textContent));
      assert.deepEqual(labels, [
        ['Cancel', 'OK'],
        ['Cancel', 'Delete'],
        ['Keep', 'OK']
      ]);
    } finally {
      Object.assign(Dialogs.i18n, saved);
    }
  });

  test('resolves true for the confirm value and false otherwise', async () => {
    // The open dialog, so a dialog left behind after closing cannot hang the test.
    const open = () => document.querySelector('dialog[open]');
    const yes = Dialogs.confirm({ text: 'a' });
    answer(open(), 'confirm');
    assert.equal(await yes, true);

    const no = Dialogs.confirm({ text: 'b' });
    open().close();
    assert.equal(await no, false);
  });

  test('resolves false when page code removes the open dialog', async () => {
    const answer = Dialogs.confirm({ text: 'a' });
    document.body.innerHTML = '';
    // Race a timer, so a promise that never settles fails instead of hanging.
    const pending = new Promise((resolve) => setTimeout(resolve, 100, 'pending'));
    assert.equal(await Promise.race([answer, pending]), false);
  });

  test('removes each dialog after it closes, and two calls resolve independently', async () => {
    const first = Dialogs.confirm({ text: 'a' });
    const second = Dialogs.confirm({ text: 'b' });
    const [one, two] = dialogs();
    answer(two, 'confirm');
    assert.equal(await second, true);
    assert.deepEqual(dialogs(), [one]);
    answer(one, '');
    assert.equal(await first, false);
    assert.deepEqual(dialogs(), []);
  });
});
