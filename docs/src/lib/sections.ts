/**
 * A page's sections, declared once.
 *
 * The Jinja `section()` macro registered each section as it rendered and built
 * the table of contents from what registered, so an id and its TOC entry could
 * not drift. Astro has no render-order side channel, so the page states the
 * list up front instead: `<PageBody>` builds the TOC from it and each
 * `<Section>` is spread from the same object.
 */
export interface SectionMeta {
  /** The anchor, and what the TOC links to. */
  id: string;
  /** The TOC entry, and the heading unless `heading` says otherwise. */
  label: string;
  /** Heading text when it differs from the label, or `false` for no heading (intro sections). */
  heading?: string | false;
  /** Heading level. `h3` unless the page needs another. */
  tag?: "h2" | "h3" | "h4";
}

/** The sections of one page, keyed by id and kept in declaration order. */
export type Sections = Record<string, SectionMeta>;

/** Keyed for `<Section {...S.anatomy} />`; `Object.values` keeps the declared order. */
export function defineSections(list: readonly SectionMeta[]): Sections {
  return Object.fromEntries(list.map((s) => [s.id, s]));
}
