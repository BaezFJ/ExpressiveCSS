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
function start(options = PLACES, attributes = '', settings = {}) {
  document.body.innerHTML = `<form><div class="field">
    <select id="place" name="place" data-tree ${attributes}>${options}</select>
    <label for="place">Place</label>
  </div></form>`;
  return Expressive.TreeSelect.init(document.getElementById('place'), settings);
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


test('AutoInit tree search names its popup and tree without putting search inside the tree', () => {
  document.body.innerHTML = `<label for="search-tree">Destination</label><select id="search-tree" data-tree
    aria-label="Chosen place" data-tree-select-options='{"searchable":true,"i18n":{"searchLabel":"Find leaves","noResults":"Nothing here"}}'>${PLACES}</select>`;
  const before = Expressive.Menu._menus.length;
  Expressive.AutoInit();
  const instance = Expressive.TreeSelect.getInstance(document.getElementById('search-tree'));
  try {
    const search = instance.menuEl.querySelector('input[type="search"]');
    assert.ok(search);
    assert.equal(search.getAttribute('aria-label'), 'Find leaves');
    assert.equal(search.hasAttribute('name'), false);
    assert.equal(instance.menuEl.getAttribute('aria-label'), 'Chosen place');
    assert.equal(instance.tree.getAttribute('aria-label'), 'Chosen place');
    assert.equal(instance.tree.contains(search), false);
    assert.equal(instance.tree.contains(instance.menuEl.querySelector('[role="status"]')), false);
    assert.equal(instance.tree.getAttribute('role'), 'tree');
    assert.equal(instance.tree.querySelector('[role="treeitem"]').tagName, 'LI');
  } finally { instance.destroy(); }
  assert.equal(Expressive.Menu._menus.length, before);
  assert.equal(document.querySelector('input[type="search"]'), null);
  assert.equal(document.querySelector('label').htmlFor, 'search-tree');
});

for (const attributes of ['multiple', 'class="browser-default"']) {
  test(`tree search leaves unsupported ${attributes} mode unchanged`, () => {
    const instance = start(PLACES, attributes, { searchable: true });
    try {
      assert.equal(document.querySelector('input[type="search"]'), null);
      if (instance.menuEl) assert.equal(instance.input.getAttribute('aria-haspopup'), 'tree');
    } finally { instance.destroy(); }
  });
}


function filterTree(instance, query) {
  const input = instance.menuEl.querySelector('input[type="search"]');
  input.value = query;
  input.dispatchEvent(new document.defaultView.Event('input', { bubbles: true }));
}
const visibleTree = instance => instance._visibleRows().map(li => li.firstChild.textContent);
const treeExpansion = instance => Object.fromEntries([...instance.tree.querySelectorAll('[aria-expanded]')]
  .map(li => [li.firstChild.textContent, li.ariaExpanded]));

test('tree filtering reveals leaf ancestors and restores expansion across queries and temporary toggles', () => {
  const instance = start(PLACES, '', { searchable: true });
  let changes = 0;
  instance.el.addEventListener('change', () => changes++);
  try {
    instance.el.value = 'lyon';
    instance.refresh();
    instance._activate(row(instance, 'Asia'));
    const before = treeExpansion(instance);
    filterTree(instance, '  pAr  ');
    assert.deepEqual(visibleTree(instance), ['Europe', 'France', 'Paris']);
    assert.equal(row(instance, 'Europe').ariaExpanded, 'true');
    assert.equal(row(instance, 'France').ariaExpanded, 'true');
    instance._activate(row(instance, 'Europe'));
    filterTree(instance, 'tok');
    assert.deepEqual(visibleTree(instance), ['Asia', 'Tokyo']);
    filterTree(instance, '');
    assert.deepEqual(treeExpansion(instance), before);
    assert.equal(instance.el.value, 'lyon');
    assert.equal(instance.input.value, 'Lyon');
    assert.deepEqual([...new document.defaultView.FormData(instance.el.form)], [['place', 'lyon']]);
    assert.equal(changes, 0);
  } finally { instance.destroy(); }
});

test('tree search matches literal leaf labels only and reports disabled matches without unsafe status markup', () => {
  const options = PLACES.replace('>Paris</option>', '>Café [1]</option>') + '<option value="duplicate" data-parent="france">Tokyo</option>';
  const instance = start(options, '', { searchable: true, i18n: { noResults: '<img src=x>' } });
  try {
    filterTree(instance, '[1]');
    assert.deepEqual(visibleTree(instance), ['Europe', 'France', 'Café [1]']);
    for (const query of ['france', 'paris', 'cafe', '.*']) {
      filterTree(instance, query);
      assert.deepEqual(visibleTree(instance), []);
      assert.equal(instance.menuEl.querySelector('[role="status"]').textContent, '<img src=x>');
      assert.equal(instance.menuEl.querySelector('img'), null);
    }
    filterTree(instance, 'tokyo');
    assert.equal(instance._visibleRows().filter(li => li.firstChild.textContent === 'Tokyo').length, 2);
    filterTree(instance, 'kyoto');
    assert.deepEqual(visibleTree(instance), ['Asia', 'Kyoto']);
    assert.equal(instance.menuEl.querySelector('[role="status"]').textContent, '');
    assert.equal(row(instance, 'Kyoto').ariaDisabled, 'true');
    const chosen = instance.el.value;
    instance._activate(row(instance, 'Kyoto'));
    assert.equal(instance.el.value, chosen);
  } finally { instance.destroy(); }
});

test('filtered navigation skips own-hidden children and hidden branches cannot activate or open as siblings', () => {
  const instance = start(PLACES, '', { searchable: true });
  try {
    filterTree(instance, 'lyon');
    assert.deepEqual(visibleTree(instance), ['Europe', 'France', 'Lyon']);
    instance._openOrEnter(row(instance, 'France'));
    assert.equal(document.activeElement, row(instance, 'Lyon'));
    const asia = row(instance, 'Asia');
    const before = asia.ariaExpanded;
    instance._activate(asia);
    assert.equal(asia.ariaExpanded, before);
    instance._openSiblings(row(instance, 'Europe'));
    assert.equal(asia.ariaExpanded, before);
    assert.equal(row(instance, 'Lyon').tabIndex, -1);
  } finally { instance.destroy(); }
});


const treeTick = () => new Promise(resolve => setTimeout(resolve, 0));
const searchSettings = { searchable: true, menuOptions: { inDuration: 0, outDuration: 0 } };

test('refresh retains query, caret and the original expansion baseline while options change', async () => {
  const instance = start(PLACES, '', searchSettings);
  try {
    instance._activate(row(instance, 'Asia'));
    instance.menu.open();
    await treeTick();
    filterTree(instance, 'par');
    const search = instance.menuEl.querySelector('input[type="search"]');
    search.focus();
    search.setSelectionRange(1, 1);
    instance.refresh();
    assert.equal(document.activeElement, search);
    assert.equal(search.selectionStart, 1);
    assert.deepEqual(visibleTree(instance), ['Europe', 'France', 'Paris']);
    instance.el.querySelector('[value="asia"]').remove();
    const ocean = new document.defaultView.Option('Oceania', 'ocean');
    const leaf = new document.defaultView.Option('Paris Island', 'island');
    leaf.dataset.parent = 'ocean';
    instance.el.append(ocean, leaf);
    instance.refresh();
    assert.deepEqual(visibleTree(instance), ['Europe', 'France', 'Paris', 'Oceania', 'Paris Island']);
    filterTree(instance, '');
    assert.deepEqual(treeExpansion(instance), { Europe: 'false', France: 'false', Oceania: 'false' });
    filterTree(instance, 'missing');
    instance.refresh();
    assert.equal(document.activeElement, search);
    assert.equal(search.value, 'missing');
  } finally { instance.destroy(); }
});

test('canceled reset retains tree search and native reset restores the pre-query branches silently', async () => {
  const instance = start(PLACES, '', searchSettings);
  let changes = 0;
  instance.el.addEventListener('change', () => changes++);
  try {
    instance.el.value = 'lyon';
    instance.refresh();
    instance._activate(row(instance, 'Asia'));
    const before = treeExpansion(instance);
    instance.menu.open();
    await treeTick();
    filterTree(instance, 'par');
    const during = treeExpansion(instance);
    instance.el.form.addEventListener('reset', event => event.preventDefault(), { once: true });
    instance.el.form.reset();
    await treeTick();
    assert.equal(instance.menuEl.querySelector('input[type="search"]').value, 'par');
    assert.equal(instance.el.value, 'lyon');
    assert.deepEqual(treeExpansion(instance), during);
    instance.el.form.reset();
    await treeTick();
    assert.equal(instance.menu.isOpen, false);
    assert.equal(instance.menuEl.querySelector('input[type="search"]').value, '');
    assert.equal(instance.menuEl.querySelector('[role="status"]').textContent, '');
    assert.equal(instance.el.value, '');
    assert.deepEqual(treeExpansion(instance), before);
    assert.equal(changes, 0);
  } finally { instance.destroy(); }
});

for (const boundary of ['select', 'fieldset']) {
  test(`disabling the ${boundary} during a query restores its original expansion on refresh`, async () => {
    const instance = start(PLACES, '', searchSettings);
    let disabled = instance.el;
    try {
      if (boundary === 'fieldset') {
        disabled = document.createElement('fieldset');
        instance.wrapper.before(disabled);
        disabled.append(instance.wrapper);
      }
      instance._activate(row(instance, 'Asia'));
      const before = treeExpansion(instance);
      instance.menu.open();
      await treeTick();
      filterTree(instance, 'par');
      disabled.disabled = true;
      instance.refresh();
      assert.equal(instance.menu.isOpen, false);
      assert.equal(instance.input.disabled, true);
      assert.equal(instance.menuEl.querySelector('input[type="search"]').value, '');
      assert.deepEqual(treeExpansion(instance), before);
      disabled.disabled = false;
      instance.refresh();
      assert.equal(instance.input.disabled, false);
      assert.deepEqual(treeExpansion(instance), before);
    } finally { instance.destroy(); }
  });
}


test('two searchable trees keep independent queries, expansion baselines and branch ownership', () => {
  document.body.innerHTML = ['first', 'second'].map(id => `<label for="${id}">${id}</label>
    <select id="${id}" data-tree data-tree-select-options='{"searchable":true}'>${PLACES}</select>`).join('');
  Expressive.AutoInit();
  const first = Expressive.TreeSelect.getInstance(document.getElementById('first'));
  const second = Expressive.TreeSelect.getInstance(document.getElementById('second'));
  try {
    first._activate(row(first, 'Asia'));
    second._activate(row(second, 'Europe'));
    const before = treeExpansion(first);
    filterTree(first, 'par');
    filterTree(second, 'tok');
    const secondExpansion = treeExpansion(second);
    filterTree(first, '');
    assert.deepEqual(treeExpansion(first), before);
    assert.deepEqual(visibleTree(second), ['Asia', 'Tokyo']);
    assert.deepEqual(treeExpansion(second), secondExpansion);
    assert.equal(second.menuEl.querySelector('input[type="search"]').value, 'tok');
    first.destroy();
    assert.equal(second.el.querySelector('[value="asia"]').disabled, true);
    assert.ok(second.menuEl.isConnected);
  } finally {
    if (Expressive.TreeSelect.getInstance(first.el)) first.destroy();
    second.destroy();
  }
});
