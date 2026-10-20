// Components fire expressive:* DOM events next to their on… callbacks, so a
// page can listen on the element or any ancestor instead of passing options.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody } from './setup.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const TYPES = ['open', 'opened', 'close', 'closed'];

/** Records expressive:* events that reach `root`, as "type:target-id". */
function record(root) {
  const seen = [];
  const listeners = TYPES.map((type) => {
    const listener = (e) => seen.push(`${type}:${e.composedPath()[0].id}`);
    root.addEventListener(`expressive:${type}`, listener);
    return [`expressive:${type}`, listener];
  });
  const stop = () => listeners.forEach(([type, listener]) => root.removeEventListener(type, listener));
  return { seen, stop };
}

beforeEach(resetBody);

test('a navigation rail fires open, opened, close and closed after each callback', () => {
  document.body.innerHTML = '<nav id="rail" class="navigation-rail" aria-label="Main"><button type="button" aria-label="Menu">m</button></nav>';
  const rail = document.getElementById('rail');
  const calls = [];
  const { seen, stop } = record(document);
  const callback = (name) => () => calls.push(`${name}:${seen.length}`);
  const instance = Expressive.NavigationRail.init(rail, {
    onOpenStart: callback('onOpenStart'), onOpenEnd: callback('onOpenEnd'),
    onCloseStart: callback('onCloseStart'), onCloseEnd: callback('onCloseEnd')
  });
  try {
    instance.expand();
    instance.collapse();
    assert.deepEqual(seen, ['open:rail', 'opened:rail', 'close:rail', 'closed:rail']);
    // Each callback ran before its own event: the count is the events seen so far.
    assert.deepEqual(calls, ['onOpenStart:0', 'onOpenEnd:1', 'onCloseStart:2', 'onCloseEnd:3']);
  } finally {
    stop();
    instance.destroy();
  }
});

test('a menu fires its events from the trigger, with no callbacks set', async () => {
  document.body.innerHTML = '<button id="trigger" class="menu-trigger" data-target="menu1">Drop</button><menu id="menu1"><li><button>one</button></li></menu>';
  const trigger = document.getElementById('trigger');
  const { seen, stop } = record(trigger);
  const instance = Expressive.Menu.init(trigger, { inDuration: 0, outDuration: 0 });
  try {
    instance.open();
    await sleep(20);
    instance.close();
    await sleep(20);
    assert.deepEqual(seen, ['open:trigger', 'opened:trigger', 'close:trigger', 'closed:trigger']);
  } finally {
    stop();
    instance.destroy();
  }
});

test('a card reveal fires open and close', () => {
  document.body.innerHTML = '<article id="card"><h3>Title</h3><button type="button" class="card-reveal-trigger" aria-controls="details">T</button><aside id="details"><p>body</p></aside></article>';
  const { seen, stop } = record(document);
  const instance = Expressive.Cards.init(document.getElementById('card'));
  try {
    instance.open();
    instance.close();
    assert.deepEqual(seen, ['open:card', 'close:card']);
  } finally {
    stop();
    instance.destroy();
  }
});

test('the events leave a shadow root for the document', () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<nav id="rail" class="navigation-rail" aria-label="Main"><button type="button" aria-label="Menu">m</button></nav>';
  const { seen, stop } = record(document);
  const instance = Expressive.NavigationRail.init(root.getElementById('rail'));
  try {
    instance.expand();
    assert.deepEqual(seen, ['open:rail', 'opened:rail']);
  } finally {
    stop();
    instance.destroy();
  }
});

for (const via of ['callback', 'listener']) {
  test(`a menu closed by its open ${via} reports the close and never opened`, async () => {
    document.body.innerHTML = '<button id="trigger" class="menu-trigger" data-target="menu1">Drop</button><menu id="menu1"><li><button>one</button></li></menu>';
    const trigger = document.getElementById('trigger');
    const { seen, stop } = record(trigger);
    const instance = Expressive.Menu.init(trigger, {
      inDuration: 0, outDuration: 0,
      onOpenStart: via === 'callback' ? () => instance.close() : null
    });
    const close = () => instance.close();
    if (via === 'listener') trigger.addEventListener('expressive:open', close, { once: true });
    try {
      instance.open();
      await sleep(20);
      assert.equal(instance.isOpen, false);
      assert.ok(!seen.includes('opened:trigger'), `no opened event: ${seen}`);
      const open = seen.indexOf('open:trigger');
      assert.ok(open === -1 || open < seen.indexOf('close:trigger'), `open never follows close: ${seen}`);
    } finally {
      stop();
      instance.destroy();
    }
  });
}

// A completion callback that changes state must not leave a stale event
// behind it: each event names the state the component is in once it fires.
const MENU = '<button id="trigger" class="menu-trigger" data-target="menu1">Drop</button><menu id="menu1"><li><button>one</button></li></menu>';
const RAIL = '<nav id="rail" class="navigation-rail" aria-label="Main"><button type="button" aria-label="Menu">m</button></nav>';
const completions = {
  'onOpenEnd closes': { onOpenEnd: (i) => i.close(), run: (i) => i.open(), menu: ['open', 'close', 'closed'], rail: ['open', 'close', 'closed'] },
  'onCloseEnd reopens': { onCloseEnd: (i) => i.open(), run: (i) => { i.open(); return sleep(20).then(() => i.close()); }, menu: ['open', 'opened', 'close', 'open', 'opened'], rail: ['open', 'opened', 'close', 'open', 'opened'] },
  'onOpenEnd destroys': { onOpenEnd: (i) => i.destroy(), run: (i) => i.open(), menu: ['open'], rail: ['open'] },
};
for (const [name, c] of Object.entries(completions)) {
  for (const kind of ['menu', 'rail']) {
    test(`${kind}: when ${name}, events follow the real state`, async () => {
      document.body.innerHTML = kind === 'menu' ? MENU : RAIL;
      const el = document.getElementById(kind === 'menu' ? 'trigger' : 'rail');
      const { seen, stop } = record(el);
      let instance;
      const once = (fn) => fn && ((...args) => { const f = fn; fn = null; if (f) f(instance, ...args); });
      const options = { onOpenEnd: once(c.onOpenEnd), onCloseEnd: once(c.onCloseEnd) };
      instance = kind === 'menu'
        ? Expressive.Menu.init(el, { inDuration: 0, outDuration: 0, ...options })
        : Expressive.NavigationRail.init(el, options);
      // The rail names its methods expand and collapse.
      if (kind === 'rail') Object.assign(instance, { open: instance.expand, close: instance.collapse });
      try {
        await c.run(instance);
        await sleep(40);
        assert.deepEqual(seen.map((s) => s.split(':')[0]), c[kind]);
      } finally {
        stop();
        if (kind === 'menu' ? Expressive.Menu.getInstance(el) : Expressive.NavigationRail.getInstance(el)) instance.destroy();
      }
    });
  }
}

// A start listener that destroys or replaces the rail stops the old instance:
// it must not change the element or call its end callback afterwards.
for (const [method, type] of [['expand', 'open'], ['collapse', 'close']]) {
  for (const action of ['destroys', 'reinitializes']) {
    test(`rail: an expressive:${type} listener that ${action} the rail stops ${method}()`, () => {
      document.body.innerHTML = RAIL;
      const rail = document.getElementById('rail');
      const ends = [];
      const instance = Expressive.NavigationRail.init(rail, { onOpenEnd: () => ends.push('opened'), onCloseEnd: () => ends.push('closed') });
      if (method === 'collapse') instance.expand();
      ends.length = 0;
      let replacement;
      rail.addEventListener(`expressive:${type}`, () => {
        if (action === 'destroys') instance.destroy();
        else replacement = Expressive.NavigationRail.init(rail);
      }, { once: true });
      try {
        instance[method]();
        assert.deepEqual(ends, [], 'the old instance stopped before its end callback');
        if (replacement) {
          assert.equal(replacement.isExpanded, rail.classList.contains('expanded'), 'the replacement matches the element');
        }
      } finally {
        Expressive.NavigationRail.getInstance(rail)?.destroy();
      }
    });
  }
}
