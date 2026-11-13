import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody, window } from './setup.js';

const mutations = () => new Promise(resolve => setImmediate(resolve));

function fixture() {
  resetBody();
  document.body.innerHTML = '<dialog class="command-palette"><input><ul><li id="authored"><button>Original</button></li></ul></dialog>';
  return Expressive.CommandPalette.init(document.querySelector('dialog'));
}

test('replacing commands releases generated-ID references and keeps selection usable', async () => {
  const palette = fixture();
  try {
    for (let i = 0; i < 20; i++) {
      palette.list.innerHTML = '<li><button>First</button></li><li><button>Second</button></li>';
      await mutations();
      assert.equal(palette._generatedIds.length, 3, 'only the current rows and list need ID cleanup');
      assert.ok(palette._generatedIds.every(el => palette.list.contains(el)));
    }
    palette.input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    assert.equal(palette.input.getAttribute('aria-activedescendant'), palette.list.lastElementChild.id);
  } finally { palette.destroy(); resetBody(); }
  assert.equal(palette._generatedIds.length, 0, 'destroy also releases ID cleanup references');
});

test('command moves preserve IDs, and removed commands can be reinserted', async () => {
  const palette = fixture();
  const authored = palette.list.firstElementChild;
  let row;
  try {
    row = document.createElement('li');
    row.innerHTML = '<button>Added</button>';
    palette.list.append(row);
    await mutations();
    const originalId = row.id;
    assert.ok(originalId);
    palette.list.prepend(row);
    await mutations();
    assert.equal(row.id, originalId, 'a same-list move keeps its ID');
    palette.el.remove();
    palette.list.append(row);
    await mutations();
    assert.equal(row.id, originalId, 'a detached palette still owns its rows');
    document.body.append(palette.el);
    row.remove();
    await mutations();
    assert.equal(row.id, '', 'a removed row regains its original lack of an ID');
    assert.ok(!palette._generatedIds.includes(row));
    palette.list.prepend(row);
    await mutations();
    assert.ok(row.id, 'a returning option receives an ID again');
    palette.input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    assert.equal(palette.input.getAttribute('aria-activedescendant'), row.id);
    assert.equal(authored.id, 'authored');
  } finally { palette.destroy(); resetBody(); }
  assert.equal(row.id, '');
  assert.equal(authored.id, 'authored', 'authored IDs survive teardown');
  assert.equal(palette._generatedIds.length, 0);
});

test('moving a command into a new palette keeps its active descendant valid', async () => {
  const first = fixture();
  let second;
  try {
    const row = document.createElement('li');
    row.innerHTML = '<button>Moving</button>';
    first.list.append(row);
    await mutations();
    const dialog = document.createElement('dialog');
    dialog.className = 'command-palette';
    dialog.innerHTML = '<input><ul></ul>';
    document.body.append(dialog);
    dialog.querySelector('ul').append(row);
    second = Expressive.CommandPalette.init(dialog);
    await mutations();
    assert.ok(row.id);
    assert.equal(second.input.getAttribute('aria-activedescendant'), row.id);
    assert.equal(row.getAttribute('aria-selected'), 'true');
    assert.ok(row.classList.contains('active'));
    assert.ok(!first._generatedIds.includes(row));
    assert.ok(second._generatedIds.includes(row));
    first.destroy();
    assert.ok(row.id, 'destroying the previous palette leaves the new owner intact');
    for (let i = 0; i < 5; i++) {
      row.removeAttribute('id');
      await mutations();
      assert.ok(row.id);
      assert.equal(second.input.getAttribute('aria-activedescendant'), row.id);
      assert.equal(second._generatedIds.length, 2, 'reassigning an ID does not duplicate cleanup references');
    }
  } finally { first.destroy(); second?.destroy(); resetBody(); }
});
