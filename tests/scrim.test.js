// Scrim (M3 Expressive). A foundation: no markup, one definition, and every
// surface that puts a wash behind itself consumes it rather than re-deriving
// the 32% mix for the fifth time.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('Scrim', () => {
  test('is a :root token, so ::backdrop inherits it', () => {
    // Three of the five consumers paint into ::backdrop, which has no box of
    // its own for a token to sit on.
    assert.match(
      css,
      /:root \{\s*--md-comp-scrim-color: color-mix\(in oklab, var\(--md-sys-color-scrim\) 32%, transparent\);/
    );
  });

  test('nothing re-derives it', () => {
    // The drawer's user-view gradient is a different thing - three stops over a
    // photo, not the wash behind a surface - so it is allowed its own mix.
    const adhoc = css.match(/color-mix\(in oklab, var\(--md-sys-color-scrim\) 32%, transparent\)/g);
    assert.equal(adhoc?.length, 1, 'the only 32% scrim mix in the sheet is the definition');
  });

  test('dialogs consume it', () => {
    assert.match(css, /dialog::backdrop \{\s*background-color: var\(--md-comp-scrim-color\);/);
  });

  test('the navigation drawer consumes it', () => {
    assert.match(
      css,
      /dialog:is\(\.sidenav, \.navigation-drawer\)::backdrop \{\s*background-color: var\(--md-comp-scrim-color\);/
    );
  });

  test('the modal navigation rail consumes it, at both breakpoints', () => {
    const rail = css.match(
      /\.navigation-rail\.expanded(?:\.modal|:not\(\.modal\))::before \{[^}]*background-color: var\(--md-comp-scrim-color\);/g
    );
    assert.equal(rail?.length, 2);
  });
});
