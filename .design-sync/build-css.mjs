// Builds the stylesheet the design system ships.
//
// The framework deliberately does not ship the Material Symbols font files
// (three variable families would dwarf the sheet — see CLAUDE.md). The docs
// site pulls them from Google Fonts instead. A design built in Claude Design
// gets only the styles.css @import closure, so without these @imports every
// icon renders as its ligature text. Prepending them here is what makes icons
// actually appear. Regenerate with: node .design-sync/build-css.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SYMBOLS = 'opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';
const HEAD = `@charset "UTF-8";
@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:${SYMBOLS}&family=Material+Symbols+Rounded:${SYMBOLS}&family=Material+Symbols+Sharp:${SYMBOLS}&display=block");
@import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap");
`;

const src = readFileSync('dist/css/expressive.css', 'utf8').replace(/^@charset[^;]*;\s*/, '');
mkdirSync('.design-sync/.cache', { recursive: true });
writeFileSync('.design-sync/.cache/expressive-ds.css', HEAD + src);
console.log(`wrote .design-sync/.cache/expressive-ds.css (${Math.round((HEAD + src).length / 1024)} KB)`);
