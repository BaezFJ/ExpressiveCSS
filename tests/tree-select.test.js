// Tree select, the parts jsdom can run: the tree data-parent describes, the
// branch options it disables, the form value, refresh() and destroy(). Keys,
// clicks and styles run in real engines in tree-select-browser.test.js.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody } from './setup.js';

beforeEach(resetBody);

const PLACES = `<option value="" disabled selected>Choose a place</option>
  <option value="europe" disabled>Europe</option>
  <option value="france" data-parent="europe" disabled>France</option>
  <option value="paris" data-parent="france">Paris</option>
  <option value="lyon" data-parent="france">Lyon</option>
  <option value="spain" data-parent="europe">Spain</option>
  <option value="asia">Asia</option>
  <option value="tokyo" data-parent="asia">Tokyo</option>
  <option value="kyoto" data-parent="asia" disabled>Kyoto</option>`;

/** Starts a tree select holding `options` in a form and returns its instance. */
function start(options = PLACES, attributes = '') {
  document.body.innerHTML = `<form><div class="field">
    <select id="place" name="place" data-tree ${attributes}>${options}</select>
    <label for="place">Place</label>
  </div></form>`;
  return Expressive.TreeSelect.init(document.getElementById('place'));
}

/** The rows under `list` as text, with each branch's rows nested after it. */
function shape(list) {
  return Array.from(list.querySelectorAll(':scope > li'), (li) => {
    const group = li.querySelector(':scope > ul[role="group"]');
    return group ? [li.firstChild.textContent, shape(group)] : li.firstChild.textContent;
  });
}

const row = (instance, text) => Array.from(instance.tree.querySelectorAll('li')).find((li) => li.firstChild.textContent === text);

test('options nest under the option their data-parent names, in document order', () => {
  const instance = start();
  assert.deepEqual(shape(instance.tree), [
    'Choose a place',
    ['Europe', [['France', ['Paris', 'Lyon']], 'Spain']],
    ['Asia', ['Tokyo', 'Kyoto']]
  ]);
});

test('a child listed before its parent still sits under it', () => {
  const instance = start(`<option value="paris" data-parent="france">Paris</option><option value="france">France</option>`);
  assert.deepEqual(shape(instance.tree), [['France', ['Paris']]]);
});

test('a missing, empty or self-naming parent makes a root', () => {
  const instance = start(`<option value="a" data-parent="nowhere">A</option>
    <option value="b" data-parent="">B</option>
    <option value="c" data-parent="c">C</option>`);
  assert.deepEqual(shape(instance.tree), ['A', 'B', 'C']);
});

test('options whose parents loop become roots, and their children stay under them', () => {
  const instance = start(`<option value="a" data-parent="b">A</option>
    <option value="b" data-parent="a">B</option>
    <option value="c" data-parent="a">C</option>`);
  assert.deepEqual(shape(instance.tree), [['A', ['C']], 'B']);
});

test('a parent value shared by two options names the first', () => {
  const instance = start(`<option value="x">First</option>
    <option value="x">Second</option>
    <option value="y" data-parent="x">Child</option>`);
  assert.deepEqual(shape(instance.tree), [['First', ['Child']], 'Second']);
});

test('the popup is a named tree of treeitems, with branches collapsed and leaves selectable', () => {
  const instance = start();
  // Menu styles the rows of its own <menu>, so the tree is a list inside it.
  assert.equal(instance.menuEl.getAttribute('role'), 'presentation');
  assert.equal(instance.menuEl.hasAttribute('aria-multiselectable'), false);
  assert.equal(instance.tree.parentElement, instance.menuEl);
  assert.equal(instance.tree.getAttribute('role'), 'tree');
  assert.equal(instance.input.getAttribute('aria-haspopup'), 'tree');
  assert.equal(instance.input.getAttribute('aria-controls'), instance.tree.id);
  const label = document.querySelector('label');
  assert.ok(label.id);
  assert.equal(instance.tree.getAttribute('aria-labelledby'), label.id);

  const europe = row(instance, 'Europe');
  assert.equal(europe.getAttribute('role'), 'treeitem');
  assert.equal(europe.ariaExpanded, 'false');
  assert.equal(europe.hasAttribute('aria-selected'), false);
  assert.equal(europe.querySelector(':scope > ul').getAttribute('role'), 'group');
  assert.equal(europe.querySelector(':scope > ul').hidden, true);
  assert.equal(row(instance, 'Paris').ariaSelected, 'false');
  assert.equal(row(instance, 'Kyoto').ariaDisabled, 'true');
  assert.equal(row(instance, 'Asia').hasAttribute('aria-disabled'), false);
});

test('branch options are disabled while it runs, so the form never carries a branch', () => {
  const instance = start(PLACES.replace('<option value="france" data-parent="europe" disabled>', '<option value="france" data-parent="europe" disabled selected>'));
  const disabled = (value) => instance.el.querySelector(`[value="${value}"]`).disabled;
  assert.deepEqual(['europe', 'france', 'asia'].map(disabled), [true, true, true]);
  // A branch the markup selects shows, as a disabled placeholder does. jsdom
  // puts a disabled option in the form data, so the browser test checks that
  // a branch submits nothing.
  assert.equal(instance.input.value, 'France');
});

test('a required tree select with only its placeholder chosen is invalid', () => {
  const instance = start(PLACES, 'required');
  assert.equal(instance.el.checkValidity(), false);
  instance.el.value = 'paris';
  assert.equal(instance.el.checkValidity(), true);
});

test('a form reset restores the default option and the field', async () => {
  const instance = start();
  instance._selectOptionElement(row(instance, 'Paris'));
  assert.equal(instance.input.value, 'Paris');
  assert.equal(new (document.defaultView.FormData)(instance.el.form).get('place'), 'paris');
  instance.el.form.reset();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(instance.input.value, 'Choose a place');
  assert.equal(row(instance, 'Paris').ariaSelected, 'false');
});

test('a disabled tree select has no menu to open', () => {
  const instance = start(PLACES, 'disabled');
  assert.equal(instance.input.disabled, true);
  assert.equal(instance.menu, undefined);
  assert.equal(row(instance, 'Paris').ariaDisabled, 'true');
});

test('destroy() restores the native select and only the disabled attributes the markup had', () => {
  const instance = start();
  instance.destroy();
  const select = document.getElementById('place');
  const disabled = Array.from(select.options, (option) => option.disabled ? option.textContent : null).filter(Boolean);
  assert.deepEqual(disabled, ['Choose a place', 'Europe', 'France', 'Kyoto']);
  assert.equal(document.querySelector('menu'), null);
  assert.equal(select.parentElement.matches('.field'), true);
  assert.equal(Expressive.TreeSelect.getInstance(select), undefined);
});

test('refresh() disables a new branch and re-enables an option that stops being one', () => {
  const instance = start();
  const select = instance.el;
  select.querySelector('[value="tokyo"]').remove();
  select.querySelector('[value="kyoto"]').remove();
  const madrid = new (document.defaultView.Option)('Madrid', 'madrid');
  madrid.dataset.parent = 'spain';
  select.add(madrid);
  instance.refresh();
  assert.equal(select.querySelector('[value="asia"]').disabled, false);
  assert.equal(select.querySelector('[value="spain"]').disabled, true);
  assert.equal(row(instance, 'Spain').ariaExpanded, 'false');
  assert.equal(row(instance, 'Asia').hasAttribute('aria-expanded'), false);
});

test('FormSelect.init() leaves a tree select alone', () => {
  const instance = start();
  Expressive.FormSelect.init(instance.el);
  assert.equal(Expressive.FormSelect.getInstance(instance.el), undefined);
  assert.equal(Expressive.TreeSelect.getInstance(instance.el), instance);
  assert.equal(document.querySelectorAll('.field').length, 1);
  assert.equal(document.querySelectorAll('menu').length, 1);
});

test('AutoInit starts a TreeSelect on a data-tree select and a FormSelect on any other', () => {
  document.body.innerHTML = `<div class="field"><select id="plain"><option>One</option></select><label for="plain">Plain</label></div>
    <div class="field"><select id="tree" data-tree>${PLACES}</select><label for="tree">Tree</label></div>`;
  Expressive.AutoInit();
  assert.ok(Expressive.FormSelect.getInstance(document.getElementById('plain')));
  assert.equal(Expressive.TreeSelect.getInstance(document.getElementById('plain')), undefined);
  assert.ok(Expressive.TreeSelect.getInstance(document.getElementById('tree')));
  assert.equal(Expressive.FormSelect.getInstance(document.getElementById('tree')), undefined);
});

test('the tree takes the field\'s aria-labelledby or aria-label before its label', () => {
  document.body.innerHTML = `<h2 id="heading">Destination</h2>
    <div class="field"><select id="a" data-tree aria-labelledby="heading">${PLACES}</select><label for="a">Place</label></div>
    <div class="field"><select id="b" data-tree aria-label="Where to">${PLACES}</select></div>`;
  const named = Expressive.TreeSelect.init(document.getElementById('a'));
  const labelled = Expressive.TreeSelect.init(document.getElementById('b'));
  assert.equal(named.tree.getAttribute('aria-labelledby'), 'heading');
  assert.equal(labelled.tree.ariaLabel, 'Where to');
  assert.equal(labelled.tree.hasAttribute('aria-labelledby'), false);
});

// The branches carry no disabled attribute, so the browser picks the first
// one, Asia, before TreeSelect starts.
const ASIA = `<option value="asia">Asia</option>
  <option value="tokyo" data-parent="asia">Tokyo</option>
  <option value="kyoto" data-parent="asia">Kyoto</option>`;

test('a branch the browser picked by default gives way to the first enabled leaf', () => {
  const instance = start(ASIA, 'required');
  assert.equal(instance.el.value, 'tokyo');
  assert.equal(instance.input.value, 'Tokyo');
  assert.equal(row(instance, 'Tokyo').ariaSelected, 'true');
  assert.equal(instance.el.checkValidity(), true);
});

test('a branch the markup selected stays selected', () => {
  const instance = start(ASIA.replace('<option value="asia">', '<option value="asia" selected>'));
  assert.equal(instance.el.value, 'asia');
  assert.equal(instance.input.value, 'Asia');
});

test('without a placeholder or an enabled leaf, nothing is chosen and a required select is invalid', () => {
  const instance = start('<option value="a">A</option><option value="b" data-parent="a" disabled>B</option>', 'required');
  assert.equal(instance.el.selectedIndex, -1);
  assert.equal(instance.input.value, '');
  assert.equal(instance.el.checkValidity(), false);
});

test('opening inside a page list item or another tree expands only the tree\'s own branches', () => {
  const cases = [
    ['', ''],
    ['', '<ul hidden id="unrelated"><li>Other</li></ul>'],
    // A tree select inside a page's own ARIA tree.
    [' role="treeitem"', '<ul role="group" hidden id="unrelated"><li role="treeitem">Other</li></ul>']
  ];
  for (const [role, sibling] of cases) {
    document.body.innerHTML = `<ul><li id="outer"${role}><form><div class="field">
      <select id="place" name="place" data-tree>${PLACES.replace('<option value="paris" data-parent="france">', '<option value="paris" data-parent="france" selected>')}</select>
      <label for="place">Place</label></div></form>${sibling}</li></ul>`;
    const instance = Expressive.TreeSelect.init(document.getElementById('place'));
    instance._focusSelected();
    assert.equal(row(instance, 'Europe').ariaExpanded, 'true');
    assert.equal(row(instance, 'France').ariaExpanded, 'true');
    assert.equal(document.getElementById('outer').hasAttribute('aria-expanded'), false);
    if (sibling) assert.equal(document.getElementById('unrelated').hidden, true);
  }
});

test('destroying the object FormSelect.init() returned for a tree select leaves the tree select in place', () => {
  const instance = start();
  Expressive.FormSelect.init(instance.el).destroy();
  assert.equal(instance.el.parentElement.matches('.hide-select'), true);
  assert.equal(instance.el.tabIndex, -1);
  assert.equal(Expressive.TreeSelect.getInstance(instance.el), instance);
  assert.ok(instance.input.isConnected);
  assert.ok(instance.tree.isConnected);
});

test('destroying a skipped browser-default select leaves its tabindex alone', () => {
  document.body.innerHTML = '<select id="native" class="browser-default"><option>One</option></select>';
  const select = document.getElementById('native');
  Expressive.FormSelect.init(select).destroy();
  assert.equal(select.hasAttribute('tabindex'), false);
});

test('typeahead moves past the focused row on a new search and stays on it while typing more', () => {
  const instance = start(`<option value="apple">Apple</option><option value="apricot">Apricot</option><option value="banana">Banana</option>`);
  try {
    row(instance, 'Apple').focus();
    instance._typeahead(row(instance, 'Apple'), 'a');
    assert.equal(document.activeElement, row(instance, 'Apricot'));
    instance._typeahead(row(instance, 'Apricot'), 'p');
    assert.equal(document.activeElement, row(instance, 'Apricot'));
  } finally {
    instance.destroy();
  }
});
