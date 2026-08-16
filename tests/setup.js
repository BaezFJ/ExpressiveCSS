// Shared jsdom environment.
//
// The bundle reads `document` at import time (it attaches document-level
// listeners and runs Forms/Chips/Waves/Range/Cards Init), so the globals have to
// exist *before* it loads - hence the dynamic import at the bottom. Everything
// here runs once per test process; tests call resetBody() between cases.

import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true // gives us requestAnimationFrame
});

const { window } = dom;

// Anything the components touch on the global object. `HTMLElement` matters most:
// the Component base class rejects an element with `el instanceof HTMLElement`.
const globalNames = [
  'window',
  'document',
  'navigator',
  'location',
  'Element',
  'Node',
  'NodeList',
  'NodeFilter',
  'Event',
  'CustomEvent',
  'KeyboardEvent',
  'MouseEvent',
  'FocusEvent',
  'InputEvent',
  'DOMParser',
  'MutationObserver',
  'ResizeObserver',
  'IntersectionObserver',
  'DocumentFragment',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame'
];

// ...plus every element constructor jsdom exposes, so `instanceof` checks and
// `new HTMLTemplateElement`-style lookups inside components resolve.
for (const key of Object.getOwnPropertyNames(window)) {
  if (/^(HTML|SVG)\w*Element$/.test(key)) globalNames.push(key);
}

for (const name of globalNames) {
  const value = window[name];
  if (value === undefined) continue;
  try {
    globalThis[name] = value;
  } catch {
    // Node defines some of these (navigator, location) as getter-only globals.
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  }
}

// jsdom implements neither of these; several components call them unconditionally.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false
  });
}
globalThis.matchMedia = window.matchMedia;

// jsdom has never implemented innerText (it needs layout). Several components
// read and write it - FormSelect._setValueToInput() would throw on undefined.
// textContent is a good enough stand-in for assertions that do not depend on
// CSS visibility.
if (!('innerText' in window.HTMLElement.prototype)) {
  Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
    configurable: true,
    get() {
      return this.textContent;
    },
    set(value) {
      this.textContent = value;
    }
  });
}

if (!window.Element.prototype.scrollTo) window.Element.prototype.scrollTo = () => {};
if (!window.scrollTo) window.scrollTo = () => {};
globalThis.scrollTo = window.scrollTo;

/** Clear the document between test cases. */
export function resetBody() {
  document.body.innerHTML = '';
}

/** Dispatch a real (bubbling) event, the way a user interaction would. */
export function fire(el, type, EventCtor = window.MouseEvent) {
  el.dispatchEvent(new EventCtor(type, { bubbles: true, cancelable: true, view: window }));
}

// Import the shipped bundle, not the sources: this is what consumers get.
export const Expressive = await import('../dist/js/expressive.mjs');
export { window, dom };
