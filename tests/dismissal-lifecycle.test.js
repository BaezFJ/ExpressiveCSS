// Dismissal and lifecycle: a docked picker that closed on its own range end
// input, a menu that missed clicks below a short page, a map that threw on one
// bad coordinate, a restarted tour that kept the old highlight, and late
// search results that reopened a list the user had left.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody, window } from './setup.js';

const sleep = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));

describe('Dismissal and lifecycle', () => {
  beforeEach(resetBody);

  test('a docked range picker opens from, and stays open on, its end input', () => {
    document.body.innerHTML = '<div class="field"><input id="start" type="text"><input id="end" type="text"></div>';
    const start = document.getElementById('start');
    const end = document.getElementById('end');
    const dp = Expressive.Datepicker.init(start, { isDateRange: true, displayPlugin: 'docked', dateRangeEndEl: '#end' });
    const docked = document.querySelector('.display-docked');
    try {
      click(end);
      assert.equal(docked.style.visibility, 'visible', 'the end input opens the picker');
      click(end);
      assert.equal(docked.style.visibility, 'visible', 'a second click on it keeps the picker open');
      click(document.body);
      assert.notEqual(docked.style.visibility, 'visible', 'an outside click still closes it');
    } finally {
      dp.destroy();
    }
  });

  test('a Menu closes on a click below a page shorter than the window', async () => {
    document.body.innerHTML = '<button class="menu-trigger" data-target="m">Open</button><menu id="m"><li><span>Alpha</span></li></menu>';
    const menu = Expressive.Menu.init(document.querySelector('.menu-trigger'), { inDuration: 0, outDuration: 0 });
    try {
      menu.open();
      await sleep();
      // Below the body's content a click targets the root element, not <body>.
      click(document.documentElement);
      await sleep();
      assert.equal(menu.isOpen, false);
    } finally {
      menu.destroy();
    }
  });

  test('MapView skips a marker with a bad coordinate instead of throwing', () => {
    let created = 0;
    let removed = 0;
    // Enough of MapLibre for the constructor, with its LngLat validation.
    const maplibregl = {
      Map: class { constructor() { created++; } on() {} getZoom() { return 1; } getMaxZoom() { return 22; } getMinZoom() { return 0; } getBearing() { return 0; } remove() { removed++; } },
      Marker: class {
        constructor(options) { this.options = options; }
        setLngLat([lng, lat]) {
          if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > 90) throw new Error('Invalid LngLat');
          return this;
        }
        addTo() { return this; } on() {} remove() {} getElement() { return this.options.element; }
      },
      Popup: class { setDOMContent() { return this; } on() {} setLngLat() { return this; } addTo() { return this; } remove() {} }
    };
    document.body.innerHTML = `
      <div class="map"><button class="map-marker" data-lng-lat="-33.87,151.21">Sydney, lat first</button><button class="map-marker" data-lng-lat="Paris">Paris</button></div>
      <div class="map"><button class="map-marker" data-lng-lat="2.35,48.85">Paris</button></div>`;
    const warn = console.warn;
    const warnings = [];
    console.warn = (message) => warnings.push(message);
    // The theme colour probe paints into a canvas, which jsdom does not implement.
    const getContext = window.HTMLCanvasElement.prototype.getContext;
    window.HTMLCanvasElement.prototype.getContext = () => new Proxy(
      { getImageData: () => ({ data: [0, 0, 0, 255] }) },
      { get: (target, key) => (key in target ? target[key] : () => {}), set: () => true }
    );
    let maps = [];
    try {
      maps = Expressive.MapView.init(document.querySelectorAll('.map'), { maplibregl });
      assert.equal(maps.length, 2, 'every map initializes');
      assert.equal(created, 2);
      assert.deepEqual(maps.map((map) => map.markers.length), [0, 1], 'only the valid marker is placed');
      assert.equal(warnings.length, 2, 'each skipped marker is reported');
    } finally {
      console.warn = warn;
      window.HTMLCanvasElement.prototype.getContext = getContext;
      maps.forEach((map) => map.destroy());
    }
    assert.equal(removed, 2, 'no map is left behind');
  });

  test('restarting a running Tour releases the step it was showing', () => {
    const proto = window.HTMLElement.prototype;
    const saved = ['checkVisibility', 'showPopover', 'hidePopover'].map((name) => [name, Object.getOwnPropertyDescriptor(proto, name)]);
    const matches = window.Element.prototype.matches;
    // jsdom has no popovers or checkVisibility.
    proto.checkVisibility = () => true;
    proto.showPopover = function () { this.setAttribute('data-open', ''); };
    proto.hidePopover = function () { this.removeAttribute('data-open'); };
    window.Element.prototype.matches = function (selector) {
      return selector === ':popover-open' ? this.hasAttribute('data-open') : matches.call(this, selector);
    };
    document.body.innerHTML = `<div id="a">A</div><div id="b">B</div>
      <button data-tour-start="t">Start</button>
      <div class="tour" id="t" popover="manual">
        <section data-tour-target="a"><h2>A</h2></section>
        <section data-tour-target="b"><h2>B</h2></section>
        <button data-tour-next>Next</button>
      </div>`;
    const tour = document.getElementById('t');
    const highlighted = () => [...document.querySelectorAll('.tour-target')].map((el) => el.id);
    try {
      click(document.querySelector('[data-tour-start]'));
      click(tour.querySelector('[data-tour-next]'));
      assert.deepEqual(highlighted(), ['b']);
      click(document.querySelector('[data-tour-start]'));
      assert.deepEqual(highlighted(), ['a'], 'only the restarted step is highlighted');
      Expressive.Tour.end(tour);
      assert.deepEqual(highlighted(), [], 'ending releases every target');
    } finally {
      Expressive.Tour.end(tour);
      for (const [name, descriptor] of saved) {
        if (descriptor) Object.defineProperty(proto, name, descriptor);
        else delete proto[name];
      }
      window.Element.prototype.matches = matches;
    }
  });

  test('a modal NavigationRail collapses on its scrim, not on blank space inside it', () => {
    document.body.innerHTML = `<nav class="navigation-rail modal" aria-label="Main">
      <button type="button" aria-label="Menu"></button><a href="#home">Home</a></nav>`;
    const nav = document.querySelector('nav');
    const rail = Expressive.NavigationRail.init(nav);
    // jsdom has no layout: give the rail the 0 to 220px column it occupies.
    nav.getBoundingClientRect = () => ({ left: 0, right: 220, top: 0, bottom: 700, width: 220, height: 700 });
    const press = (clientX) => nav.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, clientX, clientY: 300 }));
    try {
      rail.expand();
      press(100);
      assert.equal(rail.isExpanded, true, 'a tap between destinations keeps the rail open');
      press(320);
      assert.equal(rail.isExpanded, false, 'a tap on the scrim beside the rail collapses it');
    } finally {
      rail.destroy();
    }
  });

  test('Autocomplete results that arrive after the user left do not reopen the list', async () => {
    document.body.innerHTML = '<div class="field"><input id="ac" type="text"></div><button id="next">Next</button>';
    const el = document.getElementById('ac');
    const pending = [];
    const ac = Expressive.Autocomplete.init(el, { onSearch: (text, autocomplete) => pending.push(() => autocomplete.setMenuItems([{ id: 'a', text: 'Apple' }])) });
    try {
      el.focus();
      el.value = 'ap';
      el.dispatchEvent(new window.InputEvent('input', { bubbles: true, inputType: 'insertText' }));
      document.getElementById('next').focus();
      pending.shift()();
      await sleep();
      assert.equal(ac.menu.isOpen, false, 'the list stays closed under the input the user left');
      assert.deepEqual(ac.menuItems.map((item) => item.id), ['a'], 'the results are still kept');

      el.focus();
      el.value = 'app';
      el.dispatchEvent(new window.InputEvent('input', { bubbles: true, inputType: 'insertText' }));
      pending.pop()();
      await sleep();
      assert.equal(ac.menu.isOpen, true, 'results for a field still in use open the list');
    } finally {
      ac.destroy();
    }
  });
});
