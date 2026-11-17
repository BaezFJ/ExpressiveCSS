import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

const filler = '<p style="height:1500px">Filler</p>';
const page = (header, extra = '') => `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
${header}
<main>${filler}<h2 id="target">Target heading</h2>${filler}${extra}</main>
</body></html>`;

const small = '<header><nav class="bar"><h1>App</h1></nav></header>';
const medium = '<header class="medium"><nav class="bar"><h1>App</h1></nav></header>';
const mediumSubtitle = '<header class="medium"><nav class="bar"><hgroup><h1>App</h1><p>Subtitle</p></hgroup></nav></header>';
const large = '<header class="large"><nav class="bar"><h1>App</h1></nav></header>';
const largeSubtitle = '<header class="large"><nav class="bar"><hgroup><h1>App</h1><p>Subtitle</p></hgroup></nav></header>';
const collapsedLarge = '<header class="large collapsed"><nav class="bar"><h1>App</h1></nav></header>';
const demoOnly = '<article><header class="medium"><nav class="bar"><h1>Demo</h1></nav></header></article>';

// Follow a fragment link the way a person does, then read where the heading
// and the bar ended up in the viewport.
const follow = async (p) => {
  // setContent keeps the previous URL fragment. Make this a new navigation
  // and wait for native fragment scrolling before measuring the sticky bar.
  await p.evaluate(() => { location.hash = ''; location.hash = 'target'; });
  await p.waitForFunction(() => {
    const top = document.getElementById('target').getBoundingClientRect().top;
    return top >= 0 && top < innerHeight;
  });
  return p.evaluate(() => {
    const heading = document.getElementById('target').getBoundingClientRect();
    const bar = document.querySelector('body > header')?.getBoundingClientRect();
    return { top: heading.top, barBottom: bar ? bar.bottom : 0 };
  });
};

for (const [name, engine, test] of engines) {
  test(`${name}: a heading reached through a fragment link rests below a sticky top app bar`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const p = await browser.newPage({ viewport: { width: 800, height: 600 }, reducedMotion: 'reduce' });

      for (const [label, header] of [['small bar', small], ['medium bar', medium], ['medium bar with a subtitle', mediumSubtitle], ['large bar', large], ['large bar with a subtitle', largeSubtitle], ['collapsed large bar', collapsedLarge]]) {
        await p.setContent(page(header));
        const { top, barBottom } = await follow(p);
        assert.ok(barBottom > 0, `${label}: the bar is on screen`);
        assert.ok(top >= barBottom - 0.5, `${label}: heading top ${top} is below the bar bottom ${barBottom}`);
        assert.ok(top <= barBottom + 16, `${label}: heading top ${top} stays close to the bar bottom ${barBottom}`);
      }

      for (const [label, header] of [['no bar', ''], ['a demo bar inside an article', demoOnly]]) {
        await p.setContent(page(header));
        const { top } = await follow(p);
        assert.ok(Math.abs(top) < 1, `${label}: heading comes to rest at the top, got ${top}`);
      }

      await p.setContent(page(small, `<dialog><h2 id="in-dialog">Dialog</h2></dialog>
<section class="scrollspy" id="spy"><p>Spy</p></section>
<h2 id="spy-heading" class="scrollspy">Spy heading</h2>
<div class="pane"><section><h2 id="in-pane">Pane</h2></section></div>`));
      const margins = await p.evaluate(() => Object.fromEntries(['in-dialog', 'spy', 'spy-heading', 'in-pane']
        .map((id) => [id, getComputedStyle(document.getElementById(id)).scrollMarginBlockStart])));
      assert.deepEqual(margins, { 'in-dialog': '0px', spy: '200px', 'spy-heading': '200px', 'in-pane': '0px' },
        'dialog and pane headings get no offset and scrollspy targets keep their own');

      // A page that sets the token to 0, as the migration note says, opts out.
      await p.setContent(page(small).replace('</style>', ':root { --md-comp-top-app-bar-anchor-offset: 0px; }</style>'));
      const { top } = await follow(p);
      assert.ok(Math.abs(top) < 1, `token set to 0: heading comes to rest at the top, got ${top}`);
    } finally {
      await browser.close();
    }
  });
}
