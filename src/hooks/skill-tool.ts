import { readFile } from "fs/promises";
import { tool } from "@opencode-ai/plugin";
import { parseFrontmatter } from "../parser.js";
import type { ParsedPlugin, ParsedSkill, ParsedCommand } from "../types.js";

type Loadable = ParsedSkill | ParsedCommand;

export function createSkillTool(plugins: ParsedPlugin[]) {
  const lookup = new Map<string, Loadable>();
  const names: string[] = [];

  for (const plugin of plugins) {
    for (const skill of plugin.skills) {
      lookup.set(skill.qualifiedName, skill);
      names.push(skill.qualifiedName);
    }
    for (const cmd of plugin.commands) {
      lookup.set(cmd.qualifiedName, cmd);
      names.push(cmd.qualifiedName);
    }
  }

  if (lookup.size === 0) return undefined;

  return tool({
    description: `Execute a skill/command from Claude Code plugins. Available: ${names.join(", ")}`,
    args: {
      skill: tool.schema.string().describe("Skill name (e.g. plugin-name:skill-name)"),
      args: tool.schema.string().optional().describe("Optional arguments to pass to the skill"),
    },
    async execute({ skill: skillName, args: skillArgs }) {
      const item = lookup.get(skillName);
      if (!item) {
        return `Skill "${skillName}" not found. Available skills: ${names.join(", ")}`;
      }

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
          return `Failed to load skill "${skillName}": ${e}`;
        }
      }

      return skillArgs ? `${content}\n\nARGUMENTS: ${skillArgs}` : content;
    },
  });
}
