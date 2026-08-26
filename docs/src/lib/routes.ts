import { PAGES } from "../data/nav";

/**
 * Where Astro publishes a documented page.
 *
 * The catalogue records the route the Flask freeze publishes, which for the
 * landing page is `/getting-started.html`. Astro makes the site root canonical
 * instead (ADR 0003) and that historic path becomes one more alias, so the one
 * page whose published route the generator changes is resolved here rather than
 * hand-written into every link to it.
 *
 * Throws on an unknown id, the way `url_for` does -- a mistyped link should
 * fail the build, not publish a 404.
 */
export function route(id: string): string {
  const page = PAGES.find((p) => p.id === id);
  if (!page) throw new Error(`route(): no documented page "${id}"`);
  return page.id === "index" ? "/" : page.route;
}
