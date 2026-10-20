// expressive:* events from Tooltip, Snackbar, ButtonGroup, ScrollSpy, Tour
// and Copy, the components and behaviors that reported nothing before.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody, window } from './setup.js';

const sleep = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));

/** Records `expressive:<type>` events that reach `root`, with their detail. */
function record(root, ...types) {
  const seen = [];
  const listeners = types.map((type) => [`expressive:${type}`, (e) => seen.push([type, e.detail])]);
  listeners.forEach(([type, listener]) => root.addEventListener(type, listener));
  return { seen, stop: () => listeners.forEach(([type, listener]) => root.removeEventListener(type, listener)) };
}

/** Polls until `check` holds, so a busy run does not outlast a fixed wait. */
async function until(check, ms = 2000) {
  for (let waited = 0; !check() && waited < ms; waited += 10) await sleep(10);
}

// jsdom has no popovers or checkVisibility. Returns a function that undoes this.
function shimPopovers() {
  const proto = window.HTMLElement.prototype;
  const saved = ['checkVisibility', 'showPopover', 'hidePopover'].map((name) => [name, Object.getOwnPropertyDescriptor(proto, name)]);
  const matches = window.Element.prototype.matches;
  proto.checkVisibility = () => true;
  proto.showPopover = function () { this.setAttribute('data-open', ''); };
  proto.hidePopover = function () { this.removeAttribute('data-open'); };
  window.Element.prototype.matches = function (selector) {
    return selector === ':popover-open' ? this.hasAttribute('data-open') : matches.call(this, selector);
  };
  return () => {
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(proto, name, descriptor);
      else delete proto[name];
    }
    window.Element.prototype.matches = matches;
  };
}

beforeEach(resetBody);

test('a tooltip fires open when it shows and close when it hides, once each', async () => {
  document.body.innerHTML = '<button id="trigger">Save</button>';
  const trigger = document.getElementById('trigger');
  const { seen, stop } = record(trigger, 'open', 'close');
  const instance = Expressive.Tooltip.init(trigger, { text: 'Save draft', enterDelay: 0, exitDelay: 0, inDuration: 0, outDuration: 0 });
  try {
    instance.open();
    await until(() => seen.length === 1);
    instance.close();
    await until(() => seen.length === 2);
    instance._animateOut(); // Escape hides again; it is already hidden.
    await sleep(20);
    assert.deepEqual(seen.map(([type]) => type), ['open', 'close']);
  } finally {
    stop();
    instance.destroy();
  }
});

test('a snackbar fires open, action, close and closed, while it is still in the page', async () => {
  const { seen, stop } = record(document, 'open', 'action', 'close', 'closed');
  const snackbar = new Expressive.Snackbar({ text: 'Deleted', action: 'Undo', inDuration: 0, outDuration: 0 });
  try {
    snackbar.el.querySelector('button').click();
    await until(() => seen.length === 4);
    assert.deepEqual(seen.map(([type]) => type), ['open', 'action', 'close', 'closed']);
  } finally {
    stop();
    snackbar.dismiss();
  }
});

test('a button group fires change with the button and its new state', () => {
  document.body.innerHTML = '<div class="button-group" data-selection="single"><button id="a" aria-pressed="false">A</button><button id="b" aria-pressed="false">B</button></div>';
  const group = document.querySelector('.button-group');
  const { seen, stop } = record(group, 'change');
  const instance = Expressive.ButtonGroup.init(group);
  try {
    click(document.getElementById('b'));
    assert.deepEqual(seen, [['change', { button: document.getElementById('b'), pressed: true }]]);
  } finally {
    stop();
    instance.destroy();
  }
});

test('a scrollspy fires change from the section with the link it marked', () => {
  document.body.innerHTML = '<a href="#one">One</a><section id="one" class="scrollspy">1</section>';
  const section = document.getElementById('one');
  const { seen, stop } = record(document, 'change');
  const instance = Expressive.ScrollSpy.init(section);
  try {
    instance._ratio = 1;
    Expressive.ScrollSpy._syncActive(instance.options.getActiveElement);
    assert.deepEqual(seen, [['change', { link: document.querySelector('a') }]]);
    Expressive.ScrollSpy._syncActive(instance.options.getActiveElement);
    assert.equal(seen.length, 1, 'an unchanged section reports nothing');
  } finally {
    stop();
    instance.destroy();
  }
});

const TOUR = `<div id="a">A</div><div id="b">B</div>
  <button data-tour-start="t">Start</button>
  <div class="tour" id="t" popover="manual">
    <section data-tour-target="a"><h2>A</h2></section>
    <section data-tour-target="b"><h2>B</h2></section>
    <button data-tour-next>Next</button><button data-tour-done>Done</button><button data-tour-close>Close</button>
  </div>`;

for (const [ending, completed] of [['data-tour-done', true], ['data-tour-close', false]]) {
  test(`a tour fires open, change for each step and close with completed ${completed}`, () => {
    const restore = shimPopovers();
    document.body.innerHTML = TOUR;
    const tour = document.getElementById('t');
    const { seen, stop } = record(tour, 'open', 'change', 'close');
    try {
      click(document.querySelector('[data-tour-start]'));
      click(tour.querySelector('[data-tour-next]'));
      click(tour.querySelector(`[${ending}]`));
      assert.deepEqual(seen.map(([type, d]) => type === 'change' ? `change:${d.index}` : type), ['open', 'change:0', 'change:1', 'close']);
      assert.equal(seen[1][1].step, tour.querySelector('section'));
      assert.deepEqual(seen[3][1], { completed });
    } finally {
      stop();
      Expressive.Tour.end(tour);
      restore();
    }
  });
}

test('a tour restarted by its open listener reports its first step once', () => {
  const restore = shimPopovers();
  document.body.innerHTML = TOUR;
  const tour = document.getElementById('t');
  const { seen, stop } = record(tour, 'change');
  tour.addEventListener('expressive:open', () => Expressive.Tour.start(tour), { once: true });
  try {
    Expressive.Tour.start(tour);
    assert.deepEqual(seen.map(([, d]) => d.index), [0]);
  } finally {
    stop();
    Expressive.Tour.end(tour);
    restore();
  }
});

test('a copy button fires copy with the text and whether it was written', async () => {
  document.body.innerHTML = '<button id="copy" data-copy="npm i expressive">Copy</button>';
  const button = document.getElementById('copy');
  const { seen, stop } = record(button, 'copy');
  const clipboard = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard');
  try {
    Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: async () => {} } });
    click(button);
    await until(() => seen.length === 1);
    Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denied'); } } });
    click(button);
    await until(() => seen.length === 2);
    assert.deepEqual(seen, [['copy', { text: 'npm i expressive', copied: true }], ['copy', { text: 'npm i expressive', copied: false }]]);
  } finally {
    stop();
    if (clipboard) Object.defineProperty(window.navigator, 'clipboard', clipboard);
    else delete window.navigator.clipboard;
  }
});
