/*global navigator*/
'use strict';

const {
  REGEX_BACKSLASH,
  REGEX_SPECIAL_CHARS,
  REGEX_SPECIAL_CHARS_GLOBAL
} = require('./constants');

exports.isObject = val => val !== null && typeof val === 'object' && !Array.isArray(val);
exports.hasRegexChars = str => REGEX_SPECIAL_CHARS.test(str);
exports.isRegexChar = str => str.length === 1 && exports.hasRegexChars(str);
exports.escapeRegex = str => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, '\\$1');
exports.toPosixSlashes = str => str.replace(REGEX_BACKSLASH, '/');

exports.isWindows = () => {
  if (typeof navigator !== 'undefined' && navigator.platform) {
    const platform = navigator.platform.toLowerCase();
    return platform === 'win32' || platform === 'windows';
  }

  if (typeof process !== 'undefined' && process.platform) {
    return process.platform === 'win32';
  }

  return false;
};

// `.` in the old class regex did not match these, and neither does the scan.
const matchesDot = ch => ch !== '\n' && ch !== '\r' && ch !== '\u2028' && ch !== '\u2029';

// Upstream removed backslashes with /(?:\[.*?[^\\]\]|\\(?=.))/g. The lazy
// `.*?` is polynomial on a long run of '['. This walks each character a
// constant number of times and keeps the same results: a finished class is
// copied whole, and a backslash is dropped only when the next character is
// one that `.` would match.
const matchCharClass = (str, open) => {
  for (let i = open + 1; i < str.length; i++) {
    const ch = str[i];
    if (ch !== '\\' && str[i + 1] === ']') return { end: i + 2 };
    if (!matchesDot(ch)) return { stopped: i };
  }
  return { stopped: str.length };
};

const pushUnescaped = (str, start, end, parts) => {
  for (let i = start; i < end; i++) {
    const next = str[i + 1];
    if (str[i] === '\\' && next !== undefined && matchesDot(next)) continue;
    parts.push(str[i]);
  }
  return end;
};

exports.removeBackslashes = str => {
  const parts = [];
  let i = 0;

  while (i < str.length) {
    if (str[i] === '[') {
      const found = matchCharClass(str, i);
      if (found.end !== undefined) {
        parts.push(str.slice(i, found.end));
        i = found.end;
        continue;
      }
      i = pushUnescaped(str, i, found.stopped, parts);
      continue;
    }

    const next = str[i + 1];
    if (str[i] === '\\' && next !== undefined && matchesDot(next)) {
      i += 1;
      continue;
    }

    parts.push(str[i]);
    i += 1;
  }

  return parts.join('');
};

exports.escapeLast = (input, char, lastIdx) => {
  const idx = input.lastIndexOf(char, lastIdx);
  if (idx === -1) return input;
  if (input[idx - 1] === '\\') return exports.escapeLast(input, char, idx - 1);
  return `${input.slice(0, idx)}\\${input.slice(idx)}`;
};

exports.removePrefix = (input, state = {}) => {
  let output = input;
  if (output.startsWith('./')) {
    output = output.slice(2);
    state.prefix = './';
  }
  return output;
};

exports.wrapOutput = (input, state = {}, options = {}) => {
  const prepend = options.contains ? '' : '^';
  const append = options.contains ? '' : '$';

  let output = `${prepend}(?:${input})${append}`;
  if (state.negated === true) {
    output = `(?:^(?!${output}).*$)`;
  }
  return output;
};

exports.basename = (path, { windows } = {}) => {
  const segs = path.split(windows ? /[\\/]/ : '/');
  const last = segs[segs.length - 1];

  if (last === '') {
    return segs[segs.length - 2];
  }

  return last;
};
