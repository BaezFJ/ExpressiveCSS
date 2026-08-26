// Accessibility of DOM the components build, rather than DOM an author writes.
//
// tests/semantics.test.js checks documented markup. What a component generates
// or mutates at runtime is checked here, against the same rules where one
// applies.
//
// Runtime carousel semantics. Material 3 carousels expose every item because
// several items can be visible at once.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Expressive, resetBody } from './setup.js';

const RULE = JSON.parse(
  readFileSync(new URL('../semantics.json', import.meta.url), 'utf8')
).rows.carousel.rules.find((r) => r.id === 'hidden-subtree-holds-nothing-focusable');

const MARKUP = `<div class="carousel">
  <a class="carousel-item" href="#one"><img src="http://localhost/1.jpg" alt="One"></a>
  <a class="carousel-item" href="#two"><img src="http://localhost/2.jpg" alt="Two"></a>
  <a class="carousel-item" href="#three"><img src="http://localhost/3.jpg" alt="Three"></a>
</div>`;

describe('Carousel slides', () => {
  beforeEach(resetBody);

  test('M3 items stay exposed and the container is not a tab stop', () => {
    document.body.innerHTML = MARKUP;
    const el = document.querySelector('.carousel');
    const instance = Expressive.Carousel.init(el);
    try {
      const items = [...el.querySelectorAll('.carousel-item')];
      assert.equal(el.getAttribute('role'), 'region');
      assert.equal(el.getAttribute('aria-roledescription'), 'carousel');
      assert.equal(el.hasAttribute('tabindex'), false, 'focus belongs on the first item');
      assert.equal(el.querySelectorAll('[aria-hidden="true"]').length, 0);
      assert.match(items[0].getAttribute('aria-label'), /Item 1 of 3/);
      assert.match(items[2].getAttribute('aria-label'), /Item 3 of 3/);
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
    // Nothing owns generated semantics once the component is gone.
    assert.equal(el.querySelectorAll('[aria-hidden]').length, 0);
    assert.equal(el.querySelectorAll('[tabindex]').length, 0);
    assert.equal(el.querySelectorAll('[aria-roledescription]').length, 0);
    assert.equal(el.querySelectorAll('[aria-label]').length, 0);
    assert.equal(el.hasAttribute('role'), false);
    assert.equal(el.hasAttribute('aria-roledescription'), false);
    assert.equal(el.hasAttribute('aria-label'), false);
  });

  test('arrow keys move focus between M3 items', () => {
    document.body.innerHTML = MARKUP;
    const el = document.querySelector('.carousel');
    const instance = Expressive.Carousel.init(el);
    try {
      const items = [...el.querySelectorAll('.carousel-item')];
      items[0].focus();
      items[0].dispatchEvent(
        new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
      );
      assert.equal(instance.center, 1);
      assert.equal(document.activeElement, items[1]);
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
