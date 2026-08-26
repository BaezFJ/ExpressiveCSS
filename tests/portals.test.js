// Runtime-created elements must land in the tree their origin lives in.
//
// Four components build a node and append it somewhere other than beside the
// element that owns it - the tooltip surface, the snackbar container, the
// lightbox caption and the drawer's edge drag target - plus the datepicker's
// two month/year menus, which move to a container. `document.body` was the
// destination for all six.
//
// That defeats adr/0002: a sheet adopted into a shadow root with no copy in the
// document cannot match a node that sits outside the root, so every one of
// these arrived unstyled. Nothing here was root-aware - there was no
// getRootNode() call in src/ts at all - so the failure is silent and total, and
// only in the shadow-only configuration nobody develops in.
//
// Native <dialog> is deliberately not in this list. A top-layer element is
// painted elsewhere but stays in its own tree, so scoping still reaches it.

import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody } from './setup.js';

/** A shadow host on the page, plus an element inside its root. */
function shadowHost(html) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = html;
  return { host, root, el: root.firstElementChild };
}

afterEach(() => {
  resetBody();
});

describe('Portals in the light DOM still go to document.body', () => {
  test('tooltip', () => {
    const el = document.createElement('a');
    el.className = 'tooltipped';
    el.dataset.tooltip = 'Hi';
    document.body.appendChild(el);
    const instance = Expressive.Tooltip.init(el);
    try {
      assert.equal(instance.tooltipEl.parentNode, document.body);
    } finally {
      instance.destroy();
    }
  });

  test('drawer drag target', () => {
    const el = document.createElement('nav');
    el.className = 'sidenav';
    document.body.appendChild(el);
    const instance = Expressive.NavigationDrawer.init(el, { draggable: true });
    try {
      assert.equal(instance.dragTarget.parentNode, document.body);
    } finally {
      instance.destroy();
    }
  });

  test('snackbar container', () => {
    const instance = new Expressive.Snackbar({ text: 'Saved' });
    try {
      assert.equal(document.getElementById('snackbar-container').parentNode, document.body);
    } finally {
      instance.dismiss();
      Expressive.Snackbar._removeContainer?.();
    }
  });
});

describe('Portals inside a shadow root stay in that root', () => {
  test('tooltip', () => {
    const { root, el } = shadowHost('<a class="tooltipped" data-tooltip="Hi">x</a>');
    const instance = Expressive.Tooltip.init(el);
    try {
      assert.equal(instance.tooltipEl.getRootNode(), root);
      assert.equal(document.querySelector('.tooltip'), null, 'nothing leaked to the document');
    } finally {
      instance.destroy();
    }
  });

  test('lightbox caption', () => {
    const { root, el } = shadowHost(
      '<img class="lightboxed" src="a.png" data-caption="A caption">'
    );
    const instance = Expressive.Lightbox.init(el);
    try {
      instance.open();
      assert.equal(root.querySelector('.lightbox-caption').getRootNode(), root);
      assert.equal(document.querySelector('.lightbox-caption'), null);
    } finally {
      instance.destroy();
    }
  });

  test('drawer drag target', () => {
    const { root, el } = shadowHost('<nav class="sidenav"></nav>');
    const instance = Expressive.NavigationDrawer.init(el, { draggable: true });
    try {
      assert.equal(instance.dragTarget.getRootNode(), root);
      assert.equal(document.querySelector('.drag-target'), null);
    } finally {
      instance.destroy();
    }
  });

  // The container is a single shared static, so this is a different problem
  // from the three above: it has no originating element to read a root off.
  // The `root` option supplies one, and because only one snackbar shows at a
  // time the container moves rather than being duplicated per root.
  test('snackbar container follows the root option', () => {
    const { root, el } = shadowHost('<div></div>');
    const instance = new Expressive.Snackbar({ text: 'Saved', root: el });
    try {
      const container = root.getElementById
        ? root.getElementById('snackbar-container')
        : root.querySelector('#snackbar-container');
      assert.ok(container, 'the container is in the shadow root');
      assert.equal(document.getElementById('snackbar-container'), null);
    } finally {
      instance.dismiss();
      Expressive.Snackbar._removeContainer?.();
    }
  });

  test('a snackbar for a different root moves the container rather than orphaning it', () => {
    const { root, el } = shadowHost('<div></div>');
    const first = new Expressive.Snackbar({ text: 'One', root: el });
    first.dismiss();
    const second = new Expressive.Snackbar({ text: 'Two' });
    try {
      assert.equal(root.querySelector('#snackbar-container'), null);
      assert.equal(document.getElementById('snackbar-container').parentNode, document.body);
    } finally {
      second.dismiss();
      Expressive.Snackbar._removeContainer?.();
    }
  });
});
