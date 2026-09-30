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
