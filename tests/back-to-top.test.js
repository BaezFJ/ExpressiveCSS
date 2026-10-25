// BackToTop: an in-page link kept inert until a sentinel at the threshold
// leaves the top of the viewport. jsdom has no layout, so a fake observer
// reports the sentinel; scrolling and focus order are browser tests.

import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody, window } from './setup.js';

const markup = `
  <main id="main"><h1>Title</h1><button type="button">First</button></main>
  <a class="back-to-top" href="#main" aria-label="Back to top"><span class="material-symbols" aria-hidden="true">arrow_upward</span></a>`;

function installIO() {
  const observers = [];
  window.IntersectionObserver = globalThis.IntersectionObserver = class {
    constructor(cb) {
      this.cb = cb;
      this.targets = [];
      observers.push(this);
    }
    observe(el) {
      this.targets.push(el);
    }
    disconnect() {
      this.targets = [];
    }
    // top < 0: the sentinel is above the viewport.
    fire(isIntersecting, top) {
      this.cb(this.targets.map((target) => ({ target, isIntersecting, boundingClientRect: { top } })));
    }
  };
  return observers;
}

describe('BackToTop', () => {
  const { IntersectionObserver, scrollTo } = window;
  let observers;
  let scrolls;

  beforeEach(() => {
    resetBody();
    observers = installIO();
    scrolls = [];
    window.scrollTo = (options) => scrolls.push(options);
  });

  afterEach(() => {
    window.IntersectionObserver = globalThis.IntersectionObserver = IntersectionObserver;
    window.scrollTo = scrollTo;
  });

  test('stays inert until the sentinel is above the viewport', () => {
    document.body.innerHTML = markup;
    const link = document.querySelector('.back-to-top');
    const instance = Expressive.BackToTop.init(link);
    try {
      const sentinel = document.body.firstElementChild;
      assert.equal(observers[0].targets[0], sentinel, 'the sentinel is observed');
      assert.equal(sentinel.style.top, '100vh', 'the default threshold is one viewport height');
      assert.ok(link.hasAttribute('inert'), 'hidden before any scroll');
      observers[0].fire(false, -10);
      assert.equal(link.hasAttribute('inert'), false, 'shown past the threshold');
      observers[0].fire(true, 300);
      assert.ok(link.hasAttribute('inert'), 'hidden again above it');
      observers[0].fire(false, 900);
      assert.ok(link.hasAttribute('inert'), 'a sentinel below the viewport keeps it hidden');
    } finally {
      instance.destroy();
    }
  });

  test('AutoInit reads threshold from data-back-to-top-options', () => {
    document.body.innerHTML = markup;
    const link = document.querySelector('.back-to-top');
    link.dataset.backToTopOptions = '{"threshold": "400px"}';
    Expressive.AutoInit();
    const instance = Expressive.BackToTop.getInstance(link);
    try {
      assert.equal(instance.options.threshold, '400px');
      assert.equal(document.body.firstElementChild.style.top, '400px');
    } finally {
      instance.destroy();
    }
  });

  test('activation scrolls to the top and focuses the target for one move', () => {
    document.body.innerHTML = markup;
    const link = document.querySelector('.back-to-top');
    const main = document.getElementById('main');
    const instance = Expressive.BackToTop.init(link);
    try {
      observers[0].fire(false, -10);
      const click = new window.MouseEvent('click', { bubbles: true, cancelable: true });
      link.dispatchEvent(click);
      assert.ok(click.defaultPrevented, 'the fragment jump is replaced');
      assert.deepEqual(scrolls, [{ top: 0, behavior: 'smooth' }]);
      assert.equal(document.activeElement, main);
      assert.equal(main.getAttribute('tabindex'), '-1');
      document.querySelector('main button').focus();
      assert.equal(main.hasAttribute('tabindex'), false, 'removed on blur');
    } finally {
      instance.destroy();
    }
  });

  test('a missing target focuses the body, and an authored tabindex stays', () => {
    document.body.innerHTML = markup.replace('href="#main"', 'href="#top"');
    const link = document.querySelector('.back-to-top');
    const instance = Expressive.BackToTop.init(link);
    try {
      link.click();
      assert.equal(document.activeElement, document.body);
      assert.equal(document.body.getAttribute('tabindex'), '-1');
      link.setAttribute('href', '#main');
      document.getElementById('main').setAttribute('tabindex', '-1');
      link.click();
      assert.equal(document.body.hasAttribute('tabindex'), false, 'the body loses its temporary tabindex');
      document.querySelector('main button').focus();
      assert.equal(document.getElementById('main').getAttribute('tabindex'), '-1', 'an authored tabindex is kept');
    } finally {
      instance.destroy();
    }
  });

  test('reduced motion scrolls instantly', () => {
    const { matchMedia } = window;
    window.matchMedia = (query) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} });
    document.body.innerHTML = markup;
    const link = document.querySelector('.back-to-top');
    const instance = Expressive.BackToTop.init(link);
    try {
      link.click();
      assert.deepEqual(scrolls, [{ top: 0, behavior: 'instant' }]);
    } finally {
      instance.destroy();
      window.matchMedia = matchMedia;
    }
  });

  test('a focused link stays shown until it loses focus', () => {
    document.body.innerHTML = markup;
    const link = document.querySelector('.back-to-top');
    const instance = Expressive.BackToTop.init(link);
    try {
      observers[0].fire(false, -10);
      link.focus();
      observers[0].fire(true, 300);
      assert.equal(link.hasAttribute('inert'), false, 'kept while focused, so focus is not dropped');
      link.blur();
      assert.ok(link.hasAttribute('inert'), 'hidden once focus leaves');
    } finally {
      instance.destroy();
    }
  });

  test('a modified or already handled click is left to the browser', () => {
    document.body.innerHTML = markup;
    const link = document.querySelector('.back-to-top');
    const instance = Expressive.BackToTop.init(link);
    try {
      for (const key of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey']) {
        const click = new window.MouseEvent('click', { bubbles: true, cancelable: true, [key]: true });
        link.dispatchEvent(click);
        assert.equal(click.defaultPrevented, false, `${key} keeps the browser's default`);
      }
      link.addEventListener('click', (e) => e.preventDefault(), { once: true, capture: true });
      link.click();
      assert.deepEqual(scrolls, [], 'no scroll for any of them');
      assert.notEqual(document.activeElement, document.getElementById('main'));
    } finally {
      instance.destroy();
    }
  });

  test('a threshold that is not a CSS length falls back to the default', () => {
    const { warn } = console;
    const warnings = [];
    console.warn = (...args) => warnings.push(args[0]);
    document.body.innerHTML = markup;
    const link = document.querySelector('.back-to-top');
    const instance = Expressive.BackToTop.init(link, { threshold: 'banana' });
    try {
      assert.equal(document.body.firstElementChild.style.top, '100vh');
      assert.equal(warnings.length, 1);
      assert.match(warnings[0], /threshold "banana"/);
    } finally {
      instance.destroy();
      console.warn = warn;
    }
  });

  test('destroy leaves the markup as authored', () => {
    document.body.innerHTML = markup;
    const authored = document.body.innerHTML;
    const link = document.querySelector('.back-to-top');
    const instance = Expressive.BackToTop.init(link);
    link.click();
    instance.destroy();
    assert.equal(observers[0].targets.length, 0, 'the observer is disconnected');
    assert.equal(document.body.innerHTML, authored);
    assert.equal(document.getElementById('main').hasAttribute('tabindex'), false);
    assert.equal(Expressive.BackToTop.getInstance(link), undefined);
  });
});
