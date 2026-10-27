import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody, window } from './setup.js';

beforeEach(resetBody);

function fixture(options = {}, attributes = '') {
  document.body.innerHTML = `<form><label for="choice">Destination</label><select id="choice" name="place" ${attributes}>
    <option value="paris" selected>Paris</option>
    <optgroup label="Europe"><option value="rome">Rome</option><option value="lyon" disabled>Lyon</option></optgroup>
    <optgroup label="Asia"><option value="tokyo">Tokyo</option></optgroup>
  </select></form>`;
  return Expressive.FormSelect.init(document.querySelector('select'), { searchable: true, ...options });
}

function search(instance, query) {
  const input = instance.menuEl.querySelector('input[type="search"]');
  input.value = query;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
}

test('grouped search filters generated rows and submits the chosen native value', () => {
  const instance = fixture();
  const select = instance.el;
  let changes = 0;
  select.addEventListener('change', () => changes++);
  try {
    search(instance, '  rOm  ');
    assert.equal(select.value, 'paris');
    assert.equal(changes, 0);
    assert.deepEqual([...instance.menuEl.querySelectorAll('[role="option"]:not([hidden])')].map(row => row.textContent), ['Rome']);
    assert.deepEqual([...instance.menuEl.querySelectorAll('.optgroup:not([hidden])')].map(row => row.textContent), ['Europe']);
    instance.menuEl.querySelector('[role="option"]:not([hidden])').click();
    assert.equal(select.value, 'rome');
    assert.equal(changes, 1);
    assert.deepEqual([...new window.FormData(select.form)], [['place', 'rome']]);
  } finally {
    instance.destroy();
  }
});

for (const [name, attributes, options] of [
  ['default', '', { searchable: false }],
  ['multiple', 'multiple', {}],
  ['browser default', 'class="browser-default"', {}]
]) {
  test(`${name} select does not gain a search field`, () => {
    const instance = fixture(options, attributes);
    try {
      assert.equal(document.querySelector('.select-search-popup'), null);
    } finally {
      instance.destroy();
    }
  });
}

test('AutoInit enables search, retains authored names, and restores label IDs', () => {
  document.body.innerHTML = `<label for="pick">Ignored name</label><select id="pick" aria-label="Chosen name"
    data-form-select-options='{"searchable":true,"i18n":{"searchLabel":"Find a place"}}'><option>Paris</option></select>`;
  Expressive.AutoInit();
  const instance = Expressive.FormSelect.getInstance(document.querySelector('select'));
  try {
    assert.equal(instance.input.readOnly, true);
    assert.equal(instance.input.getAttribute('aria-haspopup'), 'dialog');
    assert.equal(instance.menuEl.getAttribute('aria-label'), 'Chosen name');
    assert.equal(instance.menuEl.querySelector('[role="listbox"]').getAttribute('aria-label'), 'Chosen name');
    assert.equal(instance.menuEl.querySelector('input').getAttribute('aria-label'), 'Find a place');
    search(instance, 'missing');
    assert.equal(instance.menuEl.querySelector('[role="status"]').textContent, 'No results');
  } finally {
    instance.destroy();
  }
  assert.equal(document.querySelector('label').hasAttribute('id'), false);
  assert.equal(document.querySelector('label').htmlFor, 'pick');
});

test('matching is literal option text and cannot expose hidden rows or inject markup', () => {
  const instance = fixture({ i18n: { noResults: '<img src=x onerror=alert(1)>' } });
  try {
    const option = document.createElement('option');
    option.value = 'value-only';
    option.textContent = 'Café [1]';
    instance.el.append(option);
    instance.refresh();
    search(instance, 'Europe');
    assert.equal(instance.menuEl.querySelectorAll('[role="option"]:not([hidden])').length, 0);
    search(instance, '[1]');
    assert.equal(instance.menuEl.querySelectorAll('[role="option"]:not([hidden])').length, 1);
    instance.menuEl.querySelector('[role="option"][hidden]').click();
    assert.equal(instance.el.value, 'paris');
    search(instance, 'cafe');
    assert.equal(instance.menuEl.querySelector('[role="status"]').textContent, '<img src=x onerror=alert(1)>');
    assert.equal(instance.menuEl.querySelector('[role="status"] img'), null);
    search(instance, 'value-only');
    assert.equal(instance.menuEl.querySelectorAll('[role="option"]:not([hidden])').length, 0);
  } finally {
    instance.destroy();
  }
});

test('duplicate values retain option identity and value-based change events', () => {
  const instance = fixture();
  let changes = 0;
  instance.el.addEventListener('change', () => changes++);
  try {
    instance.el.append(new window.Option('Paris alternative', 'paris'));
    instance.refresh();
    search(instance, 'alternative');
    instance.menuEl.querySelector('[role="option"]:not([hidden])').click();
    assert.equal(instance.el.selectedIndex, 4);
    assert.equal(instance.input.value, 'Paris alternative');
    assert.equal(changes, 0);
  } finally {
    instance.destroy();
  }
});

test('TreeSelect ignores search and teardown leaves no extra Menu instance', () => {
  document.body.innerHTML = '<label for="tree">Place</label><select id="tree" data-tree><option value="a">Paris</option></select>';
  const before = Expressive.Menu._menus.length;
  const instance = Expressive.TreeSelect.init(document.querySelector('select'), { searchable: true });
  try {
    assert.equal(instance.menuEl.querySelector('input[type="search"]'), null);
    assert.equal(instance.input.getAttribute('aria-haspopup'), 'tree');
  } finally {
    instance.destroy();
  }
  assert.equal(Expressive.Menu._menus.length, before);
  assert.equal(document.querySelector('select').tabIndex, 0);
});

test('no matches and disabled matches never change selection', () => {
  const instance = fixture();
  try {
    search(instance, 'missing');
    assert.equal(instance.menuEl.querySelector('[role="status"]').textContent, 'No results');
    search(instance, 'lyon');
    assert.equal(instance.menuEl.querySelector('[role="status"]').textContent, '');
    const row = instance.menuEl.querySelector('[role="option"]:not([hidden])');
    assert.equal(row.tabIndex, -1);
    row.click();
    assert.equal(instance.el.value, 'paris');
    search(instance, '');
    assert.equal(instance.menuEl.querySelectorAll('[role="option"]:not([hidden])').length, 4);
  } finally {
    instance.destroy();
  }
});
