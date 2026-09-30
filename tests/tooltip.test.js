import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody } from './setup.js';

afterEach(resetBody);

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
