import { NAV, PAGES, type DocsGroup, type DocsPage } from "../data/nav.ts";

/**
 * How the Astro site reads the shared page catalogue.
 *
 * Both accessors throw on an unknown id. A page id that resolves to nothing
 * would otherwise publish quietly: a link to a 404, or a page with no title
 * and no banner.
 */
export function page(id: string): DocsPage {
  const entry = PAGES.find((p) => p.id === id);
  if (!entry) throw new Error(`no documented page "${id}" -- see docs/src/data/nav.ts`);
  return entry;
}

/** Where Astro publishes a documented page. */
export function route(id: string): string {
  return page(id).route;
}

/** The clean Markdown counterpart published beside a canonical HTML page. */
export function markdownRoute(id: string): string {
  const path = route(id);
  return path === "/" ? "/index.html.md" : `${path}.md`;
}

/**
 * Every legacy path this site publishes a redirect for, and where it points.
 * `/index.html` is not one: `build.format: 'file'` writes the root document
 * there, so a redirect would point the site root at itself.
 */
export function aliases(): { from: string; to: string }[] {
  return PAGES.flatMap((entry) => (entry.aliases ?? []).map((from) => ({ from, to: entry.route })));
}

/** The group a page belongs to. */
export function groupOf(id: string): DocsGroup {
  const group = NAV.find((g) => g.pages.some((p) => p.id === id));
  if (!group) throw new Error(`no documented page "${id}" -- see docs/src/data/nav.ts`);
  return group;
}

/**
 * A group's pages split into runs under their `section` subheading. A page
 * without one stays in the run before it, so a group with no sections is a
 * single run with no label.
 */
export function sectionsOf(group: DocsGroup): { label?: string; pages: DocsPage[] }[] {
  const runs: { label?: string; pages: DocsPage[] }[] = [];
  for (const p of group.pages) {
    if (p.section || runs.length === 0) runs.push({ label: p.section, pages: [] });
    runs[runs.length - 1].pages.push(p);
  }
  return runs;
}
