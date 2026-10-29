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

test('group filtering reads each option ID at most once per search', () => {
  document.body.innerHTML = `<label for="choice">Choice</label><select id="choice">${
    Array.from({ length: 30 }, (_, group) => `<optgroup label="Group ${group}">${
      Array.from({ length: 10 }, (_, option) => `<option>Item ${group}-${option}</option>`).join('')
    }</optgroup>`).join('')
  }<optgroup label="Empty"></optgroup></select>`;
  const instance = Expressive.FormSelect.init(document.querySelector('select'), { searchable: true });
  try {
    const rows = [...instance.menuEl.querySelectorAll('[role="option"]')];
    let reads = 0;
    for (const row of rows) {
      const id = row.id;
      Object.defineProperty(row, 'id', { configurable: true, get() { reads++; return id; } });
    }
    for (const [query, groups] of [['missing', 0], ['Item 29-', 1], ['', 30]]) {
      reads = 0;
      search(instance, query);
      assert.ok(reads <= rows.length, `${query}: ${reads} ID reads for ${rows.length} options`);
      assert.equal(instance.menuEl.querySelectorAll('.optgroup:not([hidden])').length, groups);
    }
    instance.el.lastElementChild.innerHTML = '<option>New option</option>';
    instance.refresh();
    search(instance, 'New option');
    assert.deepEqual([...instance.menuEl.querySelectorAll('.optgroup:not([hidden])')].map(group => group.textContent), ['Empty']);
  } finally {
    instance.destroy();
  }
});

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
  ['multiple', 'multiple', { searchable: false }],
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

test('multiple search keeps picks hidden by the query and submits every value', () => {
  const instance = fixture({}, 'multiple');
  const select = instance.el;
  let changes = 0;
  select.addEventListener('change', () => changes++);
  const visible = () => instance.menuEl.querySelector('[role="option"]:not([hidden])');
  try {
    const listbox = instance.menuEl.querySelector('[role="listbox"]');
    assert.equal(instance.menuEl.getAttribute('role'), 'dialog');
    assert.equal(instance.menuEl.hasAttribute('aria-multiselectable'), false);
    assert.equal(listbox.getAttribute('aria-multiselectable'), 'true');
    assert.equal(listbox.classList.contains('multiple-select-menu'), true);
    search(instance, 'rom');
    visible().click();
    search(instance, 'tok');
    assert.equal(changes, 1);
    visible().click();
    assert.equal(changes, 2);
    assert.equal(instance.menuEl.querySelector('input[type="search"]').value, 'tok');
    assert.equal(instance.input.value, 'Paris, Rome, Tokyo');
    assert.deepEqual(new window.FormData(select.form).getAll('place'), ['paris', 'rome', 'tokyo']);
    search(instance, '');
    const rome = instance._values.find(({ el }) => el.value === 'rome').optionEl;
    assert.equal(rome.ariaSelected, 'true');
    assert.equal(rome.querySelector('input[type="checkbox"]').checked, true);
    rome.click();
    assert.equal(changes, 3);
    assert.deepEqual(new window.FormData(select.form).getAll('place'), ['paris', 'tokyo']);
  } finally {
    instance.destroy();
  }
});

test('multiple search reset restores defaults hidden by the query', async () => {
  const instance = fixture({}, 'multiple');
  try {
    search(instance, 'tok');
    instance.menuEl.querySelector('[role="option"]:not([hidden])').click();
    instance.el.form.reset();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(instance.menuEl.querySelector('input[type="search"]').value, '');
    assert.deepEqual(instance.getSelectedValues(), ['paris']);
    assert.equal(instance.input.value, 'Paris');
  } finally {
    instance.destroy();
  }
});

test('multiple search keeps the query on refresh, validates, closes when disabled and tears down', () => {
  const before = Expressive.Menu._menus.length;
  const instance = fixture({}, 'multiple required');
  const search = instance.menuEl.querySelector('input[type="search"]');
  try {
    instance.el.options[0].selected = false;
    instance.refresh();
    assert.equal(instance.el.checkValidity(), false);
    assert.equal(instance.input.getAttribute('aria-invalid'), 'true');
    assert.match(instance.input.getAttribute('aria-describedby'), /-error$/);
    search.value = 'o';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    instance.el.options[1].textContent = 'Oslo';
    instance.refresh();
    assert.equal(search.value, 'o');
    assert.deepEqual([...instance.menuEl.querySelectorAll('[role="option"]:not([hidden])')].map(row => row.textContent), ['Oslo', 'Lyon', 'Tokyo']);
    instance.el.disabled = true;
    instance.refresh();
    assert.equal(instance.input.disabled, true);
  } finally {
    instance.destroy();
  }
  assert.equal(Expressive.Menu._menus.length, before);
  assert.equal(document.querySelector('input[type="search"]'), null);
});

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

test('TreeSelect reuses search controls around its tree and leaves no extra Menu instance', () => {
  document.body.innerHTML = '<label for="tree">Place</label><select id="tree" data-tree><option value="a">Paris</option></select>';
  const before = Expressive.Menu._menus.length;
  const instance = Expressive.TreeSelect.init(document.querySelector('select'), { searchable: true });
  try {
    assert.ok(instance.menuEl.querySelector('input[type="search"]'));
    assert.equal(instance.menuEl.getAttribute('role'), 'dialog');
    assert.equal(instance.tree.getAttribute('role'), 'tree');
    assert.equal(instance.tree.parentElement, instance.menuEl);
    assert.equal(instance.menuEl.querySelector('[role="listbox"]'), null);
    assert.equal(instance.input.getAttribute('aria-haspopup'), 'dialog');
    assert.equal(instance.input.getAttribute('aria-controls'), instance.menuEl.id);
  } finally {
    instance.destroy();
  }
  assert.equal(Expressive.Menu._menus.length, before);
  assert.equal(document.querySelector('select').tabIndex, 0);
});

test('option image classes cannot become optgroup headings', () => {
  const instance = fixture();
  try {
    instance.el.options[0].dataset.icon = '/photo.png';
    instance.el.options[0].className = 'optgroup';
    instance.refresh();
    search(instance, 'paris');
    assert.equal(instance.menuEl.querySelectorAll('li[role="option"]:not([hidden])').length, 1);
    assert.equal(instance.menuEl.querySelector('img').className, 'optgroup');
  } finally {
    instance.destroy();
  }
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
