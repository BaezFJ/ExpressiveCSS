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
    assert.match(css, /--md-comp-carousel-hover-state-layer-opacity:\s*var\(--md-sys-state-hover-state-layer-opacity\)/);
    assert.match(css, /--md-comp-carousel-focus-state-layer-opacity:\s*var\(--md-sys-state-focus-state-layer-opacity\)/);
    assert.match(css, /--md-comp-carousel-pressed-state-layer-opacity:\s*var\(--md-sys-state-pressed-state-layer-opacity\)/);
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

// Auto-advance is the carousel's only live timer. Every case here tears down in
// a `finally`: a surviving interval keeps node:test's event loop alive and
// wedges the whole file with no output at all.
describe('Carousel auto-advance', () => {
  beforeEach(() => resetBody());

  const init = (options) => {
    document.body.innerHTML = markup();
    return Expressive.Carousel.init(document.querySelector('.carousel'), options);
  };

  // The gap follows the transition, so one cycle is duration + interval.
  const cycle = (interval) => Expressive.Carousel.defaults.duration + interval;

  test('is off unless an interval is set', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const instance = init({});
    try {
      t.mock.timers.tick(60000);
      assert.equal(instance.center, 0, 'advanced without an interval');
    } finally {
      instance.destroy();
      t.mock.timers.reset();
    }
  });

  test('advances on the interval and wraps at the end', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const instance = init({ interval: 1000 });
    try {
      const rest = () => t.mock.timers.tick(cycle(1000));
      rest();
      assert.equal(instance.center, 1);
      rest();
      rest();
      assert.equal(instance.center, 3);
      rest();
      assert.equal(instance.center, 0, 'did not wrap past the last item');
    } finally {
      instance.destroy();
      t.mock.timers.reset();
    }
  });

  test('pauses on hover and on focus, with no option to disable either', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    // The booleans the old Slideshow offered do not exist here: passing
    // them changes nothing.
    const instance = init({ interval: 1000, pauseOnHover: false, pauseOnFocus: false });
    const el = instance.el;
    try {
      el.dispatchEvent(new window.MouseEvent('mouseenter'));
      t.mock.timers.tick(cycle(1000) * 3);
      assert.equal(instance.center, 0, 'kept advancing under the pointer');
      el.dispatchEvent(new window.MouseEvent('mouseleave'));
      t.mock.timers.tick(cycle(1000));
      assert.equal(instance.center, 1, 'did not resume when the pointer left');

      el.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
      t.mock.timers.tick(cycle(1000) * 3);
      assert.equal(instance.center, 1, 'kept advancing under keyboard focus');
      el.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true }));
      t.mock.timers.tick(cycle(1000));
      assert.equal(instance.center, 2, 'did not resume when focus left');
    } finally {
      instance.destroy();
      t.mock.timers.reset();
    }
  });

  test('an explicit noWrap stops it after one pass', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    // Every native track forces `noWrap`; only the author's own request counts.
    const instance = init({ interval: 1000, noWrap: true });
    try {
      for (let i = 0; i < 3; i += 1) t.mock.timers.tick(cycle(1000));
      assert.equal(instance.center, 3, 'did not reach the last item');
      for (let i = 0; i < 10; i += 1) t.mock.timers.tick(cycle(1000));
      assert.equal(instance.center, 3, 'wrapped past the end anyway');
    } finally {
      instance.destroy();
      t.mock.timers.reset();
    }
  });

  test('rests for the interval after the transition, never during it', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const instance = init({ interval: 1000, duration: 400 });
    try {
      t.mock.timers.tick(1399);
      assert.equal(instance.center, 0, 'advanced before the transition had finished resting');
      t.mock.timers.tick(1);
      assert.equal(instance.center, 1, 'did not advance at duration + interval');
    } finally {
      instance.destroy();
      t.mock.timers.reset();
    }
  });

  test('skips a tick that lands on a coverflow tween still running', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    document.body.innerHTML = markup('coverflow');
    const instance = Expressive.Carousel.init(document.querySelector('.carousel'), {
      interval: 1000
    });
    try {
      // Coverflow settles after duration * ln(|amplitude| / 2), so a short
      // interval can fire while `center` is still climbing through the tween.
      // Coverflow moves `center` through the tween rather than committing it
      // up front, so the tell is whether the tick retargeted: `_cycleTo` is
      // what rewrites `target`.
      instance.offset = 0;
      instance.target = 100;
      t.mock.timers.tick(cycle(1000) * 3);
      assert.equal(instance.target, 100, 'retargeted an animation still running');

      instance.offset = 100;
      t.mock.timers.tick(cycle(1000));
      assert.notEqual(instance.target, 100, 'never advanced once the track came to rest');
    } finally {
      instance.destroy();
      t.mock.timers.reset();
    }
  });

  test('a rest cut short by a tween buys a whole new one, not its remainder', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    document.body.innerHTML = markup('coverflow');
    const instance = Expressive.Carousel.init(document.querySelector('.carousel'), {
      interval: 1000,
      duration: 200
    });
    try {
      instance.offset = 0;
      instance.target = 100;
      t.mock.timers.tick(1200);
      assert.equal(instance.target, 100, 'advanced off a tween still running');

      instance.offset = 100; // the tween lands
      t.mock.timers.tick(1199);
      assert.equal(instance.target, 100, 'rested for the remainder instead of a whole interval');
      t.mock.timers.tick(1);
      assert.notEqual(instance.target, 100, 'never advanced after the fresh rest');
    } finally {
      instance.destroy();
      t.mock.timers.reset();
    }
  });

  test('pause() and start() stop and resume it', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const instance = init({ interval: 1000 });
    try {
      instance.pause();
      t.mock.timers.tick(cycle(1000) * 3);
      assert.equal(instance.center, 0);
      instance.start();
      t.mock.timers.tick(cycle(1000));
      assert.equal(instance.center, 1);
    } finally {
      instance.destroy();
      t.mock.timers.reset();
    }
  });

  test('prefers-reduced-motion suppresses it entirely', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const original = window.matchMedia;
    window.matchMedia = (query) => ({ ...original(query), matches: /reduced-motion/.test(query) });
    const instance = init({ interval: 1000 });
    try {
      t.mock.timers.tick(60000);
      assert.equal(instance.center, 0, 'auto-advanced in reduced motion');
    } finally {
      instance.destroy();
      window.matchMedia = original;
      t.mock.timers.reset();
    }
  });

  test('destroy() clears the timer', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const instance = init({ interval: 1000 });
    try {
      instance.destroy();
      t.mock.timers.tick(60000);
      assert.equal(instance.center, 0, 'the interval outlived destroy()');
    } finally {
      t.mock.timers.reset();
    }
  });
});

describe('Carousel fixed height', () => {
  beforeEach(() => resetBody());

  test('reproduces the retired slideshow layout, indicator row included', () => {
    assert.match(css, /--md-comp-carousel-indicator-allowance:\s*40px/);
    assert.match(
      css,
      /\.carousel\.fixed-height:not\(\.coverflow\):has\(> \.indicators\)\s*\{[^}]*height:\s*calc\(\s*var\(--carousel-height,\s*var\(--md-comp-carousel-height\)\)\s*\+\s*var\(--md-comp-carousel-indicator-allowance\)/s
    );
    assert.match(
      css,
      /\.carousel\.fixed-height:not\(\.coverflow\):has\(> \.indicators\) > \.carousel-track\s*\{[^}]*height:\s*calc\(100% - var\(--md-comp-carousel-indicator-allowance\)\)/s
    );
  });

  test('the height option sets the author hook and destroy() gives it back', () => {
    document.body.innerHTML = markup();
    const el = document.querySelector('.carousel');
    const instance = Expressive.Carousel.init(el, { height: 400 });
    try {
      assert.equal(el.classList.contains('fixed-height'), true);
      assert.equal(el.style.getPropertyValue('--carousel-height'), '400px');
    } finally {
      instance.destroy();
    }
    assert.equal(el.classList.contains('fixed-height'), false);
    assert.equal(el.style.getPropertyValue('--carousel-height'), '');
  });

  test('destroy() gives back an inline height the author already had', () => {
    document.body.innerHTML = markup();
    const el = document.querySelector('.carousel');
    el.style.setProperty('--carousel-height', '260px');
    el.classList.add('fixed-height');
    const instance = Expressive.Carousel.init(el, { height: 400 });
    try {
      assert.equal(el.style.getPropertyValue('--carousel-height'), '400px');
    } finally {
      instance.destroy();
    }
    assert.equal(el.style.getPropertyValue('--carousel-height'), '260px', 'ate the authored height');
    assert.equal(el.classList.contains('fixed-height'), true, 'removed a class it did not add');
  });

  test('is left alone when no height is given', () => {
    document.body.innerHTML = markup();
    const el = document.querySelector('.carousel');
    const instance = Expressive.Carousel.init(el);
    try {
      assert.equal(el.classList.contains('fixed-height'), false);
      assert.equal(el.style.getPropertyValue('--carousel-height'), '');
    } finally {
      instance.destroy();
    }
  });
});
