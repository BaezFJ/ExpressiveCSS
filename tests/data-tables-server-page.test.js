import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody } from './setup.js';

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
