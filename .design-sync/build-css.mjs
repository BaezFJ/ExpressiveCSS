// Builds the stylesheet the design system ships.
//
// The framework bundles fonts in dist/fonts/. This optional adapter adds remote
// imports for design consumers that transfer CSS without its relative assets.
// Regenerate with: node .design-sync/build-css.mjs
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
