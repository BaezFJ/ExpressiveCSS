import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { violations } from '../scripts/semantics-rules.mjs';

const semantics = JSON.parse(
  readFileSync(new URL('../semantics.json', import.meta.url), 'utf8')
);
const rules = new Map(semantics.rows.cards.rules.map((rule) => [rule.id, rule]));

function matches(ruleId, markup) {
  const rule = rules.get(ruleId);
  assert.ok(rule, `missing ${ruleId}`);
  return violations(markup, [rule], semantics.compositeRoles).length;
}

describe('Cards semantics', () => {
  test('a disabled primary-action link is non-navigable and outside the tab order', () => {
    const invalidActiveLink = `
      <article>
        <a class="primary-action" href="/details" aria-disabled="true" tabindex="-1">Details</a>
      </article>`;
    const invalidTabStop = `
      <article>
        <a class="primary-action" aria-disabled="true">Details</a>
      </article>`;
    const invalidButton = `
      <article>
        <button type="button" class="primary-action">Details</button>
      </article>`;
    const validDisabledLink = `
      <article>
        <a class="primary-action" aria-disabled="true" tabindex="-1">Details</a>
      </article>`;

    assert.equal(matches('card-disabled-link-has-no-href', invalidActiveLink), 1);
    assert.equal(matches('card-disabled-link-not-tabbable', invalidTabStop), 1);
    assert.equal(matches('card-primary-action-is-control', invalidButton), 1);
    assert.equal(matches('card-primary-action-is-control', validDisabledLink), 0);
  });

  test('a directly actionable card contains one primary action and no second control', () => {
    const secondControl = `
      <article>
        <a class="primary-action" href="/details">Details</a>
        <button type="button">Save</button>
      </article>`;
    const secondPrimaryAction = `
      <article>
        <a class="primary-action" href="/details">Details</a>
        <a class="primary-action" href="/alternate">Alternate details</a>
      </article>`;

    assert.equal(matches('card-primary-action-is-only-action', secondControl), 1);
    assert.equal(matches('card-primary-action-is-single', secondPrimaryAction), 1);
  });

  test('the one-panel rule describes rejected panels as visible', () => {
    const message = rules.get('card-reveal-has-one-panel')?.message ?? '';
    assert.match(message, /remains? visible/);
    assert.doesNotMatch(message, /hidden/);
  });

  test('a nested card inside an outer reveal panel owns its own trigger', () => {
    const nestedReveal = `
      <article>
        <button type="button" class="card-reveal-trigger"
                aria-label="Toggle outer details" aria-controls="outer-details"></button>
        <aside id="outer-details">
          <article>
            <button type="button" class="card-reveal-trigger"
                    aria-label="Toggle inner details" aria-controls="inner-details"></button>
            <aside id="inner-details">Inner details</aside>
          </article>
        </aside>
      </article>`;

    assert.equal(matches('card-reveal-has-trigger', nestedReveal), 0);
  });

  test('a reveal uses one labelled disclosure button and an identified panel', () => {
    const missingTrigger = `<article><aside id="details">Details</aside></article>`;
    const multiplePanels = `
      <article>
        <button type="button" class="card-reveal-trigger"
                aria-label="Toggle details" aria-controls="details"></button>
        <aside id="details">Details</aside>
        <aside id="more-details">More details</aside>
      </article>`;
    const nonButton = `<span class="card-reveal-trigger">Details</span>`;
    const invalid = `
      <article>
        <button class="card-reveal-trigger" aria-expanded="false"></button>
        <aside aria-expanded="false">Details</aside>
      </article>`;
    const whitespaceLabel = `
      <article>
        <button type="button" class="card-reveal-trigger"
                aria-label="   " aria-controls="details"></button>
        <aside id="details">Details</aside>
      </article>`;
    const mismatchedControls = `
      <div id="elsewhere">Not this card panel</div>
      <article>
        <button type="button" class="card-reveal-trigger"
                aria-label="Toggle details" aria-controls="elsewhere"></button>
        <aside id="details">Details</aside>
      </article>`;
    const nestedTrigger = `
      <article>
        <div>
          <article>
            <button type="button" class="card-reveal-trigger"
                    aria-label="Toggle inner details" aria-controls="inner-details"></button>
            <aside id="inner-details">Inner details</aside>
          </article>
        </div>
        <aside id="outer-details">Outer details</aside>
      </article>`;
    const valid = `
      <article>
        <button type="button" class="card-reveal-trigger"
                aria-label="Toggle details" aria-controls="details"></button>
        <aside id="details">Details</aside>
      </article>`;

    assert.equal(matches('card-reveal-has-trigger', missingTrigger), 1);
    assert.equal(matches('card-reveal-has-trigger', nestedTrigger), 1);
    assert.equal(matches('card-reveal-has-trigger', valid), 0);
    assert.equal(matches('card-reveal-has-one-panel', multiplePanels), 1);
    assert.equal(matches('card-reveal-has-one-panel', valid), 0);
    assert.equal(matches('card-reveal-trigger-is-button', nonButton), 1);
    assert.equal(matches('card-reveal-trigger-type-button', invalid), 1);
    assert.equal(matches('card-reveal-trigger-has-label', invalid), 1);
    assert.equal(matches('card-reveal-trigger-has-label', whitespaceLabel), 1);
    assert.equal(matches('card-reveal-trigger-controls-panel', invalid), 1);
    assert.equal(matches('card-reveal-trigger-controls-panel', mismatchedControls), 1);
    assert.equal(matches('card-reveal-panel-has-id', invalid), 1);
    assert.equal(matches('card-reveal-expanded-is-not-authored', invalid), 2);

    for (const id of [
      'card-reveal-has-trigger',
      'card-reveal-has-one-panel',
      'card-reveal-trigger-is-button',
      'card-reveal-trigger-type-button',
      'card-reveal-trigger-has-label',
      'card-reveal-trigger-controls-panel',
      'card-reveal-panel-has-id',
      'card-reveal-expanded-is-not-authored'
    ]) {
      assert.equal(matches(id, valid), 0, `${id} rejected valid reveal markup`);
    }
  });
});
