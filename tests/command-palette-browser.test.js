import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<main>
  <button id="opener" type="button" commandfor="palette" command="show-modal">Commands <kbd><kbd>Ctrl</kbd>+<kbd>K</kbd></kbd></button>
  <dialog id="palette" class="command-palette" aria-label="Commands">
    <input type="search" placeholder="Type a command" aria-label="Search commands">
    <ul>
      <li class="label">Files</li>
      <li><button type="button" id="new" data-keywords="create add">New file<kbd>Ctrl N</kbd></button></li>
      <li><button type="button" id="open">Open file</button></li>
      <li class="label">Settings</li>
      <li><button type="button" id="theme">Café theme</button></li>
      <li><button type="button" id="keys">Keyboard shortcuts</button></li>
      <li hidden><button type="button" id="admin">Admin tools</button></li>
      <li><button type="button" id="publish" disabled>Publish</button></li>
    </ul>
    <p class="command-palette-empty" role="status">No matching commands</p>
  </dialog>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: command palette opens on its shortcut, filters, moves with the arrows and runs a command`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
      await page.setContent(markup);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => {
        window.ran = [];
        for (const id of ['new', 'open', 'theme', 'keys']) document.getElementById(id).addEventListener('click', () => window.ran.push(id));
        window.Expressive.AutoInit();
      });
      const isOpen = () => page.locator('#palette').evaluate((el) => el.open);
      const input = page.locator('#palette > input');
      const visible = () => page.locator('#palette li[role="option"]:not([hidden]):not([data-filtered])').evaluateAll((els) => els.map((el) => el.textContent.trim()));
      const active = () => page.evaluate(() => {
        const id = document.querySelector('#palette > input').getAttribute('aria-activedescendant');
        return id && document.getElementById(id).textContent.trim();
      });

      assert.equal(await input.getAttribute('role'), 'combobox');
      assert.equal(await page.locator('#palette > ul').getAttribute('role'), 'listbox');
      assert.equal(await page.getByRole('option', { includeHidden: true }).count(), 6, 'each command is an option; headings are not');
      assert.equal(await page.locator('#admin').evaluate((el) => el.parentElement.hidden), true, 'a command the page hid stays hidden');
      assert.equal(await page.locator('#publish').evaluate((el) => el.parentElement.getAttribute('aria-disabled')), 'true', 'a disabled command says so');
      assert.equal(await page.locator('#new').getAttribute('tabindex'), '-1', 'commands are not Tab stops');

      await page.locator('#opener').focus();
      await page.keyboard.press('Control+k');
      assert.equal(await isOpen(), true, 'Ctrl+K opens the palette');
      assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('#palette > input')), true, 'the input takes focus');
      assert.match(await active(), /^New file/, 'the first command is active');
      assert.ok(await page.locator('#palette').evaluate((el) => el.getBoundingClientRect().top < 200), 'it opens near the top');

      await page.keyboard.press('ArrowDown');
      assert.equal(await active(), 'Open file');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowUp');
      assert.equal(await active(), 'Keyboard shortcuts', 'the arrows wrap, skipping disabled and hidden commands');

      await page.evaluate(() => {
        const li = document.createElement('li');
        li.innerHTML = '<button type="button">Appended</button>';
        document.querySelector('#palette > ul').append(li);
      });
      await page.waitForTimeout(50);
      assert.equal(await active(), 'Keyboard shortcuts', 'a command the page appends keeps the active row');

      await input.fill('admin');
      assert.equal(await page.locator('.command-palette-empty').isVisible(), true, 'a hidden command is not found');
      await input.fill('publish');
      assert.equal(await active(), null, 'a disabled command is never active');
      await page.keyboard.press('Enter');
      assert.equal(await isOpen(), true, 'so Enter runs nothing');

      await input.fill('cafe');
      assert.deepEqual(await visible(), ['Café theme'], 'matching ignores case and accents');
      assert.equal(await page.locator('#palette li.label:not([data-filtered])').count(), 1, 'an emptied group hides its heading');
      assert.equal(await page.locator('.command-palette-empty').isVisible(), false);

      await input.fill('create');
      assert.deepEqual((await visible()).map((text) => text.split('Ctrl')[0]), ['New file'], 'keywords match too');
      await page.keyboard.press('Enter');
      assert.deepEqual(await page.evaluate(() => window.ran), ['new'], 'Enter runs the active command');
      assert.equal(await isOpen(), false, 'running a command closes the palette');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'opener', 'focus returns to where it was');

      await page.locator('#opener').click();
      assert.equal(await isOpen(), true, 'a commandfor button opens it natively');
      assert.equal(await input.inputValue(), '', 'each opening starts empty');
      assert.equal((await visible()).length, 6, 'and with every shown command');

      await input.fill('zzz');
      assert.equal(await page.locator('.command-palette-empty').isVisible(), true, 'no match shows the empty message');
      assert.equal(await page.evaluate(() => document.querySelector('#palette > input').hasAttribute('aria-activedescendant')), false);

      await input.fill('');
      await page.locator('#keys').hover();
      assert.equal(await active(), 'Keyboard shortcuts', 'the pointer moves the active row');
      await page.locator('#keys').click();
      assert.deepEqual(await page.evaluate(() => window.ran), ['new', 'keys'], 'a click runs the command');
      assert.equal(await isOpen(), false);

      await page.keyboard.press('Control+k');
      await page.keyboard.press('Escape');
      assert.equal(await isOpen(), false, 'Escape closes it');

      await page.evaluate(() => {
        const li = document.createElement('li');
        li.innerHTML = '<button type="button" id="late">Recent: report</button>';
        document.querySelector('#palette > ul').append(li);
        document.getElementById('late').addEventListener('click', () => window.ran.push('late'));
      });
      await page.keyboard.press('Control+k');
      await input.fill('recent');
      assert.equal(await active(), 'Recent: report', 'a command added later is wired and found');
      assert.equal(await page.locator('#late').getAttribute('tabindex'), '-1', 'and is not a Tab stop');
      const imeEnter = await input.evaluate((el) => {
        const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
        Object.defineProperty(event, 'keyCode', { value: 229 });
        el.dispatchEvent(event);
        return event.defaultPrevented;
      });
      assert.equal(imeEnter, false, 'the Enter that confirms an IME composition runs nothing');
      assert.equal(await isOpen(), true);
      await page.locator('#late').click();
      assert.deepEqual(await page.evaluate(() => window.ran), ['new', 'keys', 'late']);
      assert.equal(await isOpen(), false, 'and running it closes the palette');

      await page.evaluate(() => {
        const editor = document.createElement('textarea');
        editor.id = 'editor';
        editor.addEventListener('keydown', (e) => { if (e.ctrlKey && e.key === 'k') e.preventDefault(); });
        document.querySelector('main').append(editor);
      });
      await page.locator('#editor').focus();
      await page.keyboard.press('Control+k');
      assert.equal(await isOpen(), false, 'a shortcut the page already handled is left alone');

      await page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'л', code: 'KeyK', ctrlKey: true, bubbles: true, cancelable: true })));
      assert.equal(await isOpen(), true, 'a non-Latin layout opens it from the physical K key');
      // Chromium may ignore Escape on a dialog a synthetic event opened, as
      // it has no user activation; close it directly.
      await page.evaluate(() => window.Expressive.CommandPalette.getInstance(document.getElementById('palette')).close());

      await page.evaluate(() => window.Expressive.CommandPalette.getInstance(document.getElementById('palette')).destroy());
      assert.equal(await input.getAttribute('role'), null, 'destroy removes the roles it added');
      await page.keyboard.press('Control+k');
      assert.equal(await isOpen(), false, 'destroy removes the shortcut');

      const keycap = await page.locator('#opener kbd kbd').first().evaluate((el) => getComputedStyle(el).borderBottomWidth);
      assert.equal(keycap, '2px', 'a kbd is drawn as a keycap');
      assert.equal(await page.locator('#opener > kbd').evaluate((el) => getComputedStyle(el).borderTopStyle), 'none', 'a combination stays plain');
    } finally {
      await browser.close();
    }
  });
}
