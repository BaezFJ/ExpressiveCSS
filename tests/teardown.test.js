// destroy() has to give back everything it took.
//
// Components register listeners on window/document/document.body that outlive
// their own DOM, so a destroy() that misses one leaks the instance and every
// node it closes over for the life of the page. These tests watch the three
// shared targets and assert the ledger balances.
//
// Element-level listeners are deliberately not tracked: those die with the
// element the component owns, and tracking them would flag teardown that is
// already correct.

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody, window } from './setup.js';

const capture = (opts) => (typeof opts === 'object' && opts !== null ? !!opts.capture : !!opts);

// jsdom lazily attaches its own window-level handlers the first time a form
// control needs focus/keyboard/mouse activation behaviour. They are part of the
// environment, never removed, and not ours - so they stay out of the ledger.
// The selector engine in jsdom 30.1 binds these handlers, prefixing their names.
const JSDOM_INTERNAL_HANDLERS = new Set([
  'handleFocusEvent',
  'handleKeyboardEvent',
  'handleMouseEvent',
  'bound handleFocusEvent',
  'bound handleKeyboardEvent',
  'bound handleMouseEvent'
]);

/**
 * Patch addEventListener/removeEventListener on the shared targets and record
 * what is still attached. Returns a handle with `live()` and `restore()`.
 */
function watchSharedListeners() {
  const targets = [window, document, document.body];
  const entries = [];
  const originals = [];

  for (const target of targets) {
    const add = target.addEventListener.bind(target);
    const remove = target.removeEventListener.bind(target);
    originals.push({ target, add: target.addEventListener, remove: target.removeEventListener });

    target.addEventListener = function (type, listener, opts) {
      const c = capture(opts);
      // The DOM ignores a duplicate (target, type, listener, capture); so do we.
      const known = entries.some(
        (e) => e.target === target && e.type === type && e.listener === listener && e.capture === c
      );
      if (!known && !JSDOM_INTERNAL_HANDLERS.has(listener?.name)) {
        entries.push({ target, type, listener, capture: c });
      }
      return add(type, listener, opts);
    };
    target.removeEventListener = function (type, listener, opts) {
      const c = capture(opts);
      const index = entries.findIndex(
        (e) => e.target === target && e.type === type && e.listener === listener && e.capture === c
      );
      if (index >= 0) entries.splice(index, 1);
      return remove(type, listener, opts);
    };
  }

  return {
    live: () => entries.map((e) => e.type),
    restore() {
      for (const { target, add, remove } of originals) {
        target.addEventListener = add;
        target.removeEventListener = remove;
      }
    }
  };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Timepicker pending submission', () => {
  beforeEach(resetBody);

  function selectMinutes(picker) {
    picker.showView('minutes');
    for (const type of ['pointerdown', 'pointerup']) {
      picker.plate.dispatchEvent(new window.PointerEvent(type, {
        bubbles: true, cancelable: true, isPrimary: true, pointerId: 1,
        pointerType: 'mouse', button: 0, clientX: 240, clientY: 135
      }));
    }
  }

  test('only the latest completed selection submits after the delay', t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    document.body.innerHTML = '<input value="03:45 PM">';
    const input = document.querySelector('input');
    let picker;
    try {
      picker = Expressive.Timepicker.init(input, { duration: 100, vibrate: false });
      const done = t.mock.method(picker, 'done');
      selectMinutes(picker);
      t.mock.timers.tick(10);
      selectMinutes(picker);
      t.mock.timers.tick(40);
      assert.equal(input.value, '03:45 PM');
      t.mock.timers.tick(10);
      assert.equal(input.value, '03:15 PM');
      assert.equal(done.mock.callCount(), 1);
    } finally {
      picker?.destroy();
      t.mock.timers.reset();
    }
  });

  for (const action of ['destroy', 'reinitialize']) {
    test(`${action} cancels all pending submissions`, t => {
      t.mock.timers.enable({ apis: ['setTimeout'] });
      document.body.innerHTML = '<input value="03:45 PM">';
      const input = document.querySelector('input');
      let changes = 0;
      let selections = 0;
      const onChange = () => changes++;
      input.addEventListener('change', onChange);
      try {
        const picker = Expressive.Timepicker.init(input, {
          duration: 100, vibrate: false, onSelect: () => selections++
        });
        selectMinutes(picker);
        selectMinutes(picker);
        assert.equal(selections, 2);
        if (action === 'destroy') picker.destroy();
        else Expressive.Timepicker.init(input, { duration: 0, vibrate: false });
        input.value = '09:30 AM';
        t.mock.timers.tick(100);
        assert.equal(input.value, '09:30 AM');
        assert.equal(changes, 0);
      } finally {
        Expressive.Timepicker.getInstance(input)?.destroy();
        input.removeEventListener('change', onChange);
        t.mock.timers.reset();
      }
    });
  }
});

describe('Timepicker pending clock reset', () => {
  beforeEach(resetBody);

  for (const action of ['destroy', 'reinitialize']) {
    test(`${action} cancels the pending clock reset`, t => {
      t.mock.timers.enable({ apis: ['setTimeout'] });
      document.body.innerHTML = '<input value="09:30 AM">';
      const input = document.querySelector('input');
      try {
        const picker = Expressive.Timepicker.init(input, { duration: 100, vibrate: false });
        picker.showView('minutes', 50);
        const setHand = t.mock.method(picker, 'setHand');
        if (action === 'destroy') picker.destroy();
        else Expressive.Timepicker.init(input, { duration: 0, vibrate: false });
        t.mock.timers.tick(100);
        assert.equal(setHand.mock.callCount(), 0, 'a destroyed picker updated its clock');
        assert.equal(input.value, '09:30 AM');
      } finally {
        Expressive.Timepicker.getInstance(input)?.destroy();
        t.mock.timers.reset();
      }
    });
  }
});

describe('destroy() releases shared listeners', () => {
  let watch;

  beforeEach(() => {
    resetBody();
    watch = watchSharedListeners();
  });

  afterEach(() => watch.restore());

  test('ScrollSpy does not attach window or document listeners', () => {
    document.body.innerHTML = `
      <div id="section1" class="scrollspy">one</div>
      <div id="section2" class="scrollspy">two</div>
      <a href="#section1">to one</a>`;
    const [first, second] = document.querySelectorAll('.scrollspy');

    const a = Expressive.ScrollSpy.init(first);
    const b = Expressive.ScrollSpy.init(second);
    assert.deepEqual(watch.live(), [], 'ScrollSpy attached a window/document listener');

    a.destroy();
    b.destroy();

    assert.deepEqual(watch.live(), []);
  });

  test('ScrollSpy ignores late observer callbacks after destroy and remount', () => {
    document.body.innerHTML = '<section id="spy"></section><a href="#spy">Section</a>';
    const original = globalThis.IntersectionObserver;
    const observers = [];
    const instances = [];
    globalThis.IntersectionObserver = class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe() {}
      disconnect() { this.disconnected = true; }
    };
    try {
      const section = document.querySelector('section');
      const link = document.querySelector('a');
      instances.push(Expressive.ScrollSpy.init(section));
      observers[0].callback([{ isIntersecting: true, intersectionRatio: 1 }]);
      assert.equal(link.getAttribute('aria-current'), 'true');
      instances[0].destroy();
      assert.equal(observers[0].disconnected, true);
      instances.push(Expressive.ScrollSpy.init(section));
      observers[0].callback([{ isIntersecting: true, intersectionRatio: 1 }]);
      assert.equal(link.hasAttribute('aria-current'), false);
      observers[1].callback([{ isIntersecting: true, intersectionRatio: 1 }]);
      assert.equal(link.getAttribute('aria-current'), 'true');
      instances[1].destroy();
      observers[1].callback([{ isIntersecting: true, intersectionRatio: 1 }]);
      assert.equal(link.hasAttribute('aria-current'), false);
      assert.equal(Expressive.ScrollSpy._elements.length, 0);
      assert.equal(observers[1].disconnected, true);
    } finally {
      instances.forEach(instance => instance.destroy());
      globalThis.IntersectionObserver = original;
    }
  });

  test('Carousel detaches the shared resize listener', () => {
    document.body.innerHTML = `
      <div class="carousel">
        <a class="carousel-item" href="#one">one</a>
        <a class="carousel-item" href="#two">two</a>
      </div>`;
    const instance = Expressive.Carousel.init(document.querySelector('.carousel'));
    instance.destroy();
    assert.deepEqual(watch.live(), [], 'Carousel left the resize listener attached');
  });

  test('Carousel with an interval detaches the visibility listener', () => {
    document.body.innerHTML = `
      <div class="carousel">
        <a class="carousel-item" href="#one">one</a>
        <a class="carousel-item" href="#two">two</a>
      </div>`;
    const instance = Expressive.Carousel.init(document.querySelector('.carousel'), {
      interval: 5000
    });
    // A live interval keeps node:test's event loop alive, so a failing
    // assertion here would hang the file rather than fail it.
    try {
      assert.notDeepEqual(watch.live(), [], 'auto-advance attached nothing to begin with');
    } finally {
      instance.destroy();
    }
    assert.deepEqual(watch.live(), [], 'Carousel left the visibilitychange listener attached');
  });

  test('Menu detaches the handlers open() adds', async () => {
    document.body.innerHTML = `
      <a class="button menu-trigger" data-target="menu1">Drop</a>
      <menu id="menu1"><li><a href="#!">one</a></li></menu>`;
    const instance = Expressive.Menu.init(document.querySelector('.menu-trigger'));

    instance.open();
    await tick(); // open() defers _setupTemporaryEventHandlers by a frame
    assert.notDeepEqual(watch.live(), [], 'open() attached nothing to begin with');

    instance.destroy();

    assert.deepEqual(watch.live(), [], 'Menu left its temporary handlers attached');
  });

  test('FloatingActionButton detaches the document handlers open() adds', () => {
    document.body.innerHTML = `
      <div class="fab-menu">
        <a class="button extra circle">+</a>
        <ul><li><a class="button extra circle small">e</a></li></ul>
      </div>`;
    const instance = Expressive.FloatingActionButton.init(document.querySelector('.fab-menu'));

    instance.open();
    assert.ok(watch.live().includes('click'), 'open() did not attach a document click handler');

    instance.destroy();
    assert.deepEqual(watch.live(), []);
  });

  test('NavigationRail detaches its document keydown handler', () => {
    document.body.innerHTML = `
      <nav class="navigation-rail" aria-label="Main">
        <button type="button" aria-label="Menu"><i>menu</i></button>
        <a href="#!">Label</a>
      </nav>`;
    const instance = Expressive.NavigationRail.init(document.querySelector('.navigation-rail'));

    assert.ok(watch.live().includes('keydown'), 'NavigationRail did not attach a document keydown handler');

    instance.destroy();
    assert.deepEqual(watch.live(), [], 'NavigationRail left its keydown listener attached');
  });

  test('the docked display plugin detaches its document click handler', () => {
    document.body.innerHTML = `<input type="text" class="datepicker">`;
    const instance = Expressive.Datepicker.init(document.querySelector('.datepicker'), {
      displayPlugin: 'docked'
    });
    try {
      assert.ok(
        watch.live().includes('click'),
        'the docked plugin did not attach a document click handler'
      );
    } finally {
      instance.destroy();
    }

    assert.deepEqual(watch.live(), [], 'the docked plugin outlived the picker that owns it');
  });
});

describe('destroy() clears the instance off the element', () => {
  beforeEach(resetBody);

  test('CharacterCounter', () => {
    document.body.innerHTML = `<div class="field"><input type="text" maxlength="10"></div>`;
    const el = document.querySelector('input');
    const instance = Expressive.CharacterCounter.init(el);

    instance.destroy();

    assert.equal(
      Expressive.CharacterCounter.getInstance(el),
      undefined,
      'the counter stayed stashed on the element under the wrong key'
    );
  });

  test('Cards', () => {
    document.body.innerHTML = `<article><button type="button" class="card-reveal-trigger" aria-label="Toggle details" aria-controls="teardown-card-details">T</button><aside id="teardown-card-details"><h4>T</h4><p>body</p></aside></article>`;
    const el = document.querySelector('article');
    const instance = Expressive.Cards.init(el);

    instance.destroy();

    assert.equal(Expressive.Cards.getInstance(el), undefined);
  });
});
