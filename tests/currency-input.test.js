// Currency input, the parts jsdom can run: how typed text reads as an amount,
// and how a starting value is formatted. Blur, focus, form data and reset run
// in real engines in currency-input-browser.test.js.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody } from './setup.js';

beforeEach(resetBody);

/** Starts a currency field under `lang` and returns its instance. */
function start(currency, lang = 'de', value = '') {
  document.body.innerHTML = `<form lang="${lang}"><input name="amount" data-currency="${currency}"></form>`;
  const input = document.querySelector('input');
  input.value = value;
  return Expressive.CurrencyInput.init(input);
}

/** What `text` reads as in a field of `currency` under `lang`. */
function read(text, currency = 'EUR', lang = 'de') {
  const field = start(currency, lang);
  field.el.value = text;
  return field.value;
}

test('the last separator is the decimal mark when no more than the fraction digits follow it', () => {
  assert.equal(read('1234.5'), 1234.5);
  assert.equal(read('1234,5'), 1234.5);
  assert.equal(read('1.234,5'), 1234.5);
  assert.equal(read('1,234.50'), 1234.5);
  assert.equal(read('1.234'), 1234);
  assert.equal(read('1,234.5', 'USD', 'en'), 1234.5);
  // Yen has no fraction digits, so every separator groups.
  assert.equal(read('1.234', 'JPY'), 1234);
  assert.equal(read('1,5', 'JPY'), 15);
});

test('three digits after a grouping separator group, also when the currency has three decimals', () => {
  assert.equal(read('5,000', 'KWD', 'en'), 5000);
  assert.equal(read('12,345,678', 'KWD', 'en'), 12345678);
  assert.equal(read('1.234.567', 'KWD', 'en'), 1234567);
  assert.equal(read('5.000', 'KWD', 'de'), 5000);
  assert.equal(read('1.234.567', 'KWD', 'de'), 1234567);
  assert.equal(read('1,00,000', 'KWD', 'en-IN'), 100000);
  // The locale's decimal mark, or a second kind of separator, stays a decimal.
  assert.equal(read('5.000', 'KWD', 'en'), 5);
  assert.equal(read('5,000', 'KWD', 'de'), 5);
  assert.equal(read('1,234.567', 'KWD', 'en'), 1234.567);
  assert.equal(read('1.234,567', 'KWD', 'en'), 1234.567);
  assert.equal(read('1.234,567', 'KWD', 'fr'), 1234.567);
  // Fewer than three digits after either separator stay a decimal.
  assert.equal(read('5,25', 'KWD', 'en'), 5.25);
  assert.equal(read('5.25', 'KWD', 'de'), 5.25);
  assert.equal(read('.5', 'KWD', 'en'), 0.5);
  // Dots in a symbol before the amount are not separators.
  assert.equal(read('د.ب. 5.000', 'BHD', 'en'), 5);
  assert.equal(read('Rs. 5,000', 'KWD', 'en'), 5000);
});

test('a locale whose currency and number formats mark decimals differently reads both as decimals', () => {
  // fr-CH writes 1.234 KWD and edits 1,234; so does en-DE, as KWD 1.234.
  for (const lang of ['fr-CH', 'en-DE']) {
    assert.equal(read('1.234', 'KWD', lang), 1.234);
    assert.equal(read('1,234', 'KWD', lang), 1.234);
    assert.equal(read('1.234,567', 'KWD', lang), 1234.567);
    assert.equal(read('1,234.567', 'KWD', lang), 1234.567);
    assert.equal(read('1.234.567', 'KWD', lang), 1234567);
  }
  assert.equal(start('KWD', 'fr-CH', '1.234').value, 1.234);
  // de-AT groups with `.` in currency and a space in numbers, and marks with `,` in both.
  assert.equal(read('5.000', 'KWD', 'de-AT'), 5000);
  assert.equal(read('5,000', 'KWD', 'de-AT'), 5);
});

test('an amount reads back the same from what the field shows and from what it edits', () => {
  for (const lang of ['en', 'de', 'fr', 'de-CH', 'fr-CH', 'de-AT', 'en-DE', 'en-BE', 'en-FR', 'en-PT', 'en-IN', 'ar-EG', 'ar-BH', 'hi']) {
    for (const currency of ['USD', 'EUR', 'JPY', 'KWD', 'BHD', 'TND']) {
      for (const amount of [5000, 1234.5, 1.234, 1234567, 0.5, -5000]) {
        const field = start(currency, lang, String(amount));
        const expected = Number(new Intl.NumberFormat('en', { useGrouping: false, maximumFractionDigits: field._digits }).format(amount));
        assert.equal(field.value, expected, `${lang} ${currency} shows ${field.el.value}`);
        field.el.dispatchEvent(new window.FocusEvent('focus'));
        assert.equal(field.value, expected, `${lang} ${currency} edits ${field.el.value}`);
      }
    }
  }
});

test('signs, spaces and letters are ignored, and a leading minus makes the amount negative', () => {
  assert.equal(read('-12,5'), -12.5);
  assert.equal(read('−12,5'), -12.5);
  assert.equal(read('12 €'), 12);
  assert.equal(read('1.234,50\u00a0€'), 1234.5);
  // Full-width digits from an IME read as digits.
  assert.equal(read('１２'), 12);
});

test('an amount rounds to the currency’s fraction digits as the field shows it', () => {
  // Three digits after the mark make it a group separator, so only a plain
  // starting value carries more digits than the currency shows.
  assert.equal(start('EUR', 'de', '1.005').value, 1.01);
  assert.equal(start('EUR', 'de', '1.005').el.value, '1,01\u00a0€');
  assert.equal(start('JPY', 'ja', '2.5').value, 3);
});

test('a symbol written with dots does not shift the decimal mark', () => {
  const field = start('DKK', 'da', '1234.5');
  assert.equal(field.el.value, '1.234,50\u00a0kr.');
  assert.equal(field.value, 1234.5);
});

test('text with no digit and an empty field read as no amount', () => {
  assert.equal(read('abc'), null);
  assert.equal(read(''), null);
});

test('a locale that writes other digits reads its own formatted text back', () => {
  const field = start('EGP', 'ar-EG', '1234.5');
  assert.notEqual(field.el.value, '1234.5');
  assert.equal(field.value, 1234.5);
});

test('a starting value reads as a plain number first, and shows formatted', () => {
  assert.equal(start('EUR', 'de', '1.234').el.value, '1,23\u00a0€');
  assert.equal(start('EUR', 'de', '1234.5').el.value, '1.234,50\u00a0€');
  // Text Number() rejects falls back to the typed-text rules.
  assert.equal(start('EUR', 'de', '1234,5').el.value, '1.234,50\u00a0€');
  assert.equal(start('EUR', 'de', 'abc').el.value, 'abc');
});

test('a malformed currency code leaves the field a plain text input', () => {
  const field = start('EURO', 'de', '1234.5');
  assert.equal(field.el.value, '1234.5');
  field.el.dispatchEvent(new window.FocusEvent('blur'));
  assert.equal(field.el.value, '1234.5');
});
