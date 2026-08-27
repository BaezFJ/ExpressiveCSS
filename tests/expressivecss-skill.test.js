import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const skillUrl = new URL('../skills/expressivecss/SKILL.md', import.meta.url);
const skill = readFileSync(skillUrl, 'utf8');
const bodyStart = skill.indexOf('\n---\n', 4);
const frontmatter = skill.slice(4, bodyStart);
const body = skill.slice(bodyStart + 5);

describe('the ExpressiveCSS agent skill', () => {
  test('is a portable SKILL.md with a concise discovery trigger', () => {
    assert.ok(skill.startsWith('---\n'));
    assert.ok(bodyStart > 4, 'frontmatter is not closed');
    assert.match(frontmatter, /^name: expressivecss$/m);
    assert.match(frontmatter, /^  author: BaezFJ$/m);

    const description = frontmatter.match(/^description: (.+)$/m)?.[1];
    assert.ok(description, 'description is missing');
    assert.ok(description.length <= 60, `description is ${description.length} characters`);
    assert.ok(description.endsWith('.'), 'description is not a sentence');
    assert.doesNotMatch(skill, /\/home\/|[A-Z]:\\Users\\/, 'skill contains a machine-local path');
  });

  test('points every source tier at a repository file that exists', () => {
    for (const path of [
      '../../m3-guidelines.md',
      '../../llm.md',
      '../../semantics.json',
      '../../SEMANTICS.md',
      '../../docs/agents/expressivecss-skill-research.md',
    ]) {
      assert.ok(skill.includes(`](${path})`), `${path} is not linked`);
      assert.ok(existsSync(new URL(path, skillUrl)), `${path} does not exist`);
    }

    const design = body.indexOf('**Design intent:**');
    const shipped = body.indexOf('**Shipped contract:**');
    const semantics = body.indexOf('**Authored semantics:**');
    const runtime = body.indexOf('**Runtime truth:**');
    assert.ok(design < shipped && shipped < semantics && semantics < runtime,
      'source precedence is not stated in order');
  });

  test('pins the two component distinctions that previously drifted', () => {
    assert.match(body, /`\.loading-indicator` is a shipped CSS component/);
    assert.match(body, /`\.icon-button` is the Material 3 icon-button component/);
    assert.match(body, /`\.button\.circle` is the older round common-button form/);
  });

  test('covers styling, lifecycle, accessibility, adaptation, and verification', () => {
    for (const heading of [
      '### 4. Author semantic HTML',
      '### 5. Apply styles and layout',
      '### 6. Wire runtime behavior once',
      '### 7. Run the accessibility pass',
      '### 8. Verify every reachable layout and state',
      '## Framework contribution path',
      '## Verification checklist',
    ]) {
      assert.ok(body.includes(heading), `${heading} is missing`);
    }

    assert.match(body, /Use either `AutoInit\(\)` or a component's `init\(\)`/);
    assert.match(body, /npm install @expressivecss\/expressive/);
    assert.match(body, /import '@expressivecss\/expressive\/css'/);
    assert.match(body, /Add `\.no-autoinit`/);
    assert.match(body, /`instance\.destroy\(\)`/);
    assert.match(body, /`--md-sys-color-\*`/);
    assert.match(body, /48 by 48 dp/);
    assert.match(body, /Compact \| below 600 px/);
  });
});
