import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

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

for (const [name, engine, test] of engines) {
  test(`${name}: questionnaire shows one question, validates, skips, branches and submits`, { timeout: 30000 }, async (t) => {
    const browser = await leaseBrowser(engine);
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

for (const [name, engine, test] of engines) {
  test(`${name}: questionnaire validates requestSubmit and ignores disabled checkboxes`, { timeout: 30000 }, async (t) => {
    const browser = await leaseBrowser(engine);
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

const extras = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<form class="questionnaire no-autoinit" id="extra" data-shortcuts data-summary data-save="survey">
  <fieldset><legend>Source</legend>
    <label><input type="radio" name="source" value="search" required> Search</label>
    <label><input type="radio" name="source" value="friend"> A friend<small>Or a colleague</small></label>
    <label><input type="radio" name="source" value="ad" disabled> An ad</label>
    <label><input type="radio" name="source" value="other"> Other</label>
    <input name="other-source" aria-label="Other source"></fieldset>
  <fieldset><legend>Uses</legend>
    <label><input type="checkbox" name="use" value="work"> Work</label>
    <label><input type="checkbox" name="use" value="home"> Home</label></fieldset>
  <fieldset><legend>Note</legend><input name="note" aria-label="Note"></fieldset>
  <footer><button type="button" value="previous">Back</button><button type="button" value="skip">Skip</button><button type="button" value="next">Next</button><button type="submit">Send</button></footer>
</form></body></html>`;

for (const [name, engine, test] of engines) {
  test(`${name}: questionnaire shortcuts, review step and saved progress`, { timeout: 30000 }, async (t) => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      // localStorage needs a real origin.
      await page.route('https://expressive.test/', (route) => route.fulfill({ contentType: 'text/html', body: extras }));
      await page.goto('https://expressive.test/');
      await page.addScriptTag({ content: js });
      await page.evaluate(() => {
        localStorage.clear();
        document.addEventListener('submit', (e) => e.preventDefault());
        Expressive.Questionnaire.init(document.querySelector('#extra'));
      });
      const shown = () => page.evaluate(() => ({
        question: [...document.querySelectorAll('#extra > fieldset')].findIndex((item) => !item.hidden),
        buttons: [...document.querySelectorAll('#extra footer button')].filter((button) => !button.hidden).map((button) => button.textContent),
        progress: document.querySelector('.questionnaire-progress span').textContent,
      }));

      // A letter or digit picks the answer at that place; disabled answers are left out of the count.
      await page.locator('#extra input[value="search"]').focus();
      await page.keyboard.press('b');
      assert.equal(await page.locator('#extra input[value="friend"]').isChecked(), true, 'b picks the second answer');
      await page.keyboard.press('3');
      assert.equal(await page.locator('#extra input[value="friend"]').isChecked(), true, '3 names the disabled third answer, so nothing changes');
      await page.keyboard.press('4');
      assert.equal(await page.locator('#extra input[value="other"]').isChecked(), true, '4 picks the fourth answer, as its badge says');
      const badge = await page.locator('#extra input[value="other"]').evaluate((el) => getComputedStyle(el.closest('label'), '::after').content);
      assert.match(badge, /counter\(questionnaire-choice, upper-alpha\)|"D"/);
      await page.keyboard.press('Control+b');
      assert.equal(await page.locator('#extra input[value="other"]').isChecked(), true, 'a key with a modifier picks nothing');
      await page.locator('#extra input[name="other-source"]').press('a');
      assert.deepEqual(await page.evaluate(() => [document.querySelector('#extra input[name="other-source"]').value, document.querySelector('#extra input[value="search"]').checked]),
        ['a', false], 'a letter typed into a text field types and picks nothing');
      await page.locator('#extra input[value="other"]').focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('2');
      assert.equal(await page.locator('#extra input[value="home"]').isChecked(), true, 'a digit toggles a checkbox');

      // Saved answers and the question they reached come back with the page.
      await page.evaluate(() => Expressive.Questionnaire.getInstance(document.querySelector('#extra')).next());
      await page.locator('#extra input[name="note"]').fill('fast');
      await page.locator('#extra input[name="note"]').press('a');
      assert.equal(await page.locator('#extra input[name="note"]').inputValue(), 'fasta', 'letters typed into a text field type');
      await page.reload();
      await page.addScriptTag({ content: js });
      await page.evaluate(() => {
        document.addEventListener('submit', (e) => e.preventDefault());
        Expressive.Questionnaire.init(document.querySelector('#extra'));
      });
      assert.deepEqual(await page.evaluate(() => [
        document.querySelector('#extra input[value="other"]').checked,
        document.querySelector('#extra input[value="home"]').checked,
        document.querySelector('#extra input[name="note"]').value,
      ]), [true, true, 'fasta']);
      assert.equal((await shown()).question, 2, 'the saved question shows');

      // After the last question comes the review step, with the submit button.
      assert.deepEqual((await shown()).buttons, ['Back', 'Skip', 'Next'], 'the last question moves on to the review');
      await page.locator('#extra footer [value="next"]').click();
      const review = await page.evaluate(() => ({
        rows: [...document.querySelectorAll('.questionnaire-summary dl > div')].map((row) => [...row.children].map((cell) => cell.textContent)),
        focused: document.activeElement.className,
        described: document.querySelector('.questionnaire-summary button').getAttribute('aria-describedby') === document.querySelector('.questionnaire-summary dt').id,
      }));
      assert.deepEqual(review.rows, [['Source', 'Other, a', 'Edit'], ['Uses', 'Home', 'Edit'], ['Note', 'fasta', 'Edit']]);
      assert.equal(review.focused, 'questionnaire-summary');
      assert.ok(review.described, 'each Edit button is described by its question');
      assert.deepEqual(await shown(), { question: -1, buttons: ['Back', 'Send'], progress: 'Review your answers' });

      // Edit goes back to the question; Back from the review goes to the last one.
      await page.locator('.questionnaire-summary button').nth(0).click();
      assert.equal((await shown()).question, 0);
      await page.evaluate(() => Expressive.Questionnaire.getInstance(document.querySelector('#extra')).review());
      await page.locator('#extra footer [value="previous"]').click();
      assert.equal((await shown()).question, 2);

      // Submitting forgets the saved answers.
      await page.evaluate(() => Expressive.Questionnaire.getInstance(document.querySelector('#extra')).review());
      await page.locator('#extra footer [type="submit"]').click();
      assert.equal(await page.evaluate(() => localStorage.getItem('questionnaire:survey')), null);
      await page.evaluate(() => Expressive.Questionnaire.getInstance(document.querySelector('#extra')).destroy());
      assert.equal(await page.locator('.questionnaire-summary').count(), 0, 'destroy removes the review step');
    } finally {
      await browser.close();
    }
  });
}

for (const [name, engine, test] of engines) {
  test(`${name}: questionnaire restores answers safely and wakes conditional questions`, { timeout: 30000 }, async (t) => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const body = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
        <form class="questionnaire no-autoinit" id="branch" data-save="branch">
          <fieldset><legend>Team?</legend>
            <label><input type="radio" name="team" value="yes"> Yes</label>
            <label><input type="radio" name="team" value="no"> No</label></fieldset>
          <fieldset id="size" disabled><legend>Size</legend><input name="size" aria-label="Size"></fieldset>
          <fieldset><legend>File</legend><input type="file" name="file" aria-label="File"><select name="pick" aria-label="Pick"><option>a</option><option>b</option></select></fieldset>
          <footer><button type="button" value="previous">Back</button><button type="button" value="next">Next</button><button type="submit">Send</button></footer>
        </form>
        <script>
          // The documented branching: an answer switches the next question on.
          document.addEventListener('change', (e) => {
            if (e.target.name === 'team') document.querySelector('#size').disabled = e.target.value !== 'yes' || !e.target.checked;
          });
        </script></body></html>`;
      await page.route('https://expressive.test/', (route) => route.fulfill({ contentType: 'text/html', body }));
      await page.goto('https://expressive.test/');
      await page.addScriptTag({ content: js });
      // A store with a file name and a select answer of the wrong type must not stop init.
      await page.evaluate(() => {
        localStorage.setItem('questionnaire:branch', JSON.stringify({ index: 1, answers: [true, false, '4', null] }));
      });
      const restored = await page.evaluate(() => {
        try {
          const q = Expressive.Questionnaire.init(document.querySelector('#branch'));
          return { ok: true, size: document.querySelector('[name=size]').value, enabled: !document.querySelector('#size').disabled, index: q.index, count: q.items.length };
        } catch (error) {
          return { ok: false, error: error.message };
        }
      });
      assert.deepEqual(restored, { ok: true, size: '4', enabled: true, index: 1, count: 3 },
        'restored answers fire change, so the branch that depends on them opens');
    } finally {
      await browser.close();
    }
  });
}
