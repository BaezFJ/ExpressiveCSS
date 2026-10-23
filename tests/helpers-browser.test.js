import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const browserTest = existsSync(chromium.executablePath()) ? test : test.skip;

browserTest('visually-hidden text is off screen but still names its link', async () => {
  const browser = await leaseBrowser(chromium);
  try {
    const page = await browser.newPage();
    // An unlayered consumer rule beats every layered declaration unless it is
    // important, which is why the utility is.
    await page.setContent(`<style>${css} .note { position: relative; padding: 8px; }</style>
      <a href="#orders-42">View<span id="hidden" class="visually-hidden note"> order 42</span></a>`);
    const hidden = await page.locator('#hidden').evaluate((el) => {
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return { width: box.width, height: box.height, position: style.position, clipPath: style.clipPath, overflow: style.overflow };
    });
    assert.deepEqual(hidden, { width: 1, height: 1, position: 'absolute', clipPath: 'inset(50%)', overflow: 'hidden' });
    assert.equal(await page.getByRole('link', { name: 'View order 42' }).count(), 1);
  } finally {
    await browser.close();
  }
});

browserTest('a plain fieldset drops its container and puts the legend at the content start', async () => {
  const browser = await leaseBrowser(chromium);
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>${css}</style>
      <div id="surface" style="width: 320px">
        <fieldset id="outlined"><legend>Outlined</legend><label><input type="radio" name="a">One</label></fieldset>
        <fieldset id="plain" class="plain"><legend id="legend">Delivery</legend><label id="option"><input type="radio" name="b">Daily</label></fieldset>
      </div>`);
    const geometry = await page.evaluate(() => {
      const rect = (id) => document.getElementById(id).getBoundingClientRect();
      const style = getComputedStyle(document.getElementById('plain'));
      const legend = getComputedStyle(document.getElementById('legend'));
      return {
        border: style.borderTopWidth,
        padding: style.padding,
        margin: style.margin,
        background: style.backgroundColor,
        legendPadding: legend.paddingInlineStart,
        legendMargin: legend.marginInlineStart,
        fieldsetLeft: rect('plain').left,
        legendLeft: rect('legend').left,
        optionLeft: rect('option').left,
        width: rect('plain').width,
        surfaceWidth: rect('surface').width
      };
    });
    assert.equal(geometry.border, '0px');
    assert.equal(geometry.padding, '0px');
    assert.equal(geometry.margin, '0px');
    assert.equal(geometry.background, 'rgba(0, 0, 0, 0)');
    assert.equal(geometry.legendPadding, '0px');
    assert.equal(geometry.legendMargin, '0px');
    assert.equal(geometry.legendLeft, geometry.fieldsetLeft);
    assert.equal(geometry.optionLeft, geometry.fieldsetLeft);
    assert.equal(geometry.width, geometry.surfaceWidth);
  } finally {
    await browser.close();
  }
});

for (const [engine, browserType, utilityTest] of engines) {

  utilityTest(`opacity helpers set their documented values and beat component opacity (${engine})`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      const steps = { 0: '0', 25: '0.25', 38: '0.38', 50: '0.5', 75: '0.75', 100: '1' };
      await page.setContent(`<style>${css}</style>
        ${Object.keys(steps).map(step => `<div id="step-${step}" class="opacity-${step}">Text</div>`).join('')}
        <input id="disabled" type="range" disabled>
        <input id="full" class="opacity-100" type="range" disabled>
        <input id="half" class="opacity-50" type="range" disabled>`);
      const opacity = id => page.locator(`#${id}`).evaluate(el => getComputedStyle(el).opacity);
      for (const [step, value] of Object.entries(steps)) assert.equal(await opacity(`step-${step}`), value, `.opacity-${step}`);
      assert.deepEqual([await opacity('disabled'), await opacity('full'), await opacity('half')], ['0.38', '1', '0.5']);
      // Page CSS outside any layer still wins over the utility.
      await page.addStyleTag({ content: '#full { opacity: 0.6; }' });
      assert.equal(await opacity('full'), '0.6');
    } finally {
      await browser.close();
    }
  });

  utilityTest(`sizing helpers let nested flex and grid content shrink and scroll (${engine})`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${css}
        .horizontal { width: 240px; }
        .grid-layout { display: grid; grid-template-columns: 1fr 40px; }
      </style>
        ${['flex', 'grid-layout'].map((layout, i) => `<div class="horizontal ${layout}">
          <div id="cell-${i}" class="flex-1 min-w-0"><div id="scroll-${i}" class="overflow-x-auto text-nowrap">${'long-content-'.repeat(30)}</div></div>
          <div class="flex-none" style="width: 40px">End</div>
        </div>`).join('')}
        <div class="flex flex-column" style="height: 100px">
          <div class="flex-none" style="height: 20px">Header</div>
          <div id="panel" class="flex-1 min-h-0">
            <div id="vertical" class="overflow-y-auto" style="height: 100%"><div style="height: 240px">Scrollable content</div></div>
          </div>
        </div>
        <div id="clipped" class="overflow-hidden" style="width: 100px; height: 20px"><div style="width: 200px; height: 200px">Clipped content</div></div>`);
      for (const i of [0, 1]) {
        assert.equal(await page.locator(`#cell-${i}`).evaluate(el => el.clientWidth), 200);
        assert.ok(await page.locator(`#scroll-${i}`).evaluate(el => {
          el.scrollLeft = 50;
          return el.scrollWidth > el.clientWidth && el.scrollLeft === 50;
        }), `${i === 0 ? 'flex' : 'grid'} content must scroll within its allocated width`);
      }
      assert.equal(await page.locator('#panel').evaluate(el => el.clientHeight), 80);
      assert.ok(await page.locator('#vertical').evaluate(el => {
        el.scrollTop = 50;
        return el.scrollHeight > el.clientHeight && el.scrollTop === 50;
      }));
      assert.equal(await page.locator('#clipped').evaluate(el => getComputedStyle(el).overflow), 'hidden');
    } finally {
      await browser.close();
    }
  });

  utilityTest(`logical spacing and alignment follow LTR and RTL (${engine})`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${css} html { font-size: 16px; } .consumer { margin: 0; padding: 0; }</style>
        <div id="direction" style="text-align: center">
          <div id="spacing" class="consumer ms-2 me-4 ps-1 pe-3"></div>
          <div class="flex" style="width: 200px"><div id="trailing" class="ms-auto" style="width: 40px">End</div></div>
          <div class="flex" style="width: 200px"><div id="leading" class="me-auto" style="width: 40px">Start</div></div>
          <div id="start" class="start-align" style="width: 200px"><span>Text</span></div>
          <div id="end" class="end-align" style="width: 200px"><span>Text</span></div>
        </div>`);
      for (const direction of ['ltr', 'rtl']) {
        await page.locator('#direction').evaluate((el, value) => el.dir = value, direction);
        assert.deepEqual(await page.locator('#spacing').evaluate(el => {
          const style = getComputedStyle(el);
          return [style.marginLeft, style.marginRight, style.paddingLeft, style.paddingRight];
        }), direction === 'ltr' ? ['8px', '16px', '4px', '12px'] : ['16px', '8px', '12px', '4px']);
        for (const [id, right] of [['trailing', direction === 'ltr'], ['leading', direction === 'rtl'], ['start', direction === 'rtl'], ['end', direction === 'ltr']]) {
          assert.ok(await page.locator(`#${id}`).evaluate((el, right) => {
            const text = el.firstElementChild;
            const box = (text ?? el).getBoundingClientRect();
            const container = (text ? el : el.parentElement).getBoundingClientRect();
            return Math.abs(right ? box.right - container.right : box.left - container.left) < 1;
          }, right), `${id} should follow ${direction}`);
        }
      }
    } finally {
      await browser.close();
    }
  });

  utilityTest(`text helpers wrap long values without clipping and restore inherited wrapping (${engine})`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      const value = 'unbrokenvalue'.repeat(12);
      await page.setContent(`<style>${css} .text-fixture { width: 120px; font: 20px/20px monospace; }</style>
        <div class="text-fixture text-nowrap"><div id="wrapped" class="break-words text-wrap">${value}</div></div>
        <div id="nowrap" class="text-fixture text-nowrap">A label with several words</div>`);
      assert.deepEqual(await page.locator('#wrapped').evaluate(el => {
        const style = getComputedStyle(el);
        return { wraps: el.clientHeight > 20, fits: el.scrollWidth <= el.clientWidth, overflow: style.overflow, clipPath: style.clipPath, text: el.textContent };
      }), { wraps: true, fits: true, overflow: 'visible', clipPath: 'none', text: value });
      assert.deepEqual(await page.locator('#nowrap').evaluate(el => [el.clientHeight, el.scrollWidth > el.clientWidth]), [20, true]);
    } finally {
      await browser.close();
    }
  });

  utilityTest(`line clamp classes cut text to whole lines and line-clamp-none restores it (${engine})`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      const classes = ['line-clamp-1', 'line-clamp-2', 'line-clamp-3', 'line-clamp-2 line-clamp-none', ''];
      await page.setContent(`<style>${css} .clamp-fixture { width: 240px; margin: 0; font: 16px/20px sans-serif; }</style>
        ${classes.map(name => `<p class="clamp-fixture ${name}">${'A paragraph long enough to wrap onto many lines. '.repeat(12)}</p>`).join('')}`);
      const [one, two, three, none, full] = await page.locator('p').evaluateAll(els => els.map(el => {
        const style = getComputedStyle(el);
        // The height alone can't tell: without hidden overflow the cut lines
        // still paint below the clamped box.
        return { height: el.getBoundingClientRect().height, clamp: style.getPropertyValue('-webkit-line-clamp'), overflow: style.overflow };
      }));
      for (const [lines, { height, clamp, overflow }] of [one, two, three].entries()) {
        assert.ok(Math.abs(height - 20 * (lines + 1)) <= 1, `line-clamp-${lines + 1} height ${height}`);
        assert.deepEqual([clamp, overflow], [String(lines + 1), 'hidden']);
      }
      assert.ok(full.height > 60, `unclamped height ${full.height}`);
      assert.deepEqual(none, full);
    } finally {
      await browser.close();
    }
  });

  utilityTest(`unstyled lists drop markers and indentation and stay lists (${engine})`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      const items = '<li>One</li><li>Two<ul><li>Inner</li></ul></li><li>Three</li>';
      await page.setContent(`<style>${css}</style>
        <div><ul id="ul" class="list-unstyled" role="list">${items}</ul></div>
        <div><ol id="ol" class="list-unstyled" role="list">${items}</ol></div>
        <div><ul id="bare" class="list-unstyled">${items}</ul></div>
        <div><ul id="plain">${items}</ul></div>`);
      const read = (id) => page.locator(`#${id}`).evaluate((list) => {
        const style = getComputedStyle(list);
        const items = [...list.children];
        const box = list.getBoundingClientRect();
        const first = items[0].getBoundingClientRect();
        return {
          padding: style.paddingInlineStart,
          margins: [style.marginBlockStart, style.marginBlockEnd],
          markers: items.map((li) => getComputedStyle(li).listStyleType),
          display: items.map((li) => getComputedStyle(li).display),
          startOffset: document.dir === 'rtl' ? box.right - first.right : first.left - box.left,
        };
      });
      for (const direction of ['ltr', 'rtl']) {
        await page.evaluate((dir) => document.documentElement.dir = dir, direction);
        const plain = await read('plain');
        assert.notEqual(plain.padding, '0px', 'a plain list keeps its indentation');
        assert.deepEqual(plain.markers, ['disc', 'disc', 'disc']);
        for (const id of ['ul', 'ol']) {
          assert.deepEqual(await read(id), {
            padding: '0px',
            margins: plain.margins,
            markers: ['none', 'none', 'none'],
            display: ['list-item', 'list-item', 'list-item'],
            startOffset: 0,
          }, `${id} in ${direction}`);
        }
      }
      // A nested list keeps the browser's own markers and indentation.
      assert.deepEqual(await page.locator('#ul ul').evaluate((list) => [
        getComputedStyle(list).paddingInlineStart !== '0px',
        getComputedStyle(list.firstElementChild).listStyleType !== 'none',
      ]), [true, true]);
      // Playwright computes these roles itself, so this guards the markup, not
      // the engine's own tree; WebKit may drop the role without role="list".
      for (const id of ['ul', 'ol', 'bare']) {
        assert.match(await page.locator(`#${id}`).ariaSnapshot(), /^- list:\n {2}- listitem: One\n {2}- listitem:/, id);
      }
    } finally {
      await browser.close();
    }
  });

  utilityTest(`focusable hidden content reveals for keyboard and descendant focus (${engine})`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${css} .note { display: block; position: relative; padding: 8px; }</style>
        <button id="before" type="button">Before</button>
        <a id="skip" class="visually-hidden-focusable note" href="#after">Skip to content</a>
        <div id="group" class="visually-hidden-focusable note"><a id="first" href="#after">First action</a><a id="second" href="#after">Second action</a></div>
        <button id="after" type="button">After</button>`);
      const hidden = id => page.locator(`#${id}`).evaluate(el => {
        const style = getComputedStyle(el);
        return style.clipPath === 'inset(50%)' && el.offsetWidth === 1 && el.offsetHeight === 1;
      });
      assert.equal(await hidden('skip'), true);
      assert.equal(await hidden('group'), true);
      assert.equal(await page.getByRole('link', { name: 'Skip to content' }).count(), 1);
      await page.locator('#before').focus();
      for (const [focused, shown] of [['skip', 'skip'], ['first', 'group'], ['second', 'group'], ['after', null]]) {
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), focused);
        for (const id of ['skip', 'group']) {
          assert.equal(await hidden(id), id !== shown, `${id} visibility while ${focused} has focus`);
        }
        if (shown) {
          assert.deepEqual(await page.locator(`#${shown}`).evaluate(el => {
            const style = getComputedStyle(el);
            return [style.clipPath, style.position, style.paddingTop, el.offsetWidth > 1, el.offsetHeight > 1];
          }), ['none', 'relative', '8px', true, true], 'focus restores consumer styling');
        }
      }
    } finally {
      await browser.close();
    }
  });
}

test('line clamp classes come with every window-size prefix', () => {
  for (const size of ['medium', 'expanded', 'large', 'extra-large']) {
    for (const name of ['line-clamp-1', 'line-clamp-2', 'line-clamp-3', 'line-clamp-none']) {
      assert.match(css, new RegExp(`@media \\(width >= \\d+px\\) \\{[^@]*\\.${size}\\\\:${name} \\{`), `${size}:${name}`);
    }
  }
});

browserTest('window-size prefixes switch layout from their size class up', async () => {
  const browser = await leaseBrowser(chromium);
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>${css}</style>
      <div id="stack" class="flex flex-column gap-2 expanded:flex-row expanded:gap-5">
        <span id="a" class="w-full">A</span><span>B</span>
      </div>
      <p id="text" class="center-align medium:start-align">Text</p>
      <div id="box" class="bordered corner-medium aspect-16x9" style="width: 160px"></div>`);
    const read = () => page.evaluate(() => {
      const stack = getComputedStyle(document.querySelector('#stack'));
      const box = document.querySelector('#box');
      return {
        direction: stack.flexDirection,
        gap: stack.rowGap,
        align: getComputedStyle(document.querySelector('#text')).textAlign,
        radius: getComputedStyle(box).borderTopLeftRadius,
        height: box.getBoundingClientRect().height,
      };
    });
    await page.setViewportSize({ width: 599, height: 600 });
    assert.deepEqual(await read(), { direction: 'column', gap: '8px', align: 'center', radius: '12px', height: 90 });
    await page.setViewportSize({ width: 600, height: 600 });
    assert.equal((await read()).align, 'start');
    await page.setViewportSize({ width: 839, height: 600 });
    assert.equal((await read()).direction, 'column');
    await page.setViewportSize({ width: 840, height: 600 });
    assert.deepEqual(await read(), { direction: 'row', gap: '24px', align: 'start', radius: '12px', height: 90 });
  } finally {
    await browser.close();
  }
});

browserTest('links in running text are underlined and component links are not', async () => {
  const browser = await leaseBrowser(chromium);
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>${css}</style>
      <p>Read the <a id="prose" href="#">guide</a>.</p>
      <p><a id="button" class="button tonal" href="#">Guide</a></p>
      <ul><li><a id="nav" href="#">Home</a></li></ul>`);
    const line = (id) => page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).textDecorationLine);
    assert.deepEqual([await line('prose'), await line('button'), await line('nav')], ['underline', 'none', 'none']);
  } finally {
    await browser.close();
  }
});

browserTest('headings balance and paragraphs wrap pretty without undoing nowrap', async () => {
  const browser = await leaseBrowser(chromium);
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>${css}</style>
      <h2 id="h">A heading</h2><p id="p">A paragraph</p><h4 id="t" class="truncate">A truncated title</h4>`);
    const read = await page.evaluate(() => ['h', 'p', 't'].map((id) => {
      const style = getComputedStyle(document.getElementById(id));
      return [style.textWrapStyle, style.textWrapMode];
    }));
    assert.deepEqual(read, [['balance', 'wrap'], ['pretty', 'wrap'], ['balance', 'nowrap']]);
  } finally {
    await browser.close();
  }
});

browserTest('prose styles bare content and leaves components alone', async () => {
  const browser = await leaseBrowser(chromium);
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>${css}</style>
      <div class="prose">
        <h2 id="first">Intro</h2>
        <p>Text with <code id="code">npm ci</code>.</p>
        <h2 id="second">Next</h2>
        <ul id="list"><li><a id="link" href="#">A link</a></li><li>Two</li></ul>
        <pre id="pre"><code id="block">npm test</code></pre>
        <a id="button" class="button tonal" href="#">Button</a>
      </div>`);
    const read = await page.evaluate(() => {
      const s = (id) => getComputedStyle(document.getElementById(id));
      return {
        first: s('first').marginTop,
        second: s('second').marginTop !== '0px',
        list: parseFloat(s('list').paddingInlineStart) / parseFloat(s('list').fontSize),
        link: s('link').textDecorationLine,
        code: s('code').backgroundColor !== 'rgba(0, 0, 0, 0)',
        block: s('block').backgroundColor,
        pre: s('pre').overflowX,
        button: s('button').textDecorationLine,
      };
    });
    assert.deepEqual(read, {
      first: '0px', second: true, list: 1.5, link: 'underline', code: true,
      block: 'rgba(0, 0, 0, 0)', pre: 'auto', button: 'none',
    });
  } finally {
    await browser.close();
  }
});

browserTest('a narrow query container stacks horizontal cards and description lists on a wide window', async () => {
  const browser = await leaseBrowser(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const markup = `<article class="horizontal"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt=""><div class="content">Text</div></article>
      <dl class="description-list"><dt>Status</dt><dd>Paid</dd></dl>`;
    await page.setContent(`<style>${css}</style>
      <div id="narrow" class="query-container" style="width: 400px">${markup}</div>
      <div id="wide" class="query-container" style="width: 900px">${markup}</div>
      <div id="none" style="width: 400px">${markup}</div>`);
    const read = (id) => page.evaluate((id) => {
      const root = document.getElementById(id);
      return [
        getComputedStyle(root.querySelector('article')).flexDirection,
        getComputedStyle(root.querySelector('dl')).gridTemplateColumns.split(' ').length,
      ];
    }, id);
    assert.deepEqual(await read('narrow'), ['column', 1]);
    assert.notDeepEqual(await read('wide'), ['column', 1]);
    assert.notDeepEqual(await read('none'), ['column', 1], 'without a query container the window decides');
  } finally {
    await browser.close();
  }
});

browserTest('emphasized type roles keep the role metrics and take the emphasized weight', async () => {
  const browser = await leaseBrowser(chromium);
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>${css}</style>
      <span id="label" class="label-large">a</span><span id="label-e" class="label-large-emphasized">a</span>
      <span id="body" class="body-large">a</span><span id="body-e" class="body-large-emphasized">a</span>`);
    const read = await page.evaluate(() => Object.fromEntries(['label', 'label-e', 'body', 'body-e'].map((id) => {
      const s = getComputedStyle(document.getElementById(id));
      return [id, [s.fontWeight, s.fontSize, s.lineHeight]];
    })));
    assert.deepEqual(read['label-e'], ['700', ...read.label.slice(1)]);
    assert.deepEqual(read['body-e'], ['500', ...read.body.slice(1)]);
  } finally {
    await browser.close();
  }
});

browserTest('prefixed spacing and hide apply from their size class up', async () => {
  const browser = await leaseBrowser(chromium);
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>${css}</style>
      <div id="box" class="p-2 mt-1 expanded:p-5 expanded:mt-6">x</div>
      <div id="gone" class="flex medium:hide">y</div>`);
    const read = () => page.evaluate(() => {
      const box = getComputedStyle(document.getElementById('box'));
      return [box.paddingLeft, box.marginTop, getComputedStyle(document.getElementById('gone')).display];
    });
    await page.setViewportSize({ width: 599, height: 600 });
    assert.deepEqual(await read(), ['8px', '4px', 'flex']);
    await page.setViewportSize({ width: 600, height: 600 });
    assert.deepEqual(await read(), ['8px', '4px', 'none']);
    await page.setViewportSize({ width: 840, height: 600 });
    assert.deepEqual(await read(), ['24px', '48px', 'none']);
  } finally {
    await browser.close();
  }
});

browserTest('corners="cut" bevels container surfaces and leaves round indicators round', async () => {
  const browser = await leaseBrowser(chromium);
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>${css}</style>
      <div corners="cut"><article id="card" class="outlined">x</article><button id="fab" class="button extra circle">f</button>
        <div corners="round"><article id="back">y</article></div></div>
      <article id="plain">z</article><span id="one" class="corner-cut corner-medium">w</span>`);
    const shape = (id) => page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).getPropertyValue('corner-top-left-shape'));
    const cut = 'superellipse(0)';
    assert.deepEqual(
      [await shape('card'), await shape('one')],
      [cut, cut]
    );
    for (const id of ['fab', 'back', 'plain']) assert.notEqual(await shape(id), cut, `${id} is cut`);
  } finally {
    await browser.close();
  }
});
