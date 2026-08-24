// Guards the custom properties in the compiled sheet against the two ways a
// token can be silently wrong. Neither is a syntax error, so nothing - not
// sass, not tsc, not a browser console - says a word about either one.
//
// 1. A `var()` naming a token nothing declares makes its whole declaration
//    INVALID AT COMPUTED-VALUE TIME. That is not the same as the declaration
//    being ignored: it still wins the cascade, and *then* resolves to unset,
//    so the property falls to its inherited or initial value rather than to
//    the rule underneath. `.am-btn` in the time picker referenced Materialize's
//    long-gone --btn-padding and rendered with padding 0 while a base button
//    rule sat right there offering 24px. The typescale classes did nothing at
//    all for the same reason.
//
// 2. A token declared and read by nobody is a promise the sheet does not keep.
//    --md-comp-top-app-bar-trailing-icon-color was documented as the way to
//    mute the app bar's trailing icons and was consumed by no rule, so setting
//    it did nothing; the docs had just been corrected to point readers at it.
//
// Scope note: only --md-comp-* is checked for being read. --md-sys-* and
// --md-ref-* are the design system's public surface - a tonal ramp exists so
// consumers can reach for tone 60 whether or not the framework happens to use
// it, and 111 of them currently go unread on purpose.

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

/** Tokens the sheet defines: assigned in a rule, or registered with @property. */
const declared = new Set([
  ...[...css.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)].map((m) => m[1]),
  ...[...css.matchAll(/@property\s+(--[A-Za-z0-9_-]+)/g)].map((m) => m[1]),
]);

/** Every var() reference, and separately those that carry a fallback. */
const referenced = new Set(
  [...css.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)].map((m) => m[1])
);
const withoutFallback = new Set(
  [...css.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*\)/g)].map((m) => m[1])
);

// A --md-comp-* token the sheet declares and never reads. Exempt is the
// backlog and only ever shrinks - the test below fails on a stale entry too,
// so a token that gets wired up cannot be left listed here.
const UNREAD_ALLOWED = new Map([
  [
    '--md-comp-pane-primary-min-width',
    'declared and documented in _panes.scss but applied nowhere. Which pane it ' +
      'should constrain and at which breakpoint is an open design question - ' +
      'the primary column is 1fr in every canonical variant - so this is a ' +
      'missing feature rather than a wiring slip. Wire it or drop it, but do ' +
      'not leave it documented and inert.',
  ],
]);

describe('Custom properties', () => {
  test('every var() without a fallback names a token the sheet declares', () => {
    // With a fallback the reference is legitimate even when nothing declares
    // the token - that is how an author hook (--carousel-height) and a
    // JS-written value (--md-comp-progress-value) are meant to look. Without
    // one, an undeclared token takes the whole declaration down with it.
    const dangling = [...withoutFallback].filter((t) => !declared.has(t)).sort();
    assert.deepEqual(
      dangling,
      [],
      `var() references nothing declares, so every declaration using one is ` +
        `invalid at computed-value time: ${dangling.join(', ')}`
    );
  });

  test('every --md-comp-* token the sheet declares is read by the sheet', () => {
    const unread = [...declared]
      .filter((t) => t.startsWith('--md-comp-') && !referenced.has(t))
      .sort();
    const allowed = [...UNREAD_ALLOWED.keys()].sort();

    // Exact, not a subset: an exemption that stops being true has to fail, or
    // the list rots into a permanent excuse.
    assert.deepEqual(
      unread,
      allowed,
      unread.length > allowed.length
        ? `component tokens declared and read by nothing - either wire them up ` +
            `or add them to UNREAD_ALLOWED with a reason: ` +
            `${unread.filter((t) => !UNREAD_ALLOWED.has(t)).join(', ')}`
        : `UNREAD_ALLOWED lists a token that is now read (or no longer ` +
            `declared) - drop the entry: ` +
            `${allowed.filter((t) => !unread.includes(t)).join(', ')}`
    );
  });
});
