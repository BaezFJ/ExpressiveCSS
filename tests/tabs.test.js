// Tabs panel lookup and display. Every case tears down in a finally.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody, window } from './setup.js';

const markup = `<nav class="tabs" aria-label="Tabs"><a href="#base">Base</a><a href="#café">Café</a></nav>
  <div id="base">Base</div><div id="café">Café</div>`;

describe('Tabs', () => {
  beforeEach(resetBody);

  test('a non-ASCII panel id resolves from the link and from location.hash', () => {
    document.body.innerHTML = markup;
    const nav = document.querySelector('nav');
    const panel = document.getElementById('café');
    let instance;
    try {
      instance = Expressive.Tabs.init(nav);
      nav.querySelectorAll('a')[1].click();
      assert.equal(instance._content, panel);
      instance.destroy();

      // location.hash comes back percent-encoded.
      window.location.hash = '#café';
      instance = Expressive.Tabs.init(nav);
      assert.equal(instance._content, panel);
    } finally {
      instance?.destroy();
      window.location.hash = '';
    }
  });

  test('location.hash deep-links a link whose href is written percent-encoded', () => {
    document.body.innerHTML = markup.replace('href="#café"', 'href="#caf%C3%A9"');
    const nav = document.querySelector('nav');
    let instance;
    try {
      window.location.hash = '#café';
      instance = Expressive.Tabs.init(nav);
      assert.equal(instance._content, document.getElementById('café'));
    } finally {
      instance?.destroy();
      window.location.hash = '';
    }
  });

  test('panels inside a shadow root resolve', () => {
    document.body.innerHTML = '<div id="host"></div>';
    const shadow = document.getElementById('host').attachShadow({ mode: 'open' });
    shadow.innerHTML = markup;
    const nav = shadow.querySelector('nav');
    // jsdom matches nothing for `:scope > a` inside a shadow root; browsers do.
    const query = nav.querySelectorAll.bind(nav);
    nav.querySelectorAll = (selector) => query(selector === ':scope > a' ? 'a' : selector);
    const instance = Expressive.Tabs.init(nav);
    try {
      nav.querySelectorAll('a')[1].click();
      assert.equal(instance._content, shadow.getElementById('café'));
    } finally {
      instance.destroy();
    }
  });

  test('showing a panel clears the hide instead of forcing block', () => {
    document.body.innerHTML = markup;
    const nav = document.querySelector('nav');
    const instance = Expressive.Tabs.init(nav);
    try {
      const panel = document.getElementById('café');
      assert.equal(panel.style.display, 'none');
      nav.querySelectorAll('a')[1].click();
      assert.equal(panel.style.display, '');
    } finally {
      instance.destroy();
    }
  });
});
