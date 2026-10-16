// Document-delegated behaviors inside an open shadow root. A listener on the
// document sees `event.target` retargeted to the shadow host, so delegation
// that reads it finds no `[data-copy]`, `.drag-handle` or `<dialog>` there and
// silently does nothing. Each case runs in light DOM and in an open shadow
// root, with the same markup and the same assertion. Menubar, Cards and
// Tooltip are covered in shadow-delegation-browser.test.js instead: jsdom
// matches nothing for `:scope > x` inside a shadow root and has no layout.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody, window } from './setup.js';

const modes = [null, 'open'];
const label = (mode) => (mode ? 'open shadow' : 'light') + ' DOM';

/** A host in the document and the root the markup goes into. */
function mount(mode, html) {
  resetBody();
  const host = document.createElement('div');
  document.body.append(host);
  const root = mode ? host.attachShadow({ mode }) : host;
  root.innerHTML = html;
  return { host, root };
}

const click = (el) =>
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, composed: true, cancelable: true, detail: 1 }));

describe('Document delegation reaches into shadow roots', () => {
  for (const mode of modes) {
    test(`${label(mode)}: Copy writes the button's text`, async () => {
      const { host, root } = mount(mode, '<button data-copy="secret">Copy</button>');
      const written = [];
      const clipboard = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard');
      Object.defineProperty(window.navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async (text) => written.push(text) }
      });
      try {
        click(root.querySelector('button'));
        await new Promise((resolve) => setTimeout(resolve, 0));
        assert.deepEqual(written, ['secret']);
      } finally {
        if (clipboard) Object.defineProperty(window.navigator, 'clipboard', clipboard);
        else delete window.navigator.clipboard;
        document.querySelectorAll('#snackbar-container').forEach((el) => el.remove());
        root.querySelectorAll('#snackbar-container').forEach((el) => el.remove());
        host.remove();
      }
    });

    test(`${label(mode)}: Theme applies the clicked control`, () => {
      const { host, root } = mount(mode, '<button data-theme-set="dark">Dark</button>');
      const before = document.documentElement.getAttribute('theme');
      try {
        click(root.querySelector('button'));
        assert.equal(document.documentElement.getAttribute('theme'), 'dark');
      } finally {
        if (before === null) document.documentElement.removeAttribute('theme');
        else document.documentElement.setAttribute('theme', before);
        window.localStorage.removeItem('theme');
        host.remove();
      }
    });

    test(`${label(mode)}: Dialogs light-dismisses on a backdrop press`, () => {
      const { host, root } = mount(mode, '<dialog>Body</dialog>');
      const dialog = root.querySelector('dialog');
      dialog.showModal();
      const press = (type) =>
        dialog.dispatchEvent(
          new window.PointerEvent(type, { bubbles: true, composed: true, isPrimary: true, pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 10 })
        );
      try {
        press('pointerdown');
        press('pointerup');
        assert.equal(dialog.open, false);
      } finally {
        host.remove();
      }
    });

    test(`${label(mode)}: BottomSheets closes from its handle button`, () => {
      const { host, root } = mount(
        mode,
        '<dialog class="bottom-sheet"><button class="drag-handle" aria-label="Dismiss"></button><p>Sheet</p></dialog>'
      );
      const sheet = root.querySelector('dialog');
      sheet.showModal();
      try {
        root.querySelector('.drag-handle').dispatchEvent(
          new window.MouseEvent('click', { bubbles: true, composed: true, detail: 0 })
        );
        assert.equal(sheet.open, false);
      } finally {
        host.remove();
      }
    });

    test(`${label(mode)}: ImageCompare follows its range`, () => {
      const { host, root } = mount(mode, '<div class="image-compare"><input type="range" min="0" max="100" value="50"></div>');
      const range = root.querySelector('input');
      try {
        range.value = '25';
        range.dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
        assert.equal(range.parentElement.style.getPropertyValue('--md-comp-image-compare-position'), '25%');
      } finally {
        host.remove();
      }
    });

    test(`${label(mode)}: Forms toggles a password field`, () => {
      const { host, root } = mount(
        mode,
        '<div class="field"><input type="password"><button type="button" class="password-toggle" aria-pressed="false">Show password</button></div>'
      );
      try {
        click(root.querySelector('.password-toggle'));
        assert.equal(root.querySelector('input').type, 'text');
        assert.equal(root.querySelector('.password-toggle').getAttribute('aria-pressed'), 'true');
      } finally {
        host.remove();
      }
    });

    test(`${label(mode)}: Sortable moves an item and keeps focus on its button`, () => {
      const { host, root } = mount(
        mode,
        '<ul class="sortable"><li>A <button data-move="down">Down</button></li><li>B <button data-move="down">Down</button></li></ul>'
      );
      try {
        const button = root.querySelector('button');
        button.focus();
        click(button);
        assert.deepEqual([...root.querySelectorAll('li')].map((li) => li.firstChild.textContent.trim()), ['B', 'A']);
        assert.equal(root.activeElement ?? document.activeElement, button, 'focus stays on the moved button');
      } finally {
        host.remove();
      }
    });

    test(`${label(mode)}: PaneResize answers Home and End`, () => {
      const { host, root } = mount(
        mode,
        '<div class="list-detail"><nav>List</nav><button class="drag-handle" aria-label="Resize"></button><main>Detail</main></div>'
      );
      const handle = root.querySelector('.drag-handle');
      try {
        handle.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true, composed: true, cancelable: true }));
        assert.equal(handle.parentElement.style.getPropertyValue('--md-comp-pane-list-width'), '240px');
      } finally {
        host.remove();
      }
    });

    test(`${label(mode)}: ScrollSpy marks the link in the section's own root`, () => {
      const { host, root } = mount(mode, '<a href="#intro">Intro</a><section id="intro" class="scrollspy">Intro</section>');
      const RealIO = window.IntersectionObserver;
      // jsdom has no IntersectionObserver; this one reports the section fully visible.
      class FakeIO {
        constructor(callback) { this.callback = callback; }
        observe(el) { this.callback([{ target: el, isIntersecting: true, intersectionRatio: 1 }]); }
        disconnect() {}
      }
      window.IntersectionObserver = globalThis.IntersectionObserver = FakeIO;
      let spy;
      try {
        spy = Expressive.ScrollSpy.init(root.querySelector('section'));
        assert.equal(root.querySelector('a').getAttribute('aria-current'), 'true');
      } finally {
        spy?.destroy();
        window.IntersectionObserver = globalThis.IntersectionObserver = RealIO;
        host.remove();
      }
    });


    test(`${label(mode)}: a control holding a shadow-root icon still answers a press on the icon`, () => {
      const { host, root } = mount(
        mode,
        `<button data-theme-set="dark"><span class="icon"></span></button>
        <div class="field"><input type="password"><button type="button" class="password-toggle" aria-pressed="false"><span class="icon"></span></button></div>`
      );
      // A web-component icon: the press lands inside its own shadow root.
      const glyphs = [...root.querySelectorAll('.icon')].map((icon) => {
        icon.attachShadow({ mode: 'open' }).innerHTML = '<i>glyph</i>';
        return icon.shadowRoot.querySelector('i');
      });
      const before = document.documentElement.getAttribute('theme');
      try {
        click(glyphs[0]);
        assert.equal(document.documentElement.getAttribute('theme'), 'dark', 'the theme button answers');
        click(glyphs[1]);
        assert.equal(root.querySelector('input').type, 'text', 'the password toggle answers');
      } finally {
        if (before === null) document.documentElement.removeAttribute('theme');
        else document.documentElement.setAttribute('theme', before);
        window.localStorage.removeItem('theme');
        host.remove();
      }
    });

    test(`${label(mode)}: Theme marks the controls in the clicked control's root`, () => {
      const { host, root } = mount(
        mode,
        `<button data-theme-set="light">Light</button><button data-theme-set="dark">Dark</button>
        <div role="menu"><div role="menuitemradio" data-theme-set="light">Light</div><div role="menuitemradio" data-theme-set="dark">Dark</div></div>`
      );
      const before = document.documentElement.getAttribute('theme');
      try {
        Expressive.Theme.set('light');
        Expressive.Theme.sync(root);
        click(root.querySelector('button[data-theme-set="dark"]'));
        const state = (selector, name) => root.querySelector(selector).getAttribute(name);
        assert.deepEqual(
          [state('button[data-theme-set="light"]', 'aria-pressed'), state('button[data-theme-set="dark"]', 'aria-pressed')],
          ['false', 'true']
        );
        assert.deepEqual(
          [state('[role="menuitemradio"][data-theme-set="light"]', 'aria-checked'), state('[role="menuitemradio"][data-theme-set="dark"]', 'aria-checked')],
          ['false', 'true']
        );
      } finally {
        if (before === null) document.documentElement.removeAttribute('theme');
        else document.documentElement.setAttribute('theme', before);
        window.localStorage.removeItem('theme');
        host.remove();
      }
    });

    for (const sheet of [
      { kind: 'bottom', html: '<dialog class="bottom-sheet"><span class="drag-handle"></span><p>Sheet</p></dialog>', grab: '.drag-handle', property: '--md-comp-bottom-sheet-shift', axis: 'clientY' },
      { kind: 'side', html: '<dialog class="side-sheet"><header>Title</header><p>Sheet</p></dialog>', grab: 'header', property: '--md-comp-side-sheet-shift', axis: 'clientX' }
    ]) {
      test(`${label(mode)}: a ${sheet.kind} sheet closed mid-drag reopens without the drag offset`, async () => {
        const { host, root } = mount(mode, sheet.html);
        const dialog = root.querySelector('dialog');
        const pointer = (type, at) =>
          root.querySelector(sheet.grab).dispatchEvent(
            new window.PointerEvent(type, { bubbles: true, composed: true, isPrimary: true, pointerId: 7, pointerType: 'touch', [sheet.axis]: at })
          );
        try {
          dialog.showModal();
          pointer('pointerdown', 0);
          pointer('pointermove', 60);
          assert.equal(dialog.style.getPropertyValue(sheet.property), '60px', 'the drag moves the sheet');
          dialog.close();
          // MutationObserver callbacks run as a microtask after the change.
          await new Promise((resolve) => setTimeout(resolve, 0));
          dialog.showModal();
          assert.equal(dialog.style.getPropertyValue(sheet.property), '0px', 'the offset is cleared');
          assert.equal(dialog.style.transition, '', 'the transition is restored');
        } finally {
          host.remove();
        }
      });
    }
  }
});
