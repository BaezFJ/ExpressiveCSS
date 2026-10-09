import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;
const root = new URL('..', import.meta.url);

// The framework does not bundle MapLibre; the page supplies it, as here.
// MapLibre loads its worker next to its module, so both are served.
const files = {
  '/expressive.css': ['dist/css/expressive.css', 'text/css'],
  '/expressive.js': ['dist/js/expressive.js', 'text/javascript'],
  '/maplibre-gl.css': ['node_modules/maplibre-gl/dist/maplibre-gl.css', 'text/css'],
  '/maplibre-gl.mjs': ['node_modules/maplibre-gl/dist/maplibre-gl.mjs', 'text/javascript'],
  '/maplibre-gl-worker.mjs': ['node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', 'text/javascript'],
};

// Plain backgrounds, so the test needs no tiles or network.
const style = (color) => ({ version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': color } }] });

const page = `<!doctype html><html lang="en" theme="light"><head>
<link rel="stylesheet" href="/maplibre-gl.css"><link rel="stylesheet" href="/expressive.css">
<script src="/expressive.js"></script></head><body>
<div class="map" role="region" aria-label="Stores" style="width: 600px">
  <button type="button" class="map-marker" data-lng-lat="-87.62,41.88" aria-label="Loop" aria-controls="loop-popup"><span class="map-marker-label">Loop</span></button>
  <div class="map-popup" id="loop-popup"><h3>Loop</h3><p><a href="#hours">Hours</a></p></div>
  <span class="map-marker" data-lng-lat="-87.65,41.92" data-draggable></span>
  <div class="map-popup" data-lng-lat="-87.70,41.85">Depot</div>
  <div class="map-controls">
    <div class="map-control-group">
      <button type="button" class="icon-button" data-action="zoom-in" aria-label="Zoom in"><span class="material-symbols" aria-hidden="true">add</span></button>
      <button type="button" class="icon-button" data-action="zoom-out" aria-label="Zoom out"><span class="material-symbols" aria-hidden="true">remove</span></button>
    </div>
    <button type="button" class="icon-button" data-action="compass" aria-label="Reset north"><span class="material-symbols" aria-hidden="true">navigation</span></button>
    <button type="button" class="icon-button" data-action="locate" aria-label="Show my location"><span class="material-symbols" aria-hidden="true">my_location</span></button>
  </div>
</div>
<script type="module">
import * as maplibregl from '/maplibre-gl.mjs';
window.maplibregl = maplibregl;
const map = document.querySelector('.map');
window.instance = Expressive.MapView.init(map, {
  maplibregl,
  style: { light: ${JSON.stringify(style('#ffffff'))}, dark: ${JSON.stringify(style('#000000'))} },
  center: [-87.65, 41.88],
  zoom: 11,
  mapOptions: { minZoom: 11, fadeDuration: 0 }
});
window.instance.map.once('load', () => { window.loaded = true; });
</script></body></html>`;

// MapLibre draws with WebGL2. Firefox in the Playwright container has no GL
// driver, so it gets none; Chromium and WebKit render in software.
const noWebGL = (page) => page.evaluate(() => !document.createElement('canvas').getContext('webgl2'));

const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const file = files[path];
  if (!file) {
    response.writeHead(path === '/' ? 200 : 404, { 'content-type': 'text/html' });
    response.end(path === '/' ? page : '');
    return;
  }
  response.writeHead(200, { 'content-type': file[1] });
  response.end(readFileSync(new URL(file[0], root)));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: map places markers and popups, runs controls, themes overlays and restores its markup`, { timeout: 60000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(origin);
      if (await noWebGL(page)) { t.skip(`${name} has no WebGL2 here`); return; }
      await page.waitForFunction(() => window.loaded);

      const marker = page.getByRole('button', { name: 'Loop' });
      const zoomOut = page.getByRole('button', { name: 'Zoom out' });
      const zoom = () => page.evaluate(() => window.instance.map.getZoom());
      const idle = () => page.evaluate(() => new Promise((resolve) => {
        const { map } = window.instance;
        if (!map.isMoving()) resolve(); else map.once('moveend', resolve);
      }));

      assert.equal(await page.locator('.map canvas').count(), 1, 'MapLibre draws a canvas');
      assert.equal(await page.locator('.maplibregl-marker.map-marker').count(), 2, 'both markers are on the map');
      assert.equal(await page.locator('.maplibregl-popup .map-popup').count(), 1, 'the popup without a marker opens at init');
      assert.equal(await page.locator('.maplibregl-popup').textContent(), 'Depot×', 'the open popup is the depot');
      const dot = await page.locator('.map-marker[data-draggable]').evaluate((el) => {
        const style = getComputedStyle(el);
        const probe = document.createElement('span');
        probe.style.color = 'var(--md-sys-color-primary)';
        document.body.append(probe);
        const primary = getComputedStyle(probe).color;
        probe.remove();
        return { width: style.width, position: style.position, primary: style.backgroundColor === primary };
      });
      assert.deepEqual(dot, { width: '16px', position: 'absolute', primary: true }, 'an empty marker is a primary dot');
      assert.equal(await zoomOut.isDisabled(), true, 'zoom out is disabled at the minimum zoom');

      assert.equal(await marker.getAttribute('aria-expanded'), 'false');
      await marker.click();
      assert.equal(await marker.getAttribute('aria-expanded'), 'true');
      assert.equal(await page.locator('.maplibregl-popup').count(), 2);
      await page.getByRole('link', { name: 'Hours' }).focus();
      await page.keyboard.press('Escape');
      assert.equal(await marker.getAttribute('aria-expanded'), 'false', 'Escape closes the popup');
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Loop', 'focus returns to the marker');
      await marker.click();
      await page.locator('.map canvas').click({ position: { x: 20, y: 300 } });
      assert.equal(await marker.getAttribute('aria-expanded'), 'false', 'a click on the map closes the popup');

      await page.getByRole('button', { name: 'Zoom in' }).click();
      await idle();
      assert.equal(await zoom(), 12);
      assert.equal(await zoomOut.isDisabled(), false);
      await page.evaluate(() => window.instance.map.setBearing(90));
      assert.equal(await page.locator('.map').evaluate((el) => el.style.getPropertyValue('--md-comp-map-bearing')), '-90deg');
      await page.getByRole('button', { name: 'Reset north' }).click();
      await idle();
      assert.equal(await page.evaluate(() => window.instance.map.getBearing()), 0);

      const overlays = () => page.evaluate(() => {
        const { map } = window.instance;
        return {
          route: map.getPaintProperty('route', 'line-color'),
          arcs: map.getLayer('flights')?.type,
          clusters: map.getLayer('stores-clusters')?.type,
          count: map.getLayer('stores-count')?.type,
          points: map.getLayer('stores-points')?.type,
          background: map.getPaintProperty('background', 'background-color'),
          primary: window.instance._color('var(--md-sys-color-primary)')
        };
      });
      await page.evaluate(() => {
        const point = (lng, lat) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lng, lat] } });
        window.instance.addRoute('route', [[-87.70, 41.85], [-87.62, 41.88]]);
        window.instance.addArcs('flights', [{ from: [-87.9, 41.97], to: [-87.6, 41.8] }], { dashArray: [2, 2] });
        window.instance.addClusters('stores', { type: 'FeatureCollection', features: [point(-87.63, 41.88), point(-87.631, 41.881), point(-87.7, 41.9)] });
      });
      let state = await overlays();
      assert.equal(state.route, state.primary, 'the route takes the theme primary color');
      assert.deepEqual([state.arcs, state.clusters, state.count, state.points], ['line', 'circle', undefined, 'circle'], 'no count labels without glyphs');
      const light = state.primary;

      await page.evaluate(() => document.documentElement.setAttribute('theme', 'dark'));
      await page.waitForFunction(() => window.instance.map.getLayer('route') && window.instance.map.getPaintProperty('background', 'background-color') === '#000000');
      state = await overlays();
      assert.notEqual(state.primary, light);
      assert.equal(state.route, state.primary, 'the dark style redraws the route in the dark primary');
      assert.equal(state.clusters, 'circle', 'clusters survive the style swap');

      await page.evaluate(() => window.instance.removeOverlay('stores'));
      assert.equal(await page.evaluate(() => window.instance.map.getSource('stores')), undefined);

      // A location that arrives after destroy() is ignored.
      await page.evaluate(() => {
        navigator.geolocation.getCurrentPosition = (success) => { window.located = success; };
      });
      await page.getByRole('button', { name: 'Show my location' }).click();
      await page.evaluate(() => window.instance.destroy());
      await page.evaluate(() => new Promise((resolve) => setTimeout(() => {
        window.located({ coords: { longitude: -87.6, latitude: 41.9 } });
        resolve();
      })).catch(() => {}));
      await page.waitForTimeout(50);
      assert.equal(await page.evaluate(() => Expressive.MapView.getInstance(document.querySelector('.map'))), undefined);
      assert.deepEqual(
        await page.locator('.map').evaluate((el) => [...el.children].map((child) => child.className)),
        ['map-marker', 'map-popup', 'map-marker', 'map-popup', 'map-controls'],
        'destroy puts the authored children back in order'
      );
      assert.equal(await marker.getAttribute('aria-expanded'), null);
      assert.equal(await page.locator('[data-action="zoom-out"]').evaluate((el) => el.disabled), false, 'destroy re-enables the controls');
      assert.equal(await page.locator('.map canvas').count(), 0);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });

  test(`${name}: a map in a shadow root opens its marker popup`, { timeout: 60000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(origin);
      if (await noWebGL(page)) { t.skip(`${name} has no WebGL2 here`); return; }
      await page.waitForFunction(() => window.loaded);
      await page.evaluate(() => new Promise((resolve) => {
        const host = document.createElement('div');
        document.body.append(host);
        host.attachShadow({ mode: 'open' }).innerHTML = `
          <link rel="stylesheet" href="/maplibre-gl.css"><link rel="stylesheet" href="/expressive.css">
          <div class="map" role="region" aria-label="Shadow" style="width: 400px">
            <button type="button" class="map-marker" data-lng-lat="-87.62,41.88" aria-label="Shadow marker" aria-controls="shadow-popup"></button>
            <div class="map-popup" id="shadow-popup">Inside</div>
          </div>`;
        window.shadowMap = Expressive.MapView.init(host.shadowRoot.querySelector('.map'), {
          maplibregl: window.maplibregl,
          style: { version: 8, sources: {}, layers: [] },
          center: [-87.62, 41.88],
          zoom: 11
        });
        window.shadowMap.map.once('load', resolve);
      }));
      const marker = page.getByRole('button', { name: 'Shadow marker' });
      assert.equal(await marker.getAttribute('aria-expanded'), 'false');
      await marker.click();
      assert.equal(await marker.getAttribute('aria-expanded'), 'true');
      assert.equal(await page.locator('.maplibregl-popup .map-popup').filter({ hasText: 'Inside' }).count(), 1);
    } finally {
      await browser.close();
    }
  });
}
