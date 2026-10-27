import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody, window } from './setup.js';

const markup = `<div class="data-table" data-sort>
  <label>Search records<input type="search" data-table-filter></label>
  <span>Matching records: <output data-table-filter-count role="status" aria-live="polite"></output></span>
  <table><thead><tr>
    <th><input type="checkbox" aria-label="Select all"></th>
    <th data-filter><button type="button">Name</button></th><th>Status</th>
  </tr></thead><tbody>
    <tr id="alpha"><td><input type="checkbox" aria-label="Select Alpha"></td><th>Alpha</th><td>Ready</td></tr>
    <tr id="alpha-detail" class="data-table-detail"><td colspan="3">Beta detail</td></tr>
    <tr id="beta"><td><input type="checkbox" aria-label="Select Beta" checked></td><th>Beta</th><td>Ready</td></tr>
    <tr id="locked"><td><fieldset disabled><input type="checkbox" aria-label="Select locked"></fieldset></td><th>Alpha locked</th><td>Ready</td></tr>
    <tr id="secret" hidden><td><input type="checkbox" aria-label="Select secret"></td><th>Alpha secret</th><td>Ready</td></tr>
    <tr id="secret-detail" class="data-table-detail"><td colspan="3">Secret details</td></tr>
  </tbody></table></div>`;

const wrapper = () => document.querySelector('.data-table');
const search = () => document.querySelector('[data-table-filter]');
const box = (id) => document.querySelector(`#${id} input`);
const all = () => document.querySelector('thead input');
const input = (el) => el.dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
const query = (value) => { search().value = value; input(search()); };
const filtered = (id) => document.getElementById(id).hasAttribute('data-table-filter-hidden');
const count = () => document.querySelector('[data-table-filter-count]').textContent;

beforeEach(() => { resetBody(); document.body.innerHTML = markup; });

test('filter requests bubble with a trimmed case-preserving query before the default action', () => {
  const requests = [];
  wrapper().parentElement.addEventListener('expressive:filter', (e) => {
    requests.push({ detail: e.detail, target: e.target, flags: [e.bubbles, e.composed, e.cancelable], count: count() });
  }, { once: true });
  query('  ALpha  ');
  assert.deepEqual(requests, [{ detail: { query: 'ALpha' }, target: wrapper(), flags: [true, true, true], count: '' }]);
  assert.equal(count(), '2');
  let empty;
  wrapper().addEventListener('expressive:filter', (e) => { empty = e.detail.query; });
  query('');
  assert.equal(empty, '');
  assert.equal(count(), '3');
});

test('canceling preserves the current local view, count, order and focus until explicit sync', () => {
  query('beta');
  const before = document.querySelector('tbody').innerHTML;
  search().focus();
  wrapper().addEventListener('expressive:filter', (e) => e.preventDefault(), { once: true });
  query('Alpha');
  assert.equal(document.querySelector('tbody').innerHTML, before);
  assert.equal(count(), '1');
  assert.equal(document.activeElement, search());
  document.querySelector('[data-table-filter-count]').textContent = '87';
  Expressive.DataTables.sync(wrapper());
  assert.equal(filtered('alpha'), false);
  assert.equal(filtered('beta'), false);
  assert.equal(filtered('secret-detail'), true);
  assert.equal(count(), '87');
  query('beta');
  assert.equal(filtered('alpha'), true);
  assert.equal(count(), '1');
});

test('canceling listeners can replace records and silently sync before dispatch returns', () => {
  const requests = [];
  const otherEvents = [];
  wrapper().addEventListener('expressive:change', (e) => otherEvents.push(e.type));
  wrapper().addEventListener('expressive:sort', (e) => otherEvents.push(e.type));
  wrapper().addEventListener('expressive:filter', (e) => {
    e.preventDefault();
    requests.push(e.detail);
    document.querySelector('tbody').innerHTML = '<tr id="server"><td><input type="checkbox" checked></td><th>Unrelated server record</th><td>Ready</td></tr>';
    document.querySelector('[data-table-filter-count]').textContent = '87';
    Expressive.DataTables.sync(wrapper());
  });
  query('missing');
  assert.deepEqual(requests, [{ query: 'missing' }]);
  assert.deepEqual(otherEvents, []);
  assert.equal(filtered('server'), false);
  assert.equal(all().checked, true);
  assert.equal(count(), '87');
});

test('later server sync preserves author hiding and counts while selecting only displayed records', async () => {
  let requests = 0;
  wrapper().addEventListener('expressive:filter', (e) => { e.preventDefault(); requests++; });
  query('missing');
  await Promise.resolve();
  const body = document.querySelector('tbody');
  body.replaceWith(body.cloneNode(true));
  document.getElementById('alpha').style.display = 'none';
  document.querySelector('[data-table-filter-count]').textContent = '87';
  search().value = 'changed from script';
  Expressive.DataTables.sync(wrapper());
  assert.equal(count(), '87');
  assert.equal(requests, 1);
  assert.equal(filtered('beta'), false);
  assert.equal(filtered('alpha-detail'), true);
  assert.equal(filtered('secret-detail'), true);
  assert.equal(document.getElementById('secret').hidden, true);
  assert.equal(all().checked, true);
  all().checked = false;
  input(all());
  assert.deepEqual(['alpha', 'beta', 'locked', 'secret'].map((id) => box(id).checked), [false, false, false, false]);
  document.querySelector('tbody').append(document.getElementById('beta').cloneNode(true));
  Expressive.DataTables.sync(wrapper());
  assert.equal(count(), '87');
  assert.equal(requests, 1);
});

test('an older default action cannot overwrite a newer canceled filter request', () => {
  wrapper().addEventListener('expressive:filter', (e) => {
    if (e.detail.query === 'outer') {
      query('newer');
      return;
    }
    e.preventDefault();
    document.querySelector('tbody').innerHTML = '<tr id="server"><td><input type="checkbox" checked></td><th>Server result</th><td>Ready</td></tr>';
    document.querySelector('[data-table-filter-count]').textContent = '87';
    Expressive.DataTables.sync(wrapper());
  });
  query('outer');
  assert.equal(search().value, 'newer');
  assert.equal(filtered('server'), false);
  assert.equal(count(), '87');
  Expressive.DataTables.sync(wrapper());
  assert.equal(count(), '87', 'the newer request keeps ownership after dispatch');
});

test('server filter ownership stays within its wrapper and is independent of sort cancellation', () => {
  const server = wrapper();
  const local = server.cloneNode(true);
  document.body.append(local);
  server.addEventListener('expressive:filter', (e) => e.preventDefault());
  query('missing');
  Expressive.DataTables.sync(server);
  assert.equal(filtered('alpha'), false);
  const localSearch = local.querySelector('[data-table-filter]');
  localSearch.value = 'beta';
  input(localSearch);
  assert.equal(local.querySelector('[data-table-filter-count]').textContent, '1');
  assert.equal(local.querySelector('#alpha').hasAttribute('data-table-filter-hidden'), true);
  const body = server.querySelector('tbody');
  body.prepend(server.querySelector('#beta'));
  server.querySelector('th button').click();
  assert.equal(body.firstElementChild.id, 'alpha', 'canceling filtering does not cancel local sorting');
  const localBody = local.querySelector('tbody');
  localBody.prepend(local.querySelector('#beta'));
  const order = [...localBody.children];
  local.addEventListener('expressive:sort', (e) => e.preventDefault());
  local.querySelector('th button').click();
  assert.deepEqual([...localBody.children], order);
  localSearch.value = 'alpha';
  input(localSearch);
  assert.equal(local.querySelector('[data-table-filter-count]').textContent, '2');
});

test('silent local sync and unrelated controls request no filter operation', () => {
  let requests = 0;
  const listener = () => requests++;
  document.addEventListener('expressive:filter', listener);
  try {
    search().value = 'beta';
    Expressive.DataTables.sync(wrapper());
    assert.equal(count(), '1');
    const field = search();
    field.removeAttribute('data-table-filter');
    input(field);
    const outside = document.createElement('input');
    outside.type = 'search';
    outside.setAttribute('data-table-filter', '');
    document.body.append(outside);
    input(outside);
    assert.equal(requests, 0);
  } finally {
    document.removeEventListener('expressive:filter', listener);
  }
});

test('text filtering searches only marked columns and keeps record details together', () => {
  query('  ALPHA  ');
  assert.equal(filtered('alpha'), false);
  assert.equal(filtered('alpha-detail'), false);
  assert.equal(filtered('beta'), true);
  assert.equal(count(), '2');
  query('Ready');
  assert.equal(count(), '0', 'an unmarked status column cannot match');
  query('Beta detail');
  assert.equal(count(), '0', 'detail text cannot match');
  query('beta');
  assert.equal(count(), '1');
  assert.equal(filtered('alpha-detail'), true);
});

test('clearing a filter preserves author-hidden records and details, including edits during filtering', () => {
  document.getElementById('alpha-detail').hidden = true;
  query('beta');
  document.getElementById('alpha').hidden = true;
  query('');
  assert.equal(document.getElementById('alpha').hidden, true);
  assert.equal(document.getElementById('alpha-detail').hidden, true);
  assert.equal(document.getElementById('secret').hidden, true);
  assert.equal(filtered('secret-detail'), true);
  assert.equal(count(), '2');
  document.getElementById('alpha').hidden = false;
  Expressive.DataTables.sync(wrapper());
  assert.equal(filtered('alpha'), false);
  assert.equal(document.getElementById('alpha-detail').hidden, true);
});

test('select-all changes only enabled visible records and preserves other selections', () => {
  let selected;
  wrapper().addEventListener('expressive:change', (e) => { selected = e.detail.selected.map((row) => row.id); });
  query('alpha');
  assert.deepEqual([all().checked, all().indeterminate], [false, false]);
  all().checked = true;
  input(all());
  assert.deepEqual(['alpha', 'beta', 'locked', 'secret'].map((id) => box(id).checked), [true, true, false, false]);
  assert.deepEqual(selected, ['alpha', 'beta']);
  query('');
  assert.deepEqual([all().checked, all().indeterminate], [true, false]);
  query('missing');
  assert.deepEqual([all().checked, all().indeterminate], [false, false]);
  all().checked = true;
  input(all());
  assert.equal(box('beta').checked, true);
});

test('select-all skips author-hidden rows even without filtering', () => {
  search().remove();
  all().checked = true;
  input(all());
  assert.equal(box('alpha').checked, true);
  assert.equal(box('secret').checked, false);
});

test('sync applies prefilled queries and replacement records without emitting a selection change', () => {
  search().value = 'beta';
  let changes = 0;
  wrapper().addEventListener('expressive:change', () => changes++);
  Expressive.DataTables.sync(wrapper());
  assert.equal(filtered('alpha'), true);
  assert.equal(count(), '1');
  const clone = document.getElementById('beta').cloneNode(true);
  clone.id = 'beta-copy';
  document.querySelector('tbody').append(clone);
  Expressive.DataTables.sync(wrapper());
  assert.equal(count(), '2');
  assert.equal(changes, 0);
});

test('query uses data-value and grouped header column positions across table bodies', () => {
  document.querySelector('thead').innerHTML = `<tr><th rowspan="2"><input type="checkbox"></th><th colspan="2" data-filter>Ignored group</th></tr>
    <tr><th>Name</th><th data-filter>Status</th></tr>`;
  document.querySelector('#alpha > td:last-child').dataset.value = 'approved';
  const body = document.createElement('tbody');
  body.innerHTML = '<tr id="other"><td></td><th>Other</th><td>Approved</td></tr><tr id="other-detail" class="data-table-detail"><td colspan="3">Extra</td></tr>';
  document.querySelector('table').append(body);
  query('approved');
  assert.equal(filtered('alpha'), false);
  assert.equal(filtered('other'), false);
  assert.equal(filtered('other-detail'), false);
  assert.equal(count(), '2');
  query('Alpha');
  assert.equal(count(), '0', 'a spanning group header does not opt in its columns');
});

test('sorting keeps filtered groups intact and clearing restores the sorted records', () => {
  query('beta');
  document.querySelector('th button').click();
  query('');
  const ids = [...document.querySelectorAll('tbody tr')].map((row) => row.id);
  assert.equal(ids.indexOf('alpha-detail'), ids.indexOf('alpha') + 1);
  assert.equal(filtered('alpha'), false);
  assert.equal(filtered('beta'), false);
});

test('unmarked inputs do not filter, and a nonempty query with no chosen columns matches nothing', () => {
  search().removeAttribute('data-table-filter');
  const field = document.querySelector('input[type="search"]');
  field.value = 'missing';
  input(field);
  assert.equal(filtered('alpha'), false);
  field.setAttribute('data-table-filter', '');
  document.querySelector('th[data-filter]').removeAttribute('data-filter');
  input(field);
  assert.equal(count(), '0');
  field.value = '';
  input(field);
  assert.equal(count(), '3');
});

test('a marked search outside a table is ignored', () => {
  const field = document.createElement('input');
  field.type = 'search';
  field.setAttribute('data-table-filter', '');
  document.body.append(field);
  let error;
  const onError = (event) => { error = event.error; event.preventDefault(); };
  window.addEventListener('error', onError);
  try {
    input(field);
    assert.equal(error, undefined);
  } finally {
    window.removeEventListener('error', onError);
  }
});

test('nested tables and independent wrappers keep their own filter controls and rows', () => {
  const outer = wrapper();
  const detail = document.querySelector('#alpha-detail td');
  detail.innerHTML = markup.replaceAll('id="', 'id="nested-');
  const nested = detail.querySelector('.data-table');
  nested.querySelector('[data-table-filter]').value = 'beta';
  input(nested.querySelector('[data-table-filter]'));
  assert.equal(outer.querySelector('[data-table-filter-count]').textContent, '');
  assert.equal(nested.querySelector('[data-table-filter-count]').textContent, '1');
  assert.equal(filtered('alpha'), false);
  outer.querySelector('[data-table-filter]').remove();
  Expressive.DataTables.sync(outer);
  assert.equal(filtered('alpha'), false, 'outer sync does not use a nested search');
});

test('author CSS hiding excludes records and keeps their details filtered', () => {
  document.getElementById('alpha').style.display = 'none';
  query('alpha');
  assert.equal(count(), '1');
  assert.equal(filtered('alpha-detail'), true);
  all().checked = true;
  input(all());
  assert.equal(box('alpha').checked, false);
});
