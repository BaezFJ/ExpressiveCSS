import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const skillUrl = new URL('../skills/expressivecss/SKILL.md', import.meta.url);
const skillDirectory = new URL('../skills/expressivecss/', import.meta.url);
const componentsDirectory = new URL('./components/', skillDirectory);
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const research = readFileSync(new URL('../docs/agents/expressivecss-skill-research.md', import.meta.url), 'utf8');
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const m3Guidelines = readFileSync(new URL('../m3-guidelines.md', import.meta.url), 'utf8');
const skill = readFileSync(skillUrl, 'utf8');
const bodyStart = skill.indexOf('\n---\n', 4);
const frontmatter = skill.slice(4, bodyStart);
const body = skill.slice(bodyStart + 5);

const supportGuides = [
  'expressivecss-install/SKILL.md',
  'expressivecss-design/SKILL.md',
  'expressivecss-usage/SKILL.md',
  'expressivecss-theming/SKILL.md',
  'expressivecss-runtime/SKILL.md',
  'expressivecss-accessibility/SKILL.md',
];

const decisionIndex = readFileSync(new URL('references/component-decisions.md', skillDirectory), 'utf8');
const usageGuideUrl = new URL('expressivecss-usage/SKILL.md', skillDirectory);
const gridReferenceUrl = new URL('expressivecss-usage/references/grid.md', skillDirectory);
const helpersReferenceUrl = new URL('expressivecss-usage/references/helpers.md', skillDirectory);
const themingGuideUrl = new URL('expressivecss-theming/SKILL.md', skillDirectory);
const foundationReferenceUrls = Object.fromEntries(['color', 'themes', 'elevation', 'icons', 'typography']
  .map((name) => [name, new URL(`expressivecss-theming/references/${name}.md`, skillDirectory)]));
const compiledCss = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const gridSass = readFileSync(new URL('../src/sass/base/_grid.scss', import.meta.url), 'utf8');
const spacingSass = readFileSync(new URL('../src/sass/utilities/_spacing.scss', import.meta.url), 'utf8');
const visibilitySass = readFileSync(new URL('../src/sass/utilities/_visibility.scss', import.meta.url), 'utf8');
const elevationSass = readFileSync(new URL('../src/sass/abstracts/_elevation.scss', import.meta.url), 'utf8');
const breakpointsSass = readFileSync(new URL('../src/sass/abstracts/_breakpoints.scss', import.meta.url), 'utf8');
const variablesSass = readFileSync(new URL('../src/sass/abstracts/_variables.scss', import.meta.url), 'utf8');
const referenceSass = readFileSync(new URL('../src/sass/tokens/_reference.scss', import.meta.url), 'utf8');
const themeSass = readFileSync(new URL('../src/sass/tokens/_theme.scss', import.meta.url), 'utf8');
const vibrantSass = readFileSync(new URL('../src/sass/tokens/_vibrant.scss', import.meta.url), 'utf8');
const globalSass = readFileSync(new URL('../src/sass/base/_global.scss', import.meta.url), 'utf8');
const baseTypographySass = readFileSync(new URL('../src/sass/base/_typography.scss', import.meta.url), 'utf8');
const colorsSass = readFileSync(new URL('../src/sass/utilities/_colors.scss', import.meta.url), 'utf8');
const scrimSass = readFileSync(new URL('../src/sass/components/_scrim.scss', import.meta.url), 'utf8');
const iconSass = readFileSync(new URL('../src/sass/components/_icons-material-design.scss', import.meta.url), 'utf8');
const iconsDocs = readFileSync(new URL('../docs/src/pages/icons.astro', import.meta.url), 'utf8');
const typescaleSass = readFileSync(new URL('../src/sass/utilities/_typescale.scss', import.meta.url), 'utf8');
const componentEntries = [...decisionIndex.matchAll(/^\| \[([^\]]+)\]\(\.\.\/components\/([a-z-]+\.md)\) \|/gm)]
  .map((match) => ({ label: match[1], name: match[2] }));
const componentLinks = componentEntries.map(({ name }) => name);
const componentFiles = readdirSync(componentsDirectory)
  .filter((name) => name.endsWith('.md'))
  .sort();
const retiredClasses = new Set([
  'btn',
  'modal',
  'nav-wrapper',
  'brand-logo',
  'card-content',
  'lever',
  'filled-in',
  'materialize-textarea',
  'input-field',
]);

describe('the ExpressiveCSS agent skill', () => {
  test('is a portable root skill with a concise discovery trigger', () => {
    assert.ok(skill.startsWith('---\n'));
    assert.ok(bodyStart > 4, 'frontmatter is not closed');
    assert.match(frontmatter, /^name: expressivecss$/m);
    assert.match(frontmatter, /^  author: BaezFJ$/m);
    assert.match(frontmatter, /^  version: "0\.6\.0"$/m);

    const description = frontmatter.match(/^description: (.+)$/m)?.[1];
    assert.ok(description, 'description is missing');
    assert.ok(description.length <= 60, `description is ${description.length} characters`);
    assert.ok(description.endsWith('.'), 'description is not a sentence');
    assert.match(description, /^Use ExpressiveCSS for accessible Material 3 interfaces\.$/);
    assert.doesNotMatch(skill, /\/home\/|[A-Z]:\\Users\\/, 'skill contains a machine-local path');
    assert.doesNotMatch(skill, /\]\(\.\.\//, 'root skill links outside the portable skill directory');
  });

  test('routes each task to a focused guide with valid frontmatter', () => {
    for (const path of supportGuides) {
      assert.ok(body.includes(`](${`./${path}`})`), `${path} is not linked from the root skill`);
      const url = new URL(path, skillDirectory);
      assert.ok(existsSync(url), `${path} does not exist`);
      const guide = readFileSync(url, 'utf8');
      assert.ok(guide.startsWith('---\n'), `${path} has no frontmatter`);
      assert.match(guide, new RegExp(`^name: ${path.split('/')[0]}$`, 'm'));
      const description = guide.match(/^description: (.+)$/m)?.[1];
      assert.ok(description, `${path} has no description`);
      assert.ok(description.length <= 60, `${path} description is too long`);
      assert.ok(description.endsWith('.'), `${path} description is not a sentence`);
      assert.doesNotMatch(guide, /\/home\/|[A-Z]:\\Users\\/, `${path} contains a machine-local path`);
      assert.doesNotMatch(guide, /\]\(\.\.\/\.\.\//, `${path} links outside the portable skill directory`);
    }
  });

  test('lets the generated decision index own every component guide exactly once', () => {
    assert.match(decisionIndex, /^<!-- Generated by scripts\/gen-expressivecss-skill\.mjs\. Do not edit\. -->/);
    assert.equal(componentFiles.length, 46);
    assert.deepEqual([...componentLinks].sort(), componentFiles);
    assert.equal(new Set(componentLinks).size, componentLinks.length, 'a component guide is listed more than once');
    assert.doesNotMatch(body, /\]\(\.\/components\/[a-z-]+\.md\)/, 'root skill duplicates the generated inventory');
    assert.match(body, /decision index[\s\S]*owns the complete component inventory/i);
    assert.match(body, /Read every plausible candidate guide identified by the index before choosing/i);

    for (const name of componentFiles) {
      const guideUrl = new URL(name, componentsDirectory);
      const guide = readFileSync(guideUrl, 'utf8');
      assert.match(guide, /^<!-- Generated by scripts\/gen-expressivecss-skill\.mjs\. Do not edit\. -->/);
      const title = guide.match(/^### (.+)$/m)?.[1];
      assert.equal(title, componentEntries.find((entry) => entry.name === name)?.label);
      assert.match(guide, /\[Component documentation\]\(https:\/\/www\.expressivecss\.com\/.+\.html\.md\)/);
      const sourcePath = guide.match(
        /\[Repository source\]\(https:\/\/github\.com\/BaezFJ\/ExpressiveCSS\/blob\/master\/(docs\/src\/pages\/.+\.astro)\)/,
      )?.[1];
      assert.ok(sourcePath, `${name} has no portable repository source link`);
      assert.ok(existsSync(new URL(`../${sourcePath}`, import.meta.url)), `${name} source link is broken`);
      assert.match(guide, /#### Contract/);
      assert.match(guide, /#### Syntax\n\n```(?:html|js)/);
      assert.match(guide, /#### Rules/);
      const syntax = guide.match(/#### Syntax\n\n```(?:html|js)\n([\s\S]+?)\n```/)?.[1];
      assert.ok(syntax, `${name} has no complete syntax example`);
      const syntaxClasses = [...syntax.matchAll(/class=["']([^"']+)["']/g)]
        .flatMap((match) => match[1].split(/\s+/));
      assert.deepEqual(
        syntaxClasses.filter((className) => retiredClasses.has(className)),
        [],
        `${name} must not teach retired Materialize classes`,
      );
      assert.doesNotMatch(guide, /\]\(\.\.\/\.\.\//, `${name} links outside the portable skill directory`);
      assert.doesNotMatch(guide, /\]\(#[^)]+\)/, `${name} contains a fragment from its source document`);
      assert.doesNotMatch(guide, /\/home\/|[A-Z]:\\Users\\/, `${name} contains a machine-local path`);
    }
  });

  test('keeps generated contracts focused on the selected component', () => {
    const guide = (name) => readFileSync(new URL(name, componentsDirectory), 'utf8');
    assert.match(guide('snackbar.md'), /#### Syntax\n\n```js\nnew Expressive\.Snackbar/);
    assert.doesNotMatch(guide('buttons.md'), /The FAB's actions|aria-expanded/);
    assert.doesNotMatch(guide('date-picker.md'), /A <dialog> takes no name/);
    assert.doesNotMatch(guide('time-picker.md'), /A <dialog> takes no name/);
    assert.doesNotMatch(guide('chips.md'), /^\| Type \|/m);
    assert.doesNotMatch(guide('progress.md'), /\]\(#loading-indicator\)/);
    const appBar = guide('app-bar.md');
    assert.match(appBar, /AppBar/);
    assert.match(appBar, /search-bar/);
    assert.match(appBar, /headline-medium/);
    assert.match(appBar, /display-small/);
    assert.match(appBar, /hgroup/);
    assert.match(appBar, /collaps/);
  });

  test('keeps the generated Cards guide load-bearing contract complete', () => {
    const cards = readFileSync(new URL('cards.md', componentsDirectory), 'utf8');
    assert.match(cards, /direct [`<]*a\.primary-action/);
    assert.match(cards, /no second (?:link|action|control)/);
    assert.match(cards, /dragged.*picked-up.*16%.*hovered.*pressed/is);
    assert.match(cards, /horizontal.*below 600px/is);
    assert.match(cards, /button\.card-reveal-trigger\[type="button"\]/);
    assert.match(cards, /exactly one identified direct [`<]*aside/);
    assert.match(cards, /rejected.*remain visible/is);
    assert.match(cards, /closest [`<]*article.*outer reveal panel/is);
    assert.match(cards, /aria-controls.*aria-expanded.*inert.*Escape.*focus/is);
  });

  test('keeps card actions out of navigation landmarks', () => {
    assert.doesNotMatch(m3Guidelines, /Actions \(`<nav>` of buttons/);
    assert.match(m3Guidelines, /Actions \(`<div class="actions">` of buttons/);
  });

  test('keeps generated component guides synchronized with their sources', () => {
    assert.equal(
      packageJson.scripts['build:skill'],
      'node scripts/gen-expressivecss-skill.mjs && node mcp/expressivecss/scripts/sync-guides.mjs',
    );
    const result = spawnSync(process.execPath, ['scripts/gen-expressivecss-skill.mjs', '--check'], {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    assert.match(result.stdout, /46 ExpressiveCSS component guides are current\./);

    const mcpResult = spawnSync(
      process.execPath,
      ['mcp/expressivecss/scripts/sync-guides.mjs', '--check'],
      { cwd: new URL('..', import.meta.url), encoding: 'utf8' },
    );
    assert.equal(mcpResult.status, 0, `${mcpResult.stdout}${mcpResult.stderr}`);
    assert.match(mcpResult.stdout, /Verified 46 bundled guides and normative semantics\./);
  });

  test('assigns authority by question and version', () => {
    for (const url of [
      'https://www.expressivecss.com/m3-guidelines.md',
      'https://www.expressivecss.com/llm.md',
      'https://github.com/BaezFJ/ExpressiveCSS/blob/master/semantics.json',
      'https://www.expressivecss.com/SEMANTICS.md',
      'https://github.com/BaezFJ/ExpressiveCSS/blob/master/docs/agents/expressivecss-skill-research.md',
    ]) {
      assert.ok(skill.includes(`](${url})`), `${url} is not linked`);
    }

    assert.match(body, /## Authority by question/);
    assert.doesNotMatch(body, /Resolve decisions in this order/);
    assert.match(body, /\*\*Design intent:\*\*.*component choice.*adaptive behavior/);
    assert.match(body, /\*\*Shipped contract:\*\*.*elements.*classes.*options.*methods/);
    assert.match(body, /\*\*Authored semantics:\*\*.*semantics\.json/);
    assert.match(body, /\*\*Runtime truth:\*\*.*Sass.*TypeScript.*tests/);
    assert.match(body, /older.*installed version.*matching repository tag/is);
  });

  test('keeps the load-bearing design, usage, runtime, theme, and accessibility rules', () => {
    const install = readFileSync(new URL('expressivecss-install/SKILL.md', skillDirectory), 'utf8');
    const design = readFileSync(new URL('expressivecss-design/SKILL.md', skillDirectory), 'utf8');
    const usage = readFileSync(new URL('expressivecss-usage/SKILL.md', skillDirectory), 'utf8');
    const runtime = readFileSync(new URL('expressivecss-runtime/SKILL.md', skillDirectory), 'utf8');
    const theming = readFileSync(new URL('expressivecss-theming/SKILL.md', skillDirectory), 'utf8');
    const accessibility = readFileSync(new URL('expressivecss-accessibility/SKILL.md', skillDirectory), 'utf8');

    assert.match(install, /https:\/\/www\.expressivecss\.com\/index\.html\.md/);
    assert.doesNotMatch(install, /getting-started\.html\.md/);
    assert.match(install, /older.*installed version.*node_modules.*matching repository tag/is);
    assert.match(design, /new surface|refinement|redesign/i);
    assert.match(design, /Material 3 Expressive/);
    assert.match(design, /brand.*tokens/i);
    assert.match(design, /Compact.*Medium.*Expanded.*Large.*Extra-large/s);
    assert.match(design, /loading.*empty.*error.*success/s);
    assert.match(design, /48 by 48 dp/);
    assert.doesNotMatch(design, /44(?:×|x| by )44/);
    assert.match(design, /semantics contract.*authored semantics/i);
    assert.match(design, /Roboto.*Noto.*tokens/s);
    assert.doesNotMatch(design, /density/i);
    assert.match(design, /independent.*review/i);
    assert.match(design, /two.*inspection rounds/i);
    assert.doesNotMatch(design, /imitate|clone|pixel-match/i);
    assert.match(research, /source that owns each question/);
    assert.doesNotMatch(research, /use this order/);
    assert.match(research, /`semantics\.json` governs authored element choice/);
    assert.match(research, /does \*\*not\*\* import.*font prohibitions.*aesthetic bans/s);
    assert.match(changelog, /every reachable state/);
    assert.match(usage, /`\.loading-indicator` for a short indeterminate wait/);
    assert.match(usage, /`\.icon-button` for the Material 3 icon-button component/);
    assert.match(usage, /`\.button\.circle` is the older round common-button form/);
    assert.match(runtime, /Never use `AutoInit\(\)` and `Component\.init\(\)` on the same element/);
    assert.match(runtime, /Add `no-autoinit`/);
    assert.match(runtime, /current\?\.destroy\(\)/);
    assert.match(theming, /live `--md-sys-color-\*` tokens/);
    assert.match(theming, /color-mix\(in oklab/);
    assert.match(accessibility, /48 by 48 dp/);
    assert.match(accessibility, /composite roles/);
    assert.doesNotMatch(accessibility, /presence of state attributes/);
    assert.match(accessibility, /explicitly requires? at author time/);
  });

  test('gives agents exact grid and helper-class references', () => {
    const usage = readFileSync(usageGuideUrl, 'utf8');
    assert.ok(existsSync(gridReferenceUrl), 'grid reference is missing');
    assert.ok(existsSync(helpersReferenceUrl), 'helpers reference is missing');
    assert.match(usage, /\[grid reference\]\(\.\/references\/grid\.md\)/i);
    assert.match(usage, /\[helper-class reference\]\(\.\/references\/helpers\.md\)/i);

    const grid = readFileSync(gridReferenceUrl, 'utf8');
    assert.match(grid, /`\.row`[\s\S]*`\.s1`[–-]`\.s12`[\s\S]*`\.xxl1`[–-]`\.xxl12`/);
    assert.match(grid, /Compact[\s\S]*Medium[\s\S]*Expanded[\s\S]*Large[\s\S]*Extra-large/);
    assert.match(grid, /`\.container`[\s\S]*`\.container\.wide`[\s\S]*`\.container\.max`/);
    assert.match(grid, /`\.offset-\{prefix\}\{1\.\.11\}`/);
    assert.match(grid, /`\.g-0`[–-]`\.g-5`/);
    assert.match(grid, /Do not use `push-\*` or `pull-\*`/);
    assert.match(grid, /wider span class[\s\S]*resets[\s\S]*earlier offset/i);

    const gridClasses = ['container', 'row', 'section', ...Array.from({ length: 6 }, (_, i) => `g-${i}`)];
    for (const prefix of ['s', 'm', 'l', 'xl', 'xxl']) {
      for (let i = 1; i <= 12; i += 1) gridClasses.push(`${prefix}${i}`);
      for (let i = 1; i <= 11; i += 1) gridClasses.push(`offset-${prefix}${i}`);
    }
    for (const className of gridClasses) {
      assert.match(compiledCss, new RegExp(`\\.${className}(?![\\w-])`), `compiled CSS omits .${className}`);
    }

    for (const [name, value] of [['medium', '600px'], ['expanded', '840px'], ['large', '1200px'], ['extra-large', '1600px']]) {
      assert.match(breakpointsSass, new RegExp(`"${name}"\\s*:\\s*${value}`));
      assert.ok(grid.includes(value), `grid reference omits ${value}`);
    }
    for (const [className, multiplier] of [['g-0', '0'], ['g-1', '0.25'], ['g-2', '0.5'], ['g-3', '1'], ['g-4', '1.5'], ['g-5', '3']]) {
      assert.match(gridSass, new RegExp(`\\.${className}\\s*\\{\\s*gap:\\s*(?:calc\\()?${multiplier}`));
      assert.ok(grid.includes(`| \`.${className}\` | ${multiplier} |`), `grid reference has the wrong ${className} multiplier`);
    }

    const helpers = readFileSync(helpersReferenceUrl, 'utf8');
    assert.match(helpers, /`\{m\|p\}\{side\?\}-\{value\}`/);
    assert.match(helpers, /`0`, `1`, `2`, `3`, `4`, `5`, `6`, `auto`/);
    assert.match(helpers, /`auto` is meaningful for margin only/i);
    assert.match(helpers, /combine a base `\.hide` with one `\.show-on-\*` class/i);
    for (const className of [
      'valign-wrapper', 'left-align', 'right-align', 'center-align', 'center-on-small-only',
      'divider', 'no-select', 'circle', 'center-block', 'truncate', 'no-padding',
      'responsive-img', 'responsive-video', 'video-container', 'hoverable', 'browser-default',
    ]) assert.ok(helpers.includes(`\`.${className}\``), `helpers reference omits .${className}`);
    for (const className of ['z-depth-0', 'z-depth-1', 'z-depth-1-half', 'z-depth-2', 'z-depth-3', 'z-depth-4', 'z-depth-5']) {
      assert.ok(helpers.includes(`\`.${className}\``), `helpers reference omits .${className}`);
      assert.match(compiledCss, new RegExp(`\\.${className}(?![\\w-])`), `compiled CSS omits .${className}`);
    }
    assert.match(helpers, /`\.z-depth-0`[\s\S]*`!important`/);
    assert.match(elevationSass, /"0": none[\s\S]*"1-half":[\s\S]*"5":/);
    assert.match(elevationSass, /box-shadow: none !important/);
    assert.match(helpers, /`\.hide-on-med-and-down`[\s\S]*below 840px/i);
    assert.match(helpers, /`\.hide-on-med-and-up`[\s\S]*600px and above/i);
    assert.doesNotMatch(helpers, /`\.hide-on-med-and-(?:down|up)`[^\n]*alias/i);
    assert.match(helpers, /`\.hoverable`[\s\S]*fixed hover shadow/i);

    const spacingClasses = [];
    for (const prefix of ['m', 'p']) {
      for (const side of ['', 't', 'r', 'b', 'l', 'x', 'y']) {
        for (const value of ['0', '1', '2', '3', '4', '5', '6', 'auto']) spacingClasses.push(`${prefix}${side}-${value}`);
      }
    }
    for (const className of spacingClasses) {
      assert.match(compiledCss, new RegExp(`\\.${className}(?![\\w-])`), `compiled CSS omits .${className}`);
    }
    for (const [name, value] of [['0', '0'], ['1', '0.25rem'], ['2', '0.5rem'], ['3', '0.75rem'], ['4', '1rem'], ['5', '1.5rem'], ['6', '3rem'], ['auto', 'auto']]) {
      assert.match(spacingSass, new RegExp(`"${name}"\\s*:\\s*${value.replace('.', '\\.')}`));
      assert.ok(helpers.includes(`| \`${name}\` | \`${value}\` |`), `helpers reference has the wrong spacing value for ${name}`);
    }
    for (const className of [...new Set([...visibilitySass.matchAll(/\.([a-z][\w-]+)/g)].map((match) => match[1]))]) {
      assert.ok(helpers.includes(`\`.${className}\``), `helpers reference omits .${className}`);
      assert.match(compiledCss, new RegExp(`\\.${className}(?![\\w-])`), `compiled CSS omits .${className}`);
    }

    for (const [name, content] of [['grid', grid], ['helpers', helpers]]) {
      assert.doesNotMatch(content, /\/home\/|[A-Z]:\\Users\\/, `${name} reference contains a machine-local path`);
      assert.doesNotMatch(content, /\]\(\.\.\/\.\.\//, `${name} reference links outside the portable skill directory`);
    }
  });

  test('gives agents source-checked foundation references', () => {
    const theming = readFileSync(themingGuideUrl, 'utf8');
    const references = {};
    for (const [name, url] of Object.entries(foundationReferenceUrls)) {
      assert.ok(existsSync(url), `${name} foundation reference is missing`);
      assert.match(theming, new RegExp(`\\[${name} reference\\]\\(\\.\\/references\\/${name}\\.md\\)`, 'i'));
      references[name] = readFileSync(url, 'utf8');
      assert.doesNotMatch(references[name], /\/home\/|[A-Z]:\\Users\\/, `${name} reference contains a machine-local path`);
    }

    const roleBlock = variablesSass.match(/\$sys-color-roles:\s*\(([\s\S]*?)\)\s*!default;/)?.[1] ?? '';
    const colorRoles = [...roleBlock.matchAll(/"([a-z-]+)"/g)].map((match) => match[1]);
    assert.ok(colorRoles.length > 0, 'could not read color roles from Sass');
    for (const role of colorRoles) {
      assert.ok(references.color.includes(`\`.${role}\``), `color reference omits .${role}`);
      assert.ok(references.color.includes(`\`.${role}-text\``), `color reference omits .${role}-text`);
      assert.match(compiledCss, new RegExp(`\\.${role}(?![\\w-])`), `compiled CSS omits .${role}`);
      assert.match(compiledCss, new RegExp(`\\.${role}-text(?![\\w-])`), `compiled CSS omits .${role}-text`);
    }
    assert.match(references.color, /background class[\s\S]*`-text`[\s\S]*foreground/i);
    assert.match(references.color, /container[\s\S]*matching `on-\*`/i);
    assert.match(references.color, /color-mix\(in oklab/);
    assert.match(references.color, /Do not write `rgba\(var\(--md-sys-color-/);
    const roleNamedColors = colorsSass.match(/\$_role-named:\s*([^;]+);/)?.[1].match(/[a-z][a-z-]+/g) ?? [];
    assert.deepEqual(roleNamedColors, ['primary-container', 'secondary-container', 'tertiary-container']);
    assert.match(colorsSass, /\$_role-named-hosts:\s*":not\(\.extend\):not\(\.fab-menu\)"/);
    assert.match(references.color, /`primary-container`, `secondary-container`, and `tertiary-container`[\s\S]*`.extend`[\s\S]*`.fab-menu`[\s\S]*`-text` forms still apply/);
    assert.doesNotMatch(references.color, /class="[^"]*button[^"]*\b(?:primary|secondary|tertiary|error)(?:-container)?\b/);
    assert.match(scrimSass, /--md-comp-scrim-color:\s*color-mix\(in oklab, var\(--md-sys-color-scrim\) 32%, transparent\)/);
    assert.match(references.color, /`.scrim` is the opaque system role[\s\S]*`--md-comp-scrim-color`/);

    for (const scheme of ['light', 'dark', 'auto']) assert.ok(themeSass.includes(`:root[theme='${scheme}']`));
    assert.match(references.themes, /no `theme` attribute[\s\S]*`theme="auto"`[\s\S]*`theme="light"`[\s\S]*`theme="dark"`/i);
    assert.match(references.themes, /no `Expressive\.theme`/);
    assert.match(referenceSass, /--md-source:/);
    assert.match(references.themes, /`--md-source`[\s\S]*error ramp[\s\S]*does not/i);
    assert.match(vibrantSass, /\[vibrant\],[\s\S]*:host\(\[vibrant\]\)/);
    assert.match(references.themes, /`\[vibrant\]`[\s\S]*focused subtree[\s\S]*not[\s\S]*whole page/i);

    const elevationBlock = elevationSass.match(/\$elevations:\s*\(([\s\S]*?)\)\s*!default;/)?.[1] ?? '';
    const elevationKeys = [...elevationBlock.matchAll(/"([\w-]+)"\s*:/g)].map((match) => match[1]);
    assert.ok(elevationKeys.length > 0, 'could not read elevation levels from Sass');
    for (const level of elevationKeys) {
      assert.ok(references.elevation.includes(`\`.z-depth-${level}\``), `elevation reference omits .z-depth-${level}`);
      assert.match(compiledCss, new RegExp(`\\.z-depth-${level}(?![\\w-])`));
    }
    assert.match(references.elevation, /`\.z-depth-0`[\s\S]*`!important`/);
    assert.match(references.elevation, /`@include z-depth\("2"\)`[\s\S]*not[\s\S]*`@extend/i);
    assert.doesNotMatch(compiledCss, /--md-sys-elevation/);
    assert.match(references.elevation, /does not publish CSS custom-property elevation levels/);
    assert.match(references.elevation, /fixed shadow can lower an element that already has a higher elevation/);

    for (const className of ['material-symbols', 'material-symbols-outlined', 'material-symbols-rounded', 'material-symbols-sharp', 'material-icons', 'icon-filled']) {
      assert.ok(references.icons.includes(`\`.${className}\``), `icons reference omits .${className}`);
      assert.match(compiledCss, new RegExp(`\\.${className}(?![\\w-])`), `compiled CSS omits .${className}`);
    }
    for (const token of ['--md-icon-font', '--md-icon-fill', '--md-icon-weight', '--md-icon-grade', '--md-icon-optical-size']) {
      assert.ok(iconSass.includes(`${token}:`), `icon Sass omits ${token}`);
      assert.ok(references.icons.includes(`\`${token}\``), `icons reference omits ${token}`);
    }
    const normalizedIconReference = references.icons.replaceAll('`', '');
    for (const range of ['0 or 1', '100–700', '−50–200', '20–48']) {
      assert.ok(iconsDocs.includes(range), `icon docs omit ${range}`);
      assert.ok(normalizedIconReference.includes(range), `icons reference omits ${range}`);
    }
    assert.match(references.icons, /convenience presets; they do not restrict per-icon axis values/);
    assert.match(references.icons, /`icon-style="outlined"`[\s\S]*`icon-style="rounded"`[\s\S]*`icon-style="sharp"`/);
    for (const style of ['outlined', 'rounded', 'sharp']) {
      assert.ok(iconSass.includes(`[icon-style="${style}"]`));
      assert.ok(references.icons.includes(`\`icon-style="${style}"\``));
    }
    assert.match(references.icons, /decorative[\s\S]*`aria-hidden="true"`[\s\S]*icon-only[\s\S]*accessible name/i);
    for (const [size, value, optical] of [['tiny', '1rem', '20'], ['small', '2rem', '24'], ['medium', '4rem', '40'], ['large', '6rem', '48']]) {
      assert.match(iconSass, new RegExp(`&\\.${size}[\\s\\S]*?font-size:\\s*${value}`));
      assert.match(iconSass, new RegExp(`&\\.${size}[\\s\\S]*?--md-icon-optical-size:\\s*${optical}`));
      assert.ok(references.icons.includes(`| \`.${size}\` | \`${value}\` | \`${optical}\` |`), `icons reference has the wrong .${size} size`);
    }
    assert.match(iconSass, /&\.left[\s\S]*margin-left:\s*-8px/);
    assert.match(references.icons, /`\.left`[\s\S]*`margin-left: -8px`/);

    const typeRoleBlock = typescaleSass.match(/\$typescale-roles:\s*\(([\s\S]*?)\)\s*!default;/)?.[1] ?? '';
    const typeRoles = [...typeRoleBlock.matchAll(/"([a-z-]+)"/g)].map((match) => match[1]);
    assert.equal(typeRoles.length, 15);
    for (const role of typeRoles) {
      assert.ok(references.typography.includes(`\`.${role}\``), `typography reference omits .${role}`);
      assert.match(compiledCss, new RegExp(`\\.${role}(?![\\w-])`), `compiled CSS omits .${role}`);
      const metric = (property) => referenceSass.match(new RegExp(`--md-sys-typescale-${role}-${property}:\\s*([^;]+);`))?.[1];
      const values = ['font-size', 'line-height', 'font-weight', 'letter-spacing'].map(metric);
      assert.ok(values.every(Boolean), `typography source omits metrics for ${role}`);
      assert.ok(
        references.typography.includes(`| \`.${role}\` | ${values.map((value) => `\`${value}\``).join(' | ')} |`),
        `typography reference has the wrong metrics for .${role}`,
      );
    }
    for (const className of ['italic', 'bold', 'light', 'thin', 'underline', 'overline', 'upper', 'lower', 'capitalize', 'flow-text']) {
      assert.ok(references.typography.includes(`\`.${className}\``), `typography reference omits .${className}`);
      assert.match(compiledCss, new RegExp(`\\.${className}(?![\\w-])`), `compiled CSS omits .${className}`);
    }
    assert.match(references.typography, /semantic HTML first/i);
    assert.match(references.typography, /type-role loop and text helpers live in `src\/sass\/utilities\/_typescale\.scss`/);
    assert.match(references.typography, /element defaults and `\.flow-text` live in `src\/sass\/base\/_typography\.scss`/);
    assert.match(baseTypographySass, /body\s*\{[\s\S]*?@include typescale\("body-medium"\)/);
    assert.match(references.typography, /`body` uses body-medium/);
    const flowTextSize = compiledCss.match(/\.flow-text\s*\{\s*font-size:\s*([^;]+);/)?.[1];
    assert.equal(flowTextSize, 'clamp(1.2rem, 0.912rem + 1.28vw, 1.68rem)');
    assert.ok(references.typography.includes(`\`${flowTextSize}\``));
    assert.match(references.typography, /role utilities consume all except `-font-family-style`/);
    assert.match(typescaleSass, /\.bold\s*\{\s*font-weight:\s*500/);
    assert.match(references.typography, /`\.bold` \| `font-weight: 500`/);
    assert.match(references.typography, /`--md-ref-typeface-brand`[\s\S]*`--md-ref-typeface-plain`[\s\S]*`--md-ref-typeface-fallback`/);
    assert.match(globalSass, /a\s*\{[\s\S]*?text-decoration:\s*none;/);
    assert.match(references.typography, /Links use the primary role and remove text decoration by default/);
    assert.doesNotMatch(references.typography, /`\.(?:large|medium|small)-text`/);
  });

  test('defines explicit design operating modes and edit boundaries', () => {
    const design = readFileSync(new URL('expressivecss-design/SKILL.md', skillDirectory), 'utf8');
    const modeLine = (mode) => design.match(new RegExp(`^- \\*\\*${mode}\\.\\*\\*.+$`, 'm'))?.[0] ?? '';

    for (const mode of ['Implement', 'Refine', 'Redesign', 'Critique', 'Audit']) {
      assert.ok(modeLine(mode), `${mode} mode is missing`);
    }

    assert.match(modeLine('Implement'), /change code.*render.*test.*evidence/i);
    assert.match(modeLine('Refine'), /preserve.*identity.*content.*information architecture/i);
    assert.match(modeLine('Redesign'), /structural changes.*product requirements/i);
    assert.match(modeLine('Critique'), /visual hierarchy.*without editing/i);
    assert.match(modeLine('Audit'), /measurable.*semantics.*runtime.*responsive.*accessibility.*without editing/i);
    assert.match(design, /Choose one operating mode, or run Critique followed by Audit for a combined review/i);
    assert.match(design, /critique before (?:the )?audit/i);
    assert.match(body, /\| Visual Critique \| Design, Usage, Theming, Accessibility \|/);
    assert.match(body, /\| JavaScript-backed Audit \| Design, Usage, Runtime, Accessibility, selected component guides \|/);
    assert.match(design, /Implement, Refine, Redesign, or a review where the user separately requested fixes[\s\S]*fix the first evidence batch/i);
    assert.match(design, /In Critique or Audit alone, stop after reporting/i);
  });

  test('uses an evidence-based Material review matrix without a numeric score', () => {
    const design = readFileSync(new URL('expressivecss-design/SKILL.md', skillDirectory), 'utf8');
    const matrix = readFileSync(new URL('expressivecss-design/references/review-matrix.md', skillDirectory), 'utf8');

    assert.match(design, /\[review matrix\]\(\.\/references\/review-matrix\.md\)/i);
    assert.match(matrix, /Pass[\s\S]*Intentional adaptation[\s\S]*Fail[\s\S]*Not applicable[\s\S]*Blocked/);
    assert.match(matrix, /Criterion ID \| Area \| Scope dimension \| Falsifiable claim and pass threshold \| Allowed evidence \| Required evidence \| Allowed statuses/);
    assert.match(matrix, /Do not calculate a numeric or aggregate score/i);
    assert.match(matrix, /Intentional adaptation[\s\S]*soft design default[\s\S]*recorded reason/i);
    assert.match(matrix, /Not applicable[\s\S]*fixture or brief proves/i);
  });

  test('splits Critique and Audit into atomic evidence rows with honest statuses', () => {
    const matrix = readFileSync(new URL('expressivecss-design/references/review-matrix.md', skillDirectory), 'utf8');
    const critiqueStart = matrix.indexOf('## Critique matrix');
    const auditStart = matrix.indexOf('## Audit matrix');

    assert.ok(critiqueStart >= 0, 'Critique matrix is missing');
    assert.ok(auditStart > critiqueStart, 'Audit must follow Critique');

    const critique = matrix.slice(critiqueStart, auditStart);
    const audit = matrix.slice(auditStart);
    for (const criterion of [
      'Task hierarchy',
      'Emphasis',
      'Containment',
      'Shape',
      'Type',
      'Icon treatment',
      'Motion',
      'State layers',
      'Visual coherence',
      'Adaptive composition',
      'Themes',
      'Content fit',
      'Visible state communication',
    ]) {
      assert.match(critique, new RegExp(`\\| ${criterion} \\|`), `missing atomic Critique row: ${criterion}`);
    }
    for (const criterion of [
      'Host elements',
      'Anatomy',
      'Labels',
      'IDs',
      'Targets',
      'Relationships',
      'Authored semantics',
      'Runtime-owned ARIA',
      'Keyboard behavior',
      'Focus',
      'Announcements',
      'Contrast',
      'Zoom',
      'Reflow',
      'Touch targets',
      'RTL',
      'Reduced motion',
      'Initialization',
      'Teardown',
      'Console state',
      'Target-version conformance',
    ]) {
      assert.match(audit, new RegExp(`\\| ${criterion} \\|`), `missing atomic Audit row: ${criterion}`);
    }

    assert.equal([...critique.matchAll(/^\| C-[A-Z0-9-]+ \| Content fit \|/gm)].length, 2, 'long and localized content need separate rows');
    assert.equal([...audit.matchAll(/^\| A-[A-Z0-9-]+ \| Focus \|/gm)].length, 2, 'focus order and visibility need separate rows');
    assert.equal([...audit.matchAll(/^\| A-[A-Z0-9-]+ \| Contrast \|/gm)].length, 3, 'text and non-text contrast need separate rows');
    assert.equal([...audit.matchAll(/^\| A-[A-Z0-9-]+ \| RTL \|/gm)].length, 2, 'reading and interaction order need separate rows');
    assert.equal([...audit.matchAll(/^\| A-[A-Z0-9-]+ \| Initialization \|/gm)].length, 2, 'ownership and duplicate initialization need separate rows');
    assert.equal([...audit.matchAll(/^\| A-[A-Z0-9-]+ \| Teardown \|/gm)].length, 5, 'teardown obligations need separate rows');
    assert.match(matrix, /\*\*Blocked:\*\* the criterion applies, but a required evidence kind or path could not be collected/i);
    assert.match(matrix, /A missing screenshot blocks a row that requires `rendered-capture`; it does not block a source-proven host-element row\./i);
    assert.match(matrix, /Do not calculate a numeric or aggregate score/i);
  });

  test('requires a concrete review group for every selected component', () => {
    const design = readFileSync(new URL('expressivecss-design/SKILL.md', skillDirectory), 'utf8');
    const matrix = readFileSync(new URL('expressivecss-design/references/review-matrix.md', skillDirectory), 'utf8');
    const componentGroup = matrix.slice(matrix.indexOf('## Component review groups'));

    assert.match(design, /one review group per selected component/i);
    assert.match(componentGroup, /one group per selected component/i);
    for (const criterionId of [
      'A-HOST-ELEMENT',
      'A-ANATOMY',
      'A-LABEL',
      'A-ID-UNIQUE',
      'A-TARGET',
      'A-RELATIONSHIP',
      'A-AUTHORED-SEMANTICS',
      'A-RUNTIME-ARIA-SOURCE',
      'A-INIT-OWNER',
      'A-DESTROY-BEFORE-REMOVE',
      'A-CLEAN-LISTENER',
      'A-CLEAN-TIMER',
      'A-CLEAN-OVERLAY',
      'A-CLEAN-GENERATED-NODE',
    ]) {
      assert.ok(componentGroup.includes(`| \`<component-id>@${criterionId}\` |`), `missing component criterion: ${criterionId}`);
    }
    assert.match(componentGroup, /copy or link each applicable generated-guide rule/i);
    assert.match(componentGroup, /family group is allowed only when every member shares the exact contract fact/i);
  });

  test('uses a bounded evidence ledger for states, boundaries, and matched captures', () => {
    const design = readFileSync(new URL('expressivecss-design/SKILL.md', skillDirectory), 'utf8');
    const ledgerUrl = new URL('expressivecss-design/references/evidence-ledger.md', skillDirectory);

    assert.ok(existsSync(ledgerUrl), 'evidence ledger does not exist');
    const ledger = readFileSync(ledgerUrl, 'utf8');
    assert.match(design, /\[evidence ledger\]\(\.\/references\/evidence-ledger\.md\)/i);
    assert.match(ledger, /Fixture-owned coverage inventory/);
    assert.match(ledger, /immediately below and one immediately above/i);
    assert.match(ledger, /representative combinations named by the fixture or brief/i);
    assert.match(ledger, /do not require an undeclared full Cartesian product/i);
    assert.match(ledger, /missing required artifact is `Blocked`/i);
    assert.match(ledger, /screenshots, accessibility-tree captures, source locations, runtime traces, commands, and test output/i);

    assert.match(design, /Refine and Redesign[\s\S]*matched before-and-after/i);
    for (const field of [
      'Route', 'Task point', 'Data fixture ID', 'State', 'Viewport width and height',
      'Device scale factor', 'Color scheme', 'Motion preference', 'Locale', 'Direction',
      'Before artifact', 'After artifact', 'Blocker reason',
    ]) assert.ok(ledger.includes(`| ${field} |`), `missing matched-capture field: ${field}`);
    assert.match(ledger, /intended, framework-required, or regression/i);
    assert.match(ledger, /unavailable baseline.*before editing/is);
  });

  test('defines falsifiable matrix claims with criterion-owned evidence rules', () => {
    const matrix = readFileSync(new URL('expressivecss-design/references/review-matrix.md', skillDirectory), 'utf8');
    const rows = matrix.split('\n')
      .filter((line) => /^\| (?:C|A)-[A-Z0-9-]+ \|/.test(line))
      .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
    const allowedEvidence = new Set([
      'rendered-capture', 'interaction-trace', 'accessibility-tree', 'source', 'computed-style',
      'runtime-inspection', 'test-output', 'contrast-measurement', 'version-resolution',
    ]);

    assert.ok(rows.length >= 30, `expected atomic matrix rows, got ${rows.length}`);
    assert.equal(new Set(rows.map(([id]) => id)).size, rows.length, 'criterion IDs must be unique');
    for (const [id, area, scope, claim, allowed, required, statuses] of rows) {
      assert.match(id, /^(?:C|A)-[A-Z0-9-]+$/);
      assert.ok(area && scope && claim && allowed && required && statuses, `${id} has an empty contract field`);
      assert.doesNotMatch(claim, /^(?:Emphasis|Shape|Themes|Focus|Adaptive composition)$/i, `${id} is only a label`);
      const allowedKinds = allowed.split(', ').map((value) => value.replaceAll('`', ''));
      const requiredKinds = required.split(', ').map((value) => value.replaceAll('`', ''));
      assert.ok(allowedKinds.every((kind) => allowedEvidence.has(kind)), `${id} has an unknown allowed evidence kind`);
      assert.ok(requiredKinds.every((kind) => allowedKinds.includes(kind)), `${id} requires evidence it does not allow`);
      assert.match(statuses, /Pass.*Fail.*Not applicable.*Blocked/);
    }

    const hardContracts = rows.filter(([id]) => id.startsWith('A-'));
    assert.ok(hardContracts.length > 0);
    for (const [id, , , , , , statuses] of hardContracts) {
      assert.doesNotMatch(statuses, /Intentional adaptation/, `${id} lets adaptation waive an Audit contract`);
    }
    assert.match(matrix, /Create one criterion instance per distinct component, route, task point, state, width, scheme, locale, direction, or input path when results can differ\./i);
    assert.match(matrix, /A family group is allowed only when every member shares the exact contract fact under review\./i);
  });

  test('ties ledger records and matched pairs to fixture-owned observations', () => {
    const ledger = readFileSync(new URL('expressivecss-design/references/evidence-ledger.md', skillDirectory), 'utf8');
    for (const heading of ['## Fixture-owned coverage inventory', '## Evidence records', '## Matched capture pairs']) {
      assert.ok(ledger.includes(heading), `missing ${heading}`);
    }
    assert.match(ledger, /\| Inventory ID \| Kind \| Required value \| Applies at \|/);
    assert.match(ledger, /\| Criterion instance ID \| Criterion ID \| Component ID \| Inventory ID \| Expected observation \| Evidence kind \| Artifact \| Sequence \| Timestamp \| Result \| Blocker reason \|/);
    assert.match(ledger, /compare the completed ledger keys to this inventory/i);
    assert.match(ledger, /long content, theme, input path, locale, and direction are dimensions, not states/i);
    assert.match(ledger, /Critique evidence.*smaller sequence number and earlier timestamp than.*Audit evidence/is);
    assert.match(ledger, /\| Pair ID \| First edit sequence and timestamp \| Baseline sequence and timestamp \| Route \| Task point \| Data fixture ID \| State \| Viewport width and height \| Device scale factor \| Color scheme \| Motion preference \| Locale \| Direction \| Before artifact \| After artifact \| Blocker reason \|/);
    assert.match(ledger, /exact string or numeric equality across every declared dimension/i);
    assert.match(ledger, /baseline.*predate the first edit/i);
    assert.match(ledger, /one difference row for every visible difference/i);
    assert.match(ledger, /unavailable baseline.*block.*comparison claims/is);
  });

  test('uses one staged routing truth table with baseline interface guides and conditional features', () => {
    const design = readFileSync(new URL('expressivecss-design/SKILL.md', skillDirectory), 'utf8');
    const routing = body.slice(body.indexOf('## Staged guide routing'), body.indexOf('## Component guides'));
    const expectedRows = [
      ['Setup only', 'Install', 'Design, Usage, Theming, Runtime, Accessibility, component guides'],
      ['CSS-only static markup', 'Usage, Accessibility, selected component guides', 'Install, Design, Theming, Runtime'],
      ['Token-only theming', 'Theming', 'Install, Design, Usage, Runtime, Accessibility, component guides'],
      ['Visual Critique', 'Design, Usage, Theming, Accessibility', 'Install, Runtime'],
      ['CSS-only Audit', 'Design, Usage, Accessibility, selected component guides', 'Install, Theming, Runtime'],
      ['JavaScript-backed Audit', 'Design, Usage, Runtime, Accessibility, selected component guides', 'Install, Theming'],
      ['Manual initialization', 'Usage, Runtime, Accessibility, selected component guides', 'Install, Design, Theming'],
    ];

    assert.match(routing, /Start with this root guide only\./i);
    assert.match(routing, /Classify.*Shortlist.*Inspect.*Read/is);
    assert.match(routing, /A guide is loaded only after its `SKILL\.md` contents are actually read/i);
    assert.match(routing, /\| Task classification \| Must read \| Must not read by default \|/);
    for (const [task, load, avoid] of expectedRows) {
      assert.ok(routing.includes(`| ${task} | ${load} | ${avoid} |`), `wrong route for ${task}`);
    }
    assert.match(routing, /inspect candidate runtime ownership in.*decision index.*before deciding whether to read Runtime/is);
    assert.match(routing, /Usage and Accessibility for every interface implementation or review/i);
    assert.match(routing, /Theming for visual or token work/i);
    assert.match(routing, /every plausible candidate guide.*every selected component guide/i);
    assert.match(routing, /Runtime only.*JavaScript.*Auto Init.*shared-runtime.*manual/is);
    assert.match(routing, /Setup only.*Install/is);
    assert.doesNotMatch(design, /\| Guide \| Load condition \|/, 'design guide duplicates the routing truth table');
    assert.match(design, /follow the root staged routing truth table/i);
  });

  test('makes all six nested guides safe to load directly', () => {
    const boundaries = {
      'expressivecss-design/SKILL.md': {
        use: /new surface or flow, a redesign, a visual refinement, a responsive adaptation, or a pre-release interface review/i,
        avoid: /setup-only, token-only, or narrow lifecycle/i,
      },
      'expressivecss-install/SKILL.md': {
        use: /setup, imports, package changes, version problems, or contract-source uncertainty/i,
        avoid: /already loads.*only.*unrelated markup/i,
      },
      'expressivecss-usage/SKILL.md': {
        use: /classes, markup, layout, utilities, or component selection/i,
        avoid: /only setup, visual tokens, or lifecycle code/i,
      },
      'expressivecss-theming/SKILL.md': {
        use: /color, typography, icon styling, themes, schemes, vibrant regions, or other visual tokens/i,
        avoid: /unrelated markup repair[\s\S]*component contract/i,
      },
      'expressivecss-runtime/SKILL.md': {
        use: /interactive components, initialization, dynamic content, remounting, teardown, or a JavaScript-backed Audit/i,
        avoid: /CSS-only Audit[\s\S]*static markup[\s\S]*visual-token/i,
      },
      'expressivecss-accessibility/SKILL.md': {
        use: /interface implementation or Audit when semantics, keyboard, focus, announcements, contrast, zoom, reflow, touch, RTL, or motion is in scope/i,
        avoid: /visual-only Critique[\s\S]*substitute for.*component contract/i,
      },
    };

    for (const [path, patterns] of Object.entries(boundaries)) {
      const guide = readFileSync(new URL(path, skillDirectory), 'utf8');
      const whenStart = guide.indexOf('## When to use');
      const avoidStart = guide.indexOf('## Do not use when');
      assert.ok(whenStart >= 0, `${path} has no When to use section`);
      assert.ok(avoidStart > whenStart, `${path} has no Do not use when section`);
      assert.match(guide.slice(whenStart, avoidStart), patterns.use, `${path} use boundary is incomplete`);
      assert.match(guide.slice(avoidStart), patterns.avoid, `${path} counter-trigger is incomplete`);
    }
  });

  test('keeps root discovery broad and separates skill from framework versions', () => {
    const whenToUse = body.slice(body.indexOf('## When to use this skill'), body.indexOf('## Guide routing'));
    for (const taskClass of [
      /installing the package/i,
      /HTML, JSX, templates, Sass, CSS, or JavaScript/i,
      /configuring themes/i,
      /initializing component behavior/i,
      /semantics, accessibility/i,
      /designing, refining, hardening, or reviewing/i,
      /contributing components, documentation, tests, or styles/i,
    ]) {
      assert.match(whenToUse, taskClass);
    }
    assert.match(body, /metadata `version` is the skill workflow version, not the ExpressiveCSS framework or generated contract version\./i);
  });

  test('routes narrow root tasks without implying every guide is mandatory', () => {
    const routingStart = body.indexOf('## Staged guide routing');
    const routingEnd = body.indexOf('## Component guides');
    assert.ok(routingStart >= 0, 'root staged guide routing is missing');
    const routing = body.slice(routingStart, routingEnd);

    assert.match(routing, /Start with this root guide only\./i);
    assert.doesNotMatch(body, /## References that you must read/);
    assert.match(routing, /\| Setup only \| Install \|/);
    assert.match(routing, /\| CSS-only static markup \| Usage, Accessibility, selected component guides \|/);
    assert.match(routing, /\| Token-only theming \| Theming \|/);
    assert.match(routing, /\| Visual Critique \| Design, Usage, Theming, Accessibility \|/);
    assert.match(routing, /Read only every guide in the applicable `Must read` cell/i);
  });

  test('uses the generated decision index before opening candidate component guides', () => {
    const decisionIndex = new URL('references/component-decisions.md', skillDirectory);
    assert.ok(existsSync(decisionIndex), 'generated component decision index is missing');
    assert.ok(body.includes('[component decision index](./references/component-decisions.md)'));
    const protocol = body.slice(body.indexOf('## Component discovery protocol'), body.indexOf('## Authority by question'));
    assert.match(protocol, /read the \[component decision index\]/i);
    assert.match(protocol, /use when.*avoid when.*alternatives.*adaptive.*runtime/is);
    assert.match(protocol, /uncertain.*read all candidate guides/i);
  });

  test('resolves the exact installed framework version before using a contract', () => {
    assert.ok(body.includes('[version resolver](./scripts/resolve-version.mjs)'));
    const authority = body.slice(body.indexOf('## Authority by question'), body.indexOf('## Framework contribution path'));
    assert.match(authority, /terminal\(command="node skills\/expressivecss\/scripts\/resolve-version\.mjs --project-root <project> --contract-version <contract-version>"/);
    assert.match(authority, /installed package.*lockfile.*manifest range/is);
    assert.match(authority, /`match`.*current documentation/is);
    assert.match(authority, /`mismatch`.*matching tag or commit/is);
    assert.match(authority, /`unresolved`.*state that target-version guidance is unavailable/is);
    assert.match(authority, /do not infer an exact installed version from a manifest range/i);
  });

  test('maps optional MCP tools to bounded workflow steps', () => {
    const section = body.slice(body.indexOf('## Optional MCP acceleration'), body.indexOf('## Framework contribution path'));
    const design = readFileSync(new URL('expressivecss-design/SKILL.md', skillDirectory), 'utf8');
    for (const tool of ['setup_expert', 'rules_enforcer', 'component_syntax_expert', 'quality_inspector']) {
      assert.ok(section.includes(`\`${tool}\``), `${tool} is not routed`);
    }
    assert.match(section, /Markdown workflow remains complete when the MCP server is unavailable/i);
    assert.match(section, /pass applies only to `checksPerformed`/i);
    assert.match(section, /does not replace.*visual.*responsive.*keyboard.*assistive/is);
    assert.match(section, /contract.*mismatch.*Blocked/is);
    assert.match(design, /MCP[\s\S]*`checksPerformed`[\s\S]*`uncheckedAreas`[\s\S]*`Blocked`/i);
    assert.match(design, /MCP[\s\S]*does not replace[\s\S]*browser[\s\S]*accessibility/i);
  });
});
