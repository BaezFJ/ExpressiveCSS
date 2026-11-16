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

test('ScrollArea owns one decorative bar on the document element', () => {
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
