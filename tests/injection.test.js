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

  test('option icons accept image URLs and reject executable or malformed URLs', () => {
    for (const [value, allowed] of [
      ['/icons/check.svg', true], ['https://example.com/icon.png', true],
      ['//example.com/icon.png', true], ['blob:http://localhost/image', true],
      ['data:image/png;base64,iVBORw0KGgo=', true],
      ['javascript:alert(1)', false], [' \tJaVa\nScRiPt:alert(1)', false],
      ['data:text/html,<script>alert(1)</script>', false], ['http://[', false]
    ]) {
      document.body.innerHTML = '<select><option value="1">One</option></select>';
      document.querySelector('option').setAttribute('data-icon', value);
      const instance = Expressive.FormSelect.init(document.querySelector('select'));
      try {
        const image = instance.menuEl.querySelector('img');
        assert.equal(!!image, allowed, value);
        if (allowed) assert.equal(image.src, new URL(value, document.baseURI).href);
        assert.equal(instance.menuEl.querySelector('li span').textContent, 'One');
      } finally { instance.destroy(); }
    }
  });

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

    const menu = instance.menuEl;
    assert.equal(menu.querySelector('img'), null, 'the label was parsed as markup');
    assert.equal(
      menu.querySelector('.optgroup span').textContent,
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

    assert.equal(instance.menuEl.querySelector('img'), null);
    assert.equal(
      instance.menuEl.querySelector('li span').textContent.trim(),
      '<img src=x onerror=alert(1)>'
    );
    // The multi-select structure still has to be intact.
    assert.ok(
      instance.menuEl.querySelector('label input[type="checkbox"]'),
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

    const img = instance.menuEl.querySelector('img');
    assert.ok(img, 'the option icon was not rendered');
    assert.deepEqual([...img.classList].sort(), ['a', 'b']);
  });
});

describe('ids are looked up, not interpolated into selectors', () => {
  beforeEach(resetBody);

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

});

describe('Datepicker escapes what it splices into markup', () => {
  beforeEach(resetBody);

  test('calendar identifiers and day values cannot inject markup', () => {
    document.body.innerHTML = '<input class="datepicker">';
    const instance = Expressive.Datepicker.init(document.querySelector('input'));
    try {
      const host = document.createElement('div');
      host.innerHTML = instance.renderTitle(instance, 0, 2026, 8, 2026, PAYLOAD);
      assert.equal(host.querySelector('.datepicker-controls').id, PAYLOAD);
      assert.equal(host.querySelector('img'), null);
      host.innerHTML = instance.renderTable(instance.options, [], PAYLOAD);
      assert.equal(host.querySelector('table').getAttribute('aria-labelledby'), PAYLOAD);
      assert.equal(host.querySelector('img'), null);
      host.innerHTML = '<table><tbody><tr>' + instance.renderDay({ day: PAYLOAD, month: PAYLOAD, year: PAYLOAD }) + '</tr></tbody></table>';
      const button = host.querySelector('button');
      assert.equal(button.textContent, PAYLOAD);
      for (const name of ['day', 'month', 'year']) assert.equal(button.dataset[name], PAYLOAD);
      assert.equal(host.querySelector('img'), null);
    } finally { instance.destroy(); }
  });

  test('calendar row helpers reject unsupported HTML and preserve day semantics', () => {
    document.body.innerHTML = '<input class="datepicker">';
    const instance = Expressive.Datepicker.init(document.querySelector('input'));
    try {
      for (const cell of [
        '<td><img src=x onerror=alert(1)></td>', '<td onclick="alert(1)">1</td>',
        '<td><script>alert(1)</script></td>', '<td><svg onload="alert(1)"></svg></td>',
        '<td><button type="submit">1</button></td>', '<td style="color:red">1</td>',
        '<td><button type="button" formaction="javascript:alert(1)">1</button></td>'
      ]) {
        assert.throws(() => instance.renderRow([cell], false, false), TypeError);
        assert.throws(() => instance.renderBody([`<tr>${cell}</tr>`]), TypeError);
        assert.throws(() => instance.renderTable(instance.options, [`<tr>${cell}</tr>`], 'title'), TypeError);
      }
      const cell = instance.renderDay({ day: PAYLOAD, month: 8, year: 2026, isSelected: true });
      const row = instance.renderRow([cell, '<td class="is-empty"></td>'], true, true);
      const host = document.createElement('div');
      host.innerHTML = instance.renderTable(instance.options, [row], 'title');
      assert.equal(host.querySelector('tbody tr').className, 'datepicker-row is-selected');
      assert.equal(host.querySelector('tbody td').className, 'is-empty');
      assert.equal(host.querySelector('button').textContent, PAYLOAD);
      assert.equal(host.querySelector('td[aria-selected]').getAttribute('aria-selected'), 'true');
      assert.equal(host.querySelector('img'), null);
    } finally { instance.destroy(); }
  });

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

describe('Carousel generated names', () => {
  beforeEach(resetBody);

  test('an i18n string cannot break out of aria-label', () => {
    document.body.innerHTML = `
      <div class="carousel">
        <div class="carousel-item"><img src="http://localhost/1.jpg"></div>
        <div class="carousel-item"><img src="http://localhost/2.jpg"></div>
      </div>`;

    const instance = Expressive.Carousel.init(document.querySelector('.carousel'), {
      i18n: { carousel: PAYLOAD, item: PAYLOAD, of: PAYLOAD }
    });

    // finally, not a trailing call: an interval or a pending transition would
    // keep node alive if a failed assertion skipped the teardown.
    try {
      const el = document.querySelector('.carousel');
      assert.equal(el.querySelectorAll('img').length, 2, 'a label was parsed as markup');
      assert.equal(el.getAttribute('aria-label'), PAYLOAD);
      assert.match(el.querySelector('.carousel-item').getAttribute('aria-label'), /"><img/);
    } finally {
      instance.destroy();
    }
  });
});
