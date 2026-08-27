import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

import { PAGES } from '../docs/src/data/nav.ts';
import { aliases, markdownRoute, route } from '../docs/src/lib/catalogue.ts';

const root = new URL('../', import.meta.url);

/** The file inside a static-site directory that serves a root-absolute route. */
function fileFor(site, path) {
  return join(site, path === '/' ? 'index.html' : path.replace(/^\//, ''));
}

/** Every canonical and legacy HTML route, mapped to its canonical Markdown counterpart. */
export function markdownLinkMap() {
  const links = new Map(PAGES.map((page) => [route(page.id), markdownRoute(page.id)]));
  for (const alias of aliases()) links.set(alias.from, links.get(alias.to));
  return links;
}

function replaceTag(document, element, tagName) {
  const replacement = document.createElement(tagName);
  for (const attribute of element.attributes) {
    replacement.setAttribute(attribute.name, attribute.value);
  }
  replacement.append(...element.childNodes);
  element.replaceWith(replacement);
  return replacement;
}

function unwrap(element) {
  element.replaceWith(...element.childNodes);
}

/**
 * Convert one completed documentation page to its clean Markdown representation.
 *
 * The finished HTML is the source because it is the one representation in which
 * Astro components, shared chrome, and the authored page have already composed.
 */
export function renderMarkdownPage(html, markdownLinks = markdownLinkMap()) {
  const document = new JSDOM(html).window.document;
  const title = document.querySelector('main .docs-page-title')?.textContent?.trim();
  const description = document.querySelector('main .docs-page-description')?.textContent?.trim();
  const source =
    document.querySelector('main .docs-page-content') ??
    document.querySelector('main > .container > .row > div:first-child');

  if (!title || !description || !source) {
    throw new Error('documentation page has no title, description, or content column');
  }

  const content = source.cloneNode(true);
  const sectionLabels = new Map(
    [...document.querySelectorAll('nav[aria-label="On this page"] a[href^="#"]')]
      .map((link) => [link.getAttribute('href').slice(1), link.textContent.trim()]),
  );

  for (const section of content.querySelectorAll('.docs-section[id]')) {
    const heading = section.querySelector(':scope > .docs-section-title');
    if (heading) {
      const level = Number(heading.tagName.slice(1));
      if (level > 2) replaceTag(document, heading, `h${level - 1}`);
      continue;
    }
    const label = sectionLabels.get(section.id);
    if (label) {
      const heading = document.createElement('h2');
      heading.textContent = label;
      section.prepend(heading);
    }
  }

  // The HTML headings carry display levels chosen for the docs stylesheet.
  // Markdown has no surrounding chrome to supply the missing levels, so clamp
  // each descendant to the next legal outline level while preserving depth
  // wherever the authored outline already has it.
  let previousHeading = 1;
  for (const heading of [...content.querySelectorAll('h1, h2, h3, h4, h5, h6')]) {
    const level = Number(heading.tagName.slice(1));
    const normalizedLevel = Math.max(2, Math.min(level, previousHeading + 1));
    if (normalizedLevel !== level) replaceTag(document, heading, `h${normalizedLevel}`);
    previousHeading = normalizedLevel;
  }

  for (const element of content.querySelectorAll(
    'script, style, template, [aria-hidden="true"], img[alt=""]',
  )) {
    element.remove();
  }
  for (const link of content.querySelectorAll('a[href]')) {
    const href = link.getAttribute('href');
    if (href === '#!') {
      unwrap(link);
      continue;
    }
    const match = href.match(/^([^?#]*)([?#].*)?$/);
    const markdown = match && markdownLinks.get(match[1]);
    if (markdown) link.setAttribute('href', markdown + (match[2] ?? ''));
  }

  const turndown = new TurndownService({
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    headingStyle: 'atx',
  });
  turndown.use(gfm);

  const body = turndown.turndown(content.innerHTML).trim();
  return `# ${title}\n\n> ${description}\n\n${body}\n`;
}

/** Generate the Markdown counterpart for every canonical catalogue page. */
export function generateMarkdownPages(site = fileURLToPath(new URL('../_site/', import.meta.url))) {
  const links = markdownLinkMap();
  for (const page of PAGES) {
    const html = readFileSync(fileFor(site, route(page.id)), 'utf8');
    const output = fileFor(site, markdownRoute(page.id));
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, renderMarkdownPage(html, links));
  }
  return PAGES.length;
}
