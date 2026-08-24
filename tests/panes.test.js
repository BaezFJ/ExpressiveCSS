// Panes (Material 3 Canonical Adaptive Layouts) CSS test.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('Panes CSS', () => {
  test('emits canonical layout tokens', () => {
    assert.match(css, /--md-comp-pane-gap:\s*24px/);
    assert.match(css, /--md-comp-pane-list-width:\s*360px/);
    assert.match(css, /--md-comp-pane-supporting-width:\s*360px/);
    assert.match(css, /container-type:\s*inline-size/);
  });

  test('single-pane on compact, dual-pane on >= 840px', () => {
    assert.match(css, /@media\s*\(width\s*>=\s*840px\)/);
    assert.match(css, /@container\s*\(min-width:\s*840px\)/);
  });

  test('uses 16dp inline margins on Compact windows', () => {
    assert.match(
      css,
      /@media\s*\(width\s*<\s*600px\)[\s\S]*?--md-comp-pane-margin:\s*16px/
    );
    assert.match(
      css,
      /width:\s*calc\(100%\s*-\s*2\s*\*\s*var\(--md-comp-pane-margin\)\)/
    );
    assert.match(css, /margin-inline:\s*var\(--md-comp-pane-margin\)/);
  });

  test('uses 24dp margins and spacer on Medium windows', () => {
    assert.match(
      css,
      /@media\s*\(600px\s*<=\s*width\s*<\s*840px\)[\s\S]*?--md-comp-pane-margin:\s*24px/
    );
    assert.match(
      css,
      /@media\s*\(600px\s*<=\s*width\s*<\s*840px\)[\s\S]*?gap:\s*var\(--md-comp-pane-gap\)/
    );

    const panesStart = css.indexOf('--md-comp-pane-gap: 24px');
    const baseGap = css.indexOf('gap: 0;', panesStart);
    const mediumRule = css.indexOf('@media (600px <= width < 840px)', panesStart);
    assert.ok(baseGap > -1 && mediumRule > baseGap, 'the Medium spacer must override the base gap');
  });

  test('uses 24dp margins and spacer on Expanded windows', () => {
    assert.match(
      css,
      /@media\s*\(840px\s*<=\s*width\s*<\s*1200px\)[\s\S]*?--md-comp-pane-margin:\s*24px/
    );
    assert.match(
      css,
      /@media\s*\(840px\s*<=\s*width\s*<\s*1200px\)[\s\S]*?gap:\s*var\(--md-comp-pane-gap\)/
    );

    const panesStart = css.indexOf('--md-comp-pane-gap: 24px');
    const containerRule = css.indexOf('@container (min-width: 840px)', panesStart);
    const expandedRule = css.indexOf('@media (840px <= width < 1200px)', panesStart);
    assert.ok(
      containerRule > -1 && expandedRule > containerRule,
      'the Expanded spacer must override the container-query gap'
    );
  });

  test('uses 24dp margins and spacers on Large windows', () => {
    assert.match(
      css,
      /@media\s*\(1200px\s*<=\s*width\s*<\s*1600px\)[\s\S]*?--md-comp-pane-margin:\s*24px/
    );
    assert.match(
      css,
      /@media\s*\(1200px\s*<=\s*width\s*<\s*1600px\)[\s\S]*?gap:\s*var\(--md-comp-pane-gap\)/
    );
  });

  test('uses 24dp margins and spacers on Extra-large windows', () => {
    assert.match(
      css,
      /@media\s*\(width\s*>=\s*1600px\)[\s\S]*?--md-comp-pane-margin:\s*24px/
    );
    assert.match(
      css,
      /@media\s*\(width\s*>=\s*1600px\)[\s\S]*?gap:\s*var\(--md-comp-pane-gap\)/
    );
  });

  test('supporting pane and equal layout variants', () => {
    assert.match(css, /\.supporting-pane-layout/);
    assert.match(css, /\.panes\.supporting/);
    assert.match(css, /\.panes\.equal/);
  });

  test('separated / floating appearance with rounded shapes and gap', () => {
    assert.match(css, /\.panes\.separated/);
    assert.match(css, /--md-comp-pane-container-shape:\s*16px/);
  });
});
