import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const script = new URL('../scripts/finished-app-delete-undo.mjs', import.meta.url).pathname;

// A list that removes a row at once and restores it in place from an Undo button.
const app = (extra = '') => `<!doctype html><title>List</title>
<ul>${['Ana', 'Ben', 'Chen'].map((name) => `<li>${name} <button type="button" data-delete>Delete ${name}</button></li>`).join('')}</ul>
<button type="button" id="undo" hidden>Undo</button>
<script>
  const list = document.querySelector('ul');
  const undo = document.getElementById('undo');
  let last = null;
  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-delete]');
    if (!button) return;
    const row = button.closest('li');
    last = { row, next: row.nextElementSibling };
    row.remove();
    undo.hidden = false;
  });
  undo.addEventListener('click', () => {
    list.insertBefore(last.row, last.next);
    undo.hidden = true;
  });
  ${extra}
</script>`;

async function check(html) {
  const dir = await mkdtemp(join(tmpdir(), 'finished-app-undo-'));
  try {
    await writeFile(join(dir, 'index.html'), html);
    const result = await run(process.execPath, [script, dir]).catch((error) => error);
    return { code: result.code ?? 0, line: JSON.parse(result.stdout.trim()) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('the delete-and-Undo check passes a list that restores the row in place', async () => {
  const { code, line } = await check(app());
  assert.equal(line.pass, true, line.reason);
  assert.equal(line.focusInRow, false);
  assert.equal(code, 0);
});

test('the delete-and-Undo check ignores a tooltip that focus adds to the restored row', async () => {
  const tooltip = `list.addEventListener('focusin', (event) => {
    event.target.closest('li').insertAdjacentHTML('beforeend', '<span class="tooltip" role="tooltip">Delete</span>');
  });
  undo.addEventListener('click', () => last.row.querySelector('button').focus());`;
  const { code, line } = await check(app(tooltip));
  assert.equal(line.pass, true, line.reason);
  assert.equal(line.focusOnRestoredRow, true);
  assert.equal(code, 0);
});

test('the delete-and-Undo check fails an app whose page throws, even when Undo works', async () => {
  const { code, line } = await check(app("setTimeout(() => { throw new Error('boom'); });"));
  assert.equal(line.pass, false);
  assert.equal(line.reason, 'page error');
  assert.equal(line.errors[0], 'boom');
  assert.equal(code, 1);
});
