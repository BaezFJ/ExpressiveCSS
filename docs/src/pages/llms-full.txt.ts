import type { APIRoute } from "astro";

// The two canonical documents, read at build time in the order llms.txt names
// them. Imported rather than assembled from a maintained third copy, so
// /llms-full.txt cannot drift from the files it is made of.
import guidelines from "../../../m3-guidelines.md?raw";
import llm from "../../../llm.md?raw";

/** Every document a model needs, concatenated, for one-fetch ingestion. */
export const GET: APIRoute = () =>
  new Response([guidelines, llm].join("\n\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
