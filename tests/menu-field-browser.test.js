import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import utilsBundle from 'playwright-core/lib/utilsBundle';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(type.executablePath()) ? test : test.skip;
  for (const scenario of ['disabled', 'reset', 'refresh', 'interaction']) browserTest(`Select native form synchronization: ${scenario} (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage();
      await page.setContent(`<style>${css}</style><form id="form"><select id="native" name="choice" class="browser-default"><option value="a" selected>Alpha</option><option value="b">Beta</option><option value="c" disabled>Charlie</option><optgroup label="Unavailable" disabled><option value="d">Delta</option></optgroup></select><button type="reset">Reset</button><button type="button" id="outside">Outside</button></form>`);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => {
        const native = document.querySelector('select');
        const enhanced = native.cloneNode(true);
        enhanced.id = 'enhanced'; enhanced.className = '';
        native.after(enhanced);
        window.select = Expressive.FormSelect.init(enhanced, { menuOptions: { inDuration: 0, outDuration: 0 } });
        window.changes = 0;
        enhanced.addEventListener('change', () => window.changes++);
      });
      if (scenario === 'disabled') {
        for (const multiple of [false, true]) {
          await page.evaluate(multiple => {
            window.select.destroy();
            document.querySelectorAll('select').forEach(el => { el.multiple = multiple; el.value = 'a'; });
            window.select = Expressive.FormSelect.init(document.querySelector('#enhanced'), { menuOptions: { inDuration: 0, outDuration: 0 } });
          }, multiple);
          assert.deepEqual(await page.evaluate(() => [...window.select.menuEl.querySelectorAll('[role="option"]')].map(el => el.getAttribute('aria-disabled') === 'true')), [false, false, true, true]);
          await page.evaluate(() => window.select.menu.open());
          for (const label of ['Charlie', 'Delta']) {
            await page.evaluate(() => window.select.menu.open());
            await page.locator('menu').getByRole('option', { name: label }).evaluate(el => el.click());
            assert.deepEqual(await page.evaluate(() => window.select.getSelectedValues()), ['a']);
          }
          for (const [value, label] of [['c', 'Charlie'], ['d', 'Delta']]) {
            await page.evaluate(value => {
              document.querySelectorAll('select').forEach(el => { el.value = value; });
              window.select.refresh();
            }, value);
            assert.equal(await page.evaluate(() => window.select.input.value), label);
          }
          assert.deepEqual(await page.evaluate(() => new FormData(document.querySelector('form')).getAll('choice')), []);
          await page.evaluate(() => {
            document.querySelectorAll('select').forEach(el => { el.selectedIndex = -1; });
            window.select.refresh();
          });
          assert.equal(await page.evaluate(() => window.select.input.value), '');
        }
        assert.equal(await page.evaluate(() => window.changes), 0);
      } else if (scenario === 'reset') {
        for (const multiple of [false, true]) {
          await page.evaluate(multiple => {
            window.select.destroy();
            document.querySelectorAll('select').forEach(el => { el.multiple = multiple; el.value = 'b'; });
            window.select = Expressive.FormSelect.init(document.querySelector('#enhanced'));
          }, multiple);
          await page.getByRole('button', { name: 'Reset', exact: true }).click();
          await expect(page.locator('input[role="combobox"]')).toHaveValue('Alpha');
          assert.deepEqual(await page.evaluate(() => [...window.select.menuEl.querySelectorAll('[role="option"]')].map(el => el.ariaSelected)), ['true', 'false', 'false', 'false']);
          assert.deepEqual(await page.evaluate(() => new FormData(document.querySelector('form')).getAll('choice')), ['a', 'a']);
          await page.evaluate(() => {
            document.querySelectorAll('select').forEach(el => { el.value = 'b'; });
            window.select.refresh();
            document.querySelector('form').addEventListener('reset', e => e.preventDefault(), { once: true });
          });
          await page.getByRole('button', { name: 'Reset', exact: true }).click();
          await expect(page.locator('input[role="combobox"]')).toHaveValue('Beta');
          assert.equal(await page.evaluate(() => window.changes), 0);
        }
        await page.evaluate(() => {
          window.select.el.form.addEventListener('reset', () => window.select.refresh(), { once: true });
          window.select.el.form.reset();
        });
        await expect(page.locator('input[role="combobox"]')).toHaveValue('Alpha');
        assert.deepEqual(await page.evaluate(() => [...window.select.menuEl.querySelectorAll('[role="option"]')].map(el => el.ariaSelected)), ['true', 'false', 'false', 'false']);
        for (const method of ['attribute', 'move']) {
          await page.evaluate(method => {
            const form = document.createElement('form');
            form.id = `owner-${method}`;
            document.body.append(form);
            if (method === 'attribute') window.select.el.setAttribute('form', form.id);
            else {
              window.select.el.removeAttribute('form');
              form.append(window.select.wrapper);
            }
            window.select.el.value = 'b';
            window.select.refresh();
            form.reset();
          }, method);
          await expect(page.locator('input[role="combobox"]')).toHaveValue('Alpha');
          assert.deepEqual(await page.evaluate(() => [...window.select.menuEl.querySelectorAll('[role="option"]')].map(el => el.ariaSelected)), ['true', 'false', 'false', 'false']);
          await page.evaluate(() => {
            window.select.el.value = 'b';
            window.select.refresh();
            window.select.el.form.addEventListener('reset', e => e.preventDefault(), { once: true });
            window.select.el.form.reset();
          });
          await expect(page.locator('input[role="combobox"]')).toHaveValue('Beta');
        }
        await page.evaluate(() => {
          window.select.el.value = 'a';
          document.querySelector('#form').reset();
          document.querySelector('#owner-attribute').reset();
        });
        await page.waitForTimeout(30);
        await expect(page.locator('input[role="combobox"]')).toHaveValue('Beta');
        assert.equal(await page.evaluate(() => window.changes), 0);
      } else if (scenario === 'refresh') {
        await page.evaluate(() => {
          window.select.el.disabled = true;
          window.select.refresh();
        });
        await expect(page.locator('input[role="combobox"]')).toBeDisabled();
        assert.deepEqual(await page.evaluate(() => {
          window.select.menuEl.querySelectorAll('[role="option"]')[1].click();
          return new FormData(document.querySelector('form')).getAll('choice');
        }), ['a']);
        await page.evaluate(() => {
          window.select.destroy();
          window.select = Expressive.FormSelect.init(document.querySelector('#enhanced'), { menuOptions: { inDuration: 0, outDuration: 0 } });
          window.select.el.disabled = false;
          window.select.refresh();
        });
        await page.locator('input[role="combobox"]').click();
        await expect(page.locator('menu')).toHaveCSS('opacity', '1');
        await page.locator('menu').getByRole('option', { name: 'Beta', exact: true }).focus();
        await page.evaluate(() => {
          window.oldRow = window.select.menuEl.querySelectorAll('[role="option"]')[1];
          window.select.el.options[1].textContent = 'Updated';
          window.select.el.value = 'b';
          window.select.refresh();
        });
        await expect(page.locator('menu').getByRole('option', { name: 'Updated', exact: true })).toBeFocused();
        assert.equal(await page.evaluate(() => document.getElementById(window.select.input.getAttribute('aria-activedescendant'))?.textContent), 'Updated');
        await page.keyboard.press('Escape');
        await expect(page.locator('input[role="combobox"]')).toBeFocused();
        await page.evaluate(() => window.oldRow.click());
        assert.equal(await page.evaluate(() => window.changes), 0);
        await page.locator('input[role="combobox"]').click();
        await page.locator('menu').getByRole('option', { name: 'Alpha', exact: true }).press('Enter');
        assert.equal(await page.evaluate(() => window.changes), 1);
        await page.evaluate(() => {
          window.select.el.value = 'b';
          window.select.el.dispatchEvent(new Event('change', { bubbles: true }));
        });
        assert.deepEqual(await page.evaluate(() => [...window.select.menuEl.querySelectorAll('[role="option"]')].map(el => el.ariaSelected)), ['false', 'true', 'false', 'false']);
        await page.evaluate(() => {
          document.querySelector('#outside').focus();
          window.select.el.querySelector('optgroup').disabled = false;
          window.select.el.options[0].remove();
          window.select.refresh();
        });
        await expect(page.locator('#outside')).toBeFocused();
        assert.equal(await page.evaluate(() => window.select.menuEl.querySelectorAll('[role="option"]')[2].ariaDisabled), null);
      } else {
        for (const direction of ['ltr', 'rtl']) for (const motion of ['reduce', 'no-preference']) {
          await page.emulateMedia({ reducedMotion: motion });
          await page.evaluate(direction => {
            window.select.destroy();
            document.documentElement.dir = direction;
            const el = document.querySelector('#enhanced');
            el.multiple = true; el.value = 'a';
            window.select = Expressive.FormSelect.init(el, { menuOptions: { inDuration: 0, outDuration: 0 } });
            window.changes = 0;
          }, direction);
          await page.locator('input[role="combobox"]').click();
          await page.locator('menu').getByRole('option', { name: 'Beta', exact: true }).locator('label span').click();
          assert.deepEqual(await page.evaluate(() => window.select.getSelectedValues()), ['a', 'b']);
          await page.locator('menu').getByRole('option', { name: 'Beta', exact: true }).press(' ');
          assert.deepEqual(await page.evaluate(() => window.select.getSelectedValues()), ['a']);
          await page.locator('menu').getByRole('option', { name: 'Alpha', exact: true }).press('ArrowDown');
          await expect(page.locator('menu').getByRole('option', { name: 'Beta', exact: true })).toBeFocused();
          await page.keyboard.press('Enter');
          assert.deepEqual(await page.evaluate(() => new FormData(document.querySelector('form')).getAll('choice')), ['a', 'a', 'b']);
          assert.equal(await page.evaluate(() => window.changes), 3);
          assert.deepEqual(await page.locator('menu input[type="checkbox"]').evaluateAll(els => els.map(el => el.checked)), [true, true]);
          await page.keyboard.press('Escape');
          await expect(page.locator('input[role="combobox"]')).toBeFocused();
        }
        await page.evaluate(() => {
          document.querySelector('#native').classList.remove('browser-default');
          window.other = Expressive.FormSelect.init(document.querySelector('#native'));
          window.detachedInput = window.select.input;
          document.querySelector('form').reset();
          window.select.input.value = 'Keep detached';
          window.select.destroy();
        });
        await page.waitForTimeout(30);
        assert.equal(await page.evaluate(() => window.detachedInput.value), 'Keep detached');
        assert.equal(await page.evaluate(() => window.other.input.value), 'Alpha');
        assert.equal(await page.evaluate(() => document.querySelector('#enhanced').Expressive_FormSelect), undefined);
      }
    } finally { try { await page?.evaluate(() => { if (window.select?.el.Expressive_FormSelect) window.select.destroy(); window.other?.destroy(); }); } finally { await browser.close(); } }
  });
}

for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(type.executablePath()) ? test : test.skip;
  browserTest(`Panes use the nearest available width at layout boundaries (${engine})`, async () => {
    const browser = await type.launch();
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${css}</style><div id="outer" style="container-type:inline-size"><div id="host"><div id="layout"><section class="list-pane">List</section><section class="detail-pane">Detail</section><section class="supporting-pane">Supporting</section></div></div></div>`);
      for (const variant of ['panes', 'pane-layout', 'list-detail', 'panes list-detail', 'panes supporting', 'supporting-pane-layout', 'panes supporting start', 'panes supporting left', 'supporting-pane-layout start', 'supporting-pane-layout left', 'panes equal', 'pane-layout equal', 'panes three-pane', 'pane-layout three-pane', 'panes equal separated', 'pane-layout equal floating']) {
        for (const direction of ['ltr', 'rtl']) for (const viewport of [700, 1440]) {
          await page.setViewportSize({ width: viewport, height: 700 });
          for (const width of [320, 839, 840, 841, 1199, 1200, 1201]) {
            const result = await page.evaluate(({ variant, direction, width }) => {
              const host = document.querySelector('#host'), layout = document.querySelector('#layout');
              host.style.cssText = `container-type:inline-size;width:${width}px;height:400px`;
              layout.className = variant;
              layout.dir = direction;
              if (!variant.includes('three-pane') && layout.children.length === 3) layout.lastElementChild.remove();
              if (variant.includes('three-pane') && layout.children.length === 2) layout.appendChild(Object.assign(document.createElement('section'), { className: 'supporting-pane', textContent: 'Supporting' }));
              const children = [...layout.children];
              const columns = getComputedStyle(layout).gridTemplateColumns.split(' ').map(parseFloat);
              return { columns, visible: children.map(el => getComputedStyle(el).display !== 'none'), positions: children.map(el => el.getBoundingClientRect().x), margin: parseFloat(getComputedStyle(layout).marginInlineStart), divider: getComputedStyle(children[0]).borderInlineEndWidth };
            }, { variant, direction, width });
            const label = `${variant} ${direction} viewport ${viewport} container ${width}`;
            const count = width < 840 ? 1 : variant.includes('three-pane') && width >= 1200 ? 3 : 2;
            assert.equal(result.columns.length, count, label);
            assert.deepEqual(result.visible, result.visible.map((_, i) => width >= 840 || i === 0), label);
            assert.equal(result.margin, width < 600 ? 16 : 24, label);
            if (width >= 840) {
              assert.equal(result.positions[0] < result.positions[1], direction === 'ltr', label);
              if (variant.includes('equal')) assert.ok(Math.abs(result.columns[0] - result.columns[1]) < 1, label);
              else assert.equal(result.columns[variant.includes('supporting') && !/start|left/.test(variant) ? 1 : 0], 360, label);
            } else assert.equal(result.divider, '0px', label);
          }
        }
      }
      await page.evaluate(() => {
        document.querySelector('#outer').style.containerType = 'normal';
        document.querySelector('#host').style.cssText = 'height:400px';
        document.querySelector('#layout').className = 'panes three-pane';
        if (document.querySelector('#layout').children.length === 2) document.querySelector('#layout').appendChild(Object.assign(document.createElement('section'), { className: 'supporting-pane', textContent: 'Supporting' }));
      });
      for (const width of [839, 840, 841, 1199, 1200, 1201]) {
        await page.setViewportSize({ width, height: 700 });
        assert.equal(await page.locator('#layout').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), width < 840 ? 1 : width < 1200 ? 2 : 3, `viewport fallback ${width}`);
      }
    } finally { await browser.close(); }
  });

  browserTest(`Panes preserve footer icon-button geometry (${engine})`, async () => {
    const browser = await type.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      const sizes = { xsmall: 32, small: 40, medium: 56, large: 96, xlarge: 136 };
      for (const footer of ['footer', 'div class="pane-footer"', 'nav']) {
        const tag = footer.split(' ')[0];
        await page.setContent(`<style>${css}</style><section class="pane"><${footer}>${['button', 'a'].flatMap(control => Object.keys(sizes).map(size => `<${control} class="icon-button ${size}" aria-label="More" ${control === 'a' ? 'href="#more"' : 'type="button"'}><span class="material-symbols" aria-hidden="true">more_vert</span></${control}>`)).join('')}</${tag}></section>`);
        for (const [size, height] of Object.entries(sizes)) {
          const geometry = await page.locator(`.icon-button.${size}`).evaluateAll(els => els.map(el => ({ height: el.getBoundingClientRect().height, width: el.getBoundingClientRect().width, padding: getComputedStyle(el).paddingBlock })));
          assert.deepEqual(geometry, Array(2).fill({ height, width: height, padding: '0px' }), `${footer} ${size}`);
        }
      }
    } finally { await browser.close(); }
  });

  browserTest(`Panes preserve compact selection and independent scrolling (${engine})`, async () => {
    const browser = await type.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 800 } });
      for (const direction of ['ltr', 'rtl']) for (const motion of ['reduce', 'no-preference']) {
        await page.emulateMedia({ reducedMotion: motion });
        await page.setContent(`<style>${css}</style><div id="host" style="container-type:inline-size;width:320px;height:600px"><div class="panes equal" dir="${direction}">${[1, 2].map(n => `<section class="pane" id="pane${n}"><header><h2>Übersetzte Überschrift معلومات إضافية</h2><button type="button">Mehr</button></header><div class="pane-body">${'<p>Weitere Informationen zum ausgewählten Eintrag.</p>'.repeat(40)}<a href="#end">Letzter Eintrag ${n}</a></div><footer><button type="button">Änderungen speichern</button><button type="button">Abbrechen</button></footer></section>`).join('')}</div></div>`);
        await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
        await expect(page.locator('#pane1')).toBeVisible();
        await expect(page.locator('#pane2')).toBeHidden();
        await page.locator('#pane2').evaluate(el => el.classList.add('active'));
        await expect(page.locator('#pane1')).toBeHidden();
        await expect(page.locator('#pane2')).toBeVisible();
        for (const width of [320, 840, 1200]) {
          await page.locator('#host').evaluate((el, width) => { el.style.width = `${width}px`; }, width);
          await page.locator('#pane2 a').focus();
          await expect(page.locator('#pane2 a')).toBeFocused();
          assert.ok(await page.locator('#pane2 .pane-body').evaluate(el => el.scrollTop > 0));
          assert.equal(await page.locator('#pane1 .pane-body').evaluate(el => el.scrollTop), 0);
          for (const target of ['#pane2 header button', '#pane2 footer button:first-child', '#pane2 footer button:last-child']) {
            await page.locator(target).focus();
            assert.ok(await page.locator(target).evaluate(el => {
              const range = document.createRange();
              range.selectNodeContents(el);
              const text = range.getBoundingClientRect(), button = el.getBoundingClientRect();
              return text.top >= button.top - 1 && text.bottom <= button.bottom + 1;
            }), `${direction} ${width} ${target} contains its label`);
            assert.ok(await page.locator(target).evaluate(el => {
              const r = el.getBoundingClientRect(), pane = el.closest('.pane').getBoundingClientRect();
              return r.left >= pane.left - 1 && r.right <= pane.right + 1 && r.top >= pane.top && r.bottom <= pane.bottom && el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
            }), `${direction} ${width} ${target} reachable`);
          }
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          assert.deepEqual(await page.locator('.pane').evaluateAll(els => els.map(el => el.id)), ['pane1', 'pane2']);
        }
        await page.locator('#host').evaluate(el => { el.style.width = '320px'; });
        await expect(page.locator('#pane1')).toBeHidden();
        await page.locator('#pane2').evaluate(el => el.classList.remove('active'));
        await expect(page.locator('#pane1')).toBeVisible();
        await expect(page.locator('#pane2')).toBeHidden();
      }
    } finally { await browser.close(); }
  });
}

for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(type.executablePath()) ? test : test.skip;
  browserTest(`AppBar focus ownership and teardown (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage();
      for (const modal of [false, true]) {
        await page.setContent(`<style>${css}</style><button id="outside">Outside</button>${[1, 2].map(n => `<header class="medium" id="bar${n}"><nav aria-label="Search ${n}"><search class="search-bar"><input type="search" aria-label="Search ${n}" aria-controls="view${n}"></search></nav></header>${modal ? '<dialog' : '<div hidden'} class="search-view" id="view${n}" aria-label="Results ${n}"><input aria-label="Query ${n}"></${modal ? 'dialog' : 'div'}>`).join('')}`);
        await page.addScriptTag({ content: js });
        await page.evaluate(() => {
          window.bars = [...document.querySelectorAll('header')].map(el => Expressive.AppBar.init(el));
          window.searchClosed = 0;
          document.querySelector('#view1').addEventListener('close', () => { searchClosed++; document.querySelector('#outside').focus(); });
        });
        try {
          await page.evaluate(() => { const input = document.querySelector('#bar2 input'); input.disabled = true; input.focus(); });
          await expect(page.locator('#view2')).toBeHidden();
          await page.evaluate(() => { document.querySelector('#bar2 input').disabled = false; });
          await page.locator('#bar1 input').focus();
          if (modal) {
            await page.evaluate(() => document.querySelector('#view1').close());
            await expect.poll(() => page.evaluate(() => searchClosed)).toBe(1);
            await expect(page.locator('#outside')).toBeFocused();
            await page.locator('#bar1 input').focus();
            await expect(page.locator('#view1')).toHaveJSProperty('open', true);
          } else {
            await expect(page.locator('#view1')).toBeVisible();
            await expect(page.locator('#bar1 input')).toHaveAttribute('aria-expanded', 'true');
            await expect(page.locator('#view2')).toBeHidden();
          }
          await page.evaluate(modal => {
            window.sentinel = bars[0]._sentinel;
            bars[0].destroy();
            if (modal) document.querySelector('#view1').close();
            else document.querySelector('#view1').hidden = true;
          }, modal);
          if (modal) await expect.poll(() => page.evaluate(() => searchClosed)).toBe(2);
          await page.locator('#outside').focus();
          await page.locator('#bar1 input').click();
          await expect(page.locator('#view1')).toBeHidden();
          assert.equal(await page.evaluate(() => sentinel.isConnected), false);
          await page.locator('#bar2 input').focus();
          await expect(page.locator('#view2')).toBeVisible();
          await page.evaluate(modal => {
            if (modal) document.querySelector('#view2').close();
            bars[0] = Expressive.AppBar.init(document.querySelector('#bar1'));
            const view = document.querySelector('#view1');
            window.opens = 0;
            if (modal) {
              const show = view.showModal.bind(view);
              view.showModal = () => { opens++; show(); };
            }
          }, modal);
          await page.locator('#bar1 input').click();
          await expect(page.locator('#view1')).toBeVisible();
          if (modal) assert.equal(await page.evaluate(() => opens), 1);
        } finally { await page.evaluate(() => { bars.forEach(bar => bar.destroy()); document.querySelectorAll('dialog').forEach(el => el.close()); }); }
      }
    } finally { try { await page?.evaluate(() => window.bars?.forEach(bar => bar.destroy())); } finally { await browser.close(); } }
  });

  browserTest(`AppBar collapsed actions remain reachable (${engine})`, async () => {
    const browser = await type.launch();
    const fontCss = css.replace('../fonts/material-symbols-outlined.woff2', `data:font/woff2;base64,${readFileSync(new URL('../dist/fonts/material-symbols-outlined.woff2', import.meta.url)).toString('base64')}`);
    let page;
    try {
      page = await browser.newPage({ viewport: { width: 320, height: 600 } });
      for (const variant of ['medium', 'large']) for (const direction of ['ltr', 'rtl']) for (const motion of ['reduce', 'no-preference']) {
        await page.emulateMedia({ reducedMotion: motion });
        await page.setContent(`<style>${fontCss}</style><header class="${variant}" dir="${direction}" style="position:sticky;top:0"><nav aria-label="Main"><button id="back" aria-label="Back"><span class="material-symbols" aria-hidden="true">arrow_back</span></button><hgroup><h1 style="font-size:2em">Übersetzte lange Überschrift auf mehreren Zeilen</h1><p>Zusätzliche Informationen zur aktuellen Ansicht</p></hgroup><button id="more" aria-label="More"><span class="material-symbols" aria-hidden="true">more_vert</span></button></nav></header><main style="height:1600px"></main>`);
        await page.addScriptTag({ content: js });
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => { window.bar = Expressive.AppBar.init(document.querySelector('header')); });
        try {
          await page.locator('#back').focus();
          await page.evaluate(() => scrollTo(0, 400));
          await expect(page.locator('header')).toHaveClass(new RegExp('collapsed'));
          await expect(page.locator('#back')).toBeFocused();
          await page.keyboard.press('Tab');
          await expect(page.locator('#more')).toBeFocused();
          assert.ok(await page.locator('#more').evaluate(el => {
            const rect = el.getBoundingClientRect();
            return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight && el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
          }), `${variant} ${direction} action is visible and unobscured`);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          await page.evaluate(() => { window.sentinel = bar._sentinel; bar.destroy(); scrollTo(0, 0); });
          assert.equal(await page.evaluate(() => sentinel.isConnected || bar._observer !== null), false);
          await expect(page.locator('header')).not.toHaveClass(/collapsed/);
        } finally { await page.evaluate(() => bar.destroy()); }
      }
    } finally { try { await page?.evaluate(() => window.bar?.destroy()); } finally { await browser.close(); } }
  });

  browserTest(`AppBar native search dismissal and reopening (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage();
      for (const nested of [false, true]) for (const motion of ['reduce', 'no-preference']) for (const method of ['escape', 'button', 'form', 'programmatic']) {
        await page.emulateMedia({ reducedMotion: motion });
        const view = '<dialog id="results" class="search-view full-screen" aria-label="Results"><input id="query" aria-label="Query"><button id="close" type="button">Close</button><form method="dialog"><button id="submit">Done</button></form></dialog>';
        await page.setContent(`<style>${css}</style><button id="outside">Outside</button><header dir="${nested ? 'rtl' : 'ltr'}"><nav aria-label="Main"><search class="search-bar"><input id="search" type="search" aria-label="Search" ${nested ? '' : 'aria-controls="results"'} value="retained query">${nested ? view : ''}</search></nav></header>${nested ? '' : view}`);
        await page.addScriptTag({ content: js });
        await page.evaluate(() => {
          window.events = [];
          const input = document.querySelector('#search'), dialog = document.querySelector('dialog');
          input.addEventListener('focus', () => events.push('focus'));
          dialog.addEventListener('close', () => events.push('close'));
          document.querySelector('#close').onclick = () => dialog.close();
          window.bar = Expressive.AppBar.init(document.querySelector('header'));
        });
        try {
          await page.locator('#search').focus();
          await expect(page.locator('dialog')).toHaveJSProperty('open', true);
          await page.locator('#query').fill('results query');
          await page.evaluate(() => { events = []; });
          if (method === 'escape') {
            await page.evaluate(() => document.querySelector('dialog').addEventListener('cancel', event => event.preventDefault(), { once: true }));
            await page.keyboard.press('Escape');
            await expect(page.locator('dialog')).toHaveJSProperty('open', true);
          }
          if (method === 'escape') await page.keyboard.press('Escape');
          else if (method === 'programmatic') await page.evaluate(() => document.querySelector('dialog').close());
          else await page.locator(method === 'form' ? '#submit' : '#close').click();
          await expect.poll(() => page.evaluate(() => events.includes('close'))).toBe(true);
          assert.equal(await page.locator('dialog').evaluate(el => el.open), false, `${method}: ${await page.evaluate(() => events.join(','))}`);
          await expect(page.locator('#search')).toBeFocused();
          await page.locator('#search').click();
          await expect(page.locator('dialog')).toHaveJSProperty('open', true);
          await page.evaluate(() => { events = []; document.querySelector('dialog').close(); });
          await expect.poll(() => page.evaluate(() => events.includes('close'))).toBe(true);
          await page.locator('#outside').focus();
          await page.locator('#search').focus();
          await expect(page.locator('dialog')).toHaveJSProperty('open', true);
          await expect(page.locator('#search')).toHaveValue('retained query');
          await expect(page.locator('#query')).toHaveValue('results query');
        } finally { await page.evaluate(() => { bar.destroy(); document.querySelector('dialog').close(); }); }
      }
    } finally { try { await page?.evaluate(() => window.bar?.destroy()); } finally { await browser.close(); } }
  });
}
assert.ok(!process.env.EXPRESSIVECSS_TEST_BROWSER || ['chromium', 'firefox', 'webkit'].includes(process.env.EXPRESSIVECSS_TEST_BROWSER));
const sheetMarkup = `<dialog aria-labelledby="title"><header><h2 id="title">Details</h2><form method="dialog"><button aria-label="Close">×</button></form></header><div id="body"><p>Supporting content</p></div><form method="dialog"><button id="save">Save</button><button disabled>Unavailable</button></form></dialog>`;
const longSheetMarkup = `<dialog aria-labelledby="long-title"><h2 id="long-title">Notification preferences</h2><div id="long-body"><p>${'Review each setting before saving your changes. '.repeat(80)}</p></div><form method="dialog"><button id="save-long" value="save">Save notification preferences</button><button id="cancel-long" class="outlined" value="cancel">Cancel</button></form></dialog>`;

async function sheetFixture(page, { variant = 'side-sheet', direction = 'ltr', modal = true, motion = 'reduce' } = {}) {
  await page.goto('about:blank');
  await page.emulateMedia({ reducedMotion: motion });
  await page.setContent(`<style>${css}</style>${sheetMarkup}`);
  await page.addScriptTag({ content: js });
  await page.evaluate(({ variant, direction, modal }) => {
    document.body.dir = direction;
    const dialog = document.querySelector('dialog');
    dialog.className = variant;
    modal ? dialog.showModal() : dialog.show();
    getComputedStyle(dialog).translate;
    window.entryShift = dialog.getAnimations().flatMap(animation => animation.effect.getKeyframes()).find(frame => frame.offset === 0 && frame.translate)?.translate;
    window.pointer = (type, x, y, target = dialog, id = 1) => target.dispatchEvent(new PointerEvent(type, {
      bubbles: true, pointerId: id, isPrimary: id === 1, pointerType: 'touch', clientX: x, clientY: y
    }));
  }, { variant, direction, modal });
  if (motion === 'no-preference') await page.evaluate(() => Promise.all(document.querySelector('dialog').getAnimations().map(animation => animation.finished)));
}


for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(type.executablePath()) ? test : test.skip;
  browserTest(`Side sheet rendered docking and drag direction (${engine})`, async () => {
    const browser = await type.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      for (const direction of ['ltr', 'rtl']) for (const variant of ['side-sheet', 'side-sheet end', 'right', 'right-sheet', 'side-sheet start', 'left', 'left-sheet']) for (const modal of [false, true]) for (const motion of ['reduce', 'no-preference']) {
        await sheetFixture(page, { variant, direction, modal, motion });
        const start = /start|left/.test(variant), left = start !== (direction === 'rtl');
        if (motion === 'no-preference') assert.equal(await page.evaluate(() => parseFloat(entryShift)), left ? -100 : 100, `${variant} ${direction} enters from its docked edge`);
        const result = await page.evaluate(async ({ left, motion }) => {
          const dialog = document.querySelector('dialog'), rect = dialog.getBoundingClientRect();
          const x = left ? rect.right - 8 : rect.left + 8, y = rect.top + 180, sign = left ? -1 : 1;
          const corners = getComputedStyle(dialog);
          const inner = left ? corners.borderTopRightRadius : corners.borderTopLeftRadius;
          const outer = left ? corners.borderTopLeftRadius : corners.borderTopRightRadius;
          pointer('pointerdown', x, y);
          pointer('pointermove', x - sign * 130, y);
          const inward = dialog.style.getPropertyValue('--md-comp-side-sheet-shift');
          pointer('pointermove', x + sign * 30, y);
          const shift = dialog.style.getPropertyValue('--md-comp-side-sheet-shift');
          const translated = dialog.getBoundingClientRect().left - rect.left;
          pointer('pointerup', x + sign * 30, y);
          const snapped = dialog.open && dialog.style.getPropertyValue('--md-comp-side-sheet-shift') === '0px';
          if (motion === 'no-preference') await Promise.all(dialog.getAnimations().map(animation => animation.finished));
          pointer('pointerdown', x, y);
          pointer('pointermove', x + sign * 130, y);
          pointer('pointerup', x + sign * 130, y);
          return { edge: left ? rect.left : innerWidth - rect.right, inward, shift, translated, snapped, closed: !dialog.open, inner, outer };
        }, { left, motion });
        const label = `${variant} ${direction} ${modal} ${motion}`;
        assert.ok(Math.abs(result.edge) <= 1, `${label} docked edge`);
        assert.equal(result.inward, '0px', `${label} ignores inward drag`);
        assert.equal(result.shift, `${left ? -30 : 30}px`, `${label} inner-edge drag`);
        assert.ok(Math.abs(result.translated - (left ? -30 : 30)) <= 1, `${label} rendered translation`);
        assert.ok(result.snapped && result.closed, `${label} snapback and dismissal`);
        assert.equal(result.inner, modal ? '28px' : '0px', `${label} inner corner`);
        assert.equal(result.outer, '0px', `${label} outer corner`);
        if (variant === 'side-sheet' && motion === 'reduce') {
          await page.evaluate(modal => {
            const dialog = document.querySelector('dialog');
            modal ? dialog.showModal() : dialog.show();
          }, modal);
          const header = await page.locator('header h2').boundingBox();
          const x = header.x + header.width / 2, y = header.y + header.height / 2;
          await page.mouse.move(x, y);
          await page.mouse.down();
          await page.mouse.move(x + (left ? -130 : 130), y, { steps: 5 });
          await page.mouse.up();
          await expect(page.locator('dialog')).not.toHaveAttribute('open');
        }
      }
    } finally { await browser.close(); }
  });

  browserTest(`Sheets cancel only the active pointer and clean interrupted drags (${engine})`, async () => {
    const browser = await type.launch();
    try {
      const page = await browser.newPage();
      const failures = [];
      for (const variant of ['side-sheet', 'bottom-sheet']) {
        for (const end of ['cancel', 'close', 'remove', 'outside', 'reopen', 'reattach', 'ancestor-reattach', 'unchanged']) {
          await sheetFixture(page, { variant });
          const result = await page.evaluate(async ({ variant, end }) => {
            const dialog = document.querySelector('dialog'), rect = dialog.getBoundingClientRect();
            const x = rect.left + 10, y = rect.top + 10, vertical = variant === 'bottom-sheet';
            const property = `--md-comp-${variant}-shift`;
            pointer('pointerdown', x, y);
            pointer('pointermove', x + (vertical ? 0 : 30), y + (vertical ? 30 : 0));
            pointer('pointerdown', x, y, dialog, 2);
            pointer('pointermove', x + 150, y + 150, dialog, 2);
            pointer('pointercancel', x, y, dialog, 2);
            const retained = dialog.style.getPropertyValue(property);
            pointer('pointercancel', x, y);
            pointer('pointerdown', x, y);
            pointer('pointermove', x + (vertical ? 0 : 30), y + (vertical ? 30 : 0));
            const started = dialog.style.getPropertyValue(property);
            if (end === 'cancel') pointer('pointercancel', x, y);
            if (end === 'close') dialog.close();
            if (end === 'remove') dialog.remove();
            if (end === 'reopen') { dialog.close(); dialog.showModal(); }
            if (end === 'reattach') { dialog.remove(); document.body.append(dialog); }
            if (end === 'ancestor-reattach') {
              const parent = dialog.parentElement;
              parent.remove();
              document.documentElement.append(parent);
            }
            if (end === 'unchanged') {
              dialog.setAttribute('open', '');
              const other = document.createElement('dialog');
              document.body.append(other);
              other.show();
              other.close();
              other.remove();
            }
            if (end === 'outside') pointer('pointerdown', 0, 0, document.body);
            await new Promise(resolve => setTimeout(resolve, 30));
            const reset = dialog.style.getPropertyValue(property) === '0px' && dialog.style.transition === '';
            if (!dialog.isConnected) document.body.append(dialog);
            if (!dialog.open) dialog.showModal();
            pointer('pointermove', x + 200, y + 200);
            pointer('pointerup', x + 200, y + 200);
            return { started, retained, reset, open: dialog.open };
          }, { variant, end });
          if (result.retained !== '30px') failures.push(`${variant} ${end} secondary cancellation`);
          if (result.started !== '30px') failures.push(`${variant} ${end} missing active drag`);
          const interrupted = end !== 'unchanged';
          if (result.reset !== interrupted || result.open !== interrupted) failures.push(`${variant} ${end} drag lifetime`);
        }
      }
      assert.deepEqual(failures, []);
    } finally { await browser.close(); }
  });

  browserTest(`Side sheet translated content and close actions remain reachable (${engine})`, async () => {
    const browser = await type.launch();
    try {
      const page = await browser.newPage();
      for (const width of [360, 1280]) for (const direction of ['ltr', 'rtl']) for (const modal of [false, true]) for (const motion of ['reduce', 'no-preference']) {
        await page.setViewportSize({ width, height: 800 });
        await sheetFixture(page, { direction, modal, motion });
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '200%';
          document.querySelector('#title').textContent = 'Datenschutzeinstellungenمعلوماتالتفضيلات';
          document.querySelector('#body').textContent = 'Überprüfen Sie Ihre Einstellungen. معلومات إضافية حول الإعدادات. '.repeat(70);
          document.querySelector('#save').textContent = 'Änderungen speichern';
          document.querySelector('button[disabled]').textContent = 'Nicht verfügbar';
        });
        const result = await page.evaluate(() => {
          const dialog = document.querySelector('dialog'), body = document.querySelector('#body');
          const rect = body.getBoundingClientRect(), x = rect.left + rect.width / 2, y = rect.top + 30;
          pointer('pointerdown', x, y, body);
          pointer('pointermove', x + 160, y + 50, body);
          pointer('pointerup', x + 160, y + 50, body);
          body.scrollTop = body.scrollHeight;
          return { open: dialog.open, scroll: body.scrollTop, overflow: Math.max(dialog.scrollWidth - dialog.clientWidth, body.scrollWidth - body.clientWidth) };
        });
        assert.ok(result.open && result.scroll > 0, 'body scrolls without dismissal');
        assert.ok(result.overflow <= 1, `no horizontal overflow: ${width} ${direction} ${modal}`);
        await expect(page.locator('#save')).toBeInViewport();
        assert.ok(await page.locator('#save').evaluate(button => button.scrollHeight <= button.clientHeight), 'translated action label is not clipped');
        await expect(page.locator('button[disabled]')).toBeDisabled();
        await page.getByRole('button', { name: 'Close', exact: true }).click();
        await expect(page.locator('dialog')).not.toBeVisible();
        await page.evaluate(() => document.querySelector('dialog').showModal());
        await page.getByRole('button', { name: 'Close', exact: true }).focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('dialog')).not.toBeVisible();
      }
    } finally { await browser.close(); }
  });

  browserTest(`Bottom and floating sheets keep long content and actions reachable at compact widths (${engine})`, async () => {
    const browser = await type.launch();
    try {
      const page = await browser.newPage();
      for (const variant of ['bottom-sheet', 'floating-sheet']) for (const width of [320, 599]) for (const modal of [false, true]) {
        await page.setViewportSize({ width, height: 640 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.setContent(`<style>${css}</style>${longSheetMarkup}`);
        await page.evaluate(({ variant, modal }) => {
          document.documentElement.style.fontSize = '200%';
          const dialog = document.querySelector('dialog');
          dialog.className = variant;
          modal ? dialog.showModal() : dialog.show();
        }, { variant, modal });
        const result = await page.locator('#long-body').evaluate(body => {
          body.scrollTop = body.scrollHeight;
          const dialog = body.closest('dialog'), title = dialog.querySelector('h2');
          return {
            scrollable: body.scrollHeight > body.clientHeight,
            scrolled: body.scrollTop > 0,
            overflow: Math.max(document.documentElement.scrollWidth - innerWidth, dialog.scrollWidth - dialog.clientWidth, body.scrollWidth - body.clientWidth),
            titleClipped: title.scrollWidth > title.clientWidth || title.scrollHeight > title.clientHeight,
          };
        });
        const label = `${variant} ${width}px ${modal ? 'modal' : 'standard'}`;
        assert.ok(result.scrollable && result.scrolled, `${label} body scrolls`);
        assert.ok(result.overflow <= 1, `${label} has no horizontal overflow`);
        assert.equal(result.titleClipped, false, `${label} enlarged heading is not clipped`);
        for (const id of ['#save-long', '#cancel-long']) {
          assert.ok(await page.locator(id).evaluate(button => {
            const rect = button.getBoundingClientRect();
            return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight
              && button.scrollWidth <= button.clientWidth && button.scrollHeight <= button.clientHeight
              && button.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
          }), `${label} ${id} is visible, unclipped and unobscured`);
        }
        await page.locator('#save-long').focus();
        await expect(page.locator('#save-long')).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(page.locator('#cancel-long')).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(page.locator('dialog')).not.toBeVisible();
      }
    } finally { await browser.close(); }
  });

  browserTest(`Carousel navigation scrolls and focuses logical items (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage({ viewport: { width: 600, height: 900 } });
      for (const reducedMotion of ['reduce', 'no-preference']) for (const layout of ['flat', '', 'hero', 'hero center-aligned', 'uncontained', 'full-screen']) for (const direction of ['ltr', 'rtl']) {
        await page.emulateMedia({ reducedMotion });
        await page.setContent(`<style>${css}</style><button id="previous" type="button">Previous</button><button id="next" type="button">Next</button><div class="carousel ${layout}" dir="${direction}" style="width:360px" aria-label="Places">${[1, 2, 3, 4].map(n => `<article class="carousel-item" tabindex="0">Place ${n}<input aria-label="Note ${n}"><span contenteditable="">Edit</span></article>`).join('')}</div>`);
        await page.addScriptTag({ content: js });
        await page.evaluate(() => {
          window.carousel = Expressive.Carousel.init(document.querySelector('.carousel'), { indicators: true, height: 240 });
          document.querySelector('#previous').onclick = () => carousel.prev();
          document.querySelector('#next').onclick = () => carousel.next();
          window.navigationCalls = 0;
          for (const method of ['set', 'next', 'prev']) {
            const original = carousel[method].bind(carousel);
            carousel[method] = (...args) => { navigationCalls++; return original(...args); };
          }
          window.editableKeys = [];
          carousel.el.addEventListener('keydown', e => {
            if (e.target.isContentEditable || e.target.matches('input')) editableKeys.push(e.defaultPrevented);
          });
        });
        const vertical = layout === 'full-screen';
        const visible = async index => {
          await expect.poll(() => page.evaluate(() => carousel.center), { message: `${layout} ${direction} ${reducedMotion} index ${index}` }).toBe(index);
          await expect.poll(() => page.evaluate(({ index, vertical }) => {
            const track = document.querySelector('.carousel-track').getBoundingClientRect();
            const item = carousel.images[index].getBoundingClientRect();
            return vertical ? Math.max(track.top - item.top, item.bottom - track.bottom) : Math.max(track.left - item.left, item.right - track.right);
          }, { index, vertical }), { message: `${layout} ${direction} ${reducedMotion}: item ${index} is inside the track` }).toBeLessThanOrEqual(1);
        };
        await page.locator('#next').click(); await visible(1);
        await page.locator('#previous').click(); await visible(0);
        await page.locator('.carousel-item').first().focus();
        await page.keyboard.press(vertical ? 'ArrowDown' : direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
        await visible(1); await expect(page.locator('.carousel-item').nth(1)).toBeFocused();
        await page.keyboard.press('End'); await visible(3);
        await expect.poll(() => page.locator('.carousel-track').evaluate((el, vertical) => Math.abs(vertical ? el.scrollTop : el.scrollLeft), vertical), { message: `${layout} ${direction} ${reducedMotion}: navigation changes actual scroll position` }).toBeGreaterThan(1);
        await page.keyboard.press(vertical ? 'ArrowDown' : direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
        await visible(3);
        await page.keyboard.press('Home'); await visible(0);
        await page.locator('.indicator-item').nth(2).click(); await visible(2);
        for (const selector of ['input', '[contenteditable]']) {
          await page.locator('.carousel-item').nth(2).locator(selector).focus();
          const before = await page.evaluate(() => { editableKeys = []; return navigationCalls; });
          await page.keyboard.press('Home'); await page.keyboard.press('ArrowLeft');
          assert.equal(await page.evaluate(() => navigationCalls), before, `${layout} ${direction} ${reducedMotion} ${selector}: editable keys do not navigate`);
          assert.deepEqual(await page.evaluate(() => editableKeys), [false, false], 'editable keys retain native defaults');
        }
        if (reducedMotion === 'no-preference') {
          for (const gesture of ['touch', 'pen', 'wheel']) {
            const result = await page.evaluate(gesture => {
              carousel.set(1);
              const track = document.querySelector('.carousel-track'), original = track.scrollTo;
              let calls = 0;
              track.scrollTo = (...args) => { calls++; original.apply(track, args); };
              try {
                const allowed = track.dispatchEvent(gesture === 'wheel'
                  ? new WheelEvent('wheel', { deltaX: 80, bubbles: true, cancelable: true })
                  : new PointerEvent('pointerdown', { pointerType: gesture, pointerId: 7, isPrimary: true, bubbles: true, cancelable: true }));
                carousel.images[1].dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'flex-basis', bubbles: true }));
                const duringGesture = calls;
                track.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 7, pointerType: gesture, bubbles: true }));
                carousel.set(2);
                calls = 0;
                carousel.images[2].dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'flex-basis', bubbles: true }));
                return { allowed, duringGesture, afterNavigation: calls };
              } finally { track.scrollTo = original; }
            }, gesture);
            assert.equal(result.allowed, true, `${gesture} retains native defaults`);
            assert.equal(result.duringGesture, 0, `${gesture} is not recentered by transition completion`);
            assert.equal(result.afterNavigation, 1, 'explicit navigation restores alignment');
          }
        }
        await page.evaluate(() => carousel.destroy());
      }
    } finally { try { await page?.evaluate(() => window.carousel?.destroy()); } finally { await browser.close(); } }
  });

  browserTest(`Carousel destroys pending scroll completion work (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage();
      await page.setContent(`<style>${css}</style><div class="carousel flat" style="width:320px"><article class="carousel-item">One</article><article class="carousel-item">Two</article></div>`);
      await page.addScriptTag({ content: js });
      const pending = await page.evaluate(() => {
        const timers = new Set(), schedule = window.setTimeout, cancel = window.clearTimeout;
        window.setTimeout = (callback, delay, ...args) => {
          const id = schedule(() => { timers.delete(id); callback(...args); }, delay);
          timers.add(id); return id;
        };
        window.clearTimeout = id => { timers.delete(id); cancel(id); };
        window.carousel = Expressive.Carousel.init(document.querySelector('.carousel'), { interval: 500 });
        carousel.next(); carousel.prev(); carousel.next();
        carousel._handleThrottledResize(); carousel._handleThrottledResize();
        carousel.destroy();
        return timers.size;
      });
      assert.equal(pending, 0, 'destroy cancels auto-advance, resize and scroll-completion timers');
    } finally { try { await page?.evaluate(() => window.carousel?.destroy()); } finally { await browser.close(); } }
  });

  browserTest(`Carousel mounted motion changes preserve explicit pause (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage({ reducedMotion: 'reduce' });
      await page.clock.install();
      await page.setContent(`<style>${css}</style><button id="toggle" type="button">Pause</button><button id="outside" type="button">Outside</button><div class="carousel flat" style="width:320px" aria-label="Places">${[1, 2, 3].map(n => `<article class="carousel-item" tabindex="0">Place ${n}</article>`).join('')}</div>`);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => {
        window.cycles = 0;
        window.carousel = Expressive.Carousel.init(document.querySelector('.carousel'), { interval: 500, duration: 0, onCycleTo: () => cycles++ });
        document.querySelector('#toggle').onclick = e => {
          const pause = e.currentTarget.textContent === 'Pause';
          carousel[pause ? 'pause' : 'start']();
          e.currentTarget.textContent = pause ? 'Resume' : 'Pause';
        };
      });
      await page.clock.runFor(1200);
      assert.equal(await page.evaluate(() => cycles), 0);
      const changeMotion = async reducedMotion => {
        await page.evaluate(() => {
          window.motionChanged = false;
          carousel._motion.addEventListener('change', () => { motionChanged = true; }, { once: true });
        });
        await page.emulateMedia({ reducedMotion });
        await expect.poll(() => page.evaluate(() => motionChanged)).toBe(true);
      };
      await changeMotion('no-preference');
      await page.clock.runFor(600);
      assert.ok(await page.evaluate(() => cycles > 0), 'ordinary motion resumes after mounting under reduced motion');
      await page.locator('#toggle').click();
      const paused = await page.evaluate(() => cycles);
      await changeMotion('reduce');
      await changeMotion('no-preference');
      await page.clock.runFor(1600);
      assert.equal(await page.evaluate(() => cycles), paused, 'motion changes do not cancel explicit pause');
      await page.locator('#toggle').click(); await page.mouse.move(600, 600);
      await page.clock.runFor(600);
      assert.ok(await page.evaluate(() => cycles) > paused, 'resume restarts automatic movement');
      await page.evaluate(() => {
        carousel.pause();
        const track = document.querySelector('.carousel-track'), original = track.scrollTo.bind(track);
        window.scrollBehaviors = [];
        track.scrollTo = options => { scrollBehaviors.push(options.behavior); original(options); };
        carousel.set(2);
        scrollBehaviors = [];
      });
      await changeMotion('reduce');
      assert.ok(await page.evaluate(() => scrollBehaviors.includes('instant')), 'reduced motion cancels the in-flight smooth scroll');
      assert.ok(await page.evaluate(() => {
        const track = document.querySelector('.carousel-track').getBoundingClientRect();
        const item = carousel.images[carousel.center].getBoundingClientRect();
        return item.left >= track.left - 1 && item.right <= track.right + 1;
      }), 'reduced-motion sizing is realigned immediately');
      const reduced = await page.evaluate(() => cycles);
      await page.clock.runFor(1600);
      assert.equal(await page.evaluate(() => cycles), reduced, 'mounted reduced motion suspends auto-advance');
    } finally { try { await page?.evaluate(() => window.carousel?.destroy()); } finally { await browser.close(); } }
  });

  browserTest(`Carousel focus and visibility suspension survive teardown (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage({ reducedMotion: 'no-preference' });
      await page.clock.install();
      await page.setContent(`<style>${css}</style><button id="outside" type="button">Outside</button><div class="carousel flat" style="width:320px" aria-label="Places">${[1, 2, 3].map(n => `<article class="carousel-item" tabindex="0">Place ${n}<button type="button">Action ${n}</button></article>`).join('')}</div>`);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => {
        window.cycles = 0;
        window.options = { interval: 500, duration: 0, onCycleTo: () => cycles++ };
        window.carousel = Expressive.Carousel.init(document.querySelector('.carousel'), options);
        window.focusTimers = [];
        carousel.el.addEventListener('focusout', () => focusTimers.push(carousel._autoAdvanceTimer));
      });
      await page.locator('.carousel-item').first().focus();
      await page.locator('.carousel-item button').first().focus();
      assert.deepEqual(await page.evaluate(() => focusTimers), [null], 'moving focus inside never rearms advancing');
      await page.clock.runFor(1600); assert.equal(await page.evaluate(() => cycles), 0);
      await page.locator('.carousel').hover(); await page.locator('#outside').focus();
      await page.clock.runFor(1600); assert.equal(await page.evaluate(() => cycles), 0);
      await page.mouse.move(600, 600);
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
      await page.clock.runFor(1600); assert.equal(await page.evaluate(() => cycles), 0);
      await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
      await page.clock.runFor(600); assert.ok(await page.evaluate(() => cycles > 0));
      await page.evaluate(() => carousel.destroy());
      const destroyed = await page.evaluate(() => cycles);
      await page.clock.runFor(2000); assert.equal(await page.evaluate(() => cycles), destroyed);
      await page.evaluate(() => { carousel = Expressive.Carousel.init(document.querySelector('.carousel'), options); cycles = 0; });
      await page.clock.runFor(500); assert.equal(await page.evaluate(() => cycles), 1, 'remount advances once per interval');
      await page.evaluate(() => carousel.destroy());
      await expect(page.locator('.carousel-track')).toHaveCount(0);
    } finally { try { await page?.evaluate(() => { window.carousel?.destroy(); delete document.hidden; }); } finally { await browser.close(); } }
  });

  browserTest(`Slider labels follow native handles through direction and resize (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage({ viewport: { width: 700, height: 600 } });
      await page.setContent(`<style>${css} input[type=range] { --md-comp-slider-handle-color: rgb(255,0,0); }</style><div id="host" class="slider" style="margin:60px;width:320px"><input type="range" min="-100" max="0" step="5" value="-50" aria-label="Temperature"></div>`);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => window.slider = Expressive.Slider.init(document.querySelector('input')));
      for (const reducedMotion of ['reduce', 'no-preference']) for (const vertical of [false, true]) for (const direction of ['ltr', 'rtl']) for (const size of [320, 220]) {
        await page.emulateMedia({ reducedMotion });
        await page.evaluate(({ vertical, direction, size }) => {
          document.documentElement.dir = direction;
          const host = document.querySelector('#host'), input = host.querySelector('input');
          host.classList.toggle('vertical', vertical);
          host.style.width = vertical ? '60px' : `${size}px`;
          input.style.height = vertical ? `${size}px` : '';
        }, { vertical, direction, size });
        await page.waitForTimeout(200);
        for (const value of [-100, -75, 0]) {
          await page.evaluate(value => { slider.el.value = value; slider.el.dispatchEvent(new Event('change', { bubbles: true })); }, value);
          await expect(page.locator('.value')).toHaveText(String(value));
          const png = utilsBundle.PNG.sync.read(await page.locator('input').screenshot({ animations: 'disabled' }));
          const points = [];
          for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
            const i = (y * png.width + x) * 4;
            if (png.data[i] > 250 && png.data[i + 1] < 5 && png.data[i + 2] < 5) points.push(vertical ? y + .5 : x + .5);
          }
          assert.ok(points.length, 'native handle is painted');
          const center = (Math.min(...points) + Math.max(...points)) / 2;
          const label = await page.locator('input').evaluate((el, vertical) => {
            const input = el.getBoundingClientRect(), bubble = el.nextElementSibling.getBoundingClientRect();
            return vertical ? bubble.y + bubble.height / 2 - input.y : bubble.x + bubble.width / 2 - input.x;
          }, vertical);
          assert.ok(Math.abs(center - label) < 1, `${vertical} ${direction} ${size} ${value}: native ${center}, label ${label}`);
        }
      }
    } finally { try { await page?.evaluate(() => window.slider?.destroy()); } finally { await browser.close(); } }
  });

  browserTest(`Slider input events and paired ranges retain native interaction (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage();
      await page.setContent(`<style>${css} #pair { --md-comp-slider-active-track-color: rgb(0,0,255); --md-comp-slider-inactive-track-color: rgb(128,128,128); }</style><div id="pair" class="slider" style="margin:60px;width:320px"><input id="start" type="range" min="-10" max="10" step="0.5" value="-5" aria-label="Start"><input id="end" type="range" min="-10" max="10" step="0.5" value="5" aria-label="End"></div><label>Start value<input type="number" id="number" min="-10" max="10" step="0.5" value="-5"></label>`);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => {
        window.sliders = [...document.querySelectorAll('[type=range]')].map(el => Expressive.Slider.init(el));
        const range = document.querySelector('#start'), number = document.querySelector('#number');
        number.addEventListener('input', () => { range.value = number.value; range.dispatchEvent(new Event('input', { bubbles: true })); number.value = range.value; });
        range.addEventListener('input', () => number.value = range.value);
      });
      await page.locator('#number').fill('-2.5');
      await expect(page.locator('#start + .thumb .value')).toHaveText('-2.5');
      for (const vertical of [false, true]) for (const direction of ['ltr', 'rtl']) for (const size of [320, 220]) {
        await page.evaluate(({ direction, vertical, size }) => {
          document.documentElement.dir = direction;
          const host = document.querySelector('#pair');
          host.classList.toggle('vertical', vertical);
          host.style.width = vertical ? '44px' : `${size}px`;
          for (const input of host.querySelectorAll('input')) input.style.height = vertical ? `${size}px` : '';
          for (const [i, slider] of sliders.entries()) { slider.el.value = i ? '5' : '-5'; slider.el.dispatchEvent(new Event('input', { bubbles: true })); }
        }, { direction, vertical, size });
        await page.waitForTimeout(200);
        const box = await page.locator('#start').boundingBox();
        if (vertical) assert.equal(await page.locator('#pair').evaluate(el => parseFloat(getComputedStyle(el, '::before').height)), box.height, 'paired track resizes with native inputs');
        const png = utilsBundle.PNG.sync.read(await page.locator('#pair').screenshot());
        const center = (Math.floor(png.height / 2) * png.width + Math.floor(png.width / 2)) * 4;
        assert.deepEqual([...png.data.subarray(center, center + 3)], [0, 0, 255], 'paired active interval is painted between handles');
        for (const [id, fraction] of [['start', .25], ['end', .75]]) {
          const label = await page.locator(`#${id}`).evaluate((el, vertical) => {
            const input = el.getBoundingClientRect(), bubble = el.nextElementSibling.getBoundingClientRect();
            return vertical ? bubble.y + bubble.height / 2 - input.y : bubble.x + bubble.width / 2 - input.x;
          }, vertical);
          const position = 2 + fraction * ((vertical ? box.height : box.width) - 4);
          assert.ok(Math.abs(label - (vertical || direction === 'rtl' ? (vertical ? box.height : box.width) - position : position)) < 1, 'paired label follows its handle');
        }
        await page.mouse.click(box.x + box.width * (vertical ? .5 : direction === 'rtl' ? .65 : .35), box.y + box.height * (vertical ? .65 : .5));
        assert.ok(Number(await page.locator('#start').inputValue()) > -5, 'start responds to a track click');
        await page.mouse.click(box.x + box.width * (vertical ? .5 : direction === 'rtl' ? .1 : .9), box.y + box.height * (vertical ? .1 : .5));
        assert.ok(Number(await page.locator('#end').inputValue()) > 5, 'end responds to a track click');
        await page.locator('#start').focus(); await page.keyboard.press('End');
        assert.equal(await page.locator('#start').inputValue(), await page.locator('#end').inputValue());
        await page.locator('#end').focus(); await page.keyboard.press('Home');
        assert.equal(await page.locator('#start').inputValue(), await page.locator('#end').inputValue());
        await page.locator('#start').focus(); await page.keyboard.press('Home');
        await expect(page.locator('#start')).toHaveValue('-10');
        await page.keyboard.press('ArrowUp');
        await expect(page.locator('#start')).toHaveValue('-9.5');
      }
      await page.locator('#start').evaluate(el => { el.disabled = true; });
      const disabledValue = await page.locator('#start').inputValue();
      const disabledBox = await page.locator('#start').boundingBox();
      await page.mouse.click(disabledBox.x + disabledBox.width / 2, disabledBox.y + disabledBox.height * .8);
      await expect(page.locator('#start')).toHaveValue(disabledValue);
      await page.evaluate(() => {
        for (const slider of sliders) { slider.el.min = '0'; slider.el.max = '0'; slider.el.value = '0'; slider.el.dispatchEvent(new Event('input')); }
      });
      await expect(page.locator('#pair .value')).toHaveText(['0', '0']);
      assert.equal(await page.locator('#pair').evaluate(el => /NaN|Infinity/.test(el.getAttribute('style'))), false);
      await page.evaluate(() => { sliders.forEach(slider => slider.destroy()); });
      await expect(page.locator('.thumb')).toHaveCount(0);
    } finally { try { await page?.evaluate(() => window.sliders?.forEach(slider => slider.destroy())); } finally { await browser.close(); } }
  });

  browserTest(`Slider forced colors preserve tracks and handles (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage({ forcedColors: 'active', colorScheme: 'light' });
      await page.setContent(`<style>${css} body {background:Canvas}</style><div class="slider" style="width:320px;margin:60px"><input type="range" min="0" max="100" value="35" aria-label="Volume"></div>`);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => window.slider = Expressive.Slider.init(document.querySelector('input')));
      assert.equal(await page.evaluate(() => matchMedia('(forced-colors: active)').matches), true);
      for (const colorScheme of ['light', 'dark']) for (const vertical of [false, true]) for (const direction of ['ltr', 'rtl']) {
      await page.emulateMedia({ colorScheme });
      await page.evaluate(({ vertical, direction }) => {
        document.documentElement.dir = direction;
        slider.el.parentElement.classList.toggle('vertical', vertical);
        slider.el.style.height = vertical ? '320px' : '';
      }, { vertical, direction });
      await page.waitForTimeout(200);
      const png = utilsBundle.PNG.sync.read(await page.locator('input').screenshot());
      const pixel = (x, y) => {
        if (vertical) [x, y] = [y, 319 - x];
        else if (direction === 'rtl') x = 319 - x;
        return [...png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 3)];
      };
      const canvas = pixel(20, 1);
      assert.notDeepEqual(pixel(30, 22), canvas, 'active track remains visible');
      assert.notDeepEqual(pixel(270, 22), canvas, 'inactive track remains visible');
      assert.ok([5, 10, 34, 38].some(y => pixel(112, y).some((value, i) => value !== canvas[i])), `${colorScheme} ${vertical} ${direction}: native handle remains visible outside the track`);
      assert.notDeepEqual(pixel(30, 22), pixel(270, 22), 'active and inactive tracks differ');
      }
    } finally { try { await page?.evaluate(() => window.slider?.destroy()); } finally { await browser.close(); } }
  });

  browserTest(`select and calendar treat external values as data (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage();
      await page.setContent('<select><option value="one">One</option></select><input class="datepicker"><div id="result"></div>');
      await page.addScriptTag({ content: js });
      const result = await page.evaluate(() => {
        window.injected = false;
        const payload = '\"><img src=x onerror="window.injected=true">';
        document.querySelector('option').setAttribute('data-icon', 'java\nscript:window.injected=true');
        let select, date;
        try {
          select = Expressive.FormSelect.init(document.querySelector('select'));
          date = Expressive.Datepicker.init(document.querySelector('input.datepicker'));
          const host = document.querySelector('#result');
          host.innerHTML = date.renderTitle(date, 0, 2026, 8, 2026, payload) + date.renderTable(date.options, [], payload);
          let rejected = 0;
          for (const cell of ['<td onclick="window.injected=true">1</td>', '<td><img src=x onerror="window.injected=true"></td>']) {
            try { date.renderTable(date.options, [`<tr>${cell}</tr>`], 'title'); }
            catch (error) { if (error instanceof TypeError) rejected++; else throw error; }
          }
          return {
            icon: !!select.menuEl.querySelector('img'),
            value: select.input.value,
            id: host.querySelector('.datepicker-controls').id,
            labelledBy: host.querySelector('table').getAttribute('aria-labelledby'),
            images: host.querySelectorAll('img').length,
            rejected,
            payload
          };
        } finally { date?.destroy(); select?.destroy(); }
      });
      assert.equal(result.icon, false);
      assert.equal(result.value, 'One');
      assert.equal(result.id, result.payload);
      assert.equal(result.labelledBy, result.payload);
      assert.equal(result.images, 0);
      assert.equal(result.rejected, 2);
      assert.equal(await page.evaluate(() => window.injected), false);
    } finally { await browser.close(); }
  });

  browserTest(`Menu cancels superseded callbacks and teardown work (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage();
      await page.setContent(`<style>${css}</style><button id="outside">Outside</button><button id="trigger" data-target="actions">Actions</button><menu id="actions"><li>Copy</li><li>Reset</li></menu>`);
      await page.addScriptTag({ content: js });
      await page.clock.install();
      await page.evaluate(() => {
        window.ends = [];
        window.menu = Expressive.Menu.init(document.querySelector('#trigger'), {
          inDuration: 40, outDuration: 60,
          onOpenEnd: () => ends.push('open'), onCloseEnd: () => ends.push('close')
        });
        menu.open(); menu.close(); menu.open();
      });
      await page.clock.runFor(100);
      await expect(page.locator('#actions')).toBeVisible();
      await expect(page.locator('#trigger')).toHaveAttribute('aria-expanded', 'true');
      assert.deepEqual(await page.evaluate(() => ends), ['open']);
      await page.evaluate(() => { menu.close(); menu.open(); menu.close(); });
      await page.clock.runFor(100);
      await expect(page.locator('#actions')).not.toBeVisible();
      assert.deepEqual(await page.evaluate(() => ends), ['open', 'close']);
      for (const phase of ['opening', 'closing']) {
        await page.evaluate(phase => {
          menu.open(); if (phase === 'closing') menu.close(); menu.destroy();
          document.querySelector('#outside').focus();
          window.afterDestroy = document.querySelector('#actions').getAttribute('style');
        }, phase);
        await page.clock.runFor(1100);
        assert.equal(await page.locator('#actions').getAttribute('style'), await page.evaluate(() => afterDestroy));
        await expect(page.locator('#outside')).toBeFocused();
        assert.deepEqual(await page.evaluate(() => ends), ['open', 'close']);
        assert.equal(await page.evaluate(() => Expressive.Menu._menus.length), 0);
        await page.evaluate(() => { window.menu = Expressive.Menu.init(document.querySelector('#trigger'), { inDuration: 40, outDuration: 60, onOpenEnd: () => ends.push('open'), onCloseEnd: () => ends.push('close') }); });
      }
      await page.evaluate(() => {
        document.querySelector('#actions > li').addEventListener('focus', () => menu.destroy(), { once: true });
        menu.open();
      });
      await page.clock.runFor(100);
      assert.deepEqual(await page.evaluate(() => ends), ['open', 'close']);
      await page.evaluate(() => {
        window.menu = Expressive.Menu.init(document.querySelector('#trigger'), { inDuration: 40, outDuration: 60 });
        menu.open();
      });
      await page.clock.runFor(100);
      await page.evaluate(() => {
        document.querySelector('#trigger').addEventListener('focus', () => menu.open(), { once: true });
        menu.close();
      });
      await page.clock.runFor(100);
      await expect(page.locator('#trigger')).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('#actions')).toBeVisible();
      await page.evaluate(() => {
        menu.destroy();
        document.querySelector('#outside').focus();
        window.menu = Expressive.Menu.init(document.querySelector('#trigger'), { inDuration: 0, outDuration: 0 });
        document.querySelector('#actions > li').addEventListener('focus', event => {
          event.target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        }, { once: true });
        menu.open();
      });
      await page.clock.runFor(10);
      await expect(page.locator('#trigger')).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('#trigger')).toBeFocused();
      await expect(page.locator('#actions')).not.toBeVisible();
    } finally { try { await page?.evaluate(() => window.menu?.destroy()); } finally { await browser.close(); } }
  });

  browserTest(`Menu excludes closing content and preserves callback focus (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage();
      await page.setContent(`<style>${css}</style><button id="before">Before</button><button id="trigger" data-target="actions">Actions</button><menu id="actions"><li><button>Copy</button></li></menu><button id="after">After</button>`);
      await page.addScriptTag({ content: js });
      await page.clock.install();
      await page.evaluate(() => window.menu = Expressive.Menu.init(document.querySelector('#trigger'), { inDuration: 40, outDuration: 1000 }));
      for (const reducedMotion of ['no-preference', 'reduce']) {
        await page.emulateMedia({ reducedMotion });
        await page.evaluate(() => menu.open());
        await page.clock.runFor(60);
        await page.keyboard.press('Escape');
        await expect(page.locator('#trigger')).toBeFocused();
        assert.equal(await page.locator('#actions').evaluate(el => getComputedStyle(el).display), 'block');
        await page.keyboard.press('Tab');
        await expect(page.locator('#after')).toBeFocused();
        await page.keyboard.press('Shift+Tab');
        await expect(page.locator('#trigger')).toBeFocused();
        await page.evaluate(() => menu.open());
        await page.clock.runFor(60);
        await expect(page.locator('#actions > li')).toBeFocused();
        await page.evaluate(() => {
          menu.options.onCloseStart = () => document.querySelector('#after').focus();
          menu.close();
        });
        await expect(page.locator('#after')).toBeFocused();
        await page.clock.runFor(1100);
        await expect(page.locator('#after')).toBeFocused();
        await page.evaluate(() => { menu.options.onCloseStart = null; menu.options.autoFocus = false; menu.open(); });
        await page.clock.runFor(60);
        await page.locator('#actions button').focus();
        await page.evaluate(() => menu.close());
        await page.keyboard.press('Tab');
        assert.equal(await page.locator('#actions').evaluate(el => el.contains(document.activeElement)), false);
        await page.evaluate(() => { menu.destroy(); window.menu = Expressive.Menu.init(document.querySelector('#trigger'), { inDuration: 40, outDuration: 1000 }); });
        assert.equal(await page.locator('#actions').getAttribute('inert'), null);
      }
      await page.evaluate(() => { menu.destroy(); document.querySelector('#actions').setAttribute('inert', ''); window.menu = Expressive.Menu.init(document.querySelector('#trigger')); menu.open(); menu.close(); menu.destroy(); });
      assert.equal(await page.locator('#actions').getAttribute('inert'), '');
    } finally { try { await page?.evaluate(() => window.menu?.destroy()); } finally { await browser.close(); } }
  });

  browserTest(`Menu scopes nested keys and mirrors flyouts in RTL (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage({ viewport: { width: 900, height: 700 }, reducedMotion: 'reduce' });
      await page.setContent(`<style>${css}</style><button id="trigger" style="position:absolute;top:20px;left:20px" data-target="actions">Actions</button><menu id="actions">
        <li id="root">Root</li><li id="parent"><button>More</button><menu>
          <li class="label">Heading</li><li id="alpha">Alpha</li><li id="disabled" class="disabled">Blocked</li><li id="beta">Beta</li>
          <li id="deep"><button>More again</button><menu><li id="leaf"><button>Leaf</button></li></menu></li>
        </menu></li><li id="last">Last</li></menu>`);
      await page.addScriptTag({ content: js });
      await page.clock.install();
      await page.evaluate(() => { window.activations = 0; window.menu = Expressive.Menu.init(document.querySelector('#trigger'), { inDuration: 40, outDuration: 60, onItemClick: () => activations++ }); });
      for (const autoFocus of [true, false]) for (const direction of ['ltr', 'rtl']) {
        await page.evaluate(({ direction, autoFocus }) => {
          activations = 0;
          document.documentElement.dir = direction;
          menu.options.autoFocus = autoFocus;
          document.querySelector('#trigger').focus();
          menu.open();
        }, { direction, autoFocus });
        await page.clock.runFor(60);
        await expect(page.locator(autoFocus ? '#root' : '#trigger')).toBeFocused();
        await page.locator('#parent').focus();
        const openKey = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
        const backKey = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
        await page.keyboard.press(openKey);
        await expect(page.locator('#alpha')).toBeFocused();
        const target = await page.locator('#alpha').boundingBox();
        assert.ok(target.width >= 44 && target.height >= 44);
        await page.keyboard.press('ArrowDown');
        await expect(page.locator('#disabled')).toBeFocused();
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => activations), 0);
        await page.keyboard.press('ArrowDown');
        await expect(page.locator('#beta')).toBeFocused();
        await page.keyboard.press('ArrowUp');
        await expect(page.locator('#disabled')).toBeFocused();
        await page.keyboard.press('ArrowDown');
        await expect(page.locator('#beta')).toBeFocused();
        await page.keyboard.press('Shift');
        await page.keyboard.press('Control+a');
        assert.deepEqual(await page.evaluate(() => menu.filterQuery), []);
        await page.keyboard.press('a');
        await expect(page.locator('#alpha')).toBeFocused();
        await page.clock.runFor(1100);
        await page.keyboard.press('b');
        await expect(page.locator('#beta')).toBeFocused();
        await page.keyboard.press('ArrowDown');
        await expect(page.locator('#deep')).toBeFocused();
        await page.keyboard.press(openKey);
        await expect(page.locator('#leaf')).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(page.locator('#deep')).toBeFocused();
        await page.clock.runFor(220);
        await expect(page.locator('#leaf')).toBeHidden();
        await expect(page.locator('#parent > button')).toHaveAttribute('aria-expanded', 'true');
        await page.keyboard.press(backKey);
        await expect(page.locator('#parent')).toBeFocused();
        await page.clock.runFor(220);
        await expect(page.locator('#alpha')).toBeHidden();
        for (const left of [20, 820]) {
          await page.evaluate(left => { menu.close(); document.querySelector('#trigger').style.left = `${left}px`; menu.open(); }, left);
          await page.clock.runFor(60);
          await page.locator('#parent').focus();
          await page.keyboard.press(openKey);
          await page.clock.runFor(220);
          const box = await page.locator('#parent > menu').boundingBox();
          assert.ok(box.x >= 7 && box.x + box.width <= 893, `${direction}: ${JSON.stringify(box)}`);
        }
        await page.locator('#beta').focus();
        await page.keyboard.press('Enter');
        await page.clock.runFor(100);
        assert.equal(await page.evaluate(() => activations), 1);
      }
    } finally { try { await page?.evaluate(() => window.menu?.destroy()); } finally { await browser.close(); } }
  });

  browserTest(`Menu consumers keep values and focus through closing (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage();
      await page.setContent(`<style>${css}</style><form><div class="field"><label for="choice">Choice</label><select id="choice" name="choice"><option value="one">One</option><option value="two">Two</option></select></div><div class="field"><label for="query">Fruit</label><input id="query" name="fruit"></div><button id="after" type="button">After</button></form>`);
      await page.addScriptTag({ content: js });
      await page.clock.install();
      await page.evaluate(() => {
        window.changes = 0;
        document.querySelector('#choice').addEventListener('change', () => changes++);
        window.select = Expressive.FormSelect.init(document.querySelector('#choice'), { menuOptions: { inDuration: 40, outDuration: 1000 } });
        window.autocomplete = Expressive.Autocomplete.init(document.querySelector('#query'), { data: [{ id: 'apple' }, { id: 'apricot' }], menuOptions: { inDuration: 40, outDuration: 1000 } });
        select.menu.open();
      });
      await page.clock.runFor(60);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await expect(page.locator('#choice')).toHaveValue('two');
      assert.equal(await page.evaluate(() => changes), 1);
      assert.equal(await page.evaluate(() => new FormData(document.querySelector('form')).get('choice')), 'two');
      await expect(page.locator('input[role="combobox"]').first()).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.locator('#query')).toBeFocused();
      await page.keyboard.type('app');
      await page.clock.runFor(60);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await expect(page.locator('#query')).toHaveValue('apple');
      await expect(page.locator('#query')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.locator('#after')).toBeFocused();
      await page.clock.runFor(1100);
      await expect(page.locator('#after')).toBeFocused();
    } finally { try { await page?.evaluate(() => { window.autocomplete?.destroy(); window.select?.destroy(); }); } finally { await browser.close(); } }
  });

  browserTest(`enhanced select keeps enlarged multiline labels clear of values (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage({ viewport: { width: 375, height: 900 }, reducedMotion: 'reduce' });
      await page.setContent(`<style>${css}</style><main style="padding:16px"><div class="field"><select id="frequency"><option>Weekly</option></select><label for="frequency">Summary frequency</label></div></main>`);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => window.select = Expressive.FormSelect.init(document.querySelector('select')));
      for (const direction of ['ltr', 'rtl']) for (const size of [16, 32]) {
        await page.evaluate(({ direction, size }) => {
          document.documentElement.dir = direction;
          document.documentElement.style.fontSize = `${size}px`;
          document.querySelector('label').textContent = direction === 'rtl' ? 'تكرار إرسال ملخص مساحة العمل' : 'Summary frequency for workspace notifications';
        }, { direction, size });
        const geometry = await page.evaluate(() => {
          const label = document.querySelector('label'), input = document.querySelector('[role=combobox]');
          const range = document.createRange(); range.selectNodeContents(label);
          const text = range.getBoundingClientRect(), rect = input.getBoundingClientRect(), style = getComputedStyle(input);
          const valueTop = rect.top + parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop) + (input.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - parseFloat(style.lineHeight)) / 2;
          return { labelBottom: text.bottom, valueTop, labelLeft: text.left, labelRight: text.right, width: innerWidth, scrollWidth: document.documentElement.scrollWidth };
        });
        assert.ok(geometry.labelBottom <= geometry.valueTop + 1, `${direction} ${size}: ${JSON.stringify(geometry)}`);
        assert.ok(geometry.labelLeft >= 0 && geometry.labelRight <= geometry.width);
        assert.ok(geometry.scrollWidth <= geometry.width);
      }
      await page.evaluate(() => {
        document.documentElement.dir = 'ltr';
        document.documentElement.style.fontSize = '16px';
        document.querySelector('label').textContent = 'Frequency';
        const prefix = document.createElement('i'); prefix.className = 'prefix'; prefix.textContent = 'A';
        document.querySelector('.field').prepend(prefix);
        const small = document.createElement('small'); small.textContent = 'Supporting text'; document.querySelector('.field').append(small);
      });
      const prefixGeometry = await page.evaluate(() => {
        const range = document.createRange(); range.selectNodeContents(document.querySelector('label'));
        return { labelLeft: range.getBoundingClientRect().left, iconRight: document.querySelector('.prefix').getBoundingClientRect().right, fieldBackground: getComputedStyle(document.querySelector('.field')).backgroundColor };
      });
      assert.ok(prefixGeometry.labelLeft >= prefixGeometry.iconRight);
      assert.equal(prefixGeometry.fieldBackground, 'rgba(0, 0, 0, 0)');
    } finally { try { await page?.evaluate(() => window.select?.destroy()); } finally { await browser.close(); } }
  });

  browserTest(`Chips deletion targets and focus recovery (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage();
      await page.setContent(`<style>${css}</style><form><div id="chips"><input name="tags" aria-label="Tags"></div><button id="outside" type="button">Outside</button></form>`);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => window.chips = null);
      await page.evaluate(() => document.querySelector('form').addEventListener('submit', e => { e.preventDefault(); window.submits++; }));
      for (const direction of ['ltr', 'rtl']) for (const reducedMotion of ['reduce', 'no-preference']) {
        await page.emulateMedia({ reducedMotion });
        await page.evaluate(direction => document.documentElement.dir = direction, direction);
        for (const action of ['Backspace', 'Delete', 'click', 'Enter', 'Space', 'programmatic']) for (const [count, index] of [[3, 0], [3, 1], [3, 2], [1, 0]]) {
          await page.evaluate(count => {
            window.chips?.destroy();
            window.deletions = 0; window.selections = 0; window.submits = 0;
            window.chips = Expressive.Chips.init(document.querySelector('#chips'), {
              allowUserInput: true, data: ['Apple', 'Pear', 'Plum'].slice(0, count).map(id => ({ id })),
              onChipDelete: () => deletions++, onChipSelect: () => selections++
            });
            chips.selectChip(count - 1);
            chips._input.value = 'Draft';
            selections = 0;
          }, count);
          const close = page.locator('#chips .close').nth(index);
          await close.focus();
          if (action === 'click') await close.locator('span').click();
          else if (action === 'programmatic') await page.evaluate(index => chips.deleteChip(index), index);
          else await page.keyboard.press(action);
          const expected = ['Apple', 'Pear', 'Plum'].slice(0, count).filter((_, i) => i !== index);
          assert.deepEqual(await page.evaluate(() => chips.getData().map(chip => chip.id)), expected);
          await expect(page.locator('#chips .chip')).toHaveCount(count - 1);
          assert.equal(await page.evaluate(() => deletions), 1);
          assert.equal(await page.evaluate(() => submits), 0);
          assert.equal(await page.evaluate(() => new FormData(document.querySelector('form')).get('tags')), 'Draft');
          const keyboardDelete = ['Backspace', 'Delete'].includes(action);
          if (keyboardDelete && count > 1) {
            const previous = Math.max(index - 1, 0);
            await expect(page.locator('#chips .close').nth(previous)).toBeFocused();
            await expect(page.locator('#chips .chip').nth(previous)).toHaveClass(/selected/);
            assert.equal(await page.evaluate(() => selections), 1);
          } else await expect(page.locator('#chips input')).toBeFocused();
        }
      }
    } finally { try { await page?.evaluate(() => window.chips?.destroy()); } finally { await browser.close(); } }
  });

  browserTest(`Chips callbacks and instance teardown preserve focus (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage();
      await page.setContent(`<style>${css}</style><div id="one"></div><div id="two"></div><button id="outside">Outside</button>`);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => { window.one = null; window.two = null; });
      for (const action of ['Backspace', 'Delete', 'programmatic', 'click', 'Enter', 'Space']) {
        await page.evaluate(() => {
          window.one?.destroy(); window.two?.destroy(); window.deletions = 0;
          window.one = Expressive.Chips.init(document.querySelector('#one'), { allowUserInput: true, data: [{ id: 'One' }] });
          window.two = Expressive.Chips.init(document.querySelector('#two'), { allowUserInput: true, data: [{ id: 'Two' }, { id: 'Three' }], onChipDelete: () => { deletions++; document.querySelector('#outside').focus(); } });
          one.destroy();
        });
        await page.locator('#two .close').first().focus();
        if (action === 'programmatic') await page.evaluate(() => two.deleteChip(0));
        else if (action === 'click') await page.locator('#two .close').first().click();
        else await page.keyboard.press(action);
        await expect(page.locator('#outside')).toBeFocused();
        assert.equal(await page.evaluate(() => deletions), 1);
        assert.deepEqual(await page.evaluate(() => two.getData()), [{ id: 'Three' }]);
      }
      await page.evaluate(() => {
        two.options.onChipDelete = null;
        document.querySelector('#outside').focus();
        two.deleteChip(0);
      });
      await expect(page.locator('#outside')).toBeFocused();
      await page.evaluate(() => { two.addChip({ id: 'New' }); two.selectChip(0); two.deleteChip(0); });
      await expect(page.locator('#two input')).toBeFocused();
      await page.evaluate(() => {
        two.addChip({ id: 'First' }); two.addChip({ id: 'Last' }); two.selectChip(1);
        two.deleteChip(0);
      });
      await expect(page.locator('#two .close')).toBeFocused();
      await expect(page.locator('#two .chip')).toHaveClass(/selected/);
      await page.evaluate(() => { two.options.onChipDelete = () => two.destroy(); });
      await page.keyboard.press('Delete');
      await expect(page.locator('#two .chip')).toHaveCount(0);
      for (const mode of ['open', 'closed']) for (const destination of ['document', 'parent', 'local', 'none']) for (const action of ['Delete', 'Enter', 'programmatic']) {
        await page.evaluate(({ mode, destination }) => {
          window.shadowChips?.destroy(); window.shadowHost?.remove();
          window.shadowHost = document.createElement('div'); document.body.append(shadowHost);
          const parent = shadowHost.attachShadow({ mode });
          const parentButton = document.createElement('button'); parentButton.textContent = 'Parent'; parent.append(parentButton);
          const host = document.createElement('div'); parent.append(host);
          const root = host.attachShadow({ mode });
          const container = document.createElement('div'); root.append(container);
          const localButton = document.createElement('button'); localButton.textContent = 'Local'; root.append(localButton);
          window.focusTarget = destination === 'document' ? document.querySelector('#outside') : destination === 'parent' ? parentButton : localButton;
          window.shadowChips = Expressive.Chips.init(container, {
            allowUserInput: true, data: [{ id: 'First' }, { id: 'Last' }],
            onChipDelete: destination === 'none' ? null : () => focusTarget.focus()
          });
          shadowChips.selectChip(0);
        }, { mode, destination });
        if (action === 'programmatic') await page.evaluate(() => shadowChips.deleteChip(0));
        else await page.keyboard.press(action);
        assert.equal(await page.evaluate(({ action, destination }) => {
          const target = destination === 'none' ? (action === 'Delete' ? shadowChips._chips[0].querySelector('.close') : shadowChips._input) : focusTarget;
          return target.getRootNode().activeElement === target;
        }, { action, destination }), true, `${mode} ${destination} ${action}`);
        assert.deepEqual(await page.evaluate(() => shadowChips.getData()), [{ id: 'Last' }]);
      }
    } finally { try { await page?.evaluate(() => { window.one?.destroy(); window.two?.destroy(); window.shadowChips?.destroy(); window.shadowHost?.remove(); }); } finally { await browser.close(); } }
  });

  browserTest(`Chips wrapped labels keep separate actions reachable (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage({ viewport: { width: 320, height: 600 } });
      await page.setContent(`<style>${css}</style><div class="chips" style="width:280px"><span class="chip"><button type="button" id="action">A translated chip label with several words</button><button type="button" class="close" aria-label="Remove label">X</button></span></div><div id="editable" style="width:280px"></div>`);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => { window.chips = Expressive.Chips.init(document.querySelector('#editable'), { allowUserInput: true, data: [{ id: 'A translated label with several words and averylongunbrokentextvalue' }] }); });
      for (const direction of ['ltr', 'rtl']) for (const size of [14, 28]) {
        await page.evaluate(({ direction, size }) => {
          document.documentElement.dir = direction;
          document.querySelectorAll('.chip').forEach(chip => chip.style.setProperty('--font-size', `${size}px`));
        }, { direction, size });
        const geometry = await page.evaluate(() => Array.from(document.querySelectorAll('.chip')).map(chip => {
          const box = chip.getBoundingClientRect(), close = chip.querySelector('.close').getBoundingClientRect();
          const range = document.createRange(); range.selectNodeContents(chip.querySelector('#action') ?? chip.firstChild);
          const label = range.getBoundingClientRect();
          return { left: box.left, right: box.right, labelTop: label.top, labelBottom: label.bottom, top: box.top, bottom: box.bottom,
            separate: label.right <= close.left || close.right <= label.left, closeWidth: close.width, closeHeight: close.height, overflow: document.documentElement.scrollWidth > innerWidth };
        }));
        for (const box of geometry) {
          assert.ok(!box.overflow && box.left >= 0 && box.right <= 320, JSON.stringify(box));
          assert.ok(box.separate && box.labelTop >= box.top && box.labelBottom <= box.bottom, JSON.stringify(box));
          assert.ok(box.closeWidth >= 24 && box.closeHeight >= 24, JSON.stringify(box));
        }
      }
      await page.evaluate(() => {
        window.actions = 0;
        document.querySelector('#action').addEventListener('click', () => actions++);
      });
      await page.locator('#action').click();
      assert.equal(await page.evaluate(() => actions), 1);
      await expect(page.locator('#action')).toBeVisible();
      await page.evaluate(() => document.querySelector('#action').disabled = true);
      await expect(page.locator('#action')).toBeDisabled();
      await page.locator('.chips').first().locator('.close').click();
      await expect(page.locator('#action')).toHaveCount(0);
      assert.equal(await page.evaluate(() => actions), 1);
    } finally { try { await page?.evaluate(() => window.chips?.destroy()); } finally { await browser.close(); } }
  });
}
async function fixture(page, { direction = 'ltr', staleActive = false, ...options } = {}) {
  await page.setContent(`<style>${css}</style><main style="width:320px">
    <nav class="tabs" aria-label="Sections"><a href="#one">First translated section label</a><a href="#two">Second translated section label</a><a href="#three">Third translated section label</a><a target="_blank" href="https://example.test/#/guide">External guide</a></nav>
    <section id="one" style="min-height:160px"><button>First action</button></section>
    <section id="two" style="min-height:160px"><button>Second action</button></section>
    <section id="three" style="min-height:160px"><button>Third action</button></section>
  </main>`);
  await page.evaluate(({ direction, staleActive }) => {
    document.body.dir = direction;
    if (staleActive) document.querySelector('#one').classList.add('active');
  }, { direction, staleActive });
  await page.addScriptTag({ content: js });
  await page.evaluate(options => {
    window.shown = [];
    window.panelState = () => [...document.querySelectorAll('section')].map(el => ({ id: el.id, style: el.style.cssText, classes: el.className, label: el.getAttribute('aria-label'), tabindex: el.getAttribute('tabindex'), parent: el.parentElement.tagName }));
    window.original = panelState();
    window.tabs = Expressive.Tabs.init(document.querySelector('nav'), { duration: 40, ...options, onShow: panel => shown.push(panel.id) });
  }, options);
}

for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(type.executablePath()) ? test : test.skip;
  browserTest(`Tabs synchronize swipe selection and callbacks (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage();
      for (const direction of ['ltr', 'rtl']) for (const reducedMotion of ['reduce', 'no-preference']) {
        await page.emulateMedia({ reducedMotion });
        await fixture(page, { swipeable: true, direction });
        await page.locator('a[href="#two"]').click();
        await expect(page.locator('a[href="#two"]')).toBeFocused();
        assert.deepEqual(await page.evaluate(() => shown), ['two']);
        await page.evaluate(() => tabs._tabsCarousel.next());
        await expect(page.locator('a[href="#three"]')).toHaveAttribute('aria-current', 'page');
        assert.deepEqual(await page.evaluate(() => ({ shown, index: tabs.index, panel: tabs._content.id })), { shown: ['two', 'three'], index: 2, panel: 'three' });
        await expect(page.locator('#three')).toHaveClass(/active/);
        await page.evaluate(() => tabs.destroy());
      }
    } finally {
      try { await page?.evaluate(() => window.tabs && Expressive.Tabs.getInstance(tabs.el)?.destroy()); } finally { await browser.close(); }
    }
  });

  browserTest(`Tabs restore panels on teardown and remount (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage();
      await fixture(page, { swipeable: true });
      await page.evaluate(() => tabs.destroy());
      assert.deepEqual(await page.evaluate(() => panelState()), await page.evaluate(() => original));
      await expect(page.locator('.tabs-content, .indicator')).toHaveCount(0);
      await page.evaluate(() => { tabs = Expressive.Tabs.init(document.querySelector('nav'), { swipeable: true, onShow: panel => shown.push(panel.id) }); });
      await page.locator('a[href="#two"]').click();
      assert.deepEqual(await page.evaluate(() => shown), ['two']);
    } finally {
      try { await page?.evaluate(() => window.tabs && Expressive.Tabs.getInstance(tabs.el)?.destroy()); } finally { await browser.close(); }
    }
  });

  browserTest(`Tabs threshold keeps native links and ordinary panels (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage({ viewport: { width: 900, height: 700 } });
      await fixture(page, { swipeable: true, responsiveThreshold: 800 });
      await expect(page.locator('.tabs-content')).toHaveCount(0);
      await expect(page.locator('#two')).toBeHidden();
      await page.locator('a[href="#one"]').focus();
      await page.keyboard.press('Tab');
      await expect(page.locator('a[href="#two"]')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#two')).toBeVisible();
      await page.evaluate(() => { document.querySelector('a[href="#three"]').setAttribute('aria-disabled', 'true'); tabs.select('three'); });
      assert.equal(await page.evaluate(() => tabs.index), 1);
      const prevented = await page.evaluate(() => {
        const link = document.querySelector('a[href="#one"]');
        link.target = '_blank';
        let prevented;
        document.addEventListener('click', event => { prevented = event.defaultPrevented; event.preventDefault(); }, { once: true });
        link.click();
        return prevented;
      });
      assert.equal(prevented, false);
      assert.equal(await page.evaluate(() => tabs.index), 1);
    } finally {
      try { await page?.evaluate(() => window.tabs && Expressive.Tabs.getInstance(tabs.el)?.destroy()); } finally { await browser.close(); }
    }
  });

  browserTest(`Tabs hash selection, native dragging and overflow geometry (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      for (const direction of ['ltr', 'rtl']) for (const reducedMotion of ['reduce', 'no-preference']) {
        await page.goto('about:blank#two');
        await page.emulateMedia({ reducedMotion });
        await fixture(page, { swipeable: true, responsiveThreshold: 800, direction, staleActive: true });
        assert.equal(await page.evaluate(() => tabs.index), 1);
        assert.equal(await page.evaluate(() => tabs._tabsCarousel.center), 1);
        await expect(page.locator('section.active')).toHaveAttribute('id', 'two');
        assert.deepEqual(await page.evaluate(() => shown), []);
        await expect(page.locator('a[href="#two"]')).toHaveAttribute('aria-current', 'page');
        await page.waitForTimeout(450);
        const box = await page.locator('.carousel-track').boundingBox();
        const start = direction === 'ltr' ? box.x + box.width - 25 : box.x + 25;
        const end = direction === 'ltr' ? box.x + 25 : box.x + box.width - 25;
        await page.mouse.move(start, box.y + box.height - 20);
        await page.mouse.down();
        await page.mouse.move(end, box.y + box.height - 20, { steps: 15 });
        await page.mouse.up();
        await expect(page.locator('a[href="#three"]')).toHaveAttribute('aria-current', 'page');
        assert.deepEqual(await page.evaluate(() => shown), ['three']);
        await page.locator('a[href="#three"]').focus();
        await page.waitForTimeout(200);
        const geometry = await page.evaluate(() => {
          const link = tabs._activeTabLink.getBoundingClientRect(), indicator = tabs._indicator.getBoundingClientRect();
          const panel = tabs._content.getBoundingClientRect(), track = document.querySelector('.carousel-track').getBoundingClientRect();
          return { delta: Math.abs(link.left - indicator.left), width: Math.abs(link.width - indicator.width), visible: panel.right > track.left && panel.left < track.right };
        });
        assert.ok(geometry.delta <= 2 && geometry.width <= 2 && geometry.visible, JSON.stringify(geometry));
        await page.setViewportSize({ width: 1000, height: 700 });
        assert.equal(await page.locator('.tabs-content').count(), 1);
        await page.evaluate(() => tabs.destroy());
        assert.deepEqual(await page.evaluate(() => panelState()), await page.evaluate(() => original));
        await page.setViewportSize({ width: 800, height: 700 });
      }
    } finally {
      try { await page?.evaluate(() => window.tabs && Expressive.Tabs.getInstance(tabs.el)?.destroy()); } finally { await browser.close(); }
    }
  });
}
