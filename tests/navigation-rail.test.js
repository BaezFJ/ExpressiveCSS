import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Expressive, resetBody, fire, window } from './setup.js';

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

  test('Escape closes a nested menu before its modal rail and restores each trigger', t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    document.body.innerHTML = `<nav class="navigation-rail modal">
      <button id="toggle">Menu</button>
      <div><button id="actions-trigger" data-target="actions">Actions</button>
      <menu id="actions"><li>Copy</li></menu></div>
    </nav>`;
    const rail = Expressive.NavigationRail.init(document.querySelector('nav'));
    const menu = Expressive.Menu.init(document.querySelector('#actions-trigger'), {
      inDuration: 0, outDuration: 0
    });
    const escape = () => document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true, cancelable: true
    }));
    try {
      rail.expand();
      menu.open();
      t.mock.timers.tick(0);
      assert.equal(document.activeElement, menu.menuEl.firstElementChild);
      escape();
      assert.equal(menu.isOpen, false);
      assert.equal(rail.isExpanded, true);
      assert.equal(document.activeElement, menu.el);
      escape();
      assert.equal(rail.isExpanded, false);
      assert.equal(document.activeElement, document.querySelector('#toggle'));
    } finally {
      menu.destroy();
      rail.destroy();
      t.mock.timers.reset();
    }
  });

  for (const focus of ['outside', 'callback']) {
    test(`Escape preserves ${focus} focus when collapsing a modal rail`, () => {
      document.body.innerHTML = railHtml.replace('class="navigation-rail"', 'class="navigation-rail modal"') + '<input id="outside">';
      const outside = document.querySelector('#outside');
      const rail = Expressive.NavigationRail.init(document.querySelector('nav'), {
        onCloseStart: focus === 'callback' ? () => outside.focus() : null
      });
      try {
        rail.expand();
        (focus === 'outside' ? outside : rail.el.querySelector('a')).focus();
        document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', {
          key: 'Escape', bubbles: true, cancelable: true
        }));
        assert.equal(rail.isExpanded, false);
        assert.equal(document.activeElement, outside);
      } finally {
        rail.destroy();
      }
    });
  }

  for (const callback of ['onCloseStart', 'onCloseEnd']) {
    test(`Escape preserves focus moved inside a child shadow root by ${callback}`, () => {
      document.body.innerHTML = '<nav class="navigation-rail modal"><button>Menu</button><div id="host"></div></nav>';
      const shadow = document.querySelector('#host').attachShadow({ mode: 'open' });
      shadow.innerHTML = '<input id="first"><input id="second">';
      const first = shadow.querySelector('#first');
      const second = shadow.querySelector('#second');
      const rail = Expressive.NavigationRail.init(document.querySelector('nav'), {
        [callback]: () => second.focus()
      });
      try {
        rail.expand();
        first.focus();
        first.dispatchEvent(new window.KeyboardEvent('keydown', {
          key: 'Escape', bubbles: true, composed: true, cancelable: true
        }));
        assert.equal(rail.isExpanded, false);
        assert.equal(shadow.activeElement, second);
      } finally {
        rail.destroy();
      }
    });
  }

  test('a collapse callback can reopen the rail without losing focus', () => {
    document.body.innerHTML = railHtml.replace('class="navigation-rail"', 'class="navigation-rail modal"');
    const rail = Expressive.NavigationRail.init(document.querySelector('nav'), {
      onCloseEnd: () => rail.expand()
    });
    const target = rail.el.querySelector('a');
    try {
      rail.expand();
      target.focus();
      target.dispatchEvent(new window.KeyboardEvent('keydown', {
        key: 'Escape', bubbles: true, cancelable: true
      }));
      assert.equal(rail.isExpanded, true);
      assert.equal(document.activeElement, target);
    } finally {
      rail.destroy();
    }
  });

  test('programmatic collapse leaves focus where the caller put it', () => {
    document.body.innerHTML = railHtml;
    const rail = Expressive.NavigationRail.init(document.querySelector('nav'));
    const target = rail.el.querySelector('a');
    try {
      rail.expand();
      target.focus();
      rail.collapse();
      assert.equal(document.activeElement, target);
    } finally {
      rail.destroy();
    }
  });

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
