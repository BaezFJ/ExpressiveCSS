// Guards the OKLCH ramp generation in tokens/_reference.scss against drifting
// away from the Material Design 3 reference ramps.
//
// tokens/_reference.scss derives five of the six ramps from --md-source with
// relative color syntax instead of pasting hex out of the Material Theme
// Builder. That is only acceptable while the generated values stay
// perceptually indistinguishable from the real ones, and "perceptually
// indistinguishable" is a number, not an opinion - so it gets a test.
//
// The test reads the generation constants straight out of the Sass, recomputes
// every ramp entry here, and compares against tests/m3-reference-ramps.js.
//
// What it guarantees is perceptual, not exact: it fails when a generated value
// moves far enough from the reference to be *visible*, which is the property
// worth protecting. A small edit that stays inside the budget passes on
// purpose - nudging tertiary's hue by a degree is not a regression. Each ramp
// reports its current headroom as a diagnostic so you can see how much room an
// edit actually consumed; if a ramp's headroom is shrinking toward zero, re-fit
// the constants rather than raising DRIFT_BUDGET.
//
// Scope, stated honestly: this validates the formula and its constants, which
// is what the repo controls. It does not prove a browser paints the same pixel
// - the gamut mapping below is the CSS Color 4 chroma-reduction approach, but
// each engine's implementation of it is its own. Out-of-gamut targets are the
// norm here (primary's 0.124 chroma is unreachable above roughly tone 80), so
// that caveat is doing real work.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { M3_REFERENCE_RAMPS, MD_SOURCE } from './m3-reference-ramps.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCSS = readFileSync(join(ROOT, 'src/sass/tokens/_reference.scss'), 'utf8');

// A generated entry may sit this far (dEok) from the Material Theme Builder
// value. The JND is around 0.02; the worst entry currently measures 0.0077, so
// this leaves headroom for rounding without letting a real regression through.
const DRIFT_BUDGET = 0.010;

/* ---------------------------------------------------------- color math ---- */

const srgbToLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

function rgbToHex(rgb) {
  return '#' + rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255)
    .toString(16).padStart(2, '0')).join('');
}

function rgbToOklab([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map(srgbToLinear);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

function oklabToRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ].map(linearToSrgb);
}

const lchToOklab = (L, C, hDeg) => {
  const h = (hDeg * Math.PI) / 180;
  return [L, C * Math.cos(h), C * Math.sin(h)];
};

const oklabToLch = ([L, a, b]) => [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];

const inGamut = (rgb, eps = 1e-4) => rgb.every((v) => v >= -eps && v <= 1 + eps);

// CSS Color 4 gamut mapping, chroma-reduction form: hold lightness and hue,
// binary-search chroma down until the result fits sRGB.
function gamutMap(L, C, h) {
  if (inGamut(oklabToRgb(lchToOklab(L, C, h)))) return oklabToRgb(lchToOklab(L, C, h));
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklabToRgb(lchToOklab(L, mid, h)))) lo = mid; else hi = mid;
  }
  return oklabToRgb(lchToOklab(L, lo, h));
}

const deltaEok = (hexA, hexB) => {
  const a = rgbToOklab(hexToRgb(hexA));
  const b = rgbToOklab(hexToRgb(hexB));
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
};

/* ------------------------------------------- read the Sass generation ----- */

function parseSource() {
  const m = SCSS.match(/\$md-source:\s*(#[0-9a-fA-F]{6})/);
  assert.ok(m, '$md-source not found in tokens/_reference.scss');
  return m[1].toLowerCase();
}

function parseTones() {
  const block = SCSS.match(/\$tones:\s*\(([\s\S]*?)\)\s*!default/);
  assert.ok(block, '$tones map not found');
  const tones = {};
  for (const [, tone, pct] of block[1].matchAll(/(\d+)\s*:\s*([\d.]+)%/g)) {
    tones[Number(tone)] = Number(pct) / 100;
  }
  return tones;
}

function parseRamps() {
  const block = SCSS.match(/\$ramps:\s*\(([\s\S]*?)\n\)\s*!default/);
  assert.ok(block, '$ramps map not found');
  const ramps = {};
  const re = /"([a-z-]+)":\s*\(\s*"hue":\s*(-?[\d.]+)\s*,\s*"chroma":\s*([\d.]+)\s*\)/g;
  for (const [, name, hue, chroma] of block[1].matchAll(re)) {
    ramps[name] = { hue: Number(hue), chroma: Number(chroma) };
  }
  return ramps;
}

function generate(sourceHex, tones, ramp, tone) {
  const [, , sourceHue] = oklabToLch(rgbToOklab(hexToRgb(sourceHex)));
  const L = tones[tone];
  const C = tone === 0 || tone === 100 ? 0 : ramp.chroma;
  return rgbToHex(gamutMap(L, C, (sourceHue + ramp.hue + 360) % 360));
}

/* ------------------------------------------------------------- tests ----- */

describe('M3 ramp generation', () => {
  const source = parseSource();
  const tones = parseTones();
  const ramps = parseRamps();

  // The ramps below are generated from MD_SOURCE, the source the reference
  // fixture was captured for - NOT from whatever $md-source currently says.
  //
  // Those are two different questions. "Is the formula faithful?" is a property
  // of the tone table, hue offsets and chroma, and #006495 is the one source we
  // hold Material Theme Builder ground truth for. "What colour is the product?"
  // is a branding decision that should be free to change without this test
  // going red - and it cannot be checked here anyway, since there is no
  // reference output for an arbitrary new source.
  test('$md-source is a usable seed (its value is a branding choice, not drift)', (t) => {
    assert.match(source, /^#[0-9a-f]{6}$/, '$md-source must be a 6-digit hex colour');
    t.diagnostic(source === MD_SOURCE.toLowerCase()
      ? `$md-source is ${source}, the source the reference ramps were captured for`
      : `$md-source is ${source}; the formula below is still verified against ${MD_SOURCE}`);
  });

  test('the tone table covers every tone the reference ramps use', () => {
    const referenceTones = Object.keys(M3_REFERENCE_RAMPS.primary).map(Number).sort((a, b) => a - b);
    assert.deepEqual(Object.keys(tones).map(Number).sort((a, b) => a - b), referenceTones);
  });

  for (const name of Object.keys(ramps)) {
    test(`${name} stays within ${DRIFT_BUDGET} dEok of the reference ramp`, (t) => {
      const reference = M3_REFERENCE_RAMPS[name];
      assert.ok(reference, `no reference ramp for ${name}`);

      const drifted = [];
      let worst = 0;
      let worstTone = null;
      let sum = 0;
      let n = 0;

      for (const [tone, expected] of Object.entries(reference)) {
        const got = generate(MD_SOURCE, tones, ramps[name], Number(tone));
        const d = deltaEok(expected, got);
        sum += d;
        n += 1;
        if (d > worst) { worst = d; worstTone = tone; }
        if (d > DRIFT_BUDGET) drifted.push(`  ${name}${tone}: ${expected} -> ${got}  dEok ${d.toFixed(4)}`);
      }

      t.diagnostic(`${name}: mean ${(sum / n).toFixed(4)}, worst ${worst.toFixed(4)} at tone ${worstTone}, `
        + `headroom ${(DRIFT_BUDGET - worst).toFixed(4)}`);

      assert.equal(drifted.length, 0,
        `${drifted.length} generated value(s) drifted past ${DRIFT_BUDGET}:\n${drifted.join('\n')}`);
    });
  }

  test('error is not generated - it stays literal hex', () => {
    assert.ok(!('error' in ramps), 'the error ramp must not be added to $ramps');
    for (const [tone, expected] of Object.entries(M3_REFERENCE_RAMPS.error)) {
      const re = new RegExp(`--md-ref-palette-error${tone}:\\s*(#[0-9a-fA-F]{6})`);
      const m = SCSS.match(re);
      assert.ok(m, `--md-ref-palette-error${tone} is missing or no longer a literal hex value`);
      assert.equal(m[1].toLowerCase(), expected, `--md-ref-palette-error${tone} changed`);
    }
  });

  test('every system color resolves to a ramp entry that exists', () => {
    const declared = new Set();
    for (const [, name, tone] of SCSS.matchAll(/--md-ref-palette-([a-z-]+?)(\d+):/g)) {
      declared.add(`${name}${tone}`);
    }
    for (const name of Object.keys(ramps)) {
      for (const tone of Object.keys(tones)) declared.add(`${name}${tone}`);
    }

    for (const scheme of ['light', 'dark']) {
      const block = SCSS.match(new RegExp(`\\$sys-${scheme}:\\s*\\(([\\s\\S]*?)\\n\\)\\s*!default`));
      assert.ok(block, `$sys-${scheme} map not found`);
      const entries = [...block[1].matchAll(/"([a-z-]+)":\s*"([a-z-]+\d+)"/g)];
      assert.equal(entries.length, 30, `$sys-${scheme} should map all 30 roles`);
      for (const [, role, ref] of entries) {
        assert.ok(declared.has(ref), `$sys-${scheme} role "${role}" points at --md-ref-palette-${ref}, which is never declared`);
      }
    }
  });
});
