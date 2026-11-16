import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { Expressive, resetBody, window } from './setup.js';

afterEach(() => {
  Expressive.ScrollArea?.getInstance(document.documentElement)?.destroy();
  document.documentElement.className = '';
  resetBody();
});

test('ScrollArea owns one unfocusable page bar on the document element', () => {
  const root = document.documentElement;
  root.className = 'scroll-area custom';
  const first = Expressive.ScrollArea.init(root);
  let second;
  try {
    const bar = root.lastElementChild;
    assert.equal(bar.className, 'scroll-area-bar');
    assert.equal(bar.getAttribute('aria-hidden'), 'true');
    assert.equal(bar.children.length, 1);
    assert.equal(bar.firstElementChild.className, 'scroll-area-thumb');
    assert.equal(bar.querySelector('[tabindex]'), null);
    assert.equal(bar.hasAttribute('tabindex'), false);
    second = Expressive.ScrollArea.init(root);
    assert.equal(root.querySelectorAll('.scroll-area-bar').length, 1);
    first.destroy();
    assert.equal(Expressive.ScrollArea.getInstance(root), second);
  } finally {
    second?.destroy();
    first.destroy();
  }
  assert.equal(root.querySelector('.scroll-area-bar'), null);
  assert.equal(Expressive.ScrollArea.getInstance(root), undefined);
});

test('ScrollArea leaves an unsupported container unchanged', () => {
  const oldCSS = window.CSS;
  window.CSS = { supports: () => false };
  document.body.innerHTML = '<div class="scroll-area custom"></div>';
  const el = document.body.firstElementChild;
  const instance = Expressive.ScrollArea.init(el);
  try {
    assert.equal(el.children.length, 0);
    assert.equal(pointer(el, 'pointerdown').defaultPrevented, false);
  } finally {
    instance.destroy();
    window.CSS = oldCSS;
  }
});

test('ScrollArea uses the iframe document', () => {
  const dom = new JSDOM('<iframe></iframe>', { runScripts: 'outside-only' });
  const frame = dom.window.document.querySelector('iframe');
  frame.contentWindow.eval(readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8'));
  const root = frame.contentDocument.documentElement;
  frame.contentWindow.ResizeObserver = window.ResizeObserver;
  frame.contentWindow.matchMedia = window.matchMedia;
  root.className = 'scroll-area custom';
  Object.defineProperty(root, 'clientHeight', { get: () => 300 });
  Object.defineProperty(root, 'scrollHeight', { get: () => 900 });
  const moves = [];
  frame.contentWindow.scrollTo = options => moves.push(options);
  const instance = frame.contentWindow.Expressive.ScrollArea.init(root);
  try {
    assert.equal(root.lastElementChild.ownerDocument, frame.contentDocument);
    assert.equal(root.lastElementChild.className, 'scroll-area-bar');
    assert.equal(document.documentElement.querySelector(':scope > .scroll-area-bar'), null);
    const bar = root.lastElementChild;
    bar.setPointerCapture = () => {};
    bar.hasPointerCapture = () => false;
    bar.getClientRects = () => [{}];
    pointer(bar, 'pointerdown'); pointer(bar, 'pointermove', { clientY: 150 });
    assert.equal(moves.length, 1);
    assert.equal(moves[0].top, 300);
    assert.equal(moves[0].behavior, 'instant');
  } finally {
    instance.destroy();
    dom.window.close();
  }
});

for (const timeline of [false, true]) {
  test(`ScrollArea measures and cleans up the ${timeline ? 'timeline' : 'listener'} path`, () => {
    const root = document.documentElement;
    const oldCSS = window.CSS;
    const oldRO = window.ResizeObserver;
    const oldMO = window.MutationObserver;
    const oldMatches = root.matches;
    const oldRAF = window.requestAnimationFrame;
    const oldCancel = window.cancelAnimationFrame;
    const oldAdd = window.addEventListener;
    const observers = [];
    const modalObservers = [];
    const frames = new Map();
    const listeners = [];
    let nextFrame = 0;
    let modal = false;
    root.matches = function (selector) {
      return selector === ':has(dialog:modal)' ? modal : oldMatches.call(this, selector);
    };
    window.CSS = { supports: () => timeline };
    window.ResizeObserver = class {
      constructor(callback) { this.callback = callback; this.targets = []; observers.push(this); }
      observe(el) { if (!this.targets.includes(el)) this.targets.push(el); }
      disconnect() { this.targets = []; }
    };
    window.MutationObserver = class {
      constructor(callback) { this.callback = callback; this.targets = []; modalObservers.push(this); }
      observe(el, options) { this.targets.push(el); this.options = options; }
      disconnect() { this.targets = []; }
    };
    window.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
    window.cancelAnimationFrame = id => frames.delete(id);
    window.addEventListener = function (type, fn, options) {
      if (type === 'scroll') listeners.push(options);
      return oldAdd.call(this, type, fn, options);
    };
    let height = 900;
    Object.defineProperty(root, 'clientHeight', { configurable: true, get: () => 300 });
    Object.defineProperty(root, 'scrollHeight', { configurable: true, get: () => height });
    root.scrollTop = 300;
    const instance = Expressive.ScrollArea.init(root);
    try {
      const bar = root.querySelector('.scroll-area-bar');
      assert.deepEqual(observers[0].targets, [root, document.body]);
      assert.equal(bar.style.getPropertyValue('--scroll-area-thumb-length'), '100px');
      assert.equal(bar.style.getPropertyValue('--scroll-area-thumb-offset'), '100px');
      assert.equal(listeners.length, timeline ? 0 : 1);
      if (!timeline) {
        assert.equal(listeners[0].passive, true);
        root.scrollTop = 600;
        window.dispatchEvent(new window.Event('scroll'));
        window.dispatchEvent(new window.Event('scroll'));
        assert.equal(frames.size, 1);
        const callback = [...frames.values()][0]; frames.clear(); callback();
        assert.equal(bar.style.getPropertyValue('--scroll-area-thumb-offset'), '200px');
      }
      height = 1800; instance.refresh();
      assert.equal(bar.style.getPropertyValue('--scroll-area-thumb-length'), '50px');
      root.scrollTop = -20; instance.refresh();
      assert.equal(bar.style.getPropertyValue('--scroll-area-thumb-offset'), '0px');
      root.scrollTop = 60000; height = 60000; instance.refresh();
      assert.equal(bar.style.getPropertyValue('--scroll-area-thumb-length'), '48px');
      assert.equal(bar.style.getPropertyValue('--scroll-area-thumb-offset'), '252px');
      height = 300; instance.refresh(); assert.equal(bar.hidden, true);
      height = 900; instance.refresh(); assert.equal(bar.hidden, false);
      root.style.overflowY = 'hidden'; instance.refresh(); assert.equal(bar.hidden, true);
      root.style.overflowY = 'clip'; instance.refresh(); assert.equal(bar.hidden, true);
      root.style.overflowY = ''; instance.refresh(); assert.equal(bar.hidden, false);
      modal = true; root.style.overflowY = 'hidden';
      instance.refresh(); instance.refresh();
      assert.equal(bar.hidden, true);
      assert.equal(modalObservers.length, 1);
      assert.deepEqual(modalObservers[0].targets, [root]);
      assert.equal(modalObservers[0].options.subtree, true);
      assert.equal(modalObservers[0].options.childList, true);
      assert.deepEqual(modalObservers[0].options.attributeFilter, ['open']);
      modal = false; root.style.overflowY = '';
      modalObservers[0].callback();
      const callback = [...frames.values()][0]; frames.clear(); callback();
      assert.equal(bar.hidden, false);
      assert.deepEqual(modalObservers[0].targets, []);
      modal = true; instance.refresh();
      window.dispatchEvent(new window.Event('resize'));
      assert.equal(frames.size, 1);
      instance.destroy();
      assert.equal(frames.size, 0);
      assert.equal(observers[0].targets.length, 0);
      assert.equal(modalObservers[0].targets.length, 0);
      window.dispatchEvent(new window.Event('scroll'));
      document.dispatchEvent(new window.Event('close'));
      assert.equal(frames.size, 0);
    } finally {
      instance.destroy();
      window.CSS = oldCSS; window.ResizeObserver = oldRO; window.MutationObserver = oldMO;
      root.matches = oldMatches;
      window.requestAnimationFrame = oldRAF; window.cancelAnimationFrame = oldCancel;
      window.addEventListener = oldAdd;
      delete root.clientHeight; delete root.scrollHeight;
      root.scrollTop = 0; root.style.overflowY = '';
    }
  });
}

test('AutoInit claims html only for ScrollArea and only from body', () => {
  const root = document.documentElement;
  root.className = 'scroll-area custom scrollspy';
  document.body.innerHTML = '<div id="context"></div>';
  try {
    Expressive.AutoInit(document.getElementById('context'));
    assert.equal(Expressive.ScrollArea.getInstance(root), undefined);
    root.classList.add('no-autoinit');
    Expressive.AutoInit();
    assert.equal(Expressive.ScrollArea.getInstance(root), undefined);
    root.classList.remove('no-autoinit');
    Expressive.AutoInit();
    assert.ok(Expressive.ScrollArea.getInstance(root));
    Expressive.AutoInit(document.body, {});
    assert.equal(root.querySelectorAll('.scroll-area-bar').length, 1);
    assert.equal(Expressive.ScrollSpy.getInstance(root), undefined);
  } finally {
    Expressive.ScrollArea.getInstance(root)?.destroy();
  }
});

function pointer(target, type, values = {}) {
  const event = new target.ownerDocument.defaultView.Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { pointerId: 1, isPrimary: true, button: 0, clientY: 50, pointerType: 'mouse', ...values });
  target.dispatchEvent(event);
  return event;
}

test('ScrollArea anchors capture and drag metrics until every ending', () => {
  const root = document.documentElement;
  let height = 900;
  let viewport = 300;
  Object.defineProperty(root, 'clientHeight', { configurable: true, get: () => viewport });
  Object.defineProperty(root, 'scrollHeight', { configurable: true, get: () => height });
  root.scrollTop = 0;
  const oldScroll = window.scrollTo;
  const oldBy = window.scrollBy;
  const moves = [], captures = [];
  window.scrollTo = value => moves.push(value);
  window.scrollBy = () => assert.fail('thumb press must not page');
  const area = Expressive.ScrollArea.init(root);
  const bar = root.lastElementChild;
  let captured;
  bar.setPointerCapture = id => { captured = id; captures.push(id); };
  bar.hasPointerCapture = id => captured === id;
  bar.releasePointerCapture = () => { captured = undefined; };
  bar.getClientRects = () => [{}];
  try {
    pointer(bar.firstElementChild, 'pointerdown');
    pointer(bar, 'pointerdown', { pointerId: 2 });
    pointer(bar, 'pointermove', { pointerId: 2, clientY: 200 });
    pointer(bar, 'pointermove', { clientY: 150 });
    height = 1800;
    pointer(bar, 'pointermove', { clientY: 160 });
    assert.deepEqual(captures, [1]);
    assert.deepEqual(moves, [{ top: 300, behavior: 'instant' }, { top: 330, behavior: 'instant' }]);
    pointer(bar, 'pointerup');
    for (const ending of ['pointercancel', 'lostpointercapture']) {
      height = 900;
      pointer(bar, 'pointerdown'); pointer(bar, ending);
      pointer(bar, 'pointermove', { clientY: 200 });
      assert.equal(moves.length, 2);
    }
    for (const pointerType of ['pen', 'touch']) {
      pointer(bar, 'pointerdown', { pointerType });
      pointer(bar, 'pointermove', { pointerType, clientY: 150 });
      assert.deepEqual(moves.at(-1), { top: 300, behavior: 'instant' });
      pointer(bar, 'pointerup', { pointerType });
    }
    const count = captures.length;
    for (const values of [{ button: 2 }, { ctrlKey: true }, { isPrimary: false }]) pointer(bar, 'pointerdown', values);
    viewport = 48;
    pointer(bar, 'pointerdown', { clientY: 20 }); pointer(bar, 'pointermove');
    assert.equal(captures.length, count);
    viewport = 300;
    pointer(bar, 'pointerdown'); area.destroy();
    const ended = moves.length;
    pointer(bar, 'pointermove', { clientY: 200 });
    assert.equal(moves.length, ended);
    assert.equal(captured, undefined);
  } finally {
    area.destroy(); window.scrollTo = oldScroll; window.scrollBy = oldBy;
    delete root.clientHeight; delete root.scrollHeight; root.scrollTop = 0;
  }
});

test('ScrollArea track press pages once without capture or repeat', t => {
  const root = document.documentElement;
  Object.defineProperty(root, 'clientHeight', { configurable: true, value: 300 });
  Object.defineProperty(root, 'scrollHeight', { configurable: true, value: 900 });
  root.scrollTop = 300;
  const oldBy = window.scrollBy;
  const calls = [];
  window.scrollBy = options => calls.push(options);
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const area = Expressive.ScrollArea.init(root);
  const bar = root.lastElementChild;
  bar.setPointerCapture = () => {};
  bar.hasPointerCapture = () => false;
  try {
    pointer(bar, 'pointerdown', { clientY: 250 });
    t.mock.timers.tick(2000);
    pointer(bar, 'pointermove', { clientY: 280 }); pointer(bar, 'pointerup');
    assert.deepEqual(calls, [{ top: 300 }]);
    pointer(bar, 'pointerdown', { clientY: 20 }); pointer(bar, 'pointerup');
    assert.deepEqual(calls, [{ top: 300 }, { top: -300 }]);
    pointer(bar.firstElementChild, 'pointerdown', { clientY: 150 });
    assert.equal(calls.length, 2);
  } finally {
    area.destroy(); t.mock.timers.reset(); window.scrollBy = oldBy;
    delete root.clientHeight; delete root.scrollHeight; root.scrollTop = 0;
  }
});


test('V1 container structure and slot keep author attributes', () => {
  for (const slot of ['', ' slot="body"']) {
    document.body.innerHTML = `<i></i><div class="scroll-area custom"${slot}><b>Content</b></div><i></i>`;
    const el = document.body.children[1];
    const children = [...el.childNodes];
    const area = Expressive.ScrollArea.init(el);
    try {
      const wrapper = document.body.children[1];
      assert.equal(wrapper.className, 'scroll-area-wrapper');
      assert.deepEqual([...wrapper.attributes].map(a => a.name).sort(), slot ? ['class', 'slot'] : ['class']);
      assert.equal(wrapper.getAttribute('slot'), slot ? 'body' : null);
      assert.equal(wrapper.firstElementChild, el);
      assert.deepEqual([...el.childNodes], children);
      const bar = wrapper.lastElementChild;
      assert.equal(bar.className, 'scroll-area-bar');
      assert.equal(bar.getAttribute('aria-hidden'), 'true');
      assert.equal(bar.firstElementChild.className, 'scroll-area-thumb');
      assert.equal(wrapper.querySelector('[tabindex], [role]'), null);
      assert.match(el.style.getPropertyValue('anchor-name'), /^--/);
      assert.equal(bar.style.getPropertyValue('position-anchor'), el.style.getPropertyValue('anchor-name'));
    } finally { area.destroy(); }
  }
  for (const el of [document.body, document.createElement('div')]) {
    const nodes = [...el.childNodes];
    const area = Expressive.ScrollArea.init(el);
    try { assert.deepEqual([...el.childNodes], nodes); } finally { area.destroy(); }
  }
});

test('V13 container restores exact nodes, inline declarations and ownership', () => {
  for (const style of ['', ' style="anchor-name: --mine; color: red"']) {
    document.body.innerHTML = `<i></i>text<div class="scroll-area custom"${style}></div><i></i>`;
    const el = document.body.querySelector('div');
    const nodes = [...document.body.childNodes], cssText = el.style.cssText;
    const area = Expressive.ScrollArea.init(el);
    try {
      assert.equal(el.parentElement.className, 'scroll-area-wrapper');
      if (style) assert.match(el.style.getPropertyValue('anchor-name'), /^--mine, --/);
    } finally { area.destroy(); }
    assert.deepEqual([...document.body.childNodes], nodes);
    assert.equal(el.parentElement, document.body);
    assert.equal(el.style.cssText, cssText);
    assert.equal(el.hasAttribute('style'), !!style);
    area.destroy();
    let instance = Expressive.ScrollArea.init(el);
    el.parentElement.before(el); instance.destroy();
    assert.equal(document.querySelector('.scroll-area-wrapper'), null);
    instance = Expressive.ScrollArea.init(el);
    el.parentElement.remove(); instance.destroy(); instance.destroy();
    document.body.append(el);
    const first = Expressive.ScrollArea.init(el), second = Expressive.ScrollArea.init(el);
    try {
      first.destroy();
      assert.equal(Expressive.ScrollArea.getInstance(el), second);
      assert.equal(el.parentElement.className, 'scroll-area-wrapper');
    } finally { second.destroy(); first.destroy(); }
  }
});
