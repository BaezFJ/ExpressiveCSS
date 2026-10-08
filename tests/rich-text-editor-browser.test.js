import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

// The framework does not bundle Tiptap; the page supplies it, as here.
const tiptap = (await build({
  stdin: {
    contents: `import { Editor } from '@tiptap/core'; import StarterKit from '@tiptap/starter-kit'; window.Tiptap = { Editor, StarterKit };`,
    resolveDir: fileURLToPath(new URL('..', import.meta.url))
  },
  bundle: true,
  format: 'iife',
  write: false
})).outputFiles[0].text;

const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<form>
  <label for="body">Post</label>
  <div class="rich-text-editor">
    <div class="toolbar docked">
      <button type="button" class="circle" data-command="toggleBold" aria-label="Bold"><span class="material-symbols" aria-hidden="true">format_bold</span></button>
      <button type="button" class="circle" data-command="toggleHeading" data-attributes='{"level":2}' aria-label="Heading"><span class="material-symbols" aria-hidden="true">format_h2</span></button>
      <button type="button" class="circle" data-command="toggleBulletList" aria-label="Bulleted list"><span class="material-symbols" aria-hidden="true">format_list_bulleted</span></button>
      <button type="button" class="circle" data-command="undo" aria-label="Undo"><span class="material-symbols" aria-hidden="true">undo</span></button>
    </div>
    <textarea id="body" name="body"><p>Hello world</p></textarea>
  </div>
</form></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: rich text editor formats text, reflects state and keeps the textarea in sync`, { timeout: 60000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(markup);
      await page.addScriptTag({ content: js });
      await page.addScriptTag({ content: tiptap });
      await page.evaluate(() => {
        const { Editor, StarterKit } = window.Tiptap;
        window.Expressive.RichTextEditor.init(document.querySelector('.rich-text-editor'), { Editor, extensions: [StarterKit] });
      });

      const editable = page.locator('.rich-text-editor-content [contenteditable="true"]');
      const bold = page.getByRole('button', { name: 'Bold' });
      const heading = page.getByRole('button', { name: 'Heading' });
      const undo = page.getByRole('button', { name: 'Undo' });
      const value = () => page.locator('textarea').inputValue();
      // Tiptap moves focus a frame after the command runs.
      const focused = () => page.waitForFunction(() => document.activeElement?.matches('[contenteditable="true"]'));
      const run = (command, argument) => page.evaluate(([command, argument]) => {
        window.Expressive.RichTextEditor.getInstance(document.querySelector('.rich-text-editor')).editor.commands[command](argument);
      }, [command, argument]);

      assert.equal(await page.locator('textarea').isHidden(), true, 'the textarea is hidden');
      assert.equal(await editable.getAttribute('role'), 'textbox');
      assert.equal(await editable.getAttribute('aria-multiline'), 'true');
      await page.getByRole('textbox', { name: 'Post' }).waitFor();
      assert.equal(await editable.innerHTML(), '<p>Hello world</p>', 'opens with the textarea HTML');
      assert.equal(await bold.getAttribute('aria-pressed'), 'false');
      assert.equal(await undo.isDisabled(), true, 'nothing to undo yet');

      await page.locator('label').click();
      await focused();

      await page.evaluate(() => {
        document.querySelector('textarea').addEventListener('input', () => { window.inputs = (window.inputs ?? 0) + 1; });
      });
      await run('selectAll');
      await bold.click();
      assert.equal(await bold.getAttribute('aria-pressed'), 'true');
      assert.equal(await bold.evaluate((el) => el.classList.contains('active')), true);
      assert.equal(await value(), '<p><strong>Hello world</strong></p>', 'the textarea holds the new HTML');
      assert.ok(await page.evaluate(() => window.inputs) >= 1, 'the textarea fires input');
      await focused();
      assert.equal(await undo.isDisabled(), false);

      await run('setTextSelection', 3);
      await heading.click();
      await focused();
      assert.equal(await heading.getAttribute('aria-pressed'), 'true', 'attributes are passed to isActive');
      assert.match(await value(), /^<h2>/);

      // StarterKit keeps an empty paragraph after a final heading.
      await run('setTextSelection', 14);
      assert.equal(await heading.getAttribute('aria-pressed'), 'false', 'state follows the selection');

      await run('selectAll');
      await page.keyboard.press('Backspace');
      assert.equal(await value(), '', 'an empty editor submits an empty value');

      await page.evaluate(() => {
        const el = document.querySelector('.rich-text-editor');
        window.Expressive.RichTextEditor.getInstance(el).destroy();
      });
      assert.equal(await page.locator('.rich-text-editor-content').count(), 0, 'destroy removes the editor');
      assert.equal(await page.locator('textarea').isVisible(), true, 'destroy shows the textarea');
      // The toolbar is hidden again, so role queries no longer find it.
      assert.equal(await page.locator('[aria-label="Bold"]').getAttribute('aria-pressed'), null);
      assert.equal(await page.locator('[aria-label="Undo"]').isDisabled(), false);
    } finally {
      await browser.close();
    }
  });

  test(`${name}: rich text editor follows a disabled textarea`, { timeout: 60000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(markup.replace('<textarea', '<textarea disabled'));
      await page.addScriptTag({ content: js });
      await page.addScriptTag({ content: tiptap });
      await page.evaluate(() => {
        const { Editor, StarterKit } = window.Tiptap;
        window.Expressive.RichTextEditor.init(document.querySelector('.rich-text-editor'), { Editor, extensions: [StarterKit] });
      });
      assert.equal(await page.locator('.rich-text-editor-content [contenteditable="false"]').count(), 1);
      assert.equal(await page.locator('button[data-command]:not(:disabled)').count(), 0, 'every button is disabled');
    } finally {
      await browser.close();
    }
  });
}
