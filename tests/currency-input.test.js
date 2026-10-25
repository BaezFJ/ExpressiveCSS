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
