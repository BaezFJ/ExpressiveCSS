import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<main style="width:560px">
  <form id="survey" class="questionnaire" aria-label="Survey">
    <fieldset id="q1">
      <legend>What should we prototype next?</legend>
      <p id="q1-help">Pick one.</p>
      <label><input type="radio" name="direction" value="search" required>Search<small>Find anything</small></label>
      <label><input type="radio" name="direction" value="sharing" required>Sharing</label>
      <p class="questionnaire-error">Choose an answer to continue.</p>
    </fieldset>
    <fieldset id="q2" data-required>
      <legend>Where do you use the app?</legend>
      <label><input type="checkbox" name="platforms" value="web">Web</label>
      <label><input type="checkbox" name="platforms" value="mobile">Mobile</label>
    </fieldset>
    <fieldset id="q3" disabled>
      <legend>Which phone?</legend>
      <label><input type="radio" name="phone" value="ios" required>iOS</label>
    </fieldset>
    <fieldset id="q4">
      <legend>Your name</legend>
      <div class="field"><input id="name" name="name" type="text" placeholder=" "><label for="name">Name</label></div>
    </fieldset>
    <fieldset id="q5">
      <legend>Anything else?</legend>
      <div class="field"><textarea id="notes" name="notes" class="expressive-textarea" placeholder=" "></textarea><label for="notes">Notes</label></div>
    </fieldset>
    <footer>
      <button type="button" class="text" value="previous">Back</button>
      <button type="button" class="text" value="skip">Skip</button>
      <button type="button" value="next">Next</button>
      <button type="submit">Submit</button>
    </footer>
  </form>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: questionnaire shows one question, validates, skips, branches and submits`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
      await page.setContent(markup);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => {
        window.submitted = [];
        window.changed = [];
        const form = document.getElementById('survey');
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const data = new FormData(form);
          window.submitted.push({ direction: data.get('direction'), platforms: data.getAll('platforms'), name: data.get('name'), notes: data.get('notes'), phone: data.get('phone') });
        });
        form.addEventListener('change', (event) => window.changed.push(event.target.name));
        window.Expressive.AutoInit();
      });
      const state = () => page.evaluate(() => {
        const form = document.getElementById('survey');
        return {
          shown: [...form.querySelectorAll(':scope > fieldset')].filter((el) => getComputedStyle(el).display !== 'none').map((el) => el.id),
          buttons: [...form.querySelectorAll('footer > button')].filter((el) => getComputedStyle(el).display !== 'none').map((el) => el.textContent),
          progress: form.querySelector('.questionnaire-progress > span').textContent,
          focus: document.activeElement.id || document.activeElement.value,
        };
      });
      const click = (label) => page.locator('#survey footer > button', { hasText: label }).click();

      let s = await state();
      assert.deepEqual(s.shown, ['q1'], 'only the first question shows');
      assert.deepEqual(s.buttons, ['Next'], 'a required first question has only Next');
      assert.equal(s.progress, 'Question 1 of 4', 'the disabled question is not counted');
      assert.equal(await page.getByRole('progressbar', { name: 'Question 1 of 4' }).count(), 1, 'the bar is named by its text');
      assert.match(await page.locator('#q1').getAttribute('aria-describedby'), /^q1-help$/, 'the description describes the group');
      assert.equal(await page.locator('#q1 .questionnaire-error').isVisible(), false, 'the error waits for a failed Next');

      await click('Next');
      s = await state();
      assert.deepEqual(s.shown, ['q1'], 'an unanswered required question blocks Next');
      assert.equal(await page.locator('#q1 .questionnaire-error').isVisible(), true);
      assert.equal(s.focus, 'search', 'focus goes to the control to fix');
      assert.equal(await page.locator('#q1 input[value=search]').getAttribute('aria-invalid'), 'true');
      const errorId = await page.locator('#q1 .questionnaire-error').getAttribute('id');
      assert.equal(await page.locator('#q1').getAttribute('aria-describedby'), `q1-help ${errorId}`, 'the error joins the description');

      await page.locator('#q1 input[value=sharing]').check();
      assert.equal(await page.locator('#q1 .questionnaire-error').isVisible(), false, 'answering clears the error');
      assert.equal(await page.locator('#q1 input[value=search]').getAttribute('aria-invalid'), null);
      await click('Next');
      s = await state();
      assert.deepEqual(s.shown, ['q2']);
      assert.deepEqual(s.buttons, ['Back', 'Next'], 'a data-required group has no Skip');
      assert.equal(s.focus, 'web');

      await click('Next');
      assert.equal(await page.locator('#q2 .questionnaire-error').textContent(), 'Choose an answer to continue.', 'a group without its own error gets requiredMessage');
      await page.locator('#q2 input[value=mobile]').check();
      assert.equal(await page.locator('#q2 .questionnaire-error').count(), 0, 'the generated error is removed once answered');
      // Branch: mobile turns on the phone question.
      await page.evaluate(() => { document.getElementById('q3').disabled = false; });
      await page.keyboard.press('Enter');
      s = await state();
      assert.deepEqual(s.shown, ['q3'], 'Enter moves on and the enabled question is next');
      assert.equal(s.progress, 'Question 3 of 5', 'enabling a question updates the count');
      await page.locator('#q3 input').check();
      await click('Next');

      s = await state();
      assert.deepEqual(s.shown, ['q4']);
      assert.deepEqual(s.buttons, ['Back', 'Skip', 'Next'], 'an optional question can be skipped');
      await page.locator('#name').fill('Ada');
      await page.keyboard.press('Enter');
      assert.equal((await state()).focus, 'notes', 'Enter in a text field moves on instead of submitting');
      assert.deepEqual(await page.evaluate(() => window.submitted), []);

      await click('Back');
      assert.equal((await state()).focus, 'name');
      await click('Skip');
      assert.equal(await page.locator('#name').inputValue(), '', 'Skip clears the answer');
      assert.ok((await page.evaluate(() => window.changed)).includes('name'), 'Skip reports the cleared answer');
      s = await state();
      assert.deepEqual(s.buttons, ['Back', 'Submit'], 'the last question submits');

      // A question switched off sends nothing, and submit checks every question.
      await page.evaluate(() => {
        document.getElementById('q3').disabled = true;
        document.querySelector('#q1 input[value=sharing]').checked = false;
      });
      await click('Submit');
      s = await state();
      assert.deepEqual(s.shown, ['q1'], 'submit opens the first question that still needs an answer');
      assert.equal(s.progress, 'Question 1 of 4');
      assert.deepEqual(await page.evaluate(() => window.submitted), [], 'an unanswered question blocks submit');

      await page.locator('#q1 input[value=search]').check();
      await page.evaluate(() => window.Expressive.Questionnaire.getInstance(document.getElementById('survey')).goTo(3));
      await page.locator('#notes').fill('Thanks');
      await click('Submit');
      assert.deepEqual(await page.evaluate(() => window.submitted), [
        { direction: 'search', platforms: ['mobile'], name: '', notes: 'Thanks', phone: null }
      ]);

      await page.evaluate(() => window.Expressive.Questionnaire.getInstance(document.getElementById('survey')).destroy());
      s = await page.evaluate(() => {
        const form = document.getElementById('survey');
        return {
          hidden: form.querySelectorAll('[hidden]').length,
          progress: form.querySelectorAll('.questionnaire-progress').length,
          describedby: form.querySelector('#q1').getAttribute('aria-describedby'),
          errorId: form.querySelector('.questionnaire-error').id,
          nav: [...form.querySelectorAll('footer > button')].filter((el) => getComputedStyle(el).display !== 'none').map((el) => el.textContent),
        };
      });
      assert.deepEqual(s, { hidden: 0, progress: 0, describedby: null, errorId: '', nav: ['Submit'] }, 'destroy restores the plain form');
    } finally {
      await browser.close();
    }
  });
}

const submitMarkup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<main style="width:560px">
  <form id="survey" class="questionnaire" aria-label="Survey">
    <fieldset id="q1" data-required>
      <legend>Where do you use the app?</legend>
      <label><input type="checkbox" name="platforms" value="web" checked disabled>Web</label>
      <label><input type="checkbox" name="platforms" value="mobile">Mobile</label>
      <label><input type="checkbox" name="platforms" value="desktop">Desktop</label>
    </fieldset>
    <fieldset id="q2">
      <legend>Your name</legend>
      <div class="field"><input id="name" name="name" type="text" placeholder=" " required><label for="name">Name</label></div>
    </fieldset>
    <fieldset id="q3">
      <legend>Anything else?</legend>
      <div class="field"><input id="notes" name="notes" type="text" placeholder=" "><label for="notes">Notes</label></div>
    </fieldset>
    <footer>
      <button type="button" value="next">Next</button>
      <button type="submit">Submit</button>
    </footer>
  </form>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: questionnaire validates requestSubmit and ignores disabled checkboxes`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
      await page.setContent(submitMarkup);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => {
        window.submitted = [];
        const form = document.getElementById('survey');
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const data = new FormData(form);
          window.submitted.push({ platforms: data.getAll('platforms'), name: data.get('name') });
        });
        window.Expressive.AutoInit();
      });
      const shown = () => page.locator('#survey > fieldset').evaluateAll((els) => els.filter((el) => !el.hidden).map((el) => el.id));
      const focus = () => page.evaluate(() => document.activeElement.id || document.activeElement.value);
      const instance = 'window.Expressive.Questionnaire.getInstance(document.getElementById("survey"))';

      await page.locator('#survey footer > button', { hasText: 'Next' }).click();
      assert.deepEqual(await shown(), ['q1'], 'a checked disabled checkbox does not answer a data-required group');
      assert.equal(await focus(), 'mobile', 'focus goes to the first enabled checkbox');

      // requestSubmit() from the last question with the first group unanswered.
      await page.evaluate(`${instance}.goTo(2)`);
      await page.evaluate(() => document.getElementById('survey').requestSubmit());
      assert.deepEqual(await page.evaluate(() => window.submitted), [], 'requestSubmit does not send an unanswered data-required group');
      assert.deepEqual(await shown(), ['q1'], 'requestSubmit opens the unanswered group');
      assert.equal(await page.locator('#q1').evaluate((el) => el.classList.contains('invalid')), true);

      // A hidden required text field.
      await page.locator('#q1 input[value=desktop]').check();
      await page.evaluate(`${instance}.goTo(2)`);
      await page.evaluate(() => document.getElementById('survey').requestSubmit());
      assert.deepEqual(await page.evaluate(() => window.submitted), []);
      assert.deepEqual(await shown(), ['q2'], 'requestSubmit opens the hidden invalid question');
      assert.equal(await focus(), 'name');
      assert.equal(await page.locator('#q2 .questionnaire-error').isVisible(), true, 'its error shows');

      await page.locator('#name').fill('Ada');
      await page.evaluate(() => document.getElementById('survey').requestSubmit());
      assert.deepEqual(await page.evaluate(() => window.submitted), [{ platforms: ['desktop'], name: 'Ada' }]);

      await page.evaluate(`${instance}.destroy()`);
      assert.equal(await page.locator('#q1 input[value=mobile]').evaluate((el) => el.validationMessage), '', 'destroy clears the custom validity');
    } finally {
      await browser.close();
    }
  });
}
