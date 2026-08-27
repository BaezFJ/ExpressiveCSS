import source from "../../../SEMANTICS.md?raw";
import { markdownEndpoint } from "../lib/markdown-endpoint";

/** The generated HTML and ARIA contract, published as clean Markdown. */
export const GET = markdownEndpoint(source);
