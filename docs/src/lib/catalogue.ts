import { PAGES, type DocsPage } from "../data/nav.ts";

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

/**
 * Where Astro publishes a documented page.
 *
 * The catalogue keeps the landing page's historic `/getting-started.html`
 * route for compatibility, while Astro publishes it canonically at the site
 * root (ADR 0003). Resolve that one exception here rather than hand-writing it
 * into every link.
 */
export function route(id: string): string {
  const entry = page(id);
  return entry.id === "index" ? "/" : entry.route;
}

/** The clean Markdown counterpart published beside a canonical HTML page. */
export function markdownRoute(id: string): string {
  const path = route(id);
  return path === "/" ? "/index.html.md" : `${path}.md`;
}

/**
 * Every legacy path this site publishes a redirect for, and where it points.
 *
 * Not `ALIASES` from the catalogue directly, because the landing page's two
 * compatibility paths swap roles under Astro: `/index.html` stops being an
 * alias (`build.format: 'file'` writes the root document there, so a redirect
 * would point the site root at itself) and `/getting-started.html` starts
 * being one, since the root took over as canonical.
 */
export function aliases(): { from: string; to: string }[] {
  return PAGES.flatMap((entry) => {
    const from =
      entry.id === "index"
        ? [entry.route]
        : (entry.aliases ?? []);
    return from.map((path) => ({ from: path, to: route(entry.id) }));
  });
}
