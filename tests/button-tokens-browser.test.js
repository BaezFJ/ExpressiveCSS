import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compileString } from 'sass';
import { engines, leaseBrowser } from './browser.js';

const sheets = {
  full: readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8'),
  selective: compileString('@use "custom" with ($components: ("buttons",), $utilities: (), $expressive-include-fonts: false);', {
    loadPaths: [fileURLToPath(new URL('../src/sass', import.meta.url))],
  }).css,
};

const widgetSheets = {
  full: sheets.full,
  selective: compileString('@use "custom" with ($components: ("icons-material-design", "buttons", "navbar", "toolbar"), $utilities: (), $expressive-include-fonts: false);', {
    loadPaths: [fileURLToPath(new URL('../src/sass', import.meta.url))],
  }).css,
};

for (const [engine, type, browserTest] of engines) {
  browserTest(`${engine}: cut corners preserve host-styled icon actions and their circular hit area`, async () => {
    const browser = await leaseBrowser(type);
    try {
      const page = await browser.newPage({ reducedMotion: 'reduce' });
      for (const [build, css] of Object.entries(widgetSheets)) {
        await page.setContent(`<style>${css}</style><div corners="cut">
          <div class="toolbar"><button id="toolbar" class="active" aria-label="Edit"><span class="material-symbols" aria-hidden="true">edit</span></button></div>
          <header><nav aria-label="Main"><button id="appbar" aria-label="Menu"><span class="material-symbols" aria-hidden="true">menu</span></button><h1>Title</h1></nav></header>
          <header><div class="bar"><button id="command" aria-label="Back"><span class="material-symbols" aria-hidden="true">arrow_back</span></button><h2>Commands</h2></div></header>
          <button class="extend small" id="extended"><span class="material-symbols" aria-hidden="true">edit</span><span>Compose</span></button>
        </div>`);
        const actions = await page.evaluate(() => ['toolbar', 'appbar', 'command'].map(id => {
          const button = document.getElementById(id);
          const style = getComputedStyle(button);
          const rect = button.getBoundingClientRect();
          return { id, shape: style.getPropertyValue('corner-top-left-shape'), radius: style.borderTopLeftRadius,
            width: rect.width, height: rect.height,
            hit: document.elementFromPoint(rect.left + rect.width * 0.2, rect.top + rect.height * 0.2)?.closest('button')?.id };
        }));
        for (const action of actions) {
          assert.notEqual(action.shape, 'superellipse(0)', `${build}, ${action.id}: retains round corners`);
          assert.equal(action.radius, '50%', `${build}, ${action.id}: circular action`);
          assert.equal(action.width, 48, `${build}, ${action.id}: width`);
          assert.equal(action.height, 48, `${build}, ${action.id}: height`);
          assert.equal(action.hit, action.id, `${build}, ${action.id}: circular hit area`);
        }
        const extended = await page.locator('#extended').evaluate(el => getComputedStyle(el).getPropertyValue('corner-top-left-shape'));
        assert.notEqual(extended, 'superellipse(0)', `${build}: the extended FAB retains its own shape`);
      }
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: cut corners cover semantic buttons without beveling round controls`, async () => {
    const browser = await leaseBrowser(type);
    try {
      const page = await browser.newPage();
      const supported = await page.evaluate(() => CSS.supports('corner-shape', 'bevel'));
      for (const [build, css] of Object.entries(sheets)) {
        await page.setContent(`<style>${css}</style><div corners="cut">
          <button id="native">Button</button><a id="link" class="button" href="#">Link</a>
          <label id="label" class="button">Label</label><button id="square" class="square">Square</button>
          <button id="circle" class="circle">Circle</button><button id="fab" class="extra circle">FAB</button>
          <button id="icon" class="icon-button">Icon</button><button id="day" class="datepicker-day-button">Day</button>
          <div corners="round"><button id="round">Round subtree</button></div>
        </div>`);
        const shapes = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[id]')].map(el => [el.id, getComputedStyle(el).getPropertyValue('corner-top-left-shape')])));
        for (const id of ['native', 'link', 'label', 'square']) {
          if (supported) assert.equal(shapes[id], 'superellipse(0)', `${build}, ${id}`);
          else assert.notEqual(shapes[id], 'superellipse(0)', `${build}, ${id}: rounded fallback`);
        }
        for (const id of ['circle', 'fab', 'icon', 'day', 'round']) {
          assert.notEqual(shapes[id], 'superellipse(0)', `${build}, ${id}: retains its own shape`);
        }
      }
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: filled button color overrides persist through interaction states`, async () => {
    const browser = await leaseBrowser(type);
    try {
      const page = await browser.newPage({ reducedMotion: 'reduce' });
      for (const [build, css] of Object.entries(sheets)) {
        await page.setContent(`<html theme="light"><head><style>${css}
          .hover-reference { background: color-mix(in oklab, black 8%, red); }
          .focus-reference { background: color-mix(in oklab, black 10%, red); }
        </style></head><body style="--md-comp-filled-button-container-color:red;--md-comp-filled-button-label-text-color:black">
          <button id="inherited">Inherited colors</button>
          <button id="own" style="--md-comp-filled-button-container-color:red;--md-comp-filled-button-label-text-color:black">Own colors</button>
          <div class="hover-reference"></div><div class="focus-reference"></div>
        </body></html>`);
        const read = selector => page.locator(selector).evaluate(el => getComputedStyle(el).backgroundColor);
        const hover = await read('.hover-reference');
        const focus = await read('.focus-reference');
        for (const id of ['inherited', 'own']) {
          const button = page.locator(`#${id}`);
          await button.hover();
          assert.equal(await read(`#${id}`), hover, `${build}, ${id}: hover`);
          await button.focus();
          assert.equal(await read(`#${id}`), focus, `${build}, ${id}: focus`);
          await page.mouse.down();
          assert.equal(await read(`#${id}`), focus, `${build}, ${id}: press`);
          await page.mouse.up();
          await button.evaluate(el => el.blur());
          await page.mouse.move(0, 0);
          assert.equal(await read(`#${id}`), 'rgb(255, 0, 0)', `${build}, ${id}: rest`);
        }
      }
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: filled buttons follow subtree contrast and preserve authored color tokens`, async () => {
    const browser = await leaseBrowser(type);
    try {
      const page = await browser.newPage({ reducedMotion: 'reduce' });
      for (const [build, css] of Object.entries(sheets)) {
        for (const theme of ['light', 'dark']) {
          await page.setContent(`<html theme="${theme}"><head><style>${css}</style></head><body>
            ${['medium', 'high'].map(level => `<div contrast="${level}">
              <button>Button</button><a class="button" href="#">Link</a><label class="button">Label</label>
              <div class="reference" style="background:var(--md-sys-color-primary);color:var(--md-sys-color-on-primary)">Reference</div>
            </div>`).join('')}
            <button id="root-hook">Root token</button>
            <div style="--md-comp-filled-button-container-color:lime;--md-comp-filled-button-label-text-color:navy">
              <button id="ancestor-hook">Ancestor token</button>
              <button id="own-hook" style="--md-comp-filled-button-container-color:red;--md-comp-filled-button-label-text-color:white">Own token</button>
            </div>
          </body></html>`);
          const mismatches = await page.evaluate(() => [...document.querySelectorAll('[contrast]')].flatMap(group => {
            const reference = getComputedStyle(group.querySelector('.reference'));
            return [...group.querySelectorAll('button, a, label')].filter(button => {
              const style = getComputedStyle(button);
              return style.backgroundColor !== reference.backgroundColor || style.color !== reference.color;
            }).map(button => group.getAttribute('contrast') + ': ' + button.outerHTML);
          }));
          assert.deepEqual(mismatches, [], `${build}, ${theme}`);

          await page.evaluate(() => {
            document.documentElement.style.setProperty('--md-comp-filled-button-container-color', 'blue');
            document.documentElement.style.setProperty('--md-comp-filled-button-label-text-color', 'yellow');
          });
          const colors = await page.evaluate(() => ['root-hook', 'ancestor-hook', 'own-hook'].map(id => {
            const style = getComputedStyle(document.getElementById(id));
            return [style.backgroundColor, style.color];
          }));
          assert.deepEqual(colors, [
            ['rgb(0, 0, 255)', 'rgb(255, 255, 0)'],
            ['rgb(0, 255, 0)', 'rgb(0, 0, 128)'],
            ['rgb(255, 0, 0)', 'rgb(255, 255, 255)'],
          ], `${build}, ${theme}: authored tokens`);
        }
      }
    } finally {
      await browser.close();
    }
  });
}

for (const [engine, type, browserTest] of engines) {
  browserTest(`${engine}: summary.button is drawn like the same button and still toggles its details`, async () => {
    const browser = await leaseBrowser(type);
    try {
      const page = await browser.newPage({ reducedMotion: 'reduce' });
      for (const [build, css] of Object.entries(sheets)) {
        await page.setContent(`<style>${css}</style>
          <details id="details"><summary id="summary" class="button tonal">Filters</summary><p>Panel</p></details>
          <button id="reference" class="tonal">Filters</button>
          <details><summary id="plain">Plain</summary></details>`);
        // The previous build's click leaves the pointer over the summary.
        await page.mouse.move(0, 500);
        const result = await page.evaluate(() => {
          const pick = (id) => {
            const style = getComputedStyle(document.getElementById(id));
            const rect = document.getElementById(id).getBoundingClientRect();
            return { display: style.display, height: rect.height, background: style.backgroundColor, color: style.color, radius: style.borderTopLeftRadius, font: style.font };
          };
          return {
            summary: pick('summary'),
            reference: pick('reference'),
            marker: getComputedStyle(document.getElementById('summary')).listStyleType,
            plain: getComputedStyle(document.getElementById('plain')).display
          };
        });
        assert.deepEqual(result.summary, result.reference, `${build}: same box and colors as the button`);
        assert.equal(result.marker, 'none', `${build}: no disclosure marker`);
        assert.equal(result.plain, 'list-item', `${build}: a summary without the class is untouched`);
        await page.click('#summary');
        assert.equal(await page.locator('#details').evaluate((el) => el.open), true, `${build}: clicking opens the details`);
        await page.focus('#summary');
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#details').evaluate((el) => el.open), false, `${build}: Enter closes it`);
      }
    } finally {
      await browser.close();
    }
  });
}
