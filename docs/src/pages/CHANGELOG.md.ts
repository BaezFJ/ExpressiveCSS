import source from "../../../CHANGELOG.md?raw";
import { markdownEndpoint } from "../lib/markdown-endpoint";

/** Release history and migration notes, published as clean Markdown. */
export const GET = markdownEndpoint(source);
