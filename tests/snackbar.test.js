// M3 Expressive snackbar: inverse-surface bar at the bottom, not a modal.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Expressive, resetBody, window } from './setup.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('Snackbar', () => {
  test('uses the inverse-surface / inverse-primary mapping', () => {
    assert.match(css, /--md-comp-snackbar-container-color:\s*var\(--md-sys-color-inverse-surface\)/);
    assert.match(css, /--md-comp-snackbar-supporting-text-color:\s*var\(--md-sys-color-inverse-on-surface\)/);
    assert.match(css, /--md-comp-snackbar-action-label-text-color:\s*var\(--md-sys-color-inverse-primary\)/);
  });

  test('is a 48dp bar with extra-small corners', () => {
    assert.match(css, /--md-comp-snackbar-container-shape:\s*4px/);
    assert.match(css, /\.snackbar\s*\{[^}]*min-height:\s*48px/s);
  });

  test('the overlay does not capture page pointer events', () => {
    assert.match(css, /#snackbar-container\s*\{[^}]*pointer-events:\s*none/s);
  });

  for (const [label, distance, pause, dismissed] of [
    ['a paused short drag snaps back', 50, 2000, false],
    ['an immediate flick dismisses', 50, 0, true],
    ['a paused long drag dismisses by distance', 250, 2000, true],
    ['a 99ms-old flick still dismisses', 50, 99, true],
    ['a 100ms-old flick has expired', 50, 100, false],
  ]) {
    test(`release: ${label}`, t => {
      resetBody();
      t.mock.timers.enable({ apis: ['setTimeout'] });
      let now = 1000;
      t.mock.method(Date, 'now', () => now);
      let snackbar;
      const pointer = (type, clientX) => (type === 'pointerdown' ? snackbar.el : document).dispatchEvent(
        new window.PointerEvent(type, {
          bubbles: true, cancelable: true, isPrimary: true, pointerId: 1,
          pointerType: 'touch', button: 0, clientX
        })
      );
      try {
        snackbar = new Expressive.Snackbar({ text: 'Saved', displayLength: Infinity, outDuration: 0 });
        Object.defineProperty(snackbar.el, 'offsetWidth', { value: 300 });
        t.mock.timers.tick(1);
        pointer('pointerdown', 0);
        now += 10;
        pointer('pointermove', distance);
        now += pause;
        pointer('pointerup', distance);
        t.mock.timers.tick(1);
        assert.equal(snackbar.el.isConnected, !dismissed);
        assert.equal(!!snackbar.wasSwiped, dismissed);
        assert.equal(snackbar.panning, false);
        assert.equal(Expressive.Snackbar._draggedSnackbar, null);
        assert.equal(Expressive.Snackbar._dragPointerId, null);
        if (!dismissed) {
          assert.equal(snackbar.el.style.transform, '');
          assert.equal(snackbar.el.style.opacity, '');
        }
      } finally {
        snackbar?.dismiss();
        t.mock.timers.runAll();
        t.mock.timers.reset();
        resetBody();
      }
    });
  }

  test('a cancelled flick does not turn the next stationary tap into a dismissal', t => {
    resetBody();
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let now = 0;
    t.mock.method(Date, 'now', () => now);
    let snackbar;
    const pointer = (type, clientX) => (type === 'pointerdown' ? snackbar.el : document).dispatchEvent(
      new window.PointerEvent(type, {
        bubbles: true, cancelable: true, isPrimary: true, pointerId: 1,
        pointerType: 'touch', button: 0, clientX
      })
    );
    try {
      snackbar = new Expressive.Snackbar({ text: 'Saved', displayLength: Infinity, outDuration: 0 });
      Object.defineProperty(snackbar.el, 'offsetWidth', { value: 300 });
      t.mock.timers.tick(1);
      pointer('pointerdown', 0);
      now += 10;
      pointer('pointermove', 50);
      pointer('pointercancel', 50);
      assert.equal(snackbar.el.style.transform, '');
      pointer('pointerdown', 50);
      pointer('pointerup', 50);
      t.mock.timers.tick(1);
      assert.equal(snackbar.el.isConnected, true, 'the stationary tap must leave the snackbar open');
      assert.notEqual(snackbar.wasSwiped, true);

      pointer('pointerdown', 0);
      now += 10;
      pointer('pointermove', 50);
      pointer('pointerup', 50);
      t.mock.timers.tick(1);
      assert.equal(snackbar.wasSwiped, true, 'a fresh short flick still dismisses by velocity');
      assert.equal(snackbar.el.isConnected, false);
    } finally {
      snackbar?.dismiss();
      t.mock.timers.runAll();
      t.mock.timers.reset();
      resetBody();
    }
  });

  test('reuses an authored body after dismissal and during replacement without stale state', t => {
    resetBody();
    t.mock.timers.enable({ apis: ['setTimeout'] });
    document.body.innerHTML = '<section><div id="notice" class="authored" style="display:none"><p>Saved</p><button type="button">Details</button></div><span>After</span></section>';
    const source = document.getElementById('notice');
    const parent = source.parentElement;
    const authoredButton = source.querySelector('button');
    let authoredClicks = 0, actions = 0, completions = 0;
    authoredButton.addEventListener('click', () => authoredClicks++);
    const original = source.outerHTML;
    const options = { snackbarId: 'notice', displayLength: Infinity, inDuration: 0, outDuration: 20,
      action: 'Undo', onAction: () => actions++, completeCallback: () => completions++ };
    try {
      const first = new Expressive.Snackbar(options);
      assert.equal(first.el, source);
      first.dismiss();
      t.mock.timers.tick(30);
      const second = new Expressive.Snackbar(options);
      assert.equal(second.el, source);
      assert.equal(source.querySelectorAll('button').length, 3);
      assert.equal(source.style.marginTop, '');
      second.dismiss();
      const third = new Expressive.Snackbar(options);
      t.mock.timers.tick(30);
      assert.equal(source.style.opacity, '1');
      assert.equal(source.inert, false);
      assert.equal(Expressive.Snackbar.getInstance(source), third);
      assert.equal(completions, 1, 'superseded dismissal must not complete against a reused element');
      authoredButton.click();
      assert.equal(authoredClicks, 1);
      [...source.querySelectorAll('button')].find(button => button.textContent === 'Undo').click();
      t.mock.timers.tick(30);
      assert.equal(actions, 1);
      assert.equal(completions, 2);
      assert.equal(source.parentElement, parent);
      assert.equal(parent.firstElementChild, source);
      assert.equal(source.outerHTML, original);
      assert.equal(Expressive.Snackbar.getInstance(source), undefined);
      let staleListenerCalls = 0;
      third._pauseTimer = () => staleListenerCalls++;
      source.dispatchEvent(new window.Event('pointerenter'));
      assert.equal(staleListenerCalls, 0, 'dismissal detaches owned listeners');
      assert.equal(Expressive.Snackbar._snackbars.length, 0);
      assert.equal(Expressive.Snackbar._container, null);

      let replacement;
      const fourth = new Expressive.Snackbar({ ...options, text: 'Updated', outDuration: 0,
        completeCallback: () => { replacement = new Expressive.Snackbar(options); } });
      fourth.dismiss();
      t.mock.timers.tick(1);
      assert.equal(replacement.el, source, 'completion can reopen the same authored body');
      assert.equal(Expressive.Snackbar.getInstance(source), replacement);
      assert.equal(source.querySelector('p').textContent, 'Saved');
      // The completion callback creates a new animation timer on the next tick.
      t.mock.timers.tick(1);
      assert.equal(source.style.opacity, '1');
    } finally {
      for (const snackbar of [...Expressive.Snackbar._snackbars]) if (snackbar.el) snackbar.dismiss();
      t.mock.timers.runAll();
      t.mock.timers.reset();
      // An incomplete constructor in the original bundle leaves a registry entry.
      Expressive.Snackbar._snackbars.length = 0;
      if (Expressive.Snackbar._container) Expressive.Snackbar._removeContainer();
      resetBody();
    }
  });

  test('template sources stay reusable and missing bodies leave no registered instance', async () => {
    resetBody();
    document.body.innerHTML = '<template id="notice"><div><p>Saved</p></div></template>';
    const source = document.getElementById('notice');
    const original = source.innerHTML;
    try {
      assert.throws(() => new Expressive.Snackbar({ snackbarId: 'missing' }));
      assert.equal(Expressive.Snackbar._snackbars.length, 0);
      const first = new Expressive.Snackbar({ snackbarId: 'notice', displayLength: Infinity, outDuration: 0 });
      const second = new Expressive.Snackbar({ snackbarId: 'notice', displayLength: Infinity, outDuration: 0 });
      assert.notEqual(first.el, second.el);
      assert.equal(first.el.isConnected, false);
      assert.equal(source.innerHTML, original);
      assert.equal(source.isConnected, true);
    } finally {
      for (const snackbar of [...Expressive.Snackbar._snackbars]) if (snackbar.el) snackbar.dismiss();
      await new Promise(resolve => setTimeout(resolve, 5));
      Expressive.Snackbar._snackbars.length = 0;
      if (Expressive.Snackbar._container) Expressive.Snackbar._removeContainer();
      resetBody();
    }
  });

  for (const action of ['dismiss', 'replace']) {
    test(`focus restoration can reopen an authored body during ${action}`, async () => {
      resetBody();
      document.body.innerHTML = '<button id="outside">Outside</button><div id="notice" style="display:none">Saved</div>';
      const source = document.getElementById('notice');
      const outside = document.getElementById('outside');
      const options = { snackbarId: 'notice', action: 'Undo', displayLength: Infinity, outDuration: 0 };
      try {
        outside.focus();
        const first = new Expressive.Snackbar(options);
        source.querySelector('button').focus();
        outside.addEventListener('focus', () => new Expressive.Snackbar({ ...options, action: 'Nested' }), { once: true });
        if (action === 'dismiss') first.dismiss();
        else new Expressive.Snackbar({ ...options, action: 'Final' });
        await new Promise(resolve => setTimeout(resolve, 10));
        assert.equal(source.isConnected, true);
        assert.equal(source.inert, false);
        assert.equal(source.style.opacity, '1');
        assert.equal(source.style.marginTop, '');
        assert.equal(source.querySelectorAll('button').length, 2);
        assert.equal(source.querySelector('button').textContent, action === 'dismiss' ? 'Nested' : 'Final');
        assert.equal(Expressive.Snackbar._snackbars.length, 1);
        assert.equal(Expressive.Snackbar.getInstance(source), Expressive.Snackbar._snackbars[0]);
      } finally {
        Expressive.Snackbar.dismissAll();
        await new Promise(resolve => setTimeout(resolve, 5));
        resetBody();
      }
    });
  }
});
