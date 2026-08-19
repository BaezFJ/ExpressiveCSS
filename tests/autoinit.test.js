import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody } from './setup.js';
import { AUTO_INIT_FIXTURES } from './fixtures.js';

describe('AutoInit', () => {
  beforeEach(resetBody);

  for (const { name, selector, html } of AUTO_INIT_FIXTURES) {
    test(`constructs ${name} for "${selector}"`, () => {
      document.body.innerHTML = html;
      const el = document.querySelector(selector);
      assert.ok(el, `fixture for ${name} has no element matching ${selector}`);

      Expressive.AutoInit();

      const instance = Expressive[name].getInstance(el);
      assert.ok(instance, `${name}.getInstance() returned nothing after AutoInit()`);
      assert.ok(
        instance instanceof Expressive[name],
        `instance for ${selector} is ${instance?.constructor?.name}, expected ${name}`
      );
      assert.equal(instance.el, el, `${name} instance is bound to the wrong element`);
    });
  }

  test('every fixture selector is covered exactly once', () => {
    const selectors = AUTO_INIT_FIXTURES.map((f) => f.selector);
    assert.equal(new Set(selectors).size, selectors.length, 'duplicate selector in fixtures');
    assert.equal(AUTO_INIT_FIXTURES.length, 16);
  });

  test('skips elements marked .no-autoinit', () => {
    document.body.innerHTML = `
      <a class="button tooltipped no-autoinit" data-tooltip="Hi">Hover</a>
      <a class="button tooltipped" data-tooltip="Hi">Hover</a>`;
    const [optedOut, normal] = document.querySelectorAll('.tooltipped');

    Expressive.AutoInit();

    assert.equal(Expressive.Tooltip.getInstance(optedOut), undefined);
    assert.ok(Expressive.Tooltip.getInstance(normal));
  });

  test('.no-autoinit is honoured on a card article', () => {
    document.body.innerHTML = `
      <article class="no-autoinit"><span class="activator">T</span><aside><p>b</p></aside></article>
      <article><span class="activator">T</span><aside><p>b</p></aside></article>`;
    const [optedOut, normal] = document.querySelectorAll('article');

    Expressive.AutoInit();

    assert.equal(Expressive.Cards.getInstance(optedOut), undefined);
    assert.ok(Expressive.Cards.getInstance(normal), 'the opted-in card was not initialized');
  });

  test('AutoInit starts Cards on the semantic article markup the docs use', () => {
    document.body.innerHTML = `<article><span class="activator">T</span><aside><p>reveal</p></aside></article>`;
    const el = document.querySelector('article');

    Expressive.AutoInit();

    assert.ok(Expressive.Cards.getInstance(el), 'AutoInit did not construct Cards for <article><aside>');
  });

  test('only touches the context it is given', () => {
    document.body.innerHTML = `
      <div id="inside"><a class="button tooltipped" data-tooltip="Hi">Hover</a></div>
      <div id="outside"><a class="button tooltipped" data-tooltip="Hi">Hover</a></div>`;

    Expressive.AutoInit(document.getElementById('inside'));

    assert.ok(Expressive.Tooltip.getInstance(document.querySelector('#inside .tooltipped')));
    assert.equal(Expressive.Tooltip.getInstance(document.querySelector('#outside .tooltipped')), undefined);
  });

  test('re-initializing an element replaces the instance instead of stacking', () => {
    document.body.innerHTML = `<a class="button tooltipped" data-tooltip="Hi">Hover</a>`;
    const el = document.querySelector('.tooltipped');

    Expressive.AutoInit();
    const first = Expressive.Tooltip.getInstance(el);
    Expressive.AutoInit();
    const second = Expressive.Tooltip.getInstance(el);

    assert.ok(first && second);
    assert.notEqual(first, second, 'second AutoInit() did not create a new instance');
    assert.equal(second.el, el);
  });
});
