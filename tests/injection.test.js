// Author content must not become markup or selector syntax.
//
// Every value in here is something a consumer legitimately controls - an
// optgroup label, an option's text, an element id, a translated month name, an
// aria-label from a callback. None of it is trusted to be well-behaved,
// because in a server-rendered page it is whatever the server put there.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody, fire } from './setup.js';

const PAYLOAD = '"><img src=x onerror=alert(1)>';

describe('FormSelect renders author content as text', () => {
  beforeEach(resetBody);

  test('an optgroup label cannot break out of its span', () => {
    document.body.innerHTML = `
      <select>
        <optgroup label="group"><option value="1">One</option></optgroup>
      </select>`;
    // Set as a value, not written into the fixture markup: a server would have
    // escaped it on the way into the attribute, and the question is whether we
    // hand it back to the parser on the way out.
    document.querySelector('optgroup').setAttribute('label', PAYLOAD);
    const select = document.querySelector('select');

    const instance = Expressive.FormSelect.init(select);

    const dropdown = instance.dropdownOptions;
    assert.equal(dropdown.querySelector('img'), null, 'the label was parsed as markup');
    assert.equal(
      dropdown.querySelector('.optgroup span').textContent,
      PAYLOAD,
      'the label should render literally'
    );
  });

  test("an option's text cannot become markup", () => {
    document.body.innerHTML = `
      <select multiple>
        <option value="1">&lt;img src=x onerror=alert(1)&gt;</option>
      </select>`;
    const select = document.querySelector('select');

    const instance = Expressive.FormSelect.init(select);

    assert.equal(instance.dropdownOptions.querySelector('img'), null);
    assert.equal(
      instance.dropdownOptions.querySelector('li span').textContent.trim(),
      '<img src=x onerror=alert(1)>'
    );
    // The multi-select structure still has to be intact.
    assert.ok(
      instance.dropdownOptions.querySelector('label input[type="checkbox"]'),
      'the checkbox structure was lost'
    );
  });

  test('an id containing a quote does not break label lookup', () => {
    // The old code built '[for="' + id + '"]', which this closes early.
    document.body.innerHTML = `
      <div class="field">
        <select id='a"b'><option value="1">One</option></select>
        <label for='a"b'>Pick</label>
      </div>`;
    const select = document.querySelector('select');

    const instance = Expressive.FormSelect.init(select);

    assert.ok(instance.labelEl, 'the associated label was not found');
    assert.equal(instance.labelEl.textContent, 'Pick');
  });

  test('a class attribute with stray spaces does not throw', () => {
    document.body.innerHTML = `
      <select><option value="1" class="  a  b " data-icon="http://localhost/i.png">One</option></select>`;
    const select = document.querySelector('select');

    const instance = Expressive.FormSelect.init(select);

    const img = instance.dropdownOptions.querySelector('img');
    assert.ok(img, 'the option icon was not rendered');
    assert.deepEqual([...img.classList].sort(), ['a', 'b']);
  });
});

describe('ids are looked up, not interpolated into selectors', () => {
  beforeEach(resetBody);

  test('TapTarget resolves a data-target containing a quote', () => {
    document.body.innerHTML = `
      <div class="tap-target" data-target='x"y'><div class="tap-target-content"><h5>T</h5></div></div>
      <a id='x"y' class="button">menu</a>`;

    const instance = Expressive.TapTarget.init(document.querySelector('.tap-target'));

    assert.equal(instance.originEl, document.getElementById('x"y'));
    instance.destroy();
  });

  test('ScrollSpy finds a hash whose id contains a quote', () => {
    document.body.innerHTML = `
      <div id='sec"tion' class="scrollspy">one</div>
      <a href='#sec"tion'>to one</a>`;
    const el = document.querySelector('.scrollspy');
    const instance = Expressive.ScrollSpy.init(el);
    const link = Expressive.ScrollSpy._linkFor(el.id, instance.options);
    assert.equal(link, document.querySelector('a'));
    instance.destroy();
  });

  test('Sidenav resolves a data-target containing a quote', () => {
    document.body.innerHTML = `
      <ul id='slide"out' class="sidenav"><li><a href="#!">First</a></li></ul>
      <a href="#" data-target='slide"out' class="sidenav-trigger">menu</a>`;
    const el = document.querySelector('.sidenav');
    const instance = Expressive.Sidenav.init(el);
    fire(document.querySelector('.sidenav-trigger'), 'click');
    assert.equal(instance.isOpen, true);
    instance.destroy();
  });

  test('Sidenav survives a trigger whose target is missing', () => {
    document.body.innerHTML = `
      <ul id="slide-out" class="sidenav"><li><a href="#!">First</a></li></ul>
      <a href="#" data-target="missing" class="sidenav-trigger">menu</a>`;
    const instance = Expressive.Sidenav.init(document.querySelector('.sidenav'));
    fire(document.querySelector('.sidenav-trigger'), 'click');
    assert.equal(instance.isOpen, false);
    instance.destroy();
  });

  test('TapTarget survives a data-target that resolves to nothing', () => {
    document.body.innerHTML = `<div class="tap-target" data-target="missing"><div class="tap-target-content"><h5>T</h5></div></div>`;

    const instance = Expressive.TapTarget.init(document.querySelector('.tap-target'));

    assert.equal(instance.originEl, null);
    instance.destroy(); // must not throw
  });
});

describe('Datepicker escapes what it splices into markup', () => {
  beforeEach(resetBody);

  test('translated month names cannot inject elements', () => {
    document.body.innerHTML = `<input type="text" class="datepicker">`;
    const months = Array.from({ length: 12 }, (_, i) => `${PAYLOAD}${i}`);

    const instance = Expressive.Datepicker.init(document.querySelector('.datepicker'), {
      i18n: { months, monthsShort: months }
    });

    assert.equal(
      instance.calendarEl.querySelector('img'),
      null,
      'a month name was parsed as markup'
    );
    const firstMonth = instance.calendarEl.querySelector('.orig-select-month option');
    assert.equal(firstMonth.textContent, `${PAYLOAD}0`);

    instance.destroy();
  });

  test('translated weekday names cannot inject through the abbr title', () => {
    document.body.innerHTML = `<input type="text" class="datepicker">`;
    const weekdays = Array.from({ length: 7 }, () => PAYLOAD);

    const instance = Expressive.Datepicker.init(document.querySelector('.datepicker'), {
      i18n: { weekdays, weekdaysShort: weekdays, weekdaysAbbrev: weekdays }
    });

    assert.equal(instance.calendarEl.querySelector('img'), null);
    assert.equal(instance.calendarEl.querySelector('abbr').getAttribute('title'), PAYLOAD);

    instance.destroy();
  });

  test('a function format does not spill its source into the page', () => {
    document.body.innerHTML = `
      <div class="field">
        <input type="text" class="datepicker">
        <span class="datepicker-format"></span>
      </div>`;

    const instance = Expressive.Datepicker.init(document.querySelector('.datepicker'), {
      format: (d) => d.toISOString()
    });

    assert.equal(document.querySelector('.datepicker-format').textContent, '');
    instance.destroy();
  });

  test('a string format is shown as the hint it is', () => {
    document.body.innerHTML = `
      <div class="field">
        <input type="text" class="datepicker">
        <span class="datepicker-format"></span>
      </div>`;

    const instance = Expressive.Datepicker.init(document.querySelector('.datepicker'), {
      format: 'mmm dd, yyyy'
    });

    assert.equal(document.querySelector('.datepicker-format').textContent, 'mmm dd, yyyy');
    instance.destroy();
  });
});

describe('Slider indicator labels', () => {
  beforeEach(resetBody);

  test('a label from indicatorLabelFunc cannot break out of aria-label', () => {
    document.body.innerHTML = `
      <div class="slider"><ul class="slides">
        <li class="active"><img src="http://localhost/1.jpg"><div class="caption">one</div></li>
        <li><img src="http://localhost/2.jpg"><div class="caption">two</div></li>
      </ul></div>`;

    const instance = Expressive.Slider.init(document.querySelector('.slider'), {
      indicatorLabelFunc: () => PAYLOAD
    });

    // finally, not a trailing call: Slider holds an autoplay interval, and a
    // failed assertion that skipped the teardown would keep node alive.
    try {
      const indicators = document.querySelector('ul.indicators');
      assert.equal(indicators.querySelector('img'), null, 'the label was parsed as markup');
      assert.equal(indicators.querySelector('button').getAttribute('aria-label'), PAYLOAD);
    } finally {
      instance.destroy();
    }
  });
});
