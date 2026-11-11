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

for (const [engine, type, browserTest] of engines) {
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
