import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines, leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const markup = `
  <header><nav aria-label="Main"><form role="search"><input id="nav" aria-label="Search" value="Search recipes"></form></nav></header>
  <header><div class="bar"><form role="search"><input id="bar" aria-label="Search" value="Search recipes"></form></div></header>
  <article><figure><img alt="" width="300" height="160"><figcaption id="direct">A caption</figcaption></figure></article>
  <article><a class="primary-action" href="#target"><figure><img alt="" width="300" height="160"><figcaption id="linked">A caption</figcaption></figure></a></article>
  <span id="body" class="body-large">Body reference</span><span id="title" class="title-medium">Title reference</span>`;
const measure = page => page.evaluate(() => Object.fromEntries(
  ['nav', 'bar', 'direct', 'linked', 'body', 'title'].map(id => {
    const style = getComputedStyle(document.getElementById(id));
    return [id, Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'].map(property => [property, style[property]]))];
  })
));

for (const [name, engine, test] of engines) {
  test(`${name}: app bar forms and card captions follow complete type roles`, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${css}</style>${markup}`);
      const baseline = await measure(page);
      for (const [id, reference, weight, tracking] of [['nav', 'body', '400', 0.5], ['bar', 'body', '400', 0.5], ['direct', 'title', '500', 0.15], ['linked', 'title', '500', 0.15]]) {
        assert.deepEqual(baseline[id], baseline[reference], id);
        assert.equal(baseline[id].fontSize, '16px');
        assert.equal(baseline[id].lineHeight, '24px');
        assert.equal(baseline[id].fontWeight, weight);
        assert.ok(Math.abs(parseFloat(baseline[id].letterSpacing) - tracking) < 0.001, id);
      }
      for (const [role, reference, ids] of [['body-large', 'body', ['nav', 'bar']], ['title-medium', 'title', ['direct', 'linked']]]) {
        await page.evaluate(role => {
          for (const [property, value] of Object.entries({ 'font-family-name': 'serif', 'font-size': '21px', 'font-weight': '700', 'line-height': '31px', 'letter-spacing': '2px' })) {
            document.documentElement.style.setProperty(`--md-sys-typescale-${role}-${property}`, value);
          }
        }, role);
        const changed = await measure(page);
        assert.deepEqual(changed[reference], { fontFamily: 'serif', fontSize: '21px', fontWeight: '700', lineHeight: '31px', letterSpacing: '2px' });
        for (const id of ids) assert.deepEqual(changed[id], changed[reference], `${role}: ${id}`);
        for (const id of role === 'body-large' ? ['direct', 'linked', 'title'] : ['nav', 'bar', 'body']) assert.deepEqual(changed[id], baseline[id], `unchanged ${id}`);
        await page.evaluate(() => { document.documentElement.removeAttribute('style'); });
        assert.deepEqual(await measure(page), baseline);
      }
      await page.addStyleTag({ content: '#nav, #bar, #direct, #linked { letter-spacing: 3px; }' });
      const overridden = await measure(page);
      for (const id of ['nav', 'bar', 'direct', 'linked']) assert.equal(overridden[id].letterSpacing, '3px', id);
    } finally {
      await browser.close();
    }
  });
}
