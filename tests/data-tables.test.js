// Data tables: a select-all checkbox in the first header cell, and with
// data-sort, header buttons that sort the rows and move aria-sort.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody, window } from './setup.js';

const TABLE = `<div class="data-table" data-sort>
  <table>
    <thead><tr>
      <th scope="col"><label><input type="checkbox" id="all" aria-label="Select all"></label></th>
      <th scope="col"><button type="button" id="by-name">Name</button></th>
      <th scope="col" class="numeric"><button type="button" id="by-total">Total</button></th>
      <th scope="col"><button type="button" id="menu" aria-haspopup="menu">More</button></th>
    </tr></thead>
    <tbody>
      <tr id="b"><td><input type="checkbox" aria-label="Select b"></td><th scope="row">item 10</th><td class="numeric">$1,200.00</td><td></td></tr>
      <tr class="data-table-detail" id="b-detail"><td colspan="4"><input type="checkbox" aria-label="Detail option"></td></tr>
      <tr id="a"><td><input type="checkbox" aria-label="Select a"></td><th scope="row">Item 9</th><td class="numeric">$87.00</td><td></td></tr>
      <tr id="c"><td><input type="checkbox" aria-label="Select c" disabled></td><th scope="row">item 2</th><td class="numeric" data-value="-5">refund</td><td></td></tr>
    </tbody>
  </table>
</div>`;

const click = (id) => document.getElementById(id).dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const change = (box) => box.dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
const order = () => [...document.querySelectorAll('tbody tr')].map((row) => row.id);
const box = (id) => document.querySelector(`#${id} input`);

beforeEach(() => {
  resetBody();
  document.body.innerHTML = TABLE;
});

test('select-all checks every enabled row, and shows mixed for some', () => {
  const all = document.getElementById('all');
  const seen = [];
  const listen = (e) => seen.push(e.detail.selected.map((row) => row.id));
  document.addEventListener('expressive:change', listen);
  try {
    all.checked = true;
    change(all);
    assert.deepEqual([box('b').checked, box('a').checked, box('c').checked], [true, true, false], 'a disabled row is left alone');
    assert.equal(box('b-detail').checked, false, 'a detail row holds no selection');

    box('a').checked = false;
    change(box('a'));
    assert.deepEqual([all.checked, all.indeterminate], [false, true]);

    box('a').checked = true;
    change(box('a'));
    assert.deepEqual([all.checked, all.indeterminate], [true, false]);

    change(box('b-detail'));
    assert.deepEqual(seen, [['b', 'a'], ['b'], ['b', 'a']], 'a box in a detail row is not a row selection');
  } finally {
    document.removeEventListener('expressive:change', listen);
  }
});

test('a header button sorts the rows, keeps a detail row with its row and moves aria-sort', () => {
  click('by-name');
  assert.deepEqual(order(), ['c', 'a', 'b', 'b-detail'], 'text compares digit runs as numbers, ignoring case');
  assert.equal(document.getElementById('by-name').parentElement.getAttribute('aria-sort'), 'ascending');

  click('by-name');
  assert.deepEqual(order(), ['b', 'b-detail', 'a', 'c']);
  assert.equal(document.getElementById('by-name').parentElement.getAttribute('aria-sort'), 'descending');

  click('by-total');
  assert.deepEqual(order(), ['c', 'a', 'b', 'b-detail'], 'a numeric column compares numbers, and data-value stands in');
  assert.equal(document.getElementById('by-name').parentElement.hasAttribute('aria-sort'), false);

  click('menu');
  assert.deepEqual(order(), ['c', 'a', 'b', 'b-detail'], 'a menu button in a header does not sort');
});

test('a canceled sort leaves the rows to the page but still marks the header', () => {
  const cancel = (e) => {
    assert.deepEqual([e.detail.column, e.detail.direction], [1, 'ascending']);
    e.preventDefault();
  };
  document.addEventListener('expressive:sort', cancel, { once: true });
  click('by-name');
  assert.deepEqual(order(), ['b', 'b-detail', 'a', 'c']);
  assert.equal(document.getElementById('by-name').parentElement.getAttribute('aria-sort'), 'ascending');
});

test('select-all skips a row disabled by its fieldset', () => {
  const row = document.getElementById('a');
  row.cells[0].innerHTML = '<fieldset disabled><input type="checkbox" aria-label="Select a"></fieldset>';
  const all = document.getElementById('all');
  all.checked = true;
  change(all);
  assert.deepEqual([box('b').checked, box('a').checked], [true, false]);
  assert.deepEqual([all.checked, all.indeterminate], [true, false]);
});

test('sync shows a mixed select-all box for rows checked before any change', () => {
  const all = document.getElementById('all');
  box('a').checked = true;
  Expressive.DataTables.sync(document.querySelector('.data-table'));
  assert.deepEqual([all.checked, all.indeterminate], [false, true]);
});

test('a header in a grouped header row sorts by its own column', () => {
  document.body.innerHTML = `<div class="data-table" data-sort><table>
    <thead>
      <tr><th rowspan="2" class="numeric"><button type="button" id="by-id">ID</button></th><th colspan="2">Person</th></tr>
      <tr><th><button type="button" id="by-name">Name</button></th><th><button type="button" id="by-mail">Email</button></th></tr>
    </thead>
    <tbody>
      <tr id="x"><td>1</td><td>Zoe</td><td>a@x</td></tr>
      <tr id="y"><td>2</td><td>Ann</td><td>c@x</td></tr>
      <tr id="z"><td>3</td><td colspan="2">Mia, b@x</td></tr>
    </tbody></table></div>`;
  const columns = [];
  const listen = (e) => columns.push(e.detail.column);
  document.addEventListener('expressive:sort', listen);
  try {
    click('by-name');
    assert.deepEqual(order(), ['y', 'z', 'x']);
    click('by-mail');
    assert.deepEqual(order(), ['x', 'y', 'z'], 'a cell spanning two columns sorts by its text in both');
    assert.deepEqual(columns, [1, 2]);
  } finally {
    document.removeEventListener('expressive:sort', listen);
  }
});

test('a disabled sort button does not sort', () => {
  const name = document.getElementById('by-name');
  name.setAttribute('aria-disabled', 'true');
  click('by-name');
  const total = document.getElementById('by-total');
  total.disabled = true;
  total.innerHTML = '<span id="inner">Total</span>';
  click('inner');
  assert.deepEqual(order(), ['b', 'b-detail', 'a', 'c']);
  assert.equal(document.querySelectorAll('[aria-sort]').length, 0);
});

test('in a grouped header, only a checkbox in the first column selects all', () => {
  document.body.innerHTML = `<div class="data-table"><table>
    <thead>
      <tr><th rowspan="2"><input type="checkbox" id="all" aria-label="Select all"></th><th colspan="2">Group</th></tr>
      <tr><th><input type="checkbox" id="other" aria-label="Show archived"></th><th>B</th></tr>
    </thead>
    <tbody>
      <tr id="a"><td><input type="checkbox" aria-label="Select a"></td><td>1</td><td>2</td></tr>
      <tr id="b"><td><input type="checkbox" aria-label="Select b"></td><td>3</td><td>4</td></tr>
    </tbody></table></div>`;
  const other = document.getElementById('other');
  other.checked = true;
  change(other);
  assert.deepEqual([box('a').checked, box('b').checked], [false, false], 'another column\'s checkbox selects nothing');
  Expressive.DataTables.sync(document.querySelector('.data-table'));
  assert.equal(other.checked, true, 'sync leaves it alone');
  const all = document.getElementById('all');
  all.checked = true;
  change(all);
  assert.deepEqual([box('a').checked, box('b').checked, other.checked], [true, true, true]);
});

test('without data-sort the header buttons are left to the page', () => {
  document.querySelector('.data-table').removeAttribute('data-sort');
  click('by-name');
  assert.deepEqual(order(), ['b', 'b-detail', 'a', 'c']);
  assert.equal(document.getElementById('by-name').parentElement.hasAttribute('aria-sort'), false);
});

// Column visibility: a menuitemcheckbox with data-column naming a first-row
// header cell hides and shows that column when Menu toggles it.
const COLUMNS = `<menu>
  <li role="menuitemcheckbox" aria-checked="true" data-column="h-a" id="t-a">A</li>
  <li role="menuitemcheckbox" aria-checked="true" data-column="h-b" id="t-b">B</li>
  <li role="menuitemcheckbox" aria-checked="true" data-column="nope" id="t-missing">Missing</li>
  <li role="menuitemcheckbox" aria-checked="true" data-column="not-a-header" id="t-div">Div</li>
  <li role="menuitemcheckbox" aria-checked="true" data-column="h-group" id="t-group">Group</li>
  <li role="menuitemcheckbox" aria-checked="true" data-column="h-c1" id="t-c1">C1</li>
</menu>
<div id="not-a-header"></div>
<div class="data-table" id="grouped"><table>
  <thead>
    <tr><th rowspan="2" id="h-a">A</th><th rowspan="2" id="h-b">B</th><th colspan="2" id="h-group">Group</th></tr>
    <tr><th id="h-c1">C1</th><th>C2</th></tr>
  </thead>
  <tbody>
    <tr><td colspan="2" id="wide">ab</td><td>c1</td><td>c2</td></tr>
    <tr><td id="a2">a</td><td id="b2" hidden>own</td><td>c1</td><td>c2</td></tr>
    <tr><td id="a3">a</td><td id="b3">b</td><td>c1</td><td>c2</td></tr>
  </tbody>
  <tfoot><tr><td id="a4">a</td><td id="b4">b</td><td colspan="2">c</td></tr></tfoot>
</table></div>`;

/** Flips a menu checkbox item and fires Menu's change from its trigger. */
function toggle(id) {
  const item = document.getElementById(id);
  const checked = item.getAttribute('aria-checked') !== 'true';
  item.setAttribute('aria-checked', String(checked));
  document.body.dispatchEvent(new window.CustomEvent('expressive:change', { bubbles: true, detail: { item, checked } }));
}

/** The ids, or else the text, of the hidden cells in a table. */
const hidden = (selector) => [...document.querySelectorAll(`${selector} :is(th, td)[hidden]`)].map((cell) => cell.id || cell.textContent);

test('a column toggle hides its header and cells, leaving spanning and author-hidden cells', () => {
  document.body.innerHTML += COLUMNS;
  toggle('t-b');
  assert.deepEqual(hidden('#grouped'), ['h-b', 'b2', 'b3', 'b4']);
  toggle('t-a');
  assert.deepEqual(hidden('#grouped'), ['h-a', 'h-b', 'a2', 'b2', 'a3', 'b3', 'a4', 'b4'], 'a cell spanning a hidden column stays');
  toggle('t-b');
  assert.deepEqual(hidden('#grouped'), ['h-a', 'a2', 'b2', 'a3', 'a4'], 'a cell the author hid stays hidden');
  toggle('t-a');
  assert.deepEqual(hidden('#grouped'), ['b2']);
  assert.equal(document.querySelectorAll('.data-table [data-column-hidden]').length, 0);
});

test('a toggle naming no first-row single-column header changes no table', () => {
  document.body.innerHTML += COLUMNS;
  for (const id of ['t-missing', 't-div', 't-group', 't-c1']) {
    toggle(id);
    assert.equal(document.getElementById(id).getAttribute('aria-checked'), 'false');
  }
  assert.deepEqual(hidden('#grouped'), ['b2']);
  toggle('t-b');
  assert.deepEqual(hidden('.data-table:not(#grouped)'), [], 'a table no toggle names is untouched');
});

test('sync applies the column toggles that name its headers', () => {
  document.body.innerHTML += COLUMNS;
  const wrapper = document.getElementById('grouped');
  document.getElementById('t-a').setAttribute('aria-checked', 'false');
  assert.deepEqual(hidden('#grouped'), ['b2'], 'nothing changes before sync');
  Expressive.DataTables.sync(wrapper);
  assert.deepEqual(hidden('#grouped'), ['h-a', 'a2', 'b2', 'a3', 'a4']);
  document.getElementById('t-a').setAttribute('aria-checked', 'true');
  Expressive.DataTables.sync(wrapper);
  assert.deepEqual(hidden('#grouped'), ['b2']);
});
