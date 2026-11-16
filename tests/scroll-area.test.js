import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { Expressive, resetBody, window } from './setup.js';

afterEach(() => {
  Expressive.ScrollArea?.getInstance(document.documentElement)?.destroy();
  document.documentElement.className = '';
  resetBody();
});

test('ScrollArea owns two unfocusable page bars on the document element', () => {
  const root = document.documentElement;
  root.className = 'scroll-area custom';
  const first = Expressive.ScrollArea.init(root);
  let second;
  try {
    const bar = root.querySelector('.scroll-area-bar:not(.horizontal)');
    assert.deepEqual([...root.children].slice(-2).map(el => el.className), ['scroll-area-bar', 'scroll-area-bar horizontal']);
    assert.equal(bar.className, 'scroll-area-bar');
    assert.equal(bar.getAttribute('aria-hidden'), 'true');
    assert.equal(bar.children.length, 1);
    assert.equal(bar.firstElementChild.className, 'scroll-area-thumb');
    assert.equal(bar.querySelector('[tabindex]'), null);
    assert.equal(bar.hasAttribute('tabindex'), false);
    second = Expressive.ScrollArea.init(root);
    assert.equal(root.querySelectorAll('.scroll-area-bar').length, 2);
    first.destroy();
    assert.equal(Expressive.ScrollArea.getInstance(root), second);
  } finally {
    second?.destroy();
    first.destroy();
  }
  assert.equal(root.querySelector('.scroll-area-bar'), null);
  assert.equal(Expressive.ScrollArea.getInstance(root), undefined);
});

test('ScrollArea leaves an unsupported container unchanged', () => {
  const oldCSS = window.CSS;
  window.CSS = { supports: () => false };
  document.body.innerHTML = '<div class="scroll-area custom"></div>';
  const el = document.body.firstElementChild;
  const instance = Expressive.ScrollArea.init(el);
  try {
    assert.equal(el.children.length, 0);
    assert.equal(pointer(el, 'pointerdown').defaultPrevented, false);
  } finally {
    instance.destroy();
    window.CSS = oldCSS;
  }
});

test('ScrollArea uses the iframe document', () => {
  const dom = new JSDOM('<iframe></iframe>', { runScripts: 'outside-only' });
  const frame = dom.window.document.querySelector('iframe');
  frame.contentWindow.eval(readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8'));
  const root = frame.contentDocument.documentElement;
  frame.contentWindow.ResizeObserver = window.ResizeObserver;
  frame.contentWindow.matchMedia = window.matchMedia;
  root.className = 'scroll-area custom';
  Object.defineProperty(root, 'clientHeight', { get: () => 300 });
  Object.defineProperty(root, 'scrollHeight', { get: () => 900 });
  const moves = [];
  frame.contentWindow.scrollTo = options => moves.push(options);
  const instance = frame.contentWindow.Expressive.ScrollArea.init(root);
  try {
    assert.equal(root.querySelector('.scroll-area-bar:not(.horizontal)').ownerDocument, frame.contentDocument);
    assert.equal(root.querySelector('.scroll-area-bar:not(.horizontal)').className, 'scroll-area-bar');
    assert.equal(document.documentElement.querySelector(':scope > .scroll-area-bar'), null);
    const bar = root.querySelector('.scroll-area-bar:not(.horizontal)');
    bar.setPointerCapture = () => {};
    bar.hasPointerCapture = () => false;
    bar.getClientRects = () => [{}];
    pointer(bar, 'pointerdown'); pointer(bar, 'pointermove', { clientY: 150 });
    assert.equal(moves.length, 1);
    assert.equal(moves[0].top, 300);
    assert.equal(moves[0].behavior, 'instant');
  } finally {
    instance.destroy();
    dom.window.close();
  }
});

for (const timeline of [false, true]) {
  test(`ScrollArea measures and cleans up the ${timeline ? 'timeline' : 'listener'} path`, () => {
    const root = document.documentElement;
    const oldCSS = window.CSS;
    const oldRO = window.ResizeObserver;
    const oldMO = window.MutationObserver;
    const oldMatches = root.matches;
    const oldRAF = window.requestAnimationFrame;
    const oldCancel = window.cancelAnimationFrame;
    const oldAdd = window.addEventListener;
    const observers = [];
    const modalObservers = [];
    const frames = new Map();
    const listeners = [];
    let nextFrame = 0;
    let modal = false;
    root.matches = function (selector) {
      return selector === ':has(dialog:modal)' ? modal : oldMatches.call(this, selector);
    };
    window.CSS = { supports: () => timeline };
    window.ResizeObserver = class {
      constructor(callback) { this.callback = callback; this.targets = []; observers.push(this); }
      observe(el) { if (!this.targets.includes(el)) this.targets.push(el); }
      disconnect() { this.targets = []; }
    };
    window.MutationObserver = class {
      constructor(callback) { this.callback = callback; this.targets = []; modalObservers.push(this); }
      observe(el, options) { this.targets.push(el); this.options = options; }
      disconnect() { this.targets = []; }
    };
    window.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
    window.cancelAnimationFrame = id => frames.delete(id);
    window.addEventListener = function (type, fn, options) {
      if (type === 'scroll') listeners.push(options);
      return oldAdd.call(this, type, fn, options);
    };
    let height = 900;
    Object.defineProperty(root, 'clientHeight', { configurable: true, get: () => 300 });
    Object.defineProperty(root, 'scrollHeight', { configurable: true, get: () => height });
    root.scrollTop = 300;
    const instance = Expressive.ScrollArea.init(root);
    try {
      const directionObserver = modalObservers[0];
      assert.deepEqual(directionObserver.targets, [root]);
      assert.deepEqual(directionObserver.options, { attributes: true, attributeFilter: ['dir'] });
      directionObserver.callback(); directionObserver.callback();
      assert.equal(frames.size, 1);
      const directionFrame = [...frames.values()][0]; frames.clear(); directionFrame();
      assert.equal(frames.size, 0);
      const bar = root.querySelector('.scroll-area-bar');
      assert.deepEqual(observers[0].targets, [root, document.body]);
      assert.equal(bar.style.getPropertyValue('--scroll-area-thumb-length'), '100px');
      assert.equal(bar.style.getPropertyValue('--scroll-area-thumb-offset'), '100px');
      assert.equal(listeners.length, timeline ? 0 : 1);
      if (!timeline) {
        assert.equal(listeners[0].passive, true);
        root.scrollTop = 600;
        window.dispatchEvent(new window.Event('scroll'));
        window.dispatchEvent(new window.Event('scroll'));
        assert.equal(frames.size, 1);
        const callback = [...frames.values()][0]; frames.clear(); callback();
        assert.equal(bar.style.getPropertyValue('--scroll-area-thumb-offset'), '200px');
      }
      height = 1800; instance.refresh();
      assert.equal(bar.style.getPropertyValue('--scroll-area-thumb-length'), '50px');
      root.scrollTop = -20; instance.refresh();
      assert.equal(bar.style.getPropertyValue('--scroll-area-thumb-offset'), '0px');
      root.scrollTop = 60000; height = 60000; instance.refresh();
      assert.equal(bar.style.getPropertyValue('--scroll-area-thumb-length'), '48px');
      assert.equal(bar.style.getPropertyValue('--scroll-area-thumb-offset'), '252px');
      height = 300; instance.refresh(); assert.equal(bar.hidden, true);
      height = 900; instance.refresh(); assert.equal(bar.hidden, false);
      root.style.overflowY = 'hidden'; instance.refresh(); assert.equal(bar.hidden, true);
      root.style.overflowY = 'clip'; instance.refresh(); assert.equal(bar.hidden, true);
      root.style.overflowY = ''; instance.refresh(); assert.equal(bar.hidden, false);
      modal = true; root.style.overflowY = 'hidden';
      instance.refresh(); instance.refresh();
      assert.equal(bar.hidden, true);
      assert.equal(modalObservers.length, 2);
      const modalObserver = modalObservers[1];
      assert.deepEqual(modalObserver.targets, [root]);
      assert.equal(modalObserver.options.subtree, true);
      assert.equal(modalObserver.options.childList, true);
      assert.deepEqual(modalObserver.options.attributeFilter, ['open']);
      modal = false; root.style.overflowY = '';
      modalObserver.callback();
      const callback = [...frames.values()][0]; frames.clear(); callback();
      assert.equal(bar.hidden, false);
      assert.deepEqual(modalObserver.targets, []);
      modal = true; instance.refresh();
      window.dispatchEvent(new window.Event('resize'));
      assert.equal(frames.size, 1);
      instance.destroy();
      assert.equal(frames.size, 0);
      assert.equal(observers[0].targets.length, 0);
      assert.equal(modalObserver.targets.length, 0);
      assert.equal(directionObserver.targets.length, 0);
      window.dispatchEvent(new window.Event('scroll'));
      document.dispatchEvent(new window.Event('close'));
      assert.equal(frames.size, 0);
    } finally {
      instance.destroy();
      window.CSS = oldCSS; window.ResizeObserver = oldRO; window.MutationObserver = oldMO;
      root.matches = oldMatches;
      window.requestAnimationFrame = oldRAF; window.cancelAnimationFrame = oldCancel;
      window.addEventListener = oldAdd;
      delete root.clientHeight; delete root.scrollHeight;
      root.scrollTop = 0; root.style.overflowY = '';
    }
  });
}

test('AutoInit claims html only for ScrollArea and only from body', () => {
  const root = document.documentElement;
  root.className = 'scroll-area custom scrollspy';
  document.body.innerHTML = '<div id="context"></div>';
  try {
    Expressive.AutoInit(document.getElementById('context'));
    assert.equal(Expressive.ScrollArea.getInstance(root), undefined);
    root.classList.add('no-autoinit');
    Expressive.AutoInit();
    assert.equal(Expressive.ScrollArea.getInstance(root), undefined);
    root.classList.remove('no-autoinit');
    Expressive.AutoInit();
    assert.ok(Expressive.ScrollArea.getInstance(root));
    Expressive.AutoInit(document.body, {});
    assert.equal(root.querySelectorAll('.scroll-area-bar').length, 2);
    assert.equal(Expressive.ScrollSpy.getInstance(root), undefined);
  } finally {
    Expressive.ScrollArea.getInstance(root)?.destroy();
  }
});

function pointer(target, type, values = {}) {
  const event = new target.ownerDocument.defaultView.Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { pointerId: 1, isPrimary: true, button: 0, clientY: 50, pointerType: 'mouse', ...values });
  target.dispatchEvent(event);
  return event;
}

test('ScrollArea anchors capture and drag metrics until every ending', () => {
  const root = document.documentElement;
  let height = 900;
  let viewport = 300;
  Object.defineProperty(root, 'clientHeight', { configurable: true, get: () => viewport });
  Object.defineProperty(root, 'scrollHeight', { configurable: true, get: () => height });
  root.scrollTop = 0;
  const oldScroll = window.scrollTo;
  const oldBy = window.scrollBy;
  const moves = [], captures = [];
  window.scrollTo = value => moves.push(value);
  window.scrollBy = () => assert.fail('thumb press must not page');
  const area = Expressive.ScrollArea.init(root);
  const bar = root.querySelector('.scroll-area-bar:not(.horizontal)');
  let captured;
  bar.setPointerCapture = id => { captured = id; captures.push(id); };
  bar.hasPointerCapture = id => captured === id;
  bar.releasePointerCapture = () => { captured = undefined; };
  bar.getClientRects = () => [{}];
  try {
    pointer(bar.firstElementChild, 'pointerdown');
    pointer(bar, 'pointerdown', { pointerId: 2 });
    pointer(bar, 'pointermove', { pointerId: 2, clientY: 200 });
    pointer(bar, 'pointermove', { clientY: 150 });
    height = 1800;
    pointer(bar, 'pointermove', { clientY: 160 });
    assert.deepEqual(captures, [1]);
    assert.deepEqual(moves, [{ top: 300, behavior: 'instant' }, { top: 330, behavior: 'instant' }]);
    pointer(bar, 'pointerup');
    for (const ending of ['pointercancel', 'lostpointercapture']) {
      height = 900;
      pointer(bar, 'pointerdown'); pointer(bar, ending);
      pointer(bar, 'pointermove', { clientY: 200 });
      assert.equal(moves.length, 2);
    }
    for (const pointerType of ['pen', 'touch']) {
      pointer(bar, 'pointerdown', { pointerType });
      pointer(bar, 'pointermove', { pointerType, clientY: 150 });
      assert.deepEqual(moves.at(-1), { top: 300, behavior: 'instant' });
      pointer(bar, 'pointerup', { pointerType });
    }
    const count = captures.length;
    for (const values of [{ button: 2 }, { ctrlKey: true }, { isPrimary: false }]) pointer(bar, 'pointerdown', values);
    viewport = 48;
    pointer(bar, 'pointerdown', { clientY: 20 }); pointer(bar, 'pointermove');
    assert.equal(captures.length, count);
    viewport = 300;
    pointer(bar, 'pointerdown'); area.destroy();
    const ended = moves.length;
    pointer(bar, 'pointermove', { clientY: 200 });
    assert.equal(moves.length, ended);
    assert.equal(captured, undefined);
  } finally {
    area.destroy(); window.scrollTo = oldScroll; window.scrollBy = oldBy;
    delete root.clientHeight; delete root.scrollHeight; root.scrollTop = 0;
  }
});

test('ScrollArea track press pages once without capture or repeat', t => {
  const root = document.documentElement;
  Object.defineProperty(root, 'clientHeight', { configurable: true, value: 300 });
  Object.defineProperty(root, 'scrollHeight', { configurable: true, value: 900 });
  root.scrollTop = 300;
  const oldBy = window.scrollBy;
  const calls = [];
  window.scrollBy = options => calls.push(options);
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const area = Expressive.ScrollArea.init(root);
  const bar = root.querySelector('.scroll-area-bar:not(.horizontal)');
  bar.setPointerCapture = () => {};
  bar.hasPointerCapture = () => false;
  try {
    pointer(bar, 'pointerdown', { clientY: 250 });
    t.mock.timers.tick(2000);
    pointer(bar, 'pointermove', { clientY: 280 }); pointer(bar, 'pointerup');
    assert.deepEqual(calls, [{ top: 300 }]);
    pointer(bar, 'pointerdown', { clientY: 20 }); pointer(bar, 'pointerup');
    assert.deepEqual(calls, [{ top: 300 }, { top: -300 }]);
    pointer(bar.firstElementChild, 'pointerdown', { clientY: 150 });
    assert.equal(calls.length, 2);
  } finally {
    area.destroy(); t.mock.timers.reset(); window.scrollBy = oldBy;
    delete root.clientHeight; delete root.scrollHeight; root.scrollTop = 0;
  }
});


test('V1 container structure and slot keep author attributes', () => {
  for (const slot of ['', ' slot="body"']) {
    document.body.innerHTML = `<i></i><div class="scroll-area custom"${slot}><b>Content</b></div><i></i>`;
    const el = document.body.children[1];
    const children = [...el.childNodes];
    const area = Expressive.ScrollArea.init(el);
    try {
      const wrapper = document.body.children[1];
      assert.equal(wrapper.className, 'scroll-area-wrapper');
      assert.deepEqual([...wrapper.attributes].map(a => a.name).sort(), slot ? ['class', 'slot'] : ['class']);
      assert.equal(wrapper.getAttribute('slot'), slot ? 'body' : null);
      assert.equal(wrapper.firstElementChild, el);
      assert.deepEqual([...wrapper.children].map(el => el.className), ['scroll-area custom', 'scroll-area-bar', 'scroll-area-bar horizontal']);
      const horizontal = wrapper.lastElementChild;
      assert.deepEqual([...horizontal.attributes].map(a => a.name).filter(name => !['dir', 'hidden', 'style'].includes(name)).sort(), ['aria-hidden', 'class']);
      assert.equal(horizontal.getAttribute('aria-hidden'), 'true');
      assert.equal(horizontal.firstElementChild.className, 'scroll-area-thumb');
      assert.equal(horizontal.style.getPropertyValue('position-anchor'), el.style.getPropertyValue('anchor-name'));
      assert.deepEqual([...el.childNodes], children);
      const bar = wrapper.querySelector('.scroll-area-bar:not(.horizontal)');
      assert.equal(bar.className, 'scroll-area-bar');
      assert.equal(bar.getAttribute('aria-hidden'), 'true');
      assert.equal(bar.firstElementChild.className, 'scroll-area-thumb');
      assert.equal(wrapper.querySelector('[tabindex], [role]'), null);
      assert.match(el.style.getPropertyValue('anchor-name'), /^--/);
      assert.equal(bar.style.getPropertyValue('position-anchor'), el.style.getPropertyValue('anchor-name'));
    } finally { area.destroy(); }
  }
  for (const el of [document.body, document.createElement('div')]) {
    const nodes = [...el.childNodes];
    const area = Expressive.ScrollArea.init(el);
    try { assert.deepEqual([...el.childNodes], nodes); } finally { area.destroy(); }
  }
});

test('V13 container restores exact nodes, inline declarations and ownership', () => {
  for (const style of ['', ' style="anchor-name: --mine; color: red"', ' style="anchor-name: none !important; color: red"', ' style="anchor-name: --mine !important; color: red"']) {
    document.body.innerHTML = `<i></i>text<div class="scroll-area custom"${style}></div><i></i>`;
    const el = document.body.querySelector('div');
    const nodes = [...document.body.childNodes], cssText = el.style.cssText;
    const area = Expressive.ScrollArea.init(el);
    try {
      assert.equal(el.parentElement.className, 'scroll-area-wrapper');
      if (style.includes('--mine')) assert.match(el.style.getPropertyValue('anchor-name'), /^--mine, --/);
    } finally { area.destroy(); }
    assert.deepEqual([...document.body.childNodes], nodes);
    assert.equal(el.parentElement, document.body);
    assert.equal(el.style.cssText, cssText);
    assert.equal(el.hasAttribute('style'), !!style);
    area.destroy();
    let instance = Expressive.ScrollArea.init(el);
    el.parentElement.before(el); instance.destroy();
    assert.equal(document.querySelector('.scroll-area-wrapper'), null);
    instance = Expressive.ScrollArea.init(el);
    el.parentElement.remove(); instance.destroy(); instance.destroy();
    document.body.append(el);
    const first = Expressive.ScrollArea.init(el), second = Expressive.ScrollArea.init(el);
    try {
      first.destroy();
      assert.equal(Expressive.ScrollArea.getInstance(el), second);
      assert.equal(el.parentElement.className, 'scroll-area-wrapper');
    } finally { second.destroy(); first.destroy(); }
  }
});

test('V13 container preserves author anchor edits made while it lives', () => {
  for (const value of ['none', '--replacement', '--mine']) {
    for (const priority of ['', 'important']) {
      document.body.innerHTML = '<div class="scroll-area custom" style="anchor-name: --mine !important"></div>';
      const el = document.body.firstElementChild;
      const area = Expressive.ScrollArea.init(el);
      try {
        const own = el.nextElementSibling.style.getPropertyValue('position-anchor');
        el.style.setProperty('anchor-name', value === '--mine' ? `--mine, ${own}` : value, priority);
      } finally { area.destroy(); }
      assert.equal(el.style.getPropertyValue('anchor-name'), value);
      assert.equal(el.style.getPropertyPriority('anchor-name'), priority);
    }
  }
});

test('V13 a custom element can destroy or replace its instance during wrapping', () => {
  window.customElements.define('scroll-area-lifecycle', class extends window.HTMLElement {
    disconnectedCallback() {
      const action = this.onDisconnect;
      this.onDisconnect = undefined;
      action?.();
    }
  });
  for (const replace of [false, true]) for (const style of ['', ' style=""', ' style="anchor-name: --mine !important; color: red"']) {
    document.body.innerHTML = `<i></i><scroll-area-lifecycle class="scroll-area custom"${style}></scroll-area-lifecycle><i></i>`;
    const el = document.body.children[1], nodes = [...document.body.childNodes];
    const hadStyle = el.hasAttribute('style'), cssText = el.style.cssText;
    let first, replacement;
    el.onDisconnect = () => {
      Expressive.ScrollArea.getInstance(el)?.destroy();
      if (replace) replacement = Expressive.ScrollArea.init(el);
    };
    try {
      assert.doesNotThrow(() => { first = Expressive.ScrollArea.init(el); });
      assert.equal(Expressive.ScrollArea.getInstance(el), replacement);
      assert.equal(document.querySelectorAll('.scroll-area-wrapper').length, replace ? 1 : 0);
      if (replace) assert.ok(el.style.getPropertyValue('anchor-name').includes(el.nextElementSibling.style.getPropertyValue('position-anchor')));
      else assert.equal(el.hasAttribute('style'), hadStyle);
    } finally {
      Expressive.ScrollArea.getInstance(el)?.destroy();
      first?.destroy();
    }
    assert.deepEqual([...document.body.childNodes], nodes);
    assert.equal(el.hasAttribute('style'), hadStyle);
    assert.equal(el.style.cssText, cssText);
  }
});

test('V7 container visibility settles when classic gutters change the content size', () => {
  document.body.innerHTML = '<div class="scroll-area custom" style="overflow:auto;border:3px solid;padding:10px"><div></div></div>';
  const el = document.body.firstElementChild;
  let contentHeight = 295;
  let wraps = false;
  Object.defineProperties(el, {
    clientHeight: { get() { return this.nextElementSibling?.hidden ? 290 : 300; } },
    scrollHeight: { get() { return Math.max(contentHeight + (wraps && this.nextElementSibling?.hidden ? 20 : 0), this.clientHeight); } },
  });
  const area = Expressive.ScrollArea.init(el);
  try {
    for (const [height, hidden, reflow] of [[295, true, false], [900, false, false], [290, true, true], [900, false, true], [0, true, false]]) {
      contentHeight = height;
      wraps = reflow;
      for (let i = 0; i < 6; i++) {
        area.refresh();
        assert.equal(el.nextElementSibling.hidden, hidden, `content height ${height}, measurement ${i}`);
      }
    }
  } finally { area.destroy(); }
});

test('V5 container observes children and coalesces one passive scroll listener', () => {
  document.body.innerHTML='<div class="scroll-area custom"><div></div></div>';
  const el=document.body.firstElementChild;
  Object.defineProperties(el,{clientHeight:{value:300},scrollHeight:{value:900}});
  const original={ CSS:window.CSS, RO:window.ResizeObserver, raf:window.requestAnimationFrame, cancel:window.cancelAnimationFrame, add:window.addEventListener, elAdd:el.addEventListener };
  const observed=new Set(), frames=new Map(), listeners=[];
  let id=0, windowScrolls=0;
  window.CSS={supports:()=>true};
  window.ResizeObserver=class{observe(el){observed.add(el);}disconnect(){observed.clear();}};
  window.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};
  window.cancelAnimationFrame=id=>frames.delete(id);
  window.addEventListener=function(type,...rest){if(type==='scroll')windowScrolls++;return original.add.call(this,type,...rest);};
  el.addEventListener=function(type,fn,options){if(type==='scroll')listeners.push(options);return original.elAdd.call(this,type,fn,options);};
  let area, page;
  try {
    area=Expressive.ScrollArea.init(el);page=Expressive.ScrollArea.init(document.documentElement);
    assert.equal(listeners.length,1);assert.equal(listeners[0].passive,true);assert.equal(windowScrolls,0);
    assert.ok(observed.has(el.firstElementChild));assert.ok(observed.has(el));
    el.scrollTop=300;el.dispatchEvent(new window.Event('scroll'));el.dispatchEvent(new window.Event('scroll'));
    assert.equal(frames.size,1);const fn=[...frames.values()][0];frames.clear();fn();
    assert.equal(el.nextElementSibling.style.getPropertyValue('--scroll-area-thumb-offset'),'100px');
  } finally {
    area?.destroy();page?.destroy();window.CSS=original.CSS;window.ResizeObserver=original.RO;
    window.requestAnimationFrame=original.raf;window.cancelAnimationFrame=original.cancel;window.addEventListener=original.add;el.addEventListener=original.elAdd;
  }
});

function containerMetrics(el) {
  Object.defineProperties(el,{clientHeight:{value:300},scrollHeight:{value:900},clientWidth:{value:240},scrollWidth:{value:500}});
}

test('V10 container gesture uses bar-relative coordinates and its own scroll target', () => {
  document.body.innerHTML='<div class="scroll-area custom"></div>';const el=document.body.firstElementChild;containerMetrics(el);
  const original={to:window.scrollTo,by:window.scrollBy};const calls=[];
  el.scrollTo=o=>calls.push(['to',o]);el.scrollBy=o=>calls.push(['by',o]);
  const area=Expressive.ScrollArea.init(el);calls.length=0;const bar=el.nextElementSibling;
  bar.getBoundingClientRect=()=>({top:80});bar.getClientRects=()=>[{}];bar.setPointerCapture=()=>{};bar.hasPointerCapture=()=>false;
  window.scrollTo=()=>assert.fail('window scrollTo');window.scrollBy=()=>assert.fail('window scrollBy');
  try {
    pointer(bar.firstElementChild,'pointerdown',{clientY:130});pointer(bar,'pointermove',{clientY:230});pointer(bar,'pointerup');pointer(bar,'pointermove',{clientY:250});
    assert.deepEqual(calls,[['to',{top:300,behavior:'instant'}]]);
    pointer(bar,'pointerdown',{clientY:330});
    for(const values of [{button:2},{ctrlKey:true},{isPrimary:false}])pointer(bar,'pointerdown',{clientY:330,...values});
    assert.deepEqual(calls,[['to',{top:300,behavior:'instant'}],['by',{top:300}]]);
  } finally {area.destroy();window.scrollTo=original.to;window.scrollBy=original.by;}
});

test('V9 bar cancels primary clicks while other buttons and content keep native behavior', () => {
  document.body.innerHTML = '<section><div class="scroll-area custom"><span>Content</span></div></section>';
  const parent = document.body.firstElementChild, el = parent.firstElementChild;
  const area = Expressive.ScrollArea.init(el);
  const bar = el.nextElementSibling;
  let clicks = 0;
  parent.addEventListener('click', () => clicks++);
  const click = (target, values = {}) => {
    const e = new window.MouseEvent('click', {bubbles:true, cancelable:true, ...values});
    target.dispatchEvent(e);
    return e.defaultPrevented;
  };
  try {
    assert.equal(click(bar), true);
    assert.equal(click(bar.firstElementChild), true);
    assert.equal(clicks, 0);
    assert.equal(click(bar, {button:2}), false);
    assert.equal(click(bar, {ctrlKey:true}), false);
    assert.equal(click(el.firstElementChild), false);
    assert.equal(clicks, 3);
  } finally { area.destroy(); }
  assert.equal(click(bar), false);
});

test('V11 container wheel scales modes and preserves chaining, horizontal scroll and zoom', () => {
  document.body.innerHTML='<div class="scroll-area custom"></div>';const el=document.body.firstElementChild;containerMetrics(el);
  const calls=[];el.scrollBy=o=>calls.push(o);const area=Expressive.ScrollArea.init(el);const bar=el.nextElementSibling;
  const wheel=values=>{const e=new window.WheelEvent('wheel',{bubbles:true,cancelable:true,...values});bar.dispatchEvent(e);return e.defaultPrevented;};
  try {
    for(const values of [{deltaY:120},{deltaY:3,deltaMode:1},{deltaY:1,deltaMode:2},{deltaX:50}])assert.equal(wheel(values),true);
    assert.deepEqual(calls,[{top:120,left:0,behavior:'instant'},{top:120,left:0,behavior:'instant'},{top:300,left:0,behavior:'instant'},{top:0,left:50,behavior:'instant'}]);
    assert.equal(wheel({deltaY:120,ctrlKey:true}),false);el.scrollTop=600;assert.equal(wheel({deltaY:120}),false);
    assert.equal(wheel({deltaX:-10,deltaY:5}),false);assert.equal(wheel({deltaX:0,deltaY:0}),false);assert.equal(calls.length,4);
    const page=Expressive.ScrollArea.init(document.documentElement);
    try {const e=new window.WheelEvent('wheel',{cancelable:true,deltaY:120});document.documentElement.lastElementChild.dispatchEvent(e);assert.equal(e.defaultPrevented,false);}finally{page.destroy();}
  } finally {area.destroy();}
});

test('V15 iframe container uses its own element and window', () => {
  const dom=new JSDOM('<iframe></iframe>',{runScripts:'outside-only'});const frame=dom.window.document.querySelector('iframe');const win=frame.contentWindow;
  win.eval(readFileSync(new URL('../dist/js/expressive.js',import.meta.url),'utf8'));win.ResizeObserver=window.ResizeObserver;win.matchMedia=window.matchMedia;
  win.document.body.innerHTML='<div class="scroll-area custom"></div>';const el=win.document.body.firstElementChild;containerMetrics(el);
  const moves=[];el.scrollTo=o=>moves.push(o);win.scrollTo=()=>assert.fail('iframe window must not scroll');
  const area=win.Expressive.ScrollArea.init(el);moves.length=0;
  try {
    const bar=el.nextElementSibling;bar.getClientRects=()=>[{}];bar.setPointerCapture=()=>{};bar.hasPointerCapture=()=>false;
    pointer(bar,'pointerdown');pointer(bar,'pointermove',{clientY:150});
    assert.equal(moves.length,1);assert.equal(moves[0].top,300);assert.equal(moves[0].behavior,'instant');
    assert.equal(bar.ownerDocument,win.document);
  } finally {area.destroy();dom.window.close();}
});

const turns = async () => {await new Promise(resolve=>setTimeout(resolve,0));await new Promise(resolve=>setTimeout(resolve,0));};
test('V14 AutoInit watcher retains wrapped instances and restores removed markup', async () => {
  document.body.innerHTML='<div id="host"><div class="scroll-area custom"></div><div class="scroll-area custom no-autoinit"></div></div>';
  const host=document.querySelector('#host'),el=host.firstElementChild;let stop;
  try {
    Expressive.AutoInit();assert.equal(host.querySelectorAll('.scroll-area-wrapper').length,1);
    Expressive.AutoInit();assert.equal(host.querySelectorAll('.scroll-area-wrapper').length,1);
    Expressive.ScrollArea.init(el);Expressive.ScrollArea.init(el);assert.equal(host.querySelectorAll('.scroll-area-wrapper').length,1);
    assert.equal(host.lastElementChild.className,'scroll-area custom no-autoinit');
    stop=Expressive.AutoInit(document.body,undefined,{watch:true});
    const parent=document.createElement('div');parent.innerHTML='<div class="scroll-area custom"></div>';host.append(parent);const added=parent.firstElementChild;
    await turns();const first=Expressive.ScrollArea.getInstance(added);assert.ok(first);assert.equal(parent.querySelectorAll('.scroll-area-wrapper').length,1);
    await turns();assert.equal(Expressive.ScrollArea.getInstance(added),first);assert.equal(parent.querySelectorAll('.scroll-area-wrapper .scroll-area-wrapper').length,0);
    parent.remove();await turns();assert.equal(Expressive.ScrollArea.getInstance(added),undefined);assert.equal(parent.querySelector('.scroll-area-wrapper'),null);
    const old=Expressive.ScrollArea.getInstance(el);old.destroy();await turns();assert.ok(Expressive.ScrollArea.getInstance(el));assert.notEqual(Expressive.ScrollArea.getInstance(el),old);assert.equal(el.parentElement.className,'scroll-area-wrapper');
    el.classList.remove('custom');Expressive.ScrollArea.getInstance(el).destroy();await turns();assert.equal(Expressive.ScrollArea.getInstance(el),undefined);assert.equal(el.parentElement,host);
  } finally {
    stop?.();for(const el of document.querySelectorAll('.scroll-area'))Expressive.ScrollArea.getInstance(el)?.destroy();
  }
});

test('V11 RTL wheel forwarding follows the negative scrollLeft range', () => {
  document.body.innerHTML='<div class="scroll-area custom" style="direction:rtl"></div>';const el=document.body.firstElementChild;containerMetrics(el);
  const calls=[];el.scrollBy=o=>calls.push(o);const area=Expressive.ScrollArea.init(el);
  const wheel=deltaX=>{const e=new window.WheelEvent('wheel',{cancelable:true,deltaX});el.nextElementSibling.dispatchEvent(e);return e.defaultPrevented;};
  try {
    assert.equal(wheel(50),false);assert.equal(wheel(-50),true);el.scrollLeft=-260;assert.equal(wheel(-50),false);assert.equal(wheel(50),true);
    assert.deepEqual(calls,[{top:0,left:-50,behavior:'instant'},{top:0,left:50,behavior:'instant'}]);
  } finally {area.destroy();}
});


test('horizontal V7 both axes are read in the gutter-free candidate state', () => {
  for (const model of ['horizontal-gutter', 'vertical-gutter', 'text-reflow']) {
    document.body.innerHTML = '<div class="scroll-area custom"></div>';
    const el = document.body.firstElementChild;
    let badReads = 0;
    const native = () => {
      const bars = [...el.parentElement.querySelectorAll('.scroll-area-bar')];
      const hidden = bars.length === 2 && bars.every(bar => bar.hidden);
      if (hidden) badReads++;
      return hidden;
    };
    Object.defineProperties(el, {
      clientHeight: { get: () => native() ? 290 : 300 },
      clientWidth: { get: () => native() ? 230 : 240 },
      scrollHeight: { get: () => model === 'text-reflow' && native() ? 320 : 295 },
      scrollWidth: { get: () => model === 'vertical-gutter' ? 235 : 230 },
    });
    const area = Expressive.ScrollArea.init(el);
    try {
      for (let i = 0; i < 12; i++) {
        area.refresh();
        assert.deepEqual([...el.parentElement.querySelectorAll('.scroll-area-bar')].map(bar => bar.hidden), [true, true], model);
      }
      assert.equal(badReads, 0, model);
    } finally { area.destroy(); }
  }
});

function horizontalFixture(height = 300) {
  document.body.innerHTML = '<div class="scroll-area custom"></div>';
  const el = document.body.firstElementChild;
  Object.defineProperties(el, { clientHeight: { value:300 }, scrollHeight:{ value:height }, clientWidth:{ value:240 }, scrollWidth:{ value:720 } });
  const moves=[],pages=[]; el.scrollTo=value=>moves.push(value); el.scrollBy=value=>pages.push(value);
  const area=Expressive.ScrollArea.init(el), bars=[...el.parentElement.querySelectorAll('.scroll-area-bar')];
  bars[0].style.inlineSize='12px'; area.refresh(); moves.length=0;
  for(const bar of bars) {bar.getClientRects=()=>[{}];bar.setPointerCapture=()=>{};bar.hasPointerCapture=()=>false;bar.getBoundingClientRect=()=>({left:80,top:0});}
  return {el,area,bars,moves,pages};
}

test('horizontal V11 drag and track press write only the inline axis', () => {
  const {area,bars,moves,pages}=horizontalFixture();const bar=bars[1];
  try {
    pointer(bar,'pointerdown',{clientX:120});pointer(bar,'pointermove',{clientX:200});pointer(bar,'pointerup');pointer(bar,'pointermove',{clientX:250});
    assert.deepEqual(moves,[{left:240,behavior:'instant'}]);pointer(bar,'pointerdown',{clientX:280});
    for(const values of [{button:2},{ctrlKey:true},{isPrimary:false}])pointer(bar,'pointerdown',{clientX:280,...values});
    assert.deepEqual(pages,[{left:240}]);
  } finally {area.destroy();}
});
test('horizontal V11 one drag owns both bars and keeps the pressed ratio', () => {
  const {area,bars,moves,pages}=horizontalFixture(900);const [vertical,horizontal]=bars;
  let captures=0;horizontal.setPointerCapture=()=>captures++;
  try {
    assert.deepEqual(bars.map(bar=>bar.style.getPropertyValue('--scroll-area-thumb-length')),['96px','76px']);
    pointer(vertical,'pointerdown',{clientY:48});pointer(horizontal,'pointerdown',{clientX:200});pointer(vertical,'pointermove',{clientY:144});
    assert.equal(captures,0);assert.deepEqual(pages,[]);assert.deepEqual(moves,[{top:300,behavior:'instant'}]);
    pointer(vertical,'pointerup');pointer(horizontal,'pointerdown',{clientX:118});pointer(horizontal,'pointermove',{clientX:194});
    assert.deepEqual(moves.at(-1),{left:240,behavior:'instant'});
  } finally {area.destroy();}
});
test('horizontal V13 wheel forwards the original deltas and page bars stay native', () => {
  const {el,area,bars,pages}=horizontalFixture(900);const wheel=(bar,values)=>{const e=new window.WheelEvent('wheel',{cancelable:true,...values});bar.dispatchEvent(e);return e.defaultPrevented;};
  try {
    assert.equal(wheel(bars[1],{deltaX:50}),true);assert.equal(wheel(bars[1],{deltaY:120}),true);
    assert.deepEqual(pages,[{left:50,top:0,behavior:'instant'},{left:0,top:120,behavior:'instant'}]);
    assert.equal(wheel(bars[1],{deltaX:50,ctrlKey:true}),false);el.scrollLeft=480;assert.equal(wheel(bars[1],{deltaX:50}),false);assert.equal(pages.length,2);
    const page=Expressive.ScrollArea.init(document.documentElement);
    try {for(const bar of document.documentElement.querySelectorAll(':scope > .scroll-area-bar'))assert.equal(wheel(bar,{deltaX:50}),false);}finally{page.destroy();}
  } finally {area.destroy();}
});
test('horizontal V15 iframe container drags its own inline axis', () => {
  const dom=new JSDOM('<iframe></iframe>',{runScripts:'outside-only'}),win=dom.window.document.querySelector('iframe').contentWindow;
  win.eval(readFileSync(new URL('../dist/js/expressive.js',import.meta.url),'utf8'));win.ResizeObserver=window.ResizeObserver;win.matchMedia=window.matchMedia;
  win.document.body.innerHTML='<div class="scroll-area custom"></div>';const el=win.document.body.firstElementChild;
  Object.defineProperties(el,{clientHeight:{value:300},scrollHeight:{value:300},clientWidth:{value:240},scrollWidth:{value:720}});
  const calls=[];el.scrollTo=value=>calls.push(value);win.scrollTo=()=>assert.fail('parent window must not scroll');const area=win.Expressive.ScrollArea.init(el);calls.length=0;
  try {const bar=el.parentElement.querySelector('.horizontal');bar.getClientRects=()=>[{}];bar.setPointerCapture=()=>{};bar.hasPointerCapture=()=>false;pointer(bar,'pointerdown',{clientX:40});pointer(bar,'pointermove',{clientX:120});assert.equal(calls.length,1);assert.equal(calls[0].left,240);assert.equal(calls[0].top,undefined);assert.equal(calls[0].behavior,'instant');}finally{area.destroy();dom.window.close();}
});

test('horizontal V7 commits both visibility flags before writing either thumb', () => {
  document.body.innerHTML='<div class="scroll-area custom"></div>';const el=document.body.firstElementChild;
  let height=900,width=720;
  Object.defineProperties(el,{clientHeight:{value:300},scrollHeight:{get:()=>height},clientWidth:{value:240},scrollWidth:{get:()=>width}});
  const area=Expressive.ScrollArea.init(el),bars=[...el.parentElement.querySelectorAll('.scroll-area-bar')],write=bars[0].style.setProperty;
  let flags;
  bars[0].style.setProperty=function(name,...args){if(name==='--scroll-area-thumb-length')flags=bars.map(bar=>bar.hidden);return write.call(this,name,...args);};
  try {height=300;width=240;area.refresh();assert.deepEqual(flags,[true,true]);}finally{area.destroy();}
});
