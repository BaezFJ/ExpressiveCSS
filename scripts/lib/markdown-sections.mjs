// Markdown helpers for the generated skill guides. They live here, apart from
// gen-expressivecss-skill.mjs, which does its work on import, so tests can reach them.

const FENCE = /```[\s\S]*?```/gu;

// Applies fn to the markdown outside fenced code blocks.
const mapProse = (markdown, fn) => markdown.split(/(```[\s\S]*?```)/u)
  .map((part, index) => index % 2 ? part : fn(part)).join('');

export const stripRelativeLinks = (text) => text.replace(/\[([^\]]+)\]\((?!https?:\/\/)[^)]+\)/gu, '$1');

export function rebaseHeadings(markdown, offset) {
  return mapProse(markdown, (part) => part.replace(/^(#{1,6}) /gmu, (_, hashes) => `${'#'.repeat(hashes.length + offset)} `));
}

// A component section's "App behavior" subsection guides app behavior tied to the
// component (loading feedback, Undo, URL state, submit flow). It is cut out before the
// other parts read the section, so its examples never become the Syntax, and rendered
// in full. The search runs on a copy with fenced code blanked out, line breaks kept, so
// a heading, `# comment` or `---` inside an example can neither start nor end it.
export function splitAppBehavior(trimmed, level) {
  // sectionFor trims the section, so a leading newline lets the subsection come first.
  const section = `\n${trimmed}`;
  // No `u` flag: each UTF-16 unit becomes one space, so positions in masked match section.
  const masked = section.replace(FENCE, (block) => block.replace(/[^\n]/g, ' '));
  const match = new RegExp(`\\n#{${level + 1}} App behavior\\n([\\s\\S]*?)(?=\\n#{1,${level + 1}} |\\n---[ \\t]*(?:\\n|$)|$)`, 'u').exec(masked);
  if (!match) return { rest: trimmed, behavior: '' };
  const end = match.index + match[0].length;
  const body = mapProse(section.slice(end - match[1].length, end).trim(), stripRelativeLinks);
  return {
    rest: (section.slice(0, match.index) + section.slice(end)).slice(1),
    behavior: `#### App behavior\n\n${rebaseHeadings(body, 3 - level)}\n\n`,
  };
}
