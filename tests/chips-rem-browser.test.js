import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const icon = '<span class="material-symbols" aria-hidden="true">info</span>';
const image = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
const markup = `<span id="display" class="chip">Paid</span>
  <button id="assist" type="button" class="chip">${icon}Add</button>
  <input id="check" type="checkbox" class="chip-input"><label id="filter" class="chip" for="check">Flights</label>
  <span id="outlined" class="chip outlined">Draft</span>
  <form><div id="field" class="chips input-field"><input name="tags" aria-label="Tags"></div></form>`;

const styles = (page, selector, properties) => page.locator(selector).evaluate((el, properties) => {
  const style = getComputedStyle(el);
  return properties.map(property => parseFloat(style[property]));
}, properties);

const initialize = async page => {
  await page.setContent(`<style>${css}</style>${markup}`);
  await page.addScriptTag({ content: js });
  await page.evaluate(image => {
    window.chips = Expressive.Chips.init(document.getElementById('field'), {
      allowUserInput: true, data: [{ id: 'Ana', image }],
    });
  }, image);
};

for (const [name, engine, test] of engines) {
  test(`${name}: chip content and editable inputs scale with the root font size`, async () => {
    const browser = await leaseBrowser(engine);
    let page;
    try {
      page = await browser.newPage({ viewport: { width: 320, height: 900 } });
      await initialize(page);
      for (const scale of [1, 2]) {
        await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px`; }, 16 * scale);
        for (const selector of ['#display', '#assist', '#filter', '#outlined', '#field .chip']) {
          assert.deepEqual(await styles(page, selector, ['fontSize', 'minHeight', 'height', 'paddingTop', 'gap']),
            [14 * scale, 32 * scale, 32 * scale, 4, 8], selector);
        }
        assert.deepEqual(await styles(page, '#assist .material-symbols', ['fontSize']), [18 * scale]);
        for (const selector of ['#field img', '#field .close']) {
          assert.deepEqual(await styles(page, selector, ['width', 'height']), [24 * scale, 24 * scale], selector);
        }
        assert.deepEqual(await styles(page, '#field .close .material-symbols', ['fontSize']), [20 * scale]);
        assert.deepEqual(await styles(page, '#field .input', ['fontSize', 'height', 'minWidth', 'maxWidth']),
          [16 * scale, 32 * scale, 100 * scale, 200 * scale]);
      }
    } finally {
      try { await page?.evaluate(() => window.chips?.destroy()); }
      finally { await browser.close(); }
    }
  });

  test(`${name}: chips follow the label token and preserve fixed consumer overrides`, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${css}</style>${markup}`);
      for (const size of [16, 32]) {
        await page.evaluate(size => {
          document.documentElement.style.fontSize = `${size}px`;
          document.documentElement.style.setProperty('--md-sys-typescale-label-large-font-size', '1.25rem');
          document.getElementById('assist').style.cssText = '--font-size: 20px; --font-size-icon: 22px; --padding: 12px';
        }, size);
        assert.deepEqual(await styles(page, '#display', ['fontSize']), [size * 1.25]);
        assert.deepEqual(await styles(page, '#assist', ['fontSize', 'paddingLeft', 'paddingRight']), [20, 12, 12]);
        assert.deepEqual(await styles(page, '#assist .material-symbols', ['fontSize']), [22]);
      }
    } finally { await browser.close(); }
  });

  test(`${name}: enlarged chips wrap, contain their input, and keep keyboard controls usable`, async () => {
    const browser = await leaseBrowser(engine);
    let page;
    try {
      page = await browser.newPage({ viewport: { width: 320, height: 900 } });
      for (const size of [16, 32]) {
        await initialize(page);
        await page.evaluate(size => {
          document.documentElement.style.fontSize = `${size}px`;
          document.body.insertAdjacentHTML('beforeend', `<div style="width:140px"><button type="button" id="long" class="chip">A long label that wraps across several lines</button><span id="word" class="chip">AnUnbrokenLabelThatStillMustFitInsideItsParent</span></div>`);
        }, size);
        const input = page.getByRole('textbox', { name: 'Tags' });
        await input.fill('A long generated chip label that must wrap');
        await input.press('Enter');
        const layout = await page.evaluate(() => {
          const bounds = el => el.getBoundingClientRect();
          const field = bounds(document.getElementById('field'));
          const contained = el => {
            const rect = bounds(el);
            return rect.left >= field.left - 1 && rect.right <= field.right + 1;
          };
          const wraps = id => {
            const el = document.getElementById(id);
            const rect = bounds(el);
            const text = document.createRange();
            text.selectNodeContents(el);
            const lines = text.getBoundingClientRect();
            return rect.height > parseFloat(getComputedStyle(el).minHeight) &&
              rect.right <= bounds(el.parentElement).right + 1 &&
              lines.top >= rect.top + 3 && lines.bottom <= rect.bottom - 3;
          };
          const input = document.querySelector('#field .input');
          return {
            wrapped: [wraps('long'), wraps('word')],
            contained: [...document.querySelectorAll('#field .chip, #field .input, #field expressive-chips-control')].every(contained),
            inputFits: input.scrollHeight <= input.clientHeight,
          };
        });
        assert.deepEqual(layout, { wrapped: [true, true], contained: true, inputFits: true }, `root ${size}px`);
        const remove = page.getByRole('button', { name: 'Remove Ana', exact: true });
        await remove.focus();
        await page.keyboard.press('Enter');
        assert.deepEqual(await page.evaluate(() => new FormData(document.querySelector('form')).getAll('tags')),
          ['A long generated chip label that must wrap']);
        await page.locator('#check').focus();
        await page.keyboard.press('Space');
        assert.equal(await page.locator('#check').isChecked(), true);
        assert.equal(await page.locator('#check').evaluate(el => el.matches(':focus-visible')), true);
        await page.evaluate(() => window.chips.destroy());
      }
    } finally {
      try { await page?.evaluate(() => window.chips?.destroy()); }
      finally { await browser.close(); }
    }
  });
}
