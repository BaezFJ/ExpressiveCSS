import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Expressive, resetBody, fire } from './setup.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

const railHtml = `
  <nav class="navigation-rail" aria-label="Main">
    <button type="button" aria-label="Menu"><i class="material-symbols">menu</i></button>
    <a class="button extra" href="#!"><i class="material-symbols">edit</i><span>Label</span></a>
    <a href="#!" aria-current="page"><i class="material-symbols">star</i>Label</a>
  </nav>`;

describe('Navigation rail CSS', () => {
  test('emits collapsed and expanded layouts', () => {
    assert.match(css, /\.navigation-rail\s*\{/);
    assert.match(css, /\.navigation-rail\.expanded\s*\{/);
    assert.match(css, /--md-comp-nav-rail-collapsed-width:\s*96px/);
    assert.match(css, /--md-comp-nav-rail-expanded-width:\s*280px/);
  });

  test('selected destinations use a secondary-container pill', () => {
    assert.match(
      css,
      /--md-comp-nav-rail-active-indicator-color:\s*var\(--md-sys-color-secondary-container\)/
    );
  });
});

describe('NavigationRail', () => {
  beforeEach(resetBody);

  test('the menu button toggles .expanded', () => {
    document.body.innerHTML = railHtml;
    const el = document.querySelector('.navigation-rail');
    const instance = Expressive.NavigationRail.init(el);

    try {
      assert.equal(instance.isExpanded, false);
      fire(el.querySelector('button'), 'click');
      assert.equal(instance.isExpanded, true);
      assert.ok(el.classList.contains('expanded'));
      assert.equal(el.getAttribute('aria-expanded'), 'true');

      fire(el.querySelector('button'), 'click');
      assert.equal(instance.isExpanded, false);
      assert.equal(el.classList.contains('expanded'), false);
    } finally {
      instance.destroy();
    }
  });

  test('expand() and collapse() are idempotent', () => {
    document.body.innerHTML = railHtml;
    const el = document.querySelector('.navigation-rail');
    const instance = Expressive.NavigationRail.init(el);

    try {
      instance.expand();
      instance.expand();
      assert.equal(instance.isExpanded, true);
      instance.collapse();
      instance.collapse();
      assert.equal(instance.isExpanded, false);
    } finally {
      instance.destroy();
    }
  });

  test('starts expanded when the class is already on the element', () => {
    document.body.innerHTML = railHtml.replace(
      'class="navigation-rail"',
      'class="navigation-rail expanded"'
    );
    const el = document.querySelector('.navigation-rail');
    const instance = Expressive.NavigationRail.init(el);

    try {
      assert.equal(instance.isExpanded, true);
      assert.equal(el.getAttribute('aria-expanded'), 'true');
    } finally {
      instance.destroy();
    }
  });
});
