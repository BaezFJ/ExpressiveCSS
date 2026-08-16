// Behaviour, not just construction: each case drives a component through its
// public API (or a real event) and asserts the DOM state it is supposed to
// produce. jsdom has no layout, so these deliberately assert on classes,
// structure and text - never on measured geometry or transitions.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { LibrePOS, resetBody, fire, window } from './setup.js';

const collapsibleHtml = `
  <ul class="collapsible">
    <li><div class="collapsible-header">One</div><div class="collapsible-body"><span>Body one</span></div></li>
    <li><div class="collapsible-header">Two</div><div class="collapsible-body"><span>Body two</span></div></li>
  </ul>`;

describe('Collapsible', () => {
  beforeEach(resetBody);

  test('open() and close() toggle the active section', () => {
    document.body.innerHTML = collapsibleHtml;
    const el = document.querySelector('.collapsible');
    const [first] = el.querySelectorAll('li');
    const instance = LibrePOS.Collapsible.init(el);

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
    LibrePOS.Collapsible.init(el);

    fire(first.querySelector('.collapsible-header'), 'click');
    assert.equal(first.classList.contains('active'), true);

    fire(second.querySelector('.collapsible-header'), 'click');
    assert.equal(second.classList.contains('active'), true);
    assert.equal(first.classList.contains('active'), false, 'accordion left two sections open');
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
    const instance = LibrePOS.Tabs.init(document.querySelector('.tabs'));
    const [link1, link2] = document.querySelectorAll('.tabs .tab a');

    assert.equal(link1.classList.contains('active'), true);

    instance.select('tab2');

    assert.equal(link2.classList.contains('active'), true);
    assert.equal(link1.classList.contains('active'), false);
  });
});

describe('FormSelect', () => {
  beforeEach(resetBody);

  test('builds a dropdown mirroring the native options', () => {
    document.body.innerHTML = `
      <div class="input-field">
        <select>
          <option value="" disabled selected>Choose</option>
          <option value="1">One</option>
          <option value="2">Two</option>
        </select>
      </div>`;
    const select = document.querySelector('select');
    LibrePOS.FormSelect.init(select);

    const wrapper = document.querySelector('.select-wrapper');
    assert.ok(wrapper, 'no .select-wrapper was created');

    const items = wrapper.querySelectorAll('ul.select-dropdown li');
    assert.equal(items.length, 3, 'dropdown does not mirror the three <option>s');
    assert.deepEqual(
      Array.from(items, (li) => li.textContent.trim()),
      ['Choose', 'One', 'Two']
    );
  });
});

describe('CharacterCounter', () => {
  beforeEach(resetBody);

  test('counts input against maxlength and flags overflow', () => {
    document.body.innerHTML = `<div class="input-field"><input id="t" type="text" maxlength="5"></div>`;
    const input = document.querySelector('#t');
    LibrePOS.CharacterCounter.init(input);
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
    const toast = new LibrePOS.Toast({ text: 'Saved' });

    assert.ok(document.querySelector('#toast-container'), 'no toast container was created');
    assert.ok(toast.el.classList.contains('toast'));
    assert.ok(toast.el.classList.contains('snackbar'));
    assert.equal(toast.el.textContent.trim(), 'Saved');
    assert.equal(toast.el.querySelector('p')?.textContent, 'Saved');
    assert.equal(LibrePOS.Toast.getInstance(toast.el), toast);

    toast.dismiss();
  });

  test('renders an action button and a close affordance', () => {
    let acted = false;
    const toast = new LibrePOS.Toast({
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
