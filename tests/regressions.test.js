// Bugs that were live in the vendored source.
//
// Each of these reproduces a specific defect: a crash, a wrong dimension, an
// index computed against the wrong list, a flag read before it was set. They
// are grouped by component rather than by kind, because that is how you come
// back to them.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { RoutePlate, resetBody, window } from './setup.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Give an element a fixed rect, since jsdom does no layout. */
function fixRect(el, width, height) {
  el.getBoundingClientRect = () => ({
    top: 0,
    left: 0,
    width,
    height,
    right: width,
    bottom: height,
    x: 0,
    y: 0
  });
}

describe('FloatingActionButton toolbar mode', () => {
  beforeEach(resetBody);

  test('opens without throwing and puts a backdrop in the DOM', () => {
    document.body.innerHTML = `
      <div class="fixed-action-btn">
        <a class="btn-floating btn-large"><i class="material-icons">add</i></a>
        <ul><li><a class="btn-floating"><i class="material-icons">edit</i></a></li></ul>
      </div>`;
    const el = document.querySelector('.fixed-action-btn');
    const instance = RoutePlate.FloatingActionButton.init(el, { toolbarEnabled: true });

    // Used to throw: `backdrop[0].clientWidth` on a bare element.
    instance.open();

    assert.ok(el.querySelector('.fab-backdrop'), 'no backdrop was created');
    assert.ok(el.classList.contains('active'));
    instance.destroy();
  });

  test('closing takes the backdrop back out instead of stacking a new one', async () => {
    document.body.innerHTML = `
      <div class="fixed-action-btn">
        <a class="btn-floating btn-large"><i class="material-icons">add</i></a>
        <ul><li><a class="btn-floating"><i class="material-icons">edit</i></a></li></ul>
      </div>`;
    const el = document.querySelector('.fixed-action-btn');
    const instance = RoutePlate.FloatingActionButton.init(el, { toolbarEnabled: true });

    try {
      instance.open();
      instance.close();
      await sleep(300);
      assert.equal(el.querySelectorAll('.fab-backdrop').length, 0, 'the backdrop was left behind');

      instance.open();
      instance.close();
      await sleep(300);
      assert.equal(el.querySelectorAll('.fab-backdrop').length, 0, 'backdrops accumulated');
      assert.equal(el.style.width, '', 'the toolbar styles were never cleared');
    } finally {
      instance.destroy();
    }
  });

  test('a FAB with no menu list does not throw', () => {
    document.body.innerHTML = `<div class="fixed-action-btn"><a class="btn-floating btn-large">+</a></div>`;

    const instance = RoutePlate.FloatingActionButton.init(
      document.querySelector('.fixed-action-btn')
    );

    assert.ok(instance);
    instance.destroy();
  });
});

describe('Lightbox dimensions', () => {
  beforeEach(resetBody);

  test('closing restores the height from the height, not the width', () => {
    document.body.innerHTML = `<img class="lightboxed" src="http://localhost/1.jpg">`;
    const img = document.querySelector('img');
    fixRect(img, 100, 50);
    const instance = RoutePlate.Lightbox.init(img);

    instance.open();
    instance.close();

    assert.equal(img.style.height, '50px', 'height was restored from originalWidth');
    assert.equal(img.style.width, '100px');
    instance.destroy();
  });
});

describe('Carousel', () => {
  beforeEach(resetBody);

  test('exactly one item is active when the active item is not the first', () => {
    // The stale "active" used to be cleared off the first .carousel-item
    // rather than off whichever one actually had it.
    document.body.innerHTML = `
      <div class="carousel">
        <a class="carousel-item" href="#one">one</a>
        <a class="carousel-item active" href="#two">two</a>
        <a class="carousel-item" href="#three">three</a>
      </div>`;

    const instance = RoutePlate.Carousel.init(document.querySelector('.carousel'));

    assert.equal(
      document.querySelectorAll('.carousel-item.active').length,
      1,
      'more than one carousel item is marked active'
    );
    instance.destroy();
  });

  test('an empty carousel does not throw', () => {
    document.body.innerHTML = `<div class="carousel"></div>`;

    const instance = RoutePlate.Carousel.init(document.querySelector('.carousel'));

    assert.ok(instance);
    instance.destroy();
  });
});

describe('Chips indices line up with the data', () => {
  beforeEach(resetBody);

  test('deleting a chip removes that chip, not the one at the same child index', () => {
    // The container also holds a label and the input, so counting children
    // gave an index shifted off the chipsData index.
    document.body.innerHTML = `<div class="chips"><label>Tags</label></div>`;
    const instance = RoutePlate.Chips.init(document.querySelector('.chips'), {
      allowUserInput: true,
      data: [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    });

    const chipB = instance._chips[1];
    chipB.querySelector('.close').dispatchEvent(
      new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window })
    );

    assert.deepEqual(
      instance.getData().map((chip) => chip.id),
      ['a', 'c'],
      'the wrong chip was deleted'
    );
    assert.equal(instance._chips.length, 2);
    instance.destroy();
  });
});

describe('Datepicker month arrows', () => {
  beforeEach(resetBody);

  test('the previous arrow is disabled at the start of the allowed range', () => {
    const now = new Date();
    document.body.innerHTML = `<input type="text" class="datepicker">`;

    const instance = RoutePlate.Datepicker.init(document.querySelector('.datepicker'), {
      minYear: now.getFullYear(),
      minMonth: now.getMonth()
    });

    try {
      // `prev` used to be computed below the button that reads it, so the
      // previous arrow was never marked disabled.
      const prevButton = instance.calendarEl.querySelector('.month-prev');
      assert.ok(prevButton, 'no previous-month button was rendered');
      assert.ok(
        prevButton.classList.contains('is-disabled'),
        'the previous arrow should be disabled at the minimum month'
      );
    } finally {
      instance.destroy();
    }
  });

  test('a cloned range input does not duplicate the id', () => {
    document.body.innerHTML = `<div><input type="text" id="range-start" class="datepicker"></div>`;

    const instance = RoutePlate.Datepicker.init(document.querySelector('.datepicker'), {
      isDateRange: true
    });

    try {
      assert.equal(
        document.querySelectorAll('#range-start').length,
        1,
        'the cloned end-date input carries the same id as the start input'
      );
    } finally {
      instance.destroy();
    }
  });
});

describe('optional markup does not crash a component', () => {
  beforeEach(resetBody);

  test('a card reveal with no title', () => {
    document.body.innerHTML = `
      <div class="card">
        <div class="card-content"><span class="card-title activator">T</span></div>
        <div class="card-reveal"><p>body</p></div>
      </div>`;
    const instance = RoutePlate.Cards.init(document.querySelector('.card'));

    instance.open();
    instance.close();

    assert.ok(instance);
    instance.destroy();
  });

  test('a slide with no caption', () => {
    document.body.innerHTML = `
      <div class="slider"><ul class="slides">
        <li class="active"><img src="http://localhost/1.jpg"></li>
        <li><img src="http://localhost/2.jpg"></li>
      </ul></div>`;
    const instance = RoutePlate.Slider.init(document.querySelector('.slider'));

    try {
      instance.set(1);
      assert.equal(instance.activeIndex, 1);
    } finally {
      instance.destroy();
    }
  });

  test('a parallax container with no image', () => {
    document.body.innerHTML = `<div class="parallax-container"><div class="parallax"></div></div>`;

    const instance = RoutePlate.Parallax.init(document.querySelector('.parallax'));

    assert.ok(instance);
    instance.destroy();
  });

  test('a hover dropdown when the pointer leaves the window', () => {
    document.body.innerHTML = `
      <a class="dropdown-trigger btn" data-target="dd">Drop</a>
      <ul id="dd" class="dropdown-content"><li><a href="#!">one</a></li></ul>`;
    const instance = RoutePlate.Dropdown.init(document.querySelector('.dropdown-trigger'), {
      hover: true
    });

    // relatedTarget is null when the pointer leaves the document entirely.
    instance.el.dispatchEvent(
      new window.MouseEvent('mouseleave', { bubbles: false, view: window, relatedTarget: null })
    );

    assert.equal(instance.isOpen, false);
    instance.destroy();
  });
});
