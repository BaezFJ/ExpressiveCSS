import { NAV } from "../data/nav.ts";
import { route } from "./catalogue.ts";

/**
 * `llms.txt` (https://llmstxt.org): the link index a model fetches to find out
 * what this project publishes and where.
 *
 * Nothing here is authored per page. The page list, the labels and every
 * link's note come from the shared catalogue; the package name, version and
 * base URL come from package.json. Adding a page to the catalogue therefore
 * adds it here and nowhere else.
 *
 * The companion `/llms-full.txt` is not generated from anything: it is
 * `m3-guidelines.md` and `llm.md` concatenated by their own endpoint, so it
 * cannot drift from them at all.
 */

/** The fields of package.json this reads. */
export interface PackageMetadata {
  name: string;
  version: string;
  homepage: string;
  repository: { url: string };
}

const SUMMARY =
  "A Material Design 3 front-end framework for the web: design tokens, light " +
  "and dark themes, a responsive grid, styled form controls, and interactive " +
  "components, built with Sass and TypeScript.";

// The two things a model gets wrong without being told. Both are stated at
// length in the files this points at; the point here is that a model reading
// only the index still gets them.
const PREAMBLE = `Read the two primary documents in order. \`m3-guidelines.md\` decides *which*
component a job calls for, how it is structured, and where it sits;
\`llm.md\` states the markup, class names, tokens, and JavaScript APIs this
framework actually ships. Where they disagree with the Material 3 spec,
\`llm.md\` wins on what exists and the spec wins on design intent.

The public surface is not Materialize's. There is no \`.btn\`, \`.card-content\`,
\`.nav-wrapper\`, \`.brand-logo\`, \`.modal-header\`, \`.lever\`, or \`.filled-in\` --
components are carried by the HTML element (\`<button>\`, \`<article>\`,
\`<dialog>\`, \`<footer>\`), and a class modifies a component rather than making
one. Icons are Material Symbols in a \`<span class="material-symbols">\`.`;

const PRIMARY: [string, string, string][] = [
  [
    "m3-guidelines.md",
    "Material 3 design guidelines",
    "Which component to use, its anatomy, placement, adaptive behavior, and the " +
      "mistakes generated Material UIs make most often. Read this first.",
  ],
  [
    "llm.md",
    "Markup and JavaScript API reference",
    "Every component: class names, canonical markup, options, methods, events, " +
      "and CSS custom properties.",
  ],
  [
    "llms-full.txt",
    "Complete documentation, single file",
    "Both documents above concatenated, for one-fetch ingestion.",
  ],
];

export function renderLlmsTxt(pkg: PackageMetadata): string {
  const base = pkg.homepage.replace(/\/$/, "");
  // Semver puts a prerelease after a hyphen. A prerelease is labelled because
  // `npm install` does not hand it out, so a reader told the bare number would
  // install something else.
  const release = pkg.version.includes("-")
    ? `${pkg.version} (prerelease)`
    : pkg.version;

  const out: string[] = [
    "# ExpressiveCSS",
    "",
    `> ${SUMMARY}`,
    "",
    `Package \`${pkg.name}\`, version ${release}. Distributed as compiled CSS, ` +
      "Sass sources, and JavaScript in ES module, CommonJS, and browser IIFE " +
      "form. Targets the last five Chrome and Firefox versions.",
    "",
    PREAMBLE,
    "",
    "## Primary documentation",
    "",
    ...PRIMARY.map(([file, title, note]) => `- [${title}](${base}/${file}): ${note}`),
  ];

  for (const group of NAV) {
    out.push("", `## ${group.label}`, "");
    for (const page of group.pages) {
      out.push(`- [${page.label}](${base}${route(page.id)}): ${page.description}`);
    }
  }

  const repo = pkg.repository.url.replace(/^git\+/, "").replace(/\.git$/, "");
  out.push(
    "",
    "## Optional",
    "",
    `- [Source repository](${repo}): issues, source, and the build.`,
    `- [Changelog](${repo}/blob/master/CHANGELOG.md): releases, and the ` +
      "migration notes for every breaking change.",
    `- [HTML semantics standard](${repo}/blob/master/SEMANTICS.md): the ` +
      "element and ARIA contract each component is written against.",
    `- [npm package](https://www.npmjs.com/package/${pkg.name}): install ` +
      "and version history.",
    "",
  );
  return out.join("\n");
}
