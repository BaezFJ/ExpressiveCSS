import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, window, resetBody } from './setup.js';

test('ScrollArea reinitialization unwraps once and stale teardown leaves the replacement intact', () => {
  resetBody();
  document.body.innerHTML = '<div id="parent"><div class="scroll-area custom" style="margin:10px;grid-column:2" tabindex="0" role="region" aria-label="Tags">Tags</div><button>After</button></div>';
  const el = document.querySelector('.scroll-area');
  const before = el.style.cssText;
  let first, second;
  try {
    first = Expressive.ScrollArea.init(el);
    second = Expressive.ScrollArea.init(el);
    first.destroy();
    assert.equal(Expressive.ScrollArea.getInstance(el), second);
    assert.equal(document.querySelectorAll('.scroll-area-frame').length,1);
    assert.equal(document.querySelectorAll('.scroll-area-bar').length,2);
    assert.equal(el.getAttribute('tabindex'),'0');
    second.destroy();
    assert.equal(el.parentElement.id,'parent');
    assert.equal(el.nextElementSibling.tagName,'BUTTON');
    assert.equal(el.style.cssText,before);
    assert.equal(Expressive.ScrollArea.getInstance(el), undefined);
  } finally {
    second?.destroy(); first?.destroy(); resetBody();
  }
});

test('ScrollArea cancels pending measurements and idle timers on destroy', () => {
  resetBody();
  const original = { raf:window.requestAnimationFrame,cancel:window.cancelAnimationFrame,timeout:window.setTimeout,clear:window.clearTimeout };
  const frames = new Map(), timers = new Map();
  let id=0, area;
  window.requestAnimationFrame = callback => { frames.set(++id,callback); return id; };
  window.cancelAnimationFrame = key => frames.delete(key);
  window.setTimeout = callback => { timers.set(++id,callback); return id; };
  window.clearTimeout = key => timers.delete(key);
  try {
    document.body.innerHTML = '<div class="scroll-area custom">Content</div>';
    const el=document.body.firstElementChild;
    area=Expressive.ScrollArea.init(el);
    assert.equal(frames.size,1);
    const [key,callback]=frames.entries().next().value;
    frames.delete(key); callback();
    assert.equal(timers.size,1);
    area.refresh();
    area.destroy();
    assert.equal(timers.size,0);
    assert.equal(frames.size,0);
    area.refresh();
    el.dispatchEvent(new window.Event('scroll'));
    assert.equal(timers.size,0);
    assert.equal(frames.size,0);
  } finally {
    area?.destroy();
    Object.assign(window,{requestAnimationFrame:original.raf,cancelAnimationFrame:original.cancel,setTimeout:original.timeout,clearTimeout:original.clear});
    resetBody();
  }
});

test('ScrollArea teardown handles detached frames and an author moving the scrollport', () => {
  resetBody();
  let area;
  try {
    document.body.innerHTML='<div class="scroll-area custom">Tags</div><div id="destination"></div>';
    const el=document.body.firstElementChild;
    area=Expressive.ScrollArea.init(el);
    el.parentElement.remove();
    area.destroy();
    assert.equal(el.parentNode,null,'a removed wrapper must not retain its scrollport');
    document.body.prepend(el);
    area=Expressive.ScrollArea.init(el);
    document.getElementById('destination').append(el);
    area.destroy();
    assert.equal(el.parentElement.id,'destination','destroy must preserve an author move');
    assert.equal(document.querySelectorAll('.scroll-area-frame').length,0);
  } finally {
    area?.destroy(); resetBody();
  }
});
