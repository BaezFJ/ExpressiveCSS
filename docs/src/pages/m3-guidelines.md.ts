import type { APIRoute } from "astro";

import source from "../../../m3-guidelines.md?raw";

/** The repository's own copy, published verbatim, as llms.txt links to it. */
export const GET: APIRoute = () =>
  new Response(source, { headers: { "content-type": "text/markdown; charset=utf-8" } });
