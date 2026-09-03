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

const FONT_FILES = {
  'material-symbols-outlined.woff2': 'Material Symbols Outlined',
  'material-symbols-rounded.woff2': 'Material Symbols Rounded',
  'material-symbols-sharp.woff2': 'Material Symbols Sharp',
  'roboto-latin-400.woff2': 'Roboto',
  'roboto-latin-500.woff2': 'Roboto',
  'noto-sans-latin-400.woff2': 'Noto Sans',
  'noto-sans-latin-500.woff2': 'Noto Sans',
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
});
