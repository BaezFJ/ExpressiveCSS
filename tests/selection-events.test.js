// Selection and change events: each follows its on… callback, carries what was
// chosen in detail, and is skipped when the callback already moved on.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody, fire, window } from './setup.js';

/** Records `expressive:<type>` events that reach `root`, with their detail. */
function record(root, ...types) {
  const seen = [];
  const listeners = types.map((type) => [`expressive:${type}`, (e) => seen.push([type, e.detail])]);
  listeners.forEach(([type, listener]) => root.addEventListener(type, listener));
  return { seen, stop: () => listeners.forEach(([type, listener]) => root.removeEventListener(type, listener)) };
}

const TABS = '<nav class="tabs"><a href="#one">One</a><a href="#two">Two</a><a href="#three">Three</a></nav><section id="one">1</section><section id="two">2</section><section id="three">3</section>';

beforeEach(resetBody);

test('tabs fire change with the panel once the old one is hidden', () => {
  document.body.innerHTML = TABS;
  const nav = document.querySelector('.tabs');
  const two = document.getElementById('two');
  const calls = [];
  const { seen, stop } = record(document, 'change');
  const instance = Expressive.Tabs.init(nav, { onShow: (panel) => calls.push(panel) });
  let active;
  nav.addEventListener('expressive:change', () => { active = document.querySelectorAll('#one.active, #two.active, #three.active').length; });
  try {
    nav.querySelectorAll('a')[1].click();
    assert.deepEqual(calls, [two]);
    assert.deepEqual(seen, [['change', { panel: two }]]);
    assert.equal(active, 1, 'one panel is active when the event fires');
  } finally {
    stop();
    instance.destroy();
  }
});

test('tabs skip a change the onShow callback replaced', () => {
  document.body.innerHTML = TABS;
  const nav = document.querySelector('.tabs');
  const { seen, stop } = record(document, 'change');
  let redirected = false;
  const instance = Expressive.Tabs.init(nav, {
    onShow: () => { if (!redirected) { redirected = true; instance.select('three'); } }
  });
  try {
    nav.querySelectorAll('a')[1].click();
    assert.deepEqual(seen.map(([, d]) => d.panel.id), ['three']);
  } finally {
    stop();
    instance.destroy();
  }
});

test('a carousel fires change with the new item', () => {
  document.body.innerHTML = '<div class="carousel"><a class="carousel-item" href="#a">a</a><a class="carousel-item" href="#b">b</a><a class="carousel-item" href="#c">c</a></div>';
  const el = document.querySelector('.carousel');
  const { seen, stop } = record(el, 'change');
  const instance = Expressive.Carousel.init(el, { duration: 0 });
  try {
    seen.length = 0;
    instance.next();
    assert.equal(seen.length, 1);
    assert.equal(seen[0][1].item, instance.images[instance.center]);
    assert.equal(seen[0][1].dragged, false);
  } finally {
    stop();
    instance.destroy();
  }
});

test('chips fire chip-add, chip-select and chip-delete, and callbacks get the instance as this', () => {
  document.body.innerHTML = '<div class="chips"></div>';
  const el = document.querySelector('.chips');
  const selves = [];
  const { seen, stop } = record(el, 'chip-add', 'chip-select', 'chip-delete');
  const instance = Expressive.Chips.init(el, { onChipAdd() { selves.push(this); } });
  try {
    instance.addChip({ id: 'apple' });
    const chip = instance._chips[0];
    instance.selectChip(0);
    instance.deleteChip(0);
    assert.deepEqual(seen, [['chip-add', { chip }], ['chip-select', { chip }], ['chip-delete', { chip }]]);
    assert.deepEqual(selves, [instance]);
  } finally {
    stop();
    instance.destroy();
  }
});

test('a chip deleted by onChipAdd reports only its deletion', () => {
  document.body.innerHTML = '<div class="chips"></div>';
  const el = document.querySelector('.chips');
  const { seen, stop } = record(el, 'chip-add', 'chip-delete');
  const instance = Expressive.Chips.init(el, { onChipAdd() { this.deleteChip(0); } });
  try {
    instance.addChip({ id: 'apple' });
    assert.deepEqual(seen.map(([type]) => type), ['chip-delete']);
  } finally {
    stop();
    instance.destroy();
  }
});

test('a datepicker fires select with the date, and none when told not to', () => {
  document.body.innerHTML = '<input type="text" class="date-picker">';
  const input = document.querySelector('.date-picker');
  const { seen, stop } = record(input, 'select');
  const instance = Expressive.Datepicker.init(input);
  try {
    instance.setDate(new Date(2026, 3, 9), true);
    assert.equal(seen.length, 0);
    instance.setDate(new Date(2026, 3, 10));
    assert.equal(seen.length, 1);
    assert.equal(seen[0][1].date.getDate(), 10);
  } finally {
    stop();
    instance.destroy();
  }
});

test('a datepicker skips a select its onSelect replaced', () => {
  document.body.innerHTML = '<input type="text" class="date-picker">';
  const input = document.querySelector('.date-picker');
  const { seen, stop } = record(input, 'select');
  let again = false;
  const instance = Expressive.Datepicker.init(input, {
    onSelect() { if (!again) { again = true; this.setDate(new Date(2026, 3, 20)); } }
  });
  try {
    instance.setDate(new Date(2026, 3, 10));
    assert.deepEqual(seen.map(([, d]) => d.date.getDate()), [20]);
  } finally {
    stop();
    instance.destroy();
  }
});

test('an autocomplete fires autocomplete with the values, beside its menu select', () => {
  document.body.innerHTML = '<div class="field"><input class="autocomplete" type="text" id="ac"></div>';
  const el = document.getElementById('ac');
  const { seen, stop } = record(el, 'autocomplete', 'select');
  const instance = Expressive.Autocomplete.init(el, { data: [{ id: 'pear', text: 'Pear' }] });
  try {
    const li = instance.container.querySelector('li[data-id="pear"]');
    fire(li, 'click');
    const types = seen.map(([type]) => type);
    assert.ok(types.includes('select'), 'the hosted menu reports the item');
    assert.deepEqual(seen.find(([type]) => type === 'select')[1], { item: li });
    assert.deepEqual(seen.filter(([type]) => type === 'autocomplete').map(([, d]) => d.values.map((v) => v.id)), [['pear']]);
  } finally {
    stop();
    instance.destroy();
  }
});

test('a time picker fires confirm and cancel', () => {
  document.body.innerHTML = '<input type="text" class="time-picker">';
  const input = document.querySelector('.time-picker');
  const { seen, stop } = record(input, 'confirm', 'cancel');
  const instance = Expressive.Timepicker.init(input, { duration: 0, vibrate: false });
  try {
    fire(input, 'click');
    instance.confirm();
    fire(input, 'click');
    instance.cancel();
    assert.deepEqual(seen.map(([type]) => type), ['confirm', 'cancel']);
  } finally {
    stop();
    instance.destroy();
  }
});

test('a datepicker skips a select its onSelect silently replaced', () => {
  document.body.innerHTML = '<input type="text" class="date-picker">';
  const input = document.querySelector('.date-picker');
  const { seen, stop } = record(input, 'select');
  const instance = Expressive.Datepicker.init(input, { onSelect() { this.setDate(new Date(2026, 3, 20), true); } });
  try {
    instance.setDate(new Date(2026, 3, 10));
    assert.equal(instance.date.getDate(), 20);
    assert.deepEqual(seen, [], 'no event names the replaced date');
  } finally {
    stop();
    instance.destroy();
  }
});

test('an autocomplete reports once when a change listener selects another option', () => {
  document.body.innerHTML = '<div class="field"><input class="autocomplete" type="text" id="ac"></div>';
  const el = document.getElementById('ac');
  const calls = [];
  const { seen, stop } = record(el, 'autocomplete');
  const instance = Expressive.Autocomplete.init(el, {
    data: [{ id: 'pear', text: 'Pear' }, { id: 'apple', text: 'Apple' }],
    onAutocomplete: (values) => calls.push(values.map((v) => v.id).join())
  });
  el.addEventListener('change', () => instance.selectOption('apple'), { once: true });
  try {
    instance.selectOption('pear');
    assert.deepEqual(seen.map(([, d]) => d.values.map((v) => v.id).join()), ['apple']);
    assert.deepEqual(calls, ['apple']);
  } finally {
    stop();
    instance.destroy();
  }
});

for (const via of ['listener', 'callback']) {
  test(`a carousel ends on the item its change ${via} moved to`, () => {
    document.body.innerHTML = '<div class="carousel"><a class="carousel-item" href="#a">a</a><a class="carousel-item" href="#b">b</a><a class="carousel-item" href="#c">c</a></div>';
    const el = document.querySelector('.carousel');
    let redirected = false;
    const redirect = () => { if (!redirected) { redirected = true; instance.set(2); } };
    const instance = Expressive.Carousel.init(el, { duration: 0, onCycleTo: via === 'callback' ? redirect : null });
    if (via === 'listener') el.addEventListener('expressive:change', redirect);
    const targets = [];
    const scroll = instance._scrollToIndex.bind(instance);
    instance._scrollToIndex = (n, ...rest) => { targets.push(n); return scroll(n, ...rest); };
    try {
      instance.set(1);
      assert.equal(instance.center, 2);
      assert.deepEqual(targets, [2], 'the outer set(1) does not scroll back');
    } finally {
      el.removeEventListener('expressive:change', redirect);
      instance.destroy();
    }
  });
}

for (const swipeable of [false, true]) {
  test(`${swipeable ? 'swipeable' : 'plain'} tabs destroyed by a change listener stop without errors`, () => {
    document.body.innerHTML = TABS;
    const nav = document.querySelector('.tabs');
    const errors = [];
    const onError = (e) => errors.push(e.error ?? e.message);
    window.addEventListener('error', onError);
    const instance = Expressive.Tabs.init(nav, { swipeable });
    nav.addEventListener('expressive:change', () => instance.destroy(), { once: true });
    try {
      nav.querySelectorAll('a')[1].click();
      assert.deepEqual(errors, []);
      assert.equal(Expressive.Tabs.getInstance(nav), undefined);
    } finally {
      window.removeEventListener('error', onError);
      Expressive.Tabs.getInstance(nav)?.destroy();
    }
  });
}
