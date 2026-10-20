import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const keys = (letters) => [...letters].map((c) => `<button type="button" value="${c}">${c}</button>`).join('');
const digits = keys('123456789');

const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body style="margin:0">
<form id="form">
  <input id="pin" inputmode="none" maxlength="4" aria-label="PIN">
  <div class="keypad no-autoinit" id="pad" role="group" aria-label="PIN keypad" aria-controls="pin">
    ${digits}
    <button type="button" data-key="Backspace" aria-label="Delete">⌫</button>
    <button type="button" value="0">0</button>
    <button type="button" data-key="Enter" class="filled" aria-label="Done">✓</button>
  </div>
</form>
<input id="amount" type="number" aria-label="Amount">
<div class="keypad no-autoinit" id="num" role="group" aria-label="Amount keypad" aria-controls="amount">${digits}<button type="button" value=".">.</button><button type="button" value="-">-</button></div>
<input id="price" inputmode="none" aria-label="Price">
<div class="keypad no-autoinit" id="dec" role="group" aria-label="Price keypad" aria-controls="price">${digits}<button type="button" value=".">.</button><button type="button" value="-">-</button></div>
<fieldset id="locked" disabled>
  <legend><input id="in-legend" aria-label="Legend field"></legend>
  <input id="inherited" value="12" aria-label="Locked field">
</fieldset>
<div class="keypad no-autoinit" id="lock-pad" role="group" aria-label="Locked keypad" aria-controls="inherited"><button type="button" value="7">7</button></div>
<div class="keypad no-autoinit" id="legend-pad" role="group" aria-label="Legend keypad" aria-controls="in-legend"><button type="button" value="7">7</button></div>
<form id="short-form">
  <input id="short" inputmode="none" required pattern="\\d{4}" maxlength="4" aria-label="Four-digit PIN">
  <div class="keypad no-autoinit" id="short-pad" role="group" aria-label="Four-digit keypad" aria-controls="short">${digits}<button type="button" data-key="Backspace" aria-label="Delete">⌫</button><button type="button" class="filled wide" data-key="Enter" aria-label="Done">✓</button></div>
</form>
<div class="field"><input id="dial" type="tel" inputmode="none" placeholder=" "><label for="dial">Phone</label><button type="button" class="icon-button suffix" data-key="Backspace" aria-label="Delete">⌫</button><button type="button" class="icon-button suffix password-toggle" aria-label="Show" style="right:48px">◉</button></div>
<div class="keypad no-autoinit" id="dial-pad" role="group" aria-label="Dial pad" aria-controls="dial">${digits}<button type="button" data-key="Contacts" aria-label="Contacts">C</button></div>
<div class="keyboard no-autoinit" id="kb-field" role="group" aria-label="Keyboard with its field" aria-controls="inner">
  <div class="field"><input id="inner" placeholder=" "><label for="inner">Inner</label><button type="button" class="icon-button suffix" data-key="Backspace" aria-label="Delete">⌫</button></div>
  <div>${keys('ab')}</div>
</div>
<div class="keypad no-autoinit" id="dial-pad-2" role="group" aria-label="Second dial pad" aria-controls="dial">${digits}</div>
<input id="prefilled" value="12" aria-label="Prefilled">
<div class="keypad no-autoinit" id="pre-pad" role="group" aria-label="Prefilled keypad" aria-controls="prefilled">${digits}</div>
<div class="keypad no-autoinit" id="late-pad" role="group" aria-label="Late keypad" aria-controls="late">${digits}</div>
<input id="caret" value="abc" aria-label="Caret">
<div class="keypad no-autoinit" id="caret-pad" role="group" aria-label="Caret keypad" aria-controls="caret"><button type="button" value="x">x</button><button type="button" data-key="Backspace" aria-label="Delete">⌫</button></div>
<div id="host"></div>
<textarea id="note" aria-label="Note"></textarea>
<div class="keyboard no-autoinit" id="kb" role="group" aria-label="Keyboard" aria-controls="note" style="width:600px;box-sizing:border-box">
  <div class="numbers">${keys('1234567890')}</div>
  <div>${keys('qwertyuiop')}</div>
  <div>${keys('asdfghjkl')}</div>
  <div><button type="button" data-key="Shift" aria-pressed="false" aria-label="Shift">⇧</button>${keys('zxcvbnm')}<button type="button" data-key="Backspace" aria-label="Delete">⌫</button></div>
  <div><button type="button" value=",">,</button><button type="button" value=" " aria-label="Space"></button><button type="button" value=".">.</button><button type="button" data-key="Enter" aria-label="New line">↵</button></div>
</div>
</body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: keypad and keyboard type at the caret, edit, submit, shift and lay out their keys`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    let page;
    try {
      page = await browser.newPage({ viewport: { width: 800, height: 900 } });
      await page.setContent(markup);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => {
        window.keysSeen = [];
        window.inputs = [];
        document.addEventListener('input', (e) => window.inputs.push(e.inputType));
        // Count submissions instead of navigating.
        document.addEventListener('submit', (e) => {
          e.preventDefault();
          e.target.dataset.sent = Number(e.target.dataset.sent || 0) + 1;
        });
        window.Expressive.Keypad.init(document.querySelectorAll('.no-autoinit'), { onKey: (k) => window.keysSeen.push(k) });
      });
      const value = (id) => page.locator(`#${id}`).inputValue();
      const press = (scope, selector) => page.locator(`#${scope} ${selector}`).click();
      const type = async (scope, chars) => { for (const c of chars) await press(scope, `[value="${c}"]`); };

      // Keypad: digits type, maxlength holds, Backspace deletes, Enter submits.
      await page.locator('#pin').focus();
      await type('pad', '12345');
      assert.equal(await value('pin'), '1234', 'maxlength stops the fifth digit');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'pin', 'a pointer press keeps focus in the field');
      await press('pad', '[data-key="Backspace"]');
      assert.equal(await value('pin'), '123');
      await page.locator('#pin').evaluate((el) => el.setSelectionRange(1, 1));
      await press('pad', '[value="9"]');
      assert.equal(await value('pin'), '1923', 'a key types at the caret');
      await press('pad', '[data-key="Enter"]');
      assert.equal(await page.locator('#form').getAttribute('data-sent'), '1', 'Enter submits the form once');
      assert.deepEqual(await page.evaluate(() => window.keysSeen.slice(-3)), ['Backspace', '9', 'Enter']);
      assert.ok((await page.evaluate(() => window.inputs)).includes('deleteContentBackward'), 'the field gets input events');

      // A number input has no selection API; keys append.
      await press('num', '[value="4"]');
      await press('num', '[value="2"]');
      assert.equal(await value('amount'), '42');
      await press('num', '[value="."]');
      await press('num', '[value="5"]');
      assert.equal(await value('amount'), '425', 'a partial number does not wipe a number input');

      // Decimals and signs go in a text field.
      await type('dec', '12.3');
      assert.equal(await value('price'), '12.3');
      await page.locator('#price').fill('');
      await type('dec', '-5');
      assert.equal(await value('price'), '-5');

      // A field disabled by its fieldset takes nothing; one in the first
      // legend stays enabled and types.
      await press('lock-pad', '[value="7"]');
      assert.equal(await value('inherited'), '12', 'a field in a disabled fieldset is not edited');
      await press('legend-pad', '[value="7"]');
      assert.equal(await value('in-legend'), '7', 'a field in the first legend stays enabled');

      // A keypad's edit is a script's, which browsers skip for minlength but
      // not for pattern: pattern holds, so Enter does not submit a short PIN.
      const mismatch = () => page.locator('#short').evaluate((el) => el.validity.patternMismatch);
      await press('short-pad', '[value="1"]');
      await press('short-pad', '[data-key="Enter"]');
      assert.equal(await page.locator('#short-form').getAttribute('data-sent'), null, 'a short PIN does not submit');
      assert.equal(await mismatch(), true);
      // Firefox's validation bubble swallows clicks until the field blurs.
      await page.locator('#short').blur();
      await type('short-pad', '234');
      await press('short-pad', '[data-key="Enter"]');
      assert.equal(await page.locator('#short-form').getAttribute('data-sent'), '1', 'a full PIN submits');
      await press('short-pad', '[data-key="Backspace"]');
      assert.equal(await mismatch(), true, 'deleting a digit fails the pattern again');

      // A Backspace inside the field's wrapper works like a keypad key, and
      // an unknown function key only reports itself.
      await type('dial-pad', '56');
      await page.locator('#dial + label + button').click();
      assert.equal(await value('dial'), '5', 'a trailing Backspace in the field deletes');
      await press('dial-pad', '[data-key="Contacts"]');
      assert.equal(await value('dial'), '5');
      assert.equal(await page.evaluate(() => window.keysSeen.at(-1)), 'Contacts');

      // Two keypads share #dial: one in-field press still deletes once, and
      // a field button without data-key, such as a password toggle, is not a key.
      await type('dial-pad-2', '23');
      await page.locator('#dial + label + button').click();
      assert.equal(await value('dial'), '52', 'an in-field key runs once for two keypads');
      const seen = await page.evaluate(() => window.keysSeen.length);
      await page.locator('#dial ~ .password-toggle').click();
      assert.equal(await page.evaluate(() => window.keysSeen.length), seen, 'a password toggle is not a key');

      // A field inside its keyboard: one press, one deletion, one onKey.
      await type('kb-field', 'aba');
      const before3 = await page.evaluate(() => window.keysSeen.length);
      await page.locator('#inner ~ button').click();
      assert.equal(await value('inner'), 'ab');
      assert.equal(await page.evaluate(() => window.keysSeen.length), before3 + 1);

      // A prefilled field nobody has clicked into types at the end.
      await press('pre-pad', '[value="3"]');
      assert.equal(await value('prefilled'), '123');

      // A field rendered after init gets its in-field key, first press.
      await page.evaluate(() => document.body.insertAdjacentHTML('beforeend',
        '<div class="field"><input id="late" value="98" placeholder=" "><label for="late">Late</label><button type="button" class="icon-button suffix" data-key="Backspace" aria-label="Delete">⌫</button></div>'));
      await page.locator('#late ~ button').click();
      assert.equal(await value('late'), '9', 'a field rendered after init');

      // A caret a person put at the start stays there when a key is
      // activated from the keyboard, which moves focus off the field.
      const caretAtStart = () => page.locator('#caret').evaluate((el) => { el.value = 'abc'; el.focus(); el.setSelectionRange(0, 0); });
      await caretAtStart();
      await page.locator('#caret-pad [value="x"]').focus();
      await page.keyboard.press('Enter');
      assert.equal(await value('caret'), 'xabc', 'a key types at a caret placed at the start');
      await caretAtStart();
      await page.locator('#caret-pad [data-key="Backspace"]').focus();
      await page.keyboard.press('Space');
      assert.equal(await value('caret'), 'abc', 'Backspace at the start deletes nothing');

      // A wide key spans two cells as a pill.
      const wide = await page.locator('#short-pad .wide').evaluate((el) => ({ width: el.getBoundingClientRect().width, radius: getComputedStyle(el).borderTopLeftRadius }));
      assert.deepEqual(wide, { width: 156, radius: '36px' });

      // A keypad inside a shadow root types into its field there, and its
      // input event reaches listeners outside, as typing does.
      const shadow = await page.evaluate(() => {
        const root = document.getElementById('host').attachShadow({ mode: 'open' });
        root.innerHTML = '<input id="code" aria-label="Code"><div class="keypad" role="group" aria-label="Code keypad" aria-controls="code"><button type="button" value="7">7</button></div>';
        let heard = 0;
        document.addEventListener('input', () => heard++);
        window.Expressive.Keypad.init(root.querySelector('.keypad'));
        root.querySelector('button').click();
        return { value: root.getElementById('code').value, heard };
      });
      assert.deepEqual(shadow, { value: '7', heard: 1 });

      // Keyboard: one-shot Shift, space, Enter as a new line in a textarea.
      await press('kb', '[data-key="Shift"]');
      const shifted = await page.locator('#kb [value="h"]').evaluate((el) => getComputedStyle(el).textTransform);
      assert.equal(shifted, 'uppercase', 'a latched Shift shows capitals');
      await type('kb', 'hi y');
      await press('kb', '[data-key="Enter"]');
      await press('kb', '[value="."]');
      assert.equal(await value('note'), 'Hi y\n.', 'Shift capitalizes one character then releases');
      assert.equal(await page.locator('#kb [data-key="Shift"]').getAttribute('aria-pressed'), 'false');

      // Backspace removes a whole emoji, not half of its surrogate pair.
      await page.locator('#note').evaluate((el) => { el.value = 'ok👍🏽😀'; el.setSelectionRange(el.value.length, el.value.length); });
      await press('kb', '[data-key="Backspace"]');
      assert.equal(await value('note'), 'ok👍🏽');
      await press('kb', '[data-key="Backspace"]');
      assert.equal(await value('note'), 'ok', 'a skin-tone emoji is one character');
      await page.locator('#note').evaluate((el) => { el.value = 'Hi y\n.'; });

      // Layout. Keypad keys sit in three round 72px columns; keyboard keys
      // take a tenth of the row, the nine-key row is indented half a key and
      // the function keys are one and a half keys wide.
      const pad = await page.locator('#pad').evaluate((el) => {
        const keys = [...el.querySelectorAll('button')].map((b) => b.getBoundingClientRect());
        return { width: keys[0].width, height: keys[0].height, radius: getComputedStyle(el.querySelector('button')).borderTopLeftRadius, rowTwo: keys[3].top > keys[2].top, cols: new Set(keys.map((k) => Math.round(k.left))).size };
      });
      assert.deepEqual(pad, { width: 72, height: 72, radius: '36px', rowTwo: true, cols: 3 });
      const kb = await page.locator('#kb').evaluate((el) => {
        const box = (sel) => el.querySelector(sel).getBoundingClientRect();
        return { q: box('[value="q"]'), p: box('[value="p"]'), a: box('[value="a"]'), shift: box('[data-key="Shift"]'), space: box('[value=" "]'), row: el.firstElementChild.getBoundingClientRect() };
      });
      const unit = (kb.row.width - 9 * 6) / 10;
      assert.ok(Math.abs(kb.q.width - unit) < 0.5, `a letter key is a tenth of the row (${kb.q.width} vs ${unit})`);
      assert.ok(Math.abs(kb.q.left - kb.row.left) < 0.5 && Math.abs(kb.p.right - kb.row.right) < 0.5, 'ten keys fill the row');
      assert.ok(Math.abs(kb.a.left - (kb.q.left + (unit + 6) / 2)) < 0.5, 'the nine-key row is indented half a key');
      assert.ok(Math.abs(kb.shift.width - (1.5 * unit + 3)) < 0.5, 'Shift is one and a half keys wide');
      assert.ok(kb.space.width > 4 * unit, 'space takes the rest of its row');

      // The number row: ten digit keys fill it, 40px tall, and they type.
      // Hidden, it takes no space; shown again, it is a row.
      const numbers = await page.locator('#kb .numbers').evaluate((row) => {
        const keys = [...row.children].map((k) => k.getBoundingClientRect());
        return { height: keys[0].height, fills: Math.abs(keys[0].left - row.getBoundingClientRect().left) < 0.5 && Math.abs(keys[9].right - row.getBoundingClientRect().right) < 0.5 };
      });
      assert.deepEqual(numbers, { height: 40, fills: true });
      const before = await value('note');
      await press('kb', '.numbers [value="7"]');
      assert.equal(await value('note'), `${before}7`);
      await page.locator('#note').evaluate((el, v) => { el.value = v; }, before);
      const toggled = await page.locator('#kb').evaluate((kb) => {
        const row = kb.querySelector('.numbers');
        const tall = kb.getBoundingClientRect().height;
        row.hidden = true;
        const hidden = { display: getComputedStyle(row).display, shorter: tall - kb.getBoundingClientRect().height };
        row.hidden = false;
        return { ...hidden, shown: getComputedStyle(row).display };
      });
      assert.deepEqual(toggled, { display: 'none', shorter: 48, shown: 'flex' }, 'hidden drops the row and its gap');

      // Pressing squares the corner off.
      const key = page.locator('#pad [value="5"]');
      await key.scrollIntoViewIfNeeded();
      const b = await key.boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      // Reduced motion drops the shape transition, so the pressed corner is
      // there at once.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.mouse.down();
      assert.equal(await key.evaluate((el) => getComputedStyle(el).borderTopLeftRadius), '12px', 'a pressed key squares off');
      await page.mouse.up();

      // destroy() stops typing.
      await page.evaluate(() => window.Expressive.Keypad.getInstance(document.getElementById('kb')).destroy());
      await press('kb', '[value="q"]');
      assert.equal(await value('note'), 'Hi y\n.', 'a destroyed keyboard types nothing');
      assert.equal(await page.evaluate(() => window.Expressive.Keypad.getInstance(document.getElementById('kb'))), undefined);

      // With every keypad destroyed, the shared listeners are gone too.
      await page.evaluate(() => document.querySelectorAll('.no-autoinit').forEach((el) => window.Expressive.Keypad.getInstance(el)?.destroy()));
      const dialed = await value('dial');
      await page.locator('#dial + label + button').click();
      assert.equal(await value('dial'), dialed, 'an in-field key does nothing without a keypad');
    } finally {
      await page?.evaluate(() => {
        const shadow = document.getElementById('host').shadowRoot;
        for (const el of [...document.querySelectorAll('.keypad, .keyboard'), ...(shadow?.querySelectorAll('.keypad') ?? [])]) {
          window.Expressive.Keypad.getInstance(el)?.destroy();
        }
      }).catch(() => {});
      await browser.close();
    }
  });

  test(`${name}: keyboard caps lock, symbol layers, hardware key highlight and minlength`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>
        <form id="form"><input id="code" minlength="3" aria-label="Code"></form>
        <div class="keyboard no-autoinit" id="kb" role="group" aria-label="Keyboard" aria-controls="code">
          <div data-layer="letters">${keys('abc')}</div>
          <div data-layer="symbols" hidden>${keys('!?#')}</div>
          <div>
            <button type="button" data-key="CapsLock" aria-pressed="false" aria-label="Caps lock">⇪</button>
            <button type="button" data-key="Layer" value="symbols" data-layer="letters">?123</button>
            <button type="button" data-key="Layer" value="letters" data-layer="symbols" hidden>ABC</button>
            <button type="button" data-key="Backspace" aria-label="Delete">⌫</button>
          </div>
        </div>
      </body></html>`);
      await page.addScriptTag({ content: js });
      const result = await page.evaluate(() => {
        const heard = [];
        Expressive.Keypad.init(document.querySelector('#kb'), { onKey: (key) => heard.push(key) });
        const field = document.querySelector('#code');
        const press = (selector) => document.querySelector(`#kb ${selector}`).click();
        const caps = document.querySelector('[data-key="CapsLock"]');
        press('[value="a"]');
        press('[data-key="CapsLock"]');
        press('[value="b"]');
        press('[value="c"]');
        const capitals = getComputedStyle(document.querySelector('#kb [value="a"]')).textTransform;
        press('[data-key="CapsLock"]');
        press('[value="a"]');
        const typed = field.value;
        press('[data-key="Layer"][value="symbols"]');
        const visible = [...document.querySelectorAll('#kb [data-layer]')].filter((el) => !el.hidden).map((el) => el.textContent.trim());
        press('[value="!"]');
        press('[data-key="Layer"][value="letters"]');
        return { typed, capitals, caps: caps.getAttribute('aria-pressed'), visible, value: field.value, heard,
          back: [...document.querySelectorAll('#kb [data-layer]')].filter((el) => !el.hidden).map((el) => el.textContent.trim()) };
      });
      // Caps lock holds through several characters, and shows capitals, until pressed again.
      assert.equal(result.typed, 'aBCa');
      assert.equal(result.capitals, 'uppercase');
      assert.equal(result.caps, 'false');
      assert.deepEqual(result.visible, ['!?#', 'ABC'], 'a Layer key shows its layer and hides the others');
      assert.equal(result.value, 'aBCa!');
      assert.deepEqual(result.back, ['abc', '?123']);
      assert.deepEqual(result.heard, ['a', 'CapsLock', 'B', 'C', 'CapsLock', 'a', 'Layer', '!', 'Layer']);

      // A hardware key held in the field lights its on-screen key until released.
      await page.focus('#code');
      await page.keyboard.down('b');
      const held = await page.evaluate(() => [document.querySelector('#kb [value="b"]').classList.contains('pressed')]);
      await page.keyboard.up('b');
      const released = await page.evaluate(() => document.querySelector('#kb [value="b"]').classList.contains('pressed'));
      assert.deepEqual([held[0], released], [true, false]);

      // A keypad-typed value shorter than minlength is invalid, as typing would make it.
      const length = await page.evaluate(() => {
        const field = document.querySelector('#code');
        field.value = '';
        const press = (selector) => document.querySelector(`#kb ${selector}`).click();
        press('[value="a"]');
        const short = [field.validity.valid, field.validationMessage];
        press('[value="b"]');
        press('[value="c"]');
        const long = field.validity.valid;
        press('[data-key="Backspace"]');
        return { short, long, again: field.validity.valid };
      });
      assert.deepEqual(length, { short: [false, 'Use at least 3 characters.'], long: true, again: false });

      // The keypad clears only its own message; a reset and destroy take it away.
      const own = await page.evaluate(() => {
        const field = document.querySelector('#code');
        const press = (selector) => document.querySelector(`#kb ${selector}`).click();
        field.value = 'abc';
        field.setCustomValidity('Unavailable');
        press('[value="a"]');
        const kept = field.validationMessage;
        field.value = '';
        press('[value="a"]');
        const keptShort = field.validationMessage;
        field.setCustomValidity('');
        field.value = '';
        press('[value="a"]');
        const short = field.validity.valid;
        document.querySelector('#form').reset();
        const reset = field.validity.valid;
        press('[value="a"]');
        Expressive.Keypad.getInstance(document.querySelector('#kb')).destroy();
        return { kept, keptShort, short, reset, destroyed: field.validity.valid };
      });
      assert.deepEqual(own, { kept: 'Unavailable', keptShort: 'Unavailable', short: false, reset: true, destroyed: true });
    } finally {
      await browser.close();
    }
  });
}
