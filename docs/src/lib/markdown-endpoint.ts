import type { APIRoute } from "astro";

/** Publish a canonical repository document as a Markdown endpoint. */
export function markdownEndpoint(source: string): APIRoute {
  return () =>
    new Response(source, { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
