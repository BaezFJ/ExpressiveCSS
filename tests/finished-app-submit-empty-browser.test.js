import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const script = fileURLToPath(new URL('../scripts/finished-app-submit-empty.mjs', import.meta.url));

const form = ({ attrs = '', submit = '<button type="submit">Save</button>', js = '' } = {}) => `<!doctype html><title>Settings</title>
<form ${attrs} action="#saved">
  <fieldset><legend>Profile</legend>
    <label>Display name <input id="display_name" name="display_name" required value="Sam"></label>
    <label>Email <input id="email" name="email" type="email" required value="sam@example.com"></label>
  </fieldset>
  ${submit}
</form>
<script>${js}</script>`;

async function check(html) {
  const dir = await mkdtemp(join(tmpdir(), 'finished-app-submit-'));
  try {
    await writeFile(join(dir, 'index.html'), html);
    const result = await run(process.execPath, [script, dir]).catch((error) => error);
    return { code: result.code ?? 0, line: JSON.parse(result.stdout.trim()) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('the submit check passes native constraint validation', async () => {
  const { code, line } = await check(form());
  assert.equal(line.pass, true, line.reason);
  assert.equal(line.firstInvalid, 'display_name');
  assert.equal(code, 0);
});

test('the submit check does not count a URL the page writes on load as navigating', async () => {
  const { code, line } = await check(form({ js: "history.replaceState(null, '', '?tab=profile');" }));
  assert.equal(line.pass, true, line.reason);
  assert.equal(code, 0);
});

test('the submit check passes a novalidate handler that marks fields and focuses the first', async () => {
  const handler = `document.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault();
    const fields = [...event.target.querySelectorAll('input')];
    fields.forEach((field) => field.setAttribute('aria-invalid', String(!field.value)));
    fields.find((field) => !field.value)?.focus();
  });`;
  const { code, line } = await check(form({ attrs: 'novalidate', js: handler }));
  assert.equal(line.pass, true, line.reason);
  assert.equal(code, 0);
});

test('the submit check fails a submit disabled until the fields are valid', async () => {
  const handler = `const form = document.querySelector('form');
    form.addEventListener('input', () => { form.querySelector('button').disabled = !form.checkValidity(); });`;
  const { code, line } = await check(form({ js: handler }));
  assert.equal(line.pass, false);
  assert.equal(line.reason, 'submit is disabled before submission');
  assert.equal(code, 1);
});

test('the submit check fails a handler that leaves focus on the button', async () => {
  const handler = `document.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault();
    event.target.querySelectorAll('input').forEach((field) => field.setAttribute('aria-invalid', String(!field.value)));
  });`;
  const { code, line } = await check(form({ attrs: 'novalidate', js: handler }));
  assert.equal(line.pass, false);
  assert.equal(line.reason, 'focus is not on the first invalid field');
  assert.equal(code, 1);
});

test('the submit check names a form replaced on submit', async () => {
  const handler = `document.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault();
    event.target.replaceWith(document.createElement("form"));
  });`;
  const { code, line } = await check(form({ attrs: 'novalidate', js: handler }));
  assert.equal(line.pass, false);
  assert.equal(line.reason, 'the form was replaced on submit');
  assert.equal(code, 1);
});

test('the submit check leaves fields in a disabled fieldset alone', async () => {
  const html = form().replace('</fieldset>', '</fieldset><fieldset disabled><legend>Plan</legend><label>Plan <input id="plan" name="plan" value="Pro"></label></fieldset>');
  const { code, line } = await check(html);
  assert.equal(line.pass, true, line.reason);
  assert.equal(code, 0);
});
