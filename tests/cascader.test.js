// Cascader, the parts jsdom can run: reading the nested lists, the input's
// attributes, the starting path, the columns and teardown. jsdom has no
// popovers or form-associated custom elements, so opening in the top layer,
// form data, reset, validity and disabled state run in real engines in
// cascader-browser.test.js.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody } from './setup.js';

beforeEach(resetBody);

const places = (marks = {}) => `
  <li data-value="us" ${marks.us ?? ''}>United States
    <ul>
      <li data-value="ca" ${marks.ca ?? ''}>California
        <ul>
          <li data-value="sf" ${marks.sf ?? ''}>San Francisco</li>
          <li data-value="la" ${marks.la ?? ''}>Los Angeles</li>
        </ul>
      </li>
      <li data-value="wa">Washington <ul></ul></li>
    </ul>
  </li>
  <li data-value="cn">Canada</li>`;

/** Starts a cascader over `list` and returns its instance. */
function start(list = places(), input = '<input id="place" name="place" type="text">') {
  document.body.innerHTML = `<form><div class="field cascader">${input}<label for="place">Place</label>
    <ul class="cascader-options">${list}</ul></div></form>`;
  return Expressive.Cascader.init(document.querySelector('.cascader'));
}

test('AutoInit starts a cascader on .cascader and makes its input a read-only combobox with a dialog', () => {
  start();
  Expressive.AutoInit();
  const cascader = Expressive.Cascader.getInstance(document.querySelector('.cascader'));
  try {
    const input = cascader.input;
    assert.equal(input.readOnly, true);
    assert.equal(input.getAttribute('role'), 'combobox');
    assert.equal(input.getAttribute('aria-haspopup'), 'dialog');
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    assert.equal(input.getAttribute('aria-controls'), cascader.popover.id);
    assert.equal(document.getElementById(cascader.popover.id), cascader.popover);
    assert.deepEqual(cascader.value, []);
    assert.equal(input.value, '');
  } finally {
    cascader.destroy();
  }
});

test('a leaf marked data-selected is the starting path; the first marked leaf wins and a marked branch does not count', () => {
  const cases = [
    [{ la: 'data-selected' }, ['us', 'ca', 'la'], 'United States / California / Los Angeles'],
    [{ sf: 'data-selected', la: 'data-selected' }, ['us', 'ca', 'sf'], 'United States / California / San Francisco'],
    [{ ca: 'data-selected' }, [], ''],
  ];
  for (const [marks, value, text] of cases) {
    const cascader = start(places(marks));
    try {
      assert.deepEqual(cascader.value, value);
      assert.equal(cascader.input.value, text);
    } finally {
      cascader.destroy();
    }
  }
});

test('an empty nested list leaves its option a leaf, and a label leaves out the nested text', () => {
  const cascader = start(places().replace('<li data-value="wa">', '<li data-value="wa" data-selected>'));
  try {
    assert.deepEqual(cascader.value, ['us', 'wa']);
    assert.equal(cascader.input.value, 'United States / Washington');
  } finally {
    cascader.destroy();
  }
});

test('destroy() removes the popover and puts the input attributes back, keeping its text', () => {
  const cascader = start(places({ sf: 'data-selected' }), '<input id="place" name="place" type="text" aria-controls="elsewhere">');
  const input = cascader.input;
  cascader.destroy();
  assert.equal(document.querySelector('.cascader-popover'), null);
  assert.equal(input.hasAttribute('readonly'), false);
  assert.equal(input.hasAttribute('role'), false);
  assert.equal(input.hasAttribute('aria-haspopup'), false);
  assert.equal(input.hasAttribute('aria-expanded'), false);
  assert.equal(input.getAttribute('aria-controls'), 'elsewhere');
  assert.equal(input.getAttribute('name'), 'place');
  assert.equal(input.value, 'United States / California / San Francisco');
  assert.equal(Expressive.Cascader.getInstance(document.querySelector('.cascader')), undefined);
});
