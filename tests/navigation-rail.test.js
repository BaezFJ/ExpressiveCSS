import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Expressive, resetBody, fire, window } from './setup.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

const railHtml = `
  <nav class="navigation-rail" aria-label="Main">
    <button type="button" aria-label="Menu"><i class="material-symbols">menu</i></button>
    <a class="button" href="#!"><i class="material-symbols">edit</i><span>Label</span></a>
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

  test('a first destination that opens a side panel is not the menu toggle', () => {
    document.body.innerHTML = `<nav class="navigation-rail" aria-label="Main">
      <button type="button" popovertarget="start-panel"><i class="material-symbols">home</i>Start</button>
      <div id="start-panel" class="navigation-rail-panel" popover></div>
    </nav>`;
    const el = document.querySelector('.navigation-rail');
    const instance = Expressive.NavigationRail.init(el);

    try {
      fire(el.querySelector('button'), 'click');
      assert.equal(instance.isExpanded, false);
      assert.equal(el.querySelector('button').hasAttribute('aria-expanded'), false);
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

describe('NavigationRail outside toggles', () => {
  beforeEach(resetBody);

  const icon = '<span class="material-symbols" aria-hidden="true">menu</span>';
  const click = (el) => {
    const event = new window.MouseEvent('click', { bubbles: true, cancelable: true, composed: true });
    el.dispatchEvent(event);
    return event;
  };
  const escape = () => document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', {
    key: 'Escape', bubbles: true, cancelable: true
  }));

  test('a button outside the rail that names it in aria-controls toggles it', () => {
    document.body.innerHTML = `<form><button id="out" aria-controls="other rail">${icon}</button></form>
      <button id="off" aria-controls="rail" disabled>Off</button>
      <button id="else" aria-controls="other">Else</button>
      <nav class="navigation-rail" id="rail" aria-label="Main"><button id="in" aria-controls="rail">${icon}</button><a href="#a">A</a></nav>
      <nav class="navigation-rail" aria-label="Plain"><a href="#b">B</a></nav>
      <button id="nameless" aria-controls="">Nameless</button>`;
    let opens = 0;
    const rail = Expressive.NavigationRail.init(document.querySelector('#rail'), { onOpenStart: () => { opens += 1; } });
    const plain = Expressive.NavigationRail.init(document.querySelectorAll('nav')[1]);
    try {
      const event = click(document.querySelector('#out span'));
      assert.equal(rail.isExpanded, true, 'a click on the icon expands the rail');
      assert.equal(event.defaultPrevented, true, 'the click does not submit the form');
      assert.equal(opens, 1);
      click(document.querySelector('#out'));
      assert.equal(rail.isExpanded, false, 'a second click collapses it');
      click(document.querySelector('#in'));
      assert.equal(rail.isExpanded, true, 'an inside toggle with aria-controls toggles once');
      rail.collapse();
      click(document.querySelector('#off'));
      click(document.querySelector('#else'));
      click(document.querySelector('#nameless'));
      assert.equal(rail.isExpanded, false, 'disabled and unrelated buttons do nothing');
      assert.equal(plain.isExpanded, false, 'a rail without an id has no outside toggles');
    } finally {
      rail.destroy();
      plain.destroy();
    }
  });

  test('outside toggles follow the rail, including ones added later', () => {
    document.body.innerHTML = `<button id="out" aria-controls="rail" aria-expanded="true">Menu</button>
      <nav class="navigation-rail" id="rail" aria-label="Main"><button id="in">${icon}</button><a href="#a">A</a></nav>`;
    const rail = Expressive.NavigationRail.init(document.querySelector('#rail'));
    const out = document.querySelector('#out');
    const inside = document.querySelector('#in');
    try {
      assert.deepEqual([out, inside].map((b) => b.getAttribute('aria-expanded')), ['false', 'false']);
      rail.expand();
      assert.deepEqual([out, inside].map((b) => b.getAttribute('aria-expanded')), ['true', 'true']);
      document.body.insertAdjacentHTML('beforeend', '<button id="late" aria-controls="rail">Late</button>');
      const late = document.querySelector('#late');
      rail.collapse();
      assert.deepEqual([out, inside, late].map((b) => b.getAttribute('aria-expanded')), ['false', 'false', 'false']);
      click(late);
      assert.equal(rail.isExpanded, true, 'a toggle added later works at once');
    } finally {
      rail.destroy();
    }
  });

  test('Escape returns focus to the toggle that opened a modal rail', () => {
    document.body.innerHTML = `<button id="a1" aria-controls="rail">A1</button><button id="a2" aria-controls="rail">A2</button>
      <nav class="navigation-rail modal" id="rail" aria-label="Main"><button id="in">${icon}</button><a href="#a">A</a></nav>
      <button id="b1" aria-controls="bare">B1</button><button id="b2" aria-controls="bare">B2</button>
      <nav class="navigation-rail modal" id="bare" aria-label="Bare"><a href="#b">B</a></nav>`;
    const rail = Expressive.NavigationRail.init(document.querySelector('#rail'));
    const bare = Expressive.NavigationRail.init(document.querySelector('#bare'));
    const $ = (sel) => document.querySelector(sel);
    try {
      click($('#a2'));
      $('#rail a').focus();
      escape();
      assert.equal(rail.isExpanded, false);
      assert.equal(document.activeElement, $('#a2'), 'focus returns to the opener');

      rail.expand();
      $('#rail a').focus();
      escape();
      assert.equal(document.activeElement, $('#in'), 'opened another way, focus goes to the inside toggle');

      click($('#b2'));
      $('#b2').disabled = true;
      $('#bare a').focus();
      escape();
      assert.equal(document.activeElement, $('#b1'), 'a disabled opener is skipped');

    } finally {
      rail.destroy();
      bare.destroy();
    }
  });

  test('a rail in a shadow root connects to toggles in that shadow root', () => {
    document.body.innerHTML = '<div id="host"></div>';
    const shadow = document.querySelector('#host').attachShadow({ mode: 'open' });
    shadow.innerHTML = `<button id="out" aria-controls="rail" aria-expanded="true">Menu</button>
      <nav class="navigation-rail" id="rail" aria-label="Main"><a href="#a">A</a></nav>`;
    const rail = Expressive.NavigationRail.init(shadow.querySelector('#rail'));
    const out = shadow.querySelector('#out');
    try {
      assert.equal(out.getAttribute('aria-expanded'), 'false');
      click(out);
      assert.equal(rail.isExpanded, true);
      assert.equal(out.getAttribute('aria-expanded'), 'true');
    } finally {
      rail.destroy();
    }
  });

  test('only a first-child button is the inside toggle', () => {
    document.body.innerHTML = `<nav class="navigation-rail" id="r1" aria-label="One"><a href="#a">A</a><a href="#b">B</a><button id="dest" type="button">Dest</button></nav>
      <nav class="navigation-rail" id="r2" aria-label="Two"><button class="icon-button" id="ib">${icon}</button><a href="#c">C</a></nav>`;
    const one = Expressive.NavigationRail.init(document.querySelector('#r1'));
    const two = Expressive.NavigationRail.init(document.querySelector('#r2'));
    try {
      click(document.querySelector('#dest'));
      assert.equal(one.isExpanded, false, 'a later button is a destination');
      assert.equal(document.querySelector('#dest').hasAttribute('aria-expanded'), false);
      click(document.querySelector('#ib'));
      assert.equal(two.isExpanded, true, 'a first-child icon button still toggles');
    } finally {
      one.destroy();
      two.destroy();
    }
  });
});
