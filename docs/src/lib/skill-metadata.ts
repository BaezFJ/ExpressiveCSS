import { parse } from "yaml";

/** Parse skill discovery metadata with the same YAML rules as agent hosts. */
export function readSkillMetadata(source: string) {
  const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(source);
  if (!header) throw new Error("Skill must start with closed YAML frontmatter.");
  const value = parse(header[1]);
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      typeof value.name !== "string" || !value.name.trim() ||
      typeof value.description !== "string" || !value.description.trim()) {
    throw new Error("Skill frontmatter must contain a name and description as non-empty strings.");
  }
  return value as { name: string; description: string; [key: string]: unknown };
}
