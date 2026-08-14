// Guards the shipped surface a <script> tag consumer sees: the IIFE bundle's
// global name and the version it reports. The docs site calls
// RoutePlate.AutoInit() on that global, so a rename here breaks the page
// silently otherwise.
//
// This file builds its own jsdom (with runScripts enabled) rather than using
// setup.js, because it needs to *evaluate* the IIFE rather than import the ESM.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const iife = readFileSync(new URL('../dist/js/routeplate.js', import.meta.url), 'utf8');

describe('IIFE bundle', () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  dom.window.eval(iife);

  test('exposes the RoutePlate global, not M', () => {
    assert.equal(typeof dom.window.RoutePlate, 'object');
    assert.equal(dom.window.M, undefined, 'the old Materialize global is still present');
  });

  test('the global carries AutoInit and the components', () => {
    assert.equal(typeof dom.window.RoutePlate.AutoInit, 'function');
    for (const name of ['Collapsible', 'Tabs', 'Modal', 'Toast', 'FormSelect']) {
      assert.equal(typeof dom.window.RoutePlate[name], 'function', `${name} missing from global`);
    }
  });

  test('reports RoutePlateCSS own version', () => {
    assert.equal(dom.window.RoutePlate.version, '0.1.0');
  });
});
