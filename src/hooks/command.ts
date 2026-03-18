import { readFile } from "fs/promises";
import { parseFrontmatter } from "../parser.js";
import type { ParsedPlugin, ParsedSkill, ParsedCommand } from "../types.js";

type Loadable = ParsedSkill | ParsedCommand;

export function createCommandHook(plugins: ParsedPlugin[]) {
  // Build lookup map: qualifiedName → Loadable
  const lookup = new Map<string, Loadable>();

  for (const plugin of plugins) {
    for (const skill of plugin.skills) {
      lookup.set(skill.qualifiedName, skill);
    }
    for (const cmd of plugin.commands) {
      lookup.set(cmd.qualifiedName, cmd);
    }
  }

  return async (
    input: { command: string; sessionID: string; arguments: string },
    output: { parts: Array<{ type: string; [key: string]: unknown }> },
  ): Promise<void> => {
    const item = lookup.get(input.command);
    if (!item) return; // Not our command, leave parts untouched

    // Lazy-load content
    let content: string;
    if (item._content) {
      content = item._content;
    } else {
      try {
        const raw = await readFile(item.contentPath, "utf-8");
        const { body } = parseFrontmatter<unknown>(raw);
        item._content = body;
        content = body;
      } catch (e) {
        content = `[cc-plugin-loader] Failed to load ${item.contentPath}: ${e}`;
      }
    }

    // Append ARGUMENTS (Claude Code pattern)
    const fullContent = input.arguments
      ? `${content}\n\nARGUMENTS: ${input.arguments}`
      : content;

    output.parts = [{ type: "text", text: fullContent }];
  };
}
