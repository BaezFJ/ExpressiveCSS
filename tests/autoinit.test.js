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
    assert.equal(AUTO_INIT_FIXTURES.length, 18);
  });

  test('skips elements marked .no-autoinit', () => {
    document.body.innerHTML = `
      <ul class="collapsible no-autoinit"><li><div class="collapsible-header">H</div><div class="collapsible-body">B</div></li></ul>
      <ul class="collapsible"><li><div class="collapsible-header">H</div><div class="collapsible-body">B</div></li></ul>`;
    const [optedOut, normal] = document.querySelectorAll('.collapsible');

    Expressive.AutoInit();

    assert.equal(Expressive.Collapsible.getInstance(optedOut), undefined);
    assert.ok(Expressive.Collapsible.getInstance(normal));
  });

  test('.no-autoinit is honoured on every alternative of a multi-part selector', () => {
    // Cards claims `.card, article:has(> aside), article:has(.card-reveal)`.
    // `${selector}:not(.no-autoinit)` would bind the negation to the last
    // alternative only, so a `.card.no-autoinit` - matching the *first* - got
    // initialized anyway. AutoInit wraps the selector in :is() for this.
    document.body.innerHTML = `
      <div class="card no-autoinit"><span class="activator">T</span><div class="card-reveal"><p>b</p></div></div>
      <div class="card"><span class="activator">T</span><div class="card-reveal"><p>b</p></div></div>`;
    const [optedOut, normal] = document.querySelectorAll('.card');

    Expressive.AutoInit();

    assert.equal(
      Expressive.Cards.getInstance(optedOut),
      undefined,
      '.no-autoinit was ignored on the first alternative of the selector'
    );
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
      <div id="inside"><ul class="collapsible"><li><div class="collapsible-header">H</div><div class="collapsible-body">B</div></li></ul></div>
      <div id="outside"><ul class="collapsible"><li><div class="collapsible-header">H</div><div class="collapsible-body">B</div></li></ul></div>`;

    Expressive.AutoInit(document.getElementById('inside'));

    assert.ok(Expressive.Collapsible.getInstance(document.querySelector('#inside .collapsible')));
    assert.equal(Expressive.Collapsible.getInstance(document.querySelector('#outside .collapsible')), undefined);
  });

  test('re-initializing an element replaces the instance instead of stacking', () => {
    document.body.innerHTML = `<ul class="collapsible"><li><div class="collapsible-header">H</div><div class="collapsible-body">B</div></li></ul>`;
    const el = document.querySelector('.collapsible');

    Expressive.AutoInit();
    const first = Expressive.Collapsible.getInstance(el);
    Expressive.AutoInit();
    const second = Expressive.Collapsible.getInstance(el);

    assert.ok(first && second);
    assert.notEqual(first, second, 'second AutoInit() did not create a new instance');
    assert.equal(second.el, el);
  });
});
