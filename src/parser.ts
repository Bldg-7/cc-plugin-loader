import yaml from "js-yaml";

export interface Parsed<T> {
  frontmatter: T;
  body: string;
}

const FM_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseFrontmatter<T>(content: string): Parsed<T> {
  const match = content.match(FM_REGEX);
  if (!match) {
    return { frontmatter: {} as T, body: content };
  }
  const frontmatter = (yaml.load(match[1]) ?? {}) as T;
  const body = match[2].trim();
  return { frontmatter, body };
}

/**
 * Normalize tools from either `allowed-tools` (YAML array) or `tools` (array or comma-separated string).
 */
export function normalizeTools(fm: {
  "allowed-tools"?: string[];
  tools?: string | string[];
}): string[] {
  if (fm["allowed-tools"] && Array.isArray(fm["allowed-tools"])) {
    return fm["allowed-tools"];
  }
  if (fm.tools) {
    if (Array.isArray(fm.tools)) {
      return fm.tools;
    }
    if (typeof fm.tools === "string") {
      return fm.tools.split(",").map((t) => t.trim()).filter(Boolean);
    }
  }
  return [];
}
