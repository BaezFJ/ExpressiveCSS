// A strip the page marks role="tablist" gets the ARIA tabs pattern: the
// component keeps aria-selected and a roving tabindex, and the arrow keys
// select as they move. Link tabs keep aria-current and every link a Tab stop.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody, window } from './setup.js';

const TABLIST = `<div class="tabs" role="tablist" aria-label="Trip">
    <a role="tab" id="t1" href="#p1" aria-controls="p1">One</a>
    <a role="tab" id="t2" href="#p2" aria-controls="p2" class="active">Two</a>
    <a role="tab" id="t3" href="#p3" aria-controls="p3" tabindex="5" aria-selected="true">Three</a>
  </div>
  <div id="p1" role="tabpanel">1</div><div id="p2" role="tabpanel">2</div><div id="p3" role="tabpanel">3</div>`;

const key = (el, key) => el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
const state = () => [...document.querySelectorAll('.tabs > a')].map((a) =>
  `${a.id}:${a.getAttribute('aria-selected')}:${a.getAttribute('tabindex')}:${a.getAttribute('aria-current')}`);

beforeEach(resetBody);

test('a tablist marks the selected tab with aria-selected and keeps one Tab stop', () => {
  document.body.innerHTML = TABLIST;
  const instance = Expressive.Tabs.init(document.querySelector('.tabs'));
  try {
    assert.deepEqual(state(), ['t1:false:-1:null', 't2:true:0:null', 't3:false:-1:null']);
    assert.equal(document.getElementById('p2').style.display, '');
    assert.equal(document.getElementById('p1').style.display, 'none');
  } finally {
    instance.destroy();
  }
});

test('the arrow keys move focus and select, wrapping, and Home and End jump', () => {
  document.body.innerHTML = TABLIST;
  const nav = document.querySelector('.tabs');
  const changes = [];
  nav.addEventListener('expressive:change', (e) => changes.push(e.detail.panel.id));
  const instance = Expressive.Tabs.init(nav);
  try {
    document.getElementById('t2').focus();
    key(document.activeElement, 'ArrowRight');
    assert.equal(document.activeElement.id, 't3');
    assert.deepEqual(state(), ['t1:false:-1:null', 't2:false:-1:null', 't3:true:0:null']);
    assert.equal(document.getElementById('p3').style.display, '');
    key(document.activeElement, 'ArrowRight');
    assert.equal(document.activeElement.id, 't1', 'wraps to the first');
    key(document.activeElement, 'End');
    assert.equal(document.activeElement.id, 't3');
    key(document.activeElement, 'Home');
    assert.equal(document.activeElement.id, 't1');
    assert.deepEqual(changes, ['p3', 'p1', 'p3', 'p1']);
  } finally {
    instance.destroy();
  }
});

test('destroy puts back the aria-selected and tabindex the page wrote', () => {
  document.body.innerHTML = TABLIST;
  const instance = Expressive.Tabs.init(document.querySelector('.tabs'));
  assert.equal(document.querySelector('.tabs').getAttribute('tabindex'), '-1', 'the bar is not a Tab stop of its own');
  instance.destroy();
  assert.deepEqual(state(), ['t1:null:null:null', 't2:null:null:null', 't3:true:5:null']);
  assert.equal(document.querySelector('.tabs').hasAttribute('tabindex'), false);
});

test('link tabs keep aria-current, every link a Tab stop, and focus that does not select', () => {
  document.body.innerHTML = `<nav class="tabs" aria-label="Trip"><a id="t1" href="#p1">One</a><a id="t2" href="#p2">Two</a></nav>
    <div id="p1">1</div><div id="p2">2</div>`;
  const instance = Expressive.Tabs.init(document.querySelector('.tabs'));
  try {
    assert.deepEqual(state(), ['t1:null:null:page', 't2:null:null:null']);
    document.getElementById('t1').focus();
    key(document.activeElement, 'ArrowRight');
    assert.equal(document.activeElement.id, 't2');
    assert.deepEqual(state(), ['t1:null:null:page', 't2:null:null:null'], 'focus moved without selecting');
  } finally {
    instance.destroy();
  }
});

for (const off of ['class="disabled"', 'aria-disabled="true"']) {
  test(`a disabled first tab (${off}) is neither selected nor the Tab stop`, () => {
    document.body.innerHTML = `<div class="tabs" role="tablist" aria-label="Trip">
        <a role="tab" id="t1" href="#p1" aria-controls="p1" ${off}>One</a>
        <a role="tab" id="t2" href="#p2" aria-controls="p2">Two</a>
        <a role="tab" id="t3" href="#p3" aria-controls="p3">Three</a>
      </div><div id="p1">1</div><div id="p2">2</div><div id="p3">3</div>`;
    const instance = Expressive.Tabs.init(document.querySelector('.tabs'));
    try {
      assert.deepEqual(state(), ['t1:false:-1:null', 't2:true:0:null', 't3:false:-1:null']);
      document.getElementById('t2').focus();
      key(document.activeElement, 'ArrowRight');
      assert.equal(document.activeElement.id, 't3');
      key(document.activeElement, 'ArrowRight');
      assert.equal(document.activeElement.id, 't2', 'wraps past the disabled tab');
    } finally {
      instance.destroy();
    }
  });
}

test('a disabled tab the page marked active keeps the Tab stop on the first enabled tab', () => {
  document.body.innerHTML = `<div class="tabs" role="tablist" aria-label="Trip">
      <a role="tab" id="t1" href="#p1" aria-controls="p1" class="active disabled">One</a>
      <a role="tab" id="t2" href="#p2" aria-controls="p2">Two</a>
    </div><div id="p1">1</div><div id="p2">2</div>`;
  const instance = Expressive.Tabs.init(document.querySelector('.tabs'));
  try {
    assert.deepEqual(state(), ['t1:true:-1:null', 't2:false:0:null']);
  } finally {
    instance.destroy();
  }
});

test('a focus handler that destroys the tabs stops the arrow key from selecting', () => {
  document.body.innerHTML = TABLIST;
  const instance = Expressive.Tabs.init(document.querySelector('.tabs'));
  document.getElementById('t3').addEventListener('focus', () => instance.destroy(), { once: true });
  document.getElementById('t2').focus();
  key(document.activeElement, 'ArrowRight');
  assert.equal(document.activeElement.id, 't3');
  assert.deepEqual(state(), ['t1:null:null:null', 't2:null:null:null', 't3:true:5:null'], 'cleanup stands');
  assert.equal(document.getElementById('p2').style.display, '', 'no panel hidden after destroy');
});

test('a hidden first tab is neither selected nor the Tab stop, and the arrows skip it', () => {
  document.body.innerHTML = TABLIST.replace('class="active"', '');
  const hidden = document.getElementById('t1');
  hidden.checkVisibility = () => false;
  const instance = Expressive.Tabs.init(document.querySelector('.tabs'));
  try {
    assert.equal(hidden.getAttribute('tabindex'), '-1');
    assert.equal(document.getElementById('t2').getAttribute('tabindex'), '0');
    assert.equal(document.getElementById('t2').getAttribute('aria-selected'), 'true');
    document.getElementById('t3').focus();
    key(document.activeElement, 'ArrowRight');
    assert.equal(document.activeElement.id, 't2', 'wraps past the hidden tab');
  } finally {
    instance.destroy();
  }
});

test('a tablist set up while hidden puts its Tab stop on the first enabled tab', () => {
  document.body.innerHTML = TABLIST.replace('class="active"', '').replace('id="t1"', 'id="t1" class="disabled"');
  // Nothing is shown yet, as inside a closed dialog.
  document.querySelectorAll('.tabs > a').forEach((a) => (a.checkVisibility = () => false));
  const instance = Expressive.Tabs.init(document.querySelector('.tabs'));
  try {
    assert.equal(document.getElementById('t1').getAttribute('tabindex'), '-1');
    assert.equal(document.getElementById('t2').getAttribute('tabindex'), '0');
  } finally {
    instance.destroy();
  }
});

test('a resize queued before destroy does not rewrite the restored tabindex', async () => {
  document.body.innerHTML = TABLIST;
  const instance = Expressive.Tabs.init(document.querySelector('.tabs'));
  window.dispatchEvent(new window.Event('resize'));
  window.dispatchEvent(new window.Event('resize'));
  instance.destroy();
  await new Promise((resolve) => setTimeout(resolve, 250));
  assert.deepEqual(state(), ['t1:null:null:null', 't2:null:null:null', 't3:true:5:null']);
});
