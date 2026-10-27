import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect } from '@playwright/test';
import { engines, leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const markup = `<form id="upload"><div id="zone" class="drop-zone" style="max-width:32rem">
  <label id="target">Drop documents here or browse
    <small>PDF or PNG files</small>
    <input id="files" type="file" name="documents" multiple data-validate-types accept=".pdf,.png" aria-describedby="hint">
  </label><p id="error" class="supporting-text" data-error="Choose PDF or PNG files." role="status" aria-live="polite" hidden></p>
  <ul class="drop-zone-files" aria-live="polite"></ul>
</div><p id="hint">Keep your originals.</p><button id="submit" type="submit">Submit</button><button type="reset">Reset</button></form>`;
const selected = (name, mimeType = '') => ({ name, mimeType, buffer: Buffer.from('contents') });

for (const [name, engine, browserTest] of engines) {
  browserTest(`${name}: browse rejects whole file choices and native submission, then recovers`, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>${markup}<script>${js}</script></body></html>`);
      await page.evaluate(() => {
        window.rejected = [];
        window.submits = 0;
        document.querySelector('.drop-zone').addEventListener('expressive:reject', event => window.rejected.push({ reason: event.detail.reason, files: event.detail.files.map(file => file.name), rejected: event.detail.rejected.map(file => file.name) }));
        document.querySelector('form').addEventListener('submit', event => { event.preventDefault(); window.submits++; });
      });
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#target').click()]);
      await chooser.setFiles([selected('REPORT.PDF'), selected('<img src=x>.exe', 'application/octet-stream')]);
      const input = page.locator('#files');
      const error = page.getByRole('status');
      await expect(error).toHaveText('Choose PDF or PNG files.');
      await expect(error).toBeVisible();
      await expect(input).toHaveAttribute('aria-invalid', 'true');
      await expect(input).toHaveAttribute('aria-describedby', 'hint error');
      await expect(input).toBeFocused();
      assert.equal(await input.evaluate(el => el.validity.customError), true);
      assert.equal(await input.evaluate(el => el.files.length), 2);
      assert.equal(await page.locator('.drop-zone-files > li').count(), 2);
      assert.equal(await page.locator('.drop-zone-files img').count(), 0);
      assert.deepEqual(await page.evaluate(() => window.rejected), [{ reason: 'type', files: ['REPORT.PDF', '<img src=x>.exe'], rejected: ['<img src=x>.exe'] }]);
      await expect(page.locator('#target')).toHaveCSS('border-top-color', await error.evaluate(el => getComputedStyle(el).color));
      await page.locator('#submit').click();
      assert.equal(await page.evaluate(() => window.submits), 0);
      await input.setInputFiles([selected('valid.PNG')]);
      await expect(error).toBeHidden();
      await expect(input).not.toHaveAttribute('aria-invalid');
      await page.locator('#submit').click();
      assert.equal(await page.evaluate(() => window.submits), 1);
      await input.setInputFiles([selected('bad.exe')]);
      await expect(error).toBeVisible();
      await input.evaluate(el => el.form.addEventListener('reset', event => event.preventDefault(), { once: true }));
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      await expect(error).toBeVisible();
      assert.equal(await input.evaluate(el => el.files.length), 1);
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      await expect(error).toBeHidden();
      assert.equal(await input.evaluate(el => el.files.length), 0);
      assert.equal(await input.evaluate(el => el.validity.valid), true);
      assert.equal(await page.locator('.drop-zone-files > li').count(), 0);
      await input.evaluate(el => { el.required = true; Expressive.Forms.validateField(el); });
      assert.equal(await input.evaluate(el => el.validity.valueMissing), true);
      assert.equal(await input.evaluate(el => el.validity.customError), false);
      await page.locator('#submit').click();
      assert.equal(await page.evaluate(() => window.submits), 1);
      await input.evaluate(el => { el.required = false; Expressive.Forms.validateField(el); });
      await expect(error).toBeHidden();
      await input.evaluate(el => {
        el.form.reset();
        const transfer = new DataTransfer();
        transfer.items.add(new File(['contents'], 'new-after-reset.exe'));
        el.files = transfer.files;
        el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      });
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
      await expect(error).toHaveText('Choose PDF or PNG files.');
      await expect(error).toBeVisible();
      assert.equal(await input.evaluate(el => el.files[0].name), 'new-after-reset.exe');
      assert.equal(await input.evaluate(el => el.validity.customError), true);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${name}: shadow file-change boundary preserves canceled reset and application validity`, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html lang="en"><body><div id="host"></div><script>${js}</script></body></html>`);
      await page.evaluate(({ css, markup }) => {
        const root = document.querySelector('#host').attachShadow({ mode: 'open' });
        root.innerHTML = `<style>${css}</style>${markup}`;
        window.rejections = 0;
        document.addEventListener('expressive:reject', () => window.rejections++);
      }, { css, markup });
      const input = page.locator('#files');
      const error = page.locator('#error');
      await input.evaluate(el => {
        const transfer = new DataTransfer();
        transfer.items.add(new File(['contents'], 'bad.exe', { type: 'application/octet-stream' }));
        el.files = transfer.files;
        el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.form.addEventListener('reset', event => event.preventDefault(), { once: true });
      });
      await expect(error).toHaveText('Choose PDF or PNG files.');
      await expect(error).toBeVisible();
      assert.equal(await page.evaluate(() => window.rejections), 1);
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      await expect(error).toBeVisible();
      assert.equal(await input.evaluate(el => el.files.length), 1);
      assert.equal(await page.locator('.drop-zone-files > li').count(), 1);
      await input.setInputFiles([selected('valid.pdf')]);
      await expect(error).toBeHidden();
      await input.evaluate(el => el.setCustomValidity('Application policy'));
      await input.setInputFiles([selected('bad.exe')]);
      assert.equal(await input.evaluate(el => el.validationMessage), 'Application policy');
      await expect(error).toHaveText('Choose PDF or PNG files.');
      await input.setInputFiles([selected('valid.pdf')]);
      await expect(error).toHaveText('Application policy');
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      assert.equal(await input.evaluate(el => el.files.length), 0);
      assert.equal(await input.evaluate(el => el.validationMessage), 'Application policy');
      await expect(error).toHaveText('Application policy');
      await input.evaluate(el => { el.setCustomValidity(''); Expressive.Forms.validateField(el); });
      await expect(error).toBeHidden();
      await input.setInputFiles([selected('bad.exe')]);
      await input.evaluate(el => { el.disabled = true; el.form.reset(); });
      assert.equal(await input.evaluate(el => el.files.length), 0);
      await input.evaluate(el => { el.disabled = false; Expressive.Forms.validateField(el); });
      assert.equal(await input.evaluate(el => el.validity.valid), true);
      await expect(error).toBeHidden();
    } finally {
      await browser.close();
    }
  });

  browserTest(`${name}: external form-associated file controls recover on native reset`, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>${markup}<script>${js}</script></body></html>`);
      const input = page.locator('#files');
      await input.evaluate(el => {
        const form = el.form;
        el.setAttribute('form', form.id);
        form.after(el.closest('.drop-zone'));
      });
      await input.setInputFiles([selected('bad.exe')]);
      await expect(page.locator('#error')).toBeVisible();
      assert.equal(await input.evaluate(el => el.form.checkValidity()), false);
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      await expect(page.locator('#error')).toBeHidden();
      assert.equal(await input.evaluate(el => el.files.length), 0);
      assert.equal(await input.evaluate(el => el.form.checkValidity()), true);
      assert.equal(await page.locator('.drop-zone-files > li').count(), 0);
      await input.evaluate(el => el.setCustomValidity('Application policy'));
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      assert.equal(await input.evaluate(el => el.validationMessage), 'Application policy');
    } finally {
      await browser.close();
    }
  });

  if (name === 'chromium') browserTest('chromium: trusted protocol drop uses native file assignment and blocks invalid submission', async () => {
    const temporary = mkdtempSync(join(tmpdir(), 'expressivecss-file-drop-'));
    let browser;
    try {
      const paths = ['valid.pdf', 'bad.exe'].map(name => join(temporary, name));
      paths.forEach(path => writeFileSync(path, 'contents'));
      browser = await leaseBrowser(engine);
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>${markup}<script>${js}</script></body></html>`);
      await page.evaluate(() => {
        window.rejections = 0;
        window.submits = 0;
        window.nativeEvents = [];
        document.addEventListener('expressive:reject', () => window.rejections++);
        for (const type of ['drop', 'input', 'change']) document.addEventListener(type, event => window.nativeEvents.push({ type, trusted: event.isTrusted }));
        document.querySelector('form').addEventListener('submit', event => { event.preventDefault(); window.submits++; });
      });
      const box = await page.locator('#files').boundingBox();
      const session = await page.context().newCDPSession(page);
      for (const type of ['dragEnter', 'dragOver', 'drop']) await session.send('Input.dispatchDragEvent', {
        type, x: box.x + box.width / 2, y: box.y + box.height / 2,
        data: { items: [], files: paths, dragOperationsMask: 1 },
      });
      await expect(page.locator('#error')).toHaveText('Choose PDF or PNG files.');
      assert.deepEqual(await page.locator('#files').evaluate(el => [...el.files].map(file => file.name)), ['valid.pdf', 'bad.exe']);
      assert.deepEqual(await page.evaluate(() => window.nativeEvents), [{ type: 'drop', trusted: true }, { type: 'input', trusted: true }, { type: 'change', trusted: true }]);
      assert.equal(await page.evaluate(() => window.rejections), 1);
      await page.locator('#submit').click();
      assert.equal(await page.evaluate(() => window.submits), 0);
    } finally {
      try { await browser?.close(); }
      finally { rmSync(temporary, { recursive: true, force: true }); }
    }
  });
}
