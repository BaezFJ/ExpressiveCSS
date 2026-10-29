import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody, window } from './setup.js';

beforeEach(resetBody);

function chart(type, rows) {
  document.body.innerHTML = `<figure class="${type}"><table>
    <thead><tr><th>Name</th><th>X</th><th>Y</th></tr></thead>
    <tbody>${rows.map(([x, y], i) => `<tr><th>Row ${i}</th><td>${x}</td><td>${y}</td></tr>`).join('')}</tbody>
  </table></figure>`;
  return document.querySelector('figure');
}

test('scatter hit testing reads each plot dimension once, regardless of point count', () => {
  const instance = Expressive.ScatterChart.init(chart('scatter-chart', Array.from({ length: 1000 }, (_, i) => [i, i])));
  try {
    const counts = {};
    for (const [name, value] of Object.entries({ clientLeft: 2, clientTop: 3, clientWidth: 800, clientHeight: 200 })) {
      counts[name] = 0;
      Object.defineProperty(instance._plot, name, { get: () => { counts[name]++; return value; } });
    }
    instance._plot.getBoundingClientRect = () => ({ left: 10, top: 20 });
    instance._indexAt({ clientX: 400, clientY: 100 });
    assert.deepEqual(counts, { clientLeft: 1, clientTop: 1, clientWidth: 1, clientHeight: 1 });
  } finally {
    instance.destroy();
  }
});

test('scatter hit testing keeps first ties, border offsets and fresh dimensions', () => {
  const instance = Expressive.ScatterChart.init(chart('scatter-chart', [[0, 0], [50, 50], [100, 100]]), {
    xMin: 0, xMax: 100, min: 0, max: 100
  });
  try {
    let width = 400;
    for (const [name, value] of Object.entries({ clientLeft: 5, clientTop: 7, clientHeight: 200 })) {
      Object.defineProperty(instance._plot, name, { get: () => value });
    }
    Object.defineProperty(instance._plot, 'clientWidth', { get: () => width });
    instance._plot.getBoundingClientRect = () => ({ left: 10, top: 20 });
    assert.equal(instance._indexAt({ clientX: 215, clientY: 127 }), 1);
    assert.equal(instance._indexAt({ clientX: 115, clientY: 177 }), 0, 'equidistant points keep table order');
    width = 800;
    assert.equal(instance._indexAt({ clientX: 415, clientY: 127 }), 1, 'a resize is visible on the next event');
    instance._marks = [];
    assert.equal(instance._indexAt({ clientX: 415, clientY: 127 }), -1);
  } finally {
    instance.destroy();
  }
});

test('treemap highlighting leaves unrelated boxes untouched and clears on hide', () => {
  const instance = Expressive.TreemapChart.init(chart('treemap-chart', [[1, 0], [0, 0], [3, 0], [4, 0]]));
  try {
    instance.show(0);
    const untouched = instance._boxes[3];
    let calls = 0;
    for (const name of ['add', 'remove', 'toggle']) {
      const original = untouched.classList[name].bind(untouched.classList);
      untouched.classList[name] = (...args) => { calls++; return original(...args); };
    }
    instance.show(1);
    assert.equal(instance.activeIndex, 2, 'zero-value rows are skipped');
    assert.deepEqual(instance._boxes.filter(box => box?.classList.contains('active')), [instance._boxes[2]]);
    assert.equal(calls, 0, 'a selection change must not touch unrelated boxes');
    instance.show(-1);
    assert.equal(instance._boxes.some(box => box?.classList.contains('active')), false);
    assert.equal(instance._tooltip.hidden, true);
    instance.show(2);
    instance.update();
    assert.equal(instance.activeIndex, 2);
    assert.deepEqual(instance._boxes.filter(box => box?.classList.contains('active')), [instance._boxes[2]]);
  } finally {
    instance.destroy();
  }
});

function questionnaire() {
  document.body.innerHTML = `<form class="questionnaire">
    <fieldset><legend>Name</legend><input name="name"></fieldset>
    <fieldset data-required><legend>First group</legend><fieldset><input type="checkbox" name="first"></fieldset></fieldset>
    <fieldset data-required><legend>Second group</legend><input type="checkbox" name="second"></fieldset>
    <footer><button type="button" value="next">Next</button></footer>
  </form>`;
  return Expressive.Questionnaire.init(document.querySelector('form'));
}

test('questionnaire input validates its containing question without writing unrelated validity', () => {
  const instance = questionnaire();
  try {
    const first = instance.el.querySelector('[name="first"]');
    const second = instance.el.querySelector('[name="second"]');
    const writes = [];
    for (const input of [first, second]) {
      const original = input.setCustomValidity.bind(input);
      input.setCustomValidity = message => { writes.push(input.name); original(message); };
    }
    instance.el.querySelector('[name="name"]').dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.deepEqual(writes, [], 'typing a name leaves checkbox validity alone');
    assert.equal(first.validity.customError, true);
    assert.equal(second.validity.customError, true);

    first.checked = true;
    first.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.deepEqual(writes, ['first'], 'a nested checkbox updates its outer question');
    assert.equal(first.validity.customError, false);
    assert.equal(second.validity.customError, true);
  } finally {
    instance.destroy();
  }
});

test('questionnaire navigation and disabled changes still validate other questions', async () => {
  const instance = questionnaire();
  try {
    const first = instance.el.querySelector('[name="first"]');
    const second = instance.el.querySelector('[name="second"]');
    first.checked = second.checked = true;
    instance.next();
    assert.equal(first.validity.customError, false, 'navigation sees programmatic changes');
    assert.equal(second.validity.customError, false);
    second.checked = false;
    first.disabled = true;
    await Promise.resolve();
    assert.equal(second.validity.customError, true, 'disabled-state observation still checks all groups');
  } finally {
    instance.destroy();
  }
});
