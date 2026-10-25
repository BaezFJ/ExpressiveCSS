import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const row = (value) => `<li><label><input type="checkbox" value="${value}"> ${value[0].toUpperCase()}${value.slice(1)}</label></li>`;
const button = (move, icon, label) =>
  `<button type="button" class="icon-button" data-transfer="${move}" aria-label="${label}"><span class="material-symbols" aria-hidden="true">${icon}</span></button>`;
const transferList = ({ available = ['olives', 'peppers', 'onions', 'basil'], chosen = [], name = ' data-name="toppings"' } = {}) => `
<div class="transfer-list"${name}>
  <ul class="list transfer-available" aria-label="Available toppings">${available.map(row).join('')}</ul>
  <div class="transfer-actions">
    ${button('add', 'chevron_right', 'Add checked toppings')}
    ${button('add-all', 'keyboard_double_arrow_right', 'Add all toppings')}
    ${button('remove', 'chevron_left', 'Remove checked toppings')}
    ${button('remove-all', 'keyboard_double_arrow_left', 'Remove all toppings')}
  </div>
  <ul class="list transfer-chosen" aria-label="Chosen toppings">${chosen.map(row).join('')}</ul>
</div>`;
const page = (body, dir = 'ltr') => `<!doctype html><html lang="en" dir="${dir}"><head><style>${css}</style></head><body>
${body}
<script>${js}</script></body></html>`;
const form = (list) => `<form id="form">${list}<button id="submit">Submit</button></form>`;

const values = (p, list) => p.locator(`#form .transfer-${list} input`).evaluateAll((boxes) => boxes.map((box) => box.value));
const formValues = (p, id = 'form') => p.evaluate((id) => new FormData(document.getElementById(id)).getAll('toppings'), id);
// The form data a real submit builds, read in a submit handler that stops the navigation.
const submitValues = async (p) => {
  await p.evaluate(() => {
    document.getElementById('form').addEventListener('submit', (e) => {
      e.preventDefault();
      window.__submitted = new FormData(e.target, e.submitter).getAll('toppings');
    }, { once: true });
  });
  await p.locator('#submit').click();
  return p.evaluate(() => window.__submitted);
};
const check = (p, name) => p.getByRole('checkbox', { name }).check();
const press = (p, name) => p.getByRole('button', { name }).click();

for (const [name, engine, test] of engines) {
  test(`${name}: moving two options to the chosen list puts both in the form data, in order`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const p = await browser.newPage({ viewport: { width: 800, height: 700 } });
      await p.setContent(page(form(transferList())));
      await check(p, 'Onions');
      await press(p, 'Add checked toppings');
      await check(p, 'Olives');
      await press(p, 'Add checked toppings');
      assert.deepEqual(await values(p, 'chosen'), ['onions', 'olives']);
      assert.deepEqual(await values(p, 'available'), ['peppers', 'basil']);
      assert.equal(await p.locator('#form .transfer-chosen input:checked').count(), 0, 'moved rows arrive unchecked');
      assert.deepEqual(await formValues(p), ['onions', 'olives']);
      assert.deepEqual(await submitValues(p), ['onions', 'olives']);
    } finally {
      await browser.close();
    }
  });

  test(`${name}: rows moved together keep their order, starting rows submit, and an unnamed list or another form adds nothing`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const p = await browser.newPage({ viewport: { width: 800, height: 700 } });
      await p.setContent(page(`${form(transferList({ chosen: ['mushrooms'] }))}<form id="other"><input name="toppings" value="cheese"></form>`));
      assert.deepEqual(await formValues(p), ['mushrooms'], 'a row that starts chosen submits');
      await check(p, 'Basil');
      await check(p, 'Peppers');
      await press(p, 'Add checked toppings');
      assert.deepEqual(await values(p, 'chosen'), ['mushrooms', 'peppers', 'basil']);
      assert.deepEqual(await formValues(p), ['mushrooms', 'peppers', 'basil']);
      assert.deepEqual(await formValues(p, 'other'), ['cheese'], 'the other form keeps its own data');

      await p.setContent(page(form(transferList({ chosen: ['mushrooms'], name: '' }))));
      await check(p, 'Olives');
      await press(p, 'Add checked toppings');
      assert.deepEqual(await values(p, 'chosen'), ['mushrooms', 'olives'], 'the rows still move');
      assert.deepEqual(await formValues(p), [], 'without data-name nothing is submitted');
      await p.locator('.transfer-list').evaluate((list) => list.setAttribute('data-name', ''));
      assert.deepEqual(await p.evaluate(() => [...new FormData(document.getElementById('form'))]), [], 'an empty data-name submits nothing');

      // A click on a disabled button's icon reaches the document listener.
      await check(p, 'Peppers');
      for (const disable of ['disabled', 'aria-disabled']) {
        await p.locator('[data-transfer="add"]').evaluate((button, disable) => {
          button.removeAttribute('disabled');
          button.setAttribute(disable, disable === 'disabled' ? '' : 'true');
          button.querySelector('.material-symbols').click();
        }, disable);
        assert.deepEqual(await values(p, 'chosen'), ['mushrooms', 'olives'], `${disable}: nothing moves`);
      }
    } finally {
      await browser.close();
    }
  });

  test(`${name}: a disabled fieldset leaves the chosen rows out, a locked row stays put but submits, and a nested list keeps to itself`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const p = await browser.newPage({ viewport: { width: 800, height: 700 } });
      await p.setContent(page(`<form id="form">
        <fieldset disabled>${transferList({ chosen: ['mushrooms'] })}<input name="native" value="n"></fieldset>
        <fieldset disabled><legend>${transferList({ chosen: ['ham'], name: ' data-name="meats"' })}</legend></fieldset>
      </form>`));
      assert.deepEqual(await p.evaluate(() => [...new FormData(document.getElementById('form'))]), [['meats', 'ham']],
        'only the list in the first legend, which the fieldset leaves enabled, submits');

      await p.setContent(page(form(transferList({ chosen: ['mushrooms'] }))));
      await p.evaluate(() => {
        document.querySelector('[value="mushrooms"]').disabled = true;
        const basil = document.querySelector('[value="basil"]');
        basil.checked = true;
        basil.disabled = true;
      });
      await check(p, 'Olives');
      await press(p, 'Add checked toppings');
      assert.deepEqual(await values(p, 'available'), ['peppers', 'onions', 'basil'], 'a checked but disabled row stays');
      assert.deepEqual(await formValues(p), ['mushrooms', 'olives'], 'a disabled chosen row still submits');

      // An inner list inside an outer row submits only under its own name.
      await p.setContent(page(form(transferList({ chosen: ['mushrooms'] }))));
      await p.locator('.transfer-chosen > li').evaluate((li, inner) => li.insertAdjacentHTML('beforeend', inner),
        transferList({ chosen: ['ham'], name: ' data-name="meats"' }).replace(/aria-label="([^"]+)"/g, 'aria-label="Inner $1"'));
      assert.deepEqual(await p.evaluate(() => [...new FormData(document.getElementById('form'))]), [['toppings', 'mushrooms'], ['meats', 'ham']]);
    } finally {
      await browser.close();
    }
  });

  test(`${name}: the lists follow the page direction, stack in a narrow window and scroll inside their box`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const p = await browser.newPage({ viewport: { width: 800, height: 700 } });
      const box = (selector) => p.locator(selector).boundingBox();
      const flipped = () => p.locator('[data-transfer="add"] .material-symbols').evaluate((icon) => getComputedStyle(icon).scale);

      await p.setContent(page(form(transferList())));
      assert.ok((await box('.transfer-available')).x < (await box('.transfer-chosen')).x, 'ltr: available on the left');
      assert.equal(await flipped(), 'none');

      await p.setContent(page(form(transferList()), 'rtl'));
      assert.ok((await box('.transfer-available')).x > (await box('.transfer-chosen')).x, 'rtl: available on the right');
      assert.equal(await flipped(), '-1 1', 'rtl: the icon points toward the chosen list');

      await p.setViewportSize({ width: 400, height: 700 });
      await p.setContent(page(form(transferList())));
      const available = await box('.transfer-available');
      const actions = await box('.transfer-actions');
      const chosen = await box('.transfer-chosen');
      assert.ok(actions.y >= available.y + available.height - 1, 'narrow: the actions sit below the available list');
      assert.ok(chosen.y >= actions.y + actions.height - 1, 'narrow: the chosen list sits below the actions');
      assert.ok(actions.width > actions.height, 'narrow: the actions form a row');
      assert.equal(await p.locator('[data-transfer="add"] .material-symbols').evaluate((icon) => getComputedStyle(icon).rotate), '90deg', 'narrow: the icons point down and up');

      await p.setViewportSize({ width: 800, height: 700 });
      const many = Array.from({ length: 50 }, (_, i) => `item${i}`);
      await p.setContent(page(form(transferList({ available: many }))));
      const scroll = await p.locator('.transfer-available').evaluate((list) => [list.scrollHeight, list.clientHeight]);
      assert.ok(scroll[0] > scroll[1], 'a long list scrolls inside its box');
      const last = await box('[data-transfer="remove-all"]');
      assert.ok(last.y + last.height <= 700, 'the buttons stay in the viewport');
    } finally {
      await browser.close();
    }
  });

  test(`${name}: remove returns rows to their original slots, the all buttons skip disabled rows, and a second Init adds nothing`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const p = await browser.newPage({ viewport: { width: 800, height: 700 } });
      await p.setContent(page(form(transferList())));
      await p.evaluate(() => {
        Expressive.TransferList.Init();
        Expressive.TransferList.Init();
        window.__events = 0;
        document.addEventListener('expressive:transfer', () => window.__events++);
      });
      await press(p, 'Add all toppings');
      assert.deepEqual(await values(p, 'chosen'), ['olives', 'peppers', 'onions', 'basil']);
      assert.equal(await p.evaluate(() => window.__events), 1, 'one event per press');
      await check(p, 'Peppers');
      await check(p, 'Olives');
      await press(p, 'Remove checked toppings');
      assert.deepEqual(await values(p, 'available'), ['olives', 'peppers']);
      assert.deepEqual(await values(p, 'chosen'), ['onions', 'basil']);
      assert.equal(await p.locator('#form input:checked').count(), 0, 'moved rows arrive unchecked');
      await check(p, 'Peppers');
      await press(p, 'Add checked toppings');
      await check(p, 'Onions');
      await press(p, 'Remove checked toppings');
      assert.deepEqual(await values(p, 'available'), ['olives', 'onions']);
      await p.getByRole('checkbox', { name: 'Basil' }).evaluate((box) => { box.disabled = true; });
      await press(p, 'Remove all toppings');
      assert.deepEqual(await values(p, 'available'), ['olives', 'peppers', 'onions'], 'a row goes back before the rows recorded after it');
      assert.deepEqual(await values(p, 'chosen'), ['basil'], 'a disabled row stays');
      assert.equal(await p.evaluate(() => window.__events), 5);
    } finally {
      await browser.close();
    }
  });

  test(`${name}: a press with nothing to move does nothing, and focus stays on the pressed button`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const p = await browser.newPage({ viewport: { width: 800, height: 700 } });
      await p.setContent(page(form(transferList())));
      await p.evaluate(() => {
        window.__events = 0;
        document.addEventListener('expressive:transfer', () => window.__events++);
      });
      await press(p, 'Add checked toppings');
      await press(p, 'Remove checked toppings');
      await press(p, 'Remove all toppings');
      assert.equal(await p.evaluate(() => window.__events), 0);
      assert.equal(await p.locator('[aria-live="polite"]').count(), 0, 'nothing is announced');
      assert.deepEqual(await values(p, 'available'), ['olives', 'peppers', 'onions', 'basil']);

      for (const [key, row] of [['Enter', 'Olives'], ['Space', 'Peppers']]) {
        await check(p, row);
        await p.getByRole('button', { name: 'Add checked toppings' }).focus();
        await p.keyboard.press(key);
        assert.equal(await p.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Add checked toppings', `${key}: focus stays on the button`);
      }
      assert.deepEqual(await values(p, 'chosen'), ['olives', 'peppers']);
    } finally {
      await browser.close();
    }
  });

  test(`${name}: a move is announced with the destination list's name`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const p = await browser.newPage({ viewport: { width: 800, height: 700 } });
      await p.setContent(page(form(transferList())));
      const region = p.locator('.transfer-list + [aria-live="polite"]');
      await check(p, 'Olives');
      await check(p, 'Basil');
      await press(p, 'Add checked toppings');
      assert.equal(await region.textContent(), 'Moved 2 to Chosen toppings');
      await p.evaluate(() => { Expressive.TransferList.i18n.moved = '{count} → {list}'; });
      await check(p, 'Peppers');
      await press(p, 'Add checked toppings');
      assert.equal(await region.textContent(), '1 → Chosen toppings');
      await p.evaluate(() => {
        Expressive.TransferList.i18n.moved = 'Moved {count} to {list}';
        const list = document.querySelector('.transfer-available');
        list.removeAttribute('aria-label');
        list.setAttribute('aria-labelledby', 'pantry missing');
        document.body.insertAdjacentHTML('afterbegin', '<h2 id="pantry"> Pantry </h2>');
      });
      await check(p, 'Olives');
      await press(p, 'Remove checked toppings');
      assert.equal(await region.textContent(), 'Moved 1 to Pantry', 'the labelling text, trimmed, without the missing id');
      assert.equal(await p.locator('[aria-live="polite"]').count(), 1, 'one region per list');
    } finally {
      await browser.close();
    }
  });

  test(`${name}: expressive:transfer bubbles with the moved rows and both lists`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const p = await browser.newPage({ viewport: { width: 800, height: 700 } });
      await p.setContent(page(form(transferList())));
      await p.evaluate(() => {
        document.addEventListener('expressive:transfer', (e) => {
          window.__detail = {
            target: e.target.className,
            rows: e.detail.rows.map((row) => row.querySelector('input').value),
            from: e.detail.from.className,
            to: e.detail.to.className
          };
        });
      });
      await check(p, 'Peppers');
      await check(p, 'Olives');
      await press(p, 'Add checked toppings');
      assert.deepEqual(await p.evaluate(() => window.__detail), {
        target: 'transfer-list',
        rows: ['olives', 'peppers'],
        from: 'list transfer-available',
        to: 'list transfer-chosen'
      });
      // Rows chosen as peppers then olives go back to their slots, and the detail lists them in that new order.
      await press(p, 'Remove all toppings');
      await check(p, 'Peppers');
      await press(p, 'Add checked toppings');
      await check(p, 'Olives');
      await press(p, 'Add checked toppings');
      await check(p, 'Peppers');
      await check(p, 'Olives');
      await press(p, 'Remove checked toppings');
      assert.deepEqual(await p.evaluate(() => window.__detail), {
        target: 'transfer-list',
        rows: ['olives', 'peppers'],
        from: 'list transfer-chosen',
        to: 'list transfer-available'
      });
    } finally {
      await browser.close();
    }
  });

  test(`${name}: a form reset puts the rows back where they started`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const p = await browser.newPage({ viewport: { width: 800, height: 700 } });
      const markup = form(transferList({ chosen: ['mushrooms'] }))
        .replace('value="mushrooms"', 'value="mushrooms" checked')
        .replace('<button id="submit">', '<button type="reset" id="clear">Reset</button><button id="submit">');
      await p.setContent(page(markup));
      const settled = () => p.evaluate(() => new Promise((resolve) => setTimeout(resolve)));

      await p.locator('#clear').click();
      await settled();
      assert.deepEqual(await values(p, 'available'), ['olives', 'peppers', 'onions', 'basil'], 'a reset before any move changes nothing');
      assert.deepEqual(await values(p, 'chosen'), ['mushrooms']);

      for (const reset of [() => p.locator('#clear').click(), () => p.evaluate(() => document.getElementById('form').reset())]) {
        await check(p, 'Onions');
        await press(p, 'Add checked toppings');
        await press(p, 'Remove checked toppings');
        await check(p, 'Basil');
        await press(p, 'Add checked toppings');
        assert.deepEqual(await values(p, 'chosen'), ['onions', 'basil']);
        await reset();
        await settled();
        assert.deepEqual(await values(p, 'available'), ['olives', 'peppers', 'onions', 'basil']);
        assert.deepEqual(await values(p, 'chosen'), ['mushrooms']);
        assert.equal(await p.getByRole('checkbox', { name: 'Mushrooms' }).isChecked(), true, 'the default checked state returns');
      }

      // A row the page removed stays removed.
      await check(p, 'Peppers');
      await press(p, 'Add checked toppings');
      await p.locator('[value="peppers"]').evaluate((box) => box.closest('li').remove());
      await p.locator('#clear').click();
      await settled();
      assert.deepEqual(await values(p, 'available'), ['olives', 'onions', 'basil'], 'a removed row is not put back');

      // A reset the page cancels leaves the rows where they are.
      await p.evaluate(() => document.getElementById('form').addEventListener('reset', (e) => e.preventDefault()));
      await check(p, 'Olives');
      await press(p, 'Add checked toppings');
      await p.locator('#clear').click();
      await settled();
      assert.deepEqual(await values(p, 'chosen'), ['mushrooms', 'olives'], 'a cancelled reset moves nothing');
    } finally {
      await browser.close();
    }
  });

  test(`${name}: a transfer list added after load works without a call`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const p = await browser.newPage({ viewport: { width: 800, height: 700 } });
      await p.setContent(page('<form id="form"></form>'));
      await p.evaluate((list) => document.getElementById('form').insertAdjacentHTML('beforeend', list), transferList());
      await check(p, 'Onions');
      await press(p, 'Add checked toppings');
      assert.deepEqual(await formValues(p), ['onions']);
    } finally {
      await browser.close();
    }
  });
}
