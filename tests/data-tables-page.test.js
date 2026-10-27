import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody, window } from './setup.js';

const markup = `<div class="data-table" data-sort data-page-size="2">
  <label>Search records<input type="search" data-table-filter></label>
  <output data-table-filter-count role="status" aria-live="polite" aria-label="Matching records"></output>
  <table><thead><tr><th><input type="checkbox" aria-label="Select all"></th><th data-filter><button type="button">Name</button></th></tr></thead><tbody>
    ${['Cedar', 'Amber', 'Birch', 'Delta', 'Elm', 'Fir', 'Grove'].map((name, i) => `<tr id="r${i + 1}"><td><input type="checkbox" aria-label="Select ${name}" ${i === 4 ? 'checked' : ''}><button type="button" aria-expanded="true">Details</button></td><th>${name}</th></tr>${i === 0 ? '<tr id="detail" class="data-table-detail"><td colspan="2">Cedar details</td></tr><tr id="more-detail" class="data-table-detail" hidden><td colspan="2">Private detail</td></tr>' : ''}`).join('')}
    <tr id="secret" hidden><td><input type="checkbox" checked></td><th>Cedar secret</th></tr>
    <tr id="secret-detail" class="data-table-detail"><td colspan="2">Secret</td></tr>
    <tr id="css-hidden" style="display:none"><td><input type="checkbox"></td><th>Cedar CSS</th></tr>
  </tbody></table>
  <nav class="pagination" aria-label="Record pages"><ol>
    <li><button type="button" data-table-page="previous">Previous</button></li>
    <li><output data-table-page-status role="status" aria-live="polite" aria-label="Pages"></output></li>
    <li><button type="button" data-table-page="next">Next</button></li>
  </ol></nav></div>`;

const wrapper = () => document.querySelector('.data-table');
const sync = () => Expressive.DataTables.sync(wrapper());
const button = (direction) => document.querySelector(`[data-table-page="${direction}"]`);
const status = () => document.querySelector('[data-table-page-status]').textContent;
const count = () => document.querySelector('[data-table-filter-count]').textContent;
const box = (id) => document.querySelector(`#${id} input`);
const all = () => document.querySelector('thead input');
const input = (el) => el.dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
const query = (value) => { const field = document.querySelector('[data-table-filter]'); field.value = value; input(field); };
const displayed = (owner = wrapper()) => [...owner.querySelectorAll(':scope > table > tbody > tr:not(.data-table-detail)')]
  .filter((row) => !row.hidden && row.style.display !== 'none' && !row.hasAttribute('data-table-page-hidden') && !row.hasAttribute('data-table-filter-hidden')).map((row) => row.id);

beforeEach(() => { resetBody(); document.body.innerHTML = markup; sync(); });

test('local pages count records, keep details together and stop at both boundaries', () => {
  assert.deepEqual(displayed(), ['r1', 'r2']);
  assert.equal(status(), '1 / 4');
  assert.equal(button('previous').getAttribute('aria-disabled'), 'true');
  button('previous').click();
  button('next').focus();
  button('next').click();
  assert.deepEqual(displayed(), ['r3', 'r4']);
  assert.equal(document.getElementById('detail').hasAttribute('data-table-page-hidden'), true);
  button('next').click();
  button('next').click();
  assert.deepEqual(displayed(), ['r7']);
  assert.equal(status(), '4 / 4');
  assert.equal(button('next').getAttribute('aria-disabled'), 'true');
  assert.equal(document.activeElement, button('next'));
  button('next').click();
  assert.equal(status(), '4 / 4');
  assert.equal(document.getElementById('more-detail').hidden, true);
  assert.equal(document.getElementById('secret').hidden, true);
});

test('filtering and sorting reset the page and count matches across previously hidden pages', () => {
  button('next').click();
  query('Cedar');
  assert.deepEqual(displayed(), ['r1']);
  assert.equal(count(), '1');
  assert.equal(status(), '1 / 1');
  query('');
  assert.equal(count(), '7');
  assert.equal(status(), '1 / 4');
  document.querySelector('th button').click();
  assert.deepEqual(displayed(), ['r2', 'r3']);
  button('next').click();
  assert.deepEqual(displayed(), ['r1', 'r4']);
  document.querySelector('th button').click();
  assert.deepEqual(displayed(), ['r7', 'r6']);
});

test('select-all changes the displayed enabled records and retains every other selection', () => {
  const fieldset = document.createElement('fieldset');
  fieldset.disabled = true;
  box('r4').replaceWith(fieldset);
  fieldset.append(document.createElement('input'));
  fieldset.firstElementChild.type = 'checkbox';
  button('next').click();
  let selected;
  wrapper().addEventListener('expressive:change', (e) => { selected = e.detail.selected.map((row) => row.id); });
  all().checked = true;
  input(all());
  assert.deepEqual(selected, ['r3', 'r5', 'secret']);
  assert.equal(box('r4').checked, false);
  button('next').click();
  assert.equal(all().indeterminate, true);
  assert.equal(box('r3').checked, true);
});

test('silent sync clamps after replacement and restores paging-only hiding when opt-in is removed', () => {
  const events = [];
  for (const type of ['filter', 'change', 'sort']) wrapper().addEventListener(`expressive:${type}`, () => events.push(type));
  for (let i = 0; i < 3; i++) button('next').click();
  const body = document.querySelector('tbody');
  body.innerHTML = document.getElementById('r1').outerHTML + document.getElementById('r2').outerHTML;
  sync();
  assert.deepEqual(displayed(), ['r1', 'r2']);
  assert.equal(status(), '1 / 1');
  wrapper().removeAttribute('data-page-size');
  sync();
  assert.equal(body.querySelector('[data-table-page-hidden]'), null);
  assert.deepEqual(events, []);
});

test('invalid sizes and native-disabled page buttons apply no paging action', () => {
  button('next').disabled = true;
  button('next').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(status(), '1 / 4');
  button('next').disabled = false;
  for (const size of ['0', '-2', '1.5', 'invalid', 'Infinity', '9007199254740992', '']) {
    wrapper().setAttribute('data-page-size', size);
    sync();
    button('next').click();
    assert.equal(displayed().length, 7, size);
  }
  wrapper().removeAttribute('data-page-size');
  sync();
  assert.equal(displayed().length, 7);
});

test('empty filters disable both controls and preserve server-filter ownership on canceled requests', () => {
  query('missing');
  assert.deepEqual(displayed(), []);
  assert.equal(status(), '0 / 0');
  assert.equal(button('next').getAttribute('aria-disabled'), 'true');
  assert.equal(button('previous').getAttribute('aria-disabled'), 'true');
  query('');
  button('next').click();
  wrapper().addEventListener('expressive:filter', (e) => e.preventDefault(), { once: true });
  query('Cedar');
  assert.deepEqual(displayed(), ['r3', 'r4']);
  document.querySelector('[data-table-filter-count]').textContent = '87';
  sync();
  assert.equal(count(), '87');
  assert.equal(status(), '2 / 4');
  button('next').click();
  wrapper().addEventListener('expressive:sort', (e) => e.preventDefault(), { once: true });
  document.querySelector('th button').click();
  assert.equal(status(), '3 / 4');
  query('Cedar');
  assert.equal(count(), '1');
  assert.equal(status(), '1 / 1');
});

test('paging spans tbody elements without changing their established sort order', () => {
  const body = document.createElement('tbody');
  body.innerHTML = '<tr id="r8"><td></td><th>Amber</th></tr><tr id="r9"><td></td><th>Grove</th></tr>';
  document.querySelector('table').append(body);
  sync();
  assert.equal(status(), '1 / 5');
  for (let i = 0; i < 3; i++) button('next').click();
  assert.deepEqual(displayed(), ['r7', 'r8']);
  button('next').click();
  assert.deepEqual(displayed(), ['r9']);
  document.querySelector('th button').click();
  document.querySelector('th button').click();
  for (let i = 0; i < 3; i++) button('next').click();
  assert.deepEqual(displayed(), ['r2', 'r9']);
});

test('independent wrappers and unmarked controls keep their own page state', () => {
  const original = wrapper();
  const other = original.cloneNode(true);
  document.body.append(other);
  Expressive.DataTables.sync(other);
  button('next').click();
  button('next').click();
  assert.deepEqual(displayed(original), ['r5', 'r6']);
  assert.deepEqual(displayed(other), ['r1', 'r2']);
  other.querySelector('[data-table-page="next"]').click();
  assert.deepEqual(displayed(other), ['r3', 'r4']);
  assert.equal(status(), '3 / 4');
  const unmarked = document.createElement('button');
  unmarked.type = 'button';
  original.append(unmarked);
  unmarked.click();
  const outside = document.createElement('button');
  outside.type = 'button';
  outside.dataset.tablePage = 'next';
  document.body.append(outside);
  outside.click();
  assert.equal(status(), '3 / 4');
});

test('outer sync does not clear nested table page markers or rewrite its controls', () => {
  document.querySelector('#detail td').innerHTML = markup;
  const nested = document.querySelector('#detail .data-table');
  nested.setAttribute('data-page-size', '3');
  Expressive.DataTables.sync(nested);
  const before = nested.innerHTML;
  wrapper().querySelector(':scope > nav [data-table-page="next"]').click();
  assert.equal(nested.innerHTML, before);
  wrapper().querySelector(':scope > nav [data-table-page="previous"]').click();
  assert.deepEqual(displayed(nested), ['r1', 'r2', 'r3']);
  assert.equal(nested.querySelector('[data-table-page-status]').textContent, '1 / 3');
});
