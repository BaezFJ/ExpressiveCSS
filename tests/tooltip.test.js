import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody, window } from './setup.js';

afterEach(resetBody);

for (const manual of ['default', true]) {
  test(`Tooltip open(${manual === 'default' ? '' : 'true'}) shows without focus or hover`, t => {
    document.body.innerHTML = '<button data-tooltip="Help text">Help</button>';
    const trigger = document.querySelector('button');
    const instance = Expressive.Tooltip.init(trigger, { enterDelay: 10, inDuration: 0 });
    t.mock.timers.enable({ apis: ['setTimeout'] });
    try {
      assert.notEqual(document.activeElement, trigger);
      assert.equal(instance.isHovered, false);
      if (manual === 'default') instance.open();
      else instance.open(true);
      t.mock.timers.tick(10);
      t.mock.timers.tick(1);
      assert.equal(instance.tooltipEl.style.visibility, 'visible');
      assert.equal(instance.tooltipEl.style.opacity, '1');
    } finally {
      instance.destroy();
      t.mock.timers.reset();
    }
  });
}

test('Tooltip open(false) requires focus or hover and automatic hover still opens and closes', t => {
  document.body.innerHTML = '<button data-tooltip="Help text">Help</button>';
  const trigger = document.querySelector('button');
  const instance = Expressive.Tooltip.init(trigger, { enterDelay: 10, exitDelay: 0, inDuration: 0, outDuration: 0 });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    instance.open(false);
    t.mock.timers.tick(10);
    t.mock.timers.tick(1);
    assert.notEqual(instance.tooltipEl.style.visibility, 'visible');
    instance.close();
    trigger.dispatchEvent(new window.MouseEvent('mouseenter'));
    t.mock.timers.tick(10);
    t.mock.timers.tick(1);
    assert.equal(instance.tooltipEl.style.opacity, '1');
    trigger.dispatchEvent(new window.MouseEvent('mouseleave'));
    t.mock.timers.tick(0);
    t.mock.timers.tick(1);
    t.mock.timers.tick(0);
    assert.equal(instance.tooltipEl.style.visibility, 'hidden');
  } finally {
    instance.destroy();
    t.mock.timers.reset();
  }
});

for (const shadow of [false, true]) {
  test(`rich Tooltip restores authored content through reinitialization (${shadow ? 'shadow' : 'document'})`, () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = shadow ? host.attachShadow({ mode: 'open' }) : host;
    root.innerHTML = '<button data-tooltip-id="rich" aria-describedby="help details">Help</button><p id="help">Help text</p><p id="details">Details</p><section><span>Before</span><div id="rich" hidden="until-found" class="authored" style="display:none!important;color:red"><button>Action</button></div><span>After</span></section>';
    const trigger = root.querySelector('button');
    const content = root.querySelector('#rich');
    const parent = content.parentNode;
    const next = content.nextSibling;
    const child = content.firstElementChild;
    let clicks = 0;
    child.addEventListener('click', () => clicks++);
    let instance;
    try {
      instance = Expressive.Tooltip.init(trigger);
      for (let cycle = 0; cycle < 3; cycle++) {
        instance = Expressive.Tooltip.init(trigger);
        assert.equal(instance.tooltipEl.firstElementChild, content);
        assert.equal(content.hidden, false);
        assert.equal(content.style.display, '');
        assert.ok(content.classList.contains('tooltip-content'));
        assert.deepEqual(trigger.getAttribute('aria-describedby').split(/\s+/), ['help', 'details', instance.tooltipEl.id]);
        child.click();
      }
      instance.destroy();
      assert.equal(content.parentNode, parent);
      assert.equal(content.nextSibling, next);
      assert.equal(content.firstElementChild, child);
      assert.equal(content.getAttribute('hidden'), 'until-found');
      assert.equal(content.className, 'authored');
      assert.equal(content.style.display, 'none');
      assert.equal(content.style.getPropertyPriority('display'), 'important');
      assert.equal(content.style.color, 'red');
      assert.equal(trigger.getAttribute('aria-describedby'), 'help details');
      assert.equal(root.querySelector('.tooltip'), null);
      assert.equal(parent.childNodes.length, 3, 'teardown removes the position marker');
      assert.equal(clicks, 3, 'moving content retains its event listeners');
    } finally {
      Expressive.Tooltip.getInstance(trigger)?.destroy();
    }
  });
}

test('Tooltip with a missing data-tooltip-id falls back to its text', t => {
  const error = t.mock.method(console, 'error', () => {});
  document.body.innerHTML = '<button data-tooltip-id="typo" data-tooltip="Help text">Help</button>';
  const trigger = document.querySelector('button');
  const instance = Expressive.Tooltip.init(trigger);
  try {
    assert.equal(error.mock.callCount(), 1);
    assert.equal(instance.tooltipEl.classList.contains('rich'), false);
    assert.equal(instance.tooltipEl.textContent, 'Help text');
    assert.ok(document.getElementById(trigger.getAttribute('aria-describedby')), 'description points at a real element');
  } finally {
    instance.destroy();
  }
  assert.equal(trigger.hasAttribute('aria-describedby'), false);
});

test('Tooltip removes only its generated description and class', () => {
  document.body.innerHTML = '<button data-tooltip-id="rich">Help</button><div id="rich" class="tooltip-content">Authored content</div>';
  const trigger = document.querySelector('button');
  const content = document.querySelector('#rich');
  const instance = Expressive.Tooltip.init(trigger);
  try {
    trigger.setAttribute('aria-describedby', `${instance.tooltipEl.id} later-description`);
    content.classList.add('later-class');
  } finally {
    instance.destroy();
  }
  assert.equal(trigger.getAttribute('aria-describedby'), 'later-description');
  assert.equal(content.parentNode, document.body);
  assert.equal(content.className, 'tooltip-content later-class');
});

// One tooltip closing lets the next show without its enterDelay, as along a
// toolbar. The window is module state, so each case starts its mocked clock
// an hour after the last: no case, and no real-clock test, falls inside a
// window another case opened.
let sharedClock = Date.now();
function sharedDelayCase(name, exitDelay, body) {
  test(`Tooltip shared delay: ${name}`, t => {
    document.body.innerHTML = '<button id="a" data-tooltip="A">A</button><button id="b" data-tooltip="B">B</button>';
    const [a, b] = ['a', 'b'].map(id => Expressive.Tooltip.init(document.getElementById(id), {
      enterDelay: 500, exitDelay, inDuration: 0, outDuration: 0
    }));
    sharedClock += 3_600_000;
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: sharedClock });
    const tick = ms => t.mock.timers.tick(ms);
    const hover = instance => instance.el.dispatchEvent(new window.MouseEvent('mouseenter'));
    const leave = instance => instance.el.dispatchEvent(new window.MouseEvent('mouseleave'));
    const shown = instance => instance.tooltipEl.style.visibility === 'visible';
    const setClockBack = ms => t.mock.timers.setTime(Date.now() - ms);
    try {
      body({ a, b, tick, hover, leave, shown, setClockBack });
    } finally {
      for (const instance of [a, b]) if (Expressive.Tooltip.getInstance(instance.el)) instance.destroy();
      t.mock.timers.reset();
    }
  });
}

sharedDelayCase('a tooltip opened just after another hid shows at once', 0, ({ a, b, tick, hover, leave, shown }) => {
  hover(a);
  tick(500);
  assert.ok(shown(a));
  leave(a);
  tick(0);
  tick(1);
  tick(200);
  hover(b);
  tick(0);
  assert.ok(shown(b), 'B skips its enterDelay');
});

sharedDelayCase('a tooltip opened while another is closing shows at once', 200, ({ a, b, tick, hover, leave, shown }) => {
  hover(a);
  tick(500);
  leave(a);
  hover(b);
  tick(0);
  assert.ok(shown(a), 'A is still in its exit delay');
  assert.ok(shown(b), 'B skips its enterDelay');
});

sharedDelayCase('the window follows the closing tooltip\'s exitDelay, then 300 ms more', 200, ({ a, b, tick, hover, leave, shown }) => {
  hover(a);
  tick(500);
  leave(a);
  tick(450);
  hover(b);
  tick(0);
  assert.ok(shown(b), 'inside exitDelay + 300 ms B skips its delay');
  leave(b);
  tick(560);
  hover(a);
  tick(0);
  assert.ok(!shown(a), 'past exitDelay + 300 ms A waits');
  tick(500);
  assert.ok(shown(a));
});

sharedDelayCase('a shorter exitDelay closing later does not cut the window short', 0, ({ a, b, tick, hover, leave, shown }) => {
  a.options.exitDelay = 2000;
  hover(a);
  tick(500);
  leave(a);
  hover(b);
  tick(0);
  leave(b);
  tick(0);
  tick(1);
  tick(0);
  assert.ok(!shown(b), 'B hid');
  tick(499);
  hover(b);
  tick(0);
  assert.ok(shown(a), 'A is still in its exit delay');
  assert.ok(shown(b), 'B skips its delay while A is closing');
});

sharedDelayCase('after the window, or beside a tooltip that stays open, the delay applies', 0, ({ a, b, tick, hover, leave, shown }) => {
  hover(a);
  tick(500);
  leave(a);
  tick(0);
  tick(1);
  tick(400);
  hover(b);
  tick(0);
  assert.ok(!shown(b), 'past the window B waits');
  tick(499);
  assert.ok(!shown(b));
  tick(1);
  assert.ok(shown(b));
  leave(b);
  tick(1000);
  a.open();
  tick(500);
  assert.ok(shown(a));
  hover(b);
  tick(0);
  assert.ok(!shown(b), 'an open tooltip that is not closing does not shorten the delay');
  tick(500);
  assert.ok(shown(b));
});

sharedDelayCase('a tooltip closed before it showed opens no window', 0, ({ a, b, tick, hover, leave, shown }) => {
  hover(a);
  tick(100);
  leave(a);
  hover(b);
  tick(0);
  assert.ok(!shown(b));
  tick(500);
  assert.ok(shown(b));
});

sharedDelayCase('destroying a showing tooltip opens no window', 0, ({ a, b, tick, hover, shown }) => {
  hover(a);
  tick(500);
  assert.ok(shown(a));
  a.destroy();
  hover(b);
  tick(0);
  assert.ok(!shown(b));
  tick(500);
  assert.ok(shown(b));
});

sharedDelayCase('a clock set back before the window opened is outside it', 0, ({ a, b, tick, hover, leave, shown, setClockBack }) => {
  hover(a);
  tick(500);
  leave(a);
  tick(0);
  tick(1);
  setClockBack(3_600_000);
  hover(b);
  tick(0);
  assert.ok(!shown(b));
  tick(500);
  assert.ok(shown(b));
});

// openOnClick. The delays are long so that a tooltip shown or hidden at once
// is told apart from one that waited; expressive:open and expressive:close
// fire when it actually shows and hides. Each case starts its own mocked
// clock, as the shared delay cases do, so none falls inside their window.
const slow = { text: 'Tip', enterDelay: 1000, exitDelay: 1000, inDuration: 0, outDuration: 0 };

function clickTooltip(t, root = document.body, options = { openOnClick: true }) {
  root.innerHTML = '<button id="t">Info</button><button id="other">Other</button>';
  const trigger = root.querySelector('#t');
  const seen = [];
  for (const type of ['open', 'close']) trigger.addEventListener(`expressive:${type}`, () => seen.push(type));
  sharedClock += 3_600_000;
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: sharedClock });
  const instance = Expressive.Tooltip.init(trigger, { ...slow, ...options });
  return { trigger, other: root.querySelector('#other'), instance, seen };
}

function escape() {
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
}

test('Tooltip openOnClick is off by default, and a click then shows nothing', t => {
  const { trigger, instance, seen } = clickTooltip(t, document.body, {});
  try {
    assert.equal(Expressive.Tooltip.defaults.openOnClick, false);
    assert.equal(instance.options.openOnClick, false);
    trigger.click();
    t.mock.timers.tick(2000);
    assert.deepEqual(seen, []);
  } finally {
    instance.destroy();
    t.mock.timers.reset();
  }
});

test('Tooltip openOnClick toggles at once on click, and the page still gets the click', t => {
  const { trigger, instance, seen } = clickTooltip(t);
  let clicks = 0;
  trigger.addEventListener('click', () => clicks++);
  try {
    trigger.click();
    assert.deepEqual(seen, ['open'], 'shows without waiting for enterDelay');
    t.mock.timers.tick(1);
    assert.equal(instance.tooltipEl.style.opacity, '1');
    trigger.click();
    assert.deepEqual(seen, ['open', 'close'], 'hides without waiting for exitDelay');
    t.mock.timers.tick(1);
    t.mock.timers.tick(0);
    assert.equal(instance.tooltipEl.style.visibility, 'hidden');
    assert.equal(clicks, 2);
  } finally {
    instance.destroy();
    t.mock.timers.reset();
  }
});

test('Tooltip openOnClick ignores hover and focus', t => {
  const { trigger, instance, seen } = clickTooltip(t);
  try {
    trigger.dispatchEvent(new window.MouseEvent('mouseenter'));
    t.mock.timers.tick(2000);
    // jsdom does not match :focus-visible, so keyboard focus is mocked.
    const matches = trigger.matches.bind(trigger);
    t.mock.method(trigger, 'matches', (selector) => selector === ':focus-visible' || matches(selector));
    trigger.focus();
    t.mock.timers.tick(2000);
    assert.deepEqual(seen, [], 'neither hover nor keyboard focus opens it');
    trigger.click();
    for (const el of [trigger, instance.tooltipEl]) el.dispatchEvent(new window.MouseEvent('mouseleave'));
    t.mock.timers.tick(2000);
    assert.deepEqual(seen, ['open'], 'leaving does not close it');
  } finally {
    instance.destroy();
    t.mock.timers.reset();
  }
});

test('Tooltip openOnClick closes at once on a click outside, not on one inside', t => {
  const { trigger, other, instance, seen } = clickTooltip(t);
  try {
    trigger.click();
    t.mock.timers.tick(0);
    instance.tooltipEl.click();
    assert.deepEqual(seen, ['open'], 'a click inside keeps it');
    document.body.click();
    assert.deepEqual(seen, ['open', 'close']);

    instance.open();
    t.mock.timers.tick(1000);
    document.body.click();
    assert.deepEqual(seen, ['open', 'close', 'open', 'close'], 'open() also closes on a click outside');

    other.addEventListener('click', () => instance.open());
    other.click();
    t.mock.timers.tick(1000);
    assert.deepEqual(seen.slice(4), ['open'], 'opened from a page click, it survives that click');
    instance.close();
    document.body.click();
    assert.deepEqual(seen.slice(4), ['open'], 'close() removes the outside listener');
    t.mock.timers.tick(1000);
    assert.deepEqual(seen.slice(4), ['open', 'close']);
  } finally {
    instance.destroy();
    t.mock.timers.reset();
  }
});

for (const listening of [true, false]) {
  test(`Tooltip openOnClick no longer listens for outside clicks after destroy${listening ? '' : ' before the listener arrives'}`, t => {
    const { trigger, instance, seen } = clickTooltip(t);
    try {
      trigger.click();
      if (listening) t.mock.timers.tick(0);
    } finally {
      instance.destroy();
    }
    t.mock.timers.tick(0);
    document.body.click();
    t.mock.timers.tick(2000);
    t.mock.timers.reset();
    assert.deepEqual(seen, ['open']);
  });
}

test('Tooltip openOnClick shows at once on a click while open() waits out enterDelay', t => {
  const { trigger, instance, seen } = clickTooltip(t);
  try {
    instance.open();
    t.mock.timers.tick(500);
    trigger.click();
    assert.deepEqual(seen, ['open'], 'the click shows it instead of cancelling it');
    t.mock.timers.tick(1000);
    assert.deepEqual(seen, ['open']);
  } finally {
    instance.destroy();
    t.mock.timers.reset();
  }
});

test('Tooltip openOnClick closes at once on Escape and when focus moves to another element', t => {
  const { trigger, other, instance, seen } = clickTooltip(t);
  const adds = t.mock.method(document, 'addEventListener');
  try {
    trigger.click();
    escape();
    assert.deepEqual(seen, ['open', 'close']);
    t.mock.timers.tick(0);
    assert.equal(adds.mock.calls.filter(call => call.arguments[0] === 'click').length, 0, 'closed before the task, it never listens for outside clicks');

    trigger.click();
    trigger.dispatchEvent(new window.FocusEvent('blur', { relatedTarget: null }));
    t.mock.timers.tick(2000);
    assert.deepEqual(seen, ['open', 'close', 'open'], 'a blur to nothing keeps it');
    trigger.dispatchEvent(new window.FocusEvent('blur', { relatedTarget: other }));
    assert.deepEqual(seen, ['open', 'close', 'open', 'close'], 'focus on another element closes it');
  } finally {
    instance.destroy();
    t.mock.timers.reset();
  }
});

for (const mode of ['open', 'closed']) {
  test(`Tooltip openOnClick toggles and closes from outside in a ${mode} shadow root`, t => {
    const host = document.createElement('div');
    document.body.append(host);
    const { trigger, instance, seen } = clickTooltip(t, host.attachShadow({ mode }));
    try {
      trigger.click();
      t.mock.timers.tick(0);
      instance.tooltipEl.click();
      assert.deepEqual(seen, ['open'], 'a click inside keeps it');
      trigger.click();
      assert.deepEqual(seen, ['open', 'close'], 'a second click closes it without reopening');
      trigger.click();
      t.mock.timers.tick(0);
      document.body.click();
      assert.deepEqual(seen, ['open', 'close', 'open', 'close']);
    } finally {
      instance.destroy();
      t.mock.timers.reset();
    }
  });
}

test('Tooltip openOnClick shows at once outside the shared delay, and its close lets a hover tooltip skip enterDelay', t => {
  const { trigger, other, instance, seen } = clickTooltip(t);
  const hover = Expressive.Tooltip.init(other, slow);
  const hoverSeen = [];
  other.addEventListener('expressive:open', () => hoverSeen.push('open'));
  try {
    trigger.click();
    assert.deepEqual(seen, ['open'], 'no tooltip closed before, and it still shows at once');
    trigger.click();
    other.dispatchEvent(new window.MouseEvent('mouseenter'));
    t.mock.timers.tick(0);
    assert.deepEqual(hoverSeen, ['open'], 'the hover tooltip opens inside the window the click close opened');
  } finally {
    hover.destroy();
    instance.destroy();
    t.mock.timers.reset();
  }
});
