// Accessibility of DOM the components build, rather than DOM an author writes.
//
// tests/semantics.test.js checks documented markup. What a component generates
// or mutates at runtime is checked here, against the same rules where one
// applies.
//
// Off-screen carousel slides.
//
// A slide is an <a>. Marking it aria-hidden while leaving it focusable is the
// worst of both worlds: the tab stop is still there, and what it lands on is
// unannounced. This is the rule `hidden-subtree-holds-nothing-focusable`
// states, applied to the DOM the component maintains rather than to markup.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Expressive, resetBody } from './setup.js';

const RULE = JSON.parse(
  readFileSync(new URL('../semantics.json', import.meta.url), 'utf8')
).components.carousel.rules.find((r) => r.id === 'hidden-subtree-holds-nothing-focusable');

const MARKUP = `<div class="carousel">
  <a class="carousel-item" href="#one"><img src="http://localhost/1.jpg" alt="One"></a>
  <a class="carousel-item" href="#two"><img src="http://localhost/2.jpg" alt="Two"></a>
  <a class="carousel-item" href="#three"><img src="http://localhost/3.jpg" alt="Three"></a>
</div>`;

describe('Carousel slides', () => {
  beforeEach(resetBody);

  test('a hidden slide holds no tab stop, but is still clickable', () => {
    document.body.innerHTML = MARKUP;
    const el = document.querySelector('.carousel');
    const instance = Expressive.Carousel.init(el);
    try {
      const hidden = [...el.querySelectorAll('[aria-hidden="true"]')];
      assert.ok(hidden.length > 0, 'expected some slides to be hidden');
      for (const slide of hidden) {
        assert.equal(slide.getAttribute('tabindex'), '-1', `${slide.getAttribute('href')} is hidden but still tabbable`);
        // Not inert: in coverflow the neighbours are visible, and clicking one
        // is how the carousel advances. inert would take them out of
        // hit-testing and leave the thing mouse-dead.
        assert.equal(slide.hasAttribute('inert'), false, 'a visible neighbour must stay clickable');
      }
      assert.equal(el.querySelectorAll(RULE.selector).length, 0, RULE.message);
    } finally {
      instance.destroy();
    }
  });

  test('destroy() hands the slides back', () => {
    document.body.innerHTML = MARKUP;
    const el = document.querySelector('.carousel');
    const instance = Expressive.Carousel.init(el);
    instance.destroy();
    // Nothing owns these attributes once the component is gone, so leaving
    // them on kept every slide but one out of the tab order for good.
    assert.equal(el.querySelectorAll('[aria-hidden]').length, 0);
    assert.equal(el.querySelectorAll('[tabindex]').length, 0);
  });

  test('the visible slide is neither hidden nor inert', () => {
    document.body.innerHTML = MARKUP;
    const el = document.querySelector('.carousel');
    const instance = Expressive.Carousel.init(el);
    try {
      const shown = [...el.querySelectorAll('.carousel-item')].filter(
        (s) => !s.hasAttribute('aria-hidden')
      );
      assert.equal(shown.length, 1, 'exactly one slide is current');
      assert.equal(shown[0].hasAttribute('tabindex'), false);
    } finally {
      instance.destroy();
    }
  });
});

describe('Sidenav overlay dialog', () => {
  beforeEach(resetBody);

  test('the generated dialog carries the drawer name', () => {
    // A <dialog> takes no name from its contents, and once it opens modally
    // the wrapping <nav> that holds the label is outside it.
    document.body.innerHTML =
      `<nav aria-label="Main"><ul id="drawer" class="sidenav"><li><a href="#!">One</a></li></ul></nav>`;
    const instance = Expressive.Sidenav.init(document.getElementById('drawer'));
    try {
      const dialog = document.querySelector('dialog.sidenav-overlay');
      assert.ok(dialog, 'expected the component to build a dialog');
      assert.equal(dialog.getAttribute('aria-label'), 'Main');
    } finally {
      instance.destroy();
    }
  });
});
