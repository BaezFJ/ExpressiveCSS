// Show more, the parts jsdom can run: the button's attributes and label, the
// events and destroy(). jsdom has no layout, so the clamp and the check that
// hides the button run in real engines in show-more-browser.test.js.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody } from './setup.js';

beforeEach(resetBody);

/** Starts a show-more with `button` as its control and returns the instance. */
function start(button = '<button type="button">Show more</button>', options = {}, text = '<p class="line-clamp-2">Long text</p>') {
  document.body.innerHTML = `<div class="show-more">${text}${button}</div>`;
  return Expressive.ShowMore.init(document.querySelector('.show-more'), options);
}

const label = () => document.querySelector('button').textContent.trim();

test('the button controls the text, which gets an id when it has none', () => {
  const instance = start();
  const button = document.querySelector('button');
  const id = document.querySelector('p').id;
  assert.ok(id, 'the text has an id');
  assert.equal(button.getAttribute('aria-controls'), id);
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  instance.destroy();

  start(undefined, {}, '<p id="mine" class="line-clamp-2">Long text</p>');
  assert.equal(document.querySelector('button').getAttribute('aria-controls'), 'mine');
});

test('the label reads "Show less" while the text is open, then the author\'s text again', () => {
  start();
  const button = document.querySelector('button');
  button.click();
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.equal(label(), 'Show less');
  button.click();
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.equal(label(), 'Show more');
});

test('data-show-less and i18n.showLess set the open label', () => {
  start('<button type="button" data-show-less="Fewer lines">Show more</button>');
  document.querySelector('button').click();
  assert.equal(label(), 'Fewer lines');

  start(undefined, { i18n: { showLess: 'Less' } });
  document.querySelector('button').click();
  assert.equal(label(), 'Less');
});

test('an icon in the button survives the label change', () => {
  start('<button type="button"><span class="material-symbols" aria-hidden="true">expand_more</span>Read more<span class="material-symbols" aria-hidden="true">expand_more</span></button>');
  const button = document.querySelector('button');
  button.click();
  assert.equal(button.textContent, 'expand_moreShow lessexpand_more');
  button.click();
  assert.equal(button.textContent, 'expand_moreRead moreexpand_more');
});

test('opening and closing fire events after the callbacks', () => {
  const calls = [];
  const instance = start(undefined, { onOpen: () => calls.push('onOpen'), onClose: () => calls.push('onClose') });
  for (const type of ['open', 'close']) {
    document.addEventListener(`expressive:${type}`, (event) => calls.push([type, event.target === instance.el]));
  }
  const button = document.querySelector('button');
  button.click();
  button.click();
  assert.deepEqual(calls, ['onOpen', ['open', true], 'onClose', ['close', true]]);
});

test('destroy() restores the markup the author wrote', () => {
  const html = '<button type="button" aria-controls="x" hidden>Show more</button>';
  const instance = start(html);
  const button = document.querySelector('button');
  const text = document.querySelector('p');
  button.click();
  instance.destroy();
  assert.equal(button.outerHTML, html.replace('hidden', 'hidden=""'));
  assert.equal(text.hasAttribute('id'), false);
  assert.equal(text.getAttribute('style') ?? '', '');
  button.click();
  assert.equal(button.hasAttribute('aria-expanded'), false, 'the click does nothing after destroy()');
  assert.equal(text.getAttribute('style') ?? '', '');
});
