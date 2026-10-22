// The measured tooltip, used where CSS anchor positioning is missing, keeps
// its box in the viewport: past or near an edge it moves in, and a box that
// fits stays where it was placed, including inside the body's margin.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
// Read before the bundle, which decides at load whether to anchor.
const noAnchors = `<script>const supports = CSS.supports.bind(CSS); CSS.supports = (...args) => !/anchor/.test(args.join(' ')) && supports(...args);</script>`;
// margin + transitionMovement: how far in from the left and top edges a clamped box starts.
const OFFSET = 10;

for (const [engine, browserType, browserTest] of engines) {
  for (const dir of ['ltr', 'rtl']) {
    browserTest(`${engine}: a measured tooltip stays in the viewport at each edge, scrolled and in the body margin (${dir})`, async () => {
      const browser = await leaseBrowser(browserType);
      try {
        const page = await browser.newPage({ viewport: { width: 500, height: 400 } });
        await page.setContent(`<!doctype html><html lang="en" dir="${dir}"><head><style>${css}</style></head>
          <body style="margin: 40px; height: 3000px"><button id="t" style="position: absolute; width: 20px; height: 20px; padding: 0">i</button>
          ${noAnchors}<script>${js}</script></body></html>`);
        // Opens the tooltip on a trigger at viewport (x, y) after scrolling the
        // page down by `scroll`, and returns its box in viewport coordinates.
        const place = (args) => page.evaluate(async ({ x, y, position, scroll }) => {
          window.scrollTo(0, scroll);
          const trigger = document.getElementById('t');
          Object.assign(trigger.style, { left: `${x}px`, top: `${y + scroll}px` });
          const tooltip = Expressive.Tooltip.init(trigger, { text: 'Tip text', position, margin: 4, transitionMovement: 6, enterDelay: 0, inDuration: 0, outDuration: 0 });
          try {
            tooltip.open();
            await new Promise((resolve) => setTimeout(resolve, 50));
            const tip = tooltip.tooltipEl;
            const left = parseFloat(tip.style.left) - window.scrollX;
            const top = parseFloat(tip.style.top) - window.scrollY;
            return { left, top, right: left + tip.offsetWidth, bottom: top + tip.offsetHeight, width: tip.offsetWidth, below: trigger.getBoundingClientRect().bottom + 4, innerWidth, innerHeight };
          } finally {
            tooltip.destroy();
          }
        }, args);

        for (const scroll of [0, 500]) {
          const left = await place({ x: 2, y: 150, position: 'left', scroll });
          assert.equal(left.left, OFFSET, `past the left edge it starts ${OFFSET}px in (scroll ${scroll})`);
          const right = await place({ x: 478, y: 150, position: 'right', scroll });
          assert.equal(right.right, right.innerWidth, `past the right edge it ends at the edge (scroll ${scroll})`);
          const top = await place({ x: 240, y: 2, position: 'top', scroll });
          assert.equal(top.top, OFFSET, `past the top edge it starts ${OFFSET}px in (scroll ${scroll})`);
          const bottom = await place({ x: 240, y: 378, position: 'bottom', scroll });
          assert.equal(bottom.bottom, bottom.innerHeight, `past the bottom edge it ends at the edge (scroll ${scroll})`);
          const fits = await place({ x: 240, y: 150, position: 'bottom', scroll });
          assert.equal(fits.top, fits.below, `a tooltip that fits stays under its trigger (scroll ${scroll})`);
        }

        // Inside the body's 40px margin but clear of the 10px edge offset: it
        // stays beside its trigger rather than moving out to the edge.
        const { width } = await place({ x: 200, y: 150, position: 'left', scroll: 0 });
        const inMargin = await place({ x: 25 + width + 4, y: 150, position: 'left', scroll: 0 });
        assert.equal(inMargin.left, 25, 'a tooltip in the body margin is not moved');
      } finally {
        await browser.close();
      }
    });
  }
}
