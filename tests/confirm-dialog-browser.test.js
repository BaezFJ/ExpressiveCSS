// Dialogs.confirm() in real engines: the promise's answer for each way out,
// where focus starts, and focus back on the opener. jsdom has no showModal(),
// Escape or focus return, so these live here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines, leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const html = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
  <button type="button" id="opener">Delete</button>
  <button type="button" id="other">Other</button>
  <script>${js}</script>
  <script>
    window.answers = [];
    document.getElementById('opener').addEventListener('click', () => {
      Expressive.Dialogs.confirm({ headline: 'Delete file?', text: 'This cannot be undone.', confirm: 'Delete' })
        .then((answer) => answers.push(answer));
    });
  </script></body></html>`;

// Open from the keyboard, so the opener holds focus the way it would for a person.
const open = async (page) => {
  await page.focus('#opener');
  await page.keyboard.press('Enter');
  await page.waitForSelector('dialog[role="alertdialog"][open]');
};

// Chromium fires close from a queued task, so wait for the answer before reading focus.
const settle = async (page, count) => {
  await page.waitForFunction((n) => window.answers.length === n, count);
  return page.evaluate(() => ({
    answer: window.answers.at(-1),
    focus: document.activeElement.id,
    dialogs: document.querySelectorAll('dialog').length
  }));
};

for (const [engine, browserType, browserTest] of engines) {
  browserTest(`${engine}: confirm resolves true and returns focus to the opener`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await open(page);
      await page.locator('dialog button[value="confirm"]').click();
      assert.deepEqual(await settle(page, 1), { answer: true, focus: 'opener', dialogs: 0 });
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: Cancel and Escape resolve false and return focus to the opener`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await open(page);
      await page.getByRole('button', { name: 'Cancel' }).click();
      assert.deepEqual(await settle(page, 1), { answer: false, focus: 'opener', dialogs: 0 });

      await open(page);
      await page.keyboard.press('Escape');
      assert.deepEqual(await settle(page, 2), { answer: false, focus: 'opener', dialogs: 0 });
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: focus starts on Cancel and the page behind is inert`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await open(page);
      const focused = () => page.evaluate(() => document.activeElement.textContent);
      assert.equal(await focused(), 'Cancel');
      await page.keyboard.press('Tab');
      assert.equal(await focused(), 'Delete');
      assert.equal(await page.evaluate(() => document.activeElement.closest('dialog') !== null), true);
      // A modal dialog makes the rest of the page inert, so this focus() does nothing.
      await page.evaluate(() => document.getElementById('other').focus());
      assert.equal(await focused(), 'Delete');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: removing the open dialog resolves false`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await open(page);
      // A route change that clears the page, which fires no close event.
      await page.evaluate(() => document.querySelector('dialog').remove());
      await page.waitForFunction(() => window.answers.length === 1, null, { timeout: 2000 });
      assert.deepEqual(await page.evaluate(() => window.answers), [false]);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a scrim tap resolves false`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.setContent(html);
      await open(page);
      await page.mouse.click(5, 5);
      assert.deepEqual(await settle(page, 1), { answer: false, focus: 'opener', dialogs: 0 });
    } finally {
      await browser.close();
    }
  });
}
