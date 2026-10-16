// A text field's icon and the input's padding must agree on a side. The icons
// follow the field's dir; an input may carry its own (dir="auto" for mixed
// text, dir="ltr" for an email address on an RTL page), and padding that
// followed the input put the text under the icon.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const field = (inputDir) => `<div class="field" style="width:320px">
  <span class="material-symbols prefix" aria-hidden="true">search</span>
  <input id="q" type="text" placeholder=" " ${inputDir ? `dir="${inputDir}"` : ''}><label for="q">Search</label>
  <span class="material-symbols suffix" aria-hidden="true">mic</span></div>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: field icons and input padding share the field's direction`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      for (const [pageDir, inputDir] of [['ltr', ''], ['ltr', 'rtl'], ['ltr', 'auto'], ['rtl', ''], ['rtl', 'ltr']]) {
        await page.setContent(`<!doctype html><html lang="en" dir="${pageDir}"><head><style>${css}</style></head><body>${field(inputDir)}</body></html>`);
        const r = await page.evaluate(() => {
          const box = (s) => document.querySelector(s).getBoundingClientRect();
          const cs = getComputedStyle(document.getElementById('q'));
          const input = box('#q');
          return { prefixAtLeft: box('.prefix').left - input.left < input.width / 2, padLeft: cs.paddingLeft, padRight: cs.paddingRight };
        });
        const label = `${pageDir} page, input dir=${inputDir || 'inherited'}`;
        assert.equal(r.prefixAtLeft, pageDir === 'ltr', `${label}: prefix side`);
        assert.deepEqual([r.padLeft, r.padRight], ['52px', '52px'], `${label}: both icons keep their clearance`);
      }
      // One icon: the clearance sits on the icon's side only.
      await page.setContent(`<!doctype html><html lang="en" dir="rtl"><head><style>${css}</style></head><body>
        <div class="field" style="width:320px"><span class="material-symbols prefix">search</span><input id="q" dir="ltr" placeholder=" "><label for="q">Email</label></div></body></html>`);
      const one = await page.evaluate(() => { const cs = getComputedStyle(document.getElementById('q')); return [cs.paddingLeft, cs.paddingRight]; });
      assert.deepEqual(one, ['16px', '52px'], 'rtl field, ltr input: the prefix clearance is on the right, with the icon');
    } finally {
      await browser.close();
    }
  });
}
