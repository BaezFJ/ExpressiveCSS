import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, fire, resetBody } from './setup.js';

describe('ButtonGroup selection', () => {
  beforeEach(resetBody);

  test('standard press growth comes from adjacent items without changing total width', () => {
    document.body.innerHTML = `
      <div class="button-group">
        <button type="button" class="button filled">One</button>
        <button type="button" class="button filled">Two</button>
        <button type="button" class="button filled">Three</button>
      </div>`;
    const group = document.querySelector('.button-group');
    const buttons = [...group.querySelectorAll('button')];
    const widths = [100, 80, 120];
    buttons.forEach((button, index) => {
      button.getBoundingClientRect = () => ({
        width: widths[index],
        height: 40,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        x: 0,
        y: 0,
        toJSON() {}
      });
    });

    Expressive.AutoInit();
    const instance = Expressive.ButtonGroup.getInstance(group);

    try {
      assert.ok(instance);
      fire(buttons[1], 'pointerdown');
      assert.deepEqual(buttons.map((button) => button.style.width), ['94px', '92px', '114px']);
      assert.equal(buttons.reduce((sum, button) => sum + Number.parseFloat(button.style.width), 0), 300);
      fire(document, 'pointerup');
      assert.deepEqual(buttons.map((button) => button.style.width), ['100px', '80px', '120px']);

      buttons[0].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      assert.deepEqual(buttons.map((button) => button.style.width), ['115px', '65px', '120px']);
      buttons[0].dispatchEvent(new window.KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      assert.deepEqual(buttons.map((button) => button.style.width), ['100px', '80px', '120px']);
    } finally {
      instance?.destroy();
      assert.deepEqual(buttons.map((button) => button.style.width), ['', '', '']);
    }
  });

  test('a zero width multiplier disables standard press growth', () => {
    document.body.innerHTML = `
      <div class="button-group"
        style="--md-comp-button-group-pressed-item-width-multiplier: 0">
        <button type="button" class="button filled">One</button>
        <button type="button" class="button filled">Two</button>
      </div>`;
    const group = document.querySelector('.button-group');
    const buttons = [...group.querySelectorAll('button')];
    buttons.forEach((button) => {
      button.getBoundingClientRect = () => ({
        width: 100,
        height: 40,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        x: 0,
        y: 0,
        toJSON() {}
      });
    });

    Expressive.AutoInit();
    const instance = Expressive.ButtonGroup.getInstance(group);

    try {
      assert.ok(instance);
      fire(buttons[0], 'pointerdown');
      assert.deepEqual(buttons.map((button) => button.style.width), ['', '']);
    } finally {
      fire(document, 'pointerup');
      instance?.destroy();
    }
  });

  test('multiple selection toggles aria-pressed on activation', () => {
    document.body.innerHTML = `
      <div class="button-group connected" data-selection="multiple">
        <button type="button" class="button tonal" aria-pressed="false">Bold</button>
        <button type="button" class="button tonal" aria-pressed="false">Italic</button>
      </div>`;
    const group = document.querySelector('.button-group');
    const buttons = group.querySelectorAll('button');

    Expressive.AutoInit();
    const instance = Expressive.ButtonGroup.getInstance(group);

    try {
      assert.ok(instance);
      fire(buttons[1], 'click');
      assert.equal(buttons[0].getAttribute('aria-pressed'), 'false');
      assert.equal(buttons[1].getAttribute('aria-pressed'), 'true');
    } finally {
      instance?.destroy();
    }
  });

  test('single selection moves aria-pressed to the activated item', () => {
    document.body.innerHTML = `
      <div class="button-group connected" data-selection="single">
        <button type="button" class="button tonal" aria-pressed="true">Day</button>
        <button type="button" class="button tonal" aria-pressed="false">Week</button>
      </div>`;
    const group = document.querySelector('.button-group');
    const buttons = group.querySelectorAll('button');

    Expressive.AutoInit();
    const instance = Expressive.ButtonGroup.getInstance(group);

    try {
      fire(buttons[1], 'click');
      assert.equal(buttons[0].getAttribute('aria-pressed'), 'false');
      assert.equal(buttons[1].getAttribute('aria-pressed'), 'true');
    } finally {
      instance?.destroy();
    }
  });

  test('selection-required initializes and preserves one selected item', () => {
    document.body.innerHTML = `
      <div class="button-group connected" data-selection="single" data-selection-required>
        <button type="button" class="button tonal">Day</button>
        <button type="button" class="button tonal">Week</button>
      </div>`;
    const group = document.querySelector('.button-group');
    const buttons = group.querySelectorAll('button');

    Expressive.AutoInit();
    const instance = Expressive.ButtonGroup.getInstance(group);

    try {
      assert.equal(buttons[0].getAttribute('aria-pressed'), 'true');
      assert.equal(buttons[1].getAttribute('aria-pressed'), 'false');
      fire(buttons[0], 'click');
      assert.equal(buttons[0].getAttribute('aria-pressed'), 'true');
    } finally {
      instance?.destroy();
    }
  });

  test('single selection normalizes duplicate and non-boolean authored state', () => {
    document.body.innerHTML = `
      <div class="button-group connected" data-selection="single">
        <button type="button" class="button tonal" aria-pressed="true">Day</button>
        <button type="button" class="button tonal" aria-pressed="true">Week</button>
        <button type="button" class="button tonal" aria-pressed="mixed">Month</button>
        <button type="button" class="button tonal">Year</button>
      </div>`;
    const group = document.querySelector('.button-group');
    const buttons = [...group.querySelectorAll('button')];

    Expressive.AutoInit();
    const instance = Expressive.ButtonGroup.getInstance(group);

    assert.deepEqual(buttons.map((button) => button.getAttribute('aria-pressed')),
      ['true', 'false', 'false', 'false']);
    instance.destroy();
    assert.deepEqual(buttons.map((button) => button.getAttribute('aria-pressed')),
      ['true', 'true', 'mixed', null]);
  });

  test('an invalid selection mode does not invent toggle state', () => {
    document.body.innerHTML = `
      <div class="button-group" data-selection="invalid">
        <button type="button" class="button filled">One</button>
        <button type="button" class="button filled">Two</button>
      </div>`;
    const group = document.querySelector('.button-group');
    const buttons = [...group.querySelectorAll('button')];

    Expressive.AutoInit();
    const instance = Expressive.ButtonGroup.getInstance(group);
    try {
      fire(buttons[0], 'click');
      assert.deepEqual(buttons.map((button) => button.getAttribute('aria-pressed')), [null, null]);
    } finally {
      instance.destroy();
    }
  });

  test('destroy removes selection behavior', () => {
    document.body.innerHTML = `
      <div class="button-group" data-selection="multiple">
        <button type="button" aria-pressed="false">Bold</button>
      </div>`;
    const group = document.querySelector('.button-group');
    const button = group.querySelector('button');

    Expressive.AutoInit();
    const instance = Expressive.ButtonGroup.getInstance(group);
    instance.destroy();
    fire(button, 'click');

    assert.equal(button.getAttribute('aria-pressed'), 'false');
    assert.equal(Expressive.ButtonGroup.getInstance(group), undefined);
  });
});
