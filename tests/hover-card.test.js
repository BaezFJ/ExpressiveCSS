import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody, window } from './setup.js';

afterEach(resetBody);

const markup = (options = '') => `<a class="hover-card-trigger" href="#ada" aria-details="card"${options}>Ada</a>
<div id="card" class="popover" popover="hint"><a id="inner" href="#profile">Profile</a></div>`;

// jsdom has no popovers. Records each call and the source it was given; returns a function that undoes this.
function shimPopovers() {
  const proto = window.HTMLElement.prototype;
  const saved = ['showPopover', 'hidePopover'].map((name) => [name, Object.getOwnPropertyDescriptor(proto, name)]);
  const calls = [];
  proto.showPopover = function (options) { calls.push(['show', options?.source]); this.setAttribute('data-open', ''); };
  proto.hidePopover = function () { calls.push(['hide']); this.removeAttribute('data-open'); };
  const restore = () => {
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(proto, name, descriptor);
      else delete proto[name];
    }
  };
  return { calls, restore };
}

// A MouseEvent with pointerType set stands in for a PointerEvent.
function pointer(el, type, pointerType = 'mouse') {
  const event = new window.MouseEvent(type);
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  el.dispatchEvent(event);
}

function events(el) {
  const seen = [];
  for (const type of ['open', 'close']) el.addEventListener(`expressive:${type}`, () => seen.push(type));
  return seen;
}

test('HoverCard defaults to a 500ms enter and 300ms exit delay, and reads data-hover-card-options', () => {
  document.body.innerHTML = markup();
  let instance = Expressive.HoverCard.init(document.querySelector('a'));
  try {
    assert.equal(instance.options.enterDelay, 500);
    assert.equal(instance.options.exitDelay, 300);
    assert.equal(instance.cardEl, document.getElementById('card'));
  } finally {
    instance.destroy();
  }
  document.body.innerHTML = markup(` data-hover-card-options='{"enterDelay":100,"exitDelay":50}'`);
  Expressive.AutoInit(document.body);
  instance = Expressive.HoverCard.getInstance(document.querySelector('a'));
  try {
    assert.equal(instance.options.enterDelay, 100);
    assert.equal(instance.options.exitDelay, 50);
  } finally {
    instance.destroy();
  }
});

test('HoverCard open() and close() act at once and report each change once', () => {
  const { calls, restore } = shimPopovers();
  document.body.innerHTML = markup();
  const link = document.querySelector('a');
  const card = document.getElementById('card');
  const seen = events(link);
  const instance = Expressive.HoverCard.init(link);
  try {
    instance.open();
    instance.open();
    assert.ok(card.hasAttribute('data-open'));
    assert.deepEqual(calls, [['show', link]]);
    instance.close();
    instance.close();
    assert.ok(!card.hasAttribute('data-open'));
    assert.deepEqual(seen, ['open', 'close']);
    // The browser hid it: a click elsewhere, Escape or another hint card.
    instance.open();
    card.dispatchEvent(Object.assign(new window.Event('toggle'), { newState: 'closed' }));
    assert.deepEqual(seen, ['open', 'close', 'open', 'close']);
    instance.close();
    assert.equal(calls.filter(([kind]) => kind === 'hide').length, 1);
  } finally {
    instance.destroy();
    restore();
  }
});

test('HoverCard destroy() hides a card it showed and leaves the markup as written', () => {
  const { restore } = shimPopovers();
  document.body.innerHTML = markup();
  const before = document.body.innerHTML;
  const link = document.querySelector('a');
  const instance = Expressive.HoverCard.init(link);
  try {
    instance.open();
    instance.destroy();
    assert.equal(document.body.innerHTML, before);
    assert.equal(Expressive.HoverCard.getInstance(link), undefined);
  } finally {
    instance.destroy();
    restore();
  }
});

test('HoverCard logs one error and starts nothing when aria-details names no element', (t) => {
  const error = t.mock.method(console, 'error', () => {});
  const { calls, restore } = shimPopovers();
  document.body.innerHTML = '<a class="hover-card-trigger" href="#ada" aria-details="missing">Ada</a>';
  const instance = Expressive.HoverCard.init(document.querySelector('a'));
  try {
    assert.equal(error.mock.callCount(), 1);
    assert.equal(instance.cardEl, null);
    instance.open();
    instance.close();
    assert.deepEqual(calls, []);
  } finally {
    instance.destroy();
    restore();
  }
});

test('HoverCard shows after enterDelay on hover and never for a pointer that passes over', (t) => {
  const { calls, restore } = shimPopovers();
  document.body.innerHTML = markup();
  const link = document.querySelector('a');
  const instance = Expressive.HoverCard.init(link);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    pointer(link, 'pointerenter');
    t.mock.timers.tick(200);
    pointer(link, 'pointerleave');
    t.mock.timers.tick(1000);
    assert.deepEqual(calls, []);
    pointer(link, 'pointerenter');
    t.mock.timers.tick(499);
    assert.deepEqual(calls, []);
    t.mock.timers.tick(1);
    assert.deepEqual(calls, [['show', link]]);
  } finally {
    instance.destroy();
    t.mock.timers.reset();
    restore();
  }
});

test('HoverCard stays while the pointer moves from the link onto the card, and hides after exitDelay once it leaves both', (t) => {
  const { calls, restore } = shimPopovers();
  document.body.innerHTML = markup();
  const link = document.querySelector('a');
  const card = document.getElementById('card');
  const instance = Expressive.HoverCard.init(link);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    pointer(link, 'pointerenter');
    t.mock.timers.tick(500);
    pointer(link, 'pointerleave');
    t.mock.timers.tick(200);
    pointer(card, 'pointerenter');
    t.mock.timers.tick(1000);
    assert.ok(card.hasAttribute('data-open'));
    pointer(card, 'pointerleave');
    t.mock.timers.tick(299);
    assert.ok(card.hasAttribute('data-open'));
    t.mock.timers.tick(1);
    assert.ok(!card.hasAttribute('data-open'));
    assert.deepEqual(calls.map(([kind]) => kind), ['show', 'hide']);
  } finally {
    instance.destroy();
    t.mock.timers.reset();
    restore();
  }
});

test('HoverCard ignores touch, and never prevents the click that follows the link', (t) => {
  const { calls, restore } = shimPopovers();
  document.body.innerHTML = markup();
  const link = document.querySelector('a');
  const instance = Expressive.HoverCard.init(link);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    for (const type of ['pointerenter', 'pointerdown', 'pointerup', 'pointerleave']) pointer(link, type, 'touch');
    link.dispatchEvent(new window.MouseEvent('mouseenter'));
    const tap = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(tap);
    t.mock.timers.tick(1000);
    assert.deepEqual(calls, []);
    assert.equal(tap.defaultPrevented, false);
    pointer(link, 'pointerenter');
    t.mock.timers.tick(500);
    const click = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(click);
    assert.equal(click.defaultPrevented, false);
  } finally {
    instance.destroy();
    t.mock.timers.reset();
    restore();
  }
});

test('HoverCard Escape hides the card and leaves the key to whatever has focus elsewhere', () => {
  const { restore } = shimPopovers();
  document.body.innerHTML = `${markup()}<div role="dialog"><button id="save">Save</button></div>`;
  const link = document.querySelector('a');
  const card = document.getElementById('card');
  const instance = Expressive.HoverCard.init(link);
  let reached = 0;
  document.querySelector('[role="dialog"]').addEventListener('keydown', () => reached++);
  try {
    instance.open();
    document.getElementById('save').focus();
    const escape = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.getElementById('save').dispatchEvent(escape);
    assert.ok(!card.hasAttribute('data-open'));
    assert.equal(escape.defaultPrevented, false);
    assert.equal(reached, 1);
  } finally {
    instance.destroy();
    restore();
  }
});

test('HoverCard Escape with focus in the card takes the key and returns focus to the link', () => {
  const { restore } = shimPopovers();
  document.body.innerHTML = markup();
  const link = document.querySelector('a');
  const card = document.getElementById('card');
  const instance = Expressive.HoverCard.init(link);
  try {
    instance.open();
    // jsdom hides a [popover] in its own stylesheet and will not focus inside it.
    card.style.display = 'block';
    document.getElementById('inner').focus();
    assert.equal(document.activeElement.id, 'inner');
    const escape = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.getElementById('inner').dispatchEvent(escape);
    assert.ok(!card.hasAttribute('data-open'));
    assert.equal(escape.defaultPrevented, true);
    assert.equal(document.activeElement, link);
    // Closed, it no longer listens for Escape.
    const later = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    link.dispatchEvent(later);
    assert.equal(later.defaultPrevented, false);
  } finally {
    instance.destroy();
    restore();
  }
});
