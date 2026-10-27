import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody, window } from './setup.js';

const markup = `<div class="data-table" data-sort data-page-size="2">
  <label>Records per page<select class="browser-default" data-table-page-size><option value="1">1</option><option value="2" selected>2</option><option value="3">3</option><option value="4">4</option></select></label>
  <label>Search records<input type="search" data-table-filter value="not in this page"></label>
  <output data-table-filter-count role="status" aria-live="polite" aria-label="Matching records">87</output>
  <table><thead><tr><th><label><input type="checkbox" aria-label="Select all"></label></th><th data-filter><button type="button">Name</button></th></tr></thead><tbody>
    <tr id="r3"><td><label><input type="checkbox" aria-label="Select Birch"></label><button type="button" aria-expanded="true">Details</button></td><th>Birch</th></tr>
    <tr id="detail" class="data-table-detail"><td colspan="2">Birch details</td></tr>
    <tr id="private-detail" class="data-table-detail" hidden><td colspan="2">Private detail</td></tr>
    <tr id="r4"><td><label><input type="checkbox" aria-label="Select Delta" checked></label></td><th>Delta</th></tr>
    <tr id="secret" hidden><td><label><input type="checkbox" checked></label></td><th>Secret</th></tr>
    <tr id="secret-detail" class="data-table-detail"><td colspan="2">Secret details</td></tr>
    <tr id="css-hidden" style="display:none"><td><label><input type="checkbox"></label></td><th>CSS hidden</th></tr>
  </tbody></table>
  <nav class="pagination" aria-label="Record pages"><ol>
    <li><button type="button" data-table-page="previous">Previous</button></li>
    <li><output data-table-page-status role="status" aria-live="polite" aria-label="Pages"></output></li>
    <li><button type="button" data-table-page="next">Next</button></li>
  </ol></nav></div>`;

const wrapper = () => document.querySelector('.data-table');
const accept = (state = { page: 2, pageSize: 2, total: 7 }) => Expressive.DataTables.setPage(wrapper(), state);
const sync = () => Expressive.DataTables.sync(wrapper());
const status = () => document.querySelector('[data-table-page-status]').textContent;
const count = () => document.querySelector('[data-table-filter-count]').textContent;
const button = (direction) => document.querySelector(`[data-table-page="${direction}"]`);
const displayed = () => [...document.querySelectorAll('tbody > tr:not(.data-table-detail)')]
  .filter((row) => !row.hidden && row.style.display !== 'none' && !row.hasAttribute('data-table-page-hidden') && !row.hasAttribute('data-table-filter-hidden')).map((row) => row.id);
const events = () => {
  const seen = [];
  for (const name of ['page', 'filter', 'sort', 'change']) wrapper().addEventListener(`expressive:${name}`, () => seen.push(name));
  return seen;
};

beforeEach(() => { resetBody(); document.body.innerHTML = markup; });

test('server page state starts at page two without filtering or slicing the supplied records', () => {
  const seen = events();
  const state = Object.freeze({ page: 2, pageSize: 2, total: 7 });
  assert.equal(accept(state), true);
  assert.equal(status(), '2 / 4');
  assert.deepEqual(displayed(), ['r3', 'r4']);
  assert.equal(count(), '87');
  assert.equal(document.getElementById('detail').hasAttribute('data-table-page-hidden'), false);
  assert.equal(document.getElementById('private-detail').hidden, true);
  assert.equal(document.getElementById('secret-detail').hasAttribute('data-table-page-hidden'), true);
  assert.equal(document.querySelector('thead input').indeterminate, true);
  assert.equal(button('previous').getAttribute('aria-disabled'), 'false');
  assert.equal(button('next').getAttribute('aria-disabled'), 'false');
  assert.deepEqual(state, { page: 2, pageSize: 2, total: 7 });
  assert.deepEqual(seen, []);
});

test('silent server responses use the supplied total and show every provided record group', () => {
  accept();
  const seen = events();
  document.querySelector('tbody').innerHTML = ['Five', 'Six', 'Seven'].map((name, i) => `<tr id="response${i}"><td><label><input type="checkbox"></label></td><th>${name}</th></tr>`).join('');
  assert.equal(accept({ page: 3, pageSize: 1, total: 12 }), true);
  sync();
  assert.equal(status(), '3 / 12');
  assert.deepEqual(displayed(), ['response0', 'response1', 'response2']);
  assert.equal(wrapper().getAttribute('data-page-size'), '1');
  assert.equal(count(), '87');
  assert.deepEqual(seen, []);
});

test('invalid state and wrappers leave accepted state and DOM unchanged', () => {
  accept();
  const before = wrapper().outerHTML;
  for (const state of [undefined, {}, 3, 'state', ...['page', 'pageSize', 'total'].flatMap((key) =>
    [undefined, '2', -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1].map((value) =>
      ({ page: 2, pageSize: 2, total: 7, [key]: value }))),
    { page: 0, pageSize: 2, total: 7 }, { page: 1, pageSize: 0, total: 7 }]) {
    assert.equal(Expressive.DataTables.setPage(wrapper(), state), false, JSON.stringify(state));
    assert.equal(wrapper().outerHTML, before);
  }
  for (const target of [null, undefined, {}, document.body, document.querySelector('table'), document.createElement('div')]) {
    assert.equal(Expressive.DataTables.setPage(target, { page: 1, pageSize: 2, total: 7 }), false);
    assert.equal(wrapper().outerHTML, before);
  }
});

test('zero and shrinking totals clamp controls without hiding supplied records', () => {
  accept({ page: 99, pageSize: 2, total: 7 });
  assert.equal(status(), '4 / 4');
  assert.equal(button('next').getAttribute('aria-disabled'), 'true');
  accept({ page: 4, pageSize: 2, total: 1 });
  assert.equal(status(), '1 / 1');
  accept({ page: 4, pageSize: 2, total: 0 });
  sync();
  assert.equal(status(), '0 / 0');
  assert.equal(button('previous').getAttribute('aria-disabled'), 'true');
  assert.equal(button('next').getAttribute('aria-disabled'), 'true');
  assert.deepEqual(displayed(), ['r3', 'r4']);
  assert.equal(count(), '87');
});

test('the accepted state is copied and null restores local filtering from page one', () => {
  const state = { page: 2, pageSize: 1, total: 7 };
  accept(state);
  state.page = state.pageSize = state.total = 99;
  sync();
  assert.equal(status(), '2 / 7');
  document.querySelector('[data-table-filter]').value = '';
  assert.equal(accept(null), true);
  assert.equal(status(), '1 / 2');
  assert.deepEqual(displayed(), ['r3']);
  assert.equal(wrapper().getAttribute('data-page-size'), '1');
  assert.equal(count(), '2');
  button('next').click();
  assert.equal(status(), '2 / 2');
});

test('state accepts inherited and non-enumerable numeric fields and reads them once', () => {
  assert.equal(accept(Object.create({ page: 2, pageSize: 2, total: 7 })), true);
  assert.equal(status(), '2 / 4');
  const reads = { page: 0, pageSize: 0, total: 0 };
  const state = Object.defineProperties({}, Object.fromEntries(
    Object.entries({ page: 3, pageSize: 1, total: 8 }).map(([key, value]) =>
      [key, { get() { reads[key]++; return value; } }])
  ));
  assert.equal(accept(state), true);
  assert.equal(status(), '3 / 8');
  assert.deepEqual(reads, { page: 1, pageSize: 1, total: 1 });
  assert.deepEqual(displayed(), ['r3', 'r4']);
});

test('server sync clears former local hiding and select-all only affects displayed enabled records', () => {
  sync();
  assert.deepEqual(displayed(), []);
  accept();
  assert.deepEqual(displayed(), ['r3', 'r4']);
  const all = document.querySelector('thead input');
  all.click();
  assert.equal(document.querySelector('#r3 input').checked, true);
  assert.equal(document.querySelector('#r4 input').checked, true);
  assert.equal(document.querySelector('#secret input').checked, true);
  assert.equal(document.querySelector('#css-hidden input').checked, false);
  assert.equal(document.querySelector('#r3 button').getAttribute('aria-expanded'), 'true');
});

test('server buttons request pages without advancing accepted state, even without cancellation', () => {
  accept();
  const seen = [];
  wrapper().addEventListener('expressive:page', (event) => {
    seen.push(event.detail);
    assert.equal(event.target, wrapper());
    assert.equal(event.bubbles && event.composed && event.cancelable, true);
  });
  button('next').focus();
  button('next').click();
  assert.deepEqual(seen, [{ page: 3, pageSize: 2 }]);
  assert.equal(status(), '2 / 4');
  assert.deepEqual(displayed(), ['r3', 'r4']);
  assert.equal(document.activeElement, button('next'));
  button('previous').click();
  assert.deepEqual(seen[1], { page: 1, pageSize: 2 });
});

test('a canceled native size pair requests once and leaves accepted page and size intact', () => {
  accept();
  const seen = [];
  wrapper().addEventListener('expressive:page', (event) => { seen.push(event.detail); event.preventDefault(); });
  const control = document.querySelector('[data-table-page-size]');
  control.focus();
  control.value = '4';
  control.dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  control.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(seen, [{ page: 2, pageSize: 4 }]);
  assert.equal(wrapper().getAttribute('data-page-size'), '2');
  assert.equal(status(), '2 / 4');
  assert.equal(count(), '87');
  assert.deepEqual(displayed(), ['r3', 'r4']);
  assert.equal(document.activeElement, control);
  control.dispatchEvent(new window.Event('change', { bubbles: true, composed: true }));
  assert.equal(seen.length, 2);
});

test('a setter response inside a request supersedes the older local default', () => {
  document.querySelector('[data-table-filter]').value = '';
  wrapper().setAttribute('data-page-size', '1');
  sync();
  wrapper().addEventListener('expressive:page', () => accept({ page: 3, pageSize: 1, total: 12 }), { once: true });
  button('next').click();
  assert.equal(status(), '3 / 12');
  assert.equal(wrapper().getAttribute('data-page-size'), '1');
  assert.deepEqual(displayed(), ['r3', 'r4']);
});

test('a newer canceled nested request prevents an older local default', () => {
  document.querySelector('[data-table-filter]').value = '';
  wrapper().setAttribute('data-page-size', '1');
  sync();
  const seen = [];
  wrapper().addEventListener('expressive:page', (event) => {
    seen.push(event.detail);
    if (seen.length === 1) {
      const control = document.querySelector('[data-table-page-size]');
      control.value = '2';
      control.dispatchEvent(new window.Event('change', { bubbles: true, composed: true }));
    } else event.preventDefault();
  });
  button('next').click();
  assert.deepEqual(seen, [{ page: 2, pageSize: 1 }, { page: 1, pageSize: 2 }]);
  assert.equal(status(), '1 / 2');
  assert.equal(wrapper().getAttribute('data-page-size'), '1');
});

test('canceled local page and size requests preserve the entire accepted view', () => {
  document.querySelector('[data-table-filter]').value = '';
  wrapper().setAttribute('data-page-size', '1');
  sync();
  const seen = [];
  wrapper().addEventListener('expressive:page', (event) => { seen.push(event.detail); event.preventDefault(); });
  const before = wrapper().outerHTML;
  button('next').focus();
  button('next').click();
  assert.equal(wrapper().outerHTML, before);
  assert.equal(document.activeElement, button('next'));
  const control = document.querySelector('[data-table-page-size]');
  control.value = '4';
  control.focus();
  control.dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  control.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(wrapper().outerHTML, before);
  assert.equal(control.value, '4');
  assert.equal(document.activeElement, control);
  assert.deepEqual(seen, [{ page: 2, pageSize: 1 }, { page: 1, pageSize: 4 }]);
});

test('an uncanceled deferred server size request waits for the application response', async () => {
  accept();
  const seen = [];
  wrapper().addEventListener('expressive:page', (event) => seen.push(event.detail));
  const control = document.querySelector('[data-table-page-size]');
  control.value = '4';
  control.dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  control.dispatchEvent(new window.Event('change', { bubbles: true }));
  sync();
  assert.equal(wrapper().getAttribute('data-page-size'), '2');
  assert.equal(status(), '2 / 4');
  assert.deepEqual(seen, [{ page: 2, pageSize: 4 }]);
  await Promise.resolve();
  accept({ ...seen[0], total: 7 });
  assert.equal(status(), '2 / 2');
  assert.equal(wrapper().getAttribute('data-page-size'), '4');
  assert.deepEqual(displayed(), ['r3', 'r4']);
  assert.equal(seen.length, 1);
});

test('server filter and sort requests preserve rows, count and accepted page', () => {
  accept();
  const seen = [];
  for (const name of ['page', 'filter', 'sort']) wrapper().addEventListener(`expressive:${name}`, (event) => seen.push([name, event.detail.query]));
  const field = document.querySelector('[data-table-filter]');
  field.value = 'Delta';
  field.dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  const sort = document.querySelector('th[data-filter] button');
  sort.click();
  sort.click();
  sync();
  assert.deepEqual(seen, [['filter', 'Delta'], ['sort', undefined], ['sort', undefined]]);
  assert.equal(status(), '2 / 4');
  assert.equal(count(), '87');
  assert.deepEqual(displayed(), ['r3', 'r4']);
  assert.equal(sort.parentElement.getAttribute('aria-sort'), 'descending');
});

test('boundary buttons and invalid, disabled or unchanged sizes make no request', () => {
  accept({ page: 1, pageSize: 2, total: 1 });
  const seen = events();
  button('previous').click();
  button('next').click();
  accept();
  button('next').disabled = true;
  button('next').dispatchEvent(new window.MouseEvent('click', { bubbles: true, composed: true }));
  const control = document.querySelector('[data-table-page-size]');
  const input = () => control.dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  input();
  for (const value of ['', 'invalid', '0', '-1', '1.5', 'Infinity', '9007199254740992']) {
    control.add(new window.Option(value, value));
    control.value = value;
    input();
  }
  control.value = '4';
  control.disabled = true;
  input();
  control.disabled = false;
  control.multiple = true;
  input();
  control.multiple = false;
  control.selectedOptions[0].disabled = true;
  input();
  assert.deepEqual(seen, []);
  assert.equal(status(), '2 / 4');
});

test('an empty server size request uses page one and null preserves canceled filter ownership', () => {
  accept({ page: 1, pageSize: 2, total: 0 });
  const seen = [];
  wrapper().addEventListener('expressive:page', (event) => { seen.push(event.detail); event.preventDefault(); });
  const control = document.querySelector('[data-table-page-size]');
  control.value = '4';
  control.dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  assert.deepEqual(seen, [{ page: 1, pageSize: 4 }]);
  const field = document.querySelector('[data-table-filter]');
  wrapper().addEventListener('expressive:filter', (event) => event.preventDefault(), { once: true });
  field.dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  accept(null);
  assert.deepEqual(displayed(), ['r3', 'r4']);
  assert.equal(count(), '87');
  field.value = 'Delta';
  field.dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  assert.deepEqual(displayed(), ['r4']);
  assert.equal(count(), '1');
});

test('a newer accepted nested local request supersedes the older requested page', () => {
  document.querySelector('[data-table-filter]').value = '';
  wrapper().setAttribute('data-page-size', '1');
  sync();
  wrapper().addEventListener('expressive:page', () => {
    const control = document.querySelector('[data-table-page-size]');
    control.value = '4';
    control.dispatchEvent(new window.Event('change', { bubbles: true, composed: true }));
  }, { once: true });
  button('next').click();
  assert.equal(status(), '1 / 1');
  assert.equal(wrapper().getAttribute('data-page-size'), '4');
  assert.deepEqual(displayed(), ['r3', 'r4']);
});

test('server and local state remain isolated across independent and nested wrappers', () => {
  accept();
  const outer = wrapper();
  const other = outer.cloneNode(true);
  document.body.append(other);
  other.querySelector('[data-table-filter]').value = '';
  other.setAttribute('data-page-size', '1');
  Expressive.DataTables.sync(other);
  other.querySelector('[data-table-page="next"]').click();
  assert.equal(other.querySelector('[data-table-page-status]').textContent, '2 / 2');
  assert.equal(status(), '2 / 4');
  assert.equal(count(), '87');
  outer.append(other);
  Expressive.DataTables.setPage(other, { page: 1, pageSize: 2, total: 6 });
  const seen = [];
  outer.addEventListener('expressive:page', (event) => seen.push([event.target, event.detail]));
  other.querySelector('[data-table-page="next"]').click();
  assert.deepEqual(seen, [[other, { page: 2, pageSize: 2 }]]);
  assert.equal(other.querySelector('[data-table-page-status]').textContent, '1 / 3');
  Expressive.DataTables.sync(outer);
  assert.equal(status(), '2 / 4');
  assert.equal(other.querySelector('[data-table-page-status]').textContent, '1 / 3');
});
