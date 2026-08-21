Previews that render correctly but cannot ship, kept as evidence rather than
rewritten from scratch if the constraint ever changes.

- `Button.tsx` — renders the full button variant set correctly (verified: 27KB
  screenshot, all four cells distinct). Rejected by `package-validate.mjs`'s
  `[BUNDLE_EXPORT]` gate, which requires every component to be a function on
  `window.Expressive`. `Button` is CSS-only, so it is not an export. See the
  "Why ~26 components have no card" section in ../NOTES.md.
