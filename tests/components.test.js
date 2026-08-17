// Behaviour, not just construction: each case drives a component through its
// public API (or a real event) and asserts the DOM state it is supposed to
// produce. jsdom has no layout, so these deliberately assert on classes,
// structure and text - never on measured geometry or transitions.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody, fire, window } from './setup.js';

const collapsibleHtml = `
  <ul class="collapsible">
    <li><div class="collapsible-header">One</div><div class="collapsible-body"><span>Body one</span></div></li>
    <li><div class="collapsible-header">Two</div><div class="collapsible-body"><span>Body two</span></div></li>
  </ul>`;

const detailsHtml = `
  <div class="collapsible">
    <details><summary>One</summary><p>Body one</p></details>
    <details><summary>Two</summary><p>Body two</p></details>
  </div>`;

describe('Collapsible', () => {
  beforeEach(resetBody);

  test('open() and close() toggle the active section', () => {
    document.body.innerHTML = collapsibleHtml;
    const el = document.querySelector('.collapsible');
    const [first] = el.querySelectorAll('li');
    const instance = Expressive.Collapsible.init(el);

    assert.equal(first.classList.contains('active'), false);
    instance.open(0);
    assert.equal(first.classList.contains('active'), true);
    instance.close(0);
    assert.equal(first.classList.contains('active'), false);
  });

  test('clicking a header opens that section and, as an accordion, closes the other', () => {
    document.body.innerHTML = collapsibleHtml;
    const el = document.querySelector('.collapsible');
    const [first, second] = el.querySelectorAll('li');
    Expressive.Collapsible.init(el);

    fire(first.querySelector('.collapsible-header'), 'click');
    assert.equal(first.classList.contains('active'), true);

    fire(second.querySelector('.collapsible-header'), 'click');
    assert.equal(second.classList.contains('active'), true);
    assert.equal(first.classList.contains('active'), false, 'accordion left two sections open');
  });

  test('alias headers get aria-expanded and a button role', () => {
    document.body.innerHTML = collapsibleHtml;
    const el = document.querySelector('.collapsible');
    const header = el.querySelector('.collapsible-header');
    Expressive.Collapsible.init(el);

    assert.equal(header.getAttribute('role'), 'button');
    assert.equal(header.getAttribute('aria-expanded'), 'false');
    assert.ok(header.getAttribute('aria-controls'));

    Expressive.Collapsible.getInstance(el).open(0);
    assert.equal(header.getAttribute('aria-expanded'), 'true');
  });

  test('Space on an alias header toggles the section', () => {
    document.body.innerHTML = collapsibleHtml;
    const el = document.querySelector('.collapsible');
    const [first] = el.querySelectorAll('li');
    const header = first.querySelector('.collapsible-header');
    Expressive.Collapsible.init(el);

    header.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    );
    assert.equal(first.classList.contains('active'), true);
  });

  test('open() and close() toggle <details>', () => {
    document.body.innerHTML = detailsHtml;
    const el = document.querySelector('.collapsible');
    const [first] = el.querySelectorAll('details');
    const instance = Expressive.Collapsible.init(el);

    assert.equal(first.open, false);
    instance.open(0);
    assert.equal(first.open, true);
    instance.close(0);
    assert.equal(first.open, false);
  });

  test('accordion open() closes the other details section', () => {
    document.body.innerHTML = detailsHtml;
    const el = document.querySelector('.collapsible');
    const [first, second] = el.querySelectorAll('details');
    const instance = Expressive.Collapsible.init(el);

    instance.open(0);
    instance.open(1);
    assert.equal(second.open, true);
    assert.equal(first.open, false, 'accordion left two sections open');
  });

  test('init assigns a shared name so native exclusive-open works', () => {
    document.body.innerHTML = detailsHtml;
    const el = document.querySelector('.collapsible');
    Expressive.Collapsible.init(el);
    const names = [...el.querySelectorAll('details')].map((d) => d.getAttribute('name'));
    assert.ok(names[0]);
    assert.equal(names[0], names[1]);
  });

  test('wraps details content in .collapsible-body and unwraps on destroy', () => {
    document.body.innerHTML = detailsHtml;
    const el = document.querySelector('.collapsible');
    const [first] = el.querySelectorAll('details');
    const instance = Expressive.Collapsible.init(el);

    const body = first.querySelector(':scope > .collapsible-body');
    assert.ok(body);
    assert.equal(body.querySelector('p')?.textContent, 'Body one');

    instance.destroy();
    assert.equal(first.querySelector(':scope > .collapsible-body'), null);
    assert.equal(first.querySelector(':scope > p')?.textContent, 'Body one');
  });

  test('.expandable lets several sections stay open and does not assign name', () => {
    document.body.innerHTML = `
      <div class="collapsible expandable">
        <details><summary>One</summary><p>Body one</p></details>
        <details><summary>Two</summary><p>Body two</p></details>
      </div>`;
    const el = document.querySelector('.collapsible');
    const [first, second] = el.querySelectorAll('details');
    const instance = Expressive.Collapsible.init(el);

    assert.equal(instance.options.accordion, false);
    assert.equal(first.getAttribute('name'), null);
    instance.open(0);
    instance.open(1);
    assert.equal(first.open, true);
    assert.equal(second.open, true);
  });
});

describe('TapTarget', () => {
  beforeEach(resetBody);

  const html = `
    <div class="tap-target" data-target="menu-btn">
      <div class="tap-target-content"><h5>Title</h5><p>Body</p></div>
    </div>
    <a id="menu-btn" class="btn">menu</a>`;

  test('open() and close() toggle isOpen and the wrapper class', () => {
    document.body.innerHTML = html;
    const el = document.querySelector('.tap-target');
    const instance = Expressive.TapTarget.init(el);

    assert.equal(instance.isOpen, false);
    instance.open();
    assert.equal(instance.isOpen, true);
    assert.ok(el.parentElement.classList.contains('tap-target-wrapper'));
    assert.ok(el.parentElement.classList.contains('open'));
    instance.close();
    assert.equal(instance.isOpen, false);
    instance.destroy();
  });

  test('does not wrap a parent that is already a tap-target-wrapper', () => {
    document.body.innerHTML = `
      <div class="tap-target-wrapper">
        <div class="tap-target" data-target="menu-btn">
          <div class="tap-target-content"><h5>Title</h5></div>
        </div>
      </div>
      <a id="menu-btn" class="btn">menu</a>`;
    const el = document.querySelector('.tap-target');
    const parent = el.parentElement;
    Expressive.TapTarget.init(el);
    assert.equal(el.parentElement, parent);
    assert.equal(parent.parentElement?.classList.contains('tap-target-wrapper'), false);
    Expressive.TapTarget.getInstance(el).destroy();
  });

  test('opening one tap target closes another', () => {
    document.body.innerHTML = `
      <div class="tap-target" data-target="a"><div class="tap-target-content"><h5>A</h5></div></div>
      <div class="tap-target" data-target="b"><div class="tap-target-content"><h5>B</h5></div></div>
      <a id="a" class="btn">A</a>
      <a id="b" class="btn">B</a>`;
    const [first, second] = document.querySelectorAll('.tap-target');
    const a = Expressive.TapTarget.init(first);
    const b = Expressive.TapTarget.init(second);
    a.open();
    b.open();
    assert.equal(a.isOpen, false);
    assert.equal(b.isOpen, true);
    a.destroy();
    b.destroy();
  });
});

describe('FloatingActionButton', () => {
  beforeEach(resetBody);

  test('open() and close() toggle .active', () => {
    document.body.innerHTML = `
      <div class="fixed-action-btn">
        <a class="btn-floating btn-large">+</a>
        <ul><li><a class="btn-floating">e</a></li></ul>
      </div>`;
    const el = document.querySelector('.fixed-action-btn');
    const instance = Expressive.FloatingActionButton.init(el);
    const trigger = el.querySelector(':scope > a');

    assert.equal(el.classList.contains('active'), false);
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    instance.open();
    assert.equal(el.classList.contains('active'), true);
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    instance.close();
    assert.equal(el.classList.contains('active'), false);
    instance.destroy();
  });

  test('.click-to-toggle and direction-* in markup are honoured', () => {
    document.body.innerHTML = `
      <div class="fixed-action-btn direction-left click-to-toggle">
        <button type="button" class="btn-floating extra">+</button>
        <ul><li><button type="button" class="btn-floating">e</button></li></ul>
      </div>`;
    const el = document.querySelector('.fixed-action-btn');
    const instance = Expressive.FloatingActionButton.init(el);

    assert.equal(instance.options.direction, 'left');
    assert.equal(instance.options.hoverEnabled, false);
    instance.destroy();
  });
});

describe('Tabs', () => {
  beforeEach(resetBody);

  test('select() moves the active link', () => {
    document.body.innerHTML = `
      <ul class="tabs">
        <li class="tab"><a class="active" href="#tab1">Tab 1</a></li>
        <li class="tab"><a href="#tab2">Tab 2</a></li>
      </ul>
      <div id="tab1">one</div><div id="tab2">two</div>`;
    const instance = Expressive.Tabs.init(document.querySelector('.tabs'));
    const [link1, link2] = document.querySelectorAll('.tabs .tab a');

    assert.equal(link1.classList.contains('active'), true);

    instance.select('tab2');

    assert.equal(link2.classList.contains('active'), true);
    assert.equal(link1.classList.contains('active'), false);
  });
});

describe('FormSelect', () => {
  beforeEach(resetBody);

  const fieldHtml = `
    <div class="input-field">
      <select id="pick">
        <option value="" disabled selected>Choose</option>
        <option value="1">One</option>
        <option value="2">Two</option>
      </select>
      <label for="pick">Pick</label>
    </div>`;

  test('builds a dropdown mirroring the native options', () => {
    document.body.innerHTML = fieldHtml;
    const select = document.querySelector('select');
    Expressive.FormSelect.init(select);

    const wrapper = document.querySelector('.select-wrapper');
    assert.ok(wrapper, 'no .select-wrapper was created');

    const items = wrapper.querySelectorAll('ul.select-dropdown li');
    assert.equal(items.length, 3, 'dropdown does not mirror the three <option>s');
    assert.deepEqual(
      Array.from(items, (li) => li.textContent.trim()),
      ['Choose', 'One', 'Two']
    );
  });

  test('reuses an existing .input-field instead of nesting another', () => {
    document.body.innerHTML = fieldHtml;
    const field = document.querySelector('.input-field');
    const instance = Expressive.FormSelect.init(document.querySelector('select'));

    assert.equal(instance.wrapper, field);
    assert.ok(field.classList.contains('select-wrapper'));
    assert.equal(document.querySelectorAll('.input-field').length, 1);
    assert.equal(field.querySelectorAll('.input-field').length, 0);
    instance.destroy();
    assert.equal(field.classList.contains('select-wrapper'), false);
    assert.equal(document.querySelector('select').parentElement, field);
  });

  test('the fake field is a combobox and the caret is not an SVG', () => {
    document.body.innerHTML = fieldHtml;
    const instance = Expressive.FormSelect.init(document.querySelector('select'));

    assert.equal(instance.input.getAttribute('role'), 'combobox');
    assert.equal(instance.input.getAttribute('aria-haspopup'), 'listbox');
    assert.ok(instance.input.id.startsWith('select-input-'));
    assert.equal(instance.wrapper.querySelector('svg'), null);
    assert.ok(instance.wrapper.querySelector(':scope > .caret'));
    instance.destroy();
  });

  test('refresh() rebuilds the menu after options change', () => {
    document.body.innerHTML = fieldHtml;
    const select = document.querySelector('select');
    const instance = Expressive.FormSelect.init(select);
    const menu = instance.dropdownOptions;

    const extra = document.createElement('option');
    extra.value = '3';
    extra.textContent = 'Three';
    select.appendChild(extra);
    instance.refresh();

    assert.equal(instance.dropdownOptions, menu, 'refresh() replaced the Dropdown host');
    assert.equal(menu.querySelectorAll('li').length, 4);
    assert.equal(menu.querySelectorAll('li')[3].textContent.trim(), 'Three');
    instance.destroy();
  });

  test('refresh() syncs a programmatic value change', () => {
    document.body.innerHTML = fieldHtml;
    const select = document.querySelector('select');
    const instance = Expressive.FormSelect.init(select);

    select.value = '2';
    instance.refresh();

    assert.equal(instance.input.value, 'Two');
    assert.ok(instance.dropdownOptions.querySelector('li.selected')?.textContent.includes('Two'));
    instance.destroy();
  });
});

describe('Dropdown nested menus', () => {
  beforeEach(resetBody);

  const html = `
    <button type="button" class="dropdown-trigger" data-target="dn">Drop</button>
    <menu id="dn">
      <li><a href="#!">One</a></li>
      <li id="more-row">
        <a href="#!">More</a>
        <menu>
          <li><a href="#!">Nested</a></li>
        </menu>
      </li>
    </menu>`;

  test('does not start a second Dropdown for the nested menu', () => {
    document.body.innerHTML = html;
    const before = Expressive.Dropdown._dropdowns.length;
    const instance = Expressive.Dropdown.init(document.querySelector('.dropdown-trigger'));
    assert.equal(Expressive.Dropdown._dropdowns.length, before + 1);
    assert.equal(
      document.getElementById('more-row').querySelector('a').getAttribute('aria-haspopup'),
      'menu'
    );
    instance.destroy();
    assert.equal(Expressive.Dropdown._dropdowns.length, before);
  });

  test('clicking a submenu parent toggles .open and keeps the root open', () => {
    document.body.innerHTML = html;
    const instance = Expressive.Dropdown.init(document.querySelector('.dropdown-trigger'));
    const more = document.getElementById('more-row');
    instance.open();

    fire(more.querySelector('a'), 'click');
    assert.equal(instance.isOpen, true);
    assert.equal(more.classList.contains('open'), true);
    assert.equal(more.querySelector('a').getAttribute('aria-expanded'), 'true');

    fire(more.querySelector('a'), 'click');
    assert.equal(more.classList.contains('open'), false);
    assert.equal(instance.isOpen, true);

    fire(more.querySelector('a'), 'click');
    instance.close();
    assert.equal(more.classList.contains('open'), false);
    instance.destroy();
  });
});

describe('Cards reveal', () => {
  beforeEach(resetBody);

  const html = `
    <article>
      <h3 class="activator">Title</h3>
      <p>body</p>
      <aside>
        <h4>More</h4>
        <p>reveal</p>
      </aside>
    </article>`;

  test('open() keeps the reveal expanded until close()', () => {
    document.body.innerHTML = html;
    const el = document.querySelector('article');
    const reveal = el.querySelector('aside');
    const instance = Expressive.Cards.init(el);

    instance.open();
    assert.equal(instance.isOpen, true);
    assert.equal(reveal.getAttribute('aria-expanded'), 'true');
    assert.equal(el.style.transform, '', 'open() wrote an inline transform');
    assert.equal(reveal.style.transform, '', 'the reveal transform is CSS, not inline');

    instance.open();
    assert.equal(instance.isOpen, true, 'a second open() closed the reveal');

    instance.close();
    assert.equal(instance.isOpen, false);
    assert.equal(reveal.getAttribute('aria-expanded'), 'false');

    instance.open();
    assert.equal(instance.isOpen, true, 'the reveal could not be opened again');
    instance.destroy();
  });

  test('clicking the activator opens the reveal', () => {
    document.body.innerHTML = html;
    const el = document.querySelector('article');
    const instance = Expressive.Cards.init(el);

    fire(el.querySelector('.activator'), 'click');
    assert.equal(instance.isOpen, true);
    assert.equal(el.querySelector('aside').getAttribute('aria-expanded'), 'true');
    instance.destroy();
  });
});

describe('CharacterCounter', () => {
  beforeEach(resetBody);

  test('counts input against maxlength and flags overflow', () => {
    document.body.innerHTML = `<div class="input-field"><input id="t" type="text" maxlength="5"></div>`;
    const input = document.querySelector('#t');
    Expressive.CharacterCounter.init(input);
    const counter = document.querySelector('.character-counter');
    assert.ok(counter, 'no counter element was appended');

    input.value = 'abc';
    fire(input, 'input', window.InputEvent);
    assert.equal(counter.innerHTML, '3/5');
    assert.equal(input.classList.contains('invalid'), false);

    input.value = 'abcdefg';
    fire(input, 'input', window.InputEvent);
    assert.equal(counter.innerHTML, '7/5');
    assert.equal(input.classList.contains('invalid'), true, 'over-length input was not flagged');
  });
});

describe('Toast', () => {
  beforeEach(resetBody);

  test('renders its message into a toast container', () => {
    const toast = new Expressive.Toast({ text: 'Saved' });

    assert.ok(document.querySelector('#toast-container'), 'no toast container was created');
    assert.ok(toast.el.classList.contains('toast'));
    assert.ok(toast.el.classList.contains('snackbar'));
    assert.equal(toast.el.textContent.trim(), 'Saved');
    assert.equal(toast.el.querySelector('p')?.textContent, 'Saved');
    assert.equal(Expressive.Toast.getInstance(toast.el), toast);

    toast.dismiss();
  });

  test('renders an action button and a close affordance', () => {
    let acted = false;
    const toast = new Expressive.Toast({
      text: 'Item archived',
      action: 'Undo',
      onAction: () => {
        acted = true;
      },
      dismissible: true,
      displayLength: Infinity,
    });

    const action = toast.el.querySelector('button:not(.circle)');
    const close = toast.el.querySelector('button.circle');
    assert.ok(action, 'action button was not created');
    assert.equal(action.textContent, 'Undo');
    assert.ok(close, 'close button was not created');

    action.click();
    assert.equal(acted, true, 'onAction was not called');
  });
});

describe('Sidenav', () => {
  beforeEach(resetBody);

  const html = `
    <ul id="slide-out" class="sidenav">
      <li><a href="#!">First</a></li>
      <li><a class="sidenav-close" href="#!">Close</a></li>
    </ul>
    <a href="#" data-target="slide-out" class="sidenav-trigger">menu</a>`;

  test('wraps the list in a dialog host', () => {
    document.body.innerHTML = html;
    const el = document.querySelector('.sidenav');
    const instance = Expressive.Sidenav.init(el);

    assert.equal(el.parentElement.tagName, 'DIALOG');
    assert.ok(el.parentElement.classList.contains('sidenav-overlay'));
    instance.destroy();
    assert.equal(el.parentElement.tagName, 'BODY');
    assert.equal(document.querySelector('dialog.sidenav-overlay'), null);
  });

  test('does not wrap a parent that is already a sidenav-overlay dialog', () => {
    document.body.innerHTML = `
      <dialog class="sidenav-overlay">
        <ul id="slide-out" class="sidenav"><li><a href="#!">First</a></li></ul>
      </dialog>`;
    const el = document.querySelector('.sidenav');
    const parent = el.parentElement;
    const instance = Expressive.Sidenav.init(el);
    assert.equal(el.parentElement, parent);
    assert.equal(parent.parentElement?.classList.contains('sidenav-overlay'), false);
    instance.destroy();
  });

  test('does not wrap a dialog.sidenav', () => {
    document.body.innerHTML = `<dialog id="slide-out" class="sidenav"><p>nav</p></dialog>`;
    const el = document.querySelector('.sidenav');
    const instance = Expressive.Sidenav.init(el);
    assert.equal(el.parentElement.tagName, 'BODY');
    assert.equal(el.tagName, 'DIALOG');
    instance.open();
    assert.equal(el.open, true);
    instance.destroy();
  });

  test('open() and close() toggle the modal dialog', () => {
    document.body.innerHTML = html;
    const el = document.querySelector('.sidenav');
    const trigger = document.querySelector('.sidenav-trigger');
    const instance = Expressive.Sidenav.init(el);
    const dialog = el.parentElement;

    assert.equal(instance.isOpen, false);
    assert.equal(dialog.open, false);
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');

    instance.open();
    assert.equal(instance.isOpen, true);
    assert.equal(dialog.open, true);
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');

    instance.close();
    assert.equal(instance.isOpen, false);
    assert.equal(dialog.open, false);
    instance.destroy();
  });

  test('a trigger click opens the sidenav', () => {
    document.body.innerHTML = html;
    const el = document.querySelector('.sidenav');
    const instance = Expressive.Sidenav.init(el);

    fire(document.querySelector('.sidenav-trigger'), 'click');
    assert.equal(instance.isOpen, true);
    instance.destroy();
  });

  test('sidenav-close closes an overlay sidenav', () => {
    document.body.innerHTML = html;
    const el = document.querySelector('.sidenav');
    const instance = Expressive.Sidenav.init(el);
    instance.open();

    fire(el.querySelector('.sidenav-close'), 'click');
    assert.equal(instance.isOpen, false);
    instance.destroy();
  });

  test('a native dialog close event syncs isOpen', () => {
    document.body.innerHTML = html;
    const el = document.querySelector('.sidenav');
    const instance = Expressive.Sidenav.init(el);
    instance.open();
    // jsdom's close() does not fire the event the UA sends for Escape / scrim.
    el.parentElement.dispatchEvent(new window.Event('close'));
    assert.equal(instance.isOpen, false);
    instance.destroy();
  });

  test('opening one sidenav closes another', () => {
    document.body.innerHTML = `
      <ul id="a" class="sidenav"><li><a href="#!">A</a></li></ul>
      <ul id="b" class="sidenav"><li><a href="#!">B</a></li></ul>`;
    const [first, second] = document.querySelectorAll('.sidenav');
    const a = Expressive.Sidenav.init(first);
    const b = Expressive.Sidenav.init(second);
    a.open();
    b.open();
    assert.equal(a.isOpen, false);
    assert.equal(b.isOpen, true);
    a.destroy();
    b.destroy();
  });

  test('does not write body overflow or tabIndex', () => {
    document.body.innerHTML = `
      ${html}
      <nav><div class="nav-wrapper"><ul><li><a href="#!">Top</a></li></ul></div></nav>`;
    const el = document.querySelector('.sidenav');
    const topLink = document.querySelector('.nav-wrapper a');
    const instance = Expressive.Sidenav.init(el);

    instance.open();
    assert.equal(document.body.style.overflow, '');
    assert.equal(topLink.tabIndex, 0);
    assert.equal(el.querySelector('a').tabIndex, 0);

    instance.close();
    assert.equal(document.body.style.overflow, '');
    instance.destroy();
  });

  test('does not write inline transform or transition', () => {
    document.body.innerHTML = html;
    const el = document.querySelector('.sidenav');
    const instance = Expressive.Sidenav.init(el);
    instance.open();
    assert.equal(el.style.transform, '');
    assert.equal(el.style.transition, '');
    assert.equal(el.parentElement.style.transform, '');
    instance.close();
    instance.destroy();
  });

  test('fixed at the large breakpoint does not showModal', () => {
    document.body.innerHTML = `<ul id="nav" class="sidenav sidenav-fixed"><li><a href="#!">A</a></li></ul>`;
    const original = window.matchMedia;
    window.matchMedia = (query) => ({
      matches: query.includes('993'),
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false
    });
    try {
      const el = document.querySelector('.sidenav');
      const instance = Expressive.Sidenav.init(el);
      instance.open();
      assert.equal(instance.isOpen, false);
      assert.equal(el.parentElement.open, false);
      instance.destroy();
    } finally {
      window.matchMedia = original;
    }
  });

  test('destroy() clears the instance off the element', () => {
    document.body.innerHTML = html;
    const el = document.querySelector('.sidenav');
    const instance = Expressive.Sidenav.init(el);
    instance.destroy();
    assert.equal(Expressive.Sidenav.getInstance(el), undefined);
  });
});
