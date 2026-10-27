import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody, window } from './setup.js';

beforeEach(resetBody);

function fixture(options = {}) {
  document.body.innerHTML = `<form><label for="choice">Destination</label><select id="choice" name="place">
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
