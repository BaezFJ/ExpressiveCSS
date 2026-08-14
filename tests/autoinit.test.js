import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { RoutePlate, resetBody } from './setup.js';
import { AUTO_INIT_FIXTURES } from './fixtures.js';

describe('AutoInit', () => {
  beforeEach(resetBody);

  for (const { name, selector, html } of AUTO_INIT_FIXTURES) {
    test(`constructs ${name} for "${selector}"`, () => {
      document.body.innerHTML = html;
      const el = document.querySelector(selector);
      assert.ok(el, `fixture for ${name} has no element matching ${selector}`);

      RoutePlate.AutoInit();

      const instance = RoutePlate[name].getInstance(el);
      assert.ok(instance, `${name}.getInstance() returned nothing after AutoInit()`);
      assert.ok(
        instance instanceof RoutePlate[name],
        `instance for ${selector} is ${instance?.constructor?.name}, expected ${name}`
      );
      assert.equal(instance.el, el, `${name} instance is bound to the wrong element`);
    });
  }

  test('every fixture selector is covered exactly once', () => {
    const selectors = AUTO_INIT_FIXTURES.map((f) => f.selector);
    assert.equal(new Set(selectors).size, selectors.length, 'duplicate selector in fixtures');
    assert.equal(AUTO_INIT_FIXTURES.length, 19);
  });

  test('skips elements marked .no-autoinit', () => {
    document.body.innerHTML = `
      <ul class="collapsible no-autoinit"><li><div class="collapsible-header">H</div><div class="collapsible-body">B</div></li></ul>
      <ul class="collapsible"><li><div class="collapsible-header">H</div><div class="collapsible-body">B</div></li></ul>`;
    const [optedOut, normal] = document.querySelectorAll('.collapsible');

    RoutePlate.AutoInit();

    assert.equal(RoutePlate.Collapsible.getInstance(optedOut), undefined);
    assert.ok(RoutePlate.Collapsible.getInstance(normal));
  });

  test('only touches the context it is given', () => {
    document.body.innerHTML = `
      <div id="inside"><ul class="collapsible"><li><div class="collapsible-header">H</div><div class="collapsible-body">B</div></li></ul></div>
      <div id="outside"><ul class="collapsible"><li><div class="collapsible-header">H</div><div class="collapsible-body">B</div></li></ul></div>`;

    RoutePlate.AutoInit(document.getElementById('inside'));

    assert.ok(RoutePlate.Collapsible.getInstance(document.querySelector('#inside .collapsible')));
    assert.equal(RoutePlate.Collapsible.getInstance(document.querySelector('#outside .collapsible')), undefined);
  });

  test('re-initializing an element replaces the instance instead of stacking', () => {
    document.body.innerHTML = `<ul class="collapsible"><li><div class="collapsible-header">H</div><div class="collapsible-body">B</div></li></ul>`;
    const el = document.querySelector('.collapsible');

    RoutePlate.AutoInit();
    const first = RoutePlate.Collapsible.getInstance(el);
    RoutePlate.AutoInit();
    const second = RoutePlate.Collapsible.getInstance(el);

    assert.ok(first && second);
    assert.notEqual(first, second, 'second AutoInit() did not create a new instance');
    assert.equal(second.el, el);
  });
});
