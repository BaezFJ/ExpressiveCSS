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
