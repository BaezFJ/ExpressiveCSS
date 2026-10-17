// Dismissal and lifecycle: a docked picker that closed on its own range end
// input, a menu that missed clicks below a short page, a map that threw on one
// bad coordinate, a restarted tour that kept the old highlight, and late
// search results that reopened a list the user had left.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody, window } from './setup.js';

const sleep = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));

// jsdom has no popovers or checkVisibility. Returns a function that undoes this.
function shimPopovers() {
  const proto = window.HTMLElement.prototype;
  const saved = ['checkVisibility', 'showPopover', 'hidePopover'].map((name) => [name, Object.getOwnPropertyDescriptor(proto, name)]);
  const matches = window.Element.prototype.matches;
  proto.checkVisibility = () => true;
  proto.showPopover = function () { this.setAttribute('data-open', ''); };
  proto.hidePopover = function () { this.removeAttribute('data-open'); };
  window.Element.prototype.matches = function (selector) {
    return selector === ':popover-open' ? this.hasAttribute('data-open') : matches.call(this, selector);
  };
  return () => {
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(proto, name, descriptor);
      else delete proto[name];
    }
    window.Element.prototype.matches = matches;
  };
}

// Enough of MapLibre for the constructor, with its LngLat validation.
function fakeMapLibre(counts = {}) {
  return {
    Map: class {
      constructor() { counts.created = (counts.created ?? 0) + 1; this.handlers = []; }
      on(...args) { this.handlers.push(args); }
      off() {}
      getZoom() { return 1; } getMaxZoom() { return 22; } getMinZoom() { return 0; } getBearing() { return 0; }
      remove() { counts.removed = (counts.removed ?? 0) + 1; }
    },
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
}

// The theme colour probe paints into a canvas, which jsdom does not implement.
function shimCanvas() {
  const getContext = window.HTMLCanvasElement.prototype.getContext;
  window.HTMLCanvasElement.prototype.getContext = () => new Proxy(
    { getImageData: () => ({ data: [0, 0, 0, 255] }) },
    { get: (target, key) => (key in target ? target[key] : () => {}), set: () => true }
  );
  return () => { window.HTMLCanvasElement.prototype.getContext = getContext; };
}

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
    const counts = {};
    const maplibregl = fakeMapLibre(counts);
    document.body.innerHTML = `
      <div class="map"><button class="map-marker" data-lng-lat="-33.87,151.21">Sydney, lat first</button><button class="map-marker" data-lng-lat="Paris">Paris</button><button class="map-marker" data-lng-lat="12.5,">No latitude</button></div>
      <div class="map"><button class="map-marker" data-lng-lat="2.35,48.85">Paris</button></div>`;
    const warn = console.warn;
    const warnings = [];
    console.warn = (message) => warnings.push(message);
    const restoreCanvas = shimCanvas();
    let maps = [];
    try {
      maps = Expressive.MapView.init(document.querySelectorAll('.map'), { maplibregl });
      assert.equal(maps.length, 2, 'every map initializes');
      assert.equal(counts.created, 2);
      assert.deepEqual(maps.map((map) => map.markers.length), [0, 1], 'only the valid marker is placed');
      assert.equal(warnings.length, 3, 'each skipped marker is reported, an empty latitude too');
    } finally {
      console.warn = warn;
      restoreCanvas();
      maps.forEach((map) => map.destroy());
    }
    assert.equal(counts.removed, 2, 'no map is left behind');
  });

  test('MapView ignores a cluster zoom that resolves after destroy', async () => {
    document.body.innerHTML = '<div class="map"></div>';
    const restoreCanvas = shimCanvas();
    let map;
    try {
      map = Expressive.MapView.init(document.querySelector('.map'), { maplibregl: fakeMapLibre() });
      let resolveZoom;
      map.map.getSource = () => ({ getClusterExpansionZoom: () => new Promise((resolve) => { resolveZoom = resolve; }) });
      map.map.easeTo = () => {};
      map.addClusters('stores', { type: 'FeatureCollection', features: [] });
      const [, , zoomIn] = map.map.handlers.find(([type, layer]) => type === 'click' && layer === 'stores-clusters');
      const zooming = zoomIn({ features: [{ properties: { cluster_id: 1 }, geometry: { coordinates: [0, 0] } }] });
      map.destroy();
      resolveZoom(12);
      await assert.doesNotReject(zooming);
    } finally {
      restoreCanvas();
      map?.destroy();
    }
  });

  test('MapView handles a refused fullscreen request', async () => {
    document.body.innerHTML = '<div class="map"><div class="map-controls"><button type="button" data-action="fullscreen">Full screen</button></div></div>';
    const el = document.querySelector('.map');
    const restoreCanvas = shimCanvas();
    const rejections = [];
    const record = (reason) => rejections.push(reason);
    process.on('unhandledRejection', record);
    let map;
    try {
      map = Expressive.MapView.init(el, { maplibregl: fakeMapLibre() });
      el.requestFullscreen = () => Promise.reject(new Error('Permissions check failed'));
      click(el.querySelector('[data-action="fullscreen"]'));
      await sleep();
      assert.deepEqual(rejections, []);
    } finally {
      process.off('unhandledRejection', record);
      restoreCanvas();
      map?.destroy();
    }
  });

  test('restarting a running Tour releases the step it was showing', () => {
    const restore = shimPopovers();
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
      restore();
    }
  });

  test('a Tour passes over a step whose target was removed, and ends when none is left', () => {
    const restore = shimPopovers();
    document.body.innerHTML = `<div id="a">A</div><div id="b">B</div><div id="c">C</div>
      <button data-tour-start="t">Start</button>
      <div class="tour" id="t" popover="manual">
        <section data-tour-target="a"><h2>A</h2></section>
        <section data-tour-target="b"><h2>B</h2></section>
        <section data-tour-target="c"><h2>C</h2></section>
        <button data-tour-back>Back</button><button data-tour-next>Next</button>
      </div>`;
    const tour = document.getElementById('t');
    const highlighted = () => [...document.querySelectorAll('.tour-target')].map((el) => el.id);
    try {
      click(document.querySelector('[data-tour-start]'));
      document.getElementById('b').remove();
      click(tour.querySelector('[data-tour-next]'));
      assert.deepEqual(highlighted(), ['c'], 'Next skips the removed target');
      assert.equal(tour.querySelector('[data-tour-target="c"]').hidden, false);
      document.getElementById('a').remove();
      click(tour.querySelector('[data-tour-back]'));
      assert.equal(tour.hasAttribute('data-open'), false, 'with nothing left behind it, Back ends the tour');
      assert.deepEqual(highlighted(), []);
    } finally {
      Expressive.Tour.end(tour);
      restore();
    }
  });

  test('Escape that cancels a Sortable drag is not also a dialog close request', () => {
    document.body.innerHTML = `<ul class="sortable"><li><span class="drag-handle"></span>A</li><li>B</li></ul>`;
    const item = document.querySelector('li');
    const escape = () => {
      const event = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      document.body.dispatchEvent(event);
      return event.defaultPrevented;
    };
    item.querySelector('.drag-handle').dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }));
    assert.equal(item.classList.contains('dragged'), true);
    assert.equal(escape(), true, 'Escape during a drag went on to close the dialog');
    assert.equal(item.classList.contains('dragged'), false, 'Escape cancels the drag');
    assert.equal(escape(), false, 'Escape with no drag is left alone');
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
