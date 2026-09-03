// AppBar: collapse medium/large on scroll, open the related search view.
// IntersectionObserver, not a scroll listener — a scroll tick must not read
// layout. jsdom has no IntersectionObserver, so tests install a fake.

import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody, window } from './setup.js';

function installIO() {
  const observers = [];
  class FakeIO {
    constructor(cb) {
      this.cb = cb;
      this.targets = [];
      observers.push(this);
    }
    observe(el) {
      this.targets.push(el);
    }
    unobserve(el) {
      this.targets = this.targets.filter((t) => t !== el);
    }
    disconnect() {
      this.targets = [];
    }
    fire(isIntersecting) {
      this.cb(
        this.targets.map((target) => ({
          target,
          isIntersecting,
          boundingClientRect: { top: isIntersecting ? 0 : -8 },
        })),
      );
    }
  }
  window.IntersectionObserver = FakeIO;
  globalThis.IntersectionObserver = FakeIO;
  return observers;
}

const mediumBar = `
  <header class="medium">
    <nav aria-label="Main">
      <h2>Title</h2>
    </nav>
  </header>`;

describe('AppBar collapse', () => {
  let observers;

  beforeEach(() => {
    resetBody();
    observers = installIO();
  });

  afterEach(() => {
    delete window.IntersectionObserver;
    delete globalThis.IntersectionObserver;
  });

  test('leaving the sentinel collapses a medium bar', () => {
    document.body.innerHTML = mediumBar;
    const header = document.querySelector('header');
    const instance = Expressive.AppBar.init(header);
    assert.equal(header.classList.contains('collapsed'), false);
    assert.equal(observers.length, 1);
    observers[0].fire(false);
    assert.ok(header.classList.contains('collapsed'));
    observers[0].fire(true);
    assert.equal(header.classList.contains('collapsed'), false);
    instance.destroy();
  });

  test('destroy removes the sentinel and the observer', () => {
    document.body.innerHTML = mediumBar;
    const header = document.querySelector('header');
    const instance = Expressive.AppBar.init(header);
    const sentinel = header.previousElementSibling;
    assert.ok(sentinel, 'no collapse sentinel');
    instance.destroy();
    assert.equal(header.previousElementSibling, null);
    assert.equal(Expressive.AppBar.getInstance(header), undefined);
    assert.deepEqual(observers[0].targets, []);
  });

  test('a small bar without search does not observe scroll', () => {
    document.body.innerHTML = `
      <header>
        <nav aria-label="Main"><h2>Title</h2></nav>
      </header>`;
    const header = document.querySelector('header');
    const instance = Expressive.AppBar.init(header);
    assert.equal(observers.length, 0);
    instance.destroy();
  });
});

describe('AppBar search view', () => {
  beforeEach(resetBody);

  test('focusing the search field opens the docked view', () => {
    document.body.innerHTML = `
      <header>
        <nav aria-label="Main">
          <search class="search-bar" aria-label="Search">
            <input type="search" aria-label="Search recipes" aria-controls="results" aria-expanded="false">
            <div class="search-view" id="results" hidden></div>
          </search>
        </nav>
      </header>`;
    const header = document.querySelector('header');
    const input = header.querySelector('input');
    const view = document.getElementById('results');
    const instance = Expressive.AppBar.init(header);
    input.dispatchEvent(new window.Event('focus', { bubbles: true }));
    assert.equal(view.hidden, false);
    assert.equal(input.getAttribute('aria-expanded'), 'true');
    instance.destroy();
  });

  test('focusing the search field opens a full-screen dialog view', () => {
    document.body.innerHTML = `
      <header>
        <nav aria-label="Main">
          <search class="search-bar" aria-label="Search">
            <input type="search" aria-label="Search" aria-controls="search-full">
          </search>
        </nav>
      </header>
      <dialog class="search-view full-screen" id="search-full" aria-label="Search"></dialog>`;
    const header = document.querySelector('header');
    const input = header.querySelector('input');
    const view = document.getElementById('search-full');
    const instance = Expressive.AppBar.init(header);
    input.dispatchEvent(new window.Event('focus', { bubbles: true }));
    assert.equal(view.open, true);
    instance.destroy();
  });
});
