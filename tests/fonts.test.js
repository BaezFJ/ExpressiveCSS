import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const cssPath = join(root, 'dist/css/expressive.css');
const minCssPath = join(root, 'dist/css/expressive.min.css');
const fontsDir = join(root, 'dist/fonts');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

// Every text subset and weight the sheet declares, listed here rather than
// read from scripts/copy-fonts.mjs, so a dropped subset fails.
const TEXT_SUBSETS = {
  roboto: ['Roboto', ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'vietnamese']],
  'noto-sans': ['Noto Sans', ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'vietnamese', 'devanagari']],
  'noto-sans-arabic': ['Noto Sans Arabic', ['arabic']],
  'noto-sans-hebrew': ['Noto Sans Hebrew', ['hebrew']],
  'noto-sans-thai': ['Noto Sans Thai', ['thai']],
};
const textFiles = Object.entries(TEXT_SUBSETS).flatMap(([file, [family, subsets]]) =>
  subsets.flatMap((subset) => [400, 500, 700].map((weight) => [`${file}-${subset}-${weight}.woff2`, family])));

const FONT_FILES = {
  'material-symbols-outlined.woff2': 'Material Symbols Outlined',
  'material-symbols-rounded.woff2': 'Material Symbols Rounded',
  'material-symbols-sharp.woff2': 'Material Symbols Sharp',
  ...Object.fromEntries(textFiles),
};

function readCss() {
  return readFileSync(cssPath, 'utf8');
}

function facesFor(css, family) {
  const faces = [];
  const re = /@font-face\s*\{([\s\S]*?)\}/g;
  let match;
  while ((match = re.exec(css))) {
    const body = match[1];
    if (!body.includes(`font-family: "${family}"`) && !body.includes(`font-family:"${family}"`)) {
      continue;
    }
    faces.push(body);
  }
  return faces;
}

function srcUrls(face) {
  return [...face.matchAll(/url\((['"]?)([^'")]+)\1\)/g)].map((m) => m[2]);
}

describe('self-hosted fonts', () => {
  test('ships the icon and typeface files the sheet names', () => {
    for (const file of Object.keys(FONT_FILES)) {
      const path = join(fontsDir, file);
      assert.equal(existsSync(path), true, `missing ${file}`);
      assert.ok(statSync(path).size > 1024, `${file} is too small to be a font`);
    }
  });

  test('compiled CSS declares each shipped family with a relative font url', () => {
    const css = readCss();
    const seen = new Map();

    for (const [file, family] of Object.entries(FONT_FILES)) {
      const faces = facesFor(css, family);
      assert.ok(faces.length > 0, `no @font-face for ${family}`);
      const matching = faces.filter((face) => srcUrls(face).some((url) => url.endsWith(file)));
      assert.ok(matching.length > 0, `${family} does not load ${file}`);
      for (const face of matching) {
        for (const url of srcUrls(face)) {
          assert.match(url, /^\.\.\/fonts\/[A-Za-z0-9.-]+\.woff2$/, `unexpected font url ${url}`);
          assert.equal(existsSync(join(dirname(cssPath), url)), true, `broken font url ${url}`);
        }
      }
      seen.set(family, (seen.get(family) ?? 0) + matching.length);
    }

    assert.ok(seen.get('Material Symbols Outlined') >= 1);
    assert.ok(seen.get('Roboto') >= 2);
    assert.ok(seen.get('Noto Sans') >= 2);
  });

  test('Material Symbols Outlined is a variable face covering the documented axes', () => {
    const faces = facesFor(readCss(), 'Material Symbols Outlined');
    const face = faces.find((body) => srcUrls(body).some((url) => url.includes('material-symbols-outlined')));
    assert.ok(face, 'outlined face missing');
    assert.match(face, /font-weight:\s*100\s+700/);
    assert.match(face, /font-display:\s*block/);
  });

  test('minified CSS keeps the same relative font urls', () => {
    const css = readFileSync(minCssPath, 'utf8');
    for (const file of Object.keys(FONT_FILES)) {
      assert.match(css, new RegExp(`url\\((['"]?)\\.\\./fonts/${file}\\1\\)`));
    }
  });

  test('package exports the font files next to the compiled CSS', () => {
    assert.equal(pkg.exports['./fonts/*'], './dist/fonts/*');
    assert.ok(pkg.files.includes('dist'));
  });

  test('each text subset face carries its unicode-range, so only the scripts in use load', () => {
    const faces = Object.values(TEXT_SUBSETS).flatMap(([family]) => facesFor(readCss(), family));
    assert.equal(faces.length, textFiles.length);
    assert.deepEqual(faces.filter((face) => !/unicode-range:\s*U\+/.test(face)), []);
    const cyrillic = faces.find((face) => face.includes('roboto-cyrillic-400.woff2'));
    assert.match(cyrillic, /U\+0400-045F/);
    const arabic = faces.find((face) => face.includes('noto-sans-arabic-arabic-400.woff2'));
    assert.match(arabic, /U\+0600-06FF/, 'the Arabic family covers only Arabic, so other pages never fetch it');
  });
});
