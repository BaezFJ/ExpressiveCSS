import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

const card = (tag, role, name) => `<${tag} class="org-chart-node"><span class="org-chart-role">${role}</span><span class="avatar" aria-hidden="true">${name[0]}</span><span class="org-chart-name">${name}</span></${tag}>`;
const leaf = (role, name) => `<li>${card('div', role, name)}</li>`;
const branch = (role, name, reports) => `<li><details open>${card('summary', role, name)}<ul>${reports.join('')}</ul></details></li>`;
const chart = (id, attrs = '') => `<ul class="org-chart" id="${id}" aria-label="Staff" ${attrs}>${branch('CIO', 'Marisol Okafor', [
  branch('Manager', 'Tobias Lindqvist', [leaf('SE', 'Priya Raman')]),
  branch('Director', 'Desmond Achebe', [leaf('Operations', 'Rafael Montoya'), leaf('Development', 'Hana Sato')]),
  leaf('R&amp;D', 'Ingrid Halvorsen'),
])}</ul>`;

const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body style="margin:0">
<main style="width:1000px">${chart('ltr')}${chart('rtl', 'dir="rtl"')}<div style="width:300px">${chart('narrow')}</div></main>
</body></html>`;

const caretFill = (page) => page.locator('#ltr summary').first().evaluate((summary) => {
  const probe = document.body.appendChild(document.createElement('i'));
  probe.style.backgroundColor = 'CanvasText';
  const canvasText = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return { fill: getComputedStyle(summary, '::after').backgroundColor, canvasText };
});

for (const [name, engine, test] of engines) {
  test(`${name}: org chart centres each manager over its reports, collapses a team and scrolls when wide`, { timeout: 30000 }, async (t) => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
      await page.setContent(markup);
      const geometry = (id) => page.locator(`#${id}`).evaluate((root) => {
        const box = (el) => el.getBoundingClientRect().toJSON();
        const centre = (el) => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; };
        const top = root.querySelector(':scope > li > details > summary');
        const reports = [...root.querySelectorAll(':scope > li > details > ul > li > details > summary, :scope > li > details > ul > li > .org-chart-node')];
        const bar = root.querySelector(':scope > li > details > ul > li');
        return { top: box(top), topCentre: centre(top), reports: reports.map(box), reportCentres: reports.map(centre),
          barEnds: [getComputedStyle(bar, '::before').borderTopWidth, getComputedStyle(bar, '::after').borderTopWidth],
          drop: getComputedStyle(root.querySelector('ul ul'), '::before').borderInlineStartWidth };
      });

      const ltr = await geometry('ltr');
      assert.equal(ltr.reports.length, 3);
      for (let i = 1; i < 3; i++) assert.ok(ltr.reports[i].left > ltr.reports[i - 1].right, 'reports sit side by side, in order');
      for (const r of ltr.reports) assert.ok(r.top > ltr.top.bottom + 20, 'reports sit below their manager, past the connector');
      const span = (ltr.reportCentres[0] + ltr.reportCentres[2]) / 2;
      assert.ok(ltr.topCentre > ltr.reportCentres[0] && ltr.topCentre < ltr.reportCentres[2], 'the manager sits over its reports');
      assert.ok(Math.abs(ltr.topCentre - span) < 200, `the manager is near the middle of the bar (${ltr.topCentre} vs ${span})`);
      assert.deepEqual(ltr.barEnds, ['0px', '1px'], 'the bar stops at the first report');
      assert.equal(ltr.drop, '1px', 'a line drops from the manager');

      const rtl = await geometry('rtl');
      assert.ok(rtl.reports[0].left > rtl.reports[2].right, 'right to left mirrors the order');
      const rtlBar = await page.locator('#rtl > li > details > ul > li').first().evaluate((li) =>
        parseFloat(getComputedStyle(li, '::before').left) / li.getBoundingClientRect().width);
      assert.ok(Math.abs(rtlBar - 0.5) < 0.01, 'right to left trims the bar on the first report\'s right');

      const narrow = await page.locator('#narrow').evaluate((el) => {
        el.scrollLeft = 0;
        const lefts = [...el.querySelectorAll('.org-chart-node')].map((n) => n.getBoundingClientRect().left);
        return { client: el.clientWidth, scroll: el.scrollWidth, first: Math.min(...lefts) - el.getBoundingClientRect().left };
      });
      assert.ok(narrow.scroll > narrow.client, 'a wide chart scrolls inside its list');
      assert.ok(narrow.first >= -1, 'the start of an overflowing chart stays reachable');

      const desmond = page.locator('#ltr summary', { hasText: 'Desmond Achebe' });
      assert.equal(await page.locator('#ltr').getByText('Rafael Montoya').isVisible(), true);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await desmond.focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#ltr').getByText('Rafael Montoya').isVisible(), false, 'Enter on a manager collapses the team');
      assert.equal(await desmond.evaluate((el) => getComputedStyle(el, '::after').rotate), 'none', 'the caret turns back at once under reduced motion');

      const snapshot = await page.locator('#ltr').ariaSnapshot();
      assert.match(snapshot, /list "Staff"/);
      assert.match(snapshot, /listitem:[\s\S]*Marisol Okafor[\s\S]*list:[\s\S]*listitem/, 'the reports are a nested list');

      if (name === 'chromium') {
        await page.emulateMedia({ forcedColors: 'active' });
        const caret = await caretFill(page);
        assert.equal(caret.fill, caret.canvasText, 'forced colors paint the caret in CanvasText');
      }

      if (name === 'chromium' && process.env.ORG_CHART_SCREENSHOT) await page.screenshot({ path: process.env.ORG_CHART_SCREENSHOT, fullPage: true });
    } finally {
      await browser.close();
    }
  });
}
