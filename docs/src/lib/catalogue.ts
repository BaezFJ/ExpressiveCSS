import { PAGES, type DocsPage } from "../data/nav";

/**
 * How the Astro site reads the shared page catalogue.
 *
 * Both accessors throw on an unknown id, the way `url_for` does. A page id
 * that resolves to nothing would otherwise publish quietly: a link to a 404,
 * or a page with no title and no banner.
 */
export function page(id: string): DocsPage {
  const entry = PAGES.find((p) => p.id === id);
  if (!entry) throw new Error(`no documented page "${id}" -- see docs/src/data/nav.ts`);
  return entry;
}

/**
 * Where Astro publishes a documented page.
 *
 * The catalogue records the route the Flask freeze publishes, which for the
 * landing page is `/getting-started.html`. Astro makes the site root canonical
 * instead (ADR 0003) and that historic path becomes one more alias, so the one
 * page whose published route the generator changes is resolved here rather than
 * hand-written into every link to it.
 */
export function route(id: string): string {
  const entry = page(id);
  return entry.id === "index" ? "/" : entry.route;
}
