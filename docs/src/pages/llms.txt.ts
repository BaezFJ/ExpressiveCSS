import type { APIRoute } from "astro";

import pkg from "../../../package.json";
import { renderLlmsTxt } from "../lib/llms.ts";

/** The link index, generated from the shared catalogue and package metadata. */
export const GET: APIRoute = () =>
  new Response(renderLlmsTxt(pkg), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
