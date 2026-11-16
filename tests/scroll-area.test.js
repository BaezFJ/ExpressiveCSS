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

test('ScrollArea leaves a container unchanged', () => {
  document.body.innerHTML = '<div class="scroll-area custom"></div>';
  const el = document.body.firstElementChild;
  const instance = Expressive.ScrollArea.init(el);
  try {
    assert.equal(el.children.length, 0);
  } finally {
    instance.destroy();
  }
});

test('ScrollArea uses the iframe document', () => {
  const dom = new JSDOM('<iframe></iframe>', { runScripts: 'outside-only' });
  const frame = dom.window.document.querySelector('iframe');
  frame.contentWindow.eval(readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8'));
  const root = frame.contentDocument.documentElement;
  frame.contentWindow.ResizeObserver = window.ResizeObserver;
  root.className = 'scroll-area custom';
  const instance = frame.contentWindow.Expressive.ScrollArea.init(root);
  try {
    assert.equal(root.lastElementChild.ownerDocument, frame.contentDocument);
    assert.equal(root.lastElementChild.className, 'scroll-area-bar');
    assert.equal(document.documentElement.querySelector(':scope > .scroll-area-bar'), null);
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
