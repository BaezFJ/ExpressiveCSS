import source from "../../../llm.md?raw";
import { markdownEndpoint } from "../lib/markdown-endpoint";

/** The repository's own copy, published verbatim, as llms.txt links to it. */
export const GET = markdownEndpoint(source);
