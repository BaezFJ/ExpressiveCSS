import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody } from './setup.js';

test('autocomplete bounds rendered rows and validates images without coercing selected IDs', () => {
  resetBody();
  document.body.innerHTML = '<div class="field"><input id="query"></div>';
  const instance = Expressive.Autocomplete.init(document.getElementById('query'), { minLength: 0, isMultiSelect: true, maxResults: 2 });
  try {
    instance.selectedValues = [{ id: 1 }];
    instance.selectedValues.some = () => { throw new Error('Rendering must not scan selected entries per row'); };
    instance.setMenuItems([{ id: 1, image: 'javascript:alert(1)' }, { id: '1', image: '/safe.png' }, { id: 3 }]);
    const rows = instance.container.querySelectorAll('[role="option"]');
    assert.equal(rows.length, 2);
    assert.equal(rows[0].getAttribute('aria-selected'), 'true');
    assert.equal(rows[1].getAttribute('aria-selected'), 'false');
    assert.equal(rows[0].querySelector('img'), null);
    assert.equal(rows[1].querySelector('img').src, 'http://localhost/safe.png');
    instance.options.maxResults = 0;
    instance._renderMenu();
    assert.equal(instance.container.querySelectorAll('[role="option"]').length, 0);
    instance.options.maxResults = Infinity;
    instance._renderMenu();
    assert.equal(instance.container.querySelectorAll('[role="option"]').length, 3);
  } finally { instance.destroy(); resetBody(); }
});

test('shared image URL policy accepts image schemes and rejects malformed or executable URLs', async () => {
  const { imageURL } = await import('../dist/js/internal/core/imageURL.mjs');
  for (const value of ['javascript:alert(1)', 'data:text/html,hello', 'file:///tmp/image', 'http://[', '', null]) {
    assert.equal(imageURL(value, 'https://example.com/'), undefined);
  }
  for (const value of ['https://example.com/a.png', 'blob:https://example.com/id', 'data:image/png;base64,AAAA']) {
    assert.equal(imageURL(value, 'https://example.com/'), value);
  }
});

test('autocomplete caps initial static data and shares the selected-ID set', () => {
  resetBody();
  document.body.innerHTML = '<div class="field"><input id="query"></div>';
  const original = Expressive.Autocomplete.prototype._createMenuItem;
  const sets = [];
  Expressive.Autocomplete.prototype._createMenuItem = function (entry, selectedIds) {
    sets.push(selectedIds);
    return original.call(this, entry, selectedIds);
  };
  let instance;
  try {
    instance = Expressive.Autocomplete.init(document.getElementById('query'), {
      data: Array.from({ length: 10000 }, (_, id) => ({ id })),
      selected: [1], isMultiSelect: true, maxResults: 20
    });
    assert.equal(instance.container.querySelectorAll('[role="option"]').length, 20);
    assert.equal(sets.length, 20);
    assert.ok(sets[0] instanceof Set);
    assert.ok(sets.every(set => set === sets[0]));
    assert.equal(instance.container.querySelectorAll('[role="option"]')[1].getAttribute('aria-selected'), 'true');
  } finally {
    Expressive.Autocomplete.prototype._createMenuItem = original;
    instance?.destroy();
    resetBody();
  }
});

test('first focus of an empty autocomplete does not search, but typing still does', () => {
  resetBody();
  document.body.innerHTML = '<div class="field"><input id="query"></div>';
  const input = document.getElementById('query');
  const searches = [];
  const instance = Expressive.Autocomplete.init(input, { onSearch: text => searches.push(text) });
  try {
    input.focus();
    assert.deepEqual(searches, []);
    input.value = 'apple';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    assert.deepEqual(searches, ['apple']);
  } finally { instance.destroy(); resetBody(); }
});
