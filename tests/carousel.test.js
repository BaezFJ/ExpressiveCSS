import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Expressive, resetBody } from './setup.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

const markup = (classes = '') => `
  <div class="carousel ${classes}" aria-label="Featured places">
    <a class="carousel-item" href="#one">One</a>
    <a class="carousel-item" href="#two">Two</a>
    <a class="carousel-item" href="#three">Three</a>
    <a class="carousel-item" href="#four">Four</a>
  </div>`;

const longMarkup = (classes = '') => `
  <div class="carousel ${classes}" aria-label="Featured places">
    ${Array.from(
      { length: 8 },
      (_, index) => `<a class="carousel-item" href="#item-${index + 1}">Item ${index + 1}</a>`
    ).join('')}
  </div>`;

const pointerEvent = (type, init = {}) => {
  const event = new window.MouseEvent(type, init);
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    pointerType: { value: 'mouse' }
  });
  return event;
};

describe('Material 3 Carousel CSS', () => {
  test('publishes the M3 container and item measurements', () => {
    assert.match(css, /--md-comp-carousel-shape:\s*28px/);
    assert.match(css, /--md-comp-carousel-gap:\s*8px/);
    assert.match(css, /--md-comp-carousel-inline-padding:\s*16px/);
    assert.match(css, /--md-comp-carousel-block-padding:\s*8px/);
    assert.match(css, /--md-comp-carousel-small-item-min-width:\s*40px/);
    assert.match(css, /--md-comp-carousel-small-item-max-width:\s*56px/);
    assert.match(
      css,
      /\.carousel > \.carousel-track\s*\{[^}]*gap:\s*var\(--md-comp-carousel-gap\)[^}]*padding:\s*var\(--md-comp-carousel-block-padding\) var\(--md-comp-carousel-inline-padding\)/s
    );
    assert.match(
      css,
      /\.carousel\.multi-wide\s*\{[^}]*--md-comp-carousel-large-item-width:[^}]*--md-comp-carousel-medium-item-width:/s
    );
    assert.match(
      css,
      /\.carousel\.multi-large\s*\{[^}]*--md-comp-carousel-large-item-width:[^}]*--md-comp-carousel-medium-item-width:/s
    );
    assert.match(
      css,
      /\.carousel\.multi-extra-large\s*\{[^}]*--md-comp-carousel-large-item-width:[^}]*--md-comp-carousel-medium-item-width:/s
    );
    assert.match(
      css,
      /\[data-carousel-size=small\] > \.carousel-item-content\s*\{[^}]*display:\s*none/s
    );
  });

  test('supports every M3 layout and its required scroll behavior', () => {
    assert.match(
      css,
      /\.carousel\.uncontained > \.carousel-track\s*\{[^}]*scroll-snap-type:\s*none/s
    );
    assert.match(
      css,
      /\.carousel\.uncontained\.snap > \.carousel-track\s*\{[^}]*scroll-snap-type:\s*x mandatory/s
    );
    assert.match(css, /\.carousel\.uncontained\.multi-aspect/);
    assert.match(
      css,
      /\.carousel\.hero\.center-aligned \.carousel-track > \.carousel-item\s*\{[^}]*scroll-snap-align:\s*center/s
    );
    assert.match(
      css,
      /\.carousel\.full-screen > \.carousel-track\s*\{[^}]*flex-direction:\s*column[^}]*scroll-snap-type:\s*y mandatory/s
    );
    assert.match(
      css,
      /\.carousel\.full-screen\s*\{[^}]*--md-comp-carousel-gap:\s*16px[^}]*--md-comp-carousel-shape:\s*0px/s
    );
    assert.match(
      css,
      /\.carousel\.full-screen\.full-screen-horizontal\s*\{[^}]*--md-comp-carousel-gap:\s*8px[^}]*--md-comp-carousel-shape:\s*28px/s
    );
    assert.match(css, /\.carousel\.full-screen-horizontal::after\s*\{[^}]*inset-inline-end:\s*0/s);
  });

  test('uses M3 interaction states and removes motion when requested', () => {
    assert.match(css, /--md-comp-carousel-hover-state-layer-opacity:\s*0\.08/);
    assert.match(css, /--md-comp-carousel-focus-state-layer-opacity:\s*0\.1(?:0)?/);
    assert.match(css, /--md-comp-carousel-pressed-state-layer-opacity:\s*0\.1(?:0)?/);
    assert.match(css, /--md-comp-carousel-focus-indicator-thickness:\s*3px/);
    assert.match(
      css,
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.carousel:not\(\.coverflow\)[\s\S]*transition:\s*none[\s\S]*transform:\s*none/
    );
  });
});

describe('Material 3 Carousel behavior', () => {
  beforeEach(resetBody);

  test('assigns dynamic large, medium, and small roles in multi-browse', () => {
    document.body.innerHTML = markup();
    const el = document.querySelector('.carousel');
    const instance = Expressive.Carousel.init(el);
    try {
      const sizes = [...el.querySelectorAll('.carousel-item')].map((item) =>
        item.getAttribute('data-carousel-size')
      );
      assert.deepEqual(sizes, ['large', 'medium', 'small', 'large']);
      instance.set(1);
      assert.deepEqual(
        [...el.querySelectorAll('.carousel-item')].map((item) =>
          item.getAttribute('data-carousel-size')
        ),
        ['large', 'large', 'medium', 'small']
      );
    } finally {
      instance.destroy();
    }
  });

  test('adds a second large item when the carousel itself reaches 600dp', () => {
    document.body.innerHTML = markup();
    const el = document.querySelector('.carousel');
    Object.defineProperty(el, 'clientWidth', {
      configurable: true,
      value: 800
    });
    const instance = Expressive.Carousel.init(el);
    try {
      assert.equal(el.classList.contains('multi-wide'), true);
      assert.deepEqual(
        [...el.querySelectorAll('.carousel-item')].map((item) =>
          item.getAttribute('data-carousel-size')
        ),
        ['large', 'large', 'medium', 'small']
      );
    } finally {
      instance.destroy();
    }
    assert.equal(el.classList.contains('multi-wide'), false);
  });

  test('adds more complete large items at large and extra-large container widths', () => {
    document.body.innerHTML = longMarkup();
    const el = document.querySelector('.carousel');
    Object.defineProperty(el, 'clientWidth', {
      configurable: true,
      value: 1300
    });
    const instance = Expressive.Carousel.init(el);
    try {
      assert.equal(el.classList.contains('multi-large'), true);
      assert.deepEqual(
        [...el.querySelectorAll('.carousel-item')]
          .slice(0, 5)
          .map((item) => item.getAttribute('data-carousel-size')),
        ['large', 'large', 'large', 'medium', 'small']
      );

      Object.defineProperty(el, 'clientWidth', {
        configurable: true,
        value: 1700
      });
      instance._handleResize();
      assert.equal(el.classList.contains('multi-extra-large'), true);
      assert.deepEqual(
        [...el.querySelectorAll('.carousel-item')]
          .slice(0, 6)
          .map((item) => item.getAttribute('data-carousel-size')),
        ['large', 'large', 'large', 'large', 'medium', 'small']
      );
    } finally {
      instance.destroy();
    }
    assert.equal(el.classList.contains('multi-large'), false);
    assert.equal(el.classList.contains('multi-extra-large'), false);
  });

  test('observes carousel container resizes and disconnects on destroy', () => {
    document.body.innerHTML = longMarkup();
    const el = document.querySelector('.carousel');
    let resizeCallback;
    let observed = null;
    let disconnected = false;
    const OriginalResizeObserver = globalThis.ResizeObserver;

    class TestResizeObserver {
      constructor(callback) {
        resizeCallback = callback;
      }

      observe(target) {
        observed = target;
      }

      disconnect() {
        disconnected = true;
      }
    }

    globalThis.ResizeObserver = TestResizeObserver;
    window.ResizeObserver = TestResizeObserver;
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: 500 });
    const instance = Expressive.Carousel.init(el);
    try {
      assert.equal(observed, el);
      Object.defineProperty(el, 'clientWidth', { configurable: true, value: 1300 });
      resizeCallback([{ target: el }], instance);
      assert.equal(el.classList.contains('multi-large'), true);
    } finally {
      instance.destroy();
      globalThis.ResizeObserver = OriginalResizeObserver;
      window.ResizeObserver = OriginalResizeObserver;
    }
    assert.equal(disconnected, true);
  });

  test('hero exposes one large item and one small preview', () => {
    document.body.innerHTML = markup('hero');
    const el = document.querySelector('.carousel');
    const instance = Expressive.Carousel.init(el);
    try {
      assert.deepEqual(
        [...el.querySelectorAll('.carousel-item')].map((item) =>
          item.getAttribute('data-carousel-size')
        ),
        ['large', 'small', 'large', 'large']
      );
    } finally {
      instance.destroy();
    }
  });

  test('localizes generated container and item labels', () => {
    document.body.innerHTML = markup().replace(' aria-label="Featured places"', '');
    const el = document.querySelector('.carousel');
    const instance = Expressive.Carousel.init(el, {
      i18n: { carousel: 'Galería', item: 'Elemento', of: 'de' }
    });
    try {
      assert.equal(el.getAttribute('aria-label'), 'Galería');
      assert.match(
        el.querySelector('.carousel-item').getAttribute('aria-label'),
        /Elemento 1 de 4/
      );
    } finally {
      instance.destroy();
    }
  });

  test('full-screen uses vertical arrow navigation', () => {
    document.body.innerHTML = markup('full-screen');
    const el = document.querySelector('.carousel');
    const instance = Expressive.Carousel.init(el);
    try {
      const first = el.querySelector('.carousel-item');
      first.focus();
      first.dispatchEvent(
        new window.KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          cancelable: true
        })
      );
      assert.equal(instance.center, 1);
      assert.equal(document.activeElement, el.querySelectorAll('.carousel-item')[1]);
    } finally {
      instance.destroy();
    }
  });

  test('Home and End move focus to the first and last items', () => {
    document.body.innerHTML = markup();
    const el = document.querySelector('.carousel');
    const instance = Expressive.Carousel.init(el);
    try {
      const second = el.querySelectorAll('.carousel-item')[1];
      second.focus();
      second.dispatchEvent(
        new window.KeyboardEvent('keydown', {
          key: 'End',
          bubbles: true,
          cancelable: true
        })
      );
      assert.equal(instance.center, 3);
      assert.equal(document.activeElement, el.querySelectorAll('.carousel-item')[3]);

      document.activeElement.dispatchEvent(
        new window.KeyboardEvent('keydown', {
          key: 'Home',
          bubbles: true,
          cancelable: true
        })
      );
      assert.equal(instance.center, 0);
      assert.equal(document.activeElement, el.querySelectorAll('.carousel-item')[0]);
    } finally {
      instance.destroy();
    }
  });

  test('full-screen falls back to a horizontal hero in expanded containers', () => {
    document.body.innerHTML = markup('full-screen');
    const el = document.querySelector('.carousel');
    Object.defineProperty(el, 'clientWidth', {
      configurable: true,
      value: 900
    });
    const instance = Expressive.Carousel.init(el);
    try {
      assert.equal(el.classList.contains('full-screen-horizontal'), true);
      assert.deepEqual(
        [...el.querySelectorAll('.carousel-item')].map((item) =>
          item.getAttribute('data-carousel-size')
        ),
        ['large', 'small', 'large', 'large']
      );
      const first = el.querySelector('.carousel-item');
      first.focus();
      first.dispatchEvent(
        new window.KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
          cancelable: true
        })
      );
      assert.equal(instance.center, 1);
    } finally {
      instance.destroy();
    }
    assert.equal(el.classList.contains('full-screen-horizontal'), false);
  });

  test('mouse dragging scrolls native tracks and suppresses the accidental click', () => {
    document.body.innerHTML = markup();
    const el = document.querySelector('.carousel');
    const instance = Expressive.Carousel.init(el);
    try {
      const track = el.querySelector('.carousel-track');
      track.dispatchEvent(
        pointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientX: 200,
          clientY: 20
        })
      );
      track.dispatchEvent(
        pointerEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          clientX: 150,
          clientY: 22
        })
      );
      assert.equal(el.classList.contains('dragging'), true);
      assert.equal(track.scrollLeft, 50);
      track.dispatchEvent(
        pointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          clientX: 150,
          clientY: 22
        })
      );
      const link = el.querySelector('.carousel-item');
      const clickAllowed = link.dispatchEvent(
        new window.MouseEvent('click', { bubbles: true, cancelable: true })
      );
      assert.equal(clickAllowed, false);
      assert.equal(el.classList.contains('dragging'), false);
    } finally {
      instance.destroy();
    }
  });
});
