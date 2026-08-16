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
const JSDOM_INTERNAL_HANDLERS = new Set([
  'handleFocusEvent',
  'handleKeyboardEvent',
  'handleMouseEvent'
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

describe('destroy() releases shared listeners', () => {
  let watch;

  beforeEach(() => {
    resetBody();
    watch = watchSharedListeners();
  });

  afterEach(() => watch.restore());

  test('ScrollSpy detaches the scroll, resize and click handlers it shares', () => {
    document.body.innerHTML = `
      <div id="section1" class="scrollspy">one</div>
      <div id="section2" class="scrollspy">two</div>
      <a href="#section1">to one</a>`;
    const [first, second] = document.querySelectorAll('.scrollspy');

    const a = Expressive.ScrollSpy.init(first);
    const b = Expressive.ScrollSpy.init(second);
    assert.notDeepEqual(watch.live(), [], 'ScrollSpy attached nothing to begin with');

    // Destroyed out of creation order on purpose: the listeners used to be
    // registered with the first instance's bound handler and unregistered with
    // the last one's, so removeEventListener silently did nothing.
    a.destroy();
    b.destroy();

    assert.deepEqual(watch.live(), [], 'ScrollSpy left listeners attached after destroy()');
  });

  test('Pushpin detaches its document scroll handler', () => {
    document.body.innerHTML = `<div class="pushpin">pinned</div>`;
    const instance = Expressive.Pushpin.init(document.querySelector('.pushpin'));

    instance.destroy();

    assert.deepEqual(watch.live(), []);
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

  test('Parallax does not attach window listeners', () => {
    document.body.innerHTML = `<div class="parallax"><img src="http://localhost/1.jpg"></div>`;
    const instance = Expressive.Parallax.init(document.querySelector('.parallax'));

    assert.deepEqual(watch.live(), [], 'Parallax attached window listeners; motion is CSS');
    instance.destroy();
    assert.deepEqual(watch.live(), []);
  });

  test('Dropdown detaches the handlers open() adds', async () => {
    document.body.innerHTML = `
      <a class="dropdown-trigger btn" data-target="dropdown1">Drop</a>
      <ul id="dropdown1" class="dropdown-content"><li><a href="#!">one</a></li></ul>`;
    const instance = Expressive.Dropdown.init(document.querySelector('.dropdown-trigger'));

    instance.open();
    await tick(); // open() defers _setupTemporaryEventHandlers by a frame
    assert.notDeepEqual(watch.live(), [], 'open() attached nothing to begin with');

    instance.destroy();

    assert.deepEqual(watch.live(), [], 'Dropdown left its temporary handlers attached');
  });

  test('TapTarget detaches the document handlers open() adds', () => {
    document.body.innerHTML = `
      <div class="tap-target" data-target="menu-btn"><div class="tap-target-content"><h5>Title</h5></div></div>
      <a id="menu-btn" class="btn">menu</a>`;
    const instance = Expressive.TapTarget.init(document.querySelector('.tap-target'));

    instance.open();
    assert.notDeepEqual(watch.live(), []);

    instance.destroy();

    assert.deepEqual(watch.live(), []);
  });

  test('the docked display plugin detaches its document click handler', () => {
    document.body.innerHTML = `<input type="text" class="datepicker">`;
    const instance = Expressive.Datepicker.init(document.querySelector('.datepicker'), {
      displayPlugin: 'docked'
    });
    assert.ok(
      watch.live().includes('click'),
      'the docked plugin did not attach a document click handler'
    );

    instance.destroy();

    assert.deepEqual(watch.live(), [], 'the docked plugin outlived the picker that owns it');
  });
});

describe('destroy() clears the instance off the element', () => {
  beforeEach(resetBody);

  test('CharacterCounter', () => {
    document.body.innerHTML = `<div class="input-field"><input type="text" maxlength="10"></div>`;
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
    document.body.innerHTML = `<div class="card"><div class="card-content"><span class="card-title activator">T</span></div><div class="card-reveal"><span class="card-title">T</span><p>body</p></div></div>`;
    const el = document.querySelector('.card');
    const instance = Expressive.Cards.init(el);

    instance.destroy();

    assert.equal(Expressive.Cards.getInstance(el), undefined);
  });
});
