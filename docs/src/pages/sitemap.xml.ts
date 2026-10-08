import type { APIRoute } from "astro";

import { PAGES } from "../data/nav.ts";
import { route } from "../lib/catalogue.ts";

/** Every canonical page, from the shared catalogue. Aliases stay out: they declare their target canonical. */
export const GET: APIRoute = ({ site }) =>
  new Response(
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      PAGES.map((p) => `  <url><loc>${new URL(route(p.id), site).href}</loc></url>\n`).join("") +
      "</urlset>\n",
    { headers: { "content-type": "application/xml; charset=utf-8" } },
  );
